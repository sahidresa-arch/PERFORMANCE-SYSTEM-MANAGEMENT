import React, { useState, useEffect } from 'react';
import { User, Outlet, Employee } from '../../types';
import { StorageService } from '../../lib/storage';
import { INITIAL_AREAS, INITIAL_OUTLETS } from '../../lib/constants';
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
  FileSpreadsheet,
} from 'lucide-react';

interface EmployeesViewProps {
  currentUser: User | null;
  selectedDate: string;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({ currentUser, selectedDate }) => {
  const [employees, setEmployees] = useState<Employee[]>(() => StorageService.getEmployees());
  const [outlets, setOutlets] = useState<Outlet[]>(() => StorageService.getOutlets());
  const areas = INITIAL_AREAS;

  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [selectedOutletId, setSelectedOutletId] = useState<string>('all');
  const [selectedDivisi, setSelectedDivisi] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Employee>>({
    nik: 'XXI-' + Math.floor(100000 + Math.random() * 900000),
    name: '',
    jabatan: 'Staff Bioskop',
    divisi: 'Cinema',
    outletId: outlets[0]?.id || 'the-park-sawangan-xxi',
    gender: 'L',
    statusKerja: 'Kontrak',
    tanggalKontrak: '2026-01-01',
    habisKontrak: '2026-12-31',
    phone: '081234567890',
  });

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
    if (selectedDivisi !== 'all' && emp.divisi !== selectedDivisi) return false;
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
      jabatan: 'Staff Bioskop',
      divisi: 'Cinema',
      outletId: currentUser?.outletId || outlets[0]?.id || 'the-park-sawangan-xxi',
      gender: 'L',
      statusKerja: 'Kontrak',
      tanggalKontrak: selectedDate ? selectedDate.substring(0, 10) : '2026-01-01',
      habisKontrak: '2026-12-31',
      phone: '081234567890',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData(emp);
    setIsModalOpen(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.nik) return;

    const record: Employee = {
      id: editingEmployee ? editingEmployee.id : `emp_${Date.now()}`,
      nik: formData.nik || '',
      name: formData.name || '',
      jabatan: formData.jabatan || 'Staff',
      divisi: (formData.divisi as any) || 'Cinema',
      outletId: formData.outletId || outlets[0].id,
      gender: (formData.gender as any) || 'L',
      statusKerja: (formData.statusKerja as any) || 'Kontrak',
      tanggalKontrak: formData.tanggalKontrak || '2026-01-01',
      habisKontrak: formData.habisKontrak || '2026-12-31',
      phone: formData.phone || '-',
      photoUrl: formData.photoUrl,
    };

    const updated = StorageService.saveEmployee(record);
    setEmployees(updated);
    setIsModalOpen(false);
    showToast(`Data karyawan ${record.name} berhasil disimpan!`);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Yakin ingin menghapus data karyawan ${name}?`)) {
      const updated = StorageService.deleteEmployee(id);
      setEmployees(updated);
      showToast(`Karyawan ${name} berhasil dihapus.`);
    }
  };

  const calculateSisaKontrak = (habisKontrakDate: string) => {
    const today = new Date();
    const end = new Date(habisKontrakDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: 'Habis Masa Kontrak', urgent: true };
    if (diffDays <= 30) return { text: `${diffDays} Hari lagi`, urgent: true };
    const months = Math.floor(diffDays / 30);
    return { text: `${months} Bulan (${diffDays} Hari)`, urgent: false };
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
            Pusat database kepegawaian, masa kontrak kerja, dan penempatan outlet operasional.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-[#FACC15] hover:bg-yellow-400 text-slate-900 px-5 py-3 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-lg transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Karyawan Baru</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200 text-xs font-bold flex items-center space-x-2 shadow-sm animate-pulse">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
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
            <Users className="w-3 h-3 text-purple-600 mr-1" /> Outlet
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

        <div className="space-y-1 lg:col-span-2">
          <label className="block text-[11px] font-bold text-slate-500 uppercase flex items-center">
            <Search className="w-3 h-3 text-purple-600 mr-1" /> Cari NIK / Nama Karyawan
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Cari berdasarkan NIK, Nama, atau Jabatan..."
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">
                <th className="border border-slate-300 px-3 py-2.5 text-center">Foto Karyawan</th>
                <th className="border border-slate-300 px-3 py-2.5">NIK</th>
                <th className="border border-slate-300 px-3 py-2.5">Nama Karyawan</th>
                <th className="border border-slate-300 px-3 py-2.5">Jabatan</th>
                <th className="border border-slate-300 px-3 py-2.5">Divisi</th>
                <th className="border border-slate-300 px-3 py-2.5">Outlet</th>
                <th className="border border-slate-300 px-3 py-2.5 text-center">Gender</th>
                <th className="border border-slate-300 px-3 py-2.5 text-center">Status Kerja</th>
                <th className="border border-slate-300 px-3 py-2.5">Tanggal Kontrak</th>
                <th className="border border-slate-300 px-3 py-2.5">Habis Kontrak</th>
                <th className="border border-slate-300 px-3 py-2.5">Sisa Kontrak</th>
                <th className="border border-slate-300 px-3 py-2.5">No. Telp</th>
                <th className="border border-slate-300 px-3 py-2.5 text-center">Tindakan Workflow</th>
              </tr>
            </thead>
            <tbody className="text-xs font-medium text-slate-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-8 text-slate-400 font-semibold">
                    Tidak ada data karyawan yang ditemukan dengan filter tersebut.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const outletObj = outlets.find((o) => o.id === emp.outletId);
                  const sisa = calculateSisaKontrak(emp.habisKontrak);
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition">
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
                      <td className="border border-slate-300 px-3 py-2.5">{emp.jabatan}</td>
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
                      <td className="border border-slate-300 px-3 py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            emp.statusKerja === 'Tetap'
                              ? 'bg-emerald-100 text-emerald-800'
                              : emp.statusKerja === 'Kontrak'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {emp.statusKerja}
                        </span>
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5">{emp.tanggalKontrak}</td>
                      <td className="border border-slate-300 px-3 py-2.5">{emp.habisKontrak}</td>
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
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            title="Edit Karyawan"
                            className="p-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id, emp.name)}
                            title="Hapus Karyawan"
                            className="p-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jabatan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Staff Ticketing / F&B Crew"
                    value={formData.jabatan || ''}
                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Kerja</label>
                  <select
                    value={formData.statusKerja || 'Kontrak'}
                    onChange={(e) => setFormData({ ...formData, statusKerja: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="Tetap">Tetap</option>
                    <option value="Kontrak">Kontrak</option>
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
                  <input
                    type="date"
                    required
                    value={formData.habisKontrak || ''}
                    onChange={(e) => setFormData({ ...formData, habisKontrak: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
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
    </div>
  );
};
