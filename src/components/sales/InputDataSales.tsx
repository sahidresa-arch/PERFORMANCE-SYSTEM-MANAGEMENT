import React, { useState, useEffect, useRef } from 'react';
import { User, Outlet, DailySalesRecord, ShowSaleInput } from '../../types';
import { StorageService } from '../../lib/storage';
import { ScanModal } from '../ocr/ScanModal';
import { ExtractedSalesData } from '../../lib/ocrService';
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
  Info,
  Layers,
} from 'lucide-react';

interface InputDataSalesProps {
  currentUser: User | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export const InputDataSales: React.FC<InputDataSalesProps> = ({
  currentUser,
  selectedDate,
  onDateChange,
}) => {
  const allOutlets = StorageService.getOutlets();
  const userAssignedAreaIds = currentUser?.role === 'area_manager'
    ? (currentUser.assignedAreas && currentUser.assignedAreas.length > 0
        ? currentUser.assignedAreas
        : (currentUser.areaId ? [currentUser.areaId] : []))
    : null;

  const outlets = (currentUser?.role === 'manager' || currentUser?.role === 'cleaner') && currentUser?.outletId
    ? allOutlets.filter((o) => o.id === currentUser.outletId)
    : userAssignedAreaIds && userAssignedAreaIds.length > 0
    ? allOutlets.filter((o) => userAssignedAreaIds.includes(o.areaId))
    : allOutlets;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'area_manager';

  // Manager is locked to their outlet
  const defaultOutletId =
    currentUser?.outletId || (outlets.length > 0 ? outlets[0].id : '');
  const [selectedOutletId, setSelectedOutletId] = useState<string>(defaultOutletId);

  // Active show tab (1 to 5)
  const [activeShow, setActiveShow] = useState<number>(1);

  // Lock and Save states (Independent per show)
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDirtyRef = useRef<boolean>(false);
  const activeShowRef = useRef<number>(1);
  activeShowRef.current = activeShow;

  // Sales record state
  const [dailyRecord, setDailyRecord] = useState<DailySalesRecord>(() =>
    StorageService.getDailySaleByOutletAndDate(defaultOutletId, selectedDate)
  );

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Input fields for active show
  const [omsetCinema, setOmsetCinema] = useState<number>(0);
  const [omsetFnB, setOmsetFnB] = useState<number>(0);
  const [omsetCinemaStr, setOmsetCinemaStr] = useState<string>('0');
  const [omsetFnBStr, setOmsetFnBStr] = useState<string>('0');
  const [bill, setBill] = useState<number>(0);
  const [penonton, setPenonton] = useState<number>(0);

  // Helper to format string with dots
  const formatNumberWithDots = (val: number | string): string => {
    const raw = String(val).replace(/\D/g, '');
    if (!raw) return '0';
    return Number(raw).toLocaleString('id-ID');
  };

  // Notifications
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  const selectedOutlet = outlets.find((o) => o.id === selectedOutletId) || outlets[0];
  const targetHead = selectedOutlet?.targetHead || 0;

  // Sync record when outlet or date changes
  useEffect(() => {
    isDirtyRef.current = false;
    const rec = StorageService.getDailySaleByOutletAndDate(selectedOutletId, selectedDate);
    setDailyRecord(rec);
    loadShowData(rec, activeShow);
  }, [selectedOutletId, selectedDate]);

  // Real-time sync listener when data arrives from Supabase / Web Live / AI Studio
  useEffect(() => {
    const handleStorageUpdate = (e: any) => {
      const evtType = e?.detail?.type || e?.detail?.key;
      if (evtType && evtType !== 'sales' && evtType !== 'outlets' && evtType !== 'all' && evtType !== 'all-reset') return;
      const latestRec = StorageService.getDailySaleByOutletAndDate(selectedOutletId, selectedDate);
      if (!isDirtyRef.current) {
        setDailyRecord(latestRec);
        loadShowData(latestRec, activeShowRef.current);
      } else {
        // User sedang mengetik di activeShow: perbarui show lain tanpa menghapus ketikan aktif
        setDailyRecord((prev) => {
          const mergedShows = latestRec.shows.map((remoteShow) => {
            if (remoteShow.showNumber === activeShowRef.current) {
              const localActive = prev.shows.find((s) => s.showNumber === activeShowRef.current);
              return localActive || remoteShow;
            }
            return remoteShow;
          });
          return { ...latestRec, shows: mergedShows };
        });
      }
    };

    window.addEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('cinema-xxi-storage-update', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [selectedOutletId, selectedDate]);

  // Load show inputs & per-show lock state
  const loadShowData = (rec: DailySalesRecord, showNum: number) => {
    const show = rec.shows.find((s) => s.showNumber === showNum);
    if (show) {
      const cin = show.omsetCinema || 0;
      const fnb = show.omsetFnB || 0;
      setOmsetCinema(cin);
      setOmsetFnB(fnb);
      setOmsetCinemaStr(cin ? formatNumberWithDots(cin) : '0');
      setOmsetFnBStr(fnb ? formatNumberWithDots(fnb) : '0');
      setBill(show.bill || 0);
      setPenonton(show.penonton || 0);
      setIsLocked(Boolean(show.isLocked)); // Load independent lock state for this show
    } else {
      setOmsetCinema(0);
      setOmsetFnB(0);
      setOmsetCinemaStr('0');
      setOmsetFnBStr('0');
      setBill(0);
      setPenonton(0);
      setIsLocked(false);
    }
  };

  const handleCinemaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isDirtyRef.current = true;
    const rawDigits = e.target.value.replace(/\D/g, '');
    const num = rawDigits ? Number(rawDigits) : 0;
    setOmsetCinema(num);
    setOmsetCinemaStr(num ? num.toLocaleString('id-ID') : '');
    updateMemoryShow(activeShow, num, omsetFnB, bill, penonton, isLocked);
  };

  const handleFnBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isDirtyRef.current = true;
    const rawDigits = e.target.value.replace(/\D/g, '');
    const num = rawDigits ? Number(rawDigits) : 0;
    setOmsetFnB(num);
    setOmsetFnBStr(num ? num.toLocaleString('id-ID') : '');
    updateMemoryShow(activeShow, omsetCinema, num, bill, penonton, isLocked);
  };

  const handleTabChange = (showNum: number) => {
    let nextRec = dailyRecord;
    if (!isLocked && isDirtyRef.current) {
      const nowTime = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const updatedShows = dailyRecord.shows.map((s) => {
        if (s.showNumber === activeShow) {
          return {
            ...s,
            omsetCinema,
            omsetFnB,
            bill,
            penonton,
            updatedAt: nowTime,
            isFilled: omsetCinema > 0 || omsetFnB > 0 || bill > 0 || penonton > 0,
            isLocked: isLocked,
          };
        }
        return s;
      });
      nextRec = StorageService.saveDailySale({
        ...dailyRecord,
        outletId: selectedOutletId,
        date: selectedDate,
        isMigrated: false,
        shows: updatedShows,
      });
      setDailyRecord(nextRec);
    }
    isDirtyRef.current = false;
    setActiveShow(showNum);
    loadShowData(nextRec, showNum);
  };

  const updateMemoryShow = (
    showNum: number,
    cin: number,
    fnb: number,
    b: number,
    p: number,
    lockedStatus: boolean
  ) => {
    setDailyRecord((prev) => {
      const updatedShows = prev.shows.map((s) => {
        if (s.showNumber === showNum) {
          return {
            ...s,
            omsetCinema: cin,
            omsetFnB: fnb,
            bill: b,
            penonton: p,
            isFilled: cin > 0 || fnb > 0 || b > 0 || p > 0,
            isLocked: lockedStatus,
          };
        }
        return s;
      });
      return { ...prev, shows: updatedShows };
    });
  };

  // Calculate Net/Inkremental Murni for currently active show
  const prevShowData = activeShow > 1 ? dailyRecord.shows.find((s) => s.showNumber === activeShow - 1) : null;
  const netCinActive = Math.max(0, omsetCinema - (prevShowData?.omsetCinema || 0));
  const netFnbActive = Math.max(0, omsetFnB - (prevShowData?.omsetFnB || 0));

  // Handle OCR fill
  const handleApplyOcrData = (data: ExtractedSalesData) => {
    if (isLocked) return;
    isDirtyRef.current = true;
    const nextCin = data.omsetCinema !== undefined ? data.omsetCinema : omsetCinema;
    const nextFnb = data.omsetFnB !== undefined ? data.omsetFnB : omsetFnB;
    const nextBill = data.bill !== undefined ? data.bill : bill;
    const nextPen = data.penonton !== undefined ? data.penonton : penonton;

    if (data.omsetCinema !== undefined) {
      setOmsetCinema(data.omsetCinema);
      setOmsetCinemaStr(data.omsetCinema ? data.omsetCinema.toLocaleString('id-ID') : '0');
    }
    if (data.omsetFnB !== undefined) {
      setOmsetFnB(data.omsetFnB);
      setOmsetFnBStr(data.omsetFnB ? data.omsetFnB.toLocaleString('id-ID') : '0');
    }
    if (data.bill !== undefined) setBill(data.bill);
    if (data.penonton !== undefined) setPenonton(data.penonton);
    updateMemoryShow(activeShow, nextCin, nextFnb, nextBill, nextPen, isLocked);
  };

  // Toggle lock state ONLY FOR CURRENT SHOW
  const handleToggleLock = () => {
    const nextLocked = !isLocked;
    setIsLocked(nextLocked);
    isDirtyRef.current = false;

    const updatedShows = dailyRecord.shows.map((s) => {
      if (s.showNumber === activeShow) {
        return {
          ...s,
          isLocked: nextLocked,
        };
      }
      return s;
    });

    const newRecord: DailySalesRecord = {
      ...dailyRecord,
      isMigrated: false,
      shows: updatedShows,
    };
    const saved = StorageService.saveDailySale(newRecord);
    setDailyRecord(saved);
  };

  // Save confirmed from modal: LOCKS ONLY ACTIVE SHOW
  const handleConfirmSave = () => {
    setIsConfirmModalOpen(false);
    isDirtyRef.current = false;

    const nowTime = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const updatedShows = dailyRecord.shows.map((s) => {
      if (s.showNumber === activeShow) {
        return {
          ...s,
          omsetCinema,
          omsetFnB,
          bill,
          penonton,
          updatedAt: nowTime,
          isFilled: true,
          isLocked: true, // Independent lock ONLY for this active show
        };
      }
      return s;
    });

    const newRecord: DailySalesRecord = {
      ...dailyRecord,
      outletId: selectedOutletId,
      date: selectedDate,
      isMigrated: false,
      shows: updatedShows,
    };

    const saved = StorageService.saveDailySale(newRecord);
    setDailyRecord(saved);
    setIsLocked(true);

    setShowToast(true);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  // Calculate Net/Inkremental Per Show for Table
  const netShowsList = [1, 2, 3, 4, 5].map((showNum) => {
    const current = dailyRecord.shows.find((x) => x.showNumber === showNum);
    const prev =
      showNum > 1
        ? [...dailyRecord.shows]
            .filter(
              (x) =>
                x.showNumber < showNum &&
                (x.isFilled ||
                  (x.omsetCinema || 0) > 0 ||
                  (x.omsetFnB || 0) > 0 ||
                  (x.penonton || 0) > 0 ||
                  (x.bill || 0) > 0)
            )
            .sort((a, b) => b.showNumber - a.showNumber)[0]
        : null;

    const cumCin = current?.omsetCinema || 0;
    const cumFnb = current?.omsetFnB || 0;
    const cumBill = current?.bill || 0;
    const cumPenonton = current?.penonton || 0;

    const prevCin = prev?.omsetCinema || 0;
    const prevFnb = prev?.omsetFnB || 0;
    const prevBill = prev?.bill || 0;
    const prevPenonton = prev?.penonton || 0;

    const isFilled = Boolean(
      current?.isFilled || cumCin > 0 || cumFnb > 0 || cumPenonton > 0 || cumBill > 0
    );

    // Net Murni Show N = Cumulative Show N - Cumulative Show Sebelumnya
    const netCin = isFilled ? Math.max(0, cumCin - prevCin) : 0;
    const netFnb = isFilled ? Math.max(0, cumFnb - prevFnb) : 0;
    const netBill = isFilled ? Math.max(0, cumBill - prevBill) : 0;
    const netPenonton = isFilled ? Math.max(0, cumPenonton - prevPenonton) : 0;

    const netSph = netPenonton > 0 ? netFnb / netPenonton : 0;
    const gboPercent = netCin > 0 ? (netFnb / netCin) * 100 : 0;
    const dayaSerapPercent = netPenonton > 0 ? (netBill / netPenonton) * 100 : 0;
    const netAt = netBill > 0 ? netFnb / netBill : 0;
    const achievementPercent = targetHead > 0 && netSph > 0 ? (netSph / targetHead) * 100 : 0;
    const selisihRupiah = targetHead > 0 && netPenonton > 0 ? Math.round((netSph - targetHead) * netPenonton) : 0;

    return {
      showNumber: showNum,
      isFilled,
      isLocked: Boolean(current?.isLocked),
      netCin,
      netFnb,
      netBill,
      netPenonton,
      gboPercent,
      netSph,
      dayaSerapPercent,
      netAt,
      achievementPercent,
      selisihRupiah,
      isCapai: netSph >= targetHead && netPenonton > 0,
    };
  });

  // Total Harian = Total dari kelima Show Murni (Show 1 s/d Show 5)
  const totalCinema = netShowsList.reduce((acc, s) => acc + s.netCin, 0);
  const totalFnB = netShowsList.reduce((acc, s) => acc + s.netFnb, 0);
  const totalBill = netShowsList.reduce((acc, s) => acc + s.netBill, 0);
  const totalPenonton = netShowsList.reduce((acc, s) => acc + s.netPenonton, 0);

  const totalDailyMetrics = StorageService.calculateMetrics(
    totalCinema,
    totalFnB,
    totalBill,
    totalPenonton,
    targetHead
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700">
                <CalendarDays className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
                Sesi Input Sales Show Harian
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Input data sales harian POS Cinema XXI (Kunci Per-Show &amp; Otomatis Menghitung Penjualan Murni Per Showtime)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Outlet Selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-1">
                PILIH OUTLET {isAdmin ? '(AKSES ADMIN)' : '(LOCKED)'}
              </label>
              <select
                value={selectedOutletId}
                disabled={!isAdmin}
                onChange={(e) => setSelectedOutletId(e.target.value)}
                className={`text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-2xs transition ${
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

            {/* Date Picker */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-1">
                TANGGAL LAPORAN
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* 5 Show Tab Selector with Individual Lock Status */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
            PILIH JADWAL SHOWTIME YANG INGIN DIINPUT (TIAP SHOW DIKUNCI SECARA MANDIRI):
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[1, 2, 3, 4, 5].map((showNum) => {
              const showData = dailyRecord.shows.find((s) => s.showNumber === showNum);
              const isFilled = showData && (showData.omsetCinema > 0 || showData.omsetFnB > 0 || showData.isFilled);
              const isShowLocked = Boolean(showData?.isLocked);
              const isActive = activeShow === showNum;

              return (
                <button
                  key={showNum}
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
                      <Lock className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-amber-700'}`} />
                    ) : (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isFilled ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      ></span>
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
                    {isShowLocked ? '🔒 Dikunci' : isFilled ? 'Sudah Input' : 'Belum Input'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Show Form Body */}
        <div className="mt-6 p-5 sm:p-6 rounded-2xl border border-amber-200/90 bg-[#faf8f4]">
          {/* Header of Active Show */}
          <div className="flex items-center justify-between pb-3 border-b border-amber-200/80">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-xs">
                #{activeShow}
              </span>
              <h3 className="font-extrabold text-base text-slate-900">Showtime {activeShow}</h3>
              <span className="text-xs text-slate-500 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {dailyRecord.shows.find((s) => s.showNumber === activeShow)?.updatedAt
                    ? `Input tercatat jam ${dailyRecord.shows.find((s) => s.showNumber === activeShow)?.updatedAt}`
                    : 'Jam input otomatis tercatat saat simpan data'}
                </span>
              </span>
            </div>

            {/* Lock Toggle & OCR Scan Buttons */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleToggleLock}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
                  isLocked
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                }`}
                title={isLocked ? "Buka kuncian Show ini" : "Kunci Show ini"}
              >
                {isLocked ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Dikunci (Klik Buka)</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Terbuka (Bisa Edit)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isLocked}
                onClick={() => !isLocked && setIsScanModalOpen(true)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs ${
                  isLocked
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                    : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 cursor-pointer'
                }`}
              >
                <ScanLine className={`w-4 h-4 ${isLocked ? 'text-slate-400' : 'text-amber-700'}`} />
                <span className="hidden sm:inline">Scan Struk (AI OCR)</span>
              </button>
            </div>
          </div>

          {/* 4 Form Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                OMSET CINEMA S/D SHOW {activeShow}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={isLocked}
                  readOnly={isLocked}
                  value={omsetCinemaStr}
                  onChange={handleCinemaChange}
                  placeholder="0"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm font-extrabold transition outline-hidden ${
                    isLocked
                      ? 'bg-[#F3F4F6] text-slate-500 border-slate-200 cursor-not-allowed select-none'
                      : 'bg-white text-slate-900 border-slate-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-200'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1.5">
                OMSET FNB S/D SHOW {activeShow}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={isLocked}
                  readOnly={isLocked}
                  value={omsetFnBStr}
                  onChange={handleFnBChange}
                  placeholder="0"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm font-extrabold transition outline-hidden ${
                    isLocked
                      ? 'bg-[#F3F4F6] text-slate-500 border-slate-200 cursor-not-allowed select-none'
                      : 'bg-white text-slate-900 border-slate-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                TOTAL BILL FNB S/D SHOW {activeShow}
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  disabled={isLocked}
                  readOnly={isLocked}
                  value={bill || ''}
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    const nextBill = Number(e.target.value);
                    setBill(nextBill);
                    updateMemoryShow(activeShow, omsetCinema, omsetFnB, nextBill, penonton, isLocked);
                  }}
                  placeholder="0"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm font-extrabold transition outline-hidden ${
                    isLocked
                      ? 'bg-[#F3F4F6] text-slate-500 border-slate-200 cursor-not-allowed select-none'
                      : 'bg-white text-slate-900 border-slate-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-200'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                TOTAL PENONTON S/D SHOW {activeShow}
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  disabled={isLocked}
                  readOnly={isLocked}
                  value={penonton || ''}
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    const nextPen = Number(e.target.value);
                    setPenonton(nextPen);
                    updateMemoryShow(activeShow, omsetCinema, omsetFnB, bill, nextPen, isLocked);
                  }}
                  placeholder="0"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm font-extrabold transition outline-hidden ${
                    isLocked
                      ? 'bg-[#F3F4F6] text-slate-500 border-slate-200 cursor-not-allowed select-none'
                      : 'bg-white text-slate-900 border-slate-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-200'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Action Save Button: SIMPAN DATA */}
          <div className="mt-5 pt-4 border-t border-amber-200/80 flex items-center justify-between">
            <span className="text-xs text-amber-900 font-bold">
              {isLocked
                ? `🔒 Show ${activeShow} saat ini dikunci. Klik "Terbuka (Bisa Edit)" jika ingin mengubah.`
                : `✏️ Data Show ${activeShow} siap disimpan.`}
            </span>

            <button
              type="button"
              disabled={isLocked}
              onClick={() => {
                if (isLocked) return;
                // Simpan langsung saat tombol SIMPAN DATA diklik agar langsung tersinkron ke Cloud/Device lain
                const nowTime = new Date().toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const updatedShows = dailyRecord.shows.map((s) => {
                  if (s.showNumber === activeShow) {
                    return {
                      ...s,
                      omsetCinema,
                      omsetFnB,
                      bill,
                      penonton,
                      updatedAt: nowTime,
                      isFilled: true,
                      isLocked: s.isLocked || false,
                    };
                  }
                  return s;
                });
                const saved = StorageService.saveDailySale({
                  ...dailyRecord,
                  outletId: selectedOutletId,
                  date: selectedDate,
                  isMigrated: false,
                  shows: updatedShows,
                });
                setDailyRecord(saved);
                isDirtyRef.current = false;
                setIsConfirmModalOpen(true);
              }}
              className={`px-5 py-2.5 rounded-xl font-black text-xs transition flex items-center space-x-2 shadow-md ${
                isLocked
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer scale-[1.01]'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>SIMPAN DATA</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recap Table for All 5 Shows with MURNI (NETT) Show breakdown */}
      <div className="p-6 rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                RINCIAN HASIL PENJUALAN MURNI 5 SHOWTIME ({selectedOutlet?.name})
              </h3>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full whitespace-nowrap">
            Target Head: Rp {targetHead.toLocaleString('id-ID')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="uppercase text-[10px] font-extrabold bg-amber-50/60 border-b border-amber-200/70 text-slate-700">
              <tr>
                <th className="py-3 px-3">SHOW</th>
                <th className="py-3 px-3 text-right">CINEMA (RP)</th>
                <th className="py-3 px-3 text-right">F&amp;B (RP)</th>
                <th className="py-3 px-3 text-center">BILL</th>
                <th className="py-3 px-3 text-center">PENONTON</th>
                <th className="py-3 px-3 text-right text-purple-900">GBO (%)</th>
                <th className="py-3 px-3 text-right text-amber-900">SPH / HEAD (RP)</th>
                <th className="py-3 px-3 text-center text-emerald-900">DAYA SERAP (%)</th>
                <th className="py-3 px-3 text-right text-slate-900">AT (RP)</th>
                <th className="py-3 px-3 text-center text-blue-900">ACHIEVEMENT (%)</th>
                <th className="py-3 px-3 text-right text-emerald-900">SELISIH (RP)</th>
                <th className="py-3 px-3 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {netShowsList.map((s) => {
                const isCurrentActive = activeShow === s.showNumber;

                return (
                  <tr
                    key={s.showNumber}
                    className={`hover:bg-amber-50/30 transition text-slate-800 ${
                      isCurrentActive ? 'bg-amber-50/50 font-bold' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-slate-900 flex items-center space-x-1.5">
                      <span>Show {s.showNumber}</span>
                      {isCurrentActive && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black">
                          AKTIF
                        </span>
                      )}
                    </td>
                    {/* Show Murni (Nett) Values */}
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      Rp {s.netCin.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-800">
                      Rp {s.netFnb.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 text-center">{s.netBill.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">
                      {s.netPenonton.toLocaleString('id-ID')}
                    </td>
                    {/* GBO (%) = (F&B / Cinema) * 100% */}
                    <td className="py-3 px-3 text-right font-extrabold text-purple-900">
                      {s.gboPercent > 0 ? `${s.gboPercent.toFixed(1)}%` : '-'}
                    </td>
                    {/* SPH / HEAD */}
                    <td className="py-3 px-3 text-right font-black text-amber-900">
                      Rp {Math.round(s.netSph).toLocaleString('id-ID')}
                    </td>
                    {/* DAYA SERAP (%) = (Bill / Penonton) * 100% */}
                    <td className="py-3 px-3 text-center font-bold text-emerald-900">
                      {s.dayaSerapPercent > 0 ? `${s.dayaSerapPercent.toFixed(1)}%` : '-'}
                    </td>
                    {/* AT (RP) = F&B / Bill */}
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {s.netAt > 0 ? `Rp ${Math.round(s.netAt).toLocaleString('id-ID')}` : '-'}
                    </td>
                    {/* ACHIEVEMENT (%) = (SPH / Target Head) * 100% */}
                    <td className="py-3 px-3 text-center font-bold text-blue-900">
                      {s.achievementPercent > 0 ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                            s.achievementPercent >= 100
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {s.achievementPercent.toFixed(1)}%
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    {/* SELISIH (RP) = (SPH - Target Head) * Penonton */}
                    <td className="py-3 px-3 text-right font-black">
                      {s.netPenonton > 0 || s.netFnb > 0 ? (
                        <span
                          className={
                            s.selisihRupiah >= 0
                              ? 'text-emerald-700 font-bold'
                              : 'text-rose-700 font-bold'
                          }
                        >
                          {s.selisihRupiah >= 0 ? '+' : ''}
                          Rp {s.selisihRupiah.toLocaleString('id-ID')}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-semibold">-</span>
                      )}
                    </td>
                    {/* STATUS: Capai / Tidak Capai terhadap Target Head */}
                    <td className="py-3 px-3 text-center">
                      {s.netPenonton > 0 || s.netFnb > 0 ? (
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            s.isCapai
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {s.isCapai ? 'Capai' : 'Tidak Capai'}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-semibold">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Daily Total Summary Row displaying LATEST CUMULATIVE POS */}
            <tfoot className="bg-slate-900 text-white font-extrabold uppercase text-xs">
              <tr>
                <td className="py-3.5 px-3">TOTAL LATEST POS AKUMULASI</td>
                <td className="py-3.5 px-3 text-right text-amber-300">
                  Rp {totalCinema.toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 px-3 text-right text-emerald-400">
                  Rp {totalFnB.toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 px-3 text-center">{totalBill.toLocaleString('id-ID')}</td>
                <td className="py-3.5 px-3 text-center text-amber-300">
                  {totalPenonton.toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 px-3 text-right text-purple-300 font-bold">
                  {totalCinema > 0 ? `${((totalFnB / totalCinema) * 100).toFixed(1)}%` : '-'}
                </td>
                <td className="py-3.5 px-3 text-right text-amber-400 font-black text-sm">
                  Rp {Math.round(totalDailyMetrics.head).toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 px-3 text-center text-emerald-300 font-bold">
                  {totalDailyMetrics.dayaSerap}%
                </td>
                <td className="py-3.5 px-3 text-right text-slate-200 font-bold">
                  Rp {Math.round(totalDailyMetrics.at).toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 px-3 text-center text-blue-300 font-black">
                  {totalDailyMetrics.achievement}%
                </td>
                <td className="py-3.5 px-3 text-right font-black">
                  <span className={totalDailyMetrics.selisih >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                    {totalDailyMetrics.selisih >= 0 ? '+' : ''}
                    Rp {Math.round(totalDailyMetrics.selisih).toLocaleString('id-ID')}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-center">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      totalDailyMetrics.head >= targetHead
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {totalDailyMetrics.head >= targetHead ? 'Capai' : 'Tidak Capai'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Save Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl max-w-md w-full p-6 text-slate-800 space-y-4">
            <div className="flex items-center space-x-3 text-amber-800">
              <div className="p-2.5 rounded-2xl bg-amber-100 border border-amber-300">
                <Lock className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Konfirmasi Simpan Data Show {activeShow}
                </h3>
                <p className="text-xs text-slate-500">
                  Hanya Show {activeShow} yang akan dikunci
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5 font-medium">
              <p>
                <strong>Outlet:</strong> {selectedOutlet?.name}
              </p>
              <p>
                <strong>Tanggal:</strong> {selectedDate}
              </p>
              <p>
                <strong>Showtime:</strong> Show {activeShow}
              </p>
              <p>
                <strong>Akumulasi POS s/d Show {activeShow}:</strong> Rp{' '}
                {(omsetCinema + omsetFnB).toLocaleString('id-ID')}
              </p>
              <p className="text-purple-800 font-bold">
                <strong>Penjualan Murni Show {activeShow}:</strong> Rp{' '}
                {(netCinActive + netFnbActive).toLocaleString('id-ID')}
              </p>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Apakah Anda yakin ingin menyimpan dan mengunci data untuk <strong>Show {activeShow}</strong>? Show lainnya tidak akan terkunci.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer shadow-xs"
              >
                Simpan Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center space-x-3 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <div className="text-xs">
            <span className="font-black block text-sm">Data Show {activeShow} Berhasil Disimpan!</span>
            <span>Status Show {activeShow} kini dikunci secara independen.</span>
          </div>
        </div>
      )}

      {/* AI OCR Scan Modal */}
      {isScanModalOpen && (
        <ScanModal
          isOpen={isScanModalOpen}
          onClose={() => setIsScanModalOpen(false)}
          onApplyData={handleApplyOcrData}
        />
      )}
    </div>
  );
};
