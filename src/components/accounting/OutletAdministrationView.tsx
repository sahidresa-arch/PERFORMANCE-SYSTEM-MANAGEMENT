import React, { useState, useEffect } from 'react';
import { User, OutletAdministrationRecord } from '../../types';
import { StorageService } from '../../lib/storage';
import { INITIAL_AREAS, INITIAL_OUTLETS } from '../../lib/constants';
import {
  FileSpreadsheet,
  Filter,
  Plus,
  Save,
  Building2,
  Calendar,
  CheckCircle2,
  Edit3,
  Layers,
  DollarSign,
  TrendingDown,
  Trash2,
} from 'lucide-react';

interface OutletAdministrationViewProps {
  currentUser: User | null;
  selectedDate: string;
}

export const OutletAdministrationView: React.FC<OutletAdministrationViewProps> = ({
  currentUser,
  selectedDate,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    selectedDate ? selectedDate.substring(0, 7) : '2026-10'
  );
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [selectedOutletId, setSelectedOutletId] = useState<string>(
    currentUser?.outletId || 'bogor_1'
  );

  const areas = INITIAL_AREAS;
  const rawOutlets = StorageService.getOutlets();
  const isManagerOrCleaner = (currentUser?.role === 'manager' || currentUser?.role === 'cleaner') && currentUser?.outletId;
  const outlets = isManagerOrCleaner
    ? rawOutlets.filter((o) => o.id === currentUser.outletId)
    : rawOutlets;

  const [records, setRecords] = useState<OutletAdministrationRecord[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<OutletAdministrationRecord>({
    id: '',
    outletId: currentUser?.outletId || (outlets[0]?.id || 'the-park-sawangan-xxi'),
    month: selectedMonth,
    cogs: 45000000,
    adjustment: 1500000,
    spoil: 750000,
    waste: 500000,
    usage: 42000000,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const loaded = StorageService.getOutletAdministrations();
    setRecords(loaded);
    const found = loaded.find(
      (r) => r.outletId === selectedOutletId && r.month === selectedMonth
    );
    if (found) {
      setFormData(found);
    } else {
      setFormData({
        id: `admin_${selectedOutletId}_${selectedMonth}`,
        outletId: selectedOutletId,
        month: selectedMonth,
        cogs: 45000000,
        adjustment: 1500000,
        spoil: 750000,
        waste: 500000,
        usage: 42000000,
      });
    }
  }, [selectedOutletId, selectedMonth]);

  const filteredOutlets = outlets.filter((o) => {
    if (currentUser?.role === 'manager' && currentUser.outletId) {
      return o.id === currentUser.outletId;
    }
    if (selectedAreaId !== 'all' && o.areaId !== selectedAreaId) {
      return false;
    }
    return true;
  });

  const handleFormChange = (field: keyof OutletAdministrationRecord, val: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: isNaN(val) ? 0 : val,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveOutletAdministrationRecord(formData);
    setRecords(StorageService.getOutletAdministrations());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Filtered records for excel table view
  const displayRecords = records.filter((r) => {
    if (r.month !== selectedMonth) return false;
    const outletObj = outlets.find((o) => o.id === r.outletId);
    if (!outletObj) return false;
    if (currentUser?.role === 'manager' && currentUser.outletId && r.outletId !== currentUser.outletId) {
      return false;
    }
    if (selectedAreaId !== 'all' && outletObj.areaId !== selectedAreaId) {
      return false;
    }
    return true;
  });

  // Totals across displayed records
  const totalCogs = displayRecords.reduce((acc, r) => acc + Number(r.cogs || 0), 0);
  const totalAdjustment = displayRecords.reduce((acc, r) => acc + Number(r.adjustment || 0), 0);
  const totalSpoil = displayRecords.reduce((acc, r) => acc + Number(r.spoil || 0), 0);
  const totalWaste = displayRecords.reduce((acc, r) => acc + Number(r.waste || 0), 0);
  const totalUsage = displayRecords.reduce((acc, r) => acc + Number(r.usage || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#4A1D6A] via-[#5E2B97] to-[#3D1A5E] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[#FFD700] text-xs font-bold uppercase tracking-widest mb-1">
              <Layers className="w-4 h-4" />
              <span>Accounting Management &bull; Cinema XXI</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Administrasi Outlet (COGS, Adjustment, Spoil, Waste, Usage)
            </h1>
            <p className="text-purple-200 text-sm mt-1">
              Pencatatan rincian biaya persediaan dan operasional outlet per bulan secara detail.
            </p>
          </div>
          <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20">
            <Calendar className="w-5 h-5 text-[#FFD700]" />
            <div>
              <div className="text-[10px] text-purple-200 uppercase font-semibold">Periode Bulan</div>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-white font-bold text-sm focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <Filter className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-slate-700">Filter Area:</span>
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Area</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <Building2 className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-slate-700">Input Outlet:</span>
            <select
              value={selectedOutletId}
              onChange={(e) => setSelectedOutletId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              {filteredOutlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-bold animate-pulse">
            <CheckCircle2 className="w-4 h-4" />
            <span>Data administrasi outlet berhasil disimpan!</span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Total COGS</div>
          <div className="text-lg font-black text-slate-900 mt-1">
            Rp {totalCogs.toLocaleString('id-ID')}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Total Adjustment</div>
          <div className="text-lg font-black text-purple-700 mt-1">
            Rp {totalAdjustment.toLocaleString('id-ID')}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Total Spoil</div>
          <div className="text-lg font-black text-amber-600 mt-1">
            Rp {totalSpoil.toLocaleString('id-ID')}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Total Waste</div>
          <div className="text-lg font-black text-rose-600 mt-1">
            Rp {totalWaste.toLocaleString('id-ID')}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 col-span-2 md:col-span-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Total Usage</div>
          <div className="text-lg font-black text-emerald-600 mt-1">
            Rp {totalUsage.toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* Input Form Card for Selected Outlet */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <Edit3 className="w-5 h-5 text-[#FACC15]" />
            <h2 className="font-bold text-base">
              Input Administrasi Per Outlet &bull; {outlets.find((o) => o.id === selectedOutletId)?.name || selectedOutletId} ({selectedMonth})
            </h2>
          </div>
          <button
            type="submit"
            className="bg-[#FACC15] hover:bg-yellow-400 text-slate-900 px-4 py-2 rounded-xl font-bold text-xs flex items-center space-x-2 transition shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Data</span>
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">COGS (Cost of Goods Sold)</label>
            <input
              type="number"
              value={formData.cogs}
              onChange={(e) => handleFormChange('cogs', Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Adjustment (Penyesuaian)</label>
            <input
              type="number"
              value={formData.adjustment}
              onChange={(e) => handleFormChange('adjustment', Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Spoil (Barang Rusak/Expired)</label>
            <input
              type="number"
              value={formData.spoil}
              onChange={(e) => handleFormChange('spoil', Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Waste (Limbah/Buangan)</label>
            <input
              type="number"
              value={formData.waste}
              onChange={(e) => handleFormChange('waste', Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Usage (Pemakaian F&B/Material)</label>
            <input
              type="number"
              value={formData.usage}
              onChange={(e) => handleFormChange('usage', Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              required
            />
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            className="bg-purple-900 hover:bg-purple-800 text-white px-5 py-2 rounded-xl font-bold text-xs flex items-center space-x-2 transition shadow cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Data Administrasi Outlet</span>
          </button>
        </div>
      </form>

      {/* Excel-like Table View */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-purple-700" />
            <h3 className="font-bold text-slate-800 text-sm">
              Rekapitulasi Administrasi Outlet &bull; Periode {selectedMonth}
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {displayRecords.length} Outlet Tercatat
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3.5">Outlet</th>
                <th className="p-3.5">Area</th>
                <th className="p-3.5 text-right">COGS (Rp)</th>
                <th className="p-3.5 text-right">Adjustment (Rp)</th>
                <th className="p-3.5 text-right">Spoil (Rp)</th>
                <th className="p-3.5 text-right">Waste (Rp)</th>
                <th className="p-3.5 text-right">Usage (Rp)</th>
                <th className="p-3.5 text-center">Update Terakhir</th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {displayRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">
                    Belum ada data administrasi outlet untuk periode {selectedMonth}. Silakan input di atas.
                  </td>
                </tr>
              ) : (
                displayRecords.map((r) => {
                  const outletObj = outlets.find((o) => o.id === r.outletId);
                  const areaObj = areas.find((a) => a.id === outletObj?.areaId);
                  return (
                    <tr key={r.id} className="hover:bg-purple-50/40 transition">
                      <td className="p-3.5 font-bold text-slate-900">
                        {outletObj?.name || r.outletId}
                      </td>
                      <td className="p-3.5 text-slate-600">{areaObj?.name || '-'}</td>
                      <td className="p-3.5 text-right font-semibold">
                        {Number(r.cogs).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-right text-purple-700 font-semibold">
                        {Number(r.adjustment).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-right text-amber-600 font-semibold">
                        {Number(r.spoil).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-right text-rose-600 font-semibold">
                        {Number(r.waste).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-right text-emerald-600 font-semibold">
                        {Number(r.usage).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-center text-slate-500">{r.updatedAt || '-'}</td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setSelectedOutletId(r.outletId)}
                          className="px-2.5 py-1 bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-md font-bold transition cursor-pointer"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
