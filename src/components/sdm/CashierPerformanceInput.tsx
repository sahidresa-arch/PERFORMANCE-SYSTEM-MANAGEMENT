import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  User,
  Employee,
  CashierDailyPerformanceRecord,
  CashierMonthlyProductRecord,
  CashierProductItem,
} from '../../types';
import { StorageService } from '../../lib/storage';
import { ScanModal } from '../ocr/ScanModal';
import {
  OcrService,
  ExtractedSalesData,
  ExtractedCashierItemEntry,
} from '../../lib/ocrService';
import {
  BEVERAGE_CATEGORIES,
  resolveProductItemCategory,
} from './CashierBeverageCategoryView';
import {
  CalendarDays,
  Clock,
  Save,
  ScanLine,
  Check,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  FileSpreadsheet,
  Plus,
  Trash2,
  Search,
  Sparkles,
  Upload,
  X,
  Download,
  Award,
  TrendingUp,
  ShoppingBag,
  Users,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface CashierPerformanceInputProps {
  currentUser: User | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onNavigateToLeaderboard?: () => void;
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

const DAY_NAMES = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];

export const CashierPerformanceInput: React.FC<CashierPerformanceInputProps> = ({
  currentUser,
  selectedDate,
  onDateChange,
  onNavigateToLeaderboard,
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

  // Daftar SDM Kasir dari Data Karyawan tiap outlet
  const [cashierList, setCashierList] = useState<Employee[]>(() =>
    StorageService.getOutletCashiers(defaultOutletId)
  );
  const [showAllOutletEmployees, setShowAllOutletEmployees] = useState<boolean>(false);

  const [selectedCashierId, setSelectedCashierId] = useState<string>(() => {
    const initial = StorageService.getOutletCashiers(defaultOutletId);
    return initial.length > 0 ? initial[0].id : '';
  });

  // Sub-tab di dalam halaman Input Kasir: 'shows' (5 Show Sales) | 'items' (Tabel Excel Item Harian + Mistral OCR)
  const [activeSection, setActiveSection] = useState<'shows' | 'items'>('shows');

  // Show 1 - 5 states
  const [activeShow, setActiveShow] = useState<number>(1);
  const [expandedShows, setExpandedShows] = useState<number[]>([]);
  const [isTotalFooterExpanded, setIsTotalFooterExpanded] = useState<boolean>(false);
  const [isHeaderCashierDropdownOpen, setIsHeaderCashierDropdownOpen] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Input fields for active show
  const [omsetCinema, setOmsetCinema] = useState<number>(0);
  const [omsetOffline, setOmsetOffline] = useState<number>(0);
  const [omsetMolling, setOmsetMolling] = useState<number>(0);
  const [omsetFnB, setOmsetFnB] = useState<number>(0);
  const [selectedFnBCategory, setSelectedFnBCategory] = useState<'offline' | 'molling'>('offline');
  const [omsetCinemaStr, setOmsetCinemaStr] = useState<string>('0');
  const [omsetOfflineStr, setOmsetOfflineStr] = useState<string>('0');
  const [omsetMollingStr, setOmsetMollingStr] = useState<string>('0');
  const [bill, setBill] = useState<number>(0);
  const [penonton, setPenonton] = useState<number>(0);
  const [isScanBillModalOpen, setIsScanBillModalOpen] = useState<boolean>(false);

  // Monthly Excel Item Table states
  const parsedDateParts = selectedDate.split('-').map(Number);
  const [selectedYear, setSelectedYear] = useState<number>(
    parsedDateParts[0] || new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    parsedDateParts[1] || new Date().getMonth() + 1
  );
  const activeDayFromSelectedDate = parsedDateParts[2] || new Date().getDate();

  const [searchItemQuery, setSearchItemQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('default');
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemUnit, setNewItemUnit] = useState<string>('CUP');
  const [newItemCategory, setNewItemCategory] = useState<string>('AUTO');

  // Mistral OCR Item Scanner Modal states
  const [isMistralItemModalOpen, setIsMistralItemModalOpen] = useState<boolean>(false);
  const [scanTargetDay, setScanTargetDay] = useState<number>(activeDayFromSelectedDate);
  const [scanMergeMode, setScanMergeMode] = useState<'add' | 'replace'>('replace');
  const [isScanningItems, setIsScanningItems] = useState<boolean>(false);
  const [scannedPreviewItems, setScannedPreviewItems] = useState<
    ExtractedCashierItemEntry[]
  >([]);
  const [scanConfidence, setScanConfidence] = useState<string>('');
  const [scanSummary, setScanSummary] = useState<string>('');
  const [scanFilePreview, setScanFilePreview] = useState<string | null>(null);
  const [scanFileName, setScanFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedOutlet =
    outlets.find((o) => o.id === selectedOutletId) || outlets[0];
  const targetHead = selectedOutlet?.targetHead || 0;
  const selectedCashier = cashierList.find((c) => c.id === selectedCashierId);

  // Load SDM cashiers when outlet changes or storage updates
  const refreshCashierList = (outletId: string, includeAll = showAllOutletEmployees) => {
    const allEmp = StorageService.getEmployees().filter(
      (e) =>
        e.outletId === outletId &&
        e.statusKerja !== 'Resign' &&
        e.statusKerja !== 'Terminate'
    );
    const filtered = includeAll
      ? allEmp
      : StorageService.getOutletCashiers(outletId);

    setCashierList(filtered);
    if (filtered.length > 0 && !filtered.some((c) => c.id === selectedCashierId)) {
      setSelectedCashierId(filtered[0].id);
    } else if (filtered.length === 0) {
      setSelectedCashierId('');
    }
  };

  useEffect(() => {
    refreshCashierList(selectedOutletId, showAllOutletEmployees);
  }, [selectedOutletId, showAllOutletEmployees]);

  // Daily 5-Show Record for Selected Cashier
  const [dailyRecord, setDailyRecord] = useState<CashierDailyPerformanceRecord>(() =>
    StorageService.getCashierDailyPerformance(
      defaultOutletId,
      selectedCashierId || 'default',
      selectedDate
    )
  );

  // Monthly Excel Item Record for Selected Cashier
  const [monthlyProductRecord, setMonthlyProductRecord] =
    useState<CashierMonthlyProductRecord>(() =>
      StorageService.getCashierMonthlyProducts(
        defaultOutletId,
        selectedCashierId || 'default',
        selectedYear,
        selectedMonth
      )
    );

  // Sync month/year when selectedDate changes
  useEffect(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    if (y && m) {
      setSelectedYear(y);
      setSelectedMonth(m);
    }
    if (d) {
      setScanTargetDay(d);
    }
  }, [selectedDate]);

  const formatNumberWithDots = (val: number | string): string => {
    const raw = String(val).replace(/\D/g, '');
    if (!raw) return '0';
    return Number(raw).toLocaleString('id-ID');
  };

  // Load 5-show data when outlet, cashier, or date changes
  const reloadDailyRecord = () => {
    if (!selectedCashierId) return;
    const emp = cashierList.find((c) => c.id === selectedCashierId);
    const rec = StorageService.getCashierDailyPerformance(
      selectedOutletId,
      selectedCashierId,
      selectedDate,
      emp?.name || ''
    );
    setDailyRecord(rec);
    loadShowData(rec, activeShow);
  };

  const reloadMonthlyProducts = () => {
    const effectiveCashierId = selectedCashierId || cashierList[0]?.id || 'default';
    const emp = cashierList.find((c) => c.id === effectiveCashierId);
    const prodRec = StorageService.getCashierMonthlyProducts(
      selectedOutletId,
      effectiveCashierId,
      selectedYear,
      selectedMonth,
      emp?.name || ''
    );
    setMonthlyProductRecord(prodRec);
  };

  useEffect(() => {
    reloadDailyRecord();
  }, [selectedOutletId, selectedCashierId, selectedDate]);

  useEffect(() => {
    reloadMonthlyProducts();
  }, [selectedOutletId, selectedCashierId, selectedYear, selectedMonth]);

  // Listen to real-time updates from Data Karyawan, Input Data Sales Outlet, or SDM sync
  useEffect(() => {
    const handleStorageUpdate = (e: any) => {
      const t = e.detail?.type;
      if (t === 'employees') {
        refreshCashierList(selectedOutletId, showAllOutletEmployees);
      } else if (t === 'sales' || t === 'sdm-performance') {
        reloadDailyRecord();
      } else if (t === 'sdm-products') {
        reloadMonthlyProducts();
      }
    };
    window.addEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    return () =>
      window.removeEventListener('cinema-xxi-storage-update', handleStorageUpdate);
  }, [selectedOutletId, selectedCashierId, selectedDate, selectedYear, selectedMonth, activeShow]);

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

  // Ambil angka penonton outlet per show langsung dari Input Data Sales Outlet
  const outletDailySales = StorageService.getDailySaleByOutletAndDate(
    selectedOutletId,
    selectedDate
  );
  const getOutletPenontonForShow = (showNum: number): number => {
    const outletShow = outletDailySales?.shows?.find((s) => s.showNumber === showNum);
    return outletShow?.penonton || 0;
  };
  const getOutletCinemaForShow = (showNum: number): number => {
    const outletShow = outletDailySales?.shows?.find((s) => s.showNumber === showNum);
    return outletShow?.omsetCinema || 0;
  };

  const loadShowData = (rec: CashierDailyPerformanceRecord, showNum: number) => {
    const show = rec.shows.find((s) => s.showNumber === showNum);
    const autoPenonton = getOutletPenontonForShow(showNum);
    const autoCinema = getOutletCinemaForShow(showNum);

    if (show) {
      const cin = show.omsetCinema || autoCinema || 0;
      const off =
        show.omsetOffline !== undefined ? show.omsetOffline : show.omsetFnB || 0;
      const mol = show.omsetMolling || 0;
      const fnb = off + mol > 0 ? off + mol : show.omsetFnB || 0;
      const pen = autoPenonton > 0 ? autoPenonton : show.penonton || 0;
      setOmsetCinema(cin);
      setOmsetOffline(off);
      setOmsetMolling(mol);
      setOmsetFnB(fnb);
      setOmsetCinemaStr(cin ? formatNumberWithDots(cin) : '0');
      setOmsetOfflineStr(off ? formatNumberWithDots(off) : '0');
      setOmsetMollingStr(mol ? formatNumberWithDots(mol) : '0');
      if (mol > 0 && off === 0) {
        setSelectedFnBCategory('molling');
      } else {
        setSelectedFnBCategory('offline');
      }
      setBill(show.bill || 0);
      setPenonton(pen);
      setIsLocked(Boolean(show.isLocked));
    } else {
      setOmsetCinema(autoCinema);
      setOmsetOffline(0);
      setOmsetMolling(0);
      setOmsetFnB(0);
      setOmsetCinemaStr(autoCinema ? formatNumberWithDots(autoCinema) : '0');
      setOmsetOfflineStr('0');
      setOmsetMollingStr('0');
      setSelectedFnBCategory('offline');
      setBill(0);
      setPenonton(autoPenonton);
      setIsLocked(false);
    }
  };

  const handleFnBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    const num = rawDigits ? Number(rawDigits) : 0;
    if (selectedFnBCategory === 'offline') {
      setOmsetOffline(num);
      setOmsetOfflineStr(num ? num.toLocaleString('id-ID') : '');
      setOmsetFnB(num + omsetMolling);
    } else {
      setOmsetMolling(num);
      setOmsetMollingStr(num ? num.toLocaleString('id-ID') : '');
      setOmsetFnB(omsetOffline + num);
    }
  };

  const handleCinemaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    const num = rawDigits ? Number(rawDigits) : 0;
    setOmsetCinema(num);
    setOmsetCinemaStr(num ? num.toLocaleString('id-ID') : '');
  };

  const updateMemoryShow = (
    showNum: number,
    cin: number,
    off: number,
    mol: number,
    b: number,
    p: number,
    lockedStatus: boolean
  ) => {
    const fnb = off + mol;
    const updatedShows = dailyRecord.shows.map((s) => {
      if (s.showNumber === showNum) {
        return {
          ...s,
          omsetCinema: cin,
          omsetFnB: fnb,
          omsetOffline: off,
          omsetMolling: mol,
          bill: b,
          penonton: p,
          isFilled: fnb > 0 || off > 0 || mol > 0 || b > 0,
          isLocked: lockedStatus,
        };
      }
      return s;
    });
    setDailyRecord((prev) => ({ ...prev, shows: updatedShows }));
  };

  const handleTabChange = (showNum: number) => {
    if (!isLocked) {
      updateMemoryShow(
        activeShow,
        omsetCinema,
        omsetOffline,
        omsetMolling,
        bill,
        penonton,
        isLocked
      );
    }
    setActiveShow(showNum);
    loadShowData(dailyRecord, showNum);
  };

  const handleSyncOutletPenontonNow = () => {
    const autoPen = getOutletPenontonForShow(activeShow);
    const autoCin = getOutletCinemaForShow(activeShow);
    setPenonton(autoPen);
    if (autoCin > 0) {
      setOmsetCinema(autoCin);
      setOmsetCinemaStr(formatNumberWithDots(autoCin));
    }
    triggerToast(
      autoPen > 0
        ? `Penonton Show ${activeShow} (${autoPen.toLocaleString('id-ID')} penonton) berhasil ditarik dari Input Data Sales Outlet!`
        : `Input Data Sales Outlet untuk Show ${activeShow} pada tanggal ini masih 0 penonton.`
    );
  };

  const handleApplyBillOcrData = (data: ExtractedSalesData) => {
    if (isLocked) return;
    if (data.omsetFnB !== undefined) {
      if (selectedFnBCategory === 'offline') {
        setOmsetOffline(data.omsetFnB);
        setOmsetOfflineStr(data.omsetFnB ? data.omsetFnB.toLocaleString('id-ID') : '0');
        setOmsetFnB(data.omsetFnB + omsetMolling);
      } else {
        setOmsetMolling(data.omsetFnB);
        setOmsetMollingStr(data.omsetFnB ? data.omsetFnB.toLocaleString('id-ID') : '0');
        setOmsetFnB(omsetOffline + data.omsetFnB);
      }
    }
    if (data.omsetCinema !== undefined && data.omsetCinema > 0) {
      setOmsetCinema(data.omsetCinema);
      setOmsetCinemaStr(data.omsetCinema.toLocaleString('id-ID'));
    }
    if (data.bill !== undefined) setBill(data.bill);
    // Penonton tetap memprioritaskan angka otomatis dari Input Data Sales Outlet
    const outletPen = getOutletPenontonForShow(activeShow);
    if (outletPen > 0) {
      setPenonton(outletPen);
    } else if (data.penonton !== undefined) {
      setPenonton(data.penonton);
    }
  };

  const handleToggleLock = () => {
    if (!selectedCashierId) return;
    const nextLocked = !isLocked;
    setIsLocked(nextLocked);

    const updatedShows = dailyRecord.shows.map((s) => {
      if (s.showNumber === activeShow) {
        return {
          ...s,
          isLocked: nextLocked,
        };
      }
      return s;
    });

    const newRecord: CashierDailyPerformanceRecord = {
      ...dailyRecord,
      cashierName: selectedCashier?.name || dailyRecord.cashierName,
      cashierNik: selectedCashier?.nik || dailyRecord.cashierNik,
      shows: updatedShows,
    };
    setDailyRecord(newRecord);
    StorageService.saveCashierDailyPerformance(newRecord);
  };

  const handleConfirmSaveShow = () => {
    if (!selectedCashierId) return;
    setIsConfirmModalOpen(false);

    const nowTime = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const autoOutletPen = getOutletPenontonForShow(activeShow);
    const effectivePenonton = autoOutletPen > 0 ? autoOutletPen : penonton;
    const totalShowFnB = omsetOffline + omsetMolling;

    const updatedShows = dailyRecord.shows.map((s) => {
      if (s.showNumber === activeShow) {
        return {
          ...s,
          omsetCinema,
          omsetFnB: totalShowFnB,
          omsetOffline,
          omsetMolling,
          bill,
          penonton: effectivePenonton,
          updatedAt: nowTime,
          isFilled: true,
          isLocked: true,
        };
      }
      return s;
    });

    const newRecord: CashierDailyPerformanceRecord = {
      ...dailyRecord,
      outletId: selectedOutletId,
      cashierId: selectedCashierId,
      cashierName: selectedCashier?.name || dailyRecord.cashierName,
      cashierNik: selectedCashier?.nik || dailyRecord.cashierNik,
      date: selectedDate,
      shows: updatedShows,
    };

    StorageService.saveCashierDailyPerformance(newRecord);
    setDailyRecord(newRecord);
    setOmsetFnB(totalShowFnB);
    setPenonton(effectivePenonton);
    setIsLocked(true);
    triggerToast(
      `Data Omset Show ${activeShow} untuk kasir ${selectedCashier?.name || ''} berhasil disimpan & dikunci!`
    );
  };

  // =========================================================
  // DAFTAR KASIR YANG SUDAH INPUT OMSET DI OUTLET & TANGGAL INI
  // & AGREGASI PENJUMLAHAN SELURUH KASIR PER SHOW (SHOW 1 S/D 5)
  // =========================================================
  const allEmployeesInStore = StorageService.getEmployees();
  const outletDailyCashierRecords = StorageService.getCashierDailyPerformanceAll().filter(
    (r) => r.outletId === selectedOutletId && r.date === selectedDate
  );

  const toggleExpandShowRow = (showNum: number) => {
    setExpandedShows((prev) =>
      prev.includes(showNum) ? prev.filter((n) => n !== showNum) : [...prev, showNum]
    );
  };

  // Hitung rincian masing-masing kasir yang sudah input omset pada Show tertentu
  const getCashiersFilledForShow = (showNum: number) => {
    const outletShowCur = outletDailySales?.shows?.find((x) => x.showNumber === showNum);

    const results: Array<{
      cashierId: string;
      cashierName: string;
      cashierNik: string;
      netOffline: number;
      netMolling: number;
      netFnb: number;
      netBill: number;
      netPenonton: number;
      dayaSerapPercent: number;
      netSph: number;
      achievementPercent: number;
      netAt: number;
      isCapai: boolean;
      isLocked: boolean;
      updatedAt: string;
    }> = [];

    outletDailyCashierRecords.forEach((rec) => {
      const current = rec.shows?.find((x) => x.showNumber === showNum);

      const showOffline =
        current?.omsetOffline !== undefined
          ? current.omsetOffline
          : current?.omsetFnB || 0;
      const showMolling = current?.omsetMolling || 0;
      const showFnb =
        showOffline + showMolling > 0
          ? showOffline + showMolling
          : current?.omsetFnB || 0;
      const showBill = current?.bill || 0;
      const isFilled = Boolean(
        current?.isFilled ||
          showFnb > 0 ||
          showOffline > 0 ||
          showMolling > 0 ||
          showBill > 0
      );
      if (!isFilled) return;

      const showPenonton =
        (outletShowCur?.penonton || 0) > 0
          ? outletShowCur!.penonton
          : current?.penonton || 0;

      const netSph = showPenonton > 0 ? showFnb / showPenonton : 0;
      const dayaSerapPercent = showPenonton > 0 ? (showBill / showPenonton) * 100 : 0;
      const netAt = showBill > 0 ? showFnb / showBill : 0;
      const achievementPercent =
        targetHead > 0 && netSph > 0 ? (netSph / targetHead) * 100 : 0;

      const matchedEmp = allEmployeesInStore.find((e) => e.id === rec.cashierId);

      results.push({
        cashierId: rec.cashierId,
        cashierName: matchedEmp?.name || rec.cashierName || 'Kasir',
        cashierNik: matchedEmp?.nik || rec.cashierNik || '-',
        netOffline: showOffline,
        netMolling: showMolling,
        netFnb: showFnb,
        netBill: showBill,
        netPenonton: showPenonton,
        dayaSerapPercent,
        netSph,
        achievementPercent,
        netAt,
        isCapai: netSph >= targetHead && showPenonton > 0,
        isLocked: Boolean(current?.isLocked),
        updatedAt: current?.updatedAt || '-',
      });
    });

    return results.sort((a, b) => b.netFnb - a.netFnb);
  };

  // Baris Utama Show 1 s/d Show 5 = Penjumlahan seluruh kasir yang input di masing-masing Show
  const netShowsList = [1, 2, 3, 4, 5].map((showNum) => {
    const cashiersInShow = getCashiersFilledForShow(showNum);
    const outletShowCur = outletDailySales?.shows?.find((x) => x.showNumber === showNum);
    const currentSelectedCashierShow = dailyRecord.shows.find(
      (x) => x.showNumber === showNum
    );

    // Jumlahkan Omset Offline, Omset Molling, Total F&B dan Bill dari seluruh kasir yang input di show ini
    const sumOffline = cashiersInShow.reduce((acc, item) => acc + item.netOffline, 0);
    const sumMolling = cashiersInShow.reduce((acc, item) => acc + item.netMolling, 0);
    const sumFnb = cashiersInShow.reduce((acc, item) => acc + item.netFnb, 0);
    const sumBill = cashiersInShow.reduce((acc, item) => acc + item.netBill, 0);

    // Penonton Show ini diambil dari Input Data Sales Outlet (atau fallback penonton show jika outlet belum isi)
    const fallbackPenonton =
      cashiersInShow.length > 0
        ? Math.max(...cashiersInShow.map((c) => c.netPenonton), 0)
        : currentSelectedCashierShow?.penonton || 0;
    const showPenonton =
      (outletShowCur?.penonton || 0) > 0 ? outletShowCur!.penonton : fallbackPenonton;

    const isFilled =
      cashiersInShow.length > 0 ||
      sumFnb > 0 ||
      sumOffline > 0 ||
      sumMolling > 0 ||
      sumBill > 0;
    const isLocked = Boolean(currentSelectedCashierShow?.isLocked);

    const netSph = showPenonton > 0 ? sumFnb / showPenonton : 0;
    const dayaSerapPercent = showPenonton > 0 ? (sumBill / showPenonton) * 100 : 0;
    const netAt = sumBill > 0 ? sumFnb / sumBill : 0;
    const achievementPercent =
      targetHead > 0 && netSph > 0 ? (netSph / targetHead) * 100 : 0;
    const selisihRupiah =
      targetHead > 0 && showPenonton > 0
        ? Math.round((netSph - targetHead) * showPenonton)
        : 0;

    return {
      showNumber: showNum,
      isFilled,
      isLocked,
      cashiersInShow,
      netOffline: sumOffline,
      netMolling: sumMolling,
      netFnb: sumFnb,
      netBill: sumBill,
      netPenonton: showPenonton,
      netSph,
      dayaSerapPercent,
      netAt,
      achievementPercent,
      selisihRupiah,
      isCapai: netSph >= targetHead && showPenonton > 0,
    };
  });

  // Total Akumulasi Harian Kasir yang Sedang Dipilih (untuk kartu ringkasan kasir di atas)
  const selectedCashierFilledShows = dailyRecord.shows.filter(
    (s) =>
      s.isFilled ||
      s.omsetFnB > 0 ||
      (s.omsetOffline || 0) > 0 ||
      (s.omsetMolling || 0) > 0 ||
      s.bill > 0
  );
  const selectedCashierTotalFnB = selectedCashierFilledShows.reduce((acc, s) => {
    const off = s.omsetOffline !== undefined ? s.omsetOffline : s.omsetFnB || 0;
    const mol = s.omsetMolling || 0;
    return acc + (off + mol > 0 ? off + mol : s.omsetFnB || 0);
  }, 0);
  const selectedCashierTotalBill = selectedCashierFilledShows.reduce(
    (acc, s) => acc + (s.bill || 0),
    0
  );
  const selectedCashierTotalPenonton = selectedCashierFilledShows.reduce((acc, s) => {
    const outPen = getOutletPenontonForShow(s.showNumber);
    return acc + (outPen > 0 ? outPen : s.penonton || 0);
  }, 0);

  const selectedCashierDailyMetrics = StorageService.calculateMetrics(
    0,
    selectedCashierTotalFnB,
    selectedCashierTotalBill,
    selectedCashierTotalPenonton,
    targetHead
  );

  // Total Akhir Gabungan Seluruh Show (Show 1 s/d Show 5) dari Seluruh Kasir di Tabel Rekap
  const totalOffline = netShowsList.reduce((acc, r) => acc + r.netOffline, 0);
  const totalMolling = netShowsList.reduce((acc, r) => acc + r.netMolling, 0);
  const totalFnB = netShowsList.reduce((acc, r) => acc + r.netFnb, 0);
  const totalBill = netShowsList.reduce((acc, r) => acc + r.netBill, 0);
  const filledShowRows = netShowsList.filter((r) => r.isFilled);
  const totalPenonton =
    filledShowRows.length > 0
      ? filledShowRows.reduce((acc, r) => acc + r.netPenonton, 0)
      : netShowsList.reduce((acc, r) => acc + r.netPenonton, 0);

  const currentPreviewPenonton =
    getOutletPenontonForShow(activeShow) > 0
      ? getOutletPenontonForShow(activeShow)
      : penonton;
  const activeShowMetrics = StorageService.calculateMetrics(
    omsetCinema,
    omsetOffline + omsetMolling,
    bill,
    currentPreviewPenonton,
    targetHead
  );

  const totalDailyMetrics = StorageService.calculateMetrics(
    0,
    totalFnB,
    totalBill,
    totalPenonton,
    targetHead
  );

  // Daftar seluruh kasir yang sudah input omset minimal 1 show pada hari ini (dijumlah per kasir)
  const cashiersWithDailyInput = outletDailyCashierRecords
    .map((rec) => {
      const filled = (rec.shows || []).filter(
        (s) =>
          s.isFilled ||
          (s.omsetFnB || 0) > 0 ||
          (s.omsetOffline || 0) > 0 ||
          (s.omsetMolling || 0) > 0 ||
          (s.bill || 0) > 0
      );
      if (filled.length === 0) return null;

      const sortedFilled = [...filled].sort((a, b) => a.showNumber - b.showNumber);
      const cOffline = sortedFilled.reduce(
        (acc, s) =>
          acc + (s.omsetOffline !== undefined ? s.omsetOffline : s.omsetFnB || 0),
        0
      );
      const cMolling = sortedFilled.reduce(
        (acc, s) => acc + (s.omsetMolling || 0),
        0
      );
      const cFnB = cOffline + cMolling;
      const cBill = sortedFilled.reduce((acc, s) => acc + (s.bill || 0), 0);
      const cPen = sortedFilled.reduce((acc, s) => {
        const outPen = getOutletPenontonForShow(s.showNumber);
        return acc + (outPen > 0 ? outPen : s.penonton || 0);
      }, 0);

      const cMetrics = StorageService.calculateMetrics(
        0,
        cFnB,
        cBill,
        cPen,
        targetHead
      );
      const matchedEmp = allEmployeesInStore.find((e) => e.id === rec.cashierId);
      const lastTime =
        sortedFilled.filter((s) => s.updatedAt).pop()?.updatedAt || '-';

      return {
        cashierId: rec.cashierId,
        cashierName: matchedEmp?.name || rec.cashierName || 'Kasir',
        cashierNik: matchedEmp?.nik || rec.cashierNik || '-',
        filledShowsCount: sortedFilled.length,
        filledShowNumbers: sortedFilled.map((s) => s.showNumber),
        totalOffline: cOffline,
        totalMolling: cMolling,
        totalFnB: cFnB,
        totalBill: cBill,
        totalPenonton: cPen,
        metrics: cMetrics,
        lastUpdated: lastTime,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.totalFnB - a.totalFnB);

  // =========================================================
  // HANDLERS TABEL EXCEL ITEM HARIAN + MISTRAL OCR
  // =========================================================
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  const filteredProductItems = (monthlyProductRecord.items || [])
    .filter((item) =>
      item.name.toLowerCase().includes(searchItemQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === 'asc') return a.name.localeCompare(b.name);
      if (sortOrder === 'desc') return b.name.localeCompare(a.name);
      return 0;
    });

  const lastAddedItemIdRef = useRef<string | null>(null);

  const buildCanonicalMonthlyRecord = (
    itemsList: CashierProductItem[],
    dailySalesMap: CashierMonthlyProductRecord['dailySales']
  ): CashierMonthlyProductRecord => {
    const effectiveCashierId = selectedCashierId || cashierList[0]?.id || 'default';
    const emp = cashierList.find((c) => c.id === effectiveCashierId);
    return {
      ...monthlyProductRecord,
      id: `${selectedOutletId}_${effectiveCashierId}_${selectedYear}_${selectedMonth}`,
      outletId: selectedOutletId,
      cashierId: effectiveCashierId,
      cashierName: emp?.name || selectedCashier?.name || monthlyProductRecord.cashierName || 'Kasir XXI',
      year: selectedYear,
      month: selectedMonth,
      items: itemsList,
      dailySales: dailySalesMap,
    };
  };

  const handleProductCellChange = (day: number, itemId: string, val: number) => {
    const updatedDaily = { ...(monthlyProductRecord.dailySales || {}) };
    if (!updatedDaily[day]) updatedDaily[day] = {};
    updatedDaily[day] = {
      ...updatedDaily[day],
      [itemId]: Math.max(0, val),
    };
    const nextRec = buildCanonicalMonthlyRecord(
      monthlyProductRecord.items || [],
      updatedDaily
    );
    setMonthlyProductRecord(nextRec);
    StorageService.saveCashierMonthlyProducts(nextRec);
  };

  const handleRenameItemRow = (itemId: string, nextName: string) => {
    const currentItems = monthlyProductRecord.items || [];
    const updatedItems = currentItems.map((it) => {
      if (it.id !== itemId) return it;
      const autoCat = resolveProductItemCategory(nextName, it.category);
      return { ...it, name: nextName, category: autoCat };
    });
    const nextRec = buildCanonicalMonthlyRecord(
      updatedItems,
      monthlyProductRecord.dailySales || {}
    );
    setMonthlyProductRecord(nextRec);
    StorageService.saveCashierMonthlyProducts(nextRec);
  };

  const handleCategoryItemRowChange = (itemId: string, nextCategory: string) => {
    const currentItems = monthlyProductRecord.items || [];
    const updatedItems = currentItems.map((it) =>
      it.id === itemId ? { ...it, category: nextCategory } : it
    );
    const nextRec = buildCanonicalMonthlyRecord(
      updatedItems,
      monthlyProductRecord.dailySales || {}
    );
    setMonthlyProductRecord(nextRec);
    StorageService.saveCashierMonthlyProducts(nextRec);
  };

  const handleSaveMonthlyProducts = () => {
    const nextRec = buildCanonicalMonthlyRecord(
      monthlyProductRecord.items || [],
      monthlyProductRecord.dailySales || {}
    );
    StorageService.saveCashierMonthlyProducts(nextRec);
    triggerToast(
      `Tabel Excel Item Harian kasir ${nextRec.cashierName || ''} berhasil disimpan!`
    );
  };

  const handleAddManualItemRow = () => {
    const currentItems = monthlyProductRecord.items || [];
    const trimmed = newItemName.trim();

    if (trimmed) {
      const existing = currentItems.find(
        (i) => i.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (existing) {
        triggerToast(`Item "${trimmed}" sudah ada di dalam tabel.`);
        return;
      }
    }

    // Jika input nama kosong saat klik "+ Tambah Baris", tetap tambahkan baris baru yang bisa langsung diketik di dalam tabel
    const finalName = trimmed || `Item Produk Baru #${currentItems.length + 1}`;
    const newItemId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const resolvedCategory =
      newItemCategory && newItemCategory !== 'AUTO'
        ? newItemCategory
        : resolveProductItemCategory(finalName);

    const newItem: CashierProductItem = {
      id: newItemId,
      name: finalName,
      unit: newItemUnit.toUpperCase() || 'CUP',
      category: resolvedCategory,
    };

    if (searchItemQuery) {
      setSearchItemQuery('');
    }
    if (sortOrder !== 'default') {
      setSortOrder('default');
    }

    lastAddedItemIdRef.current = newItemId;
    const nextRec = buildCanonicalMonthlyRecord(
      [...currentItems, newItem],
      monthlyProductRecord.dailySales || {}
    );
    setMonthlyProductRecord(nextRec);
    StorageService.saveCashierMonthlyProducts(nextRec);
    setNewItemName('');
    triggerToast(
      trimmed
        ? `Baris item "${finalName}" (${resolvedCategory}) berhasil ditambahkan ke tabel!`
        : `Baris baru berhasil ditambahkan! Silakan ketik nama item produk pada kolom Nama Item Produk.`
    );
  };

  const handleDeleteItemRow = (itemId: string, itemName: string) => {
    const updatedItems = (monthlyProductRecord.items || []).filter((i) => i.id !== itemId);
    const updatedDaily = { ...(monthlyProductRecord.dailySales || {}) };
    Object.keys(updatedDaily).forEach((dKey) => {
      const d = Number(dKey);
      if (updatedDaily[d] && updatedDaily[d][itemId] !== undefined) {
        const copyDay = { ...updatedDaily[d] };
        delete copyDay[itemId];
        updatedDaily[d] = copyDay;
      }
    });

    const nextRec = buildCanonicalMonthlyRecord(updatedItems, updatedDaily);
    setMonthlyProductRecord(nextRec);
    StorageService.saveCashierMonthlyProducts(nextRec);
    triggerToast(`Baris item "${itemName}" telah dihapus dari tabel.`);
  };

  // Mistral OCR File Upload & Scan Handler
  const handleMistralItemFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    setScanFileName(file.name);
    setIsScanningItems(true);
    setScannedPreviewItems([]);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setScanFilePreview(isPdf ? 'PDF_DOCUMENT' : base64);

      try {
        const result = await OcrService.processCashierItemsImage(base64, isPdf);
        setScannedPreviewItems(result.items || []);
        setScanConfidence(result.confidence || 'Mistral OCR Verified');
        setScanSummary(
          result.detectedSummary ||
            `${(result.items || []).length} item produk berhasil dibaca oleh Mistral OCR.`
        );
      } catch (err) {
        console.error('Mistral Item OCR error:', err);
      } finally {
        setIsScanningItems(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Apply Scanned Items to Daily Excel Table (Auto-Create New Row for New Items!)
  const handleApplyMistralItemsToExcel = () => {
    if (scannedPreviewItems.length === 0) return;

    const updatedItems = [...monthlyProductRecord.items];
    const updatedDaily = { ...monthlyProductRecord.dailySales };
    if (!updatedDaily[scanTargetDay]) {
      updatedDaily[scanTargetDay] = {};
    } else {
      updatedDaily[scanTargetDay] = { ...updatedDaily[scanTargetDay] };
    }

    let newRowsCreated = 0;
    let existingRowsUpdated = 0;

    scannedPreviewItems.forEach((scanned) => {
      const cleanName = scanned.name.trim();
      if (!cleanName || scanned.qty <= 0) return;

      // Cari apakah nama item sudah ada di tabel (case-insensitive)
      let matchedItem = updatedItems.find(
        (it) => it.name.trim().toLowerCase() === cleanName.toLowerCase()
      );

      // JIKA ITEM BARU: Otomatis buat baris baru di tabel Excel!
      if (!matchedItem) {
        matchedItem = {
          id: `item_ocr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: cleanName,
          unit: (scanned.unit || 'PCS').toUpperCase(),
          category: scanned.category || 'F&B Cafe',
        };
        updatedItems.push(matchedItem);
        newRowsCreated++;
      } else {
        existingRowsUpdated++;
      }

      const prevQty = updatedDaily[scanTargetDay][matchedItem.id] || 0;
      updatedDaily[scanTargetDay][matchedItem.id] =
        scanMergeMode === 'add' ? prevQty + scanned.qty : scanned.qty;
    });

    const nextRec = buildCanonicalMonthlyRecord(updatedItems, updatedDaily);

    setMonthlyProductRecord(nextRec);
    StorageService.saveCashierMonthlyProducts(nextRec);
    setIsMistralItemModalOpen(false);
    setScannedPreviewItems([]);
    setScanFilePreview(null);

    triggerToast(
      `Mistral OCR Sukses! Tanggal ${scanTargetDay} ${MONTH_NAMES[selectedMonth - 1]}: ${existingRowsUpdated} item diupdate & ${newRowsCreated} baris item baru otomatis dibuat!`
    );
  };

  const handleExportExcelItems = () => {
    const rows = filteredProductItems.map((item, idx) => {
      const rowObj: Record<string, any> = {
        NO: idx + 1,
        'NAMA ITEM PRODUK': item.name,
      };
      let total = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const q = monthlyProductRecord.dailySales[d]?.[item.id] || 0;
        rowObj[`Tgl ${d}`] = q;
        total += q;
      }
      rowObj['TOTAL TERJUAL'] = total;
      return rowObj;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Item Kasir');
    const safeName = (selectedCashier?.name || 'Kasir').replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(
      wb,
      `Tabel_Item_Kasir_${safeName}_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}.xlsx`
    );
  };

  // Hitung total keseluruhan item bulan ini untuk kasir terpilih
  const totalMonthlyItemsSold = (monthlyProductRecord.items || []).reduce(
    (acc, item) => {
      let rowSum = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        rowSum += monthlyProductRecord.dailySales[d]?.[item.id] || 0;
      }
      return acc + rowSum;
    },
    0
  );

  // Hitung total item hari ini (sesuai selectedDate)
  const totalTodayItemsSold = (monthlyProductRecord.items || []).reduce(
    (acc, item) => {
      return (
        acc +
        (monthlyProductRecord.dailySales[activeDayFromSelectedDate]?.[item.id] || 0)
      );
    },
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Header */}
      <div className="p-6 rounded-3xl border border-purple-200/90 bg-white text-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#581c87] to-[#7e22ce] text-[#FACC15] shadow-xs">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
                  Performance SDM &bull; Input Sales &amp; Item Kasir
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pencatatan Omset 5 Show Per-Kasir (Penonton Auto-Sync dari Sales Outlet) &amp; Tabel Excel Item Produk Harian via Mistral OCR
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {/* Outlet Selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                1. PILIH OUTLET {isAdmin ? '(SEMUA OUTLET)' : '(LOCKED)'}
              </label>
              <select
                value={selectedOutletId}
                disabled={!isAdmin}
                onChange={(e) => setSelectedOutletId(e.target.value)}
                className={`text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-2xs transition ${
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

            {/* Cashier Selector (Pulled from Data Karyawan) */}
            <div className="min-w-[230px]">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-900">
                  2. PILIH SDM KASIR (DATA KARYAWAN)
                </label>
                <button
                  type="button"
                  onClick={() => setShowAllOutletEmployees((prev) => !prev)}
                  className="text-[9px] font-bold text-purple-700 hover:underline cursor-pointer"
                  title="Tampilkan seluruh divisi karyawan jika nama kasir berada di divisi lain"
                >
                  {showAllOutletEmployees ? 'Hanya Divisi Kasir/F&B' : 'Semua Divisi'}
                </button>
              </div>
              <select
                value={selectedCashierId}
                onChange={(e) => setSelectedCashierId(e.target.value)}
                className="w-full text-xs font-black px-3.5 py-2.5 rounded-xl border border-purple-300 bg-purple-50/50 text-purple-950 shadow-2xs"
              >
                {cashierList.length === 0 ? (
                  <option value="">-- Belum Ada Data Kasir di Outlet Ini --</option>
                ) : (
                  cashierList.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.jabatan} ({emp.nik})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                3. TANGGAL LAPORAN
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-2xs"
              />
            </div>

            {onNavigateToLeaderboard && (
              <button
                type="button"
                onClick={onNavigateToLeaderboard}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xs hover:brightness-105 transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>Ranking Kasir</span>
              </button>
            )}
          </div>
        </div>

        {/* Selected Cashier Summary Strip (Hanya tampil pada tab Input Omset 5 Show) */}
        {activeSection === 'shows' &&
          (selectedCashier ? (
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#4A1D6A] to-[#7C3AED] text-[#FACC15] flex items-center justify-center font-black text-base shadow-xs">
                  {selectedCashier.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-sm text-slate-900">
                      {selectedCashier.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-bold text-[10px]">
                      {selectedCashier.jabatan}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px]">
                      NIK: {selectedCashier.nik}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Outlet: <strong className="text-slate-700">{selectedOutlet?.name}</strong> &bull; Target Head Outlet:{' '}
                    <strong className="text-amber-700">
                      Rp {targetHead.toLocaleString('id-ID')}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Quick Summary Pills for Selected Cashier Today */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right">
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    Head Kasir Hari Ini
                  </div>
                  <div className="text-sm font-black text-slate-900">
                    Rp {Math.round(selectedCashierDailyMetrics.head).toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-right">
                  <div className="text-[10px] font-bold uppercase text-emerald-700">
                    Achievement
                  </div>
                  <div className="text-sm font-black text-emerald-800">
                    {selectedCashierDailyMetrics.achievement.toFixed(1)}%
                  </div>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-purple-50 border border-purple-200 text-right">
                  <div className="text-[10px] font-bold uppercase text-purple-700">
                    Daya Serap
                  </div>
                  <div className="text-sm font-black text-purple-900">
                    {selectedCashierDailyMetrics.dayaSerap.toFixed(1)}%
                  </div>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-right">
                  <div className="text-[10px] font-bold uppercase text-amber-800">
                    Item Terjual (Tgl {activeDayFromSelectedDate})
                  </div>
                  <div className="text-sm font-black text-amber-900">
                    {totalTodayItemsSold.toLocaleString('id-ID')} Item
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Belum ada karyawan kasir ditemukan untuk outlet ini. Silakan tambahkan data kasir di menu <strong>HC Area &rarr; Data Karyawan</strong> atau klik tombol <strong>"Semua Divisi"</strong> di atas.
              </span>
            </div>
          ))}

        {/* Section Switcher: 5 Show Sales Input vs Tabel Excel Item Harian (Mistral OCR) */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSection('shows')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center space-x-2 transition cursor-pointer ${
              activeSection === 'shows'
                ? 'bg-[#581c87] text-[#FACC15] shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-900'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>1. Input Omset Kasir (5 Show Harian)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('items')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center space-x-2 transition cursor-pointer ${
              activeSection === 'items'
                ? 'bg-[#581c87] text-[#FACC15] shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>2. Tabel Excel Item Produk Harian (Scan Mistral OCR)</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black">
              {monthlyProductRecord.items.length} Baris
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BAGIAN 1: INPUT OMSET 5 SHOW PER KASIR                     */}
      {/* ========================================================= */}
      {activeSection === 'shows' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-xs">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2.5">
              PILIH JADWAL SHOWTIME KASIR (1 HARI = 5 SHOW, INDIKATOR SAMA DENGAN INPUT DATA SALES):
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[1, 2, 3, 4, 5].map((showNum) => {
                const showData = dailyRecord.shows.find(
                  (s) => s.showNumber === showNum
                );
                const isFilled = Boolean(
                  showData &&
                    (showData.omsetFnB > 0 || showData.bill > 0 || showData.isFilled)
                );
                const isShowLocked = Boolean(showData?.isLocked);
                const isActive = activeShow === showNum;
                const outletPen = getOutletPenontonForShow(showNum);

                return (
                  <button
                    key={showNum}
                    type="button"
                    onClick={() => handleTabChange(showNum)}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center space-y-1 relative cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md border-amber-400 scale-[1.02]'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-amber-50/60'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="text-sm font-bold">Show {showNum}</span>
                      {isShowLocked ? (
                        <Lock
                          className={`w-3.5 h-3.5 ${
                            isActive ? 'text-slate-950' : 'text-amber-700'
                          }`}
                        />
                      ) : (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isFilled ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-semibold ${
                        isActive
                          ? 'text-slate-950'
                          : isShowLocked
                          ? 'text-amber-800 font-bold'
                          : isFilled
                          ? 'text-emerald-700 font-bold'
                          : 'text-slate-400'
                      }`}
                    >
                      {isShowLocked
                        ? '🔒 Dikunci'
                        : isFilled
                        ? 'Sudah Input'
                        : 'Belum Input'}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        isActive
                          ? 'bg-slate-950/15 text-slate-950'
                          : 'bg-purple-100 text-purple-900'
                      }`}
                    >
                      Penonton Outlet: {outletPen.toLocaleString('id-ID')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Show Form Body */}
            <div className="mt-6 p-5 sm:p-6 rounded-2xl border border-amber-200/90 bg-[#faf8f4]">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-200/80">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-xs">
                    #{activeShow}
                  </span>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Input Pencapaian Kasir &bull; Showtime {activeShow}
                  </h3>
                  <span className="text-xs text-slate-500 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      {dailyRecord.shows.find((s) => s.showNumber === activeShow)
                        ?.updatedAt
                        ? `Tercatat jam ${
                            dailyRecord.shows.find(
                              (s) => s.showNumber === activeShow
                            )?.updatedAt
                          }`
                        : 'Jam input otomatis tercatat saat simpan'}
                    </span>
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {isLocked && (
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Show {activeShow} Terkunci</span>
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => setIsScanBillModalOpen(true)}
                    className={`px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 border border-amber-400/50 text-xs font-bold flex items-center space-x-1.5 transition ${
                      isLocked
                        ? 'opacity-40 cursor-not-allowed'
                        : 'cursor-pointer'
                    }`}
                  >
                    <ScanLine className="w-4 h-4 text-amber-700" />
                    <span>Scan Struk Kasir (OCR)</span>
                  </button>
                </div>
              </div>

              {/* 4 Main Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                {/* 1. Omset F&B Kasir (Dropdown: Omset Offline & Omset Molling) */}
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 truncate">
                      OMSET F&amp;B KASIR (RP) - SHOW {activeShow}
                    </label>
                    <select
                      value={selectedFnBCategory}
                      disabled={isLocked}
                      onChange={(e) =>
                        setSelectedFnBCategory(
                          e.target.value as 'offline' | 'molling'
                        )
                      }
                      className="px-2 py-0.5 rounded-lg border border-purple-300 bg-purple-50 text-purple-900 font-black text-[10px] uppercase cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="offline">Omset Offline</option>
                      <option value="molling">Omset Molling</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={isLocked}
                    value={
                      selectedFnBCategory === 'offline'
                        ? omsetOfflineStr
                        : omsetMollingStr
                    }
                    onFocus={() => {
                      if (selectedFnBCategory === 'offline' && omsetOfflineStr === '0') {
                        setOmsetOfflineStr('');
                      } else if (
                        selectedFnBCategory === 'molling' &&
                        omsetMollingStr === '0'
                      ) {
                        setOmsetMollingStr('');
                      }
                    }}
                    onBlur={() => {
                      if (selectedFnBCategory === 'offline' && !omsetOfflineStr) {
                        setOmsetOfflineStr('0');
                      } else if (
                        selectedFnBCategory === 'molling' &&
                        !omsetMollingStr
                      ) {
                        setOmsetMollingStr('0');
                      }
                    }}
                    onChange={handleFnBChange}
                    className={`w-full px-4 py-2.5 rounded-xl border border-amber-300 bg-white text-slate-900 font-extrabold text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400 transition ${
                      isLocked ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''
                    }`}
                    placeholder="0"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSelectedFnBCategory('offline')}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer transition ${
                        selectedFnBCategory === 'offline'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Offline: Rp {omsetOffline.toLocaleString('id-ID')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFnBCategory('molling')}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer transition ${
                        selectedFnBCategory === 'molling'
                          ? 'bg-purple-700 text-amber-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Molling: Rp {omsetMolling.toLocaleString('id-ID')}
                    </button>
                  </div>
                </div>

                {/* 2. Jumlah Bill / Transaksi Kasir */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    JUMLAH BILL / STRUK KASIR - SHOW {activeShow}
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={isLocked}
                    value={bill || ''}
                    onChange={(e) => setBill(Number(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-extrabold text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400 transition ${
                      isLocked ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''
                    }`}
                    placeholder="0"
                  />
                </div>

                {/* 3. Penonton (Otomatis dari Input Data Sales Outlet) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-900">
                      PENONTON OUTLET (AUTO-SYNC)
                    </label>
                    <button
                      type="button"
                      onClick={handleSyncOutletPenontonNow}
                      className="text-[10px] font-extrabold text-purple-700 hover:text-purple-900 flex items-center space-x-1 cursor-pointer"
                      title="Tarik ulang angka penonton dari Input Data Sales Outlet"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Sync Sales</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      disabled={isLocked || getOutletPenontonForShow(activeShow) > 0}
                      value={currentPreviewPenonton || ''}
                      onChange={(e) => setPenonton(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-purple-300 bg-purple-50/70 text-purple-950 font-black text-sm focus:outline-hidden"
                      placeholder="0"
                    />
                  </div>
                  <span className="block text-[10px] text-purple-700 font-semibold mt-1">
                    {getOutletPenontonForShow(activeShow) > 0
                      ? `✅ Otomatis menarik dari Input Data Sales Outlet Show ${activeShow}`
                      : '⚠️ Input Sales Outlet Show ini belum diisi (bisa diisi sementara)'}
                  </span>
                </div>

                {/* 4. Omset Cinema Outlet (Referensi GBO%) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    OMSET CINEMA OUTLET (OPSIONAL / AUTO)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={isLocked}
                    value={omsetCinemaStr}
                    onChange={handleCinemaChange}
                    className={`w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-extrabold text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400 transition ${
                      isLocked ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''
                    }`}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleToggleLock}
                  className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center space-x-2 border transition cursor-pointer ${
                    isLocked
                      ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  {isLocked ? (
                    <>
                      <Unlock className="w-4 h-4 text-amber-700" />
                      <span>Buka Kunci Show {activeShow}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-amber-700" />
                      <span>Kunci Sementara</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isLocked || !selectedCashierId}
                  onClick={() => setIsConfirmModalOpen(true)}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-md transition ${
                    isLocked || !selectedCashierId
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Data Kasir Show {activeShow}</span>
                </button>
              </div>

              {/* Real-time Computed Indicators for Active Show */}
              <div className="mt-6 pt-5 border-t border-amber-200/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    HEAD KASIR (SPH)
                  </span>
                  <span className="text-sm font-black text-amber-700 mt-0.5 block">
                    Rp {Math.round(activeShowMetrics.head).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    TARGET HEAD OUTLET
                  </span>
                  <span className="text-sm font-black text-slate-800 mt-0.5 block">
                    Rp {targetHead.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    ACHIEVEMENT (%)
                  </span>
                  <span
                    className={`text-sm font-black mt-0.5 block ${
                      activeShowMetrics.achievement >= 100
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {activeShowMetrics.achievement.toFixed(1)}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    DAYA SERAP (%)
                  </span>
                  <span className="text-sm font-black text-purple-800 mt-0.5 block">
                    {activeShowMetrics.dayaSerap.toFixed(1)}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    AVG TRANSAKSI (AT)
                  </span>
                  <span className="text-sm font-black text-slate-800 mt-0.5 block">
                    Rp {Math.round(activeShowMetrics.at).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    SELISIH TARGET
                  </span>
                  <span
                    className={`text-sm font-black mt-0.5 block ${
                      activeShowMetrics.selisih >= 0
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {activeShowMetrics.selisih >= 0 ? '+' : ''}Rp{' '}
                    {Math.round(activeShowMetrics.selisih).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabel Rekap 5 Show Kasir */}
          <div className="p-6 rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-xs overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    Tabel Rekap Pencapaian 5 Show Kasir ({selectedOutlet?.name || '-'})
                  </h3>

                  {/* Tombol Panah Dropdown Daftar Kasir yang Sudah Input Hari Ini */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setIsHeaderCashierDropdownOpen((prev) => !prev)
                      }
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#F5F3FF] hover:bg-[#EDE9FE] border border-[#DDD6FE] text-[#6D28D9] text-[11px] font-extrabold transition cursor-pointer"
                      title="Klik panah untuk melihat daftar kasir yang sudah input omset hari ini"
                    >
                      <Users className="w-3.5 h-3.5 text-[#7C3AED]" />
                      <span>
                        {cashiersWithDailyInput.length} Kasir Sudah Input
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#7C3AED] transition-transform ${
                          isHeaderCashierDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isHeaderCashierDropdownOpen && (
                      <div className="absolute left-0 mt-1.5 w-80 rounded-2xl bg-white border border-purple-200 shadow-xl z-30 p-3 space-y-2">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                          <span className="text-[10px] font-black uppercase tracking-wider text-purple-900">
                            Kasir Sudah Input Omset ({selectedDate})
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsHeaderCashierDropdownOpen(false)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {cashiersWithDailyInput.length === 0 ? (
                          <div className="py-3 text-center text-[11px] text-slate-400">
                            Belum ada kasir yang input omset pada tanggal ini.
                          </div>
                        ) : (
                          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                            {cashiersWithDailyInput.map((c) => (
                              <button
                                key={c.cashierId}
                                type="button"
                                onClick={() => {
                                  setSelectedCashierId(c.cashierId);
                                  setIsHeaderCashierDropdownOpen(false);
                                }}
                                className={`w-full py-2 px-2.5 text-left rounded-xl flex items-center justify-between hover:bg-purple-50 transition cursor-pointer ${
                                  c.cashierId === selectedCashierId
                                    ? 'bg-purple-50/80 font-black'
                                    : ''
                                }`}
                              >
                                <div>
                                  <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                                    <span>{c.cashierName}</span>
                                    {c.cashierId === selectedCashierId && (
                                      <span className="px-1.5 py-0.2 rounded bg-purple-700 text-amber-300 text-[9px] font-black">
                                        Aktif
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    Input: Show {c.filledShowNumbers.join(', ')} &bull; Total F&amp;B: Rp{' '}
                                    {c.totalFnB.toLocaleString('id-ID')}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[11px] font-black text-amber-700">
                                    Rp {Math.round(c.metrics.head).toLocaleString('id-ID')}
                                  </div>
                                  <div
                                    className={`text-[10px] font-bold ${
                                      c.metrics.achievement >= 100
                                        ? 'text-emerald-600'
                                        : 'text-amber-600'
                                    }`}
                                  >
                                    ACV {c.metrics.achievement}%
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-1">
                  Baris utama <strong>Show 1 s/d Show 5</strong> otomatis menampilkan <strong>total penjumlahan seluruh kasir</strong> yang input di show tersebut. Klik panah kecil (<strong>▸/▾</strong>) untuk melihat rincian per nama kasir.
                </p>
              </div>

              {/* Tombol Buka / Tutup Semua Baris Show */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    if (expandedShows.length === 5 && isTotalFooterExpanded) {
                      setExpandedShows([]);
                      setIsTotalFooterExpanded(false);
                    } else {
                      setExpandedShows([1, 2, 3, 4, 5]);
                      setIsTotalFooterExpanded(true);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/80 text-purple-900 font-bold text-[11px] flex items-center space-x-1.5 transition cursor-pointer"
                >
                  {expandedShows.length === 5 && isTotalFooterExpanded ? (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 text-purple-700" />
                      <span>Tutup Semua Rincian Kasir</span>
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-purple-700" />
                      <span>Buka Semua Rincian Kasir</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[11px] border-b border-slate-200">
                    <th className="py-3 px-3 min-w-[185px]">Show</th>
                    <th className="py-3 px-3 text-right">Omset Offline</th>
                    <th className="py-3 px-3 text-right">Omset Molling</th>
                    <th className="py-3 px-3 text-right">Bill Kasir</th>
                    <th className="py-3 px-3 text-right">Penonton (Outlet)</th>
                    <th className="py-3 px-3 text-right">Daya Serap (%)</th>
                    <th className="py-3 px-3 text-right">Head / SPH (Rp)</th>
                    <th className="py-3 px-3 text-right">Target Head</th>
                    <th className="py-3 px-3 text-right">Achievement (%)</th>
                    <th className="py-3 px-3 text-right">AT (Rp)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {netShowsList.map((row) => {
                    const isShowExpanded = expandedShows.includes(row.showNumber);
                    const cashiersInShow = row.cashiersInShow;

                    return (
                      <React.Fragment key={row.showNumber}>
                        {/* PARENT SHOW ROW WITH EXPANDABLE ARROW LIKE TABEL REKAP DAILY */}
                        <tr
                          onClick={() => toggleExpandShowRow(row.showNumber)}
                          className={`hover:bg-[#F3E8FF]/40 transition-colors cursor-pointer select-none ${
                            isShowExpanded
                              ? 'bg-[#F5F3FF]/70'
                              : row.isFilled
                              ? 'bg-white'
                              : 'bg-slate-50/50 text-slate-400'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-black text-slate-900">
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                className="p-0.5 rounded hover:bg-[#E5E7EB] text-[#6B7280] transition-colors cursor-pointer"
                                title="Klik untuk melihat nama-nama kasir yang sudah input omset di Show ini"
                              >
                                {isShowExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-[#7C3AED]" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
                                )}
                              </button>
                              <span>Show {row.showNumber}</span>
                              {row.isLocked && (
                                <span className="text-amber-600">🔒</span>
                              )}
                              {cashiersInShow.length > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]">
                                  {cashiersInShow.length} Kasir
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            Rp {row.netOffline.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-purple-800">
                            Rp {row.netMolling.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {row.netBill.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-purple-800">
                            {row.netPenonton.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-purple-700">
                            {row.dayaSerapPercent.toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-amber-700">
                            Rp {Math.round(row.netSph).toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500">
                            Rp {targetHead.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black">
                            <span
                              className={
                                row.achievementPercent >= 100
                                  ? 'text-emerald-600'
                                  : 'text-amber-700'
                              }
                            >
                              {row.achievementPercent.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            Rp {Math.round(row.netAt).toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {!row.isFilled ? (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-400 text-[10px]">
                                Kosong
                              </span>
                            ) : row.isCapai ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black text-[10px]">
                                CAPAI
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                BELUM CAPAI
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* EXPANDABLE CHILD ROWS: NAMA-NAMA KASIR YANG SUDAH INPUT OMSET DI SHOW INI */}
                        {isShowExpanded && (
                          <>
                            {cashiersInShow.length === 0 ? (
                              <tr className="bg-[#FAF5FF]/50 border-b border-[#F3F4F6]">
                                <td
                                  colSpan={11}
                                  className="py-2.5 px-3 pl-9 text-[11px] text-slate-400 italic"
                                >
                                  <span className="text-[#A78BFA] font-mono text-xs mr-2 select-none">
                                    ↳
                                  </span>
                                  Belum ada kasir yang menginput omset pada Show {row.showNumber} di tanggal ini.
                                </td>
                              </tr>
                            ) : (
                              cashiersInShow.map((cItem) => {
                                const isCurrentSelected =
                                  cItem.cashierId === selectedCashierId;

                                return (
                                  <tr
                                    key={`show-${row.showNumber}-cashier-${cItem.cashierId}`}
                                    onClick={() => setSelectedCashierId(cItem.cashierId)}
                                    title="Klik untuk memilih kasir ini"
                                    className={`bg-[#FAF5FF]/60 hover:bg-[#F3E8FF]/70 border-b border-[#F3F4F6] transition-colors cursor-pointer ${
                                      isCurrentSelected ? 'ring-1 ring-inset ring-purple-300' : ''
                                    }`}
                                  >
                                    {/* Column 1: Indented tree branch + Nama Kasir */}
                                    <td className="py-2 px-3 pl-8">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-[#A78BFA] font-mono text-xs select-none">
                                          ↳
                                        </span>
                                        <span
                                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                            isCurrentSelected
                                              ? 'bg-[#6D28D9] text-[#FACC15]'
                                              : 'bg-[#EDE9FE] text-[#6D28D9]'
                                          }`}
                                        >
                                          {cItem.cashierName}
                                        </span>
                                        {cItem.updatedAt && cItem.updatedAt !== '-' && (
                                          <span className="text-[9px] text-slate-400 font-normal">
                                            ({cItem.updatedAt})
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* Column 2: Omset Offline Kasir */}
                                    <td className="py-2 px-3 text-right text-[11px] font-bold text-[#059669]">
                                      Rp {cItem.netOffline.toLocaleString('id-ID')}
                                    </td>

                                    {/* Column 3: Omset Molling Kasir */}
                                    <td className="py-2 px-3 text-right text-[11px] font-bold text-[#7C3AED]">
                                      Rp {cItem.netMolling.toLocaleString('id-ID')}
                                    </td>

                                    {/* Column 4: Bill Kasir */}
                                    <td className="py-2 px-3 text-right text-[11px] text-[#4B5563]">
                                      {cItem.netBill.toLocaleString('id-ID')}
                                    </td>

                                    {/* Column 5: Penonton */}
                                    <td className="py-2 px-3 text-right text-[11px] text-[#4B5563]">
                                      {cItem.netPenonton.toLocaleString('id-ID')}
                                    </td>

                                    {/* Column 6: Daya Serap */}
                                    <td className="py-2 px-3 text-right text-[11px] text-[#4B5563]">
                                      {cItem.dayaSerapPercent.toFixed(1)}%
                                    </td>

                                    {/* Column 7: Head / SPH */}
                                    <td className="py-2 px-3 text-right text-[11px] font-bold text-[#0284C7]">
                                      Rp {Math.round(cItem.netSph).toLocaleString('id-ID')}
                                    </td>

                                    {/* Column 8: Target Head */}
                                    <td className="py-2 px-3 text-right text-[11px] text-[#9CA3AF]">
                                      Rp {targetHead.toLocaleString('id-ID')}
                                    </td>

                                    {/* Column 9: Achievement % */}
                                    <td className="py-2 px-3 text-right">
                                      <span
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                          cItem.achievementPercent >= 100
                                            ? 'bg-[#DCFCE7] text-[#15803D]'
                                            : 'bg-[#FEE2E2] text-[#B91C1C]'
                                        }`}
                                      >
                                        {cItem.achievementPercent.toFixed(1)}%
                                      </span>
                                    </td>

                                    {/* Column 10: AT */}
                                    <td className="py-2 px-3 text-right text-[11px] text-[#4B5563]">
                                      Rp {Math.round(cItem.netAt).toLocaleString('id-ID')}
                                    </td>

                                    {/* Column 11: Status */}
                                    <td className="py-2 px-3 text-center">
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                          cItem.isCapai
                                            ? 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]'
                                            : 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5]'
                                        }`}
                                      >
                                        {cItem.isCapai ? 'Capai' : 'Belum Capai'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr
                    onClick={() => setIsTotalFooterExpanded((prev) => !prev)}
                    className="bg-purple-950 hover:bg-purple-900 text-white font-black text-xs cursor-pointer select-none transition-colors"
                    title="Klik panah untuk melihat rekap total harian seluruh kasir yang sudah input omset"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          className="p-0.5 rounded hover:bg-purple-800 text-amber-300 transition-colors cursor-pointer"
                        >
                          {isTotalFooterExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-amber-300" />
                          )}
                        </button>
                        <span>TOTAL AKHIR KASIR</span>
                        {cashiersWithDailyInput.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black">
                            {cashiersWithDailyInput.length} Kasir
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-amber-300">
                      Rp {totalOffline.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 text-right text-purple-200">
                      Rp {totalMolling.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {totalBill.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 text-right text-purple-200">
                      {totalPenonton.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-300">
                      {totalDailyMetrics.dayaSerap.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right text-amber-300">
                      Rp {Math.round(totalDailyMetrics.head).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">
                      Rp {targetHead.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-300">
                      {totalDailyMetrics.achievement.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right">
                      Rp {Math.round(totalDailyMetrics.at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {totalDailyMetrics.head >= targetHead && totalPenonton > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[10px]">
                          TARGET CAPAI
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px]">
                          PROGRES
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* EXPANDABLE TOTAL AKHIR PER KASIR HARI INI */}
                  {isTotalFooterExpanded &&
                    cashiersWithDailyInput.map((cTotal) => (
                      <tr
                        key={`total-cashier-${cTotal.cashierId}`}
                        onClick={() => setSelectedCashierId(cTotal.cashierId)}
                        className="bg-[#ECFDF5]/90 hover:bg-[#D1FAE5]/80 text-[#065F46] border-b border-[#A7F3D0] font-bold text-[11px] cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 pl-8">
                          <div className="flex items-center space-x-2">
                            <span className="text-[#059669] font-mono text-xs select-none">
                              ↳
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]">
                              {cTotal.cashierName} (Show {cTotal.filledShowNumbers.join(', ')})
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-[#059669]">
                          Rp {cTotal.totalOffline.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-[#7C3AED]">
                          Rp {cTotal.totalMolling.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {cTotal.totalBill.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {cTotal.totalPenonton.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {cTotal.metrics.dayaSerap}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-[#0284C7]">
                          Rp {Math.round(cTotal.metrics.head).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#6B7280]">
                          Rp {targetHead.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                              cTotal.metrics.achievement >= 100
                                ? 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]'
                                : 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5]'
                            }`}
                          >
                            {cTotal.metrics.achievement}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          Rp {Math.round(cTotal.metrics.at).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              cTotal.metrics.achievement >= 100
                                ? 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]'
                                : 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]'
                            }`}
                          >
                            {cTotal.metrics.achievement >= 100 ? 'Capai' : 'Progres'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* BAGIAN 2: TABEL EXCEL ITEM HARIAN + SCAN MISTRAL OCR       */}
      {/* ========================================================= */}
      {activeSection === 'items' && (
        <div className="space-y-5">
          {/* Toolbar Atas Tabel Excel */}
          <div className="p-5 rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-slate-900 flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <span>
                    Tabel Excel Penjualan Item Produk Harian &bull;{' '}
                    {selectedCashier?.name || 'Kasir'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scan struk/laporan menggunakan <strong>Mistral OCR</strong> untuk mengisi otomatis per hari. <strong>Jika ada item baru yang di-scan, otomatis membuat baris baru!</strong>
                </p>
              </div>

              {/* Filter Bulan & Tahun + Tombol Scan Mistral OCR */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800"
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
                  className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800"
                >
                  {[2025, 2026, 2027].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setScanTargetDay(activeDayFromSelectedDate);
                    setIsMistralItemModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-[#581c87] to-[#7e22ce] text-[#FACC15] hover:brightness-110 flex items-center space-x-2 shadow-sm transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#FACC15]" />
                  <span>SCAN ITEM BY MISTRAL OCR</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveMonthlyProducts}
                  className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-500 flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>SIMPAN TABEL</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExcelItems}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Excel</span>
                </button>
              </div>
            </div>

            {/* Baris Pencarian & Tambah Baris Item Baru Manual */}
            <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute inset-y-0 left-3 my-auto text-slate-400" />
                <input
                  type="text"
                  value={searchItemQuery}
                  onChange={(e) => setSearchItemQuery(e.target.value)}
                  placeholder="Cari nama item produk dalam tabel..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-semibold outline-hidden focus:border-purple-400"
                />
              </div>

              {/* Form Tambah Baris Item Baru */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddManualItemRow();
                  }}
                  placeholder="Tambah nama item produk baru..."
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 min-w-[210px]"
                />
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700"
                  title="Pilih Kategori Minuman / Produk"
                >
                  <option value="AUTO">Kategori: Deteksi Otomatis</option>
                  {BEVERAGE_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.shortLabel}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddManualItemRow}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center space-x-1 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Baris</span>
                </button>
              </div>
            </div>
          </div>

          {/* 31-Day Spreadsheet Matrix Table (Seperti Excel) */}
          <div className="rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-md overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-[11px] text-center border-collapse">
                <thead className="sticky top-0 z-20 font-black uppercase tracking-wider border-b border-slate-200 bg-slate-100 text-slate-700">
                  <tr>
                    <th className="py-2.5 px-2 border-r border-slate-200 w-10">
                      NO
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-left min-w-[230px] sticky left-0 bg-slate-100 z-30">
                      <button
                        type="button"
                        onClick={() =>
                          setSortOrder((prev) =>
                            prev === 'default'
                              ? 'asc'
                              : prev === 'asc'
                              ? 'desc'
                              : 'default'
                          )
                        }
                        className="flex items-center space-x-1.5 font-black uppercase text-slate-800 hover:text-purple-800 cursor-pointer"
                      >
                        <span>NAMA ITEM PRODUK</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-900">
                          {sortOrder === 'asc'
                            ? 'A-Z ↑'
                            : sortOrder === 'desc'
                            ? 'Z-A ↓'
                            : '↕ Sort'}
                        </span>
                      </button>
                    </th>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                      (day) => {
                        const dateObj = new Date(
                          selectedYear,
                          selectedMonth - 1,
                          day
                        );
                        const dayName = DAY_NAMES[dateObj.getDay()];
                        const isWeekend = dayName === 'SAB' || dayName === 'MIN';
                        const isSelectedDay = day === activeDayFromSelectedDate;

                        return (
                          <th
                            key={day}
                            className={`py-2 px-1 border-r border-slate-200 min-w-[44px] ${
                              isSelectedDay
                                ? 'bg-purple-800 text-[#FACC15] font-black'
                                : isWeekend
                                ? 'bg-amber-100 text-amber-900 font-black'
                                : ''
                            }`}
                          >
                            <div className="text-[12px] font-black">{day}</div>
                            <div className="text-[9px] opacity-80 font-semibold">
                              {dayName}
                            </div>
                          </th>
                        );
                      }
                    )}
                    <th className="py-2.5 px-3 border-r border-slate-200 min-w-[75px] bg-amber-100 text-amber-900 font-black">
                      TOTAL ITEM
                    </th>
                    <th className="py-2.5 px-2 w-12 bg-slate-100 text-slate-600">
                      HAPUS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredProductItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={daysInMonth + 4}
                        className="py-10 px-4 text-center text-xs text-slate-400"
                      >
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <span className="italic">
                            Belum ada item produk pada tabel ini. Silakan klik{' '}
                            <strong className="text-purple-800 not-italic">
                              SCAN ITEM BY MISTRAL OCR
                            </strong>{' '}
                            atau klik tombol di bawah untuk menambah baris baru.
                          </span>
                          <button
                            type="button"
                            onClick={handleAddManualItemRow}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center space-x-1.5 shadow-2xs transition cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Tambah Baris Item Pertama</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProductItems.map((item, idx) => {
                      let rowTotal = 0;
                      const isNewlyAdded = lastAddedItemIdRef.current === item.id;
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-amber-50/50 transition ${
                            idx % 2 === 0 ? 'bg-slate-50/40' : 'bg-white'
                          }`}
                        >
                          <td className="py-2 px-2 border-r border-slate-200 font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 text-left font-bold text-slate-900 sticky left-0 bg-inherit z-10 min-w-[245px]">
                            <input
                              type="text"
                              value={item.name}
                              autoFocus={isNewlyAdded}
                              onFocus={(e) => {
                                if (isNewlyAdded) {
                                  e.target.select();
                                  lastAddedItemIdRef.current = null;
                                }
                              }}
                              onChange={(e) => handleRenameItemRow(item.id, e.target.value)}
                              placeholder="Ketik nama item produk..."
                              className="w-full px-2 py-1 rounded-lg border border-transparent hover:border-slate-300 focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-500 text-xs font-bold text-slate-900 outline-hidden transition"
                            />
                            <div className="px-1.5 mt-0.5 flex items-center">
                              <select
                                value={resolveProductItemCategory(item.name, item.category)}
                                onChange={(e) =>
                                  handleCategoryItemRowChange(item.id, e.target.value)
                                }
                                className="text-[10px] font-semibold text-purple-800 bg-transparent hover:bg-purple-50 rounded px-1 py-0.5 outline-hidden cursor-pointer"
                                title="Kategori untuk Submenu Minuman Perkategori"
                              >
                                {BEVERAGE_CATEGORIES.map((catOpt) => (
                                  <option key={catOpt.id} value={catOpt.id}>
                                    {catOpt.shortLabel}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                            (day) => {
                              const val =
                                monthlyProductRecord.dailySales[day]?.[item.id] ||
                                0;
                              rowTotal += val;
                              const isSelectedDay =
                                day === activeDayFromSelectedDate;

                              return (
                                <td
                                  key={day}
                                  className={`py-1 px-1 border-r border-slate-200 ${
                                    isSelectedDay ? 'bg-purple-50/70' : ''
                                  }`}
                                >
                                  <input
                                    type="number"
                                    min="0"
                                    value={val || ''}
                                    onChange={(e) =>
                                      handleProductCellChange(
                                        day,
                                        item.id,
                                        Number(e.target.value)
                                      )
                                    }
                                    className={`w-10 text-center text-[11px] font-bold rounded py-1 focus:outline-hidden focus:ring-1 focus:ring-purple-500 ${
                                      val > 0
                                        ? 'bg-emerald-50 text-emerald-900 font-black border border-emerald-300'
                                        : 'bg-transparent text-slate-400'
                                    }`}
                                    placeholder="-"
                                  />
                                </td>
                              );
                            }
                          )}
                          <td className="py-2 px-3 border-r border-slate-200 font-black text-amber-900 bg-amber-50/70">
                            {rowTotal.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteItemRow(item.id, item.name)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Hapus baris item ini"
                            >
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {filteredProductItems.length > 0 && (
                    <tr className="bg-amber-50/40 border-t border-slate-200">
                      <td colSpan={2} className="py-2 px-3 text-left sticky left-0 bg-amber-50/90 z-10 border-r border-slate-200">
                        <button
                          type="button"
                          onClick={handleAddManualItemRow}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] flex items-center space-x-1.5 shadow-2xs transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Baris Item Baru</span>
                        </button>
                      </td>
                      <td colSpan={daysInMonth + 2} />
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-purple-950 text-white font-black text-[11px]">
                    <td colSpan={2} className="py-3 px-4 text-left uppercase">
                      TOTAL ITEM TERJUAL PER HARI ({selectedCashier?.name || 'KASIR'})
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                      (day) => {
                        const daySum = filteredProductItems.reduce(
                          (acc, it) =>
                            acc +
                            (monthlyProductRecord.dailySales[day]?.[it.id] || 0),
                          0
                        );
                        return (
                          <td
                            key={day}
                            className="py-2.5 px-1 border-r border-purple-800 text-amber-300"
                          >
                            {daySum > 0 ? daySum : '-'}
                          </td>
                        );
                      }
                    )}
                    <td className="py-3 px-3 bg-amber-500 text-slate-950 font-black text-xs">
                      {totalMonthlyItemsSold.toLocaleString('id-ID')}
                    </td>
                    <td className="bg-purple-950" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL KONFIRMASI SIMPAN SHOW KASIR                        */}
      {/* ========================================================= */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-amber-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase">
                  Konfirmasi Simpan Show {activeShow} Kasir
                </h3>
                <p className="text-xs text-slate-500">
                  Kasir: <strong>{selectedCashier?.name}</strong> ({selectedDate})
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Omset Offline Kasir:</span>
                <span className="font-black text-emerald-700">
                  Rp {omsetOffline.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Omset Molling Kasir:</span>
                <span className="font-black text-purple-800">
                  Rp {omsetMolling.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Omset F&amp;B Show {activeShow}:</span>
                <span className="font-black text-slate-900">
                  Rp {(omsetOffline + omsetMolling).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jumlah Bill Kasir:</span>
                <span className="font-black text-slate-900">
                  {bill.toLocaleString('id-ID')} Transaksi
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Penonton Outlet (Auto):</span>
                <span className="font-black text-purple-800">
                  {currentPreviewPenonton.toLocaleString('id-ID')} Penonton
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-600 font-bold">Head / SPH Kasir:</span>
                <span className="font-black text-amber-700">
                  Rp {Math.round(activeShowMetrics.head).toLocaleString('id-ID')} (
                  {activeShowMetrics.achievement.toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveShow}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase cursor-pointer"
              >
                Ya, Simpan &amp; Kunci Show {activeShow}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL SCAN STRUK OMSET KASIR (OCR)                        */}
      {/* ========================================================= */}
      <ScanModal
        isOpen={isScanBillModalOpen}
        onClose={() => setIsScanBillModalOpen(false)}
        onApplyData={handleApplyBillOcrData}
      />

      {/* ========================================================= */}
      {/* MODAL MISTRAL OCR SCANNER ITEM PRODUK HARIAN KASIR        */}
      {/* ========================================================= */}
      {isMistralItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white border border-purple-200 p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#581c87] to-[#7e22ce] text-[#FACC15]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900">
                    Mistral OCR &bull; Scan Penjualan Item Produk Kasir
                  </h3>
                  <p className="text-xs text-slate-500">
                    Otomatis membaca item terjual ke Tabel Excel Harian &amp; membuat baris baru jika ada item baru
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMistralItemModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pengaturan Tanggal Target & Mode Pengisian */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80">
              <div>
                <label className="block text-[10px] font-bold uppercase text-purple-900 mb-1">
                  MASUKKAN KE KOLOM TANGGAL ({MONTH_NAMES[selectedMonth - 1]} {selectedYear})
                </label>
                <select
                  value={scanTargetDay}
                  onChange={(e) => setScanTargetDay(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-white text-xs font-black text-purple-950"
                >
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                    (d) => (
                      <option key={d} value={d}>
                        Tanggal {d} {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-purple-900 mb-1">
                  MODE PENGISIAN ANGKA TABEL
                </label>
                <select
                  value={scanMergeMode}
                  onChange={(e) =>
                    setScanMergeMode(e.target.value as 'add' | 'replace')
                  }
                  className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-white text-xs font-bold text-slate-800"
                >
                  <option value="replace">
                    Ganti / Isi Langsung Nilai pada Tanggal {scanTargetDay}
                  </option>
                  <option value="add">
                    Tambahkan (+ Akumulasi) ke Nilai Tanggal {scanTargetDay}
                  </option>
                </select>
              </div>
            </div>

            {/* Area Upload Foto / PDF Laporan Item POS */}
            <div className="border-2 border-dashed border-purple-300 rounded-2xl p-6 text-center bg-slate-50/70 hover:bg-purple-50/40 transition">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleMistralItemFileUpload}
                className="hidden"
              />
              <div className="flex flex-col items-center space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-700">
                  Upload Foto Struk Item POS Kasir (JPG/PNG) atau Dokumen PDF
                </div>
                <p className="text-[11px] text-slate-500 max-w-md">
                  Mistral OCR akan mendeteksi setiap nama produk beserta Qty penjualannya. Item yang belum ada di tabel akan otomatis dibuatkan baris baru.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-[#581c87] text-[#FACC15] font-black text-xs uppercase tracking-wider shadow-xs hover:brightness-110 cursor-pointer"
                >
                  Pilih File Gambar / PDF
                </button>
                {scanFileName && (
                  <span className="text-[11px] font-semibold text-purple-800">
                    File: {scanFileName}
                  </span>
                )}
              </div>
            </div>

            {/* Loading Indicator */}
            {isScanningItems && (
              <div className="p-5 rounded-2xl bg-purple-950 text-white flex items-center justify-center space-x-3">
                <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
                <span className="text-xs font-bold">
                  Mistral OCR sedang membaca &amp; mengekstrak baris item produk...
                </span>
              </div>
            )}

            {/* Hasil Pembacaan Mistral OCR (Bisa Diedit Sebelum Masuk Tabel) */}
            {!isScanningItems && scannedPreviewItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase text-slate-800 block">
                      Hasil Ekstraksi Mistral OCR ({scannedPreviewItems.length}{' '}
                      Item Terdeteksi)
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      {scanConfidence} &bull; {scanSummary}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setScannedPreviewItems((prev) => [
                        ...prev,
                        {
                          name: '',
                          qty: 1,
                          unit: 'PCS',
                          category: 'F&B Cafe',
                        },
                      ])
                    }
                    className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold text-[11px] cursor-pointer"
                  >
                    + Baris Hasil
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Nama Item Produk</th>
                        <th className="py-2 px-2 w-24 text-center">Qty</th>
                        <th className="py-2 px-2 w-28 text-center">Status Tabel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {scannedPreviewItems.map((it, idx) => {
                        const existsInTable = monthlyProductRecord.items.some(
                          (existing) =>
                            existing.name.trim().toLowerCase() ===
                            it.name.trim().toLowerCase()
                        );
                        return (
                          <tr key={idx}>
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                value={it.name}
                                onChange={(e) => {
                                  const copy = [...scannedPreviewItems];
                                  copy[idx] = { ...copy[idx], name: e.target.value };
                                  setScannedPreviewItems(copy);
                                }}
                                className="w-full px-2 py-1 rounded border border-slate-200 font-bold text-slate-900"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="number"
                                min="0"
                                value={it.qty}
                                onChange={(e) => {
                                  const copy = [...scannedPreviewItems];
                                  copy[idx] = {
                                    ...copy[idx],
                                    qty: Number(e.target.value),
                                  };
                                  setScannedPreviewItems(copy);
                                }}
                                className="w-full px-2 py-1 rounded border border-amber-300 font-black text-center text-slate-900"
                              />
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              {existsInTable ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  Update Baris
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-black text-[10px]">
                                  + Baris Baru
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsMistralItemModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={scannedPreviewItems.length === 0 || isScanningItems}
                onClick={handleApplyMistralItemsToExcel}
                className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 ${
                  scannedPreviewItems.length === 0 || isScanningItems
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>
                  Masukkan ke Tabel Excel (Tgl {scanTargetDay}{' '}
                  {MONTH_NAMES[selectedMonth - 1]})
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

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
