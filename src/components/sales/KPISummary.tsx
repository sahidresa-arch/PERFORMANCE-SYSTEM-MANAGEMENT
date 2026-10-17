import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { User } from '../../types';
import { StorageService } from '../../lib/storage';
import { exportToPrettyExcel } from '../../lib/excelExport';
import {
  Calendar,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Percent,
  Users,
  CreditCard,
  Target,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';

interface KPISummaryProps {
  currentUser: User | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

type PeriodType = 'harian' | 'mingguan' | 'bulanan' | 'kuartal' | 'semester' | 'tahunan';

interface BreakdownRow {
  key: string;
  label: string;
  subLabel?: string;
  omsetCinema: number;
  omsetFnB: number;
  bill: number;
  penonton: number;
  targetHead: number;
  isFilled: boolean;
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

export const KPISummary: React.FC<KPISummaryProps> = ({
  currentUser,
  selectedDate,
  onDateChange,
}) => {
  const areas = StorageService.getAreas();
  const rawOutlets = StorageService.getOutlets();
  const isManagerOrCleaner = (currentUser?.role === 'manager' || currentUser?.role === 'cleaner') && currentUser?.outletId;
  const outlets = isManagerOrCleaner
    ? rawOutlets.filter((o) => o.id === currentUser.outletId)
    : rawOutlets;
  const [allSales, setAllSales] = React.useState(() => StorageService.getDailySales());

  React.useEffect(() => {
    const handleStorageUpdate = () => {
      setAllSales(StorageService.getDailySales());
    };
    window.addEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('cinema-xxi-storage-update', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'area_manager';

  const defaultOutletId =
    currentUser?.outletId || (outlets.length > 0 ? outlets[0].id : '');
  const [selectedAreaId, setSelectedAreaId] = useState<string>(areas[0]?.id || '');
  const areaOutlets = outlets.filter((o) => (isManagerOrCleaner ? true : selectedAreaId ? o.areaId === selectedAreaId : true));
  const [selectedOutletId, setSelectedOutletId] = useState<string>(
    currentUser?.outletId || (areaOutlets[0]?.id || defaultOutletId)
  );

  const [period, setPeriod] = useState<PeriodType>('harian');
  const [selectedQuarter, setSelectedQuarter] = useState<number>(() => {
    const m = new Date(selectedDate || '2026-10-09').getMonth();
    return Math.floor(m / 3) + 1; // 1, 2, 3, or 4
  });
  const [selectedSemester, setSelectedSemester] = useState<number>(() => {
    const m = new Date(selectedDate || '2026-10-09').getMonth();
    return m < 6 ? 1 : 2; // 1 (Jan-Jun) or 2 (Jul-Des)
  });

  const handleAreaChange = (newAreaId: string) => {
    setSelectedAreaId(newAreaId);
    const newOutlets = outlets.filter((o) => o.areaId === newAreaId);
    if (newOutlets.length > 0 && !newOutlets.some((o) => o.id === selectedOutletId)) {
      setSelectedOutletId(newOutlets[0].id);
    }
  };

  const selectedOutlet = outlets.find((o) => o.id === selectedOutletId) || outlets[0];
  const targetHead = selectedOutlet?.targetHead || 0;

  // Parse reference date
  const refDateObj = new Date(selectedDate || '2026-10-09');
  const refYear = refDateObj.getFullYear();
  const refMonth = refDateObj.getMonth(); // 0-indexed

  // Helper to change year
  const handleYearChange = (newYear: number) => {
    const parts = (selectedDate || '2026-10-09').split('-');
    const m = parts[1] || '10';
    const d = parts[2] || '09';

    const monthNum = parseInt(m, 10);
    const dayNum = parseInt(d, 10);
    const maxDays = new Date(newYear, monthNum, 0).getDate();
    const validDay = Math.min(dayNum, maxDays);

    const formattedMonth = String(monthNum).padStart(2, '0');
    const formattedDay = String(validDay).padStart(2, '0');

    onDateChange(`${newYear}-${formattedMonth}-${formattedDay}`);
  };

  // Helper to format YYYY-MM-DD
  const formatDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // ACCURATE POS AGGREGATION FOR A SPECIFIC DATE:
  // Each show input stores the Cumulative POS s/d Show N.
  // Therefore, a date's total sales equals the LATEST filled show's cumulative figures!
  const getSaleForDate = (dateStr: string) => {
    const rec = allSales.find((s) => s.outletId === selectedOutletId && s.date === dateStr);
    if (!rec || !rec.shows || rec.shows.length === 0) {
      return { cinema: 0, fnb: 0, bill: 0, penonton: 0, isFilled: false };
    }
    const filledShows = rec.shows.filter((sh) => sh.isFilled || sh.omsetCinema > 0 || sh.omsetFnB > 0);
    if (filledShows.length === 0) {
      return { cinema: 0, fnb: 0, bill: 0, penonton: 0, isFilled: false };
    }
    // Latest show represents cumulative POS totals for that date
    const latestShow = [...filledShows].sort((a, b) => b.showNumber - a.showNumber)[0];
    return {
      cinema: latestShow.omsetCinema || 0,
      fnb: latestShow.omsetFnB || 0,
      bill: latestShow.bill || 0,
      penonton: latestShow.penonton || 0,
      isFilled: true,
    };
  };

  let breakdownRows: BreakdownRow[] = [];
  let periodSubtitle = '';
  let tableHeaderTitle = '';

  if (period === 'harian') {
    tableHeaderTitle = `RINCIAN HASIL PENJUALAN MURNI 5 SHOWTIME (HARIAN - ${selectedDate})`;
    periodSubtitle = `Harian (${selectedDate})`;

    const saleRecord = StorageService.getDailySaleByOutletAndDate(
      selectedOutletId,
      selectedDate
    );

    // In Daily view: rows show NET / MURNI per show, so Show 1 = 4M, Show 2 = 1.16M, Show 3 = 2.04M
    breakdownRows = [1, 2, 3, 4, 5].map((sNum) => {
      const current = saleRecord.shows.find((item) => item.showNumber === sNum);
      const prev = sNum > 1 ? saleRecord.shows.find((item) => item.showNumber === sNum - 1) : null;

      const cumCin = current?.omsetCinema || 0;
      const cumFnb = current?.omsetFnB || 0;
      const cumBill = current?.bill || 0;
      const cumPenonton = current?.penonton || 0;

      const prevCin = prev?.omsetCinema || 0;
      const prevFnb = prev?.omsetFnB || 0;
      const prevBill = prev?.bill || 0;
      const prevPenonton = prev?.penonton || 0;

      const isFilled = (current?.isFilled || cumCin > 0 || cumFnb > 0) ?? false;

      const netCin = isFilled ? Math.max(0, cumCin - prevCin) : 0;
      const netFnb = isFilled ? Math.max(0, cumFnb - prevFnb) : 0;
      const netBill = isFilled ? Math.max(0, cumBill - prevBill) : 0;
      const netPenonton = isFilled ? Math.max(0, cumPenonton - prevPenonton) : 0;

      return {
        key: `show-${sNum}`,
        label: `Show ke-${sNum}`,
        omsetCinema: netCin,
        omsetFnB: netFnb,
        bill: netBill,
        penonton: netPenonton,
        targetHead,
        isFilled,
      };
    });
  } else if (period === 'mingguan') {
    // Mingguan: 7 hari dalam 1 minggu (Senin s/d Minggu)
    const currentDayOfWeek = refDateObj.getDay();
    const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(refDateObj);
    monday.setDate(refDateObj.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    periodSubtitle = `Mingguan (${formatDateStr(monday)} s/d ${formatDateStr(sunday)})`;
    tableHeaderTitle = `RINCIAN PERFORMA MINGGUAN (${formatDateStr(monday)} S/D ${formatDateStr(sunday)})`;

    breakdownRows = [];
    for (let i = 0; i < 7; i++) {
      const curDate = new Date(monday);
      curDate.setDate(monday.getDate() + i);
      const curDateStr = formatDateStr(curDate);
      const dayName = DAY_NAMES[curDate.getDay()];
      const sale = getSaleForDate(curDateStr);

      breakdownRows.push({
        key: curDateStr,
        label: `${dayName}, ${curDate.getDate()} ${MONTH_NAMES[curDate.getMonth()]}`,
        subLabel: curDateStr,
        omsetCinema: sale.cinema,
        omsetFnB: sale.fnb,
        bill: sale.bill,
        penonton: sale.penonton,
        targetHead,
        isFilled: sale.isFilled,
      });
    }
  } else if (period === 'bulanan') {
    // Bulanan: Tampilan tanggal 1 s/d hari terakhir bulan
    const daysInMonth = new Date(refYear, refMonth + 1, 0).getDate();
    const firstDateStr = `${refYear}-${String(refMonth + 1).padStart(2, '0')}-01`;
    const lastDateStr = `${refYear}-${String(refMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    periodSubtitle = `Bulanan (${firstDateStr} s/d ${lastDateStr} — ${MONTH_NAMES[refMonth]} ${refYear})`;
    tableHeaderTitle = `RINCIAN PERFORMA BULANAN (${MONTH_NAMES[refMonth].toUpperCase()} ${refYear}: TANGGAL 1 S/D ${daysInMonth})`;

    breakdownRows = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const curDate = new Date(refYear, refMonth, day);
      const curDateStr = formatDateStr(curDate);
      const sale = getSaleForDate(curDateStr);

      breakdownRows.push({
        key: curDateStr,
        label: `Tgl ${day} ${MONTH_NAMES[refMonth]}`,
        subLabel: DAY_NAMES[curDate.getDay()],
        omsetCinema: sale.cinema,
        omsetFnB: sale.fnb,
        bill: sale.bill,
        penonton: sale.penonton,
        targetHead,
        isFilled: sale.isFilled,
      });
    }
  } else if (period === 'kuartal') {
    // Kuartal: tampilan 3 bulan
    const qStartMonth = (selectedQuarter - 1) * 3;
    const qMonths = [qStartMonth, qStartMonth + 1, qStartMonth + 2];

    periodSubtitle = `Kuartal ${selectedQuarter} ${refYear} (${MONTH_NAMES[qMonths[0]]} - ${MONTH_NAMES[qMonths[2]]})`;
    tableHeaderTitle = `RINCIAN PERFORMA KUARTAL ${selectedQuarter} ${refYear} (3 BULAN)`;

    breakdownRows = qMonths.map((mIdx) => {
      const mName = MONTH_NAMES[mIdx];
      const daysInM = new Date(refYear, mIdx + 1, 0).getDate();

      let cinema = 0;
      let fnb = 0;
      let bill = 0;
      let penonton = 0;
      let isFilled = false;

      for (let day = 1; day <= daysInM; day++) {
        const curDateStr = `${refYear}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const sale = getSaleForDate(curDateStr);
        cinema += sale.cinema;
        fnb += sale.fnb;
        bill += sale.bill;
        penonton += sale.penonton;
        if (sale.isFilled) isFilled = true;
      }

      return {
        key: `quarter-${mIdx}`,
        label: `Bulan ${mName}`,
        subLabel: `${refYear}`,
        omsetCinema: cinema,
        omsetFnB: fnb,
        bill,
        penonton,
        targetHead,
        isFilled,
      };
    });
  } else if (period === 'semester') {
    // Semester: tampilan 6 bulan
    const semStartMonth = selectedSemester === 1 ? 0 : 6;
    const semMonths = [0, 1, 2, 3, 4, 5].map((i) => semStartMonth + i);

    periodSubtitle = `Semester ${selectedSemester} ${refYear} (${MONTH_NAMES[semMonths[0]]} - ${MONTH_NAMES[semMonths[5]]})`;
    tableHeaderTitle = `RINCIAN PERFORMA SEMESTER ${selectedSemester} ${refYear} (6 BULAN)`;

    breakdownRows = semMonths.map((mIdx) => {
      const mName = MONTH_NAMES[mIdx];
      const daysInM = new Date(refYear, mIdx + 1, 0).getDate();

      let cinema = 0;
      let fnb = 0;
      let bill = 0;
      let penonton = 0;
      let isFilled = false;

      for (let day = 1; day <= daysInM; day++) {
        const curDateStr = `${refYear}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const sale = getSaleForDate(curDateStr);
        cinema += sale.cinema;
        fnb += sale.fnb;
        bill += sale.bill;
        penonton += sale.penonton;
        if (sale.isFilled) isFilled = true;
      }

      return {
        key: `semester-${mIdx}`,
        label: `Bulan ${mName}`,
        subLabel: `${refYear}`,
        omsetCinema: cinema,
        omsetFnB: fnb,
        bill,
        penonton,
        targetHead,
        isFilled,
      };
    });
  } else if (period === 'tahunan') {
    // Tahunan: tampilan 12 bulan (Januari s/d Desember)
    periodSubtitle = `Tahunan ${refYear} (Januari s/d Desember)`;
    tableHeaderTitle = `RINCIAN PERFORMA TAHUNAN ${refYear} (12 BULAN: JANUARI S/D DESEMBER)`;

    breakdownRows = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((mIdx) => {
      const mName = MONTH_NAMES[mIdx];
      const daysInM = new Date(refYear, mIdx + 1, 0).getDate();

      let cinema = 0;
      let fnb = 0;
      let bill = 0;
      let penonton = 0;
      let isFilled = false;

      for (let day = 1; day <= daysInM; day++) {
        const curDateStr = `${refYear}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const sale = getSaleForDate(curDateStr);
        cinema += sale.cinema;
        fnb += sale.fnb;
        bill += sale.bill;
        penonton += sale.penonton;
        if (sale.isFilled) isFilled = true;
      }

      return {
        key: `tahunan-${mIdx}`,
        label: `${mName}`,
        subLabel: `Tahun ${refYear}`,
        omsetCinema: cinema,
        omsetFnB: fnb,
        bill,
        penonton,
        targetHead,
        isFilled,
      };
    });
  }

  // Aggregate Total Across Rows for the current period
  const totalPeriodCinema = breakdownRows.reduce((acc, r) => acc + r.omsetCinema, 0);
  const totalPeriodFnB = breakdownRows.reduce((acc, r) => acc + r.omsetFnB, 0);
  const totalPeriodBill = breakdownRows.reduce((acc, r) => acc + r.bill, 0);
  const totalPeriodPenonton = breakdownRows.reduce((acc, r) => acc + r.penonton, 0);

  // Calculate Metrics for period total
  const periodMetrics = StorageService.calculateMetrics(
    totalPeriodCinema,
    totalPeriodFnB,
    totalPeriodBill,
    totalPeriodPenonton,
    targetHead
  );

  const hasAnyData = totalPeriodPenonton > 0 || totalPeriodFnB > 0 || totalPeriodCinema > 0;

  const handleExportXLS = () => {
    const dataToExport = breakdownRows.map((row) => {
      const rowMet = StorageService.calculateMetrics(
        row.omsetCinema,
        row.omsetFnB,
        row.bill,
        row.penonton,
        targetHead
      );
      const isCapai = rowMet.head >= targetHead;
      return {
        'Periode / Show / Tanggal': row.label + (row.subLabel ? ` (${row.subLabel})` : ''),
        'Omset Cinema (Rp)': row.omsetCinema > 0 ? `Rp ${row.omsetCinema.toLocaleString('id-ID')}` : 'Rp 0',
        'Omset F&B (Rp)': row.omsetFnB > 0 ? `Rp ${row.omsetFnB.toLocaleString('id-ID')}` : 'Rp 0',
        'Struk (Bill)': row.bill > 0 ? row.bill.toLocaleString('id-ID') : '0',
        'Penonton (Orang)': row.penonton > 0 ? row.penonton.toLocaleString('id-ID') : '0',
        'Daya Serap (%)': row.penonton > 0 ? `${rowMet.dayaSerap}%` : '0%',
        'Target SPH (Rp)': `Rp ${targetHead.toLocaleString('id-ID')}`,
        'Real SPH (Rp)': row.penonton > 0 ? `Rp ${rowMet.head.toLocaleString('id-ID')}` : 'Rp 0',
        'Achievement (%)': row.penonton > 0 ? `${rowMet.achievement}%` : '0%',
        'Avg Transaction / AT (Rp)': row.bill > 0 ? `Rp ${rowMet.at.toLocaleString('id-ID')}` : 'Rp 0',
        'Selisih SPH (Rp)': row.penonton > 0 ? `${rowMet.selisih >= 0 ? '+' : ''}Rp ${rowMet.selisih.toLocaleString('id-ID')}` : 'Rp 0',
        'Status': row.penonton > 0 ? (isCapai ? 'CAPAI' : 'TIDAK CAPAI') : '-',
      };
    });

    // Add Summary Total Row
    dataToExport.push({
      'Periode / Show / Tanggal': `TOTAL ${period.toUpperCase()}`,
      'Omset Cinema (Rp)': `Rp ${totalPeriodCinema.toLocaleString('id-ID')}`,
      'Omset F&B (Rp)': `Rp ${totalPeriodFnB.toLocaleString('id-ID')}`,
      'Struk (Bill)': totalPeriodBill.toLocaleString('id-ID'),
      'Penonton (Orang)': totalPeriodPenonton.toLocaleString('id-ID'),
      'Daya Serap (%)': `${periodMetrics.dayaSerap}%`,
      'Target SPH (Rp)': `Rp ${targetHead.toLocaleString('id-ID')}`,
      'Real SPH (Rp)': `Rp ${periodMetrics.head.toLocaleString('id-ID')}`,
      'Achievement (%)': `${periodMetrics.achievement}%`,
      'Avg Transaction / AT (Rp)': `Rp ${periodMetrics.at.toLocaleString('id-ID')}`,
      'Selisih SPH (Rp)': `${periodMetrics.selisih >= 0 ? '+' : ''}Rp ${periodMetrics.selisih.toLocaleString('id-ID')}`,
      'Status': periodMetrics.head >= targetHead ? 'CAPAI' : 'TIDAK CAPAI',
    });

    const cleanOutletName = selectedOutlet.name.replace(/[^a-zA-Z0-9]/g, '_');
    const areaName = areas.find((a) => a.id === selectedOutlet.areaId)?.name || 'Wilayah';

    exportToPrettyExcel({
      title: `CINEMA XXI - LAPORAN REKAP KPI SUMMARY OUTLET`,
      subtitle: `Outlet: ${selectedOutlet.name} | Wilayah: ${areaName} | Mode Periode: ${periodSubtitle}`,
      metaInfo: `Target SPH Outlet: Rp ${targetHead.toLocaleString('id-ID')} | Tanggal Acuan: ${selectedDate}`,
      sheetName: 'KPI Summary',
      filename: `KPI_Summary_${cleanOutletName}_${period}_${selectedDate}.xlsx`,
      data: dataToExport,
      columnWidths: {
        'Periode / Show / Tanggal': 32,
        'Omset Cinema (Rp)': 22,
        'Omset F&B (Rp)': 22,
        'Struk (Bill)': 16,
        'Penonton (Orang)': 18,
        'Daya Serap (%)': 16,
        'Target SPH (Rp)': 20,
        'Real SPH (Rp)': 20,
        'Achievement (%)': 18,
        'Avg Transaction / AT (Rp)': 24,
        'Selisih SPH (Rp)': 22,
        'Status': 16,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Top Header Banner - Cinema XXI Visual Identity */}
      <div className="rounded-[12px] border border-[#E5E7EB] bg-white text-[#111827] shadow-xs p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#7C3AED] text-white font-bold text-[10px] uppercase tracking-wider">
                ADMINISTRATOR KPI OUTLET
              </span>
              <span className="text-[11px] font-semibold text-[#6B7280]">
                &bull; {areas.find((a) => a.id === selectedOutlet.areaId)?.name}
              </span>
            </div>
            <h2 className="text-[18px] font-bold text-[#111827] mt-1.5 flex items-center space-x-2">
              <span>KPI Summary:</span>
              <span className="text-[#7C3AED]">{selectedOutlet.name}</span>
            </h2>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              Monitoring performa bisnis, rasio daya serap FnB dan pencapaian target harian hingga tahunan secara real-time dari data sales.
            </p>
          </div>

          {/* Right Selectors */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
                WILAYAH KPI
              </label>
              <select
                value={selectedAreaId}
                onChange={(e) => handleAreaChange(e.target.value)}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-[8px] border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#7C3AED] shadow-2xs cursor-pointer"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
                PILIH OUTLET KPI
              </label>
              <select
                value={selectedOutletId}
                disabled={!isAdmin}
                onChange={(e) => setSelectedOutletId(e.target.value)}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-[8px] border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#7C3AED] shadow-2xs ${
                  !isAdmin ? 'opacity-80' : 'cursor-pointer'
                }`}
              >
                {areaOutlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
                TAHUN KPI
              </label>
              <select
                value={refYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-[8px] border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#7C3AED] shadow-2xs cursor-pointer"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">
                TANGGAL ACUAN
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-[8px] border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#7C3AED] shadow-2xs cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="mt-4 pt-4 border-t border-[#F3F4F6] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'harian', label: 'Harian' },
              { id: 'mingguan', label: 'Mingguan' },
              { id: 'bulanan', label: 'Bulanan' },
              { id: 'kuartal', label: 'Kuartal' },
              { id: 'semester', label: 'Semester' },
              { id: 'tahunan', label: 'Tahunan' },
            ].map((p) => {
              const isActive = period === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id as PeriodType)}
                  className={`px-3 py-1.5 rounded-[8px] text-[11px] font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-[#7C3AED] text-white shadow-xs'
                      : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#111827]'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Sub-selector for Kuartal or Semester */}
          <div className="flex items-center gap-2">
            {period === 'kuartal' && (
              <div className="flex items-center space-x-1 bg-[#F3E8FF] p-1 rounded-[8px] border border-[#E9D5FF]">
                <span className="text-[10px] font-bold text-[#7C3AED] px-1.5">Pilih:</span>
                {[1, 2, 3, 4].map((q) => (
                  <button
                    key={q}
                    onClick={() => setSelectedQuarter(q)}
                    className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold cursor-pointer transition ${
                      selectedQuarter === q
                        ? 'bg-[#7C3AED] text-white shadow-2xs'
                        : 'text-[#6D28D9] hover:bg-white'
                    }`}
                  >
                    Kuartal {q}
                  </button>
                ))}
              </div>
            )}

            {period === 'semester' && (
              <div className="flex items-center space-x-1 bg-[#F3E8FF] p-1 rounded-[8px] border border-[#E9D5FF]">
                <span className="text-[10px] font-bold text-[#7C3AED] px-1.5">Pilih:</span>
                {[
                  { s: 1, label: 'Semester 1 (Jan - Jun)' },
                  { s: 2, label: 'Semester 2 (Jul - Des)' },
                ].map((item) => (
                  <button
                    key={item.s}
                    onClick={() => setSelectedSemester(item.s)}
                    className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold cursor-pointer transition ${
                      selectedSemester === item.s
                        ? 'bg-[#7C3AED] text-white shadow-2xs'
                        : 'text-[#6D28D9] hover:bg-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            <span className="text-[11px] text-[#6B7280]">
              Mode: <strong className="text-[#7C3AED]">{periodSubtitle}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. 7 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. TARGET SPH */}
        <div className="h-[75px] rounded-[10px] p-2.5 bg-[#FFFFFF] border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#6B7280]">
              TARGET SPH
            </span>
            <Target className="w-3.5 h-3.5 text-[#6B7280]" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-[#111827] leading-tight">
              {targetHead.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-[#9CA3AF] leading-none mt-0.5">
              Target outlet
            </div>
          </div>
        </div>

        {/* 2. SPH (HEAD) */}
        <div className="h-[75px] rounded-[10px] p-2.5 bg-[#F5F0FF] border border-[#E9D5FF] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#6B7280]">
              HEAD {period === 'harian' ? 'DAILY' : period.toUpperCase()}
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-[#7C3AED]" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-[#111827] leading-tight">
              {periodMetrics.head.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-[#7C3AED] font-semibold leading-none mt-0.5">
              FnB / Penonton
            </div>
          </div>
        </div>

        {/* 3. ACHIEVEMENT */}
        <div className="h-[75px] rounded-[10px] p-2.5 bg-[#FFF8E1] border border-[#FEF08A] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#6B7280]">
              ACHIEVEMENT
            </span>
            <Percent className="w-3.5 h-3.5 text-[#D97706]" />
          </div>
          <div>
            <div className={`text-[14px] font-bold leading-tight ${
              periodMetrics.achievement >= 100 ? 'text-[#15803D]' : 'text-[#B91C1C]'
            }`}>
              {periodMetrics.achievement}%
            </div>
            <div className="text-[10px] text-[#9CA3AF] leading-none mt-0.5">
              {periodMetrics.achievement >= 100 ? 'Target Tercapai' : 'Kurang Target'}
            </div>
          </div>
        </div>

        {/* 4. PENONTON */}
        <div className="h-[75px] rounded-[10px] p-2.5 bg-[#E8F6FF] border border-[#BAE6FD] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#6B7280]">
              PENONTON
            </span>
            <Users className="w-3.5 h-3.5 text-[#0284C7]" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-[#111827] leading-tight">
              {totalPeriodPenonton.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-[#0284C7] font-semibold leading-none mt-0.5">
              Total penonton
            </div>
          </div>
        </div>

        {/* 5. DAYA SERAP */}
        <div className="h-[75px] rounded-[10px] p-2.5 bg-[#FFE8EF] border border-[#FECDD3] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#6B7280]">
              DAYA SERAP
            </span>
            <Percent className="w-3.5 h-3.5 text-[#E11D48]" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-[#111827] leading-tight">
              {periodMetrics.dayaSerap}%
            </div>
            <div className="text-[10px] text-[#9CA3AF] leading-none mt-0.5">
              Bill / Penonton
            </div>
          </div>
        </div>

        {/* 6. AVERAGE TRANSAKSI (AT) */}
        <div className="h-[75px] rounded-[10px] p-2.5 bg-[#FFF0F5] border border-[#FBCFE8] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#6B7280]">
              AT
            </span>
            <CreditCard className="w-3.5 h-3.5 text-[#DB2777]" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-[#111827] leading-tight">
              {periodMetrics.at.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-[#9CA3AF] leading-none mt-0.5">
              Rerata per bill
            </div>
          </div>
        </div>

        {/* 7. SELISIH (RP) */}
        <div className="h-[75px] rounded-[10px] p-2.5 bg-[#E6FFF0] border border-[#BBF7D0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#6B7280]">
              SELISIH (RP)
            </span>
            <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
          </div>
          <div>
            <div className={`text-[14px] font-bold leading-tight ${
              periodMetrics.selisih >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'
            }`}>
              {periodMetrics.selisih >= 0 ? '+' : ''}
              {periodMetrics.selisih.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-[#9CA3AF] leading-none mt-0.5">
              (SPH - Tgt) x Pnt
            </div>
          </div>
        </div>
      </div>

      {!hasAnyData && (
        <div className="p-3.5 rounded-[10px] bg-[#FFFBEB] border border-[#FDE68A] flex items-center space-x-3 text-[#92400E] text-[11px]">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#D97706]" />
          <div>
            <p className="font-bold">PERHATIAN: BELUM ADA DATA PADA PERIODE INI</p>
            <p className="text-[#78350F]">
              Belum ada data penjualan tersimpan untuk {selectedOutlet.name} pada periode {periodSubtitle}. Anda dapat melakukan pengisian data melalui tab &quot;Input Data Sales&quot; di menu Sales System.
            </p>
          </div>
        </div>
      )}

      {/* 3. RINCIAN PERFORMA TABLE */}
      <div className="rounded-[12px] border border-[#E5E7EB] bg-white text-[#111827] shadow-xs overflow-hidden">
        {/* Table Title Bar */}
        <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
            <h3 className="font-bold text-[13px] text-[#111827] uppercase tracking-wide">
              {tableHeaderTitle}
            </h3>

            {/* Dropdown Pilihan Tahun disamping RINCIAN PERFORMA */}
            <div className="flex items-center space-x-1.5 pl-3 border-l border-[#E5E7EB]">
              <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                Tahun:
              </label>
              <select
                value={refYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="text-[11px] font-bold px-2.5 py-1 rounded-[6px] border border-[#D8B4FE] bg-[#F3E8FF] text-[#7C3AED] hover:bg-[#EDE9FE] focus:outline-none focus:ring-1 focus:ring-[#7C3AED] shadow-2xs cursor-pointer"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y} className="bg-white text-[#111827] font-semibold">
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#F3E8FF] text-[#7C3AED] font-semibold border border-[#E9D5FF]">
              {breakdownRows.length} Baris Data
            </span>
            <button
              onClick={handleExportXLS}
              className="px-3 py-1.5 rounded-[8px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center space-x-1.5 shadow-2xs transition cursor-pointer shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download XLS</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <tr>
                <th className="py-2.5 px-3 text-[10px] uppercase font-semibold text-[#6B7280] tracking-[0.5px]">
                  {period === 'harian' ? 'SHOW' : period === 'mingguan' ? 'HARI & TANGGAL' : period === 'bulanan' ? 'TANGGAL' : 'BULAN'}
                </th>
                <th className="py-2.5 px-3 text-[10px] uppercase font-semibold text-[#6B7280] tracking-[0.5px] text-right">
                  OMSET CINEMA
                </th>
                <th className="py-2.5 px-3 text-[10px] uppercase font-semibold text-[#059669] tracking-[0.5px] text-right">
                  OMSET FNB
                </th>
                <th className="py-2.5 px-3 text-[10px] uppercase font-semibold text-[#6B7280] tracking-[0.5px] text-center">
                  BILL
                </th>
                <th className="py-2.5 px-3 text-[10px] uppercase font-semibold text-[#6B7280] tracking-[0.5px] text-center">
                  PENONTON
                </th>
                <th className="py-2.5 px-3 text-[10px] uppercase font-semibold text-[#6B7280] tracking-[0.5px] text-center">
                  DAYA SERAP (%)
                </th>
                <th className="py-2.5 px-3 text-[10px] uppercase font-semibold text-[#6B7280] tracking-[0.5px] text-right">
                  TARGET SPH
                </th>
                <th className="py-2.5 px-3 text-[10px] uppercase font-semibold text-[#0284C7] tracking-[0.5px] text-right">
                  SPH (HEAD)
                </th>
                <th className="py-2.5 px-3 text-[10px] uppercase font-semibold text-[#6B7280] tracking-[0.5px] text-center">
                  ACHIEVEMENT
                </th>
                <th className="py-2.5 px-3 text-[10px] uppercase font-semibold text-[#6B7280] tracking-[0.5px] text-right">
                  AT
                </th>
                <th className="py-2.5 px-3 text-[10px] uppercase font-semibold text-[#6B7280] tracking-[0.5px] text-right">
                  SELISIH
                </th>
                <th className="py-2.5 px-3 text-[10px] uppercase font-semibold text-[#6B7280] tracking-[0.5px] text-center">
                  STATUS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6] text-[11px] text-[#374151]">
              {breakdownRows.map((row) => {
                const rowMet = StorageService.calculateMetrics(
                  row.omsetCinema,
                  row.omsetFnB,
                  row.bill,
                  row.penonton,
                  targetHead
                );
                const hasData = row.penonton > 0 || row.omsetFnB > 0 || row.omsetCinema > 0;
                const isCapai = rowMet.head >= targetHead;

                return (
                  <tr key={row.key} className="hover:bg-[#F9FAFB] transition">
                    <td className="py-2.5 px-3 font-bold text-[#111827]">
                      <div className="flex flex-col">
                        <span>{row.label}</span>
                        {row.subLabel && (
                          <span className="text-[10px] font-normal text-[#9CA3AF]">
                            {row.subLabel}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#374151]">
                      {row.omsetCinema > 0 ? row.omsetCinema.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#059669] font-bold">
                      {row.omsetFnB > 0 ? row.omsetFnB.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[#374151]">
                      {row.bill > 0 ? row.bill.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[#374151]">
                      {row.penonton > 0 ? row.penonton.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[#374151]">
                      {row.penonton > 0 ? `${rowMet.dayaSerap}%` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#6B7280]">
                      {targetHead.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#0284C7]">
                      {row.penonton > 0 ? rowMet.head.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.penonton > 0 ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-[6px] text-[10px] font-bold ${
                            rowMet.achievement >= 100
                              ? 'bg-[#DCFCE7] text-[#15803D]'
                              : 'bg-[#FEE2E2] text-[#B91C1C]'
                          }`}
                        >
                          {rowMet.achievement}%
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#374151]">
                      {row.bill > 0 ? rowMet.at.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      {row.penonton > 0 ? (
                        <span
                          className={
                            rowMet.selisih >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'
                          }
                        >
                          {rowMet.selisih >= 0 ? '+' : ''}
                          {rowMet.selisih.toLocaleString('id-ID')}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {hasData ? (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isCapai
                              ? 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]'
                              : 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5]'
                          }`}
                        >
                          {isCapai ? 'Capai' : 'Tidak Capai'}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F3F4F6] text-[#9CA3AF]">
                          -
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* TOTAL ROW */}
              <tr className="bg-[#FAF5FF] font-bold text-[#111827] border-t-2 border-[#D8B4FE]">
                <td className="py-3 px-3 font-bold text-[#6D28D9] uppercase">
                  TOTAL {period.toUpperCase()}
                </td>
                <td className="py-3 px-3 text-right text-[#111827]">
                  {totalPeriodCinema.toLocaleString('id-ID')}
                </td>
                <td className="py-3 px-3 text-right text-[#059669] font-bold">
                  {totalPeriodFnB.toLocaleString('id-ID')}
                </td>
                <td className="py-3 px-3 text-center">
                  {totalPeriodBill.toLocaleString('id-ID')}
                </td>
                <td className="py-3 px-3 text-center">
                  {totalPeriodPenonton.toLocaleString('id-ID')}
                </td>
                <td className="py-3 px-3 text-center">
                  {periodMetrics.dayaSerap}%
                </td>
                <td className="py-3 px-3 text-right text-[#6B7280]">
                  {targetHead.toLocaleString('id-ID')}
                </td>
                <td className="py-3 px-3 text-right font-bold text-[#0284C7]">
                  {periodMetrics.head.toLocaleString('id-ID')}
                </td>
                <td className="py-3 px-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-[6px] text-[10px] font-bold ${
                      periodMetrics.achievement >= 100
                        ? 'bg-[#DCFCE7] text-[#15803D]'
                        : 'bg-[#FEE2E2] text-[#B91C1C]'
                    }`}
                  >
                    {periodMetrics.achievement}%
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  {periodMetrics.at.toLocaleString('id-ID')}
                </td>
                <td className="py-3 px-3 text-right font-bold">
                  <span
                    className={
                      periodMetrics.selisih >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'
                    }
                  >
                    {periodMetrics.selisih >= 0 ? '+' : ''}
                    {periodMetrics.selisih.toLocaleString('id-ID')}
                  </span>
                </td>
                <td className="py-3 px-3 text-center">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      periodMetrics.head >= targetHead
                        ? 'bg-[#15803D] text-white border-[#15803D]'
                        : 'bg-[#B91C1C] text-white border-[#B91C1C]'
                    }`}
                  >
                    {periodMetrics.head >= targetHead ? 'Capai' : 'Tidak Capai'}
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
