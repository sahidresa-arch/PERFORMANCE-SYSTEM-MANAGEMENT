import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StorageService } from './storage';
import {
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

-- 9. Aktifkan Supabase Realtime untuk Tabel HC Area
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cinema_employees'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cinema_employees;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cinema_employee_kpis'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cinema_employee_kpis;
  END IF;
END $$;
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

    return data
      .filter(
        (row: any) =>
          !String(row.id || '').startsWith('__SYSTEM_SYNC_') &&
          !String(row.outlet_id || '').startsWith('__SYSTEM_SYNC_')
      )
      .map((row: any) => ({
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
 * Sinkronisasi Data Karyawan & Daftar Karyawan Dihapus ke Supabase
 * Mendukung tabel khusus public.cinema_employees sekaligus fallback ke cinema_sales
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

    let tableSuccess = false;

    // 1. Coba sinkronisasi ke tabel khusus public.cinema_employees (jika sudah di-run di Supabase)
    if (empList.length > 0) {
      const rows = empList.map((e: any) => ({
        id: e.id,
        nik: e.nik || '-',
        name: e.name || '',
        jabatan: e.jabatan || 'Cinema Manager',
        divisi: e.divisi || 'Cinema',
        outlet_id: e.outletId || 'the-park-sawangan-xxi',
        gender: e.gender || 'L',
        tanggal_lahir: e.tanggalLahir || '-',
        status_kerja: e.statusKerja || 'Kontrak',
        tanggal_kontrak: e.tanggalKontrak || '2026-01-01',
        habis_kontrak: e.habisKontrak || '-',
        phone: e.phone || '-',
        photo_url: e.photoUrl || '',
        is_deleted: false,
        updated_at: e.updatedAt || nowIso,
      }));

      const { error: empTableErr } = await client
        .from('cinema_employees')
        .upsert(rows, { onConflict: 'id' });

      if (!empTableErr) {
        tableSuccess = true;
        // Tandai juga baris yang dihapus di tabel cinema_employees
        if (delList.length > 0) {
          await client
            .from('cinema_employees')
            .update({ is_deleted: true, updated_at: nowIso })
            .in('id', delList);
        }
      }
    }

    // 2. Simpan juga ke reserved row pada cinema_sales sebagai backup / kompatibilitas penuh
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
    if (error && !tableSuccess) {
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
 * Ambil & Gabungkan Data Karyawan dari Supabase ke Local Storage secara Cerdas
 */
export async function mergeRemoteEmployeesToLocal(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const localEmployees = StorageService.getEmployees();
    const localDelRaw = localStorage.getItem('cinema_xxi_deleted_employee_ids');
    const localDeletedIds: string[] = localDelRaw ? JSON.parse(localDelRaw) : [];

    let remoteEmployees: Employee[] = [];
    let remoteDeletedIds: string[] = [];
    let hasDedicatedTable = false;

    // 1. Cek tabel khusus public.cinema_employees terlebih dahulu
    const { data: tableRows, error: tableErr } = await client
      .from('cinema_employees')
      .select('*');

    if (!tableErr && Array.isArray(tableRows)) {
      hasDedicatedTable = true;
      if (tableRows.length === 0 && localEmployees.length > 0) {
        // Tabel cinema_employees baru saja dibuat di Supabase dan masih kosong -> langsung isi otomatis!
        await syncEmployeesToSupabase(localEmployees, localDeletedIds);
      } else {
        for (const r of tableRows) {
          if (r.is_deleted) {
            if (r.id) remoteDeletedIds.push(String(r.id));
            if (r.nik && r.nik !== '-') remoteDeletedIds.push(String(r.nik).trim());
          } else if (r.id) {
            remoteEmployees.push({
              id: String(r.id),
              nik: String(r.nik || '-'),
              name: String(r.name || ''),
              jabatan: String(r.jabatan || 'Cinema Manager'),
              divisi: (r.divisi || 'Cinema') as any,
              outletId: String(r.outlet_id || 'the-park-sawangan-xxi'),
              gender: (r.gender === 'P' ? 'P' : 'L') as 'L' | 'P',
              tanggalLahir: r.tanggal_lahir || '-',
              statusKerja: (r.status_kerja || 'Kontrak') as any,
              tanggalKontrak: r.tanggal_kontrak || '2026-01-01',
              habisKontrak: r.habis_kontrak || '-',
              phone: r.phone || '-',
              photoUrl: r.photo_url || undefined,
              ...({ updatedAt: r.updated_at } as any),
            });
          }
        }
      }
    }

    // 2. Cek juga backup row di cinema_sales (jika cinema_employees belum ada atau kosong)
    const { data, error } = await client
      .from('cinema_sales')
      .select('id, shows, updated_at')
      .in('id', ['__SYSTEM_SYNC_EMPLOYEES__', '__SYSTEM_SYNC_DELETED_EMPLOYEES__']);

    if (!error && data) {
      const empRow = data.find((r: any) => r.id === '__SYSTEM_SYNC_EMPLOYEES__');
      const delRow = data.find((r: any) => r.id === '__SYSTEM_SYNC_DELETED_EMPLOYEES__');

      if (delRow && Array.isArray(delRow.shows)) {
        remoteDeletedIds.push(...delRow.shows);
      }

      if (remoteEmployees.length === 0 && empRow && Array.isArray(empRow.shows) && empRow.shows.length > 0) {
        remoteEmployees = empRow.shows;
        // Jika tabel khusus cinema_employees sudah dibuat tapi tadinya kosong, sinkronkan ke tabel khusus
        if (hasDedicatedTable) {
          await syncEmployeesToSupabase(remoteEmployees, remoteDeletedIds);
        }
      }
    }

    // Jika di Supabase belum pernah ada data karyawan sama sekali:
    if (remoteEmployees.length === 0) {
      const hasLocalEdits =
        hasDedicatedTable ||
        localStorage.getItem('cinema_xxi_employees_modified') === 'true' ||
        localDeletedIds.length > 0 ||
        localEmployees.some(
          (e: any) =>
            (e.tanggalLahir && e.tanggalLahir !== '-') ||
            Boolean(e.updatedAt) ||
            String(e.id || '').startsWith('emp_')
        );

      if (hasLocalEdits && localEmployees.length > 0) {
        await syncEmployeesToSupabase(localEmployees, localDeletedIds);
      }
      return false;
    }

    // Gabungkan daftar ID/NIK yang dihapus
    const mergedDeletedSet = new Set<string>([...localDeletedIds, ...remoteDeletedIds]);
    const mergedDeletedList = Array.from(mergedDeletedSet);
    if (mergedDeletedList.length !== localDeletedIds.length) {
      localStorage.setItem('cinema_xxi_deleted_employee_ids', JSON.stringify(mergedDeletedList));
    }

    let needsPushBack = false;
    if (localDeletedIds.some((id) => !remoteDeletedIds.includes(id))) {
      needsPushBack = true;
    }

    // Buat map dari local employees untuk penggabungan cerdas
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

    // 1. Proses semua employee dari Remote Supabase
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
          // Local lebih baru (misal baru diedit di AI Studio tapi belum sempat ter-push)
          chosen = { ...rem, ...loc };
          needsPushBack = true;
        } else {
          // Remote lebih baru atau setara, gunakan remote, namun pertahankan tanggalLahir lokal jika di remote masih kosong/'-'
          const remHasDob = rem.tanggalLahir && rem.tanggalLahir !== '-';
          const locHasDob = loc.tanggalLahir && loc.tanggalLahir !== '-';
          if (!remHasDob && locHasDob && remTime === 0) {
            chosen = { ...rem, tanggalLahir: loc.tanggalLahir };
            needsPushBack = true;
          }
        }
      }

      if (!seenIds.has(chosen.id) && (!cleanNik || cleanNik === '-' || !seenNiks.has(cleanNik))) {
        seenIds.add(chosen.id);
        if (cleanNik && cleanNik !== '-') seenNiks.add(cleanNik);
        mergedList.push(chosen);
      }
    }

    // 2. Cek apakah ada karyawan lokal yang baru ditambahkan / diedit di AI Studio tapi belum ada di Remote
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
          needsPushBack = true;
        }
      }
    }

    const currentRaw = localStorage.getItem('cinema_xxi_employees') || '';
    const mergedRaw = JSON.stringify(mergedList);

    let updated = false;
    if (currentRaw !== mergedRaw && mergedList.length > 0) {
      localStorage.setItem('cinema_xxi_employees', mergedRaw);
      localStorage.setItem('EMPLOYEES_INITIALIZED_V6', 'true');
      StorageService.broadcastChange('employees');
      updated = true;
    }

    if (needsPushBack && mergedList.length > 0) {
      await syncEmployeesToSupabase(mergedList, mergedDeletedList);
    }

    return updated;
  } catch (e) {
    console.warn('Merge remote employees error:', e);
    return false;
  }
}

/**
 * Sinkronisasi Data KPI Karyawan ke Supabase
 * Mendukung tabel khusus public.cinema_employee_kpis sekaligus fallback ke cinema_sales
 */
export async function syncEmployeeKpisToSupabase(records?: EmployeeKpiRecord[]): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const list = records || StorageService.getEmployeeKpis();
    const nowIso = new Date().toISOString();
    let tableSuccess = false;

    if (list.length > 0) {
      const kpiRows = list.map((k) => ({
        id: k.id,
        employee_id: k.employeeId,
        month: k.month,
        score: k.score,
        notes: k.notes || '',
        graded_by: k.gradedBy || '',
        updated_at: nowIso,
      }));
      const { error: kpiTableErr } = await client
        .from('cinema_employee_kpis')
        .upsert(kpiRows, { onConflict: 'id' });
      if (!kpiTableErr) {
        tableSuccess = true;
      }
    }

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
    if (error && !tableSuccess) {
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
 * Ambil & Gabungkan Data KPI Karyawan dari Supabase ke Local Storage
 */
export async function mergeRemoteEmployeeKpisToLocal(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const localKpis = StorageService.getEmployeeKpis();
    let remoteKpis: EmployeeKpiRecord[] = [];

    // 1. Cek tabel khusus public.cinema_employee_kpis terlebih dahulu
    const { data: tableKpis, error: tableErr } = await client
      .from('cinema_employee_kpis')
      .select('*');

    if (!tableErr && Array.isArray(tableKpis)) {
      if (tableKpis.length === 0 && localKpis.length > 0) {
        await syncEmployeeKpisToSupabase(localKpis);
      } else {
        remoteKpis = tableKpis.map((r: any) => ({
          id: String(r.id),
          employeeId: String(r.employee_id),
          month: String(r.month),
          score: Number(r.score || 0),
          notes: String(r.notes || ''),
          gradedBy: String(r.graded_by || ''),
        }));
      }
    }

    // 2. Fallback ke backup row di cinema_sales jika tabel khusus belum berisi data
    if (remoteKpis.length === 0) {
      const { data, error } = await client
        .from('cinema_sales')
        .select('id, shows')
        .eq('id', '__SYSTEM_SYNC_EMPLOYEE_KPIS__')
        .maybeSingle();

      if (!error && data && Array.isArray(data.shows)) {
        remoteKpis = data.shows;
      }
    }

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
    const allLocal = StorageService.getCashierDailyPerformanceAll();
    await client.from('cinema_sales').upsert(
      {
        id: '__SYSTEM_SYNC_SDM_PERFORMANCE__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: allLocal,
        updated_at: new Date().toISOString(),
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
      .select('id, shows')
      .eq('id', '__SYSTEM_SYNC_SDM_PERFORMANCE__')
      .maybeSingle();

    if (error || !data || !Array.isArray(data.shows)) return false;

    const remoteList: CashierDailyPerformanceRecord[] = data.shows;
    const localList = StorageService.getCashierDailyPerformanceAll();

    if (remoteList.length === 0 && localList.length > 0) {
      await syncCashierPerformanceToSupabase(localList);
      return false;
    }

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
    const allLocal = StorageService.getCashierMonthlyProductsAll();
    await client.from('cinema_sales').upsert(
      {
        id: '__SYSTEM_SYNC_SDM_PRODUCTS__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: allLocal,
        updated_at: new Date().toISOString(),
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
      .select('id, shows')
      .eq('id', '__SYSTEM_SYNC_SDM_PRODUCTS__')
      .maybeSingle();

    if (error || !data || !Array.isArray(data.shows)) return false;

    const remoteList: CashierMonthlyProductRecord[] = data.shows;
    const localList = StorageService.getCashierMonthlyProductsAll();

    if (remoteList.length === 0 && localList.length > 0) {
      await syncCashierProductsToSupabase(localList);
      return false;
    }

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

export async function syncBakingSalesToSupabase(
  records?: BakingSaleRecord[]
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const localList = StorageService.getBakingSales();
    // Fetch current remote baking sales first so we never clobber another device's outlet/month
    const { data } = await client
      .from('cinema_sales')
      .select('id, shows')
      .eq('id', '__SYSTEM_SYNC_BAKING_SALES__')
      .maybeSingle();

    const remoteList: BakingSaleRecord[] =
      data && Array.isArray(data.shows) ? data.shows : [];

    const map = new Map<string, BakingSaleRecord>();
    const makeKey = (r: BakingSaleRecord) => `${r.outletId}_${r.year}_${r.month}`;

    remoteList.forEach((r) => {
      if (r && r.outletId && r.year && r.month) {
        map.set(makeKey(r), r);
      }
    });

    const toMerge = records && records.length > 0 ? records : localList;
    toMerge.forEach((lr) => {
      if (!lr || !lr.outletId || !lr.year || !lr.month) return;
      const key = makeKey(lr);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, lr);
      } else {
        // Merge dailySales per day and product
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
          updatedAt: lr.updatedAt || new Date().toISOString(),
        });
      }
    });

    const finalArray = Array.from(map.values());
    const { error } = await client.from('cinema_sales').upsert(
      {
        id: '__SYSTEM_SYNC_BAKING_SALES__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: finalArray,
        updated_at: new Date().toISOString(),
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
      .select('id, shows')
      .eq('id', '__SYSTEM_SYNC_BAKING_SALES__')
      .maybeSingle();

    if (error || !data || !Array.isArray(data.shows)) {
      const localList = StorageService.getBakingSales();
      if (localList.length > 0) {
        await syncBakingSalesToSupabase(localList);
      }
      return false;
    }

    const remoteList: BakingSaleRecord[] = data.shows;
    const localList = StorageService.getBakingSales();

    if (remoteList.length === 0 && localList.length > 0) {
      await syncBakingSalesToSupabase(localList);
      return false;
    }

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
    const allLocal = StorageService.getDailySectionSalesAll();
    await client.from('cinema_sales').upsert(
      {
        id: '__SYSTEM_SYNC_DAILY_SECTION__',
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: allLocal,
        updated_at: new Date().toISOString(),
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
      .select('id, shows')
      .eq('id', '__SYSTEM_SYNC_DAILY_SECTION__')
      .maybeSingle();

    if (error || !data || !Array.isArray(data.shows)) return false;

    const remoteList: DailySectionSalesRecord[] = data.shows;
    const localList = StorageService.getDailySectionSalesAll();

    if (remoteList.length === 0 && localList.length > 0) {
      await syncDailySectionSalesToSupabase(localList);
      return false;
    }

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
  mergeRemoteBakingSalesToLocal();
  mergeRemoteOccupancyToLocal();
  mergeRemoteInspectionsToLocal();
  mergeRemoteEmployeesToLocal();
  mergeRemoteEmployeeKpisToLocal();
  mergeRemoteCashierPerformanceToLocal();
  mergeRemoteCashierProductsToLocal();
  mergeRemoteDailySectionSalesToLocal();
  mergeRemoteConfigToLocal();

  // Setup Supabase Realtime channel subscription
  try {
    const channel = client
      .channel('cinema_xxi_realtime_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cinema_sales' },
        (payload: any) => {
          if (payload.new && payload.new.id) {
            const rowId = String(payload.new.id);
            const rowOutlet = String(payload.new.outlet_id || '');

            // Tangani sinkronisasi real-time untuk Data Karyawan, KPI, Baking, & Performance SDM
            if (
              rowId === '__SYSTEM_SYNC_EMPLOYEES__' ||
              rowId === '__SYSTEM_SYNC_DELETED_EMPLOYEES__'
            ) {
              mergeRemoteEmployeesToLocal();
              return;
            }
            if (rowId === '__SYSTEM_SYNC_EMPLOYEE_KPIS__') {
              mergeRemoteEmployeeKpisToLocal();
              return;
            }
            if (rowId === '__SYSTEM_SYNC_BAKING_SALES__') {
              mergeRemoteBakingSalesToLocal();
              return;
            }
            if (rowId === '__SYSTEM_SYNC_SDM_PERFORMANCE__') {
              mergeRemoteCashierPerformanceToLocal();
              return;
            }
            if (rowId === '__SYSTEM_SYNC_SDM_PRODUCTS__') {
              mergeRemoteCashierProductsToLocal();
              return;
            }
            if (rowId === '__SYSTEM_SYNC_DAILY_SECTION__') {
              mergeRemoteDailySectionSalesToLocal();
              return;
            }
            if (rowId.startsWith('__SYSTEM_SYNC_') || rowOutlet.startsWith('__SYSTEM_SYNC_')) {
              return;
            }

            if (payload.new.outlet_id && payload.new.date) {
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cinema_employees' },
        () => {
          mergeRemoteEmployeesToLocal();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cinema_employee_kpis' },
        () => {
          mergeRemoteEmployeeKpisToLocal();
        }
      )
      .subscribe();

    // Lightweight 5-second polling fallback in case Realtime WebSockets are restricted
    const intervalId = setInterval(() => {
      mergeRemoteSalesToLocal();
      mergeRemoteBakingSalesToLocal();
      mergeRemoteOccupancyToLocal();
      mergeRemoteInspectionsToLocal();
      mergeRemoteEmployeesToLocal();
      mergeRemoteEmployeeKpisToLocal();
      mergeRemoteCashierPerformanceToLocal();
      mergeRemoteCashierProductsToLocal();
      mergeRemoteDailySectionSalesToLocal();
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
      mergeRemoteBakingSalesToLocal();
      mergeRemoteOccupancyToLocal();
      mergeRemoteInspectionsToLocal();
      mergeRemoteEmployeesToLocal();
      mergeRemoteEmployeeKpisToLocal();
      mergeRemoteCashierPerformanceToLocal();
      mergeRemoteCashierProductsToLocal();
      mergeRemoteDailySectionSalesToLocal();
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
  employeeCount?: number;
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

    const bakingSales = StorageService.getBakingSales();
    if (bakingSales.length > 0) {
      await syncBakingSalesToSupabase(bakingSales);
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

    // Ambil dan upload Data Karyawan & KPI Karyawan & SDM
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
