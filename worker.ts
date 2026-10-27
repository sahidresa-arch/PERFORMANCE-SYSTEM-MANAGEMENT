/**
 * Cloudflare Worker Entry Point (Full-Stack Worker + Static Assets)
 * Melayani:
 * 1. Backend Internal Server Sync Engine (/api/sync/status, /api/sync/upsert, /api/sync/query, /api/sync/stream)
 *    menggunakan Cloudflare Edge Memory + Cloudflare Edge Cache API + Opsional SYNC_KV
 * 2. Seluruh aset statis React SPA (./dist) melalui env.ASSETS
 */

interface SyncStoreData {
  cinema_sales: Record<string, any>;
  cinema_occupancy: Record<string, any>;
  cinema_config: Record<string, any>;
}

const g = globalThis as any;
if (!g.__CINEMA_XXI_EDGE_STORE__) {
  g.__CINEMA_XXI_EDGE_STORE__ = {
    cinema_sales: {},
    cinema_occupancy: {},
    cinema_config: {},
    hydrated: false,
  };
}

const EDGE_CACHE_URL = 'https://internal-sync.cinemaxxi.local/store-v1';

const MERGE_BY_ID_ROWS = new Set([
  '__SYSTEM_SYNC_INSPECTIONS__',
  '__SYSTEM_SYNC_INSPECTIONS_DELTA__',
  '__SYSTEM_SYNC_BAKING_SALES__',
  '__SYSTEM_SYNC_EMPLOYEE_KPIS__',
  '__SYSTEM_SYNC_SDM_PERFORMANCE__',
  '__SYSTEM_SYNC_SDM_PRODUCTS__',
  '__SYSTEM_SYNC_DAILY_SECTION__',
  '__SYSTEM_SYNC_BOPO__',
  '__SYSTEM_SYNC_LOST_FOUND__',
]);

const MERGE_BY_OUTLET_DATE_ROWS = new Set([
  '__SYSTEM_SYNC_DAILY_SALES__',
  '__SYSTEM_SYNC_DAILY_SALES_DELTA__',
  '__SYSTEM_SYNC_ADMINISTRATION__',
]);

function fastTimestampMs(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const t = Date.parse(String(val));
  return Number.isNaN(t) ? 0 : t;
}

function isNewerOrEqualIso(nextVal: any, prevVal: any): boolean {
  if (!prevVal) return true;
  if (!nextVal) return false;
  const sNext = String(nextVal);
  const sPrev = String(prevVal);
  if (sNext.length === sPrev.length && sNext.includes('T') && sPrev.includes('T')) {
    return sNext >= sPrev;
  }
  return fastTimestampMs(sNext) >= fastTimestampMs(sPrev);
}

function sortAndBoundInspectionShows(shows: any[], isDelta: boolean): any[] {
  const cutoffDate = new Date(Date.now() - (isDelta ? 3 : 14) * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const filtered = shows.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    if (isDelta && item.date && String(item.date) < cutoffDate) return false;
    return true;
  });

  const baseList = filtered.length > 0 ? filtered : shows;
  baseList.sort((a: any, b: any) => {
    const dA = String(a?.date || '');
    const dB = String(b?.date || '');
    if (dA !== dB) return dA < dB ? -1 : 1;
    const tA = String(a?.updatedAt || '');
    const tB = String(b?.updatedAt || '');
    if (tA !== tB) return tA < tB ? -1 : 1;
    return (Number(a?.showNumber) || 0) - (Number(b?.showNumber) || 0);
  });

  if (isDelta && baseList.length > 240) {
    return baseList.slice(-240);
  }
  if (!isDelta && baseList.length > 3000) {
    return baseList.slice(-3000);
  }
  return baseList;
}

function smartMergeSalesRow(existingRow: any, incomingRow: any): any {
  if (!existingRow || !Array.isArray(existingRow.shows) || !Array.isArray(incomingRow.shows)) {
    return incomingRow;
  }

  const rowId = String(incomingRow.id || existingRow.id || '');
  const bestUpdatedAt = isNewerOrEqualIso(incomingRow.updated_at, existingRow.updated_at)
    ? incomingRow.updated_at
    : existingRow.updated_at;

  const isInspectionRow =
    rowId === '__SYSTEM_SYNC_INSPECTIONS__' || rowId === '__SYSTEM_SYNC_INSPECTIONS_DELTA__';

  const getCanonicalKey = (item: any): string => {
    if (!item || typeof item !== 'object') return '';
    if (
      isInspectionRow &&
      item.outletId &&
      item.date &&
      item.showNumber !== undefined &&
      item.type
    ) {
      return `${item.outletId}-${item.date}-show${Number(item.showNumber)}-${item.type}`;
    }
    return item.id ? String(item.id) : '';
  };

  if (MERGE_BY_ID_ROWS.has(rowId)) {
    const mergedMap = new Map<string, any>();
    for (const item of existingRow.shows) {
      const key = getCanonicalKey(item);
      if (key) {
        mergedMap.set(key, item);
      }
    }
    for (const item of incomingRow.shows) {
      const key = getCanonicalKey(item);
      if (key) {
        const prev = mergedMap.get(key);
        if (!prev || isNewerOrEqualIso(item.updatedAt || incomingRow.updated_at, prev.updatedAt)) {
          mergedMap.set(key, isInspectionRow ? { ...item, id: key, showNumber: Number(item.showNumber) || 1 } : item);
        }
      }
    }
    let finalShows = Array.from(mergedMap.values());
    if (isInspectionRow) {
      finalShows = sortAndBoundInspectionShows(finalShows, rowId.endsWith('_DELTA__'));
    } else if (rowId.endsWith('_DELTA__') && finalShows.length > 150) {
      finalShows = finalShows.slice(-150);
    }
    return {
      ...existingRow,
      ...incomingRow,
      updated_at: bestUpdatedAt,
      shows: finalShows,
    };
  }

  if (MERGE_BY_OUTLET_DATE_ROWS.has(rowId)) {
    const mergedMap = new Map<string, any>();
    for (const item of existingRow.shows) {
      if (item && item.outletId && item.date) {
        mergedMap.set(`${item.outletId}_${item.date}`, item);
      } else if (item && item.id) {
        mergedMap.set(String(item.id), item);
      }
    }
    for (const item of incomingRow.shows) {
      if (item && item.outletId && item.date) {
        const key = `${item.outletId}_${item.date}`;
        const prev = mergedMap.get(key);
        if (!prev || isNewerOrEqualIso(item.updatedAt || incomingRow.updated_at, prev.updatedAt)) {
          mergedMap.set(key, item);
        }
      } else if (item && item.id) {
        mergedMap.set(String(item.id), item);
      }
    }
    let finalShows = Array.from(mergedMap.values());
    if (rowId.endsWith('_DELTA__')) {
      finalShows.sort((a: any, b: any) => String(a?.date || '').localeCompare(String(b?.date || '')));
      if (finalShows.length > 40) {
        finalShows = finalShows.slice(-40);
      }
    }
    return {
      ...existingRow,
      ...incomingRow,
      updated_at: bestUpdatedAt,
      shows: finalShows,
    };
  }

  return {
    ...incomingRow,
    updated_at: bestUpdatedAt,
  };
}

function mergeStoreTables(target: SyncStoreData, incoming: any): void {
  if (!incoming || typeof incoming !== 'object') return;

  if (incoming.cinema_sales && typeof incoming.cinema_sales === 'object') {
    for (const [id, incRow] of Object.entries<any>(incoming.cinema_sales)) {
      if (!incRow || !id) continue;
      const existing = target.cinema_sales[id];
      if (!existing) {
        target.cinema_sales[id] = incRow;
      } else if (
        existing.updated_at &&
        incRow.updated_at &&
        existing.updated_at === incRow.updated_at &&
        Array.isArray(existing.shows) &&
        Array.isArray(incRow.shows) &&
        existing.shows.length === incRow.shows.length
      ) {
        // Fast O(1) skip when row is identical
        continue;
      } else {
        if (isNewerOrEqualIso(incRow.updated_at, existing.updated_at)) {
          target.cinema_sales[id] = smartMergeSalesRow(existing, incRow);
        } else {
          target.cinema_sales[id] = smartMergeSalesRow(incRow, existing);
        }
      }
    }
  }

  if (incoming.cinema_occupancy && typeof incoming.cinema_occupancy === 'object') {
    for (const [id, incRow] of Object.entries<any>(incoming.cinema_occupancy)) {
      if (!incRow || !id) continue;
      const existing = target.cinema_occupancy[id];
      if (!existing || isNewerOrEqualIso(incRow.updated_at, existing.updated_at)) {
        target.cinema_occupancy[id] = incRow;
      }
    }
  }

  if (incoming.cinema_config && typeof incoming.cinema_config === 'object') {
    for (const [id, incRow] of Object.entries<any>(incoming.cinema_config)) {
      if (!incRow || !id) continue;
      const existing = target.cinema_config[id];
      if (!existing || isNewerOrEqualIso(incRow.updated_at, existing.updated_at)) {
        target.cinema_config[id] = incRow;
      }
    }
  }
}

async function getHydratedStore(env: any, forceRefresh = false): Promise<SyncStoreData> {
  const store = g.__CINEMA_XXI_EDGE_STORE__;
  const now = Date.now();
  if (store.hydrated && !forceRefresh && now - (store.lastHydratedAt || 0) < 8000) {
    return store;
  }

  // 1. Zero-Config Cloudflare Edge Cache API (fastest local colocation cache)
  let loadedFromCache = false;
  try {
    const cache = (globalThis as any).caches?.default;
    if (cache) {
      const cachedResp = await cache.match(EDGE_CACHE_URL);
      if (cachedResp) {
        const raw = await cachedResp.json();
        if (raw && typeof raw === 'object') {
          mergeStoreTables(store, raw);
          loadedFromCache = true;
        }
      }
    }
  } catch {
    // ignore cache error
  }

  // 2. Optional Cloudflare KV Binding (SYNC_KV) - only on cold start or every 30s to save Worker CPU
  if (
    env &&
    env.SYNC_KV &&
    typeof env.SYNC_KV.get === 'function' &&
    (!store.hydrated || !loadedFromCache || now - (store.lastKvHydratedAt || 0) > 30000)
  ) {
    try {
      const raw = await env.SYNC_KV.get('CINEMA_XXI_STORE', 'json');
      if (raw && typeof raw === 'object') {
        mergeStoreTables(store, raw);
        store.lastKvHydratedAt = now;
      }
    } catch {
      // ignore KV error
    }
  }

  store.hydrated = true;
  store.lastHydratedAt = Date.now();
  return store;
}

async function persistEdgeStore(store: SyncStoreData, env: any, ctx: any): Promise<void> {
  const saveTask = async () => {
    const payload = JSON.stringify({
      cinema_sales: store.cinema_sales,
      cinema_occupancy: store.cinema_occupancy,
      cinema_config: store.cinema_config,
    });

    try {
      const cache = (globalThis as any).caches?.default;
      if (cache) {
        const resp = new Response(payload, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=2592000',
          },
        });
        await cache.put(EDGE_CACHE_URL, resp);
      }
    } catch {
      // ignore
    }

    if (env && env.SYNC_KV && typeof env.SYNC_KV.put === 'function') {
      try {
        await env.SYNC_KV.put('CINEMA_XXI_STORE', payload);
      } catch {
        // ignore
      }
    }
  };

  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(saveTask());
  } else {
    await saveTask();
  }
}

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // Handle /api/sync/* routes inside Cloudflare Worker
    if (url.pathname.startsWith('/api/sync/')) {
      const action = url.pathname.replace(/^\/api\/sync\//, '').split('/')[0].toLowerCase();

      const jsonHeaders = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: jsonHeaders });
      }

      const store = await getHydratedStore(env);

      if (action === 'status') {
        return new Response(
          JSON.stringify({
            online: true,
            engine: 'Cloudflare Worker Edge Sync Engine + Hybrid Offline-First',
            connectedDevices: 2,
            salesKeys: Object.keys(store.cinema_sales).length,
            occupancyKeys: Object.keys(store.cinema_occupancy).length,
            timestamp: new Date().toISOString(),
          }),
          { status: 200, headers: jsonHeaders }
        );
      }

      if (action === 'stream') {
        const body = `data: ${JSON.stringify({ type: 'CONNECTED', mode: 'edge-serverless', ts: new Date().toISOString() })}\n\n`;
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      if (action === 'upsert' && request.method === 'POST') {
        try {
          const body: any = await request.json();
          const { table, records, seedMode, returnFull } = body || {};
          if (!table || !records) {
            return new Response(JSON.stringify({ error: 'Missing table or records' }), {
              status: 400,
              headers: jsonHeaders,
            });
          }

          const targetTable =
            table === 'cinema_occupancy'
              ? store.cinema_occupancy
              : table === 'cinema_config'
              ? store.cinema_config
              : store.cinema_sales;

          const list = Array.isArray(records) ? records : [records];
          const nowIso = new Date().toISOString();
          const updatedMeta: any[] = [];

          for (const item of list) {
            if (!item || !item.id) continue;
            const id = String(item.id);
            const existing = targetTable[id];

            if (
              seedMode &&
              existing &&
              table === 'cinema_sales' &&
              !MERGE_BY_ID_ROWS.has(id) &&
              !MERGE_BY_OUTLET_DATE_ROWS.has(id)
            ) {
              continue;
            }

            const normalized = {
              ...item,
              id,
              updated_at: item.updated_at || nowIso,
            };

            if (table === 'cinema_sales') {
              targetTable[id] = smartMergeSalesRow(existing, normalized);

              // Atomic Server-Side Cross-Merge: Whenever _DELTA__ is saved, immediately merge into Master row as well
              // so no show is ever lost even if the client browser closes immediately or only sends a 2KB delta!
              if (id === '__SYSTEM_SYNC_INSPECTIONS_DELTA__') {
                const masterId = '__SYSTEM_SYNC_INSPECTIONS__';
                const masterExisting = targetTable[masterId] || {
                  id: masterId,
                  outlet_id: '__SYSTEM_SYNC__',
                  date: '2026-01-01',
                  shows: [],
                  updated_at: normalized.updated_at,
                };
                targetTable[masterId] = smartMergeSalesRow(masterExisting, {
                  ...normalized,
                  id: masterId,
                });
              } else if (id === '__SYSTEM_SYNC_DAILY_SALES_DELTA__') {
                const masterId = '__SYSTEM_SYNC_DAILY_SALES__';
                const masterExisting = targetTable[masterId] || {
                  id: masterId,
                  outlet_id: '__SYSTEM_SYNC__',
                  date: '2026-01-01',
                  shows: [],
                  updated_at: normalized.updated_at,
                };
                targetTable[masterId] = smartMergeSalesRow(masterExisting, {
                  ...normalized,
                  id: masterId,
                });
              }
            } else {
              targetTable[id] = normalized;
            }

            const saved = targetTable[id];
            updatedMeta.push(
              returnFull
                ? saved
                : {
                    id: saved.id,
                    outlet_id: saved.outlet_id,
                    date: saved.date,
                    updated_at: saved.updated_at,
                    count: Array.isArray(saved.shows) ? saved.shows.length : undefined,
                  }
            );
          }

          await persistEdgeStore(store, env, ctx);

          return new Response(JSON.stringify({ data: updatedMeta, error: null }), {
            status: 200,
            headers: jsonHeaders,
          });
        } catch (err: any) {
          return new Response(
            JSON.stringify({ data: null, error: { message: err?.message || 'Worker upsert error' } }),
            { status: 500, headers: jsonHeaders }
          );
        }
      }

      if (action === 'query' && request.method === 'POST') {
        try {
          const body: any = await request.json();
          const { table, columns, eqFilters, inFilter, likeFilter, singleMode, headOnly } = body || {};
          const targetTable =
            table === 'cinema_occupancy'
              ? store.cinema_occupancy
              : table === 'cinema_config'
              ? store.cinema_config
              : store.cinema_sales;

          let rows = Object.values(targetTable);

          if (Array.isArray(eqFilters)) {
            for (const f of eqFilters) {
              if (f && f.col) {
                rows = rows.filter((r) => String(r?.[f.col] ?? '') === String(f.val ?? ''));
              }
            }
          }

          if (inFilter && inFilter.col && Array.isArray(inFilter.vals)) {
            const set = new Set(inFilter.vals.map((v: any) => String(v)));
            rows = rows.filter((r) => set.has(String(r?.[inFilter.col] ?? '')));
          }

          if (likeFilter && likeFilter.col && typeof likeFilter.pattern === 'string') {
            const prefix = likeFilter.pattern.replace(/%+$/, '');
            rows = rows.filter((r) => String(r?.[likeFilter.col] ?? '').startsWith(prefix));
          }

          if (headOnly) {
            return new Response(JSON.stringify({ data: null, count: rows.length, error: null }), {
              status: 200,
              headers: jsonHeaders,
            });
          }

          const colStr = typeof columns === 'string' ? columns.trim() : '*';
          if (colStr && colStr !== '*') {
            const wantedCols = colStr
              .split(',')
              .map((c) => c.trim())
              .filter(Boolean);
            rows = rows.map((r) => {
              const projected: Record<string, any> = {};
              for (const c of wantedCols) {
                if (r && c in r) projected[c] = r[c];
              }
              return projected;
            });
          }

          if (singleMode === 'maybeSingle') {
            return new Response(JSON.stringify({ data: rows[0] || null, error: null }), {
              status: 200,
              headers: jsonHeaders,
            });
          }

          if (singleMode === 'single') {
            if (rows.length === 0) {
              return new Response(
                JSON.stringify({ data: null, error: { code: 'PGRST116', message: 'No rows found' } }),
                { status: 200, headers: jsonHeaders }
              );
            }
            return new Response(JSON.stringify({ data: rows[0], error: null }), {
              status: 200,
              headers: jsonHeaders,
            });
          }

          return new Response(JSON.stringify({ data: rows, error: null }), {
            status: 200,
            headers: jsonHeaders,
          });
        } catch (err: any) {
          return new Response(
            JSON.stringify({ data: null, error: { message: err?.message || 'Worker query error' } }),
            { status: 500, headers: jsonHeaders }
          );
        }
      }
    }

    // Serve static frontend assets (./dist)
    if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  },
};
