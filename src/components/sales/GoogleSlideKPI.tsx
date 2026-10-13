import React, { useState } from 'react';
import { StorageService } from '../../lib/storage';
import { Outlet } from '../../types';
import { exportKPIToPPTX } from '../../lib/pptxExport';
import {
  Presentation,
  Download,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  BarChart3,
  Lightbulb,
  Target,
  Percent,
  Users,
  CreditCard,
  CheckCircle2,
  Trophy,
  TrendingUp,
  ArrowUpRight,
  Filter,
  Building2,
  Sparkles,
} from 'lucide-react';

interface GoogleSlideKPIProps {
  selectedDate?: string;
  onDateChange?: (date: string) => void;
}

type ComparisonMode = 'tahunan' | 'semester' | 'quartal' | 'bulanan' | 'custom';
type RankingIndicator = 'sph' | 'ach' | 'gbo' | 'dayaSerap' | 'at' | 'penonton' | 'fnb';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

interface PeriodMetricsData {
  label: string;
  subLabel: string;
  cinema: number;
  fnb: number;
  bill: number;
  penonton: number;
  sph: number;
  gbo: number;
  dayaSerap: number;
  at: number;
  achievement: number;
}

export const GoogleSlideKPI: React.FC<GoogleSlideKPIProps> = ({
  selectedDate: _propDate,
  onDateChange: _onDateChange,
}) => {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExportingPPTX, setIsExportingPPTX] = useState(false);

  // Filter comparison mode
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('tahunan');

  // Filter Outlet & Area
  const [selectedOutletId, setSelectedOutletId] = useState<string>('all');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');

  // Ranking indicator selection (Slide Ranking)
  const [selectedRankingIndicator, setSelectedRankingIndicator] = useState<RankingIndicator>('sph');
  const [rankingAreaFilter, setRankingAreaFilter] = useState<string>('all');

  // Year vs Year parameters
  const [yearA, setYearA] = useState<number>(2025);
  const [yearB, setYearB] = useState<number>(2026);

  // Semester vs Semester parameters
  const [semYearA, setSemYearA] = useState<number>(2026);
  const [semPeriodA, setSemPeriodA] = useState<number>(1); // 1: Jan-Jun, 2: Jul-Des
  const [semYearB, setSemYearB] = useState<number>(2026);
  const [semPeriodB, setSemPeriodB] = useState<number>(2);

  // Kuartal vs Kuartal parameters (Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Okt-Des)
  const [quarterYearA, setQuarterYearA] = useState<number>(2026);
  const [quarterA, setQuarterA] = useState<number>(3); // Q3 (Jul-Sep)
  const [quarterYearB, setQuarterYearB] = useState<number>(2026);
  const [quarterB, setQuarterB] = useState<number>(4); // Q4 (Okt-Des)

  // Month vs Month parameters
  const [monthYearA, setMonthYearA] = useState<number>(2026);
  const [monthA, setMonthA] = useState<number>(8); // 8: September (0-indexed)
  const [monthYearB, setMonthYearB] = useState<number>(2026);
  const [monthB, setMonthB] = useState<number>(9); // 9: Oktober (0-indexed)

  // Custom date range parameters (YYYY-MM-DD)
  const [customStartA, setCustomStartA] = useState<string>('2026-07-01');
  const [customEndA, setCustomEndA] = useState<string>('2026-09-30');
  const [customStartB, setCustomStartB] = useState<string>('2026-10-01');
  const [customEndB, setCustomEndB] = useState<string>('2026-10-09');

  const currentUser = StorageService.getCurrentUser();
  const areas = StorageService.getAreas();
  const rawOutlets = StorageService.getOutlets();
  const isManagerOrCleaner = (currentUser?.role === 'manager' || currentUser?.role === 'cleaner') && currentUser?.outletId;
  const outlets = isManagerOrCleaner
    ? rawOutlets.filter((o) => o.id === currentUser.outletId)
    : rawOutlets;
  const allSales = StorageService.getDailySales();

  // Filtered outlets based on area selection
  const areaFilteredOutlets = isManagerOrCleaner
    ? outlets
    : selectedAreaId === 'all'
    ? outlets
    : outlets.filter((o) => o.areaId === selectedAreaId);

  // Target outlets for computation
  const targetOutlets: Outlet[] = selectedOutletId === 'all'
    ? areaFilteredOutlets
    : areaFilteredOutlets.filter((o) => o.id === selectedOutletId);

  // Helper to aggregate sales for a specific date range & target outlets
  const getAggregatedData = (
    predicate: (year: number, month0: number, day: number, dateStr: string) => boolean,
    label: string,
    subLabel: string
  ): PeriodMetricsData => {
    let cinema = 0;
    let fnb = 0;
    let bill = 0;
    let penonton = 0;

    const outletIdSet = new Set(targetOutlets.map((o) => o.id));

    allSales.forEach((rec) => {
      if (!outletIdSet.has(rec.outletId)) return;
      const [yStr, mStr, dStr] = rec.date.split('-');
      const y = parseInt(yStr, 10);
      const m0 = parseInt(mStr, 10) - 1;
      const d = parseInt(dStr, 10);

      if (predicate(y, m0, d, rec.date)) {
        rec.shows.forEach((sh) => {
          cinema += sh.omsetCinema || 0;
          fnb += sh.omsetFnB || 0;
          bill += sh.bill || 0;
          penonton += sh.penonton || 0;
        });
      }
    });

    const sph = penonton > 0 ? Math.round(fnb / penonton) : 0;
    const gbo = cinema > 0 ? Number(((fnb / cinema) * 100).toFixed(1)) : 0;
    const dayaSerap = penonton > 0 ? Number(((bill / penonton) * 100).toFixed(1)) : 0;
    const at = bill > 0 ? Math.round(fnb / bill) : 0;

    // Target SPH (average across target outlets)
    const avgTargetHead = targetOutlets.length > 0
      ? Math.round(targetOutlets.reduce((acc, o) => acc + o.targetHead, 0) / targetOutlets.length)
      : 30000;
    const achievement = avgTargetHead > 0 ? Number(((sph / avgTargetHead) * 100).toFixed(1)) : 0;

    return {
      label,
      subLabel,
      cinema,
      fnb,
      bill,
      penonton,
      sph,
      gbo,
      dayaSerap,
      at,
      achievement,
    };
  };

  // Compute Period A and Period B based on comparisonMode
  let periodAData: PeriodMetricsData;
  let periodBData: PeriodMetricsData;
  let comparisonTitle = '';

  const getQuarterMonths = (q: number): [number, number] => {
    switch (q) {
      case 1: return [0, 2]; // Jan - Mar
      case 2: return [3, 5]; // Apr - Jun
      case 3: return [6, 8]; // Jul - Sep
      case 4: default: return [9, 11]; // Okt - Des
    }
  };

  const getQuarterLabel = (q: number) => {
    switch (q) {
      case 1: return 'K1 (Jan-Mar)';
      case 2: return 'K2 (Apr-Jun)';
      case 3: return 'K3 (Jul-Sep)';
      case 4: default: return 'K4 (Okt-Des)';
    }
  };

  if (comparisonMode === 'tahunan') {
    comparisonTitle = `Tahun ${yearA} vs Tahun ${yearB}`;
    periodAData = getAggregatedData(
      (y) => y === yearA,
      `Tahun ${yearA}`,
      `Jan - Des ${yearA}`
    );
    periodBData = getAggregatedData(
      (y) => y === yearB,
      `Tahun ${yearB}`,
      `Jan - Des ${yearB}`
    );
  } else if (comparisonMode === 'semester') {
    const semNameA = semPeriodA === 1 ? 'Semester 1 (Jan - Jun)' : 'Semester 2 (Jul - Des)';
    const semNameB = semPeriodB === 1 ? 'Semester 1 (Jan - Jun)' : 'Semester 2 (Jul - Des)';
    comparisonTitle = `${semNameA} ${semYearA} vs ${semNameB} ${semYearB}`;

    periodAData = getAggregatedData(
      (y, m0) => y === semYearA && (semPeriodA === 1 ? m0 < 6 : m0 >= 6),
      `Sem ${semPeriodA} ${semYearA}`,
      semPeriodA === 1 ? 'Jan - Jun' : 'Jul - Des'
    );
    periodBData = getAggregatedData(
      (y, m0) => y === semYearB && (semPeriodB === 1 ? m0 < 6 : m0 >= 6),
      `Sem ${semPeriodB} ${semYearB}`,
      semPeriodB === 1 ? 'Jan - Jun' : 'Jul - Des'
    );
  } else if (comparisonMode === 'quartal') {
    const [qStartA, qEndA] = getQuarterMonths(quarterA);
    const [qStartB, qEndB] = getQuarterMonths(quarterB);
    comparisonTitle = `Kuartal ${quarterA} ${quarterYearA} vs Kuartal ${quarterB} ${quarterYearB}`;

    periodAData = getAggregatedData(
      (y, m0) => y === quarterYearA && m0 >= qStartA && m0 <= qEndA,
      `K${quarterA} ${quarterYearA}`,
      getQuarterLabel(quarterA)
    );
    periodBData = getAggregatedData(
      (y, m0) => y === quarterYearB && m0 >= qStartB && m0 <= qEndB,
      `K${quarterB} ${quarterYearB}`,
      getQuarterLabel(quarterB)
    );
  } else if (comparisonMode === 'custom') {
    comparisonTitle = `Custom: ${customStartA || '-'} s/d ${customEndA || '-'} VS ${customStartB || '-'} s/d ${customEndB || '-'}`;
    periodAData = getAggregatedData(
      (_y, _m0, _d, dateStr) => (!customStartA || dateStr >= customStartA) && (!customEndA || dateStr <= customEndA),
      `Periode A (${customStartA} s/d ${customEndA})`,
      'Rentang Tanggal A'
    );
    periodBData = getAggregatedData(
      (_y, _m0, _d, dateStr) => (!customStartB || dateStr >= customStartB) && (!customEndB || dateStr <= customEndB),
      `Periode B (${customStartB} s/d ${customEndB})`,
      'Rentang Tanggal B'
    );
  } else {
    // Bulanan
    const mNameA = `${MONTH_NAMES[monthA]} ${monthYearA}`;
    const mNameB = `${MONTH_NAMES[monthB]} ${monthYearB}`;
    comparisonTitle = `${mNameA} vs ${mNameB}`;

    periodAData = getAggregatedData(
      (y, m0) => y === monthYearA && m0 === monthA,
      mNameA,
      `Bulan ${MONTH_NAMES[monthA]}`
    );
    periodBData = getAggregatedData(
      (y, m0) => y === monthYearB && m0 === monthB,
      mNameB,
      `Bulan ${MONTH_NAMES[monthB]}`
    );
  }

  // Monthly / Period Breakdown Trend for both Period A and Period B to create side-by-side comparative charts
  let comparativeTrendData: Array<{
    monthIdx: number;
    monthName: string;
    shortName: string;
    periodA: PeriodMetricsData;
    periodB: PeriodMetricsData;
  }> = [];

  if (comparisonMode === 'quartal') {
    const [qStartA] = getQuarterMonths(quarterA);
    const [qStartB] = getQuarterMonths(quarterB);
    comparativeTrendData = [0, 1, 2].map((idx) => {
      const mA = qStartA + idx;
      const mB = qStartB + idx;
      const dA = getAggregatedData(
        (y, m0) => y === quarterYearA && m0 === mA,
        MONTH_NAMES[mA],
        MONTH_NAMES[mA]
      );
      const dB = getAggregatedData(
        (y, m0) => y === quarterYearB && m0 === mB,
        MONTH_NAMES[mB],
        MONTH_NAMES[mB]
      );
      return {
        monthIdx: idx,
        monthName: MONTH_NAMES[mB],
        shortName: MONTH_NAMES[mB].substring(0, 3),
        periodA: dA,
        periodB: dB,
      };
    });
  } else if (comparisonMode === 'semester') {
    comparativeTrendData = [0, 1, 2, 3, 4, 5].map((idx) => {
      const offsetA = semPeriodA === 1 ? 0 : 6;
      const offsetB = semPeriodB === 1 ? 0 : 6;
      const mA = idx + offsetA;
      const mB = idx + offsetB;

      const dA = getAggregatedData(
        (y, m0) => y === semYearA && m0 === mA,
        MONTH_NAMES[mA],
        MONTH_NAMES[mA]
      );
      const dB = getAggregatedData(
        (y, m0) => y === semYearB && m0 === mB,
        MONTH_NAMES[mB],
        MONTH_NAMES[mB]
      );

      return {
        monthIdx: idx,
        monthName: MONTH_NAMES[mB],
        shortName: MONTH_NAMES[mB].substring(0, 3),
        periodA: dA,
        periodB: dB,
      };
    });
  } else if (comparisonMode === 'custom') {
    const dStartB = customStartB ? new Date(customStartB) : new Date('2026-01-01');
    const dEndB = customEndB ? new Date(customEndB) : new Date('2026-10-09');

    const monthList: Array<{ name: string; shortName: string; monthA: number; monthB: number }> = [];
    const curB = new Date(dStartB.getFullYear(), dStartB.getMonth(), 1);
    const endB = new Date(dEndB.getFullYear(), dEndB.getMonth(), 1);

    while (curB <= endB && monthList.length < 12) {
      const mB = curB.getMonth();
      monthList.push({
        name: MONTH_NAMES[mB],
        shortName: MONTH_NAMES[mB].substring(0, 3),
        monthA: mB,
        monthB: mB,
      });
      curB.setMonth(curB.getMonth() + 1);
    }

    if (monthList.length === 0) {
      const mB = dStartB.getMonth();
      monthList.push({
        name: MONTH_NAMES[mB],
        shortName: MONTH_NAMES[mB].substring(0, 3),
        monthA: mB,
        monthB: mB,
      });
    }

    comparativeTrendData = monthList.map((mItem, idx) => {
      const dA = getAggregatedData(
        (_y, m0, _d, dateStr) => (!customStartA || dateStr >= customStartA) && (!customEndA || dateStr <= customEndA) && m0 === mItem.monthA,
        `${mItem.shortName} (A)`,
        mItem.name
      );
      const dB = getAggregatedData(
        (_y, m0, _d, dateStr) => (!customStartB || dateStr >= customStartB) && (!customEndB || dateStr <= customEndB) && m0 === mItem.monthB,
        `${mItem.shortName} (B)`,
        mItem.name
      );

      return {
        monthIdx: idx,
        monthName: mItem.name,
        shortName: mItem.shortName,
        periodA: dA,
        periodB: dB,
      };
    });
  } else {
    // 12 months (Tahunan) or monthly
    comparativeTrendData = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((mIdx) => {
      const predA = (y: number, m0: number) => y === yearA && m0 === mIdx;
      const predB = (y: number, m0: number) => y === yearB && m0 === mIdx;

      const dA = getAggregatedData(predA, `${MONTH_NAMES[mIdx].substring(0, 3)} A`, MONTH_NAMES[mIdx]);
      const dB = getAggregatedData(predB, `${MONTH_NAMES[mIdx].substring(0, 3)} B`, MONTH_NAMES[mIdx]);

      return {
        monthIdx: mIdx,
        monthName: MONTH_NAMES[mIdx],
        shortName: MONTH_NAMES[mIdx].substring(0, 3),
        periodA: dA,
        periodB: dB,
      };
    });
  }

  // For bulanan mode, create 6 date-interval blocks
  const weeklyComparisonData = [
    { label: 'Tgl 1-5', range: [1, 5] },
    { label: 'Tgl 6-10', range: [6, 10] },
    { label: 'Tgl 11-15', range: [11, 15] },
    { label: 'Tgl 16-20', range: [16, 20] },
    { label: 'Tgl 21-25', range: [21, 25] },
    { label: 'Tgl 26-31', range: [26, 31] },
  ].map((block) => {
    const dA = getAggregatedData(
      (y, m0, d) => y === monthYearA && m0 === monthA && d >= block.range[0] && d <= block.range[1],
      `${block.label} (${MONTH_NAMES[monthA].substring(0, 3)})`,
      block.label
    );
    const dB = getAggregatedData(
      (y, m0, d) => y === monthYearB && m0 === monthB && d >= block.range[0] && d <= block.range[1],
      `${block.label} (${MONTH_NAMES[monthB].substring(0, 3)})`,
      block.label
    );
    return {
      label: block.label,
      periodA: dA,
      periodB: dB,
    };
  });

  // Target Head for reference in charts
  const avgTargetHead = targetOutlets.length > 0
    ? Math.round(targetOutlets.reduce((acc, o) => acc + o.targetHead, 0) / targetOutlets.length)
    : 30000;

  // Selected outlet display name
  const outletDisplayName = selectedOutletId === 'all'
    ? (selectedAreaId === 'all' ? `Seluruh Outlet (${outlets.length} Lokasi)` : `Wilayah: ${areas.find((a) => a.id === selectedAreaId)?.name || ''} (${targetOutlets.length} Lokasi)`)
    : (outlets.find((o) => o.id === selectedOutletId)?.name || 'Outlet Terpilih');

  const slides = [
    { id: 1, title: 'Ringkasan Eksekutif & Komparasi 4 Pilar KPI', tag: '1. Executive Summary' },
    { id: 2, title: 'Analisis SPH (Spending Per Head / Penonton)', tag: '2. SPH (Head)' },
    { id: 3, title: 'Analisis % GBO (Gross Box Office) Kontribusi FnB', tag: '3. % GBO' },
    { id: 4, title: 'Analisis Daya Serap (Penetrasi Pembeli Struk Kasir)', tag: '4. Daya Serap' },
    { id: 5, title: 'Analisis Average Transaksi (AT / Basket Size)', tag: '5. Average Transaksi' },
    { id: 6, title: 'Volume Penonton & Perbandingan Omset Finansial', tag: '6. Volume & Omset' },
    { id: 7, title: 'Peringkat Performa Outlet & Pencapaian Target', tag: '7. Ranking Outlet' },
    { id: 8, title: 'Evaluasi Performa & Rencana Aksi Bisnis (Action Plan)', tag: '8. Evaluasi & Aksi' },
  ];

  const handleNextSlide = () => {
    if (currentSlide < slides.length) setCurrentSlide(currentSlide + 1);
  };

  const handlePrevSlide = () => {
    if (currentSlide > 1) setCurrentSlide(currentSlide - 1);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Helper to compute percentage growth
  const calcGrowth = (valA: number, valB: number) => {
    if (valA === 0) return valB > 0 ? '+100%' : '0%';
    const diff = ((valB - valA) / valA) * 100;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}%`;
  };

  const isGrowthPositive = (valA: number, valB: number) => valB >= valA;

  // Outlet performance list calculation for Ranking Slide
  const rankingFilteredOutlets = rankingAreaFilter === 'all'
    ? outlets
    : outlets.filter((o) => o.areaId === rankingAreaFilter);

  const outletRankingList = rankingFilteredOutlets.map((outlet) => {
    let oCinema = 0;
    let oFnb = 0;
    let oBill = 0;
    let oPax = 0;

    allSales.forEach((rec) => {
      if (rec.outletId !== outlet.id) return;
      const [yStr, mStr] = rec.date.split('-');
      const y = parseInt(yStr, 10);
      const m0 = parseInt(mStr, 10) - 1;

      let matches = false;
      if (comparisonMode === 'tahunan') {
        matches = (y === yearB);
      } else if (comparisonMode === 'semester') {
        matches = (y === semYearB && (semPeriodB === 1 ? m0 < 6 : m0 >= 6));
      } else if (comparisonMode === 'quartal') {
        const [qStart, qEnd] = getQuarterMonths(quarterB);
        matches = (y === quarterYearB && m0 >= qStart && m0 <= qEnd);
      } else if (comparisonMode === 'custom') {
        matches = (!customStartB || rec.date >= customStartB) && (!customEndB || rec.date <= customEndB);
      } else {
        matches = (y === monthYearB && m0 === monthB);
      }

      if (matches) {
        rec.shows.forEach((sh) => {
          oCinema += sh.omsetCinema || 0;
          oFnb += sh.omsetFnB || 0;
          oBill += sh.bill || 0;
          oPax += sh.penonton || 0;
        });
      }
    });

    const oSph = oPax > 0 ? Math.round(oFnb / oPax) : 0;
    const oGbo = oCinema > 0 ? Number(((oFnb / oCinema) * 100).toFixed(1)) : 0;
    const oDs = oPax > 0 ? Number(((oBill / oPax) * 100).toFixed(1)) : 0;
    const oAt = oBill > 0 ? Math.round(oFnb / oBill) : 0;
    const oAch = outlet.targetHead > 0 ? Number(((oSph / outlet.targetHead) * 100).toFixed(1)) : 0;
    const areaName = areas.find((a) => a.id === outlet.areaId)?.name || '';

    return {
      outlet,
      areaName,
      penonton: oPax,
      bill: oBill,
      fnb: oFnb,
      cinema: oCinema,
      sph: oSph,
      gbo: oGbo,
      dayaSerap: oDs,
      at: oAt,
      ach: oAch,
      targetSph: outlet.targetHead,
    };
  }).sort((a, b) => {
    switch (selectedRankingIndicator) {
      case 'ach': return b.ach - a.ach;
      case 'gbo': return b.gbo - a.gbo;
      case 'dayaSerap': return b.dayaSerap - a.dayaSerap;
      case 'at': return b.at - a.at;
      case 'penonton': return b.penonton - a.penonton;
      case 'fnb': return b.fnb - a.fnb;
      case 'sph': default: return b.sph - a.sph;
    }
  });

  // PPTX Export Handler
  const handleExportPPTX = async () => {
    try {
      setIsExportingPPTX(true);
      const trendList = (comparisonMode === 'bulanan' ? weeklyComparisonData : comparativeTrendData).map((item) => {
        const label = 'shortName' in item ? item.shortName : item.label;
        return {
          label,
          sphA: item.periodA.sph,
          sphB: item.periodB.sph,
          gboA: item.periodA.gbo,
          gboB: item.periodB.gbo,
          dsA: item.periodA.dayaSerap,
          dsB: item.periodB.dayaSerap,
          atA: item.periodA.at,
          atB: item.periodB.at,
        };
      });

      const rankingDataForExport = outletRankingList.map((item, idx) => ({
        rank: idx + 1,
        name: item.outlet.name,
        areaName: item.areaName,
        penonton: item.penonton,
        targetSph: item.targetSph,
        sph: item.sph,
        ach: item.ach,
        gbo: item.gbo,
        dayaSerap: item.dayaSerap,
        at: item.at,
      }));

      await exportKPIToPPTX({
        title: 'KPI Executive Deck Cinema XXI',
        comparisonTitle,
        outletName: outletDisplayName,
        periodA: periodAData,
        periodB: periodBData,
        targetSph: avgTargetHead,
        rankingData: rankingDataForExport,
        selectedRankingIndicator,
        trendData: trendList,
      });
    } catch (err) {
      console.error('Failed to export PPTX:', err);
    } finally {
      setIsExportingPPTX(false);
    }
  };

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 p-6 bg-[#f8fafc] overflow-y-auto' : ''}`}>
      {/* Top Presentation Bar with Live Filter Controls */}
      <div className="p-4 rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black shadow-xs">
            <Presentation className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black flex items-center space-x-2 text-slate-900">
              <span>Google Slide — KPI Comparison Executive Deck</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300 uppercase tracking-wide">
                Rasio 16:9 HD Presisi
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              5 Indikator Utama: <span className="font-extrabold text-blue-800">Penonton</span>, <span className="font-extrabold text-amber-800">SPH</span>, <span className="font-extrabold text-purple-800">% GBO</span>, <span className="font-extrabold text-emerald-800">Daya Serap</span>, & <span className="font-extrabold text-cyan-800">AT</span>
            </p>
          </div>
        </div>

        {/* Mode Perbandingan Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
            <button
              onClick={() => setComparisonMode('tahunan')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                comparisonMode === 'tahunan' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Tahunan
            </button>
            <button
              onClick={() => setComparisonMode('semester')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                comparisonMode === 'semester' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Semester
            </button>
            <button
              onClick={() => setComparisonMode('quartal')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                comparisonMode === 'quartal' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Kuartal
            </button>
            <button
              onClick={() => setComparisonMode('bulanan')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                comparisonMode === 'bulanan' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setComparisonMode('custom')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                comparisonMode === 'custom' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Custom
            </button>
          </div>

          <button
            onClick={handleExportPPTX}
            disabled={isExportingPPTX}
            className="px-3.5 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>{isExportingPPTX ? 'Mengekspor...' : 'Export PPTX'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-2xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
            title="Mode Layar Penuh"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub Filter Parameter Bar */}
      <div className="px-5 py-3 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-xs flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center space-x-2 font-black text-amber-950">
          <ArrowRightLeft className="w-4 h-4 text-amber-700" />
          <span>Pengaturan Parameter Komparasi:</span>
        </div>

        {comparisonMode === 'tahunan' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 font-semibold">Tahun A:</span>
            <select
              value={yearA}
              onChange={(e) => setYearA(parseInt(e.target.value, 10))}
              className="px-3 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>

            <span className="text-amber-800 font-black px-1.5">VS</span>

            <span className="text-slate-600 font-semibold">Tahun B:</span>
            <select
              value={yearB}
              onChange={(e) => setYearB(parseInt(e.target.value, 10))}
              className="px-3 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>
        )}

        {comparisonMode === 'semester' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 font-semibold">Periode A:</span>
            <select
              value={semYearA}
              onChange={(e) => setSemYearA(parseInt(e.target.value, 10))}
              className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
            <select
              value={semPeriodA}
              onChange={(e) => setSemPeriodA(parseInt(e.target.value, 10))}
              className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
            >
              <option value={1}>Semester 1 (Jan - Jun)</option>
              <option value={2}>Semester 2 (Jul - Des)</option>
            </select>

            <span className="text-amber-800 font-black px-1.5">VS</span>

            <span className="text-slate-600 font-semibold">Periode B:</span>
            <select
              value={semYearB}
              onChange={(e) => setSemYearB(parseInt(e.target.value, 10))}
              className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
            <select
              value={semPeriodB}
              onChange={(e) => setSemPeriodB(parseInt(e.target.value, 10))}
              className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
            >
              <option value={1}>Semester 1 (Jan - Jun)</option>
              <option value={2}>Semester 2 (Jul - Des)</option>
            </select>
          </div>
        )}

        {comparisonMode === 'quartal' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 font-semibold">Kuartal A:</span>
            <select
              value={quarterYearA}
              onChange={(e) => setQuarterYearA(parseInt(e.target.value, 10))}
              className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
            <select
              value={quarterA}
              onChange={(e) => setQuarterA(parseInt(e.target.value, 10))}
              className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
            >
              <option value={1}>K1 (Jan - Mar)</option>
              <option value={2}>K2 (Apr - Jun)</option>
              <option value={3}>K3 (Jul - Sep)</option>
              <option value={4}>K4 (Okt - Des)</option>
            </select>

            <span className="text-amber-800 font-black px-1.5">VS</span>

            <span className="text-slate-600 font-semibold">Kuartal B:</span>
            <select
              value={quarterYearB}
              onChange={(e) => setQuarterYearB(parseInt(e.target.value, 10))}
              className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
            <select
              value={quarterB}
              onChange={(e) => setQuarterB(parseInt(e.target.value, 10))}
              className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
            >
              <option value={1}>K1 (Jan - Mar)</option>
              <option value={2}>K2 (Apr - Jun)</option>
              <option value={3}>K3 (Jul - Sep)</option>
              <option value={4}>K4 (Okt - Des)</option>
            </select>
          </div>
        )}

        {comparisonMode === 'bulanan' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 font-semibold">Bulan A:</span>
            <select
              value={monthA}
              onChange={(e) => setMonthA(parseInt(e.target.value, 10))}
              className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
            <select
              value={monthYearA}
              onChange={(e) => setMonthYearA(parseInt(e.target.value, 10))}
              className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>

            <span className="text-amber-800 font-black px-1.5">VS</span>

            <span className="text-slate-600 font-semibold">Bulan B:</span>
            <select
              value={monthB}
              onChange={(e) => setMonthB(parseInt(e.target.value, 10))}
              className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
            <select
              value={monthYearB}
              onChange={(e) => setMonthYearB(parseInt(e.target.value, 10))}
              className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>
        )}

        {comparisonMode === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 font-semibold">Rentang A:</span>
            <input
              type="date"
              value={customStartA}
              onChange={(e) => setCustomStartA(e.target.value)}
              className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={customEndA}
              onChange={(e) => setCustomEndA(e.target.value)}
              className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
            />

            <span className="text-amber-800 font-black px-1.5">VS</span>

            <span className="text-slate-600 font-semibold">Rentang B:</span>
            <input
              type="date"
              value={customStartB}
              onChange={(e) => setCustomStartB(e.target.value)}
              className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={customEndB}
              onChange={(e) => setCustomEndB(e.target.value)}
              className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
            />
          </div>
        )}

        {/* Filter Wilayah & Outlet */}
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-amber-700" />
          <select
            value={selectedAreaId}
            onChange={(e) => {
              setSelectedAreaId(e.target.value);
              setSelectedOutletId('all');
            }}
            className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
          >
            <option value="all">Semua Wilayah</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <select
            value={selectedOutletId}
            onChange={(e) => setSelectedOutletId(e.target.value)}
            className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 max-w-[180px]"
          >
            <option value="all">Semua Outlet</option>
            {areaFilteredOutlets.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>

          <div className="text-[11px] font-extrabold text-amber-900 bg-amber-100 px-3 py-1 rounded-xl border border-amber-300 whitespace-nowrap">
            📍 {outletDisplayName}
          </div>
        </div>
      </div>

      {/* 16:9 Spacious Slide Canvas Container (Higher min height min-h-[740px]) */}
      <div className="rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-md p-6 sm:p-8 transition min-h-[740px] flex flex-col justify-between">
        <div>
          {/* Slide Indicator & Navigation Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-2xs">
                SLIDE {currentSlide} / {slides.length}
              </span>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wide text-slate-900">
                {slides[currentSlide - 1].title}
              </h3>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevSlide}
                disabled={currentSlide === 1}
                className="p-2 rounded-xl border border-slate-300 bg-slate-50 disabled:opacity-30 text-slate-700 hover:bg-slate-100 cursor-pointer transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextSlide}
                disabled={currentSlide === slides.length}
                className="p-2 rounded-xl border border-slate-300 bg-slate-50 disabled:opacity-30 text-slate-700 hover:bg-slate-100 cursor-pointer transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SLIDE 1: Executive KPI Comparison & Growth Overview */}
          {/* ========================================================================= */}
          {currentSlide === 1 && (
            <div className="space-y-6">
              {/* Executive Header Banner with Context Card & Quick Outlet Pill Chips */}
              <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50/30 p-5 rounded-2xl border border-amber-200/80 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 flex items-center space-x-2">
                      <span>Executive KPI Comparison & Growth Overview</span>
                    </h1>
                    <p className="text-xs font-medium text-slate-600 mt-1">
                      Komparasi otomatis 4 pilar indikator: <span className="text-amber-900 font-extrabold">{comparisonTitle}</span>
                    </p>
                  </div>

                  {/* Executive Context Card (Kartu Ringkasan Info Outlet & Grade) */}
                  <div className="p-3 bg-white/95 rounded-2xl border border-amber-300 shadow-2xs flex items-center space-x-3 text-xs">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-2xs">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-slate-900 text-sm">{outletDisplayName}</span>
                        {selectedOutletId !== 'all' && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            Grade {outlets.find((o) => o.id === selectedOutletId)?.class || 'A'}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold flex items-center space-x-3 mt-0.5">
                        <span>🎯 Target SPH: <strong>Rp {avgTargetHead.toLocaleString('id-ID')}</strong></span>
                        <span>&bull;</span>
                        <span>🎬 {targetOutlets.length} Outlet Terakumulasi</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* 1. Penonton (Pax) */}
                <div className="p-4 rounded-2xl bg-[#f4f7ff] border-2 border-blue-300 shadow-sm relative flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-950 uppercase tracking-wide flex items-center space-x-1">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>1. Penonton (Pax)</span>
                    </span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                      isGrowthPositive(periodAData.penonton, periodBData.penonton) ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}>
                      {calcGrowth(periodAData.penonton, periodBData.penonton)}
                    </span>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-blue-800 tracking-tight">
                      {periodBData.penonton.toLocaleString('id-ID')} <span className="text-sm font-bold text-slate-500">Pax</span>
                    </p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      {periodAData.label}: <span className="font-bold text-slate-700">{periodAData.penonton.toLocaleString('id-ID')} Pax</span>
                    </p>
                  </div>
                  <div className="text-xs text-blue-950 bg-blue-50/80 p-2.5 rounded-xl border border-blue-200/80 font-medium">
                    Total Tiket Penonton Cinema XXI
                  </div>
                </div>

                {/* 2. Head (SPH) */}
                <div className="p-4 rounded-2xl bg-[#fffdfa] border-2 border-amber-300 shadow-sm relative flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center space-x-1">
                      <Target className="w-4 h-4 text-amber-600" />
                      <span>2. Head (SPH)</span>
                    </span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                      isGrowthPositive(periodAData.sph, periodBData.sph) ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}>
                      {calcGrowth(periodAData.sph, periodBData.sph)}
                    </span>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-amber-800 tracking-tight">
                      Rp {periodBData.sph.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      {periodAData.label}: <span className="font-bold text-slate-700">Rp {periodAData.sph.toLocaleString('id-ID')}</span>
                    </p>
                  </div>
                  <div className="text-xs text-slate-700 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80">
                    Target Head: <span className="font-extrabold text-slate-900">Rp {avgTargetHead.toLocaleString('id-ID')}</span> &bull; Ach: <span className="font-black text-amber-900">{periodBData.achievement}%</span>
                  </div>
                </div>

                {/* 3. GBO (%) */}
                <div className="p-4 rounded-2xl bg-[#faf7ff] border-2 border-purple-300 shadow-sm relative flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-950 uppercase tracking-wide flex items-center space-x-1">
                      <Percent className="w-4 h-4 text-purple-600" />
                      <span>3. % GBO (Ratio)</span>
                    </span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                      isGrowthPositive(periodAData.gbo, periodBData.gbo) ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}>
                      {calcGrowth(periodAData.gbo, periodBData.gbo)}
                    </span>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-purple-800 tracking-tight">
                      {periodBData.gbo}%
                    </p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      {periodAData.label}: <span className="font-bold text-slate-700">{periodAData.gbo}%</span>
                    </p>
                  </div>
                  <div className="text-xs text-purple-950 bg-purple-50/80 p-2.5 rounded-xl border border-purple-200/80 font-medium">
                    Rasio Omset F&B terhadap Ticket Box Office
                  </div>
                </div>

                {/* 4. Daya Serap (%) */}
                <div className="p-4 rounded-2xl bg-[#f5fbf7] border-2 border-emerald-300 shadow-sm relative flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center space-x-1">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span>4. Daya Serap (%)</span>
                    </span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                      isGrowthPositive(periodAData.dayaSerap, periodBData.dayaSerap) ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}>
                      {calcGrowth(periodAData.dayaSerap, periodBData.dayaSerap)}
                    </span>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-emerald-800 tracking-tight">
                      {periodBData.dayaSerap}%
                    </p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      {periodAData.label}: <span className="font-bold text-slate-700">{periodAData.dayaSerap}%</span>
                    </p>
                  </div>
                  <div className="text-xs text-emerald-950 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200/80 font-medium">
                    Rasio Bill Kasir terhadap Penonton XXI
                  </div>
                </div>

                {/* 5. AT (Average Transaksi) */}
                <div className="p-4 rounded-2xl bg-[#f4fafc] border-2 border-cyan-300 shadow-sm relative flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-cyan-950 uppercase tracking-wide flex items-center space-x-1">
                      <CreditCard className="w-4 h-4 text-cyan-600" />
                      <span>5. Average Transaksi</span>
                    </span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                      isGrowthPositive(periodAData.at, periodBData.at) ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}>
                      {calcGrowth(periodAData.at, periodBData.at)}
                    </span>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-cyan-800 tracking-tight">
                      Rp {periodBData.at.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      {periodAData.label}: <span className="font-bold text-slate-700">Rp {periodAData.at.toLocaleString('id-ID')}</span>
                    </p>
                  </div>
                  <div className="text-xs text-cyan-950 bg-cyan-50/80 p-2.5 rounded-xl border border-cyan-200/80 font-medium">
                    Nilai Keranjang Belanja per Struk Kasir
                  </div>
                </div>
              </div>

              {/* Taller Comparative Bar Visualizer for the 5 Main Pillars */}
              <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-amber-700" />
                    <span className="text-sm font-black uppercase text-slate-900 tracking-tight">
                      Grafik Pembanding 5 Indikator Utama: {periodAData.label} vs {periodBData.label}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs font-extrabold">
                    <span className="flex items-center space-x-1.5">
                      <span className="w-3.5 h-3.5 rounded-xs bg-slate-300 inline-block"></span>
                      <span className="text-slate-600">{periodAData.label}</span>
                    </span>
                    <span className="flex items-center space-x-1.5">
                      <span className="w-3.5 h-3.5 rounded-xs bg-amber-500 inline-block"></span>
                      <span className="text-slate-900">{periodBData.label}</span>
                    </span>
                  </div>
                </div>

                {/* 5 Pillars Paired Bar Charts with Exact Number Callouts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
                  {/* Penonton Bar */}
                  <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 flex flex-col justify-between h-56">
                    <div className="flex justify-between items-center text-xs font-black uppercase text-blue-950">
                      <span>Penonton (Pax)</span>
                      <span className={`px-2 py-0.5 rounded font-extrabold text-[11px] ${periodBData.penonton >= periodAData.penonton ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {calcGrowth(periodAData.penonton, periodBData.penonton)}
                      </span>
                    </div>
                    <div className="h-36 flex items-end justify-center gap-2 pt-4">
                      <div className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className="text-[10px] font-extrabold text-slate-600 mb-1">
                          {(periodAData.penonton / 1000).toFixed(1)}k
                        </span>
                        <div
                          style={{
                            height: `${Math.min(100, Math.max(14, (periodAData.penonton / Math.max(periodAData.penonton, periodBData.penonton, 1)) * 100))}%`,
                          }}
                          className="w-full bg-slate-300 rounded-t-md transition-all hover:bg-slate-400"
                        ></div>
                        <span className="text-[9px] font-bold text-slate-500 mt-1 truncate max-w-[60px]">{periodAData.label}</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className="text-[10px] font-black text-blue-900 mb-1">
                          {(periodBData.penonton / 1000).toFixed(1)}k
                        </span>
                        <div
                          style={{
                            height: `${Math.min(100, Math.max(14, (periodBData.penonton / Math.max(periodAData.penonton, periodBData.penonton, 1)) * 100))}%`,
                          }}
                          className="w-full bg-gradient-to-t from-blue-700 to-blue-400 rounded-t-md shadow-xs transition-all"
                        ></div>
                        <span className="text-[9px] font-bold text-blue-950 mt-1 truncate max-w-[60px]">{periodBData.label}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-center text-slate-600 font-bold border-t border-blue-200/60 pt-1 mt-1">
                      Selisih: {(periodBData.penonton - periodAData.penonton).toLocaleString('id-ID')} Pax
                    </div>
                  </div>

                  {/* SPH Bar */}
                  <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 flex flex-col justify-between h-56">
                    <div className="flex justify-between items-center text-xs font-black uppercase text-amber-950">
                      <span>SPH (Rp/Head)</span>
                      <span className={`px-2 py-0.5 rounded font-extrabold text-[11px] ${periodBData.sph >= periodAData.sph ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {calcGrowth(periodAData.sph, periodBData.sph)}
                      </span>
                    </div>
                    <div className="h-36 flex items-end justify-center gap-2 pt-4">
                      <div className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className="text-[10px] font-extrabold text-slate-600 mb-1">
                          {(periodAData.sph / 1000).toFixed(1)}k
                        </span>
                        <div
                          style={{
                            height: `${Math.min(100, Math.max(14, (periodAData.sph / Math.max(periodAData.sph, periodBData.sph, avgTargetHead, 1)) * 100))}%`,
                          }}
                          className="w-full bg-slate-300 rounded-t-md transition-all hover:bg-slate-400"
                        ></div>
                        <span className="text-[9px] font-bold text-slate-500 mt-1 truncate max-w-[60px]">{periodAData.label}</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className="text-[10px] font-black text-amber-900 mb-1">
                          {(periodBData.sph / 1000).toFixed(1)}k
                        </span>
                        <div
                          style={{
                            height: `${Math.min(100, Math.max(14, (periodBData.sph / Math.max(periodAData.sph, periodBData.sph, avgTargetHead, 1)) * 100))}%`,
                          }}
                          className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-md shadow-xs transition-all"
                        ></div>
                        <span className="text-[9px] font-bold text-amber-950 mt-1 truncate max-w-[60px]">{periodBData.label}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-center text-slate-600 font-bold border-t border-amber-200/60 pt-1 mt-1">
                      Target: Rp {avgTargetHead.toLocaleString('id-ID')}
                    </div>
                  </div>

                  {/* GBO Bar */}
                  <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200 flex flex-col justify-between h-56">
                    <div className="flex justify-between items-center text-xs font-black uppercase text-purple-950">
                      <span>% GBO (Ratio)</span>
                      <span className={`px-2 py-0.5 rounded font-extrabold text-[11px] ${periodBData.gbo >= periodAData.gbo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {calcGrowth(periodAData.gbo, periodBData.gbo)}
                      </span>
                    </div>
                    <div className="h-36 flex items-end justify-center gap-2 pt-4">
                      <div className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className="text-[10px] font-extrabold text-slate-600 mb-1">{periodAData.gbo}%</span>
                        <div
                          style={{
                            height: `${Math.min(100, Math.max(14, (periodAData.gbo / Math.max(periodAData.gbo, periodBData.gbo, 50, 1)) * 100))}%`,
                          }}
                          className="w-full bg-slate-300 rounded-t-md transition-all hover:bg-slate-400"
                        ></div>
                        <span className="text-[9px] font-bold text-slate-500 mt-1 truncate max-w-[60px]">{periodAData.label}</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className="text-[10px] font-black text-purple-900 mb-1">{periodBData.gbo}%</span>
                        <div
                          style={{
                            height: `${Math.min(100, Math.max(14, (periodBData.gbo / Math.max(periodAData.gbo, periodBData.gbo, 50, 1)) * 100))}%`,
                          }}
                          className="w-full bg-gradient-to-t from-purple-700 to-purple-400 rounded-t-md shadow-xs transition-all"
                        ></div>
                        <span className="text-[9px] font-bold text-purple-950 mt-1 truncate max-w-[60px]">{periodBData.label}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-center text-slate-600 font-bold border-t border-purple-200/60 pt-1 mt-1">
                      Delta: {(periodBData.gbo - periodAData.gbo).toFixed(1)}%
                    </div>
                  </div>

                  {/* Daya Serap Bar */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col justify-between h-56">
                    <div className="flex justify-between items-center text-xs font-black uppercase text-emerald-950">
                      <span>Daya Serap (%)</span>
                      <span className={`px-2 py-0.5 rounded font-extrabold text-[11px] ${periodBData.dayaSerap >= periodAData.dayaSerap ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {calcGrowth(periodAData.dayaSerap, periodBData.dayaSerap)}
                      </span>
                    </div>
                    <div className="h-36 flex items-end justify-center gap-2 pt-4">
                      <div className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className="text-[10px] font-extrabold text-slate-600 mb-1">{periodAData.dayaSerap}%</span>
                        <div
                          style={{
                            height: `${Math.min(100, Math.max(14, (periodAData.dayaSerap / Math.max(periodAData.dayaSerap, periodBData.dayaSerap, 30, 1)) * 100))}%`,
                          }}
                          className="w-full bg-slate-300 rounded-t-md transition-all hover:bg-slate-400"
                        ></div>
                        <span className="text-[9px] font-bold text-slate-500 mt-1 truncate max-w-[60px]">{periodAData.label}</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className="text-[10px] font-black text-emerald-900 mb-1">{periodBData.dayaSerap}%</span>
                        <div
                          style={{
                            height: `${Math.min(100, Math.max(14, (periodBData.dayaSerap / Math.max(periodAData.dayaSerap, periodBData.dayaSerap, 30, 1)) * 100))}%`,
                          }}
                          className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md shadow-xs transition-all"
                        ></div>
                        <span className="text-[9px] font-bold text-emerald-950 mt-1 truncate max-w-[60px]">{periodBData.label}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-center text-slate-600 font-bold border-t border-emerald-200/60 pt-1 mt-1">
                      Delta: {(periodBData.dayaSerap - periodAData.dayaSerap).toFixed(1)}%
                    </div>
                  </div>

                  {/* AT Bar */}
                  <div className="p-3.5 rounded-xl bg-cyan-50/60 border border-cyan-200 flex flex-col justify-between h-56">
                    <div className="flex justify-between items-center text-xs font-black uppercase text-cyan-950">
                      <span>AT (Basket Size)</span>
                      <span className={`px-2 py-0.5 rounded font-extrabold text-[11px] ${periodBData.at >= periodAData.at ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {calcGrowth(periodAData.at, periodBData.at)}
                      </span>
                    </div>
                    <div className="h-36 flex items-end justify-center gap-2 pt-4">
                      <div className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className="text-[10px] font-extrabold text-slate-600 mb-1">
                          {(periodAData.at / 1000).toFixed(1)}k
                        </span>
                        <div
                          style={{
                            height: `${Math.min(100, Math.max(14, (periodAData.at / Math.max(periodAData.at, periodBData.at, 100000, 1)) * 100))}%`,
                          }}
                          className="w-full bg-slate-300 rounded-t-md transition-all hover:bg-slate-400"
                        ></div>
                        <span className="text-[9px] font-bold text-slate-500 mt-1 truncate max-w-[60px]">{periodAData.label}</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className="text-[10px] font-black text-cyan-900 mb-1">
                          {(periodBData.at / 1000).toFixed(1)}k
                        </span>
                        <div
                          style={{
                            height: `${Math.min(100, Math.max(14, (periodBData.at / Math.max(periodAData.at, periodBData.at, 100000, 1)) * 100))}%`,
                          }}
                          className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-md shadow-xs transition-all"
                        ></div>
                        <span className="text-[9px] font-bold text-cyan-950 mt-1 truncate max-w-[60px]">{periodBData.label}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-center text-slate-600 font-bold border-t border-cyan-200/60 pt-1 mt-1">
                      Selisih: Rp {(periodBData.at - periodAData.at).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Comparison Matrix Table */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-800 flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-amber-700" />
                  <span>Matriks Komparasi Parameter Utama: {periodAData.label} vs {periodBData.label}</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 border-b border-slate-200 font-black text-[10px] text-slate-600 uppercase">
                      <tr>
                        <th className="p-2.5">Indikator KPI</th>
                        <th className="p-2.5 text-right">{periodAData.label}</th>
                        <th className="p-2.5 text-right">{periodBData.label}</th>
                        <th className="p-2.5 text-right">Selisih (+ / -)</th>
                        <th className="p-2.5 text-center">Pertumbuhan (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                      <tr>
                        <td className="p-2.5 font-bold text-blue-900 flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                          <span>Penonton (Pax Tiket)</span>
                        </td>
                        <td className="p-2.5 text-right">{periodAData.penonton.toLocaleString('id-ID')} Pax</td>
                        <td className="p-2.5 text-right font-black text-blue-800">{periodBData.penonton.toLocaleString('id-ID')} Pax</td>
                        <td className="p-2.5 text-right font-bold">{(periodBData.penonton - periodAData.penonton).toLocaleString('id-ID')} Pax</td>
                        <td className="p-2.5 text-center font-extrabold text-emerald-700">{calcGrowth(periodAData.penonton, periodBData.penonton)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-amber-900 flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>SPH (Spending Per Head)</span>
                        </td>
                        <td className="p-2.5 text-right">Rp {periodAData.sph.toLocaleString('id-ID')}</td>
                        <td className="p-2.5 text-right font-black text-amber-800">Rp {periodBData.sph.toLocaleString('id-ID')}</td>
                        <td className="p-2.5 text-right font-bold">Rp {(periodBData.sph - periodAData.sph).toLocaleString('id-ID')}</td>
                        <td className="p-2.5 text-center font-extrabold text-emerald-700">{calcGrowth(periodAData.sph, periodBData.sph)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-purple-900 flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                          <span>% GBO (FnB vs Ticket)</span>
                        </td>
                        <td className="p-2.5 text-right">{periodAData.gbo}%</td>
                        <td className="p-2.5 text-right font-black text-purple-800">{periodBData.gbo}%</td>
                        <td className="p-2.5 text-right font-bold">{(periodBData.gbo - periodAData.gbo).toFixed(1)}%</td>
                        <td className="p-2.5 text-center font-extrabold text-emerald-700">{calcGrowth(periodAData.gbo, periodBData.gbo)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-emerald-900 flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                          <span>Daya Serap (Bill / Penonton)</span>
                        </td>
                        <td className="p-2.5 text-right">{periodAData.dayaSerap}%</td>
                        <td className="p-2.5 text-right font-black text-emerald-800">{periodBData.dayaSerap}%</td>
                        <td className="p-2.5 text-right font-bold">{(periodBData.dayaSerap - periodAData.dayaSerap).toFixed(1)}%</td>
                        <td className="p-2.5 text-center font-extrabold text-emerald-700">{calcGrowth(periodAData.dayaSerap, periodBData.dayaSerap)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-cyan-900 flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
                          <span>Average Transaksi (AT)</span>
                        </td>
                        <td className="p-2.5 text-right">Rp {periodAData.at.toLocaleString('id-ID')}</td>
                        <td className="p-2.5 text-right font-black text-cyan-800">Rp {periodBData.at.toLocaleString('id-ID')}</td>
                        <td className="p-2.5 text-right font-bold">Rp {(periodBData.at - periodAData.at).toLocaleString('id-ID')}</td>
                        <td className="p-2.5 text-center font-extrabold text-emerald-700">{calcGrowth(periodAData.at, periodBData.at)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ========================================================================= */}
          {/* SLIDE 2: Analisis SPH (Spending Per Head / Penonton) */}
          {/* ========================================================================= */}
          {currentSlide === 2 && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center space-x-2">
                    <Target className="w-6 h-6 text-amber-600" />
                    <span>Analisis SPH (Spending Per Head) Cafe vs Target</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    SPH mengukur rata-rata pengeluaran F&B dari setiap 1 penonton bioskop (Omset F&B / Total Penonton Cinema).
                  </p>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-amber-100 text-amber-950 text-xs font-black border border-amber-300 shadow-2xs">
                  Target Head: Rp {avgTargetHead.toLocaleString('id-ID')}
                </div>
              </div>

              {/* Top Horizontal KPI Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#fffdfa] border border-amber-300/80 shadow-2xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">{periodBData.label} (Realisasi)</span>
                  <p className="text-xl font-black text-amber-800 tracking-tight">
                    Rp {periodBData.sph.toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">{periodAData.label} (Pembanding)</span>
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-black text-slate-800 tracking-tight">
                      Rp {periodAData.sph.toLocaleString('id-ID')}
                    </p>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isGrowthPositive(periodAData.sph, periodBData.sph) ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}>
                      {calcGrowth(periodAData.sph, periodBData.sph)}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 shadow-2xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950 block">Pencapaian Target Head</span>
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-black text-emerald-800 tracking-tight">
                      {periodBData.achievement}%
                    </p>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${periodBData.sph >= avgTargetHead ? 'bg-emerald-200 text-emerald-950' : 'bg-rose-200 text-rose-950'}`}>
                      {periodBData.sph >= avgTargetHead ? 'Tercapai' : 'Bawah Target'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-2xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 block">Selisih</span>
                  <p className="text-xl font-black text-amber-900 tracking-tight">
                    {periodBData.sph >= avgTargetHead ? '+' : ''}Rp {(periodBData.sph - avgTargetHead).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Dominant Full-Width High-Height Bar Chart (h-[380px]) */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs font-black text-slate-900 uppercase flex items-center space-x-2 tracking-wide">
                    <BarChart3 className="w-4 h-4 text-amber-600" />
                    <span>Grafik Batang Komparasi SPH (Rp / Head): {periodAData.label} vs {periodBData.label}</span>
                  </span>
                  <div className="flex items-center space-x-4 text-xs font-bold">
                    <span className="flex items-center space-x-1.5">
                      <span className="w-3.5 h-3.5 rounded-xs bg-slate-300 inline-block border border-slate-400"></span>
                      <span className="text-slate-700">{periodAData.label}</span>
                    </span>
                    <span className="flex items-center space-x-1.5">
                      <span className="w-3.5 h-3.5 rounded-xs bg-gradient-to-t from-amber-600 to-amber-400 inline-block border border-amber-600"></span>
                      <span className="text-amber-950">{periodBData.label}</span>
                    </span>
                    <span className="text-emerald-800 font-black bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300">
                      Garis Target: Rp {avgTargetHead.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {(() => {
                  const sphChartItems = comparisonMode === 'bulanan' ? weeklyComparisonData : comparativeTrendData;
                  const rawMax = Math.max(
                    ...sphChartItems.map((x) => Math.max(x.periodA.sph, x.periodB.sph)),
                    avgTargetHead
                  );
                  const maxSPH = Math.ceil((rawMax * 1.08) / 1000) * 1000;
                  const targetPct = Math.min(95, Math.max(5, (avgTargetHead / maxSPH) * 100));

                  return (
                    <div className="space-y-3">
                      <div className="relative h-[400px] border border-slate-200 bg-slate-50/50 p-5 rounded-2xl flex flex-col justify-between shadow-xs">
                        {/* Top Growth Pill Row */}
                        <div className="w-full flex items-center justify-between gap-2 z-10 pb-2">
                          {sphChartItems.map((item, idx) => (
                            <div key={idx} className="flex-1 flex justify-center">
                              <span className="text-[11px] sm:text-xs font-black text-amber-950 bg-amber-100 px-2 py-0.5 rounded-lg shadow-2xs whitespace-nowrap border border-amber-300">
                                {calcGrowth(item.periodA.sph, item.periodB.sph)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Main Plot Area containing Target Line & Bars (Exact 1:1 Height Reference Frame) */}
                        <div className="relative flex-1 w-full flex items-end">
                          {/* Target dashed line indicator */}
                          <div
                            style={{ bottom: `${targetPct}%` }}
                            className="absolute inset-x-0 border-t-2 border-dashed border-emerald-600 z-20 pointer-events-none flex justify-end"
                          >
                            <span className="text-[11px] sm:text-xs font-black text-emerald-950 bg-emerald-100/95 px-2.5 py-0.5 rounded-md -mt-3.5 mr-1 border border-emerald-400 shadow-xs backdrop-blur-xs">
                              Garis Target Head: Rp {avgTargetHead.toLocaleString('id-ID')}
                            </span>
                          </div>

                          <div className="w-full h-full flex items-end justify-between gap-2 z-10">
                            {sphChartItems.map((item, idx) => {
                              const heightA = maxSPH > 0 ? (item.periodA.sph / maxSPH) * 100 : 0;
                              const heightB = maxSPH > 0 ? (item.periodB.sph / maxSPH) * 100 : 0;

                              return (
                                <div key={idx} className="flex-1 h-full flex items-end justify-center gap-1 sm:gap-2">
                                  {/* Bar A */}
                                  <div className="w-1/2 max-w-[80px] h-full relative flex items-end justify-center">
                                    <span
                                      style={{ bottom: `${heightA}%` }}
                                      className="absolute mb-1 text-xs sm:text-sm font-black text-slate-800 bg-white/95 px-2 py-0.5 rounded-lg border border-slate-300 whitespace-nowrap z-30 shadow-xs"
                                    >
                                      {(item.periodA.sph / 1000).toFixed(1)}k
                                    </span>
                                    <div
                                      style={{ height: `${Math.max(3, heightA)}%` }}
                                      className="w-full rounded-t-lg bg-slate-300 transition-all group-hover:bg-slate-400 border-t border-x border-slate-400 shadow-sm"
                                      title={`${periodAData.label}: Rp ${item.periodA.sph.toLocaleString('id-ID')}`}
                                    ></div>
                                  </div>
                                  {/* Bar B */}
                                  <div className="w-1/2 max-w-[80px] h-full relative flex items-end justify-center">
                                    <span
                                      style={{ bottom: `${heightB}%` }}
                                      className="absolute mb-1 text-xs sm:text-sm font-black text-slate-900 bg-white/95 px-2 py-0.5 rounded-lg border border-slate-300 shadow-xs whitespace-nowrap z-30"
                                    >
                                      {(item.periodB.sph / 1000).toFixed(1)}k
                                    </span>
                                    <div
                                      style={{ height: `${Math.max(3, heightB)}%` }}
                                      className={`w-full rounded-t-lg transition-all shadow-md ${
                                        item.periodB.sph >= avgTargetHead
                                          ? 'bg-gradient-to-t from-emerald-700 via-emerald-600 to-emerald-400 border-t border-x border-emerald-500'
                                          : 'bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400 border-t border-x border-amber-500'
                                      }`}
                                      title={`${periodBData.label}: Rp ${item.periodB.sph.toLocaleString('id-ID')}`}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Month Labels aligned exactly with plot columns */}
                      <div className="flex justify-between gap-2 px-5 text-xs sm:text-sm text-slate-900 font-black">
                        {sphChartItems.map((item, idx) => (
                          <div key={idx} className="flex-1 text-center truncate">
                            {'shortName' in item ? item.shortName : item.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Compact Bottom Action Insight Box */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start space-x-3 shadow-2xs">
                <Lightbulb className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold uppercase tracking-wide">Insight Pembanding SPH:</span> Grafik komparatif menegaskan tren SPH antara {periodAData.label} dan {periodBData.label}. Outlet yang konsisten berada di atas garis target Rp {avgTargetHead.toLocaleString('id-ID')} terbukti aktif menawarkan upselling paket combo promo snack dan minuman.
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SLIDE 3: Analisis GBO (%) Kontribusi FnB vs Cinema */}
          {/* ========================================================================= */}
          {currentSlide === 3 && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center space-x-2">
                    <Percent className="w-6 h-6 text-purple-600" />
                    <span>Analisis % GBO (Gross Box Office) Kontribusi F&B</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Rasio GBO mengukur persentase perbandingan omset F&B terhadap omset penjualan tiket cinema (Omset F&B / Omset Cinema * 100%).
                  </p>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-purple-100 text-purple-950 text-xs font-black border border-purple-300 shadow-2xs">
                  Benchmark Industri: 40% - 60%
                </div>
              </div>

              {/* Top Horizontal KPI Summary Strip */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#faf7ff] border border-purple-300/80 shadow-2xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-950 block">{periodBData.label} (Rasio GBO)</span>
                  <p className="text-xl font-black text-purple-800 tracking-tight">
                    {periodBData.gbo}%
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">{periodAData.label} (Pembanding)</span>
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-black text-slate-800 tracking-tight">
                      {periodAData.gbo}%
                    </p>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isGrowthPositive(periodAData.gbo, periodBData.gbo) ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}>
                      {calcGrowth(periodAData.gbo, periodBData.gbo)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dominant Full-Width High-Height Bar Chart (h-[380px]) */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs font-black text-slate-900 uppercase flex items-center space-x-2 tracking-wide">
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                    <span>Grafik Batang Komparasi Rasio GBO (%): {periodAData.label} vs {periodBData.label}</span>
                  </span>
                  <div className="flex items-center space-x-4 text-xs font-bold">
                    <span className="flex items-center space-x-1.5">
                      <span className="w-3.5 h-3.5 rounded-xs bg-slate-300 inline-block border border-slate-400"></span>
                      <span className="text-slate-700">{periodAData.label}</span>
                    </span>
                    <span className="flex items-center space-x-1.5">
                      <span className="w-3.5 h-3.5 rounded-xs bg-gradient-to-t from-purple-700 to-purple-400 inline-block border border-purple-600"></span>
                      <span className="text-purple-950">{periodBData.label}</span>
                    </span>
                  </div>
                </div>

                {(() => {
                  const gboChartItems = comparisonMode === 'bulanan' ? weeklyComparisonData : comparativeTrendData;
                  const rawMax = Math.max(
                    ...gboChartItems.map((x) => Math.max(x.periodA.gbo, x.periodB.gbo)),
                    40
                  );
                  const maxGBO = Math.ceil(rawMax * 1.12);

                  return (
                    <div className="space-y-3">
                      <div className="relative h-[400px] border border-slate-200 bg-slate-50/50 p-5 rounded-2xl flex flex-col justify-between shadow-xs">
                        {/* Top Growth Pill Row */}
                        <div className="w-full flex items-center justify-between gap-2 z-10 pb-2">
                          {gboChartItems.map((item, idx) => (
                            <div key={idx} className="flex-1 flex justify-center">
                              <span className="text-[11px] sm:text-xs font-black text-purple-950 bg-purple-100 px-2 py-0.5 rounded-lg shadow-2xs whitespace-nowrap border border-purple-300">
                                {calcGrowth(item.periodA.gbo, item.periodB.gbo)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Main Plot Area containing Bars */}
                        <div className="relative flex-1 w-full flex items-end">
                          <div className="w-full h-full flex items-end justify-between gap-2 z-10">
                            {gboChartItems.map((item, idx) => {
                              const heightA = maxGBO > 0 ? (item.periodA.gbo / maxGBO) * 100 : 0;
                              const heightB = maxGBO > 0 ? (item.periodB.gbo / maxGBO) * 100 : 0;

                              return (
                                <div key={idx} className="flex-1 h-full flex items-end justify-center gap-1 sm:gap-2">
                                  {/* Bar A */}
                                  <div className="w-1/2 max-w-[80px] h-full relative flex items-end justify-center">
                                    <span
                                      style={{ bottom: `${heightA}%` }}
                                      className="absolute mb-1 text-xs sm:text-sm font-black text-slate-800 bg-white/95 px-2 py-0.5 rounded-lg border border-slate-300 whitespace-nowrap z-30 shadow-xs"
                                    >
                                      {item.periodA.gbo}%
                                    </span>
                                    <div
                                      style={{ height: `${Math.max(3, heightA)}%` }}
                                      className="w-full rounded-t-lg bg-slate-300 transition-all group-hover:bg-slate-400 border-t border-x border-slate-400 shadow-sm"
                                      title={`${periodAData.label}: ${item.periodA.gbo}%`}
                                    ></div>
                                  </div>
                                  {/* Bar B */}
                                  <div className="w-1/2 max-w-[80px] h-full relative flex items-end justify-center">
                                    <span
                                      style={{ bottom: `${heightB}%` }}
                                      className="absolute mb-1 text-xs sm:text-sm font-black text-purple-950 bg-white/95 px-2 py-0.5 rounded-lg border border-purple-200 shadow-xs whitespace-nowrap z-30"
                                    >
                                      {item.periodB.gbo}%
                                    </span>
                                    <div
                                      style={{ height: `${Math.max(3, heightB)}%` }}
                                      className="w-full rounded-t-lg transition-all shadow-md bg-gradient-to-t from-purple-800 via-purple-600 to-purple-400 border-t border-x border-purple-500"
                                      title={`${periodBData.label}: ${item.periodB.gbo}%`}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Month Labels aligned exactly with plot columns */}
                      <div className="flex justify-between gap-2 px-5 text-xs sm:text-sm text-slate-900 font-black">
                        {gboChartItems.map((item, idx) => (
                          <div key={idx} className="flex-1 text-center truncate">
                            {'shortName' in item ? item.shortName : item.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-950 flex items-start space-x-3 shadow-2xs">
                <Lightbulb className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold uppercase tracking-wide">Insight Pembanding GBO:</span> Kenaikan % GBO menandakan porsi kontribusi F&B semakin besar terhadap tiket cinema. Rasio yang stabil di atas 40% menegaskan daya tarik ragam menu F&B bioskop XXI.
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ========================================================================= */}
          {/* SLIDE 4: Analisis Daya Serap (%) Penetrasi Pembeli Struk Kasir */}
          {/* ========================================================================= */}
          {currentSlide === 4 && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center space-x-2">
                    <Users className="w-6 h-6 text-emerald-600" />
                    <span>Analisis Daya Serap (Penetrasi Pembeli Struk Kasir)</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Daya Serap mengukur rasio jumlah struk transaksi Cafe dibandingkan total penonton bioskop (Bill / Total Penonton * 100%).
                  </p>
                </div>
              </div>

              {/* Top Horizontal KPI Summary Strip */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#f5fbf7] border border-emerald-300/80 shadow-2xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950 block">{periodBData.label} (Daya Serap)</span>
                  <p className="text-xl font-black text-emerald-800 tracking-tight">
                    {periodBData.dayaSerap}%
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">{periodAData.label} (Pembanding)</span>
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-black text-slate-800 tracking-tight">
                      {periodAData.dayaSerap}%
                    </p>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isGrowthPositive(periodAData.dayaSerap, periodBData.dayaSerap) ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}>
                      {calcGrowth(periodAData.dayaSerap, periodBData.dayaSerap)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dominant Full-Width High-Height Bar Chart (h-[380px]) */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs font-black text-slate-900 uppercase flex items-center space-x-2 tracking-wide">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    <span>Grafik Batang Komparasi Daya Serap (%): {periodAData.label} vs {periodBData.label}</span>
                  </span>
                  <div className="flex items-center space-x-4 text-xs font-bold">
                    <span className="flex items-center space-x-1.5">
                      <span className="w-3.5 h-3.5 rounded-xs bg-slate-300 inline-block border border-slate-400"></span>
                      <span className="text-slate-700">{periodAData.label}</span>
                    </span>
                    <span className="flex items-center space-x-1.5">
                      <span className="w-3.5 h-3.5 rounded-xs bg-gradient-to-t from-emerald-700 to-emerald-400 inline-block border border-emerald-600"></span>
                      <span className="text-emerald-950">{periodBData.label}</span>
                    </span>
                  </div>
                </div>

                {(() => {
                  const dsChartItems = comparisonMode === 'bulanan' ? weeklyComparisonData : comparativeTrendData;
                  const rawMax = Math.max(
                    ...dsChartItems.map((x) => Math.max(x.periodA.dayaSerap, x.periodB.dayaSerap)),
                    25
                  );
                  const maxDS = Math.ceil(rawMax * 1.12);

                  return (
                    <div className="space-y-3">
                      <div className="relative h-[400px] border border-slate-200 bg-slate-50/50 p-5 rounded-2xl flex flex-col justify-between shadow-xs">
                        {/* Top Growth Pill Row */}
                        <div className="w-full flex items-center justify-between gap-2 z-10 pb-2">
                          {dsChartItems.map((item, idx) => (
                            <div key={idx} className="flex-1 flex justify-center">
                              <span className="text-[11px] sm:text-xs font-black text-emerald-950 bg-emerald-100 px-2 py-0.5 rounded-lg shadow-2xs whitespace-nowrap border border-emerald-300">
                                {calcGrowth(item.periodA.dayaSerap, item.periodB.dayaSerap)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Main Plot Area containing Bars */}
                        <div className="relative flex-1 w-full flex items-end">
                          <div className="w-full h-full flex items-end justify-between gap-2 z-10">
                            {dsChartItems.map((item, idx) => {
                              const heightA = maxDS > 0 ? (item.periodA.dayaSerap / maxDS) * 100 : 0;
                              const heightB = maxDS > 0 ? (item.periodB.dayaSerap / maxDS) * 100 : 0;

                              return (
                                <div key={idx} className="flex-1 h-full flex items-end justify-center gap-1 sm:gap-2">
                                  {/* Bar A */}
                                  <div className="w-1/2 max-w-[80px] h-full relative flex items-end justify-center">
                                    <span
                                      style={{ bottom: `${heightA}%` }}
                                      className="absolute mb-1 text-xs sm:text-sm font-black text-slate-800 bg-white/95 px-2 py-0.5 rounded-lg border border-slate-300 whitespace-nowrap z-30 shadow-xs"
                                    >
                                      {item.periodA.dayaSerap}%
                                    </span>
                                    <div
                                      style={{ height: `${Math.max(3, heightA)}%` }}
                                      className="w-full rounded-t-lg bg-slate-300 transition-all group-hover:bg-slate-400 border-t border-x border-slate-400 shadow-sm"
                                      title={`${periodAData.label}: ${item.periodA.dayaSerap}%`}
                                    ></div>
                                  </div>
                                  {/* Bar B */}
                                  <div className="w-1/2 max-w-[80px] h-full relative flex items-end justify-center">
                                    <span
                                      style={{ bottom: `${heightB}%` }}
                                      className="absolute mb-1 text-xs sm:text-sm font-black text-emerald-950 bg-white/95 px-2 py-0.5 rounded-lg border border-emerald-200 shadow-xs whitespace-nowrap z-30"
                                    >
                                      {item.periodB.dayaSerap}%
                                    </span>
                                    <div
                                      style={{ height: `${Math.max(3, heightB)}%` }}
                                      className="w-full rounded-t-lg transition-all shadow-md bg-gradient-to-t from-emerald-800 via-emerald-600 to-emerald-400 border-t border-x border-emerald-500"
                                      title={`${periodBData.label}: ${item.periodB.dayaSerap}%`}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Month Labels aligned exactly with plot columns */}
                      <div className="flex justify-between gap-2 px-5 text-xs sm:text-sm text-slate-900 font-black">
                        {dsChartItems.map((item, idx) => (
                          <div key={idx} className="flex-1 text-center truncate">
                            {'shortName' in item ? item.shortName : item.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start space-x-3 shadow-2xs">
                <Lightbulb className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold uppercase tracking-wide">Insight Pembanding Daya Serap:</span> Peningkatan indikator Daya Serap merefleksikan keberhasilan mendorong penonton bioskop singgah dan bertransaksi di kasir Cafe XXI, terutama sebelum jam tayang show film dimulai.
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SLIDE 5: Analisis Average Transaksi (AT / Basket Size) */}
          {/* ========================================================================= */}
          {currentSlide === 5 && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center space-x-2">
                    <CreditCard className="w-6 h-6 text-cyan-600" />
                    <span>Analisis Average Transaksi (AT / Basket Size) per Struk</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    AT mencerminkan nilai rata-rata nominal rupiah per satu struk belanja kasir Cafe (Omset F&B / Total Struk Bill).
                  </p>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-cyan-100 text-cyan-950 text-xs font-black border border-cyan-300 shadow-2xs">
                  Target Basket Size: Rp 100.000+
                </div>
              </div>

              {/* Top Horizontal KPI Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#f4fafc] border border-cyan-300/80 shadow-2xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-950 block">{periodBData.label} (Nilai AT)</span>
                  <p className="text-xl font-black text-cyan-800 tracking-tight">
                    Rp {periodBData.at.toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">{periodAData.label} (Pembanding)</span>
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-black text-slate-800 tracking-tight">
                      Rp {periodAData.at.toLocaleString('id-ID')}
                    </p>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isGrowthPositive(periodAData.at, periodBData.at) ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}>
                      {calcGrowth(periodAData.at, periodBData.at)}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-cyan-50/80 border border-cyan-200/90 shadow-2xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-950 block">Selisih Rupiah per Struk</span>
                  <p className="text-xl font-black text-cyan-900 tracking-tight">
                    +Rp {(periodBData.at - periodAData.at).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Dominant Full-Width High-Height Bar Chart (h-[380px]) */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs font-black text-slate-900 uppercase flex items-center space-x-2 tracking-wide">
                    <BarChart3 className="w-4 h-4 text-cyan-600" />
                    <span>Grafik Batang Komparasi Nilai AT (Rp / Struk): {periodAData.label} vs {periodBData.label}</span>
                  </span>
                  <div className="flex items-center space-x-4 text-xs font-bold">
                    <span className="flex items-center space-x-1.5">
                      <span className="w-3.5 h-3.5 rounded-xs bg-slate-300 inline-block border border-slate-400"></span>
                      <span className="text-slate-700">{periodAData.label}</span>
                    </span>
                    <span className="flex items-center space-x-1.5">
                      <span className="w-3.5 h-3.5 rounded-xs bg-gradient-to-t from-cyan-700 to-cyan-400 inline-block border border-cyan-600"></span>
                      <span className="text-cyan-950">{periodBData.label}</span>
                    </span>
                  </div>
                </div>

                {(() => {
                  const atChartItems = comparisonMode === 'bulanan' ? weeklyComparisonData : comparativeTrendData;
                  const rawMax = Math.max(
                    ...atChartItems.map((x) => Math.max(x.periodA.at, x.periodB.at)),
                    50000
                  );
                  const maxAT = Math.ceil((rawMax * 1.12) / 1000) * 1000;

                  return (
                    <div className="space-y-3">
                      <div className="relative h-[400px] border border-slate-200 bg-slate-50/50 p-5 rounded-2xl flex flex-col justify-between shadow-xs">
                        {/* Top Growth Pill Row */}
                        <div className="w-full flex items-center justify-between gap-2 z-10 pb-2">
                          {atChartItems.map((item, idx) => (
                            <div key={idx} className="flex-1 flex justify-center">
                              <span className="text-[11px] sm:text-xs font-black text-cyan-950 bg-cyan-100 px-2 py-0.5 rounded-lg shadow-2xs whitespace-nowrap border border-cyan-300">
                                {calcGrowth(item.periodA.at, item.periodB.at)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Main Plot Area containing Bars */}
                        <div className="relative flex-1 w-full flex items-end">
                          <div className="w-full h-full flex items-end justify-between gap-2 z-10">
                            {atChartItems.map((item, idx) => {
                              const heightA = maxAT > 0 ? (item.periodA.at / maxAT) * 100 : 0;
                              const heightB = maxAT > 0 ? (item.periodB.at / maxAT) * 100 : 0;

                              return (
                                <div key={idx} className="flex-1 h-full flex items-end justify-center gap-1 sm:gap-2">
                                  {/* Bar A */}
                                  <div className="w-1/2 max-w-[80px] h-full relative flex items-end justify-center">
                                    <span
                                      style={{ bottom: `${heightA}%` }}
                                      className="absolute mb-1 text-xs sm:text-sm font-black text-slate-800 bg-white/95 px-2 py-0.5 rounded-lg border border-slate-300 whitespace-nowrap z-30 shadow-xs"
                                    >
                                      {(item.periodA.at / 1000).toFixed(0)}k
                                    </span>
                                    <div
                                      style={{ height: `${Math.max(3, heightA)}%` }}
                                      className="w-full rounded-t-lg bg-slate-300 transition-all group-hover:bg-slate-400 border-t border-x border-slate-400 shadow-sm"
                                      title={`${periodAData.label}: Rp ${item.periodA.at.toLocaleString('id-ID')}`}
                                    ></div>
                                  </div>
                                  {/* Bar B */}
                                  <div className="w-1/2 max-w-[80px] h-full relative flex items-end justify-center">
                                    <span
                                      style={{ bottom: `${heightB}%` }}
                                      className="absolute mb-1 text-xs sm:text-sm font-black text-cyan-950 bg-white/95 px-2 py-0.5 rounded-lg border border-cyan-200 shadow-xs whitespace-nowrap z-30"
                                    >
                                      {(item.periodB.at / 1000).toFixed(0)}k
                                    </span>
                                    <div
                                      style={{ height: `${Math.max(3, heightB)}%` }}
                                      className="w-full rounded-t-lg transition-all shadow-md bg-gradient-to-t from-cyan-800 via-cyan-600 to-cyan-400 border-t border-x border-cyan-500"
                                      title={`${periodBData.label}: Rp ${item.periodB.at.toLocaleString('id-ID')}`}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Month Labels aligned exactly with plot columns */}
                      <div className="flex justify-between gap-2 px-5 text-xs sm:text-sm text-slate-900 font-black">
                        {atChartItems.map((item, idx) => (
                          <div key={idx} className="flex-1 text-center truncate">
                            {'shortName' in item ? item.shortName : item.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-950 flex items-start space-x-3 shadow-2xs">
                <Lightbulb className="w-5 h-5 text-cyan-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold uppercase tracking-wide">Insight Pembanding AT:</span> Kenaikan nilai transaksi per struk (Basket Size) membuktikan keberhasilan program paket bundling promo combo snack XXI, minuman berukuran jumbo, serta penawaran merchandise edisi film terbatas.
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SLIDE 6: Volume Penonton & Perbandingan Omset Finansial */}
          {/* ========================================================================= */}
          {currentSlide === 6 && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-3">
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                  Volume Penonton & Perbandingan Omset Finansial
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Komparasi menyeluruh volume penonton cinema, total transaksi kasir bill, dan pendapatan finansial.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#faf8f4] border border-slate-300 space-y-2 shadow-2xs">
                  <span className="text-xs uppercase font-extrabold text-slate-500">Penonton Cinema</span>
                  <p className="text-2xl font-black text-slate-900">{periodBData.penonton.toLocaleString('id-ID')} penonton</p>
                  <p className="text-xs text-slate-500 font-medium">Vs {periodAData.label}: {periodAData.penonton.toLocaleString('id-ID')} penonton</p>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                    {calcGrowth(periodAData.penonton, periodBData.penonton)}
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-[#faf8f4] border border-slate-300 space-y-2 shadow-2xs">
                  <span className="text-xs uppercase font-extrabold text-slate-500">Total Struk Kasir (Bill)</span>
                  <p className="text-2xl font-black text-slate-900">{periodBData.bill.toLocaleString('id-ID')} bill</p>
                  <p className="text-xs text-slate-500 font-medium">Vs {periodAData.label}: {periodAData.bill.toLocaleString('id-ID')} bill</p>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                    {calcGrowth(periodAData.bill, periodBData.bill)}
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-300 space-y-2 shadow-2xs">
                  <span className="text-xs uppercase font-extrabold text-amber-950">Omset F&B (Cafe XXI)</span>
                  <p className="text-2xl font-black text-amber-800">Rp {(periodBData.fnb / 1000000).toFixed(1)} Jt</p>
                  <p className="text-xs text-slate-500 font-medium">Vs {periodAData.label}: Rp {(periodAData.fnb / 1000000).toFixed(1)} Jt</p>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                    {calcGrowth(periodAData.fnb, periodBData.fnb)}
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-300 space-y-2 shadow-2xs">
                  <span className="text-xs uppercase font-extrabold text-purple-950">Omset Tiket Cinema</span>
                  <p className="text-2xl font-black text-purple-800">Rp {(periodBData.cinema / 1000000).toFixed(1)} Jt</p>
                  <p className="text-xs text-slate-500 font-medium">Vs {periodAData.label}: Rp {(periodAData.cinema / 1000000).toFixed(1)} Jt</p>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                    {calcGrowth(periodAData.cinema, periodBData.cinema)}
                  </span>
                </div>
              </div>

              {/* Revenue Contribution Ratio Progress Bar */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <span className="text-xs font-black uppercase tracking-wide text-slate-900 block">
                  Proporsi Total Pendapatan Finansial ({periodBData.label}): F&B Cafe vs Ticket Box Office
                </span>
                <div className="h-8 w-full bg-slate-100 rounded-2xl overflow-hidden flex shadow-inner border border-slate-200">
                  <div
                    style={{
                      width: `${(periodBData.fnb / (periodBData.fnb + periodBData.cinema || 1)) * 100}%`,
                    }}
                    className="bg-amber-500 h-full flex items-center justify-center text-xs font-black text-slate-950 truncate px-3"
                  >
                    F&B: {((periodBData.fnb / (periodBData.fnb + periodBData.cinema || 1)) * 100).toFixed(1)}%
                  </div>
                  <div
                    style={{
                      width: `${(periodBData.cinema / (periodBData.fnb + periodBData.cinema || 1)) * 100}%`,
                    }}
                    className="bg-purple-600 h-full flex items-center justify-center text-xs font-black text-white truncate px-3"
                  >
                    Cinema: {((periodBData.cinema / (periodBData.fnb + periodBData.cinema || 1)) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="flex justify-between text-xs text-slate-700 font-extrabold pt-1">
                  <span>Pendapatan F&B: Rp {periodBData.fnb.toLocaleString('id-ID')}</span>
                  <span>Pendapatan Ticket Cinema: Rp {periodBData.cinema.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SLIDE 7: Peringkat Performa Outlet & Pencapaian Target */}
          {/* ========================================================================= */}
          {currentSlide === 7 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-900 flex items-center space-x-2">
                    <Trophy className="w-6 h-6 text-amber-500" />
                    <span>Peringkat Performa Outlet & Pencapaian Target ({periodBData.label})</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Urutan dan pemetaan performa seluruh outlet berdasarkan indikator terpilih.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-600">Urutkan berdasarkan:</span>
                  <select
                    value={selectedRankingIndicator}
                    onChange={(e) => setSelectedRankingIndicator(e.target.value as RankingIndicator)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-black text-xs text-slate-800 shadow-2xs"
                  >
                    <option value="sph">SPH (Spending Per Head)</option>
                    <option value="ach">% Achievement SPH</option>
                    <option value="gbo">% GBO Ratio</option>
                    <option value="dayaSerap">Daya Serap (%)</option>
                    <option value="at">Average Transaksi (AT)</option>
                    <option value="penonton">Total Penonton</option>
                    <option value="fnb">Total Omset F&B</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[500px] rounded-2xl border border-slate-200 shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="uppercase text-[10px] font-black border-b border-slate-200 bg-slate-100 text-slate-700 sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-3 text-center">Rank</th>
                      <th className="py-3 px-3">Nama Outlet</th>
                      <th className="py-3 px-3">Wilayah Area</th>
                      <th className="py-3 px-3 text-right">Penonton</th>
                      <th className="py-3 px-3 text-right">Target SPH</th>
                      <th className="py-3 px-3 text-right text-amber-900">SPH Realisasi</th>
                      <th className="py-3 px-3 text-center">% Ach</th>
                      <th className="py-3 px-3 text-center">% GBO</th>
                      <th className="py-3 px-3 text-center">Daya Serap</th>
                      <th className="py-3 px-3 text-right">AT</th>
                      <th className="py-3 px-3 text-center">Status Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                    {outletRankingList.map((item, idx) => {
                      const isCapai = item.ach >= 100;
                      return (
                        <tr key={item.outlet.id} className="hover:bg-amber-50/60 transition">
                          <td className="py-3 px-3 text-center font-black text-slate-600">
                            {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                          </td>
                          <td className="py-3 px-3 font-extrabold text-slate-900">
                            {item.outlet.name}
                          </td>
                          <td className="py-3 px-3 text-slate-500 font-semibold">
                            {item.areaName}
                          </td>
                          <td className="py-3 px-3 text-right font-bold">
                            {item.penonton.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-500">
                            Rp {item.targetSph.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-amber-800">
                            Rp {item.sph.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-3 text-center font-black">
                            <span className={isCapai ? 'text-emerald-700' : 'text-rose-600'}>
                              {item.ach}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center text-purple-700 font-bold">
                            {item.gbo}%
                          </td>
                          <td className="py-3 px-3 text-center text-emerald-700 font-bold">
                            {item.dayaSerap}%
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-cyan-800">
                            Rp {item.at.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                              isCapai ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}>
                              {isCapai ? 'Capai Target' : 'Belum Capai'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SLIDE 8: Evaluasi Performa & Rencana Aksi Bisnis (Action Plan) */}
          {/* ========================================================================= */}
          {currentSlide === 8 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 border-b border-slate-200 pb-3">
                <span className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </span>
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                    Evaluasi Performa & Rencana Aksi Bisnis (Action Plan)
                  </h1>
                  <p className="text-xs text-slate-500">
                    Sintesis analitis 4 pilar KPI ({periodAData.label} vs {periodBData.label}) untuk strategi peningkatan omset F&B.
                  </p>
                </div>
              </div>

              {/* 4 Cards Matrix Evaluasi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Evaluasi 1: SPH */}
                <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                    <span className="text-xs font-black uppercase text-amber-950 flex items-center space-x-1.5">
                      <Target className="w-4 h-4 text-amber-700" />
                      <span>1. Evaluasi Head (SPH): {periodBData.sph >= avgTargetHead ? 'Optimal' : 'Perlu Intervensi'}</span>
                    </span>
                    <span className="text-xs font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                      Ach: {periodBData.achievement}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    Rata-rata pengeluaran penonton berada di angka <span className="font-extrabold text-amber-900">Rp {periodBData.sph.toLocaleString('id-ID')}</span> (pertumbuhan {calcGrowth(periodAData.sph, periodBData.sph)}).
                  </p>
                  <div className="p-3 rounded-xl bg-white border border-amber-200 text-xs text-slate-700 space-y-1">
                    <span className="font-extrabold text-amber-950 uppercase tracking-wide text-[10px] block">Rekomendasi Aksi Operational:</span>
                    <p className="leading-snug">Terapkan script greeting aktif di kasir untuk menawarkan upsize popcorn manis dan minuman edisi film blockbuster.</p>
                  </div>
                </div>

                {/* Evaluasi 2: % GBO */}
                <div className="p-5 rounded-2xl bg-purple-50/80 border border-purple-200/90 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
                    <span className="text-xs font-black uppercase text-purple-950 flex items-center space-x-1.5">
                      <Percent className="w-4 h-4 text-purple-700" />
                      <span>2. Evaluasi % GBO: {periodBData.gbo >= 40 ? 'Sangat Kuat' : 'Standar'}</span>
                    </span>
                    <span className="text-xs font-black text-purple-900 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-300">
                      {periodBData.gbo}% Kontribusi
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    Kontribusi omset F&B terhadap box office cinema mencapai <span className="font-extrabold text-purple-900">{periodBData.gbo}%</span>. Rasio ini membuktikan keterikatan pengunjung terhadap sajian bioskop XXI.
                  </p>
                  <div className="p-3 rounded-xl bg-white border border-purple-200 text-xs text-slate-700 space-y-1">
                    <span className="font-extrabold text-purple-950 uppercase tracking-wide text-[10px] block">Rekomendasi Aksi Marketing:</span>
                    <p className="leading-snug">Perkuat promosi pra-tayang melalui e-banner lobby dan pemesanan praktis mobile ordering m.tix F&B.</p>
                  </div>
                </div>

                {/* Evaluasi 3: Daya Serap */}
                <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                    <span className="text-xs font-black uppercase text-emerald-950 flex items-center space-x-1.5">
                      <Users className="w-4 h-4 text-emerald-700" />
                      <span>3. Evaluasi Daya Serap: {periodBData.dayaSerap >= 25 ? 'Tinggi' : 'Perlu Didorong'}</span>
                    </span>
                    <span className="text-xs font-black text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                      {periodBData.dayaSerap}% Pembeli
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    Sebanyak <span className="font-extrabold text-emerald-900">{periodBData.dayaSerap}%</span> dari total penonton bertransaksi di Cafe XXI ({periodBData.bill.toLocaleString('id-ID')} struk kasir).
                  </p>
                  <div className="p-3 rounded-xl bg-white border border-emerald-200 text-xs text-slate-700 space-y-1">
                    <span className="font-extrabold text-emerald-950 uppercase tracking-wide text-[10px] block">Rekomendasi Aksi Service Speed:</span>
                    <p className="leading-snug">Pastikan kelancaran antrean kasir berjalan maksimal pada 20 menit sebelum jam tayang film dimulai.</p>
                  </div>
                </div>

                {/* Evaluasi 4: Average Transaksi */}
                <div className="p-5 rounded-2xl bg-cyan-50/80 border border-cyan-200/90 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-cyan-200/60 pb-2">
                    <span className="text-xs font-black uppercase text-cyan-950 flex items-center space-x-1.5">
                      <CreditCard className="w-4 h-4 text-cyan-700" />
                      <span>4. Evaluasi Average Transaksi (AT)</span>
                    </span>
                    <span className="text-xs font-black text-cyan-900 bg-cyan-100 px-2 py-0.5 rounded-md border border-cyan-300">
                      Rp {periodBData.at.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    Basket size per transaksi berada pada level <span className="font-extrabold text-cyan-900">Rp {periodBData.at.toLocaleString('id-ID')}</span> (pertumbuhan {calcGrowth(periodAData.at, periodBData.at)}).
                  </p>
                  <div className="p-3 rounded-xl bg-white border border-cyan-200 text-xs text-slate-700 space-y-1">
                    <span className="font-extrabold text-cyan-950 uppercase tracking-wide text-[10px] block">Rekomendasi Aksi Bundling:</span>
                    <p className="leading-snug">Dorong penjualan paket combo keluarga atau bundle snack sharing untuk menaikkan nominal transaksi per struk.</p>
                  </div>
                </div>
              </div>

              {/* Executive Conclusion Banner */}
              <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4 shadow-md">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center space-x-2">
                    <span className="text-amber-400 font-black text-base">Kesimpulan Rapat Executive & Direction</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black uppercase">SIAP DIEKSEKUSI</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Dengan menjaga rasio Daya Serap di atas 25% dan mendorong SPH melampaui target, seluruh outlet berada pada jalur pencapaian omset F&B yang sangat optimal.
                  </p>
                </div>
                <button
                  onClick={handleExportPPTX}
                  disabled={isExportingPPTX}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-xs font-black uppercase shadow-md cursor-pointer hover:opacity-95 transition"
                >
                  {isExportingPPTX ? 'Mengekspor...' : 'Download Deck PPTX'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Slide Navigation Tabs */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={handlePrevSlide}
            disabled={currentSlide === 1}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-black text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition"
          >
            &lt; Slide Sebelumnya
          </button>

          <div className="flex flex-wrap gap-1.5">
            {slides.map((s) => (
              <button
                key={s.id}
                onClick={() => setCurrentSlide(s.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  currentSlide === s.id
                    ? 'bg-amber-500 text-slate-950 font-black shadow-2xs scale-105'
                    : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {s.tag}
              </button>
            ))}
          </div>

          <button
            onClick={handleNextSlide}
            disabled={currentSlide === slides.length}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-black text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition"
          >
            Slide Selanjutnya &gt;
          </button>
        </div>
      </div>
    </div>
  );
};
