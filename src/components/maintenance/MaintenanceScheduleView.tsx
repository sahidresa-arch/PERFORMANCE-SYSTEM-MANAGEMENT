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
} from 'lucide-react';
import {
  User,
  Outlet,
  MaintenanceCategory,
  MaintenanceMonthEntry,
  MaintenanceScheduleRecord,
} from '../../types';
import { StorageService } from '../../lib/storage';

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

function formatOutletDisplayName(outlet: Outlet): string {
  const raw = (outlet.name || '').trim().toUpperCase();
  if (outlet.id === 'btm-xxi' || raw === 'CAFE BTM XXI') {
    return 'DELUXE BTM XXI BOGOR';
  }
  if (raw.startsWith('CAFE ')) {
    return raw.replace(/^CAFE\s+/i, 'DELUXE ');
  }
  return raw;
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
  }
}

function getAlarmThresholdDays(category: MaintenanceCategory): number {
  if (category === 'filter_sediment') return 7; // Alarm 7 hari sebelum expired (siklus 30 hari)
  if (category === 'lampu_uv') return 21; // Alarm 21 hari sebelum expired (siklus 365 hari)
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
}

export const MaintenanceScheduleView: React.FC<MaintenanceScheduleViewProps> = ({
  currentUser,
  activeMenu,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [filterAirTab, setFilterAirTab] = useState<'filter_fluux' | 'filter_sediment'>('filter_fluux');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<SopStatusType | 'all'>('all');

  const [outlets, setOutlets] = useState<Outlet[]>(() => StorageService.getOutlets());
  const [records, setRecords] = useState<MaintenanceScheduleRecord[]>(() =>
    StorageService.getMaintenanceRecords()
  );

  // Modal Input/Edit Bulan
  const [activeCellModal, setActiveCellModal] = useState<{
    outlet: Outlet;
    displayName: string;
    outletClass: 'A' | 'B' | 'C';
    month: number; // 1..12
    existingEntry: MaintenanceMonthEntry | null;
  } | null>(null);

  const [formDate, setFormDate] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formExpDate, setFormExpDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Modal Input/Edit Keterangan
  const [activeKeteranganModal, setActiveKeteranganModal] = useState<{
    outlet: Outlet;
    displayName: string;
    currentKeterangan: string;
  } | null>(null);
  const [keteranganText, setKeteranganText] = useState('');

  // Determine active category from activeMenu & sub-tab
  const activeCategory: MaintenanceCategory = useMemo(() => {
    if (activeMenu === 'maintenance_kursi') return 'kursi_studio';
    if (activeMenu === 'maintenance_karpet') return 'karpet';
    if (activeMenu === 'maintenance_filter_air') return filterAirTab;
    if (activeMenu === 'maintenance_lampu_uv') return 'lampu_uv';
    return 'kursi_studio';
  }, [activeMenu, filterAirTab]);

  // Reset pagination & status filter when switching submenu/category
  useEffect(() => {
    setCurrentPage(1);
    setStatusFilter('all');
  }, [activeCategory, selectedYear, searchQuery, pageSize]);

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
          qtyLabel: 'Jumlah Studio / Area Karpet (Opsional)',
          qtyPlaceholder: 'Contoh: 6',
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
    }
  }, [activeCategory, selectedYear]);

  // Filter outlets by user role and sort alphabetically by displayName (matching screenshot)
  const visibleOutlets = useMemo(() => {
    let list = outlets.filter((o) => {
      if (currentUser.role === 'outlet' && currentUser.outletId) {
        return o.id === currentUser.outletId;
      }
      if (currentUser.role === 'area' && currentUser.areaId) {
        return o.areaId === currentUser.areaId;
      }
      return true;
    });

    return list
      .map((outlet) => ({
        outlet,
        displayName: formatOutletDisplayName(outlet),
        outletClass: getOutletClass(outlet),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [outlets, currentUser]);

  // Compute status & monthly schedule per outlet
  const todayStr = getTodayDateStr();

  const outletRows = useMemo(() => {
    const threshold = getAlarmThresholdDays(activeCategory);

    return visibleOutlets.map(({ outlet, displayName, outletClass }) => {
      const sopDays = getSopDays(activeCategory, outletClass);

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

      // Find latest entry across all records of this outlet & category (prioritizing selectedYear and historical years)
      const allCategoryRecords = records.filter(
        (r) => r.outletId === outlet.id && r.category === activeCategory
      );

      let latestEntry: MaintenanceMonthEntry | null = null;
      allCategoryRecords.forEach((rec) => {
        Object.values(rec.months || {}).forEach((entry) => {
          if (entry && entry.date) {
            if (!latestEntry || entry.date >= latestEntry.date) {
              latestEntry = entry;
            }
          }
        });
      });

      let computedStatus: ComputedOutletMaintenanceStatus;
      if (!latestEntry || !(latestEntry as MaintenanceMonthEntry).date) {
        computedStatus = {
          status: 'empty',
          lastDate: null,
          expDate: null,
          sopDays,
          daysRemaining: 0,
          daysElapsed: 0,
          latestMonthEntry: null,
        };
      } else {
        const validEntry = latestEntry as MaintenanceMonthEntry;
        const lastDate = validEntry.date;
        const expDate =
          validEntry.customExpiryDate && validEntry.customExpiryDate.trim()
            ? validEntry.customExpiryDate.trim()
            : addDaysToDateString(lastDate, sopDays);
        const daysRemaining = diffDaysBetween(todayStr, expDate);
        const daysElapsed = diffDaysBetween(lastDate, todayStr);

        let status: SopStatusType = 'safe';
        if (daysRemaining < 0) {
          status = 'overdue';
        } else if (daysRemaining <= threshold) {
          status = 'warning';
        }

        computedStatus = {
          status,
          lastDate,
          expDate,
          sopDays,
          daysRemaining,
          daysElapsed,
          latestMonthEntry: validEntry,
        };
      }

      return {
        outlet,
        displayName,
        outletClass,
        yearRecord: currentYearRec,
        computedStatus,
      };
    });
  }, [visibleOutlets, records, activeCategory, selectedYear, todayStr]);

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

  // Apply search & status filter
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return outletRows.filter((row) => {
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
  }, [outletRows, searchQuery, statusFilter]);

  // Pagination
  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + pageSize);

  // Open cell modal
  const handleOpenCellModal = (
    outlet: Outlet,
    displayName: string,
    outletClass: 'A' | 'B' | 'C',
    month: number,
    existingEntry: MaintenanceMonthEntry | null
  ) => {
    const sopDays = getSopDays(activeCategory, outletClass);
    const defaultMonthStr = String(month).padStart(2, '0');
    const defaultDate =
      existingEntry?.date || `${selectedYear}-${defaultMonthStr}-01`;
    const defaultExp =
      existingEntry?.customExpiryDate || addDaysToDateString(defaultDate, sopDays);
    const defaultChairs =
      activeCategory === 'kursi_studio' ? getOutletTotalChairs(outlet) : 0;

    setFormDate(defaultDate);
    setFormQty(
      existingEntry?.quantity !== undefined && existingEntry.quantity > 0
        ? String(existingEntry.quantity)
        : defaultChairs > 0
        ? String(defaultChairs)
        : ''
    );
    setFormExpDate(defaultExp);
    setFormNotes(existingEntry?.notes || '');
    setActiveCellModal({
      outlet,
      displayName,
      outletClass,
      month,
      existingEntry,
    });
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
    if (!activeCellModal || !formDate) return;

    const parsedQty = formQty.trim() ? Number(formQty.trim()) : undefined;
    const entry: MaintenanceMonthEntry = {
      date: formDate,
      quantity: parsedQty && !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : undefined,
      customExpiryDate: formExpDate.trim() || undefined,
      notes: formNotes.trim() || undefined,
      updatedBy: currentUser.name,
      updatedAt: new Date().toISOString(),
    };

    const updated = StorageService.saveMaintenanceMonthEntry(
      activeCellModal.outlet.id,
      activeCategory,
      selectedYear,
      activeCellModal.month,
      entry
    );
    setRecords(updated);
    setActiveCellModal(null);
  };

  const handleDeleteCellEntry = () => {
    if (!activeCellModal) return;
    const updated = StorageService.saveMaintenanceMonthEntry(
      activeCellModal.outlet.id,
      activeCategory,
      selectedYear,
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
      {/* Top Bar: Tahun Berjalan & Status Legends */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs px-4 py-3 flex flex-wrap items-center justify-between gap-3">
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

            {/* Search & Row Limit Controls */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
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
                  <option value={50}>Semua ({visibleOutlets.length})</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1180px]">
            <thead>
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
            </thead>
            <tbody className="divide-y divide-slate-200/90 text-xs">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={16}
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    Tidak ada outlet yang sesuai dengan pencarian / filter status.
                  </td>
                </tr>
              ) : (
                paginatedRows.map(
                  ({ outlet, displayName, outletClass, yearRecord, computedStatus }) => {
                    const { status, lastDate, expDate, daysRemaining } = computedStatus;

                    return (
                      <tr
                        key={outlet.id}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
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

                        {/* SOP ALARM & STATUS */}
                        <td className="py-3 px-2.5 text-center align-middle border-r border-slate-200/90">
                          {status === 'empty' && (
                            <span className="inline-flex items-center justify-center px-3.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-400 border border-slate-200/80 w-full max-w-[165px]">
                              Belum ada riwayat
                            </span>
                          )}

                          {status === 'overdue' && (
                            <div
                              title={`Jadwal terakhir: ${lastDate} | Batas SOP: ${expDate} (Terlewat ${Math.abs(
                                daysRemaining
                              )} hari)`}
                              className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs w-full max-w-[175px] truncate"
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                              <span className="truncate">
                                🚨 {categoryMeta.actionOverdue} (Lewat{' '}
                                {Math.abs(daysRemaining)} hr)
                              </span>
                            </div>
                          )}

                          {status === 'warning' && (
                            <div
                              title={`Jadwal terakhir: ${lastDate} | Jatuh tempo: ${expDate} (Sisa ${daysRemaining} hari lagi)`}
                              className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs w-full max-w-[175px] truncate animate-pulse"
                            >
                              <Bell className="w-3 h-3 text-amber-600 shrink-0" />
                              <span className="truncate">
                                🔔 {categoryMeta.actionWarning} (Sisa {daysRemaining} hr)
                              </span>
                            </div>
                          )}

                          {status === 'safe' && (
                            <div
                              title={`Jadwal terakhir: ${lastDate} | Jatuh tempo berikutnya: ${expDate} (Sisa ${daysRemaining} hari)`}
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
                        <td className="py-3 px-2.5 text-center align-middle">
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

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`w-7 h-7 rounded-lg text-xs font-extrabold flex items-center justify-center transition-colors cursor-pointer ${
                  safePage === pageNum
                    ? 'bg-[#F59E0B] text-white shadow-2xs'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {pageNum}
              </button>
            ))}

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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-400 text-slate-950 uppercase">
                    KELAS {activeCellModal.outletClass}
                  </span>
                  <span className="text-xs font-bold text-amber-300">
                    {MONTH_FULL_NAMES[activeCellModal.month - 1]} {selectedYear}
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

            <form onSubmit={handleSaveCellEntry} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-[11px] text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Standar Siklus SOP: </span>
                  <span>
                    {getSopDays(activeCategory, activeCellModal.outletClass)} Hari
                  </span>
                  <p className="text-[10px] text-amber-700 mt-0.5">
                    Sistem akan memberikan alarm pengingat otomatis ketika mendekati atau melewati tanggal jatuh tempo / expired.
                  </p>
                </div>
              </div>

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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Expired / Jadwal Berikutnya (SOP)
                </label>
                <input
                  type="date"
                  value={formExpDate}
                  onChange={(e) => setFormExpDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Terisi otomatis +{getSopDays(activeCategory, activeCellModal.outletClass)} hari dari tanggal pelaksanaan (dapat disesuaikan manual).
                </p>
              </div>

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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Bulan Ini (Opsional)
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
                    <span>Simpan Jadwal</span>
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
                  Keterangan Outlet ({selectedYear})
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
    </div>
  );
};
