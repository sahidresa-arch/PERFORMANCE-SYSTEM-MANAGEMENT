import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Prevent transient stream/socket or Vite pre-warm errors from crashing the server process
process.on('uncaughtException', (err) => {
  console.warn('[Server Warning] Caught uncaughtException:', err?.message || err);
});

process.on('unhandledRejection', (reason: any) => {
  console.warn('[Server Warning] Caught unhandledRejection:', reason?.message || reason);
});

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'cinema_xxi_sync_store.json');

interface SyncStoreData {
  cinema_sales: Record<string, any>;
  cinema_occupancy: Record<string, any>;
  cinema_config: Record<string, any>;
}

const syncStore: SyncStoreData = {
  cinema_sales: {},
  cinema_occupancy: {},
  cinema_config: {},
};

// Load persistent store from disk on startup
function loadStoreFromDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (parsed.cinema_sales && typeof parsed.cinema_sales === 'object') {
          syncStore.cinema_sales = parsed.cinema_sales;
        }
        if (parsed.cinema_occupancy && typeof parsed.cinema_occupancy === 'object') {
          syncStore.cinema_occupancy = parsed.cinema_occupancy;
        }
        if (parsed.cinema_config && typeof parsed.cinema_config === 'object') {
          syncStore.cinema_config = parsed.cinema_config;
        }
      }
    }
  } catch (err) {
    console.warn('Internal Sync Store load warning:', err);
  }
}

let saveDiskTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSaveStoreToDisk(): void {
  if (saveDiskTimer) clearTimeout(saveDiskTimer);
  saveDiskTimer = setTimeout(() => {
    saveDiskTimer = null;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_FILE, JSON.stringify(syncStore), 'utf-8');
    } catch (err) {
      console.warn('Internal Sync Store save warning:', err);
    }
  }, 600);
}

loadStoreFromDisk();

// Smart Additive Merge for Array-based Sync Rows so Device A and Device B never overwrite each other's records
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

function isNewerOrEqualIso(nextIso: any, prevIso: any): boolean {
  if (!prevIso) return true;
  if (!nextIso) return false;
  const a = String(nextIso);
  const b = String(prevIso);
  if (a.length === b.length && a.includes('T')) {
    return a >= b;
  }
  const tA = Date.parse(a);
  const tB = Date.parse(b);
  if (!Number.isNaN(tA) && !Number.isNaN(tB)) {
    return tA >= tB;
  }
  return a >= b;
}

function sortAndBoundInspectionShows(shows: any[], isDelta: boolean): any[] {
  if (!Array.isArray(shows) || shows.length <= 1) return shows || [];
  let list = shows;
  if (isDelta) {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const recentOnly = list.filter((s) => s && (!s.date || String(s.date) >= threeDaysAgo));
    if (recentOnly.length > 0) {
      list = recentOnly;
    }
  }
  list.sort((a, b) => {
    const dA = String(a?.date || '');
    const dB = String(b?.date || '');
    if (dA !== dB) return dA < dB ? -1 : 1;
    const uA = String(a?.updatedAt || '');
    const uB = String(b?.updatedAt || '');
    if (uA !== uB) return uA < uB ? -1 : 1;
    return 0;
  });
  if (isDelta && list.length > 240) {
    return list.slice(-240);
  }
  return list;
}

function smartMergeSalesRow(existingRow: any, incomingRow: any): any {
  if (!existingRow || !Array.isArray(existingRow.shows) || !Array.isArray(incomingRow.shows)) {
    return incomingRow;
  }

  const rowId = String(incomingRow.id || '');
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
        if (!prev) {
          mergedMap.set(key, item);
        } else if (isNewerOrEqualIso(item.updatedAt, prev.updatedAt)) {
          mergedMap.set(key, item);
        }
      }
    }
    let finalShows = Array.from(mergedMap.values());
    if (isInspectionRow) {
      finalShows = sortAndBoundInspectionShows(finalShows, rowId.endsWith('_DELTA__'));
    } else if (rowId.endsWith('_DELTA__') && finalShows.length > 180) {
      finalShows = finalShows.slice(-180);
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
        if (!prev) {
          mergedMap.set(key, item);
        } else if (isNewerOrEqualIso(item.updatedAt, prev.updatedAt)) {
          mergedMap.set(key, item);
        }
      } else if (item && item.id) {
        mergedMap.set(String(item.id), item);
      }
    }
    let finalShows = Array.from(mergedMap.values());
    if (rowId.endsWith('_DELTA__') && finalShows.length > 45) {
      finalShows = finalShows.slice(-45);
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

const LIVE_WORKER_ENDPOINTS = [
  'https://performance-system-management.bdv3.workers.dev/api/sync/query',
  'https://performance-system-management-v2.bdv3.workers.dev/api/sync/query',
];

let lastLiveBridgePullAt = 0;
let isLiveBridgePulling = false;

async function hydrateStoreFromLiveWorkers(force = false): Promise<void> {
  const now = Date.now();
  if (isLiveBridgePulling || (!force && now - lastLiveBridgePullAt < 15000)) {
    return;
  }
  isLiveBridgePulling = true;
  lastLiveBridgePullAt = now;

  try {
    let changed = false;

    for (const endpoint of LIVE_WORKER_ENDPOINTS) {
      try {
        const [salesResp, occResp] = await Promise.all([
          fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: 'cinema_sales', columns: '*' }),
            signal: AbortSignal.timeout(5000),
          }),
          fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: 'cinema_occupancy', columns: '*' }),
            signal: AbortSignal.timeout(5000),
          }),
        ]);

        if (salesResp.ok) {
          const salesJson: any = await salesResp.json();
          const rows = Array.isArray(salesJson?.data) ? salesJson.data : [];
          for (const incRow of rows) {
            if (!incRow || !incRow.id) continue;
            const id = String(incRow.id);
            const existing = syncStore.cinema_sales[id];
            if (!existing) {
              syncStore.cinema_sales[id] = incRow;
              changed = true;
            } else {
              if (
                existing.updated_at &&
                incRow.updated_at &&
                existing.updated_at === incRow.updated_at &&
                Array.isArray(existing.shows) &&
                Array.isArray(incRow.shows) &&
                existing.shows.length === incRow.shows.length
              ) {
                continue;
              }
              const prevLen = Array.isArray(existing.shows) ? existing.shows.length : 0;
              const prevTs = existing.updated_at;
              if (isNewerOrEqualIso(incRow.updated_at, existing.updated_at)) {
                syncStore.cinema_sales[id] = smartMergeSalesRow(existing, incRow);
              } else {
                syncStore.cinema_sales[id] = smartMergeSalesRow(incRow, existing);
              }
              const nextRow = syncStore.cinema_sales[id];
              const nextLen = Array.isArray(nextRow?.shows) ? nextRow.shows.length : 0;
              if (nextLen !== prevLen || nextRow?.updated_at !== prevTs) {
                changed = true;
              }
            }
          }
          // Cross-merge DELTA into Master so no show in DELTA is ever missing in Master
          const deltaInsp = syncStore.cinema_sales['__SYSTEM_SYNC_INSPECTIONS_DELTA__'];
          const masterInsp = syncStore.cinema_sales['__SYSTEM_SYNC_INSPECTIONS__'];
          if (deltaInsp && Array.isArray(deltaInsp.shows) && deltaInsp.shows.length > 0 && masterInsp) {
            const prevMasterLen = Array.isArray(masterInsp.shows) ? masterInsp.shows.length : 0;
            syncStore.cinema_sales['__SYSTEM_SYNC_INSPECTIONS__'] = smartMergeSalesRow(masterInsp, {
              ...masterInsp,
              id: '__SYSTEM_SYNC_INSPECTIONS__',
              shows: deltaInsp.shows,
              updated_at: isNewerOrEqualIso(deltaInsp.updated_at, masterInsp.updated_at)
                ? deltaInsp.updated_at
                : masterInsp.updated_at,
            });
            if ((syncStore.cinema_sales['__SYSTEM_SYNC_INSPECTIONS__']?.shows?.length || 0) !== prevMasterLen) {
              changed = true;
            }
          }
        }

        if (occResp.ok) {
          const occJson: any = await occResp.json();
          const occRows = Array.isArray(occJson?.data) ? occJson.data : [];
          for (const incRow of occRows) {
            if (!incRow || !incRow.id) continue;
            const id = String(incRow.id);
            const existing = syncStore.cinema_occupancy[id];
            if (!existing) {
              syncStore.cinema_occupancy[id] = incRow;
              changed = true;
            } else if (
              existing.updated_at !== incRow.updated_at &&
              isNewerOrEqualIso(incRow.updated_at, existing.updated_at)
            ) {
              syncStore.cinema_occupancy[id] = incRow;
              changed = true;
            }
          }
        }
      } catch {
        // ignore transient fetch errors
      }
    }

    if (changed) {
      scheduleSaveStoreToDisk();
    }
  } finally {
    isLiveBridgePulling = false;
  }
}

hydrateStoreFromLiveWorkers(true).catch(() => {});

// Active SSE Clients for Real-Time Cross-Device Broadcast
const sseClients = new Set<express.Response>();

function broadcastSseEvent(eventPayload: any): void {
  const dataStr = `data: ${JSON.stringify(eventPayload)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(dataStr);
    } catch {
      sseClients.delete(res);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // 1. Health & Status Endpoint
  app.get('/api/sync/status', (_req, res) => {
    res.json({
      online: true,
      engine: 'Internal Server Sync Engine + Hybrid Offline-First',
      connectedDevices: sseClients.size,
      salesKeys: Object.keys(syncStore.cinema_sales).length,
      occupancyKeys: Object.keys(syncStore.cinema_occupancy).length,
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Real-Time SSE Stream Endpoint for Instant Device-to-Device Sync (< 50ms)
  app.get('/api/sync/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const cleanup = () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    };

    req.on('close', cleanup);
    req.on('error', cleanup);
    res.on('error', cleanup);

    try {
      res.write(`data: ${JSON.stringify({ type: 'CONNECTED', ts: new Date().toISOString() })}\n\n`);
      sseClients.add(res);
    } catch {
      cleanup();
      return;
    }

    const keepAlive = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        cleanup();
      }
    }, 25000);
  });

  // 3. Upsert Endpoint (Supports single object or array of records)
  app.post('/api/sync/upsert', (req, res) => {
    try {
      const { table, records, clientId, seedMode, returnFull } = req.body || {};
      if (!table || !records) {
        res.status(400).json({ error: 'Missing table or records' });
        return;
      }

      const targetTable =
        table === 'cinema_occupancy'
          ? syncStore.cinema_occupancy
          : table === 'cinema_config'
          ? syncStore.cinema_config
          : syncStore.cinema_sales;

      const list = Array.isArray(records) ? records : [records];
      const nowIso = new Date().toISOString();
      const updatedRows: any[] = [];
      const responseMeta: any[] = [];

      for (const item of list) {
        if (!item || !item.id) continue;
        const id = String(item.id);
        const existing = targetTable[id];

        // In startup seedMode, do not overwrite non-mergeable master rows if they already exist on server
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

          // Atomic Server-Side Cross-Merge: whenever DELTA is upserted, immediately merge into Master
          if (id === '__SYSTEM_SYNC_INSPECTIONS_DELTA__' && Array.isArray(normalized.shows)) {
            const masterId = '__SYSTEM_SYNC_INSPECTIONS__';
            const existingMaster = targetTable[masterId] || {
              id: masterId,
              outlet_id: '__SYSTEM_SYNC__',
              date: '2026-01-01',
              shows: [],
              updated_at: normalized.updated_at,
            };
            targetTable[masterId] = smartMergeSalesRow(existingMaster, {
              ...existingMaster,
              id: masterId,
              shows: normalized.shows,
              updated_at: normalized.updated_at,
            });
            updatedRows.push(targetTable[masterId]);
          } else if (id === '__SYSTEM_SYNC_DAILY_SALES_DELTA__' && Array.isArray(normalized.shows)) {
            const masterId = '__SYSTEM_SYNC_DAILY_SALES__';
            const existingMaster = targetTable[masterId] || {
              id: masterId,
              outlet_id: '__SYSTEM_SYNC__',
              date: '2026-01-01',
              shows: [],
              updated_at: normalized.updated_at,
            };
            targetTable[masterId] = smartMergeSalesRow(existingMaster, {
              ...existingMaster,
              id: masterId,
              shows: normalized.shows,
              updated_at: normalized.updated_at,
            });
            updatedRows.push(targetTable[masterId]);
          }
        } else {
          targetTable[id] = normalized;
        }
        const savedRow = targetTable[id];
        updatedRows.push(savedRow);
        responseMeta.push(
          returnFull
            ? savedRow
            : {
                id: savedRow.id,
                outlet_id: savedRow.outlet_id,
                date: savedRow.date,
                updated_at: savedRow.updated_at,
                count: Array.isArray(savedRow.shows)
                  ? savedRow.shows.length
                  : Array.isArray(savedRow.rows)
                  ? savedRow.rows.length
                  : 1,
              }
        );
      }

      scheduleSaveStoreToDisk();

      // Broadcast to all connected devices immediately
      for (const row of updatedRows) {
        broadcastSseEvent({
          type: 'ROW_UPDATED',
          table,
          id: row.id,
          updated_at: row.updated_at,
          outlet_id: row.outlet_id,
          date: row.date,
          rows: table === 'cinema_occupancy' ? row.rows : undefined,
          clientId: clientId || null,
        });
      }

      res.json({ data: responseMeta, error: null });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { message: err?.message || 'Internal Server Error' } });
    }
  });

  // 4. Query Endpoint (Supports eq, inList, like, maybeSingle, single, head)
  app.post('/api/sync/query', async (req, res) => {
    try {
      if (Object.keys(syncStore.cinema_sales).length === 0) {
        await hydrateStoreFromLiveWorkers(false);
      } else {
        hydrateStoreFromLiveWorkers(false).catch(() => {});
      }
      const { table, columns, eqFilters, inFilter, likeFilter, singleMode, headOnly } = req.body || {};
      const targetTable =
        table === 'cinema_occupancy'
          ? syncStore.cinema_occupancy
          : table === 'cinema_config'
          ? syncStore.cinema_config
          : syncStore.cinema_sales;

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
        res.json({ data: null, count: rows.length, error: null });
        return;
      }

      // Project only requested columns if specified (e.g., 'id, updated_at' to keep metadata check ~400 bytes)
      const colStr = typeof columns === 'string' ? columns.trim() : '*';
      if (colStr && colStr !== '*') {
        const wantedCols = colStr.split(',').map((c) => c.trim()).filter(Boolean);
        rows = rows.map((r) => {
          const projected: Record<string, any> = {};
          for (const c of wantedCols) {
            if (r && c in r) projected[c] = r[c];
          }
          return projected;
        });
      }

      if (singleMode === 'maybeSingle') {
        res.json({ data: rows[0] || null, error: null });
        return;
      }

      if (singleMode === 'single') {
        if (rows.length === 0) {
          res.json({ data: null, error: { code: 'PGRST116', message: 'No rows found' } });
          return;
        }
        res.json({ data: rows[0], error: null });
        return;
      }

      res.json({ data: rows, error: null });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { message: err?.message || 'Query error' } });
    }
  });

  // Mount Vite in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    process.env.DISABLE_HMR = 'true';
    const vitePromise = createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      appType: 'spa',
    });
    vitePromise.catch((err) => {
      console.error('[Vite Init Warning]:', err?.message || err);
    });
    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cinema XXI Internal Sync Server running on http://0.0.0.0:${PORT}`);
  });

  httpServer.on('error', (err: any) => {
    console.error('[HTTP Server Warning]:', err?.message || err);
  });
}

startServer().catch((err) => {
  console.error('[Server Startup Warning]:', err?.message || err);
});
