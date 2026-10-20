import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { StorageService } from '../../lib/storage';
import { Outlet } from '../../types';
import { exportKPIToPPTX } from '../../lib/pptxExport';
import {
  Presentation,
  Download,
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
  Filter,
  SlidersHorizontal,
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

  // Slide Cleanliness / Element Display Options (Synced with PPTX Export)
  const [showSummaryStrip, setShowSummaryStrip] = useState(true);
  const [showBarValueLabels, setShowBarValueLabels] = useState(true);
  const [showChartGrowthPills, setShowChartGrowthPills] = useState(false);
  const [showInsightBox, setShowInsightBox] = useState(false);
  const [showSlideHeaderMeta, setShowSlideHeaderMeta] = useState(false);

  // Filter comparison mode
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('tahunan');

  // Filter Outlet & Area
  const [selectedOutletId, setSelectedOutletId] = useState<string>('all');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');

  // Ranking indicator selection (Slide Ranking)
  const [selectedRankingIndicator, setSelectedRankingIndicator] = useState<RankingIndicator>('sph');

  // Year vs Year parameters (mendukung komparasi 3 tahun: 2024 vs 2025 vs 2026)
  const [yearCompareMode, setYearCompareMode] = useState<'3tahun' | '2tahun'>('3tahun');
  const [yearA, setYearA] = useState<number>(2024);
  const [yearB, setYearB] = useState<number>(2025);
  const [yearC, setYearC] = useState<number>(2026);

  // Semester vs Semester parameters
  const [semYearA, setSemYearA] = useState<number>(2026);
  const [semPeriodA, setSemPeriodA] = useState<number>(1);
  const [semYearB, setSemYearB] = useState<number>(2026);
  const [semPeriodB, setSemPeriodB] = useState<number>(2);

  // Kuartal vs Kuartal parameters
  const [quarterYearA, setQuarterYearA] = useState<number>(2026);
  const [quarterA, setQuarterA] = useState<number>(3);
  const [quarterYearB, setQuarterYearB] = useState<number>(2026);
  const [quarterB, setQuarterB] = useState<number>(4);

  // Month vs Month parameters
  const [monthYearA, setMonthYearA] = useState<number>(2026);
  const [monthA, setMonthA] = useState<number>(8);
  const [monthYearB, setMonthYearB] = useState<number>(2026);
  const [monthB, setMonthB] = useState<number>(9);

  // Custom date parameters (Mendukung Bukan Versus / Data Mandiri, Versus 2 Rentang, dan Versus 3 Rentang)
  const [customType, setCustomType] = useState<'single' | 'versus' | 'versus3'>('single');
  const [customGranularity, setCustomGranularity] = useState<'tahunan' | 'bulanan' | 'rentang'>('bulanan');
  const [customSingleYear, setCustomSingleYear] = useState<number>(2026);
  const [customSingleMonth, setCustomSingleMonth] = useState<number>(9); // 9 = Oktober
  const [customSingleMonthYear, setCustomSingleMonthYear] = useState<number>(2026);
  const [customSingleStart, setCustomSingleStart] = useState<string>('2026-10-01');
  const [customSingleEnd, setCustomSingleEnd] = useState<string>('2026-10-31');

  // Custom date range parameters (YYYY-MM-DD) untuk Mode Versus (2 Rentang & 3 Rentang)
  const [customStartA, setCustomStartA] = useState<string>('2024-01-01');
  const [customEndA, setCustomEndA] = useState<string>('2024-12-31');
  const [customStartB, setCustomStartB] = useState<string>('2025-01-01');
  const [customEndB, setCustomEndB] = useState<string>('2025-12-31');
  const [customStartC, setCustomStartC] = useState<string>('2026-01-01');
  const [customEndC, setCustomEndC] = useState<string>('2026-12-31');

  // Sub-opsi untuk Versus 3 Rentang pada Tanggal Custom (Pilih 3 Tahun atau 3 Rentang Tanggal Bebas)
  const [customVersus3Format, setCustomVersus3Format] = useState<'3tahun' | '3rentang'>('3tahun');
  const [customYearA3, setCustomYearA3] = useState<number>(2024);
  const [customYearB3, setCustomYearB3] = useState<number>(2025);
  const [customYearC3, setCustomYearC3] = useState<number>(2026);

  const [, setStorageTick] = useState(0);
  React.useEffect(() => {
    const handleStorageUpdate = () => setStorageTick((t) => t + 1);
    window.addEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('cinema-xxi-storage-update', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const currentUser = StorageService.getCurrentUser();
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
  const allSales = StorageService.getDailySales();

  const areaFilteredOutlets = isManagerOrCleaner
    ? outlets
    : selectedAreaId === 'all'
    ? outlets
    : outlets.filter((o) => o.areaId === selectedAreaId);

  const targetOutlets: Outlet[] = selectedOutletId === 'all'
    ? areaFilteredOutlets
    : areaFilteredOutlets.filter((o) => o.id === selectedOutletId);

  // Target Head sesuai Database (Per Outlet -> outlet.targetHead, Per Area -> area.targetArea, Semua Wilayah -> Rp 24.359)
  const getActiveTargetHead = (): number => {
    if (selectedOutletId !== 'all') {
      const foundOutlet = outlets.find((o) => o.id === selectedOutletId);
      if (foundOutlet) return foundOutlet.targetHead;
    }
    if (selectedAreaId !== 'all') {
      const foundArea = areas.find((a) => a.id === selectedAreaId);
      if (foundArea && foundArea.targetArea > 0) return foundArea.targetArea;
      if (selectedAreaId === 'area-bogor-1-depok') return 25504;
      if (selectedAreaId === 'area-bogor-2') return 22375;
    }
    if (isManagerOrCleaner && targetOutlets.length === 1) {
      return targetOutlets[0].targetHead;
    }
    if (userAssignedAreaIds && userAssignedAreaIds.length === 1) {
      const assignedArea = areas.find((a) => a.id === userAssignedAreaIds[0]);
      if (assignedArea && assignedArea.targetArea > 0) return assignedArea.targetArea;
    }
    return 24359; // Target SPH Semua Wilayah sesuai database
  };

  const avgTargetHead = getActiveTargetHead();

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
        const dayTotals = StorageService.getLatestShowTotals(rec.shows);
        cinema += dayTotals.omsetCinema;
        fnb += dayTotals.omsetFnB;
        bill += dayTotals.bill;
        penonton += dayTotals.penonton;
      }
    });

    const sph = penonton > 0 ? Math.round(fnb / penonton) : 0;
    const gbo = cinema > 0 ? Number(((fnb / cinema) * 100).toFixed(1)) : 0;
    const dayaSerap = penonton > 0 ? Number(((bill / penonton) * 100).toFixed(1)) : 0;
    const at = bill > 0 ? Math.round(fnb / bill) : 0;
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

  const isSinglePeriod = comparisonMode === 'custom' && customType === 'single';

  let periodAData: PeriodMetricsData;
  let periodBData: PeriodMetricsData;
  let periodCData: PeriodMetricsData | null = null;
  let comparisonTitle = '';

  const getQuarterMonths = (q: number): [number, number] => {
    switch (q) {
      case 1: return [0, 2];
      case 2: return [3, 5];
      case 3: return [6, 8];
      case 4: default: return [9, 11];
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
    if (yearCompareMode === '3tahun') {
      comparisonTitle = `Tahun ${yearA} vs ${yearB} vs ${yearC}`;
      periodAData = getAggregatedData((y) => y === yearA, `Tahun ${yearA}`, `Jan - Des ${yearA}`);
      periodBData = getAggregatedData((y) => y === yearB, `Tahun ${yearB}`, `Jan - Des ${yearB}`);
      periodCData = getAggregatedData((y) => y === yearC, `Tahun ${yearC}`, `Jan - Des ${yearC}`);
    } else {
      comparisonTitle = `Tahun ${yearA} vs Tahun ${yearB}`;
      periodAData = getAggregatedData((y) => y === yearA, `Tahun ${yearA}`, `Jan - Des ${yearA}`);
      periodBData = getAggregatedData((y) => y === yearB, `Tahun ${yearB}`, `Jan - Des ${yearB}`);
      periodCData = null;
    }
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
    if (isSinglePeriod) {
      if (customGranularity === 'tahunan') {
        comparisonTitle = `Tahun ${customSingleYear} (Data Per Bulan)`;
        periodAData = getAggregatedData(
          (y) => y === customSingleYear,
          `Tahun ${customSingleYear}`,
          `Jan - Des ${customSingleYear}`
        );
        periodBData = periodAData;
        periodCData = null;
      } else if (customGranularity === 'bulanan') {
        const dCount = new Date(customSingleMonthYear, customSingleMonth + 1, 0).getDate();
        comparisonTitle = `Bulan ${MONTH_NAMES[customSingleMonth]} ${customSingleMonthYear} (Data Harian Tgl 1 - ${dCount})`;
        periodAData = getAggregatedData(
          (y, m0) => y === customSingleMonthYear && m0 === customSingleMonth,
          `${MONTH_NAMES[customSingleMonth]} ${customSingleMonthYear}`,
          `Tgl 1 - ${dCount} ${MONTH_NAMES[customSingleMonth]}`
        );
        periodBData = periodAData;
        periodCData = null;
      } else {
        comparisonTitle = `Periode: ${customSingleStart || '-'} s/d ${customSingleEnd || '-'}`;
        periodAData = getAggregatedData(
          (_y, _m0, _d, dateStr) => (!customSingleStart || dateStr >= customSingleStart) && (!customSingleEnd || dateStr <= customSingleEnd),
          `Rentang Tanggal`,
          `${customSingleStart || ''} s/d ${customSingleEnd || ''}`
        );
        periodBData = periodAData;
        periodCData = null;
      }
    } else if (customType === 'versus3') {
      if (customVersus3Format === '3tahun') {
        comparisonTitle = `Custom 3 Tahun: ${customYearA3} vs ${customYearB3} vs ${customYearC3}`;
        periodAData = getAggregatedData((y) => y === customYearA3, `Tahun ${customYearA3}`, `Jan - Des ${customYearA3}`);
        periodBData = getAggregatedData((y) => y === customYearB3, `Tahun ${customYearB3}`, `Jan - Des ${customYearB3}`);
        periodCData = getAggregatedData((y) => y === customYearC3, `Tahun ${customYearC3}`, `Jan - Des ${customYearC3}`);
      } else {
        comparisonTitle = `Custom 3 Rentang: (${customStartA || '-'}..${customEndA || '-'}) VS (${customStartB || '-'}..${customEndB || '-'}) VS (${customStartC || '-'}..${customEndC || '-'})`;
        periodAData = getAggregatedData(
          (_y, _m0, _d, dateStr) => (!customStartA || dateStr >= customStartA) && (!customEndA || dateStr <= customEndA),
          `Rentang A (${customStartA}..${customEndA})`,
          'Rentang Tanggal A'
        );
        periodBData = getAggregatedData(
          (_y, _m0, _d, dateStr) => (!customStartB || dateStr >= customStartB) && (!customEndB || dateStr <= customEndB),
          `Rentang B (${customStartB}..${customEndB})`,
          'Rentang Tanggal B'
        );
        periodCData = getAggregatedData(
          (_y, _m0, _d, dateStr) => (!customStartC || dateStr >= customStartC) && (!customEndC || dateStr <= customEndC),
          `Rentang C (${customStartC}..${customEndC})`,
          'Rentang Tanggal C'
        );
      }
    } else {
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
      periodCData = null;
    }
  } else {
    const mNameA = `${MONTH_NAMES[monthA]} ${monthYearA}`;
    const mNameB = `${MONTH_NAMES[monthB]} ${monthYearB}`;
    comparisonTitle = `${mNameA} vs ${mNameB}`;

    periodAData = getAggregatedData((y, m0) => y === monthYearA && m0 === monthA, mNameA, `Bulan ${MONTH_NAMES[monthA]}`);
    periodBData = getAggregatedData((y, m0) => y === monthYearB && m0 === monthB, mNameB, `Bulan ${MONTH_NAMES[monthB]}`);
  }

  let comparativeTrendData: Array<{
    monthIdx: number;
    monthName: string;
    shortName: string;
    periodA: PeriodMetricsData;
    periodB: PeriodMetricsData;
    periodC?: PeriodMetricsData;
  }> = [];

  if (comparisonMode === 'quartal') {
    const [qStartA] = getQuarterMonths(quarterA);
    const [qStartB] = getQuarterMonths(quarterB);
    comparativeTrendData = [0, 1, 2].map((idx) => {
      const mA = qStartA + idx;
      const mB = qStartB + idx;
      const dA = getAggregatedData((y, m0) => y === quarterYearA && m0 === mA, MONTH_NAMES[mA], MONTH_NAMES[mA]);
      const dB = getAggregatedData((y, m0) => y === quarterYearB && m0 === mB, MONTH_NAMES[mB], MONTH_NAMES[mB]);
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

      const dA = getAggregatedData((y, m0) => y === semYearA && m0 === mA, MONTH_NAMES[mA], MONTH_NAMES[mA]);
      const dB = getAggregatedData((y, m0) => y === semYearB && m0 === mB, MONTH_NAMES[mB], MONTH_NAMES[mB]);

      return {
        monthIdx: idx,
        monthName: MONTH_NAMES[mB],
        shortName: MONTH_NAMES[mB].substring(0, 3),
        periodA: dA,
        periodB: dB,
      };
    });
  } else if (comparisonMode === 'custom') {
    if (isSinglePeriod) {
      if (customGranularity === 'tahunan') {
        // Breakdown per bulan dalam 1 tahun (12 bulan)
        comparativeTrendData = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((mIdx) => {
          const dA = getAggregatedData(
            (y, m0) => y === customSingleYear && m0 === mIdx,
            `${MONTH_NAMES[mIdx].substring(0, 3)} ${customSingleYear}`,
            MONTH_NAMES[mIdx]
          );
          return {
            monthIdx: mIdx,
            monthName: MONTH_NAMES[mIdx],
            shortName: MONTH_NAMES[mIdx].substring(0, 3),
            periodA: dA,
            periodB: dA,
          };
        });
      } else if (customGranularity === 'bulanan') {
        // Breakdown harian dalam 1 bulan (Tgl 1 s/d 28/29/30/31)
        const daysInMonth = new Date(customSingleMonthYear, customSingleMonth + 1, 0).getDate();
        comparativeTrendData = Array.from({ length: daysInMonth }, (_, idx) => {
          const dayNum = idx + 1;
          const dA = getAggregatedData(
            (y, m0, d) => y === customSingleMonthYear && m0 === customSingleMonth && d === dayNum,
            `Tgl ${dayNum} ${MONTH_NAMES[customSingleMonth].substring(0, 3)}`,
            `Tgl ${dayNum}`
          );
          return {
            monthIdx: idx,
            monthName: `Tgl ${dayNum} ${MONTH_NAMES[customSingleMonth]}`,
            shortName: `${dayNum}`,
            periodA: dA,
            periodB: dA,
          };
        });
      } else {
        // Breakdown rentang tanggal (harian jika <= 31 hari, bulanan jika > 31 hari)
        const dStart = customSingleStart ? new Date(customSingleStart) : new Date('2026-10-01');
        const dEnd = customSingleEnd ? new Date(customSingleEnd) : new Date('2026-10-31');
        const diffDays = Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        if (diffDays <= 31) {
          const cur = new Date(dStart);
          const dayItems: typeof comparativeTrendData = [];
          while (cur <= dEnd && dayItems.length <= 35) {
            const y = cur.getFullYear();
            const m0 = cur.getMonth();
            const d = cur.getDate();
            const dPad = d < 10 ? `0${d}` : `${d}`;
            const mPad = m0 < 9 ? `0${m0 + 1}` : `${m0 + 1}`;
            const dateStr = `${y}-${mPad}-${dPad}`;
            const short = `${d}/${m0 + 1}`;
            const dA = getAggregatedData(
              (_y, _m0, _d, ds) => ds === dateStr,
              `Tgl ${d} ${MONTH_NAMES[m0].substring(0, 3)}`,
              dateStr
            );
            dayItems.push({
              monthIdx: dayItems.length,
              monthName: `Tgl ${d} ${MONTH_NAMES[m0]} ${y}`,
              shortName: short,
              periodA: dA,
              periodB: dA,
            });
            cur.setDate(cur.getDate() + 1);
          }
          comparativeTrendData = dayItems;
        } else {
          const cur = new Date(dStart.getFullYear(), dStart.getMonth(), 1);
          const end = new Date(dEnd.getFullYear(), dEnd.getMonth(), 1);
          const monthItems: typeof comparativeTrendData = [];
          while (cur <= end && monthItems.length < 24) {
            const m = cur.getMonth();
            const y = cur.getFullYear();
            const dA = getAggregatedData(
              (_y, m0, _d, dateStr) => (!customSingleStart || dateStr >= customSingleStart) && (!customSingleEnd || dateStr <= customSingleEnd) && m0 === m && _y === y,
              `${MONTH_NAMES[m].substring(0, 3)} ${y}`,
              MONTH_NAMES[m]
            );
            monthItems.push({
              monthIdx: monthItems.length,
              monthName: `${MONTH_NAMES[m]} ${y}`,
              shortName: MONTH_NAMES[m].substring(0, 3),
              periodA: dA,
              periodB: dA,
            });
            cur.setMonth(cur.getMonth() + 1);
          }
          comparativeTrendData = monthItems;
        }
      }
    } else if (customType === 'versus3') {
      if (customVersus3Format === '3tahun') {
        comparativeTrendData = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((mIdx) => {
          const dA = getAggregatedData(
            (y, m0) => y === customYearA3 && m0 === mIdx,
            `${MONTH_NAMES[mIdx].substring(0, 3)} ${customYearA3}`,
            MONTH_NAMES[mIdx]
          );
          const dB = getAggregatedData(
            (y, m0) => y === customYearB3 && m0 === mIdx,
            `${MONTH_NAMES[mIdx].substring(0, 3)} ${customYearB3}`,
            MONTH_NAMES[mIdx]
          );
          const dC = getAggregatedData(
            (y, m0) => y === customYearC3 && m0 === mIdx,
            `${MONTH_NAMES[mIdx].substring(0, 3)} ${customYearC3}`,
            MONTH_NAMES[mIdx]
          );
          return {
            monthIdx: mIdx,
            monthName: MONTH_NAMES[mIdx],
            shortName: MONTH_NAMES[mIdx].substring(0, 3),
            periodA: dA,
            periodB: dB,
            periodC: dC,
          };
        });
      } else {
        const dStartC = customStartC ? new Date(customStartC) : new Date('2026-01-01');
        const dEndC = customEndC ? new Date(customEndC) : new Date('2026-12-31');
        const monthList: Array<{ name: string; shortName: string; monthIdx: number }> = [];
        const curC = new Date(dStartC.getFullYear(), dStartC.getMonth(), 1);
        const endC = new Date(dEndC.getFullYear(), dEndC.getMonth(), 1);

        while (curC <= endC && monthList.length < 12) {
          const mC = curC.getMonth();
          monthList.push({
            name: MONTH_NAMES[mC],
            shortName: MONTH_NAMES[mC].substring(0, 3),
            monthIdx: mC,
          });
          curC.setMonth(curC.getMonth() + 1);
        }

        if (monthList.length === 0) {
          const mC = dStartC.getMonth();
          monthList.push({
            name: MONTH_NAMES[mC],
            shortName: MONTH_NAMES[mC].substring(0, 3),
            monthIdx: mC,
          });
        }

        comparativeTrendData = monthList.map((mItem, idx) => {
          const dA = getAggregatedData(
            (_y, m0, _d, dateStr) => (!customStartA || dateStr >= customStartA) && (!customEndA || dateStr <= customEndA) && m0 === mItem.monthIdx,
            `${mItem.shortName} (A)`,
            mItem.name
          );
          const dB = getAggregatedData(
            (_y, m0, _d, dateStr) => (!customStartB || dateStr >= customStartB) && (!customEndB || dateStr <= customEndB) && m0 === mItem.monthIdx,
            `${mItem.shortName} (B)`,
            mItem.name
          );
          const dC = getAggregatedData(
            (_y, m0, _d, dateStr) => (!customStartC || dateStr >= customStartC) && (!customEndC || dateStr <= customEndC) && m0 === mItem.monthIdx,
            `${mItem.shortName} (C)`,
            mItem.name
          );

          return {
            monthIdx: idx,
            monthName: mItem.name,
            shortName: mItem.shortName,
            periodA: dA,
            periodB: dB,
            periodC: dC,
          };
        });
      }
    } else {
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
    }
  } else {
    comparativeTrendData = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((mIdx) => {
      const predA = (y: number, m0: number) => y === yearA && m0 === mIdx;
      const predB = (y: number, m0: number) => y === yearB && m0 === mIdx;
      const predC = (y: number, m0: number) => y === yearC && m0 === mIdx;

      const dA = getAggregatedData(predA, `${MONTH_NAMES[mIdx].substring(0, 3)} ${yearA}`, MONTH_NAMES[mIdx]);
      const dB = getAggregatedData(predB, `${MONTH_NAMES[mIdx].substring(0, 3)} ${yearB}`, MONTH_NAMES[mIdx]);
      const dC = yearCompareMode === '3tahun'
        ? getAggregatedData(predC, `${MONTH_NAMES[mIdx].substring(0, 3)} ${yearC}`, MONTH_NAMES[mIdx])
        : undefined;

      return {
        monthIdx: mIdx,
        monthName: MONTH_NAMES[mIdx],
        shortName: MONTH_NAMES[mIdx].substring(0, 3),
        periodA: dA,
        periodB: dB,
        periodC: dC,
      };
    });
  }

  const weeklyComparisonData: Array<{
    label: string;
    periodA: PeriodMetricsData;
    periodB: PeriodMetricsData;
    periodC?: PeriodMetricsData;
  }> = [
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

  const outletDisplayName = selectedOutletId === 'all'
    ? (selectedAreaId === 'all' ? `Seluruh Wilayah (${outlets.length} Lokasi)` : `${areas.find((a) => a.id === selectedAreaId)?.name || 'Wilayah'} (${targetOutlets.length} Lokasi)`)
    : (outlets.find((o) => o.id === selectedOutletId)?.name || 'Outlet Terpilih');

  const slides = [
    {
      id: 1,
      title: isSinglePeriod ? 'Executive KPI & Performance Overview' : 'Executive KPI Comparison & Growth Overview',
      subtitle: isSinglePeriod
        ? `Ringkasan performa 5 indikator utama: ${comparisonTitle}`
        : `Komparasi otomatis 5 indikator utama: ${comparisonTitle}`,
      tag: '1. Executive Summary',
    },
    {
      id: 2,
      title: 'Analisis SPH (Spending Per Head) Cafe vs Target',
      subtitle: 'Rata-rata pengeluaran F&B dari setiap 1 penonton bioskop (Omset F&B / Total Penonton Cinema).',
      tag: '2. SPH (Head)',
    },
    {
      id: 3,
      title: 'Analisis % GBO (Gross Box Office) Kontribusi F&B',
      subtitle: 'Persentase perbandingan omset F&B terhadap omset penjualan tiket cinema (Omset F&B / Omset Cinema × 100%).',
      tag: '3. % GBO',
    },
    {
      id: 4,
      title: 'Analisis Daya Serap (Penetrasi Pembeli Struk Kasir)',
      subtitle: 'Rasio jumlah struk transaksi Cafe dibandingkan total penonton bioskop (Bill / Total Penonton × 100%).',
      tag: '4. Daya Serap',
    },
    {
      id: 5,
      title: 'Analisis Average Transaksi (AT / Basket Size) per Struk',
      subtitle: 'Nilai rata-rata nominal rupiah per satu struk belanja kasir Cafe (Omset F&B / Total Struk Bill).',
      tag: '5. Average Transaksi',
    },
    {
      id: 6,
      title: isSinglePeriod ? 'Volume Penonton & Realisasi Omset Finansial' : 'Volume Penonton & Perbandingan Omset Finansial',
      subtitle: isSinglePeriod
        ? `Volume penonton cinema, total transaksi kasir bill, dan pendapatan finansial pada ${periodAData.label}.`
        : 'Komparasi menyeluruh volume penonton cinema, total transaksi kasir bill, dan pendapatan finansial.',
      tag: '6. Volume & Omset',
    },
    {
      id: 7,
      title: `Peringkat Performa Outlet & Pencapaian Target (${isSinglePeriod ? periodAData.label : periodBData.label})`,
      subtitle: 'Urutan dan pemetaan performa seluruh outlet berdasarkan indikator terpilih.',
      tag: '7. Ranking Outlet',
    },
    {
      id: 8,
      title: 'Evaluasi Performa & Rencana Aksi Bisnis (Action Plan)',
      subtitle: isSinglePeriod
        ? `Sintesis analitis 4 pilar KPI pada ${periodAData.label} untuk strategi peningkatan omset F&B.`
        : `Sintesis analitis 4 pilar KPI (${periodAData.label} vs ${periodBData.label}) untuk strategi peningkatan omset F&B.`,
      tag: '8. Evaluasi & Aksi',
    },
  ];

  const handleNextSlide = () => {
    if (currentSlide < slides.length) setCurrentSlide(currentSlide + 1);
  };

  const handlePrevSlide = () => {
    if (currentSlide > 1) setCurrentSlide(currentSlide - 1);
  };

  const toggleFullscreen = async () => {
    const nextState = !isFullscreen;
    setIsFullscreen(nextState);
    try {
      if (nextState) {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch {
      // Fallback to Portal full-viewport mode if browser blocks native requestFullscreen in iframe
    }
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        // Keep portal state in sync if user exits native fullscreen via Esc
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen) return;
      if (e.key === 'Escape') {
        setIsFullscreen(false);
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } else if (e.key === 'ArrowRight') {
        setCurrentSlide((prev) => (prev < slides.length ? prev + 1 : prev));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => (prev > 1 ? prev - 1 : prev));
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, slides.length]);

  const calcGrowth = (valA: number, valB: number) => {
    if (valA === 0) return valB > 0 ? '+100%' : '0%';
    const diff = ((valB - valA) / valA) * 100;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}%`;
  };

  const isGrowthPositive = (valA: number, valB: number) => valB >= valA;

  const renderComparativeBars = (
    valA: number,
    valB: number,
    valC: number | undefined,
    maxVal: number,
    formatVal: (v: number) => string,
    colorA: string,
    colorB: string,
    colorC: string,
    targetVal?: number
  ) => {
    if (isSinglePeriod) {
      const hA = maxVal > 0 ? (valA / maxVal) * 100 : 0;
      const isTargetMet = targetVal ? valA >= targetVal : false;
      const barColor = targetVal
        ? (isTargetMet
            ? 'bg-gradient-to-t from-emerald-600 via-emerald-500 to-emerald-400 border-t border-x border-emerald-400'
            : 'bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400 border-t border-x border-amber-400')
        : colorB;

      return (
        <div className="flex-1 h-full flex items-end justify-center">
          <div className="w-full max-w-[20px] sm:max-w-[32px] h-full relative flex items-end justify-center">
            {showBarValueLabels && valA > 0 && (
              <span
                style={{ bottom: `${hA}%` }}
                className="absolute mb-1 text-[8px] sm:text-[9px] font-black text-slate-900 whitespace-nowrap z-30"
              >
                {formatVal(valA)}
              </span>
            )}
            <div
              style={{ height: `${Math.max(3, hA)}%` }}
              className={`w-full rounded-t-md shadow-xs ${barColor} transition-all duration-300`}
              title={`${periodAData.label}: ${valA.toLocaleString('id-ID')}`}
            ></div>
          </div>
        </div>
      );
    }

    const is3Bars = periodCData !== null && valC !== undefined;
    const hA = maxVal > 0 ? (valA / maxVal) * 100 : 0;
    const hB = maxVal > 0 ? (valB / maxVal) * 100 : 0;
    const hC = maxVal > 0 && valC !== undefined ? (valC / maxVal) * 100 : 0;
    const barWidthClass = is3Bars ? 'w-1/3 max-w-[34px]' : 'w-1/2 max-w-[44px]';

    return (
      <div className="flex-1 h-full flex items-end justify-center gap-1 sm:gap-1.5">
        {/* Bar A */}
        <div className={`${barWidthClass} h-full relative flex items-end justify-center`}>
          {showBarValueLabels && valA > 0 && (
            <span style={{ bottom: `${hA}%` }} className="absolute mb-1 text-[9px] font-extrabold text-slate-500 whitespace-nowrap z-30">
              {formatVal(valA)}
            </span>
          )}
          <div
            style={{ height: `${Math.max(3, hA)}%` }}
            className={`w-full rounded-t-md ${colorA}`}
            title={`${periodAData.label}: ${valA.toLocaleString('id-ID')}`}
          ></div>
        </div>

        {/* Bar B */}
        <div className={`${barWidthClass} h-full relative flex items-end justify-center`}>
          {showBarValueLabels && valB > 0 && (
            <span style={{ bottom: `${hB}%` }} className={`absolute mb-1 text-[9px] font-extrabold whitespace-nowrap z-30 ${is3Bars ? 'text-amber-800' : 'text-slate-900'}`}>
              {formatVal(valB)}
            </span>
          )}
          <div
            style={{ height: `${Math.max(3, hB)}%` }}
            className={`w-full rounded-t-md ${colorB}`}
            title={`${periodBData.label}: ${valB.toLocaleString('id-ID')}`}
          ></div>
        </div>

        {/* Bar C (Tahun ke-3 jika aktif) */}
        {is3Bars && (
          <div className={`${barWidthClass} h-full relative flex items-end justify-center`}>
            {showBarValueLabels && (valC ?? 0) > 0 && (
              <span style={{ bottom: `${hC}%` }} className="absolute mb-1 text-[9px] font-black text-slate-950 whitespace-nowrap z-30">
                {formatVal(valC ?? 0)}
              </span>
            )}
            <div
              style={{ height: `${Math.max(3, hC)}%` }}
              className={`w-full rounded-t-md shadow-xs ${
                targetVal && (valC ?? 0) >= targetVal
                  ? 'bg-gradient-to-t from-emerald-700 via-emerald-600 to-emerald-400 border-t border-x border-emerald-500'
                  : colorC
              }`}
              title={`${periodCData?.label || 'Tahun C'}: ${(valC ?? 0).toLocaleString('id-ID')}`}
            ></div>
          </div>
        )}
      </div>
    );
  };

  const rankingFilteredOutlets = areaFilteredOutlets;

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
        matches = (y === (periodCData ? yearC : yearB));
      } else if (comparisonMode === 'semester') {
        matches = (y === semYearB && (semPeriodB === 1 ? m0 < 6 : m0 >= 6));
      } else if (comparisonMode === 'quartal') {
        const [qStart, qEnd] = getQuarterMonths(quarterB);
        matches = (y === quarterYearB && m0 >= qStart && m0 <= qEnd);
      } else if (comparisonMode === 'custom') {
        if (isSinglePeriod) {
          if (customGranularity === 'tahunan') {
            matches = (y === customSingleYear);
          } else if (customGranularity === 'bulanan') {
            matches = (y === customSingleMonthYear && m0 === customSingleMonth);
          } else {
            matches = (!customSingleStart || rec.date >= customSingleStart) && (!customSingleEnd || rec.date <= customSingleEnd);
          }
        } else if (customType === 'versus3') {
          if (customVersus3Format === '3tahun') {
            matches = (y === customYearC3);
          } else {
            matches = (!customStartC || rec.date >= customStartC) && (!customEndC || rec.date <= customEndC);
          }
        } else {
          matches = (!customStartB || rec.date >= customStartB) && (!customEndB || rec.date <= customEndB);
        }
      } else {
        matches = (y === monthYearB && m0 === monthB);
      }

      if (matches) {
        const dayTotals = StorageService.getLatestShowTotals(rec.shows);
        oCinema += dayTotals.omsetCinema;
        oFnb += dayTotals.omsetFnB;
        oBill += dayTotals.bill;
        oPax += dayTotals.penonton;
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

  // PPTX Export Handler (Synced with current display options)
  const handleExportPPTX = async () => {
    try {
      setIsExportingPPTX(true);
      const trendList = (comparisonMode === 'bulanan' ? weeklyComparisonData : comparativeTrendData).map((item) => {
        const label = 'shortName' in item ? item.shortName : item.label;
        return {
          label,
          sphA: item.periodA.sph,
          sphB: item.periodB.sph,
          sphC: item.periodC?.sph,
          gboA: item.periodA.gbo,
          gboB: item.periodB.gbo,
          gboC: item.periodC?.gbo,
          dsA: item.periodA.dayaSerap,
          dsB: item.periodB.dayaSerap,
          dsC: item.periodC?.dayaSerap,
          atA: item.periodA.at,
          atB: item.periodB.at,
          atC: item.periodC?.at,
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
        periodC: periodCData || undefined,
        targetSph: avgTargetHead,
        rankingData: rankingDataForExport,
        selectedRankingIndicator,
        trendData: trendList,
        isSinglePeriod,
        displayOptions: {
          showSlideHeaderMeta,
          showSummaryStrip,
          showChartGrowthPills,
          showBarValueLabels,
          showInsightBox,
        },
      });
    } catch (err) {
      console.error('Failed to export PPTX:', err);
    } finally {
      setIsExportingPPTX(false);
    }
  };

  const deckContent = (
    <div
      className={`space-y-4 ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] p-4 sm:p-6 bg-[#f8fafc] overflow-y-auto'
          : ''
      }`}
    >
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
            {(['tahunan', 'semester', 'quartal', 'bulanan', 'custom'] as ComparisonMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setComparisonMode(mode)}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer capitalize ${
                  comparisonMode === mode ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                {mode === 'quartal' ? 'Kuartal' : mode}
              </button>
            ))}
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
            type="button"
            onClick={toggleFullscreen}
            className={`px-3.5 py-2 rounded-2xl border text-xs font-extrabold flex items-center space-x-2 cursor-pointer transition shadow-xs ${
              isFullscreen
                ? 'bg-amber-500 border-amber-600 text-slate-950 hover:bg-amber-400'
                : 'bg-white border-slate-300 text-slate-800 hover:bg-amber-50 hover:border-amber-400 hover:text-slate-950'
            }`}
            title={isFullscreen ? 'Keluar Mode Layar Penuh (Esc)' : 'Mode Layar Penuh (Presentasi)'}
          >
            {isFullscreen ? (
              <svg
                className="w-4 h-4 shrink-0 text-slate-950"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 shrink-0 text-amber-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 8V5a2 2 0 0 1 2-2h3" />
                <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
                <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
              </svg>
            )}
            <span>{isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}</span>
          </button>
        </div>
      </div>

      {/* Sub Filter Parameter Bar & Clean Slide Display Toggles */}
      <div className="px-5 py-3 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-xs flex flex-col gap-2.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 font-black text-amber-950">
            <ArrowRightLeft className="w-4 h-4 text-amber-700" />
            <span>Parameter Komparasi:</span>
          </div>

          {comparisonMode === 'tahunan' && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Toggle 3 Tahun / 2 Tahun */}
              <div className="flex items-center p-0.5 rounded-xl bg-amber-100/80 border border-amber-300 text-xs font-bold mr-1">
                <button
                  type="button"
                  onClick={() => setYearCompareMode('3tahun')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                    yearCompareMode === '3tahun'
                      ? 'bg-amber-600 text-white font-black shadow-xs'
                      : 'text-amber-900 hover:text-amber-950 font-bold'
                  }`}
                >
                  3 Tahun (2024 vs 2025 vs 2026)
                </button>
                <button
                  type="button"
                  onClick={() => setYearCompareMode('2tahun')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                    yearCompareMode === '2tahun'
                      ? 'bg-amber-600 text-white font-black shadow-xs'
                      : 'text-amber-900 hover:text-amber-950 font-bold'
                  }`}
                >
                  2 Tahun
                </button>
              </div>

              {yearCompareMode === '3tahun' ? (
                <>
                  <span className="text-slate-600 font-semibold">Tahun 1:</span>
                  <select
                    value={yearA}
                    onChange={(e) => setYearA(parseInt(e.target.value, 10))}
                    className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                  >
                    {[2023, 2024, 2025, 2026, 2027].map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                  <span className="text-amber-800 font-black px-1">VS</span>
                  <span className="text-slate-600 font-semibold">Tahun 2:</span>
                  <select
                    value={yearB}
                    onChange={(e) => setYearB(parseInt(e.target.value, 10))}
                    className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                  >
                    {[2023, 2024, 2025, 2026, 2027].map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                  <span className="text-amber-800 font-black px-1">VS</span>
                  <span className="text-slate-600 font-semibold">Tahun 3:</span>
                  <select
                    value={yearC}
                    onChange={(e) => setYearC(parseInt(e.target.value, 10))}
                    className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                  >
                    {[2023, 2024, 2025, 2026, 2027].map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <span className="text-slate-600 font-semibold">Tahun A:</span>
                  <select
                    value={yearA}
                    onChange={(e) => setYearA(parseInt(e.target.value, 10))}
                    className="px-3 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                  >
                    {[2023, 2024, 2025, 2026, 2027].map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                  <span className="text-amber-800 font-black px-1.5">VS</span>
                  <span className="text-slate-600 font-semibold">Tahun B:</span>
                  <select
                    value={yearB}
                    onChange={(e) => setYearB(parseInt(e.target.value, 10))}
                    className="px-3 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                  >
                    {[2023, 2024, 2025, 2026, 2027].map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </>
              )}
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
            <div className="flex flex-col gap-2 w-full">
              <div className="flex flex-wrap items-center gap-2">
                {/* Toggle Mode: Bukan Versus (Data Mandiri) vs Versus 2 Rentang vs Versus 3 Rentang */}
                <div className="flex items-center p-0.5 rounded-xl bg-amber-100/90 border border-amber-300 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setCustomType('single')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer text-xs ${
                      customType === 'single'
                        ? 'bg-amber-600 text-white font-black shadow-xs'
                        : 'text-amber-900 hover:text-amber-950 font-bold'
                    }`}
                  >
                    Bukan Versus (Data Mandiri)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomType('versus')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer text-xs ${
                      customType === 'versus'
                        ? 'bg-amber-600 text-white font-black shadow-xs'
                        : 'text-amber-900 hover:text-amber-950 font-bold'
                    }`}
                  >
                    Versus (2 Rentang)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomType('versus3')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer text-xs ${
                      customType === 'versus3'
                        ? 'bg-amber-600 text-white font-black shadow-xs'
                        : 'text-amber-900 hover:text-amber-950 font-bold'
                    }`}
                  >
                    Versus (3 Rentang)
                  </button>
                </div>

                {customType === 'single' && (
                  <div className="flex items-center p-0.5 rounded-xl bg-white border border-amber-300 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setCustomGranularity('tahunan')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                        customGranularity === 'tahunan'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                          : 'text-slate-700 hover:text-slate-950'
                      }`}
                    >
                      Tahunan (Per Bulan)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomGranularity('bulanan')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                        customGranularity === 'bulanan'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                          : 'text-slate-700 hover:text-slate-950'
                      }`}
                    >
                      Bulanan (Data Harian)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomGranularity('rentang')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                        customGranularity === 'rentang'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                          : 'text-slate-700 hover:text-slate-950'
                      }`}
                    >
                      Rentang Tanggal
                    </button>
                  </div>
                )}

                {customType === 'versus3' && (
                  <div className="flex items-center p-0.5 rounded-xl bg-white border border-amber-300 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setCustomVersus3Format('3tahun')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                        customVersus3Format === '3tahun'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                          : 'text-slate-700 hover:text-slate-950'
                      }`}
                    >
                      3 Tahun (2024 vs 2025 vs 2026)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomVersus3Format('3rentang')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                        customVersus3Format === '3rentang'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                          : 'text-slate-700 hover:text-slate-950'
                      }`}
                    >
                      3 Rentang Tanggal Bebas
                    </button>
                  </div>
                )}
              </div>

              {/* Sub parameters depending on customType */}
              {customType === 'single' ? (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60">
                  {customGranularity === 'tahunan' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-700 font-bold">Pilih Tahun:</span>
                      <select
                        value={customSingleYear}
                        onChange={(e) => setCustomSingleYear(parseInt(e.target.value, 10))}
                        className="px-3 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 shadow-2xs"
                      >
                        {[2023, 2024, 2025, 2026, 2027].map((yr) => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                      <span className="text-xs text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-lg border border-amber-300 font-bold">
                        Menampilkan grafik 12 bulan (Januari s/d Desember)
                      </span>
                    </div>
                  )}

                  {customGranularity === 'bulanan' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-700 font-bold">Pilih Bulan &amp; Tahun:</span>
                      <select
                        value={customSingleMonth}
                        onChange={(e) => setCustomSingleMonth(parseInt(e.target.value, 10))}
                        className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 shadow-2xs"
                      >
                        {MONTH_NAMES.map((m, idx) => (
                          <option key={idx} value={idx}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={customSingleMonthYear}
                        onChange={(e) => setCustomSingleMonthYear(parseInt(e.target.value, 10))}
                        className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 shadow-2xs"
                      >
                        {[2023, 2024, 2025, 2026, 2027].map((yr) => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                      <span className="text-xs text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-lg border border-amber-300 font-bold">
                        Menampilkan data harian (Tgl 1 s/d {new Date(customSingleMonthYear, customSingleMonth + 1, 0).getDate()})
                      </span>
                    </div>
                  )}

                  {customGranularity === 'rentang' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-700 font-bold">Rentang Tanggal:</span>
                      <input
                        type="date"
                        value={customSingleStart}
                        onChange={(e) => setCustomSingleStart(e.target.value)}
                        className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 shadow-2xs"
                      />
                      <span className="text-slate-500 font-bold">s/d</span>
                      <input
                        type="date"
                        value={customSingleEnd}
                        onChange={(e) => setCustomSingleEnd(e.target.value)}
                        className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 shadow-2xs"
                      />
                      <span className="text-xs text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-lg border border-amber-300 font-bold">
                        Breakdown otomatis harian (≤ 31 hari) atau bulanan
                      </span>
                    </div>
                  )}
                </div>
              ) : customType === 'versus3' ? (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60">
                  {customVersus3Format === '3tahun' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-600 font-bold">Tahun 1:</span>
                      <select
                        value={customYearA3}
                        onChange={(e) => setCustomYearA3(parseInt(e.target.value, 10))}
                        className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 shadow-2xs"
                      >
                        {[2022, 2023, 2024, 2025, 2026, 2027].map((yr) => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                      <span className="text-amber-800 font-black px-1">VS</span>
                      <span className="text-slate-600 font-bold">Tahun 2:</span>
                      <select
                        value={customYearB3}
                        onChange={(e) => setCustomYearB3(parseInt(e.target.value, 10))}
                        className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 shadow-2xs"
                      >
                        {[2022, 2023, 2024, 2025, 2026, 2027].map((yr) => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                      <span className="text-amber-800 font-black px-1">VS</span>
                      <span className="text-slate-600 font-bold">Tahun 3:</span>
                      <select
                        value={customYearC3}
                        onChange={(e) => setCustomYearC3(parseInt(e.target.value, 10))}
                        className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 shadow-2xs"
                      >
                        {[2022, 2023, 2024, 2025, 2026, 2027].map((yr) => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                      <span className="text-xs text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-lg border border-amber-300 font-bold">
                        Komparasi 3 Tahun ({customYearA3} vs {customYearB3} vs {customYearC3}) per bulan
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded-xl border border-slate-300">
                        <span className="text-slate-700 font-bold text-xs">Rentang A:</span>
                        <input
                          type="date"
                          value={customStartA}
                          onChange={(e) => setCustomStartA(e.target.value)}
                          className="px-2 py-0.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-800 text-xs"
                        />
                        <span className="text-slate-400 text-xs">s/d</span>
                        <input
                          type="date"
                          value={customEndA}
                          onChange={(e) => setCustomEndA(e.target.value)}
                          className="px-2 py-0.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-800 text-xs"
                        />
                      </div>
                      <span className="text-amber-800 font-black">VS</span>
                      <div className="flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded-xl border border-slate-300">
                        <span className="text-amber-800 font-bold text-xs">Rentang B:</span>
                        <input
                          type="date"
                          value={customStartB}
                          onChange={(e) => setCustomStartB(e.target.value)}
                          className="px-2 py-0.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-800 text-xs"
                        />
                        <span className="text-slate-400 text-xs">s/d</span>
                        <input
                          type="date"
                          value={customEndB}
                          onChange={(e) => setCustomEndB(e.target.value)}
                          className="px-2 py-0.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-800 text-xs"
                        />
                      </div>
                      <span className="text-amber-800 font-black">VS</span>
                      <div className="flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded-xl border border-amber-400">
                        <span className="text-emerald-800 font-black text-xs">Rentang C:</span>
                        <input
                          type="date"
                          value={customStartC}
                          onChange={(e) => setCustomStartC(e.target.value)}
                          className="px-2 py-0.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-800 text-xs"
                        />
                        <span className="text-slate-400 text-xs">s/d</span>
                        <input
                          type="date"
                          value={customEndC}
                          onChange={(e) => setCustomEndC(e.target.value)}
                          className="px-2 py-0.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-800 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60">
                  <span className="text-slate-600 font-semibold">Rentang A:</span>
                  <input
                    type="date"
                    value={customStartA}
                    onChange={(e) => setCustomStartA(e.target.value)}
                    className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 shadow-2xs"
                  />
                  <span className="text-slate-400">s/d</span>
                  <input
                    type="date"
                    value={customEndA}
                    onChange={(e) => setCustomEndA(e.target.value)}
                    className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 shadow-2xs"
                  />
                  <span className="text-amber-800 font-black px-1.5">VS</span>
                  <span className="text-slate-600 font-semibold">Rentang B:</span>
                  <input
                    type="date"
                    value={customStartB}
                    onChange={(e) => setCustomStartB(e.target.value)}
                    className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 shadow-2xs"
                  />
                  <span className="text-slate-400">s/d</span>
                  <input
                    type="date"
                    value={customEndB}
                    onChange={(e) => setCustomEndB(e.target.value)}
                    className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 shadow-2xs"
                  />
                </div>
              )}
            </div>
          )}

          {/* Filter Wilayah & Outlet */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-amber-700" />
            <select
              value={selectedAreaId}
              onChange={(e) => {
                setSelectedAreaId(e.target.value);
                setSelectedOutletId('all');
              }}
              className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
            >
              <option value="all">Semua Wilayah (Target Rp 24.359)</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (Target Rp {a.targetArea.toLocaleString('id-ID')})
                </option>
              ))}
            </select>

            <select
              value={selectedOutletId}
              onChange={(e) => setSelectedOutletId(e.target.value)}
              className="px-2.5 py-1 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 max-w-[230px]"
            >
              <option value="all">Semua Outlet ({areaFilteredOutlets.length})</option>
              {areaFilteredOutlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} (Target Rp {o.targetHead.toLocaleString('id-ID')})
                </option>
              ))}
            </select>

            <div className="text-[11px] font-extrabold text-amber-950 bg-amber-100 px-3 py-1 rounded-xl border border-amber-300 whitespace-nowrap flex items-center space-x-1.5">
              <span>📍 {outletDisplayName}</span>
              <span className="text-amber-500">•</span>
              <span className="text-emerald-800 font-black">Target Head: Rp {avgTargetHead.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

        {/* Clean Slide Element Toggles (Synced with PPTX Export) */}
        <div className="pt-2 border-t border-amber-200/70 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-600">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700" />
            <span>Tampilan Elemen Slide & Export PPTX:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowSummaryStrip(!showSummaryStrip)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                showSummaryStrip
                  ? 'bg-amber-500/20 border-amber-400 text-amber-950'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              {showSummaryStrip ? '✓' : '○'} Kartu Ringkasan Atas
            </button>
            <button
              type="button"
              onClick={() => setShowBarValueLabels(!showBarValueLabels)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                showBarValueLabels
                  ? 'bg-amber-500/20 border-amber-400 text-amber-950'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              {showBarValueLabels ? '✓' : '○'} Angka Batang Grafik
            </button>
            <button
              type="button"
              onClick={() => setShowChartGrowthPills(!showChartGrowthPills)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                showChartGrowthPills
                  ? 'bg-amber-500/20 border-amber-400 text-amber-950'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              {showChartGrowthPills ? '✓' : '○'} Badge % Growth Grafik
            </button>
            <button
              type="button"
              onClick={() => setShowInsightBox(!showInsightBox)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                showInsightBox
                  ? 'bg-amber-500/20 border-amber-400 text-amber-950'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              {showInsightBox ? '✓' : '○'} Kotak Insight Bawah
            </button>
            <button
              type="button"
              onClick={() => setShowSlideHeaderMeta(!showSlideHeaderMeta)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                showSlideHeaderMeta
                  ? 'bg-amber-500/20 border-amber-400 text-amber-950'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              {showSlideHeaderMeta ? '✓' : '○'} Info Outlet di Tiap Slide
            </button>
          </div>
        </div>
      </div>

      {/* 16:9 Spacious Slide Canvas Container */}
      <div className="rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-md p-6 sm:p-8 transition min-h-[700px] flex flex-col justify-between">
        <div>
          {/* Unified Clean Slide Header (Single Title without Redundant Duplication) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 mb-5">
            <div>
              <div className="flex items-center space-x-2.5">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[11px] uppercase tracking-wider">
                  {currentSlide} / {slides.length}
                </span>
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900">
                  {slides[currentSlide - 1].title}
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {slides[currentSlide - 1].subtitle}
              </p>
            </div>

            <div className="flex items-center space-x-2.5">
              {(showSlideHeaderMeta || currentSlide === 1) && (
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                  <span className="font-extrabold text-slate-900">{outletDisplayName}</span>
                  <span className="text-amber-400">•</span>
                  <span className="font-bold text-amber-900">Target SPH: Rp {avgTargetHead.toLocaleString('id-ID')}</span>
                </div>
              )}

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className={`p-2 rounded-xl border cursor-pointer transition ${
                    isFullscreen
                      ? 'bg-amber-500 border-amber-600 text-slate-950 hover:bg-amber-400'
                      : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-amber-50 hover:border-amber-400 hover:text-amber-900'
                  }`}
                  title={isFullscreen ? 'Keluar Mode Layar Penuh (Esc)' : 'Mode Layar Penuh'}
                >
                  {isFullscreen ? (
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 8V5a2 2 0 0 1 2-2h3" />
                      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                      <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
                      <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={handlePrevSlide}
                  disabled={currentSlide === 1}
                  className="p-2 rounded-xl border border-slate-300 bg-slate-50 disabled:opacity-30 text-slate-700 hover:bg-slate-100 cursor-pointer transition"
                  title="Slide Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextSlide}
                  disabled={currentSlide === slides.length}
                  className="p-2 rounded-xl border border-slate-300 bg-slate-50 disabled:opacity-30 text-slate-700 hover:bg-slate-100 cursor-pointer transition"
                  title="Slide Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SLIDE 1: Executive KPI Comparison & Growth Overview */}
          {/* ========================================================================= */}
          {currentSlide === 1 && (
            <div className="space-y-5">
              {/* 5 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* 1. Penonton (Pax) */}
                <div className="p-4 rounded-2xl bg-[#f4f7ff] border-2 border-blue-300 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-950 uppercase tracking-wide flex items-center space-x-1">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>1. Penonton (Pax)</span>
                    </span>
                    {isSinglePeriod ? (
                      <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                        Total Pax
                      </span>
                    ) : (
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                        isGrowthPositive((periodCData ? periodBData : periodAData).penonton, (periodCData || periodBData).penonton)
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}>
                        {calcGrowth((periodCData ? periodBData : periodAData).penonton, (periodCData || periodBData).penonton)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-blue-800 tracking-tight">
                      {(periodCData || periodBData).penonton.toLocaleString('id-ID')} <span className="text-xs font-bold text-slate-500">Pax</span>
                    </p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      {isSinglePeriod ? (
                        <span>Periode: <b className="text-slate-800">{periodAData.label}</b></span>
                      ) : periodCData ? (
                        <span>
                          {periodAData.label}: <b className="text-slate-700">{periodAData.penonton.toLocaleString('id-ID')}</b> • {periodBData.label}: <b className="text-slate-700">{periodBData.penonton.toLocaleString('id-ID')}</b>
                        </span>
                      ) : (
                        <span>{periodAData.label}: <span className="font-bold text-slate-700">{periodAData.penonton.toLocaleString('id-ID')} Pax</span></span>
                      )}
                    </p>
                  </div>
                  <div className="text-xs text-blue-950 bg-blue-50/80 p-2 rounded-xl border border-blue-200/80 font-medium">
                    Total Tiket Penonton Cinema XXI
                  </div>
                </div>

                {/* 2. Head (SPH) */}
                <div className="p-4 rounded-2xl bg-[#fffdfa] border-2 border-amber-300 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center space-x-1">
                      <Target className="w-4 h-4 text-amber-600" />
                      <span>2. Head (SPH)</span>
                    </span>
                    {isSinglePeriod ? (
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                        periodAData.sph >= avgTargetHead
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}>
                        Ach: {periodAData.achievement}%
                      </span>
                    ) : (
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                        isGrowthPositive((periodCData ? periodBData : periodAData).sph, (periodCData || periodBData).sph)
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}>
                        {calcGrowth((periodCData ? periodBData : periodAData).sph, (periodCData || periodBData).sph)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-amber-800 tracking-tight">
                      Rp {(periodCData || periodBData).sph.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      {isSinglePeriod ? (
                        <span>Target: <b className="text-slate-800">Rp {avgTargetHead.toLocaleString('id-ID')}</b></span>
                      ) : periodCData ? (
                        <span>
                          {periodAData.label}: <b className="text-slate-700">Rp {periodAData.sph.toLocaleString('id-ID')}</b> • {periodBData.label}: <b className="text-slate-700">Rp {periodBData.sph.toLocaleString('id-ID')}</b>
                        </span>
                      ) : (
                        <span>{periodAData.label}: <span className="font-bold text-slate-700">Rp {periodAData.sph.toLocaleString('id-ID')}</span></span>
                      )}
                    </p>
                  </div>
                  <div className="text-xs text-slate-700 bg-amber-50/80 p-2 rounded-xl border border-amber-200/80">
                    Target: <span className="font-extrabold text-slate-900">Rp {avgTargetHead.toLocaleString('id-ID')}</span> &bull; Ach: <span className="font-black text-amber-900">{(periodCData || periodBData).achievement}%</span>
                  </div>
                </div>

                {/* 3. GBO (%) */}
                <div className="p-4 rounded-2xl bg-[#faf7ff] border-2 border-purple-300 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-950 uppercase tracking-wide flex items-center space-x-1">
                      <Percent className="w-4 h-4 text-purple-600" />
                      <span>3. % GBO (Ratio)</span>
                    </span>
                    {isSinglePeriod ? (
                      <span className="text-xs font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300">
                        Rasio F&B
                      </span>
                    ) : (
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                        isGrowthPositive((periodCData ? periodBData : periodAData).gbo, (periodCData || periodBData).gbo)
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}>
                        {calcGrowth((periodCData ? periodBData : periodAData).gbo, (periodCData || periodBData).gbo)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-purple-800 tracking-tight">
                      {(periodCData || periodBData).gbo}%
                    </p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      {isSinglePeriod ? (
                        <span>Rasio F&B terhadap Box Office</span>
                      ) : periodCData ? (
                        <span>
                          {periodAData.label}: <b className="text-slate-700">{periodAData.gbo}%</b> • {periodBData.label}: <b className="text-slate-700">{periodBData.gbo}%</b>
                        </span>
                      ) : (
                        <span>{periodAData.label}: <span className="font-bold text-slate-700">{periodAData.gbo}%</span></span>
                      )}
                    </p>
                  </div>
                  <div className="text-xs text-purple-950 bg-purple-50/80 p-2 rounded-xl border border-purple-200/80 font-medium">
                    Rasio Omset F&B terhadap Box Office
                  </div>
                </div>

                {/* 4. Daya Serap (%) */}
                <div className="p-4 rounded-2xl bg-[#f5fbf7] border-2 border-emerald-300 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center space-x-1">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span>4. Daya Serap (%)</span>
                    </span>
                    {isSinglePeriod ? (
                      <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                        Penetrasi
                      </span>
                    ) : (
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                        isGrowthPositive((periodCData ? periodBData : periodAData).dayaSerap, (periodCData || periodBData).dayaSerap)
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}>
                        {calcGrowth((periodCData ? periodBData : periodAData).dayaSerap, (periodCData || periodBData).dayaSerap)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight">
                      {(periodCData || periodBData).dayaSerap}%
                    </p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      {isSinglePeriod ? (
                        <span>{periodAData.bill.toLocaleString('id-ID')} Bill / {periodAData.penonton.toLocaleString('id-ID')} Pax</span>
                      ) : periodCData ? (
                        <span>
                          {periodAData.label}: <b className="text-slate-700">{periodAData.dayaSerap}%</b> • {periodBData.label}: <b className="text-slate-700">{periodBData.dayaSerap}%</b>
                        </span>
                      ) : (
                        <span>{periodAData.label}: <span className="font-bold text-slate-700">{periodAData.dayaSerap}%</span></span>
                      )}
                    </p>
                  </div>
                  <div className="text-xs text-emerald-950 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/80 font-medium">
                    Rasio Bill Kasir terhadap Penonton XXI
                  </div>
                </div>

                {/* 5. AT (Average Transaksi) */}
                <div className="p-4 rounded-2xl bg-[#f4fafc] border-2 border-cyan-300 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-cyan-950 uppercase tracking-wide flex items-center space-x-1">
                      <CreditCard className="w-4 h-4 text-cyan-600" />
                      <span>5. Avg Transaksi</span>
                    </span>
                    {isSinglePeriod ? (
                      <span className="text-xs font-black px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-300">
                        Rata-rata
                      </span>
                    ) : (
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                        isGrowthPositive((periodCData ? periodBData : periodAData).at, (periodCData || periodBData).at)
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}>
                        {calcGrowth((periodCData ? periodBData : periodAData).at, (periodCData || periodBData).at)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-cyan-800 tracking-tight">
                      Rp {(periodCData || periodBData).at.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      {isSinglePeriod ? (
                        <span>Omset F&B: <b className="text-slate-800">Rp {(periodAData.fnb / 1000000).toFixed(1)} Jt</b></span>
                      ) : periodCData ? (
                        <span>
                          {periodAData.label}: <b className="text-slate-700">Rp {periodAData.at.toLocaleString('id-ID')}</b> • {periodBData.label}: <b className="text-slate-700">Rp {periodBData.at.toLocaleString('id-ID')}</b>
                        </span>
                      ) : (
                        <span>{periodAData.label}: <span className="font-bold text-slate-700">Rp {periodAData.at.toLocaleString('id-ID')}</span></span>
                      )}
                    </p>
                  </div>
                  <div className="text-xs text-cyan-950 bg-cyan-50/80 p-2 rounded-xl border border-cyan-200/80 font-medium">
                    Nilai Keranjang Belanja per Struk Kasir
                  </div>
                </div>
              </div>

              {/* Side-by-Side Comparison Matrix Table OR Single Period Matrix Table */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-800 flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-amber-700" />
                  <span>
                    {isSinglePeriod
                      ? `Matriks Evaluasi Performa KPI: ${comparisonTitle}`
                      : `Matriks Komparasi Parameter Utama: ${comparisonTitle}`}
                  </span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900 text-white font-black text-[10px] uppercase">
                      {isSinglePeriod ? (
                        <tr>
                          <th className="p-3 rounded-tl-xl">Indikator KPI Utama</th>
                          <th className="p-3 text-right">Target / Standar</th>
                          <th className="p-3 text-right text-amber-300">Realisasi ({periodAData.label})</th>
                          <th className="p-3 text-center">Pencapaian (%)</th>
                          <th className="p-3 text-center rounded-tr-xl">Status &amp; Evaluasi</th>
                        </tr>
                      ) : periodCData ? (
                        <tr>
                          <th className="p-3 rounded-tl-xl">Indikator KPI Utama</th>
                          <th className="p-3 text-right">{periodAData.label}</th>
                          <th className="p-3 text-right">{periodBData.label}</th>
                          <th className="p-3 text-right text-amber-300">{periodCData.label}</th>
                          <th className="p-3 text-center">{periodAData.label} → {periodBData.label}</th>
                          <th className="p-3 text-center rounded-tr-xl">{periodBData.label} → {periodCData.label}</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="p-3 rounded-tl-xl">Indikator KPI Utama</th>
                          <th className="p-3 text-right">{periodAData.label}</th>
                          <th className="p-3 text-right">{periodBData.label}</th>
                          <th className="p-3 text-right">Selisih (Delta)</th>
                          <th className="p-3 text-center rounded-tr-xl">Pertumbuhan (%)</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                      {isSinglePeriod ? (
                        <>
                          <tr className="bg-amber-50/50">
                            <td className="p-3 font-bold text-amber-900 flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                              <span>1. SPH (Spending Per Head / Penonton)</span>
                            </td>
                            <td className="p-3 text-right font-bold text-slate-600">Rp {avgTargetHead.toLocaleString('id-ID')}</td>
                            <td className="p-3 text-right font-black text-amber-900">Rp {periodAData.sph.toLocaleString('id-ID')}</td>
                            <td className="p-3 text-center font-black">
                              <span className={`px-2 py-0.5 rounded-md ${periodAData.sph >= avgTargetHead ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'}`}>
                                {periodAData.achievement}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                periodAData.sph >= avgTargetHead ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}>
                                {periodAData.sph >= avgTargetHead ? 'Tercapai (Optimal)' : 'Belum Capai Target'}
                              </span>
                            </td>
                          </tr>

                          <tr>
                            <td className="p-3 font-bold text-blue-900 flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                              <span>2. Penonton Cinema XXI (Pax)</span>
                            </td>
                            <td className="p-3 text-right text-slate-500">-</td>
                            <td className="p-3 text-right font-black text-blue-900">{periodAData.penonton.toLocaleString('id-ID')} Pax</td>
                            <td className="p-3 text-center text-slate-400">-</td>
                            <td className="p-3 text-center font-bold text-blue-800 text-[11px]">Total Tiket Bioskop Terjual</td>
                          </tr>

                          <tr className="bg-slate-50/60">
                            <td className="p-3 font-bold text-amber-900 flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                              <span>3. Total Omset F&B (Cafe XXI)</span>
                            </td>
                            <td className="p-3 text-right text-slate-500">-</td>
                            <td className="p-3 text-right font-black text-amber-900">Rp {periodAData.fnb.toLocaleString('id-ID')}</td>
                            <td className="p-3 text-center text-slate-400">-</td>
                            <td className="p-3 text-center font-bold text-amber-900 text-[11px]">Rp {(periodAData.fnb / 1000000).toFixed(1)} Juta</td>
                          </tr>

                          <tr>
                            <td className="p-3 font-bold text-purple-900 flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                              <span>4. % GBO (Rasio F&B vs Cinema)</span>
                            </td>
                            <td className="p-3 text-right text-slate-600 font-bold">Benchmark 40% - 60%</td>
                            <td className="p-3 text-right font-black text-purple-900">{periodAData.gbo}%</td>
                            <td className="p-3 text-center text-slate-400">-</td>
                            <td className="p-3 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                periodAData.gbo >= 40 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {periodAData.gbo >= 40 ? 'Rasio Sangat Sehat' : 'Peluang Optimasi'}
                              </span>
                            </td>
                          </tr>

                          <tr className="bg-slate-50/60">
                            <td className="p-3 font-bold text-emerald-900 flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                              <span>5. Daya Serap (Struk Kasir / Penonton)</span>
                            </td>
                            <td className="p-3 text-right text-slate-600 font-bold">Benchmark 25% - 40%</td>
                            <td className="p-3 text-right font-black text-emerald-900">{periodAData.dayaSerap}%</td>
                            <td className="p-3 text-center text-slate-400">-</td>
                            <td className="p-3 text-center font-bold text-emerald-800 text-[11px]">
                              {periodAData.bill.toLocaleString('id-ID')} Bill dari {periodAData.penonton.toLocaleString('id-ID')} Pax
                            </td>
                          </tr>

                          <tr>
                            <td className="p-3 font-bold text-cyan-900 flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
                              <span>6. Average Transaksi (AT / Struk)</span>
                            </td>
                            <td className="p-3 text-right text-slate-500">-</td>
                            <td className="p-3 text-right font-black text-cyan-900">Rp {periodAData.at.toLocaleString('id-ID')}</td>
                            <td className="p-3 text-center text-slate-400">-</td>
                            <td className="p-3 text-center font-bold text-cyan-800 text-[11px]">Nilai Belanja per Struk Kasir</td>
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr>
                            <td className="p-3 font-bold text-blue-900 flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                              <span>1. Penonton (Pax Tiket)</span>
                            </td>
                            <td className="p-3 text-right">{periodAData.penonton.toLocaleString('id-ID')} Pax</td>
                            <td className="p-3 text-right font-bold text-blue-700">{periodBData.penonton.toLocaleString('id-ID')} Pax</td>
                            {periodCData ? (
                              <>
                                <td className="p-3 text-right font-black text-blue-900">{periodCData.penonton.toLocaleString('id-ID')} Pax</td>
                                <td className="p-3 text-center font-bold text-slate-700">{calcGrowth(periodAData.penonton, periodBData.penonton)}</td>
                                <td className="p-3 text-center font-extrabold text-emerald-700">{calcGrowth(periodBData.penonton, periodCData.penonton)}</td>
                              </>
                            ) : (
                              <>
                                <td className="p-3 text-right font-bold">{(periodBData.penonton - periodAData.penonton).toLocaleString('id-ID')} Pax</td>
                                <td className="p-3 text-center font-extrabold text-emerald-700">{calcGrowth(periodAData.penonton, periodBData.penonton)}</td>
                              </>
                            )}
                          </tr>
                          <tr className="bg-slate-50/70">
                            <td className="p-3 font-bold text-amber-900 flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                              <span>2. SPH (Spending Per Head)</span>
                            </td>
                            <td className="p-3 text-right">Rp {periodAData.sph.toLocaleString('id-ID')}</td>
                            <td className="p-3 text-right font-bold text-amber-700">Rp {periodBData.sph.toLocaleString('id-ID')}</td>
                            {periodCData ? (
                              <>
                                <td className="p-3 text-right font-black text-amber-900">Rp {periodCData.sph.toLocaleString('id-ID')}</td>
                                <td className="p-3 text-center font-bold text-slate-700">{calcGrowth(periodAData.sph, periodBData.sph)}</td>
                                <td className="p-3 text-center font-extrabold text-emerald-700">{calcGrowth(periodBData.sph, periodCData.sph)}</td>
                              </>
                            ) : (
                              <>
                                <td className="p-3 text-right font-bold">Rp {(periodBData.sph - periodAData.sph).toLocaleString('id-ID')}</td>
                                <td className="p-3 text-center font-extrabold text-emerald-700">{calcGrowth(periodAData.sph, periodBData.sph)}</td>
                              </>
                            )}
                          </tr>
                          <tr>
                            <td className="p-3 font-bold text-purple-900 flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                              <span>3. % GBO (F&B vs Ticket)</span>
                            </td>
                            <td className="p-3 text-right">{periodAData.gbo}%</td>
                            <td className="p-3 text-right font-bold text-purple-700">{periodBData.gbo}%</td>
                            {periodCData ? (
                              <>
                                <td className="p-3 text-right font-black text-purple-900">{periodCData.gbo}%</td>
                                <td className="p-3 text-center font-bold text-slate-700">{calcGrowth(periodAData.gbo, periodBData.gbo)}</td>
                                <td className="p-3 text-center font-extrabold text-emerald-700">{calcGrowth(periodBData.gbo, periodCData.gbo)}</td>
                              </>
                            ) : (
                              <>
                                <td className="p-3 text-right font-bold">{(periodBData.gbo - periodAData.gbo).toFixed(1)}%</td>
                                <td className="p-3 text-center font-extrabold text-emerald-700">{calcGrowth(periodAData.gbo, periodBData.gbo)}</td>
                              </>
                            )}
                          </tr>
                          <tr className="bg-slate-50/70">
                            <td className="p-3 font-bold text-emerald-900 flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                              <span>4. Daya Serap (Bill / Penonton)</span>
                            </td>
                            <td className="p-3 text-right">{periodAData.dayaSerap}%</td>
                            <td className="p-3 text-right font-bold text-emerald-700">{periodBData.dayaSerap}%</td>
                            {periodCData ? (
                              <>
                                <td className="p-3 text-right font-black text-emerald-900">{periodCData.dayaSerap}%</td>
                                <td className="p-3 text-center font-bold text-slate-700">{calcGrowth(periodAData.dayaSerap, periodBData.dayaSerap)}</td>
                                <td className="p-3 text-center font-extrabold text-emerald-700">{calcGrowth(periodBData.dayaSerap, periodCData.dayaSerap)}</td>
                              </>
                            ) : (
                              <>
                                <td className="p-3 text-right font-bold">{(periodBData.dayaSerap - periodAData.dayaSerap).toFixed(1)}%</td>
                                <td className="p-3 text-center font-extrabold text-emerald-700">{calcGrowth(periodAData.dayaSerap, periodBData.dayaSerap)}</td>
                              </>
                            )}
                          </tr>
                          <tr>
                            <td className="p-3 font-bold text-cyan-900 flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
                              <span>5. Average Transaksi (AT)</span>
                            </td>
                            <td className="p-3 text-right">Rp {periodAData.at.toLocaleString('id-ID')}</td>
                            <td className="p-3 text-right font-bold text-cyan-700">Rp {periodBData.at.toLocaleString('id-ID')}</td>
                            {periodCData ? (
                              <>
                                <td className="p-3 text-right font-black text-cyan-900">Rp {periodCData.at.toLocaleString('id-ID')}</td>
                                <td className="p-3 text-center font-bold text-slate-700">{calcGrowth(periodAData.at, periodBData.at)}</td>
                                <td className="p-3 text-center font-extrabold text-emerald-700">{calcGrowth(periodBData.at, periodCData.at)}</td>
                              </>
                            ) : (
                              <>
                                <td className="p-3 text-right font-bold">Rp {(periodBData.at - periodAData.at).toLocaleString('id-ID')}</td>
                                <td className="p-3 text-center font-extrabold text-emerald-700">{calcGrowth(periodAData.at, periodBData.at)}</td>
                              </>
                            )}
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SLIDE 2: Analisis SPH (Spending Per Head / Penonton) */}
          {/* ========================================================================= */}
          {currentSlide === 2 && (
            <div className="space-y-4">
              {showSummaryStrip && (
                isSinglePeriod ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-300 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 block">Realisasi SPH</span>
                      <p className="text-xl font-black text-amber-800 tracking-tight">
                        Rp {periodAData.sph.toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Target Head</span>
                      <p className="text-xl font-black text-slate-800 tracking-tight">
                        Rp {avgTargetHead.toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950 block">Pencapaian Target</span>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-black text-emerald-800 tracking-tight">
                          {periodAData.achievement}%
                        </p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${periodAData.sph >= avgTargetHead ? 'bg-emerald-200 text-emerald-950' : 'bg-rose-200 text-rose-950'}`}>
                          {periodAData.sph >= avgTargetHead ? 'Tercapai' : 'Bawah Target'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-950 block">Total Omset F&B</span>
                      <p className="text-xl font-black text-blue-900 tracking-tight">
                        Rp {(periodAData.fnb / 1000000).toFixed(1)} Jt
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={`grid gap-3 ${periodCData ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">{periodAData.label}</span>
                      <p className="text-xl font-black text-slate-800 tracking-tight">
                        Rp {periodAData.sph.toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#eff6ff] border border-blue-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block">{periodBData.label}</span>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-black text-blue-800 tracking-tight">
                          Rp {periodBData.sph.toLocaleString('id-ID')}
                        </p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isGrowthPositive(periodAData.sph, periodBData.sph) ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}>
                          {calcGrowth(periodAData.sph, periodBData.sph)}
                        </span>
                      </div>
                    </div>

                    {periodCData && (
                      <div className="p-3.5 rounded-2xl bg-[#fffdfa] border border-amber-300/80 shadow-2xs space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 block">{periodCData.label} (Fokus)</span>
                        <div className="flex items-center justify-between">
                          <p className="text-xl font-black text-amber-800 tracking-tight">
                            Rp {periodCData.sph.toLocaleString('id-ID')}
                          </p>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isGrowthPositive(periodBData.sph, periodCData.sph) ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                          }`}>
                            {calcGrowth(periodBData.sph, periodCData.sph)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950 block">Pencapaian Target</span>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-black text-emerald-800 tracking-tight">
                          {(periodCData || periodBData).achievement}%
                        </p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${(periodCData || periodBData).sph >= avgTargetHead ? 'bg-emerald-200 text-emerald-950' : 'bg-rose-200 text-rose-950'}`}>
                          {(periodCData || periodBData).sph >= avgTargetHead ? 'Tercapai' : 'Bawah Target'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 block">Target &amp; Selisih</span>
                      <p className="text-xl font-black text-amber-900 tracking-tight">
                        {(periodCData || periodBData).sph >= avgTargetHead ? '+' : ''}Rp {((periodCData || periodBData).sph - avgTargetHead).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                )
              )}

              {/* Dominant Full-Width Comparative Bar Chart */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs font-black text-slate-900 uppercase flex items-center space-x-2 tracking-wide">
                    <BarChart3 className="w-4 h-4 text-amber-600" />
                    <span>{isSinglePeriod ? `Grafik Batang SPH (Rp / Head): ${comparisonTitle}` : `Grafik Batang Komparasi SPH (Rp / Head): ${comparisonTitle}`}</span>
                  </span>
                  <div className="flex items-center space-x-4 text-xs font-bold">
                    {isSinglePeriod ? (
                      <span className="flex items-center space-x-1.5">
                        <span className="w-3.5 h-3.5 rounded-xs bg-gradient-to-t from-amber-600 to-amber-400 inline-block border border-amber-600"></span>
                        <span className="text-amber-950">{periodAData.label}</span>
                      </span>
                    ) : (
                      <>
                        <span className="flex items-center space-x-1.5">
                          <span className="w-3.5 h-3.5 rounded-xs bg-slate-300 inline-block border border-slate-400"></span>
                          <span className="text-slate-700">{periodAData.label}</span>
                        </span>
                        <span className="flex items-center space-x-1.5">
                          <span className={`w-3.5 h-3.5 rounded-xs inline-block border ${
                            periodCData
                              ? 'bg-gradient-to-t from-blue-700 to-blue-400 border-blue-600'
                              : 'bg-gradient-to-t from-amber-600 to-amber-400 border-amber-600'
                          }`}></span>
                          <span className={periodCData ? 'text-blue-950' : 'text-amber-950'}>{periodBData.label}</span>
                        </span>
                        {periodCData && (
                          <span className="flex items-center space-x-1.5">
                            <span className="w-3.5 h-3.5 rounded-xs bg-gradient-to-t from-amber-600 to-amber-400 inline-block border border-amber-600"></span>
                            <span className="text-amber-950">{periodCData.label}</span>
                          </span>
                        )}
                      </>
                    )}
                    <span className="text-emerald-800 font-black bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300">
                      Target: Rp {avgTargetHead.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {(() => {
                  const sphChartItems = comparisonMode === 'bulanan' ? weeklyComparisonData : comparativeTrendData;
                  const rawMax = Math.max(
                    ...sphChartItems.map((x) => Math.max(x.periodA.sph, x.periodB.sph, x.periodC?.sph || 0)),
                    avgTargetHead
                  );
                  const maxSPH = Math.ceil((rawMax * 1.15) / 1000) * 1000;
                  const targetPct = maxSPH > 0 ? Math.min(100, Math.max(3, (avgTargetHead / maxSPH) * 100)) : 0;

                  return (
                    <div className="space-y-2.5">
                      <div className="relative h-[380px] border border-slate-200 bg-slate-50/50 p-4 rounded-2xl flex flex-col justify-between">
                        {showChartGrowthPills && (
                          <div className="w-full flex items-center justify-between gap-1 z-10 pb-2">
                            {sphChartItems.map((item, idx) => (
                              <div key={idx} className="flex-1 flex justify-center">
                                {isSinglePeriod ? (
                                  avgTargetHead > 0 && item.periodA.sph > 0 ? (
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md whitespace-nowrap border ${
                                      item.periodA.sph >= avgTargetHead
                                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                        : 'bg-amber-100 text-amber-900 border-amber-300'
                                    }`}>
                                      {Math.round((item.periodA.sph / avgTargetHead) * 100)}%
                                    </span>
                                  ) : null
                                ) : (
                                  <span className="text-[10px] font-black text-amber-950 bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-300 whitespace-nowrap">
                                    {calcGrowth(item.periodA.sph, item.periodC ? item.periodC.sph : item.periodB.sph)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex-1 w-full flex items-end pt-6">
                          <div className="relative w-full h-full flex items-end justify-between gap-1.5 sm:gap-2 z-10">
                            {/* Target dashed line indicator (shares exact 0%-100% coordinate box with bars) */}
                            <div
                              style={{ bottom: `${targetPct}%` }}
                              className="absolute inset-x-0 border-t-2 border-dashed border-emerald-600 z-20 pointer-events-none flex justify-end"
                            >
                              <span className="text-[10px] font-black text-emerald-950 bg-emerald-100/95 px-2 py-0.5 rounded-md -mt-3 mr-1 border border-emerald-400 shadow-2xs">
                                Target: Rp {avgTargetHead.toLocaleString('id-ID')}
                              </span>
                            </div>

                            {sphChartItems.map((item, idx) => (
                              <React.Fragment key={idx}>
                                {renderComparativeBars(
                                  item.periodA.sph,
                                  item.periodB.sph,
                                  item.periodC?.sph,
                                  maxSPH,
                                  (v) => `${(v / 1000).toFixed(1)}k`,
                                  'bg-slate-300 border-t border-x border-slate-400',
                                  periodCData
                                    ? 'bg-gradient-to-t from-blue-700 via-blue-500 to-blue-400 border-t border-x border-blue-500'
                                    : (item.periodB.sph >= avgTargetHead
                                        ? 'bg-gradient-to-t from-emerald-700 via-emerald-600 to-emerald-400 border-t border-x border-emerald-500'
                                        : 'bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400 border-t border-x border-amber-500'),
                                  'bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400 border-t border-x border-amber-500',
                                  avgTargetHead
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between gap-1.5 px-4 text-xs text-slate-900 font-black">
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

              {showInsightBox && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start space-x-3">
                  <Lightbulb className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold uppercase tracking-wide">Insight SPH:</span>{' '}
                    {isSinglePeriod
                      ? `Grafik SPH pada ${periodAData.label} menunjukkan performa pengeluaran F&B per pengunjung bioskop. Periode yang konsisten melampaui garis target Rp ${avgTargetHead.toLocaleString('id-ID')} didorong oleh transaksi combo promo snack dan upselling di kasir Cafe XXI.`
                      : `Grafik komparatif menegaskan tren SPH antara ${periodAData.label} dan ${periodBData.label}. Outlet yang konsisten berada di atas garis target Rp ${avgTargetHead.toLocaleString('id-ID')} terbukti aktif menawarkan upselling paket combo promo snack dan minuman.`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SLIDE 3: Analisis GBO (%) Kontribusi FnB vs Cinema */}
          {/* ========================================================================= */}
          {currentSlide === 3 && (
            <div className="space-y-4">
              {showSummaryStrip && (
                isSinglePeriod ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-300 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-950 block">Rasio % GBO</span>
                      <p className="text-xl font-black text-purple-800 tracking-tight">
                        {periodAData.gbo}%
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Benchmark Industri</span>
                      <p className="text-xl font-black text-slate-800 tracking-tight">
                        40% – 60%
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950 block">Status Rasio</span>
                      <div className="pt-1">
                        <span className={`text-[11px] font-black px-2.5 py-1 rounded-md ${periodAData.gbo >= 40 ? 'bg-emerald-200 text-emerald-950' : 'bg-amber-200 text-amber-950'}`}>
                          {periodAData.gbo >= 40 ? 'Rasio Sangat Sehat' : 'Peluang Optimasi'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 block">Total Omset F&B</span>
                      <p className="text-xl font-black text-amber-900 tracking-tight">
                        Rp {(periodAData.fnb / 1000000).toFixed(1)} Jt
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={`grid gap-3 ${periodCData ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">{periodAData.label}</span>
                      <p className="text-xl font-black text-slate-800 tracking-tight">
                        {periodAData.gbo}%
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#eff6ff] border border-blue-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block">{periodBData.label}</span>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-black text-blue-800 tracking-tight">
                          {periodBData.gbo}%
                        </p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isGrowthPositive(periodAData.gbo, periodBData.gbo) ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}>
                          {calcGrowth(periodAData.gbo, periodBData.gbo)}
                        </span>
                      </div>
                    </div>

                    {periodCData && (
                      <div className="p-3.5 rounded-2xl bg-[#faf7ff] border border-purple-300/80 shadow-2xs space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-950 block">{periodCData.label} (Fokus)</span>
                        <div className="flex items-center justify-between">
                          <p className="text-xl font-black text-purple-800 tracking-tight">
                            {periodCData.gbo}%
                          </p>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isGrowthPositive(periodBData.gbo, periodCData.gbo) ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                          }`}>
                            {calcGrowth(periodBData.gbo, periodCData.gbo)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-950 block">Benchmark Industri</span>
                      <p className="text-xl font-black text-purple-900 tracking-tight">40% – 60%</p>
                    </div>
                  </div>
                )
              )}

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs font-black text-slate-900 uppercase flex items-center space-x-2 tracking-wide">
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                    <span>{isSinglePeriod ? `Grafik Batang Rasio GBO (%): ${comparisonTitle}` : `Grafik Batang Komparasi Rasio GBO (%): ${comparisonTitle}`}</span>
                  </span>
                  <div className="flex items-center space-x-4 text-xs font-bold">
                    {isSinglePeriod ? (
                      <span className="flex items-center space-x-1.5">
                        <span className="w-3.5 h-3.5 rounded-xs bg-gradient-to-t from-purple-700 to-purple-400 inline-block border border-purple-600"></span>
                        <span className="text-purple-950">{periodAData.label}</span>
                      </span>
                    ) : (
                      <>
                        <span className="flex items-center space-x-1.5">
                          <span className="w-3.5 h-3.5 rounded-xs bg-slate-300 inline-block border border-slate-400"></span>
                          <span className="text-slate-700">{periodAData.label}</span>
                        </span>
                        <span className="flex items-center space-x-1.5">
                          <span className={`w-3.5 h-3.5 rounded-xs inline-block border ${
                            periodCData
                              ? 'bg-gradient-to-t from-blue-700 to-blue-400 border-blue-600'
                              : 'bg-gradient-to-t from-purple-700 to-purple-400 border-purple-600'
                          }`}></span>
                          <span className={periodCData ? 'text-blue-950' : 'text-purple-950'}>{periodBData.label}</span>
                        </span>
                        {periodCData && (
                          <span className="flex items-center space-x-1.5">
                            <span className="w-3.5 h-3.5 rounded-xs bg-gradient-to-t from-purple-700 to-purple-400 inline-block border border-purple-600"></span>
                            <span className="text-purple-950">{periodCData.label}</span>
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {(() => {
                  const gboChartItems = comparisonMode === 'bulanan' ? weeklyComparisonData : comparativeTrendData;
                  const rawMax = Math.max(
                    ...gboChartItems.map((x) => Math.max(x.periodA.gbo, x.periodB.gbo, x.periodC?.gbo || 0)),
                    40
                  );
                  const maxGBO = Math.ceil(rawMax * 1.15);

                  return (
                    <div className="space-y-2.5">
                      <div className="relative h-[380px] border border-slate-200 bg-slate-50/50 p-4 rounded-2xl flex flex-col justify-between">
                        {showChartGrowthPills && !isSinglePeriod && (
                          <div className="w-full flex items-center justify-between gap-1 z-10 pb-2">
                            {gboChartItems.map((item, idx) => (
                              <div key={idx} className="flex-1 flex justify-center">
                                <span className="text-[10px] font-black text-purple-950 bg-purple-100 px-1.5 py-0.5 rounded-md border border-purple-300 whitespace-nowrap">
                                  {calcGrowth(item.periodA.gbo, item.periodC ? item.periodC.gbo : item.periodB.gbo)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="relative flex-1 w-full flex items-end pt-6">
                          <div className="w-full h-full flex items-end justify-between gap-1.5 sm:gap-2 z-10">
                            {gboChartItems.map((item, idx) => (
                              <React.Fragment key={idx}>
                                {renderComparativeBars(
                                  item.periodA.gbo,
                                  item.periodB.gbo,
                                  item.periodC?.gbo,
                                  maxGBO,
                                  (v) => `${v}%`,
                                  'bg-slate-300 border-t border-x border-slate-400',
                                  periodCData
                                    ? 'bg-gradient-to-t from-blue-700 via-blue-500 to-blue-400 border-t border-x border-blue-500'
                                    : 'bg-gradient-to-t from-purple-800 via-purple-600 to-purple-400 border-t border-x border-purple-500',
                                  'bg-gradient-to-t from-purple-800 via-purple-600 to-purple-400 border-t border-x border-purple-500'
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between gap-1.5 px-4 text-xs text-slate-900 font-black">
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

              {showInsightBox && (
                <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-950 flex items-start space-x-3">
                  <Lightbulb className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold uppercase tracking-wide">Insight GBO:</span>{' '}
                    {isSinglePeriod
                      ? `Rasio % GBO pada ${periodAData.label} tercatat sebesar ${periodAData.gbo}%. Rasio yang berada di atas 40% membuktikan kontribusi signifikan penjualan makanan & minuman Cafe XXI terhadap penjualan tiket bioskop.`
                      : `Kenaikan % GBO menandakan porsi kontribusi F&B semakin besar terhadap tiket cinema. Rasio yang stabil di atas 40% menegaskan daya tarik ragam menu F&B bioskop XXI.`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SLIDE 4: Analisis Daya Serap (%) Penetrasi Pembeli Struk Kasir */}
          {/* ========================================================================= */}
          {currentSlide === 4 && (
            <div className="space-y-4">
              {showSummaryStrip && (
                isSinglePeriod ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-300 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950 block">Daya Serap Kasir</span>
                      <p className="text-xl font-black text-emerald-800 tracking-tight">
                        {periodAData.dayaSerap}%
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Benchmark Industri</span>
                      <p className="text-xl font-black text-slate-800 tracking-tight">
                        25% – 40%
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-950 block">Total Transaksi Kasir</span>
                      <p className="text-xl font-black text-blue-900 tracking-tight">
                        {periodAData.bill.toLocaleString('id-ID')} Bill
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 block">Total Penonton Bioskop</span>
                      <p className="text-xl font-black text-amber-900 tracking-tight">
                        {periodAData.penonton.toLocaleString('id-ID')} Pax
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={`grid gap-3 ${periodCData ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">{periodAData.label}</span>
                      <p className="text-xl font-black text-slate-800 tracking-tight">
                        {periodAData.dayaSerap}%
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#eff6ff] border border-blue-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block">{periodBData.label}</span>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-black text-blue-800 tracking-tight">
                          {periodBData.dayaSerap}%
                        </p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isGrowthPositive(periodAData.dayaSerap, periodBData.dayaSerap) ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}>
                          {calcGrowth(periodAData.dayaSerap, periodBData.dayaSerap)}
                        </span>
                      </div>
                    </div>

                    {periodCData && (
                      <div className="p-3.5 rounded-2xl bg-[#f5fbf7] border border-emerald-300/80 shadow-2xs space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950 block">{periodCData.label} (Fokus)</span>
                        <div className="flex items-center justify-between">
                          <p className="text-xl font-black text-emerald-800 tracking-tight">
                            {periodCData.dayaSerap}%
                          </p>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isGrowthPositive(periodBData.dayaSerap, periodCData.dayaSerap) ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                          }`}>
                            {calcGrowth(periodBData.dayaSerap, periodCData.dayaSerap)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950 block">Total Struk vs Penonton</span>
                      <p className="text-base font-black text-emerald-900 tracking-tight">
                        {(periodCData || periodBData).bill.toLocaleString('id-ID')} Bill / {(periodCData || periodBData).penonton.toLocaleString('id-ID')} Pax
                      </p>
                    </div>
                  </div>
                )
              )}

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs font-black text-slate-900 uppercase flex items-center space-x-2 tracking-wide">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    <span>{isSinglePeriod ? `Grafik Batang Daya Serap (%): ${comparisonTitle}` : `Grafik Batang Komparasi Daya Serap (%): ${comparisonTitle}`}</span>
                  </span>
                  <div className="flex items-center space-x-4 text-xs font-bold">
                    {isSinglePeriod ? (
                      <span className="flex items-center space-x-1.5">
                        <span className="w-3.5 h-3.5 rounded-xs bg-gradient-to-t from-emerald-700 to-emerald-400 inline-block border border-emerald-600"></span>
                        <span className="text-emerald-950">{periodAData.label}</span>
                      </span>
                    ) : (
                      <>
                        <span className="flex items-center space-x-1.5">
                          <span className="w-3.5 h-3.5 rounded-xs bg-slate-300 inline-block border border-slate-400"></span>
                          <span className="text-slate-700">{periodAData.label}</span>
                        </span>
                        <span className="flex items-center space-x-1.5">
                          <span className={`w-3.5 h-3.5 rounded-xs inline-block border ${
                            periodCData
                              ? 'bg-gradient-to-t from-blue-700 to-blue-400 border-blue-600'
                              : 'bg-gradient-to-t from-emerald-700 to-emerald-400 border-emerald-600'
                          }`}></span>
                          <span className={periodCData ? 'text-blue-950' : 'text-emerald-950'}>{periodBData.label}</span>
                        </span>
                        {periodCData && (
                          <span className="flex items-center space-x-1.5">
                            <span className="w-3.5 h-3.5 rounded-xs bg-gradient-to-t from-emerald-700 to-emerald-400 inline-block border border-emerald-600"></span>
                            <span className="text-emerald-950">{periodCData.label}</span>
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {(() => {
                  const dsChartItems = comparisonMode === 'bulanan' ? weeklyComparisonData : comparativeTrendData;
                  const rawMax = Math.max(
                    ...dsChartItems.map((x) => Math.max(x.periodA.dayaSerap, x.periodB.dayaSerap, x.periodC?.dayaSerap || 0)),
                    25
                  );
                  const maxDS = Math.ceil(rawMax * 1.15);

                  return (
                    <div className="space-y-2.5">
                      <div className="relative h-[380px] border border-slate-200 bg-slate-50/50 p-4 rounded-2xl flex flex-col justify-between">
                        {showChartGrowthPills && !isSinglePeriod && (
                          <div className="w-full flex items-center justify-between gap-1 z-10 pb-2">
                            {dsChartItems.map((item, idx) => (
                              <div key={idx} className="flex-1 flex justify-center">
                                <span className="text-[10px] font-black text-emerald-950 bg-emerald-100 px-1.5 py-0.5 rounded-md border border-emerald-300 whitespace-nowrap">
                                  {calcGrowth(item.periodA.dayaSerap, item.periodC ? item.periodC.dayaSerap : item.periodB.dayaSerap)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="relative flex-1 w-full flex items-end pt-6">
                          <div className="w-full h-full flex items-end justify-between gap-1.5 sm:gap-2 z-10">
                            {dsChartItems.map((item, idx) => (
                              <React.Fragment key={idx}>
                                {renderComparativeBars(
                                  item.periodA.dayaSerap,
                                  item.periodB.dayaSerap,
                                  item.periodC?.dayaSerap,
                                  maxDS,
                                  (v) => `${v}%`,
                                  'bg-slate-300 border-t border-x border-slate-400',
                                  periodCData
                                    ? 'bg-gradient-to-t from-blue-700 via-blue-500 to-blue-400 border-t border-x border-blue-500'
                                    : 'bg-gradient-to-t from-emerald-800 via-emerald-600 to-emerald-400 border-t border-x border-emerald-500',
                                  'bg-gradient-to-t from-emerald-800 via-emerald-600 to-emerald-400 border-t border-x border-emerald-500'
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between gap-1.5 px-4 text-xs text-slate-900 font-black">
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

              {showInsightBox && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start space-x-3">
                  <Lightbulb className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold uppercase tracking-wide">Insight Daya Serap:</span>{' '}
                    {isSinglePeriod
                      ? `Tingkat Daya Serap pada ${periodAData.label} adalah ${periodAData.dayaSerap}%. Menunjukkan persentase penonton bioskop yang singgah dan berbelanja di kasir Cafe XXI.`
                      : `Peningkatan indikator Daya Serap merefleksikan keberhasilan mendorong penonton bioskop singgah dan bertransaksi di kasir Cafe XXI, terutama sebelum jam tayang show film dimulai.`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SLIDE 5: Analisis Average Transaksi (AT / Basket Size) */}
          {/* ========================================================================= */}
          {currentSlide === 5 && (
            <div className="space-y-4">
              {showSummaryStrip && (
                isSinglePeriod ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-cyan-50/80 border border-cyan-300 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-cyan-950 block">Average Transaksi (AT)</span>
                      <p className="text-xl font-black text-cyan-800 tracking-tight">
                        Rp {periodAData.at.toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-950 block">Total Struk Transaksi</span>
                      <p className="text-xl font-black text-blue-900 tracking-tight">
                        {periodAData.bill.toLocaleString('id-ID')} Bill
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 block">Total Omset F&B</span>
                      <p className="text-xl font-black text-amber-900 tracking-tight">
                        Rp {(periodAData.fnb / 1000000).toFixed(1)} Jt
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950 block">Basket Size</span>
                      <div className="pt-1">
                        <span className="text-[11px] font-black px-2.5 py-1 rounded-md bg-emerald-200 text-emerald-950">
                          Rata-rata per Transaksi
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`grid gap-3 ${periodCData ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">{periodAData.label}</span>
                      <p className="text-xl font-black text-slate-800 tracking-tight">
                        Rp {periodAData.at.toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#eff6ff] border border-blue-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block">{periodBData.label}</span>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-black text-blue-800 tracking-tight">
                          Rp {periodBData.at.toLocaleString('id-ID')}
                        </p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isGrowthPositive(periodAData.at, periodBData.at) ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}>
                          {calcGrowth(periodAData.at, periodBData.at)}
                        </span>
                      </div>
                    </div>

                    {periodCData && (
                      <div className="p-3.5 rounded-2xl bg-[#f4fafc] border border-cyan-300/80 shadow-2xs space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-950 block">{periodCData.label} (Fokus)</span>
                        <div className="flex items-center justify-between">
                          <p className="text-xl font-black text-cyan-800 tracking-tight">
                            Rp {periodCData.at.toLocaleString('id-ID')}
                          </p>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isGrowthPositive(periodBData.at, periodCData.at) ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                          }`}>
                            {calcGrowth(periodBData.at, periodCData.at)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-3.5 rounded-2xl bg-cyan-50/80 border border-cyan-200/90 shadow-2xs space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-cyan-950 block">Selisih Rupiah per Struk</span>
                      <p className="text-xl font-black text-cyan-900 tracking-tight">
                        {(periodCData || periodBData).at >= (periodCData ? periodBData : periodAData).at ? '+' : ''}Rp {((periodCData || periodBData).at - (periodCData ? periodBData : periodAData).at).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                )
              )}

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <span className="text-xs font-black text-slate-900 uppercase flex items-center space-x-2 tracking-wide">
                    <BarChart3 className="w-4 h-4 text-cyan-600" />
                    <span>{isSinglePeriod ? `Grafik Batang Nilai AT (Rp / Struk): ${comparisonTitle}` : `Grafik Batang Komparasi Nilai AT (Rp / Struk): ${comparisonTitle}`}</span>
                  </span>
                  <div className="flex items-center space-x-4 text-xs font-bold">
                    {isSinglePeriod ? (
                      <span className="flex items-center space-x-1.5">
                        <span className="w-3.5 h-3.5 rounded-xs bg-gradient-to-t from-cyan-700 to-cyan-400 inline-block border border-cyan-600"></span>
                        <span className="text-cyan-950">{periodAData.label}</span>
                      </span>
                    ) : (
                      <>
                        <span className="flex items-center space-x-1.5">
                          <span className="w-3.5 h-3.5 rounded-xs bg-slate-300 inline-block border border-slate-400"></span>
                          <span className="text-slate-700">{periodAData.label}</span>
                        </span>
                        <span className="flex items-center space-x-1.5">
                          <span className={`w-3.5 h-3.5 rounded-xs inline-block border ${
                            periodCData
                              ? 'bg-gradient-to-t from-blue-700 to-blue-400 border-blue-600'
                              : 'bg-gradient-to-t from-cyan-700 to-cyan-400 border-cyan-600'
                          }`}></span>
                          <span className={periodCData ? 'text-blue-950' : 'text-cyan-950'}>{periodBData.label}</span>
                        </span>
                        {periodCData && (
                          <span className="flex items-center space-x-1.5">
                            <span className="w-3.5 h-3.5 rounded-xs bg-gradient-to-t from-cyan-700 to-cyan-400 inline-block border border-cyan-600"></span>
                            <span className="text-cyan-950">{periodCData.label}</span>
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {(() => {
                  const atChartItems = comparisonMode === 'bulanan' ? weeklyComparisonData : comparativeTrendData;
                  const rawMax = Math.max(
                    ...atChartItems.map((x) => Math.max(x.periodA.at, x.periodB.at, x.periodC?.at || 0)),
                    50000
                  );
                  const maxAT = Math.ceil((rawMax * 1.15) / 1000) * 1000;

                  return (
                    <div className="space-y-2.5">
                      <div className="relative h-[380px] border border-slate-200 bg-slate-50/50 p-4 rounded-2xl flex flex-col justify-between">
                        {showChartGrowthPills && !isSinglePeriod && (
                          <div className="w-full flex items-center justify-between gap-1 z-10 pb-2">
                            {atChartItems.map((item, idx) => (
                              <div key={idx} className="flex-1 flex justify-center">
                                <span className="text-[10px] font-black text-cyan-950 bg-cyan-100 px-1.5 py-0.5 rounded-md border border-cyan-300 whitespace-nowrap">
                                  {calcGrowth(item.periodA.at, item.periodC ? item.periodC.at : item.periodB.at)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="relative flex-1 w-full flex items-end pt-6">
                          <div className="w-full h-full flex items-end justify-between gap-1.5 sm:gap-2 z-10">
                            {atChartItems.map((item, idx) => (
                              <React.Fragment key={idx}>
                                {renderComparativeBars(
                                  item.periodA.at,
                                  item.periodB.at,
                                  item.periodC?.at,
                                  maxAT,
                                  (v) => `${(v / 1000).toFixed(0)}k`,
                                  'bg-slate-300 border-t border-x border-slate-400',
                                  periodCData
                                    ? 'bg-gradient-to-t from-blue-700 via-blue-500 to-blue-400 border-t border-x border-blue-500'
                                    : 'bg-gradient-to-t from-cyan-800 via-cyan-600 to-cyan-400 border-t border-x border-cyan-500',
                                  'bg-gradient-to-t from-cyan-800 via-cyan-600 to-cyan-400 border-t border-x border-cyan-500'
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between gap-1.5 px-4 text-xs text-slate-900 font-black">
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

              {showInsightBox && (
                <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-950 flex items-start space-x-3">
                  <Lightbulb className="w-5 h-5 text-cyan-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold uppercase tracking-wide">Insight AT:</span>{' '}
                    {isSinglePeriod
                      ? `Rata-rata nilai belanja per struk kasir Cafe XXI pada ${periodAData.label} mencapai Rp ${periodAData.at.toLocaleString('id-ID')}. Nilai basket size ini didorong oleh minat penonton terhadap paket bundling promo snack dan minuman.`
                      : `Kenaikan nilai transaksi per struk (Basket Size) membuktikan keberhasilan program paket bundling promo combo snack XXI, minuman berukuran jumbo, serta penawaran merchandise edisi film terbatas.`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* ========================================================================= */}
          {/* SLIDE 6: Volume Penonton & Perbandingan Omset Finansial */}
          {/* ========================================================================= */}
          {/* ========================================================================= */}
          {/* SLIDE 6: Volume Penonton & Perbandingan Omset Finansial */}
          {/* ========================================================================= */}
          {currentSlide === 6 && (
            <div className="space-y-5">
              {isSinglePeriod ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Penonton */}
                  <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2 shadow-2xs">
                    <span className="text-xs uppercase font-extrabold text-blue-900">Total Penonton (Pax)</span>
                    <p className="text-2xl font-black text-blue-950">{periodAData.penonton.toLocaleString('id-ID')} Pax</p>
                    <p className="text-xs text-blue-700/80 font-medium">Periode: {periodAData.label}</p>
                    <span className="text-xs font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full inline-block">
                      Volume Basis Cinema
                    </span>
                  </div>

                  {/* Card 2: Bill */}
                  <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2 shadow-2xs">
                    <span className="text-xs uppercase font-extrabold text-emerald-900">Total Struk Kasir (Bill)</span>
                    <p className="text-2xl font-black text-emerald-950">{periodAData.bill.toLocaleString('id-ID')} Bill</p>
                    <p className="text-xs text-emerald-700/80 font-medium">Transaksi Kasir Cafe XXI</p>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                      Daya Serap: {periodAData.dayaSerap}%
                    </span>
                  </div>

                  {/* Card 3: Omset F&B */}
                  <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-2 shadow-2xs">
                    <span className="text-xs uppercase font-extrabold text-amber-950">Omset F&B (Cafe XXI)</span>
                    <p className="text-2xl font-black text-amber-800">Rp {(periodAData.fnb / 1000000).toFixed(1)} Jt</p>
                    <p className="text-xs text-amber-700/80 font-medium">Realisasi F&B: Rp {periodAData.fnb.toLocaleString('id-ID')}</p>
                    <span className="text-xs font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full inline-block">
                      % GBO: {periodAData.gbo}%
                    </span>
                  </div>

                  {/* Card 4: Omset Tiket */}
                  <div className="p-5 rounded-2xl bg-purple-50/80 border border-purple-300 space-y-2 shadow-2xs">
                    <span className="text-xs uppercase font-extrabold text-purple-950">Omset Tiket Cinema</span>
                    <p className="text-2xl font-black text-purple-800">Rp {(periodAData.cinema / 1000000).toFixed(1)} Jt</p>
                    <p className="text-xs text-purple-700/80 font-medium">Realisasi Tiket: Rp {periodAData.cinema.toLocaleString('id-ID')}</p>
                    <span className="text-xs font-black text-purple-900 bg-purple-100 px-2 py-0.5 rounded-full inline-block">
                      Cinema XXI
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-[#faf8f4] border border-slate-300 space-y-2 shadow-2xs">
                    <span className="text-xs uppercase font-extrabold text-slate-500">Penonton Cinema</span>
                    <p className="text-2xl font-black text-slate-900">{(periodCData || periodBData).penonton.toLocaleString('id-ID')} Pax</p>
                    <div className="text-xs text-slate-600 font-medium space-y-0.5">
                      {periodCData ? (
                        <>
                          <p className="text-slate-800 font-bold">{periodCData.label}: {periodCData.penonton.toLocaleString('id-ID')} Pax</p>
                          <p className="text-slate-500">{periodBData.label}: {periodBData.penonton.toLocaleString('id-ID')} Pax</p>
                          <p className="text-slate-400">{periodAData.label}: {periodAData.penonton.toLocaleString('id-ID')} Pax</p>
                        </>
                      ) : (
                        <p>Vs {periodAData.label}: {periodAData.penonton.toLocaleString('id-ID')} Pax</p>
                      )}
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                      {calcGrowth(periodCData ? periodBData.penonton : periodAData.penonton, (periodCData || periodBData).penonton)} {periodCData ? '(YoY)' : ''}
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#faf8f4] border border-slate-300 space-y-2 shadow-2xs">
                    <span className="text-xs uppercase font-extrabold text-slate-500">Total Struk Kasir (Bill)</span>
                    <p className="text-2xl font-black text-slate-900">{(periodCData || periodBData).bill.toLocaleString('id-ID')} Bill</p>
                    <div className="text-xs text-slate-600 font-medium space-y-0.5">
                      {periodCData ? (
                        <>
                          <p className="text-slate-800 font-bold">{periodCData.label}: {periodCData.bill.toLocaleString('id-ID')} Bill</p>
                          <p className="text-slate-500">{periodBData.label}: {periodBData.bill.toLocaleString('id-ID')} Bill</p>
                          <p className="text-slate-400">{periodAData.label}: {periodAData.bill.toLocaleString('id-ID')} Pax</p>
                        </>
                      ) : (
                        <p>Vs {periodAData.label}: {periodAData.bill.toLocaleString('id-ID')} Bill</p>
                      )}
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                      {calcGrowth(periodCData ? periodBData.bill : periodAData.bill, (periodCData || periodBData).bill)} {periodCData ? '(YoY)' : ''}
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-300 space-y-2 shadow-2xs">
                    <span className="text-xs uppercase font-extrabold text-amber-950">Omset F&B (Cafe XXI)</span>
                    <p className="text-2xl font-black text-amber-800">Rp {(((periodCData || periodBData).fnb) / 1000000).toFixed(1)} Jt</p>
                    <div className="text-xs text-slate-600 font-medium space-y-0.5">
                      {periodCData ? (
                        <>
                          <p className="text-amber-950 font-bold">{periodCData.label}: Rp {(periodCData.fnb / 1000000).toFixed(1)} Jt</p>
                          <p className="text-slate-500">{periodBData.label}: Rp {(periodBData.fnb / 1000000).toFixed(1)} Jt</p>
                          <p className="text-slate-400">{periodAData.label}: Rp {(periodAData.fnb / 1000000).toFixed(1)} Jt</p>
                        </>
                      ) : (
                        <p>Vs {periodAData.label}: Rp {(periodAData.fnb / 1000000).toFixed(1)} Jt</p>
                      )}
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                      {calcGrowth(periodCData ? periodBData.fnb : periodAData.fnb, (periodCData || periodBData).fnb)} {periodCData ? '(YoY)' : ''}
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-300 space-y-2 shadow-2xs">
                    <span className="text-xs uppercase font-extrabold text-purple-950">Omset Tiket Cinema</span>
                    <p className="text-2xl font-black text-purple-800">Rp {(((periodCData || periodBData).cinema) / 1000000).toFixed(1)} Jt</p>
                    <div className="text-xs text-slate-600 font-medium space-y-0.5">
                      {periodCData ? (
                        <>
                          <p className="text-purple-950 font-bold">{periodCData.label}: Rp {(periodCData.cinema / 1000000).toFixed(1)} Jt</p>
                          <p className="text-slate-500">{periodBData.label}: Rp {(periodBData.cinema / 1000000).toFixed(1)} Jt</p>
                          <p className="text-slate-400">{periodAData.label}: Rp {(periodAData.cinema / 1000000).toFixed(1)} Jt</p>
                        </>
                      ) : (
                        <p>Vs {periodAData.label}: Rp {(periodAData.cinema / 1000000).toFixed(1)} Jt</p>
                      )}
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                      {calcGrowth(periodCData ? periodBData.cinema : periodAData.cinema, (periodCData || periodBData).cinema)} {periodCData ? '(YoY)' : ''}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <span className="text-xs font-black uppercase tracking-wide text-slate-900 block">
                  Proporsi Total Pendapatan Finansial ({isSinglePeriod ? periodAData.label : (periodCData || periodBData).label}): F&B Cafe vs Ticket Box Office
                </span>
                {(() => {
                  const focal = isSinglePeriod ? periodAData : (periodCData || periodBData);
                  const totalRev = focal.fnb + focal.cinema || 1;
                  const fnbPct = (focal.fnb / totalRev) * 100;
                  const cinemaPct = (focal.cinema / totalRev) * 100;

                  return (
                    <div className="space-y-3">
                      <div className="h-8 w-full bg-slate-100 rounded-2xl overflow-hidden flex shadow-inner border border-slate-200">
                        <div
                          style={{ width: `${fnbPct}%` }}
                          className="bg-amber-500 h-full flex items-center justify-center text-xs font-black text-slate-950 truncate px-3"
                        >
                          F&B: {fnbPct.toFixed(1)}%
                        </div>
                        <div
                          style={{ width: `${cinemaPct}%` }}
                          className="bg-purple-600 h-full flex items-center justify-center text-xs font-black text-white truncate px-3"
                        >
                          Cinema: {cinemaPct.toFixed(1)}%
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-slate-700 font-extrabold pt-1">
                        <span>Pendapatan F&B: Rp {focal.fnb.toLocaleString('id-ID')}</span>
                        <span>Pendapatan Ticket Cinema: Rp {focal.cinema.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SLIDE 7: Peringkat Performa Outlet & Pencapaian Target */}
          {/* ========================================================================= */}
          {currentSlide === 7 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="flex items-center space-x-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>Total {outletRankingList.length} Outlet</span>
                  </div>
                  <span className="text-slate-300">|</span>
                  {areas.map((areaItem) => {
                    const isSelectedArea = selectedAreaId === areaItem.id;
                    return (
                      <span
                        key={areaItem.id}
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold border ${
                          isSelectedArea
                            ? 'bg-amber-100 border-amber-400 text-amber-950'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        {areaItem.name}: Target Rp {areaItem.targetArea.toLocaleString('id-ID')}
                      </span>
                    );
                  })}
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
                  <thead className="uppercase text-[10px] font-black border-b border-slate-200 bg-slate-900 text-white sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-3 text-center">Rank</th>
                      <th className="py-3 px-3">Nama Outlet</th>
                      <th className="py-3 px-3">Wilayah Area</th>
                      <th className="py-3 px-3 text-right">Penonton</th>
                      <th className="py-3 px-3 text-right">Target SPH</th>
                      <th className="py-3 px-3 text-right text-amber-300">SPH Realisasi</th>
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
            <div className="space-y-5">
                {(() => {
                  const focal = periodCData || periodBData;
                  const baseline = periodCData ? periodBData : periodAData;

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Evaluasi 1: SPH */}
                      <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                          <span className="text-xs font-black uppercase text-amber-950 flex items-center space-x-1.5">
                            <Target className="w-4 h-4 text-amber-700" />
                            <span>1. Evaluasi Head (SPH) {focal.label}: {focal.sph >= avgTargetHead ? 'Optimal' : 'Perlu Intervensi'}</span>
                          </span>
                          <span className="text-xs font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                            Ach: {focal.achievement}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed font-medium">
                          {isSinglePeriod ? (
                            <>Rata-rata pengeluaran penonton berada di angka <span className="font-extrabold text-amber-900">Rp {focal.sph.toLocaleString('id-ID')}</span> dengan pencapaian <span className="font-extrabold text-emerald-800">{focal.achievement}%</span> dari target SPH (Rp {avgTargetHead.toLocaleString('id-ID')}).</>
                          ) : (
                            <>Rata-rata pengeluaran penonton berada di angka <span className="font-extrabold text-amber-900">Rp {focal.sph.toLocaleString('id-ID')}</span> (pertumbuhan {calcGrowth(baseline.sph, focal.sph)} vs {baseline.label}).</>
                          )}
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
                            <span>2. Evaluasi % GBO {focal.label}: {focal.gbo >= 40 ? 'Sangat Kuat' : 'Standar'}</span>
                          </span>
                          <span className="text-xs font-black text-purple-900 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-300">
                            {focal.gbo}% Kontribusi
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed font-medium">
                          {isSinglePeriod ? (
                            <>Kontribusi omset F&B terhadap box office cinema mencapai <span className="font-extrabold text-purple-900">{focal.gbo}%</span> (Total Omset Cafe Rp {(focal.fnb / 1000000).toFixed(1)} Jt dari Box Office Rp {(focal.cinema / 1000000).toFixed(1)} Jt). Rasio ini membuktikan keterikatan pengunjung terhadap sajian bioskop XXI.</>
                          ) : (
                            <>Kontribusi omset F&B terhadap box office cinema mencapai <span className="font-extrabold text-purple-900">{focal.gbo}%</span> (pertumbuhan {calcGrowth(baseline.gbo, focal.gbo)} vs {baseline.label}). Rasio ini membuktikan keterikatan pengunjung terhadap sajian bioskop XXI.</>
                          )}
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
                            <span>3. Evaluasi Daya Serap {focal.label}: {focal.dayaSerap >= 25 ? 'Tinggi' : 'Perlu Didorong'}</span>
                          </span>
                          <span className="text-xs font-black text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                            {focal.dayaSerap}% Pembeli
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed font-medium">
                          {isSinglePeriod ? (
                            <>Sebanyak <span className="font-extrabold text-emerald-900">{focal.dayaSerap}%</span> dari total penonton bertransaksi di Cafe XXI ({focal.bill.toLocaleString('id-ID')} struk kasir dari {focal.penonton.toLocaleString('id-ID')} pax penonton aktif).</>
                          ) : (
                            <>Sebanyak <span className="font-extrabold text-emerald-900">{focal.dayaSerap}%</span> dari total penonton bertransaksi di Cafe XXI ({focal.bill.toLocaleString('id-ID')} struk kasir, {calcGrowth(baseline.dayaSerap, focal.dayaSerap)} vs {baseline.label}).</>
                          )}
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
                            <span>4. Evaluasi Average Transaksi (AT) {focal.label}</span>
                          </span>
                          <span className="text-xs font-black text-cyan-900 bg-cyan-100 px-2 py-0.5 rounded-md border border-cyan-300">
                            Rp {focal.at.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed font-medium">
                          {isSinglePeriod ? (
                            <>Basket size per transaksi berada pada level <span className="font-extrabold text-cyan-900">Rp {focal.at.toLocaleString('id-ID')}</span> per struk dengan omset F&B mencapai <span className="font-extrabold text-slate-900">Rp {(focal.fnb / 1000000).toFixed(1)} Jt</span>.</>
                          ) : (
                            <>Basket size per transaksi berada pada level <span className="font-extrabold text-cyan-900">Rp {focal.at.toLocaleString('id-ID')}</span> (pertumbuhan {calcGrowth(baseline.at, focal.at)} vs {baseline.label}).</>
                          )}
                        </p>
                        <div className="p-3 rounded-xl bg-white border border-cyan-200 text-xs text-slate-700 space-y-1">
                          <span className="font-extrabold text-cyan-950 uppercase tracking-wide text-[10px] block">Rekomendasi Aksi Bundling:</span>
                          <p className="leading-snug">Dorong penjualan paket combo keluarga atau bundle snack sharing untuk menaikkan nominal transaksi per struk.</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {/* Executive Conclusion Banner */}
              <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4 shadow-md">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-amber-400" />
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
        <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
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

  return isFullscreen ? createPortal(deckContent, document.body) : deckContent;
};
