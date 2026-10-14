import React, { useState } from 'react';
import { User } from '../../types';
import { StorageService } from '../../lib/storage';
import {
  CalendarDays,
  TrendingUp,
  Users,
  Award,
  Lock,
  Clock,
  CheckCircle2,
  BarChart3,
  Sparkles,
  Building,
  Coffee,
  Crown,
  Film,
} from 'lucide-react';

interface ExecutiveDashboardProps {
  currentUser: User | null;
  selectedDate: string;
  onNavigate: (menu: string) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  currentUser,
  selectedDate,
  onNavigate,
}) => {
  const areas = StorageService.getAreas();
  const outlets = StorageService.getOutlets();
  const dailySales = StorageService.getDailySales();

  // Area Filter State ('all' = SEMUA WILAYAH)
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  // Outlet Category Chart Tab ('cafe', 'premiere')
  const [chartCategoryTab, setChartCategoryTab] = useState<'cafe' | 'premiere'>('cafe');

  // Determine Area Name & Target SPH according to selected filter
  let targetArea = 24359; // Default SEMUA WILAYAH
  if (selectedAreaId === 'area-bogor-1-depok') {
    targetArea = 25504;
  } else if (selectedAreaId === 'area-bogor-2') {
    targetArea = 22375;
  } else if (selectedAreaId === 'all') {
    targetArea = 24359;
  }

  const selectedAreaName =
    selectedAreaId === 'all'
      ? 'SEMUA WILAYAH'
      : areas.find((a) => a.id === selectedAreaId)?.name || 'SEMUA WILAYAH';

  // Filter Outlets by Area & User Role restriction
  let filteredOutlets = outlets.filter((o) =>
    selectedAreaId === 'all' || !selectedAreaId ? true : o.areaId === selectedAreaId
  );
  if ((currentUser?.role === 'manager' || currentUser?.role === 'cleaner') && currentUser.outletId) {
    filteredOutlets = filteredOutlets.filter((o) => o.id === currentUser.outletId);
  } else if (currentUser?.role === 'area_manager') {
    const userAssignedAreaIds = currentUser.assignedAreas && currentUser.assignedAreas.length > 0
      ? currentUser.assignedAreas
      : (currentUser.areaId ? [currentUser.areaId] : []);
    if (userAssignedAreaIds.length > 0) {
      filteredOutlets = filteredOutlets.filter((o) => userAssignedAreaIds.includes(o.areaId));
    }
  }

  // Aggregate daily metrics for selected outlets
  let totalCinema = 0;
  let totalFnB = 0;
  let totalBill = 0;
  let totalPenonton = 0;

  const recordsToday = dailySales.filter((s) => s.date === selectedDate);
  filteredOutlets.forEach((outlet) => {
    const rec = recordsToday.find((r) => r.outletId === outlet.id);
    if (rec) {
      const totals = StorageService.getLatestShowTotals(rec.shows);
      totalCinema += totals.omsetCinema;
      totalFnB += totals.omsetFnB;
      totalBill += totals.bill;
      totalPenonton += totals.penonton;
    }
  });

  const overallMetrics = StorageService.calculateMetrics(
    totalCinema,
    totalFnB,
    totalBill,
    totalPenonton,
    targetArea
  );

  // Per-show aggregation for timeline
  const showSummary = [1, 2, 3, 4, 5].map((showNum) => {
    let showCin = 0;
    let showFnB = 0;
    let lockedCount = 0;
    let filledCount = 0;

    filteredOutlets.forEach((outlet) => {
      const rec = recordsToday.find((r) => r.outletId === outlet.id);
      if (rec) {
        const sh = rec.shows.find((s) => s.showNumber === showNum);
        if (sh) {
          if (sh.isFilled) filledCount++;
          if (sh.isLocked) lockedCount++;
          showCin += sh.omsetCinema || 0;
          showFnB += sh.omsetFnB || 0;
        }
      }
    });

    return {
      showNumber: showNum,
      omsetCinema: showCin,
      omsetFnB: showFnB,
      filledCount,
      lockedCount,
      status: lockedCount > 0 ? 'locked' : filledCount > 0 ? 'active' : 'pending',
    };
  });

  // Calculate Outlet SPH achievements for Vertical Column Bar Chart
  const outletMetrics = filteredOutlets.map((outlet) => {
    const rec = recordsToday.find((r) => r.outletId === outlet.id);
    let cin = 0;
    let fnb = 0;
    let pnt = 0;
    let bll = 0;
    let filledShows = 0;
    let lockedShows = 0;

    if (rec) {
      const totals = StorageService.getLatestShowTotals(rec.shows);
      cin = totals.omsetCinema;
      fnb = totals.omsetFnB;
      pnt = totals.penonton;
      bll = totals.bill;
      rec.shows.forEach((s) => {
        if (s.isFilled) filledShows++;
        if (s.isLocked) lockedShows++;
      });
    }

    const m = StorageService.calculateMetrics(cin, fnb, bll, pnt, outlet.targetHead || targetArea);
    const isPremiereOrHs =
      outlet.class === 'Premiere' ||
      outlet.class === 'HS' ||
      outlet.name.toUpperCase().includes('PREMIERE') ||
      outlet.name.toUpperCase().includes('HS ');

    // Clean short name for x-axis column label
    let shortName = outlet.name
      .replace(/^CAFE\s+/i, '')
      .replace(/^PREMIERE\s+/i, 'PREM ')
      .replace(/^HS\s+/i, 'HS ')
      .replace(/\s+XXI$/i, '');

    return {
      outlet,
      shortName,
      sph: m.head,
      target: outlet.targetHead || targetArea,
      acv: m.achievement,
      fnbTotal: fnb,
      cinemaTotal: cin,
      penonton: pnt,
      bill: bll,
      filledShows,
      lockedShows,
      isPremiereOrHs,
    };
  });

  // Split into Cafe outlets vs Premiere/HS outlets
  const cafeOutlets = outletMetrics.filter((o) => !o.isPremiereOrHs).sort((a, b) => b.sph - a.sph);
  const premiereOutlets = outletMetrics.filter((o) => o.isPremiereOrHs).sort((a, b) => b.sph - a.sph);

  // Active chart items
  const activeChartItems = chartCategoryTab === 'cafe' ? cafeOutlets : premiereOutlets;
  const maxSphInTab = Math.max(
    ...activeChartItems.map((i) => Math.max(i.sph, i.target)),
    chartCategoryTab === 'cafe' ? 35000 : 150000
  );

  return (
    <div className="w-full max-w-full space-y-3 sm:space-y-4 pb-4 flex flex-col justify-start">
      {/* 1. Header Bar: Welcome & Area Filter */}
      <div className="w-full p-3 sm:p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-amber-500/20">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-300 shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-white">
                Executive Command Center
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 border border-amber-300/40 text-amber-300">
                REALTIME PERFORMANCE
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
              User: <span className="text-amber-300 font-semibold">{currentUser?.name}</span> ({currentUser?.role?.toUpperCase()}) &bull; Tanggal: <span className="font-semibold text-white">{selectedDate}</span>
            </p>
          </div>
        </div>

        {/* Filter Area Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1.5 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-amber-400/30 text-xs">
            <Building className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <label className="text-slate-300 font-medium">Area:</label>
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="bg-transparent text-amber-300 font-bold outline-hidden cursor-pointer focus:ring-0 p-0 text-xs"
            >
              <option value="all" className="bg-slate-900 text-white">SEMUA WILAYAH (Target Rp 24.359)</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                  {a.name} (Target Rp {a.targetArea.toLocaleString('id-ID')})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onNavigate('sales_input')}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold text-xs uppercase flex items-center space-x-1.5 shadow-2xs shadow-amber-500/30 transition cursor-pointer active:scale-95 shrink-0"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Input Sales</span>
          </button>
        </div>
      </div>

      {/* 2. 5-Show Showtime Realtime Status Bar */}
      <div className="w-full p-3 sm:p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-1 mb-0.5">
          <span className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            Status Input 5 Showtime Harian ({selectedDate}) &bull; <span className="text-amber-800">{selectedAreaName}</span>
          </span>
          <span className="text-[11px] font-medium text-slate-500">
            Realtime POS XXI
          </span>
        </div>

        <div className="w-full overflow-x-auto pb-0.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3 w-full min-w-[580px] md:min-w-0">
            {showSummary.map((sh) => {
              const isLocked = sh.status === 'locked';
              const isActive = sh.status === 'active';

              return (
                <div
                  key={sh.showNumber}
                  onClick={() => onNavigate('sales_input')}
                  className={`p-2.5 sm:p-3 rounded-lg border text-left transition cursor-pointer relative overflow-hidden flex-1 ${
                    isLocked
                      ? 'bg-amber-50/90 border-amber-300 text-slate-900'
                      : isActive
                      ? 'bg-blue-50/90 border-blue-300 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase">
                      Show {sh.showNumber}
                    </span>
                    {isLocked ? (
                      <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    ) : isActive ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                  </div>

                  <div className="mt-1.5">
                    <p className="text-xs font-bold tracking-tight text-slate-800">
                      F&amp;B: Rp {(sh.omsetFnB / 1000).toFixed(0)}rb
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {sh.lockedCount}/{filteredOutlets.length} outlet terkunci
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. 4 Main Performance Key Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
        {/* Card 1: TOTAL PENONTON */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:border-amber-300 transition flex-1 flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Jumlah Penonton</span>
              <Film className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-700">
              {totalPenonton.toLocaleString('id-ID')} <span className="text-sm font-bold">Orang</span>
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>F&amp;B: Rp {(totalFnB / 1000000).toFixed(2)}M</span>
            <span className="font-bold text-amber-700">{overallMetrics.gboPercent}% GBO</span>
          </div>
        </div>

        {/* Card 2: Average SPH (Head) */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:border-amber-300 transition flex-1 flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">SPH / Head (Average)</span>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl md:text-3xl font-black text-amber-800">
              Rp {overallMetrics.head.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Target: Rp {targetArea.toLocaleString('id-ID')}</span>
            <span className={`font-bold ${overallMetrics.achievement >= 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {overallMetrics.achievement}% ACV
            </span>
          </div>
        </div>

        {/* Card 3: Daya Serap Penonton */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:border-amber-300 transition flex-1 flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Daya Serap Penonton</span>
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl md:text-3xl font-black text-blue-700">
              {overallMetrics.dayaSerap}%
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Struk F&amp;B: {totalBill}</span>
            <span>Penonton: {totalPenonton}</span>
          </div>
        </div>

        {/* Card 4: Average Transaction Value (AT) */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:border-amber-300 transition flex-1 flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">AT (Average Transaction)</span>
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900">
              Rp {overallMetrics.at.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Omset F&amp;B / Struk</span>
            <span className="font-bold text-slate-800">POS XXI</span>
          </div>
        </div>
      </div>

      {/* 4. GRAFIK BATANG VERTIKAL (VERTICAL COLUMN BAR CHART) HEAD SPH */}
      <div className="w-full p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center space-x-2.5">
            <Award className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
            <div>
              <h3 className="text-xs sm:text-sm md:text-base font-black uppercase text-slate-900 tracking-wider">
                Grafik Batang Head SPH Per-Outlet ({selectedAreaName})
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Visualisasi Batang Tegak Perbandingan SPH Real (Head) vs Target SPH Outlet
              </p>
            </div>
          </div>

          {/* Category Tabs: Cafe vs Premiere/HS & Legend */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Chart Legend */}
            <div className="hidden lg:flex items-center space-x-2.5 text-xs text-slate-500">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block shrink-0" />
                <span>SPH Achieved (&ge;100%)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block shrink-0" />
                <span>SPH Under Target (&lt;100%)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-0.5 bg-slate-400 inline-block shrink-0" />
                <span>Target Baseline</span>
              </span>
            </div>

            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                onClick={() => setChartCategoryTab('cafe')}
                className={`px-3 py-1 rounded-md font-bold transition flex items-center space-x-1 cursor-pointer ${
                  chartCategoryTab === 'cafe'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>CAFE XXI ({cafeOutlets.length})</span>
              </button>

              <button
                onClick={() => setChartCategoryTab('premiere')}
                className={`px-3 py-1 rounded-md font-bold transition flex items-center space-x-1 cursor-pointer ${
                  chartCategoryTab === 'premiere'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>PREMIERE &amp; HS ({premiereOutlets.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Vertical Column Bar Chart Box */}
        <div className="w-full overflow-x-auto pb-1">
          {activeChartItems.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-6">
              Tidak ada data outlet untuk kategori ini pada area {selectedAreaName}.
            </p>
          ) : (
            <div className="min-w-[800px] lg:min-w-full pt-2">
              {/* Vertical Column Track Container */}
              <div className="h-44 sm:h-48 md:h-52 w-full flex items-end gap-2 sm:gap-3 md:gap-4 justify-around pt-6 pb-2 px-2 bg-slate-50/50 rounded-lg border border-slate-100">
                {activeChartItems.map((item) => {
                  const targetVal = item.target || targetArea;
                  const barHeightPct = Math.min(100, Math.max(12, Math.round((item.sph / maxSphInTab) * 100)));
                  const targetHeightPct = Math.min(100, Math.round((targetVal / maxSphInTab) * 100));

                  return (
                    <div
                      key={item.outlet.id}
                      className="flex-1 min-w-[65px] max-w-[110px] h-full flex flex-col justify-end items-center group relative cursor-pointer"
                    >
                      {/* Top SPH Tag */}
                      <div className="mb-1 text-center">
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.2 rounded shadow-2xs block whitespace-nowrap ${
                            item.acv >= 100
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {item.sph > 0 ? `Rp ${(item.sph / 1000).toFixed(1)}k` : 'Rp 0'}
                        </span>
                        <span className="text-[10px] font-extrabold text-slate-500 block mt-0.5">
                          {item.acv}%
                        </span>
                      </div>

                      {/* Vertical Column Track */}
                      <div className="w-full max-w-[36px] bg-slate-200/70 h-full rounded-t-md relative flex items-end justify-center overflow-hidden border border-slate-200/80">
                        {/* Target SPH Line Indicator */}
                        <div
                          style={{ bottom: `${targetHeightPct}%` }}
                          className="absolute w-full border-b-2 border-dashed border-slate-700 z-10"
                          title={`Target: Rp ${targetVal.toLocaleString('id-ID')}`}
                        />

                        {/* SPH Bar Fill */}
                        <div
                          style={{ height: `${barHeightPct}%` }}
                          className={`w-full rounded-t-xs transition-all duration-500 ${
                            item.acv >= 100
                              ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:from-emerald-500 group-hover:to-emerald-300'
                              : 'bg-gradient-to-t from-amber-600 to-amber-400 group-hover:from-amber-500 group-hover:to-amber-300'
                          }`}
                        />
                      </div>

                      {/* X-Axis Outlet Label */}
                      <div className="mt-1.5 text-center w-full">
                        <span
                          className="text-[11px] font-bold text-slate-700 block truncate group-hover:text-amber-800"
                          title={item.outlet.name}
                        >
                          {item.shortName}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
