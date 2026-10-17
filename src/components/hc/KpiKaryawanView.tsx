import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { User, Outlet, Employee, EmployeeKpiRecord } from '../../types';
import { StorageService } from '../../lib/storage';
import { exportToPrettyExcel } from '../../lib/excelExport';
import { INITIAL_AREAS, INITIAL_OUTLETS } from '../../lib/constants';
import {
  Award,
  Filter,
  Users,
  Calendar,
  CheckCircle2,
  Star,
  TrendingUp,
  FileSpreadsheet,
  Save,
} from 'lucide-react';

interface KpiKaryawanViewProps {
  currentUser: User | null;
  selectedDate: string;
}

export const KpiKaryawanView: React.FC<KpiKaryawanViewProps> = ({ currentUser, selectedDate }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    selectedDate ? selectedDate.substring(0, 7) : '2026-10'
  );
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [selectedOutletId, setSelectedOutletId] = useState<string>('all');

  const employees = StorageService.getEmployees();
  const outlets = StorageService.getOutlets();
  const areas = INITIAL_AREAS;

  const [kpiRecords, setKpiRecords] = useState<EmployeeKpiRecord[]>(() => StorageService.getEmployeeKpis());
  const [successMsg, setSuccessMsg] = useState('');

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const isManagerOrCleaner = (currentUser?.role === 'manager' || currentUser?.role === 'cleaner') && currentUser?.outletId;

  const filteredOutlets = outlets.filter((o) => {
    if (isManagerOrCleaner) return o.id === currentUser.outletId;
    if (selectedAreaId !== 'all' && o.areaId !== selectedAreaId) return false;
    return true;
  });

  const filteredEmployees = employees.filter((emp) => {
    if (isManagerOrCleaner && emp.outletId !== currentUser.outletId) {
      return false;
    }
    if (selectedAreaId !== 'all') {
      const outletObj = outlets.find((o) => o.id === emp.outletId);
      if (outletObj?.areaId !== selectedAreaId) return false;
    }
    if (selectedOutletId !== 'all' && emp.outletId !== selectedOutletId) return false;
    return true;
  });

  const handleScoreChange = (employeeId: string, newScore: number) => {
    const score = Math.max(0, Math.min(100, newScore));
    const existing = kpiRecords.find(
      (k) => k.employeeId === employeeId && k.month === selectedMonth
    );

    let updatedList: EmployeeKpiRecord[];
    if (existing) {
      updatedList = kpiRecords.map((k) =>
        k.id === existing.id ? { ...k, score, gradedBy: currentUser?.name || 'Admin' } : k
      );
    } else {
      const newRec: EmployeeKpiRecord = {
        id: `kpi_${employeeId}_${selectedMonth}`,
        employeeId,
        month: selectedMonth,
        score,
        notes: 'Penilaian Kinerja Bulanan',
        gradedBy: currentUser?.name || 'Admin',
      };
      updatedList = [...kpiRecords, newRec];
    }

    setKpiRecords(updatedList);
    StorageService.saveEmployeeKpis(updatedList);
    showToast(`Nilai KPI berhasil diperbarui!`);
  };

  const handleExportXls = () => {
    const dataToExport = filteredEmployees.map((emp, index) => {
      const outletObj = outlets.find((o) => o.id === emp.outletId);
      const score = getScoreForEmployee(emp.id);
      const grade = getGrade(score);

      return {
        'No': index + 1,
        'NIK': emp.nik,
        'Nama Karyawan': emp.name,
        'Jabatan': emp.jabatan,
        'Divisi': emp.divisi,
        'Outlet': outletObj?.name || emp.outletId,
        'Nilai KPI (0-100)': score,
        'Predikat Grade': grade.grade,
        'Periode Penilaian': selectedMonth,
      };
    });

    const areaName = selectedAreaId === 'all' ? 'Semua Wilayah' : (areas.find((a) => a.id === selectedAreaId)?.name || 'Area');
    const outletName = selectedOutletId === 'all' ? 'Semua Outlet' : (outlets.find((o) => o.id === selectedOutletId)?.name || 'Outlet');

    exportToPrettyExcel({
      title: 'CINEMA XXI - LEMBAR EVALUASI KPI KARYAWAN',
      subtitle: `Periode Evaluasi: ${selectedMonth} | Wilayah: ${areaName} | Outlet: ${outletName}`,
      metaInfo: `Total Karyawan Dievaluasi: ${dataToExport.length} Orang`,
      sheetName: 'Nilai KPI Karyawan',
      filename: `Nilai_KPI_Karyawan_${selectedMonth}.xlsx`,
      data: dataToExport,
      columnWidths: {
        'No': 6,
        'NIK': 18,
        'Nama Karyawan': 30,
        'Jabatan': 26,
        'Divisi': 15,
        'Outlet': 28,
        'Nilai KPI (0-100)': 18,
        'Predikat Grade': 20,
        'Periode Penilaian': 18,
      },
    });

    showToast(`Berhasil mengunduh Excel Nilai KPI (${dataToExport.length} karyawan)`);
  };

  const getScoreForEmployee = (employeeId: string) => {
    const found = kpiRecords.find(
      (k) => k.employeeId === employeeId && k.month === selectedMonth
    );
    return found ? found.score : 85; // Default score 85
  };

  const getGrade = (score: number) => {
    if (score >= 90) return { grade: 'A (Sangat Baik)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (score >= 80) return { grade: 'B (Baik)', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (score >= 70) return { grade: 'C (Cukup)', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { grade: 'D (Kurang)', color: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  const avgScore =
    filteredEmployees.length > 0
      ? filteredEmployees.reduce((acc, emp) => acc + getScoreForEmployee(emp.id), 0) /
        filteredEmployees.length
      : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#4A1D6A] via-[#5E2B97] to-[#3D1A5E] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#FFD700] text-xs font-bold uppercase tracking-widest mb-1">
            <Award className="w-4 h-4" />
            <span>HC Area &bull; Penilaian Kinerja</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            KPI Karyawan per Outlet
          </h1>
          <p className="text-purple-200 text-sm mt-1">
            Evaluasi Key Performance Indicator (KPI) bulanan staff operasional bioskop dan F&B.
          </p>
        </div>
        <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20">
          <Calendar className="w-5 h-5 text-[#FFD700]" />
          <div>
            <div className="text-[10px] text-purple-200 uppercase font-semibold">Periode Penilaian</div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white font-bold text-sm focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200 text-xs font-bold flex items-center space-x-2 shadow-sm animate-pulse">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Total Dinilai</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{filteredEmployees.length} Karyawan</div>
            <div className="text-xs text-purple-600 font-semibold mt-1">Periode {selectedMonth}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Rata-rata Nilai KPI</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{avgScore.toFixed(1)} / 100</div>
            <div className="text-xs text-emerald-700 font-semibold mt-1 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-1" /> Kinerja Sangat Baik
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Standar Kelulusan</div>
            <div className="text-2xl font-black text-slate-900 mt-1">&ge; 80.0</div>
            <div className="text-xs text-amber-600 font-semibold mt-1">Grade Min: B</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Star className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
          <Filter className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-bold text-slate-700">Wilayah:</span>
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

        <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
          <Users className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-bold text-slate-700">Outlet:</span>
          <select
            value={selectedOutletId}
            onChange={(e) => setSelectedOutletId(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="all">Semua Outlet</option>
            {filteredOutlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-purple-700" />
            <h2 className="font-black text-slate-900 text-sm md:text-base">
              Lembar Penilaian KPI &bull; Periode {selectedMonth}
            </h2>
          </div>
          <button
            onClick={handleExportXls}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-sm transition cursor-pointer shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download XLS Nilai KPI</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">
                <th className="border border-slate-300 px-3 py-2.5 text-center">No</th>
                <th className="border border-slate-300 px-3 py-2.5">NIK</th>
                <th className="border border-slate-300 px-3 py-2.5">Nama Karyawan</th>
                <th className="border border-slate-300 px-3 py-2.5">Jabatan & Divisi</th>
                <th className="border border-slate-300 px-3 py-2.5">Outlet</th>
                <th className="border border-slate-300 px-3 py-2.5 text-center w-36">Nilai KPI (0-100)</th>
                <th className="border border-slate-300 px-3 py-2.5 text-center">Predikat Grade</th>
                <th className="border border-slate-300 px-3 py-2.5 text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="text-xs font-medium text-slate-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 font-semibold">
                    Tidak ada data karyawan untuk dinilai pada filter ini.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, idx) => {
                  const score = getScoreForEmployee(emp.id);
                  const outletObj = outlets.find((o) => o.id === emp.outletId);
                  const gradeInfo = getGrade(score);
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition">
                      <td className="border border-slate-300 px-3 py-2.5 text-center font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 font-bold text-slate-900">{emp.nik}</td>
                      <td className="border border-slate-300 px-3 py-2.5 font-bold text-purple-900">{emp.name}</td>
                      <td className="border border-slate-300 px-3 py-2.5">
                        <div className="font-bold text-slate-800">{emp.jabatan}</div>
                        <div className="text-[10px] text-purple-600 font-semibold">{emp.divisi}</div>
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 font-semibold text-slate-700">
                        {outletObj?.name || emp.outletId}
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={score}
                          onChange={(e) => handleScoreChange(emp.id, Number(e.target.value))}
                          className="w-20 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-center text-sm font-black text-purple-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-center">
                        <span className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${gradeInfo.color}`}>
                          {gradeInfo.grade}
                        </span>
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-center">
                        <button
                          onClick={() => showToast(`Nilai KPI ${emp.name} (${score}) tersimpan!`)}
                          className="bg-purple-900 hover:bg-purple-800 text-white px-3 py-1.5 rounded-lg font-bold text-[11px] shadow-sm transition cursor-pointer inline-flex items-center space-x-1"
                        >
                          <Save className="w-3 h-3" />
                          <span>Simpan</span>
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
