import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StorageService } from './storage';
import { DailySalesRecord, ToiletInspectionRecord } from '../types';

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

-- 5. Indeks performa pencarian query
CREATE INDEX IF NOT EXISTS idx_cinema_sales_outlet_date ON public.cinema_sales(outlet_id, date);
CREATE INDEX IF NOT EXISTS idx_cinema_occupancy_outlet_date ON public.cinema_occupancy(outlet_id, date);
CREATE INDEX IF NOT EXISTS idx_cinema_inspections_outlet_date ON public.cinema_inspections(outlet_id, date);

-- 6. Aktifkan Row Level Security (RLS) dengan Policy Akses Anon
ALTER TABLE public.cinema_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cinema_occupancy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cinema_baking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cinema_inspections ENABLE ROW LEVEL SECURITY;

-- Policy untuk public / anon user
DROP POLICY IF EXISTS "Allow anon all on cinema_sales" ON public.cinema_sales;
CREATE POLICY "Allow anon all on cinema_sales" ON public.cinema_sales FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on cinema_occupancy" ON public.cinema_occupancy;
CREATE POLICY "Allow anon all on cinema_occupancy" ON public.cinema_occupancy FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on cinema_baking" ON public.cinema_baking;
CREATE POLICY "Allow anon all on cinema_baking" ON public.cinema_baking FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on cinema_inspections" ON public.cinema_inspections;
CREATE POLICY "Allow anon all on cinema_inspections" ON public.cinema_inspections FOR ALL USING (true) WITH CHECK (true);
`;

export function getSupabase(): SupabaseClient | null {
  const config = StorageService.getConfig();
  const url = config.supabaseUrl || (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const key = config.supabaseAnonKey || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    return null;
  }

  const clientKey = `${url.trim()}___${key.trim()}`;
  if (!supabaseInstance || currentClientKey !== clientKey) {
    try {
      supabaseInstance = createClient(url.trim(), key.trim(), {
        auth: { persistSession: true },
      });
      currentClientKey = clientKey;
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return supabaseInstance;
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
  if (!url || !key) {
    return {
      connected: false,
      message: 'URL dan Anon Key Supabase harus diisi.',
    };
  }

  try {
    const client = createClient(url.trim(), key.trim());

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

/**
 * Sinkronisasi Data Sales Harian ke Supabase
 */
export async function syncSalesToSupabase(sales: DailySalesRecord[]): Promise<boolean> {
  const client = getSupabase();
  if (!client || sales.length === 0) return false;

  try {
    const payload = sales.map((s) => ({
      id: s.id || `${s.outletId}_${s.date}`,
      outlet_id: s.outletId,
      date: s.date,
      shows: s.shows,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client.from('cinema_sales').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Sync sales to Supabase warning:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase sales sync error:', e);
    return false;
  }
}

/**
 * Ambil Data Sales Harian dari Supabase
 */
export async function fetchSalesFromSupabase(): Promise<DailySalesRecord[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('cinema_sales')
      .select('*')
      .order('date', { ascending: false });

    if (error || !data) {
      console.warn('Fetch sales from Supabase warning:', error);
      return null;
    }

    return data.map((row: any) => ({
      id: row.id,
      outletId: row.outlet_id,
      date: row.date,
      shows: Array.isArray(row.shows) ? row.shows : [],
    }));
  } catch (e) {
    console.warn('Supabase fetch sales error:', e);
    return null;
  }
}

/**
 * Sinkronisasi Data Okupansi Studio ke Supabase
 */
export async function syncOccupancyToSupabase(
  outletId: string,
  date: string,
  rows: any[]
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const id = `${outletId}_${date}`;
    const { error } = await client.from('cinema_occupancy').upsert(
      {
        id,
        outlet_id: outletId,
        date,
        rows,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

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
    let query = client.from('cinema_occupancy').select('*');
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
 * Merges remote sales records from Supabase into local storage and notifies UI components
 */
export async function mergeRemoteSalesToLocal(): Promise<boolean> {
  const remoteSales = await fetchSalesFromSupabase();
  if (!remoteSales || remoteSales.length === 0) return false;

  const currentLocal = StorageService.getDailySales();
  let updated = false;

  remoteSales.forEach((remote) => {
    const idx = currentLocal.findIndex(
      (s) => s.outletId === remote.outletId && s.date === remote.date
    );
    if (idx >= 0) {
      const localStr = JSON.stringify(currentLocal[idx].shows || []);
      const remoteStr = JSON.stringify(remote.shows || []);
      if (localStr !== remoteStr) {
        currentLocal[idx] = remote;
        updated = true;
      }
    } else {
      currentLocal.push(remote);
      updated = true;
    }
  });

  if (updated) {
    localStorage.setItem('cinema_xxi_daily_sales', JSON.stringify(currentLocal));
    StorageService.broadcastChange('sales');
  }

  return updated;
}

/**
 * Merges remote occupancy records from Supabase into local storage and notifies UI components
 */
export async function mergeRemoteOccupancyToLocal(): Promise<boolean> {
  const remoteOcc = await fetchOccupancyFromSupabase();
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

/**
 * Sinkronisasi Satu Record Card Inspection ke Supabase
 */
export async function syncInspectionToSupabase(record: ToiletInspectionRecord): Promise<boolean> {
  const client = getSupabase();
  if (!client || !record) return false;

  try {
    const payload = {
      id: record.id,
      outlet_id: record.outletId,
      date: record.date,
      show_number: record.showNumber,
      type: record.type,
      inspector_name: record.inspectorName,
      time: record.time || '',
      notes: record.notes || '',
      checklist: record.checklist || {},
      status: record.status || 'Sudah Lapor',
      updated_at: new Date().toISOString(),
    };

    const { error } = await client
      .from('cinema_inspections')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Sync inspection to Supabase warning:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase inspection sync error:', e);
    return false;
  }
}

/**
 * Ambil Rekap Card Inspection dari Supabase
 */
export async function fetchInspectionsFromSupabase(
  outletId?: string,
  date?: string
): Promise<ToiletInspectionRecord[] | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    let query = client
      .from('cinema_inspections')
      .select('*')
      .order('date', { ascending: false });

    if (outletId) query = query.eq('outlet_id', outletId);
    if (date) query = query.eq('date', date);

    const { data, error } = await query;
    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      outletId: row.outlet_id,
      date: row.date,
      showNumber: row.show_number,
      type: row.type,
      inspectorName: row.inspector_name,
      time: row.time || '',
      notes: row.notes || '',
      checklist: row.checklist || {},
      status: row.status || 'Sudah Lapor',
    }));
  } catch (e) {
    console.warn('Supabase fetch inspections error:', e);
    return null;
  }
}

/**
 * Merges remote inspection records from Supabase into local storage and notifies UI components
 */
export async function mergeRemoteInspectionsToLocal(): Promise<boolean> {
  const remoteInspections = await fetchInspectionsFromSupabase();
  if (!remoteInspections || remoteInspections.length === 0) return false;

  const currentLocal = StorageService.getInspections();
  let updated = false;

  remoteInspections.forEach((remote) => {
    const idx = currentLocal.findIndex((i) => i.id === remote.id);
    if (idx >= 0) {
      if (JSON.stringify(currentLocal[idx]) !== JSON.stringify(remote)) {
        currentLocal[idx] = remote;
        updated = true;
      }
    } else {
      currentLocal.unshift(remote);
      updated = true;
    }
  });

  if (updated) {
    localStorage.setItem('cinema_xxi_toilet_inspections', JSON.stringify(currentLocal));
    StorageService.broadcastChange('inspection');
  }

  return updated;
}

/**
 * Setup Realtime channel listener and periodic sync for Supabase database changes
 */
export function setupSupabaseRealtimeSync(): () => void {
  const client = getSupabase();
  if (!client) {
    return () => {};
  }

  // Initial pull on load
  mergeRemoteSalesToLocal();
  mergeRemoteOccupancyToLocal();
  mergeRemoteInspectionsToLocal();
  mergeRemoteConfigToLocal();

  // Setup Supabase Realtime channel subscription
  try {
    const channel = client
      .channel('cinema_xxi_realtime_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cinema_sales' },
        (payload: any) => {
          if (payload.new && payload.new.outlet_id && payload.new.date) {
            const remoteRecord: DailySalesRecord = {
              id: payload.new.id,
              outletId: payload.new.outlet_id,
              date: payload.new.date,
              shows: Array.isArray(payload.new.shows) ? payload.new.shows : [],
            };
            const currentLocal = StorageService.getDailySales();
            const idx = currentLocal.findIndex(
              (s) => s.outletId === remoteRecord.outletId && s.date === remoteRecord.date
            );
            if (idx >= 0) {
              currentLocal[idx] = remoteRecord;
            } else {
              currentLocal.push(remoteRecord);
            }
            localStorage.setItem('cinema_xxi_daily_sales', JSON.stringify(currentLocal));
            StorageService.broadcastChange('sales');
          }
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cinema_inspections' },
        (payload: any) => {
          if (payload.new && payload.new.id) {
            const remoteRecord: ToiletInspectionRecord = {
              id: payload.new.id,
              outletId: payload.new.outlet_id,
              date: payload.new.date,
              showNumber: payload.new.show_number,
              type: payload.new.type,
              inspectorName: payload.new.inspector_name,
              time: payload.new.time || '',
              notes: payload.new.notes || '',
              checklist: payload.new.checklist || {},
              status: payload.new.status || 'Sudah Lapor',
            };
            const currentLocal = StorageService.getInspections();
            const idx = currentLocal.findIndex((i) => i.id === remoteRecord.id);
            if (idx >= 0) {
              currentLocal[idx] = remoteRecord;
            } else {
              currentLocal.unshift(remoteRecord);
            }
            localStorage.setItem('cinema_xxi_toilet_inspections', JSON.stringify(currentLocal));
            StorageService.broadcastChange('inspection');
          }
        }
      )
      .subscribe();

    // Lightweight 5-second polling fallback in case Realtime WebSockets are restricted
    const intervalId = setInterval(() => {
      mergeRemoteSalesToLocal();
      mergeRemoteOccupancyToLocal();
      mergeRemoteInspectionsToLocal();
    }, 5000);

    return () => {
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
      mergeRemoteSalesToLocal();
      mergeRemoteOccupancyToLocal();
      mergeRemoteInspectionsToLocal();
    }, 5000);
    return () => clearInterval(intervalId);
  }
}

/**
 * Push Semua Data Local ke Supabase
 */
export async function uploadAllLocalToSupabase(): Promise<{
  success: boolean;
  salesCount: number;
  occupancyCount: number;
  inspectionCount: number;
  error?: string;
}> {
  const client = getSupabase();
  if (!client) {
    return { success: false, salesCount: 0, occupancyCount: 0, inspectionCount: 0, error: 'Supabase belum terhubung.' };
  }

  try {
    const sales = StorageService.getDailySales();
    let salesCount = 0;
    if (sales.length > 0) {
      const ok = await syncSalesToSupabase(sales);
      if (ok) salesCount = sales.length;
    }

    // Ambil semua occupancy records dari localStorage
    let occupancyCount = 0;
    const occupancyKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('cinema_xxi_occupancy_')) {
        occupancyKeys.push(k);
      }
    }

    for (const key of occupancyKeys) {
      const parts = key.replace('cinema_xxi_occupancy_', '').split('_');
      const date = parts.pop() || '';
      const outletId = parts.join('_');
      const raw = localStorage.getItem(key);
      if (raw && outletId && date) {
        try {
          const parsed = JSON.parse(raw);
          const rows = Array.isArray(parsed) ? parsed : parsed.rows || [];
          if (rows.length > 0) {
            await syncOccupancyToSupabase(outletId, date, rows);
            occupancyCount++;
          }
        } catch {
          // ignore
        }
      }
    }

    // Ambil dan upload inspections
    let inspectionCount = 0;
    const inspections = StorageService.getInspections();
    if (inspections.length > 0) {
      for (const ins of inspections) {
        const ok = await syncInspectionToSupabase(ins);
        if (ok) inspectionCount++;
      }
    }

    return {
      success: true,
      salesCount,
      occupancyCount,
      inspectionCount,
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
  if (!client) return false;

  try {
    const { error } = await client
      .from('cinema_config')
      .upsert({ id: 'global', config, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error) {
      console.warn('Sync config to Supabase warning:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase config sync error:', e);
    return false;
  }
}

/**
 * Tarik Global Config dari Supabase dan simpan ke Local Storage jika ada API Key baru
 */
export async function mergeRemoteConfigToLocal(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { data, error } = await client
      .from('cinema_config')
      .select('config')
      .eq('id', 'global')
      .single();

    if (!error && data && data.config) {
      const remoteConfig = data.config;
      const currentConfig = StorageService.getConfig();

      // Jika remote config punya mistralApiKey atau supabase key yang belum ada di local, sinkronkan
      let changed = false;
      if (remoteConfig.mistralApiKey && remoteConfig.mistralApiKey !== currentConfig.mistralApiKey) {
        currentConfig.mistralApiKey = remoteConfig.mistralApiKey;
        currentConfig.ocrProvider = 'mistral';
        changed = true;
      }

      if (remoteConfig.supabaseUrl && !currentConfig.supabaseUrl) {
        currentConfig.supabaseUrl = remoteConfig.supabaseUrl;
        currentConfig.supabaseAnonKey = remoteConfig.supabaseAnonKey;
        currentConfig.supabaseConnected = true;
        changed = true;
      }

      if (changed) {
        localStorage.setItem('cinema_xxi_config', JSON.stringify(currentConfig));
        StorageService.broadcastChange('config');
      }
      return true;
    }
  } catch (e) {
    console.warn('Fetch remote config error:', e);
  }
  return false;
}
