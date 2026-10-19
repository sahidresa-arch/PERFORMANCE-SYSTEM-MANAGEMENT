import React, { useState, useEffect } from 'react';
import { User, Outlet, BakingProduct, BakingSaleRecord } from '../../types';
import { StorageService } from '../../lib/storage';
import { BAKING_PRODUCTS } from '../../lib/constants';
import { ScanModal } from '../ocr/ScanModal';
import {
  UtensilsCrossed,
  LayoutDashboard,
  FileSpreadsheet,
  Save,
  ScanLine,
  Search,
  Check,
  TrendingUp,
  Award,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';

interface PenjualanBakingProps {
  currentUser: User | null;
  selectedDate: string;
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

export const PenjualanBaking: React.FC<PenjualanBakingProps> = ({
  currentUser,
  selectedDate,
}) => {
  const areas = StorageService.getAreas();
  const rawOutlets = StorageService.getOutlets();
  const isManagerOrCleaner = (currentUser?.role === 'manager' || currentUser?.role === 'cleaner') && currentUser?.outletId;
  const outlets = isManagerOrCleaner
    ? rawOutlets.filter((o) => o.id === currentUser.outletId)
    : rawOutlets;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'area_manager';

  const [activeTab, setActiveTab] = useState<'sheet' | 'dashboard'>('sheet');
  const [selectedAreaId, setSelectedAreaId] = useState<string>(areas[0]?.id || '');
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // Oktober
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [searchQuery, setSearchQuery] = useState('');
  const [, setRefreshTick] = useState(0);

  // Default outlet
  const defaultOutletId =
    currentUser?.outletId || (outlets.length > 0 ? outlets[0].id : '');
  const [selectedOutletId, setSelectedOutletId] = useState<string>(defaultOutletId);
  const selectedArea = areas.find((a) => a.id === selectedAreaId) || areas[0];

  // Baking record from real storage
  const [bakingRecord, setBakingRecord] = useState<BakingSaleRecord>(() =>
    StorageService.getBakingSaleByOutlet(defaultOutletId, selectedYear, selectedMonth)
  );

  // Reload bakingRecord when outlet, month, or year changes
  useEffect(() => {
    setBakingRecord(
      StorageService.getBakingSaleByOutlet(selectedOutletId, selectedYear, selectedMonth)
    );
  }, [selectedOutletId, selectedYear, selectedMonth]);

  // Listen for real-time Supabase / storage updates across devices
  useEffect(() => {
    const handleStorageUpdate = (e: any) => {
      const type = e?.detail?.type;
      if (!type || type === 'baking' || type === 'sales' || type === 'all-reset') {
        setBakingRecord(
          StorageService.getBakingSaleByOutlet(selectedOutletId, selectedYear, selectedMonth)
        );
        setRefreshTick((t) => t + 1);
      }
    };
    window.addEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    return () => window.removeEventListener('cinema-xxi-storage-update', handleStorageUpdate);
  }, [selectedOutletId, selectedYear, selectedMonth]);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [chartMode, setChartMode] = useState<'combo' | 'qty' | 'conversion'>('combo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'default'>('default');

  // Days in month calculation
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const dayNames = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];

  // Filter products by search and sort
  const filteredProducts = BAKING_PRODUCTS
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === 'asc') return a.name.localeCompare(b.name);
      if (sortOrder === 'desc') return b.name.localeCompare(a.name);
      return a.id - b.id;
    });

  const toggleSortRoti = () => {
    if (sortOrder === 'default') setSortOrder('asc');
    else if (sortOrder === 'asc') setSortOrder('desc');
    else setSortOrder('default');
  };

  const handleCellChange = (day: number, productId: number, value: number) => {
    const updatedDaily = {
      ...bakingRecord.dailySales,
      [day]: {
        ...(bakingRecord.dailySales[day] || {}),
        [productId]: value,
      },
    };

    const nextRecord: BakingSaleRecord = {
      ...bakingRecord,
      outletId: selectedOutletId,
      year: selectedYear,
      month: selectedMonth,
      dailySales: updatedDaily,
    };

    setBakingRecord(nextRecord);
    StorageService.saveBakingSale(nextRecord);
  };

  const handleSave = () => {
    StorageService.saveBakingSale({
      ...bakingRecord,
      outletId: selectedOutletId,
      year: selectedYear,
      month: selectedMonth,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleOutletChange = (outletId: string) => {
    setSelectedOutletId(outletId);
    const rec = StorageService.getBakingSaleByOutlet(outletId, selectedYear, selectedMonth);
    setBakingRecord(rec);
  };

  // REAL PERFORMANCE CALCULATIONS FOR DASHBOARD BAKING (NO DUMMY DATA)
  const areaOutlets = outlets.filter((o) => (selectedAreaId ? o.areaId === selectedAreaId : true));

  // Get real penonton for an outlet in a specific year and month
  const getRealPenontonForOutlet = (outletId: string, year: number, month: number) => {
    const salesList = StorageService.getDailySales().filter((s) => {
      if (s.outletId !== outletId) return false;
      const [y, m] = s.date.split('-').map(Number);
      return y === year && m === month;
    });

    let penontonCount = 0;
    salesList.forEach((s) => {
      const filledShows = (s.shows || []).filter((sh) => sh.isFilled || sh.omsetCinema > 0 || sh.omsetFnB > 0);
      if (filledShows.length > 0) {
        const latestShow = [...filledShows].sort((a, b) => b.showNumber - a.showNumber)[0];
        penontonCount += latestShow.penonton || 0;
      }
    });
    return penontonCount;
  };

  // Get real total Qty sold for an outlet in a specific year and month
  const getRealBakingQtyForOutlet = (outletId: string, year: number, month: number) => {
    const rec = StorageService.getBakingSaleByOutlet(outletId, year, month);
    let totalQty = 0;
    Object.values(rec.dailySales || {}).forEach((dayMap) => {
      Object.values(dayMap || {}).forEach((q) => {
        totalQty += q || 0;
      });
    });
    return totalQty;
  };

  // Outlet Ranking Data (100% Real)
  const outletRankingData = areaOutlets.map((outlet) => {
    const totalQty = getRealBakingQtyForOutlet(outlet.id, selectedYear, selectedMonth);
    const penonton = getRealPenontonForOutlet(outlet.id, selectedYear, selectedMonth);
    const conversion = penonton > 0 ? Number(((totalQty / penonton) * 100).toFixed(1)) : 0;

    return {
      outlet,
      totalQty,
      penonton,
      conversion,
    };
  });

  // Sort by volume
  const sortedRanking = [...outletRankingData].sort((a, b) => b.totalQty - a.totalQty);
  const totalAreaBaking = sortedRanking.reduce((acc, r) => acc + r.totalQty, 0);

  const activeOutletRankingWithData = outletRankingData.filter((r) => r.totalQty > 0 || r.conversion > 0);
  const topConversion = activeOutletRankingWithData.length > 0
    ? [...activeOutletRankingWithData].sort((a, b) => b.conversion - a.conversion)[0]
    : null;
  const topVolume = sortedRanking[0]?.totalQty > 0 ? sortedRanking[0] : null;

  // Real 12-Month Sales History for Selected Outlet (No Fake Weights)
  const monthList12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mNum) => {
    const mQty = getRealBakingQtyForOutlet(selectedOutletId, selectedYear, mNum);
    const mPenonton = getRealPenontonForOutlet(selectedOutletId, selectedYear, mNum);
    const mConversion = mPenonton > 0 ? Number(((mQty / mPenonton) * 100).toFixed(1)) : 0;

    return {
      monthNum: mNum,
      monthName: MONTH_NAMES[mNum - 1],
      qty: mQty,
      penonton: mPenonton,
      conversion: mConversion,
    };
  });

  const totalYearlyQtyReal = monthList12.reduce((acc, m) => acc + m.qty, 0);
  const monthsWithData = monthList12.filter((m) => m.qty > 0);
  const avgMonthlyQtyReal = monthsWithData.length > 0 ? Math.round(totalYearlyQtyReal / monthsWithData.length) : 0;
  
  const totalYearlyPenonton = monthList12.reduce((acc, m) => acc + m.penonton, 0);
  const avgConversionReal = totalYearlyPenonton > 0 ? Number(((totalYearlyQtyReal / totalYearlyPenonton) * 100).toFixed(1)) : 0;

  const topMonthReal = [...monthList12].sort((a, b) => b.qty - a.qty)[0];
  const maxMonthQty = Math.max(...monthList12.map((m) => m.qty), 1);
  const maxMonthConv = Math.max(...monthList12.map((m) => m.conversion), 1);

  const monthsList = [
    { num: 1, name: 'Januari' },
    { num: 2, name: 'Februari' },
    { num: 3, name: 'Maret' },
    { num: 4, name: 'April' },
    { num: 5, name: 'Mei' },
    { num: 6, name: 'Juni' },
    { num: 7, name: 'Juli' },
    { num: 8, name: 'Agustus' },
    { num: 9, name: 'September' },
    { num: 10, name: 'Oktober' },
    { num: 11, name: 'November' },
    { num: 12, name: 'Desember' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner and Navigation Tabs */}
      <div className="p-5 rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-amber-500/15 text-amber-700">
              <UtensilsCrossed className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
              PENJUALAN BAKING ✨
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">
            MONITORING TARGET &amp; KONSUMSI PRODUK BAKING BULANAN
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs'
                : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>DASHBOARD BAKING</span>
          </button>

          <button
            onClick={() => setActiveTab('sheet')}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition cursor-pointer ${
              activeTab === 'sheet'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs'
                : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>PENJUALAN</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR: Area, Bulan, Tahun */}
      <div className="p-4 rounded-2xl border border-amber-200/80 bg-white text-slate-800 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-1">
              AREA
            </label>
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-2xs"
            >
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-1">
              BULAN
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-2xs"
            >
              {monthsList.map((m) => (
                <option key={m.num} value={m.num}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-1">
              TAHUN
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-2xs"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: PENJUALAN SHEET TAB */}
      {activeTab === 'sheet' && (
        <div className="space-y-4">
          {/* Outlet Selector + Search Bar + Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <select
                value={selectedOutletId}
                disabled={!isAdmin}
                onChange={(e) => handleOutletChange(e.target.value)}
                className={`text-xs font-black px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-amber-800 shadow-2xs ${
                  !isAdmin ? 'opacity-80' : ''
                }`}
              >
                {areaOutlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute inset-y-0 left-3 my-auto text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari item dalam sheet rekap..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-semibold shadow-2xs outline-hidden focus:border-amber-400 focus:ring-2 focus:ring-amber-100 placeholder-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsScanModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500 text-slate-950 hover:bg-amber-400 flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
              >
                <ScanLine className="w-4 h-4 text-slate-950" />
                <span>SCAN STRUK / BILL</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-500 flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>TERSIMPAN!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>SIMPAN PENJUALAN</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 31-Day Matrix Sheet */}
          <div className="rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-md overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-[11px] text-center border-collapse">
                <thead className="sticky top-0 z-20 font-black uppercase tracking-wider border-b border-slate-200 bg-slate-100 text-slate-700">
                  <tr>
                    <th className="py-2.5 px-2 border-r border-slate-200 text-center w-10">
                      NO
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-left min-w-[200px]">
                      <button
                        type="button"
                        onClick={toggleSortRoti}
                        className="flex items-center space-x-1.5 font-black uppercase text-slate-800 hover:text-amber-800 transition cursor-pointer"
                        title="Klik untuk mengurutkan A-Z / Z-A"
                      >
                        <span>NAMA ROTI</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200/70 text-amber-900 font-extrabold">
                          {sortOrder === 'asc' ? 'A-Z ↑' : sortOrder === 'desc' ? 'Z-A ↓' : '↕ Sort A-Z'}
                        </span>
                      </button>
                    </th>
                    <th className="py-2.5 px-2 border-r border-slate-200 w-16">
                      SATUAN
                    </th>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                      const dateObj = new Date(selectedYear, selectedMonth - 1, day);
                      const dayName = dayNames[dateObj.getDay()];
                      const isWeekend = dayName === 'SAB' || dayName === 'MIN';

                      return (
                        <th
                          key={day}
                          className={`py-2 px-1 border-r border-slate-200 min-w-[42px] ${
                            isWeekend ? 'bg-amber-100 text-amber-900 font-black' : ''
                          }`}
                        >
                          <div className="text-[12px] font-black">{day}</div>
                          <div className="text-[9px] opacity-75 font-semibold">{dayName}</div>
                        </th>
                      );
                    })}
                    <th className="py-2.5 px-3 border-r border-slate-200 min-w-[70px] bg-amber-100 text-amber-900 font-black">
                      TOTAL JUAL
                    </th>
                    <th className="py-2.5 px-3 min-w-[60px] bg-amber-100 text-amber-900 font-black">
                      TARGET
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredProducts.map((p, idx) => {
                    let productTotal = 0;
                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-amber-50/60 transition ${
                          idx % 2 === 0 ? 'bg-slate-50/40' : 'bg-white'
                        }`}
                      >
                        <td className="py-2 px-2 border-r border-slate-200 font-bold text-slate-500">
                          {p.id}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-left font-bold text-slate-900">
                          {p.name}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-200 font-semibold text-slate-500">
                          {p.unit}
                        </td>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                          const val = bakingRecord.dailySales[day]?.[p.id] || 0;
                          productTotal += val;

                          return (
                            <td key={day} className="py-1 px-1 border-r border-slate-200">
                              <input
                                type="number"
                                min="0"
                                value={val || ''}
                                onChange={(e) =>
                                  handleCellChange(day, p.id, Number(e.target.value))
                                }
                                className="w-full text-center font-extrabold text-[11px] text-slate-900 bg-transparent hover:bg-amber-100/50 focus:bg-amber-100 focus:outline-none rounded py-0.5"
                              />
                            </td>
                          );
                        })}
                        <td className="py-2 px-3 border-r border-slate-200 font-black text-emerald-800 bg-emerald-50/50">
                          {productTotal}
                        </td>
                        <td className="py-2 px-3 font-extrabold text-slate-600 bg-amber-50/30">
                          {p.targetDefault}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary Footer Row */}
                  <tr className="bg-amber-100/80 font-black text-amber-950 border-t-2 border-amber-300">
                    <td colSpan={3} className="py-3 px-3 text-left uppercase tracking-wider font-extrabold text-xs">
                      TOTAL CONSUMPTION (PCS)
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                      let dayTotal = 0;
                      BAKING_PRODUCTS.forEach((p) => {
                        dayTotal += bakingRecord.dailySales[day]?.[p.id] || 0;
                      });

                      return (
                        <td
                          key={day}
                          className="py-3 px-1 border-r border-slate-300 text-center font-black text-amber-950"
                        >
                          {dayTotal}
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 border-r border-slate-300 font-black text-amber-950 text-xs">
                      {Object.values(bakingRecord.dailySales || {}).reduce((acc, map) => {
                        return (
                          acc +
                          Object.values(map || {}).reduce((sum, q) => sum + (q || 0), 0)
                        );
                      }, 0)}
                    </td>
                    <td className="py-3 px-2 text-slate-500">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DASHBOARD BAKING (100% REAL DATA ONLY) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Penjualan Real
              </span>
              <p className="text-3xl font-black text-emerald-800 mt-2">
                {totalAreaBaking.toLocaleString('id-ID')} pcs
              </p>
              <span className="text-xs text-slate-500 font-semibold block mt-1">
                Wilayah: {selectedArea?.name} ({MONTH_NAMES[selectedMonth - 1]} {selectedYear})
              </span>
            </div>

            <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <Award className="w-4 h-4 text-amber-600" />
                <span>Terbaik (Konversi Real)</span>
              </span>
              <p className="text-lg font-black text-amber-800 mt-2">
                {topConversion ? topConversion.outlet.name : 'Belum Ada Data'}
              </p>
              <span className="text-xs text-emerald-700 font-bold block mt-1">
                {topConversion ? `${topConversion.conversion}% conversion` : '0%'}
              </span>
            </div>

            <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-cyan-600" />
                <span>Terbaik (Volume Real)</span>
              </span>
              <p className="text-lg font-black text-cyan-800 mt-2">
                {topVolume ? topVolume.outlet.name : 'Belum Ada Data'}
              </p>
              <span className="text-xs text-slate-500 font-bold block mt-1">
                {topVolume ? `${topVolume.totalQty.toLocaleString('id-ID')} pcs` : '0 pcs'}
              </span>
            </div>
          </div>

          {/* Split 2 Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Chart */}
            <div className="lg:col-span-7 p-6 rounded-3xl border border-amber-200/90 bg-white shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                      <BarChart3 className="w-4 h-4" />
                    </span>
                    <h3 className="font-extrabold text-base text-slate-900">Visual Grafik Baking Real</h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800">
                      12 BULAN REAL
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Grafik penjualan murni dari inputan data sales &amp; sheet baking
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={selectedOutletId}
                    onChange={(e) => handleOutletChange(e.target.value)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-amber-900 shadow-2xs cursor-pointer"
                  >
                    {areaOutlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chart Mode Subtabs */}
              <div className="flex items-center space-x-2 mb-4">
                <button
                  onClick={() => setChartMode('combo')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    chartMode === 'combo'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kombinasi (Qty &amp; %)
                </button>
                <button
                  onClick={() => setChartMode('qty')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    chartMode === 'qty'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Qty Real
                </button>
                <button
                  onClick={() => setChartMode('conversion')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    chartMode === 'conversion'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  % Konversi Real
                </button>
              </div>

              {/* 4 Real Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    TOTAL QTY 1 TAHUN
                  </span>
                  <span className="text-base font-black text-emerald-800">
                    {totalYearlyQtyReal.toLocaleString('id-ID')} pcs
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    RATA-RATA / BULAN
                  </span>
                  <span className="text-base font-black text-amber-800">
                    {avgMonthlyQtyReal.toLocaleString('id-ID')} pcs
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    RATA-RATA KONVERSI
                  </span>
                  <span className="text-base font-black text-purple-800">
                    {avgConversionReal}%
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    BULAN TERTINGGI
                  </span>
                  <span className="text-base font-black text-cyan-800">
                    {topMonthReal && topMonthReal.qty > 0 ? topMonthReal.monthName : '-'}
                  </span>
                </div>
              </div>

              {/* Real 12-Month Bar and Trend Visualization */}
              <div className="h-64 flex flex-col justify-end pt-4">
                <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2 border-b border-slate-200">
                  {monthList12.map((m) => {
                    const isCurrentMonth = m.monthNum === selectedMonth;

                    const barHeight = chartMode === 'conversion'
                      ? Math.min(100, Math.max(0, (m.conversion / (maxMonthConv || 1)) * 100))
                      : Math.min(100, Math.max(0, (m.qty / (maxMonthQty || 1)) * 100));

                    return (
                      <div
                        key={m.monthNum}
                        className="flex-1 flex flex-col items-center justify-end h-full group relative"
                      >
                        <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 bg-slate-900 border border-amber-400 px-2 py-0.5 rounded-md text-[10px] font-bold text-amber-300 z-10 pointer-events-none whitespace-nowrap shadow-md">
                          {m.monthName}: {m.qty} pcs ({m.conversion}% Konversi)
                        </div>

                        {barHeight > 0 ? (
                          <div
                            style={{ height: `${barHeight}%` }}
                            className={`w-full rounded-t-lg transition-all duration-300 ${
                              isCurrentMonth
                                ? chartMode === 'conversion'
                                  ? 'bg-gradient-to-t from-purple-700 to-purple-400 shadow-md shadow-purple-500/20'
                                  : 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-md shadow-emerald-500/20'
                                : chartMode === 'conversion'
                                ? 'bg-gradient-to-t from-purple-300 to-purple-200 group-hover:from-purple-400 group-hover:to-purple-300'
                                : 'bg-gradient-to-t from-amber-300 to-amber-200 group-hover:from-amber-400 group-hover:to-amber-300'
                            }`}
                          ></div>
                        ) : (
                          <div className="w-full h-1 bg-slate-200 rounded-t"></div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* X-Axis Month Labels */}
                <div className="flex justify-between text-[10px] font-bold text-slate-500 pt-2 px-1">
                  {monthList12.map((m) => (
                    <span
                      key={m.monthNum}
                      className={m.monthNum === selectedMonth ? 'text-emerald-800 font-black' : ''}
                    >
                      {m.monthName.substring(0, 3)}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                      <span className="font-semibold">Bulan Terpilih ({MONTH_NAMES[selectedMonth - 1]})</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                      <span className="font-semibold">Data Murni Penjualan</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    100% Data Murni (Tanpa Simulasi)
                  </span>
                </div>
              </div>
            </div>

            {/* Right Performa Outlet Ranking (Real Data) */}
            <div className="lg:col-span-5 p-6 rounded-3xl border border-amber-200/90 bg-white shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                    <Award className="w-4 h-4" />
                  </span>
                  <h3 className="font-extrabold text-base text-slate-900">Performa Outlet Real</h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800">
                    {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-bold">Urut: Volume</span>
              </div>

              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="uppercase text-[10px] font-black border-b border-slate-200 bg-slate-50 text-slate-600 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-2">No</th>
                      <th className="py-2.5 px-3">Outlet</th>
                      <th className="py-2.5 px-2 text-right">Penjualan</th>
                      <th className="py-2.5 px-2 text-right">Konversi</th>
                      <th className="py-2.5 px-2 text-center">Ranking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {sortedRanking.map((item, idx) => {
                      const isSelected = item.outlet.id === selectedOutletId;
                      const medal =
                        idx === 0 && item.totalQty > 0
                          ? '🥇'
                          : idx === 1 && item.totalQty > 0
                          ? '🥈'
                          : idx === 2 && item.totalQty > 0
                          ? '🥉'
                          : `#${idx + 1}`;

                      return (
                        <tr
                          key={item.outlet.id}
                          onClick={() => handleOutletChange(item.outlet.id)}
                          className={`hover:bg-amber-50 cursor-pointer transition ${
                            isSelected ? 'bg-amber-100 font-bold text-amber-950' : 'text-slate-800'
                          }`}
                        >
                          <td className="py-2.5 px-2 font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold truncate max-w-[150px]">
                            {item.outlet.name}
                          </td>
                          <td className="py-2.5 px-2 text-right font-black text-emerald-800">
                            {item.totalQty.toLocaleString('id-ID')} pcs
                          </td>
                          <td className="py-2.5 px-2 text-right font-black text-purple-800">
                            {item.conversion}%
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold">{medal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI OCR Scanner Modal */}
      <ScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onApplyData={() => {
          // Keep clean behavior
        }}
      />
    </div>
  );
};
