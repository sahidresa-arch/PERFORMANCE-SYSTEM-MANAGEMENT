import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StorageService } from './storage';
import { DailySalesRecord } from '../types';

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

-- 4. Indeks performa pencarian query
CREATE INDEX IF NOT EXISTS idx_cinema_sales_outlet_date ON public.cinema_sales(outlet_id, date);
CREATE INDEX IF NOT EXISTS idx_cinema_occupancy_outlet_date ON public.cinema_occupancy(outlet_id, date);

-- 5. Aktifkan Row Level Security (RLS) dengan Policy Akses Anon
ALTER TABLE public.cinema_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cinema_occupancy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cinema_baking ENABLE ROW LEVEL SECURITY;

-- Policy untuk public / anon user
DROP POLICY IF EXISTS "Allow anon all on cinema_sales" ON public.cinema_sales;
CREATE POLICY "Allow anon all on cinema_sales" ON public.cinema_sales FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on cinema_occupancy" ON public.cinema_occupancy;
CREATE POLICY "Allow anon all on cinema_occupancy" ON public.cinema_occupancy FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on cinema_baking" ON public.cinema_baking;
CREATE POLICY "Allow anon all on cinema_baking" ON public.cinema_baking FOR ALL USING (true) WITH CHECK (true);
`;

export function getSupabase(): SupabaseClient | null {
  const config = StorageService.getConfig();
  const url = config.supabaseUrl || (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const key = config.supabaseAnonKey || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    return null;
  }

  const clientKey = `${url}___${key}`;
  if (!supabaseInstance || currentClientKey !== clientKey) {
    try {
      supabaseInstance = createClient(url, key, {
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
 * Push Semua Data Local ke Supabase
 */
export async function uploadAllLocalToSupabase(): Promise<{
  success: boolean;
  salesCount: number;
  occupancyCount: number;
  error?: string;
}> {
  const client = getSupabase();
  if (!client) {
    return { success: false, salesCount: 0, occupancyCount: 0, error: 'Supabase belum terhubung.' };
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
      // Format: {outletId}_{date}
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

    return {
      success: true,
      salesCount,
      occupancyCount,
    };
  } catch (err: any) {
    return {
      success: false,
      salesCount: 0,
      occupancyCount: 0,
      error: err.message,
    };
  }
}
