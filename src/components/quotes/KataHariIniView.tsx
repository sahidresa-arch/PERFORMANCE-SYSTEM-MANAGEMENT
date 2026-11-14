import React, { useEffect, useMemo, useState } from 'react';
import {
  MessageSquareHeart,
  Search,
  Calendar,
  Building2,
  Quote,
  Sparkles,
  UserCheck,
  Clock,
  PlusCircle,
  Send,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Trash2,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { DailyQuoteRecord, Outlet, User } from '../../types';
import { StorageService } from '../../lib/storage';
import {
  getDailyPositiveMessage,
  detectNegativeWords,
} from '../../lib/dailyQuoteUtils';

interface KataHariIniViewProps {
  currentUser: User | null;
  selectedDate: string;
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

function formatDateId(isoDate: string): string {
  const parts = (isoDate || '').split('-');
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return isoDate;
  return `${d} ${INDONESIAN_MONTHS[m - 1] || ''} ${y}`;
}

function formatTimeId(isoString: string): string {
  try {
    const dt = new Date(isoString);
    if (isNaN(dt.getTime())) return '';
    return dt.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function getManagementRoleLabel(role: User['role'] | undefined): string {
  if (role === 'admin') return 'Admin Pusat (Independen)';
  if (role === 'area_manager') return 'Area Manager (Independen)';
  return 'Manajemen XXI';
}

export const KataHariIniView: React.FC<KataHariIniViewProps> = ({
  currentUser,
  selectedDate,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const canPostDirectly =
    currentUser?.role === 'admin' || currentUser?.role === 'area_manager';

  const [quotes, setQuotes] = useState<DailyQuoteRecord[]>(() =>
    StorageService.getDailyQuotes()
  );
  const [outlets, setOutlets] = useState<Outlet[]>(() =>
    StorageService.getOutlets()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [outletFilter, setOutletFilter] = useState<string>('ALL');
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'selected'>('all');

  // Tool tambah kata-kata langsung untuk Admin & Area Manager
  const [newQuoteText, setNewQuoteText] = useState('');
  const [submitNotice, setSubmitNotice] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSyncingQuotes, setIsSyncingQuotes] = useState(false);

  // Tools Delete khusus Admin (selain Admin tidak bisa delete)
  const [isSelectDeleteMode, setIsSelectDeleteMode] = useState(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<string[]>([]);
  const [pendingDeleteTargets, setPendingDeleteTargets] = useState<DailyQuoteRecord[]>([]);
  const [deleteToast, setDeleteToast] = useState<string>('');

  const handleManualSync = async () => {
    setIsSyncingQuotes(true);
    try {
      const m = await import('../../lib/supabase');
      if (typeof m.pullDailyQuotesNow === 'function') {
        await m.pullDailyQuotesNow();
      }
      setQuotes(StorageService.getDailyQuotes());
    } finally {
      setIsSyncingQuotes(false);
    }
  };

  const toggleSelectDeleteId = (id: string) => {
    if (!isAdmin) return;
    setSelectedDeleteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRequestSingleDelete = (record: DailyQuoteRecord) => {
    if (!isAdmin) return;
    setPendingDeleteTargets([record]);
  };

  const handleRequestBatchDelete = () => {
    if (!isAdmin || selectedDeleteIds.length === 0) return;
    const idSet = new Set(selectedDeleteIds);
    const targets = submittedQuotes.filter((q) => idSet.has(q.id));
    if (targets.length > 0) {
      setPendingDeleteTargets(targets);
    }
  };

  const handleConfirmDelete = () => {
    if (!isAdmin || !currentUser || pendingDeleteTargets.length === 0) return;
    const idsToDelete = pendingDeleteTargets.map((t) => t.id);
    const next = StorageService.deleteDailyQuotes(idsToDelete, currentUser);
    setQuotes(next);
    setPendingDeleteTargets([]);
    setSelectedDeleteIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
    if (isSelectDeleteMode && idsToDelete.length >= selectedDeleteIds.length) {
      setIsSelectDeleteMode(false);
    }
    setDeleteToast(
      `${idsToDelete.length} kata-kata berhasil dihapus oleh Admin dan disinkronkan.`
    );
    setTimeout(() => setDeleteToast(''), 3500);
  };

  useEffect(() => {
    const refresh = () => {
      setQuotes(StorageService.getDailyQuotes());
      setOutlets(StorageService.getOutlets());
    };
    window.addEventListener('cinema-xxi-storage-update', refresh);
    window.addEventListener('storage', refresh);

    // Tarik data Kata-kata Hari Ini terbaru dari cloud/server setiap kali menu dibuka
    void handleManualSync();

    return () => {
      window.removeEventListener('cinema-xxi-storage-update', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const submittedQuotes = useMemo(() => {
    return quotes.filter(
      (q) => q.status === 'submitted' && (q.quoteText || '').trim().length > 0
    );
  }, [quotes]);

  const todayCount = useMemo(() => {
    return submittedQuotes.filter((q) => q.date === selectedDate).length;
  }, [submittedQuotes, selectedDate]);

  const filteredQuotes = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    return submittedQuotes.filter((item) => {
      if (outletFilter === '__MGMT__') {
        if (item.outletId !== '__ADMIN__' && item.outletId !== '__AREA_MANAGER__') {
          return false;
        }
      } else if (outletFilter !== 'ALL' && item.outletId !== outletFilter) {
        return false;
      }
      if (dateFilterMode === 'selected' && item.date !== selectedDate) {
        return false;
      }
      if (!qLower) return true;
      return (
        item.outletName.toLowerCase().includes(qLower) ||
        item.quoteText.toLowerCase().includes(qLower) ||
        item.authorName.toLowerCase().includes(qLower)
      );
    });
  }, [submittedQuotes, outletFilter, dateFilterMode, selectedDate, searchQuery]);

  const todayPositiveGreeting = getDailyPositiveMessage(selectedDate);
  const negativeCheck = detectNegativeWords(newQuoteText);

  const handlePublishManagementQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPostDirectly || !currentUser) return;

    const trimmed = newQuoteText.trim();
    if (!trimmed) {
      setSubmitNotice('Silakan tulis kata-kata penyemangat terlebih dahulu.');
      setSubmitSuccess(false);
      return;
    }

    const check = detectNegativeWords(trimmed);
    if (check.isNegative) {
      setSubmitNotice(
        `Notice: Terdeteksi kata bernuansa negatif (${check.matchedWords.join(
          ', '
        )}). Mohon ganti dengan kata-kata positif untuk tim.`
      );
      setSubmitSuccess(false);
      return;
    }

    const isAdm = currentUser.role === 'admin';
    const mgmtOutletId = isAdm ? '__ADMIN__' : '__AREA_MANAGER__';
    const mgmtLabel = getManagementRoleLabel(currentUser.role);
    const uniqueId = `mgmt_${currentUser.role}_${currentUser.id}_${selectedDate}_${Date.now()}`;

    const next = StorageService.saveDailyQuoteResponse({
      id: uniqueId,
      outletId: mgmtOutletId,
      outletName: mgmtLabel,
      date: selectedDate,
      status: 'submitted',
      quoteText: trimmed,
      authorName: currentUser.name,
      authorRole: currentUser.role,
    });

    setQuotes(next);
    setNewQuoteText('');
    setSubmitNotice('');
    setSubmitSuccess(true);
    setTimeout(() => setSubmitSuccess(false), 3500);
  };

  return (
    <div className="w-full space-y-5 pb-8">
      {/* Header Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#3D1A5E] via-[#581c87] to-[#4c1d95] text-white p-6 shadow-md border border-purple-800/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>PAPARAN SEMANGAT ANTAR OUTLET &amp; MANAJEMEN</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-400 text-slate-950 shadow-sm shrink-0">
                <MessageSquareHeart className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Kata-kata Hari Ini
                </h2>
                <p className="text-xs text-purple-100/90 mt-0.5">
                  Daftar pesan positif &amp; penyemangat dari seluruh tim outlet, Area Manager, dan Admin XXI.
                </p>
              </div>
            </div>
          </div>

          {/* Stat Pills + Sync Button */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-center min-w-[125px]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-200">
                Hari Ini ({formatDateId(selectedDate)})
              </div>
              <div className="text-2xl font-black text-amber-300 tabular-nums mt-0.5">
                {todayCount}
              </div>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-center min-w-[125px]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-200">
                Total Kata-kata
              </div>
              <div className="text-2xl font-black text-white tabular-nums mt-0.5">
                {submittedQuotes.length}
              </div>
            </div>
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncingQuotes}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-60"
              title="Tarik Kata-kata Hari Ini terbaru dari perangkat lain"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingQuotes ? 'animate-spin' : ''}`} />
              <span>{isSyncingQuotes ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
            </button>
          </div>
        </div>

        {/* Daily Rotating Positive System Message */}
        <div className="mt-4 pt-4 border-t border-white/15 flex items-start sm:items-center gap-2.5 text-xs text-amber-100">
          <Quote className="w-4 h-4 text-amber-300 shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong className="text-amber-300">Sapaan Positif Hari Ini:</strong>{' '}
            &ldquo;Hallo Team Cinema XXI, {todayPositiveGreeting}&rdquo;
          </span>
        </div>
      </div>

      {/* Tool Tambah Kata-kata Langsung (Khusus Admin & Area Manager Independen) */}
      {canPostDirectly && (
        <div className="bg-white rounded-3xl border border-amber-200/90 shadow-xs p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Tambah Kata-kata Hari Ini ({getManagementRoleLabel(currentUser?.role)})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Admin &amp; Area Manager bersifat independen dan dapat membagikan kata-kata penyemangat langsung untuk seluruh outlet di sini.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-800 border border-purple-200">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
              <span>{currentUser?.name}</span>
            </span>
          </div>

          <form onSubmit={handlePublishManagementQuote} className="space-y-3">
            <textarea
              rows={2}
              value={newQuoteText}
              onChange={(e) => {
                setNewQuoteText(e.target.value);
                if (submitNotice) setSubmitNotice('');
                if (submitSuccess) setSubmitSuccess(false);
              }}
              placeholder="Tulis pesan positif / arahan semangat untuk seluruh tim outlet hari ini..."
              className={`w-full px-4 py-2.5 rounded-2xl border text-xs font-medium outline-hidden transition ${
                negativeCheck.isNegative
                  ? 'border-rose-400 bg-rose-50/40 focus:ring-2 focus:ring-rose-200'
                  : 'border-slate-300 bg-slate-50/60 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
              }`}
            />

            {(negativeCheck.isNegative || submitNotice) && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 flex items-start gap-2.5 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <strong className="block text-rose-900">
                    Notice: Kalimat Negatif Terdeteksi!
                  </strong>
                  {negativeCheck.isNegative ? (
                    <span>
                      Terdeteksi kata bernuansa negatif (
                      <strong>{negativeCheck.matchedWords.join(', ')}</strong>). Mohon ubah
                      menjadi kalimat yang positif dan menyemangati seluruh tim ya.
                    </span>
                  ) : (
                    <span>{submitNotice}</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-slate-500">
                {submitSuccess ? (
                  <span className="text-emerald-700 font-bold">
                    ✓ Kata-kata berhasil ditambahkan dan tampil untuk semua outlet!
                  </span>
                ) : (
                  `Tanggal terbit: ${formatDateId(selectedDate)}`
                )}
              </span>

              <button
                type="submit"
                disabled={negativeCheck.isNegative || !newQuoteText.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-purple-700 hover:bg-purple-800 text-white shadow-xs disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Kata-kata</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari isi kata-kata, nama outlet, atau pengirim..."
            className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Building2 className="w-3.5 h-3.5 text-purple-700 shrink-0" />
            <select
              value={outletFilter}
              onChange={(e) => setOutletFilter(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-transparent outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Outlet &amp; Manajemen</option>
              <option value="__MGMT__">Admin &amp; Area Manager</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setDateFilterMode('all')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                dateFilterMode === 'all'
                  ? 'bg-white text-purple-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Tanggal
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode('selected')}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                dateFilterMode === 'selected'
                  ? 'bg-white text-purple-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>{formatDateId(selectedDate)}</span>
            </button>
          </div>
          {isAdmin && submittedQuotes.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setIsSelectDeleteMode((prev) => {
                  const next = !prev;
                  if (!next) setSelectedDeleteIds([]);
                  return next;
                });
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                isSelectDeleteMode
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
              title="Tools Hapus Khusus Admin"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isSelectDeleteMode ? 'Tutup Pilih Hapus' : 'Kelola Hapus'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin-Only Delete Toolbar & Feedback */}
      {isAdmin && isSelectDeleteMode && filteredQuotes.length > 0 && (
        <div className="bg-rose-50/90 border border-rose-200 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-rose-900">
            <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-bold">
              Mode Hapus Admin: {selectedDeleteIds.length} kata-kata dipilih
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const visibleIds = filteredQuotes.map((q) => q.id);
                const allSelected = visibleIds.every((id) => selectedDeleteIds.includes(id));
                if (allSelected) {
                  setSelectedDeleteIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
                } else {
                  setSelectedDeleteIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-rose-200 hover:bg-rose-100/60 cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-rose-600" />
              <span>
                {filteredQuotes.every((q) => selectedDeleteIds.includes(q.id))
                  ? 'Batal Pilih Semua'
                  : `Pilih Semua (${filteredQuotes.length})`}
              </span>
            </button>
            <button
              type="button"
              disabled={selectedDeleteIds.length === 0}
              onClick={handleRequestBatchDelete}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih ({selectedDeleteIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {deleteToast && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 text-xs font-bold flex items-center justify-between gap-2">
          <span>✓ {deleteToast}</span>
          <button
            type="button"
            onClick={() => setDeleteToast('')}
            className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quotes List */}
      {filteredQuotes.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-2.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <MessageSquareHeart className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-800">
            Belum ada kata-kata yang ditampilkan
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Kata-kata akan muncul secara otomatis di daftar ini ketika tim outlet mengisi pesan di{' '}
            <strong>Input Data Sales</strong> atau saat <strong>Admin / Area Manager</strong> menulis pesan di menu ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredQuotes.map((item) => {
            const timeStr = formatTimeId(item.updatedAt || item.createdAt);
            const isToday = item.date === selectedDate;
            const isMgmt =
              item.outletId === '__ADMIN__' || item.outletId === '__AREA_MANAGER__';
            const isCheckedForDelete = isAdmin && selectedDeleteIds.includes(item.id);

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (isAdmin && isSelectDeleteMode) {
                    toggleSelectDeleteId(item.id);
                  }
                }}
                className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between gap-4 transition-all hover:shadow-md ${
                  isAdmin && isSelectDeleteMode ? 'cursor-pointer select-none' : ''
                } ${
                  isCheckedForDelete
                    ? 'border-rose-500 ring-2 ring-rose-300 bg-rose-50/30'
                    : isMgmt
                    ? 'border-purple-300 bg-gradient-to-b from-purple-50/40 to-white'
                    : isToday
                    ? 'border-amber-300/90 ring-1 ring-amber-200/60'
                    : 'border-slate-200/90'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Badge Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isAdmin && isSelectDeleteMode && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectDeleteId(item.id);
                          }}
                          className="text-rose-600 shrink-0 cursor-pointer"
                          aria-label="Pilih untuk dihapus"
                        >
                          {isCheckedForDelete ? (
                            <CheckSquare className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      )}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border min-w-0 ${
                          isMgmt
                            ? 'bg-purple-700 text-white border-purple-700'
                            : 'bg-purple-50 text-purple-900 border-purple-200/80'
                        }`}
                      >
                        {isMgmt ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        ) : (
                          <Building2 className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                        )}
                        <span className="truncate max-w-[180px]">{item.outletName}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isToday && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                          Hari Ini
                        </span>
                      )}
                      {isAdmin && !isSelectDeleteMode && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRequestSingleDelete(item);
                          }}
                          className="p-1.5 rounded-lg text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200/80 transition-colors cursor-pointer"
                          title="Hapus kata-kata ini (Khusus Admin)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quote Content */}
                  <div className="relative pl-3 border-l-3 border-amber-400">
                    <p className="text-[13px] sm:text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-line">
                      &ldquo;{item.quoteText}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div className="inline-flex items-center gap-1.5 min-w-0">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-bold text-slate-700 truncate">
                      {item.authorName}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1 shrink-0 font-medium">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>
                      {formatDateId(item.date)}
                      {timeStr ? ` • ${timeStr}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Konfirmasi Hapus (Khusus Admin) */}
      {isAdmin && pendingDeleteTargets.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-rose-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-rose-600 text-white px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-5 h-5 text-rose-100 shrink-0" />
                <h3 className="text-sm font-black">
                  Konfirmasi Hapus Kata-kata (Admin)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingDeleteTargets([])}
                className="text-rose-100 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-700 leading-relaxed">
                Anda akan menghapus{' '}
                <strong className="text-rose-700">
                  {pendingDeleteTargets.length} kata-kata hari ini
                </strong>
                . Data yang dihapus tidak akan tampil lagi di semua perangkat dan outlet.
              </p>

              <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                {pendingDeleteTargets.map((target) => (
                  <div
                    key={target.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                  >
                    <div className="font-extrabold text-purple-900 flex items-center justify-between gap-2">
                      <span className="truncate">{target.outletName}</span>
                      <span className="text-[10px] font-semibold text-slate-500 shrink-0">
                        {formatDateId(target.date)}
                      </span>
                    </div>
                    <p className="text-slate-700 italic line-clamp-2">
                      &ldquo;{target.quoteText}&rdquo;
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPendingDeleteTargets([])}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ya, Hapus Permanen</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
