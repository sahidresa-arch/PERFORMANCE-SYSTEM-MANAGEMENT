import React, { useState } from 'react';
import { Area, Outlet, User } from '../../types';
import { StorageService } from '../../lib/storage';
import {
  Download,
  ChevronDown,
  ChevronRight,
  Percent,
  TrendingUp,
  Users,
  CreditCard,
  Target,
  FileSpreadsheet,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';

interface TabelRekapDailyProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  currentUser?: User | null;
}

export const TabelRekapDaily: React.FC<TabelRekapDailyProps> = ({
  selectedDate,
  onDateChange,
  currentUser: propUser,
}) => {
  const currentUser = propUser || StorageService.getCurrentUser();
  const areas = StorageService.getAreas();
  const rawOutlets = StorageService.getOutlets();
  const isManagerOrCleaner = (currentUser?.role === 'manager' || currentUser?.role === 'cleaner') && currentUser?.outletId;
  const outlets = isManagerOrCleaner
    ? rawOutlets.filter((o) => o.id === currentUser.outletId)
    : rawOutlets;

  const [dailySales, setDailySales] = React.useState(() => StorageService.getDailySales());

  React.useEffect(() => {
    const handleStorageUpdate = () => {
      setDailySales(StorageService.getDailySales());
    };
    window.addEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('cinema-xxi-storage-update', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const [selectedAreaId, setSelectedAreaId] = useState<string>(
    currentUser?.areaId || (isManagerOrCleaner ? (outlets[0]?.areaId || areas[0]?.id || '') : areas[0]?.id || 'all')
  );
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'achieved' | 'unachieved'>('all');
  const [expandedOutletId, setExpandedOutletId] = useState<string | null>(null);
  const [achSortOrder, setAchSortOrder] = useState<'desc' | 'asc'>('desc');

  const selectedArea = areas.find((a) => a.id === selectedAreaId);
  const selectedAreaName =
    selectedAreaId === 'all' || !selectedAreaId
      ? 'SEMUA WILAYAH'
      : selectedArea?.name || 'SEMUA WILAYAH';

  // Target SPH from database (targetArea for area / national, targetHead for manager's outlet)
  let targetArea = 24359; // Default Cinema XXI All Areas benchmark
  if (isManagerOrCleaner && currentUser?.outletId) {
    const userOutlet = rawOutlets.find((o) => o.id === currentUser.outletId);
    if (userOutlet && userOutlet.targetHead > 0) {
      targetArea = userOutlet.targetHead;
    }
  } else if (selectedAreaId === 'all' || !selectedAreaId) {
    targetArea = 24359;
  } else if (selectedArea?.targetArea && selectedArea.targetArea > 0) {
    targetArea = selectedArea.targetArea;
  } else if (selectedAreaId === 'area-bogor-1-depok') {
    targetArea = 25504;
  } else if (selectedAreaId === 'area-bogor-2') {
    targetArea = 22375;
  }

  // Filter outlets by area and user role
  const areaOutlets = outlets.filter((o) => {
    if (isManagerOrCleaner) return true;
    if (selectedAreaId === 'all' || !selectedAreaId) return true;
    return o.areaId === selectedAreaId;
  });

  const [refYear, refMonth] = selectedDate.split('-');
  const monthPrefix = `${refYear}-${refMonth}`;

  // Helper to compute Murni (Nett) per show from cumulative POS inputs (matching InputDataSales)
  const computeNetShows = (shows: typeof dailySales[0]['shows'] = [], targetHead: number) => {
    return [1, 2, 3, 4, 5].map((sNum) => {
      const current = shows.find((item) => item.showNumber === sNum);
      const prevFilled =
        sNum > 1
          ? [...shows]
              .filter(
                (item) =>
                  item.showNumber < sNum &&
                  (item.isFilled ||
                    (item.omsetCinema || 0) > 0 ||
                    (item.omsetFnB || 0) > 0 ||
                    (item.penonton || 0) > 0 ||
                    (item.bill || 0) > 0)
              )
              .sort((a, b) => b.showNumber - a.showNumber)[0]
          : null;

      const cumCin = current?.omsetCinema || 0;
      const cumFnb = current?.omsetFnB || 0;
      const cumBill = current?.bill || 0;
      const cumPenonton = current?.penonton || 0;

      const prevCin = prevFilled?.omsetCinema || 0;
      const prevFnb = prevFilled?.omsetFnB || 0;
      const prevBill = prevFilled?.bill || 0;
      const prevPenonton = prevFilled?.penonton || 0;

      const isFilled = Boolean(
        current?.isFilled || cumCin > 0 || cumFnb > 0 || cumPenonton > 0 || cumBill > 0
      );

      // Penjualan Murni (Nett) Show N = Akumulasi Show N - Akumulasi Show Sebelumnya
      const netCin = isFilled ? Math.max(0, cumCin - prevCin) : 0;
      const netFnb = isFilled ? Math.max(0, cumFnb - prevFnb) : 0;
      const netBill = isFilled ? Math.max(0, cumBill - prevBill) : 0;
      const netPenonton = isFilled ? Math.max(0, cumPenonton - prevPenonton) : 0;

      const sMet = StorageService.calculateMetrics(
        netCin,
        netFnb,
        netBill,
        netPenonton,
        targetHead
      );

      return {
        showNumber: sNum,
        isFilled,
        isLocked: Boolean(current?.isLocked),
        updatedAt: current?.updatedAt || '-',
        netCin,
        netFnb,
        netBill,
        netPenonton,
        metrics: sMet,
        hasData: isFilled && (netPenonton > 0 || netFnb > 0 || netCin > 0 || netBill > 0),
        isCapai: targetHead > 0 && netPenonton > 0 && sMet.head >= targetHead,
      };
    });
  };

  // Compute daily totals and real MTD for each outlet in selected area
  const outletRows = areaOutlets.map((outlet) => {
    const saleRecord = dailySales.find(
      (s) => s.outletId === outlet.id && s.date === selectedDate
    );

    const shows = saleRecord?.shows || [];
    const netShows = computeNetShows(shows, outlet.targetHead);
    const filledShows = netShows.filter((s) => s.isFilled);

    // Total Harian Outlet = Penjumlahan dari kelima Show Murni (Show 1 s/d Show 5)
    const sumCinema = netShows.reduce((acc, s) => acc + s.netCin, 0);
    const sumFnB = netShows.reduce((acc, s) => acc + s.netFnb, 0);
    const sumBill = netShows.reduce((acc, s) => acc + s.netBill, 0);
    const sumPenonton = netShows.reduce((acc, s) => acc + s.netPenonton, 0);

    const metrics = StorageService.calculateMetrics(
      sumCinema,
      sumFnB,
      sumBill,
      sumPenonton,
      outlet.targetHead
    );

    // Outlet MTD (Tanggal 1 s.d. selectedDate pada bulan yang sama)
    const outletMtdSales = dailySales.filter(
      (s) =>
        s.outletId === outlet.id &&
        s.date.startsWith(monthPrefix) &&
        s.date <= selectedDate
    );
    let mtdCinema = 0;
    let mtdFnB = 0;
    let mtdBill = 0;
    let mtdPenonton = 0;

    outletMtdSales.forEach((rec) => {
      const recNetShows = computeNetShows(rec.shows || [], outlet.targetHead);
      mtdCinema += recNetShows.reduce((acc, s) => acc + s.netCin, 0);
      mtdFnB += recNetShows.reduce((acc, s) => acc + s.netFnb, 0);
      mtdBill += recNetShows.reduce((acc, s) => acc + s.netBill, 0);
      mtdPenonton += recNetShows.reduce((acc, s) => acc + s.netPenonton, 0);
    });

    const mtdMetrics = StorageService.calculateMetrics(
      mtdCinema,
      mtdFnB,
      mtdBill,
      mtdPenonton,
      outlet.targetHead
    );

    const lastUpdated = shows.filter((s) => s.updatedAt).pop()?.updatedAt || '-';

    return {
      outlet,
      shows,
      netShows,
      filledCount: filledShows.length,
      sumCinema,
      sumFnB,
      sumBill,
      sumPenonton,
      metrics,
      mtdCinema,
      mtdFnB,
      mtdBill,
      mtdPenonton,
      mtdMetrics,
      lastUpdated,
    };
  });

  // Apply achievement filter and sort by achievement
  const filteredRows = outletRows
    .filter((r) => {
      if (achievementFilter === 'achieved') return r.metrics.achievement >= 100;
      if (achievementFilter === 'unachieved') return r.metrics.achievement < 100;
      return true;
    })
    .sort((a, b) => {
      return achSortOrder === 'desc'
        ? b.metrics.achievement - a.metrics.achievement
        : a.metrics.achievement - b.metrics.achievement;
    });

  // Calculate Area Daily Totals
  const areaCinema = outletRows.reduce((acc, r) => acc + r.sumCinema, 0);
  const areaFnB = outletRows.reduce((acc, r) => acc + r.sumFnB, 0);
  const areaBill = outletRows.reduce((acc, r) => acc + r.sumBill, 0);
  const areaPenonton = outletRows.reduce((acc, r) => acc + r.sumPenonton, 0);

  const areaMetrics = StorageService.calculateMetrics(
    areaCinema,
    areaFnB,
    areaBill,
    areaPenonton,
    targetArea
  );

  // Calculate Area Real MTD Totals (Tanggal 1 s.d. selectedDate bulan ini)
  const areaMtdCinema = outletRows.reduce((acc, r) => acc + r.mtdCinema, 0);
  const areaMtdFnB = outletRows.reduce((acc, r) => acc + r.mtdFnB, 0);
  const areaMtdBill = outletRows.reduce((acc, r) => acc + r.mtdBill, 0);
  const areaMtdPenonton = outletRows.reduce((acc, r) => acc + r.mtdPenonton, 0);

  const areaMtdMetrics = StorageService.calculateMetrics(
    areaMtdCinema,
    areaMtdFnB,
    areaMtdBill,
    areaMtdPenonton,
    targetArea
  );

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Nama Outlet',
      'Omset Cinema',
      'Omset FnB',
      'Total Bill',
      'Penonton',
      'Daya Serap (%)',
      'Target SPH',
      'SPH (Head)',
      'ACV (%)',
      'AT',
      'Selisih',
      'Head MTD',
      'ACV MTD (%)',
      'Status Show',
      'Jam Input',
    ];

    const csvRows = filteredRows.map((r) => [
      `"${r.outlet.name}"`,
      r.sumCinema,
      r.sumFnB,
      r.sumBill,
      r.sumPenonton,
      `${r.metrics.dayaSerap}%`,
      r.outlet.targetHead,
      r.metrics.head,
      `${r.metrics.achievement}%`,
      r.metrics.at,
      r.metrics.selisih,
      r.mtdMetrics.head,
      `${r.mtdMetrics.achievement}%`,
      `${r.filledCount}/5`,
      r.lastUpdated,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_daily_xxi_${selectedDate}_${selectedAreaId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* 1. Filter Bar (Clean Cinema XXI Theme: #FFFFFF, border #E5E7EB, rounded 10px) */}
      <div className="p-4 rounded-[10px] border border-[#E5E7EB] bg-white text-[#111827] shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Area Selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1.5">
              Filter Berdasarkan Wilayah
            </label>
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              disabled={Boolean(isManagerOrCleaner)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:border-[#7C3AED] transition-colors disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]"
            >
              {!isManagerOrCleaner && (
                <option value="all">SEMUA WILAYAH (Target: Rp 24.359)</option>
              )}
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (Target: Rp {a.targetArea.toLocaleString('id-ID')})
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1.5">
              Filter Tanggal Rekap Daily
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:border-[#7C3AED] transition-colors"
            />
          </div>

          {/* Achievement Toggle Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1.5">
              Status Target Achievement
            </label>
            <div className="flex rounded-lg overflow-hidden border border-[#E5E7EB] p-0.5 bg-[#F9FAFB]">
              <button
                type="button"
                onClick={() => setAchievementFilter('all')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  achievementFilter === 'all'
                    ? 'bg-[#7C3AED] text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setAchievementFilter('achieved')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  achievementFilter === 'achieved'
                    ? 'bg-[#16A34A] text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                Achieved (≥100%)
              </button>
              <button
                type="button"
                onClick={() => setAchievementFilter('unachieved')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  achievementFilter === 'unachieved'
                    ? 'bg-[#DC2626] text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                Belum Achieved
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Selected Area Banner & 7 KPI Cards */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#7C3AED] text-white font-bold text-[10px] uppercase tracking-wider">
              Selected Area
            </span>
            <span className="font-bold text-sm uppercase text-[#111827]">
              Area Dashboard Performance ({selectedAreaName})
            </span>
            <span className="text-xs text-[#6B7280] font-medium hidden sm:inline-block">
              &bull; Target SPH: <strong>Rp {targetArea.toLocaleString('id-ID')}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Rekap CSV</span>
          </button>
        </div>

        {/* 7 KPI Cards (Exact Specs: 7 cards in 1 row, h-75px, rounded-10px, gap-12px, precise colors) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* 1 TARGET SPH: bg white #FFFFFF */}
          <div className="h-[75px] p-3 rounded-[10px] border border-[#E5E7EB] bg-[#FFFFFF] shadow-xs flex flex-col justify-between">
            <span className="text-[9px] font-semibold text-[#6B7280] uppercase tracking-wider flex items-center space-x-1 truncate">
              <Target className="w-3 h-3 text-[#7C3AED] shrink-0" />
              <span>Target SPH</span>
            </span>
            <p className="text-[14px] font-bold text-[#111827] leading-tight truncate">
              {targetArea.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-[#9CA3AF] leading-none truncate">
              {isManagerOrCleaner ? 'Target Outlet' : selectedAreaId === 'all' ? 'Target Nasional' : `Target ${selectedAreaName}`}
            </span>
          </div>

          {/* 2 HEAD DAILY: bg #F5F0FF */}
          <div className="h-[75px] p-3 rounded-[10px] border border-[#E5E7EB] bg-[#F5F0FF] shadow-xs flex flex-col justify-between">
            <span className="text-[9px] font-semibold text-[#6B7280] uppercase tracking-wider flex items-center space-x-1 truncate">
              <TrendingUp className="w-3 h-3 text-[#7C3AED] shrink-0" />
              <span>Head Daily</span>
            </span>
            <p className="text-[14px] font-bold text-[#6D28D9] leading-tight truncate">
              {areaPenonton > 0 ? areaMetrics.head.toLocaleString('id-ID') : '0'}
            </p>
            <span className="text-[10px] text-[#9CA3AF] leading-none truncate">
              SPH Hari Ini ({areaPenonton.toLocaleString('id-ID')} Pnt)
            </span>
          </div>

          {/* 3 ACHIEVEMENT: bg #FFF8E1 */}
          <div className="h-[75px] p-3 rounded-[10px] border border-[#E5E7EB] bg-[#FFF8E1] shadow-xs flex flex-col justify-between">
            <span className="text-[9px] font-semibold text-[#6B7280] uppercase tracking-wider flex items-center space-x-1 truncate">
              <Percent className="w-3 h-3 text-[#D97706] shrink-0" />
              <span>Achievement</span>
            </span>
            <p
              className={`text-[14px] font-bold leading-tight truncate ${
                areaMetrics.achievement >= 100 ? 'text-[#15803D]' : 'text-[#B45309]'
              }`}
            >
              {areaPenonton > 0 && targetArea > 0 ? `${areaMetrics.achievement}%` : '0%'}
            </p>
            <span className="text-[10px] text-[#9CA3AF] leading-none truncate">
              {areaMetrics.achievement >= 100 ? 'Target Tercapai' : 'Belum Tercapai'}
            </span>
          </div>

          {/* 4 PENONTON: bg #E8F6FF */}
          <div className="h-[75px] p-3 rounded-[10px] border border-[#E5E7EB] bg-[#E8F6FF] shadow-xs flex flex-col justify-between">
            <span className="text-[9px] font-semibold text-[#6B7280] uppercase tracking-wider flex items-center space-x-1 truncate">
              <Users className="w-3 h-3 text-[#0284C7] shrink-0" />
              <span>Penonton</span>
            </span>
            <p className="text-[14px] font-bold text-[#111827] leading-tight truncate">
              {areaPenonton.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] text-[#9CA3AF] leading-none truncate">Total Pengunjung</span>
          </div>

          {/* 5 DAYA SERAP: bg #FFE8EF */}
          <div className="h-[75px] p-3 rounded-[10px] border border-[#E5E7EB] bg-[#FFE8EF] shadow-xs flex flex-col justify-between">
            <span className="text-[9px] font-semibold text-[#6B7280] uppercase tracking-wider flex items-center space-x-1 truncate">
              <Percent className="w-3 h-3 text-[#E11D48] shrink-0" />
              <span>Daya Serap (%)</span>
            </span>
            <p className="text-[14px] font-bold text-[#BE123C] leading-tight truncate">
              {areaPenonton > 0 ? `${areaMetrics.dayaSerap}%` : '0%'}
            </p>
            <span className="text-[10px] text-[#9CA3AF] leading-none truncate">Food Pack Ratio</span>
          </div>

          {/* 6 AT: bg #FFF0F5 */}
          <div className="h-[75px] p-3 rounded-[10px] border border-[#E5E7EB] bg-[#FFF0F5] shadow-xs flex flex-col justify-between">
            <span className="text-[9px] font-semibold text-[#6B7280] uppercase tracking-wider flex items-center space-x-1 truncate">
              <CreditCard className="w-3 h-3 text-[#DB2777] shrink-0" />
              <span>AT</span>
            </span>
            <p className="text-[14px] font-bold text-[#111827] leading-tight truncate">
              {areaBill > 0 ? areaMetrics.at.toLocaleString('id-ID') : '0'}
            </p>
            <span className="text-[10px] text-[#9CA3AF] leading-none truncate">Rata-rata Transaksi</span>
          </div>

          {/* 7 HEAD MTD: bg #E6FFF0 */}
          <div className="h-[75px] p-3 rounded-[10px] border border-[#E5E7EB] bg-[#E6FFF0] shadow-xs flex flex-col justify-between">
            <span className="text-[9px] font-semibold text-[#6B7280] uppercase tracking-wider flex items-center space-x-1 truncate">
              <TrendingUp className="w-3 h-3 text-[#059669] shrink-0" />
              <span>Head MTD</span>
            </span>
            <p className={`text-[14px] font-bold leading-tight truncate ${
              areaMtdMetrics.achievement >= 100 ? 'text-[#047857]' : 'text-[#B45309]'
            }`}>
              {areaMtdPenonton > 0 ? areaMtdMetrics.head.toLocaleString('id-ID') : '0'}
            </p>
            <span className={`text-[10px] font-bold leading-none truncate ${
              areaMtdMetrics.achievement >= 100 ? 'text-[#059669]' : 'text-[#B45309]'
            }`}>
              {areaMtdPenonton > 0 && targetArea > 0 ? `${areaMtdMetrics.achievement}% MTD` : '0% MTD'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Table Card: Exact clone of daily rekap.png with aligned inline sub-rows */}
      <div className="rounded-[12px] border border-[#E5E7EB] bg-white text-[#111827] shadow-xs overflow-hidden">
        {/* Table Title Header with Blue Dot #2563EB */}
        <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#2563EB] shrink-0"></div>
            <h3 className="font-bold text-[14px] text-[#111827] tracking-tight">
              Tabel Rekapitulasi Penjualan Harian (Daily)
            </h3>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F3E8FF] text-[#7C3AED]">
              {selectedArea?.name} &bull; {filteredRows.length} Outlet
            </span>
          </div>
          <div className="text-[11px] text-[#6B7280] font-medium flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Urutan: ACV Tertinggi</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Table Header: 10px uppercase, font 600, color #6B7280, letter-spacing 0.5px */}
            <thead className="text-[10px] uppercase font-semibold tracking-[0.5px] border-b border-[#E5E7EB] bg-[#F9FAFB] text-[#6B7280]">
              <tr>
                <th className="py-3 px-3 min-w-[200px]">NAMA OUTLET</th>
                <th className="py-3 px-3 text-right min-w-[110px]">OMSET CINEMA</th>
                <th className="py-3 px-3 text-right text-[#059669] min-w-[100px] font-bold">OMSET FNB</th>
                <th className="py-3 px-3 text-center min-w-[70px]">TOTAL BILL</th>
                <th className="py-3 px-3 text-center min-w-[75px]">PENONTON</th>
                <th className="py-3 px-3 text-center min-w-[80px]">DAYA SERAP</th>
                <th className="py-3 px-3 text-right min-w-[95px]">TARGET SPH</th>
                <th className="py-3 px-3 text-right text-[#0284C7] min-w-[95px] font-bold">SPH (HEAD)</th>
                <th
                  onClick={() => setAchSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                  className="py-3 px-3 text-center min-w-[85px] cursor-pointer select-none hover:bg-amber-100 transition rounded-md"
                  title="Klik untuk mengurutkan pencapaian terbesar / terkecil"
                >
                  <div className="flex items-center justify-center space-x-1 font-bold text-slate-800">
                    <span>ACV %</span>
                    {achSortOrder === 'desc' ? (
                      <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                    ) : (
                      <ArrowUp className="w-3.5 h-3.5 text-amber-700" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 text-right min-w-[75px]">AT</th>
                <th className="py-3 px-3 text-right min-w-[95px]">SELISIH</th>
                <th className="py-3 px-3 text-center min-w-[85px]">STATUS SHOW</th>
                <th className="py-3 px-3 text-center min-w-[80px]">JAM INPUT</th>
              </tr>
            </thead>

            {/* Table Body: 11px regular #374151, outlet bold 11px #111827 */}
            <tbody className="divide-y divide-[#E5E7EB] text-[11px] text-[#374151]">
              {filteredRows.map((row) => {
                const isExpanded = expandedOutletId === row.outlet.id;

                return (
                  <React.Fragment key={row.outlet.id}>
                    {/* PARENT OUTLET ROW */}
                    <tr
                      onClick={() => setExpandedOutletId(isExpanded ? null : row.outlet.id)}
                      className={`hover:bg-[#F3E8FF]/40 transition-colors cursor-pointer select-none ${
                        isExpanded ? 'bg-[#F5F3FF]/70' : 'bg-white'
                      }`}
                    >
                      {/* Column 1: NAMA OUTLET with toggle chevron */}
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            className="p-0.5 rounded hover:bg-[#E5E7EB] text-[#6B7280] transition-colors cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-[#7C3AED]" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
                            )}
                          </button>
                          <span className="font-bold text-[11px] text-[#111827]">
                            {row.outlet.name}
                          </span>
                        </div>
                      </td>

                      {/* Column 2: OMSET CINEMA (formatted, no Rp) */}
                      <td className="py-3 px-3 text-right font-medium text-[#374151]">
                        {row.sumCinema > 0 ? row.sumCinema.toLocaleString('id-ID') : '0'}
                      </td>

                      {/* Column 3: OMSET FNB (formatted, no Rp, bold emerald) */}
                      <td className="py-3 px-3 text-right font-bold text-[#059669]">
                        {row.sumFnB > 0 ? row.sumFnB.toLocaleString('id-ID') : '0'}
                      </td>

                      {/* Column 4: TOTAL BILL */}
                      <td className="py-3 px-3 text-center font-medium text-[#374151]">
                        {row.sumBill}
                      </td>

                      {/* Column 5: PENONTON */}
                      <td className="py-3 px-3 text-center font-medium text-[#374151]">
                        {row.sumPenonton.toLocaleString('id-ID')}
                      </td>

                      {/* Column 6: DAYA SERAP */}
                      <td className="py-3 px-3 text-center font-medium text-[#374151]">
                        {row.sumPenonton > 0 ? `${row.metrics.dayaSerap}%` : '-'}
                      </td>

                      {/* Column 7: TARGET SPH (formatted, no Rp) */}
                      <td className="py-3 px-3 text-right text-[#6B7280] font-medium">
                        {row.outlet.targetHead === 0
                          ? '0'
                          : row.outlet.targetHead.toLocaleString('id-ID')}
                      </td>

                      {/* Column 8: SPH (HEAD) (formatted, no Rp, cyan bold) */}
                      <td className="py-3 px-3 text-right font-bold text-[#0284C7]">
                        {row.sumPenonton > 0 ? row.metrics.head.toLocaleString('id-ID') : '0'}
                      </td>

                      {/* Column 9: ACV % (Pill badge) */}
                      <td className="py-3 px-3 text-center">
                        {row.sumPenonton > 0 && row.outlet.targetHead > 0 ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              row.metrics.achievement >= 100
                                ? 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]'
                                : 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5]'
                            }`}
                          >
                            {row.metrics.achievement}%
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF]">-</span>
                        )}
                      </td>

                      {/* Column 10: AT (formatted, no Rp) */}
                      <td className="py-3 px-3 text-right text-[#374151] font-medium">
                        {row.sumBill > 0 ? row.metrics.at.toLocaleString('id-ID') : '0'}
                      </td>

                      {/* Column 11: SELISIH (formatted, no Rp, +/- color) */}
                      <td className="py-3 px-3 text-right font-semibold">
                        {row.sumPenonton > 0 && row.outlet.targetHead > 0 ? (
                          <span
                            className={
                              row.metrics.selisih >= 0
                                ? 'text-[#15803D] font-bold'
                                : 'text-[#B91C1C] font-bold'
                            }
                          >
                            {row.metrics.selisih >= 0 ? '+' : ''}
                            {row.metrics.selisih.toLocaleString('id-ID')}
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF]">0</span>
                        )}
                      </td>

                      {/* Column 12: STATUS SHOW (Show count badge) */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.filledCount === 5
                              ? 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]'
                              : row.filledCount > 0
                              ? 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]'
                              : 'bg-[#F3F4F6] text-[#6B7280]'
                          }`}
                        >
                          {row.filledCount}/5 Show
                        </span>
                      </td>

                      {/* Column 13: JAM INPUT */}
                      <td className="py-3 px-3 text-center text-[#6B7280] font-normal text-[10px]">
                        {row.lastUpdated}
                      </td>
                    </tr>

                    {/* EXPANDABLE INLINE SHOW ROWS (SHOW 1 S/D SHOW 5 MURNI / NETT) + MTD SUMMARY */}
                    {isExpanded && (
                      <>
                        {row.netShows.map((ns) => {
                          const sNum = ns.showNumber;
                          const sMet = ns.metrics;
                          const hasData = ns.hasData;
                          const isCapai = ns.isCapai;

                          return (
                            <tr
                              key={`show-${row.outlet.id}-${sNum}`}
                              className="bg-[#FAF5FF]/50 hover:bg-[#F3E8FF]/60 border-b border-[#F3F4F6] transition-colors"
                            >
                              {/* Column 1: Indented tree branch + Show badge */}
                              <td className="py-2 px-3 pl-8">
                                <div className="flex items-center space-x-2">
                                  <span className="text-[#A78BFA] font-mono text-xs select-none">↳</span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#EDE9FE] text-[#6D28D9]">
                                    Show {sNum}
                                  </span>
                                </div>
                              </td>

                              {/* Column 2: Omset Cinema Murni */}
                              <td className="py-2 px-3 text-right text-[11px] text-[#4B5563]">
                                {ns.netCin > 0
                                  ? ns.netCin.toLocaleString('id-ID')
                                  : '-'}
                              </td>

                              {/* Column 3: Omset FnB Murni */}
                              <td className="py-2 px-3 text-right text-[11px] font-bold text-[#059669]">
                                {ns.netFnb > 0
                                  ? ns.netFnb.toLocaleString('id-ID')
                                  : '-'}
                              </td>

                              {/* Column 4: Total Bill Murni */}
                              <td className="py-2 px-3 text-center text-[11px] text-[#4B5563]">
                                {ns.netBill > 0 ? ns.netBill.toLocaleString('id-ID') : '-'}
                              </td>

                              {/* Column 5: Penonton Murni */}
                              <td className="py-2 px-3 text-center text-[11px] text-[#4B5563]">
                                {ns.netPenonton > 0 ? ns.netPenonton.toLocaleString('id-ID') : '-'}
                              </td>

                              {/* Column 6: Daya Serap */}
                              <td className="py-2 px-3 text-center text-[11px] text-[#4B5563]">
                                {hasData ? `${sMet.dayaSerap}%` : '-'}
                              </td>

                              {/* Column 7: Target SPH */}
                              <td className="py-2 px-3 text-right text-[11px] text-[#9CA3AF]">
                                {hasData && row.outlet.targetHead > 0
                                  ? row.outlet.targetHead.toLocaleString('id-ID')
                                  : '-'}
                              </td>

                              {/* Column 8: SPH (HEAD) */}
                              <td className="py-2 px-3 text-right text-[11px] font-bold text-[#0284C7]">
                                {hasData ? sMet.head.toLocaleString('id-ID') : '-'}
                              </td>

                              {/* Column 9: ACV % */}
                              <td className="py-2 px-3 text-center">
                                {hasData && row.outlet.targetHead > 0 ? (
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                      sMet.achievement >= 100
                                        ? 'bg-[#DCFCE7] text-[#15803D]'
                                        : 'bg-[#FEE2E2] text-[#B91C1C]'
                                    }`}
                                  >
                                    {sMet.achievement}%
                                  </span>
                                ) : (
                                  <span className="text-[#9CA3AF]">-</span>
                                )}
                              </td>

                              {/* Column 10: AT */}
                              <td className="py-2 px-3 text-right text-[11px] text-[#4B5563]">
                                {ns.netBill > 0 ? sMet.at.toLocaleString('id-ID') : '-'}
                              </td>

                              {/* Column 11: Selisih */}
                              <td className="py-2 px-3 text-right text-[11px] font-semibold">
                                {hasData && row.outlet.targetHead > 0 ? (
                                  <span
                                    className={
                                      sMet.selisih >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'
                                    }
                                  >
                                    {sMet.selisih >= 0 ? '+' : ''}
                                    {sMet.selisih.toLocaleString('id-ID')}
                                  </span>
                                ) : (
                                  <span className="text-[#9CA3AF]">-</span>
                                )}
                              </td>

                              {/* Column 12: Status Show (Capai / Tidak Capai) */}
                              <td className="py-2 px-3 text-center">
                                {hasData && row.outlet.targetHead > 0 ? (
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                      isCapai
                                        ? 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]'
                                        : 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5]'
                                    }`}
                                  >
                                    {isCapai ? 'Capai' : 'Tidak Capai'}
                                  </span>
                                ) : (
                                  <span className="text-[#9CA3AF] text-[10px]">-</span>
                                )}
                              </td>

                              {/* Column 13: Jam Input */}
                              <td className="py-2 px-3 text-center text-[10px] text-[#9CA3AF]">
                                {ns.updatedAt}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Outlet MTD Row */}
                        <tr className="bg-[#ECFDF5]/70 hover:bg-[#D1FAE5]/60 border-b border-[#A7F3D0] transition-colors font-medium">
                          <td className="py-2 px-3 pl-8">
                            <div className="flex items-center space-x-2">
                              <span className="text-[#059669] font-mono text-xs select-none">↳</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]">
                                MTD (1 s.d. {selectedDate.split('-')[2]})
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right text-[11px] text-[#065F46]">
                            {row.mtdCinema > 0 ? row.mtdCinema.toLocaleString('id-ID') : '0'}
                          </td>
                          <td className="py-2 px-3 text-right text-[11px] font-extrabold text-[#059669]">
                            {row.mtdFnB > 0 ? row.mtdFnB.toLocaleString('id-ID') : '0'}
                          </td>
                          <td className="py-2 px-3 text-center text-[11px] text-[#065F46]">
                            {row.mtdBill}
                          </td>
                          <td className="py-2 px-3 text-center text-[11px] font-semibold text-[#065F46]">
                            {row.mtdPenonton.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2 px-3 text-center text-[11px] text-[#065F46]">
                            {row.mtdPenonton > 0 ? `${row.mtdMetrics.dayaSerap}%` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right text-[11px] text-[#6B7280]">
                            {row.outlet.targetHead > 0 ? row.outlet.targetHead.toLocaleString('id-ID') : '0'}
                          </td>
                          <td className="py-2 px-3 text-right text-[11px] font-extrabold text-[#0284C7]">
                            {row.mtdPenonton > 0 ? row.mtdMetrics.head.toLocaleString('id-ID') : '0'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {row.mtdPenonton > 0 && row.outlet.targetHead > 0 ? (
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                  row.mtdMetrics.achievement >= 100
                                    ? 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]'
                                    : 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5]'
                                }`}
                              >
                                {row.mtdMetrics.achievement}%
                              </span>
                            ) : (
                              <span className="text-[#9CA3AF]">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right text-[11px] text-[#065F46]">
                            {row.mtdBill > 0 ? row.mtdMetrics.at.toLocaleString('id-ID') : '0'}
                          </td>
                          <td className="py-2 px-3 text-right text-[11px] font-bold">
                            {row.mtdPenonton > 0 && row.outlet.targetHead > 0 ? (
                              <span className={row.mtdMetrics.selisih >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}>
                                {row.mtdMetrics.selisih >= 0 ? '+' : ''}
                                {row.mtdMetrics.selisih.toLocaleString('id-ID')}
                              </span>
                            ) : (
                              <span className="text-[#9CA3AF]">0</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center text-[#065F46] font-semibold text-[10px]" colSpan={2}>
                            Rekap Bulan Berjalan
                          </td>
                        </tr>
                      </>
                    )}
                  </React.Fragment>
                );
              })}

              {/* AREA TOTAL ROW (NO 'Rp', pure formatted numbers) */}
              <tr className="bg-[#F8F9FC] font-bold text-[#111827] border-t-2 border-[#E5E7EB]">
                <td className="py-3.5 px-3 font-extrabold text-[#111827]">
                  TOTAL {selectedAreaName}
                </td>
                <td className="py-3.5 px-3 text-right text-[#111827] font-semibold">
                  {areaCinema.toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 px-3 text-right text-[#059669] font-extrabold">
                  {areaFnB.toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 px-3 text-center">{areaBill}</td>
                <td className="py-3.5 px-3 text-center">{areaPenonton.toLocaleString('id-ID')}</td>
                <td className="py-3.5 px-3 text-center">
                  {areaPenonton > 0 ? `${areaMetrics.dayaSerap}%` : '0%'}
                </td>
                <td className="py-3.5 px-3 text-right text-[#6B7280]">
                  {targetArea.toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 px-3 text-right text-[#0284C7] font-extrabold">
                  {areaPenonton > 0 ? areaMetrics.head.toLocaleString('id-ID') : '0'}
                </td>
                <td className="py-3.5 px-3 text-center">
                  {areaPenonton > 0 && targetArea > 0 ? (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        areaMetrics.achievement >= 100
                          ? 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]'
                          : 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5]'
                      }`}
                    >
                      {areaMetrics.achievement}%
                    </span>
                  ) : (
                    <span className="text-[#9CA3AF]">-</span>
                  )}
                </td>
                <td className="py-3.5 px-3 text-right text-[#111827]">
                  {areaBill > 0 ? areaMetrics.at.toLocaleString('id-ID') : '0'}
                </td>
                <td className="py-3.5 px-3 text-right">
                  {areaPenonton > 0 && targetArea > 0 ? (
                    <span
                      className={
                        areaMetrics.selisih >= 0
                          ? 'text-[#15803D] font-bold'
                          : 'text-[#B91C1C] font-bold'
                      }
                    >
                      {areaMetrics.selisih >= 0 ? '+' : ''}
                      {areaMetrics.selisih.toLocaleString('id-ID')}
                    </span>
                  ) : (
                    <span className="text-[#9CA3AF]">0</span>
                  )}
                </td>
                <td className="py-3.5 px-3 text-center" colSpan={2}>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]">
                    REKAP LENGKAP
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
