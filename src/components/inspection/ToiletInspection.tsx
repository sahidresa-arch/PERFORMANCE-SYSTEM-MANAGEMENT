import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, ToiletInspectionRecord, ToiletChecklist } from '../../types';
import { StorageService } from '../../lib/storage';
import { CHECKLIST_ITEMS } from '../../lib/constants';
import { APAR_EXTRA_OUTLETS } from '../../lib/data/aparExtraOutlets';
import {
  ClipboardCheck,
  Save,
  Check,
  Eye,
  Smile,
  AlertTriangle,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Building2,
  Calendar,
  UserCheck,
  FileText,
  Clock,
  ArrowRight,
  ShieldAlert,
  Wind,
  Layers,
  Box,
  DoorClosed,
  Trash2,
  Bath,
  Droplet,
  Droplets,
  Wrench,
  Lightbulb,
  Filter,
  Cpu,
  Leaf,
  CheckSquare,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  X,
} from 'lucide-react';

interface ToiletInspectionProps {
  currentUser: User | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
  initialMode?: 'dashboard' | 'form';
}

const getChecklistIcon = (key: string) => {
  switch (key) {
    case 'bau': return <Wind className="w-4 h-4 text-amber-600" />;
    case 'lantai': return <Layers className="w-4 h-4 text-blue-600" />;
    case 'dinding': return <Box className="w-4 h-4 text-slate-600" />;
    case 'pintu': return <DoorClosed className="w-4 h-4 text-amber-700" />;
    case 'tSampah': return <Trash2 className="w-4 h-4 text-rose-600" />;
    case 'cermin': return <Sparkles className="w-4 h-4 text-cyan-600" />;
    case 'closet': return <Bath className="w-4 h-4 text-indigo-600" />;
    case 'urinoir': return <Droplet className="w-4 h-4 text-teal-600" />;
    case 'tissu': return <FileText className="w-4 h-4 text-orange-600" />;
    case 'wastafel': return <Bath className="w-4 h-4 text-sky-600" />;
    case 'soap': return <Droplets className="w-4 h-4 text-pink-600" />;
    case 'janitor': return <Wrench className="w-4 h-4 text-slate-700" />;
    case 'lampu': return <Lightbulb className="w-4 h-4 text-yellow-500" />;
    case 'floorDrain': return <Filter className="w-4 h-4 text-purple-600" />;
    case 'calmatic': return <Cpu className="w-4 h-4 text-emerald-600" />;
    case 'calfresh': return <Leaf className="w-4 h-4 text-green-600" />;
    default: return <CheckSquare className="w-4 h-4 text-slate-500" />;
  }
};

const DEFAULT_CHECKLIST: ToiletChecklist = {
  bau: '',
  lantai: '',
  dinding: '',
  pintu: '',
  tSampah: '',
  cermin: '',
  closet: '',
  urinoir: '',
  tissu: '',
  wastafel: '',
  soap: '',
  janitor: '',
  lampu: '',
  floorDrain: '',
  calmatic: '',
  calfresh: '',
};

const normalizeOutletBaseName = (name: string) => {
  const raw = (name || '').trim().toUpperCase();
  if (raw === 'CAFE BTM XXI') return 'BTM XXI BOGOR';
  return raw.replace(/^(?:CAFE|DELUXE)\s+/i, '').trim();
};

const isExcludedFromToiletInspection = (outlet: { id: string; name: string }) => {
  const upperName = (outlet.name || '').toUpperCase();
  return (
    outlet.id === 'hs-aeon-sentul-xxi' ||
    outlet.id === 'hs-margo-city-xxi' ||
    outlet.id === 'premiere-pesona-square-xxi' ||
    upperName.includes('HS AEON SENTUL') ||
    upperName.includes('HS MARGO CITY') ||
    upperName.includes('PREMIERE PESONA SQUARE')
  );
};

export const ToiletInspection: React.FC<ToiletInspectionProps> = ({
  currentUser,
  selectedDate,
  onDateChange,
  initialMode = 'form',
}) => {
  const [viewMode, setViewMode] = useState<'dashboard' | 'form'>(initialMode);
  const areas = useMemo(() => StorageService.getAreas(), []);
  const roleStr = String(currentUser?.role || '').toLowerCase();
  const isManagerOrCleaner = Boolean(
    (roleStr === 'manager' || roleStr === 'cleaner' || roleStr === 'outlet' || roleStr === 'outlet_manager') &&
      currentUser?.outletId
  );
  const hasAssignedAreas =
    Array.isArray(currentUser?.assignedAreas) &&
    currentUser.assignedAreas.length > 0;
  const isAreaScoped = Boolean(
    (roleStr === 'area' || roleStr === 'area_manager') &&
      (hasAssignedAreas || currentUser?.areaId)
  );

  const rawOutlets = useMemo(() => {
    const baseOutlets = StorageService.getOutlets().filter(
      (o) => !isExcludedFromToiletInspection(o)
    );
    if (isManagerOrCleaner || isAreaScoped) {
      return [...baseOutlets].sort((a, b) => a.name.localeCompare(b.name));
    }
    const merged = [...baseOutlets];
    const existingNames = new Set<string>();
    baseOutlets.forEach((o) => {
      existingNames.add((o.name || '').trim().toUpperCase());
      existingNames.add(normalizeOutletBaseName(o.name));
    });
    APAR_EXTRA_OUTLETS.forEach((extra) => {
      const upper = extra.name.trim().toUpperCase();
      if (!existingNames.has(upper) && !isExcludedFromToiletInspection(extra)) {
        merged.push(extra);
      }
    });
    return merged.sort((a, b) => a.name.localeCompare(b.name));
  }, [isManagerOrCleaner, isAreaScoped]);

  const outlets = useMemo(() => {
    if (isManagerOrCleaner) {
      return rawOutlets.filter((o) => o.id === currentUser?.outletId);
    }
    if (isAreaScoped) {
      if (hasAssignedAreas && currentUser?.assignedAreas) {
        return rawOutlets.filter((o) =>
          currentUser.assignedAreas!.includes(o.areaId)
        );
      }
      if (currentUser?.areaId) {
        return rawOutlets.filter((o) => o.areaId === currentUser.areaId);
      }
    }
    return rawOutlets;
  }, [
    isManagerOrCleaner,
    isAreaScoped,
    hasAssignedAreas,
    rawOutlets,
    currentUser?.outletId,
    currentUser?.areaId,
    currentUser?.assignedAreas,
  ]);

  // Counts per Area (sama seperti APAR: Semua Area, Area Bogor 1 & Depok, Area Bogor 2, Belum Masuk Area)
  const areaCounts = useMemo(() => {
    const knownAreaIds = new Set(areas.map((a) => a.id));
    let unassigned = 0;
    const byAreaId: Record<string, number> = {};
    areas.forEach((a) => {
      byAreaId[a.id] = 0;
    });
    outlets.forEach((o) => {
      if (o.areaId && knownAreaIds.has(o.areaId)) {
        byAreaId[o.areaId] = (byAreaId[o.areaId] || 0) + 1;
      } else {
        unassigned += 1;
      }
    });
    return {
      all: outlets.length,
      byAreaId,
      unassigned,
    };
  }, [outlets, areas]);

  // Filters for dashboard & form
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [selectedOutletFilter, setSelectedOutletFilter] = useState<string>(
    isManagerOrCleaner ? currentUser!.outletId! : ''
  );
  const [dashboardPage, setDashboardPage] = useState<number>(1);
  const [dashboardPageSize, setDashboardPageSize] = useState<number>(20);
  const [formAreaFilter, setFormAreaFilter] = useState<string>('');

  // Tab for Notification Outlet Status (default null / tertutup agar dashboard tetap ringkas)
  const [notifTab, setNotifTab] = useState<'pending' | 'partial' | 'complete' | null>(null);
  const [notifSearch, setNotifSearch] = useState<string>('');

  // Tab & search untuk pengelompokan Temuan Kerusakan Point R (default null / tertutup)
  const [selectedDamageGroup, setSelectedDamageGroup] = useState<string | null>(null);
  const [damageSearch, setDamageSearch] = useState<string>('');

  // Form State
  const defaultOutletId =
    (currentUser?.outletId && rawOutlets.some((o) => o.id === currentUser.outletId)
      ? currentUser.outletId
      : '') || (outlets.length > 0 ? outlets[0].id : '');
  const [formOutletId, setFormOutletId] = useState<string>(defaultOutletId);
  const [formToiletType, setFormToiletType] = useState<'Pria' | 'Wanita'>('Pria');

  const formFilteredOutlets = useMemo(() => {
    const knownAreaIds = new Set(areas.map((a) => a.id));
    if (!formAreaFilter || isManagerOrCleaner || isAreaScoped) {
      return outlets;
    }
    if (formAreaFilter === 'unassigned') {
      return outlets.filter((o) => !o.areaId || !knownAreaIds.has(o.areaId));
    }
    return outlets.filter((o) => o.areaId === formAreaFilter);
  }, [outlets, areas, formAreaFilter, isManagerOrCleaner, isAreaScoped]);

  // Track if user explicitly clicked an already-completed Show to review/edit it
  const manualShowRef = React.useRef<string | null>(null);

  // All inspections for selected date (initialized immediately from fast in-memory cache)
  const [inspections, setInspections] = useState<ToiletInspectionRecord[]>(() =>
    StorageService.getInspections().filter(
      (ins: ToiletInspectionRecord) =>
        ins.date === selectedDate &&
        ins.outletId !== 'hs-aeon-sentul-xxi' &&
        ins.outletId !== 'hs-margo-city-xxi' &&
        ins.outletId !== 'premiere-pesona-square-xxi'
    )
  );

  // Load inspections from storage
  const reloadInspections = useCallback(() => {
    const list = StorageService.getInspections().filter(
      (ins: ToiletInspectionRecord) =>
        ins.date === selectedDate &&
        ins.outletId !== 'hs-aeon-sentul-xxi' &&
        ins.outletId !== 'hs-margo-city-xxi' &&
        ins.outletId !== 'premiere-pesona-square-xxi'
    );
    setInspections(list);
  }, [selectedDate]);

  // O(1) Lookup Map for completed shows on selectedDate so clicking B/K/R or typing never scans arrays or localStorage
  const completedShowMap = useMemo(() => {
    const map = new Map<string, ToiletInspectionRecord>();
    for (const ins of inspections) {
      const isComplete =
        ins.status === 'Sudah Lapor' ||
        CHECKLIST_ITEMS.every((ci) => {
          const val = ins.checklist?.[ci.key as keyof ToiletChecklist];
          return val === 'B' || val === 'K' || val === 'R';
        });
      if (isComplete) {
        const key = `${ins.outletId}-${ins.date}-show${Number(ins.showNumber)}-${ins.type}`;
        map.set(key, ins);
      }
    }
    return map;
  }, [inspections]);

  // Sequential Show Helpers: O(1) lookup via completedShowMap
  const getShowRecord = (
    showNum: number,
    outletId: string = formOutletId,
    toiletType: 'Pria' | 'Wanita' = formToiletType
  ): ToiletInspectionRecord | undefined => {
    const targetShow = Number(showNum);
    const key = `${outletId}-${selectedDate}-show${targetShow}-${toiletType}`;
    const fromMap = completedShowMap.get(key);
    if (fromMap) return fromMap;

    // Fallback to in-memory StorageService cache only if state hasn't flushed yet
    return StorageService.getInspections().find(
      (ins: ToiletInspectionRecord) =>
        ins.outletId === outletId &&
        ins.date === selectedDate &&
        ins.type === toiletType &&
        Number(ins.showNumber) === targetShow &&
        (ins.status === 'Sudah Lapor' ||
          CHECKLIST_ITEMS.every((ci) => {
            const val = ins.checklist?.[ci.key as keyof ToiletChecklist];
            return val === 'B' || val === 'K' || val === 'R';
          }))
    );
  };

  const isShowCompleted = (
    showNum: number,
    outletId: string = formOutletId,
    toiletType: 'Pria' | 'Wanita' = formToiletType
  ): boolean => {
    return Boolean(getShowRecord(showNum, outletId, toiletType));
  };

  const getFirstIncompleteShow = (
    outletId: string = formOutletId,
    toiletType: 'Pria' | 'Wanita' = formToiletType
  ): number => {
    for (let s = 1; s <= 5; s++) {
      if (!isShowCompleted(s, outletId, toiletType)) {
        return s;
      }
    }
    return 5;
  };

  const isShowUnlocked = (
    showNum: number,
    outletId: string = formOutletId,
    toiletType: 'Pria' | 'Wanita' = formToiletType
  ): boolean => {
    if (showNum <= 1) return true;
    for (let prev = 1; prev < showNum; prev++) {
      if (!isShowCompleted(prev, outletId, toiletType)) {
        return false;
      }
    }
    return true;
  };

  const [formShowNumber, setFormShowNumber] = useState<number>(() =>
    getFirstIncompleteShow(defaultOutletId, 'Pria')
  );
  const [inspectorName, setInspectorName] = useState('');
  const [notes, setNotes] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Checklist items mapping
  const [checklist, setChecklist] = useState<ToiletChecklist>(DEFAULT_CHECKLIST);

  const selectedOutlet = useMemo(
    () =>
      outlets.find((o) => o.id === formOutletId) ||
      outlets[0] || { id: '', name: 'Cinema XXI', areaId: '' },
    [outlets, formOutletId]
  );

  const [isSyncingLive, setIsSyncingLive] = useState(false);

  const handleManualInspectionSync = async () => {
    setIsSyncingLive(true);
    try {
      const m = await import('../../lib/supabase');
      await m.pushLocalInspectionsForOutletDate(formOutletId || undefined, selectedDate);
      await m.mergeRemoteInspectionsToLocal(false);
      await m.pullAllRemoteToLocal(true);
      reloadInspections();
    } catch {
      // ignore
    } finally {
      setIsSyncingLive(false);
    }
  };

  useEffect(() => {
    reloadInspections();
    setIsSyncingLive(true);
    import('../../lib/supabase')
      .then(async (m) => {
        try {
          const changed = await m.mergeRemoteInspectionsToLocal(false);
          if (changed) reloadInspections();
        } finally {
          setIsSyncingLive(false);
        }
      })
      .catch(() => {
        setIsSyncingLive(false);
      });

    const runLiveInspectionSync = () => {
      if (document.visibilityState !== 'visible') return;
      import('../../lib/supabase')
        .then((m) => {
          m.mergeRemoteInspectionsToLocal(true).then((changed) => {
            if (changed) reloadInspections();
          });
        })
        .catch(() => {});
    };

    const handleReconnectOrVisible = () => {
      if (document.visibilityState !== 'visible') return;
      import('../../lib/supabase')
        .then(async (m) => {
          const changed = await m.mergeRemoteInspectionsToLocal(false);
          if (changed) reloadInspections();
        })
        .catch(() => {});
    };

    const liveInterval = setInterval(runLiveInspectionSync, 8000);

    const handleStorageUpdate = (e: any) => {
      const type = e?.detail?.type;
      if (!type || type === 'inspection' || type === 'all-reset') {
        reloadInspections();
      }
    };

    window.addEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    window.addEventListener('online', handleReconnectOrVisible);
    document.addEventListener('visibilitychange', handleReconnectOrVisible);
    return () => {
      clearInterval(liveInterval);
      window.removeEventListener('cinema-xxi-storage-update', handleStorageUpdate);
      window.removeEventListener('online', handleReconnectOrVisible);
      document.removeEventListener('visibilitychange', handleReconnectOrVisible);
    };
  }, [selectedDate, formOutletId, reloadInspections]);

  // Guard Check: Check if an inspection already exists for this exact combination
  const existingRecord = getShowRecord(formShowNumber, formOutletId, formToiletType);
  const currentShowUnlocked = isShowUnlocked(formShowNumber, formOutletId, formToiletType);

  const completedCountPria = [1, 2, 3, 4, 5].filter((s) =>
    isShowCompleted(s, formOutletId, 'Pria')
  ).length;
  const completedCountWanita = [1, 2, 3, 4, 5].filter((s) =>
    isShowCompleted(s, formOutletId, 'Wanita')
  ).length;

  // Pastikan setiap buka form, ganti Outlet/Tipe Toilet/Tanggal, atau saat data sinkronisasi masuk:
  // Show otomatis melompat ke Show pertama yang BELUM diceklis (misal Show 1 sudah selesai -> otomatis ke Show 2),
  // KECUALI jika user memang sengaja mengklik tombol Show yang sudah selesai untuk melihat/mengeditnya.
  useEffect(() => {
    const manualKey = `${formOutletId}|${selectedDate}|${formToiletType}|${formShowNumber}`;
    if (!isShowUnlocked(formShowNumber, formOutletId, formToiletType)) {
      const nextValidShow = getFirstIncompleteShow(formOutletId, formToiletType);
      manualShowRef.current = null;
      if (nextValidShow !== formShowNumber) {
        setFormShowNumber(nextValidShow);
      }
      return;
    }

    if (
      isShowCompleted(formShowNumber, formOutletId, formToiletType) &&
      manualShowRef.current !== manualKey
    ) {
      const nextIncomplete = getFirstIncompleteShow(formOutletId, formToiletType);
      if (nextIncomplete !== formShowNumber) {
        setFormShowNumber(nextIncomplete);
      }
    }
  }, [formOutletId, selectedDate, formToiletType, inspections, formShowNumber]);

  // Reset checklist ketika berpindah Outlet, Tanggal, Tipe Toilet, atau Nomor Show
  useEffect(() => {
    setErrorMessage('');
    const rec = getShowRecord(formShowNumber, formOutletId, formToiletType);
    if (rec) {
      setChecklist(rec.checklist || DEFAULT_CHECKLIST);
      setInspectorName(rec.inspectorName || '');
      setNotes(rec.notes || '');
    } else {
      setChecklist(DEFAULT_CHECKLIST);
      setInspectorName('');
      setNotes('');
    }
  }, [formOutletId, selectedDate, formToiletType, formShowNumber]);

  // Jika data sinkronisasi baru tiba untuk Show yang sedang dibuka, muat datanya tanpa menghapus ketikan pada Show yang belum selesai
  useEffect(() => {
    const rec = getShowRecord(formShowNumber, formOutletId, formToiletType);
    if (rec) {
      setChecklist(rec.checklist || DEFAULT_CHECKLIST);
      setInspectorName(rec.inspectorName || '');
      setNotes(rec.notes || '');
    }
  }, [inspections]);

  const handleSelectShowSequential = (targetShow: number) => {
    if (!isShowUnlocked(targetShow, formOutletId, formToiletType)) {
      const firstMissing = getFirstIncompleteShow(formOutletId, formToiletType);
      manualShowRef.current = null;
      setErrorMessage(
        `Show ${targetShow} masih terkunci! Wajib melakukan ceklis secara berurutan. Silakan selesaikan ceklis Show ${firstMissing} (${formToiletType}) terlebih dahulu.`
      );
      setFormShowNumber(firstMissing);
      setTimeout(() => {
        setErrorMessage('');
      }, 4500);
      return;
    }
    setErrorMessage('');
    if (isShowCompleted(targetShow, formOutletId, formToiletType)) {
      manualShowRef.current = `${formOutletId}|${selectedDate}|${formToiletType}|${targetShow}`;
    } else {
      manualShowRef.current = null;
    }
    setFormShowNumber(targetShow);
  };

  const handleStatusChange = (
    key: keyof ToiletChecklist,
    val: 'B' | 'K' | 'R' | ''
  ) => {
    if (!isShowUnlocked(formShowNumber, formOutletId, formToiletType)) {
      const firstMissing = getFirstIncompleteShow(formOutletId, formToiletType);
      setErrorMessage(
        `Tidak dapat mengisi Show ${formShowNumber} karena Show ${firstMissing} belum dilakukan ceklis!`
      );
      setFormShowNumber(firstMissing);
      return;
    }
    setChecklist((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleFillAllClean = () => {
    if (!isShowUnlocked(formShowNumber, formOutletId, formToiletType)) {
      const firstMissing = getFirstIncompleteShow(formOutletId, formToiletType);
      setErrorMessage(
        `Tidak dapat mengisi Show ${formShowNumber} karena Show ${firstMissing} belum dilakukan ceklis!`
      );
      setFormShowNumber(firstMissing);
      return;
    }
    const allClean: ToiletChecklist = {
      bau: 'B',
      lantai: 'B',
      dinding: 'B',
      pintu: 'B',
      tSampah: 'B',
      cermin: 'B',
      closet: 'B',
      urinoir: 'B',
      tissu: 'B',
      wastafel: 'B',
      soap: 'B',
      janitor: 'B',
      lampu: 'B',
      floorDrain: 'B',
      calmatic: 'B',
      calfresh: 'B',
    };
    setChecklist(allClean);
    setErrorMessage('');
  };

  const handleSaveInspection = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validasi Urutan Show (Wajib berurutan Show 1 -> 2 -> 3 -> 4 -> 5)
    if (!isShowUnlocked(formShowNumber, formOutletId, formToiletType)) {
      const firstMissing = getFirstIncompleteShow(formOutletId, formToiletType);
      setErrorMessage(
        `Gagal menyimpan! Show ${firstMissing} (${formToiletType}) belum dilakukan ceklis. Wajib melakukan ceklis Show secara berurutan.`
      );
      setFormShowNumber(firstMissing);
      return;
    }

    // 2. Validasi seluruh 16 titik pengecekan wajib dipilih (B / K / R) agar ceklis sah
    const uncheckedItems = CHECKLIST_ITEMS.filter((ci) => {
      const val = checklist[ci.key as keyof ToiletChecklist];
      return val !== 'B' && val !== 'K' && val !== 'R';
    });

    if (uncheckedItems.length > 0) {
      const labels = uncheckedItems
        .slice(0, 4)
        .map((ci) => (ci.key === 'urinoir' && formToiletType === 'Wanita' ? 'Dispenser FHU' : ci.label))
        .join(', ');
      setErrorMessage(
        `Mohon lengkapi semua 16 titik ceklis pada Show ${formShowNumber} terlebih dahulu! (${uncheckedItems.length} titik belum dipilih: ${labels}${uncheckedItems.length > 4 ? ', dll' : ''}).`
      );
      return;
    }

    setErrorMessage('');

    const record: ToiletInspectionRecord = {
      id: `${formOutletId}-${selectedDate}-show${formShowNumber}-${formToiletType}`,
      date: selectedDate,
      outletId: formOutletId,
      showNumber: formShowNumber,
      type: formToiletType,
      inspectorName: inspectorName || 'Cinema Staff',
      checklist: checklist,
      notes: notes,
      status: 'Sudah Lapor',
      time: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const savedRecord = StorageService.saveInspection(record);
    const updatedInspections = StorageService.getInspections();
    setInspections(updatedInspections);

    // Auto switch to next incomplete show after saving (deterministic check on updatedInspections)
    manualShowRef.current = null;
    const currentShow = Number(formShowNumber);
    const checkCompletedWithSaved = (showNum: number): boolean => {
      if (showNum === currentShow) return true;
      const found = updatedInspections.find(
        (i) =>
          i.outletId === formOutletId &&
          i.date === selectedDate &&
          Number(i.showNumber) === showNum &&
          i.type === formToiletType
      );
      return found
        ? found.status === 'Sudah Lapor' ||
            CHECKLIST_ITEMS.every((ci) => {
              const val = found.checklist?.[ci.key as keyof ToiletChecklist];
              return val === 'B' || val === 'K' || val === 'R';
            })
        : false;
    };

    const nextIncomplete =
      [1, 2, 3, 4, 5].find((s) => !checkCompletedWithSaved(s)) ?? 5;
    const allCompletedNow = [1, 2, 3, 4, 5].every((s) => checkCompletedWithSaved(s));

    if (!allCompletedNow) {
      setFormShowNumber(nextIncomplete as 1 | 2 | 3 | 4 | 5);
      setStatusMessage(
        `Laporan Show ${currentShow} (${formToiletType}) Berhasil Disimpan (${savedRecord.time})! Otomatis lanjut ke Show ${nextIncomplete} yang siap diceklis.`
      );
    } else {
      setFormShowNumber(5);
      setStatusMessage(
        `Laporan Show ${currentShow} (${formToiletType}) Berhasil Disimpan (${savedRecord.time})! Semua Show (1-5) untuk Toilet ${formToiletType} telah selesai.`
      );
    }

    setTimeout(() => {
      setStatusMessage('');
    }, 4000);
  };

  const areaScopedOutlets = useMemo(() => {
    const knownAreaIds = new Set(areas.map((a) => a.id));
    if (!selectedAreaId) return outlets;
    if (selectedAreaId === 'unassigned') {
      return outlets.filter((o) => !o.areaId || !knownAreaIds.has(o.areaId));
    }
    return outlets.filter((o) => o.areaId === selectedAreaId);
  }, [outlets, areas, selectedAreaId]);

  const filteredOutlets = useMemo(
    () =>
      areaScopedOutlets.filter((o) => {
        const matchOutlet = selectedOutletFilter ? o.id === selectedOutletFilter : true;
        return matchOutlet;
      }),
    [areaScopedOutlets, selectedOutletFilter]
  );

  useEffect(() => {
    setDashboardPage(1);
  }, [selectedAreaId, selectedOutletFilter, dashboardPageSize]);

  const dashboardTotalPages = Math.max(
    1,
    Math.ceil(filteredOutlets.length / dashboardPageSize)
  );
  const safeDashboardPage = Math.min(dashboardPage, dashboardTotalPages);
  const dashboardStartIndex = (safeDashboardPage - 1) * dashboardPageSize;
  const paginatedDashboardOutlets = useMemo(
    () =>
      filteredOutlets.slice(
        dashboardStartIndex,
        dashboardStartIndex + dashboardPageSize
      ),
    [filteredOutlets, dashboardStartIndex, dashboardPageSize]
  );

  const selectedAreaLabel = useMemo(() => {
    if (!selectedAreaId) return 'Semua Area';
    if (selectedAreaId === 'unassigned') return 'Belum Masuk Area';
    return areas.find((a) => a.id === selectedAreaId)?.name || 'Area Terpilih';
  }, [selectedAreaId, areas]);

  // Calculate detailed compliance per outlet (mengikuti Filter Area / Outlet yang sedang aktif)
  const outletsCompliance = useMemo(
    () =>
      filteredOutlets.map((o) => {
        const outletInspections = inspections.filter((ins) => ins.outletId === o.id);
        const completedShowsPria = [1, 2, 3, 4, 5].filter((sNum) =>
          outletInspections.some((ins) => ins.type === 'Pria' && ins.showNumber === sNum)
        ).length;
        const completedShowsWanita = [1, 2, 3, 4, 5].filter((sNum) =>
          outletInspections.some((ins) => ins.type === 'Wanita' && ins.showNumber === sNum)
        ).length;

        // Shows that have at least one inspection
        const uniqueShowsSubmitted = [1, 2, 3, 4, 5].filter((sNum) =>
          outletInspections.some((ins) => ins.showNumber === sNum)
        ).length;

        const totalSubmittedInspections = outletInspections.length;
        const hasAnyR = outletInspections.some((ins) =>
          Object.values(ins.checklist || {}).includes('R')
        );

        return {
          outlet: o,
          totalSubmittedInspections,
          uniqueShowsSubmitted,
          completedShowsPria,
          completedShowsWanita,
          hasAnyR,
          isUnreported: totalSubmittedInspections === 0,
          isPartial: totalSubmittedInspections > 0 && uniqueShowsSubmitted < 5,
          isComplete: uniqueShowsSubmitted === 5,
        };
      }),
    [filteredOutlets, inspections]
  );

  const unreportedList = useMemo(
    () => outletsCompliance.filter((item) => item.isUnreported),
    [outletsCompliance]
  );
  const partialList = useMemo(
    () => outletsCompliance.filter((item) => item.isPartial),
    [outletsCompliance]
  );
  const completeList = useMemo(
    () => outletsCompliance.filter((item) => item.isComplete),
    [outletsCompliance]
  );

  const compliancePercentage = Math.round(
    ((filteredOutlets.length - unreportedList.length) / (filteredOutlets.length || 1)) * 100
  );

  // Filter laporan sesuai hak akses outlet (khusus Manager/Cleaner hanya menampilkan outlet masing-masing)
  const scopedInspections = useMemo(() => {
    const allowedOutletIds = new Set(filteredOutlets.map((o) => o.id));
    return inspections.filter((ins) => {
      if (isManagerOrCleaner && currentUser?.outletId) {
        return ins.outletId === currentUser.outletId;
      }
      return allowedOutletIds.has(ins.outletId);
    });
  }, [filteredOutlets, inspections, isManagerOrCleaner, currentUser?.outletId]);

  // Reports with 'R' (Rusak / Temuan) & summary metrics (memoized)
  const { reportsWithR, totalLaporan, countBersih, countKurang, countRusak } = useMemo(() => {
    const rList = scopedInspections.filter((ins) => {
      const values = Object.values(ins.checklist || {});
      return values.includes('R');
    });
    let bersih = 0;
    let kurang = 0;
    let rusak = 0;
    for (const ins of scopedInspections) {
      const values = Object.values(ins.checklist || {});
      const hasR = values.includes('R');
      const hasK = values.includes('K');
      if (hasR) {
        rusak++;
      } else if (hasK) {
        kurang++;
      } else if (values.length > 0 && values.every((v) => v === 'B')) {
        bersih++;
      }
    }
    return {
      reportsWithR: rList,
      totalLaporan: scopedInspections.length,
      countBersih: bersih,
      countKurang: kurang,
      countRusak: rusak,
    };
  }, [scopedInspections]);

  // Pengelompokan Point R (Rusak) berdasarkan jenis/kualifikasi item kerusakan
  const damageQualificationGroups = useMemo(() => {
    const groupMap = new Map<
      string,
      {
        key: string;
        label: string;
        iconKey: string;
        records: ToiletInspectionRecord[];
      }
    >();

    reportsWithR.forEach((rRecord) => {
      CHECKLIST_ITEMS.forEach((ci) => {
        if (rRecord.checklist?.[ci.key as keyof ToiletChecklist] !== 'R') {
          return;
        }
        const isFemaleDispenser =
          ci.key === 'urinoir' && rRecord.type === 'Wanita';
        const groupKey = isFemaleDispenser ? 'dispenser_fhu' : ci.key;
        const groupLabel = isFemaleDispenser ? 'Dispenser FHU' : ci.label;
        const existing = groupMap.get(groupKey);
        if (existing) {
          existing.records.push(rRecord);
        } else {
          groupMap.set(groupKey, {
            key: groupKey,
            label: groupLabel,
            iconKey: ci.key,
            records: [rRecord],
          });
        }
      });
    });

    return Array.from(groupMap.values()).sort(
      (a, b) =>
        b.records.length - a.records.length || a.label.localeCompare(b.label)
    );
  }, [reportsWithR]);

  // Function to navigate directly to form with selected outlet (automatically picks valid sequential show)
  const handleDirectInspect = (
    outletId: string,
    preferredShow?: number,
    toiletType: 'Pria' | 'Wanita' = formToiletType
  ) => {
    if (!formFilteredOutlets.some((o) => o.id === outletId)) {
      setFormAreaFilter('');
    }
    setFormOutletId(outletId);
    setFormToiletType(toiletType);
    const firstIncomplete = getFirstIncompleteShow(outletId, toiletType);
    const targetShow =
      preferredShow && isShowUnlocked(preferredShow, outletId, toiletType)
        ? preferredShow
        : firstIncomplete;
    if (preferredShow && isShowCompleted(targetShow, outletId, toiletType)) {
      manualShowRef.current = `${outletId}|${selectedDate}|${toiletType}|${targetShow}`;
    } else {
      manualShowRef.current = null;
    }
    setFormShowNumber(targetShow);
    setErrorMessage('');
    setViewMode('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Top Main Navigation Header Bar */}
      <div className="p-5 sm:p-6 rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/20">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
                Form Inspeksi Toilet
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                HAPPY ROOM CARE
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Standar Kebersihan, Sanitasi &amp; Pemantauan Fasilitas Cinema XXI
            </p>
          </div>
        </div>

        {/* View Switcher Tabs + Live Sync Button */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleManualInspectionSync}
            disabled={isSyncingLive}
            title="Sinkronkan Card Inspection Antar-Device Sekarang"
            className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-extrabold transition cursor-pointer flex items-center space-x-1.5 shadow-2xs"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <RotateCcw className={`w-3.5 h-3.5 text-emerald-700 ${isSyncingLive ? 'animate-spin' : ''}`} />
            <span>{isSyncingLive ? 'MENYINKRONKAN...' : 'SINKRONKAN SHOW'}</span>
          </button>

          <div className="flex items-center p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200 text-xs font-bold space-x-1">
            <button
              type="button"
              onClick={() => setViewMode('form')}
              className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'form'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>FORM INSPEKSI TOILET</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('dashboard')}
              className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'dashboard'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>HASIL LAPORAN TOILET</span>
            </button>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center space-x-2 animate-in fade-in shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs font-bold flex items-center space-x-2.5 animate-in fade-in shadow-sm">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* VIEW 1: FORM INSPEKSI TOILET */}
      {viewMode === 'form' && (
        <div className="space-y-6">
          {/* Happy Room Care Hero Header */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white shadow-md shadow-amber-500/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <span className="p-3 rounded-2xl bg-white/20 backdrop-blur-md text-white">
                  <Smile className="w-6 h-6" />
                </span>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wide">
                    HAPPY ROOM CARE INSPECTION
                  </h2>
                  <p className="text-xs text-amber-100 italic font-medium mt-0.5">
                    &quot;Creating a Clean, Fresh and Comfortable Guest Experience&quot;
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-xs font-bold flex items-center space-x-1.5 border border-white/20">
                  <Building2 className="w-3.5 h-3.5 text-amber-200" />
                  <span>{selectedOutlet.name}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-xs font-bold flex items-center space-x-1.5 border border-white/20">
                  <Calendar className="w-3.5 h-3.5 text-amber-200" />
                  <span>{selectedDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Double Input Guard Alert Banner if record exists */}
          {existingRecord && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-start space-x-3">
                <span className="p-2 rounded-xl bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                  <Lock className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-xs uppercase text-rose-800">
                      PERHATIAN: DATA LAPORAN SUDAH PERNAH DIISI
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-200 text-rose-900">
                      DUPLICATE GUARD
                    </span>
                  </div>
                  <p className="text-xs text-rose-700 mt-1">
                    Laporan Inspeksi Toilet untuk <strong>{selectedOutlet.name}</strong> -{' '}
                    <strong>{formToiletType === 'Pria' ? '🚹 Toilet Pria' : '🚺 Toilet Wanita'}</strong> -{' '}
                    <strong>Show {formShowNumber}</strong> pada tanggal <strong>{selectedDate}</strong> sudah
                    diisi oleh <strong>{existingRecord.inspectorName}</strong> (Jam:{' '}
                    {existingRecord.time || '10:00'}).
                  </p>
                  <p className="text-[11px] text-rose-600 font-semibold mt-0.5">
                    * Menyimpan formulir ini akan <strong>memperbarui (update)</strong> data laporan sebelumnya
                    tanpa membuat data ganda.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setChecklist(existingRecord.checklist || DEFAULT_CHECKLIST);
                  setNotes(existingRecord.notes || '');
                }}
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 shadow-sm cursor-pointer transition flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Muat Data Tersebut</span>
              </button>
            </div>
          )}

          {/* Main Inspection Form Card */}
          <div className="p-6 sm:p-8 rounded-3xl border border-slate-200/90 bg-white text-slate-800 shadow-sm transition">
            <form onSubmit={handleSaveInspection} className="space-y-6">
              {/* Form Metadata Selection Grid */}
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 ${
                  !isManagerOrCleaner && !isAreaScoped ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
                } gap-4 p-5 rounded-2xl bg-amber-50/50 border border-amber-200/80`}
              >
                {!isManagerOrCleaner && !isAreaScoped && (
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1.5 flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-rose-500" />
                      <span>FILTER AREA</span>
                    </label>
                    <select
                      value={formAreaFilter}
                      onChange={(e) => {
                        const nextArea = e.target.value;
                        setFormAreaFilter(nextArea);
                        const knownAreaIds = new Set(areas.map((a) => a.id));
                        const nextList = !nextArea
                          ? outlets
                          : nextArea === 'unassigned'
                          ? outlets.filter((o) => !o.areaId || !knownAreaIds.has(o.areaId))
                          : outlets.filter((o) => o.areaId === nextArea);
                        if (
                          nextList.length > 0 &&
                          !nextList.some((o) => o.id === formOutletId)
                        ) {
                          const nextOutlet = nextList[0].id;
                          manualShowRef.current = null;
                          setFormOutletId(nextOutlet);
                          setFormShowNumber(
                            getFirstIncompleteShow(nextOutlet, formToiletType)
                          );
                        }
                      }}
                      className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-xs"
                    >
                      <option value="">Semua Area ({areaCounts.all})</option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({areaCounts.byAreaId[a.id] || 0})
                        </option>
                      ))}
                      <option value="unassigned">
                        Belum Masuk Area ({areaCounts.unassigned})
                      </option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1.5 flex items-center space-x-1">
                    <Building2 className="w-3 h-3 text-amber-600" />
                    <span>OUTLET BIOSKOP</span>
                  </label>
                  <select
                    value={formOutletId}
                    onChange={(e) => {
                      const nextOutlet = e.target.value;
                      manualShowRef.current = null;
                      setFormOutletId(nextOutlet);
                      setFormShowNumber(getFirstIncompleteShow(nextOutlet, formToiletType));
                    }}
                    disabled={Boolean(isManagerOrCleaner)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-xs disabled:bg-slate-100 disabled:text-slate-600"
                  >
                    {formFilteredOutlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1.5 flex items-center space-x-1">
                    <span>TIPE TOILET (STATUS PER TIPE)</span>
                  </label>
                  <select
                    value={formToiletType}
                    onChange={(e) => {
                      const nextType = e.target.value as 'Pria' | 'Wanita';
                      manualShowRef.current = null;
                      setFormToiletType(nextType);
                      setFormShowNumber(getFirstIncompleteShow(formOutletId, nextType));
                    }}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-xs"
                  >
                    <option value="Pria">
                      🚹 Toilet Pria ({completedCountPria}/5 Show Selesai)
                    </option>
                    <option value="Wanita">
                      🚺 Toilet Wanita ({completedCountWanita}/5 Show Selesai)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1.5 flex items-center space-x-1">
                    <span>PILIHAN SHOW (WAJIB BERURUTAN 1 S/D 5)</span>
                  </label>
                  <select
                    value={formShowNumber}
                    onChange={(e) => handleSelectShowSequential(Number(e.target.value))}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-xs"
                  >
                    {[1, 2, 3, 4, 5].map((sh) => {
                      const completed = isShowCompleted(sh, formOutletId, formToiletType);
                      const unlocked = isShowUnlocked(sh, formOutletId, formToiletType);
                      return (
                        <option key={sh} value={sh} disabled={!unlocked}>
                          {completed
                            ? `✅ Show ${sh} (Sudah Ceklis)`
                            : unlocked
                            ? `👉 Show ${sh} (Giliran Ceklis)`
                            : `🔒 Show ${sh} (Wajib Ceklis Show ${sh - 1} Dulu)`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1.5 flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-amber-600" />
                    <span>PERIODE / TANGGAL</span>
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      manualShowRef.current = null;
                      onDateChange(e.target.value);
                    }}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-amber-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1.5 flex items-center space-x-1">
                    <UserCheck className="w-3 h-3 text-amber-600" />
                    <span>NAMA INSPECTOR / PENGAWAS</span>
                  </label>
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    placeholder="Masukkan Nama Inspector..."
                    required
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1.5 flex items-center space-x-1">
                    <span>CATATAN KHUSUS / TEMUAN (OPTIONAL)</span>
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Lampu cubicle 2 redup, sabun habis di sink 1..."
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Sequential Show Stepper Cards (Show 1 -> Show 2 -> Show 3 -> Show 4 -> Show 5) */}
              <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                      Urutan Wajib Ceklis Show ({formToiletType === 'Pria' ? '🚹 Toilet Pria' : '🚺 Toilet Wanita'})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        manualShowRef.current = null;
                        setFormToiletType('Pria');
                        setFormShowNumber(getFirstIncompleteShow(formOutletId, 'Pria'));
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition cursor-pointer ${
                        formToiletType === 'Pria'
                          ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      🚹 Pria: {completedCountPria}/5 Show
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        manualShowRef.current = null;
                        setFormToiletType('Wanita');
                        setFormShowNumber(getFirstIncompleteShow(formOutletId, 'Wanita'));
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition cursor-pointer ${
                        formToiletType === 'Wanita'
                          ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      🚺 Wanita: {completedCountWanita}/5 Show
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {[1, 2, 3, 4, 5].map((sh) => {
                    const completed = isShowCompleted(sh, formOutletId, formToiletType);
                    const unlocked = isShowUnlocked(sh, formOutletId, formToiletType);
                    const isActive = formShowNumber === sh;
                    const rec = getShowRecord(sh, formOutletId, formToiletType);

                    return (
                      <button
                        key={sh}
                        type="button"
                        onClick={() => handleSelectShowSequential(sh)}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between relative ${
                          isActive
                            ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20 ring-2 ring-amber-300 cursor-pointer'
                            : completed
                            ? 'bg-emerald-50/80 text-emerald-950 border-emerald-300 hover:bg-emerald-100/70 cursor-pointer'
                            : unlocked
                            ? 'bg-white text-slate-800 border-amber-300 hover:border-amber-500 cursor-pointer'
                            : 'bg-slate-100/80 text-slate-400 border-slate-200 opacity-75 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-xs font-black uppercase tracking-tight">
                            SHOW {sh}
                          </span>
                          {completed ? (
                            <CheckCircle2
                              className={`w-4 h-4 shrink-0 ${
                                isActive ? 'text-white' : 'text-emerald-600'
                              }`}
                            />
                          ) : unlocked ? (
                            <Clock
                              className={`w-4 h-4 shrink-0 ${
                                isActive ? 'text-white' : 'text-amber-500'
                              }`}
                            />
                          ) : (
                            <Lock className="w-4 h-4 shrink-0 text-slate-400" />
                          )}
                        </div>

                        <div className="text-[10px] font-bold leading-tight">
                          {completed ? (
                            <span className={isActive ? 'text-amber-100' : 'text-emerald-700'}>
                              ✓ Sudah Ceklis ({rec?.time || 'Selesai'})
                            </span>
                          ) : unlocked ? (
                            <span className={isActive ? 'text-white' : 'text-amber-700'}>
                              ● Giliran Ceklis
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              🔒 Wajib Ceklis Show {sh - 1}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Explanation Legend Bar */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                      Keterangan Status Penilaian:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-300 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>B = BERSIH / BAIK</span>
                      </span>
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-extrabold border border-amber-300 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>K = KURANG BERSIH</span>
                      </span>
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 font-extrabold border border-rose-300 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span>R = RUSAK / TEMUAN</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleFillAllClean}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] flex items-center space-x-1.5 shadow-2xs transition cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Set Semua Bersih (B)</span>
                  </button>
                </div>
              </div>

              {/* 16 Checkpoints Matrix Cards Layout with DROPDOWN inputs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>
                      16 Titik Pengecekan Sanitasi &amp; Kebersihan Toilet — SHOW {formShowNumber}
                    </span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                    Wajib pilih status (B / K / R) pada seluruh 16 titik untuk membuka Show berikutnya
                  </span>
                </div>

                {/* Horizontal Grid container for all 16 checklist items */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 lg:grid-cols-8 xl:grid-cols-16 gap-2.5">
                  {CHECKLIST_ITEMS.map((item) => {
                    const itemKey = item.key as keyof ToiletChecklist;
                    const currentVal = checklist[itemKey] ?? '';

                    return (
                      <div
                        key={item.key}
                        className={`p-2.5 rounded-2xl border text-center transition flex flex-col justify-between ${
                          !currentShowUnlocked
                            ? 'bg-slate-100 border-slate-200 opacity-60'
                            : currentVal === 'B'
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : currentVal === 'K'
                            ? 'bg-amber-50/50 border-amber-300'
                            : currentVal === 'R'
                            ? 'bg-rose-50/50 border-rose-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-center mb-1.5">
                            <span className="p-1.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs shrink-0 flex items-center justify-center">
                              {getChecklistIcon(item.key)}
                            </span>
                          </div>
                          <h4
                            className="text-xs font-black text-slate-900 leading-tight mb-2 truncate"
                            title={item.key === 'urinoir' && formToiletType === 'Wanita' ? 'Dispenser FHU' : item.label}
                          >
                            {item.key === 'urinoir' && formToiletType === 'Wanita' ? 'Dispenser FHU' : item.label}
                          </h4>
                        </div>

                        {/* Dropdown Select for B, K, R with default empty */}
                        <div className="mt-1">
                          <select
                            value={currentVal}
                            disabled={!currentShowUnlocked}
                            onChange={(e) =>
                              handleStatusChange(itemKey, e.target.value as 'B' | 'K' | 'R' | '')
                            }
                            className={`w-full text-xs font-black px-2 py-1.5 rounded-xl border transition cursor-pointer shadow-2xs text-center disabled:cursor-not-allowed ${
                              currentVal === 'B'
                                ? 'bg-emerald-600 text-white border-emerald-700 focus:ring-emerald-500'
                                : currentVal === 'K'
                                ? 'bg-amber-500 text-slate-950 border-amber-600 focus:ring-amber-500'
                                : currentVal === 'R'
                                ? 'bg-rose-600 text-white border-rose-700 focus:ring-rose-500'
                                : 'bg-white text-slate-400 border-slate-300 focus:ring-amber-500'
                            }`}
                          >
                            <option value="" className="bg-white text-slate-400 font-bold">
                              - Pilih -
                            </option>
                            <option value="B" className="bg-white text-emerald-800 font-bold">
                              B (Bersih)
                            </option>
                            <option value="K" className="bg-white text-amber-800 font-bold">
                              K (Kurang)
                            </option>
                            <option value="R" className="bg-white text-rose-800 font-bold">
                              R (Rusak)
                            </option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewMode('dashboard')}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
                >
                  Lihat Hasil Laporan
                </button>

                <button
                  type="submit"
                  disabled={!currentShowUnlocked}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 disabled:from-slate-300 disabled:to-slate-400 text-white text-xs font-black uppercase tracking-wider flex items-center space-x-2 shadow-md shadow-amber-500/25 active:scale-[0.99] transition cursor-pointer disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 text-white" />
                  <span>
                    {existingRecord
                      ? `PERBARUI SHOW ${formShowNumber} & LANJUT`
                      : `SIMPAN SHOW ${formShowNumber} & BUKA SHOW BERIKUTNYA`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 2: HASIL LAPORAN TOILET (DASHBOARD REKAP) */}
      {viewMode === 'dashboard' && (
        <div className="space-y-6">
          {/* NOTIFIKASI OUTLET BELUM MENGERJAKAN CEKLIS TOILET HARI INI */}
          {unreportedList.length > 0 || partialList.length > 0 ? (
            <div className="p-5 sm:p-6 rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/90 via-white to-amber-100/40 text-slate-800 shadow-xs space-y-4 transition">
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-4">
                <div className="flex items-start sm:items-center space-x-3">
                  <span className="p-3 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20 shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </span>
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <h4 className="font-black text-sm uppercase tracking-tight text-slate-900">
                        NOTIFIKASI OUTLET BELUM MENGERJAKAN CEKLIS TOILET HARI INI
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-black border border-amber-300">
                        {unreportedList.length} OUTLET PENDING
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Tanggal Laporan:{' '}
                      <strong className="text-slate-900 font-extrabold">{selectedDate}</strong> &bull; Filter Area:{' '}
                      <strong>{selectedAreaLabel}</strong> &bull; Total:{' '}
                      <strong>{filteredOutlets.length} Outlet</strong>
                    </p>
                  </div>
                </div>

                {/* Compliance Rate Box */}
                <div className="flex items-center space-x-3 bg-white px-4 py-2.5 rounded-2xl border border-amber-200 shadow-2xs self-start sm:self-auto shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">
                      Tingkat Kepatuhan Area
                    </span>
                    <span className="text-xs font-black text-slate-900">
                      {filteredOutlets.length - unreportedList.length} dari {filteredOutlets.length} Outlet ({compliancePercentage}%)
                    </span>
                  </div>
                  <div
                    className={`w-11 h-11 rounded-xl border flex items-center justify-center font-black text-xs ${
                      compliancePercentage >= 80
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                        : compliancePercentage >= 50
                        ? 'bg-amber-100 border-amber-300 text-amber-900'
                        : 'bg-rose-100 border-rose-300 text-rose-800'
                    }`}
                  >
                    {compliancePercentage}%
                  </div>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-slate-600">
                  <span className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Progress Pelaporan Ceklis Sanitasi Toilet</span>
                  </span>
                  <span>
                    {completeList.length} Lengkap (5/5) &bull; {partialList.length} Sebagian &bull;{' '}
                    {unreportedList.length} Belum Mengisi
                  </span>
                </div>
                <div className="w-full h-3 bg-amber-200/60 rounded-full overflow-hidden p-0.5 border border-amber-300/80">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500 shadow-2xs"
                    style={{ width: `${compliancePercentage}%` }}
                  />
                </div>
              </div>

              {/* Filter Subtabs for Notification Section (klik untuk buka/tutup daftar outlet) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNotifSearch('');
                      setNotifTab((prev) => (prev === 'pending' ? null : 'pending'));
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center space-x-1.5 ${
                      notifTab === 'pending'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Belum Ada Laporan ({unreportedList.length})</span>
                    {notifTab === 'pending' ? (
                      <ChevronUp className="w-3.5 h-3.5 opacity-90" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNotifSearch('');
                      setNotifTab((prev) => (prev === 'partial' ? null : 'partial'));
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center space-x-1.5 ${
                      notifTab === 'partial'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Laporan Sebagian ({partialList.length})</span>
                    {notifTab === 'partial' ? (
                      <ChevronUp className="w-3.5 h-3.5 opacity-90" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNotifSearch('');
                      setNotifTab((prev) => (prev === 'complete' ? null : 'complete'));
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center space-x-1.5 ${
                      notifTab === 'complete'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Lengkap 5 Show ({completeList.length})</span>
                    {notifTab === 'complete' ? (
                      <ChevronUp className="w-3.5 h-3.5 opacity-90" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                    )}
                  </button>
                </div>

                {notifTab !== null ? (
                  <button
                    type="button"
                    onClick={() => {
                      setNotifTab(null);
                      setNotifSearch('');
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 transition cursor-pointer flex items-center space-x-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Tutup Daftar</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-800/80">
                    Klik tombol status di sebelah kiri untuk melihat daftar outlet
                  </span>
                )}
              </div>

              {/* Grid Cards for Selected Filter Tab (hanya tampil ketika salah satu tombol diklik) */}
              {notifTab !== null && (() => {
                const q = notifSearch.trim().toLowerCase();
                const activeList =
                  notifTab === 'pending'
                    ? unreportedList
                    : notifTab === 'partial'
                    ? partialList
                    : completeList;
                const filteredActiveList = q
                  ? activeList.filter((item) =>
                      item.outlet.name.toLowerCase().includes(q)
                    )
                  : activeList;

                return (
                  <div className="pt-2 border-t border-amber-200/70 space-y-3 animate-in fade-in duration-150">
                    {activeList.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="relative w-full sm:w-64">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={notifSearch}
                            onChange={(e) => setNotifSearch(e.target.value)}
                            placeholder="Cari nama outlet di daftar ini..."
                            className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold bg-white border border-amber-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                          />
                          {notifSearch && (
                            <button
                              type="button"
                              onClick={() => setNotifSearch('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-600">
                          Menampilkan {filteredActiveList.length} dari {activeList.length} Outlet
                        </span>
                      </div>
                    )}

                    <div className="max-h-[340px] overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {filteredActiveList.length === 0 ? (
                        <div className="col-span-full p-4 rounded-2xl bg-white/80 border border-amber-200 text-slate-700 text-xs font-bold flex items-center justify-center space-x-2 text-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            {q
                              ? `Tidak ada outlet yang cocok dengan "${notifSearch}".`
                              : notifTab === 'pending'
                              ? 'Hebat! Tidak ada outlet yang belum melapor sama sekali hari ini.'
                              : notifTab === 'partial'
                              ? 'Tidak ada outlet dengan status laporan sebagian.'
                              : 'Belum ada outlet yang menyelesaikan seluruh 5 show hari ini.'}
                          </span>
                        </div>
                      ) : (
                        filteredActiveList.map((item) => {
                          const areaName =
                            areas.find((a) => a.id === item.outlet.areaId)?.name ||
                            'Belum Masuk Area';
                          const nextPendingShow =
                            notifTab === 'pending'
                              ? 1
                              : notifTab === 'partial'
                              ? Math.min(item.uniqueShowsSubmitted + 1, 5)
                              : 5;

                          return (
                            <div
                              key={item.outlet.id}
                              onClick={() =>
                                handleDirectInspect(item.outlet.id, nextPendingShow)
                              }
                              className={`p-3.5 rounded-2xl transition cursor-pointer flex items-center justify-between gap-3 group ${
                                notifTab === 'complete'
                                  ? 'bg-emerald-50/60 border border-emerald-200 hover:border-emerald-400 hover:shadow-xs'
                                  : notifTab === 'partial'
                                  ? 'bg-white border border-amber-200 hover:border-amber-500 hover:shadow-xs'
                                  : 'bg-white border border-slate-200 hover:border-amber-500 hover:shadow-xs'
                              }`}
                              title={
                                notifTab === 'complete'
                                  ? 'Klik untuk melihat data laporan outlet ini'
                                  : notifTab === 'partial'
                                  ? `Klik untuk melanjutkan Show ${nextPendingShow}`
                                  : 'Klik untuk langsung mengisi ceklis outlet ini'
                              }
                            >
                              <div className="min-w-0 flex-1">
                                <h5
                                  className={`font-extrabold text-slate-900 text-xs truncate transition ${
                                    notifTab === 'complete'
                                      ? 'group-hover:text-emerald-800'
                                      : 'group-hover:text-amber-700'
                                  }`}
                                >
                                  {item.outlet.name}
                                </h5>
                                <span className="text-[10px] text-slate-500 font-semibold block mt-0.5 truncate">
                                  {areaName}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 shrink-0">
                                {notifTab === 'pending' && (
                                  <>
                                    <span className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black">
                                      0 / 5 Show
                                    </span>
                                    <span className="p-1.5 rounded-lg bg-amber-500 text-white group-hover:scale-105 transition">
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </span>
                                  </>
                                )}
                                {notifTab === 'partial' && (
                                  <>
                                    <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black">
                                      {item.uniqueShowsSubmitted} / 5 Show
                                    </span>
                                    <span className="p-1.5 rounded-lg bg-slate-800 text-white group-hover:scale-105 transition">
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </span>
                                  </>
                                )}
                                {notifTab === 'complete' && (
                                  <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black flex items-center space-x-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>5 / 5 Show</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* Celebration Banner when 100% of Outlets have Completed Inspection */
            <div className="p-5 sm:p-6 rounded-3xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-emerald-100/50 text-emerald-950 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in transition">
              <div className="flex items-center space-x-3.5">
                <span className="p-3 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </span>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-extrabold text-sm uppercase tracking-tight text-emerald-950">
                      🎉 SEMUA OUTLET TELAH MENGERJAKAN LAPORAN INSPEKSI TOILET HARI INI
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-black border border-emerald-300">
                      100% LENGKAP
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-1 font-medium">
                    Seluruh <strong>{filteredOutlets.length} outlet</strong> ({selectedAreaLabel})
                    telah menyelesaikan laporan inspeksi toilet pada tanggal <strong>{selectedDate}</strong>.
                  </p>
                </div>
              </div>
              <span className="px-3.5 py-2 rounded-xl bg-emerald-200 text-emerald-900 font-extrabold text-xs border border-emerald-300 shrink-0 self-start sm:self-auto">
                Area Sanitasi Prima
              </span>
            </div>
          )}
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                TOTAL LAPORAN MASUK
              </span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-2xl font-black text-slate-900">{totalLaporan}</span>
                <span className="text-xs font-bold text-slate-500">Laporan</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-emerald-200/90 bg-emerald-50/50 shadow-xs">
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                STATUS BERSIH SEMUANNYA (100% B)
              </span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-2xl font-black text-emerald-700">{countBersih}</span>
                <span className="text-xs font-bold text-emerald-600">Sesi Show</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-amber-200/90 bg-amber-50/50 shadow-xs">
              <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider block">
                ADA CATATAN KURANG (K)
              </span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-2xl font-black text-amber-700">{countKurang}</span>
                <span className="text-xs font-bold text-amber-800">Sesi Show</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-rose-200/90 bg-rose-50/50 shadow-xs">
              <span className="text-[10px] font-black text-rose-900 uppercase tracking-wider block">
                ADA PERBAIKAN / RUSAK (R)
              </span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-2xl font-black text-rose-700">{countRusak}</span>
                <span className="text-xs font-bold text-rose-800">Sesi Show</span>
              </div>
            </div>
          </div>

          {/* Warning Error Banner if any checklist item has 'R' (Rusak) — Terkelompok & Buka/Tutup */}
          {reportsWithR.length > 0 && (
            <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 shadow-sm animate-in fade-in space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5 text-rose-800 font-extrabold text-xs uppercase tracking-wide">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>⚠️ LAPORAN TEMUAN KERUSAKAN (POINT R - RUSAK)</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[11px] font-black border border-rose-300">
                    {reportsWithR.length} SESI SHOW
                  </span>
                </div>
                {selectedDamageGroup !== null ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDamageGroup(null);
                      setDamageSearch('');
                    }}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-rose-800 hover:text-rose-950 bg-white hover:bg-rose-100 border border-rose-200 transition cursor-pointer flex items-center space-x-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Tutup Daftar</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-rose-700/90">
                    Klik kualifikasi item di bawah untuk melihat daftar outlet yang rusak
                  </span>
                )}
              </div>

              <p className="text-xs text-rose-700 font-medium">
                Admin / Management Alert: Ditemukan peralatan/kondisi toilet bermasalah yang dikelompokkan berdasarkan jenis item agar perbaikan lebih terarah.
              </p>

              {/* Tombol Kualifikasi Kerusakan (klik untuk buka/tutup) */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setDamageSearch('');
                    setSelectedDamageGroup((prev) =>
                      prev === '__all__' ? null : '__all__'
                    );
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center space-x-1.5 ${
                    selectedDamageGroup === '__all__'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white text-rose-900 hover:bg-rose-100/80 border border-rose-200'
                  }`}
                >
                  <AlertTriangle
                    className={`w-3.5 h-3.5 ${
                      selectedDamageGroup === '__all__' ? 'text-white' : 'text-rose-600'
                    }`}
                  />
                  <span>Semua Temuan ({reportsWithR.length})</span>
                  {selectedDamageGroup === '__all__' ? (
                    <ChevronUp className="w-3.5 h-3.5 opacity-90" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  )}
                </button>

                {damageQualificationGroups.map((grp) => {
                  const isActive = selectedDamageGroup === grp.key;
                  return (
                    <button
                      key={grp.key}
                      type="button"
                      onClick={() => {
                        setDamageSearch('');
                        setSelectedDamageGroup((prev) =>
                          prev === grp.key ? null : grp.key
                        );
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center space-x-1.5 ${
                        isActive
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white text-slate-800 hover:bg-rose-100/70 border border-rose-200'
                      }`}
                    >
                      <span
                        className={`inline-flex items-center justify-center rounded-md p-0.5 ${
                          isActive ? 'bg-white/95' : ''
                        }`}
                      >
                        {getChecklistIcon(grp.iconKey)}
                      </span>
                      <span>
                        {grp.label} ({grp.records.length})
                      </span>
                      {isActive ? (
                        <ChevronUp className="w-3.5 h-3.5 opacity-90" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Daftar Kartu Temuan (hanya terbuka saat kualifikasi dipilih) */}
              {selectedDamageGroup !== null && (() => {
                const activeGroupObj =
                  selectedDamageGroup === '__all__'
                    ? null
                    : damageQualificationGroups.find(
                        (g) => g.key === selectedDamageGroup
                      );
                const sourceRecords = activeGroupObj
                  ? activeGroupObj.records
                  : reportsWithR;
                const q = damageSearch.trim().toLowerCase();
                const filteredDamageRecords = q
                  ? sourceRecords.filter((rec) => {
                      const oName = (
                        outlets.find((o) => o.id === rec.outletId)?.name ||
                        rec.outletId
                      ).toLowerCase();
                      return oName.includes(q);
                    })
                  : sourceRecords;

                return (
                  <div className="pt-3 border-t border-rose-200 space-y-3 animate-in fade-in duration-150">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-rose-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={damageSearch}
                          onChange={(e) => setDamageSearch(e.target.value)}
                          placeholder="Cari nama outlet di temuan ini..."
                          className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold bg-white border border-rose-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                        />
                        {damageSearch && (
                          <button
                            type="button"
                            onClick={() => setDamageSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-rose-800">
                        {activeGroupObj ? `Kategori: ${activeGroupObj.label} • ` : ''}
                        Menampilkan {filteredDamageRecords.length} dari {sourceRecords.length}{' '}
                        Sesi Show
                      </span>
                    </div>

                    <div className="max-h-[340px] overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredDamageRecords.length === 0 ? (
                        <div className="col-span-full p-4 rounded-xl bg-white border border-rose-200 text-rose-800 text-xs font-bold text-center">
                          Tidak ada outlet temuan rusak yang cocok dengan &quot;{damageSearch}&quot;.
                        </div>
                      ) : (
                        filteredDamageRecords.map((rRecord) => {
                          const outletObj = outlets.find((o) => o.id === rRecord.outletId);
                          const outletName = outletObj?.name || rRecord.outletId;
                          const areaName =
                            areas.find((a) => a.id === outletObj?.areaId)?.name ||
                            'Belum Masuk Area';
                          const damagedItems = CHECKLIST_ITEMS.filter(
                            (ci) => rRecord.checklist?.[ci.key as keyof ToiletChecklist] === 'R'
                          ).map((ci) =>
                            ci.key === 'urinoir' && rRecord.type === 'Wanita'
                              ? 'Dispenser FHU'
                              : ci.label
                          );

                          return (
                            <div
                              key={`${selectedDamageGroup}_${rRecord.id}`}
                              onClick={() =>
                                handleDirectInspect(
                                  rRecord.outletId,
                                  rRecord.showNumber,
                                  rRecord.type
                                )
                              }
                              className="p-3.5 rounded-xl bg-white border border-rose-200 hover:border-rose-400 hover:shadow-xs text-xs shadow-2xs space-y-1.5 transition cursor-pointer group"
                              title="Klik untuk membuka/mengedit laporan Show ini"
                            >
                              <div className="flex items-start justify-between gap-2 font-black text-slate-900">
                                <div className="min-w-0">
                                  <div className="truncate group-hover:text-rose-700 transition">
                                    {outletName} ({rRecord.type === 'Pria' ? '🚹 Pria' : '🚺 Wanita'})
                                  </div>
                                  <div className="text-[10px] font-semibold text-slate-500 truncate">
                                    {areaName}
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-300 shrink-0">
                                  Show {rRecord.showNumber}
                                </span>
                              </div>
                              <div className="text-slate-700">
                                <span className="font-bold text-rose-700">Point Rusak (R): </span>
                                <span className="font-extrabold text-rose-900 underline">
                                  {damagedItems.join(', ') || 'Item Terkait'}
                                </span>
                              </div>
                              {rRecord.notes && (
                                <p className="text-slate-500 text-[11px] italic bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                  Catatan: &quot;{rRecord.notes}&quot;
                                </p>
                              )}
                              <p className="text-[10px] text-slate-400 text-right">
                                Pelapor: {rRecord.inspectorName} ({rRecord.time || '10:00'})
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Filter Bar */}
          <div className="p-4 rounded-2xl border border-slate-200/90 bg-white text-slate-800 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                  FILTER AREA
                </label>
                <select
                  value={selectedAreaId}
                  onChange={(e) => {
                    const nextArea = e.target.value;
                    setSelectedAreaId(nextArea);
                    if (selectedOutletFilter) {
                      const outletObj = outlets.find((o) => o.id === selectedOutletFilter);
                      const knownAreaIds = new Set(areas.map((a) => a.id));
                      const stillInArea =
                        !nextArea ||
                        (nextArea === 'unassigned'
                          ? !outletObj?.areaId || !knownAreaIds.has(outletObj.areaId)
                          : outletObj?.areaId === nextArea);
                      if (!stillInArea) {
                        setSelectedOutletFilter('');
                      }
                    }
                  }}
                  disabled={Boolean(isManagerOrCleaner || isAreaScoped)}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:border-amber-400 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">Semua Area ({areaCounts.all})</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({areaCounts.byAreaId[a.id] || 0})
                    </option>
                  ))}
                  {!isAreaScoped && (
                    <option value="unassigned">
                      Belum Masuk Area ({areaCounts.unassigned})
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                  FILTER OUTLET
                </label>
                <select
                  value={selectedOutletFilter}
                  onChange={(e) => setSelectedOutletFilter(e.target.value)}
                  disabled={Boolean(isManagerOrCleaner)}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:border-amber-400 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {!isManagerOrCleaner && (
                    <option value="">Semua Outlet ({areaScopedOutlets.length})</option>
                  )}
                  {areaScopedOutlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                  FILTER TANGGAL
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:border-amber-400"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAreaId('');
                    setSelectedOutletFilter(isManagerOrCleaner ? currentUser!.outletId! : '');
                  }}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
                >
                  Bersihkan Filter
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="p-6 rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
                  <ClipboardCheck className="w-4 h-4" />
                </span>
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
                  HASIL MONITORING LAPORAN INSPEKSI TOILET PER SHOW
                </h3>
              </div>

              <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  TAMPILKAN:
                </span>
                <select
                  value={dashboardPageSize}
                  onChange={(e) => setDashboardPageSize(Number(e.target.value))}
                  className="text-xs font-extrabold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value={20}>20 Outlet</option>
                  <option value={50}>50 Outlet</option>
                  <option value={100}>100 Outlet</option>
                  <option value={9999}>Semua ({filteredOutlets.length})</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="uppercase text-[10px] font-black border-b border-amber-200 bg-amber-50/80 text-slate-800">
                  <tr>
                    <th className="py-3 px-3">OUTLET</th>
                    <th className="py-3 px-3">AREA</th>
                    <th className="py-3 px-3">TANGGAL</th>
                    <th className="py-3 px-3">TIPE TOILET</th>
                    <th className="py-3 px-2 text-center">SHOW 1</th>
                    <th className="py-3 px-2 text-center">SHOW 2</th>
                    <th className="py-3 px-2 text-center">SHOW 3</th>
                    <th className="py-3 px-2 text-center">SHOW 4</th>
                    <th className="py-3 px-2 text-center">SHOW 5</th>
                    <th className="py-3 px-3 text-center">STATUS LAPORAN</th>
                    <th className="py-3 px-3 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedDashboardOutlets.map((o) => {
                    const areaName =
                      areas.find((a) => a.id === o.areaId)?.name || 'Belum Masuk Area';
                    return (['Pria', 'Wanita'] as const).map((toiletType) => {
                      // Calculate completed show count (out of 5)
                      const completedShowsCount = [1, 2, 3, 4, 5].filter((sNum) =>
                        inspections.some(
                          (ins: ToiletInspectionRecord) =>
                            ins.outletId === o.id &&
                            ins.type === toiletType &&
                            ins.showNumber === sNum
                        )
                      ).length;

                      const hasAnyR = inspections.some(
                        (ins: ToiletInspectionRecord) =>
                          ins.outletId === o.id &&
                          ins.type === toiletType &&
                          Object.values(ins.checklist || {}).includes('R')
                      );

                      return (
                        <tr
                          key={`${o.id}-${toiletType}`}
                          className="hover:bg-amber-50/30 transition text-slate-800"
                        >
                          <td className="py-3 px-3 font-extrabold text-slate-900">
                            <div className="flex items-center space-x-1.5">
                              <span>{o.name}</span>
                              {hasAnyR && (
                                <span
                                  title="Ada Temuan Rusak (R)"
                                  className="p-0.5 rounded-full bg-rose-100 text-rose-600"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-500 truncate max-w-[140px]">
                            {areaName}
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-bold">{selectedDate}</td>
                          <td className="py-3 px-3 font-semibold">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                toiletType === 'Pria'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {toiletType === 'Pria' ? '🚹 Pria' : '🚺 Wanita'}
                            </span>
                          </td>

                          {/* Show 1 - Show 5 Columns: Tanda Ceklis (✓) jika sudah diceklis, Tanda Strip (-) jika belum */}
                          {[1, 2, 3, 4, 5].map((sNum) => {
                            const showInsp = getShowRecord(sNum, o.id, toiletType);
                            const hasSubmitted = Boolean(showInsp);
                            const hasR = showInsp && Object.values(showInsp.checklist || {}).includes('R');
                            const unlocked = isShowUnlocked(sNum, o.id, toiletType);

                            return (
                              <td key={sNum} className="py-3 px-2 text-center font-black">
                                {hasSubmitted ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDirectInspect(o.id, sNum, toiletType)}
                                    className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg border text-xs font-bold space-x-1 cursor-pointer transition hover:scale-105 shadow-2xs ${
                                      hasR
                                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    }`}
                                    title={hasR ? `Show ${sNum}: Sudah Ceklis (Ada Temuan R) - Klik untuk lihat` : `Show ${sNum}: Sudah Ceklis (Bersih) - Klik untuk lihat`}
                                  >
                                    <Check className="w-4 h-4 stroke-[3]" />
                                    {hasR && <span className="text-[10px] font-black text-rose-700">R</span>}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleDirectInspect(o.id, sNum, toiletType)}
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-amber-800 hover:bg-amber-50/80 font-black text-base cursor-pointer transition select-none"
                                    title={unlocked ? `Show ${sNum}: Belum diceklis (Klik untuk isi)` : `Show ${sNum}: Belum diceklis (Wajib isi Show sebelumnya dulu)`}
                                  >
                                    -
                                  </button>
                                )}
                              </td>
                            );
                          })}

                          {/* Status Laporan Column showing 1/5, 2/5, 5/5 format */}
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-black border ${
                                completedShowsCount === 5
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : completedShowsCount > 0
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {completedShowsCount}/5 Show
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDirectInspect(o.id, undefined, toiletType)}
                              className="px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-extrabold flex items-center space-x-1 mx-auto transition cursor-pointer shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>LIHAT / ISI</span>
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer Pagination */}
            <div className="pt-4 mt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 font-medium">
                Menampilkan{' '}
                <span className="font-bold text-slate-800">
                  {filteredOutlets.length === 0 ? 0 : dashboardStartIndex + 1}
                </span>{' '}
                sampai{' '}
                <span className="font-bold text-slate-800">
                  {Math.min(dashboardStartIndex + dashboardPageSize, filteredOutlets.length)}
                </span>{' '}
                dari{' '}
                <span className="font-bold text-slate-800">{filteredOutlets.length}</span>{' '}
                Outlet
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safeDashboardPage <= 1}
                  onClick={() => setDashboardPage((p) => Math.max(1, p - 1))}
                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-bold text-slate-600 px-1.5 tabular-nums">
                  Hal {safeDashboardPage} / {dashboardTotalPages}
                </span>
                <button
                  type="button"
                  disabled={safeDashboardPage >= dashboardTotalPages}
                  onClick={() =>
                    setDashboardPage((p) => Math.min(dashboardTotalPages, p + 1))
                  }
                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
