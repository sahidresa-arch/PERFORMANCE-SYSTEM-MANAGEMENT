import React, { useState } from 'react';
import { User, Area, Outlet } from '../../types';
import { StorageService } from '../../lib/storage';
import { PieChart } from 'lucide-react';

interface SalesComparisonProps {
  currentUser: User | null;
  selectedDate: string;
}

export const SalesComparison: React.FC<SalesComparisonProps> = ({
  currentUser,
  selectedDate,
}) => {
  const areas = StorageService.getAreas();
  const outlets = StorageService.getOutlets();
  const dailySales = StorageService.getDailySales();

  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [metricSort, setMetricSort] = useState<'achievement' | 'fnb' | 'penonton' | 'head'>('achievement');

  const filteredOutlets = outlets.filter((o) => (selectedAreaId ? o.areaId === selectedAreaId : true));

  const comparisonData = filteredOutlets.map((outlet) => {
    const saleRecord = dailySales.find(
      (s) => s.outletId === outlet.id && s.date === selectedDate
    );
    const shows = saleRecord?.shows || [];
    const sumCinema = shows.reduce((acc, s) => acc + (s.omsetCinema || 0), 0);
    const sumFnB = shows.reduce((acc, s) => acc + (s.omsetFnB || 0), 0);
    const sumBill = shows.reduce((acc, s) => acc + (s.bill || 0), 0);
    const sumPenonton = shows.reduce((acc, s) => acc + (s.penonton || 0), 0);

    const metrics = StorageService.calculateMetrics(
      sumCinema,
      sumFnB,
      sumBill,
      sumPenonton,
      outlet.targetHead
    );

    return {
      outlet,
      metrics,
      sumCinema,
      sumFnB,
      sumBill,
      sumPenonton,
    };
  });

  const sortedData = [...comparisonData].sort((a, b) => {
    if (metricSort === 'achievement') return b.metrics.achievement - a.metrics.achievement;
    if (metricSort === 'fnb') return b.sumFnB - a.sumFnB;
    if (metricSort === 'penonton') return b.sumPenonton - a.sumPenonton;
    if (metricSort === 'head') return b.metrics.head - a.metrics.head;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-300">
              <PieChart className="w-5 h-5 text-amber-700" />
            </span>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
              Perbandingan Sales Antar Outlet
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Komparasi daya serap, pencapaian target SPH, dan volume sales di Area Bogor 1 &amp; Depok serta Area Bogor 2
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedAreaId}
            onChange={(e) => setSelectedAreaId(e.target.value)}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-2xs"
          >
            <option value="">Semua Wilayah</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <select
            value={metricSort}
            onChange={(e) => setMetricSort(e.target.value as any)}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-amber-900 shadow-2xs"
          >
            <option value="achievement">Urut: % Achievement</option>
            <option value="fnb">Urut: Omset FnB</option>
            <option value="head">Urut: SPH (Head)</option>
            <option value="penonton">Urut: Penonton</option>
          </select>
        </div>
      </div>

      {/* Comparison Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedData.map((item, idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
          const isAchieved = item.metrics.achievement >= 100;

          return (
            <div
              key={item.outlet.id}
              className="p-5 rounded-3xl border border-slate-200 bg-white shadow-2xs hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">
                    {areas.find((a) => a.id === item.outlet.areaId)?.name}
                  </span>
                  <h3 className="font-extrabold text-base text-slate-900 mt-0.5 truncate max-w-[200px]">
                    {item.outlet.name}
                  </h3>
                </div>
                <span className="text-xl font-bold">{medal}</span>
              </div>

              {/* Achievement Pill */}
              <div className="my-3 flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500">Pencapaian Target:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-black text-xs ${
                    isAchieved
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {item.metrics.achievement}%
                </span>
              </div>

              {/* Metrics Breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">SPH (Head):</span>
                  <span className="font-black text-cyan-800">
                    Rp {item.metrics.head.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Target SPH:</span>
                  <span className="font-semibold text-slate-700">
                    Rp {item.outlet.targetHead.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Omset FnB:</span>
                  <span className="font-bold text-emerald-800">
                    Rp {item.sumFnB.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Daya Serap (%):</span>
                  <span className="font-bold text-amber-800">{item.metrics.dayaSerap}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Avg Transaksi (AT):</span>
                  <span className="font-bold text-purple-800">
                    Rp {item.metrics.at.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
