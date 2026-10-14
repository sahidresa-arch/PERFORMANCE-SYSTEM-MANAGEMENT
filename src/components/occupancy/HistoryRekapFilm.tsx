import React, { useState, useEffect, useMemo } from 'react';
import { User, MovieScreeningRecord } from '../../types';
import { StorageService, cleanTitleForCompare } from '../../lib/storage';
import { OccupancyScanModal } from './OccupancyScanModal';
import {
  Film,
  Upload,
  Download,
  Calendar,
  Search,
  Clapperboard,
  Sparkles,
  Trophy,
} from 'lucide-react';

interface HistoryRekapFilmProps {
  currentUser: User | null;
}

export const HistoryRekapFilm: React.FC<HistoryRekapFilmProps> = ({
  currentUser,
}) => {
  const rawOutlets = StorageService.getOutlets();
  const isManagerOrCleaner = (currentUser?.role === 'manager' || currentUser?.role === 'cleaner') && currentUser?.outletId;
  const outlets = isManagerOrCleaner
    ? rawOutlets.filter((o) => o.id === currentUser.outletId)
    : rawOutlets;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'area_manager';
  const defaultOutletId = isManagerOrCleaner ? currentUser.outletId! : '';
  const [selectedOutletId, setSelectedOutletId] = useState<string>(defaultOutletId);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  // Date Filter State
  const [dateMode, setDateMode] = useState<'all' | 'month' | 'today' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [movies, setMovies] = useState<MovieScreeningRecord[]>(() =>
    StorageService.getAllUploadedMovies()
  );

  useEffect(() => {
    const handleStorageUpdate = () => {
      setMovies(StorageService.getAllUploadedMovies());
    };
    window.addEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    return () => {
      window.removeEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    };
  }, []);

  const handleApplyScanData = (
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
  ) => {
    StorageService.saveOccupancyRecord(outletId, date, studioRows);
    setMovies(StorageService.getAllUploadedMovies());
    if (selectedOutletId !== outletId && selectedOutletId !== 'all') {
      setSelectedOutletId(outletId);
    }
    setDateMode('all');
    setIsScanModalOpen(false);
  };

  // Filter raw movies by outlet, genre, search query, and date range
  const filteredRawMovies = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const curMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return movies.filter((m) => {
      // 1. Outlet Filter
      if (selectedOutletId && selectedOutletId !== 'all' && m.outletId !== selectedOutletId) return false;

      // 2. Date Filter
      if (dateMode === 'today') {
        if (m.date !== todayStr) return false;
      } else if (dateMode === 'month') {
        if (!m.date || !m.date.startsWith(curMonthPrefix)) return false;
      } else if (dateMode === 'custom') {
        if (!m.date || m.date < customStartDate || m.date > customEndDate) return false;
      }
      // dateMode === 'all' includes all records without restriction!

      // 3. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = m.movieTitle.toLowerCase().includes(query);
        if (!titleMatch) return false;
      }

      return true;
    });
  }, [movies, selectedOutletId, dateMode, customStartDate, customEndDate, searchQuery]);

  // Aggregate by Movie Title & Genre (Simple aggregated summary list)
  const aggregatedMovies = useMemo(() => {
    const map = new Map<string, { title: string; genre: string; totalAudience: number }>();

    filteredRawMovies.forEach((m) => {
      const rawTitle = (m.movieTitle || '').trim();
      if (!rawTitle) return;

      const cleanKey = cleanTitleForCompare(rawTitle);
      if (!cleanKey) return;

      const resolvedGenre = StorageService.resolveFilmGenre(rawTitle, m.genre);
      const sumShows = Object.values(m.shows || {}).reduce((acc, v) => acc + (v || 0), 0);

      if (map.has(cleanKey)) {
        const current = map.get(cleanKey)!;
        current.totalAudience += sumShows;
      } else {
        map.set(cleanKey, {
          title: rawTitle.toUpperCase(),
          genre: resolvedGenre,
          totalAudience: sumShows,
        });
      }
    });

    const list = Array.from(map.values());

    // Apply Genre Filter
    const genreFiltered = list.filter((item) => {
      if (selectedGenre !== 'all') {
        return item.genre.toLowerCase() === selectedGenre.toLowerCase();
      }
      return true;
    });

    // Sort by Total Audience descending
    genreFiltered.sort((a, b) => b.totalAudience - a.totalAudience);

    return genreFiltered;
  }, [filteredRawMovies, selectedGenre]);

  const grandTotalAudience = useMemo(() => {
    return aggregatedMovies.reduce((acc, m) => acc + m.totalAudience, 0);
  }, [aggregatedMovies]);

  const topFilm = aggregatedMovies[0] || null;

  const handleExportCSV = () => {
    const headers = ['No', 'Judul Film', 'Genre', 'Jumlah Penonton', 'Share (%)'];

    const rows = aggregatedMovies.map((m, idx) => {
      const share = grandTotalAudience > 0 ? ((m.totalAudience / grandTotalAudience) * 100).toFixed(1) : '0';
      return [
        idx + 1,
        `"${m.title}"`,
        m.genre,
        m.totalAudience,
        `${share}%`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_film_penonton.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Top Header Banner */}
      <div className="p-5 rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold text-[10px] uppercase border border-amber-300">
              REKAP PENONTON FILM
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
              Aggregated Movie Audience Summary
            </span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 mt-1 flex items-center space-x-2">
            <span>🎞️ Rekapitulasi Daftar Film &amp; Jumlah Penonton</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Daftar ringkas judul film, genre, dan total jumlah penonton berdasarkan periode tanggal terpilih.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsScanModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload / Scan Laporan Okupansi</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center space-x-1.5 transition cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-amber-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4.5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            TOTAL JUDUL FILM
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {aggregatedMovies.length} Judul
          </p>
          <span className="text-xs text-slate-500 mt-0.5 block">
            Film tayang pada periode terpilih
          </span>
        </div>

        <div className="p-4.5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            TOTAL JUMLAH PENONTON
          </span>
          <p className="text-2xl font-black text-amber-800 mt-1">
            {grandTotalAudience.toLocaleString('id-ID')} Orang
          </p>
          <span className="text-xs text-slate-500 mt-0.5 block">
            Akumulasi seluruh film
          </span>
        </div>

        <div className="p-4.5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            FILM TERBANYAK DITONTON (TOP 1)
          </span>
          <p className="text-base font-black text-emerald-800 mt-1 truncate">
            {topFilm ? topFilm.title : '-'}
          </p>
          <span className="text-xs text-emerald-700 font-bold mt-0.5 block">
            {topFilm ? `${topFilm.totalAudience.toLocaleString('id-ID')} Penonton` : 'Belum ada data'}
          </span>
        </div>
      </div>

      {/* Filter Row: Tanggal, Outlet, Genre, Search */}
      <div className="p-4 rounded-2xl border border-slate-200/90 bg-white text-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tanggal Quick Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-amber-900 uppercase flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>PERIODE TANGGAL:</span>
            </span>

            <div className="flex rounded-xl overflow-hidden border border-slate-200 p-0.5 bg-slate-100 shadow-2xs text-xs">
              <button
                onClick={() => setDateMode('all')}
                className={`px-3 py-1 font-bold rounded-lg transition cursor-pointer ${
                  dateMode === 'all'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Periode
              </button>
              <button
                onClick={() => setDateMode('month')}
                className={`px-3 py-1 font-bold rounded-lg transition cursor-pointer ${
                  dateMode === 'month'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bulan Ini
              </button>
              <button
                onClick={() => setDateMode('today')}
                className={`px-3 py-1 font-bold rounded-lg transition cursor-pointer ${
                  dateMode === 'today'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => setDateMode('custom')}
                className={`px-3 py-1 font-bold rounded-lg transition cursor-pointer ${
                  dateMode === 'custom'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Custom Date
              </button>
            </div>
          </div>

          {/* Custom Date Range Picker */}
          {dateMode === 'custom' && (
            <div className="flex items-center space-x-2 bg-amber-50/80 p-1.5 rounded-xl border border-amber-200 text-xs font-bold">
              <span className="text-amber-900">Dari:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-800"
              />
              <span className="text-amber-900">s/d:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-800"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
              OUTLET BIOSKOP:
            </label>
            <select
              value={selectedOutletId}
              onChange={(e) => setSelectedOutletId(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-amber-400"
            >
              <option value="">Semua Outlet Bioskop</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
              GENRE FILM:
            </label>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-amber-400"
            >
              <option value="all">Semua Genre</option>
              <option value="Action">Action</option>
              <option value="Horror">Horror</option>
              <option value="Drama">Drama</option>
              <option value="Comedy">Comedy</option>
              <option value="Animation">Animation</option>
              <option value="Family">Family</option>
              <option value="Religion">Religion</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
              CARI JUDUL FILM:
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik judul film..."
                className="w-full text-xs font-semibold pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:border-amber-400"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Aggregated Clean Table: Only Judul Film, Genre, and Jumlah Penonton */}
      <div className="p-5 rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="uppercase text-[10px] font-extrabold border-b border-amber-200/70 bg-amber-50/60 text-slate-700">
              <tr>
                <th className="py-3 px-4 text-center w-12">NO</th>
                <th className="py-3 px-4">JUDUL FILM</th>
                <th className="py-3 px-4 text-center">GENRE</th>
                <th className="py-3 px-4 text-right">JUMLAH PENONTON</th>
                <th className="py-3 px-4 text-center">SHARE PENONTON (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {aggregatedMovies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Film className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm text-slate-600">Belum ada data penonton film pada periode ini.</p>
                    <p className="text-xs text-slate-400 mt-0.5">Upload / scan laporan okupansi atau sesuaikan rentang tanggal filter.</p>
                  </td>
                </tr>
              ) : (
                aggregatedMovies.map((m, idx) => {
                  const share = grandTotalAudience > 0 ? ((m.totalAudience / grandTotalAudience) * 100).toFixed(1) : '0';

                  return (
                    <tr key={idx} className="hover:bg-amber-50/30 transition text-slate-800">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {idx === 0 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs">
                            1
                          </span>
                        ) : idx === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-black text-xs">
                            2
                          </span>
                        ) : idx === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs">
                            3
                          </span>
                        ) : (
                          idx + 1
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        <div className="flex items-center space-x-2">
                          <Clapperboard className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="text-sm text-slate-900">{m.title}</span>
                          {idx === 0 && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                              <Trophy className="w-3 h-3 text-amber-600" />
                              TOP 1
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-900 border border-amber-200">
                          {m.genre}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-base text-amber-900">
                        {m.totalAudience.toLocaleString('id-ID')} Orang
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, parseFloat(share))}%` }}
                              className="bg-amber-500 h-full rounded-full"
                            />
                          </div>
                          <span className="font-extrabold text-xs text-slate-700">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Occupancy Report Scan Modal */}
      <OccupancyScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        initialOutletId={selectedOutletId || outlets[0]?.id}
        initialDate={new Date().toISOString().split('T')[0]}
        onApplyData={handleApplyScanData}
      />
    </div>
  );
};
