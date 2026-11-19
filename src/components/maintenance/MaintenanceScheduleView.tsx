import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Plus,
  X,
  Trash2,
  Save,
  Droplets,
  Filter,
  Clock,
  Info,
  FileText,
  Flame,
  MapPin,
  Download,
  ArrowUpDown,
  Pencil,
} from 'lucide-react';
import * as XLSXStyleModule from 'xlsx-js-style';
import {
  User,
  Outlet,
  MaintenanceCategory,
  CarpetAreaEntry,
  AparUnitEntry,
  MaintenanceMonthEntry,
  MaintenanceScheduleRecord,
} from '../../types';
import { StorageService } from '../../lib/storage';
import { APAR_EXTRA_OUTLETS } from '../../lib/data/aparExtraOutlets';
import {
  BeritaAcaraModal,
  BeritaAcaraMode,
  BeritaAcaraStatusInfo,
} from './BeritaAcaraModal';

interface MaintenanceScheduleViewProps {
  currentUser: User;
  activeMenu: string;
}

const MONTH_LABELS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MEI',
  'JUN',
  'JUL',
  'AGU',
  'SEP',
  'OKT',
  'NOV',
  'DES',
];

const MONTH_FULL_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function formatOutletDisplayName(
  outlet: Outlet,
  category?: MaintenanceCategory
): string {
  const raw = (outlet.name || '').trim().toUpperCase();
  if (outlet.id === 'btm-xxi' || raw === 'CAFE BTM XXI') {
    return category === 'apar' ? 'BTM XXI BOGOR' : 'DELUXE BTM XXI BOGOR';
  }
  if (raw.startsWith('CAFE ')) {
    const cleanName = raw.replace(/^CAFE\s+/i, '');
    return category === 'apar' ? cleanName : `DELUXE ${cleanName}`;
  }
  if (category === 'apar' && raw.startsWith('DELUXE ')) {
    return raw.replace(/^DELUXE\s+/i, '');
  }
  return raw;
}

function isExcludedFromApar(outlet: Outlet): boolean {
  const upperName = (outlet.name || '').trim().toUpperCase();
  const lowerId = (outlet.id || '').trim().toLowerCase();
  const isHs =
    /^HS\b/.test(upperName) ||
    /\bHS\b/.test(upperName) ||
    lowerId.startsWith('hs-');
  const isPremiere =
    /^(?:THE\s+)?PREMIERE\b/.test(upperName) ||
    /\bPREMIERE\b/.test(upperName) ||
    lowerId.startsWith('premiere-');
  return isHs || isPremiere;
}

function getOutletClass(outlet: Outlet): 'A' | 'B' | 'C' {
  const cls = (outlet.class || '').trim().toUpperCase();
  if (cls === 'A' || cls === 'B' || cls === 'C') return cls;
  return 'C';
}

function getOutletTotalChairs(outlet: Outlet): number {
  if (!Array.isArray(outlet.studios) || outlet.studios.length === 0) return 0;
  return outlet.studios.reduce((sum, s) => sum + (Number(s.capacity) || 0), 0);
}

function getSopDays(category: MaintenanceCategory, outletClass: 'A' | 'B' | 'C'): number {
  switch (category) {
    case 'kursi_studio':
      if (outletClass === 'A') return 90; // 3 Bulan
      if (outletClass === 'B') return 105; // 3.5 Bulan
      return 120; // 4 Bulan (Kelas C)
    case 'karpet':
      if (outletClass === 'A') return 180; // 6 Bulan
      if (outletClass === 'B') return 210; // 7 Bulan
      return 240; // 8 Bulan (Kelas C)
    case 'filter_fluux':
      return 180; // 6 Bulan
    case 'filter_sediment':
      return 30; // 1 Bulan
    case 'lampu_uv':
      return 365; // 1 Tahun
    case 'apar':
      return 365; // Standar service/isi ulang berkala APAR 1 Tahun (Exp dapat disesuaikan manual)
  }
}

function getAlarmThresholdDays(category: MaintenanceCategory): number {
  if (category === 'filter_sediment') return 7; // Alarm 7 hari sebelum expired (siklus 30 hari)
  if (category === 'lampu_uv') return 21; // Alarm 21 hari sebelum expired (siklus 365 hari)
  if (category === 'apar') return 30; // Alarm 30 hari sebelum Exp APAR agar pengisian/service sempat diproses
  return 14; // Alarm 14 hari sebelum expired
}

function addDaysToDateString(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function diffDaysBetween(fromDateStr: string, toDateStr: string): number {
  const p1 = fromDateStr.split('-').map(Number);
  const p2 = toDateStr.split('-').map(Number);
  if (p1.length !== 3 || p2.length !== 3) return 0;
  const d1 = new Date(p1[0], p1[1] - 1, p1[2]).getTime();
  const d2 = new Date(p2[0], p2[1] - 1, p2[2]).getTime();
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

export type SopStatusType = 'safe' | 'warning' | 'overdue' | 'empty';

interface ComputedOutletMaintenanceStatus {
  status: SopStatusType;
  lastDate: string | null;
  expDate: string | null;
  sopDays: number;
  daysRemaining: number; // positif = sisa hari, negatif = lewat hari
  daysElapsed: number;
  latestMonthEntry: MaintenanceMonthEntry | null;
  latestRecordYear?: number;
  latestRecordMonth?: number;
}

function computeOutletCategoryStatus(
  outlet: Outlet,
  outletClass: 'A' | 'B' | 'C',
  category: MaintenanceCategory,
  records: MaintenanceScheduleRecord[],
  todayStr: string
): ComputedOutletMaintenanceStatus {
  const sopDays = getSopDays(category, outletClass);
  const threshold = getAlarmThresholdDays(category);

  const allCategoryRecords = records.filter(
    (r) => r.outletId === outlet.id && r.category === category
  );

  let latestEntry: MaintenanceMonthEntry | null = null;
  let latestRecordYear: number | undefined;
  let latestRecordMonth: number | undefined;

  allCategoryRecords.forEach((rec) => {
    Object.entries(rec.months || {}).forEach(([monthKey, entry]) => {
      if (!entry) return;
      const monthNum = Number(monthKey);
      const compareKey =
        category === 'apar'
          ? entry.customExpiryDate?.trim() || entry.date || ''
          : entry.date || '';
      const latestKey = latestEntry
        ? category === 'apar'
          ? latestEntry.customExpiryDate?.trim() || latestEntry.date || ''
          : latestEntry.date || ''
        : '';
      if (compareKey && (!latestEntry || compareKey >= latestKey)) {
        latestEntry = entry;
        latestRecordYear = rec.year;
        latestRecordMonth = !isNaN(monthNum) && monthNum >= 1 && monthNum <= 12 ? monthNum : 1;
      }
    });
  });

  if (!latestEntry) {
    return {
      status: 'empty',
      lastDate: null,
      expDate: null,
      sopDays,
      daysRemaining: 0,
      daysElapsed: 0,
      latestMonthEntry: null,
    };
  }

  const validEntry = latestEntry as MaintenanceMonthEntry;
  const lastDate = validEntry.date || null;
  const expDate =
    category === 'apar'
      ? validEntry.customExpiryDate?.trim() || null
      : validEntry.customExpiryDate && validEntry.customExpiryDate.trim()
      ? validEntry.customExpiryDate.trim()
      : lastDate
      ? addDaysToDateString(lastDate, sopDays)
      : null;

  if (!expDate) {
    return {
      status: 'empty',
      lastDate,
      expDate: null,
      sopDays,
      daysRemaining: 0,
      daysElapsed: 0,
      latestMonthEntry: validEntry,
      latestRecordYear,
      latestRecordMonth,
    };
  }

  const daysRemaining = diffDaysBetween(todayStr, expDate);
  const daysElapsed = lastDate ? diffDaysBetween(lastDate, todayStr) : 0;

  let status: SopStatusType = 'safe';
  if (daysRemaining < 0) {
    status = 'overdue';
  } else if (daysRemaining <= threshold) {
    status = 'warning';
  }

  return {
    status,
    lastDate,
    expDate,
    sopDays,
    daysRemaining,
    daysElapsed,
    latestMonthEntry: validEntry,
    latestRecordYear,
    latestRecordMonth,
  };
}

function formatIsoToIndoDate(iso?: string | null): string {
  if (!iso) return '-';
  const parts = iso.trim().split('-');
  if (parts.length !== 3) return iso.trim();
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export const MaintenanceScheduleView: React.FC<MaintenanceScheduleViewProps> = ({
  currentUser,
  activeMenu,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [filterAirTab, setFilterAirTab] = useState<'filter_fluux' | 'filter_sediment'>('filter_fluux');
  const [aparAreaFilter, setAparAreaFilter] = useState<
    'all' | 'area-bogor-1-depok' | 'area-bogor-2' | 'unassigned'
  >('all');
  const [aparSortMode, setAparSortMode] = useState<'name' | 'exp_asc'>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<SopStatusType | 'all'>('all');

  const [outlets, setOutlets] = useState<Outlet[]>(() => StorageService.getOutlets());
  const [records, setRecords] = useState<MaintenanceScheduleRecord[]>(() =>
    StorageService.getMaintenanceRecords()
  );

  // Modal Input/Edit Bulan atau APAR
  const [activeCellModal, setActiveCellModal] = useState<{
    outlet: Outlet;
    displayName: string;
    outletClass: 'A' | 'B' | 'C';
    month: number; // 1..12
    sourceYear?: number;
    existingEntry: MaintenanceMonthEntry | null;
  } | null>(null);

  const [formDate, setFormDate] = useState('');
  const [formQty, setFormQty] = useState('');
  const [selectedStudios, setSelectedStudios] = useState<string[]>([]);
  const [carpetAreas, setCarpetAreas] = useState<CarpetAreaEntry[]>([]);
  const [formAparBrand, setFormAparBrand] = useState('');
  const [aparUnits, setAparUnits] = useState<AparUnitEntry[]>([]);
  const [formExpDate, setFormExpDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Modal Input/Edit Keterangan
  const [activeKeteranganModal, setActiveKeteranganModal] = useState<{
    outlet: Outlet;
    displayName: string;
    currentKeterangan: string;
  } | null>(null);
  const [keteranganText, setKeteranganText] = useState('');

  // Modal Input Massal Khusus APAR
  const [showBulkAparModal, setShowBulkAparModal] = useState(false);
  const [bulkAparSearch, setBulkAparSearch] = useState('');
  const [bulkAparRows, setBulkAparRows] = useState<
    Array<{
      outletId: string;
      displayName: string;
      outletClass: 'A' | 'B' | 'C';
      qty: string;
      expDate: string;
      brand: string;
    }>
  >([]);

  // Modal Pilihan Jenis Berita Acara (Tunggal vs Gabungan Karpet & Kursi)
  const [beritaAcaraChooser, setBeritaAcaraChooser] = useState<{
    outlet: Outlet;
    displayName: string;
    carpetStatus: BeritaAcaraStatusInfo;
    chairStatus: BeritaAcaraStatusInfo;
  } | null>(null);

  // Modal Berita Acara Pengajuan Pencucian (Karpet / Kursi Studio / Gabungan)
  const [beritaAcaraTarget, setBeritaAcaraTarget] = useState<{
    outlet: Outlet;
    displayName: string;
    computedStatus: BeritaAcaraStatusInfo;
    carpetStatus: BeritaAcaraStatusInfo;
    chairStatus: BeritaAcaraStatusInfo;
    initialMode: BeritaAcaraMode;
  } | null>(null);

  // Determine active category from activeMenu & sub-tab
  const activeCategory: MaintenanceCategory = useMemo(() => {
    if (activeMenu === 'maintenance_kursi') return 'kursi_studio';
    if (activeMenu === 'maintenance_karpet') return 'karpet';
    if (activeMenu === 'maintenance_filter_air') return filterAirTab;
    if (activeMenu === 'maintenance_lampu_uv') return 'lampu_uv';
    if (activeMenu === 'maintenance_apar') return 'apar';
    return 'kursi_studio';
  }, [activeMenu, filterAirTab]);

  // Reset pagination & status filter when switching submenu/category
  useEffect(() => {
    setCurrentPage(1);
    setStatusFilter('all');
  }, [activeCategory, selectedYear, searchQuery, pageSize, aparAreaFilter, aparSortMode]);

  // Sync listener
  useEffect(() => {
    const refreshData = () => {
      setOutlets(StorageService.getOutlets());
      setRecords(StorageService.getMaintenanceRecords());
    };
    window.addEventListener('cinema-xxi-storage-update', refreshData);
    window.addEventListener('storage', refreshData);
    return () => {
      window.removeEventListener('cinema-xxi-storage-update', refreshData);
      window.removeEventListener('storage', refreshData);
    };
  }, []);

  // Category Metadata (Title, Subtitle, Action Text, Unit Icon)
  const categoryMeta = useMemo(() => {
    switch (activeCategory) {
      case 'kursi_studio':
        return {
          title: `Kalender Pemeliharaan Kursi Studio - ${selectedYear}`,
          subtitle:
            'Ketuk pada kolom bulan untuk mencatat tanggal pencucian kursi studio Deluxe/Premiere. Siklus SOP Kelas A: 3 Bulan (90 hari), Kelas B: 3.5 Bulan (105 hari), Kelas C: 4 Bulan (120 hari).',
          actionOverdue: 'PERLU CUCI!',
          actionWarning: 'SEGERA CUCI!',
          unitIcon: '💺',
          qtyLabel: 'Jumlah Kursi Studio Dicuci',
          qtyPlaceholder: 'Contoh: 1420',
          isWashType: true,
        };
      case 'karpet':
        return {
          title: `Kalender Pemeliharaan Karpet - ${selectedYear}`,
          subtitle:
            'Ketuk pada kolom bulan untuk mencatat tanggal pencucian karpet studio/lobby/koridor. Siklus SOP Kelas A: 6 Bulan (180 hari), Kelas B: 7 Bulan (210 hari), Kelas C: 8 Bulan (240 hari).',
          actionOverdue: 'PERLU CUCI!',
          actionWarning: 'SEGERA CUCI!',
          unitIcon: '🧹',
          qtyLabel: 'Total Luas Karpet Dicuci (m²)',
          qtyPlaceholder: 'Contoh: 350',
          isWashType: true,
        };
      case 'filter_fluux':
        return {
          title: `Kalender Pergantian Filter Air (Fluux 21) - ${selectedYear}`,
          subtitle:
            'Ketuk pada kolom bulan untuk mencatat pergantian filter Fluux 21. Masa pakai filter ini mengikuti tanggal expired (SOP standar: 6 bulan / 180 hari).',
          actionOverdue: 'PERLU GANTI!',
          actionWarning: 'SEGERA GANTI!',
          unitIcon: '💧',
          qtyLabel: 'Jumlah Unit Filter Fluux 21 (Opsional)',
          qtyPlaceholder: 'Contoh: 2',
          isWashType: false,
        };
      case 'filter_sediment':
        return {
          title: `Kalender Pergantian Filter Air (Sediment Filter) - ${selectedYear}`,
          subtitle:
            'Ketuk pada kolom bulan untuk mencatat pergantian Sediment Filter. Masa pakai filter ini mengikuti tanggal expired (SOP standar: 1 bulan / 30 hari).',
          actionOverdue: 'PERLU GANTI!',
          actionWarning: 'SEGERA GANTI!',
          unitIcon: '🚰',
          qtyLabel: 'Jumlah Unit Sediment Filter (Opsional)',
          qtyPlaceholder: 'Contoh: 4',
          isWashType: false,
        };
      case 'lampu_uv':
        return {
          title: `Kalender Pergantian Lampu UV - ${selectedYear}`,
          subtitle:
            'Ketuk pada kolom bulan untuk mencatat pergantian Lampu UV. Masa pakai standar lampu ini mengikuti SOP pergantian berkala 1 tahun (365 hari).',
          actionOverdue: 'PERLU GANTI!',
          actionWarning: 'SEGERA GANTI!',
          unitIcon: '💡',
          qtyLabel: 'Jumlah Unit Lampu UV (Opsional)',
          qtyPlaceholder: 'Contoh: 2',
          isWashType: false,
        };
      case 'apar':
        return {
          title: 'Daftar Masa Berlaku (Exp) APAR Outlet',
          subtitle:
            'Monitoring seluruh data Jumlah Tabung, Merk APAR, dan Tanggal Expired lintas tahun dalam satu tabel. Status aman & alarm H-30 dihitung langsung dari sisa hari menuju Tanggal Exp terhitung dari hari ini.',
          actionOverdue: 'APAR EXPIRED!',
          actionWarning: 'SEGERA EXP!',
          unitIcon: '🧯',
          qtyLabel: 'Jumlah APAR (Tabung)',
          qtyPlaceholder: 'Contoh: 12',
          isWashType: false,
        };
    }
  }, [activeCategory, selectedYear]);

  // Base outlets permitted by role (includes APAR_EXTRA_OUTLETS ONLY when activeCategory === 'apar')
  const roleAllowedOutlets = useMemo(() => {
    const sourceOutlets: Outlet[] = [...outlets];
    if (activeCategory === 'apar') {
      const existingNormalizedNames = new Set(
        outlets.map((o) => formatOutletDisplayName(o, 'apar'))
      );
      APAR_EXTRA_OUTLETS.forEach((extra) => {
        if (!existingNormalizedNames.has(extra.name.trim().toUpperCase())) {
          sourceOutlets.push(extra);
        }
      });
    }

    return sourceOutlets.filter((o) => {
      if (activeCategory === 'apar' && isExcludedFromApar(o)) {
        return false;
      }
      const roleStr = String(currentUser.role);
      if ((roleStr === 'outlet' || roleStr === 'outlet_manager') && currentUser.outletId) {
        return o.id === currentUser.outletId;
      }
      if ((roleStr === 'area' || roleStr === 'area_manager') && currentUser.areaId) {
        return o.areaId === currentUser.areaId;
      }
      return true;
    });
  }, [outlets, currentUser, activeCategory]);

  // Counts per Area for APAR Area Filter dropdown
  const aparAreaCounts = useMemo(() => {
    if (activeCategory !== 'apar') {
      return { all: 0, bogor1: 0, bogor2: 0, unassigned: 0 };
    }
    let bogor1 = 0;
    let bogor2 = 0;
    let unassigned = 0;
    roleAllowedOutlets.forEach((o) => {
      if (o.areaId === 'area-bogor-1-depok') bogor1 += 1;
      else if (o.areaId === 'area-bogor-2') bogor2 += 1;
      else unassigned += 1;
    });
    return {
      all: roleAllowedOutlets.length,
      bogor1,
      bogor2,
      unassigned,
    };
  }, [roleAllowedOutlets, activeCategory]);

  // Filter outlets by user role + APAR area filter, then sort alphabetically by displayName
  const visibleOutlets = useMemo(() => {
    const list = roleAllowedOutlets.filter((o) => {
      if (activeCategory === 'apar') {
        if (aparAreaFilter === 'area-bogor-1-depok') {
          return o.areaId === 'area-bogor-1-depok';
        }
        if (aparAreaFilter === 'area-bogor-2') {
          return o.areaId === 'area-bogor-2';
        }
        if (aparAreaFilter === 'unassigned') {
          return (
            o.areaId !== 'area-bogor-1-depok' && o.areaId !== 'area-bogor-2'
          );
        }
      }
      return true;
    });

    return list
      .map((outlet) => ({
        outlet,
        displayName: formatOutletDisplayName(outlet, activeCategory),
        outletClass: getOutletClass(outlet),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [roleAllowedOutlets, activeCategory, aparAreaFilter]);

  // Compute status & monthly schedule per outlet
  const todayStr = getTodayDateStr();

  const outletRows = useMemo(() => {
    return visibleOutlets.map(({ outlet, displayName, outletClass }) => {
      // Current year record
      const currentYearRec = records.find(
        (r) =>
          r.outletId === outlet.id &&
          r.category === activeCategory &&
          r.year === selectedYear
      ) || {
        id: `${outlet.id}_${activeCategory}_${selectedYear}`,
        outletId: outlet.id,
        category: activeCategory,
        year: selectedYear,
        months: {},
        keterangan: '',
      };

      const computedStatus = computeOutletCategoryStatus(
        outlet,
        outletClass,
        activeCategory,
        records,
        todayStr
      );

      return {
        outlet,
        displayName,
        outletClass,
        yearRecord: currentYearRec,
        computedStatus,
      };
    });
  }, [visibleOutlets, records, activeCategory, selectedYear, todayStr]);

  const handleRequestBeritaAcara = (
    outlet: Outlet,
    displayName: string,
    outletClass: 'A' | 'B' | 'C'
  ) => {
    const carpetStatus = computeOutletCategoryStatus(
      outlet,
      outletClass,
      'karpet',
      records,
      todayStr
    );
    const chairStatus = computeOutletCategoryStatus(
      outlet,
      outletClass,
      'kursi_studio',
      records,
      todayStr
    );
    setBeritaAcaraChooser({
      outlet,
      displayName,
      carpetStatus,
      chairStatus,
    });
  };

  // Summary counts for alarm banner & legend badges
  const statusCounts = useMemo(() => {
    const counts = { safe: 0, warning: 0, overdue: 0, empty: 0 };
    outletRows.forEach((r) => {
      counts[r.computedStatus.status] += 1;
    });
    return counts;
  }, [outletRows]);

  // Filter Air sub-tab alarm counts (so user can see alarms on both Fluux 21 and Sediment Filter tabs)
  const filterAirTabAlarmCounts = useMemo(() => {
    if (activeMenu !== 'maintenance_filter_air') return { fluux: 0, sediment: 0 };
    const computeCountForCat = (cat: 'filter_fluux' | 'filter_sediment') => {
      const thresh = getAlarmThresholdDays(cat);
      let count = 0;
      visibleOutlets.forEach(({ outlet, outletClass }) => {
        const sop = getSopDays(cat, outletClass);
        const catRecs = records.filter((r) => r.outletId === outlet.id && r.category === cat);
        let latest: MaintenanceMonthEntry | null = null;
        catRecs.forEach((rec) => {
          Object.values(rec.months || {}).forEach((e) => {
            if (e && e.date && (!latest || e.date >= latest.date)) {
              latest = e;
            }
          });
        });
        if (latest && (latest as MaintenanceMonthEntry).date) {
          const valid = latest as MaintenanceMonthEntry;
          const exp =
            valid.customExpiryDate && valid.customExpiryDate.trim()
              ? valid.customExpiryDate.trim()
              : addDaysToDateString(valid.date, sop);
          const rem = diffDaysBetween(todayStr, exp);
          if (rem <= thresh) count += 1;
        }
      });
      return count;
    };
    return {
      fluux: computeCountForCat('filter_fluux'),
      sediment: computeCountForCat('filter_sediment'),
    };
  }, [activeMenu, visibleOutlets, records, todayStr]);

  // Apply search, status filter & APAR sorting
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = outletRows.filter((row) => {
      if (statusFilter !== 'all' && row.computedStatus.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        row.displayName.toLowerCase().includes(q) ||
        row.outlet.name.toLowerCase().includes(q) ||
        row.outletClass.toLowerCase() === q
      );
    });

    if (activeCategory === 'apar' && aparSortMode === 'exp_asc') {
      return [...list].sort((a, b) => {
        const expA = a.computedStatus.expDate;
        const expB = b.computedStatus.expDate;
        if (expA && expB) {
          const cmp = expA.localeCompare(expB);
          if (cmp !== 0) return cmp;
          return a.displayName.localeCompare(b.displayName);
        }
        if (expA && !expB) return -1;
        if (!expA && expB) return 1;
        return a.displayName.localeCompare(b.displayName);
      });
    }

    return list;
  }, [outletRows, searchQuery, statusFilter, activeCategory, aparSortMode]);

  // Pagination
  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + pageSize);

  // Helper to infer checked studios for existing entries
  const resolveInitialSelectedStudios = (
    outlet: Outlet,
    existingEntry: MaintenanceMonthEntry | null
  ): string[] => {
    const studios = outlet.studios || [];
    if (studios.length === 0) return [];
    if (existingEntry && Array.isArray(existingEntry.selectedStudios)) {
      return existingEntry.selectedStudios.filter((name) =>
        studios.some((s) => s.name === name)
      );
    }
    if (existingEntry && existingEntry.quantity && existingEntry.quantity > 0) {
      const target = existingEntry.quantity;
      const totalAll = getOutletTotalChairs(outlet);
      if (target === totalAll) {
        return studios.map((s) => s.name);
      }
      // Try finding exact subset sum match for legacy entries without selectedStudios
      let matched: string[] | null = null;
      const n = studios.length;
      const dfs = (idx: number, currentSum: number, chosen: string[]) => {
        if (matched) return;
        if (currentSum === target) {
          matched = [...chosen];
          return;
        }
        if (idx >= n || currentSum > target) return;
        dfs(idx + 1, currentSum + (Number(studios[idx].capacity) || 0), [
          ...chosen,
          studios[idx].name,
        ]);
        dfs(idx + 1, currentSum, chosen);
      };
      dfs(0, 0, []);
      if (matched) return matched;
    }
    return [];
  };

  const buildDefaultCarpetAreasForOutlet = (outlet: Outlet): CarpetAreaEntry[] => {
    const studios = Array.isArray(outlet.studios) ? outlet.studios : [];
    const studioRows: CarpetAreaEntry[] =
      studios.length > 0
        ? studios.map((s, idx) => {
            const cleanName = (s.name || `Studio ${idx + 1}`).trim();
            return {
              id: `karpet_studio_${idx + 1}_${cleanName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')}`,
              name: /^karpet\s+/i.test(cleanName) ? cleanName : `Karpet ${cleanName}`,
              checked: false,
              areaSqm: 0,
              isCustom: false,
            };
          })
        : [
            {
              id: 'karpet_studio',
              name: 'Karpet Studio',
              checked: false,
              areaSqm: 0,
              isCustom: false,
            },
          ];

    return [
      ...studioRows,
      { id: 'karpet_lobi', name: 'Karpet Lobi', checked: false, areaSqm: 0, isCustom: false },
      { id: 'karpet_koridor', name: 'Karpet Koridor', checked: false, areaSqm: 0, isCustom: false },
    ];
  };

  const resolveInitialCarpetAreas = (
    outlet: Outlet,
    existingEntry: MaintenanceMonthEntry | null
  ): CarpetAreaEntry[] => {
    const defaultAreas = buildDefaultCarpetAreasForOutlet(outlet);
    const studios = Array.isArray(outlet.studios) ? outlet.studios : [];

    if (existingEntry && Array.isArray(existingEntry.carpetAreas)) {
      const saved = existingEntry.carpetAreas.map((c, idx) => ({
        id: c.id || `carpet_${idx}_${Math.random().toString(36).slice(2, 7)}`,
        name: c.name || '',
        checked: Boolean(c.checked),
        areaSqm: Number(c.areaSqm) || 0,
        isCustom: Boolean(c.isCustom),
      }));

      // Migrasi halus jika data lama hanya punya placeholder "Karpet Studio" belum terisi dan belum ada rincian per-studio
      const hasPerStudioAlready = saved.some((c) => /studio\s*\d+/i.test(c.name || ''));
      const genericIdx = saved.findIndex(
        (c) => c.id === 'karpet_studio' && !c.checked && (!c.areaSqm || c.areaSqm <= 0)
      );

      if (studios.length > 0 && !hasPerStudioAlready && genericIdx !== -1) {
        const perStudioDefaults = defaultAreas.filter((d) =>
          d.id.startsWith('karpet_studio_')
        );
        const before = saved.slice(0, genericIdx);
        const after = saved.slice(genericIdx + 1);
        return [...before, ...perStudioDefaults, ...after];
      }

      return saved;
    }

    if (existingEntry && existingEntry.quantity && existingEntry.quantity > 0) {
      return defaultAreas.map((std, idx) =>
        idx === 0
          ? { ...std, checked: true, areaSqm: Number(existingEntry.quantity) || 0 }
          : std
      );
    }

    return defaultAreas;
  };

  // Open cell / direct APAR modal
  const handleOpenCellModal = (
    outlet: Outlet,
    displayName: string,
    outletClass: 'A' | 'B' | 'C',
    month: number,
    existingEntry: MaintenanceMonthEntry | null,
    sourceYear?: number
  ) => {
    const resolvedSourceYear = sourceYear ?? selectedYear;
    const sopDays = getSopDays(activeCategory, outletClass);
    const defaultMonthStr = String(month).padStart(2, '0');
    const defaultDate =
      existingEntry?.date || `${resolvedSourceYear}-${defaultMonthStr}-01`;
    const defaultExp =
      activeCategory === 'apar'
        ? existingEntry?.customExpiryDate || ''
        : existingEntry?.customExpiryDate || addDaysToDateString(defaultDate, sopDays);

    setFormDate(defaultDate);

    if (activeCategory === 'kursi_studio') {
      const initStudios = resolveInitialSelectedStudios(outlet, existingEntry);
      setSelectedStudios(initStudios);
      setCarpetAreas([]);
      const studioList = outlet.studios || [];
      const sumSelected = studioList
        .filter((s) => initStudios.includes(s.name))
        .reduce((acc, s) => acc + (Number(s.capacity) || 0), 0);

      if (initStudios.length > 0) {
        setFormQty(String(sumSelected));
      } else if (existingEntry?.quantity !== undefined && existingEntry.quantity > 0) {
        setFormQty(String(existingEntry.quantity));
      } else {
        setFormQty('0');
      }
    } else if (activeCategory === 'karpet') {
      setSelectedStudios([]);
      const initCarpet = resolveInitialCarpetAreas(outlet, existingEntry);
      setCarpetAreas(initCarpet);
      const totalSqm = initCarpet
        .filter((c) => c.checked)
        .reduce((sum, c) => sum + (Number(c.areaSqm) || 0), 0);
      setFormQty(String(Math.round(totalSqm * 100) / 100));
    } else if (activeCategory === 'apar') {
      setSelectedStudios([]);
      setCarpetAreas([]);
      const savedUnits = Array.isArray(existingEntry?.aparUnits)
        ? existingEntry.aparUnits.map((u, idx) => ({
            id: u.id || `apar_${idx}_${Math.random().toString(36).slice(2, 6)}`,
            brand: u.brand || '',
            mediaType: u.mediaType || 'ABC Powder',
            location: u.location || '',
            qty: Number(u.qty) || 0,
          }))
        : [];
      setAparUnits(savedUnits);
      setFormAparBrand(existingEntry?.aparBrand || '');
      const sumUnits = savedUnits.reduce((acc, u) => acc + (Number(u.qty) || 0), 0);
      if (savedUnits.length > 0 && sumUnits > 0) {
        setFormQty(String(sumUnits));
      } else {
        setFormQty(
          existingEntry?.quantity !== undefined && existingEntry.quantity > 0
            ? String(existingEntry.quantity)
            : ''
        );
      }
    } else {
      setSelectedStudios([]);
      setCarpetAreas([]);
      setAparUnits([]);
      setFormAparBrand('');
      setFormQty(
        existingEntry?.quantity !== undefined && existingEntry.quantity > 0
          ? String(existingEntry.quantity)
          : ''
      );
    }

    setFormExpDate(defaultExp);
    setFormNotes(existingEntry?.notes || '');
    setActiveCellModal({
      outlet,
      displayName,
      outletClass,
      month,
      sourceYear: resolvedSourceYear,
      existingEntry,
    });
  };

  const handleToggleStudio = (studioName: string) => {
    if (!activeCellModal) return;
    const studios = activeCellModal.outlet.studios || [];
    setSelectedStudios((prev) => {
      const exists = prev.includes(studioName);
      const next = exists
        ? prev.filter((name) => name !== studioName)
        : [...prev, studioName];
      const totalChairs = studios
        .filter((s) => next.includes(s.name))
        .reduce((sum, s) => sum + (Number(s.capacity) || 0), 0);
      setFormQty(String(totalChairs));
      return next;
    });
  };

  const handleToggleAllStudios = () => {
    if (!activeCellModal) return;
    const studios = activeCellModal.outlet.studios || [];
    if (selectedStudios.length === studios.length) {
      setSelectedStudios([]);
      setFormQty('0');
    } else {
      const allNames = studios.map((s) => s.name);
      const totalChairs = studios.reduce(
        (sum, s) => sum + (Number(s.capacity) || 0),
        0
      );
      setSelectedStudios(allNames);
      setFormQty(String(totalChairs));
    }
  };

  const syncCarpetAreasAndQty = (nextAreas: CarpetAreaEntry[]) => {
    setCarpetAreas(nextAreas);
    const totalSqm = nextAreas
      .filter((c) => c.checked)
      .reduce((sum, c) => sum + (Number(c.areaSqm) || 0), 0);
    const rounded = Math.round(totalSqm * 100) / 100;
    setFormQty(String(rounded));
  };

  const handleToggleCarpetArea = (id: string) => {
    const next = carpetAreas.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    syncCarpetAreasAndQty(next);
  };

  const handleChangeCarpetAreaSqm = (id: string, valStr: string) => {
    const num = valStr.trim() === '' ? 0 : Math.max(0, Number(valStr));
    const safeNum = isNaN(num) ? 0 : num;
    const next = carpetAreas.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        areaSqm: safeNum,
        checked: safeNum > 0 ? true : item.checked,
      };
    });
    syncCarpetAreasAndQty(next);
  };

  const handleChangeCarpetAreaName = (id: string, newName: string) => {
    setCarpetAreas((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: newName } : item))
    );
  };

  const handleAddCustomCarpetRoom = () => {
    const newRoom: CarpetAreaEntry = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: '',
      checked: true,
      areaSqm: 0,
      isCustom: true,
    };
    syncCarpetAreasAndQty([...carpetAreas, newRoom]);
  };

  const handleRemoveCarpetRoom = (id: string) => {
    const next = carpetAreas.filter((item) => item.id !== id);
    syncCarpetAreasAndQty(next);
  };

  const handleResetDefaultCarpetAreas = () => {
    if (!activeCellModal) return;
    const defaults = buildDefaultCarpetAreasForOutlet(activeCellModal.outlet);
    syncCarpetAreasAndQty(defaults);
  };

  const syncAparUnitsAndSummary = (nextUnits: AparUnitEntry[]) => {
    setAparUnits(nextUnits);
    if (nextUnits.length > 0) {
      const totalQty = nextUnits.reduce((sum, u) => sum + (Number(u.qty) || 0), 0);
      const uniqueBrands = Array.from(
        new Set(
          nextUnits
            .map((u) => u.brand.trim())
            .filter(Boolean)
        )
      );
      setFormQty(totalQty > 0 ? String(totalQty) : '');
      if (uniqueBrands.length > 0) {
        setFormAparBrand(uniqueBrands.join(' / '));
      }
    }
  };

  const handleAddAparUnitRow = () => {
    const next: AparUnitEntry[] = [
      ...aparUnits,
      {
        id: `apar_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        brand: formAparBrand.trim() || 'Servvo',
        mediaType: 'ABC Powder',
        location: '',
        qty: 1,
      },
    ];
    syncAparUnitsAndSummary(next);
  };

  const handleUpdateAparUnitRow = (
    id: string,
    patch: Partial<AparUnitEntry>
  ) => {
    const next = aparUnits.map((u) => (u.id === id ? { ...u, ...patch } : u));
    syncAparUnitsAndSummary(next);
  };

  const handleRemoveAparUnitRow = (id: string) => {
    const next = aparUnits.filter((u) => u.id !== id);
    syncAparUnitsAndSummary(next);
  };

  // Auto-update Expired Date when Execution Date changes in modal
  const handleFormDateChange = (newDate: string) => {
    setFormDate(newDate);
    if (activeCellModal && newDate) {
      const sopDays = getSopDays(activeCategory, activeCellModal.outletClass);
      setFormExpDate(addDaysToDateString(newDate, sopDays));
    }
  };

  const handleSaveCellEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCellModal) return;

    const cleanExpDate = formExpDate.trim();
    if (activeCategory === 'apar') {
      if (!cleanExpDate) return;
    } else if (!formDate) {
      return;
    }

    const effectiveEntryDate =
      activeCategory === 'apar' ? cleanExpDate : formDate;

    const cleanedAparUnits =
      activeCategory === 'apar' && aparUnits.length > 0
        ? aparUnits
            .filter((u) => u.brand.trim() || u.qty > 0)
            .map((u) => ({
              ...u,
              brand: u.brand.trim() || formAparBrand.trim() || 'APAR',
              mediaType: (u.mediaType || 'ABC Powder').trim(),
              location: (u.location || '').trim(),
              qty: Math.max(0, Number(u.qty) || 0),
            }))
        : undefined;

    const parsedQty = formQty.trim() ? Number(formQty.trim()) : undefined;
    const cleanedCarpetAreas =
      activeCategory === 'karpet'
        ? carpetAreas.map((c) => ({
            ...c,
            name: c.name.trim() || 'Ruangan Tambahan',
          }))
        : undefined;

    const entry: MaintenanceMonthEntry = {
      date: effectiveEntryDate,
      quantity: parsedQty && !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : undefined,
      aparBrand:
        activeCategory === 'apar' && formAparBrand.trim()
          ? formAparBrand.trim()
          : undefined,
      aparUnits:
        cleanedAparUnits && cleanedAparUnits.length > 0
          ? cleanedAparUnits
          : undefined,
      selectedStudios:
        activeCategory === 'kursi_studio' ? selectedStudios : undefined,
      carpetAreas: cleanedCarpetAreas,
      customExpiryDate: cleanExpDate || undefined,
      notes: formNotes.trim() || undefined,
      updatedBy: currentUser.name,
      updatedAt: new Date().toISOString(),
    };

    const originYear = activeCellModal.sourceYear ?? selectedYear;
    const targetYear =
      activeCategory === 'apar'
        ? Number(cleanExpDate.split('-')[0]) || originYear
        : selectedYear;
    const targetMonth =
      activeCategory === 'apar'
        ? Number(cleanExpDate.split('-')[1]) || activeCellModal.month
        : activeCellModal.month;

    if (
      activeCategory === 'apar' &&
      activeCellModal.existingEntry &&
      (targetYear !== originYear || targetMonth !== activeCellModal.month)
    ) {
      StorageService.saveMaintenanceMonthEntry(
        activeCellModal.outlet.id,
        activeCategory,
        originYear,
        activeCellModal.month,
        null
      );
    }

    const updated = StorageService.saveMaintenanceMonthEntry(
      activeCellModal.outlet.id,
      activeCategory,
      targetYear,
      targetMonth,
      entry
    );
    setRecords(updated);
    setActiveCellModal(null);
  };

  const handleDeleteCellEntry = () => {
    if (!activeCellModal) return;
    const originYear = activeCellModal.sourceYear ?? selectedYear;
    const updated = StorageService.saveMaintenanceMonthEntry(
      activeCellModal.outlet.id,
      activeCategory,
      originYear,
      activeCellModal.month,
      null
    );
    setRecords(updated);
    setActiveCellModal(null);
  };

  const handleOpenKeteranganModal = (
    outlet: Outlet,
    displayName: string,
    currentKeterangan: string
  ) => {
    setKeteranganText(currentKeterangan || '');
    setActiveKeteranganModal({ outlet, displayName, currentKeterangan });
  };

  const handleSaveKeterangan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeKeteranganModal) return;
    const updated = StorageService.saveMaintenanceKeterangan(
      activeKeteranganModal.outlet.id,
      activeCategory,
      selectedYear,
      keteranganText
    );
    setRecords(updated);
    setActiveKeteranganModal(null);
  };

  const handleOpenBulkAparModal = () => {
    const rows = outletRows.map((row) => {
      const latest = row.computedStatus.latestMonthEntry;
      return {
        outletId: row.outlet.id,
        displayName: row.displayName,
        outletClass: row.outletClass,
        qty: latest?.quantity && latest.quantity > 0 ? String(latest.quantity) : '',
        expDate: row.computedStatus.expDate || '',
        brand: latest?.aparBrand || '',
      };
    });
    setBulkAparRows(rows);
    setBulkAparSearch('');
    setShowBulkAparModal(true);
  };

  const handleUpdateBulkAparRow = (
    outletId: string,
    patch: Partial<{
      qty: string;
      expDate: string;
      brand: string;
    }>
  ) => {
    setBulkAparRows((prev) =>
      prev.map((row) => (row.outletId === outletId ? { ...row, ...patch } : row))
    );
  };

  const handleSaveBulkAparModal = (e: React.FormEvent) => {
    e.preventDefault();
    let latestRecords = records;

    bulkAparRows.forEach((row) => {
      const qtyNum = Number(row.qty);
      const hasQty = !isNaN(qtyNum) && qtyNum > 0;
      const cleanBrand = row.brand.trim();
      const cleanExp = row.expDate.trim();

      if (!hasQty && !cleanBrand && !cleanExp) {
        return;
      }

      const effectiveDate = cleanExp || `${selectedYear}-01-01`;
      const parts = effectiveDate.split('-').map(Number);
      const targetYear =
        parts.length === 3 && !isNaN(parts[0]) ? parts[0] : selectedYear;
      const targetMonth =
        parts.length === 3 && !isNaN(parts[1]) && parts[1] >= 1 && parts[1] <= 12
          ? parts[1]
          : 1;

      const existingOutletRow = outletRows.find((r) => r.outlet.id === row.outletId);
      const prevYear = existingOutletRow?.computedStatus.latestRecordYear;
      const prevMonth = existingOutletRow?.computedStatus.latestRecordMonth;

      if (
        prevYear !== undefined &&
        prevMonth !== undefined &&
        (prevYear !== targetYear || prevMonth !== targetMonth)
      ) {
        latestRecords = StorageService.saveMaintenanceMonthEntry(
          row.outletId,
          'apar',
          prevYear,
          prevMonth,
          null
        );
      }

      const existingRec = latestRecords.find(
        (r) =>
          r.outletId === row.outletId &&
          r.category === 'apar' &&
          r.year === targetYear
      );
      const existingEntry = existingRec?.months?.[targetMonth];

      const entry: MaintenanceMonthEntry = {
        ...(existingEntry || {}),
        date: effectiveDate,
        quantity: hasQty ? qtyNum : undefined,
        aparBrand: cleanBrand || undefined,
        customExpiryDate: cleanExp || undefined,
        updatedBy: currentUser.name,
        updatedAt: new Date().toISOString(),
      };

      latestRecords = StorageService.saveMaintenanceMonthEntry(
        row.outletId,
        'apar',
        targetYear,
        targetMonth,
        entry
      );
    });

    setRecords(latestRecords);
    setShowBulkAparModal(false);
  };

  const handleDownloadAparXls = () => {
    const XLSX: any =
      (XLSXStyleModule as any).default?.utils
        ? (XLSXStyleModule as any).default
        : XLSXStyleModule;

    const areaLabel =
      aparAreaFilter === 'area-bogor-1-depok'
        ? 'AREA BOGOR 1 & DEPOK'
        : aparAreaFilter === 'area-bogor-2'
        ? 'AREA BOGOR 2'
        : aparAreaFilter === 'unassigned'
        ? 'BELUM MASUK AREA'
        : 'SEMUA AREA';

    const formatIndoDate = (iso?: string | null): string => {
      if (!iso) return '';
      const parts = iso.trim().split('-');
      if (parts.length !== 3) return iso.trim();
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    const exportRows = filteredRows.map((row) => {
      const latest = row.computedStatus.latestMonthEntry;
      const qty =
        latest?.quantity !== undefined && Number(latest.quantity) > 0
          ? Number(latest.quantity)
          : '';
      const brand = latest?.aparBrand ? latest.aparBrand.trim() : '';
      const exp = formatIndoDate(row.computedStatus.expDate);
      return {
        outletName: row.displayName,
        qty,
        brand,
        exp,
      };
    });

    const totalTabung = exportRows.reduce(
      (sum, r) => sum + (typeof r.qty === 'number' ? r.qty : 0),
      0
    );
    const filledCount = exportRows.filter(
      (r) => typeof r.qty === 'number' || r.brand !== '' || r.exp !== ''
    ).length;

    const headerDateStr = new Date().toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const sheetData: any[][] = [
      ['REKAP DATA APAR - CINEMA XXI', '', '', ''],
      [`Filter Area: ${areaLabel}   |   Monitoring Lintas Tahun`, '', '', ''],
      [
        `Total Outlet: ${exportRows.length}   |   Terisi: ${filledCount} Outlet   |   Total APAR: ${totalTabung} Tabung   |   Diunduh: ${headerDateStr}`,
        '',
        '',
        '',
      ],
      [],
      ['Nama Outlet', 'Jumlah APAR', 'Merk APAR', 'Exp APAR'],
      ...exportRows.map((r) => [r.outletName, r.qty, r.brand, r.exp]),
    ];

    const firstDataRowExcel = 6; // 1-indexed row in Excel
    const lastDataRowExcel = 5 + exportRows.length;

    if (exportRows.length > 0) {
      sheetData.push([
        `TOTAL (${exportRows.length} OUTLET)`,
        {
          t: 'n',
          v: totalTabung,
          f: `SUM(B${firstDataRowExcel}:B${lastDataRowExcel})`,
        },
        `Terisi: ${filledCount} Outlet`,
        '-',
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    const thinCellBorder = {
      top: { style: 'thin', color: { rgb: '94A3B8' } },
      bottom: { style: 'thin', color: { rgb: '94A3B8' } },
      left: { style: 'thin', color: { rgb: '94A3B8' } },
      right: { style: 'thin', color: { rgb: '94A3B8' } },
    };

    const headerBorder = {
      top: { style: 'medium', color: { rgb: '0F172A' } },
      bottom: { style: 'medium', color: { rgb: '0F172A' } },
      left: { style: 'thin', color: { rgb: '475569' } },
      right: { style: 'thin', color: { rgb: '475569' } },
    };

    const totalBorder = {
      top: { style: 'medium', color: { rgb: '0F172A' } },
      bottom: { style: 'medium', color: { rgb: '0F172A' } },
      left: { style: 'thin', color: { rgb: '0F172A' } },
      right: { style: 'thin', color: { rgb: '0F172A' } },
    };

    const bannerBorder = {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } },
    };

    // Style Banner Rows (Row 0..2, Col 0..3)
    for (let c = 0; c <= 3; c++) {
      const ref0 = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[ref0]) {
        ws[ref0].s = {
          font: { name: 'Calibri', sz: 13, bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4A1D6A' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'medium', color: { rgb: '3B0764' } },
            bottom: { style: 'thin', color: { rgb: '3B0764' } },
            left: { style: c === 0 ? 'medium' : 'thin', color: { rgb: '3B0764' } },
            right: { style: c === 3 ? 'medium' : 'thin', color: { rgb: '3B0764' } },
          },
        };
      }
      const ref1 = XLSX.utils.encode_cell({ r: 1, c });
      if (ws[ref1]) {
        ws[ref1].s = {
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '4A1D6A' } },
          fill: { fgColor: { rgb: 'F3E8FF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: bannerBorder,
        };
      }
      const ref2 = XLSX.utils.encode_cell({ r: 2, c });
      if (ws[ref2]) {
        ws[ref2].s = {
          font: { name: 'Calibri', sz: 9.5, color: { rgb: '334155' } },
          fill: { fgColor: { rgb: 'F8FAFC' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: bannerBorder,
        };
      }
    }

    // Style Table Header (Row index 4)
    for (let c = 0; c <= 3; c++) {
      const ref = XLSX.utils.encode_cell({ r: 4, c });
      if (ws[ref]) {
        ws[ref].s = {
          font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1E293B' } },
          alignment: {
            horizontal: c === 0 ? 'left' : 'center',
            vertical: 'center',
          },
          border: {
            ...headerBorder,
            left: { style: c === 0 ? 'medium' : 'thin', color: { rgb: '0F172A' } },
            right: { style: c === 3 ? 'medium' : 'thin', color: { rgb: '0F172A' } },
          },
        };
      }
    }

    // Style Data Rows (Row index 5 .. 5 + exportRows.length - 1)
    for (let i = 0; i < exportRows.length; i++) {
      const r = 5 + i;
      const isAlt = i % 2 === 1;
      const rowFill = { fgColor: { rgb: isAlt ? 'F8FAFC' : 'FFFFFF' } };

      for (let c = 0; c <= 3; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (!ws[ref]) {
          ws[ref] = { t: 's', v: '' };
        }
        ws[ref].s = {
          font: {
            name: 'Calibri',
            sz: 10,
            bold: c === 0,
            color: { rgb: '0F172A' },
          },
          fill: rowFill,
          alignment: {
            horizontal: c === 0 ? 'left' : 'center',
            vertical: 'center',
          },
          border: {
            ...thinCellBorder,
            left: { style: c === 0 ? 'medium' : 'thin', color: { rgb: c === 0 ? '0F172A' : '94A3B8' } },
            right: { style: c === 3 ? 'medium' : 'thin', color: { rgb: c === 3 ? '0F172A' : '94A3B8' } },
          },
          ...(c === 1 && typeof ws[ref].v === 'number' ? { numFmt: '#,##0' } : {}),
        };
      }
    }

    // Style Total Footer Row
    if (exportRows.length > 0) {
      const totalRowIdx = 5 + exportRows.length;
      for (let c = 0; c <= 3; c++) {
        const ref = XLSX.utils.encode_cell({ r: totalRowIdx, c });
        if (!ws[ref]) {
          ws[ref] = { t: 's', v: '' };
        }
        ws[ref].s = {
          font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: '0F172A' } },
          fill: { fgColor: { rgb: 'FEF3C7' } },
          alignment: {
            horizontal: c === 0 ? 'left' : 'center',
            vertical: 'center',
          },
          border: {
            ...totalBorder,
            left: { style: c === 0 ? 'medium' : 'thin', color: { rgb: '0F172A' } },
            right: { style: c === 3 ? 'medium' : 'thin', color: { rgb: '0F172A' } },
          },
          ...(c === 1 ? { numFmt: '#,##0' } : {}),
        };
      }
    }

    // Hitung lebar kolom otomatis agar seluruh isi tabel rapi & tidak terpotong
    const maxOutletLen = exportRows.reduce(
      (max, r) => Math.max(max, r.outletName.length),
      'Nama Outlet'.length
    );
    const maxBrandLen = exportRows.reduce(
      (max, r) => Math.max(max, r.brand.length),
      'Merk APAR'.length
    );

    ws['!cols'] = [
      { wch: Math.max(maxOutletLen + 6, 38) },
      { wch: 16 },
      { wch: Math.max(maxBrandLen + 6, 26) },
      { wch: 18 },
    ];

    // Tinggi baris rapi (banner, header tabel, baris data, total)
    ws['!rows'] = [
      { hpt: 28 },
      { hpt: 20 },
      { hpt: 20 },
      { hpt: 10 },
      { hpt: 24 },
      ...exportRows.map(() => ({ hpt: 20 })),
      ...(exportRows.length > 0 ? [{ hpt: 23 }] : []),
    ];

    // Merge judul & info meta selebar 4 kolom tabel (A..D)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
    ];

    if (exportRows.length > 0) {
      ws['!autofilter'] = { ref: `A5:D${lastDataRowExcel}` };
    }

    ws['!views'] = [{ showGridLines: true }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data APAR');

    const areaSlug =
      aparAreaFilter === 'area-bogor-1-depok'
        ? 'Bogor_1_Depok'
        : aparAreaFilter === 'area-bogor-2'
        ? 'Bogor_2'
        : aparAreaFilter === 'unassigned'
        ? 'Belum_Masuk_Area'
        : 'Semua_Area';

    XLSX.writeFile(wb, `Rekap_Data_APAR_${areaSlug}.xlsx`);
  };

  // Alarm list (Outlets that are overdue or approaching SOP limit)
  const alarmOutlets = useMemo(() => {
    return outletRows.filter(
      (r) =>
        r.computedStatus.status === 'overdue' ||
        r.computedStatus.status === 'warning'
    );
  }, [outletRows]);

  return (
    <div className="w-full space-y-4 pb-8">
      {/* Top Bar: Tahun Berjalan (Non-APAR) / Info Lintas Tahun (APAR) & Status Legends */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {activeCategory === 'apar' ? (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50/90 border border-rose-200/90 text-rose-800 text-[11px] font-extrabold">
            <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>MONITORING LINTAS TAHUN (SEMUA DATA EXP APAR)</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              TAHUN BERJALAN:
            </span>
            <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-full px-1.5 py-0.5">
              <button
                type="button"
                onClick={() => setSelectedYear((y) => y - 1)}
                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
                title="Tahun Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 text-xs font-extrabold text-slate-800 tabular-nums">
                {selectedYear}
              </span>
              <button
                type="button"
                onClick={() => setSelectedYear((y) => y + 1)}
                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
                title="Tahun Berikutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Status Legend Pills (Clickable to filter) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setStatusFilter((prev) => (prev === 'safe' ? 'all' : 'safe'))
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
              statusFilter === 'safe'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50/90 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                statusFilter === 'safe' ? 'bg-white' : 'bg-emerald-500'
              }`}
            />
            <span>Aman (Sesuai SOP)</span>
            {statusCounts.safe > 0 && (
              <span className="ml-0.5 opacity-80">({statusCounts.safe})</span>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              setStatusFilter((prev) => (prev === 'warning' ? 'all' : 'warning'))
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
              statusFilter === 'warning'
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-amber-50/90 text-amber-700 border-amber-200 hover:bg-amber-100/80'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                statusFilter === 'warning' ? 'bg-white' : 'bg-amber-500 animate-ping'
              }`}
            />
            <span>Dekat Batas / SOP</span>
            {statusCounts.warning > 0 && (
              <span className="ml-0.5 opacity-90">({statusCounts.warning})</span>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              setStatusFilter((prev) => (prev === 'overdue' ? 'all' : 'overdue'))
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
              statusFilter === 'overdue'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-rose-50/90 text-rose-700 border-rose-200 hover:bg-rose-100/80'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                statusFilter === 'overdue' ? 'bg-white' : 'bg-rose-500'
              }`}
            />
            <span>Lewat Batas (Overdue)</span>
            {statusCounts.overdue > 0 && (
              <span className="ml-0.5 opacity-90">({statusCounts.overdue})</span>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              setStatusFilter((prev) => (prev === 'empty' ? 'all' : 'empty'))
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
              statusFilter === 'empty'
                ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/70'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                statusFilter === 'empty' ? 'bg-white' : 'bg-slate-400'
              }`}
            />
            <span>Belum Ada Data</span>
            {statusCounts.empty > 0 && (
              <span className="ml-0.5 opacity-80">({statusCounts.empty})</span>
            )}
          </button>
        </div>
      </div>

      {/* Alarm Notification Banner when any outlet is Overdue or Approaching Deadline */}
      {alarmOutlets.length > 0 && (
        <div
          className={`rounded-2xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs ${
            statusCounts.overdue > 0
              ? 'bg-rose-50/90 border-rose-200 text-rose-900'
              : 'bg-amber-50/90 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                statusCounts.overdue > 0
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wide">
                  ALARM PENGINGAT SOP PEMELIHARAAN:
                </span>
                {statusCounts.overdue > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white">
                    {statusCounts.overdue} Outlet Lewat Batas SOP
                  </span>
                )}
                {statusCounts.warning > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
                    {statusCounts.warning} Outlet Mendekati Jadwal Perbaikan
                  </span>
                )}
              </div>
              <p className="text-[11px] mt-0.5 opacity-90">
                Outlet perhatian:{' '}
                <span className="font-bold">
                  {alarmOutlets
                    .slice(0, 5)
                    .map((a) => {
                      const rem = a.computedStatus.daysRemaining;
                      return `${a.displayName} (${
                        rem < 0 ? `Lewat ${Math.abs(rem)} hr` : `Sisa ${rem} hr`
                      })`;
                    })
                    .join(', ')}
                  {alarmOutlets.length > 5
                    ? ` +${alarmOutlets.length - 5} outlet lainnya`
                    : ''}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {statusFilter !== 'all' ? (
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Tampilkan Semua Outlet
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setStatusFilter(statusCounts.overdue > 0 ? 'overdue' : 'warning')
                }
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold text-white shadow-xs cursor-pointer ${
                  statusCounts.overdue > 0
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Filter Outlet Perlu Tindakan
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Calendar Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col gap-4">
          {/* Sub-Tab Selector specifically for Filter Air (Fluux 21 & Sediment Filter) */}
          {activeMenu === 'maintenance_filter_air' && (
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setFilterAirTab('filter_fluux')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    filterAirTab === 'filter_fluux'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Droplets className="w-3.5 h-3.5 text-sky-600" />
                  <span>Filter Fluux 21</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                    SOP: 6 Bulan (180 hr)
                  </span>
                  {filterAirTabAlarmCounts.fluux > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white">
                      {filterAirTabAlarmCounts.fluux}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setFilterAirTab('filter_sediment')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    filterAirTab === 'filter_sediment'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Sediment Filter</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    SOP: 1 Bulan (30 hr)
                  </span>
                  {filterAirTabAlarmCounts.sediment > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white">
                      {filterAirTabAlarmCounts.sediment}
                    </span>
                  )}
                </button>
              </div>

              <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  Masa pakai filter mengikuti tanggal expired yang tercatat pada masing-masing outlet.
                </span>
              </div>
            </div>
          )}

          {activeCategory === 'apar' && (
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-extrabold">
                  <Flame className="w-3.5 h-3.5 text-rose-600" />
                  <span>Total APAR Terdata:</span>
                  <span className="tabular-nums">
                    {outletRows.reduce(
                      (acc, r) => acc + (Number(r.computedStatus.latestMonthEntry?.quantity) || 0),
                      0
                    )}{' '}
                    Tabung
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold">
                  <span>
                    Outlet Terisi:{' '}
                    <strong className="text-slate-900">
                      {outletRows.filter((r) => r.computedStatus.status !== 'empty').length}
                    </strong>{' '}
                    / {outletRows.length}
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mr-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    Data mencakup Jumlah Tabung, Merk APAR &amp; Exp APAR (Alarm H-30 dihitung dari sisa hari menuju Exp).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadAparXls}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 shadow-2xs transition-colors cursor-pointer"
                  title="Unduh rekap APAR (.xls) sesuai filter saat ini"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download XLS</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenBulkAparModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Input Massal APAR</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-700 shrink-0" />
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                  {categoryMeta.title}
                </h2>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                {categoryMeta.subtitle}
              </p>
            </div>

            {/* Search, APAR Area Filter & Row Limit Controls */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {activeCategory === 'apar' &&
                !currentUser.outletId &&
                !currentUser.areaId && (
                  <div className="inline-flex items-center gap-1.5 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      AREA:
                    </span>
                    <select
                      value={aparAreaFilter}
                      onChange={(e) =>
                        setAparAreaFilter(
                          e.target.value as
                            | 'all'
                            | 'area-bogor-1-depok'
                            | 'area-bogor-2'
                            | 'unassigned'
                        )
                      }
                      className="text-xs font-extrabold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                    >
                      <option value="all">
                        Semua Area ({aparAreaCounts.all})
                      </option>
                      <option value="area-bogor-1-depok">
                        AREA BOGOR 1 &amp; DEPOK ({aparAreaCounts.bogor1})
                      </option>
                      <option value="area-bogor-2">
                        AREA BOGOR 2 ({aparAreaCounts.bogor2})
                      </option>
                      <option value="unassigned">
                        Belum Masuk Area ({aparAreaCounts.unassigned})
                      </option>
                    </select>
                  </div>
                )}

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama outlet..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 w-48 sm:w-56"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {activeCategory === 'apar' && (
                <div className="inline-flex items-center gap-1.5 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    URUTKAN:
                  </span>
                  <select
                    value={aparSortMode}
                    onChange={(e) =>
                      setAparSortMode(e.target.value as 'name' | 'exp_asc')
                    }
                    className="text-xs font-extrabold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="name">Nama Outlet A–Z</option>
                    <option value="exp_asc">Exp Terdekat</option>
                  </select>
                </div>
              )}

              <div className="inline-flex items-center gap-1.5 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  TAMPILKAN:
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="text-xs font-extrabold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value={10}>10 Outlet</option>
                  <option value={20}>20 Outlet</option>
                  <option value={50}>50 Outlet</option>
                  <option value={100}>100 Outlet</option>
                  <option value={9999}>Semua ({filteredRows.length})</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="overflow-x-auto">
          <table
            className={`w-full border-collapse ${
              activeCategory === 'apar' ? 'min-w-[960px]' : 'min-w-[1180px]'
            }`}
          >
            <thead>
              {activeCategory === 'apar' ? (
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 pl-4 pr-3 text-left min-w-[230px] border-r border-slate-200/90">
                    NAMA OUTLET
                  </th>
                  <th className="py-3 px-3 text-center w-[135px] border-r border-slate-200/90">
                    JUMLAH APAR
                  </th>
                  <th className="py-3 px-3 text-center w-[165px] border-r border-slate-200/90">
                    MERK APAR
                  </th>
                  <th className="py-3 px-3 text-center w-[165px] border-r border-slate-200/90">
                    TANGGAL EXP APAR
                  </th>
                  <th className="py-3 px-3 text-center w-[195px] border-r border-slate-200/90">
                    SOP ALARM & STATUS
                  </th>
                  <th className="py-3 px-3 text-center w-[170px] border-r border-slate-200/90">
                    KETERANGAN
                  </th>
                  <th className="py-3 px-3 text-center w-[110px]">AKSI</th>
                </tr>
              ) : (
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 pl-4 pr-2 text-left w-[230px]">OUTLET</th>
                  <th className="py-3 px-2 text-center w-[64px] border-r border-slate-200/90">
                    KELAS
                  </th>
                  {MONTH_LABELS.map((mLabel) => (
                    <th
                      key={mLabel}
                      className="py-3 px-1 text-center w-[56px] border-r border-slate-200/90"
                    >
                      {mLabel}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center w-[195px] border-r border-slate-200/90">
                    SOP ALARM & STATUS
                  </th>
                  <th className="py-3 px-3 text-center w-[170px]">KETERANGAN</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-200/90 text-xs">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeCategory === 'apar' ? 7 : 16}
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    Tidak ada outlet yang sesuai dengan pencarian / filter status.
                  </td>
                </tr>
              ) : (
                paginatedRows.map(
                  ({ outlet, displayName, outletClass, yearRecord, computedStatus }) => {
                    const { status, lastDate, expDate, daysRemaining } = computedStatus;
                    const aparEntry = computedStatus.latestMonthEntry;

                    return (
                      <tr
                        key={outlet.id}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        {activeCategory === 'apar' ? (
                          <>
                            {/* NAMA OUTLET */}
                            <td className="py-3.5 pl-4 pr-3 align-middle border-r border-slate-200/90">
                              <div className="font-extrabold text-[11px] sm:text-xs text-slate-900 uppercase tracking-tight leading-snug">
                                {displayName}
                              </div>
                              {aparEntry?.notes && (
                                <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[260px]">
                                  Catatan: {aparEntry.notes}
                                </div>
                              )}
                            </td>

                            {/* JUMLAH APAR */}
                            <td className="py-3.5 px-3 text-center align-middle border-r border-slate-200/90">
                              {aparEntry?.quantity && aparEntry.quantity > 0 ? (
                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-extrabold tabular-nums">
                                  {aparEntry.quantity} Tabung
                                </span>
                              ) : (
                                <span className="text-slate-300 font-semibold">-</span>
                              )}
                            </td>

                            {/* MERK APAR */}
                            <td className="py-3.5 px-3 text-center align-middle border-r border-slate-200/90">
                              {aparEntry?.aparBrand ? (
                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-bold">
                                  {aparEntry.aparBrand}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-semibold">-</span>
                              )}
                            </td>

                            {/* TANGGAL EXP APAR */}
                            <td className="py-3.5 px-3 text-center align-middle border-r border-slate-200/90">
                              {expDate ? (
                                <span
                                  className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-extrabold tabular-nums ${
                                    status === 'overdue'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : status === 'warning'
                                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}
                                >
                                  <Calendar className="w-3 h-3 shrink-0 opacity-80" />
                                  <span>{formatIsoToIndoDate(expDate)}</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">
                                  Belum diisi
                                </span>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            {/* OUTLET NAME & Tgl / Exp Subtext */}
                            <td className="py-3.5 pl-4 pr-2 align-middle">
                              <div className="font-extrabold text-[11px] sm:text-xs text-slate-900 uppercase tracking-tight leading-snug">
                                {displayName}
                              </div>
                              {lastDate && expDate && (
                                <div className="text-[10px] font-medium text-slate-500 mt-0.5 tabular-nums">
                                  Tgl: {lastDate} | Exp: {expDate}
                                </div>
                              )}
                            </td>

                            {/* KELAS BADGE */}
                            <td className="py-3.5 px-2 text-center align-middle border-r border-slate-200/90">
                              <span
                                className={`inline-flex items-center justify-center min-w-[26px] px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${
                                  outletClass === 'A'
                                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                                    : outletClass === 'B'
                                    ? 'bg-blue-50/80 text-blue-700 border-blue-200'
                                    : 'bg-slate-50 text-slate-600 border-slate-300'
                                }`}
                              >
                                {outletClass}
                              </span>
                            </td>

                            {/* 12 MONTH CELLS */}
                            {MONTH_LABELS.map((_, idx) => {
                              const monthNum = idx + 1;
                              const cellEntry = yearRecord.months?.[monthNum] || null;
                              const dayNumber = cellEntry?.date
                                ? cellEntry.date.split('-')[2] || '01'
                                : null;

                              // Style badge inside cell based on overall SOP status or green if safe
                              let cellBadgeClass =
                                'bg-emerald-50 text-emerald-800 border-emerald-200';
                              if (
                                cellEntry &&
                                computedStatus.latestMonthEntry?.date === cellEntry.date
                              ) {
                                if (status === 'overdue') {
                                  cellBadgeClass =
                                    'bg-amber-50 text-amber-900 border-amber-200/90';
                                } else if (status === 'warning') {
                                  cellBadgeClass =
                                    'bg-amber-50 text-amber-900 border-amber-300';
                                }
                              }

                              return (
                                <td
                                  key={monthNum}
                                  onClick={() =>
                                    handleOpenCellModal(
                                      outlet,
                                      displayName,
                                      outletClass,
                                      monthNum,
                                      cellEntry
                                    )
                                  }
                                  title={
                                    cellEntry
                                      ? `${displayName} (${MONTH_FULL_NAMES[idx]} ${selectedYear})\nTanggal: ${cellEntry.date}${
                                          cellEntry.quantity
                                            ? `\nJumlah: ${cellEntry.quantity}`
                                            : ''
                                        }${
                                          cellEntry.customExpiryDate
                                            ? `\nExp: ${cellEntry.customExpiryDate}`
                                            : ''
                                        }${cellEntry.notes ? `\nCatatan: ${cellEntry.notes}` : ''}`
                                      : `Klik untuk mencatat jadwal ${MONTH_FULL_NAMES[idx]} ${selectedYear} pada ${displayName}`
                                  }
                                  className="py-2.5 px-1 text-center align-middle border-r border-slate-200/90 cursor-pointer hover:bg-amber-50/40 transition-colors relative"
                                >
                                  {cellEntry && dayNumber ? (
                                    <div
                                      className={`inline-flex items-center justify-center gap-1 px-1.5 py-1 rounded-md border text-[10px] font-extrabold leading-none shadow-2xs ${cellBadgeClass}`}
                                    >
                                      <span className="tabular-nums">{dayNumber}</span>
                                      {cellEntry.quantity && cellEntry.quantity > 0 && (
                                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700">
                                          <span>{categoryMeta.unitIcon}</span>
                                          <span className="tabular-nums">
                                            {cellEntry.quantity}
                                            {activeCategory === 'karpet' ? ' m²' : ''}
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="w-full h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Plus className="w-3 h-3 text-slate-300 hover:text-amber-500" />
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </>
                        )}

                        {/* SOP ALARM & STATUS */}
                        <td className="py-3 px-2.5 text-center align-middle border-r border-slate-200/90">
                          {status === 'empty' && (
                            <span className="inline-flex items-center justify-center px-3.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-400 border border-slate-200/80 w-full max-w-[165px]">
                              Belum ada riwayat
                            </span>
                          )}

                          {status === 'overdue' && (
                            <div className="flex flex-col items-center gap-1.5">
                              <div
                                title={
                                  activeCategory === 'apar'
                                    ? `Exp APAR: ${expDate} (Terlewat ${Math.abs(daysRemaining)} hari dari hari ini)`
                                    : `Jadwal terakhir: ${lastDate} | Batas SOP: ${expDate} (Terlewat ${Math.abs(
                                        daysRemaining
                                      )} hari)`
                                }
                                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs w-full max-w-[175px] truncate"
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                <span className="truncate">
                                  🚨 {categoryMeta.actionOverdue} (Lewat{' '}
                                  {Math.abs(daysRemaining)} hr)
                                </span>
                              </div>
                              {(activeCategory === 'kursi_studio' ||
                                activeCategory === 'karpet') && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRequestBeritaAcara(
                                      outlet,
                                      displayName,
                                      outletClass
                                    )
                                  }
                                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 shadow-2xs w-full max-w-[175px] transition-colors cursor-pointer"
                                  title="Buat Berita Acara (Tunggal atau Gabungan Karpet & Kursi)"
                                >
                                  <FileText className="w-3 h-3 shrink-0" />
                                  <span className="truncate">Buat Berita Acara</span>
                                </button>
                              )}
                            </div>
                          )}

                          {status === 'warning' && (
                            <div className="flex flex-col items-center gap-1.5">
                              <div
                                title={
                                  activeCategory === 'apar'
                                    ? `Exp APAR: ${expDate} (Sisa ${daysRemaining} hari dari hari ini)`
                                    : `Jadwal terakhir: ${lastDate} | Jatuh tempo: ${expDate} (Sisa ${daysRemaining} hari lagi)`
                                }
                                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs w-full max-w-[175px] truncate animate-pulse"
                              >
                                <Bell className="w-3 h-3 text-amber-600 shrink-0" />
                                <span className="truncate">
                                  🔔 {categoryMeta.actionWarning} (Sisa {daysRemaining} hr)
                                </span>
                              </div>
                              {(activeCategory === 'kursi_studio' ||
                                activeCategory === 'karpet') && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRequestBeritaAcara(
                                      outlet,
                                      displayName,
                                      outletClass
                                    )
                                  }
                                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 shadow-2xs w-full max-w-[175px] transition-colors cursor-pointer"
                                  title="Buat Berita Acara (Tunggal atau Gabungan Karpet & Kursi)"
                                >
                                  <FileText className="w-3 h-3 shrink-0" />
                                  <span className="truncate">Buat Berita Acara</span>
                                </button>
                              )}
                            </div>
                          )}

                          {status === 'safe' && (
                            <div
                              title={
                                activeCategory === 'apar'
                                  ? `Exp APAR: ${expDate} (Sisa ${daysRemaining} hari dari hari ini)`
                                  : `Jadwal terakhir: ${lastDate} | Jatuh tempo berikutnya: ${expDate} (Sisa ${daysRemaining} hari)`
                              }
                              className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 w-full max-w-[175px] truncate"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="truncate">
                                Aman SOP (Sisa {daysRemaining} hr)
                              </span>
                            </div>
                          )}
                        </td>

                        {/* KETERANGAN */}
                        <td
                          className={`py-3 px-2.5 text-center align-middle ${
                            activeCategory === 'apar'
                              ? 'border-r border-slate-200/90'
                              : ''
                          }`}
                        >
                          {yearRecord.keterangan ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenKeteranganModal(
                                  outlet,
                                  displayName,
                                  yearRecord.keterangan || ''
                                )
                              }
                              className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 max-w-[150px] truncate cursor-pointer"
                              title={yearRecord.keterangan}
                            >
                              <span className="truncate">{yearRecord.keterangan}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenKeteranganModal(outlet, displayName, '')
                              }
                              className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 hover:border-slate-400 transition-colors cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>Tambah keterangan</span>
                            </button>
                          )}
                        </td>

                        {/* AKSI LANGSUNG KHUSUS APAR */}
                        {activeCategory === 'apar' && (
                          <td className="py-3 px-2.5 text-center align-middle">
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenCellModal(
                                  outlet,
                                  displayName,
                                  outletClass,
                                  computedStatus.latestRecordMonth ?? 1,
                                  aparEntry,
                                  computedStatus.latestRecordYear ?? selectedYear
                                )
                              }
                              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-extrabold border transition-colors cursor-pointer ${
                                aparEntry
                                  ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-700'
                                  : 'bg-amber-400 hover:bg-amber-500 text-slate-950 border-amber-500/50 shadow-2xs'
                              }`}
                            >
                              {aparEntry ? (
                                <>
                                  <Pencil className="w-3 h-3" />
                                  <span>Edit</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>Input</span>
                                </>
                              )}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Card Footer Pagination */}
        <div className="px-4 py-3.5 border-t border-slate-200/80 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 font-medium">
            Menampilkan{' '}
            <span className="font-bold text-slate-800">
              {totalItems === 0 ? 0 : startIndex + 1}
            </span>{' '}
            sampai{' '}
            <span className="font-bold text-slate-800">
              {Math.min(startIndex + pageSize, totalItems)}
            </span>{' '}
            dari <span className="font-bold text-slate-800">{totalItems}</span> Outlet
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((pageNum) => {
                if (totalPages <= 7) return true;
                if (pageNum === 1 || pageNum === totalPages) return true;
                return Math.abs(pageNum - safePage) <= 1;
              })
              .map((pageNum, idx, arr) => {
                const prevPage = idx > 0 ? arr[idx - 1] : null;
                const showEllipsis = prevPage !== null && pageNum - prevPage > 1;
                return (
                  <React.Fragment key={pageNum}>
                    {showEllipsis && (
                      <span className="px-1 text-xs font-bold text-slate-400 select-none">
                        ...
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-7 h-7 px-1.5 rounded-lg text-xs font-extrabold flex items-center justify-center transition-colors cursor-pointer ${
                        safePage === pageNum
                          ? 'bg-[#F59E0B] text-white shadow-2xs'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Input / Edit Tanggal Maintenance Bulanan */}
      {activeCellModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  {activeCategory !== 'apar' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-400 text-slate-950 uppercase">
                      KELAS {activeCellModal.outletClass}
                    </span>
                  )}
                  <span className="text-xs font-bold text-amber-300">
                    {activeCategory === 'apar'
                      ? 'DATA APAR OUTLET'
                      : `${MONTH_FULL_NAMES[activeCellModal.month - 1]} ${selectedYear}`}
                  </span>
                </div>
                <h3 className="text-sm font-extrabold mt-1 uppercase tracking-wide">
                  {activeCellModal.displayName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveCellModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCellEntry} className="p-5 space-y-4 overflow-y-auto">
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-[11px] text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  {activeCategory === 'apar' ? (
                    <>
                      <span className="font-bold">Batas Aman &amp; Alarm APAR: </span>
                      <span>Alarm H-30 sebelum Tanggal Exp</span>
                      <p className="text-[10px] text-amber-700 mt-0.5">
                        Status Aman SOP, Mendekati Exp (H-30), dan Expired dihitung langsung dari sisa hari menuju Tanggal Exp APAR terhitung dari hari ini.
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="font-bold">Standar Siklus SOP: </span>
                      <span>
                        {getSopDays(activeCategory, activeCellModal.outletClass)} Hari
                      </span>
                      <p className="text-[10px] text-amber-700 mt-0.5">
                        Sistem akan memberikan alarm pengingat otomatis ketika mendekati atau melewati tanggal jatuh tempo / expired.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {activeCategory !== 'apar' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Pelaksanaan / Pergantian <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => handleFormDateChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {activeCategory === 'apar'
                    ? 'Tanggal Exp APAR'
                    : 'Tanggal Expired / Jadwal Berikutnya (SOP)'}
                  {activeCategory === 'apar' && <span className="text-rose-500"> *</span>}
                </label>
                <input
                  type="date"
                  required={activeCategory === 'apar'}
                  value={formExpDate}
                  onChange={(e) => setFormExpDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {activeCategory === 'apar'
                    ? 'Sesuaikan dengan stiker/label Exp tabung APAR. Sisa hari dihitung otomatis dari hari ini ke tanggal Exp ini.'
                    : `Terisi otomatis +${getSopDays(activeCategory, activeCellModal.outletClass)} hari dari tanggal pelaksanaan (dapat disesuaikan manual).`}
                </p>
              </div>

              {activeCategory === 'kursi_studio' ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">
                        Pilih Studio yang Dicuci
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {selectedStudios.length} dari {(activeCellModal.outlet.studios || []).length} studio dipilih
                      </span>
                    </div>
                    {(activeCellModal.outlet.studios || []).length > 0 && (
                      <button
                        type="button"
                        onClick={handleToggleAllStudios}
                        className="text-[11px] font-bold text-amber-600 hover:text-amber-700 underline underline-offset-2 cursor-pointer"
                      >
                        {selectedStudios.length === (activeCellModal.outlet.studios || []).length
                          ? 'Reset Pilihan'
                          : 'Pilih Semua Studio'}
                      </button>
                    )}
                  </div>

                  {(activeCellModal.outlet.studios || []).length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 max-h-48 overflow-y-auto">
                      {(activeCellModal.outlet.studios || []).map((studio) => {
                        const isChecked = selectedStudios.includes(studio.name);
                        return (
                          <label
                            key={studio.name}
                            className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-xs transition-colors cursor-pointer select-none ${
                              isChecked
                                ? 'bg-amber-50/90 border-amber-400 text-slate-900 font-bold shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleStudio(studio.name)}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500/30 cursor-pointer shrink-0 accent-amber-500"
                              />
                              <span className="truncate">{studio.name}</span>
                            </div>
                            <span
                              className={`text-[11px] tabular-nums shrink-0 ${
                                isChecked ? 'text-amber-800 font-extrabold' : 'text-slate-500'
                              }`}
                            >
                              {studio.capacity}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                      Data daftar studio belum tersedia untuk outlet ini.
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {categoryMeta.qtyLabel}
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        readOnly
                        value={formQty}
                        className="w-full px-3 py-2 pr-14 text-xs font-extrabold text-slate-800 bg-slate-100 border border-slate-300 rounded-xl tabular-nums cursor-not-allowed focus:outline-none"
                      />
                      <span className="absolute right-3 text-[11px] font-bold text-slate-500 pointer-events-none">
                        Kursi
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Otomatis menjumlahkan kapasitas kursi dari studio yang diceklis di atas.
                    </p>
                  </div>
                </div>
              ) : activeCategory === 'karpet' ? (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">
                        Pilih Area / Ruangan Karpet
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Hanya area yang dicentang yang masuk ke total &amp; Berita Acara
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleResetDefaultCarpetAreas}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                        title="Muat ulang daftar default per-studio, Lobi & Koridor"
                      >
                        <span>Reset Default</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCustomCarpetRoom}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors cursor-pointer"
                        title="Tambah Ruangan Karpet"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Ruangan</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 max-h-56 overflow-y-auto">
                    {carpetAreas.length === 0 ? (
                      <div className="py-4 text-center text-[11px] text-slate-500">
                        Semua baris area dihapus. Klik <strong>Tambah Ruangan</strong> atau <strong>Reset Default</strong>.
                      </div>
                    ) : (
                      carpetAreas.map((area) => (
                        <div
                          key={area.id}
                          className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-xs transition-colors ${
                            area.checked
                              ? 'bg-amber-50/90 border-amber-400 text-slate-900 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={area.checked}
                              onChange={() => handleToggleCarpetArea(area.id)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500/30 cursor-pointer shrink-0 accent-amber-500"
                            />
                            {area.isCustom ? (
                              <input
                                type="text"
                                value={area.name}
                                onChange={(e) =>
                                  handleChangeCarpetAreaName(area.id, e.target.value)
                                }
                                placeholder="Nama ruangan (misal: Mushola)..."
                                className="w-full px-2 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-md focus:outline-none focus:border-amber-500"
                              />
                            ) : (
                              <span
                                onClick={() => handleToggleCarpetArea(area.id)}
                                className={`truncate cursor-pointer select-none ${
                                  area.checked ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                                }`}
                              >
                                {area.name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="relative flex items-center w-24">
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={area.areaSqm > 0 ? area.areaSqm : ''}
                                onChange={(e) =>
                                  handleChangeCarpetAreaSqm(area.id, e.target.value)
                                }
                                placeholder="0"
                                className="w-full pl-2.5 pr-7 py-1 text-xs font-bold text-right bg-white border border-slate-300 rounded-md tabular-nums focus:outline-none focus:border-amber-500"
                              />
                              <span className="absolute right-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                                m²
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveCarpetRoom(area.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title={`Hapus ${area.name || 'ruangan ini'}`}
                              aria-label={`Hapus ${area.name || 'ruangan'}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {categoryMeta.qtyLabel}
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        readOnly
                        value={formQty}
                        className="w-full px-3 py-2 pr-12 text-xs font-extrabold text-slate-800 bg-slate-100 border border-slate-300 rounded-xl tabular-nums cursor-not-allowed focus:outline-none"
                      />
                      <span className="absolute right-3 text-[11px] font-bold text-slate-500 pointer-events-none">
                        m²
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Otomatis menjumlahkan total luas (m²) dari area karpet yang diceklis di atas.
                    </p>
                  </div>
                </div>
              ) : activeCategory === 'apar' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Jumlah APAR (Tabung) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        readOnly={aparUnits.length > 0}
                        value={formQty}
                        onChange={(e) => setFormQty(e.target.value)}
                        placeholder={categoryMeta.qtyPlaceholder}
                        className={`w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 tabular-nums ${
                          aparUnits.length > 0 ? 'bg-slate-100 text-slate-700 cursor-not-allowed' : ''
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Merk APAR <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formAparBrand}
                        onChange={(e) => setFormAparBrand(e.target.value)}
                        placeholder="Contoh: Servvo / Gunnebo / Yamato"
                        className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Preset Merk Populer */}
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 mb-1">
                      Pilih Cepat Merk Populer:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {['Servvo', 'Gunnebo', 'Yamato', 'Chubb', 'GuardALL', 'Viking'].map(
                        (brand) => (
                          <button
                            key={brand}
                            type="button"
                            onClick={() => setFormAparBrand(brand)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                              formAparBrand.toLowerCase() === brand.toLowerCase()
                                ? 'bg-amber-100 text-amber-900 border-amber-400'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {brand}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Opsional Rincian Multi-Merk / Lokasi Penempatan */}
                  <div className="pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-[11px] font-bold text-slate-700">
                          Rincian Per-Merk / Area (Opsional)
                        </span>
                        <p className="text-[10px] text-slate-400">
                          Gunakan jika outlet punya lebih dari 1 merk atau jenis media (Powder/CO2).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddAparUnitRow}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 cursor-pointer shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Tambah Rincian</span>
                      </button>
                    </div>

                    {aparUnits.length > 0 && (
                      <div className="space-y-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 max-h-44 overflow-y-auto">
                        {aparUnits.map((unit) => (
                          <div
                            key={unit.id}
                            className="p-2 rounded-lg bg-white border border-slate-200 space-y-1.5"
                          >
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={unit.brand}
                                onChange={(e) =>
                                  handleUpdateAparUnitRow(unit.id, { brand: e.target.value })
                                }
                                placeholder="Merk (Servvo...)"
                                className="flex-1 min-w-0 px-2 py-1 text-[11px] font-semibold border border-slate-300 rounded-md"
                              />
                              <select
                                value={unit.mediaType || 'ABC Powder'}
                                onChange={(e) =>
                                  handleUpdateAparUnitRow(unit.id, { mediaType: e.target.value })
                                }
                                className="px-1.5 py-1 text-[10px] font-semibold border border-slate-300 rounded-md bg-white"
                              >
                                <option value="ABC Powder">Powder</option>
                                <option value="CO2">CO2 (Proj/Server)</option>
                                <option value="Foam">Foam</option>
                                <option value="Clean Agent">Clean Agent</option>
                              </select>
                              <input
                                type="number"
                                min={1}
                                value={unit.qty || ''}
                                onChange={(e) =>
                                  handleUpdateAparUnitRow(unit.id, {
                                    qty: Math.max(0, Number(e.target.value) || 0),
                                  })
                                }
                                placeholder="Qty"
                                className="w-14 px-2 py-1 text-[11px] font-bold text-right border border-slate-300 rounded-md tabular-nums"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveAparUnitRow(unit.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Hapus baris"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={unit.location || ''}
                              onChange={(e) =>
                                handleUpdateAparUnitRow(unit.id, { location: e.target.value })
                              }
                              placeholder="Lokasi (opsional, misal: Lobi, Projector, Dapur Cafe)"
                              className="w-full px-2 py-1 text-[10px] border border-slate-200 rounded-md bg-slate-50/60"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {categoryMeta.qtyLabel}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formQty}
                    onChange={(e) => setFormQty(e.target.value)}
                    placeholder={categoryMeta.qtyPlaceholder}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {activeCategory === 'apar'
                    ? 'Catatan (Opsional)'
                    : 'Catatan Bulan Ini (Opsional)'}
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Contoh: Vendor PT Bersih Prima / Kondisi baik..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                {activeCellModal.existingEntry ? (
                  <button
                    type="button"
                    onClick={handleDeleteCellEntry}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveCellModal(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-500 shadow-xs transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>
                      {activeCategory === 'apar' ? 'Simpan Data APAR' : 'Simpan Jadwal'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Input / Edit Keterangan Outlet */}
      {activeKeteranganModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  CATATAN & KETERANGAN PEMELIHARAAN
                </span>
                <h3 className="text-sm font-extrabold mt-0.5 uppercase">
                  {activeKeteranganModal.displayName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveKeteranganModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveKeterangan} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {activeCategory === 'apar'
                    ? 'Keterangan Outlet'
                    : `Keterangan Outlet (${selectedYear})`}
                </label>
                <textarea
                  rows={3}
                  value={keteranganText}
                  onChange={(e) => setKeteranganText(e.target.value)}
                  placeholder="Masukkan catatan tambahan, nama vendor, atau keterangan pemeliharaan..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveKeteranganModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-500 shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Keterangan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Pilihan Jenis Berita Acara (Tunggal vs Gabungan Karpet & Kursi) */}
      {beritaAcaraChooser &&
        (activeCategory === 'kursi_studio' || activeCategory === 'karpet') && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    PILIH JENIS BERITA ACARA
                  </span>
                  <h3 className="text-sm font-extrabold uppercase mt-0.5">
                    {beritaAcaraChooser.displayName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBeritaAcaraChooser(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                {/* Ringkasan Status SOP kedua kategori */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-500 uppercase text-[10px]">
                      Status Karpet
                    </div>
                    <div
                      className={`font-extrabold mt-0.5 ${
                        beritaAcaraChooser.carpetStatus.status === 'overdue'
                          ? 'text-rose-600'
                          : beritaAcaraChooser.carpetStatus.status === 'warning'
                          ? 'text-amber-700'
                          : beritaAcaraChooser.carpetStatus.status === 'safe'
                          ? 'text-emerald-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {beritaAcaraChooser.carpetStatus.status === 'overdue'
                        ? `Lewat ${Math.abs(beritaAcaraChooser.carpetStatus.daysRemaining)} hari`
                        : beritaAcaraChooser.carpetStatus.status === 'warning' ||
                          beritaAcaraChooser.carpetStatus.status === 'safe'
                        ? `Sisa ${beritaAcaraChooser.carpetStatus.daysRemaining} hari`
                        : 'Belum ada riwayat'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-500 uppercase text-[10px]">
                      Status Kursi Studio
                    </div>
                    <div
                      className={`font-extrabold mt-0.5 ${
                        beritaAcaraChooser.chairStatus.status === 'overdue'
                          ? 'text-rose-600'
                          : beritaAcaraChooser.chairStatus.status === 'warning'
                          ? 'text-amber-700'
                          : beritaAcaraChooser.chairStatus.status === 'safe'
                          ? 'text-emerald-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {beritaAcaraChooser.chairStatus.status === 'overdue'
                        ? `Lewat ${Math.abs(beritaAcaraChooser.chairStatus.daysRemaining)} hari`
                        : beritaAcaraChooser.chairStatus.status === 'warning' ||
                          beritaAcaraChooser.chairStatus.status === 'safe'
                        ? `Sisa ${beritaAcaraChooser.chairStatus.daysRemaining} hari`
                        : 'Belum ada riwayat'}
                    </div>
                  </div>
                </div>

                {/* Pilihan 1: Tunggal sesuai tab aktif */}
                <button
                  type="button"
                  onClick={() => {
                    const target = beritaAcaraChooser;
                    const singleMode: BeritaAcaraMode = activeCategory;
                    const singleStatus =
                      activeCategory === 'karpet'
                        ? target.carpetStatus
                        : target.chairStatus;
                    setBeritaAcaraChooser(null);
                    setBeritaAcaraTarget({
                      outlet: target.outlet,
                      displayName: target.displayName,
                      computedStatus: singleStatus,
                      carpetStatus: target.carpetStatus,
                      chairStatus: target.chairStatus,
                      initialMode: singleMode,
                    });
                  }}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-900">
                      Berita Acara{' '}
                      {activeCategory === 'karpet' ? 'Karpet Saja' : 'Kursi Studio Saja'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Buat pengajuan pencucian khusus{' '}
                    {activeCategory === 'karpet' ? 'karpet outlet' : 'kursi studio'}.
                  </p>
                </button>

                {/* Pilihan 2: Berita Acara Gabungan (Karpet & Kursi) */}
                <button
                  type="button"
                  onClick={() => {
                    const target = beritaAcaraChooser;
                    const primaryStatus =
                      activeCategory === 'karpet'
                        ? target.carpetStatus
                        : target.chairStatus;
                    setBeritaAcaraChooser(null);
                    setBeritaAcaraTarget({
                      outlet: target.outlet,
                      displayName: target.displayName,
                      computedStatus: primaryStatus,
                      carpetStatus: target.carpetStatus,
                      chairStatus: target.chairStatus,
                      initialMode: 'gabungan',
                    });
                  }}
                  className="w-full text-left p-3.5 rounded-xl border-2 border-amber-400 bg-amber-50/80 hover:bg-amber-100/80 transition-colors cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-950">
                      Create Berita Acara Gabungan (Karpet &amp; Kursi)
                    </span>
                    <ChevronRight className="w-4 h-4 text-amber-700 shrink-0" />
                  </div>
                  <p className="text-[11px] text-amber-900/90 mt-0.5">
                    Gabungkan pengajuan pencucian karpet &amp; kursi studio dalam 1 surat lengkap dengan kolom <strong>Luas (m²)</strong> dan <strong>Jumlah Kursi</strong>.
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Modal Input Massal Khusus Submenu APAR */}
      {showBulkAparModal && activeCategory === 'apar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">
                    INPUT MASSAL DATA APAR PER OUTLET
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold mt-0.5">
                  Daftar Outlet, Jumlah APAR, Exp APAR &amp; Merk APAR
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkAparModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveBulkAparModal}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200/80 text-[11px] text-amber-900 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Isi langsung <strong>Jumlah APAR</strong>, <strong>Exp APAR</strong>, dan{' '}
                    <strong>Merk APAR</strong>. Status aman &amp; alarm H-30 dihitung dari sisa hari menuju <strong>Exp APAR</strong> terhitung dari hari ini.
                  </span>
                </div>
                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-amber-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={bulkAparSearch}
                    onChange={(e) => setBulkAparSearch(e.target.value)}
                    placeholder="Cari outlet di daftar..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <datalist id="apar-brand-presets">
                  <option value="Servvo" />
                  <option value="Gunnebo" />
                  <option value="Yamato" />
                  <option value="Chubb" />
                  <option value="GuardALL" />
                  <option value="Viking" />
                </datalist>

                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3">Nama Outlet</th>
                      <th className="py-2.5 px-3 w-32">Jumlah APAR</th>
                      <th className="py-2.5 px-3 w-44">Exp APAR</th>
                      <th className="py-2.5 px-3 w-48">Merk APAR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {bulkAparRows
                      .filter((r) =>
                        !bulkAparSearch.trim()
                          ? true
                          : r.displayName
                              .toLowerCase()
                              .includes(bulkAparSearch.trim().toLowerCase())
                      )
                      .map((row, idx) => (
                      <tr key={row.outletId} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 text-center font-bold text-slate-400 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-extrabold text-slate-800 uppercase">
                          {row.displayName}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min={0}
                            value={row.qty}
                            onChange={(e) =>
                              handleUpdateBulkAparRow(row.outletId, {
                                qty: e.target.value,
                              })
                            }
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 tabular-nums"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="date"
                            value={row.expDate}
                            onChange={(e) =>
                              handleUpdateBulkAparRow(row.outletId, {
                                expDate: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            list="apar-brand-presets"
                            value={row.brand}
                            onChange={(e) =>
                              handleUpdateBulkAparRow(row.outletId, {
                                brand: e.target.value,
                              })
                            }
                            placeholder="Servvo / Gunnebo..."
                            className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="text-[11px] font-semibold text-slate-600">
                  Total terisi:{' '}
                  <strong className="text-slate-900">
                    {
                      bulkAparRows.filter(
                        (r) =>
                          Number(r.qty) > 0 ||
                          r.expDate.trim() ||
                          r.brand.trim()
                      ).length
                    }
                  </strong>{' '}
                  / {bulkAparRows.length} outlet
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkAparModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-500 shadow-xs transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Semua Data APAR</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Berita Acara Pengajuan Pencucian Karpet / Kursi / Gabungan */}
      {beritaAcaraTarget &&
        (activeCategory === 'kursi_studio' || activeCategory === 'karpet') && (
          <BeritaAcaraModal
            isOpen={Boolean(beritaAcaraTarget)}
            onClose={() => setBeritaAcaraTarget(null)}
            outlet={beritaAcaraTarget.outlet}
            displayName={beritaAcaraTarget.displayName}
            category={activeCategory}
            computedStatus={beritaAcaraTarget.computedStatus}
            carpetStatus={beritaAcaraTarget.carpetStatus}
            chairStatus={beritaAcaraTarget.chairStatus}
            initialMode={beritaAcaraTarget.initialMode}
          />
        )}
    </div>
  );
};
