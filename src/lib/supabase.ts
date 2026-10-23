import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StorageService } from './storage';
import {
  Area,
  Outlet,
  DailySalesRecord,
  BakingSaleRecord,
  ToiletInspectionRecord,
  Employee,
  EmployeeKpiRecord,
  CashierDailyPerformanceRecord,
  CashierMonthlyProductRecord,
  DailySectionSalesRecord,
} from '../types';

let supabaseInstance: SupabaseClient | null = null;
let currentClientKey = '';

/**
 * SQL Schema DDL untuk pembuatan tabel di Supabase Dashboard
 */
export const SUPABASE_SQL_SCHEMA = `-- ===================================================
-- CINEMA XXI EXECUTIVE SUITE - SUPABASE DATABASE DDL
-- Jalankan skrip ini di SQL Editor pada Supabase Dashboard
-- ===================================================

-- 1. Tabel Sales Harian POS Kasir (Show 1 - 5)
CREATE TABLE IF NOT EXISTS public.cinema_sales (
    id TEXT PRIMARY KEY,
    outlet_id TEXT NOT NULL,
    date DATE NOT NULL,
    shows JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel Rekap Okupansi Studio & Show (Show 1 - 7)
CREATE TABLE IF NOT EXISTS public.cinema_occupancy (
    id TEXT PRIMARY KEY, -- Format: {outlet_id}_{date}
    outlet_id TEXT NOT NULL,
    date DATE NOT NULL,
    rows JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabel Penjualan Baking XXI
CREATE TABLE IF NOT EXISTS public.cinema_baking (
    id TEXT PRIMARY KEY,
    outlet_id TEXT NOT NULL,
    date DATE NOT NULL,
    target_baking NUMERIC DEFAULT 0,
    achieve_baking NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabel Card Inspection Toilet (Happy Room Care)
CREATE TABLE IF NOT EXISTS public.cinema_inspections (
    id TEXT PRIMARY KEY,
    outlet_id TEXT NOT NULL,
    date DATE NOT NULL,
    show_number INT NOT NULL,
    type TEXT NOT NULL,
    inspector_name TEXT NOT NULL,
    time TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'Sudah Lapor',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabel HC Area - Data Karyawan (cinema_employees)
CREATE TABLE IF NOT EXISTS public.cinema_employees (
    id TEXT PRIMARY KEY,
    nik TEXT NOT NULL,
    name TEXT NOT NULL,
    jabatan TEXT NOT NULL,
    divisi TEXT NOT NULL,
    outlet_id TEXT NOT NULL,
    gender TEXT DEFAULT 'L',
    tanggal_lahir TEXT DEFAULT '-',
    status_kerja TEXT DEFAULT 'Kontrak',
    tanggal_kontrak TEXT DEFAULT '2026-01-01',
    habis_kontrak TEXT DEFAULT '-',
    phone TEXT DEFAULT '-',
    photo_url TEXT DEFAULT '',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabel HC Area - Penilaian KPI Karyawan (cinema_employee_kpis)
CREATE TABLE IF NOT EXISTS public.cinema_employee_kpis (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    month TEXT NOT NULL,
    score NUMERIC DEFAULT 0,
    notes TEXT DEFAULT '',
    graded_by TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Indeks performa pencarian query
CREATE INDEX IF NOT EXISTS idx_cinema_sales_outlet_date ON public.cinema_sales(outlet_id, date);
CREATE INDEX IF NOT EXISTS idx_cinema_occupancy_outlet_date ON public.cinema_occupancy(outlet_id, date);
CREATE INDEX IF NOT EXISTS idx_cinema_inspections_outlet_date ON public.cinema_inspections(outlet_id, date);
CREATE INDEX IF NOT EXISTS idx_cinema_employees_outlet ON public.cinema_employees(outlet_id);
CREATE INDEX IF NOT EXISTS idx_cinema_employees_nik ON public.cinema_employees(nik);
CREATE INDEX IF NOT EXISTS idx_cinema_employee_kpis_emp_month ON public.cinema_employee_kpis(employee_id, month);

-- 8. Aktifkan Row Level Security (RLS) dengan Policy Akses Anon
ALTER TABLE public.cinema_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cinema_occupancy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cinema_baking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cinema_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cinema_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cinema_employee_kpis ENABLE ROW LEVEL SECURITY;

-- Policy untuk public / anon user
DROP POLICY IF EXISTS "Allow anon all on cinema_sales" ON public.cinema_sales;
CREATE POLICY "Allow anon all on cinema_sales" ON public.cinema_sales FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on cinema_occupancy" ON public.cinema_occupancy;
CREATE POLICY "Allow anon all on cinema_occupancy" ON public.cinema_occupancy FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on cinema_baking" ON public.cinema_baking;
CREATE POLICY "Allow anon all on cinema_baking" ON public.cinema_baking FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on cinema_inspections" ON public.cinema_inspections;
CREATE POLICY "Allow anon all on cinema_inspections" ON public.cinema_inspections FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on cinema_employees" ON public.cinema_employees;
CREATE POLICY "Allow anon all on cinema_employees" ON public.cinema_employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on cinema_employee_kpis" ON public.cinema_employee_kpis;
CREATE POLICY "Allow anon all on cinema_employee_kpis" ON public.cinema_employee_kpis FOR ALL USING (true) WITH CHECK (true);

-- 9. Aktifkan Supabase Realtime untuk Seluruh Tabel Sinkronisasi Utama & HC Area
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'cinema_sales',
    'cinema_occupancy',
    'cinema_baking',
    'cinema_inspections',
    'cinema_employees',
    'cinema_employee_kpis'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;
`;

export function sanitizeSupabaseBaseUrl(rawUrl: string): string {
  return (rawUrl || '').trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
}

const DEVICE_CLIENT_ID = `dev_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
let hybridClientInstance: SupabaseClient | null = null;
let hybridClientKey = '';
let supabaseQuotaBackoffUntil = 0;
let lastSupabaseMetaPollAt = 0;

function getWorkerSyncEndpoints(action: 'query' | 'upsert' | 'status'): string[] {
  const endpoints = [`/api/sync/${action}`];
  if (typeof window !== 'undefined' && window.location?.hostname?.includes('bdv3.workers.dev')) {
    const host = window.location.hostname;
    if (host.includes('-v2.')) {
      endpoints.push(`https://performance-system-management.bdv3.workers.dev/api/sync/${action}`);
    } else {
      endpoints.push(`https://performance-system-management-v2.bdv3.workers.dev/api/sync/${action}`);
    }
  }
  return endpoints;
}

async function callInternalSyncQuery(payload: any): Promise<any> {
  const endpoints = getWorkerSyncEndpoints('query');

  const fetchOne = async (url: string) => {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (resp.ok && (resp.headers.get('content-type') || '').includes('application/json')) {
        return await resp.json();
      }
    } catch {
      // ignore network error
    }
    return null;
  };

  if (endpoints.length === 1) {
    return fetchOne(endpoints[0]);
  }

  const results = (await Promise.all(endpoints.map(fetchOne))).filter(Boolean);
  if (results.length === 0) return null;
  if (results.length === 1) return results[0];

  if (payload.headOnly) {
    const maxCount = Math.max(...results.map((r: any) => Number(r?.count || 0)));
    return { data: null, count: maxCount, error: null };
  }

  if (payload.singleMode === 'maybeSingle' || payload.singleMode === 'single') {
    let bestRow: any = null;
    for (const res of results) {
      const candidate = res?.data;
      if (!candidate) continue;
      if (!bestRow) {
        bestRow = candidate;
      } else {
        const bTs = bestRow.updated_at ? new Date(bestRow.updated_at).getTime() : 0;
        const cTs = candidate.updated_at ? new Date(candidate.updated_at).getTime() : 0;
        if (cTs > bTs) {
          bestRow = candidate;
        }
      }
    }
    return { data: bestRow, error: null };
  }

  // Merge array results across endpoints by row.id picking newest updated_at
  const mergedMap = new Map<string, any>();
  for (const res of results) {
    const list = Array.isArray(res?.data) ? res.data : [];
    for (const row of list) {
      if (!row || !row.id) continue;
      const key = String(row.id);
      const prev = mergedMap.get(key);
      if (!prev) {
        mergedMap.set(key, row);
      } else {
        const pTs = prev.updated_at ? new Date(prev.updated_at).getTime() : 0;
        const rTs = row.updated_at ? new Date(row.updated_at).getTime() : 0;
        if (rTs >= pTs) {
          mergedMap.set(key, row);
        }
      }
    }
  }

  return { data: Array.from(mergedMap.values()), error: null };
}

async function callInternalSyncUpsert(payload: any): Promise<{ ok: boolean; data: any }> {
  const endpoints = getWorkerSyncEndpoints('upsert');
  let primaryOk = false;
  let primaryData: any = null;

  for (let i = 0; i < endpoints.length; i++) {
    const url = endpoints[i];
    if (i === 0 || !primaryOk) {
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (resp.ok && (resp.headers.get('content-type') || '').includes('application/json')) {
          const json = await resp.json();
          primaryData = json.data;
          primaryOk = true;
        }
      } catch {
        // try sibling worker endpoint
      }
    } else {
      // Mirror in background to sibling Worker (-v2 <-> main) so both links stay 100% identical
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
  }

  return { ok: primaryOk, data: primaryData };
}

function createInternalTableQueryBuilder(table: string, rawSupabase: SupabaseClient | null) {
  let selectCols = '*';
  let headOnly = false;
  const eqFilters: Array<{ col: string; val: any }> = [];
  let inFilter: { col: string; vals: any[] } | null = null;
  let likeFilter: { col: string; pattern: string } | null = null;
  let singleMode: 'none' | 'maybeSingle' | 'single' = 'none';

  const mergeSyncRowObjects = (rowA: any, rowB: any): any => {
    if (!rowA) return rowB;
    if (!rowB) return rowA;
    const tsA = rowA.updated_at ? new Date(rowA.updated_at).getTime() : 0;
    const tsB = rowB.updated_at ? new Date(rowB.updated_at).getTime() : 0;
    const older = tsA <= tsB ? rowA : rowB;
    const newer = tsA <= tsB ? rowB : rowA;

    if (
      Array.isArray(older.shows) &&
      Array.isArray(newer.shows) &&
      String(newer.id || '').startsWith('__SYSTEM_SYNC_')
    ) {
      const firstSample = newer.shows[0] || older.shows[0];
      if (
        firstSample &&
        typeof firstSample === 'object' &&
        !Array.isArray(firstSample) &&
        (firstSample.id || (firstSample.outletId && (firstSample.date || firstSample.month)))
      ) {
        const itemMap = new Map<string, any>();
        const getKey = (item: any, idx: number) => {
          if (!item || typeof item !== 'object') return `idx_${idx}`;
          if (item.outletId && item.date && item.showNumber !== undefined && item.type) {
            return `${item.outletId}-${item.date}-show${Number(item.showNumber)}-${item.type}`;
          }
          if (item.id) return String(item.id);
          if (item.outletId && item.date && item.nik) {
            return `${item.outletId}_${item.date}_${item.nik}`;
          }
          if (item.outletId && item.date) {
            return `${item.outletId}_${item.date}`;
          }
          if (item.outletId && item.month) {
            return `${item.outletId}_${item.month}`;
          }
          return `idx_${idx}`;
        };
        older.shows.forEach((it: any, i: number) => itemMap.set(getKey(it, i), it));
        newer.shows.forEach((it: any, i: number) => itemMap.set(getKey(it, i), it));
        return {
          ...newer,
          shows: Array.from(itemMap.values()),
        };
      }
    }

    return newer;
  };

  const executeSelect = async (): Promise<{ data: any; error: any; count?: number }> => {
    const fetchInternal = () =>
      callInternalSyncQuery({
        table,
        columns: selectCols,
        eqFilters,
        inFilter,
        likeFilter,
        singleMode,
        headOnly,
      });

    const fetchSupa = async () => {
      if (!rawSupabase) return null;
      if (Date.now() < supabaseQuotaBackoffUntil) {
        // Circuit-breaker aktif saat kuota Supabase penuh/gangguan -> 100% jalan lewat Internal Server tanpa delay
        return null;
      }
      try {
        let q: any = rawSupabase
          .from(table)
          .select(selectCols, headOnly ? { count: 'exact', head: true } : undefined);
        for (const f of eqFilters) {
          q = q.eq(f.col, f.val);
        }
        if (inFilter) {
          q = q.in(inFilter.col, inFilter.vals);
        }
        if (likeFilter) {
          q = q.like(likeFilter.col, likeFilter.pattern);
        }
        if (singleMode === 'maybeSingle') {
          q = q.maybeSingle();
        } else if (singleMode === 'single') {
          q = q.single();
        }

        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 2500)
        );
        const supaRes: any = await Promise.race([q, timeoutPromise]);
        if (supaRes && !supaRes.error) {
          return supaRes;
        }
        if (!supaRes || supaRes.error) {
          supabaseQuotaBackoffUntil = Date.now() + 45000;
        }
      } catch {
        // Jika Supabase penuh/error, aktifkan circuit-breaker 45 detik agar aplikasi tetap 0ms cepat via Internal Server
        supabaseQuotaBackoffUntil = Date.now() + 45000;
      }
      return null;
    };

    // Fetch from Internal Server Sync Engine first; only poll Supabase Cloud for routine metadata checks once every 90s (or when Internal Server is empty) to keep Log Ingestion & Egress near 0
    const isMetaHeartbeat = selectCols.replace(/\s+/g, '') === 'id,updated_at';
    const internalRes = await fetchInternal();
    const hasWarmInternalMeta =
      isMetaHeartbeat && Array.isArray(internalRes?.data) && internalRes.data.length > 0;
    const shouldSkipSupaMeta =
      hasWarmInternalMeta && Date.now() - lastSupabaseMetaPollAt < 90000;

    let supaRes: any = null;
    if (!shouldSkipSupaMeta) {
      if (isMetaHeartbeat) {
        lastSupabaseMetaPollAt = Date.now();
      }
      supaRes = await fetchSupa();
    }

    if (headOnly) {
      const count = Math.max(internalRes?.count ?? 0, supaRes?.count ?? 0);
      return { data: null, error: null, count };
    }

    // Cache full rows from Supabase into Internal Server so Internal Server always stays warm
    if (
      supaRes?.data &&
      (selectCols === '*' ||
        selectCols.includes('shows') ||
        selectCols.includes('rows') ||
        selectCols.includes('config'))
    ) {
      const rowsToCache = Array.isArray(supaRes.data) ? supaRes.data : [supaRes.data];
      if (rowsToCache.length > 0 && rowsToCache[0]?.id) {
        callInternalSyncUpsert({
          table,
          records: rowsToCache,
          clientId: DEVICE_CLIENT_ID,
          seedMode: true,
        }).catch(() => {});
      }
    }

    if (singleMode === 'maybeSingle' || singleMode === 'single') {
      const intRow = internalRes?.data || null;
      const supRow = supaRes?.data || null;
      const chosen = mergeSyncRowObjects(intRow, supRow);
      if (!chosen && singleMode === 'single') {
        return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
      }
      return { data: chosen, error: null };
    }

    const intList = Array.isArray(internalRes?.data) ? internalRes.data : [];
    const supList = Array.isArray(supaRes?.data) ? supaRes.data : [];

    if (intList.length > 0 && supList.length > 0) {
      const mergedMap = new Map<string, any>();
      for (const r of supList) {
        if (r && r.id) mergedMap.set(String(r.id), r);
      }
      for (const r of intList) {
        if (r && r.id) {
          const key = String(r.id);
          const prev = mergedMap.get(key);
          if (!prev) {
            mergedMap.set(key, r);
          } else {
            mergedMap.set(key, mergeSyncRowObjects(prev, r));
          }
        }
      }
      return { data: Array.from(mergedMap.values()), error: null };
    }

    return {
      data: intList.length > 0 ? intList : supList,
      error: null,
    };
  };

  const builder: any = {
    select(cols = '*', opts?: { count?: string; head?: boolean }) {
      selectCols = cols;
      if (opts?.head) headOnly = true;
      return builder;
    },
    eq(col: string, val: any) {
      eqFilters.push({ col, val });
      return builder;
    },
    in(col: string, vals: any[]) {
      inFilter = { col, vals };
      return builder;
    },
    like(col: string, pattern: string) {
      likeFilter = { col, pattern };
      return builder;
    },
    maybeSingle() {
      singleMode = 'maybeSingle';
      return executeSelect();
    },
    single() {
      singleMode = 'single';
      return executeSelect();
    },
    then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
      return executeSelect().then(onfulfilled, onrejected);
    },
    async upsert(records: any, options?: any) {
      // 1. Primary: Save to Internal Server Sync Engine + Cross-Worker Auto-Bridge (main <-> v2)
      const internalRes = await callInternalSyncUpsert({
        table,
        records,
        clientId: DEVICE_CLIENT_ID,
      });

      // 2. Secondary Background Mirror: Mirror additively-merged rows from Internal Server to Supabase Cloud
      // so a device with partial local state never overwrites previous shows in Supabase JSONB
      if (rawSupabase) {
        const recordsToMirror =
          internalRes.ok && Array.isArray(internalRes.data) && internalRes.data.length > 0
            ? !Array.isArray(records) && internalRes.data.length === 1
              ? internalRes.data[0]
              : internalRes.data
            : records;
        Promise.resolve(rawSupabase.from(table).upsert(recordsToMirror, options)).catch(() => {});
      }

      if (internalRes.ok) {
        return { data: internalRes.data, error: null };
      }

      if (rawSupabase) {
        try {
          return await rawSupabase.from(table).upsert(records, options);
        } catch (err: any) {
          return { data: null, error: null };
        }
      }

      return { data: null, error: null };
    },
  };

  return builder;
}

export function getSupabase(): SupabaseClient | null {
  const config = StorageService.getConfig();
  const url = sanitizeSupabaseBaseUrl(
    config.supabaseUrl || (import.meta as any).env?.VITE_SUPABASE_URL || ''
  );
  const key = (config.supabaseAnonKey || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '').trim();

  const clientKey = `${url}___${key}`;
  if (url && key && (!supabaseInstance || currentClientKey !== clientKey)) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: { persistSession: true },
      });
      currentClientKey = clientKey;
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
    }
  }

  if (!hybridClientInstance || hybridClientKey !== clientKey) {
    hybridClientKey = clientKey;
    const proxy: any = {
      from(table: string) {
        return createInternalTableQueryBuilder(table, supabaseInstance);
      },
      channel(name: string) {
        if (supabaseInstance) return supabaseInstance.channel(name);
        return {
          on() { return this; },
          subscribe() { return this; },
        };
      },
      removeChannel(ch: any) {
        if (supabaseInstance && ch) return supabaseInstance.removeChannel(ch);
        return Promise.resolve();
      },
    };
    hybridClientInstance = proxy as SupabaseClient;
  }

  return hybridClientInstance;
}

export interface SupabaseConnectionStatus {
  connected: boolean;
  message: string;
  hasTables?: boolean;
}

export async function testSupabaseConnection(
  url: string,
  key: string
): Promise<SupabaseConnectionStatus> {
  const cleanUrl = sanitizeSupabaseBaseUrl(url);
  const cleanKey = (key || '').trim();
  if (!cleanUrl || !cleanKey) {
    return {
      connected: false,
      message: 'URL dan Anon Key Supabase harus diisi.',
    };
  }

  try {
    const client = createClient(cleanUrl, cleanKey);

    // Coba query test ke cinema_sales
    const { error: salesError } = await client
      .from('cinema_sales')
      .select('id', { count: 'exact', head: true });

    // Jika tabel ada dan tidak ada error
    if (!salesError) {
      return {
        connected: true,
        message: 'Berhasil terhubung ke Supabase! Tabel database cinema_sales siap digunakan.',
        hasTables: true,
      };
    }

    // Jika error karena tabel belum dibuat di Supabase (code 42P01 = undefined_table)
    if (salesError.code === '42P01' || salesError.message?.includes('relation "public.cinema_sales" does not exist')) {
      return {
        connected: true,
        message: 'Koneksi ke Supabase Berhasil! Tabel belum dibuat di SQL Editor (Gunakan DDL Script yang disediakan).',
        hasTables: false,
      };
    }

    // Cek error otentikasi JWT invalid
    if (salesError.message?.includes('JWT') || salesError.code === 'PGRST301') {
      return {
        connected: false,
        message: 'Anon Key tidak valid atau kedaluwarsa. Periksa kembali API Keys di Supabase Project Settings.',
      };
    }

    return {
      connected: true,
      message: `Terhubung ke Supabase (${salesError.message})`,
      hasTables: false,
    };
  } catch (err: any) {
    console.warn('Supabase test error:', err);
    return {
      connected: false,
      message: `Gagal terhubung ke host Supabase: ${err.message || 'Network error'}`,
    };
  }
}

// ============================================================================
// ZERO-WASTE EGRESS & LOG INGESTION ENGINE (PERSISTENT TIMESTAMP REGISTRY)
// ============================================================================
const SYNC_TS_STORAGE_KEY = 'cinema_xxi_sync_timestamps_v5';
const lastSeenSyncTimestamps: Record<string, string> = (() => {
  try {
    const raw = localStorage.getItem(SYNC_TS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
})();
const lastLocalWriteTimeByRow: Record<string, number> = {};
const realtimeDebounceTimers: Record<string, any> = {};

function recordSyncTimestamp(rowId: string, updatedAt: string, isLocalWrite = false): void {
  if (!rowId || !updatedAt) return;
  lastSeenSyncTimestamps[rowId] = String(updatedAt);
  if (isLocalWrite) {
    lastLocalWriteTimeByRow[rowId] = Date.now();
  }
  try {
    localStorage.setItem(SYNC_TS_STORAGE_KEY, JSON.stringify(lastSeenSyncTimestamps));
  } catch {
    // ignore
  }
}

function isEchoFromOwnWrite(rowId: string, incomingUpdatedAt?: string): boolean {
  const lastWriteMs = lastLocalWriteTimeByRow[rowId] || 0;
  if (lastWriteMs > 0 && Date.now() - lastWriteMs < 6000) {
    return true;
  }
  if (incomingUpdatedAt && lastSeenSyncTimestamps[rowId] === String(incomingUpdatedAt)) {
    return true;
  }
  return false;
}

function scheduleDebouncedRealtimeMerge(key: string, fn: () => Promise<any>, delayMs = 400): void {
  if (realtimeDebounceTimers[key]) {
    clearTimeout(realtimeDebounceTimers[key]);
  }
  realtimeDebounceTimers[key] = setTimeout(() => {
    delete realtimeDebounceTimers[key];
    fn().catch(() => {});
  }, delayMs);
}

const recentSalesDeltaMap = new Map<string, DailySalesRecord>();
const recentInspectionsDeltaMap = new Map<string, ToiletInspectionRecord>();
const occupancyWriteTimers: Record<string, any> = {};
let salesArchiveTimer: NodeJS.Timeout | null = null;

/**
 * Sinkronisasi Data Sales Harian ke Supabase (Hemat Egress: Master Sync + 2 KB Delta Row untuk Live Broadcast)
 */
export async function syncSalesToSupabase(sales: DailySalesRecord[]): Promise<boolean> {
  const client = getSupabase();
  if (!client || sales.length === 0) return false;

  try {
    const nowIso = new Date().toISOString();
    const normalSales = sales.filter(
      (s) =>
        s &&
        s.outletId &&
        s.date &&
        !String(s.id || '').startsWith('__SYSTEM_SYNC_') &&
        !StorageService.isStaticUneditedSalesRecord(s)
    );

    if (normalSales.length === 0) return true;

    const overrideMap = new Map<string, DailySalesRecord>();

    // Jika perangkat ini belum pernah sinkronisasi awal, ambil dulu dari server agar tidak menimpa data device lain
    if (!lastSeenSyncTimestamps['__SYSTEM_SYNC_DAILY_SALES__']) {
      const { data: syncRow } = await client
        .from('cinema_sales')
        .select('id, shows')
        .eq('id', '__SYSTEM_SYNC_DAILY_SALES__')
        .maybeSingle();

      const remoteOverrides: DailySalesRecord[] =
        syncRow && Array.isArray(syncRow.shows) ? syncRow.shows : [];
      remoteOverrides.forEach((r) => {
        if (r && r.outletId && r.date && !StorageService.isStaticUneditedSalesRecord(r)) {
          overrideMap.set(`${r.outletId}_${r.date}`, {
            ...r,
            id: `sales-${r.outletId}-${r.date}`,
            isMigrated: false,
          });
        }
      });
    }

    // Gabungkan dengan local overrides yang sudah ada di memori lokal
    const localOverrides = StorageService.getUserSalesOverrides();
    localOverrides.forEach((loc) => {
      if (!loc || !loc.outletId || !loc.date) return;
      const key = `${loc.outletId}_${loc.date}`;
      const existing = overrideMap.get(key);
      if (!existing) {
        overrideMap.set(key, {
          ...loc,
          id: `sales-${loc.outletId}-${loc.date}`,
          isMigrated: false,
        });
      } else {
        const remTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const locTime = loc.updatedAt ? new Date(loc.updatedAt).getTime() : 0;
        if (locTime >= remTime) {
          overrideMap.set(key, {
            ...loc,
            id: `sales-${loc.outletId}-${loc.date}`,
            isMigrated: false,
          });
        }
      }
    });

    // Terapkan data sales yang baru saja disimpan sebagai prioritas tertinggi & masukkan ke Delta Buffer (~2 KB)
    normalSales.forEach((s) => {
      const key = `${s.outletId}_${s.date}`;
      const normalizedItem: DailySalesRecord = {
        ...s,
        id: `sales-${s.outletId}-${s.date}`,
        isMigrated: false,
        updatedAt: s.updatedAt || nowIso,
      };
      overrideMap.set(key, normalizedItem);
      recentSalesDeltaMap.delete(key);
      recentSalesDeltaMap.set(key, normalizedItem);
    });

    // Batasi Delta Buffer maksimal 15 record terbaru (~2-5 KB)
    while (recentSalesDeltaMap.size > 15) {
      const oldestKey = recentSalesDeltaMap.keys().next().value;
      if (oldestKey) recentSalesDeltaMap.delete(oldestKey);
      else break;
    }

    const finalOverrides = Array.from(overrideMap.values());
    const deltaSalesList = Array.from(recentSalesDeltaMap.values());

    // 1. Kirim Delta Sales (~1 KB) secara instan ke Supabase agar realtime super responsif
    recordSyncTimestamp('__SYSTEM_SYNC_DAILY_SALES_DELTA__', nowIso, true);
    const { error: deltaErr } = await client.from('cinema_sales').upsert(
      [
        {
          id: '__SYSTEM_SYNC_DAILY_SALES_DELTA__',
          outlet_id: '__SYSTEM_SYNC__',
          date: '2026-01-01',
          shows: deltaSalesList as any,
          updated_at: nowIso,
        },
      ],
      { onConflict: 'id' }
    );

    // 2. Debounce master sales archive (2.5 detik) agar langsung tersimpan di master tanpa membebani setiap ketukan
    if (salesArchiveTimer) clearTimeout(salesArchiveTimer);
    salesArchiveTimer = setTimeout(async () => {
      salesArchiveTimer = null;
      try {
        const cl = getSupabase();
        if (!cl) return;
        const archIso = new Date().toISOString();
        recordSyncTimestamp('__SYSTEM_SYNC_DAILY_SALES__', archIso, true);
        await cl.from('cinema_sales').upsert(
          [
            {
              id: '__SYSTEM_SYNC_DAILY_SALES__',
              outlet_id: '__SYSTEM_SYNC__',
              date: '2026-01-01',
              shows: finalOverrides as any,
              updated_at: archIso,
            },
          ],
          { onConflict: 'id' }
        );
      } catch (err) {
        console.warn('Sales archive debounced sync error:', err);
      }
    }, 2500);

    return !deltaErr;
  } catch (e) {
    console.warn('Supabase sales sync error:', e);
    return false;
  }
}

/**
 * Ambil Data Sales Harian dari Supabase (Menggabungkan Master Archive & Delta Terbaru)
 */
export async function fetchSalesFromSupabase(deltaOnly = false): Promise<DailySalesRecord[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const dedupedMap = new Map<string, DailySalesRecord>();

    if (deltaOnly) {
      const { data: syncRow, error } = await client
        .from('cinema_sales')
        .select('id, shows, updated_at')
        .eq('id', '__SYSTEM_SYNC_DAILY_SALES_DELTA__')
        .maybeSingle();

      if (error) return null;

      if (syncRow) {
        if (syncRow.updated_at) {
          recordSyncTimestamp('__SYSTEM_SYNC_DAILY_SALES_DELTA__', String(syncRow.updated_at), false);
        }
        if (Array.isArray(syncRow.shows)) {
          for (const item of syncRow.shows) {
            if (item && item.outletId && item.date) {
              const key = `${item.outletId}_${item.date}`;
              dedupedMap.set(key, {
                id: `sales-${item.outletId}-${item.date}`,
                outletId: item.outletId,
                date: item.date,
                shows: Array.isArray(item.shows) ? item.shows : [],
                isMigrated: false,
                updatedAt: item.updatedAt || syncRow.updated_at || undefined,
              });
            }
          }
        }
      }
    } else {
      const { data: syncRows, error } = await client
        .from('cinema_sales')
        .select('id, shows, updated_at')
        .in('id', ['__SYSTEM_SYNC_DAILY_SALES__', '__SYSTEM_SYNC_DAILY_SALES_DELTA__']);

      if (error || !Array.isArray(syncRows)) return null;

      const masterRow = syncRows.find((r: any) => r.id === '__SYSTEM_SYNC_DAILY_SALES__');
      const deltaRow = syncRows.find((r: any) => r.id === '__SYSTEM_SYNC_DAILY_SALES_DELTA__');

      if (masterRow) {
        if (masterRow.updated_at) {
          recordSyncTimestamp('__SYSTEM_SYNC_DAILY_SALES__', String(masterRow.updated_at), false);
        }
        if (Array.isArray(masterRow.shows)) {
          for (const item of masterRow.shows) {
            if (item && item.outletId && item.date) {
              const key = `${item.outletId}_${item.date}`;
              dedupedMap.set(key, {
                id: `sales-${item.outletId}-${item.date}`,
                outletId: item.outletId,
                date: item.date,
                shows: Array.isArray(item.shows) ? item.shows : [],
                isMigrated: false,
                updatedAt: item.updatedAt || masterRow.updated_at || undefined,
              });
            }
          }
        }
      }

      if (deltaRow) {
        if (deltaRow.updated_at) {
          recordSyncTimestamp('__SYSTEM_SYNC_DAILY_SALES_DELTA__', String(deltaRow.updated_at), false);
        }
        if (Array.isArray(deltaRow.shows)) {
          for (const item of deltaRow.shows) {
            if (item && item.outletId && item.date) {
              const key = `${item.outletId}_${item.date}`;
              const existing = dedupedMap.get(key);
              const exTime = existing?.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
              const delTime = item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now();
              if (!existing || delTime >= exTime) {
                dedupedMap.set(key, {
                  id: `sales-${item.outletId}-${item.date}`,
                  outletId: item.outletId,
                  date: item.date,
                  shows: Array.isArray(item.shows) ? item.shows : [],
                  isMigrated: false,
                  updatedAt: item.updatedAt || deltaRow.updated_at || undefined,
                });
              }
            }
          }
        }
      }
    }

    return Array.from(dedupedMap.values());
  } catch (e) {
    console.warn('Supabase fetch sales error:', e);
    return null;
  }
}

/**
 * Sinkronisasi Data Okupansi Studio ke Supabase (Dengan Write-Coalescing Debounce 750ms saat mengetik)
 */
export async function syncOccupancyToSupabase(
  outletId: string,
  date: string,
  rows: any[],
  skipMetaPointer = false
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  const id = `${outletId}_${date}`;

  // Jika dipanggil dari ketikan tabel (skipMetaPointer === false), gabungkan ketikan beruntun selama 750ms menjadi 1 request saja
  if (!skipMetaPointer) {
    return new Promise((resolve) => {
      if (occupancyWriteTimers[id]) {
        clearTimeout(occupancyWriteTimers[id]);
      }
      occupancyWriteTimers[id] = setTimeout(async () => {
        delete occupancyWriteTimers[id];
        const ok = await executeOccupancyUpsert(outletId, date, rows, false);
        resolve(ok);
      }, 750);
    });
  }

  return executeOccupancyUpsert(outletId, date, rows, true);
}

async function executeOccupancyUpsert(
  outletId: string,
  date: string,
  rows: any[],
  skipMetaPointer: boolean
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const nowIso = new Date().toISOString();
    const id = `${outletId}_${date}`;
    recordSyncTimestamp('__SYSTEM_SYNC_OCCUPANCY__', nowIso, true);

    const { error } = await client.from('cinema_occupancy').upsert(
      {
        id,
        outlet_id: outletId,
        date,
        rows,
        updated_at: nowIso,
      },
      { onConflict: 'id' }
    );

    if (!skipMetaPointer) {
      await client.from('cinema_sales').upsert(
        {
          id: '__SYSTEM_SYNC_OCCUPANCY__',
          outlet_id: '__SYSTEM_SYNC__',
          date: '2026-01-01',
          shows: [{ lastOutletId: outletId, lastDate: date, updatedAt: nowIso }] as any,
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );
    }

    if (error) {
      console.warn('Sync occupancy to Supabase warning:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.warn('Supabase occupancy sync error:', e);
    return false;
  }
}

/**
 * Ambil Rekap Okupansi dari Supabase
 */
export async function fetchOccupancyFromSupabase(
  outletId?: string,
  date?: string
): Promise<any[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    let query = client.from('cinema_occupancy').select('id, outlet_id, date, rows, updated_at');
    if (outletId) query = query.eq('outlet_id', outletId);
    if (date) query = query.eq('date', date);

    const { data, error } = await query;
    if (error || !data) return null;

    return data;
  } catch (e) {
    console.warn('Supabase fetch occupancy error:', e);
    return null;
  }
}

/**
 * Merges remote sales records from Supabase into local storage (Strict Read-Only: Supports 2 KB Delta Mode)
 */
export async function mergeRemoteSalesToLocal(deltaOnly = false): Promise<boolean> {
  const remoteSales = await fetchSalesFromSupabase(deltaOnly);
  if (!remoteSales || remoteSales.length === 0) return false;

  const currentLocal = StorageService.getDailySales();
  const localOverrides = StorageService.getUserSalesOverrides();
  const overrideMap = new Map<string, DailySalesRecord>();
  localOverrides.forEach((ov) => {
    if (ov && ov.outletId && ov.date) {
      overrideMap.set(`${ov.outletId}_${ov.date}`, ov);
    }
  });

  let updated = false;

  remoteSales.forEach((remote) => {
    const key = `${remote.outletId}_${remote.date}`;

    try {
      const localSaveTsRaw = localStorage.getItem(`cinema_xxi_sales_local_save_ts_${key}`);
      if (localSaveTsRaw) {
        const localSaveTs = Number(localSaveTsRaw);
        const remoteTs = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
        if (Date.now() - localSaveTs < 10000 && remoteTs < localSaveTs) {
          return;
        }
      }
    } catch {
      // ignore
    }

    const idx = currentLocal.findIndex(
      (s) => s.outletId === remote.outletId && s.date === remote.date
    );
    const normalizedRemote: DailySalesRecord = {
      ...remote,
      id: `sales-${remote.outletId}-${remote.date}`,
      isMigrated: false,
    };

    if (idx >= 0) {
      const localStr = JSON.stringify(currentLocal[idx].shows || []);
      const remoteStr = JSON.stringify(remote.shows || []);
      if (localStr !== remoteStr) {
        currentLocal[idx] = normalizedRemote;
        if (!StorageService.isStaticUneditedSalesRecord(normalizedRemote)) {
          overrideMap.set(key, normalizedRemote);
        }
        updated = true;
      }
    } else {
      currentLocal.push(normalizedRemote);
      if (!StorageService.isStaticUneditedSalesRecord(normalizedRemote)) {
        overrideMap.set(key, normalizedRemote);
      }
      updated = true;
    }
  });

  if (updated) {
    try {
      localStorage.setItem(
        'cinema_xxi_user_sales_overrides',
        JSON.stringify(Array.from(overrideMap.values()))
      );
      localStorage.setItem('cinema_xxi_daily_sales', JSON.stringify(currentLocal));
    } catch {
      // ignore
    }
    StorageService.broadcastChange('sales');
  }

  return updated;
}

/**
 * Merges remote occupancy records from Supabase into local storage (Smart Target / Full)
 */
export async function mergeRemoteOccupancyToLocal(
  targetOutletId?: string,
  targetDate?: string
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  // Jika dipanggil dari delta sync tanpa parameter spesifik, cek pointer __SYSTEM_SYNC_OCCUPANCY__ dulu agar hanya unduh 1 baris (~1 KB)
  if (!targetOutletId && !targetDate && hasCompletedInitialPull) {
    try {
      const { data: ptrRow } = await client
        .from('cinema_sales')
        .select('id, shows, updated_at')
        .eq('id', '__SYSTEM_SYNC_OCCUPANCY__')
        .maybeSingle();
      if (ptrRow?.updated_at) {
        recordSyncTimestamp('__SYSTEM_SYNC_OCCUPANCY__', String(ptrRow.updated_at), false);
      }
      const ptr = Array.isArray(ptrRow?.shows) ? ptrRow.shows[0] : null;
      if (ptr && ptr.lastOutletId && ptr.lastDate) {
        targetOutletId = ptr.lastOutletId;
        targetDate = ptr.lastDate;
      }
    } catch {
      // fallback
    }
  }

  const remoteOcc = await fetchOccupancyFromSupabase(targetOutletId, targetDate);
  if (!remoteOcc || remoteOcc.length === 0) return false;

  let updated = false;
  remoteOcc.forEach((row: any) => {
    const outletId = row.outlet_id;
    const date = row.date;
    const rows = Array.isArray(row.rows) ? row.rows : [];
    if (outletId && date && rows.length > 0) {
      const key1 = `cinema_xxi_occupancy_records_${outletId}_${date}`;
      const key2 = `cinema_xxi_occupancy_${outletId}_${date}`;
      const existingRaw = localStorage.getItem(key1) || localStorage.getItem(key2);
      const newRaw = JSON.stringify(rows);
      if (existingRaw !== newRaw) {
        localStorage.setItem(key1, newRaw);
        localStorage.setItem(key2, newRaw);
        try {
          const manRaw = localStorage.getItem('cinema_xxi_occupancy_manifest');
          const man = manRaw ? JSON.parse(manRaw) : {};
          if (!man[outletId]) man[outletId] = [];
          if (!man[outletId].includes(date)) {
            man[outletId].push(date);
            localStorage.setItem('cinema_xxi_occupancy_manifest', JSON.stringify(man));
          }
        } catch {
          // ignore
        }
        StorageService.syncOccupancyToMovieHistory(outletId, date, rows);
        updated = true;
      }
    }
  });

  if (updated) {
    StorageService.broadcastChange('occupancy');
    StorageService.broadcastChange('movies');
  }

  return updated;
}

// Cache tabel opsional yang belum dibuat di SQL Editor agar tidak memicu request 404 berulang (Hemat Log Ingestion)
const missingOptionalTables = new Set<string>();

function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}

let inspectionArchiveTimer: NodeJS.Timeout | null = null;
const pendingArchiveInspections = new Map<string, ToiletInspectionRecord>();

/**
 * Sinkronisasi Satu Record Card Inspection ke Supabase (Delta Instan + Safe Merge Master Archive 1.5 Detik)
 */
function normalizeInspectionItem(item: any): ToiletInspectionRecord | null {
  if (!item || !item.outletId || !item.date || item.showNumber === undefined || !item.type) {
    return null;
  }
  const showNum = Number(item.showNumber) || 1;
  const canonicalId = `${item.outletId}-${item.date}-show${showNum}-${item.type}`;
  return {
    ...item,
    id: canonicalId,
    showNumber: showNum,
  };
}

/**
 * Sinkronisasi Satu Record Card Inspection ke Supabase (Delta Instan + Safe Merge Master Archive)
 */
export async function syncInspectionToSupabase(record: ToiletInspectionRecord): Promise<boolean> {
  const client = getSupabase();
  if (!client || !record) return false;

  try {
    const nowIso = new Date().toISOString();
    const normalizedRecord = normalizeInspectionItem({
      ...record,
      updatedAt: (record as any).updatedAt || nowIso,
    });
    if (!normalizedRecord) return false;

    // 1. Seed Delta Buffer dengan SELURUH data inspeksi dari outlet & tanggal yang sama dari localStorage
    // agar Show 1 s/d Show 5 di outlet tersebut selalu utuh di dalam paket Delta maupun Master!
    const localList = StorageService.getInspections();
    localList
      .filter((l) => l && (l.date === normalizedRecord.date || l.outletId === normalizedRecord.outletId))
      .slice(0, 120)
      .forEach((l) => {
        const norm = normalizeInspectionItem(l);
        if (norm && !recentInspectionsDeltaMap.has(norm.id)) {
          recentInspectionsDeltaMap.set(norm.id, norm);
        }
      });

    recentInspectionsDeltaMap.delete(normalizedRecord.id);
    recentInspectionsDeltaMap.set(normalizedRecord.id, normalizedRecord);
    while (recentInspectionsDeltaMap.size > 150) {
      const oldestKey = recentInspectionsDeltaMap.keys().next().value;
      if (oldestKey) recentInspectionsDeltaMap.delete(oldestKey);
      else break;
    }

    const deltaInspectionsList = Array.from(recentInspectionsDeltaMap.values());
    recordSyncTimestamp('__SYSTEM_SYNC_INSPECTIONS_DELTA__', nowIso, true);

    // Kirim Delta secara instan ke Internal Server & Supabase agar live realtime antar device langsung terbaca
    const { error: deltaErr } = await client.from('cinema_sales').upsert(
      [
        {
          id: '__SYSTEM_SYNC_INSPECTIONS_DELTA__',
          outlet_id: '__SYSTEM_SYNC__',
          date: '2026-01-01',
          shows: deltaInspectionsList as any,
          updated_at: nowIso,
        },
      ],
      { onConflict: 'id' }
    );

    // 2. Debounce Master Archive singkat (300ms) dengan Safe Remote Merge berbasis Canonical Key
    // agar bila browser ditutup data sudah tersimpan permanen & tidak pernah menimpa show sebelumnya
    pendingArchiveInspections.set(normalizedRecord.id, normalizedRecord);
    if (inspectionArchiveTimer) {
      clearTimeout(inspectionArchiveTimer);
    }
    inspectionArchiveTimer = setTimeout(async () => {
      inspectionArchiveTimer = null;
      try {
        const archiveClient = getSupabase();
        if (!archiveClient) return;
        const archiveIso = new Date().toISOString();

        const allMap = new Map<string, ToiletInspectionRecord>();
        const putAdditive = (rawItem: any) => {
          const norm = normalizeInspectionItem(rawItem);
          if (!norm) return;
          const prev = allMap.get(norm.id);
          if (!prev) {
            allMap.set(norm.id, norm);
          } else {
            const prevTs = (prev as any).updatedAt ? new Date((prev as any).updatedAt).getTime() : 0;
            const nextTs = (norm as any).updatedAt ? new Date((norm as any).updatedAt).getTime() : 0;
            if (nextTs >= prevTs) {
              allMap.set(norm.id, norm);
            }
          }
        };

        // Tarik dulu data yang sudah ada di server agar Device A tidak menimpa data outlet/show lain
        const { data: remoteRows } = await archiveClient
          .from('cinema_sales')
          .select('id, shows, updated_at')
          .in('id', ['__SYSTEM_SYNC_INSPECTIONS__', '__SYSTEM_SYNC_INSPECTIONS_DELTA__']);

        if (Array.isArray(remoteRows)) {
          for (const rRow of remoteRows) {
            if (rRow && Array.isArray(rRow.shows)) {
              for (const item of rRow.shows) {
                putAdditive(item);
              }
            }
          }
        }

        // Gabungkan dengan localStorage & pendingArchiveInspections terbaru
        const currentLocalList = StorageService.getInspections();
        currentLocalList.forEach((l) => putAdditive(l));
        pendingArchiveInspections.forEach((v) => putAdditive(v));
        pendingArchiveInspections.clear();

        // Simpan juga hasil gabungan ke localStorage + backup overrides
        const mergedFullList = Array.from(allMap.values());
        try {
          const serialized = JSON.stringify(mergedFullList);
          localStorage.setItem('cinema_xxi_toilet_inspections', serialized);
          localStorage.setItem('cinema_xxi_user_inspections_overrides', serialized);
          sessionStorage.setItem('cinema_xxi_toilet_inspections_session', serialized);
        } catch {
          // ignore quota error
        }

        // Prune data inspections lama (> 14 hari) dari master cloud sync agar ukuran row tetap ringan
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const filteredArchive = mergedFullList.filter(
          (ins) => !ins.date || ins.date >= fourteenDaysAgo
        );

        recordSyncTimestamp('__SYSTEM_SYNC_INSPECTIONS__', archiveIso, true);
        await archiveClient.from('cinema_sales').upsert(
          [
            {
              id: '__SYSTEM_SYNC_INSPECTIONS__',
              outlet_id: '__SYSTEM_SYNC__',
              date: '2026-01-01',
              shows: filteredArchive as any,
              updated_at: archiveIso,
            },
          ],
          { onConflict: 'id' }
        );
      } catch (err) {
        console.warn('Debounced inspection archive sync error:', err);
      }
    }, 300);

    return !deltaErr;
  } catch (e) {
    console.warn('Supabase inspection sync error:', e);
    return false;
  }
}

/**
 * Ambil Rekap Card Inspection dari Supabase (Menggabungkan Master Archive & Delta Terbaru secara Aditif)
 */
export async function fetchInspectionsFromSupabase(
  outletId?: string,
  date?: string,
  deltaOnly = false
): Promise<ToiletInspectionRecord[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const map = new Map<string, ToiletInspectionRecord>();
    const absorbItem = (rawItem: any) => {
      const item = normalizeInspectionItem(rawItem);
      if (!item) return;
      if (outletId && item.outletId !== outletId) return;
      if (date && item.date !== date) return;
      const prev = map.get(item.id);
      if (!prev) {
        map.set(item.id, item);
      } else {
        const prevTs = (prev as any).updatedAt ? new Date((prev as any).updatedAt).getTime() : 0;
        const nextTs = (item as any).updatedAt ? new Date((item as any).updatedAt).getTime() : 0;
        if (nextTs >= prevTs) {
          map.set(item.id, item);
        }
      }
    };

    if (deltaOnly) {
      const { data: syncRow, error } = await client
        .from('cinema_sales')
        .select('id, shows, updated_at')
        .eq('id', '__SYSTEM_SYNC_INSPECTIONS_DELTA__')
        .maybeSingle();

      if (error) return null;

      if (syncRow) {
        if (syncRow.updated_at) {
          recordSyncTimestamp('__SYSTEM_SYNC_INSPECTIONS_DELTA__', String(syncRow.updated_at), false);
        }
        if (Array.isArray(syncRow.shows)) {
          for (const item of syncRow.shows) {
            absorbItem(item);
          }
        }
      }
    } else {
      // Ambil sekaligus Master Archive DAN Delta terbaru agar 100% up-to-date
      const { data: syncRows, error } = await client
        .from('cinema_sales')
        .select('id, shows, updated_at')
        .in('id', ['__SYSTEM_SYNC_INSPECTIONS__', '__SYSTEM_SYNC_INSPECTIONS_DELTA__']);

      if (error || !Array.isArray(syncRows)) return null;

      const masterRow = syncRows.find((r: any) => r.id === '__SYSTEM_SYNC_INSPECTIONS__');
      const deltaRow = syncRows.find((r: any) => r.id === '__SYSTEM_SYNC_INSPECTIONS_DELTA__');

      if (masterRow) {
        if (masterRow.updated_at) {
          recordSyncTimestamp('__SYSTEM_SYNC_INSPECTIONS__', String(masterRow.updated_at), false);
        }
        if (Array.isArray(masterRow.shows)) {
          for (const item of masterRow.shows) {
            absorbItem(item);
          }
        }
      }

      if (deltaRow) {
        if (deltaRow.updated_at) {
          recordSyncTimestamp('__SYSTEM_SYNC_INSPECTIONS_DELTA__', String(deltaRow.updated_at), false);
        }
        if (Array.isArray(deltaRow.shows)) {
          for (const item of deltaRow.shows) {
            absorbItem(item);
          }
        }
      }
    }

    return Array.from(map.values());
  } catch (e) {
    console.warn('Supabase fetch inspections error:', e);
    return null;
  }
}

let hasAutoHealedLocalInspections = false;

/**
 * Merges remote inspection records from Supabase & Internal Server into local storage additively,
 * and auto-pushes any local inspection (from Device A) that was not yet on the remote server.
 */
export async function mergeRemoteInspectionsToLocal(deltaOnly = false): Promise<boolean> {
  const remoteInspections = await fetchInspectionsFromSupabase(undefined, undefined, deltaOnly);
  const currentLocal = StorageService.getInspections();

  const remoteMap = new Map<string, ToiletInspectionRecord>();
  if (Array.isArray(remoteInspections)) {
    remoteInspections.forEach((r) => {
      const norm = normalizeInspectionItem(r);
      if (norm) remoteMap.set(norm.id, norm);
    });
  }

  const mergedMap = new Map<string, ToiletInspectionRecord>();
  currentLocal.forEach((loc) => {
    const norm = normalizeInspectionItem(loc);
    if (norm) mergedMap.set(norm.id, norm);
  });

  let updated = false;

  remoteMap.forEach((remote) => {
    const existing = mergedMap.get(remote.id);
    if (!existing) {
      mergedMap.set(remote.id, remote);
      updated = true;
    } else {
      const exTs = (existing as any).updatedAt ? new Date((existing as any).updatedAt).getTime() : 0;
      const remTs = (remote as any).updatedAt ? new Date((remote as any).updatedAt).getTime() : 0;
      if (remTs > exTs || (remTs === 0 && exTs === 0 && JSON.stringify(existing) !== JSON.stringify(remote))) {
        mergedMap.set(remote.id, remote);
        updated = true;
      }
    }
  });

  const finalList = Array.from(mergedMap.values());

  if (updated) {
    try {
      const serialized = JSON.stringify(finalList);
      localStorage.setItem('cinema_xxi_toilet_inspections', serialized);
      localStorage.setItem('cinema_xxi_user_inspections_overrides', serialized);
      sessionStorage.setItem('cinema_xxi_toilet_inspections_session', serialized);
    } catch {
      // ignore
    }
    StorageService.invalidateInspectionsCache();
    StorageService.broadcastChange('inspection');
  }

  // Auto-Heal: Jika Device A memiliki data Card Inspection lokal (14 hari terakhir) yang belum masuk ke Server/Device B,
  // otomatis dorong (push) hasil gabungan ke Server sekali saat sinkronisasi penuh!
  if (!deltaOnly && !hasAutoHealedLocalInspections && finalList.length > 0) {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const localRecentMissingOnRemote = finalList.some(
      (l) => l && l.id && (!l.date || l.date >= fourteenDaysAgo) && !remoteMap.has(l.id)
    );

    if (localRecentMissingOnRemote) {
      hasAutoHealedLocalInspections = true;
      const client = getSupabase();
      if (client) {
        const nowIso = new Date().toISOString();
        const activeArchive = finalList.filter((ins) => !ins.date || ins.date >= fourteenDaysAgo);
        recordSyncTimestamp('__SYSTEM_SYNC_INSPECTIONS__', nowIso, true);
        recordSyncTimestamp('__SYSTEM_SYNC_INSPECTIONS_DELTA__', nowIso, true);
        Promise.resolve(
          client
            .from('cinema_sales')
            .upsert(
              [
                {
                  id: '__SYSTEM_SYNC_INSPECTIONS__',
                  outlet_id: '__SYSTEM_SYNC__',
                  date: '2026-01-01',
                  shows: activeArchive as any,
                  updated_at: nowIso,
                },
                {
                  id: '__SYSTEM_SYNC_INSPECTIONS_DELTA__',
                  outlet_id: '__SYSTEM_SYNC__',
                  date: '2026-01-01',
                  shows: activeArchive.slice(0, 120) as any,
                  updated_at: nowIso,
                },
              ],
              { onConflict: 'id' }
            )
        ).catch(() => {});
      }
    } else if (remoteMap.size > 0) {
      hasAutoHealedLocalInspections = true;
    }
  }

  return updated;
}

/**
 * Sinkronisasi Data Karyawan & Daftar Karyawan Dihapus ke Supabase (1 Batch Request)
 */
export async function syncEmployeesToSupabase(
  employees?: Employee[],
  deletedIds?: string[]
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const empList = employees || StorageService.getEmployees();
    const delRaw = localStorage.getItem('cinema_xxi_deleted_employee_ids');
    const delList: string[] = deletedIds || (delRaw ? JSON.parse(delRaw) : []);
    const nowIso = new Date().toISOString();

    recordSyncTimestamp('__SYSTEM_SYNC_EMPLOYEES__', nowIso, true);
    recordSyncTimestamp('__SYSTEM_SYNC_DELETED_EMPLOYEES__', nowIso, true);

    const payload = [
      {
        id: '__SYSTEM_SYNC_EMPLOYEES__',
        outlet_id: '__SYSTEM_SYNC_EMPLOYEES__',
        date: '2000-01-01',
        shows: empList as any,
        updated_at: nowIso,
      },
      {
        id: '__SYSTEM_SYNC_DELETED_EMPLOYEES__',
        outlet_id: '__SYSTEM_SYNC_DELETED_EMPLOYEES__',
        date: '2000-01-01',
        shows: delList as any,
        updated_at: nowIso,
      },
    ];

    const { error } = await client.from('cinema_sales').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Sync employees to Supabase warning:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase employees sync error:', e);
    return false;
  }
}

/**
 * Ambil & Gabungkan Data Karyawan dari Supabase ke Local Storage (Strict Read-Only: Tanpa Loop Push-Back)
 */
export async function mergeRemoteEmployeesToLocal(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const localEmployees = StorageService.getEmployees();
    const localDelRaw = localStorage.getItem('cinema_xxi_deleted_employee_ids');
    const localDeletedIds: string[] = localDelRaw ? JSON.parse(localDelRaw) : [];

    let remoteEmployees: Employee[] = [];
    const remoteDeletedIds: string[] = [];

    const { data, error } = await client
      .from('cinema_sales')
      .select('id, shows, updated_at')
      .in('id', ['__SYSTEM_SYNC_EMPLOYEES__', '__SYSTEM_SYNC_DELETED_EMPLOYEES__']);

    if (error || !data) return false;

    const empRow = data.find((r: any) => r.id === '__SYSTEM_SYNC_EMPLOYEES__');
    const delRow = data.find((r: any) => r.id === '__SYSTEM_SYNC_DELETED_EMPLOYEES__');

    if (empRow?.updated_at) {
      recordSyncTimestamp('__SYSTEM_SYNC_EMPLOYEES__', String(empRow.updated_at), false);
    }
    if (delRow?.updated_at) {
      recordSyncTimestamp('__SYSTEM_SYNC_DELETED_EMPLOYEES__', String(delRow.updated_at), false);
    }

    if (delRow && Array.isArray(delRow.shows)) {
      remoteDeletedIds.push(...delRow.shows);
    }

    if (empRow && Array.isArray(empRow.shows) && empRow.shows.length > 0) {
      remoteEmployees = empRow.shows;
    }

    if (remoteEmployees.length === 0) {
      return false;
    }

    const mergedDeletedSet = new Set<string>([...localDeletedIds, ...remoteDeletedIds]);
    const mergedDeletedList = Array.from(mergedDeletedSet);
    if (mergedDeletedList.length !== localDeletedIds.length) {
      localStorage.setItem('cinema_xxi_deleted_employee_ids', JSON.stringify(mergedDeletedList));
    }

    const localById = new Map<string, Employee>();
    const localByNik = new Map<string, Employee>();
    localEmployees.forEach((le) => {
      if (le && le.id) localById.set(le.id, le);
      const cleanNik = le?.nik ? le.nik.trim() : '';
      if (cleanNik && cleanNik !== '-') localByNik.set(cleanNik, le);
    });

    const mergedList: Employee[] = [];
    const seenIds = new Set<string>();
    const seenNiks = new Set<string>();

    for (const rem of remoteEmployees) {
      if (!rem || !rem.id) continue;
      const cleanNik = rem.nik ? rem.nik.trim() : '';
      if (mergedDeletedSet.has(rem.id) || (cleanNik && mergedDeletedSet.has(cleanNik))) {
        continue;
      }

      const loc = localById.get(rem.id) || (cleanNik ? localByNik.get(cleanNik) : undefined);
      let chosen: Employee = { ...rem };

      if (loc) {
        const remTime = (rem as any).updatedAt ? new Date((rem as any).updatedAt).getTime() : 0;
        const locTime = (loc as any).updatedAt ? new Date((loc as any).updatedAt).getTime() : 0;

        if (locTime > remTime) {
          chosen = { ...rem, ...loc };
        } else {
          const remHasDob = rem.tanggalLahir && rem.tanggalLahir !== '-';
          const locHasDob = loc.tanggalLahir && loc.tanggalLahir !== '-';
          if (!remHasDob && locHasDob && remTime === 0) {
            chosen = { ...rem, tanggalLahir: loc.tanggalLahir };
          }
        }
      }

      if (!seenIds.has(chosen.id) && (!cleanNik || cleanNik === '-' || !seenNiks.has(cleanNik))) {
        seenIds.add(chosen.id);
        if (cleanNik && cleanNik !== '-') seenNiks.add(cleanNik);
        mergedList.push(chosen);
      }
    }

    for (const loc of localEmployees) {
      if (!loc || !loc.id) continue;
      const cleanNik = loc.nik ? loc.nik.trim() : '';
      if (mergedDeletedSet.has(loc.id) || (cleanNik && mergedDeletedSet.has(cleanNik))) {
        continue;
      }
      const alreadyIncluded =
        seenIds.has(loc.id) || (cleanNik && cleanNik !== '-' && seenNiks.has(cleanNik));
      if (!alreadyIncluded) {
        const isCustomOrEdited =
          Boolean((loc as any).updatedAt) ||
          String(loc.id).startsWith('emp_') ||
          (loc.tanggalLahir && loc.tanggalLahir !== '-');
        if (isCustomOrEdited) {
          seenIds.add(loc.id);
          if (cleanNik && cleanNik !== '-') seenNiks.add(cleanNik);
          mergedList.unshift(loc);
        }
      }
    }

    const currentRaw = localStorage.getItem('cinema_xxi_employees') || '';
    const mergedRaw = JSON.stringify(mergedList);

    if (currentRaw !== mergedRaw && mergedList.length > 0) {
      localStorage.setItem('cinema_xxi_employees', mergedRaw);
      localStorage.setItem('EMPLOYEES_INITIALIZED_V6', 'true');
      StorageService.broadcastChange('employees');
      return true;
    }

    return false;
  } catch (e) {
    console.warn('Merge remote employees error:', e);
    return false;
  }
}

/**
 * Sinkronisasi Data KPI Karyawan ke Supabase (1 Query __SYSTEM_SYNC_EMPLOYEE_KPIS__)
 */
export async function syncEmployeeKpisToSupabase(records?: EmployeeKpiRecord[]): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const list = records || StorageService.getEmployeeKpis();
    const nowIso = new Date().toISOString();

    recordSyncTimestamp('__SYSTEM_SYNC_EMPLOYEE_KPIS__', nowIso, true);

    const { error } = await client.from('cinema_sales').upsert(
      {
        id: '__SYSTEM_SYNC_EMPLOYEE_KPIS__',
        outlet_id: '__SYSTEM_SYNC_EMPLOYEE_KPIS__',
        date: '2000-01-01',
        shows: list as any,
        updated_at: nowIso,
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn('Sync employee KPIs to Supabase warning:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase employee KPIs sync error:', e);
    return false;
  }
}

/**
 * Ambil & Gabungkan Data KPI Karyawan dari Supabase ke Local Storage (Read-Only)
 */
export async function mergeRemoteEmployeeKpisToLocal(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const localKpis = StorageService.getEmployeeKpis();

    const { data, error } = await client
      .from('cinema_sales')
      .select('id, shows, updated_at')
      .eq('id', '__SYSTEM_SYNC_EMPLOYEE_KPIS__')
      .maybeSingle();

    if (error || !data) return false;

    if (data.updated_at) {
      recordSyncTimestamp('__SYSTEM_SYNC_EMPLOYEE_KPIS__', String(data.updated_at), false);
    }

    const remoteKpis: EmployeeKpiRecord[] = Array.isArray(data.shows) ? data.shows : [];
    if (remoteKpis.length === 0) return false;

    const kpiMap = new Map<string, EmployeeKpiRecord>();
    localKpis.forEach((k) => {
      if (k && k.id) kpiMap.set(k.id, k);
    });
    remoteKpis.forEach((rk) => {
      if (rk && rk.id) kpiMap.set(rk.id, rk);
    });

    const merged = Array.from(kpiMap.values());
    const currentRaw = localStorage.getItem('cinema_xxi_employee_kpis') || '[]';
    const mergedRaw = JSON.stringify(merged);

    if (currentRaw !== mergedRaw) {
      localStorage.setItem('cinema_xxi_employee_kpis', mergedRaw);
      StorageService.broadcastChange('employee-kpis');
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Merge remote employee KPIs error:', e);
    return false;
  }
}

/**
 * Sinkronisasi Performance SDM (5 Show Kasir & Tabel Item Produk) ke Supabase Realtime
 */
export async function syncCashierPerformanceToSupabase(
  records?: CashierDailyPerformanceRecord[]
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const nowIso = new Date().toISOString();
    const allLocal = records || StorageService.getCashierDailyPerformanceAll();
    const map = new Map<string, CashierDailyPerformanceRecord>();

    if (!lastSeenSyncTimestamps['__SYSTEM_SYNC_SDM_PERFORMANCE__']) {
      const { data } = await client
        .from('cinema_sales')
        .select('id, shows')
        .eq('id', '__SYSTEM_SYNC_SDM_PERFORMANCE__')
        .maybeSingle();

      const remoteList: CashierDailyPerformanceRecord[] =
        data && Array.isArray(data.shows) ? data.shows : [];
      remoteList.forEach((r) => {
        if (r && r.id) map.set(r.id, r);
      });
    } else {
      StorageService.getCashierDailyPerformanceAll().forEach((r) => {
        if (r && r.id) map.set(r.id, r);
      });
    }

    allLocal.forEach((lr) => {
      if (lr && lr.id) {
        const existing = map.get(lr.id);
        if (!existing || (lr.updatedAt || '') >= (existing.updatedAt || '')) {
          map.set(lr.id, lr);
        }
      }
    });

    const finalList = Array.from(map.values());
    recordSyncTimestamp('__SYSTEM_SYNC_SDM_PERFORMANCE__', nowIso, true);

    await client.from('cinema_sales').upsert(
      {
        id: '__SYSTEM_SYNC_SDM_PERFORMANCE__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: finalList,
        updated_at: nowIso,
      },
      { onConflict: 'id' }
    );
    return true;
  } catch (e) {
    console.warn('Sync SDM performance error:', e);
    return false;
  }
}

export async function mergeRemoteCashierPerformanceToLocal(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { data, error } = await client
      .from('cinema_sales')
      .select('id, shows, updated_at')
      .eq('id', '__SYSTEM_SYNC_SDM_PERFORMANCE__')
      .maybeSingle();

    if (error || !data || !Array.isArray(data.shows)) return false;
    if (data.updated_at) {
      recordSyncTimestamp('__SYSTEM_SYNC_SDM_PERFORMANCE__', String(data.updated_at), false);
    }

    const remoteList: CashierDailyPerformanceRecord[] = data.shows;
    if (remoteList.length === 0) return false;

    const localList = StorageService.getCashierDailyPerformanceAll();
    const map = new Map<string, CashierDailyPerformanceRecord>();
    localList.forEach((r) => {
      if (r && r.id) map.set(r.id, r);
    });
    remoteList.forEach((rr) => {
      if (rr && rr.id) {
        const existing = map.get(rr.id);
        if (!existing || (rr.updatedAt || '') >= (existing.updatedAt || '')) {
          map.set(rr.id, rr);
        }
      }
    });

    const merged = Array.from(map.values());
    const currentRaw = localStorage.getItem('cinema_xxi_cashier_performance_daily') || '[]';
    const mergedRaw = JSON.stringify(merged);
    if (currentRaw !== mergedRaw) {
      localStorage.setItem('cinema_xxi_cashier_performance_daily', mergedRaw);
      StorageService.broadcastChange('sdm-performance');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function syncCashierProductsToSupabase(
  records?: CashierMonthlyProductRecord[]
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const nowIso = new Date().toISOString();
    const allLocal = records || StorageService.getCashierMonthlyProductsAll();
    const map = new Map<string, CashierMonthlyProductRecord>();

    if (!lastSeenSyncTimestamps['__SYSTEM_SYNC_SDM_PRODUCTS__']) {
      const { data } = await client
        .from('cinema_sales')
        .select('id, shows')
        .eq('id', '__SYSTEM_SYNC_SDM_PRODUCTS__')
        .maybeSingle();

      const remoteList: CashierMonthlyProductRecord[] =
        data && Array.isArray(data.shows) ? data.shows : [];
      remoteList.forEach((r) => {
        if (r && r.id) map.set(r.id, r);
      });
    } else {
      StorageService.getCashierMonthlyProductsAll().forEach((r) => {
        if (r && r.id) map.set(r.id, r);
      });
    }

    allLocal.forEach((lr) => {
      if (lr && lr.id) {
        const existing = map.get(lr.id);
        if (!existing || (lr.updatedAt || '') >= (existing.updatedAt || '')) {
          map.set(lr.id, lr);
        }
      }
    });

    const finalList = Array.from(map.values());
    recordSyncTimestamp('__SYSTEM_SYNC_SDM_PRODUCTS__', nowIso, true);

    await client.from('cinema_sales').upsert(
      {
        id: '__SYSTEM_SYNC_SDM_PRODUCTS__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: finalList,
        updated_at: nowIso,
      },
      { onConflict: 'id' }
    );
    return true;
  } catch (e) {
    console.warn('Sync SDM products error:', e);
    return false;
  }
}

export async function mergeRemoteCashierProductsToLocal(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { data, error } = await client
      .from('cinema_sales')
      .select('id, shows, updated_at')
      .eq('id', '__SYSTEM_SYNC_SDM_PRODUCTS__')
      .maybeSingle();

    if (error || !data || !Array.isArray(data.shows)) return false;
    if (data.updated_at) {
      recordSyncTimestamp('__SYSTEM_SYNC_SDM_PRODUCTS__', String(data.updated_at), false);
    }

    const remoteList: CashierMonthlyProductRecord[] = data.shows;
    if (remoteList.length === 0) return false;

    const localList = StorageService.getCashierMonthlyProductsAll();
    const map = new Map<string, CashierMonthlyProductRecord>();
    localList.forEach((r) => {
      if (r && r.id) map.set(r.id, r);
    });
    remoteList.forEach((rr) => {
      if (rr && rr.id) {
        const existing = map.get(rr.id);
        if (!existing || (rr.updatedAt || '') >= (existing.updatedAt || '')) {
          map.set(rr.id, rr);
        }
      }
    });

    const merged = Array.from(map.values());
    const currentRaw = localStorage.getItem('cinema_xxi_cashier_monthly_products') || '[]';
    const mergedRaw = JSON.stringify(merged);
    if (currentRaw !== mergedRaw) {
      localStorage.setItem('cinema_xxi_cashier_monthly_products', mergedRaw);
      StorageService.broadcastChange('sdm-products');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

let bakingWriteTimer: NodeJS.Timeout | null = null;
let pendingBakingRecords: BakingSaleRecord[] = [];

export async function syncBakingSalesToSupabase(
  records?: BakingSaleRecord[]
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  if (records && records.length > 0) {
    pendingBakingRecords.push(...records);
  }

  return new Promise((resolve) => {
    if (bakingWriteTimer) {
      clearTimeout(bakingWriteTimer);
    }
    bakingWriteTimer = setTimeout(async () => {
      bakingWriteTimer = null;
      const recsToSync = pendingBakingRecords.length > 0 ? [...pendingBakingRecords] : undefined;
      pendingBakingRecords = [];
      const ok = await executeBakingSalesUpsert(recsToSync);
      resolve(ok);
    }, 750);
  });
}

async function executeBakingSalesUpsert(
  records?: BakingSaleRecord[]
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const nowIso = new Date().toISOString();
    const localList = StorageService.getBakingSales();
    const map = new Map<string, BakingSaleRecord>();
    const makeKey = (r: BakingSaleRecord) => `${r.outletId}_${r.year}_${r.month}`;

    if (!lastSeenSyncTimestamps['__SYSTEM_SYNC_BAKING_SALES__']) {
      const { data } = await client
        .from('cinema_sales')
        .select('id, shows')
        .eq('id', '__SYSTEM_SYNC_BAKING_SALES__')
        .maybeSingle();

      const remoteList: BakingSaleRecord[] =
        data && Array.isArray(data.shows) ? data.shows : [];
      remoteList.forEach((r) => {
        if (r && r.outletId && r.year && r.month) {
          map.set(makeKey(r), r);
        }
      });
    } else {
      localList.forEach((r) => {
        if (r && r.outletId && r.year && r.month) {
          map.set(makeKey(r), r);
        }
      });
    }

    const toMerge = records && records.length > 0 ? records : localList;
    toMerge.forEach((lr) => {
      if (!lr || !lr.outletId || !lr.year || !lr.month) return;
      const key = makeKey(lr);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, lr);
      } else {
        const mergedDaily: { [day: number]: { [productId: number]: number } } = {
          ...(existing.dailySales || {}),
        };
        Object.entries(lr.dailySales || {}).forEach(([dayStr, prodMap]) => {
          const d = Number(dayStr);
          mergedDaily[d] = {
            ...(mergedDaily[d] || {}),
            ...(prodMap || {}),
          };
        });
        map.set(key, {
          ...existing,
          ...lr,
          dailySales: mergedDaily,
          productTargets: {
            ...(existing.productTargets || {}),
            ...(lr.productTargets || {}),
          },
          updatedAt: lr.updatedAt || nowIso,
        });
      }
    });

    const finalArray = Array.from(map.values());
    recordSyncTimestamp('__SYSTEM_SYNC_BAKING_SALES__', nowIso, true);

    const { error } = await client.from('cinema_sales').upsert(
      {
        id: '__SYSTEM_SYNC_BAKING_SALES__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: finalArray,
        updated_at: nowIso,
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn('Sync baking sales warning:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Sync baking sales error:', e);
    return false;
  }
}

export async function mergeRemoteBakingSalesToLocal(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { data, error } = await client
      .from('cinema_sales')
      .select('id, shows, updated_at')
      .eq('id', '__SYSTEM_SYNC_BAKING_SALES__')
      .maybeSingle();

    if (error || !data || !Array.isArray(data.shows)) {
      return false;
    }

    if (data.updated_at) {
      recordSyncTimestamp('__SYSTEM_SYNC_BAKING_SALES__', String(data.updated_at), false);
    }

    const remoteList: BakingSaleRecord[] = data.shows;
    if (remoteList.length === 0) return false;

    const localList = StorageService.getBakingSales();
    const map = new Map<string, BakingSaleRecord>();
    const makeKey = (r: BakingSaleRecord) => `${r.outletId}_${r.year}_${r.month}`;

    localList.forEach((r) => {
      if (r && r.outletId && r.year && r.month) {
        map.set(makeKey(r), r);
      }
    });

    remoteList.forEach((rr) => {
      if (!rr || !rr.outletId || !rr.year || !rr.month) return;
      const key = makeKey(rr);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, rr);
      } else {
        const isRemoteNewer = (rr.updatedAt || '') >= (existing.updatedAt || '');
        const mergedDaily: { [day: number]: { [productId: number]: number } } = {};
        const allDays = new Set([
          ...Object.keys(existing.dailySales || {}),
          ...Object.keys(rr.dailySales || {}),
        ]);
        allDays.forEach((dayStr) => {
          const d = Number(dayStr);
          mergedDaily[d] = isRemoteNewer
            ? { ...(existing.dailySales?.[d] || {}), ...(rr.dailySales?.[d] || {}) }
            : { ...(rr.dailySales?.[d] || {}), ...(existing.dailySales?.[d] || {}) };
        });

        map.set(key, {
          ...(isRemoteNewer ? existing : rr),
          ...(isRemoteNewer ? rr : existing),
          dailySales: mergedDaily,
          productTargets: {
            ...(existing.productTargets || {}),
            ...(rr.productTargets || {}),
          },
        });
      }
    });

    const merged = Array.from(map.values());
    const currentRaw = localStorage.getItem('cinema_xxi_baking_sales') || '[]';
    const mergedRaw = JSON.stringify(merged);
    if (currentRaw !== mergedRaw) {
      localStorage.setItem('cinema_xxi_baking_sales', mergedRaw);
      StorageService.broadcastChange('baking');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function syncDailySectionSalesToSupabase(
  records?: DailySectionSalesRecord[]
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const nowIso = new Date().toISOString();
    const allLocal = records || StorageService.getDailySectionSalesAll();
    const map = new Map<string, DailySectionSalesRecord>();

    if (!lastSeenSyncTimestamps['__SYSTEM_SYNC_DAILY_SECTION__']) {
      const { data } = await client
        .from('cinema_sales')
        .select('id, shows')
        .eq('id', '__SYSTEM_SYNC_DAILY_SECTION__')
        .maybeSingle();

      const remoteList: DailySectionSalesRecord[] =
        data && Array.isArray(data.shows) ? data.shows : [];
      remoteList.forEach((r) => {
        if (r && r.id) map.set(r.id, r);
      });
    } else {
      StorageService.getDailySectionSalesAll().forEach((r) => {
        if (r && r.id) map.set(r.id, r);
      });
    }

    allLocal.forEach((lr) => {
      if (lr && lr.id) {
        const existing = map.get(lr.id);
        if (!existing || (lr.updatedAt || '') >= (existing.updatedAt || '')) {
          map.set(lr.id, lr);
        }
      }
    });

    const finalList = Array.from(map.values());
    recordSyncTimestamp('__SYSTEM_SYNC_DAILY_SECTION__', nowIso, true);

    await client.from('cinema_sales').upsert(
      {
        id: '__SYSTEM_SYNC_DAILY_SECTION__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: finalList,
        updated_at: nowIso,
      },
      { onConflict: 'id' }
    );
    return true;
  } catch (e) {
    console.warn('Sync daily section error:', e);
    return false;
  }
}

export async function mergeRemoteDailySectionSalesToLocal(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { data, error } = await client
      .from('cinema_sales')
      .select('id, shows, updated_at')
      .eq('id', '__SYSTEM_SYNC_DAILY_SECTION__')
      .maybeSingle();

    if (error || !data || !Array.isArray(data.shows)) return false;
    if (data.updated_at) {
      recordSyncTimestamp('__SYSTEM_SYNC_DAILY_SECTION__', String(data.updated_at), false);
    }

    const remoteList: DailySectionSalesRecord[] = data.shows;
    if (remoteList.length === 0) return false;

    const localList = StorageService.getDailySectionSalesAll();
    const map = new Map<string, DailySectionSalesRecord>();
    localList.forEach((r) => {
      if (r && r.id) map.set(r.id, r);
    });
    remoteList.forEach((rr) => {
      if (rr && rr.id) {
        const existing = map.get(rr.id);
        if (!existing || (rr.updatedAt || '') >= (existing.updatedAt || '')) {
          map.set(rr.id, rr);
        }
      }
    });

    const merged = Array.from(map.values());
    const currentRaw = localStorage.getItem('cinema_xxi_daily_section_sales') || '[]';
    const mergedRaw = JSON.stringify(merged);
    if (currentRaw !== mergedRaw) {
      localStorage.setItem('cinema_xxi_daily_section_sales', mergedRaw);
      StorageService.broadcastChange('sdm-section');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function syncOutletsAndAreasToSupabase(
  outlets?: Outlet[],
  areas?: Area[]
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const localOutlets = outlets || StorageService.getOutlets();
    const localAreas = areas || StorageService.getAreas();
    const nowIso = new Date().toISOString();

    recordSyncTimestamp('__SYSTEM_SYNC_OUTLETS__', nowIso, true);
    recordSyncTimestamp('__SYSTEM_SYNC_AREAS__', nowIso, true);

    await client.from('cinema_sales').upsert(
      [
        {
          id: '__SYSTEM_SYNC_OUTLETS__',
          outlet_id: '__SYSTEM_SYNC__',
          date: '2026-01-01',
          shows: localOutlets as any,
          updated_at: nowIso,
        },
        {
          id: '__SYSTEM_SYNC_AREAS__',
          outlet_id: '__SYSTEM_SYNC__',
          date: '2026-01-01',
          shows: localAreas as any,
          updated_at: nowIso,
        },
      ],
      { onConflict: 'id' }
    );
    return true;
  } catch (e) {
    console.warn('Sync outlets and areas error:', e);
    return false;
  }
}

export async function mergeRemoteOutletsAndAreasToLocal(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { data, error } = await client
      .from('cinema_sales')
      .select('id, shows, updated_at')
      .in('id', ['__SYSTEM_SYNC_OUTLETS__', '__SYSTEM_SYNC_AREAS__']);

    if (error || !data) return false;

    let updated = false;
    const outletsRow = data.find((r: any) => r.id === '__SYSTEM_SYNC_OUTLETS__');
    const areasRow = data.find((r: any) => r.id === '__SYSTEM_SYNC_AREAS__');

    if (outletsRow?.updated_at) {
      recordSyncTimestamp('__SYSTEM_SYNC_OUTLETS__', String(outletsRow.updated_at), false);
    }
    if (areasRow?.updated_at) {
      recordSyncTimestamp('__SYSTEM_SYNC_AREAS__', String(areasRow.updated_at), false);
    }

    if (outletsRow && Array.isArray(outletsRow.shows) && outletsRow.shows.length > 0) {
      const remoteOutlets: Outlet[] = outletsRow.shows;
      const localOutlets = StorageService.getOutlets();
      const map = new Map<string, Outlet>();
      localOutlets.forEach((o) => {
        if (o && o.id) map.set(o.id, o);
      });
      remoteOutlets.forEach((ro: any) => {
        if (ro && ro.id) {
          const existing: any = map.get(ro.id);
          if (!existing || (ro.updatedAt || '') >= (existing.updatedAt || '')) {
            map.set(ro.id, { ...(existing || {}), ...ro });
          }
        }
      });
      const mergedOutlets = Array.from(map.values());
      const currentRaw = localStorage.getItem('cinema_xxi_outlets') || '[]';
      const mergedRaw = JSON.stringify(mergedOutlets);
      if (currentRaw !== mergedRaw) {
        localStorage.setItem('cinema_xxi_outlets', mergedRaw);
        localStorage.setItem('cinema_xxi_outlets_target_synced_v2_db', 'true');
        StorageService.broadcastChange('outlets');
        updated = true;
      }
    }

    if (areasRow && Array.isArray(areasRow.shows) && areasRow.shows.length > 0) {
      const remoteAreas: Area[] = areasRow.shows;
      const localAreas = StorageService.getAreas();
      const map = new Map<string, Area>();
      localAreas.forEach((a) => {
        if (a && a.id) map.set(a.id, a);
      });
      remoteAreas.forEach((ra: any) => {
        if (ra && ra.id) {
          const existing: any = map.get(ra.id);
          if (!existing || (ra.updatedAt || '') >= (existing.updatedAt || '')) {
            map.set(ra.id, { ...(existing || {}), ...ra });
          }
        }
      });
      const mergedAreas = Array.from(map.values());
      const currentRaw = localStorage.getItem('cinema_xxi_areas') || '[]';
      const mergedRaw = JSON.stringify(mergedAreas);
      if (currentRaw !== mergedRaw) {
        localStorage.setItem('cinema_xxi_areas', mergedRaw);
        localStorage.setItem('cinema_xxi_areas_synced_v2_db', 'true');
        StorageService.broadcastChange('areas');
        updated = true;
      }
    }

    return updated;
  } catch {
    return false;
  }
}

let additionalModulesTimer: NodeJS.Timeout | null = null;
const pendingAdditionalModules = new Set<
  'users' | 'genres' | 'administration' | 'bopo' | 'lost_found' | 'warehouse'
>();

/**
 * Sinkronisasi Modul Tambahan (Users, Genre Film, Administrasi, BOPO, Lost & Found, Gudang/Inventory) dengan Debounce
 */
export async function syncAdditionalModulesToSupabase(
  modules: Array<'users' | 'genres' | 'administration' | 'bopo' | 'lost_found' | 'warehouse'> = [
    'users',
    'genres',
    'administration',
    'bopo',
    'lost_found',
    'warehouse',
  ]
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  modules.forEach((m) => pendingAdditionalModules.add(m));

  return new Promise((resolve) => {
    if (additionalModulesTimer) {
      clearTimeout(additionalModulesTimer);
    }
    additionalModulesTimer = setTimeout(async () => {
      additionalModulesTimer = null;
      const modulesToRun = Array.from(pendingAdditionalModules);
      pendingAdditionalModules.clear();
      const ok = await executeAdditionalModulesUpsert(modulesToRun);
      resolve(ok);
    }, 500);
  });
}

async function executeAdditionalModulesUpsert(
  modules: Array<'users' | 'genres' | 'administration' | 'bopo' | 'lost_found' | 'warehouse'>
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const nowIso = new Date().toISOString();
    const rowsToUpsert: Array<{
      id: string;
      outlet_id: string;
      date: string;
      shows: any;
      updated_at: string;
    }> = [];

    if (modules.includes('users')) {
      const users = StorageService.getUsersList();
      const deletedUsersRaw = localStorage.getItem('cinema_xxi_deleted_user_ids');
      const deletedUsers = deletedUsersRaw ? JSON.parse(deletedUsersRaw) : [];
      recordSyncTimestamp('__SYSTEM_SYNC_USERS__', nowIso, true);
      rowsToUpsert.push({
        id: '__SYSTEM_SYNC_USERS__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: [{ users, deletedUsers, updatedAt: nowIso }],
        updated_at: nowIso,
      });
    }

    if (modules.includes('genres')) {
      const genres = StorageService.getFilmGenreRegistry();
      recordSyncTimestamp('__SYSTEM_SYNC_FILM_GENRES__', nowIso, true);
      rowsToUpsert.push({
        id: '__SYSTEM_SYNC_FILM_GENRES__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: [genres],
        updated_at: nowIso,
      });
    }

    if (modules.includes('administration')) {
      const admins = StorageService.getOutletAdministrations();
      recordSyncTimestamp('__SYSTEM_SYNC_ADMINISTRATION__', nowIso, true);
      rowsToUpsert.push({
        id: '__SYSTEM_SYNC_ADMINISTRATION__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: admins,
        updated_at: nowIso,
      });
    }

    if (modules.includes('bopo')) {
      const bopo = StorageService.getBopoRecords();
      recordSyncTimestamp('__SYSTEM_SYNC_BOPO__', nowIso, true);
      rowsToUpsert.push({
        id: '__SYSTEM_SYNC_BOPO__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: bopo,
        updated_at: nowIso,
      });
    }

    if (modules.includes('lost_found')) {
      const lostFound = StorageService.getLostAndFoundRecords();
      recordSyncTimestamp('__SYSTEM_SYNC_LOST_FOUND__', nowIso, true);
      rowsToUpsert.push({
        id: '__SYSTEM_SYNC_LOST_FOUND__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: lostFound,
        updated_at: nowIso,
      });
    }

    if (modules.includes('warehouse')) {
      const items = StorageService.getWarehouseItems();
      const txs = StorageService.getStockTransactions();
      const opname = StorageService.getStockOpnameHistory();
      recordSyncTimestamp('__SYSTEM_SYNC_WAREHOUSE__', nowIso, true);
      rowsToUpsert.push({
        id: '__SYSTEM_SYNC_WAREHOUSE__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: [{ items, txs, opname, updatedAt: nowIso }],
        updated_at: nowIso,
      });
    }

    if (rowsToUpsert.length > 0) {
      await client.from('cinema_sales').upsert(rowsToUpsert, { onConflict: 'id' });
    }
    return true;
  } catch (e) {
    console.warn('Sync additional modules error:', e);
    return false;
  }
}

export async function mergeRemoteAdditionalModulesToLocal(
  specificIds?: string[]
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const idsToFetch =
      specificIds && specificIds.length > 0
        ? specificIds
        : [
            '__SYSTEM_SYNC_USERS__',
            '__SYSTEM_SYNC_FILM_GENRES__',
            '__SYSTEM_SYNC_ADMINISTRATION__',
            '__SYSTEM_SYNC_BOPO__',
            '__SYSTEM_SYNC_LOST_FOUND__',
            '__SYSTEM_SYNC_WAREHOUSE__',
          ];

    const { data, error } = await client
      .from('cinema_sales')
      .select('id, shows, updated_at')
      .in('id', idsToFetch);

    if (error || !data) return false;
    let updated = false;

    data.forEach((r: any) => {
      if (r && r.id && r.updated_at) {
        recordSyncTimestamp(String(r.id), String(r.updated_at), false);
      }
    });

    const usersRow = data.find((r: any) => r.id === '__SYSTEM_SYNC_USERS__');
    if (usersRow && Array.isArray(usersRow.shows) && usersRow.shows[0]) {
      const payload = usersRow.shows[0];
      if (Array.isArray(payload.deletedUsers)) {
        const curDelRaw = localStorage.getItem('cinema_xxi_deleted_user_ids') || '[]';
        const curDel: string[] = JSON.parse(curDelRaw);
        const mergedDel = Array.from(new Set([...curDel, ...payload.deletedUsers]));
        if (JSON.stringify(mergedDel) !== curDelRaw) {
          localStorage.setItem('cinema_xxi_deleted_user_ids', JSON.stringify(mergedDel));
        }
      }
      if (Array.isArray(payload.users) && payload.users.length > 0) {
        const localUsers = StorageService.getUsersList();
        const delSet = new Set<string>(
          JSON.parse(localStorage.getItem('cinema_xxi_deleted_user_ids') || '[]')
        );
        const map = new Map<string, any>();
        localUsers.forEach((u) => {
          if (u && u.id && !delSet.has(u.id) && !delSet.has(u.username)) {
            map.set(u.id, u);
          }
        });
        payload.users.forEach((ru: any) => {
          if (ru && ru.id && !delSet.has(ru.id) && !delSet.has(ru.username)) {
            const existing = map.get(ru.id);
            if (!existing || (ru.updatedAt || '') >= (existing.updatedAt || '')) {
              map.set(ru.id, { ...(existing || {}), ...ru });
            }
          }
        });
        const mergedUsers = Array.from(map.values());
        const curRaw = localStorage.getItem('cinema_xxi_users_list') || '[]';
        const nextRaw = JSON.stringify(mergedUsers);
        if (curRaw !== nextRaw) {
          localStorage.setItem('cinema_xxi_users_list', nextRaw);
          StorageService.broadcastChange('users');
          updated = true;
        }
      }
    }

    const genresRow = data.find((r: any) => r.id === '__SYSTEM_SYNC_FILM_GENRES__');
    if (genresRow && Array.isArray(genresRow.shows) && genresRow.shows[0]) {
      const remoteGenres = genresRow.shows[0];
      if (remoteGenres && typeof remoteGenres === 'object') {
        const localGenres = StorageService.getFilmGenreRegistry();
        const mergedGenres = { ...localGenres, ...remoteGenres };
        const curRaw = localStorage.getItem('cinema_xxi_movie_genres') || '{}';
        const nextRaw = JSON.stringify(mergedGenres);
        if (curRaw !== nextRaw) {
          localStorage.setItem('cinema_xxi_movie_genres', nextRaw);
          StorageService.broadcastChange('genre-updated');
          updated = true;
        }
      }
    }

    const adminRow = data.find((r: any) => r.id === '__SYSTEM_SYNC_ADMINISTRATION__');
    if (adminRow && Array.isArray(adminRow.shows)) {
      const localAdmins = StorageService.getOutletAdministrations();
      const map = new Map<string, any>();
      localAdmins.forEach((a) => map.set(`${a.outletId}_${a.month}`, a));
      adminRow.shows.forEach((ra: any) => {
        if (ra && ra.outletId && ra.month) {
          map.set(`${ra.outletId}_${ra.month}`, ra);
        }
      });
      const merged = Array.from(map.values());
      const curRaw = localStorage.getItem('cinema_xxi_outlet_administration') || '[]';
      const nextRaw = JSON.stringify(merged);
      if (curRaw !== nextRaw) {
        localStorage.setItem('cinema_xxi_outlet_administration', nextRaw);
        StorageService.broadcastChange('administration');
        updated = true;
      }
    }

    const bopoRow = data.find((r: any) => r.id === '__SYSTEM_SYNC_BOPO__');
    if (bopoRow && Array.isArray(bopoRow.shows)) {
      const localBopo = StorageService.getBopoRecords();
      const map = new Map<string, any>();
      localBopo.forEach((b) => map.set(`${b.outletId}_${b.month}`, b));
      bopoRow.shows.forEach((rb: any) => {
        if (rb && rb.outletId && rb.month) {
          map.set(`${rb.outletId}_${rb.month}`, rb);
        }
      });
      const merged = Array.from(map.values());
      const curRaw = localStorage.getItem('cinema_xxi_bopo_records') || '[]';
      const nextRaw = JSON.stringify(merged);
      if (curRaw !== nextRaw) {
        localStorage.setItem('cinema_xxi_bopo_records', nextRaw);
        StorageService.broadcastChange('bopo');
        updated = true;
      }
    }

    const lfRow = data.find((r: any) => r.id === '__SYSTEM_SYNC_LOST_FOUND__');
    if (lfRow && Array.isArray(lfRow.shows)) {
      const curRaw = localStorage.getItem('cinema_xxi_lost_and_found') || '[]';
      const nextRaw = JSON.stringify(lfRow.shows);
      if (curRaw !== nextRaw) {
        localStorage.setItem('cinema_xxi_lost_and_found', nextRaw);
        StorageService.broadcastChange('lost-found');
        updated = true;
      }
    }

    const whRow = data.find((r: any) => r.id === '__SYSTEM_SYNC_WAREHOUSE__');
    if (whRow && Array.isArray(whRow.shows) && whRow.shows[0]) {
      const payload = whRow.shows[0];
      if (Array.isArray(payload.items)) {
        const curRaw = localStorage.getItem('cinema_xxi_warehouse_items') || '[]';
        const nextRaw = JSON.stringify(payload.items);
        if (curRaw !== nextRaw) {
          localStorage.setItem('cinema_xxi_warehouse_items', nextRaw);
          StorageService.broadcastChange('warehouse-items');
          updated = true;
        }
      }
      if (Array.isArray(payload.txs)) {
        const curRaw = localStorage.getItem('cinema_xxi_stock_transactions') || '[]';
        const nextRaw = JSON.stringify(payload.txs);
        if (curRaw !== nextRaw) {
          localStorage.setItem('cinema_xxi_stock_transactions', nextRaw);
          StorageService.broadcastChange('stock-transactions');
          updated = true;
        }
      }
      if (Array.isArray(payload.opname)) {
        const curRaw = localStorage.getItem('cinema_xxi_stock_opname_history') || '[]';
        const nextRaw = JSON.stringify(payload.opname);
        if (curRaw !== nextRaw) {
          localStorage.setItem('cinema_xxi_stock_opname_history', nextRaw);
          StorageService.broadcastChange('stock-opname');
          updated = true;
        }
      }
    }

    return updated;
  } catch {
    return false;
  }
}

let hasCompletedInitialPull = false;
let isPullInFlight = false;
let lastDeltaPullMs = 0;
const MIN_PULL_COOLDOWN_MS = 4000;

export async function pullAllRemoteToLocal(forceFull = false): Promise<void> {
  const client = getSupabase();
  if (!client || isPullInFlight) return;

  const nowMs = Date.now();
  if (!forceFull && hasCompletedInitialPull && nowMs - lastDeltaPullMs < MIN_PULL_COOLDOWN_MS) {
    // Cooldown aktif: cegah spam HTTP saat klik pindah-pindah menu / tab focus (Realtime WebSocket sudah aktif)
    return;
  }

  isPullInFlight = true;
  lastDeltaPullMs = nowMs;

  try {
    // Hanya 1 query super ringan (~400 Bytes) untuk mengecek id & updated_at tanpa mengunduh JSONB 'shows'
    const { data: metaRows, error: metaErr } = await client
      .from('cinema_sales')
      .select('id, updated_at')
      .like('id', '__SYSTEM_SYNC_%');

    if (metaErr || !Array.isArray(metaRows)) return;

    // Jika database Supabase baru benar-benar masih kosong (0 baris __SYSTEM_SYNC_), inisialisasi sekali saja
    if (metaRows.length === 0) {
      const seedKey = `cinema_xxi_db_seeded_${StorageService.getConfig().supabaseUrl}`;
      if (localStorage.getItem(seedKey) !== 'true') {
        localStorage.setItem(seedKey, 'true');
        await uploadAllLocalToSupabase();
      }
      hasCompletedInitialPull = true;
      return;
    }

    // Bandingkan timestamp server dengan timestamp yang sudah tersimpan di perangkat ini
    const changedIds = new Set<string>();
    for (const row of metaRows) {
      const id = String(row.id || '');
      const updatedAt = String(row.updated_at || '');
      if (!id) continue;
      if (lastSeenSyncTimestamps[id] !== updatedAt) {
        changedIds.add(id);
      }
    }

    // Jika pada saat buka pertama kali ada modul yang belum pernah ada di localStorage sama sekali, pastikan di-fetch
    if (!hasCompletedInitialPull) {
      const serverIds = new Set(metaRows.map((r: any) => String(r?.id || '')));
      if (!localStorage.getItem('cinema_xxi_user_sales_overrides') && serverIds.has('__SYSTEM_SYNC_DAILY_SALES__')) {
        changedIds.add('__SYSTEM_SYNC_DAILY_SALES__');
      }
      if (!localStorage.getItem('cinema_xxi_outlets') && serverIds.has('__SYSTEM_SYNC_OUTLETS__')) {
        changedIds.add('__SYSTEM_SYNC_OUTLETS__');
      }
      if (StorageService.getInspections().length === 0 && (serverIds.has('__SYSTEM_SYNC_INSPECTIONS__') || serverIds.has('__SYSTEM_SYNC_INSPECTIONS_DELTA__'))) {
        changedIds.add('__SYSTEM_SYNC_INSPECTIONS__');
      }
      if (!localStorage.getItem('cinema_xxi_occupancy_manifest') && serverIds.has('__SYSTEM_SYNC_OCCUPANCY__')) {
        changedIds.add('__SYSTEM_SYNC_OCCUPANCY__');
      }
      if (!localStorage.getItem('cinema_xxi_cashier_performance_daily') && serverIds.has('__SYSTEM_SYNC_SDM_PERFORMANCE__')) {
        changedIds.add('__SYSTEM_SYNC_SDM_PERFORMANCE__');
      }
      if (!localStorage.getItem('cinema_xxi_cashier_monthly_products') && serverIds.has('__SYSTEM_SYNC_SDM_PRODUCTS__')) {
        changedIds.add('__SYSTEM_SYNC_SDM_PRODUCTS__');
      }
      if (!localStorage.getItem('cinema_xxi_baking_sales') && serverIds.has('__SYSTEM_SYNC_BAKING_SALES__')) {
        changedIds.add('__SYSTEM_SYNC_BAKING_SALES__');
      }
      if (!localStorage.getItem('cinema_xxi_employees') && serverIds.has('__SYSTEM_SYNC_EMPLOYEES__')) {
        changedIds.add('__SYSTEM_SYNC_EMPLOYEES__');
      }
      hasCompletedInitialPull = true;
    }

    if (changedIds.size === 0) {
      // 100% Sinkron -> 0 KB JSONB diunduh (Hemat 99.9% Egress & Log Ingestion bahkan saat Refresh F5!)
      return;
    }

    const tasks: Promise<any>[] = [];

    if (changedIds.has('__SYSTEM_SYNC_OUTLETS__') || changedIds.has('__SYSTEM_SYNC_AREAS__')) {
      tasks.push(mergeRemoteOutletsAndAreasToLocal());
    }

    const changedAdditional = [
      '__SYSTEM_SYNC_USERS__',
      '__SYSTEM_SYNC_FILM_GENRES__',
      '__SYSTEM_SYNC_ADMINISTRATION__',
      '__SYSTEM_SYNC_BOPO__',
      '__SYSTEM_SYNC_LOST_FOUND__',
      '__SYSTEM_SYNC_WAREHOUSE__',
    ].filter((id) => changedIds.has(id));

    if (changedAdditional.length > 0) {
      tasks.push(mergeRemoteAdditionalModulesToLocal(changedAdditional));
    }

    if (changedIds.has('__SYSTEM_SYNC_DAILY_SALES__')) {
      tasks.push(mergeRemoteSalesToLocal(false));
    } else if (changedIds.has('__SYSTEM_SYNC_DAILY_SALES_DELTA__')) {
      tasks.push(mergeRemoteSalesToLocal(true));
    }
    if (changedIds.has('__SYSTEM_SYNC_BAKING_SALES__')) {
      tasks.push(mergeRemoteBakingSalesToLocal());
    }
    if (changedIds.has('__SYSTEM_SYNC_OCCUPANCY__')) {
      tasks.push(mergeRemoteOccupancyToLocal());
    }
    if (changedIds.has('__SYSTEM_SYNC_INSPECTIONS__')) {
      tasks.push(mergeRemoteInspectionsToLocal(false));
    } else if (changedIds.has('__SYSTEM_SYNC_INSPECTIONS_DELTA__')) {
      tasks.push(mergeRemoteInspectionsToLocal(true));
    }
    if (
      changedIds.has('__SYSTEM_SYNC_EMPLOYEES__') ||
      changedIds.has('__SYSTEM_SYNC_DELETED_EMPLOYEES__')
    ) {
      tasks.push(mergeRemoteEmployeesToLocal());
    }
    if (changedIds.has('__SYSTEM_SYNC_EMPLOYEE_KPIS__')) {
      tasks.push(mergeRemoteEmployeeKpisToLocal());
    }
    if (changedIds.has('__SYSTEM_SYNC_SDM_PERFORMANCE__')) {
      tasks.push(mergeRemoteCashierPerformanceToLocal());
    }
    if (changedIds.has('__SYSTEM_SYNC_SDM_PRODUCTS__')) {
      tasks.push(mergeRemoteCashierProductsToLocal());
    }
    if (changedIds.has('__SYSTEM_SYNC_DAILY_SECTION__')) {
      tasks.push(mergeRemoteDailySectionSalesToLocal());
    }

    if (tasks.length > 0) {
      await Promise.allSettled(tasks);
    }

    // Simpan semua timestamp terbaru yang sudah berhasil ditarik
    for (const row of metaRows) {
      const id = String(row.id || '');
      const updatedAt = String(row.updated_at || '');
      if (id && updatedAt && changedIds.has(id)) {
        recordSyncTimestamp(id, updatedAt, false);
      }
    }
  } finally {
    isPullInFlight = false;
  }
}

/**
 * Auto-Seed Internal Server Sync Engine from Local Device Storage on Startup
 * Memastikan data yang sudah ada di Device A (misal Card Inspection atau Sales) otomatis masuk ke Internal Server dan langsung terbaca oleh Device B
 */
async function seedInternalServerFromLocalDevice(): Promise<void> {
  try {
    // Gunakan timestamp historis yang sudah tercatat (atau fallback awal) agar tidak menimpa timestamp baru dari perangkat lain
    const getSeedTs = (id: string) => lastSeenSyncTimestamps[id] || '2020-01-01T00:00:00.000Z';
    const batchRecords: any[] = [];

    // 1. Inspections
    const inspections = StorageService.getInspections();
    if (inspections.length > 0) {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const recentList = inspections.filter((ins) => !ins.date || ins.date >= fourteenDaysAgo);
      if (recentList.length > 0) {
        batchRecords.push({
          id: '__SYSTEM_SYNC_INSPECTIONS__',
          outlet_id: '__SYSTEM_SYNC__',
          date: '2026-01-01',
          shows: recentList,
          updated_at: getSeedTs('__SYSTEM_SYNC_INSPECTIONS__'),
        });
        batchRecords.push({
          id: '__SYSTEM_SYNC_INSPECTIONS_DELTA__',
          outlet_id: '__SYSTEM_SYNC__',
          date: '2026-01-01',
          shows: recentList.slice(0, 25),
          updated_at: getSeedTs('__SYSTEM_SYNC_INSPECTIONS_DELTA__'),
        });
      }
    }

    // 2. User Sales Overrides
    const salesOverrides = StorageService.getUserSalesOverrides();
    if (salesOverrides.length > 0) {
      batchRecords.push({
        id: '__SYSTEM_SYNC_DAILY_SALES__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: salesOverrides,
        updated_at: getSeedTs('__SYSTEM_SYNC_DAILY_SALES__'),
      });
      batchRecords.push({
        id: '__SYSTEM_SYNC_DAILY_SALES_DELTA__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: salesOverrides.slice(-15),
        updated_at: getSeedTs('__SYSTEM_SYNC_DAILY_SALES_DELTA__'),
      });
    }

    // 3. Baking Sales
    const baking = StorageService.getBakingSales();
    if (baking.length > 0) {
      batchRecords.push({
        id: '__SYSTEM_SYNC_BAKING_SALES__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: baking,
        updated_at: getSeedTs('__SYSTEM_SYNC_BAKING_SALES__'),
      });
    }

    // 4. Employees & KPIs & SDM
    const kpis = StorageService.getEmployeeKpis();
    if (kpis.length > 0) {
      batchRecords.push({
        id: '__SYSTEM_SYNC_EMPLOYEE_KPIS__',
        outlet_id: '__SYSTEM_SYNC_EMPLOYEE_KPIS__',
        date: '2000-01-01',
        shows: kpis,
        updated_at: getSeedTs('__SYSTEM_SYNC_EMPLOYEE_KPIS__'),
      });
    }

    const sdmPerf = StorageService.getCashierDailyPerformanceAll();
    if (sdmPerf.length > 0) {
      batchRecords.push({
        id: '__SYSTEM_SYNC_SDM_PERFORMANCE__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: sdmPerf,
        updated_at: getSeedTs('__SYSTEM_SYNC_SDM_PERFORMANCE__'),
      });
    }

    // 5. Additional Modules (Outlets, Areas, Employees, SDM, Admin, BOPO, Lost & Found, Warehouse)
    const outlets = StorageService.getOutlets();
    if (outlets.length > 0) {
      batchRecords.push({
        id: '__SYSTEM_SYNC_OUTLETS__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: outlets,
        updated_at: getSeedTs('__SYSTEM_SYNC_OUTLETS__'),
      });
    }
    const areas = StorageService.getAreas();
    if (areas.length > 0) {
      batchRecords.push({
        id: '__SYSTEM_SYNC_AREAS__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: areas,
        updated_at: getSeedTs('__SYSTEM_SYNC_AREAS__'),
      });
    }
    const employees = StorageService.getEmployees();
    if (employees.length > 0) {
      batchRecords.push({
        id: '__SYSTEM_SYNC_EMPLOYEES__',
        outlet_id: '__SYSTEM_SYNC_EMPLOYEES__',
        date: '2000-01-01',
        shows: employees,
        updated_at: getSeedTs('__SYSTEM_SYNC_EMPLOYEES__'),
      });
    }
    const sdmProd = StorageService.getCashierMonthlyProductsAll();
    if (sdmProd.length > 0) {
      batchRecords.push({
        id: '__SYSTEM_SYNC_SDM_PRODUCTS__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: sdmProd,
        updated_at: getSeedTs('__SYSTEM_SYNC_SDM_PRODUCTS__'),
      });
    }
    const dailySec = StorageService.getDailySectionSalesAll();
    if (dailySec.length > 0) {
      batchRecords.push({
        id: '__SYSTEM_SYNC_DAILY_SECTION__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: dailySec,
        updated_at: getSeedTs('__SYSTEM_SYNC_DAILY_SECTION__'),
      });
    }

    if (batchRecords.length > 0) {
      await callInternalSyncUpsert({
        table: 'cinema_sales',
        records: batchRecords,
        clientId: DEVICE_CLIENT_ID,
        seedMode: true,
      });
    }
  } catch {
    // ignore
  }
}

function handleRealtimeRowTrigger(rowId: string, incomingUpdatedAt?: string, senderClientId?: string): void {
  if (!rowId || !rowId.startsWith('__SYSTEM_SYNC_')) return;
  if (senderClientId && senderClientId === DEVICE_CLIENT_ID) return;
  if (!senderClientId && isEchoFromOwnWrite(rowId, incomingUpdatedAt)) return;

  if (rowId === '__SYSTEM_SYNC_OUTLETS__' || rowId === '__SYSTEM_SYNC_AREAS__') {
    scheduleDebouncedRealtimeMerge('outlets_areas', () => mergeRemoteOutletsAndAreasToLocal());
    return;
  }
  if (
    rowId === '__SYSTEM_SYNC_USERS__' ||
    rowId === '__SYSTEM_SYNC_FILM_GENRES__' ||
    rowId === '__SYSTEM_SYNC_ADMINISTRATION__' ||
    rowId === '__SYSTEM_SYNC_BOPO__' ||
    rowId === '__SYSTEM_SYNC_LOST_FOUND__' ||
    rowId === '__SYSTEM_SYNC_WAREHOUSE__'
  ) {
    scheduleDebouncedRealtimeMerge(`add_${rowId}`, () => mergeRemoteAdditionalModulesToLocal([rowId]));
    return;
  }
  if (rowId === '__SYSTEM_SYNC_EMPLOYEES__' || rowId === '__SYSTEM_SYNC_DELETED_EMPLOYEES__') {
    scheduleDebouncedRealtimeMerge('employees', () => mergeRemoteEmployeesToLocal());
    return;
  }
  if (rowId === '__SYSTEM_SYNC_EMPLOYEE_KPIS__') {
    scheduleDebouncedRealtimeMerge('kpis', () => mergeRemoteEmployeeKpisToLocal());
    return;
  }
  if (rowId === '__SYSTEM_SYNC_BAKING_SALES__') {
    scheduleDebouncedRealtimeMerge('baking', () => mergeRemoteBakingSalesToLocal());
    return;
  }
  if (rowId === '__SYSTEM_SYNC_INSPECTIONS_DELTA__') {
    scheduleDebouncedRealtimeMerge('inspections_delta', () => mergeRemoteInspectionsToLocal(true));
    return;
  }
  if (rowId === '__SYSTEM_SYNC_INSPECTIONS__') {
    scheduleDebouncedRealtimeMerge('inspections', () => mergeRemoteInspectionsToLocal(false));
    return;
  }
  if (rowId === '__SYSTEM_SYNC_SDM_PERFORMANCE__') {
    scheduleDebouncedRealtimeMerge('sdm_perf', () => mergeRemoteCashierPerformanceToLocal());
    return;
  }
  if (rowId === '__SYSTEM_SYNC_SDM_PRODUCTS__') {
    scheduleDebouncedRealtimeMerge('sdm_prod', () => mergeRemoteCashierProductsToLocal());
    return;
  }
  if (rowId === '__SYSTEM_SYNC_DAILY_SECTION__') {
    scheduleDebouncedRealtimeMerge('daily_sec', () => mergeRemoteDailySectionSalesToLocal());
    return;
  }
  if (rowId === '__SYSTEM_SYNC_DAILY_SALES_DELTA__') {
    scheduleDebouncedRealtimeMerge('daily_sales_delta', () => mergeRemoteSalesToLocal(true));
    return;
  }
  if (rowId === '__SYSTEM_SYNC_DAILY_SALES__') {
    scheduleDebouncedRealtimeMerge('daily_sales', () => mergeRemoteSalesToLocal(false));
    return;
  }
}

/**
 * Setup Realtime channel listener: Internal Server Sync Engine (SSE /api/sync/stream) + Hybrid Offline-First
 */
export function setupSupabaseRealtimeSync(): () => void {
  const client = getSupabase();
  if (!client) {
    return () => {};
  }

  // 1. Tarik semua pembaruan terbaru dari server/cloud terlebih dahulu, lalu seed data lokal yang belum ada di server
  pullAllRemoteToLocal(true).finally(() => {
    seedInternalServerFromLocalDevice();
  });

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      pullAllRemoteToLocal(false);
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);

  // 2. Internal Server Sync Engine Real-Time Stream (SSE: 0 Kuota Egress, Bebas Limit Log Ingestion)
  let eventSource: EventSource | null = null;
  try {
    eventSource = new EventSource('/api/sync/stream');
    eventSource.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (!msg) return;
        if (msg.type === 'CONNECTED' && msg.mode === 'edge-serverless') {
          // On Cloudflare Pages serverless functions, close SSE stream after handshake and use lightweight Edge Query polling
          eventSource?.close();
          eventSource = null;
          return;
        }
        if (msg.type !== 'ROW_UPDATED') return;
        if (msg.clientId && msg.clientId === DEVICE_CLIENT_ID) return;

        if (msg.table === 'cinema_sales' && msg.id) {
          handleRealtimeRowTrigger(String(msg.id), msg.updated_at, msg.clientId);
        } else if (msg.table === 'cinema_occupancy' && msg.outlet_id && msg.date) {
          const outletId = msg.outlet_id;
          const date = msg.date;
          const rows = Array.isArray(msg.rows) ? msg.rows : [];
          const key1 = `cinema_xxi_occupancy_records_${outletId}_${date}`;
          const key2 = `cinema_xxi_occupancy_${outletId}_${date}`;
          localStorage.setItem(key1, JSON.stringify(rows));
          localStorage.setItem(key2, JSON.stringify(rows));
          try {
            const manRaw = localStorage.getItem('cinema_xxi_occupancy_manifest');
            const man = manRaw ? JSON.parse(manRaw) : {};
            if (!man[outletId]) man[outletId] = [];
            if (!man[outletId].includes(date)) {
              man[outletId].push(date);
              localStorage.setItem('cinema_xxi_occupancy_manifest', JSON.stringify(man));
            }
          } catch {
            // ignore
          }
          StorageService.syncOccupancyToMovieHistory(outletId, date, rows);
          StorageService.broadcastChange('occupancy');
          StorageService.broadcastChange('movies');
        }
      } catch {
        // ignore parse errors
      }
    };
  } catch {
    // ignore SSE init errors
  }

  // 3. Secondary Supabase Realtime channel subscription (Tanpa filter panjang > 400 karakter yang membuat PostgREST gagal)
  try {
    const channel = client
      .channel('cinema_xxi_realtime_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cinema_sales',
        },
        (payload: any) => {
          if (!payload.new || !payload.new.id) return;
          const rowId = String(payload.new.id);
          const incomingUpdatedAt = payload.new.updated_at ? String(payload.new.updated_at) : undefined;
          handleRealtimeRowTrigger(rowId, incomingUpdatedAt);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cinema_occupancy' },
        (payload: any) => {
          if (payload.new && payload.new.outlet_id && payload.new.date) {
            const outletId = payload.new.outlet_id;
            const date = payload.new.date;
            const rows = Array.isArray(payload.new.rows) ? payload.new.rows : [];
            const key1 = `cinema_xxi_occupancy_records_${outletId}_${date}`;
            const key2 = `cinema_xxi_occupancy_${outletId}_${date}`;
            localStorage.setItem(key1, JSON.stringify(rows));
            localStorage.setItem(key2, JSON.stringify(rows));
            try {
              const manRaw = localStorage.getItem('cinema_xxi_occupancy_manifest');
              const man = manRaw ? JSON.parse(manRaw) : {};
              if (!man[outletId]) man[outletId] = [];
              if (!man[outletId].includes(date)) {
                man[outletId].push(date);
                localStorage.setItem('cinema_xxi_occupancy_manifest', JSON.stringify(man));
              }
            } catch {
              // ignore
            }
            StorageService.syncOccupancyToMovieHistory(outletId, date, rows);
            StorageService.broadcastChange('occupancy');
            StorageService.broadcastChange('movies');
          }
        }
      )
      .subscribe();

    // Heartbeat delta check ringan (~400B) setiap 6 detik HANYA saat tab aktif/terlihat
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        pullAllRemoteToLocal(false);
      }
    }, 6000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (eventSource) {
        try {
          eventSource.close();
        } catch {
          // ignore
        }
      }
      try {
        client.removeChannel(channel);
      } catch {
        // ignore
      }
      clearInterval(intervalId);
    };
  } catch (e) {
    console.warn('Realtime subscription error:', e);
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        pullAllRemoteToLocal(false);
      }
    }, 6000);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (eventSource) {
        try {
          eventSource.close();
        } catch {
          // ignore
        }
      }
      clearInterval(intervalId);
    };
  }
}

/**
 * Push Semua Data Local ke Supabase (Batch Mode: Tanpa Loop Ratusan Request!)
 */
export async function uploadAllLocalToSupabase(): Promise<{
  success: boolean;
  salesCount: number;
  occupancyCount: number;
  inspectionCount: number;
  employeeCount?: number;
  error?: string;
}> {
  const client = getSupabase();
  if (!client) {
    return {
      success: false,
      salesCount: 0,
      occupancyCount: 0,
      inspectionCount: 0,
      error: 'Supabase belum terhubung.',
    };
  }

  try {
    const nowIso = new Date().toISOString();
    await syncOutletsAndAreasToSupabase();
    await syncAdditionalModulesToSupabase();

    // 1. Upload Data Sales (1 Request Batch)
    const allSales = StorageService.getDailySales();
    const userSales = allSales.filter(
      (s) =>
        s.isMigrated === false &&
        !String(s.id || '').startsWith('mig_') &&
        !StorageService.isStaticUneditedSalesRecord(s)
    );
    let salesCount = 0;
    if (userSales.length > 0) {
      const ok = await syncSalesToSupabase(userSales);
      if (ok) salesCount = userSales.length;
    }

    // 2. Upload Baking Sales (1 Request Batch)
    const bakingSales = StorageService.getBakingSales();
    if (bakingSales.length > 0) {
      await syncBakingSalesToSupabase(bakingSales);
    }

    // 3. Upload Occupancy Records dalam 1 Batch Request (Bukan loop satu-satu!)
    let occupancyCount = 0;
    const occupancyPayloads = new Map<string, any>();
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('cinema_xxi_occupancy_')) {
        const cleanKey = k.replace(/^cinema_xxi_occupancy_(records_)?/, '');
        if (cleanKey === 'manifest') continue;
        const parts = cleanKey.split('_');
        const date = parts.pop() || '';
        let outletId = parts.join('_');
        if (outletId.startsWith('records_')) {
          outletId = outletId.replace(/^records_/, '');
        }
        const raw = localStorage.getItem(k);
        if (raw && outletId && date) {
          try {
            const parsed = JSON.parse(raw);
            const rows = Array.isArray(parsed) ? parsed : parsed.rows || [];
            if (rows.length > 0) {
              const id = `${outletId}_${date}`;
              occupancyPayloads.set(id, {
                id,
                outlet_id: outletId,
                date,
                rows,
                updated_at: nowIso,
              });
            }
          } catch {
            // ignore
          }
        }
      }
    }

    if (occupancyPayloads.size > 0) {
      const batchOcc = Array.from(occupancyPayloads.values());
      await client.from('cinema_occupancy').upsert(batchOcc, { onConflict: 'id' });
      occupancyCount = batchOcc.length;
    }

    // 4. Upload Inspections dalam 1 Single Batch Request (Pruned to 14 hari terakhir)
    let inspectionCount = 0;
    const inspections = StorageService.getInspections();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const activeInspections = inspections.filter((ins) => !ins.date || ins.date >= fourteenDaysAgo);
    if (activeInspections.length > 0) {
      recordSyncTimestamp('__SYSTEM_SYNC_INSPECTIONS__', nowIso, true);
      const { error: insErr } = await client.from('cinema_sales').upsert(
        {
          id: '__SYSTEM_SYNC_INSPECTIONS__',
          outlet_id: '__SYSTEM_SYNC__',
          date: '2026-01-01',
          shows: activeInspections as any,
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );
      if (!insErr) inspectionCount = activeInspections.length;
    }

    // 5. Upload Data Karyawan, KPI, dan SDM (Masing-masing 1 Batch Request)
    const employees = StorageService.getEmployees();
    let employeeCount = 0;
    if (employees.length > 0) {
      const okEmp = await syncEmployeesToSupabase(employees);
      if (okEmp) employeeCount = employees.length;
    }
    const employeeKpis = StorageService.getEmployeeKpis();
    if (employeeKpis.length > 0) {
      await syncEmployeeKpisToSupabase(employeeKpis);
    }
    const sdmPerf = StorageService.getCashierDailyPerformanceAll();
    if (sdmPerf.length > 0) {
      await syncCashierPerformanceToSupabase(sdmPerf);
    }
    const sdmProd = StorageService.getCashierMonthlyProductsAll();
    if (sdmProd.length > 0) {
      await syncCashierProductsToSupabase(sdmProd);
    }
    const dailySec = StorageService.getDailySectionSalesAll();
    if (dailySec.length > 0) {
      await syncDailySectionSalesToSupabase(dailySec);
    }

    return {
      success: true,
      salesCount,
      occupancyCount,
      inspectionCount,
      employeeCount,
    };
  } catch (err: any) {
    return {
      success: false,
      salesCount: 0,
      occupancyCount: 0,
      inspectionCount: 0,
      error: err.message,
    };
  }
}

/**
 * Sinkronisasi Global System Config (API Keys & Settings) ke Supabase
 */
export async function syncConfigToSupabase(config: any): Promise<boolean> {
  const client = getSupabase();
  if (!client || missingOptionalTables.has('cinema_config')) return false;

  try {
    const { error } = await client
      .from('cinema_config')
      .upsert({ id: 'global', config, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error) {
      if (isTableMissingError(error)) {
        missingOptionalTables.add('cinema_config');
      }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Tarik Global Config dari Supabase dan simpan ke Local Storage jika ada API Key baru
 */
export async function mergeRemoteConfigToLocal(): Promise<boolean> {
  const client = getSupabase();
  if (!client || missingOptionalTables.has('cinema_config')) return false;

  try {
    const { data, error } = await client
      .from('cinema_config')
      .select('config')
      .eq('id', 'global')
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        missingOptionalTables.add('cinema_config');
      }
      return false;
    }

    if (data && data.config) {
      const remoteConfig = data.config;
      const currentConfig = StorageService.getConfig();

      let changed = false;
      if (remoteConfig.mistralApiKey && remoteConfig.mistralApiKey !== currentConfig.mistralApiKey) {
        currentConfig.mistralApiKey = remoteConfig.mistralApiKey;
        currentConfig.ocrProvider = 'mistral';
        changed = true;
      }

      if (changed) {
        localStorage.setItem('cinema_xxi_config', JSON.stringify(currentConfig));
        StorageService.broadcastChange('config');
      }
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}
