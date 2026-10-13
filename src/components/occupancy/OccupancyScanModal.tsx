import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Outlet } from '../../types';
import { StorageService } from '../../lib/storage';
import { OcrService } from '../../lib/ocrService';
import { MistralService } from '../../lib/mistral';
import {
  Upload,
  Sparkles,
  X,
  Check,
  Loader2,
  ScanLine,
  Camera,
  Building2,
  Calendar,
  Plus,
  Trash2,
  Film,
  FileText,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from 'lucide-react';

interface OccupancyScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOutletId?: string;
  initialDate: string;
  onApplyData: (
    outletId: string,
    date: string,
    studioRows: Array<{
      id: string;
      studioName: string;
      filmTitle: string;
      genre?: string;
      capacity: number;
      shows: { [showNum: number]: number };
      notes: string;
    }>
  ) => void;
}

const GENRE_BADGES: { [g: string]: string } = {
  Horror: 'bg-rose-100 text-rose-900 border-rose-300 font-extrabold',
  Comedy: 'bg-emerald-100 text-emerald-950 border-emerald-300 font-extrabold',
  Action: 'bg-amber-100 text-amber-950 border-amber-300 font-extrabold',
  Drama: 'bg-blue-100 text-blue-950 border-blue-300 font-extrabold',
  Romance: 'bg-pink-100 text-pink-950 border-pink-300 font-extrabold',
  Thriller: 'bg-orange-100 text-orange-950 border-orange-300 font-extrabold',
  'Sci-Fi': 'bg-cyan-100 text-cyan-950 border-cyan-300 font-extrabold',
  Adventure: 'bg-lime-100 text-lime-950 border-lime-300 font-extrabold',
  Fantasy: 'bg-violet-100 text-violet-950 border-violet-300 font-extrabold',
  Animation: 'bg-indigo-100 text-indigo-950 border-indigo-300 font-extrabold',
  Family: 'bg-purple-100 text-purple-950 border-purple-300 font-extrabold',
  Religion: 'bg-yellow-100 text-yellow-950 border-yellow-400 font-extrabold',
  Biography: 'bg-teal-100 text-teal-950 border-teal-300 font-extrabold',
};

export const OccupancyScanModal: React.FC<OccupancyScanModalProps> = ({
  isOpen,
  onClose,
  initialOutletId,
  initialDate,
  onApplyData,
}) => {
  const outlets = StorageService.getOutlets();
  const areas = StorageService.getAreas();
  const currentConfig = StorageService.getConfig();

  const [selectedOutletId, setSelectedOutletId] = useState<string>(
    initialOutletId && initialOutletId !== 'all'
      ? initialOutletId
      : outlets[0]?.id || ''
  );
  const [targetDate, setTargetDate] = useState<string>(initialDate);

  // Provider & API Key State
  const [ocrProvider, setOcrProvider] = useState<'mistral' | 'gemini'>(
    Boolean(currentConfig.mistralApiKey?.trim()) ? 'mistral' : 'gemini'
  );
  const [mistralApiKey, setMistralApiKey] = useState<string>(
    currentConfig.mistralApiKey || ''
  );
  const [showKeyConfig, setShowKeyConfig] = useState<boolean>(false);
  const [testKeyStatus, setTestKeyStatus] = useState<string | null>(null);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);

  // File & Scanning State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [fileSizeStr, setFileSizeStr] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedStudios, setExtractedStudios] = useState<
    Array<{
      tempId: string;
      studioName: string;
      filmTitle: string;
      genre?: string;
      capacity: number;
      shows: { [showNum: number]: number };
      notes: string;
      slideIndex?: number;
      detectedOutlet?: string;
    }>
  >([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [activeSlideFilter, setActiveSlideFilter] = useState<'all' | number>('all');
  const [detectedOutletName, setDetectedOutletName] = useState<string | null>(null);
  const [slideImages, setSlideImages] = useState<string[]>([]);
  const [previewSlideIdx, setPreviewSlideIdx] = useState<number | null>(null);

  const [confidenceText, setConfidenceText] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [multiFilmDetected, setMultiFilmDetected] = useState<boolean>(false);
  const [detectedClass, setDetectedClass] = useState<string>('A');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      if (initialOutletId && initialOutletId !== 'all') {
        setSelectedOutletId(initialOutletId);
      }
      setTargetDate(initialDate);
      const conf = StorageService.getConfig();
      if (conf.mistralApiKey) {
        setMistralApiKey(conf.mistralApiKey);
      }
    }
  }, [isOpen, initialOutletId, initialDate]);

  // List of unique slides detected
  const slideNumbers = useMemo(() => {
    const setNums = new Set<number>();
    for (let i = 1; i <= totalPages; i++) setNums.add(i);
    extractedStudios.forEach((st) => {
      if (st.slideIndex) setNums.add(st.slideIndex);
    });
    return Array.from(setNums).sort((a, b) => a - b);
  }, [totalPages, extractedStudios]);

  // Filtered rows for display based on active slide filter
  const displayedStudios = useMemo(() => {
    if (activeSlideFilter === 'all') return extractedStudios;
    return extractedStudios.filter((st) => (st.slideIndex || 1) === activeSlideFilter);
  }, [extractedStudios, activeSlideFilter]);

  const currentOutlet =
    outlets.find((o) => o.id === selectedOutletId) || outlets[0];

  const handleSaveMistralKey = () => {
    StorageService.saveConfig({
      mistralApiKey: mistralApiKey.trim(),
      ocrProvider: 'mistral',
    });
    setTestKeyStatus('API Key berhasil disimpan & Mistral OCR aktif!');
    setTimeout(() => setTestKeyStatus(null), 3000);
  };

  const handleTestMistralConnection = async () => {
    if (!mistralApiKey.trim()) {
      setTestKeyStatus('Harap masukkan API Key Mistral terlebih dahulu.');
      return;
    }
    setIsTestingKey(true);
    setTestKeyStatus('Memverifikasi koneksi Mistral AI...');
    try {
      const res = await MistralService.testConnection(mistralApiKey.trim());
      setTestKeyStatus(res.message);
      if (res.success) {
        StorageService.saveConfig({
          mistralApiKey: mistralApiKey.trim(),
          ocrProvider: 'mistral',
        });
      }
    } catch {
      setTestKeyStatus('Gagal menghubungi server Mistral AI.');
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const pdfDetected =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    setIsPdf(pdfDetected);
    setFileName(file.name);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    setFileSizeStr(
      file.size > 1024 * 1024 ? `${sizeMb} MB` : `${Math.round(file.size / 1024)} KB`
    );

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      processImage(base64, pdfDetected);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64: string, pdfMode = false) => {
    setIsLoading(true);
    setStatusMessage(
      pdfMode
        ? ocrProvider === 'mistral'
          ? 'Membaca seluruh slide/halaman dokumen PDF dengan Mistral OCR Engine...'
          : 'Membaca dokumen PDF multi-halaman & menganalisis jadwal studio...'
        : 'Memproses gambar laporan okupansi bioskop...'
    );
    try {
      const result = await OcrService.processOccupancyImage(
        base64,
        currentOutlet,
        pdfMode,
        {
          provider: ocrProvider,
          mistralApiKey: mistralApiKey.trim(),
        }
      );

      const pagesDetected = result.totalPages || (pdfMode ? 2 : 1);
      setTotalPages(pagesDetected);
      setActiveSlideFilter('all');

      if (result.slideImages && result.slideImages.length > 0) {
        setSlideImages(result.slideImages);
      }

      if (result.date) {
        setTargetDate(result.date);
      }

      if (result.detectedClass) {
        setDetectedClass(result.detectedClass);
      } else if (currentOutlet?.class) {
        setDetectedClass(currentOutlet.class);
      }

      setConfidenceText(
        result.confidence ||
          (pdfMode
            ? `Dokumen PDF (${pagesDetected} Slide) Berhasil Diekstrak`
            : 'Terdeteksi Sukses')
      );

      // Cek deteksi nama outlet bioskop dalam PDF
      if (result.outletName && result.outletName !== 'Cinema XXI') {
        const matched = outlets.find(
          (o) =>
            o.name.toLowerCase().includes(result.outletName!.toLowerCase()) ||
            result.outletName!.toLowerCase().includes(o.name.toLowerCase())
        );
        if (matched && matched.id !== selectedOutletId) {
          setDetectedOutletName(matched.name);
          if (matched.class) setDetectedClass(matched.class);
        }
      }

      // Check if any studio appears more than once (2 films in 1 studio)
      const studioCountMap: { [key: string]: number } = {};
      result.studios.forEach((s) => {
        studioCountMap[s.studioName] = (studioCountMap[s.studioName] || 0) + 1;
      });
      const hasMulti = Object.values(studioCountMap).some((count) => count > 1);
      setMultiFilmDetected(hasMulti);

      // Map to rows with temp id, capacity, and slideIndex
      const rows = result.studios.map((s, idx) => {
        let stdName = (s.studioName || 'Studio 1').trim();
        if (/^\d+$/.test(stdName)) {
          stdName = `Studio ${stdName}`;
        }
        const matchedStudio = currentOutlet?.studios?.find(
          (cs) =>
            cs.name.toLowerCase() === stdName.toLowerCase() ||
            (stdName.toLowerCase().includes('imax') && (cs.name.toLowerCase().includes('imax') || cs.name.toLowerCase().includes('imex'))) ||
            (stdName.toLowerCase().includes('imex') && (cs.name.toLowerCase().includes('imax') || cs.name.toLowerCase().includes('imex')))
        );
        const capacity = matchedStudio?.capacity || s.capacity || 200;
        const title = s.filmTitle || s.notes || '';
        const detectedGenre = StorageService.resolveFilmGenre(title, s.genre);

        return {
          tempId: `scan-${Date.now()}-${idx}`,
          studioName: stdName,
          filmTitle: title,
          genre: detectedGenre,
          capacity,
          shows: {
            1: s.shows[1] || 0,
            2: s.shows[2] || 0,
            3: s.shows[3] || 0,
            4: s.shows[4] || 0,
            5: s.shows[5] || 0,
            6: s.shows[6] || 0,
            7: s.shows[7] || 0,
          },
          notes: s.notes || title,
          slideIndex: s.slideIndex || 1,
          detectedOutlet: s.detectedOutlet || result.outletName,
        };
      });

      setExtractedStudios(rows);

      const grandAudience = rows.reduce(
        (sum, r) => sum + Object.values(r.shows).reduce((s, v) => s + (v || 0), 0),
        0
      );
      const hasRealTitles = rows.some((r) => r.filmTitle.trim() !== '');

      if (grandAudience > 0 || hasRealTitles) {
        setStatusMessage(
          `Sukses! ${rows.length} studio & ${grandAudience.toLocaleString('id-ID')} penonton berhasil diekstrak dari ${pagesDetected} slide/halaman.`
        );
      } else {
        setStatusMessage(
          `Dokumen (${pagesDetected} slide) telah dimuat. Tabel studio belum terbaca otomatis, Anda dapat mencoba tombol 'Scan Ulang Gemini AI' di atas tabel.`
        );
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      const errMsg = err?.message || '';
      if (errMsg.includes('API key') || errMsg.includes('401') || errMsg.includes('Unauthorized')) {
        setStatusMessage('Gagal: API Key tidak valid atau belum diisi. Silakan periksa pengaturan Key Mistral/Gemini.');
      } else if (errMsg.includes('network') || errMsg.includes('Failed to fetch')) {
        setStatusMessage('Gagal: Gangguan koneksi internet ke server AI/OCR. Silakan coba kembali.');
      } else {
        setStatusMessage(
          `Gagal menganalisis dokumen (${errMsg ? errMsg.slice(0, 100) : 'Format tidak terbaca'}). Silakan periksa file atau pilih engine OCR lainnya.`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudioNameChange = (index: number, newStudioName: string) => {
    setExtractedStudios((prev) => {
      const clone = [...prev];
      const matchedStudio = currentOutlet?.studios?.find(
        (cs) =>
          cs.name.toLowerCase() === newStudioName.toLowerCase() ||
          (newStudioName.toLowerCase().includes('imax') && (cs.name.toLowerCase().includes('imax') || cs.name.toLowerCase().includes('imex'))) ||
          (newStudioName.toLowerCase().includes('imex') && (cs.name.toLowerCase().includes('imax') || cs.name.toLowerCase().includes('imex')))
      );
      clone[index] = {
        ...clone[index],
        studioName: newStudioName,
        capacity: matchedStudio?.capacity || clone[index].capacity || 200,
      };
      return clone;
    });
  };

  const handleShowChange = (index: number, showNum: number, value: any) => {
    const cleanVal = StorageService.parseAudienceCount(value);
    setExtractedStudios((prev) => {
      const clone = [...prev];
      clone[index] = {
        ...clone[index],
        shows: {
          ...clone[index].shows,
          [showNum]: cleanVal,
        },
      };
      return clone;
    });
  };

  const handleFilmTitleChange = (index: number, value: string) => {
    setExtractedStudios((prev) => {
      const clone = [...prev];
      const autoGenre = StorageService.resolveFilmGenre(value, clone[index]?.genre);
      clone[index] = {
        ...clone[index],
        filmTitle: value,
        notes: value,
        genre: autoGenre,
      };
      return clone;
    });
  };

  const handleGenreChange = (index: number, genre: string) => {
    setExtractedStudios((prev) => {
      const clone = [...prev];
      clone[index] = {
        ...clone[index],
        genre,
      };
      if (clone[index].filmTitle) {
        StorageService.setFilmGenre(clone[index].filmTitle, genre);
      }
      return clone;
    });
  };

  const handleAddFilmRow = (studioName: string, slideIndex = 1) => {
    const matchedStudio = currentOutlet?.studios?.find(
      (cs) => cs.name.toLowerCase() === studioName.toLowerCase()
    );
    const capacity = matchedStudio?.capacity || 200;

    setExtractedStudios((prev) => [
      ...prev,
      {
        tempId: `manual-${Date.now()}`,
        studioName,
        filmTitle: 'Film Tambahan',
        genre: 'Action',
        capacity,
        shows: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
        notes: 'Film Tambahan',
        slideIndex,
      },
    ]);
    setMultiFilmDetected(true);
  };

  const handleDeleteRow = (index: number) => {
    setExtractedStudios((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApply = () => {
    if (!selectedOutletId || extractedStudios.length === 0) return;

    // Update target outlet Class/Grade if detected or selected
    if (selectedOutletId && detectedClass) {
      const allOutlets = StorageService.getOutlets();
      const targetOut = allOutlets.find((o) => o.id === selectedOutletId);
      if (targetOut && targetOut.class !== detectedClass) {
        StorageService.saveOutlet({
          ...targetOut,
          class: detectedClass,
        });
      }
    }

    const rowsToApply = extractedStudios.map((st, idx) => {
      const title = st.filmTitle || st.notes || '';
      const genre = StorageService.resolveFilmGenre(title, st.genre);
      return {
        id: `${selectedOutletId}_${st.studioName}_${idx}_${Date.now()}`,
        studioName: st.studioName,
        filmTitle: title,
        genre,
        capacity: st.capacity,
        shows: st.shows,
        notes: st.notes || title,
      };
    });

    setTimeout(() => {
      onClose();
      onApplyData(selectedOutletId, targetDate, rowsToApply);
    }, 50);
  };

  const handleSwitchToDetectedOutlet = () => {
    if (!detectedOutletName) return;
    const found = outlets.find(
      (o) =>
        o.name.toLowerCase().includes(detectedOutletName.toLowerCase()) ||
        detectedOutletName.toLowerCase().includes(o.name.toLowerCase())
    );
    if (found) {
      setSelectedOutletId(found.id);
      setDetectedOutletName(null);
    }
  };

  const SHOWS = [1, 2, 3, 4, 5, 6, 7];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[94vh] flex flex-col rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-2xl overflow-hidden transition">
        {/* Header */}
        <div className="p-4 border-b border-amber-200/80 flex items-center justify-between bg-amber-50/70 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold shadow-xs">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">
                  Upload &amp; Scan Okupansi Studio XXI
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Multi-Slide PDF
                </span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-black border ${
                    ocrProvider === 'mistral'
                      ? 'bg-orange-100 text-orange-950 border-orange-300'
                      : 'bg-cyan-100 text-cyan-950 border-cyan-300'
                  }`}
                >
                  {ocrProvider === 'mistral' ? '⚡ Mistral OCR Engine' : '✦ Gemini AI Vision'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Membaca jadwal &amp; penonton per studio dari dokumen PDF berapapun jumlah slide / halamannya.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* OCR Engine Switcher & Mistral Quick Key Setting Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-slate-700">Pilih OCR Engine:</span>
            <div className="inline-flex rounded-xl p-0.5 bg-slate-200 border border-slate-300">
              <button
                type="button"
                onClick={() => {
                  setOcrProvider('mistral');
                  StorageService.saveConfig({ ocrProvider: 'mistral' });
                }}
                className={`px-3 py-1 rounded-lg font-black text-xs transition cursor-pointer flex items-center space-x-1.5 ${
                  ocrProvider === 'mistral'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>⚡ Mistral OCR (Rekomendasi PDF Multi-Slide)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOcrProvider('gemini');
                  StorageService.saveConfig({ ocrProvider: 'gemini' });
                }}
                className={`px-3 py-1 rounded-lg font-black text-xs transition cursor-pointer flex items-center space-x-1.5 ${
                  ocrProvider === 'gemini'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>✦ Gemini AI Vision</span>
              </button>
            </div>
          </div>

          {ocrProvider === 'mistral' && (
            <div className="flex items-center space-x-2">
              {mistralApiKey ? (
                <div className="flex items-center space-x-1.5 text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px]">API Key Terpasang</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 text-amber-800 font-bold bg-amber-100/70 px-2.5 py-1 rounded-xl border border-amber-300">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  <span className="text-[11px]">Key belum diisi</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowKeyConfig(!showKeyConfig)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-bold text-slate-700 flex items-center space-x-1 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                <span>{showKeyConfig ? 'Tutup Pengaturan Key' : 'Kelola Key Mistral'}</span>
                {showKeyConfig ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Collapsible Mistral Key Input */}
        {showKeyConfig && ocrProvider === 'mistral' && (
          <div className="p-4 bg-amber-50/60 border-b border-amber-200 animate-in slide-in-from-top-2 duration-150">
            <div className="max-w-2xl mx-auto space-y-2">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                Masukkan API Key Mistral AI (untuk Mistral Document OCR mistral-ocr-latest):
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="password"
                  value={mistralApiKey}
                  onChange={(e) => setMistralApiKey(e.target.value)}
                  placeholder="mistral_api_key_..."
                  className="flex-1 text-xs font-mono px-3 py-2 rounded-xl border border-amber-300 bg-white text-slate-900 focus:outline-hidden focus:border-amber-500 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={handleSaveMistralKey}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
                >
                  Simpan Key
                </button>
                <button
                  type="button"
                  onClick={handleTestMistralConnection}
                  disabled={isTestingKey}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isTestingKey && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />}
                  <span>Tes Koneksi</span>
                </button>
              </div>
              {testKeyStatus && (
                <p className="text-xs font-bold text-amber-900 mt-1">{testKeyStatus}</p>
              )}
            </div>
          </div>
        )}

        {/* Content Body (Scrollable) */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Outlet & Date Selector */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Pilih Outlet Bioskop yang Ingin Diterapkan:</span>
              </label>
              <select
                value={selectedOutletId}
                onChange={(e) => setSelectedOutletId(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-amber-500 shadow-2xs"
              >
                {areas.map((area) => (
                  <optgroup key={area.id} label={area.name}>
                    {outlets
                      .filter((o) => o.areaId === area.id)
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.studios?.length || 0} Studio)
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Tanggal Laporan Okupansi:</span>
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-amber-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Detected Outlet Alert Banner */}
          {detectedOutletName && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-3 text-xs text-amber-950 font-bold">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Dokumen PDF ini terdeteksi memiliki jadwal untuk bioskop{' '}
                  <strong className="underline text-amber-900">{detectedOutletName}</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={handleSwitchToDetectedOutlet}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shrink-0 cursor-pointer shadow-xs"
              >
                Ganti Outlet ke {detectedOutletName}
              </button>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,application/pdf,.pdf"
            className="hidden"
          />

          {/* Upload Area if No Image */}
          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-amber-300 rounded-2xl p-8 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/50 transition flex flex-col items-center justify-center space-y-3 bg-[#faf8f4]"
            >
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-slate-800">
                  Klik untuk Upload Dokumen PDF atau Foto Laporan Okupansi Bioskop
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Mendukung Dokumen PDF (Multi-Slide / Multi-Halaman) &bull; JPG &bull; PNG &bull; Otomatis membaca seluruh studio &amp; show 1-7
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 flex items-center space-x-1.5 shadow-sm hover:bg-amber-400 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Pilih Foto / Gambar</span>
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-800 border border-slate-300 flex items-center space-x-1.5 shadow-2xs hover:bg-slate-50 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span>Pilih File Dokumen PDF (Banyak Slide)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image / PDF Preview Thumbnail + Replace */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center space-x-3 min-w-0">
                  {isPdf ? (
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex flex-col items-center justify-center shrink-0">
                      <FileText className="w-6 h-6" />
                      <span className="text-[9px] font-black uppercase">PDF</span>
                    </div>
                  ) : (
                    <img
                      src={imagePreview}
                      alt="Laporan Okupansi"
                      className="w-12 h-12 object-cover rounded-xl border border-slate-300 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 block truncate">
                      {fileName ||
                        (isPdf
                          ? 'Dokumen PDF Laporan Terunggah'
                          : 'Foto Jadwal / Laporan Terunggah')}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {isPdf && fileSizeStr ? `PDF (${fileSizeStr}) • ` : ''}
                      {totalPages > 1 ? `Terdeteksi ${totalPages} Slide • ` : ''}
                      Target: {currentOutlet?.name} &bull; {targetDate}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Ganti File
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setIsPdf(false);
                      setFileName('');
                      setExtractedStudios([]);
                      setSlideImages([]);
                      setPreviewSlideIdx(null);
                      setTotalPages(1);
                      setActiveSlideFilter('all');
                      setDetectedOutletName(null);
                    }}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isLoading && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center space-x-3 text-amber-800 text-xs font-bold">
                  <Loader2 className="w-5 h-5 animate-spin shrink-0 text-amber-600" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* Extracted Studios Table */}
              {extractedStudios.length > 0 && (() => {
                const totalCap = extractedStudios.reduce(
                  (acc, st) => acc + (st.capacity || 0),
                  0
                );
                const grandTotalAud = extractedStudios.reduce((acc, st) => {
                  return acc + SHOWS.reduce((sAcc, n) => sAcc + (st.shows[n] || 0), 0);
                }, 0);
                const activeShowSlots = extractedStudios.reduce((acc, st) => {
                  return acc + SHOWS.filter((n) => (st.shows[n] || 0) > 0).length;
                }, 0);
                const totalActiveCap = extractedStudios.reduce((acc, st) => {
                  const activeCount = SHOWS.filter((n) => (st.shows[n] || 0) > 0).length;
                  return acc + (st.capacity || 200) * (activeCount || 1);
                }, 0);
                const grandOccRate =
                  totalActiveCap > 0
                    ? ((grandTotalAud / totalActiveCap) * 100).toFixed(1)
                    : totalCap > 0
                    ? ((grandTotalAud / (totalCap * 5)) * 100).toFixed(1)
                    : '0.0';
                const uniqueFilmSet = new Set(
                  extractedStudios
                    .map((st) => (st.filmTitle || st.notes || '').trim().toUpperCase())
                    .filter((t) => t && t !== '-' && t.length > 1)
                );
                const jumlahFilmCount = uniqueFilmSet.size;
                const outletGrade = currentOutlet?.class || 'A';

                return (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-extrabold text-emerald-800">
                          {confidenceText}
                        </span>
                      </div>

                      {multiFilmDetected && (
                        <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-purple-100 text-purple-900 border border-purple-300 flex items-center space-x-1">
                          <Film className="w-3.5 h-3.5 text-purple-700" />
                          <span>2 Film Terdeteksi dalam 1 Studio (Baris Bertambah Otomatis)</span>
                        </span>
                      )}
                    </div>

                    {grandTotalAud === 0 && !isLoading && (
                      <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-3 text-amber-900 text-xs">
                        <div className="flex items-start space-x-2.5">
                          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-extrabold">Data Tabel Belum Terbaca Sepenuhnya</p>
                            <p className="text-[11px] text-amber-800 mt-0.5">
                              Judul film atau penonton belum terbaca otomatis. Anda dapat mencoba memindai ulang dengan Gemini AI Vision, atau mengisi langsung pada baris tabel di bawah.
                            </p>
                          </div>
                        </div>
                        {imagePreview && (
                          <button
                            type="button"
                            onClick={() => {
                              setOcrProvider('gemini');
                              processImage(imagePreview, isPdf);
                            }}
                            className="px-3.5 py-2 rounded-xl font-black bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs flex items-center space-x-1.5 cursor-pointer shadow-xs"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>Scan Ulang Gemini AI Vision</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Ringkasan Total Hasil Scan */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-amber-50/80 to-purple-50/80 border border-emerald-200/90 shadow-2xs">
                      <div className="p-2.5 bg-white/90 rounded-xl border border-amber-300">
                        <span className="text-[10px] uppercase font-black text-slate-500 block">
                          Grade Outlet
                        </span>
                        <select
                          value={detectedClass || currentOutlet?.class || 'A'}
                          onChange={(e) => setDetectedClass(e.target.value)}
                          className="text-xs font-black text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300 focus:outline-hidden mt-0.5 w-full cursor-pointer"
                          title="Ubah Grade Outlet"
                        >
                          <option value="A">Grade A</option>
                          <option value="B">Grade B</option>
                          <option value="C">Grade C</option>
                          <option value="D">Grade D</option>
                          <option value="Premiere">Grade Premiere</option>
                          <option value="HS">Grade HS</option>
                        </select>
                      </div>
                      <div className="p-2.5 bg-white/90 rounded-xl border border-slate-200">
                        <span className="text-[10px] uppercase font-black text-slate-500 block">
                          Jumlah Film
                        </span>
                        <span className="text-sm font-black text-slate-900 mt-0.5 block flex items-center space-x-1">
                          <Film className="w-3.5 h-3.5 text-amber-600" />
                          <span>{jumlahFilmCount} Film</span>
                        </span>
                      </div>
                      <div className="p-2.5 bg-white/90 rounded-xl border border-slate-200">
                        <span className="text-[10px] uppercase font-black text-slate-500 block">
                          Total Studio
                        </span>
                        <span className="text-sm font-black text-slate-900 mt-0.5 block">
                          {extractedStudios.length} Studio
                        </span>
                      </div>
                      <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200">
                        <span className="text-[10px] uppercase font-black text-amber-800 block">
                          Total Kapasitas Kursi
                        </span>
                        <span className="text-sm font-black text-amber-950 mt-0.5 block">
                          {totalCap.toLocaleString('id-ID')} Kursi
                        </span>
                      </div>
                      <div className="p-2.5 bg-white/90 rounded-xl border border-emerald-300">
                        <span className="text-[10px] uppercase font-black text-emerald-800 block">
                          Total Penonton
                        </span>
                        <span className="text-base font-black text-emerald-950 mt-0.5 block">
                          {grandTotalAud.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white/90 rounded-xl border border-purple-200">
                        <span className="text-[10px] uppercase font-black text-purple-800 block">
                          Rata-Rata Okupansi
                        </span>
                        <span className="text-base font-black text-purple-900 mt-0.5 block">
                          {grandOccRate}%
                        </span>
                      </div>
                    </div>

                    {/* Filter Slide Pills jika memiliki banyak slide */}
                    {slideNumbers.length > 1 && (
                      <div className="p-2.5 rounded-2xl bg-slate-100/80 border border-slate-200 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-black text-slate-600 mr-1 flex items-center space-x-1">
                          <Layers className="w-3.5 h-3.5 text-amber-600" />
                          <span>Filter Slide:</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveSlideFilter('all')}
                          className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                            activeSlideFilter === 'all'
                              ? 'bg-amber-500 text-slate-950 shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Semua Slide ({extractedStudios.length} Studio)
                        </button>
                        {slideNumbers.map((sNum) => {
                          const countInSlide = extractedStudios.filter(
                            (st) => (st.slideIndex || 1) === sNum
                          ).length;
                          return (
                            <button
                              key={sNum}
                              type="button"
                              onClick={() => setActiveSlideFilter(sNum)}
                              className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer flex items-center space-x-1 ${
                                activeSlideFilter === sNum
                                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <span>Slide {sNum}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800">
                                {countInSlide}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Slide Inspector jika PDF memiliki slide images */}
                    {slideImages.length > 0 && (
                      <div className="p-3 rounded-2xl bg-slate-900 text-white border border-slate-700 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center space-x-2">
                            <Eye className="w-4 h-4 text-amber-400" />
                            <span className="font-extrabold text-amber-300">
                              Pratinjau Slide Asli PDF (
                              {previewSlideIdx !== null
                                ? `Slide ${previewSlideIdx + 1} dari ${slideImages.length}`
                                : 'Klik Slide untuk Melihat Dokumen Asli'}
                              ):
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {slideImages.map((_, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() =>
                                  setPreviewSlideIdx(previewSlideIdx === idx ? null : idx)
                                }
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer ${
                                  previewSlideIdx === idx
                                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                }`}
                              >
                                Slide {idx + 1}
                              </button>
                            ))}
                            {previewSlideIdx !== null && (
                              <button
                                type="button"
                                onClick={() => setPreviewSlideIdx(null)}
                                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer ml-1"
                                title="Tutup Pratinjau Slide"
                              >
                                <EyeOff className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        {previewSlideIdx !== null && slideImages[previewSlideIdx] && (
                          <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 max-h-72 flex items-center justify-center p-1 overflow-auto">
                            <img
                              src={slideImages[previewSlideIdx]}
                              alt={`Slide ${previewSlideIdx + 1}`}
                              className="max-h-68 w-auto object-contain rounded-lg shadow-lg"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Table Studios */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                      <div className="overflow-x-auto max-h-72">
                        <table className="w-full text-xs text-left">
                          <thead className="uppercase text-[10px] font-black border-b border-slate-200 bg-slate-50 text-slate-600 sticky top-0 z-10">
                            <tr>
                              <th className="py-2.5 px-3">Slide</th>
                              <th className="py-2.5 px-3">Studio</th>
                              <th className="py-2.5 px-3">Kapasitas</th>
                              <th className="py-2.5 px-3">Judul Film / Keterangan</th>
                              <th className="py-2.5 px-2 text-center min-w-[95px]">Genre</th>
                              {SHOWS.map((num) => (
                                <th key={num} className="py-2.5 px-1.5 text-center min-w-[50px]">
                                  S{num}
                                </th>
                              ))}
                              <th className="py-2.5 px-3 text-center">Total</th>
                              <th className="py-2.5 px-2 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {displayedStudios.map((st) => {
                              // Temukan index sebenarnya di array extractedStudios
                              const realIdx = extractedStudios.findIndex(
                                (item) => item.tempId === st.tempId
                              );
                              const totalAud = SHOWS.reduce(
                                (acc, n) => acc + (st.shows[n] || 0),
                                0
                              );
                              const isDuplicateStudio =
                                extractedStudios.filter(
                                  (item) =>
                                    item.studioName.toLowerCase() ===
                                    st.studioName.toLowerCase()
                                ).length > 1;

                              return (
                                <tr
                                  key={st.tempId}
                                  className={`hover:bg-amber-50/40 transition ${
                                    isDuplicateStudio ? 'bg-purple-50/30' : ''
                                  }`}
                                >
                                  {/* Kolom Slide */}
                                  <td className="py-2 px-3 whitespace-nowrap">
                                    <span className="text-[10px] px-2 py-0.5 rounded-md font-black bg-slate-100 text-slate-700 border border-slate-300">
                                      Slide {st.slideIndex || 1}
                                    </span>
                                  </td>

                                  <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap">
                                    <div className="flex items-center space-x-1.5">
                                      <select
                                        value={st.studioName}
                                        onChange={(e) => handleStudioNameChange(realIdx, e.target.value)}
                                        className="text-xs font-black px-2 py-1 rounded-lg border border-slate-300 bg-amber-50/80 text-amber-950 focus:border-amber-500 cursor-pointer shadow-2xs hover:bg-amber-100 transition"
                                        title="Ubah atau konfirmasi Nama Studio (Studio 1-8, IMAX, Premiere, Hall, dll)"
                                      >
                                        {/* Studio spesifik outlet pilihan */}
                                        {currentOutlet?.studios?.map((os) => (
                                          <option key={os.name} value={os.name}>
                                            {os.name} (Cap {os.capacity})
                                          </option>
                                        ))}

                                        {/* Pilihan standar jika belum terdaftar */}
                                        {['Studio 1', 'Studio 2', 'Studio 3', 'Studio 4', 'Studio 5', 'Studio 6', 'Studio 7', 'Studio 8', 'IMAX', 'PREMIERE 1', 'Hall 1']
                                          .filter(
                                            (std) =>
                                              !currentOutlet?.studios?.some(
                                                (os) => os.name.toLowerCase() === std.toLowerCase()
                                              )
                                          )
                                          .map((std) => (
                                            <option key={std} value={std}>
                                              {std}
                                            </option>
                                          ))}

                                        {/* Opsi kustom jika studioName berbeda */}
                                        {!currentOutlet?.studios?.some(
                                          (os) => os.name.toLowerCase() === st.studioName.toLowerCase()
                                        ) &&
                                          !['Studio 1', 'Studio 2', 'Studio 3', 'Studio 4', 'Studio 5', 'Studio 6', 'Studio 7', 'Studio 8', 'IMAX', 'PREMIERE 1', 'Hall 1'].some(
                                            (std) => std.toLowerCase() === st.studioName.toLowerCase()
                                          ) && (
                                            <option value={st.studioName}>
                                              {st.studioName}
                                            </option>
                                          )}
                                      </select>

                                      {isDuplicateStudio && (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-purple-200 text-purple-900">
                                          Multi-Film
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-center font-black text-amber-900">
                                    {st.capacity}
                                  </td>
                                  <td className="py-1.5 px-3">
                                    <input
                                      type="text"
                                      value={st.filmTitle}
                                      onChange={(e) =>
                                        handleFilmTitleChange(realIdx, e.target.value)
                                      }
                                      className="w-full text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-800 focus:border-amber-400"
                                      placeholder="Judul Film..."
                                    />
                                  </td>

                                  <td className="py-1.5 px-2 text-center whitespace-nowrap">
                                    <select
                                      value={st.genre || 'Action'}
                                      onChange={(e) => handleGenreChange(realIdx, e.target.value)}
                                      className={`text-[10px] font-black px-2 py-1 rounded-lg border focus:outline-hidden cursor-pointer ${
                                        st.genre === 'Horror'
                                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                                          : st.genre === 'Comedy'
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                          : st.genre === 'Drama'
                                          ? 'bg-blue-50 text-blue-800 border-blue-300'
                                          : st.genre === 'Animation'
                                          ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                                          : st.genre === 'Family'
                                          ? 'bg-purple-50 text-purple-800 border-purple-300'
                                          : st.genre === 'Religion'
                                          ? 'bg-yellow-50 text-yellow-900 border-yellow-300'
                                          : 'bg-amber-50 text-amber-900 border-amber-300'
                                      }`}
                                    >
                                      {[
                                        'Action',
                                        'Horror',
                                        'Comedy',
                                        'Drama',
                                        'Romance',
                                        'Thriller',
                                        'Sci-Fi',
                                        'Adventure',
                                        'Fantasy',
                                        'Animation',
                                        'Family',
                                        'Religion',
                                        'Biography',
                                      ].map((g) => (
                                        <option key={g} value={g}>
                                          {g}
                                        </option>
                                      ))}
                                    </select>
                                  </td>

                                  {SHOWS.map((sNum) => (
                                    <td key={sNum} className="py-1 px-1 text-center">
                                      <input
                                        type="text"
                                        value={st.shows[sNum] !== undefined && st.shows[sNum] !== null ? (st.shows[sNum] === 0 ? '' : st.shows[sNum]) : ''}
                                        onChange={(e) =>
                                          handleShowChange(
                                            realIdx,
                                            sNum,
                                            e.target.value
                                          )
                                        }
                                        placeholder="0"
                                        className="w-12 text-center text-xs font-bold py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:border-amber-400 focus:bg-white"
                                        title="Format angka penonton (misal 778 atau 778 / 2 otomatis terbaca 778)"
                                      />
                                    </td>
                                  ))}

                                  <td className="py-2 px-3 text-center font-extrabold text-emerald-800 whitespace-nowrap">
                                    {totalAud}
                                  </td>

                                  <td className="py-1.5 px-2 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center space-x-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleAddFilmRow(st.studioName, st.slideIndex || 1)
                                        }
                                        title="Tambah baris film kedua di studio ini"
                                        className="p-1 rounded text-purple-700 hover:bg-purple-100 cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteRow(realIdx)}
                                        title="Hapus baris"
                                        className="p-1 rounded text-rose-500 hover:bg-rose-100 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>

                          {/* Kolom Total Akhir / Grand Total Footer */}
                          <tfoot className="border-t-2 border-emerald-300 bg-emerald-50/95 font-black text-slate-900 sticky bottom-0 z-10 shadow-inner">
                            <tr>
                              <td className="py-2.5 px-3 uppercase text-[11px] font-black text-emerald-950 whitespace-nowrap">
                                {activeSlideFilter === 'all'
                                  ? `TOTAL (${extractedStudios.length} BARIS)`
                                  : `TOTAL SLIDE ${activeSlideFilter} (${displayedStudios.length} BARIS)`}
                              </td>
                              <td className="py-2.5 px-3 text-[11px] font-bold text-slate-600">
                                {activeSlideFilter === 'all'
                                  ? `${totalPages} Slide`
                                  : `Slide ${activeSlideFilter}`}
                              </td>
                              <td className="py-2.5 px-3 text-center text-amber-950 font-black">
                                {displayedStudios.reduce(
                                  (acc, st) => acc + (st.capacity || 0),
                                  0
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-[11px] font-bold text-emerald-900">
                                Akumulasi ({activeShowSlots} Penayangan)
                              </td>
                              <td className="py-2.5 px-2 text-center text-[10px] text-purple-900 font-bold bg-purple-50">
                                Multi-Genre
                              </td>
                              {SHOWS.map((sNum) => {
                                const showAudSum = displayedStudios.reduce(
                                  (acc, st) => acc + (st.shows[sNum] || 0),
                                  0
                                );
                                return (
                                  <td
                                    key={sNum}
                                    className="py-2 px-1 text-center font-black text-emerald-950 bg-emerald-100/70"
                                  >
                                    {showAudSum}
                                  </td>
                                );
                              })}
                              <td className="py-2.5 px-3 text-center font-black text-emerald-950 text-sm whitespace-nowrap bg-emerald-200/80">
                                <div>
                                  {displayedStudios.reduce((acc, st) => {
                                    return (
                                      acc +
                                      SHOWS.reduce(
                                        (sAcc, n) => sAcc + (st.shows[n] || 0),
                                        0
                                      )
                                    );
                                  }, 0)}
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-center text-slate-400 font-normal">
                                -
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 italic">
                      *Kolom penonton Show 1-7 terisi presisi sesuai hasil ekstraksi OCR tiap slide dokumen PDF. Anda dapat menyunting judul dan angka sebelum menekan tombol Terapkan.
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Batal
          </button>

          {extractedStudios.length > 0 && (
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-2 shadow-sm cursor-pointer transition"
            >
              <Check className="w-4 h-4" />
              <span>
                Terapkan ke Okupansi ({currentOutlet?.name}) • Total{' '}
                {extractedStudios
                  .reduce(
                    (acc, st) =>
                      acc + SHOWS.reduce((sAcc, n) => sAcc + (st.shows[n] || 0), 0),
                    0
                  )
                  .toLocaleString('id-ID')}{' '}
                Penonton ({totalPages} Slide)
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
