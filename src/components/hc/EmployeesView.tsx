import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { User, Outlet, Employee } from '../../types';
import { StorageService } from '../../lib/storage';
import { syncEmployeesToSupabase, mergeRemoteEmployeesToLocal } from '../../lib/supabase';
import { exportToPrettyExcel } from '../../lib/excelExport';
import { INITIAL_AREAS } from '../../lib/constants';
import {
  Users,
  Filter,
  Plus,
  Search,
  UserCheck,
  Calendar,
  Phone,
  Edit2,
  Trash2,
  Save,
  X,
  AlertTriangle,
  Award,
  CheckCircle2,
  ArrowRightLeft,
  UserX,
  Clock,
  Building2,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';

export const JABATAN_OPTIONS = [
  'Regional Manager',
  'Cinema Area Manager',
  'Cinema Manager',
  'Cinema Assistant Manager',
  'Cinema Supervisor',
  'Technical Team Lead',
  'Technical',
  'Guide',
  'Cafe Commis',
  'Cafe Mixologist',
  'Cafe Cashier',
  'Premiere Waiters',
  'Premiere Barista',
  'Premiere Chef De Partie',
  'Premiere Commis',
  'Premiere Cook Helper',
  'Hello Sunday Waiters',
  'Hello Sunday Cook Helper',
  'Hello Sunday Barista',
  'Customer Relation',
];

interface EmployeesViewProps {
  currentUser: User | null;
  selectedDate: string;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({ currentUser, selectedDate }) => {
  const [employees, setEmployees] = useState<Employee[]>(() => StorageService.getEmployees());
  const [outlets] = useState<Outlet[]>(() => StorageService.getOutlets());
  const areas = INITIAL_AREAS;

  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [selectedOutletId, setSelectedOutletId] = useState<string>('all');
  const [selectedDivisi, setSelectedDivisi] = useState<string>('all');
  const [selectedSisaKontrak, setSelectedSisaKontrak] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Delete Modal State
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);

  // Mutasi Modal State
  const [isMutasiModalOpen, setIsMutasiModalOpen] = useState(false);
  const [mutasiEmployee, setMutasiEmployee] = useState<Employee | null>(null);
  const [mutasiTargetOutletId, setMutasiTargetOutletId] = useState<string>('');
  const [mutasiDate, setMutasiDate] = useState<string>(selectedDate ? selectedDate.substring(0, 10) : new Date().toISOString().substring(0, 10));
  const [mutasiNotes, setMutasiNotes] = useState<string>('');

  // Terminate Modal State
  const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
  const [terminateEmployee, setTerminateEmployee] = useState<Employee | null>(null);
  const [terminateCategory, setTerminateCategory] = useState<string>('Resign (Mengundurkan Diri)');
  const [terminateDate, setTerminateDate] = useState<string>(selectedDate ? selectedDate.substring(0, 10) : new Date().toISOString().substring(0, 10));
  const [terminateNotes, setTerminateNotes] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState<Partial<Employee>>({
    nik: 'XXI-' + Math.floor(100000 + Math.random() * 900000),
    name: '',
    jabatan: 'Cinema Manager',
    divisi: 'Cinema',
    outletId: outlets[0]?.id || 'the-park-sawangan-xxi',
    gender: 'L',
    tanggalLahir: '',
    statusKerja: 'Kontrak',
    tanggalKontrak: selectedDate ? selectedDate.substring(0, 10) : '2026-01-01',
    habisKontrak: '2026-12-31',
    phone: '-',
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  // Sinkronisasi Real-Time antar AI Studio & Web Live
  useEffect(() => {
    const handleStorageUpdate = (e: any) => {
      const type = e?.detail?.type;
      if (!type || type === 'employees' || type === 'all-reset') {
        setEmployees(StorageService.getEmployees());
      }
    };
    window.addEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    // Tarik & gabungkan data dari Supabase Cloud saat halaman dibuka
    mergeRemoteEmployeesToLocal().then((updated) => {
      if (updated) {
        setEmployees(StorageService.getEmployees());
      }
    });

    return () => {
      window.removeEventListener('cinema-xxi-storage-update', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const handleManualCloudSync = async () => {
    setIsSyncingCloud(true);
    try {
      const currentLocal = StorageService.getEmployees();
      // Tandai semua data lokal saat ini dengan timestamp terbaru agar menjadi acuan di Cloud / Web Live
      const nowIso = new Date().toISOString();
      const stamped = currentLocal.map((emp) => ({
        ...emp,
        ...({ updatedAt: (emp as any).updatedAt || nowIso } as any),
      }));
      localStorage.setItem('cinema_xxi_employees', JSON.stringify(stamped));
      localStorage.setItem('cinema_xxi_employees_modified', 'true');

      const pushed = await syncEmployeesToSupabase(stamped);
      await mergeRemoteEmployeesToLocal();
      const refreshed = StorageService.getEmployees();
      setEmployees(refreshed);

      if (pushed) {
        showToast(
          `Sinkronisasi Cloud Berhasil! ${refreshed.length} Data Karyawan kini seragam di AI Studio & Web Live.`
        );
      } else {
        showToast(`Data Karyawan tersimpan di memori lokal (${refreshed.length} orang).`);
      }
    } catch {
      showToast('Gagal melakukan sinkronisasi ke Cloud Database.');
    } finally {
      setIsSyncingCloud(false);
    }
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
    if (selectedDivisi !== 'all' && emp.divisi !== selectedDivisi) return false;

    // Filter Sisa Kontrak < 3 Bulan
    if (selectedSisaKontrak === 'under3months') {
      if (
        emp.statusKerja === 'Tetap' ||
        emp.statusKerja === 'Terminate' ||
        emp.statusKerja === 'Resign' ||
        emp.habisKontrak === '-' ||
        emp.habisKontrak.includes('Tetap')
      ) {
        return false;
      }
      const today = new Date();
      const end = new Date(emp.habisKontrak);
      if (isNaN(end.getTime())) return false;
      const diffTime = end.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 90) return false; // More than 3 months
    } else if (selectedSisaKontrak === 'expired') {
      if (
        emp.statusKerja === 'Tetap' ||
        emp.statusKerja === 'Terminate' ||
        emp.statusKerja === 'Resign' ||
        emp.habisKontrak === '-' ||
        emp.habisKontrak.includes('Tetap')
      ) {
        return false;
      }
      const today = new Date();
      const end = new Date(emp.habisKontrak);
      if (isNaN(end.getTime())) return false;
      const diffTime = end.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) return false; // Not expired
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.nik.toLowerCase().includes(q) ||
        emp.jabatan.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFormData({
      nik: 'XXI-' + Math.floor(100000 + Math.random() * 900000),
      name: '',
      jabatan: 'Cinema Manager',
      divisi: 'Cinema',
      outletId: currentUser?.outletId || outlets[0]?.id || 'the-park-sawangan-xxi',
      gender: 'L',
      tanggalLahir: '',
      statusKerja: 'Kontrak',
      tanggalKontrak: selectedDate ? selectedDate.substring(0, 10) : '2026-01-01',
      habisKontrak: '2026-12-31',
      phone: '-',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      ...emp,
      tanggalLahir: emp.tanggalLahir && emp.tanggalLahir !== '-' ? emp.tanggalLahir : '',
      habisKontrak: emp.statusKerja === 'Tetap' ? '-' : emp.habisKontrak,
    });
    setIsModalOpen(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.nik) return;

    const cleanNik = formData.nik.trim();
    const existingByNik = employees.find((emp) => emp.nik?.trim() === cleanNik);
    const targetId = editingEmployee?.id || existingByNik?.id || `emp_${Date.now()}`;

    const isPermanent = formData.statusKerja === 'Tetap';

    const record: Employee = {
      id: targetId,
      nik: cleanNik,
      name: formData.name.trim(),
      jabatan: formData.jabatan || 'Cinema Manager',
      divisi: (formData.divisi as any) || 'Cinema',
      outletId: formData.outletId || outlets[0]?.id || 'the-park-sawangan-xxi',
      gender: (formData.gender as any) || 'L',
      tanggalLahir: formData.tanggalLahir?.trim() ? formData.tanggalLahir.trim() : '-',
      statusKerja: (formData.statusKerja as any) || 'Kontrak',
      tanggalKontrak: formData.tanggalKontrak || '2026-01-01',
      habisKontrak: isPermanent ? '-' : formData.habisKontrak || '-',
      phone: formData.phone || '-',
      photoUrl: formData.photoUrl,
    };

    const updated = StorageService.saveEmployee(record);
    setEmployees(updated);
    setIsModalOpen(false);
    setEditingEmployee(null);
    showToast(`Data karyawan ${record.name} berhasil disimpan!`);
  };

  const handleConfirmDelete = () => {
    if (!deletingEmployee) return;
    const name = deletingEmployee.name;
    const updated = StorageService.deleteEmployee(deletingEmployee.id);
    setEmployees(updated);
    setDeletingEmployee(null);
    showToast(`Karyawan ${name} berhasil dihapus dari sistem.`);
  };

  // Mutasi Workflow
  const handleOpenMutasi = (emp: Employee) => {
    setMutasiEmployee(emp);
    const availableTargets = outlets.filter((o) => o.id !== emp.outletId);
    setMutasiTargetOutletId(availableTargets[0]?.id || emp.outletId);
    setMutasiDate(selectedDate ? selectedDate.substring(0, 10) : new Date().toISOString().substring(0, 10));
    setMutasiNotes('');
    setIsMutasiModalOpen(true);
  };

  const handleProcessMutasi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mutasiEmployee || !mutasiTargetOutletId) return;

    const targetOutletObj = outlets.find((o) => o.id === mutasiTargetOutletId);
    const updatedRecord: Employee = {
      ...mutasiEmployee,
      outletId: mutasiTargetOutletId,
    };

    const updatedList = StorageService.saveEmployee(updatedRecord);
    setEmployees(updatedList);
    setIsMutasiModalOpen(false);
    showToast(
      `Mutasi Berhasil: Karyawan ${mutasiEmployee.name} dimutasi ke outlet ${targetOutletObj?.name || mutasiTargetOutletId} efektif per ${mutasiDate}.`
    );
  };

  // Terminate Workflow
  const handleOpenTerminate = (emp: Employee) => {
    setTerminateEmployee(emp);
    setTerminateCategory('Resign (Mengundurkan Diri)');
    setTerminateDate(selectedDate ? selectedDate.substring(0, 10) : new Date().toISOString().substring(0, 10));
    setTerminateNotes('');
    setIsTerminateModalOpen(true);
  };

  const handleProcessTerminate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminateEmployee) return;

    const updatedRecord: Employee = {
      ...terminateEmployee,
      statusKerja: 'Terminate',
      habisKontrak: terminateDate,
    };

    const updatedList = StorageService.saveEmployee(updatedRecord);
    setEmployees(updatedList);
    setIsTerminateModalOpen(false);
    showToast(
      `Termination Berhasil: Status ${terminateEmployee.name} diubah menjadi Terminate (${terminateCategory}) efektif per ${terminateDate}.`
    );
  };

  const calculateSisaKontrak = (emp: Employee) => {
    if (emp.statusKerja === 'Tetap' || emp.habisKontrak === '-' || emp.habisKontrak.includes('Tetap')) {
      return { text: '-', urgent: false };
    }
    if (emp.statusKerja === 'Terminate' || emp.statusKerja === 'Resign') {
      return { text: 'Non-Aktif', urgent: false };
    }

    const today = new Date();
    const end = new Date(emp.habisKontrak);
    if (isNaN(end.getTime())) return { text: '-', urgent: false };

    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: 'Habis Masa Kontrak', urgent: true };
    if (diffDays <= 30) return { text: `${diffDays} Hari lagi`, urgent: true };
    if (diffDays <= 90) return { text: `${Math.floor(diffDays / 30)} Bulan (${diffDays} Hari)`, urgent: true };
    
    const months = Math.floor(diffDays / 30);
    return { text: `${months} Bulan (${diffDays} Hari)`, urgent: false };
  };

  // Count metrics for quick filter badges
  const under3MonthsCount = employees.filter((e) => {
    if (
      e.statusKerja === 'Tetap' ||
      e.statusKerja === 'Terminate' ||
      e.statusKerja === 'Resign' ||
      e.habisKontrak === '-' ||
      e.habisKontrak.includes('Tetap')
    ) {
      return false;
    }
    const today = new Date();
    const end = new Date(e.habisKontrak);
    if (isNaN(end.getTime())) return false;
    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 90;
  }).length;

  const handleExportXls = () => {
    const dataToExport = filteredEmployees.map((emp, index) => {
      const outletObj = outlets.find((o) => o.id === emp.outletId);
      const areaObj = areas.find((a) => a.id === outletObj?.areaId);
      const isPermanent = emp.statusKerja === 'Tetap';
      const sisa = calculateSisaKontrak(emp);
      const displayHabisKontrak = isPermanent ? '-' : emp.habisKontrak || '-';

      return {
        'No': index + 1,
        'NIK': emp.nik || '-',
        'Nama Karyawan': emp.name,
        'Jabatan': emp.jabatan,
        'Divisi': emp.divisi,
        'Outlet': outletObj?.name || emp.outletId,
        'Wilayah (Area)': areaObj?.name || '-',
        'Gender': emp.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)',
        'Tanggal Lahir': emp.tanggalLahir && emp.tanggalLahir !== '-' ? emp.tanggalLahir : '-',
        'Status Kerja': emp.statusKerja,
        'Tanggal Mulai Kontrak': emp.tanggalKontrak || '-',
        'Habis Kontrak': displayHabisKontrak,
        'Sisa Kontrak / Status': sisa.text,
        'No. Telepon': emp.phone || '-',
      };
    });

    const areaName = selectedAreaId === 'all' ? 'Semua Wilayah' : (areas.find((a) => a.id === selectedAreaId)?.name || 'Area');
    const outletName = selectedOutletId === 'all' ? 'Semua Outlet' : (outlets.find((o) => o.id === selectedOutletId)?.name || 'Outlet');
    const divisiName = selectedDivisi === 'all' ? 'Semua Divisi' : selectedDivisi;
    const sisaKontrakName = selectedSisaKontrak === 'all' ? 'Semua Status Kontrak' : selectedSisaKontrak === 'under3months' ? 'Sisa Kontrak < 3 Bulan' : 'Habis Masa Kontrak';

    const areaLabel = areaName.replace(/[^a-zA-Z0-9]/g, '_');
    const outletLabel = outletName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Data_Karyawan_XXI_${areaLabel}_${outletLabel}_${new Date().toISOString().substring(0, 10)}.xlsx`;

    exportToPrettyExcel({
      title: 'CINEMA XXI - DATABASE DATA KARYAWAN OPERASIONAL',
      subtitle: `Wilayah: ${areaName} | Outlet: ${outletName} | Divisi: ${divisiName}`,
      metaInfo: `Filter Sisa Kontrak: ${sisaKontrakName} | Total Karyawan: ${dataToExport.length} Orang`,
      sheetName: 'Data Karyawan',
      filename,
      data: dataToExport,
      columnWidths: {
        'No': 6,
        'NIK': 18,
        'Nama Karyawan': 30,
        'Jabatan': 26,
        'Divisi': 15,
        'Outlet': 28,
        'Wilayah (Area)': 22,
        'Gender': 18,
        'Tanggal Lahir': 18,
        'Status Kerja': 16,
        'Tanggal Mulai Kontrak': 20,
        'Habis Kontrak': 20,
        'Sisa Kontrak / Status': 25,
        'No. Telepon': 18,
      },
    });

    showToast(`Berhasil mengunduh Excel Data Karyawan (${dataToExport.length} orang)`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#4A1D6A] via-[#5E2B97] to-[#3D1A5E] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#FFD700] text-xs font-bold uppercase tracking-widest mb-1">
            <Users className="w-4 h-4" />
            <span>HC Area &bull; Human Capital Management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Data Karyawan Cinema XXI
          </h1>
          <p className="text-purple-200 text-sm mt-1">
            Pusat database kepegawaian, pengelolaan kontrak kerja, mutasi antar outlet, dan workflow termination.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleManualCloudSync}
            disabled={isSyncingCloud}
            title="Push & Sinkronkan Data Karyawan antara AI Studio dan Web Live"
            className="bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-white px-4 py-3 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-lg transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin' : ''}`} />
            <span>{isSyncingCloud ? 'Menyinkronkan...' : 'Sinkronkan Cloud (Web Live)'}</span>
          </button>
          <button
            onClick={handleExportXls}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-lg transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download XLS Data Karyawan</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="bg-[#FACC15] hover:bg-yellow-400 text-slate-900 px-4 py-3 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-lg transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Karyawan Baru</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200 text-xs font-bold flex items-center space-x-2 shadow-sm animate-pulse">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-center">
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-500 uppercase flex items-center">
            <Filter className="w-3 h-3 text-purple-600 mr-1" /> Wilayah (Area)
          </label>
          <select
            value={selectedAreaId}
            onChange={(e) => setSelectedAreaId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="all">Semua Area</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-500 uppercase flex items-center">
            <Building2 className="w-3 h-3 text-purple-600 mr-1" /> Outlet
          </label>
          <select
            value={selectedOutletId}
            onChange={(e) => setSelectedOutletId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="all">Semua Outlet</option>
            {filteredOutlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-500 uppercase flex items-center">
            <Award className="w-3 h-3 text-purple-600 mr-1" /> Divisi
          </label>
          <select
            value={selectedDivisi}
            onChange={(e) => setSelectedDivisi(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="all">Semua Divisi</option>
            <option value="Cinema">Cinema</option>
            <option value="F&B">F&B</option>
            <option value="Kasir">Kasir</option>
            <option value="Teknisi">Teknisi</option>
            <option value="Cleaning">Cleaning</option>
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
          </select>
        </div>

        {/* Filter Under Sisa Kontrak 3 Bulan */}
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-500 uppercase flex items-center">
            <Clock className="w-3 h-3 text-rose-600 mr-1" /> Sisa Kontrak
          </label>
          <select
            value={selectedSisaKontrak}
            onChange={(e) => setSelectedSisaKontrak(e.target.value)}
            className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer ${
              selectedSisaKontrak !== 'all'
                ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="all">Semua Status</option>
            <option value="under3months">🔥 Sisa Kontrak &lt; 3 Bulan ({under3MonthsCount})</option>
            <option value="expired">⚠️ Habis Masa Kontrak</option>
          </select>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label className="block text-[11px] font-bold text-slate-500 uppercase flex items-center">
            <Search className="w-3 h-3 text-purple-600 mr-1" /> Cari NIK / Nama / Jabatan
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Cari NIK, Nama, atau Jabatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-purple-700" />
            <h2 className="font-black text-slate-900 text-sm md:text-base">
              Daftar Karyawan Terdaftar ({filteredEmployees.length} Orang)
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {selectedSisaKontrak === 'under3months' && (
              <span className="bg-rose-100 text-rose-800 px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Memunculkan Karyawan Kontrak &lt; 3 Bulan</span>
              </span>
            )}
            <button
              onClick={handleExportXls}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download XLS</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">
                <th className="border border-slate-300 px-3 py-2.5 text-center">Foto</th>
                <th className="border border-slate-300 px-3 py-2.5">NIK</th>
                <th className="border border-slate-300 px-3 py-2.5">Nama Karyawan</th>
                <th className="border border-slate-300 px-3 py-2.5">Jabatan</th>
                <th className="border border-slate-300 px-3 py-2.5">Divisi</th>
                <th className="border border-slate-300 px-3 py-2.5">Outlet</th>
                <th className="border border-slate-300 px-3 py-2.5 text-center">Gender</th>
                <th className="border border-slate-300 px-3 py-2.5 text-center">Tanggal Lahir</th>
                <th className="border border-slate-300 px-3 py-2.5 text-center">Status Kerja</th>
                <th className="border border-slate-300 px-3 py-2.5">Tanggal Mulai</th>
                <th className="border border-slate-300 px-3 py-2.5">Habis Kontrak</th>
                <th className="border border-slate-300 px-3 py-2.5">Sisa Kontrak</th>
                <th className="border border-slate-300 px-3 py-2.5">No. Telp</th>
                <th className="border border-slate-300 px-3 py-2.5 text-center min-w-[140px]">Tindakan Workflow</th>
              </tr>
            </thead>
            <tbody className="text-xs font-medium text-slate-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-8 text-slate-400 font-semibold">
                    Tidak ada data karyawan yang ditemukan dengan filter tersebut.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, idx) => {
                  const outletObj = outlets.find((o) => o.id === emp.outletId);
                  const isPermanent = emp.statusKerja === 'Tetap';
                  const isTerminated = emp.statusKerja === 'Terminate' || emp.statusKerja === 'Resign';
                  const sisa = calculateSisaKontrak(emp);
                  const displayHabisKontrak = isPermanent ? '-' : emp.habisKontrak || '-';

                  return (
                    <tr key={`${emp.id}_${idx}`} className="hover:bg-slate-50 transition">
                      <td className="border border-slate-300 px-3 py-2.5 text-center">
                        <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center mx-auto overflow-hidden border border-purple-200">
                          {emp.photoUrl ? (
                            <img src={emp.photoUrl} alt={emp.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{emp.name.charAt(0)}</span>
                          )}
                        </div>
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 font-bold text-slate-900">{emp.nik}</td>
                      <td className="border border-slate-300 px-3 py-2.5 font-bold text-purple-900">{emp.name}</td>
                      <td className="border border-slate-300 px-3 py-2.5 font-medium">{emp.jabatan}</td>
                      <td className="border border-slate-300 px-3 py-2.5">
                        <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                          {emp.divisi}
                        </span>
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 font-semibold text-slate-700">
                        {outletObj?.name || emp.outletId}
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-center font-bold">
                        {emp.gender}
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-center font-medium text-slate-700 whitespace-nowrap">
                        {emp.tanggalLahir && emp.tanggalLahir !== '-' ? emp.tanggalLahir : '-'}
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            isPermanent
                              ? 'bg-emerald-100 text-emerald-800'
                              : isTerminated
                              ? 'bg-rose-100 text-rose-800'
                              : emp.statusKerja === 'Kontrak'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {emp.statusKerja}
                        </span>
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5">{emp.tanggalKontrak}</td>
                      <td className="border border-slate-300 px-3 py-2.5 font-medium text-slate-700">
                        {displayHabisKontrak}
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 font-bold">
                        <span
                          className={`flex items-center space-x-1 ${
                            sisa.urgent ? 'text-rose-600 animate-pulse' : 'text-slate-700'
                          }`}
                        >
                          {sisa.urgent && <AlertTriangle className="w-3.5 h-3.5 shrink-0 mr-1" />}
                          <span>{sisa.text}</span>
                        </span>
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{emp.phone}</span>
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            title="Edit Data Karyawan"
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Mutasi Button */}
                          <button
                            onClick={() => handleOpenMutasi(emp)}
                            title="Mutasi Karyawan ke Outlet/Area Lain"
                            className="p-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition cursor-pointer flex items-center space-x-1"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>

                          {/* Terminate Button */}
                          {!isTerminated && (
                            <button
                              onClick={() => handleOpenTerminate(emp)}
                              title="Terminate / Non-Aktifkan Karyawan"
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer flex items-center space-x-1"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeletingEmployee(emp)}
                            title="Hapus Karyawan"
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Modal Confirmation Hapus Karyawan */}
      {deletingEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-600 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Konfirmasi Hapus Data</h3>
                <p className="text-xs text-slate-500 font-medium">Penghapusan karyawan dari database</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed mb-6 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Apakah Anda yakin ingin menghapus karyawan <strong className="text-slate-900 font-bold">{deletingEmployee.name}</strong> (NIK: <span className="font-mono text-purple-700">{deletingEmployee.nik}</span>)? Data yang dihapus tidak dapat dikembalikan.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeletingEmployee(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md hover:shadow-lg transition cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Karyawan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Karyawan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-purple-900 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2 font-bold text-base">
                <Users className="w-5 h-5 text-yellow-400" />
                <span>{editingEmployee ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NIK Karyawan</label>
                  <input
                    type="text"
                    required
                    value={formData.nik || ''}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap sesuai KTP"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Dropdown Jabatan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jabatan</label>
                  <select
                    required
                    value={formData.jabatan || JABATAN_OPTIONS[0]}
                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    {/* Preserve existing custom value if not in standard options */}
                    {formData.jabatan && !JABATAN_OPTIONS.includes(formData.jabatan) && (
                      <option value={formData.jabatan}>{formData.jabatan}</option>
                    )}
                    {JABATAN_OPTIONS.map((jab) => (
                      <option key={jab} value={jab}>
                        {jab}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Divisi</label>
                  <select
                    value={formData.divisi || 'Cinema'}
                    onChange={(e) => setFormData({ ...formData, divisi: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="Cinema">Cinema</option>
                    <option value="F&B">F&B</option>
                    <option value="Kasir">Kasir</option>
                    <option value="Teknisi">Teknisi</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Penempatan Outlet</label>
                  <select
                    value={formData.outletId || outlets[0]?.id}
                    onChange={(e) => setFormData({ ...formData, outletId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.gender || 'L'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.tanggalLahir && formData.tanggalLahir !== '-' ? formData.tanggalLahir : ''}
                    onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Kerja</label>
                  <select
                    value={formData.statusKerja || 'Kontrak'}
                    onChange={(e) => {
                      const newStatus = e.target.value as any;
                      setFormData({
                        ...formData,
                        statusKerja: newStatus,
                        habisKontrak: newStatus === 'Tetap' ? '-' : formData.habisKontrak === '-' ? '2026-12-31' : formData.habisKontrak,
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="Tetap">Tetap</option>
                    <option value="Kontrak">Kontrak</option>
                    <option value="Magang">Magang</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Probation">Probation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. Telepon / WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Mulai Kontrak</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggalKontrak || ''}
                    onChange={(e) => setFormData({ ...formData, tanggalKontrak: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Habis Kontrak</label>
                  {formData.statusKerja === 'Tetap' ? (
                    <input
                      type="text"
                      disabled
                      value="-"
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 cursor-not-allowed"
                    />
                  ) : (
                    <input
                      type="date"
                      required
                      value={formData.habisKontrak && formData.habisKontrak !== '-' ? formData.habisKontrak : ''}
                      onChange={(e) => setFormData({ ...formData, habisKontrak: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-slate-900 bg-[#FACC15] hover:bg-yellow-400 transition shadow-sm cursor-pointer flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Karyawan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Mutasi Karyawan */}
      {isMutasiModalOpen && mutasiEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-purple-900 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2 font-bold text-base">
                <ArrowRightLeft className="w-5 h-5 text-yellow-400" />
                <span>Mutasi Penempatan Outlet</span>
              </div>
              <button
                onClick={() => setIsMutasiModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProcessMutasi} className="p-6 space-y-4">
              <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 space-y-1">
                <div className="text-xs font-bold text-purple-900">{mutasiEmployee.name}</div>
                <div className="text-[11px] text-purple-700 font-medium">
                  NIK: <span className="font-bold">{mutasiEmployee.nik}</span> &bull; Jabatan: <span className="font-bold">{mutasiEmployee.jabatan}</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Outlet Saat Ini:{' '}
                  <span className="font-bold text-slate-900">
                    {outlets.find((o) => o.id === mutasiEmployee.outletId)?.name || mutasiEmployee.outletId}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Outlet Tujuan (Penugasan Baru)</label>
                <select
                  required
                  value={mutasiTargetOutletId}
                  onChange={(e) => setMutasiTargetOutletId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({INITIAL_AREAS.find((a) => a.id === o.areaId)?.name || o.areaId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Efektif Mutasi</label>
                <input
                  type="date"
                  required
                  value={mutasiDate}
                  onChange={(e) => setMutasiDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alasan / Catatan Mutasi</label>
                <textarea
                  rows={3}
                  placeholder="Instruksi pimpinan, kebutuhan operasional, promosi, dsb."
                  value={mutasiNotes}
                  onChange={(e) => setMutasiNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsMutasiModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 transition shadow-sm cursor-pointer flex items-center space-x-1.5"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Proses Mutasi Outlet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Terminate Karyawan */}
      {isTerminateModalOpen && terminateEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-rose-900 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2 font-bold text-base">
                <UserX className="w-5 h-5 text-yellow-400" />
                <span>Workflow Termination Karyawan</span>
              </div>
              <button
                onClick={() => setIsTerminateModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProcessTerminate} className="p-6 space-y-4">
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 space-y-1">
                <div className="text-xs font-bold text-rose-900">{terminateEmployee.name}</div>
                <div className="text-[11px] text-rose-700 font-medium">
                  NIK: <span className="font-bold">{terminateEmployee.nik}</span> &bull; Status saat ini:{' '}
                  <span className="font-bold">{terminateEmployee.statusKerja}</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Outlet:{' '}
                  <span className="font-bold text-slate-900">
                    {outlets.find((o) => o.id === terminateEmployee.outletId)?.name || terminateEmployee.outletId}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Termination</label>
                <select
                  required
                  value={terminateCategory}
                  onChange={(e) => setTerminateCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                  <option value="Resign (Mengundurkan Diri)">Resign (Mengundurkan Diri)</option>
                  <option value="Habis Masa Kontrak">Habis Masa Kontrak</option>
                  <option value="PHK (Pemutusan Hubungan Kerja)">PHK (Pemutusan Hubungan Kerja)</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Efektif Terminate</label>
                <input
                  type="date"
                  required
                  value={terminateDate}
                  onChange={(e) => setTerminateDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alasan / Catatan Termination</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Tuliskan alasan resign, pemutusan kontrak, atau catatan HR..."
                  value={terminateNotes}
                  onChange={(e) => setTerminateNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsTerminateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-sm cursor-pointer flex items-center space-x-1.5"
                >
                  <UserX className="w-4 h-4" />
                  <span>Konfirmasi Terminate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
