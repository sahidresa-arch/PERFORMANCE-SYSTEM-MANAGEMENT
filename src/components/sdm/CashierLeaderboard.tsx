import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { User, Employee, Outlet } from '../../types';
import { StorageService } from '../../lib/storage';
import {
  Award,
  Trophy,
  TrendingUp,
  Zap,
  ShoppingBag,
  Users,
  Search,
  Download,
  Calendar,
  Filter,
  Crown,
  Medal,
  Star,
  ChevronRight,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface CashierLeaderboardProps {
  currentUser: User | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onNavigateToInput?: () => void;
}

type RankingCriteria = 'head' | 'achievement' | 'daya_serap' | 'items';

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

export interface CashierAggregatedStats {
  cashier: Employee;
  outlet?: Outlet;
  targetHead: number;
  totalOmsetFnB: number;
  totalBill: number;
  totalPenonton: number;
  head: number;
  achievement: number;
  dayaSerap: number;
  at: number;
  totalItemsSold: number;
  filteredItemQty: number;
  itemBreakdown: Array<{ name: string; unit: string; category: string; qty: number }>;
  topItemName: string;
  topItemQty: number;
  daysActive: number;
}

export const CashierLeaderboard: React.FC<CashierLeaderboardProps> = ({
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

  const [selectedOutletId, setSelectedOutletId] = useState<string>(
    isAdmin ? 'ALL' : currentUser?.outletId || outlets[0]?.id || 'ALL'
  );
  const [periodMode, setPeriodMode] = useState<'daily' | 'monthly'>('monthly');

  const dateParts = selectedDate.split('-').map(Number);
  const [selectedYear, setSelectedYear] = useState<number>(
    dateParts[0] || new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    dateParts[1] || new Date().getMonth() + 1
  );

  // 4 Main Ranking Filter Criteria requested by User:
  // 'head' (Head Tertinggi) | 'achievement' (Achievement Tertinggi) | 'daya_serap' (Daya Serap Tertinggi) | 'items' (Item Produk Terbanyak)
  const [rankingBy, setRankingBy] = useState<RankingCriteria>('head');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshTick, setRefreshTick] = useState<number>(0);
  const [detailModalCashier, setDetailModalCashier] =
    useState<CashierAggregatedStats | null>(null);

  useEffect(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    if (y && m) {
      setSelectedYear(y);
      setSelectedMonth(m);
    }
  }, [selectedDate]);

  useEffect(() => {
    const handleStorage = (e: any) => {
      const t = e.detail?.type;
      if (
        !t ||
        t === 'employees' ||
        t === 'sales' ||
        t === 'sdm-performance' ||
        t === 'sdm-products'
      ) {
        setRefreshTick((prev) => prev + 1);
      }
    };
    window.addEventListener('cinema-xxi-storage-update', handleStorage);
    return () =>
      window.removeEventListener('cinema-xxi-storage-update', handleStorage);
  }, []);

  // Kumpulkan semua nama item produk unik dari seluruh tabel Excel kasir untuk dropdown filter per item
  const allUniqueProductNames = useMemo(() => {
    const allMonthly = StorageService.getCashierMonthlyProductsAll();
    const nameSet = new Set<string>();
    StorageService.getDefaultCashierProductItems().forEach((it) =>
      nameSet.add(it.name)
    );
    allMonthly.forEach((rec) => {
      (rec.items || []).forEach((it) => {
        if (it.name) nameSet.add(it.name.trim());
      });
    });
    return Array.from(nameSet).sort((a, b) => a.localeCompare(b));
  }, [refreshTick]);

  // Hitung agregasi performa seluruh kasir berdasarkan filter Outlet & Periode (Harian / Bulanan)
  const cashierStatsList: CashierAggregatedStats[] = useMemo(() => {
    const cashiers = StorageService.getOutletCashiers(selectedOutletId);
    const allDailyPerf = StorageService.getCashierDailyPerformanceAll();
    const allMonthlyProd = StorageService.getCashierMonthlyProductsAll();
    const allOutletSales = StorageService.getDailySales();

    const targetDayNum = Number(selectedDate.split('-')[2] || 1);

    return cashiers.map((emp) => {
      const outlet = allOutlets.find((o) => o.id === emp.outletId);
      const targetHead = outlet?.targetHead || 0;

      // Filter record 5-show kasir sesuai periode
      const empDailyRecords = allDailyPerf.filter((r) => {
        if (r.cashierId !== emp.id || r.outletId !== emp.outletId) return false;
        if (periodMode === 'daily') {
          return r.date === selectedDate;
        } else {
          const [ry, rm] = r.date.split('-').map(Number);
          return ry === selectedYear && rm === selectedMonth;
        }
      });

      let totalOmsetFnB = 0;
      let totalBill = 0;
      let totalPenonton = 0;
      let daysActive = 0;

      empDailyRecords.forEach((rec) => {
        const filledShows = (rec.shows || []).filter(
          (s) => s.isFilled || s.omsetFnB > 0 || s.bill > 0
        );
        if (filledShows.length > 0) {
          daysActive++;
          const outletSaleOnDate = allOutletSales.find(
            (os) => os.outletId === rec.outletId && os.date === rec.date
          );

          filledShows.forEach((s) => {
            const outletShow = outletSaleOnDate?.shows?.find(
              (os) => os.showNumber === s.showNumber
            );
            const effectivePenonton =
              outletShow && outletShow.penonton > 0
                ? outletShow.penonton
                : s.penonton || 0;

            totalOmsetFnB += s.omsetFnB || 0;
            totalBill += s.bill || 0;
            totalPenonton += effectivePenonton;
          });
        }
      });

      const head = totalPenonton > 0 ? totalOmsetFnB / totalPenonton : 0;
      const achievement =
        targetHead > 0 && head > 0 ? (head / targetHead) * 100 : 0;
      const dayaSerap =
        totalPenonton > 0 ? (totalBill / totalPenonton) * 100 : 0;
      const at = totalBill > 0 ? totalOmsetFnB / totalBill : 0;

      // Hitung penjualan item produk dari Tabel Excel Kasir
      const prodRec = allMonthlyProd.find(
        (p) =>
          p.outletId === emp.outletId &&
          p.cashierId === emp.id &&
          p.year === selectedYear &&
          p.month === selectedMonth
      );

      const itemBreakdown: Array<{
        name: string;
        unit: string;
        category: string;
        qty: number;
      }> = [];
      let totalItemsSold = 0;
      let filteredItemQty = 0;

      if (prodRec && Array.isArray(prodRec.items)) {
        prodRec.items.forEach((item) => {
          let qty = 0;
          if (periodMode === 'daily') {
            qty = prodRec.dailySales?.[targetDayNum]?.[item.id] || 0;
          } else {
            Object.values(prodRec.dailySales || {}).forEach((dayMap) => {
              qty += dayMap?.[item.id] || 0;
            });
          }

          if (qty > 0) {
            itemBreakdown.push({
              name: item.name,
              unit: item.unit || 'PCS',
              category: item.category || 'F&B Cafe',
              qty,
            });
          }
          totalItemsSold += qty;

          if (
            selectedProductFilter === 'ALL' ||
            item.name.trim().toLowerCase() ===
              selectedProductFilter.trim().toLowerCase()
          ) {
            filteredItemQty += qty;
          }
        });
      }

      itemBreakdown.sort((a, b) => b.qty - a.qty);
      const topItem = itemBreakdown[0];

      return {
        cashier: emp,
        outlet,
        targetHead,
        totalOmsetFnB,
        totalBill,
        totalPenonton,
        head,
        achievement,
        dayaSerap,
        at,
        totalItemsSold,
        filteredItemQty,
        itemBreakdown,
        topItemName: topItem ? topItem.name : '-',
        topItemQty: topItem ? topItem.qty : 0,
        daysActive,
      };
    });
  }, [
    selectedOutletId,
    periodMode,
    selectedDate,
    selectedYear,
    selectedMonth,
    selectedProductFilter,
    refreshTick,
  ]);

  // Filter berdasarkan pencarian nama/NIK/outlet & urutkan sesuai kriteria aktif
  const sortedCashiers = useMemo(() => {
    const filtered = cashierStatsList.filter((st) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        st.cashier.name.toLowerCase().includes(q) ||
        st.cashier.nik.toLowerCase().includes(q) ||
        (st.outlet?.name || '').toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      if (rankingBy === 'head') return b.head - a.head;
      if (rankingBy === 'achievement') return b.achievement - a.achievement;
      if (rankingBy === 'daya_serap') return b.dayaSerap - a.dayaSerap;
      if (rankingBy === 'items') return b.filteredItemQty - a.filteredItemQty;
      return 0;
    });
  }, [cashierStatsList, searchQuery, rankingBy]);

  // Top Champions di masing-masing dari 4 kategori utama
  const topHeadChampion = useMemo(
    () => [...cashierStatsList].sort((a, b) => b.head - a.head)[0] || null,
    [cashierStatsList]
  );
  const topAchievementChampion = useMemo(
    () =>
      [...cashierStatsList].sort((a, b) => b.achievement - a.achievement)[0] ||
      null,
    [cashierStatsList]
  );
  const topDayaSerapChampion = useMemo(
    () =>
      [...cashierStatsList].sort((a, b) => b.dayaSerap - a.dayaSerap)[0] ||
      null,
    [cashierStatsList]
  );
  const topItemChampion = useMemo(
    () =>
      [...cashierStatsList].sort(
        (a, b) => b.filteredItemQty - a.filteredItemQty
      )[0] || null,
    [cashierStatsList]
  );

  const handleExportLeaderboardExcel = () => {
    const rows = sortedCashiers.map((st, idx) => ({
      PERINGKAT: idx + 1,
      'NAMA KASIR': st.cashier.name,
      NIK: st.cashier.nik,
      JABATAN: st.cashier.jabatan,
      OUTLET: st.outlet?.name || '-',
      'OMSET F&B (RP)': st.totalOmsetFnB,
      'TOTAL BILL': st.totalBill,
      'PENONTON OUTLET': st.totalPenonton,
      'HEAD / SPH (RP)': Math.round(st.head),
      'TARGET HEAD (RP)': st.targetHead,
      'ACHIEVEMENT (%)': Number(st.achievement.toFixed(1)),
      'DAYA SERAP (%)': Number(st.dayaSerap.toFixed(1)),
      'AVG TRANSAKSI (RP)': Math.round(st.at),
      'TOTAL ITEM PRODUK': st.totalItemsSold,
      'ITEM TERLARIS KASIR':
        st.topItemQty > 0 ? `${st.topItemName} (${st.topItemQty})` : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ranking Performance SDM');
    XLSX.writeFile(
      wb,
      `Ranking_Performance_SDM_Kasir_${
        periodMode === 'daily'
          ? selectedDate
          : `${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}`
      }.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl border border-purple-200/90 bg-white text-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#581c87] to-[#4c1d95] text-[#FACC15] shadow-sm">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
                Performance SDM &bull; Leaderboard &amp; Ranking Kasir
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluasi &amp; Filter Kasir Terbaik Berdasarkan <strong>Head Tertinggi</strong>,{' '}
                <strong>Achievement Tertinggi</strong>, <strong>Daya Serap Tertinggi</strong>, hingga{' '}
                <strong>Item Produk Terbanyak</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Period Switcher */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setPeriodMode('daily')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition cursor-pointer ${
                  periodMode === 'daily'
                    ? 'bg-[#581c87] text-[#FACC15] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Harian
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition cursor-pointer ${
                  periodMode === 'monthly'
                    ? 'bg-[#581c87] text-[#FACC15] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bulanan
              </button>
            </div>

            {periodMode === 'daily' ? (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800"
              />
            ) : (
              <>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800"
                >
                  {[2025, 2026, 2027].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* Outlet Filter */}
            <select
              value={selectedOutletId}
              disabled={!isAdmin}
              onChange={(e) => setSelectedOutletId(e.target.value)}
              className="text-xs font-black px-3.5 py-2 rounded-xl border border-purple-300 bg-purple-50/60 text-purple-950"
            >
              {isAdmin && <option value="ALL">Semua Outlet XXI</option>}
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleExportLeaderboardExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Ranking</span>
            </button>
          </div>
        </div>

        {/* 4 MAIN FILTER TABS (HEAD TERTINGGI, ACHIEVEMENT TERTINGGI, DAYA SERAP TERTINGGI, ITEM PRODUK TERBANYAK) */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-900 flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5" />
              <span>FILTER URUTAN PERINGKAT KASIR TERBAIK:</span>
            </span>

            {/* Jika filter Item Produk aktif, tampilkan filter spesifik nama item */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-slate-600">
                Filter Spesifik Item Produk:
              </span>
              <select
                value={selectedProductFilter}
                onChange={(e) => {
                  setSelectedProductFilter(e.target.value);
                  setRankingBy('items');
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50/70 text-amber-950"
              >
                <option value="ALL">Semua Item Produk (Total Keseluruhan)</option>
                {allUniqueProductNames.map((prodName) => (
                  <option key={prodName} value={prodName}>
                    Item: {prodName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Filter Head Tertinggi */}
            <button
              type="button"
              onClick={() => setRankingBy('head')}
              className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                rankingBy === 'head'
                  ? 'bg-gradient-to-br from-[#581c87] to-[#3b0764] text-white border-amber-400 shadow-md scale-[1.01]'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-purple-300 hover:bg-purple-50/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                    rankingBy === 'head'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  1. Head (SPH) Tertinggi
                </span>
                <Crown
                  className={`w-5 h-5 ${
                    rankingBy === 'head' ? 'text-amber-400' : 'text-amber-500'
                  }`}
                />
              </div>
              <div className="mt-3">
                <div className="text-sm font-black truncate">
                  {topHeadChampion && topHeadChampion.head > 0
                    ? topHeadChampion.cashier.name
                    : 'Belum Ada Data'}
                </div>
                <div
                  className={`text-lg font-black mt-0.5 ${
                    rankingBy === 'head' ? 'text-amber-300' : 'text-amber-700'
                  }`}
                >
                  Rp{' '}
                  {topHeadChampion
                    ? Math.round(topHeadChampion.head).toLocaleString('id-ID')
                    : 0}
                </div>
                <div
                  className={`text-[10px] mt-0.5 truncate ${
                    rankingBy === 'head' ? 'text-purple-200' : 'text-slate-500'
                  }`}
                >
                  {topHeadChampion?.outlet?.name || '-'}
                </div>
              </div>
            </button>

            {/* 2. Filter Achievement Tertinggi */}
            <button
              type="button"
              onClick={() => setRankingBy('achievement')}
              className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                rankingBy === 'achievement'
                  ? 'bg-gradient-to-br from-[#581c87] to-[#3b0764] text-white border-amber-400 shadow-md scale-[1.01]'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-purple-300 hover:bg-purple-50/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                    rankingBy === 'achievement'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-emerald-100 text-emerald-900'
                  }`}
                >
                  2. Achievement Tertinggi
                </span>
                <TrendingUp
                  className={`w-5 h-5 ${
                    rankingBy === 'achievement'
                      ? 'text-amber-400'
                      : 'text-emerald-600'
                  }`}
                />
              </div>
              <div className="mt-3">
                <div className="text-sm font-black truncate">
                  {topAchievementChampion &&
                  topAchievementChampion.achievement > 0
                    ? topAchievementChampion.cashier.name
                    : 'Belum Ada Data'}
                </div>
                <div
                  className={`text-lg font-black mt-0.5 ${
                    rankingBy === 'achievement'
                      ? 'text-emerald-300'
                      : 'text-emerald-700'
                  }`}
                >
                  {topAchievementChampion
                    ? topAchievementChampion.achievement.toFixed(1)
                    : '0.0'}
                  %
                </div>
                <div
                  className={`text-[10px] mt-0.5 truncate ${
                    rankingBy === 'achievement'
                      ? 'text-purple-200'
                      : 'text-slate-500'
                  }`}
                >
                  vs Target Head Rp{' '}
                  {(topAchievementChampion?.targetHead || 0).toLocaleString(
                    'id-ID'
                  )}
                </div>
              </div>
            </button>

            {/* 3. Filter Daya Serap Tertinggi */}
            <button
              type="button"
              onClick={() => setRankingBy('daya_serap')}
              className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                rankingBy === 'daya_serap'
                  ? 'bg-gradient-to-br from-[#581c87] to-[#3b0764] text-white border-amber-400 shadow-md scale-[1.01]'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-purple-300 hover:bg-purple-50/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                    rankingBy === 'daya_serap'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-purple-100 text-purple-900'
                  }`}
                >
                  3. Daya Serap Tertinggi
                </span>
                <Zap
                  className={`w-5 h-5 ${
                    rankingBy === 'daya_serap'
                      ? 'text-amber-400'
                      : 'text-purple-600'
                  }`}
                />
              </div>
              <div className="mt-3">
                <div className="text-sm font-black truncate">
                  {topDayaSerapChampion && topDayaSerapChampion.dayaSerap > 0
                    ? topDayaSerapChampion.cashier.name
                    : 'Belum Ada Data'}
                </div>
                <div
                  className={`text-lg font-black mt-0.5 ${
                    rankingBy === 'daya_serap'
                      ? 'text-amber-300'
                      : 'text-purple-800'
                  }`}
                >
                  {topDayaSerapChampion
                    ? topDayaSerapChampion.dayaSerap.toFixed(1)
                    : '0.0'}
                  %
                </div>
                <div
                  className={`text-[10px] mt-0.5 truncate ${
                    rankingBy === 'daya_serap'
                      ? 'text-purple-200'
                      : 'text-slate-500'
                  }`}
                >
                  Rasio Bill / Penonton Outlet
                </div>
              </div>
            </button>

            {/* 4. Filter Item Produk Terbanyak */}
            <button
              type="button"
              onClick={() => setRankingBy('items')}
              className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                rankingBy === 'items'
                  ? 'bg-gradient-to-br from-[#581c87] to-[#3b0764] text-white border-amber-400 shadow-md scale-[1.01]'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-purple-300 hover:bg-purple-50/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                    rankingBy === 'items'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  4. Item Produk Terbanyak
                </span>
                <ShoppingBag
                  className={`w-5 h-5 ${
                    rankingBy === 'items' ? 'text-amber-400' : 'text-amber-600'
                  }`}
                />
              </div>
              <div className="mt-3">
                <div className="text-sm font-black truncate">
                  {topItemChampion && topItemChampion.filteredItemQty > 0
                    ? topItemChampion.cashier.name
                    : 'Belum Ada Data'}
                </div>
                <div
                  className={`text-lg font-black mt-0.5 ${
                    rankingBy === 'items' ? 'text-amber-300' : 'text-amber-700'
                  }`}
                >
                  {(topItemChampion?.filteredItemQty || 0).toLocaleString(
                    'id-ID'
                  )}{' '}
                  Item
                </div>
                <div
                  className={`text-[10px] mt-0.5 truncate ${
                    rankingBy === 'items' ? 'text-purple-200' : 'text-slate-500'
                  }`}
                >
                  {selectedProductFilter === 'ALL'
                    ? `Top: ${topItemChampion?.topItemName || '-'}`
                    : `Filter: ${selectedProductFilter}`}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Peringkat Lengkap SDM Kasir */}
      <div className="p-6 rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black uppercase text-slate-900">
              Tabel Peringkat SDM Kasir ({sortedCashiers.length} Kasir)
            </h3>
            <p className="text-xs text-slate-500">
              Diurutkan berdasarkan:{' '}
              <strong className="text-purple-900 uppercase">
                {rankingBy === 'head'
                  ? 'Head (SPH) Tertinggi'
                  : rankingBy === 'achievement'
                  ? 'Achievement (%) Tertinggi'
                  : rankingBy === 'daya_serap'
                  ? 'Daya Serap (%) Tertinggi'
                  : `Item Produk Terbanyak (${
                      selectedProductFilter === 'ALL'
                        ? 'Semua Item'
                        : selectedProductFilter
                    })`}
              </strong>
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute inset-y-0 left-3 my-auto text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama kasir, NIK, atau outlet..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 outline-hidden focus:border-purple-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] border-b border-slate-200">
                <th className="py-3 px-3 text-center w-12">Rank</th>
                <th className="py-3 px-3">Nama SDM Kasir</th>
                <th className="py-3 px-3">Outlet</th>
                <th className="py-3 px-3 text-right">Omset F&amp;B</th>
                <th className="py-3 px-3 text-right">Bill</th>
                <th className="py-3 px-3 text-right">Penonton Outlet</th>
                <th
                  className={`py-3 px-3 text-right ${
                    rankingBy === 'head' ? 'bg-amber-100 text-amber-950' : ''
                  }`}
                >
                  Head / SPH (Rp)
                </th>
                <th
                  className={`py-3 px-3 text-right ${
                    rankingBy === 'achievement'
                      ? 'bg-emerald-100 text-emerald-950'
                      : ''
                  }`}
                >
                  Achievement (%)
                </th>
                <th
                  className={`py-3 px-3 text-right ${
                    rankingBy === 'daya_serap'
                      ? 'bg-purple-100 text-purple-950'
                      : ''
                  }`}
                >
                  Daya Serap (%)
                </th>
                <th
                  className={`py-3 px-3 text-right ${
                    rankingBy === 'items' ? 'bg-amber-100 text-amber-950' : ''
                  }`}
                >
                  {selectedProductFilter === 'ALL'
                    ? 'Total Item Produk'
                    : `Qty: ${selectedProductFilter}`}
                </th>
                <th className="py-3 px-3">Item Terbanyak</th>
                <th className="py-3 px-3 text-center">Detail Item</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {sortedCashiers.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="py-8 text-center text-slate-400 font-bold"
                  >
                    Tidak ada data kasir yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                sortedCashiers.map((st, idx) => {
                  const rank = idx + 1;
                  return (
                    <tr
                      key={st.cashier.id}
                      className="hover:bg-purple-50/40 transition"
                    >
                      <td className="py-3 px-3 text-center">
                        {rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-2xs">
                            1
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-black text-xs">
                            2
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs">
                            3
                          </span>
                        ) : (
                          <span className="font-bold text-slate-500">
                            #{rank}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-black text-slate-900">
                          {st.cashier.name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {st.cashier.jabatan} &bull; {st.cashier.nik}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[11px] font-bold text-slate-700">
                        {st.outlet?.name || '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        Rp {st.totalOmsetFnB.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {st.totalBill.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-purple-900">
                        {st.totalPenonton.toLocaleString('id-ID')}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-black ${
                          rankingBy === 'head'
                            ? 'bg-amber-50 text-amber-900'
                            : 'text-amber-700'
                        }`}
                      >
                        Rp {Math.round(st.head).toLocaleString('id-ID')}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-black ${
                          rankingBy === 'achievement' ? 'bg-emerald-50' : ''
                        }`}
                      >
                        <span
                          className={
                            st.achievement >= 100
                              ? 'text-emerald-600'
                              : 'text-amber-700'
                          }
                        >
                          {st.achievement.toFixed(1)}%
                        </span>
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-black text-purple-800 ${
                          rankingBy === 'daya_serap' ? 'bg-purple-50' : ''
                        }`}
                      >
                        {st.dayaSerap.toFixed(1)}%
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-black text-amber-800 ${
                          rankingBy === 'items' ? 'bg-amber-50' : ''
                        }`}
                      >
                        {st.filteredItemQty.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3 text-[11px]">
                        {st.topItemQty > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold">
                            {st.topItemName} ({st.topItemQty})
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setDetailModalCashier(st)}
                          className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-[11px] inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Rincian</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Rincian Penjualan Item Produk per Kasir */}
      {detailModalCashier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-purple-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black uppercase text-slate-900">
                  Rincian Penjualan Item &bull; {detailModalCashier.cashier.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {detailModalCashier.outlet?.name} &bull; Total{' '}
                  {detailModalCashier.totalItemsSold.toLocaleString('id-ID')} Item
                  Terjual
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalCashier(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailModalCashier.itemBreakdown.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-bold">
                Belum ada rincian item produk yang tercatat untuk kasir ini pada periode terpilih.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">No</th>
                      <th className="py-2 px-3">Nama Item Produk</th>
                      <th className="py-2 px-3">Kategori</th>
                      <th className="py-2 px-3 text-right">Qty Terjual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold">
                    {detailModalCashier.itemBreakdown.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-2 px-3 text-purple-800">
                          {item.category}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-amber-800">
                          {item.qty.toLocaleString('id-ID')} {item.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailModalCashier(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
