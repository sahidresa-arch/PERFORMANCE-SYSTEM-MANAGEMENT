import React, { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  X,
  FileDown,
  MapPin,
  UserCheck,
  Building2,
  Plus,
  Trash2,
  PenTool,
  Eraser,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import {
  Employee,
  MaintenanceCategory,
  MaintenanceMonthEntry,
  Outlet,
} from '../../types';
import { StorageService } from '../../lib/storage';
import { INITIAL_OUTLETS } from '../../lib/constants';

export type BeritaAcaraMode = 'kursi_studio' | 'karpet' | 'gabungan';

export interface BeritaAcaraStatusInfo {
  status: 'safe' | 'warning' | 'overdue' | 'empty';
  lastDate: string | null;
  expDate: string | null;
  sopDays: number;
  daysRemaining: number;
  daysElapsed: number;
  latestMonthEntry: MaintenanceMonthEntry | null;
}

interface BeritaAcaraModalProps {
  isOpen: boolean;
  onClose: () => void;
  outlet: Outlet;
  displayName: string;
  category: Extract<MaintenanceCategory, 'kursi_studio' | 'karpet'>;
  computedStatus: BeritaAcaraStatusInfo;
  carpetStatus?: BeritaAcaraStatusInfo;
  chairStatus?: BeritaAcaraStatusInfo;
  initialMode?: BeritaAcaraMode;
}

interface CarpetDetailRow {
  id: string;
  label: string;
  areaSqm: string;
}

interface ChairDetailRow {
  id: string;
  studioName: string;
  seats: string;
}

interface CombinedDetailRow {
  id: string;
  label: string;
  areaSqm: string;
  seats: string;
}

function formatBeritaCarpetLabel(rawName: string, fallback = 'Area Karpet'): string {
  const noLuas = (rawName || '').trim().replace(/^luas\s+/i, '').trim();
  if (!noLuas) return fallback;
  const noKarpetStudio = noLuas.replace(/^karpet\s+(?=studio\b)/i, '').trim();
  return noKarpetStudio || fallback;
}

function normalizeStudioMatchKey(name: string): string {
  const lower = (name || '').toLowerCase();
  const numMatch = lower.match(/studio\s*(\d+)/);
  if (numMatch) return `studio_${numMatch[1]}`;
  return lower.replace(/^luas\s+/i, '').replace(/^karpet\s+/i, '').trim();
}

const INDONESIAN_MONTHS = [
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

function formatTodayIndonesian(): string {
  const now = new Date();
  return `${now.getDate()} ${INDONESIAN_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

function formatDateIndonesian(isoDate: string | null): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return isoDate;
  return `${d} ${INDONESIAN_MONTHS[m - 1] || ''} ${y}`;
}

function resolveOutletAddress(outlet: Outlet): string {
  const direct = (outlet.address || '').trim();
  if (direct) return direct;
  const fallback = INITIAL_OUTLETS.find((o) => o.id === outlet.id)?.address;
  return (fallback || '').trim();
}

function detectCity(address: string, outletName: string): string {
  const combined = `${address} ${outletName}`.toLowerCase();
  if (combined.includes('cianjur') || combined.includes('cipanas')) {
    return 'Cianjur';
  }
  if (
    combined.includes('depok') ||
    combined.includes('sawangan') ||
    combined.includes('margonda') ||
    combined.includes('cinere') ||
    combined.includes('pesona square') ||
    combined.includes('margo') ||
    combined.includes('cimanggis') ||
    combined.includes('bojongsari') ||
    combined.includes('beji') ||
    combined.includes('sukmajaya') ||
    combined.includes('pancoran mas') ||
    combined.includes('tsm cibubur') ||
    combined.includes('cibubur')
  ) {
    return 'Depok';
  }
  return 'Bogor';
}

function findOutletManagers(outlet: Outlet, allEmployees: Employee[]): Employee[] {
  const baseOutletId = outlet.id
    .replace(/^premiere-/, '')
    .replace(/^hs-/, '');

  const isManagerRole = (jabatan: string) => {
    const j = (jabatan || '').toLowerCase();
    return (
      j.includes('cinema manager') ||
      j.includes('assistant manager') ||
      j.includes('ass. manager') ||
      j.includes('asst. manager') ||
      j.includes('manager')
    );
  };

  const activeOutletEmployees = allEmployees.filter(
    (emp) =>
      (emp.outletId === outlet.id || emp.outletId === baseOutletId) &&
      emp.statusKerja !== 'Resign' &&
      emp.statusKerja !== 'Terminate'
  );

  const managers = activeOutletEmployees.filter((emp) => isManagerRole(emp.jabatan));

  // Prioritize Cinema Manager before Assistant Manager
  return managers.sort((a, b) => {
    const score = (jab: string) => {
      const lower = (jab || '').toLowerCase();
      if (lower.includes('cinema manager') && !lower.includes('assistant')) return 0;
      if (lower.includes('assistant') || lower.includes('ass.')) return 1;
      return 2;
    };
    return score(a.jabatan) - score(b.jabatan);
  });
}

export const BeritaAcaraModal: React.FC<BeritaAcaraModalProps> = ({
  isOpen,
  onClose,
  outlet,
  displayName,
  category,
  computedStatus,
  carpetStatus,
  chairStatus,
  initialMode,
}) => {
  const [activeMode, setActiveMode] = useState<BeritaAcaraMode>(
    initialMode || category
  );
  const [kopOutletName, setKopOutletName] = useState(displayName);
  const [kopAddress, setKopAddress] = useState(() => resolveOutletAddress(outlet));
  const [addressSourceNote, setAddressSourceNote] = useState<string>('');

  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [managerName, setManagerName] = useState('');
  const [managerJabatan, setManagerJabatan] = useState('Cinema Manager');
  const [outletFieldName, setOutletFieldName] = useState(displayName);

  const [cityName, setCityName] = useState(() =>
    detectCity(resolveOutletAddress(outlet), displayName)
  );
  const [letterDateStr, setLetterDateStr] = useState(() => formatTodayIndonesian());
  const [areaManagerName, setAreaManagerName] = useState('Bpk. Fachri');
  const [regionalManagerName, setRegionalManagerName] = useState('Bpk. Abdul Basit');

  const [carpetRows, setCarpetRows] = useState<CarpetDetailRow[]>([]);
  const [chairRows, setChairRows] = useState<ChairDetailRow[]>([]);
  const [combinedRows, setCombinedRows] = useState<CombinedDetailRow[]>([]);
  const [additionalNote, setAdditionalNote] = useState('');

  // Tanda Tangan Digital (khusus Yang membuat / Cinema Manager)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasDrawnStrokeRef = useRef(false);
  const sigStorageKey = `ba_manager_signature_${outlet.id}`;

  const emptyStatusFallback: BeritaAcaraStatusInfo = {
    status: 'empty',
    lastDate: null,
    expDate: null,
    sopDays: 0,
    daysRemaining: 0,
    daysElapsed: 0,
    latestMonthEntry: null,
  };

  const effectiveCarpetStatus: BeritaAcaraStatusInfo =
    carpetStatus ||
    (category === 'karpet' ? computedStatus : emptyStatusFallback);
  const effectiveChairStatus: BeritaAcaraStatusInfo =
    chairStatus ||
    (category === 'kursi_studio' ? computedStatus : emptyStatusFallback);

  const candidateManagers = useMemo(() => {
    const all = StorageService.getEmployees();
    return findOutletManagers(outlet, all);
  }, [outlet]);

  // Initialize state every time modal opens
  useEffect(() => {
    if (!isOpen) return;

    setActiveMode(initialMode || category);
    setKopOutletName(displayName);
    setOutletFieldName(displayName);
    setLetterDateStr(formatTodayIndonesian());
    setAreaManagerName('Bpk. Fachri');
    setRegionalManagerName('Bpk. Abdul Basit');
    setAdditionalNote('');

    // Pre-fill manager from Data Karyawan
    if (candidateManagers.length > 0) {
      const first = candidateManagers[0];
      setSelectedManagerId(first.id);
      setManagerName(first.name);
      setManagerJabatan(first.jabatan);
    } else {
      setSelectedManagerId('');
      setManagerName('');
      setManagerJabatan('Cinema Manager');
    }

    // Build initial Karpet rows (tanpa kata "Luas", dan khusus Studio tanpa kata "Karpet")
    const buildCarpetRows = (): CarpetDetailRow[] => {
      const savedAreas = effectiveCarpetStatus.latestMonthEntry?.carpetAreas;
      if (Array.isArray(savedAreas) && savedAreas.length > 0) {
        // Hanya area yang DICENTANG pada Pilih Area / Ruangan Karpet yang masuk ke Berita Acara
        return savedAreas
          .filter((a) => Boolean(a.checked))
          .map((a, idx) => ({
            id: a.id || `carpet_checked_${idx}`,
            label: formatBeritaCarpetLabel(a.name, 'Area Karpet'),
            areaSqm: a.areaSqm > 0 ? String(a.areaSqm) : '',
          }));
      }

      const studios = Array.isArray(outlet.studios) ? outlet.studios : [];
      const studioRows: CarpetDetailRow[] =
        studios.length > 0
          ? studios.map((s, idx) => ({
              id: `karpet_studio_${idx + 1}`,
              label: formatBeritaCarpetLabel(s.name, `Studio ${idx + 1}`),
              areaSqm: '',
            }))
          : [{ id: 'karpet_studio', label: 'Studio', areaSqm: '' }];

      return [
        ...studioRows,
        { id: 'karpet_lobi', label: 'Karpet Lobi', areaSqm: '' },
        { id: 'karpet_koridor', label: 'Karpet Koridor', areaSqm: '' },
      ];
    };

    // Build initial Kursi Studio rows
    const buildChairRows = (): ChairDetailRow[] => {
      const studios = outlet.studios || [];
      if (studios.length > 0) {
        return studios.map((s, idx) => ({
          id: `studio_${idx}_${s.name}`,
          studioName: s.name,
          seats: String(Number(s.capacity) || 0),
        }));
      }
      const fallbackQty = effectiveChairStatus.latestMonthEntry?.quantity;
      return [
        {
          id: 'studio_1',
          studioName: 'Total Kursi Studio',
          seats: fallbackQty ? String(fallbackQty) : '',
        },
      ];
    };

    const nextCarpetRows = buildCarpetRows();
    const nextChairRows = buildChairRows();
    setCarpetRows(nextCarpetRows);
    setChairRows(nextChairRows);

    // Build initial Gabungan (Karpet + Kursi) rows: pasangkan Studio karpet & kapasitas kursi
    const studios = Array.isArray(outlet.studios) ? outlet.studios : [];
    const matchedChairIds = new Set<string>();
    const combinedList: CombinedDetailRow[] = nextCarpetRows.map((cRow, idx) => {
      const cKey = normalizeStudioMatchKey(cRow.label);
      const matchedChair = nextChairRows.find(
        (ch) => !matchedChairIds.has(ch.id) && normalizeStudioMatchKey(ch.studioName) === cKey
      );
      if (matchedChair) {
        matchedChairIds.add(matchedChair.id);
      }
      return {
        id: `comb_${cRow.id}_${idx}`,
        label: cRow.label,
        areaSqm: cRow.areaSqm,
        seats: matchedChair ? matchedChair.seats : '',
      };
    });

    // Jika ada studio di data kursi yang tidak tercentang / tidak ada di baris karpet, tetap tampilkan agar jumlah kursi lengkap
    const remainingChairs = nextChairRows.filter((ch) => !matchedChairIds.has(ch.id));
    if (remainingChairs.length > 0 && studios.length > 0) {
      const firstNonStudioIdx = combinedList.findIndex(
        (r) => !/studio/i.test(r.label)
      );
      const extraChairRows: CombinedDetailRow[] = remainingChairs.map((ch, idx) => ({
        id: `comb_chair_${ch.id}_${idx}`,
        label: ch.studioName,
        areaSqm: '',
        seats: ch.seats,
      }));
      if (firstNonStudioIdx >= 0) {
        combinedList.splice(firstNonStudioIdx, 0, ...extraChairRows);
      } else {
        combinedList.push(...extraChairRows);
      }
    }
    setCombinedRows(combinedList);

    const resolvedAddr = resolveOutletAddress(outlet);
    setKopAddress(resolvedAddr);
    setCityName(detectCity(resolvedAddr, displayName));
    setAddressSourceNote(
      resolvedAddr
        ? 'Alamat otomatis sesuai database outlet (dapat diedit manual)'
        : 'Alamat outlet belum tersedia — silakan lengkapi manual'
    );

    // Restore saved digital signature for this outlet if available
    try {
      const savedSig = localStorage.getItem(sigStorageKey);
      if (savedSig) {
        setSignatureDataUrl(savedSig);
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = savedSig;
          }
        }
      } else {
        setSignatureDataUrl(null);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch {
      setSignatureDataUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, outlet.id, category, initialMode]);

  if (!isOpen) return null;

  const isGabungan = activeMode === 'gabungan';
  const isKarpet = activeMode === 'karpet';
  const activeSingleStatus = isKarpet ? effectiveCarpetStatus : effectiveChairStatus;

  const documentTitle = isGabungan
    ? 'BERITA ACARA PENGAJUAN PENCUCIAN KARPET & KURSI STUDIO'
    : isKarpet
    ? 'BERITA ACARA PENGAJUAN PENCUCIAN KARPET'
    : 'BERITA ACARA PENGAJUAN PENCUCIAN KURSI STUDIO';

  const sopConditionSentence = (() => {
    if (isGabungan) {
      const k = effectiveCarpetStatus;
      const c = effectiveChairStatus;
      const kLate = Math.abs(k.daysRemaining);
      const cLate = Math.abs(c.daysRemaining);
      const kRem = Math.max(0, k.daysRemaining);
      const cRem = Math.max(0, c.daysRemaining);

      if (k.status === 'overdue' && c.status === 'overdue') {
        return `Dengan ini kami mengajukan pencucian karpet dan kursi karena sudah melewati batas SOP (terlambat ${kLate} hari karpet dan kursi ${cLate} hari dari jadwal jatuh tempo). Maka dari itu mohon dibuatkan jadwal pencucian.`;
      }
      if (k.status === 'overdue') {
        if (c.status === 'warning') {
          return `Dengan ini kami mengajukan pencucian karpet dan kursi karena karpet sudah melewati batas SOP (terlambat ${kLate} hari dari jadwal jatuh tempo) dan kursi sudah mendekati batas SOP (tersisa ${cRem} hari menuju jadwal jatuh tempo). Maka dari itu mohon dibuatkan jadwal pencucian.`;
        }
        if (c.status === 'safe') {
          return `Dengan ini kami mengajukan pencucian karpet dan kursi karena karpet sudah melewati batas SOP (terlambat ${kLate} hari dari jadwal jatuh tempo) serta mengajukan pencucian kursi bersamaan (tersisa ${cRem} hari menuju jadwal jatuh tempo). Maka dari itu mohon dibuatkan jadwal pencucian.`;
        }
        return `Dengan ini kami mengajukan pencucian karpet dan kursi karena karpet sudah melewati batas SOP (terlambat ${kLate} hari dari jadwal jatuh tempo). Maka dari itu mohon dibuatkan jadwal pencucian.`;
      }
      if (c.status === 'overdue') {
        if (k.status === 'warning') {
          return `Dengan ini kami mengajukan pencucian karpet dan kursi karena kursi sudah melewati batas SOP (terlambat ${cLate} hari dari jadwal jatuh tempo) dan karpet sudah mendekati batas SOP (tersisa ${kRem} hari menuju jadwal jatuh tempo). Maka dari itu mohon dibuatkan jadwal pencucian.`;
        }
        if (k.status === 'safe') {
          return `Dengan ini kami mengajukan pencucian karpet dan kursi karena kursi sudah melewati batas SOP (terlambat ${cLate} hari dari jadwal jatuh tempo) serta mengajukan pencucian karpet bersamaan (tersisa ${kRem} hari menuju jadwal jatuh tempo). Maka dari itu mohon dibuatkan jadwal pencucian.`;
        }
        return `Dengan ini kami mengajukan pencucian karpet dan kursi karena kursi sudah melewati batas SOP (terlambat ${cLate} hari dari jadwal jatuh tempo). Maka dari itu mohon dibuatkan jadwal pencucian.`;
      }
      if (k.status === 'warning' && c.status === 'warning') {
        return `Dengan ini kami mengajukan pencucian karpet dan kursi karena sudah mendekati batas SOP (tersisa ${kRem} hari karpet dan kursi ${cRem} hari menuju jadwal jatuh tempo). Maka dari itu mohon dibuatkan jadwal pencucian.`;
      }
      if (k.status === 'warning' || c.status === 'warning') {
        const parts: string[] = [];
        if (k.status !== 'empty') parts.push(`karpet tersisa ${kRem} hari`);
        if (c.status !== 'empty') parts.push(`kursi tersisa ${cRem} hari`);
        return `Dengan ini kami mengajukan pencucian karpet dan kursi karena sudah mendekati batas SOP (${parts.join(
          ' dan '
        )} menuju jadwal jatuh tempo). Maka dari itu mohon dibuatkan jadwal pencucian.`;
      }
      return 'Dengan ini kami mengajukan pencucian karpet dan kursi sesuai jadwal pemeliharaan berkala SOP outlet. Maka dari itu mohon dibuatkan jadwal pencucian.';
    }

    const itemWord = isKarpet ? 'karpet' : 'kursi studio';
    if (activeSingleStatus.status === 'overdue') {
      const lateDays = Math.abs(activeSingleStatus.daysRemaining);
      return `Dengan ini kami mengajukan pencucian ${itemWord} karena sudah melewati batas SOP (terlambat ${lateDays} hari dari jadwal jatuh tempo). Maka dari itu mohon dibuatkan jadwal pencucian.`;
    }
    if (activeSingleStatus.status === 'warning') {
      const remDays = Math.max(0, activeSingleStatus.daysRemaining);
      return `Dengan ini kami mengajukan pencucian ${itemWord} karena sudah dekat batas SOP (tersisa ${remDays} hari menuju jadwal jatuh tempo). Maka dari itu mohon dibuatkan jadwal pencucian.`;
    }
    if (activeSingleStatus.status === 'safe') {
      const remDays = Math.max(0, activeSingleStatus.daysRemaining);
      return `Dengan ini kami mengajukan pencucian ${itemWord} sesuai jadwal SOP (tersisa ${remDays} hari menuju jadwal jatuh tempo). Maka dari itu mohon dibuatkan jadwal pencucian.`;
    }
    return `Dengan ini kami mengajukan pencucian ${itemWord} untuk pemeliharaan outlet sesuai standar SOP. Maka dari itu mohon dibuatkan jadwal pencucian.`;
  })();

  const totalCarpetSqm = carpetRows.reduce((sum, r) => {
    const val = parseFloat(r.areaSqm.replace(',', '.'));
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const totalSeats = chairRows.reduce((sum, r) => {
    const val = parseInt(r.seats, 10);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const totalCombinedSqm = combinedRows.reduce((sum, r) => {
    const val = parseFloat(r.areaSqm.replace(',', '.'));
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const totalCombinedSeats = combinedRows.reduce((sum, r) => {
    const val = parseInt(r.seats, 10);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const handleSelectCandidateManager = (empId: string) => {
    setSelectedManagerId(empId);
    const emp = candidateManagers.find((m) => m.id === empId);
    if (emp) {
      setManagerName(emp.name);
      setManagerJabatan(emp.jabatan);
    }
  };

  const handleAddCarpetRow = () => {
    setCarpetRows((prev) => [
      ...prev,
      { id: `custom_${Date.now()}`, label: 'Karpet Area Tambahan', areaSqm: '' },
    ]);
  };

  const handleRemoveCarpetRow = (id: string) => {
    setCarpetRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddChairRow = () => {
    setChairRows((prev) => [
      ...prev,
      {
        id: `studio_custom_${Date.now()}`,
        studioName: `Studio ${prev.length + 1}`,
        seats: '',
      },
    ]);
  };

  const handleRemoveChairRow = (id: string) => {
    setChairRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddCombinedRow = () => {
    setCombinedRows((prev) => [
      ...prev,
      {
        id: `comb_custom_${Date.now()}`,
        label: 'Karpet Area Tambahan',
        areaSqm: '',
        seats: '',
      },
    ]);
  };

  const handleRemoveCombinedRow = (id: string) => {
    setCombinedRows((prev) => prev.filter((r) => r.id !== id));
  };

  // === Signature Canvas Handlers ===
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleSigPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    hasDrawnStrokeRef.current = true;

    const pt = getCanvasPoint(e);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x + 0.01, pt.y + 0.01);
    ctx.stroke();
  };

  const handleSigPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const pt = getCanvasPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const commitCanvasSignature = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawnStrokeRef.current) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureDataUrl(dataUrl);
    try {
      localStorage.setItem(sigStorageKey, dataUrl);
    } catch {
      // ignore storage quota
    }
  };

  const handleClearSignature = () => {
    hasDrawnStrokeRef.current = false;
    isDrawingRef.current = false;
    setSignatureDataUrl(null);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    try {
      localStorage.removeItem(sigStorageKey);
    } catch {
      // ignore
    }
  };

  const handleUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) return;
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const ratio = Math.min(
            (canvas.width - 16) / (img.width || 1),
            (canvas.height - 16) / (img.height || 1)
          );
          const drawW = img.width * ratio;
          const drawH = img.height * ratio;
          const offsetX = (canvas.width - drawW) / 2;
          const offsetY = (canvas.height - drawH) / 2;
          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
          const normalizedPng = canvas.toDataURL('image/png');
          hasDrawnStrokeRef.current = true;
          setSignatureDataUrl(normalizedPng);
          try {
            localStorage.setItem(sigStorageKey, normalizedPng);
          } catch {
            // ignore
          }
        } else {
          setSignatureDataUrl(result);
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 20;
    const contentWidth = pageWidth - marginX * 2;
    let y = 18;

    const ensureSpace = (neededMm: number) => {
      if (y + neededMm > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
    };

    // === KOP SURAT (Font lebih besar dari teks isi) ===
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    const kopTitleLines = doc.splitTextToSize(
      (kopOutletName || displayName).toUpperCase(),
      contentWidth
    );
    doc.text(kopTitleLines, pageWidth / 2, y, { align: 'center' });
    y += kopTitleLines.length * 6.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11.5);
    doc.setTextColor(51, 65, 85);
    const addrText = kopAddress.trim() || 'Alamat outlet belum tersedia';
    const addrLines = doc.splitTextToSize(addrText, contentWidth - 10);
    doc.text(addrLines, pageWidth / 2, y, { align: 'center' });
    y += addrLines.length * 5.2 + 2;

    // Garis Bawah Kop Surat Resmi (Double line)
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.9);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 1.2;
    doc.setLineWidth(0.3);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 10;

    // === JUDUL BERITA ACARA ===
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isGabungan ? 11.5 : 12.5);
    doc.setTextColor(15, 23, 42);
    doc.text(documentTitle, pageWidth / 2, y, { align: 'center' });
    const titleWidth = doc.getTextWidth(documentTitle);
    doc.setLineWidth(0.4);
    doc.line(
      (pageWidth - titleWidth) / 2,
      y + 1.5,
      (pageWidth + titleWidth) / 2,
      y + 1.5
    );
    y += 11;

    // === KEPADA YTH ===
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.text('Kepada Yth.', marginX, y);
    y += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Team QC di Jakarta', marginX, y);
    y += 9;

    // === IDENTITAS PENGAJU ===
    doc.setFont('helvetica', 'normal');
    doc.text('Yang bertanda tangan di bawah ini:', marginX, y);
    y += 6.5;

    const labelX = marginX + 4;
    const colonX = marginX + 34;
    const valX = marginX + 38;

    const drawField = (label: string, value: string) => {
      doc.setFont('helvetica', 'normal');
      doc.text(label, labelX, y);
      doc.text(':', colonX, y);
      doc.setFont('helvetica', 'bold');
      const wrapped = doc.splitTextToSize(value || '-', contentWidth - 40);
      doc.text(wrapped, valX, y);
      y += wrapped.length * 5.5 + 0.5;
    };

    drawField('Nama', managerName.trim() || '.................................');
    drawField('Jabatan', managerJabatan.trim() || 'Cinema Manager');
    drawField('Outlet', outletFieldName.trim() || displayName);
    y += 4;

    // === PARAGRAF PERMOHONAN SOP ===
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const bodyLines = doc.splitTextToSize(sopConditionSentence, contentWidth);
    doc.text(bodyLines, marginX, y);
    y += bodyLines.length * 5.3 + 4;

    if (isGabungan) {
      const notes: string[] = [];
      if (effectiveCarpetStatus.lastDate || effectiveCarpetStatus.expDate) {
        notes.push(
          `Catatan Jadwal SOP Karpet: Pencucian terakhir ${formatDateIndonesian(
            effectiveCarpetStatus.lastDate
          )} | Jatuh tempo SOP ${formatDateIndonesian(effectiveCarpetStatus.expDate)}.`
        );
      }
      if (effectiveChairStatus.lastDate || effectiveChairStatus.expDate) {
        notes.push(
          `Catatan Jadwal SOP Kursi: Pencucian terakhir ${formatDateIndonesian(
            effectiveChairStatus.lastDate
          )} | Jatuh tempo SOP ${formatDateIndonesian(effectiveChairStatus.expDate)}.`
        );
      }
      if (notes.length > 0) {
        doc.setFontSize(9.2);
        doc.setTextColor(71, 85, 105);
        notes.forEach((line) => {
          const wrappedInfo = doc.splitTextToSize(line, contentWidth);
          doc.text(wrappedInfo, marginX, y);
          y += wrappedInfo.length * 4.6;
        });
        y += 4;
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(10.5);
      }
    } else if (activeSingleStatus.lastDate || activeSingleStatus.expDate) {
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      const infoLine = `Catatan Jadwal SOP: Pencucian terakhir ${formatDateIndonesian(
        activeSingleStatus.lastDate
      )} | Jatuh tempo SOP ${formatDateIndonesian(activeSingleStatus.expDate)}.`;
      const wrappedInfo = doc.splitTextToSize(infoLine, contentWidth);
      doc.text(wrappedInfo, marginX, y);
      y += wrappedInfo.length * 4.8 + 4;
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10.5);
    }

    // === RINCIAN ===
    doc.setFont('helvetica', 'bold');
    doc.text('Dengan rincian sebagai berikut:', marginX, y);
    y += 6.5;

    const drawRincianTable = (
      rows: { label: string; valueText: string }[],
      totalLabel: string,
      totalValueText: string
    ) => {
      const col1W = contentWidth * 0.62;
      const col2W = contentWidth - col1W;
      const rowH = 8;

      // Table Header
      ensureSpace(rowH * 2);
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);
      doc.rect(marginX, y, col1W, rowH, 'FD');
      doc.rect(marginX + col1W, y, col2W, rowH, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(isKarpet ? 'Area / Bagian Karpet' : 'Studio / Area Kursi', marginX + 3, y + 5.5);
      doc.text(isKarpet ? 'Luas Karpet (m²)' : 'Jumlah Kursi', marginX + col1W + col2W - 3, y + 5.5, {
        align: 'right',
      });
      y += rowH;

      // Table Rows
      doc.setFont('helvetica', 'normal');
      rows.forEach((r) => {
        ensureSpace(rowH);
        doc.setDrawColor(203, 213, 225);
        doc.rect(marginX, y, col1W, rowH, 'D');
        doc.rect(marginX + col1W, y, col2W, rowH, 'D');
        doc.text(r.label || '-', marginX + 3, y + 5.5);
        doc.text(r.valueText, marginX + col1W + col2W - 3, y + 5.5, {
          align: 'right',
        });
        y += rowH;
      });

      // Total Row
      ensureSpace(rowH);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(148, 163, 184);
      doc.rect(marginX, y, col1W, rowH, 'FD');
      doc.rect(marginX + col1W, y, col2W, rowH, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.text(totalLabel, marginX + 3, y + 5.5);
      doc.text(totalValueText, marginX + col1W + col2W - 3, y + 5.5, {
        align: 'right',
      });
      y += rowH + 6;
    };

    if (isGabungan) {
      const col1W = contentWidth * 0.48;
      const col2W = contentWidth * 0.27;
      const col3W = contentWidth - col1W - col2W;
      const rowH = 8;

      ensureSpace(rowH * 2);
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);
      doc.rect(marginX, y, col1W, rowH, 'FD');
      doc.rect(marginX + col1W, y, col2W, rowH, 'FD');
      doc.rect(marginX + col1W + col2W, y, col3W, rowH, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Area / Ruangan', marginX + 3, y + 5.5);
      doc.text('Luas Karpet (m²)', marginX + col1W + col2W - 3, y + 5.5, { align: 'right' });
      doc.text('Jumlah Kursi', marginX + col1W + col2W + col3W - 3, y + 5.5, {
        align: 'right',
      });
      y += rowH;

      doc.setFont('helvetica', 'normal');
      combinedRows.forEach((r) => {
        ensureSpace(rowH);
        doc.setDrawColor(203, 213, 225);
        doc.rect(marginX, y, col1W, rowH, 'D');
        doc.rect(marginX + col1W, y, col2W, rowH, 'D');
        doc.rect(marginX + col1W + col2W, y, col3W, rowH, 'D');
        doc.text(r.label || '-', marginX + 3, y + 5.5);
        doc.text(r.areaSqm.trim() ? `${r.areaSqm} m²` : '-', marginX + col1W + col2W - 3, y + 5.5, {
          align: 'right',
        });
        doc.text(
          r.seats.trim() ? `${r.seats} kursi` : '-',
          marginX + col1W + col2W + col3W - 3,
          y + 5.5,
          { align: 'right' }
        );
        y += rowH;
      });

      ensureSpace(rowH);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(148, 163, 184);
      doc.rect(marginX, y, col1W, rowH, 'FD');
      doc.rect(marginX + col1W, y, col2W, rowH, 'FD');
      doc.rect(marginX + col1W + col2W, y, col3W, rowH, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.text('Total', marginX + 3, y + 5.5);
      doc.text(
        totalCombinedSqm > 0 ? `${Math.round(totalCombinedSqm * 100) / 100} m²` : '- m²',
        marginX + col1W + col2W - 3,
        y + 5.5,
        { align: 'right' }
      );
      doc.text(
        totalCombinedSeats > 0 ? `${totalCombinedSeats} kursi` : '- kursi',
        marginX + col1W + col2W + col3W - 3,
        y + 5.5,
        { align: 'right' }
      );
      y += rowH + 6;
    } else if (isKarpet) {
      drawRincianTable(
        carpetRows.map((r) => ({
          label: r.label,
          valueText: r.areaSqm.trim() ? `${r.areaSqm} m²` : '- m²',
        })),
        'Total Luas Karpet',
        totalCarpetSqm > 0 ? `${Math.round(totalCarpetSqm * 100) / 100} m²` : '- m²'
      );
    } else {
      drawRincianTable(
        chairRows.map((r) => ({
          label: r.studioName,
          valueText: r.seats.trim() ? `${r.seats} kursi` : '- kursi',
        })),
        'Total Kursi Studio',
        totalSeats > 0 ? `${totalSeats} kursi` : '- kursi'
      );
    }

    if (additionalNote.trim()) {
      ensureSpace(14);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      const noteLines = doc.splitTextToSize(
        `Keterangan Tambahan: ${additionalNote.trim()}`,
        contentWidth
      );
      doc.text(noteLines, marginX, y);
      y += noteLines.length * 4.8 + 4;
    }

    // === PENUTUP ===
    ensureSpace(65);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const closingText =
      'Demikian berita acara ini kami buat dengan data yang sebenar-benarnya, terima kasih.';
    const closingLines = doc.splitTextToSize(closingText, contentWidth);
    doc.text(closingLines, marginX, y);
    y += closingLines.length * 5.5 + 8;

    // === TEMPAT & TANGGAL ===
    const dateLine = `${cityName.trim() || 'Bogor'}, ${
      letterDateStr.trim() || formatTodayIndonesian()
    }`;
    doc.setFont('helvetica', 'normal');
    doc.text(dateLine, marginX, y);
    y += 7;

    // === BLOK TANDA TANGAN (Yang membuat | Mengetahui: Area Manager & Regional Manager) ===
    const colW = contentWidth / 3;
    const c1Center = marginX + colW * 0.5;
    const c2Center = marginX + colW * 1.5;
    const c3Center = marginX + colW * 2.5;
    const mengetahuiCenter = marginX + colW * 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.text('Yang membuat,', c1Center, y, { align: 'center' });
    doc.text('Mengetahui,', mengetahuiCenter, y, { align: 'center' });
    y += 5;
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(managerJabatan.trim() || 'Manager Outlet', c1Center, y, {
      align: 'center',
    });
    doc.text('Area Manager', c2Center, y, { align: 'center' });
    doc.text('Regional Manager', c3Center, y, { align: 'center' });

    // Embed Tanda Tangan Digital Cinema Manager tepat di atas nama pada kolom 'Yang membuat'
    if (signatureDataUrl) {
      try {
        const props = doc.getImageProperties(signatureDataUrl);
        const maxW = 38;
        const maxH = 19;
        const scale = Math.min(
          maxW / (props.width || 460),
          maxH / (props.height || 150)
        );
        const drawW = (props.width || 460) * scale;
        const drawH = (props.height || 150) * scale;
        const sigX = c1Center - drawW / 2;
        const sigY = y + 2.5 + (maxH - drawH) / 2;
        doc.addImage(signatureDataUrl, 'PNG', sigX, sigY, drawW, drawH);
      } catch {
        // Fallback safely if image properties fail
        doc.addImage(signatureDataUrl, 'PNG', c1Center - 18, y + 3, 36, 15);
      }
    }

    y += 24;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);

    const sign1 = `( ${managerName.trim() || '..........................'} )`;
    const sign2 = `( ${areaManagerName.trim() || 'Bpk. Fachri'} )`;
    const sign3 = `( ${regionalManagerName.trim() || 'Bpk. Abdul Basit'} )`;

    doc.text(sign1, c1Center, y, { align: 'center' });
    doc.text(sign2, c2Center, y, { align: 'center' });
    doc.text(sign3, c3Center, y, { align: 'center' });

    const safeOutlet = (displayName || outlet.name)
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const modeSlug = isGabungan
      ? 'Karpet_dan_Kursi'
      : isKarpet
      ? 'Karpet'
      : 'Kursi';
    const fileName = `Berita_Acara_Pencucian_${modeSlug}_${safeOutlet}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Top Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              BERITA ACARA PENGAJUAN PENCUCIAN (
              {isGabungan ? 'GABUNGAN KARPET & KURSI' : isKarpet ? 'KARPET' : 'KURSI STUDIO'})
            </span>
            <h3 className="text-sm font-extrabold uppercase mt-0.5">
              {displayName}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-xs transition-colors cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body: Left Editor Form + Right Live Document Preview */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* LEFT: Form Editor */}
          <div className="lg:col-span-5 p-4 sm:p-5 space-y-4 bg-slate-50/70 overflow-y-auto">
            {/* Jenis Berita Acara Switcher */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
              <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide block">
                Jenis Berita Acara
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveMode('karpet')}
                  className={`px-2 py-2 rounded-lg text-[11px] font-extrabold border transition-colors cursor-pointer ${
                    activeMode === 'karpet'
                      ? 'bg-slate-900 text-amber-300 border-slate-900 shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Karpet
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('kursi_studio')}
                  className={`px-2 py-2 rounded-lg text-[11px] font-extrabold border transition-colors cursor-pointer ${
                    activeMode === 'kursi_studio'
                      ? 'bg-slate-900 text-amber-300 border-slate-900 shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Kursi Studio
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('gabungan')}
                  className={`px-2 py-2 rounded-lg text-[11px] font-extrabold border transition-colors cursor-pointer ${
                    activeMode === 'gabungan'
                      ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-2xs'
                      : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  Gabungan
                </button>
              </div>
            </div>
            {/* Kop Surat */}
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  KOP Surat Outlet
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nama Outlet (Kop Surat)
                </label>
                <input
                  type="text"
                  value={kopOutletName}
                  onChange={(e) => setKopOutletName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 mb-1">
                  <MapPin className="w-3 h-3 text-rose-500" />
                  <span>Alamat Outlet (Kop Surat)</span>
                </label>
                <textarea
                  rows={2}
                  value={kopAddress}
                  onChange={(e) => setKopAddress(e.target.value)}
                  placeholder="Masukkan alamat lengkap outlet..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
                {addressSourceNote && (
                  <p className="text-[10px] text-slate-500 mt-1">{addressSourceNote}</p>
                )}
              </div>
            </div>

            {/* Penandatangan Manager Outlet */}
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                Data Manager Pengaju (Data Karyawan)
              </span>

              {candidateManagers.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Pilih Manager dari Database Karyawan
                  </label>
                  <select
                    value={selectedManagerId}
                    onChange={(e) => handleSelectCandidateManager(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  >
                    {candidateManagers.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} — {emp.jabatan}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Nama Manager
                  </label>
                  <input
                    type="text"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="Nama Cinema/Asst Manager"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Jabatan
                  </label>
                  <input
                    type="text"
                    value={managerJabatan}
                    onChange={(e) => setManagerJabatan(e.target.value)}
                    placeholder="Cinema Manager / Assistant Manager"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nama Outlet
                </label>
                <input
                  type="text"
                  value={outletFieldName}
                  onChange={(e) => setOutletFieldName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
            </div>

            {/* Rincian Karpet / Kursi Studio / Gabungan */}
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">
                  {isGabungan
                    ? 'Rincian Karpet (m²) & Jumlah Kursi'
                    : isKarpet
                    ? 'Rincian Luas Karpet (m²)'
                    : 'Rincian Jumlah Kursi Studio'}
                </span>
                <button
                  type="button"
                  onClick={
                    isGabungan
                      ? handleAddCombinedRow
                      : isKarpet
                      ? handleAddCarpetRow
                      : handleAddChairRow
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isKarpet || isGabungan ? 'Tambah Area' : 'Tambah Studio'}</span>
                </button>
              </div>

              {isGabungan ? (
                <div className="space-y-2">
                  {combinedRows.length === 0 ? (
                    <div className="p-3 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-[11px] text-slate-500 text-center">
                      Belum ada rincian area &amp; kursi. Klik <strong>Tambah Area</strong> untuk menambahkan baris.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-12 gap-1.5 text-[10px] font-bold text-slate-500 px-0.5">
                        <div className="col-span-6">Area / Ruangan</div>
                        <div className="col-span-3 text-right">Luas Karpet (m²)</div>
                        <div className="col-span-2 text-right">Kursi</div>
                        <div className="col-span-1" />
                      </div>
                      {combinedRows.map((row) => (
                        <div key={row.id} className="grid grid-cols-12 items-center gap-1.5">
                          <input
                            type="text"
                            value={row.label}
                            onChange={(e) =>
                              setCombinedRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id ? { ...r, label: e.target.value } : r
                                )
                              )
                            }
                            className="col-span-6 px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                          />
                          <div className="col-span-3 flex items-center gap-0.5">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={row.areaSqm}
                              onChange={(e) =>
                                setCombinedRows((prev) =>
                                  prev.map((r) =>
                                    r.id === row.id ? { ...r, areaSqm: e.target.value } : r
                                  )
                                )
                              }
                              placeholder="-"
                              className="w-full px-1.5 py-1.5 text-xs text-right border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                            />
                          </div>
                          <div className="col-span-2 flex items-center gap-0.5">
                            <input
                              type="number"
                              min="0"
                              value={row.seats}
                              onChange={(e) =>
                                setCombinedRows((prev) =>
                                  prev.map((r) =>
                                    r.id === row.id ? { ...r, seats: e.target.value } : r
                                  )
                                )
                              }
                              placeholder="-"
                              className="w-full px-1.5 py-1.5 text-xs text-right border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                            />
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveCombinedRow(row.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title={`Hapus ${row.label || 'baris ini'}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ) : isKarpet ? (
                <div className="space-y-2">
                  {carpetRows.length === 0 ? (
                    <div className="p-3 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-[11px] text-slate-500 text-center">
                      Belum ada area karpet yang dicentang. Klik <strong>Tambah Area</strong> jika ingin menambahkan rincian secara manual.
                    </div>
                  ) : (
                    carpetRows.map((row) => (
                      <div key={row.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={row.label}
                          onChange={(e) =>
                            setCarpetRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, label: e.target.value } : r
                              )
                            )
                          }
                          className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        />
                        <div className="flex items-center gap-1 w-28">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={row.areaSqm}
                            onChange={(e) =>
                              setCarpetRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id ? { ...r, areaSqm: e.target.value } : r
                                )
                              )
                            }
                            placeholder="0"
                            className="w-full px-2 py-1.5 text-xs text-right border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                          />
                          <span className="text-[11px] font-bold text-slate-500">m²</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCarpetRow(row.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title={`Hapus ${row.label || 'baris ini'}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {chairRows.map((row) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={row.studioName}
                        onChange={(e) =>
                          setChairRows((prev) =>
                            prev.map((r) =>
                              r.id === row.id
                                ? { ...r, studioName: e.target.value }
                                : r
                            )
                          )
                        }
                        className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                      />
                      <div className="flex items-center gap-1 w-28">
                        <input
                          type="number"
                          min="0"
                          value={row.seats}
                          onChange={(e) =>
                            setChairRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, seats: e.target.value } : r
                              )
                            )
                          }
                          placeholder="0"
                          className="w-full px-2 py-1.5 text-xs text-right border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        />
                        <span className="text-[11px] font-bold text-slate-500">kursi</span>
                      </div>
                      {chairRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveChairRow(row.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={additionalNote}
                  onChange={(e) => setAdditionalNote(e.target.value)}
                  placeholder="Contoh: Prioritas area studio dengan tingkat kotoran tinggi"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
            </div>

            {/* Kota, Tanggal & Mengetahui (Area Manager & Regional Manager) */}
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2.5">
              <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide block">
                Tanggal & Penandatangan Mengetahui
              </span>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Kota (Depok / Bogor / Cianjur)
                  </label>
                  <input
                    type="text"
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    placeholder="Depok / Bogor / Cianjur"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tanggal Surat
                  </label>
                  <input
                    type="text"
                    value={letterDateStr}
                    onChange={(e) => setLetterDateStr(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Area Manager
                  </label>
                  <input
                    type="text"
                    value={areaManagerName}
                    onChange={(e) => setAreaManagerName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Regional Manager
                  </label>
                  <input
                    type="text"
                    value={regionalManagerName}
                    onChange={(e) => setRegionalManagerName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>
            </div>

            {/* Tanda Tangan Digital Cinema Manager (Yang Membuat) */}
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">
                  <PenTool className="w-3.5 h-3.5 text-amber-600" />
                  Tanda Tangan Digital (Cinema Manager)
                </span>
                {signatureDataUrl && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>TTD Terpasang</span>
                  </span>
                )}
              </div>

              <p className="text-[10.5px] text-slate-500 leading-snug">
                Goreskan tanda tangan langsung pada kotak di bawah atau unggah file gambar tanda tangan (PNG/JPG). Khusus untuk kolom <strong>Yang membuat</strong>.
              </p>

              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={150}
                  onPointerDown={handleSigPointerDown}
                  onPointerMove={handleSigPointerMove}
                  onPointerUp={commitCanvasSignature}
                  onPointerCancel={commitCanvasSignature}
                  className="w-full h-32 touch-none cursor-crosshair bg-slate-50 border border-dashed border-slate-300 rounded-xl hover:border-amber-400 transition-colors"
                />
                {!signatureDataUrl && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-medium text-slate-400">
                    Tanda tangan di sini (mouse / sentuh layar)
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleUploadSignature}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload TTD</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleClearSignature}
                  disabled={!signatureDataUrl}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <Eraser className="w-3 h-3" />
                  <span>Hapus TTD</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Live A4 Paper Preview */}
          <div className="lg:col-span-7 bg-slate-200/80 p-4 sm:p-6 overflow-y-auto flex justify-center">
            <div className="bg-white w-full max-w-[680px] rounded-sm shadow-lg border border-slate-300 px-8 py-9 text-slate-900 text-[12.5px] leading-relaxed">
              {/* KOP SURAT (Font lebih besar dari teks isi lainnya) */}
              <div className="text-center pb-3 border-b-[3px] border-double border-slate-900">
                <div className="text-[19px] sm:text-[21px] font-extrabold tracking-wide uppercase text-slate-950 leading-tight">
                  {(kopOutletName || displayName).toUpperCase()}
                </div>
                <div className="text-[13px] sm:text-[13.5px] font-medium text-slate-700 mt-1">
                  {kopAddress.trim() || 'Alamat outlet belum tersedia'}
                </div>
              </div>

              {/* JUDUL BERITA ACARA */}
              <div className="text-center mt-6 mb-5">
                <span className="inline-block text-[14.5px] font-extrabold tracking-wide uppercase border-b-2 border-slate-900 pb-0.5">
                  {documentTitle}
                </span>
              </div>

              {/* KEPADA YTH */}
              <div className="mb-4">
                <div>Kepada Yth.</div>
                <div className="font-bold">Team QC di Jakarta</div>
              </div>

              {/* IDENTITAS */}
              <div className="mb-4">
                <div className="mb-1.5">Yang bertanda tangan di bawah ini:</div>
                <table className="w-full text-[12.5px]">
                  <tbody>
                    <tr>
                      <td className="w-28 py-0.5">Nama</td>
                      <td className="w-4 py-0.5">:</td>
                      <td className="font-bold py-0.5">
                        {managerName.trim() || '.................................'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-0.5">Jabatan</td>
                      <td className="py-0.5">:</td>
                      <td className="font-bold py-0.5">
                        {managerJabatan.trim() || 'Cinema Manager'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-0.5">Outlet</td>
                      <td className="py-0.5">:</td>
                      <td className="font-bold py-0.5">
                        {outletFieldName.trim() || displayName}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ISI PERMOHONAN */}
              <p className="mb-2 text-justify">{sopConditionSentence}</p>
              {isGabungan ? (
                (effectiveCarpetStatus.lastDate ||
                  effectiveCarpetStatus.expDate ||
                  effectiveChairStatus.lastDate ||
                  effectiveChairStatus.expDate) && (
                  <div className="text-[11px] text-slate-600 mb-3 space-y-0.5">
                    {(effectiveCarpetStatus.lastDate || effectiveCarpetStatus.expDate) && (
                      <p>
                        Catatan Jadwal SOP Karpet: Pencucian terakhir{' '}
                        <span className="font-semibold">
                          {formatDateIndonesian(effectiveCarpetStatus.lastDate)}
                        </span>{' '}
                        | Jatuh tempo SOP{' '}
                        <span className="font-semibold">
                          {formatDateIndonesian(effectiveCarpetStatus.expDate)}
                        </span>
                        .
                      </p>
                    )}
                    {(effectiveChairStatus.lastDate || effectiveChairStatus.expDate) && (
                      <p>
                        Catatan Jadwal SOP Kursi: Pencucian terakhir{' '}
                        <span className="font-semibold">
                          {formatDateIndonesian(effectiveChairStatus.lastDate)}
                        </span>{' '}
                        | Jatuh tempo SOP{' '}
                        <span className="font-semibold">
                          {formatDateIndonesian(effectiveChairStatus.expDate)}
                        </span>
                        .
                      </p>
                    )}
                  </div>
                )
              ) : (
                (activeSingleStatus.lastDate || activeSingleStatus.expDate) && (
                  <p className="text-[11px] text-slate-600 mb-3">
                    Catatan Jadwal SOP: Pencucian terakhir{' '}
                    <span className="font-semibold">
                      {formatDateIndonesian(activeSingleStatus.lastDate)}
                    </span>{' '}
                    | Jatuh tempo SOP{' '}
                    <span className="font-semibold">
                      {formatDateIndonesian(activeSingleStatus.expDate)}
                    </span>
                    .
                  </p>
                )
              )}

              {/* RINCIAN */}
              <div className="mb-4">
                <div className="font-bold mb-1.5">Dengan rincian sebagai berikut:</div>
                {isGabungan ? (
                  <table className="w-full border-collapse border border-slate-300 text-[12px]">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 px-3 py-1.5 text-left font-bold">
                          Area / Ruangan
                        </th>
                        <th className="border border-slate-300 px-3 py-1.5 text-right font-bold w-36 whitespace-nowrap">
                          Luas Karpet (m²)
                        </th>
                        <th className="border border-slate-300 px-3 py-1.5 text-right font-bold w-32 whitespace-nowrap">
                          Jumlah Kursi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {combinedRows.map((row) => (
                        <tr key={row.id}>
                          <td className="border border-slate-300 px-3 py-1.5">
                            {row.label || '-'}
                          </td>
                          <td className="border border-slate-300 px-3 py-1.5 text-right tabular-nums">
                            {row.areaSqm.trim() ? `${row.areaSqm} m²` : '-'}
                          </td>
                          <td className="border border-slate-300 px-3 py-1.5 text-right tabular-nums">
                            {row.seats.trim() ? `${row.seats} kursi` : '-'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold">
                        <td className="border border-slate-300 px-3 py-1.5">Total</td>
                        <td className="border border-slate-300 px-3 py-1.5 text-right tabular-nums">
                          {totalCombinedSqm > 0
                            ? `${Math.round(totalCombinedSqm * 100) / 100} m²`
                            : '- m²'}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 text-right tabular-nums">
                          {totalCombinedSeats > 0 ? `${totalCombinedSeats} kursi` : '- kursi'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full border-collapse border border-slate-300 text-[12px]">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 px-3 py-1.5 text-left font-bold">
                          {isKarpet ? 'Area / Bagian Karpet' : 'Studio / Area Kursi'}
                        </th>
                        <th className="border border-slate-300 px-3 py-1.5 text-right font-bold w-40 whitespace-nowrap">
                          {isKarpet ? 'Luas Karpet (m²)' : 'Jumlah Kursi'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isKarpet
                        ? carpetRows.map((row) => (
                            <tr key={row.id}>
                              <td className="border border-slate-300 px-3 py-1.5">
                                {row.label || '-'}
                              </td>
                              <td className="border border-slate-300 px-3 py-1.5 text-right tabular-nums">
                                {row.areaSqm.trim() ? `${row.areaSqm} m²` : '- m²'}
                              </td>
                            </tr>
                          ))
                        : chairRows.map((row) => (
                            <tr key={row.id}>
                              <td className="border border-slate-300 px-3 py-1.5">
                                {row.studioName || '-'}
                              </td>
                              <td className="border border-slate-300 px-3 py-1.5 text-right tabular-nums">
                                {row.seats.trim() ? `${row.seats} kursi` : '- kursi'}
                              </td>
                            </tr>
                          ))}
                      <tr className="bg-slate-50 font-bold">
                        <td className="border border-slate-300 px-3 py-1.5">
                          {isKarpet ? 'Total Luas Karpet' : 'Total Kursi Studio'}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 text-right tabular-nums">
                          {isKarpet
                            ? totalCarpetSqm > 0
                              ? `${Math.round(totalCarpetSqm * 100) / 100} m²`
                              : '- m²'
                            : totalSeats > 0
                            ? `${totalSeats} kursi`
                            : '- kursi'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {additionalNote.trim() && (
                  <div className="text-[11px] italic text-slate-600 mt-2">
                    Keterangan Tambahan: {additionalNote.trim()}
                  </div>
                )}
              </div>

              {/* PENUTUP */}
              <p className="mb-6">
                Demikian berita acara ini kami buat dengan data yang sebenar-benarnya, terima kasih.
              </p>

              {/* TEMPAT & TANGGAL */}
              <div className="mb-3">
                {cityName.trim() || 'Bogor'},{' '}
                {letterDateStr.trim() || formatTodayIndonesian()}
              </div>

              {/* TANDA TANGAN 3 KOLOM */}
              <div className="grid grid-cols-3 gap-3 text-center mt-2">
                <div>
                  <div className="font-medium">Yang membuat,</div>
                  <div className="text-[11px] text-slate-500">
                    {managerJabatan.trim() || 'Manager Outlet'}
                  </div>
                  <div className="h-16 flex items-center justify-center my-1">
                    {signatureDataUrl && (
                      <img
                        src={signatureDataUrl}
                        alt="Tanda Tangan Digital Cinema Manager"
                        className="max-h-16 w-auto max-w-full object-contain"
                      />
                    )}
                  </div>
                  <div className="font-bold">
                    ( {managerName.trim() || '..........................'} )
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="font-medium">Mengetahui,</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] text-slate-500">Area Manager</div>
                      <div className="h-16" />
                      <div className="font-bold">
                        ( {areaManagerName.trim() || 'Bpk. Fachri'} )
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Regional Manager</div>
                      <div className="h-16" />
                      <div className="font-bold">
                        ( {regionalManagerName.trim() || 'Bpk. Abdul Basit'} )
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500">
            Semua kolom di sebelah kiri dapat diedit sebelum mengunduh dokumen PDF.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-500 shadow-xs transition-colors cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Download Berita Acara (PDF)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
