import React, { useState, useEffect, useMemo } from 'react';
import { User, MovieScreeningRecord } from '../../types';
import { StorageService } from '../../lib/storage';
import {
  Flame,
  TrendingUp,
  Award,
  PieChart,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileQuestion,
} from 'lucide-react';

interface MarketIntelligenceProps {
  currentUser: User | null;
}

export const MarketIntelligence: React.FC<MarketIntelligenceProps> = ({
  currentUser,
}) => {
  const [syncTick, setSyncTick] = useState(0);
  const rawOutlets = useMemo(() => StorageService.getOutlets(), [syncTick]);
  const isManagerOrCleaner = (currentUser?.role === 'manager' || currentUser?.role === 'cleaner') && currentUser?.outletId;
  const outlets = useMemo(() => {
    if (isManagerOrCleaner) {
      return rawOutlets.filter((o) => o.id === currentUser.outletId);
    }
    return rawOutlets;
  }, [rawOutlets, isManagerOrCleaner, currentUser?.outletId]);

  const defaultOutletId =
    currentUser?.outletId || (isManagerOrCleaner ? (outlets[0]?.id || '') : 'all');
  const [selectedOutletId, setSelectedOutletId] = useState<string>(defaultOutletId);
  const [period, setPeriod] = useState<'all' | 'month' | 'custom'>('all');
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

  const selectedOutlet = useMemo(() => {
    if (!selectedOutletId || selectedOutletId === 'all') {
      return {
        id: 'all',
        name: 'Semua Outlet Bioskop (Gabungan)',
        areaId: '',
        targetHead: 0,
        umr: 0,
        class: 'All',
        studios: [],
      };
    }
    return outlets.find((o) => o.id === selectedOutletId) || outlets[0];
  }, [outlets, selectedOutletId]);

  // Ambil data film riil dari rekap okupansi & hasil upload scan
  const [allMovies, setAllMovies] = useState<MovieScreeningRecord[]>(() =>
    StorageService.getAllUploadedMovies()
  );

  useEffect(() => {
    const handleStorageUpdate = (e: Event) => {
      const customType = (e as CustomEvent)?.detail?.type;
      if (
        customType &&
        customType !== 'occupancy' &&
        customType !== 'movies' &&
        customType !== 'genre-updated' &&
        customType !== 'outlets' &&
        customType !== 'all-reset'
      ) {
        return;
      }
      setAllMovies(StorageService.getAllUploadedMovies());
      if (!customType || customType === 'outlets' || customType === 'all-reset') {
        setSyncTick((t) => t + 1);
      }
    };
    window.addEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('cinema-xxi-storage-update', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const outletMovies = useMemo(() => {
    let list = allMovies.filter((m) =>
      selectedOutletId && selectedOutletId !== 'all' ? m.outletId === selectedOutletId : true
    );

    const now = new Date();
    if (period === 'month') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const monthPrefix = `${year}-${month}`;
      list = list.filter((m) => m.date && m.date.startsWith(monthPrefix));
    } else if (period === 'custom') {
      list = list.filter(
        (m) => m.date && m.date >= customStartDate && m.date <= customEndDate
      );
    }
    // period === 'all' includes all records!
    return list;
  }, [allMovies, selectedOutletId, period, customStartDate, customEndDate]);

  const GENRE_HEX_COLORS: { [g: string]: string } = {
    Action: '#f59e0b',
    Horror: '#f43f5e',
    Comedy: '#10b981',
    Drama: '#3b82f6',
    Family: '#a855f7',
    Religion: '#eab308',
    Animation: '#6366f1',
  };

  const GENRE_COLORS: { [g: string]: string } = {
    Action: 'bg-amber-500',
    Horror: 'bg-rose-500',
    Comedy: 'bg-emerald-500',
    Drama: 'bg-blue-500',
    Family: 'bg-purple-500',
    Religion: 'bg-yellow-500',
    Animation: 'bg-indigo-500',
  };

  // Murni data riil: Jika belum ada laporan scan untuk outlet ini, kembalikan array kosong (tanpa data dummy palsu)
  const genres = useMemo(() => {
    if (outletMovies.length === 0) {
      return [];
    }

    const genreMap: {
      [g: string]: { audience: number; capacity: number; showCount: number };
    } = {};

    outletMovies.forEach((m) => {
      const title = (m.movieTitle || '').trim();
      if (!title) return; // Ignore empty studio placeholder rows
      const g = StorageService.resolveFilmGenre(title, m.genre);
      if (!genreMap[g]) {
        genreMap[g] = { audience: 0, capacity: 0, showCount: 0 };
      }
      const showValues = Object.values(m.shows || {});
      const sum = showValues.reduce((acc, v) => acc + (v || 0), 0);
      const activeShows = showValues.filter((v) => (v || 0) > 0).length || 5;

      // Kapasitas 1 hari
      const studioCap1Day = (m.capacity || 200) * activeShows;

      // Jika jumlah penonton melebihi kapasitas 1 hari, berarti data tersebut merupakan laporan akumulasi 1 periode/bulan (misal 1-31 Juli)
      let daysInPeriod = 1;
      if (sum > studioCap1Day) {
        if (m.date) {
          const parts = m.date.split('-');
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          if (!isNaN(year) && !isNaN(month)) {
            daysInPeriod = new Date(year, month, 0).getDate(); // Juli = 31 hari
          } else {
            daysInPeriod = 31;
          }
        } else {
          daysInPeriod = 31;
        }
      }

      const effectiveCapacity = studioCap1Day * daysInPeriod;

      genreMap[g].audience += sum;
      genreMap[g].capacity += effectiveCapacity;
      genreMap[g].showCount += activeShows;
    });

    const list = Object.entries(genreMap).map(([name, data]) => {
      const occ =
        data.capacity > 0 ? Math.round((data.audience / data.capacity) * 100) : 0;
      return {
        name,
        audience: data.audience,
        capacity: data.capacity,
        showCount: data.showCount,
        occupancy: occ,
        barColor: GENRE_COLORS[name] || 'bg-amber-500',
      };
    });

    list.sort((a, b) => b.occupancy - a.occupancy || b.audience - a.audience);
    return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [outletMovies]);

  const totalAudience = useMemo(
    () => genres.reduce((acc, g) => acc + g.audience, 0),
    [genres]
  );
  const totalShows = useMemo(
    () => genres.reduce((acc, g) => acc + g.showCount, 0),
    [genres]
  );
  const totalCapacity = useMemo(
    () => genres.reduce((acc, g) => acc + ((g as any).capacity || 0), 0),
    [genres]
  );
  const avgStudioOccupancy =
    totalCapacity > 0
      ? ((totalAudience / totalCapacity) * 100).toFixed(1)
      : '0.0';
  const topGenre = genres[0] || null;

  // Calculate Genres sorted by Audience Share %
  const genresByShare = useMemo(() => {
    if (genres.length === 0 || totalAudience === 0) return [];
    return [...genres]
      .map((g) => ({
        ...g,
        shareVal: totalAudience > 0 ? (g.audience / totalAudience) * 100 : 0,
        hexColor: GENRE_HEX_COLORS[g.name] || '#f59e0b',
      }))
      .sort((a, b) => b.shareVal - a.shareVal || b.audience - a.audience);
  }, [genres, totalAudience]);

  const topGenreByShare = genresByShare[0] || null;

  // SVG Donut Slices calculation
  const CIRCLE_RADIUS = 50;
  const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~314.159265

  let accumulatedPercent = 0;
  const donutSlices = genresByShare.map((g) => {
    const percent = g.shareVal / 100;
    const strokeDasharray = `${percent * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
    const strokeDashoffset = -accumulatedPercent * CIRCUMFERENCE;
    accumulatedPercent += percent;

    return {
      name: g.name,
      strokeDasharray,
      strokeDashoffset,
      hexColor: g.hexColor,
      shareVal: g.shareVal,
      audience: g.audience,
    };
  });

  const recommendedHighGenres = useMemo(() => genres.slice(0, 2), [genres]);
  const recommendedMediumGenres = useMemo(() => genres.slice(2, 4), [genres]);
  const recommendedLowGenres = useMemo(() => genres.slice(4), [genres]);

  // Year Selector & Monthly Top Genre Bar Chart (Januari - Desember) for "Semua Periode"
  const availableChartYears = useMemo(() => {
    const yearSet = new Set<number>([new Date().getFullYear(), 2026, 2025]);
    allMovies.forEach((m) => {
      if (m.date && m.date.length >= 4) {
        const y = parseInt(m.date.slice(0, 4), 10);
        if (!isNaN(y) && y >= 2024 && y <= 2035) {
          yearSet.add(y);
        }
      }
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [allMovies]);

  const [chartYear, setChartYear] = useState<number>(() => new Date().getFullYear());

  const MONTH_LABELS = [
    { num: '01', short: 'Jan', full: 'Januari' },
    { num: '02', short: 'Feb', full: 'Februari' },
    { num: '03', short: 'Mar', full: 'Maret' },
    { num: '04', short: 'Apr', full: 'April' },
    { num: '05', short: 'Mei', full: 'Mei' },
    { num: '06', short: 'Jun', full: 'Juni' },
    { num: '07', short: 'Jul', full: 'Juli' },
    { num: '08', short: 'Agu', full: 'Agustus' },
    { num: '09', short: 'Sep', full: 'September' },
    { num: '10', short: 'Okt', full: 'Oktober' },
    { num: '11', short: 'Nov', full: 'November' },
    { num: '12', short: 'Des', full: 'Desember' },
  ];

  const monthlyTopGenres = useMemo(() => {
    const yearPrefix = `${chartYear}-`;
    const buckets: { [monthNum: string]: { [genre: string]: number } } = {};
    MONTH_LABELS.forEach((m) => {
      buckets[m.num] = {};
    });

    allMovies.forEach((m) => {
      if (!m.date || !m.date.startsWith(yearPrefix)) return;
      if (selectedOutletId && selectedOutletId !== 'all' && m.outletId !== selectedOutletId) {
        return;
      }
      const title = (m.movieTitle || '').trim();
      if (!title) return;
      const monthNum = m.date.slice(5, 7);
      if (!buckets[monthNum]) return;

      const sumAudience = Object.values(m.shows || {}).reduce(
        (acc, v) => acc + (Number(v) || 0),
        0
      );
      if (sumAudience <= 0) return;

      const g = m.genre || StorageService.resolveFilmGenre(title, m.genre);
      buckets[monthNum][g] = (buckets[monthNum][g] || 0) + sumAudience;
    });

    return MONTH_LABELS.map((mInfo) => {
      const genreCounts = buckets[mInfo.num] || {};
      const entries = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
      const monthTotalAudience = entries.reduce((acc, [, count]) => acc + count, 0);
      const topEntry = entries[0] || null;
      const runnerUpEntry = entries[1] || null;
      const topGenreName = topEntry ? topEntry[0] : null;
      const topAudience = topEntry ? topEntry[1] : 0;
      const sharePercent =
        monthTotalAudience > 0 ? (topAudience / monthTotalAudience) * 100 : 0;

      return {
        monthNum: mInfo.num,
        shortLabel: mInfo.short,
        fullLabel: mInfo.full,
        topGenre: topGenreName,
        topAudience,
        monthTotalAudience,
        sharePercent,
        runnerUpGenre: runnerUpEntry ? runnerUpEntry[0] : null,
        runnerUpAudience: runnerUpEntry ? runnerUpEntry[1] : 0,
        hexColor: topGenreName ? GENRE_HEX_COLORS[topGenreName] || '#f59e0b' : '#cbd5e1',
        barColor: topGenreName ? GENRE_COLORS[topGenreName] || 'bg-amber-500' : 'bg-slate-200',
      };
    });
  }, [allMovies, selectedOutletId, chartYear]);

  const maxMonthlyTopAudience = useMemo(() => {
    const maxVal = Math.max(...monthlyTopGenres.map((m) => m.topAudience), 0);
    return maxVal > 0 ? maxVal : 1;
  }, [monthlyTopGenres]);

  const activeMonthsWithData = useMemo(
    () => monthlyTopGenres.filter((m) => m.topAudience > 0),
    [monthlyTopGenres]
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-xs">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] uppercase">
            CINEMA XXI MARKET INTELLIGENCE
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold">
            Rekomendasi Genre &amp; Booking Film
          </span>
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 mt-1 flex items-center space-x-2">
          <span>📈 Market Intelligence — Analisis Genre &amp; Minat Penonton</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Ketahui ranking okupansi per genre, insight otomatis performa penonton, serta rekomendasi alokasi booking show yang paling cocok untuk outlet ini.
        </p>

        {/* Filter Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <label className="text-xs font-bold text-amber-800 uppercase">
              PILIH OUTLET BIOSKOP:
            </label>
            <select
              value={selectedOutletId}
              onChange={(e) => setSelectedOutletId(e.target.value)}
              disabled={Boolean(isManagerOrCleaner)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-2xs focus:border-amber-400 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              {!isManagerOrCleaner && (
                <option value="all">🌟 Semua Outlet Bioskop (Gabungan)</option>
              )}
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl overflow-hidden border border-slate-200 p-0.5 bg-slate-100 shadow-2xs">
              {[
                { id: 'all', label: 'Semua Periode' },
                { id: 'month', label: 'Bulan Ini' },
                { id: 'custom', label: 'Custom Date' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id as any)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    period === p.id
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Input Rentang Tanggal Custom saat mode = 'custom' */}
            {period === 'custom' && (
              <div className="flex items-center space-x-2 bg-amber-50/70 p-1 rounded-xl border border-amber-200">
                <span className="text-xs font-bold text-amber-900 flex items-center space-x-1 pl-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>Dari:</span>
                </span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="text-xs font-bold px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-800 focus:border-amber-400"
                />
                <span className="text-xs font-bold text-amber-900">s/d:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="text-xs font-bold px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-800 focus:border-amber-400"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Genre Paling Rame */}
        <div className="p-5 rounded-3xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              GENRE PALING RAME {topGenre ? `(#${topGenre.rank})` : ''}
            </span>
            <Flame className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {topGenre ? topGenre.name : '-'}
          </p>
          <div className="text-xs text-amber-800 font-semibold mt-1">
            Rata-Rata Okupansi:{' '}
            <span className="font-black text-slate-900">
              {topGenre ? `${topGenre.occupancy}%` : '-'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
            {topGenre
              ? `Genre Pemimpin Okupansi di ${selectedOutlet.name}`
              : 'Belum ada data scan okupansi'}
          </span>
        </div>

        {/* Total Penonton Periode Ini */}
        <div className="p-5 rounded-3xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              TOTAL PENONTON PERIODE INI
            </span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900 mt-2">
            {totalAudience > 0 ? totalAudience.toLocaleString('id-ID') : '-'}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            {totalShows > 0 ? `Dari total ${totalShows} show penayangan` : '0 show penayangan terekam'}
          </span>
        </div>

        {/* Rata-Rata Okupansi Studio */}
        <div className="p-5 rounded-3xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              RATA-RATA OKUPANSI STUDIO
            </span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">
            {totalCapacity > 0 ? `${avgStudioOccupancy}%` : '-'}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            Ambang target prima: <span className="text-emerald-700 font-bold">&gt; 65.0%</span>
          </span>
        </div>

        {/* Dominasi Pangsa Pasar */}
        <div className="p-5 rounded-3xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              DOMINASI PANGSA PASAR
            </span>
            <PieChart className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-800 mt-2">
            {topGenreByShare && totalAudience > 0 ? `${topGenreByShare.shareVal.toFixed(1)}%` : '-'}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            {topGenreByShare && totalAudience > 0
              ? `Penonton terserap ke genre ${topGenreByShare.name} (${topGenreByShare.audience.toLocaleString('id-ID')} orang)`
              : 'Belum ada data pangsa pasar'}
          </span>
        </div>
      </div>

      {/* 2 Split Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 1. Rata-Rata Okupansi per Genre (%) with 65% Target Line */}
        <div className="lg:col-span-7 p-6 rounded-3xl border border-amber-200/90 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-base text-slate-900">
                1. RATA-RATA OKUPANSI PER GENRE (%)
              </h3>
              <p className="text-xs text-slate-500">
                Urutan ranking performa okupansi kursi penonton berdasarkan genre di {selectedOutlet.name}
              </p>
            </div>
            <span className="text-xs text-rose-600 font-bold flex items-center space-x-1">
              <span className="w-2.5 h-0.5 bg-rose-600 inline-block"></span>
              <span>Garis Target 65%</span>
            </span>
          </div>

          {genres.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
              <Award className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">Belum Ada Data Okupansi Terunggah</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                Data ranking okupansi per genre akan otomatis terhitung saat laporan okupansi {selectedOutlet.name} di-scan atau di-upload.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {genres.map((g) => (
                <div key={g.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 font-bold">#{g.rank}</span>
                      <span className="font-extrabold text-slate-900">{g.name}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        ({g.audience.toLocaleString('id-ID')} Penonton &bull; {g.showCount} Show)
                      </span>
                    </div>
                    <span className="font-black text-amber-900">{g.occupancy}%</span>
                  </div>

                  <div className="relative h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      style={{ width: `${g.occupancy}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${g.barColor}`}
                    ></div>
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-rose-600 z-10"
                      style={{ left: '65%' }}
                    ></div>
                  </div>
                </div>
              ))}

              <div className="pt-4 flex justify-between text-[10px] text-slate-500 font-bold border-t border-slate-100">
                <span>0%</span>
                <span className="text-amber-700">45% (Ambang Medium)</span>
                <span className="text-rose-600 font-black">65% (Ambang Sangat Cocok / High)</span>
                <span>100%</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: 2. Share Pangsa Penonton per Genre */}
        <div className="lg:col-span-5 p-6 rounded-3xl border border-amber-200/90 bg-white shadow-xs">
          <h3 className="font-black text-base text-slate-900">
            2. SHARE PANGSA PENONTON PER GENRE
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Distribusi persentase &amp; volume tiket penonton per genre
          </p>

          {genresByShare.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
              <PieChart className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">Menunggu Data Laporan</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                Distribusi pangsa penonton per genre akan muncul secara otomatis saat ada data hasil scan.
              </p>
            </div>
          ) : (
            <>
              {/* Dynamic SVG Donut Chart */}
              <div className="flex flex-col items-center justify-center py-2">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r={CIRCLE_RADIUS}
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth="14"
                    />
                    {donutSlices.map((slice) => (
                      <circle
                        key={slice.name}
                        cx="60"
                        cy="60"
                        r={CIRCLE_RADIUS}
                        fill="transparent"
                        stroke={slice.hexColor}
                        strokeWidth="14"
                        strokeDasharray={slice.strokeDasharray}
                        strokeDashoffset={slice.strokeDashoffset}
                        className="transition-all duration-700 ease-out"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                      TOTAL PENONTON
                    </span>
                    <span className="font-black text-base text-slate-900 leading-tight">
                      {totalAudience.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] font-extrabold text-amber-700 mt-0.5">
                      {topGenreByShare ? `${topGenreByShare.name} (${topGenreByShare.shareVal.toFixed(1)}%)` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Legend Pangsa Pasar Ringkas (Tanpa Progress Bar) */}
              <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 text-xs">
                {genresByShare.map((g) => {
                  const shareStr = g.shareVal.toFixed(1);
                  return (
                    <div
                      key={g.name}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-white transition"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: g.hexColor }}
                        ></span>
                        <span className="font-extrabold text-slate-800 text-xs truncate">{g.name}</span>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        <span className="text-[10px] text-slate-500 font-semibold">
                          ({g.audience.toLocaleString('id-ID')})
                        </span>
                        <span className="font-black text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-lg text-[11px]">
                          {shareStr}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* GRAFIK BATANG GENRE PENONTON TERBANYAK BULANAN (JANUARI - DESEMBER) SAAT FILTER SEMUA PERIODE */}
      {period === 'all' && (
        <div className="p-6 rounded-3xl border border-amber-200/90 bg-white shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] uppercase">
                  TREN BULANAN JANUARI – DESEMBER
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 font-bold border border-amber-200">
                  Top #1 Genre Penonton Terbanyak per Bulan
                </span>
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 mt-1.5">
                📊 GRAFIK BATANG GENRE TERBANYAK PER BULAN (JANUARI – DESEMBER {chartYear})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Menampilkan <strong>1 Genre Juara (#1)</strong> dengan serapan jumlah penonton terbanyak pada masing-masing bulan di <strong>{selectedOutlet.name}</strong>.
              </p>
            </div>

            {/* Pilihan Tahun */}
            <div className="flex items-center space-x-2 bg-amber-50/80 px-3 py-2 rounded-2xl border border-amber-200">
              <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
              <label className="text-xs font-black text-amber-950 uppercase whitespace-nowrap">
                PILIH TAHUN:
              </label>
              <select
                value={chartYear}
                onChange={(e) => setChartYear(Number(e.target.value))}
                className="text-xs font-black px-3 py-1 rounded-xl border border-amber-300 bg-white text-slate-900 shadow-2xs focus:border-amber-500 cursor-pointer"
              >
                {availableChartYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Tahun {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeMonthsWithData.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
              <TrendingUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">
                Belum Ada Data Penonton di Tahun {chartYear}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                Grafik batang genre terbanyak bulanan (Januari – Desember {chartYear}) untuk {selectedOutlet.name} akan otomatis tampil begitu ada laporan okupansi pada tahun tersebut.
              </p>
            </div>
          ) : (
            <>
              {/* 12-Month Vertical Bar Chart */}
              <div className="overflow-x-auto pb-2">
                <div className="min-w-[760px] pt-4 pb-2 px-2">
                  <div className="grid grid-cols-12 gap-2.5 items-end h-64 pt-12 pb-2 px-2 rounded-2xl bg-gradient-to-b from-slate-50/70 to-white border border-slate-200/80">
                    {monthlyTopGenres.map((item) => {
                      const hasData = item.topAudience > 0 && Boolean(item.topGenre);
                      const heightPct = hasData
                        ? Math.max(16, Math.round((item.topAudience / maxMonthlyTopAudience) * 100))
                        : 6;

                      return (
                        <div
                          key={item.monthNum}
                          className="group relative flex flex-col items-center justify-end h-full"
                        >
                          {/* Hover Tooltip Detail */}
                          {hasData && (
                            <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -top-11 left-1/2 -translate-x-1/2 z-20 w-48 p-2.5 rounded-xl bg-slate-900 text-white text-[10px] shadow-lg border border-slate-700">
                              <div className="font-black text-amber-400 uppercase border-b border-slate-700 pb-1 mb-1 flex justify-between">
                                <span>{item.fullLabel} {chartYear}</span>
                                <span>#{1}</span>
                              </div>
                              <div className="flex justify-between font-bold">
                                <span className="text-slate-300">Genre Terbanyak:</span>
                                <span className="text-white font-black">{item.topGenre}</span>
                              </div>
                              <div className="flex justify-between mt-0.5">
                                <span className="text-slate-300">Penonton {item.topGenre}:</span>
                                <span className="text-amber-300 font-black">
                                  {item.topAudience.toLocaleString('id-ID')}
                                </span>
                              </div>
                              <div className="flex justify-between mt-0.5">
                                <span className="text-slate-300">Dominasi Bulan Ini:</span>
                                <span className="text-emerald-400 font-black">
                                  {item.sharePercent.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between mt-0.5 pt-1 border-t border-slate-800 text-[9px] text-slate-400">
                                <span>Total Semua Genre:</span>
                                <span>{item.monthTotalAudience.toLocaleString('id-ID')}</span>
                              </div>
                            </div>
                          )}

                          {/* Top Label Above Bar: Genre Badge + Audience Count */}
                          <div className="mb-1.5 flex flex-col items-center text-center">
                            {hasData ? (
                              <>
                                <span
                                  className="px-2 py-0.5 rounded-md text-[10px] font-black text-white shadow-2xs truncate max-w-[64px]"
                                  style={{ backgroundColor: item.hexColor }}
                                  title={item.topGenre || ''}
                                >
                                  {item.topGenre}
                                </span>
                                <span className="text-[10px] font-black text-slate-900 mt-0.5 leading-tight">
                                  {item.topAudience.toLocaleString('id-ID')}
                                </span>
                                <span className="text-[9px] font-bold text-slate-500 leading-none">
                                  ({item.sharePercent.toFixed(0)}%)
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-300">-</span>
                            )}
                          </div>

                          {/* Vertical Bar Track */}
                          <div className="w-full max-w-[44px] flex-1 flex items-end justify-center">
                            <div
                              style={{
                                height: `${heightPct}%`,
                                backgroundColor: hasData ? item.hexColor : '#e2e8f0',
                              }}
                              className={`w-full rounded-t-xl transition-all duration-500 relative overflow-hidden ${
                                hasData
                                  ? 'shadow-xs group-hover:brightness-110 ring-1 ring-black/5'
                                  : 'opacity-50'
                              }`}
                            >
                              {hasData && (
                                <div className="absolute inset-x-0 top-0 h-2 bg-white/25 rounded-t-xl" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* X-Axis Month Labels (Jan - Des) */}
                  <div className="grid grid-cols-12 gap-2.5 px-2 pt-2.5">
                    {monthlyTopGenres.map((item) => {
                      const hasData = item.topAudience > 0;
                      return (
                        <div key={item.monthNum} className="text-center">
                          <span
                            className={`text-[11px] font-black uppercase block ${
                              hasData ? 'text-slate-900' : 'text-slate-400'
                            }`}
                          >
                            {item.shortLabel}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-400 block">
                            {hasData ? item.topGenre : 'Kosong'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Legend Warna Genre */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase">
                    Keterangan Warna Genre:
                  </span>
                  {Object.entries(GENRE_HEX_COLORS).map(([genreName, hex]) => (
                    <div key={genreName} className="flex items-center space-x-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: hex }}
                      />
                      <span className="text-[11px] font-bold text-slate-700">{genreName}</span>
                    </div>
                  ))}
                </div>
                <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                  {activeMonthsWithData.length} dari 12 Bulan Terisi di Tahun {chartYear}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. REKOMENDASI GENRE FILM UNTUK OUTLET TERTENTU (HANYA GENRE, TANPA DETAIL FILM) */}
      <div className="p-6 rounded-3xl border border-amber-200/90 bg-white shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] uppercase">
                STRATEGI BOOKING &amp; SHOWTIME
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                Data Okupansi Real Outlet: {selectedOutlet.name}
              </span>
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 mt-1.5">
              3. REKOMENDASI GENRE FILM UNTUK {selectedOutlet.name.toUpperCase()}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rekomendasi kurasi pemilihan film untuk outlet ini difokuskan pada preferensi <strong>Genre</strong> berdasarkan tingkat okupansi penonton (tanpa detail judul film individual).
            </p>
          </div>
        </div>

        {genres.length === 0 ? (
          <div className="py-10 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-amber-200">
            <Sparkles className="w-8 h-8 text-amber-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">Menunggu Data Laporan Okupansi</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Rekomendasi alokasi genre film untuk {selectedOutlet.name} akan dikalkulasi secara otomatis dari riwayat hasil scan okupansi studio outlet ini tanpa data angka dummy palsu.
            </p>
          </div>
        ) : (
          <>
            {/* 3 Tiers of Genre Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tier 1: Sangat Direkomendasikan */}
              <div className="p-5 rounded-2xl border-2 border-emerald-400 bg-emerald-50/50 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Prioritas Utama &bull; High Demand
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h4 className="text-lg font-black text-emerald-950 mt-2">
                    {recommendedHighGenres.map((g) => g.name).join(' & ')}
                  </h4>
                  <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                    Genre ini mencatatkan rata-rata okupansi tertinggi (<strong>{recommendedHighGenres[0]?.occupancy || 0}%</strong>) dan menyerap porsi penonton terbesar di {selectedOutlet.name}. Respon penonton terbukti paling solid.
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-emerald-200">
                  <span className="text-[11px] font-black text-emerald-950 uppercase block">
                    Alokasi Penyerapan Layar / Show:
                  </span>
                  <span className="text-sm font-black text-emerald-800 mt-0.5 block">
                    Porsi Dominan (~{totalAudience > 0 ? recommendedHighGenres.reduce((acc, g) => acc + (g.audience / totalAudience) * 100, 0).toFixed(1) : '0'}% Pangsa Tiket)
                  </span>
                  <span className="text-[11px] text-slate-600 mt-1 block">
                    Prioritaskan pada studio utama berkapasitas besar dan jam tayang prime-time (Show 3 s/d 5).
                  </span>
                </div>
              </div>

              {/* Tier 2: Potensial / Slot Reguler */}
              <div className="p-5 rounded-2xl border-2 border-amber-300 bg-amber-50/50 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                      Potensial &bull; Medium Demand
                    </span>
                    <Sparkles className="w-4 h-4 text-amber-600" />
                  </div>
                  <h4 className="text-lg font-black text-amber-950 mt-2">
                    {recommendedMediumGenres.length > 0
                      ? recommendedMediumGenres.map((g) => g.name).join(' & ')
                      : 'Genre Reguler Lainnya'}
                  </h4>
                  <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                    Genre penyeimbang yang stabil dengan serapan okupansi moderat (<strong>{recommendedMediumGenres[0]?.occupancy || 0}%</strong>). Efektif untuk menjaga keragaman variasi penonton dan sesi libur.
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-amber-200">
                  <span className="text-[11px] font-black text-amber-950 uppercase block">
                    Alokasi Penyerapan Layar / Show:
                  </span>
                  <span className="text-sm font-black text-amber-800 mt-0.5 block">
                    Porsi Pendukung (~{totalAudience > 0 ? recommendedMediumGenres.reduce((acc, g) => acc + (g.audience / totalAudience) * 100, 0).toFixed(1) : '0'}% Pangsa Tiket)
                  </span>
                  <span className="text-[11px] text-slate-600 mt-1 block">
                    Ideal untuk slot penayangan siang/awal sore (Show 1-2) serta sesi akhir pekan.
                  </span>
                </div>
              </div>

              {/* Tier 3: Selektif / Porsi Terbatas */}
              <div className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/80 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-200 text-slate-700 border border-slate-300">
                      Porsi Terbatas &bull; Niche Demand
                    </span>
                    <AlertCircle className="w-4 h-4 text-slate-500" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900 mt-2">
                    {recommendedLowGenres.length > 0
                      ? recommendedLowGenres.map((g) => g.name).join(' & ')
                      : 'Genre Niche Lainnya'}
                  </h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Minat penonton di outlet ini terhadap genre ini relatif terbatas dengan okupansi di bawah 40%. Diperlukan efisiensi alokasi kursi studio.
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-200">
                  <span className="text-[11px] font-black text-slate-800 uppercase block">
                    Alokasi Penyerapan Layar / Show:
                  </span>
                  <span className="text-sm font-black text-slate-700 mt-0.5 block">
                    Porsi Selektif (~{totalAudience > 0 ? recommendedLowGenres.reduce((acc, g) => acc + (g.audience / totalAudience) * 100, 0).toFixed(1) : '0'}% Pangsa Tiket)
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Cukup dialokasikan pada 1 studio berkapasitas sedang/kecil atau 1-2 show penayangan per hari.
                  </span>
                </div>
              </div>
            </div>

            {/* Executive Strategic Guidance */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300/80 flex items-start space-x-3.5">
              <Sparkles className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-800 space-y-1">
                <span className="font-black text-amber-950 block">
                  Pedoman Kurasi Program Film Cinema Manager ({selectedOutlet.name}):
                </span>
                <p className="text-slate-700 leading-relaxed font-medium">
                  Alokasikan mayoritas kapasitas studio bioskop untuk film-film bergenre <strong>{recommendedHighGenres.map(g => g.name).join(' & ')}</strong> guna menjamin okupansi tetap berada di atas standar prima (&gt;65%). Hindari menempatkan film bergenre <strong>{recommendedLowGenres.map(g => g.name).join(' & ') || 'non-prioritas'}</strong> di studio berkapasitas di atas 200 kursi untuk meminimalkan risiko okupansi rendah.
                </p>
              </div>
            </div>

            {/* Matrix Panduan Alokasi Studio Spesifik Outlet */}
            {selectedOutlet?.studios && selectedOutlet.studios.length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="p-1 rounded-md bg-amber-500 text-slate-950 font-bold text-[10px]">
                      PETA ALOKASI
                    </span>
                    <h5 className="font-black text-xs text-slate-900 uppercase">
                      Alokasi Studio &amp; Layar Bioskop {selectedOutlet.name}
                    </h5>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {selectedOutlet.studios.length} Studio Terdaftar
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Studio</th>
                          <th className="py-2.5 px-3 text-center">Kapasitas</th>
                          <th className="py-2.5 px-3">Klasifikasi Ruang</th>
                          <th className="py-2.5 px-3">Rekomendasi Alokasi Genre</th>
                          <th className="py-2.5 px-3">Jam Tayang Optimal</th>
                          <th className="py-2.5 px-3 text-center">Target Okupansi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedOutlet.studios.map((st, sIdx) => {
                          const isLarge = st.capacity >= 220;
                          const isMedium = st.capacity >= 160 && st.capacity < 220;
                          const recGenre = isLarge
                            ? (recommendedHighGenres[0]?.name || 'Horror')
                            : isMedium
                            ? (recommendedMediumGenres[0]?.name || recommendedHighGenres[1]?.name || 'Drama')
                            : (recommendedLowGenres[0]?.name || 'Animation');

                          return (
                            <tr key={sIdx} className="hover:bg-amber-50/30 transition font-medium">
                              <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap">
                                {st.name}
                              </td>
                              <td className="py-2 px-3 text-center font-black text-amber-900 whitespace-nowrap">
                                {st.capacity} Kursi
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                                    isLarge
                                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                      : isMedium
                                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                      : 'bg-purple-100 text-purple-900 border border-purple-300'
                                  }`}
                                >
                                  {isLarge
                                    ? 'Kapasitas Besar'
                                    : isMedium
                                    ? 'Kapasitas Sedang'
                                    : 'Kapasitas Standar / Intimate'}
                                </span>
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <span className="inline-flex items-center space-x-1 font-bold text-slate-800">
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      GENRE_COLORS[recGenre] || 'bg-amber-500'
                                    }`}
                                  />
                                  <span>{recGenre}</span>
                                  {isLarge && (
                                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                      High Demand
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                                {isLarge
                                  ? 'Show 3 s/d 5 (Prime Time Malam)'
                                  : isMedium
                                  ? 'Show 1 s/d 6 (Reguler & Akhir Pekan)'
                                  : 'Show 1-2 (Siang / Sore Awal)'}
                              </td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                <span className="font-black text-emerald-800 text-[11px]">
                                  {isLarge ? '≥ 70%' : isMedium ? '≥ 55%' : '≥ 40%'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
