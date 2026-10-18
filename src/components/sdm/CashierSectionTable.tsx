import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { User, Employee, DailySectionSalesRecord } from '../../types';
import { StorageService } from '../../lib/storage';
import {
  LayoutGrid,
  Save,
  Download,
  CheckCircle2,
  UserCheck,
  Store,
  ShoppingBag,
  Truck,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Calendar,
  RefreshCw,
} from 'lucide-react';

interface CashierSectionTableProps {
  currentUser: User | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onNavigateToInput?: () => void;
}

const MONTH_NAMES = [
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

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const CashierSectionTable: React.FC<CashierSectionTableProps> = ({
  currentUser,
  selectedDate,
  onDateChange,
  onNavigateToInput,
}) => {
  const allOutlets = StorageService.getOutlets();
  const userAssignedAreaIds =
    currentUser?.role === 'area_manager'
      ? currentUser.assignedAreas && currentUser.assignedAreas.length > 0
        ? currentUser.assignedAreas
        : currentUser.areaId
        ? [currentUser.areaId]
        : []
      : null;

  const outlets =
    (currentUser?.role === 'manager' || currentUser?.role === 'cleaner') &&
    currentUser?.outletId
      ? allOutlets.filter((o) => o.id === currentUser.outletId)
      : userAssignedAreaIds && userAssignedAreaIds.length > 0
      ? allOutlets.filter((o) => userAssignedAreaIds.includes(o.areaId))
      : allOutlets;

  const isAdmin =
    currentUser?.role === 'admin' || currentUser?.role === 'area_manager';

  const defaultOutletId =
    currentUser?.outletId || (outlets.length > 0 ? outlets[0].id : '');
  const [selectedOutletId, setSelectedOutletId] = useState<string>(defaultOutletId);

  const parsedParts = selectedDate.split('-').map(Number);
  const [selectedYear, setSelectedYear] = useState<number>(
    parsedParts[0] || new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    parsedParts[1] || new Date().getMonth() + 1
  );

  // Daftar SDM Kasir untuk Dropdown Omset Cafe Box / Booth
  const [showAllDivisions, setShowAllDivisions] = useState<boolean>(false);
  const [cashierList, setCashierList] = useState<Employee[]>(() =>
    StorageService.getOutletCashiers(defaultOutletId)
  );

  // State input manual harian (1 kali per hari)
  const [cafeBoxCashierId, setCafeBoxCashierId] = useState<string>('');
  const [omsetCafeBox, setOmsetCafeBox] = useState<number>(0);
  const [omsetGerobak, setOmsetGerobak] = useState<number>(0);
  const [omsetDelivery, setOmsetDelivery] = useState<number>(0);
  const [omsetGofood, setOmsetGofood] = useState<number>(0);
  const [omsetGrabfood, setOmsetGrabfood] = useState<number>(0);
  const [omsetShopeefood, setOmsetShopeefood] = useState<number>(0);

  const [omsetCafeBoxStr, setOmsetCafeBoxStr] = useState<string>('0');
  const [omsetGerobakStr, setOmsetGerobakStr] = useState<string>('0');
  const [omsetDeliveryStr, setOmsetDeliveryStr] = useState<string>('0');
  const [omsetGofoodStr, setOmsetGofoodStr] = useState<string>('0');
  const [omsetGrabfoodStr, setOmsetGrabfoodStr] = useState<string>('0');
  const [omsetShopeefoodStr, setOmsetShopeefoodStr] = useState<string>('0');

  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  const [refreshTick, setRefreshTick] = useState<number>(0);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedOutlet =
    outlets.find((o) => o.id === selectedOutletId) || outlets[0];

  const formatDots = (val: number): string => {
    if (!val || val <= 0) return '0';
    return val.toLocaleString('id-ID');
  };

  // Refresh daftar kasir saat outlet atau filter divisi berubah
  useEffect(() => {
    const allEmp = StorageService.getEmployees().filter(
      (e) =>
        e.outletId === selectedOutletId &&
        e.statusKerja !== 'Resign' &&
        e.statusKerja !== 'Terminate'
    );
    const list = showAllDivisions
      ? allEmp
      : StorageService.getOutletCashiers(selectedOutletId);
    setCashierList(list);
  }, [selectedOutletId, showAllDivisions, refreshTick]);

  // Sinkronkan bulan & tahun saat selectedDate berubah
  useEffect(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    if (y && m) {
      setSelectedYear(y);
      setSelectedMonth(m);
    }
  }, [selectedDate]);

  // Muat data manual section untuk outlet & tanggal terpilih
  const loadSectionDataForDate = (outletId: string, dateStr: string) => {
    const rec = StorageService.getDailySectionSalesByOutletAndDate(
      outletId,
      dateStr
    );
    setCafeBoxCashierId(rec.cafeBoxCashierId || '');
    setOmsetCafeBox(rec.omsetCafeBox || 0);
    setOmsetGerobak(rec.omsetGerobak || 0);
    setOmsetDelivery(rec.omsetDelivery || 0);
    setOmsetGofood(rec.omsetGofood || 0);
    setOmsetGrabfood(rec.omsetGrabfood || 0);
    setOmsetShopeefood(rec.omsetShopeefood || 0);

    setOmsetCafeBoxStr(formatDots(rec.omsetCafeBox || 0));
    setOmsetGerobakStr(formatDots(rec.omsetGerobak || 0));
    setOmsetDeliveryStr(formatDots(rec.omsetDelivery || 0));
    setOmsetGofoodStr(formatDots(rec.omsetGofood || 0));
    setOmsetGrabfoodStr(formatDots(rec.omsetGrabfood || 0));
    setOmsetShopeefoodStr(formatDots(rec.omsetShopeefood || 0));
  };

  useEffect(() => {
    loadSectionDataForDate(selectedOutletId, selectedDate);
  }, [selectedOutletId, selectedDate, refreshTick]);

  // Dengarkan update real-time dari Input Sales Kasir atau Data Karyawan
  useEffect(() => {
    const handleUpdate = (e: any) => {
      const t = e.detail?.type;
      if (
        t === 'sdm-performance' ||
        t === 'sdm-section' ||
        t === 'employees' ||
        t === 'sales'
      ) {
        setRefreshTick((prev) => prev + 1);
      }
    };
    window.addEventListener('cinema-xxi-storage-update', handleUpdate);
    return () =>
      window.removeEventListener('cinema-xxi-storage-update', handleUpdate);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setShowToast(false), 3500);
  };

  const handleNumericInput = (
    rawValue: string,
    setNum: (n: number) => void,
    setStr: (s: string) => void
  ) => {
    const digits = rawValue.replace(/\D/g, '');
    const num = digits ? Number(digits) : 0;
    setNum(num);
    setStr(num ? num.toLocaleString('id-ID') : '');
  };

  // Ambil Omset Offline & Omset Molling otomatis untuk tanggal terpilih
  const todayAutoSales = StorageService.getAutoOfflineAndMollingByOutletAndDate(
    selectedOutletId,
    selectedDate
  );

  const totalTodayAllSections =
    todayAutoSales.totalOffline +
    omsetCafeBox +
    todayAutoSales.totalMolling +
    omsetGerobak +
    omsetDelivery +
    omsetGofood +
    omsetGrabfood +
    omsetShopeefood;

  const handleSaveDailySection = () => {
    const selectedEmp = StorageService.getEmployees().find(
      (e) => e.id === cafeBoxCashierId
    );
    const existingRec = StorageService.getDailySectionSalesByOutletAndDate(
      selectedOutletId,
      selectedDate
    );

    const recordToSave: DailySectionSalesRecord = {
      id: `${selectedOutletId}_${selectedDate}`,
      outletId: selectedOutletId,
      date: selectedDate,
      omsetCafeBox,
      cafeBoxCashierId: cafeBoxCashierId || '',
      cafeBoxCashierName: selectedEmp
        ? selectedEmp.name
        : cafeBoxCashierId
        ? existingRec.cafeBoxCashierName || ''
        : '',
      omsetGerobak,
      omsetDelivery,
      omsetGofood,
      omsetGrabfood,
      omsetShopeefood,
    };

    StorageService.saveDailySectionSales(recordToSave);
    setRefreshTick((prev) => prev + 1);
    triggerToast(
      `Data Tabel Section (${selectedOutlet?.name || ''}) tanggal ${selectedDate} berhasil disimpan!`
    );
  };

  // Bangun baris Tabel Rekap Harian 1 Bulan penuh (Tanggal 1 s/d akhir bulan)
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const allSectionRecords = StorageService.getDailySectionSalesAll();

  const monthlyRows = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(
      2,
      '0'
    )}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(selectedYear, selectedMonth - 1, day);
    const dayName = DAY_NAMES[dateObj.getDay()];
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

    const autoData = StorageService.getAutoOfflineAndMollingByOutletAndDate(
      selectedOutletId,
      dateStr
    );
    const manualRec = allSectionRecords.find(
      (r) => r.outletId === selectedOutletId && r.date === dateStr
    );

    const offline = autoData.totalOffline;
    const cafeBox = manualRec?.omsetCafeBox || 0;
    const cafeBoxCashierName = manualRec?.cafeBoxCashierName || '';
    const molling = autoData.totalMolling;
    const gerobak = manualRec?.omsetGerobak || 0;
    const delivery = manualRec?.omsetDelivery || 0;
    const gofood = manualRec?.omsetGofood || 0;
    const grabfood = manualRec?.omsetGrabfood || 0;
    const shopeefood = manualRec?.omsetShopeefood || 0;

    const totalRow =
      offline +
      cafeBox +
      molling +
      gerobak +
      delivery +
      gofood +
      grabfood +
      shopeefood;

    return {
      day,
      dateStr,
      dayName,
      isWeekend,
      offline,
      cafeBox,
      cafeBoxCashierName,
      molling,
      gerobak,
      delivery,
      gofood,
      grabfood,
      shopeefood,
      totalRow,
      cashierBreakdowns: autoData.cashierBreakdowns,
      hasData: totalRow > 0 || autoData.cashierBreakdowns.length > 0,
    };
  });

  // Total Akumulasi Bulanan per Section
  const monthTotals = monthlyRows.reduce(
    (acc, r) => ({
      offline: acc.offline + r.offline,
      cafeBox: acc.cafeBox + r.cafeBox,
      molling: acc.molling + r.molling,
      gerobak: acc.gerobak + r.gerobak,
      delivery: acc.delivery + r.delivery,
      gofood: acc.gofood + r.gofood,
      grabfood: acc.grabfood + r.grabfood,
      shopeefood: acc.shopeefood + r.shopeefood,
      grandTotal: acc.grandTotal + r.totalRow,
    }),
    {
      offline: 0,
      cafeBox: 0,
      molling: 0,
      gerobak: 0,
      delivery: 0,
      gofood: 0,
      grabfood: 0,
      shopeefood: 0,
      grandTotal: 0,
    }
  );

  const toggleExpandDate = (dateStr: string) => {
    setExpandedDates((prev) =>
      prev.includes(dateStr)
        ? prev.filter((d) => d !== dateStr)
        : [...prev, dateStr]
    );
  };

  const handleExportExcel = () => {
    const exportData = monthlyRows.map((r) => ({
      TANGGAL: r.dateStr,
      HARI: r.dayName,
      'OMSET OFFLINE (RP)': r.offline,
      'OMSET CAFE BOX / BOOTH (RP)': r.cafeBox,
      'KASIR CAFE BOX / BOOTH': r.cafeBoxCashierName || '-',
      'OMSET MOLLING (RP)': r.molling,
      'OMSET GEROBAK (RP)': r.gerobak,
      'OMSET DELIVERY (RP)': r.delivery,
      'OMSET GOFOOD (RP)': r.gofood,
      'OMSET GRABFOOD (RP)': r.grabfood,
      'OMSET SHOPEEFOOD (RP)': r.shopeefood,
      'TOTAL OMSET SECTION (RP)': r.totalRow,
    }));

    exportData.push({
      TANGGAL: 'TOTAL BULANAN',
      HARI: `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`,
      'OMSET OFFLINE (RP)': monthTotals.offline,
      'OMSET CAFE BOX / BOOTH (RP)': monthTotals.cafeBox,
      'KASIR CAFE BOX / BOOTH': '-',
      'OMSET MOLLING (RP)': monthTotals.molling,
      'OMSET GEROBAK (RP)': monthTotals.gerobak,
      'OMSET DELIVERY (RP)': monthTotals.delivery,
      'OMSET GOFOOD (RP)': monthTotals.gofood,
      'OMSET GRABFOOD (RP)': monthTotals.grabfood,
      'OMSET SHOPEEFOOD (RP)': monthTotals.shopeefood,
      'TOTAL OMSET SECTION (RP)': monthTotals.grandTotal,
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tabel Section');
    const safeOutlet = (selectedOutlet?.name || 'Outlet').replace(
      /[^a-zA-Z0-9]/g,
      '_'
    );
    XLSX.writeFile(
      wb,
      `Tabel_Section_${safeOutlet}_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Filter Card */}
      <div className="p-6 rounded-3xl border border-purple-200/90 bg-white text-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#581c87] to-[#7e22ce] text-[#FACC15] shadow-xs">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
                Performance SDM &bull; Tabel Section
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Rekapitulasi 8 Kategori Omset F&amp;B: <strong>Omset Offline &amp; Molling</strong> otomatis dari Input Sales Kasir + <strong>6 Section Input Manual Harian</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {/* Pilih Outlet */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                1. PILIH OUTLET {isAdmin ? '(SEMUA OUTLET)' : '(LOCKED)'}
              </label>
              <select
                value={selectedOutletId}
                disabled={!isAdmin}
                onChange={(e) => setSelectedOutletId(e.target.value)}
                className={`text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-2xs ${
                  !isAdmin ? 'opacity-80 cursor-not-allowed' : ''
                }`}
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Pilih Tanggal Input Harian */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                2. TANGGAL INPUT HARIAN
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-2xs"
              />
            </div>

            {/* Filter Bulan & Tahun Tabel */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                3. PERIODE REKAP BULANAN
              </label>
              <div className="flex items-center space-x-1.5">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800"
                >
                  {MONTH_NAMES.map((mName, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {mName}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800"
                >
                  {[2025, 2026, 2027].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Form Input Section Harian (1 Kali Per Hari) */}
      <div className="p-6 rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-lg bg-[#581c87] text-[#FACC15] font-black text-xs uppercase">
                Input Harian (1x / Hari)
              </span>
              <h3 className="text-base font-black uppercase text-slate-900">
                Form Omset Section &bull; {selectedOutlet?.name} ({selectedDate})
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              <strong>Omset Offline &amp; Omset Molling</strong> otomatis ditarik dari hasil <em>Input Sales Kasir (Show 1–5)</em>. Keenam omset lainnya diinput manual 1 kali per hari di bawah ini.
            </p>
          </div>

          {onNavigateToInput && (
            <button
              type="button"
              onClick={onNavigateToInput}
              className="px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 font-extrabold text-xs flex items-center space-x-1.5 transition cursor-pointer shrink-0"
            >
              <UserCheck className="w-4 h-4 text-purple-700" />
              <span>Buka Input Sales Kasir (Show 1–5)</span>
            </button>
          )}
        </div>

        {/* BARIS 1: 2 SECTION OTOMATIS DARI INPUT SALES KASIR (OFFLINE & MOLLING) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Omset Offline (Auto-Sync) */}
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Store className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-950">
                  1. OMSET OFFLINE (AUTO DARI INPUT SALES KASIR)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black">
                Auto-Sync Show 1–5
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-black text-emerald-800">
                Rp {todayAutoSales.totalOffline.toLocaleString('id-ID')}
              </span>
              <span className="text-[11px] font-semibold text-emerald-700">
                {todayAutoSales.cashierBreakdowns.filter((c) => c.offline > 0).length} Kasir Input Offline
              </span>
            </div>
            {todayAutoSales.cashierBreakdowns.filter((c) => c.offline > 0).length > 0 && (
              <div className="mt-2 pt-2 border-t border-emerald-200/70 flex flex-wrap gap-1.5">
                {todayAutoSales.cashierBreakdowns
                  .filter((c) => c.offline > 0)
                  .map((c) => (
                    <span
                      key={`off-${c.cashierId}`}
                      className="px-2 py-0.5 rounded bg-white border border-emerald-200 text-[10px] font-bold text-emerald-900"
                    >
                      {c.cashierName}: Rp {c.offline.toLocaleString('id-ID')}
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* 3. Omset Molling (Auto-Sync) */}
          <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-purple-700" />
                <span className="text-xs font-black uppercase tracking-wider text-purple-950">
                  3. OMSET MOLLING (AUTO DARI INPUT SALES KASIR)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300 text-[10px] font-black">
                Auto-Sync Show 1–5
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-black text-purple-900">
                Rp {todayAutoSales.totalMolling.toLocaleString('id-ID')}
              </span>
              <span className="text-[11px] font-semibold text-purple-700">
                {todayAutoSales.cashierBreakdowns.filter((c) => c.molling > 0).length} Kasir Input Molling
              </span>
            </div>
            {todayAutoSales.cashierBreakdowns.filter((c) => c.molling > 0).length > 0 && (
              <div className="mt-2 pt-2 border-t border-purple-200/70 flex flex-wrap gap-1.5">
                {todayAutoSales.cashierBreakdowns
                  .filter((c) => c.molling > 0)
                  .map((c) => (
                    <span
                      key={`mol-${c.cashierId}`}
                      className="px-2 py-0.5 rounded bg-white border border-purple-200 text-[10px] font-bold text-purple-900"
                    >
                      {c.cashierName}: Rp {c.molling.toLocaleString('id-ID')}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* BARIS 2: OMSET CAFE BOX / BOOTH (DENGAN DROPDOWN NAMA KASIR) */}
        <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50/40">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[11px]">
                Section #2
              </span>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                2. OMSET CAFE BOX / BOOTH (INPUT MANUAL + PILIH NAMA KASIR)
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowAllDivisions((prev) => !prev)}
              className="text-[10px] font-bold text-purple-700 hover:underline cursor-pointer"
            >
              {showAllDivisions
                ? 'Filter: Kasir / F&B / Spv / Guide'
                : 'Tampilkan Semua Divisi Karyawan'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                PILIH NAMA KASIR CAFE BOX / BOOTH
              </label>
              <select
                value={cafeBoxCashierId}
                onChange={(e) => setCafeBoxCashierId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white text-xs font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              >
                <option value="">-- Pilih Nama Kasir Cafe Box / Booth --</option>
                {cashierList.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {emp.jabatan} ({emp.nik})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                NOMINAL OMSET CAFE BOX / BOOTH (RP)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={omsetCafeBoxStr}
                onFocus={() => {
                  if (omsetCafeBoxStr === '0') setOmsetCafeBoxStr('');
                }}
                onBlur={() => {
                  if (!omsetCafeBoxStr) setOmsetCafeBoxStr('0');
                }}
                onChange={(e) =>
                  handleNumericInput(
                    e.target.value,
                    setOmsetCafeBox,
                    setOmsetCafeBoxStr
                  )
                }
                className="w-full px-4 py-2.5 rounded-xl border border-amber-300 bg-white text-slate-900 font-extrabold text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* BARIS 3: 5 SECTION INPUT MANUAL LAINNYA (GEROBAK, DELIVERY, GOFOOD, GRABFOOD, SHOPEEFOOD) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 4. Omset Gerobak */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              4. OMSET GEROBAK (RP)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={omsetGerobakStr}
              onFocus={() => {
                if (omsetGerobakStr === '0') setOmsetGerobakStr('');
              }}
              onBlur={() => {
                if (!omsetGerobakStr) setOmsetGerobakStr('0');
              }}
              onChange={(e) =>
                handleNumericInput(
                  e.target.value,
                  setOmsetGerobak,
                  setOmsetGerobakStr
                )
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-extrabold text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-400"
              placeholder="0"
            />
          </div>

          {/* 5. Omset Delivery */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              5. OMSET DELIVERY (RP)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={omsetDeliveryStr}
              onFocus={() => {
                if (omsetDeliveryStr === '0') setOmsetDeliveryStr('');
              }}
              onBlur={() => {
                if (!omsetDeliveryStr) setOmsetDeliveryStr('0');
              }}
              onChange={(e) =>
                handleNumericInput(
                  e.target.value,
                  setOmsetDelivery,
                  setOmsetDeliveryStr
                )
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-extrabold text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-400"
              placeholder="0"
            />
          </div>

          {/* 6. Omset GoFood */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1.5">
              6. OMSET GOFOOD (RP)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={omsetGofoodStr}
              onFocus={() => {
                if (omsetGofoodStr === '0') setOmsetGofoodStr('');
              }}
              onBlur={() => {
                if (!omsetGofoodStr) setOmsetGofoodStr('0');
              }}
              onChange={(e) =>
                handleNumericInput(
                  e.target.value,
                  setOmsetGofood,
                  setOmsetGofoodStr
                )
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-white text-slate-900 font-extrabold text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
              placeholder="0"
            />
          </div>

          {/* 7. Omset GrabFood */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-teal-800 mb-1.5">
              7. OMSET GRABFOOD (RP)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={omsetGrabfoodStr}
              onFocus={() => {
                if (omsetGrabfoodStr === '0') setOmsetGrabfoodStr('');
              }}
              onBlur={() => {
                if (!omsetGrabfoodStr) setOmsetGrabfoodStr('0');
              }}
              onChange={(e) =>
                handleNumericInput(
                  e.target.value,
                  setOmsetGrabfood,
                  setOmsetGrabfoodStr
                )
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-teal-300 bg-white text-slate-900 font-extrabold text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-400"
              placeholder="0"
            />
          </div>

          {/* 8. Omset ShopeeFood */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-orange-800 mb-1.5">
              8. OMSET SHOPEEFOOD (RP)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={omsetShopeefoodStr}
              onFocus={() => {
                if (omsetShopeefoodStr === '0') setOmsetShopeefoodStr('');
              }}
              onBlur={() => {
                if (!omsetShopeefoodStr) setOmsetShopeefoodStr('0');
              }}
              onChange={(e) =>
                handleNumericInput(
                  e.target.value,
                  setOmsetShopeefood,
                  setOmsetShopeefoodStr
                )
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-orange-300 bg-white text-slate-900 font-extrabold text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-400"
              placeholder="0"
            />
          </div>
        </div>

        {/* Footer Form Input Harian: Total & Tombol Simpan */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-purple-950 text-white">
              <span className="text-[10px] font-bold uppercase text-purple-200 block">
                TOTAL OMSET 8 SECTION ({selectedDate})
              </span>
              <span className="text-base font-black text-[#FACC15]">
                Rp {totalTodayAllSections.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveDailySection}
            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-md transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Data Section ({selectedDate})</span>
          </button>
        </div>
      </div>

      {/* Tabel Rekap Section Harian (1 Bulan Penuh: Tanggal 1 s/d 31) */}
      <div className="p-6 rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Tabel Rekap Section Harian &bull; {selectedOutlet?.name} (
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik panah kecil (<strong>▸/▾</strong>) pada tanggal untuk melihat rincian nama kasir Offline, Molling, &amp; Cafe Box/Booth. Klik baris tanggal untuk memilih dan mengedit tanggal tersebut.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 font-black uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 min-w-[165px]">Tanggal</th>
                <th className="py-3 px-3 text-right bg-emerald-50/80 text-emerald-950">
                  1. Omset Offline
                  <span className="block text-[9px] font-semibold text-emerald-700">
                    (Auto Sales)
                  </span>
                </th>
                <th className="py-3 px-3 text-right bg-amber-50/80 text-amber-950 min-w-[150px]">
                  2. Omset Cafe Box/Booth
                  <span className="block text-[9px] font-semibold text-amber-700">
                    (Manual + Kasir)
                  </span>
                </th>
                <th className="py-3 px-3 text-right bg-purple-50/80 text-purple-950">
                  3. Omset Molling
                  <span className="block text-[9px] font-semibold text-purple-700">
                    (Auto Sales)
                  </span>
                </th>
                <th className="py-3 px-3 text-right">4. Omset Gerobak</th>
                <th className="py-3 px-3 text-right">5. Omset Delivery</th>
                <th className="py-3 px-3 text-right text-emerald-800">
                  6. Omset GoFood
                </th>
                <th className="py-3 px-3 text-right text-teal-800">
                  7. Omset GrabFood
                </th>
                <th className="py-3 px-3 text-right text-orange-800">
                  8. Omset ShopeeFood
                </th>
                <th className="py-3 px-3 text-right bg-purple-950 text-[#FACC15]">
                  Total Section
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {monthlyRows.map((row) => {
                const isSelectedDate = row.dateStr === selectedDate;
                const isExpanded = expandedDates.includes(row.dateStr);
                const hasExpandableDetails =
                  row.cashierBreakdowns.length > 0 || Boolean(row.cafeBoxCashierName);

                return (
                  <React.Fragment key={row.dateStr}>
                    <tr
                      onClick={() => onDateChange(row.dateStr)}
                      className={`hover:bg-purple-50/50 transition-colors cursor-pointer ${
                        isSelectedDate
                          ? 'bg-purple-50/90 ring-1 ring-inset ring-purple-300'
                          : row.isWeekend
                          ? 'bg-amber-50/30'
                          : row.hasData
                          ? 'bg-white'
                          : 'bg-slate-50/40 text-slate-400'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-black text-slate-900">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandDate(row.dateStr);
                            }}
                            className="p-0.5 rounded hover:bg-slate-200 text-slate-500 cursor-pointer"
                            title="Klik untuk melihat rincian nama kasir pada tanggal ini"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-purple-700" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span>
                                {String(row.day).padStart(2, '0')}{' '}
                                {MONTH_NAMES[selectedMonth - 1].slice(0, 3)}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                  row.isWeekend
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {row.dayName}
                              </span>
                            </div>
                          </div>
                          {hasExpandableDetails && (
                            <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[9px] font-extrabold">
                              {row.cashierBreakdowns.length} Kasir
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 1. Omset Offline */}
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-800 bg-emerald-50/20">
                        Rp {row.offline.toLocaleString('id-ID')}
                      </td>

                      {/* 2. Omset Cafe Box / Booth + Nama Kasir */}
                      <td className="py-2.5 px-3 text-right bg-amber-50/20">
                        <div className="font-bold text-slate-900">
                          Rp {row.cafeBox.toLocaleString('id-ID')}
                        </div>
                        {row.cafeBoxCashierName && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-extrabold">
                            Kasir: {row.cafeBoxCashierName}
                          </span>
                        )}
                      </td>

                      {/* 3. Omset Molling */}
                      <td className="py-2.5 px-3 text-right font-bold text-purple-800 bg-purple-50/20">
                        Rp {row.molling.toLocaleString('id-ID')}
                      </td>

                      {/* 4. Omset Gerobak */}
                      <td className="py-2.5 px-3 text-right">
                        Rp {row.gerobak.toLocaleString('id-ID')}
                      </td>

                      {/* 5. Omset Delivery */}
                      <td className="py-2.5 px-3 text-right">
                        Rp {row.delivery.toLocaleString('id-ID')}
                      </td>

                      {/* 6. Omset GoFood */}
                      <td className="py-2.5 px-3 text-right text-emerald-700">
                        Rp {row.gofood.toLocaleString('id-ID')}
                      </td>

                      {/* 7. Omset GrabFood */}
                      <td className="py-2.5 px-3 text-right text-teal-700">
                        Rp {row.grabfood.toLocaleString('id-ID')}
                      </td>

                      {/* 8. Omset ShopeeFood */}
                      <td className="py-2.5 px-3 text-right text-orange-700">
                        Rp {row.shopeefood.toLocaleString('id-ID')}
                      </td>

                      {/* Total Harian */}
                      <td className="py-2.5 px-3 text-right font-black text-amber-900 bg-amber-50/70">
                        Rp {row.totalRow.toLocaleString('id-ID')}
                      </td>
                    </tr>

                    {/* Expandable Rincian Kasir Offline, Molling, & Cafe Box */}
                    {isExpanded && (
                      <tr className="bg-[#FAF5FF]/70 border-b border-purple-100">
                        <td colSpan={10} className="py-2.5 px-4 pl-10">
                          {row.cashierBreakdowns.length === 0 &&
                          !row.cafeBoxCashierName ? (
                            <span className="text-[11px] text-slate-400 italic">
                              ↳ Belum ada rincian kasir yang menginput Omset Offline / Molling / Cafe Box pada tanggal ini.
                            </span>
                          ) : (
                            <div className="space-y-1.5">
                              {row.cafeBoxCashierName && (
                                <div className="text-[11px] text-amber-900 font-bold flex items-center space-x-2">
                                  <span className="text-amber-600 font-mono">↳</span>
                                  <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-[10px] font-black">
                                    Cafe Box / Booth: {row.cafeBoxCashierName}
                                  </span>
                                  <span>
                                    Rp {row.cafeBox.toLocaleString('id-ID')}
                                  </span>
                                </div>
                              )}
                              {row.cashierBreakdowns.map((cb) => (
                                <div
                                  key={`${row.dateStr}-${cb.cashierId}`}
                                  className="text-[11px] text-slate-700 flex flex-wrap items-center gap-3"
                                >
                                  <span className="text-purple-600 font-mono">↳</span>
                                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-extrabold text-[10px]">
                                    {cb.cashierName} (Show {cb.showsFilled.join(', ')})
                                  </span>
                                  <span className="text-emerald-700 font-bold">
                                    Omset Offline: Rp {cb.offline.toLocaleString('id-ID')}
                                  </span>
                                  <span className="text-purple-800 font-bold">
                                    Omset Molling: Rp {cb.molling.toLocaleString('id-ID')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-purple-950 text-white font-black text-xs">
                <td className="py-3.5 px-3 uppercase">
                  TOTAL BULANAN ({MONTH_NAMES[selectedMonth - 1]})
                </td>
                <td className="py-3.5 px-3 text-right text-emerald-300">
                  Rp {monthTotals.offline.toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 px-3 text-right text-amber-300">
                  Rp {monthTotals.cafeBox.toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 px-3 text-right text-purple-200">
                  Rp {monthTotals.molling.toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 px-3 text-right">
                  Rp {monthTotals.gerobak.toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 px-3 text-right">
                  Rp {monthTotals.delivery.toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 px-3 text-right text-emerald-300">
                  Rp {monthTotals.gofood.toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 px-3 text-right text-teal-300">
                  Rp {monthTotals.grabfood.toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 px-3 text-right text-orange-300">
                  Rp {monthTotals.shopeefood.toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 px-3 text-right bg-amber-500 text-slate-950">
                  Rp {monthTotals.grandTotal.toLocaleString('id-ID')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-3 px-5 py-3.5 rounded-2xl bg-purple-950 text-white border border-amber-400/60 shadow-xl">
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
