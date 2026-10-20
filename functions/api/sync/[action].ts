/**
 * Cloudflare Pages Functions — Internal Server Sync Engine (/api/sync/:action)
 * Otomatis aktif saat repository GitHub di-deploy ke Cloudflare Pages.
 * Mendukung:
 * 1. Zero-Config Edge Memory + Cloudflare Cache API (langsung jalan tanpa konfigurasi)
 * 2. Optional Cloudflare KV Binding (jika variabel KV `SYNC_KV` ditambahkan di Cloudflare Pages)
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

function smartMergeSalesRow(existingRow: any, incomingRow: any): any {
  if (!existingRow || !Array.isArray(existingRow.shows) || !Array.isArray(incomingRow.shows)) {
    return incomingRow;
  }

  const rowId = String(incomingRow.id || '');

  if (MERGE_BY_ID_ROWS.has(rowId)) {
    const mergedMap = new Map<string, any>();
    for (const item of existingRow.shows) {
      if (item && item.id) {
        mergedMap.set(String(item.id), item);
      }
    }
    for (const item of incomingRow.shows) {
      if (item && item.id) {
        const key = String(item.id);
        const prev = mergedMap.get(key);
        if (!prev) {
          mergedMap.set(key, item);
        } else {
          const prevTs = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
          const nextTs = item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now();
          if (nextTs >= prevTs) {
            mergedMap.set(key, item);
          }
        }
      }
    }
    let finalShows = Array.from(mergedMap.values());
    if (rowId.endsWith('_DELTA__') && finalShows.length > 35) {
      finalShows = finalShows.slice(-35);
    }
    return {
      ...existingRow,
      ...incomingRow,
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
        if (!prev) {
          mergedMap.set(key, item);
        } else {
          const prevTs = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
          const nextTs = item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now();
          if (nextTs >= prevTs) {
            mergedMap.set(key, item);
          }
        }
      } else if (item && item.id) {
        mergedMap.set(String(item.id), item);
      }
    }
    let finalShows = Array.from(mergedMap.values());
    if (rowId.endsWith('_DELTA__') && finalShows.length > 30) {
      finalShows = finalShows.slice(-30);
    }
    return {
      ...existingRow,
      ...incomingRow,
      shows: finalShows,
    };
  }

  return incomingRow;
}

function mergeStoreTables(target: SyncStoreData, incoming: any): void {
  if (!incoming || typeof incoming !== 'object') return;

  if (incoming.cinema_sales && typeof incoming.cinema_sales === 'object') {
    for (const [id, incRow] of Object.entries<any>(incoming.cinema_sales)) {
      if (!incRow || !id) continue;
      const existing = target.cinema_sales[id];
      if (!existing) {
        target.cinema_sales[id] = incRow;
      } else {
        const exTs = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
        const incTs = incRow.updated_at ? new Date(incRow.updated_at).getTime() : 0;
        if (incTs >= exTs) {
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
      if (!existing) {
        target.cinema_occupancy[id] = incRow;
      } else {
        const exTs = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
        const incTs = incRow.updated_at ? new Date(incRow.updated_at).getTime() : 0;
        if (incTs >= exTs) {
          target.cinema_occupancy[id] = incRow;
        }
      }
    }
  }

  if (incoming.cinema_config && typeof incoming.cinema_config === 'object') {
    for (const [id, incRow] of Object.entries<any>(incoming.cinema_config)) {
      if (!incRow || !id) continue;
      const existing = target.cinema_config[id];
      if (!existing) {
        target.cinema_config[id] = incRow;
      } else {
        const exTs = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
        const incTs = incRow.updated_at ? new Date(incRow.updated_at).getTime() : 0;
        if (incTs >= exTs) {
          target.cinema_config[id] = incRow;
        }
      }
    }
  }
}

async function getHydratedStore(env: any, forceRefresh = false): Promise<SyncStoreData> {
  const store = g.__CINEMA_XXI_EDGE_STORE__;
  const now = Date.now();
  if (store.hydrated && !forceRefresh && now - (store.lastHydratedAt || 0) < 1500) {
    return store;
  }

  // 1. Try Cloudflare KV if bound as SYNC_KV
  if (env && env.SYNC_KV && typeof env.SYNC_KV.get === 'function') {
    try {
      const raw = await env.SYNC_KV.get('CINEMA_XXI_STORE', 'json');
      if (raw && typeof raw === 'object') {
        mergeStoreTables(store, raw);
      }
    } catch {
      // ignore KV error
    }
  }

  // 2. Try Cloudflare Edge Cache API (Zero-Config)
  try {
    const cache = (globalThis as any).caches?.default;
    if (cache) {
      const cachedResp = await cache.match(EDGE_CACHE_URL);
      if (cachedResp) {
        const raw = await cachedResp.json();
        if (raw && typeof raw === 'object') {
          mergeStoreTables(store, raw);
        }
      }
    }
  } catch {
    // ignore cache error
  }

  store.hydrated = true;
  store.lastHydratedAt = Date.now();
  return store;
}

async function persistEdgeStore(store: SyncStoreData, env: any, ctx: any): Promise<void> {
  const payload = JSON.stringify({
    cinema_sales: store.cinema_sales,
    cinema_occupancy: store.cinema_occupancy,
    cinema_config: store.cinema_config,
  });

  const saveTask = async () => {
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

export const onRequest = async (context: any): Promise<Response> => {
  const { request, params, env } = context;
  const action = String(params?.action || '').toLowerCase();

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
        engine: 'Cloudflare Pages Edge Sync Engine + Hybrid Offline-First',
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
      const { table, records, seedMode } = body || {};
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
      const updatedRows: any[] = [];

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
        } else {
          targetTable[id] = normalized;
        }
        updatedRows.push(targetTable[id]);
      }

      await persistEdgeStore(store, env, context);

      return new Response(JSON.stringify({ data: updatedRows, error: null }), {
        status: 200,
        headers: jsonHeaders,
      });
    } catch (err: any) {
      return new Response(
        JSON.stringify({ data: null, error: { message: err?.message || 'Edge upsert error' } }),
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
        JSON.stringify({ data: null, error: { message: err?.message || 'Edge query error' } }),
        { status: 500, headers: jsonHeaders }
      );
    }
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: jsonHeaders });
};
