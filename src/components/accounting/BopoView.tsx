import React, { useState } from 'react';
import { User, Employee } from '../../types';
import { StorageService } from '../../lib/storage';
import { INITIAL_AREAS, INITIAL_OUTLETS } from '../../lib/constants';
import {
  Calculator,
  Filter,
  TrendingUp,
  DollarSign,
  Building2,
  AlertCircle,
  Printer,
  Users,
} from 'lucide-react';

interface BopoViewProps {
  currentUser: User | null;
  selectedDate: string;
}

const MONTHS = [
  { id: '01', name: 'Januari' },
  { id: '02', name: 'Februari' },
  { id: '03', name: 'Maret' },
  { id: '04', name: 'April' },
  { id: '05', name: 'Mei' },
  { id: '06', name: 'Juni' },
  { id: '07', name: 'Juli' },
  { id: '08', name: 'Agustus' },
  { id: '09', name: 'September' },
  { id: '10', name: 'Oktober' },
  { id: '11', name: 'November' },
  { id: '12', name: 'Desember' },
];

export const BopoView: React.FC<BopoViewProps> = ({ currentUser, selectedDate }) => {
  const [, setSyncTick] = useState(0);
  React.useEffect(() => {
    const handleStorageUpdate = () => setSyncTick((t) => t + 1);
    window.addEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('cinema-xxi-storage-update', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [selectedOutletId, setSelectedOutletId] = useState<string>(
    currentUser?.outletId || 'aeon-sentul-xxi'
  );

  const outlets = StorageService.getOutlets();
  const areas = INITIAL_AREAS;
  const filteredOutlets = outlets.filter((o) => {
    if ((currentUser?.role === 'manager' || currentUser?.role === 'cleaner') && currentUser?.outletId) {
      return o.id === currentUser.outletId;
    }
    if (selectedAreaId !== 'all' && o.areaId !== selectedAreaId) {
      return false;
    }
    return true;
  });

  const currentOutletObj = outlets.find((o) => o.id === selectedOutletId) || outlets[0];
  const outletUmr = currentOutletObj?.umr || 5161769;

  // Employees calculation per division
  const allEmployees = StorageService.getEmployees();
  // Handle combined outlets (e.g. Aeon Sentul and HS Aeon Sentul)
  const outletEmployees = allEmployees.filter((e) => {
    if (e.outletId === selectedOutletId) return true;
    if (selectedOutletId.includes('aeon-sentul') && e.outletId.includes('aeon-sentul')) return true;
    if (selectedOutletId.includes('margo-city') && e.outletId.includes('margo-city')) return true;
    if (selectedOutletId.includes('pesona-square') && e.outletId.includes('pesona-square')) return true;
    return false;
  });

  const cinemaEmployees = outletEmployees.filter(
    (e) => e.divisi === 'Cinema' || e.divisi === 'Teknisi' || e.divisi === 'Manager'
  );
  const fnbEmployees = outletEmployees.filter(
    (e) => e.divisi === 'F&B' || e.divisi === 'Kasir' || e.divisi === 'Cleaning' || e.divisi === 'Admin'
  );

  const countCinema = cinemaEmployees.length;
  const countFnb = fnbEmployees.length;

  const gajiCinema = countCinema * outletUmr;
  const gajiFnb = countFnb * outletUmr;

  const dailySales = StorageService.getDailySales();
  const bopoRecords = StorageService.getBopoRecords();

  // Calculate stats per month
  const monthlyData = MONTHS.map((m) => {
    const monthKey = `2026-${m.id}`;
    let sumCinema = 0;
    let sumFnB = 0;

    dailySales
      .filter((s) => {
        const match =
          s.outletId === selectedOutletId ||
          (selectedOutletId.includes('aeon-sentul') && s.outletId.includes('aeon-sentul')) ||
          (selectedOutletId.includes('margo-city') && s.outletId.includes('margo-city')) ||
          (selectedOutletId.includes('pesona-square') && s.outletId.includes('pesona-square'));

        if (!match) return false;
        return s.date.startsWith(monthKey);
      })
      .forEach((rec) => {
        rec.shows.forEach((sh) => {
          sumCinema += sh.omsetCinema || 0;
          sumFnB += sh.omsetFnB || 0;
        });
      });

    const foundBopo = bopoRecords.find(
      (r) => r.outletId === selectedOutletId && r.month === monthKey
    );

    // Only use actual daily sales or saved bopo record, otherwise 0
    const omsetCinema = sumCinema > 0 ? sumCinema : (foundBopo?.pendapatanTiket || 0);
    const omsetFnb = sumFnB > 0 ? sumFnB : (foundBopo?.pendapatanFnb || 0);

    const staffCostCinema = omsetCinema > 0 ? (gajiCinema / omsetCinema) * 100 : 0;
    const staffCostFnb = omsetFnb > 0 ? (gajiFnb / omsetFnb) * 100 : 0;

    const prodCinema = gajiCinema > 0 ? omsetCinema / gajiCinema : 0;
    const prodFnb = gajiFnb > 0 ? omsetFnb / gajiFnb : 0;

    return {
      monthName: m.name,
      monthKey,
      omsetCinema,
      omsetFnb,
      staffCostCinema,
      staffCostFnb,
      prodCinema,
      prodFnb,
    };
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-purple-700 text-xs font-bold uppercase tracking-widest mb-1">
            <Calculator className="w-4 h-4" />
            <span>Accounting Management &bull; Cinema XXI</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            Laporan Analisis BOPO (Bulanan)
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">
            Analisis Staff Cost & Produktivitas Karyawan per Divisi (Tahun 2026)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.print()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-500 uppercase flex items-center">
            <Filter className="w-3 h-3 text-purple-600 mr-1" /> Wilayah (Area)
          </label>
          <select
            value={selectedAreaId}
            onChange={(e) => setSelectedAreaId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="all">Semua Area Wilayah</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-500 uppercase flex items-center">
            <Building2 className="w-3 h-3 text-purple-600 mr-1" /> Outlet Bioskop
          </label>
          <select
            value={selectedOutletId}
            onChange={(e) => setSelectedOutletId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            {filteredOutlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employee & UMR Info Card */}
      <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200 grid grid-cols-1 md:grid-cols-4 gap-4 text-purple-900">
        <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-purple-100 shadow-xs">
          <Users className="w-8 h-8 text-purple-600 shrink-0" />
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">Karyawan Div. Cinema</div>
            <div className="text-base font-black text-slate-900">{countCinema} Orang</div>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-purple-100 shadow-xs">
          <Users className="w-8 h-8 text-purple-600 shrink-0" />
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">Karyawan Div. F&B</div>
            <div className="text-base font-black text-slate-900">{countFnb} Orang</div>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-purple-100 shadow-xs">
          <DollarSign className="w-8 h-8 text-emerald-600 shrink-0" />
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">UMR Acuan Outlet</div>
            <div className="text-sm font-black text-slate-900">Rp {outletUmr.toLocaleString('id-ID')}</div>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-purple-100 shadow-xs">
          <Calculator className="w-8 h-8 text-indigo-600 shrink-0" />
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">Total Biaya Gaji / Bln</div>
            <div className="text-sm font-black text-emerald-600">Rp {(gajiCinema + gajiFnb).toLocaleString('id-ID')}</div>
          </div>
        </div>
      </div>

      {/* LEMBAR ANALISIS BOPO TABLE CARD (12 MONTHS) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="font-black text-slate-900 text-base">LEMBAR ANALISIS BOPO (TAHUN 2026)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Outlet: <span className="font-bold text-purple-700">{currentOutletObj?.name || selectedOutletId}</span> (Menampilkan data per bulan otomatis)
            </p>
          </div>
        </div>

        <div className="p-6 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
                <th rowSpan={2} className="border border-slate-300 px-4 py-3 text-center align-middle w-36">
                  Bulan
                </th>
                <th colSpan={2} className="border border-slate-300 px-4 py-2 text-center">
                  Staff Cost
                </th>
                <th colSpan={2} className="border border-slate-300 px-4 py-2 text-center">
                  Productivity
                </th>
              </tr>
              <tr className="bg-slate-50 text-slate-600 text-xs font-bold">
                <th className="border border-slate-300 px-4 py-2 text-center">Cinema</th>
                <th className="border border-slate-300 px-4 py-2 text-center">F&B</th>
                <th className="border border-slate-300 px-4 py-2 text-center">Cinema</th>
                <th className="border border-slate-300 px-4 py-2 text-center">F&B</th>
              </tr>
            </thead>
            <tbody className="text-sm font-semibold text-slate-800">
              {monthlyData.map((row) => (
                <tr key={row.monthKey} className="hover:bg-slate-50 transition">
                  <td className="border border-slate-300 px-4 py-3 font-bold text-slate-900">
                    {row.monthName} 2026
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-center text-slate-700 font-bold">
                    {row.staffCostCinema.toFixed(2)}%
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-center text-slate-700 font-bold">
                    {row.staffCostFnb.toFixed(2)}%
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-center text-purple-700 font-bold">
                    {row.prodCinema.toFixed(2)}
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-center text-purple-700 font-bold">
                    {row.prodFnb.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Petunjuk Analisis BOPO Footer Box */}
      <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 text-amber-900 space-y-2">
        <div className="flex items-center space-x-2 font-black text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Petunjuk Analisis BOPO:</span>
        </div>
        <ol className="list-decimal list-inside text-xs space-y-1.5 pl-2 font-medium text-amber-900/90">
          <li>
            <strong>Staff Cost (Cinema / F&B):</strong> (Total Gaji Divisi / Omset Divisi) &times; 100%. Gaji dihitung otomatis dari jumlah karyawan &times; UMR outlet.
          </li>
          <li>
            <strong>Productivity (Cinema / F&B):</strong> Omset Divisi / Total Gaji Divisi (Rasio).
          </li>
          <li>
            <strong>Kasus Gabungan (Cafe + HS / Premiere):</strong> Omset dan jumlah karyawan digabungkan secara otomatis sesuai wilayah penugasan outlet.
          </li>
        </ol>
      </div>
    </div>
  );
};
