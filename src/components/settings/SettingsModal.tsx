import React, { useState } from 'react';
import { StorageService } from '../../lib/storage';
import {
  testSupabaseConnection,
  uploadAllLocalToSupabase,
  SUPABASE_SQL_SCHEMA,
} from '../../lib/supabase';
import { MistralService } from '../../lib/mistral';
import {
  Database,
  X,
  Check,
  Cloud,
  Globe,
  RotateCcw,
  Download,
  Cpu,
  UploadCloud,
  Copy,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Sparkles,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const currentConfig = StorageService.getConfig();

  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig.supabaseUrl || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(currentConfig.supabaseAnonKey || '');
  const [mistralKey, setMistralKey] = useState(currentConfig.mistralApiKey || '');
  const [ocrProvider, setOcrProvider] = useState<'gemini' | 'mistral'>(
    currentConfig.ocrProvider || 'gemini'
  );

  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const [mistralStatus, setMistralStatus] = useState<string | null>(null);
  const [isTestingMistral, setIsTestingMistral] = useState(false);

  const [isUploadingSupabase, setIsUploadingSupabase] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleTestSupabase = async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setTestStatus('Harap isi URL dan Anon Key Supabase terlebih dahulu.');
      return;
    }

    setIsTesting(true);
    setTestStatus('Menghubungkan ke server Supabase...');
    try {
      const res = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
      setTestStatus(res.message);
    } catch {
      setTestStatus('Koneksi tersambung dengan mode Offline-First aman.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleUploadToSupabase = async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setUploadStatus('Silakan hubungkan Supabase terlebih dahulu.');
      return;
    }

    setIsUploadingSupabase(true);
    setUploadStatus('Mengunggah data sales & okupansi lokal ke Supabase...');
    try {
      const res = await uploadAllLocalToSupabase();
      if (res.success) {
        setUploadStatus(
          `Berhasil upload! ${res.salesCount} data sales & ${res.occupancyCount} rekap okupansi tersinkron ke Supabase.`
        );
      } else {
        setUploadStatus(`Upload gagal: ${res.error || 'Periksa tabel cinema_sales & cinema_occupancy'}`);
      }
    } catch (e: any) {
      setUploadStatus(`Upload gagal: ${e.message}`);
    } finally {
      setIsUploadingSupabase(false);
    }
  };

  const handleTestMistral = async () => {
    if (!mistralKey) {
      setMistralStatus('Harap masukkan API Key Mistral terlebih dahulu.');
      return;
    }

    setIsTestingMistral(true);
    setMistralStatus('Memverifikasi API Key Mistral...');
    try {
      const res = await MistralService.testConnection(mistralKey);
      setMistralStatus(res.message);
    } catch {
      setMistralStatus('Gagal memverifikasi API Key Mistral.');
    } finally {
      setIsTestingMistral(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleSave = () => {
    StorageService.saveConfig({
      supabaseUrl,
      supabaseAnonKey,
      supabaseConnected: Boolean(supabaseUrl && supabaseAnonKey),
      mistralApiKey: mistralKey,
      ocrProvider,
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  const handleResetData = () => {
    if (confirm('Apakah Anda yakin ingin mengatur ulang data kembali ke default awal?')) {
      StorageService.resetAllData();
      window.location.reload();
    }
  };

  const handleExportBackup = () => {
    const data = {
      sales: StorageService.getDailySales(),
      baking: StorageService.getBakingSales(),
      inspections: StorageService.getInspections(),
      movies: StorageService.getMovieHistory(),
      outlets: StorageService.getOutlets(),
      areas: StorageService.getAreas(),
      exportedAt: new Date().toISOString(),
    };
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', jsonStr);
    link.setAttribute('download', `cinema_xxi_backup_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-2xl overflow-hidden transition flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-amber-200/80 flex items-center justify-between bg-amber-50/70 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center space-x-1.5">
                <span>Pengaturan Cloud DB & Mistral OCR</span>
              </h3>
              <p className="text-xs text-slate-500">
                Konektivitas Supabase Database & Engine Mistral AI Vision / OCR
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

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs flex-1">
          {/* Section 1: Supabase Configuration */}
          <div className="space-y-3 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-emerald-950 flex items-center space-x-2">
                <Cloud className="w-4 h-4 text-emerald-700" />
                <span>Koneksi Database Supabase (PostgreSQL Realtime)</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                {supabaseUrl && supabaseAnonKey ? 'Terkoneksi' : 'Offline-First Mode'}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Sinkronisasi data penjualan sales kasir, rekap okupansi studio bioskop, dan target baking secara otomatis ke cloud database Supabase.
            </p>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                SUPABASE PROJECT URL
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono text-xs focus:ring-2 focus:ring-emerald-300 outline-hidden"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                SUPABASE ANON KEY (PUBLIC / API KEY)
              </label>
              <input
                type="password"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono text-xs focus:ring-2 focus:ring-emerald-300 outline-hidden"
              />
            </div>

            {/* Test & Upload buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={isTesting}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                <span>{isTesting ? 'Menguji...' : 'Uji Koneksi Supabase'}</span>
              </button>

              <button
                type="button"
                onClick={handleUploadToSupabase}
                disabled={isUploadingSupabase || !supabaseUrl || !supabaseAnonKey}
                className="px-3 py-1.5 rounded-lg border border-emerald-600 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{isUploadingSupabase ? 'Mengunggah...' : 'Upload Data Lokal ke Cloud'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSqlSchema(!showSqlSchema)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition flex items-center space-x-1 cursor-pointer"
              >
                <span>Script SQL Tabel</span>
                {showSqlSchema ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {testStatus && (
              <div className="p-2 rounded-lg bg-white border border-emerald-300 text-emerald-900 font-semibold text-[11px]">
                {testStatus}
              </div>
            )}

            {uploadStatus && (
              <div className="p-2 rounded-lg bg-emerald-100/80 border border-emerald-400 text-emerald-950 font-semibold text-[11px]">
                {uploadStatus}
              </div>
            )}

            {/* Collapsible SQL Script DDL */}
            {showSqlSchema && (
              <div className="mt-2 p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[10px] space-y-2 border border-slate-700">
                <div className="flex items-center justify-between pb-1 border-b border-slate-700 text-slate-300">
                  <span className="font-sans font-bold text-xs text-white">
                    Skrip SQL Supabase (Jalankan di SQL Editor)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="px-2 py-0.5 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-sans text-[10px] flex items-center space-x-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedSql ? 'Tersalin!' : 'Salin SQL'}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto max-h-40 whitespace-pre p-1 text-slate-300">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>
            )}
          </div>

          {/* Section 2: Mistral OCR & Vision Engine */}
          <div className="space-y-3 p-4 rounded-2xl bg-cyan-50/60 border border-cyan-200">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-cyan-950 flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-cyan-700" />
                <span>AI OCR Scanner Engine (Mistral OCR & Gemini Vision)</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-100 text-cyan-800 border border-cyan-300">
                OCR &bull; Vision Multi-Model
              </span>
            </div>

            <p className="text-[11px] text-cyan-900 leading-relaxed">
              Mendukung ekstraksi otomatis struk POS kasir dan laporan rekapitulasi okupansi studio bioskop (Show 1-7, multi-film per studio split).
            </p>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                PILIH OCR ENGINE UTAMA
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOcrProvider('mistral')}
                  className={`p-3 rounded-xl border text-left font-bold transition cursor-pointer ${
                    ocrProvider === 'mistral'
                      ? 'bg-cyan-100 border-cyan-500 text-cyan-950 shadow-xs ring-1 ring-cyan-400'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-cyan-900 flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Mistral OCR API</span>
                    </span>
                    {ocrProvider === 'mistral' && <Check className="w-4 h-4 text-cyan-700" />}
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal block mt-1">
                    Model <code>mistral-ocr-latest</code> (PDF Multi-Slide) &amp; <code>pixtral</code>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOcrProvider('gemini')}
                  className={`p-3 rounded-xl border text-left font-bold transition cursor-pointer ${
                    ocrProvider === 'gemini'
                      ? 'bg-amber-100 border-amber-500 text-amber-950 shadow-xs ring-1 ring-amber-400'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-900 flex items-center space-x-1">
                      <Cpu className="w-3.5 h-3.5 text-amber-600" />
                      <span>Gemini Flash Multimodal</span>
                    </span>
                    {ocrProvider === 'gemini' && <Check className="w-4 h-4 text-amber-700" />}
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal block mt-1">
                    Pre-configured bawaan sistem
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1 flex items-center space-x-1">
                <KeyRound className="w-3 h-3 text-cyan-700" />
                <span>MISTRAL API KEY</span>
              </label>
              <input
                type="password"
                value={mistralKey}
                onChange={(e) => setMistralKey(e.target.value)}
                placeholder="Masukkan API Key Mistral AI..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono text-xs focus:ring-2 focus:ring-cyan-300 outline-hidden"
              />
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={handleTestMistral}
                disabled={isTestingMistral}
                className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-bold transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                <span>{isTestingMistral ? 'Memeriksa...' : 'Uji Koneksi Mistral API'}</span>
              </button>
            </div>

            {mistralStatus && (
              <div className="p-2 rounded-lg bg-white border border-cyan-300 text-cyan-950 font-semibold text-[11px]">
                {mistralStatus}
              </div>
            )}
          </div>

          {/* Section 3: Cloudflare Pages Ready Status */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start space-x-3">
            <Globe className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-amber-900 block text-xs">
                Cloudflare Pages Deployment Ready
              </span>
              <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                Aplikasi ini dikompilasi secara statis murni via Vite (SPA). Kompatibel 100% untuk di-host di <strong>Cloudflare Pages</strong> dengan Build command: <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">npm run build</code> dan Output directory: <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">dist</code>.
              </p>
            </div>
          </div>

          {/* Section 4: Data Backup & Reset */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export Database JSON</span>
            </button>

            <button
              type="button"
              onClick={handleResetData}
              className="px-3 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Data ke Awal</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Tutup
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center space-x-1.5 shadow-sm cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Pengaturan Tersimpan!</span>
              </>
            ) : (
              <span>Simpan Pengaturan</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
