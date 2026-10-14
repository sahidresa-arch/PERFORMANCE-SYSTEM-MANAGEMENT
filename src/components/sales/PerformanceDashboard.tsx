import React, { useState } from 'react';
import { User } from '../../types';
import { StorageService } from '../../lib/storage';
import {
  BarChart3,
  Calendar,
  Building,
  ArrowDown,
  ArrowUp
} from 'lucide-react';

interface PerformanceDashboardProps {
  currentUser: User | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  currentUser,
  selectedDate,
  onDateChange,
}) => {
  const areas = StorageService.getAreas();
  const rawOutlets = StorageService.getOutlets();
  const isManagerOrCleaner = (currentUser?.role === 'manager' || currentUser?.role === 'cleaner') && currentUser?.outletId;
  const userAssignedAreaIds = currentUser?.role === 'area_manager'
    ? (currentUser.assignedAreas && currentUser.assignedAreas.length > 0
        ? currentUser.assignedAreas
        : (currentUser.areaId ? [currentUser.areaId] : []))
    : null;

  const outlets = isManagerOrCleaner
    ? rawOutlets.filter((o) => o.id === currentUser.outletId)
    : userAssignedAreaIds && userAssignedAreaIds.length > 0
    ? rawOutlets.filter((o) => userAssignedAreaIds.includes(o.areaId))
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

  // 'all' = SEMUA WILAYAH
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  // Sort order for Achievement column ('desc' = terbesar ke terkecil, 'asc' = terkecil ke terbesar)
  const [achSortOrder, setAchSortOrder] = useState<'desc' | 'asc'>('desc');

  const filteredOutlets = outlets.filter((o) =>
    isManagerOrCleaner ? true : selectedAreaId === 'all' || !selectedAreaId ? true : o.areaId === selectedAreaId
  );

  // Target SPH spesifik sesuai permintaan user
  let targetArea = 24359; // Default SEMUA WILAYAH
  if (selectedAreaId === 'area-bogor-1-depok') {
    targetArea = 25504;
  } else if (selectedAreaId === 'area-bogor-2') {
    targetArea = 22375;
  } else if (selectedAreaId === 'all') {
    targetArea = 24359;
  }

  const selectedAreaName =
    selectedAreaId === 'all'
      ? 'SEMUA WILAYAH'
      : areas.find((a) => a.id === selectedAreaId)?.name || 'SEMUA WILAYAH';

  // Compute metrics per outlet
  const performanceRows = filteredOutlets
    .map((outlet) => {
      const [refYear, refMonth] = selectedDate.split('-');

      const exactSaleRecord = dailySales.find(
        (s) => s.outletId === outlet.id && s.date === selectedDate
      );
      // Strictly use exact record for selectedDate (no fallback to other dates)
      const saleRecord = exactSaleRecord;

      const shows = saleRecord?.shows || [];

      const dailyTotals = StorageService.getLatestShowTotals(shows);
      const sumCinema = dailyTotals.omsetCinema;
      const sumFnB = dailyTotals.omsetFnB;
      const sumBill = dailyTotals.bill;
      const sumPenonton = dailyTotals.penonton;

      const dailyMetrics = StorageService.calculateMetrics(
        sumCinema,
        sumFnB,
        sumBill,
        sumPenonton,
        outlet.targetHead
      );

      const mtdSales = dailySales.filter(
        (s) =>
          s.outletId === outlet.id &&
          s.date.startsWith(`${refYear}-${refMonth}`) &&
          s.date <= selectedDate
      );
      let mtdCinema = 0;
      let mtdFnB = 0;
      let mtdBill = 0;
      let mtdPenonton = 0;

      mtdSales.forEach((rec) => {
        const dayTotals = StorageService.getLatestShowTotals(rec.shows);
        mtdCinema += dayTotals.omsetCinema;
        mtdFnB += dayTotals.omsetFnB;
        mtdBill += dayTotals.bill;
        mtdPenonton += dayTotals.penonton;
      });

      const mtdMetrics = StorageService.calculateMetrics(
        mtdCinema,
        mtdFnB,
        mtdBill,
        mtdPenonton,
        outlet.targetHead
      );

      return {
        outlet,
        daily: {
          penonton: sumPenonton,
          metrics: dailyMetrics,
        },
        mtd: {
          penonton: mtdPenonton,
          metrics: mtdMetrics,
        },
      };
    })
    .sort((a, b) => {
      const achA = a.daily.metrics.achievement || a.mtd.metrics.achievement;
      const achB = b.daily.metrics.achievement || b.mtd.metrics.achievement;
      return achSortOrder === 'desc' ? achB - achA : achA - achB;
    });

  // Calculate Area Summary
  const areaDailyPenonton = performanceRows.reduce((acc, r) => acc + r.daily.penonton, 0);
  const areaDailyCinema = performanceRows.reduce((acc, r) => acc + r.daily.metrics.omsetCinema, 0);
  const areaDailyFnB = performanceRows.reduce((acc, r) => acc + r.daily.metrics.omsetFnB, 0);
  const areaDailyBill = performanceRows.reduce((acc, r) => acc + r.daily.metrics.bill, 0);

  const areaDailyMetrics = StorageService.calculateMetrics(
    areaDailyCinema,
    areaDailyFnB,
    areaDailyBill,
    areaDailyPenonton,
    targetArea
  );

  const areaMtdPenonton = performanceRows.reduce((acc, r) => acc + r.mtd.penonton, 0);
  const areaMtdCinema = performanceRows.reduce((acc, r) => acc + r.mtd.metrics.omsetCinema, 0);
  const areaMtdFnB = performanceRows.reduce((acc, r) => acc + r.mtd.metrics.omsetFnB, 0);
  const areaMtdBill = performanceRows.reduce((acc, r) => acc + r.mtd.metrics.bill, 0);

  const areaMtdMetrics = StorageService.calculateMetrics(
    areaMtdCinema,
    areaMtdFnB,
    areaMtdBill,
    areaMtdPenonton,
    targetArea
  );

  return (
    <div className="space-y-4">
      {/* 1. Header Bar: Judul & Sub-judul */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded bg-[#F3E8FF] text-[#7C3AED]">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h1 className="text-[16px] font-bold text-[#111827] tracking-tight">
              Visualisasi Analitik Performance
            </h1>
          </div>

          <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-[#6B7280]">
            <span>Mode Analisis:</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-[#7C3AED] bg-[#F3E8FF]">
              Tren SPH Bulanan &amp; Performance Harian
            </span>
          </div>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[10px] px-4 py-2.5 shadow-xs flex flex-wrap items-center gap-4 text-[12px]">
        <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
          Filter Dashboard
        </span>

        {/* Input Tanggal */}
        <div className="flex items-center space-x-2">
          <label className="text-[11px] font-medium text-[#6B7280]">Tanggal:</label>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-[8px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#374151]">
            <Calendar className="w-3.5 h-3.5 text-[#7C3AED]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent text-[11px] font-medium cursor-pointer outline-hidden focus:ring-0 p-0 text-[#111827]"
            />
          </div>
        </div>

        {/* Dropdown Area */}
        <div className="flex items-center space-x-2">
          <label className="text-[11px] font-medium text-[#6B7280]">Area / Wilayah:</label>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-[8px] border border-[#E5E7EB] bg-[#FFFFFF] text-[#374151]">
            <Building className="w-3.5 h-3.5 text-[#7C3AED]" />
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="bg-transparent text-[11px] font-semibold cursor-pointer outline-hidden focus:ring-0 p-0 text-[#111827]"
            >
              <option value="all">SEMUA WILAYAH (Target Rp 24.359)</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (Target Rp {a.targetArea.toLocaleString('id-ID')})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. 7 Kartu KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-[12px]">
        {/* 1 TARGET SPH */}
        <div className="h-[75px] bg-[#FFFFFF] border border-[#E5E7EB] rounded-[10px] px-3 py-2 flex flex-col justify-center shadow-xs">
          <span className="text-[9px] uppercase font-semibold text-[#6B7280] tracking-[0.5px] block leading-tight">
            TARGET SPH
          </span>
          <p className="text-[14px] font-bold text-[#111827] leading-tight my-0.5 truncate">
            Rp {targetArea.toLocaleString('id-ID')}
          </p>
          <span className="text-[10px] text-[#9CA3AF] leading-tight block truncate">
            {selectedAreaName}
          </span>
        </div>

        {/* 2 HEAD DAILY */}
        <div className="h-[75px] bg-[#F5F0FF] border border-[#E9D5FF] rounded-[10px] px-3 py-2 flex flex-col justify-center shadow-xs">
          <span className="text-[9px] uppercase font-semibold text-[#6B7280] tracking-[0.5px] block leading-tight">
            HEAD DAILY
          </span>
          <p className="text-[14px] font-bold text-[#111827] leading-tight my-0.5 truncate">
            Rp {areaDailyMetrics.head.toLocaleString('id-ID')}
          </p>
          <span className="text-[10px] text-[#9CA3AF] leading-tight block">
            SPH Hari Ini
          </span>
        </div>

        {/* 3 ACHIEVEMENT */}
        <div className="h-[75px] bg-[#FFF8E1] border border-[#FEF08A] rounded-[10px] px-3 py-2 flex flex-col justify-center shadow-xs">
          <span className="text-[9px] uppercase font-semibold text-[#6B7280] tracking-[0.5px] block leading-tight">
            ACHIEVEMENT
          </span>
          <p className="text-[14px] font-bold text-[#111827] leading-tight my-0.5 truncate">
            {areaDailyMetrics.achievement}%
          </p>
          <span className="text-[10px] text-[#9CA3AF] leading-tight block">
            {areaDailyMetrics.achievement >= 100 ? 'Target Achieved' : 'Under Target'}
          </span>
        </div>

        {/* 4 PENONTON */}
        <div className="h-[75px] bg-[#E8F6FF] border border-[#BAE6FD] rounded-[10px] px-3 py-2 flex flex-col justify-center shadow-xs">
          <span className="text-[9px] uppercase font-semibold text-[#6B7280] tracking-[0.5px] block leading-tight">
            PENONTON
          </span>
          <p className="text-[14px] font-bold text-[#111827] leading-tight my-0.5 truncate">
            {areaDailyPenonton.toLocaleString('id-ID')}
          </p>
          <span className="text-[10px] text-[#9CA3AF] leading-tight block">
            Total Pengunjung
          </span>
        </div>

        {/* 5 DAYA SERAP */}
        <div className="h-[75px] bg-[#FFE8EF] border border-[#FECDD3] rounded-[10px] px-3 py-2 flex flex-col justify-center shadow-xs">
          <span className="text-[9px] uppercase font-semibold text-[#6B7280] tracking-[0.5px] block leading-tight">
            DAYA SERAP
          </span>
          <p className="text-[14px] font-bold text-[#111827] leading-tight my-0.5 truncate">
            {areaDailyMetrics.dayaSerap}%
          </p>
          <span className="text-[10px] text-[#9CA3AF] leading-tight block">
            Food Pack Ratio
          </span>
        </div>

        {/* 6 AT */}
        <div className="h-[75px] bg-[#FFF0F5] border border-[#FBCFE8] rounded-[10px] px-3 py-2 flex flex-col justify-center shadow-xs">
          <span className="text-[9px] uppercase font-semibold text-[#6B7280] tracking-[0.5px] block leading-tight">
            AT
          </span>
          <p className="text-[14px] font-bold text-[#111827] leading-tight my-0.5 truncate">
            Rp {areaDailyMetrics.at.toLocaleString('id-ID')}
          </p>
          <span className="text-[10px] text-[#9CA3AF] leading-tight block">
            Rata-rata Transaksi
          </span>
        </div>

        {/* 7 HEAD MTD */}
        <div className="h-[75px] bg-[#E6FFF0] border border-[#BBF7D0] rounded-[10px] px-3 py-2 flex flex-col justify-center shadow-xs">
          <span className="text-[9px] uppercase font-semibold text-[#6B7280] tracking-[0.5px] block leading-tight">
            HEAD MTD
          </span>
          <p className="text-[14px] font-bold text-[#111827] leading-tight my-0.5 truncate">
            Rp {areaMtdMetrics.head.toLocaleString('id-ID')}
          </p>
          <span className="text-[10px] text-[#9CA3AF] leading-tight block">
            {areaMtdMetrics.achievement}% MTD
          </span>
        </div>
      </div>

      {/* 4. 2 Tabel: Side-by-Side (Performance Report Daily & MTD) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 w-full">
        {/* TABEL KIRI: Performance Report Daily */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[12px] p-3 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#2563EB] inline-block shrink-0"></span>
              <h2 className="text-[11px] sm:text-[12px] font-bold text-[#111827] uppercase tracking-wide">
                PERFORMANCE REPORT DAILY
              </h2>
            </div>
            <span className="text-[10px] font-medium text-[#6B7280]">
              {selectedDate} &bull; {selectedAreaName}
            </span>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[620px] w-full">
            <table className="w-full text-left border-collapse text-[10px] sm:text-[11px]">
              <thead className="sticky top-0 bg-[#F9FAFB] border-b border-[#E5E7EB] font-semibold text-[#6B7280] uppercase tracking-[0.2px] z-10">
                <tr>
                  <th className="py-2 px-1 text-center w-6">NO</th>
                  <th className="py-2 px-1.5">NAMA OUTLET</th>
                  <th className="py-2 px-1 text-center">PENONTON</th>
                  <th className="py-2 px-1 text-right">TARGET SPH</th>
                  <th className="py-2 px-1 text-right">HEAD SPH</th>

                  {/* Interaktif Sort Header ACH dengan ikon panah */}
                  <th
                    onClick={() => setAchSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                    className="py-2 px-1 text-center cursor-pointer select-none hover:bg-purple-100 transition rounded-md"
                    title="Klik untuk mengurutkan pencapaian terbesar / terkecil"
                  >
                    <div className="flex items-center justify-center space-x-0.5 font-bold text-purple-900">
                      <span>ACH</span>
                      {achSortOrder === 'desc' ? (
                        <ArrowDown className="w-2.5 h-2.5 text-purple-700" />
                      ) : (
                        <ArrowUp className="w-2.5 h-2.5 text-purple-700" />
                      )}
                    </div>
                  </th>

                  <th className="py-2 px-1 text-center">DAYA SERAP</th>
                  <th className="py-2 px-1 text-right">AT</th>
                  <th className="py-2 px-1 text-right">SELISIH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#374151]">
                {performanceRows.map((row, idx) => (
                  <tr key={row.outlet.id} className="hover:bg-[#F9FAFB] transition">
                    <td className="py-1.5 px-1 text-center font-medium text-[#6B7280]">{idx + 1}</td>
                    <td className="py-1.5 px-1.5 font-bold text-[#111827] truncate max-w-[110px] sm:max-w-[130px]" title={row.outlet.name}>
                      {row.outlet.name}
                    </td>
                    <td className="py-1.5 px-1 text-center text-[#374151]">
                      {row.daily.penonton.toLocaleString('id-ID')}
                    </td>
                    <td className="py-1.5 px-1 text-right text-[#6B7280]">
                      {row.outlet.targetHead === 0
                        ? '0'
                        : row.outlet.targetHead.toLocaleString('id-ID')}
                    </td>
                    <td className="py-1.5 px-1 text-right text-[#6B7280] font-semibold">
                      {row.daily.metrics.head.toLocaleString('id-ID')}
                    </td>
                    <td className="py-1.5 px-1 text-center">
                      {row.daily.penonton > 0 ? (
                        <span
                          className={`font-semibold ${
                            row.daily.metrics.achievement >= 100
                              ? 'text-emerald-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {row.daily.metrics.achievement}%
                        </span>
                      ) : (
                        <span className="text-[#9CA3AF]">-</span>
                      )}
                    </td>
                    <td className="py-1.5 px-1 text-center text-[#374151]">
                      {row.daily.penonton > 0 ? `${row.daily.metrics.dayaSerap}%` : '-'}
                    </td>
                    <td className="py-1.5 px-1 text-right text-[#6B7280]">
                      {row.daily.metrics.at.toLocaleString('id-ID')}
                    </td>
                    <td className="py-1.5 px-1 text-right font-medium">
                      <span
                        className={
                          row.daily.metrics.selisih >= 0
                            ? 'text-emerald-600 font-semibold'
                            : 'text-rose-600'
                        }
                      >
                        {row.daily.metrics.selisih >= 0 ? '+' : ''}{row.daily.metrics.selisih.toLocaleString('id-ID')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TABEL KANAN: Performance Report MTD */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[12px] p-3 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#2563EB] inline-block shrink-0"></span>
              <h2 className="text-[11px] sm:text-[12px] font-bold text-[#111827] uppercase tracking-wide">
                PERFORMANCE REPORT MTD
              </h2>
            </div>
            <span className="text-[10px] font-medium text-[#6B7280]">
              Bulan Berjalan &bull; {selectedAreaName}
            </span>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[620px] w-full">
            <table className="w-full text-left border-collapse text-[10px] sm:text-[11px]">
              <thead className="sticky top-0 bg-[#F9FAFB] border-b border-[#E5E7EB] font-semibold text-[#6B7280] uppercase tracking-[0.2px] z-10">
                <tr>
                  <th className="py-2 px-1 text-center w-6">NO</th>
                  <th className="py-2 px-1.5">NAMA OUTLET</th>
                  <th className="py-2 px-1 text-center">PENONTON</th>
                  <th className="py-2 px-1 text-right">TARGET SPH</th>
                  <th className="py-2 px-1 text-right">HEAD SPH</th>

                  {/* Interaktif Sort Header ACH dengan ikon panah */}
                  <th
                    onClick={() => setAchSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                    className="py-2 px-1 text-center cursor-pointer select-none hover:bg-purple-100 transition rounded-md"
                    title="Klik untuk mengurutkan pencapaian terbesar / terkecil"
                  >
                    <div className="flex items-center justify-center space-x-0.5 font-bold text-purple-900">
                      <span>ACH</span>
                      {achSortOrder === 'desc' ? (
                        <ArrowDown className="w-2.5 h-2.5 text-purple-700" />
                      ) : (
                        <ArrowUp className="w-2.5 h-2.5 text-purple-700" />
                      )}
                    </div>
                  </th>

                  <th className="py-2 px-1 text-center">DAYA SERAP</th>
                  <th className="py-2 px-1 text-right">AT</th>
                  <th className="py-2 px-1 text-right">SELISIH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#374151]">
                {performanceRows.map((row, idx) => (
                  <tr key={row.outlet.id} className="hover:bg-[#F9FAFB] transition">
                    <td className="py-1.5 px-1 text-center font-medium text-[#6B7280]">{idx + 1}</td>
                    <td className="py-1.5 px-1.5 font-bold text-[#111827] truncate max-w-[110px] sm:max-w-[130px]" title={row.outlet.name}>
                      {row.outlet.name}
                    </td>
                    <td className="py-1.5 px-1 text-center text-[#374151]">
                      {row.mtd.penonton.toLocaleString('id-ID')}
                    </td>
                    <td className="py-1.5 px-1 text-right text-[#6B7280]">
                      {row.outlet.targetHead === 0
                        ? '0'
                        : row.outlet.targetHead.toLocaleString('id-ID')}
                    </td>
                    <td className="py-1.5 px-1 text-right text-[#6B7280] font-semibold">
                      {row.mtd.metrics.head.toLocaleString('id-ID')}
                    </td>
                    <td className="py-1.5 px-1 text-center">
                      <span
                        className={`font-semibold ${
                          row.mtd.metrics.achievement >= 100
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {row.mtd.metrics.achievement}%
                      </span>
                    </td>
                    <td className="py-1.5 px-1 text-center text-[#374151]">
                      {row.mtd.metrics.dayaSerap}%
                    </td>
                    <td className="py-1.5 px-1 text-right text-[#6B7280]">
                      {row.mtd.metrics.at.toLocaleString('id-ID')}
                    </td>
                    <td className="py-1.5 px-1 text-right font-medium">
                      <span
                        className={
                          row.mtd.metrics.selisih >= 0
                            ? 'text-emerald-600 font-semibold'
                            : 'text-rose-600'
                        }
                      >
                        {row.mtd.metrics.selisih >= 0 ? '+' : ''}{row.mtd.metrics.selisih.toLocaleString('id-ID')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
