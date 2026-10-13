import React, { useState, useEffect } from 'react';
import { User, LostAndFoundRecord } from '../../types';
import { StorageService } from '../../lib/storage';
import { INITIAL_AREAS } from '../../lib/constants';
import {
  PackageSearch,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  CheckSquare,
  Building2,
  Calendar,
  UserCheck,
  Phone,
  FileText,
  AlertCircle,
  X,
  Save,
  ShieldCheck,
  Tag,
  MapPin,
  Sparkles,
} from 'lucide-react';

interface LostAndFoundViewProps {
  currentUser: User | null;
  selectedDate: string;
}

const CATEGORIES = [
  'Elektronik/HP',
  'Dompet/Dokumen',
  'Kunci',
  'Pakaian/Aksesoris',
  'Kacamata',
  'Lainnya',
] as const;

export const LostAndFoundView: React.FC<LostAndFoundViewProps> = ({
  currentUser,
  selectedDate,
}) => {
  const [records, setRecords] = useState<LostAndFoundRecord[]>(() =>
    StorageService.getLostAndFoundRecords()
  );

  const outlets = StorageService.getOutlets();
  const areas = INITIAL_AREAS;

  const isManagerOrCleaner =
    (currentUser?.role === 'manager' || currentUser?.role === 'cleaner') &&
    currentUser?.outletId;

  const filteredOutlets = outlets.filter((o) => {
    if (isManagerOrCleaner) return o.id === currentUser.outletId;
    return true;
  });

  // Filter States
  const [selectedOutletId, setSelectedOutletId] = useState<string>(
    isManagerOrCleaner ? currentUser.outletId! : 'all'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LostAndFoundRecord | null>(null);

  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimingRecord, setClaimingRecord] = useState<LostAndFoundRecord | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<Partial<LostAndFoundRecord>>({
    outletId: isManagerOrCleaner ? currentUser.outletId! : outlets[0]?.id || 'the-park-sawangan-xxi',
    date: selectedDate ? selectedDate.substring(0, 10) : new Date().toISOString().substring(0, 10),
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    location: 'Studio 1',
    showNumber: 1,
    category: 'Elektronik/HP',
    itemName: '',
    description: '',
    finderName: currentUser?.name || 'Staff XXI',
    status: 'Tersimpan',
    notes: '',
  });

  // Form State for Handover / Claim
  const [claimFormData, setClaimFormData] = useState({
    claimedBy: '',
    claimedPhone: '',
    claimedIdentity: '',
    claimedDate: new Date().toISOString().substring(0, 10) + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    notes: '',
  });

  useEffect(() => {
    const handleStorageUpdate = () => {
      setRecords(StorageService.getLostAndFoundRecords());
    };
    window.addEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    return () => {
      window.removeEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    };
  }, []);

  // Filtered List
  const filteredRecords = records.filter((rec) => {
    if (isManagerOrCleaner && rec.outletId !== currentUser.outletId) return false;
    if (selectedOutletId !== 'all' && rec.outletId !== selectedOutletId) return false;
    if (selectedCategory !== 'all' && rec.category !== selectedCategory) return false;
    if (selectedStatus !== 'all' && rec.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        rec.itemName.toLowerCase().includes(q) ||
        rec.description.toLowerCase().includes(q) ||
        rec.location.toLowerCase().includes(q) ||
        rec.finderName.toLowerCase().includes(q) ||
        (rec.claimedBy && rec.claimedBy.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Metrics
  const totalItems = filteredRecords.length;
  const countTersimpan = filteredRecords.filter((r) => r.status === 'Tersimpan').length;
  const countDikembalikan = filteredRecords.filter((r) => r.status === 'Dikembalikan').length;
  const countDisposal = filteredRecords.filter((r) => r.status === 'Disposal').length;
  const returnRate = totalItems > 0 ? Math.round((countDikembalikan / totalItems) * 100) : 0;

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormData({
      outletId: isManagerOrCleaner ? currentUser.outletId! : outlets[0]?.id || 'the-park-sawangan-xxi',
      date: selectedDate ? selectedDate.substring(0, 10) : new Date().toISOString().substring(0, 10),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      location: 'Studio 1',
      showNumber: 1,
      category: 'Elektronik/HP',
      itemName: '',
      description: '',
      finderName: currentUser?.name || 'Staff XXI',
      status: 'Tersimpan',
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (rec: LostAndFoundRecord) => {
    setEditingRecord(rec);
    setFormData(rec);
    setIsAddModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemName || !formData.location || !formData.finderName) return;

    const record: LostAndFoundRecord = {
      id: editingRecord ? editingRecord.id : `laf_${Date.now()}`,
      outletId: formData.outletId || outlets[0]?.id || 'the-park-sawangan-xxi',
      date: formData.date || selectedDate,
      time: formData.time || '10:00',
      location: formData.location || 'Studio 1',
      showNumber: formData.showNumber || 0,
      category: (formData.category as any) || 'Lainnya',
      itemName: formData.itemName || '',
      description: formData.description || '',
      finderName: formData.finderName || '',
      status: (formData.status as any) || 'Tersimpan',
      notes: formData.notes || '',
      claimedBy: formData.claimedBy,
      claimedPhone: formData.claimedPhone,
      claimedIdentity: formData.claimedIdentity,
      claimedDate: formData.claimedDate,
    };

    const updated = StorageService.saveLostAndFoundRecord(record);
    setRecords(updated);
    setIsAddModalOpen(false);
    showToast(editingRecord ? 'Laporan barang berhasil diperbarui!' : 'Penemuan barang baru berhasil dicatat!');
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data penemuan barang ini?')) {
      const updated = StorageService.deleteLostAndFoundRecord(id);
      setRecords(updated);
      showToast('Data barang temuan berhasil dihapus.');
    }
  };

  const handleOpenClaimModal = (rec: LostAndFoundRecord) => {
    setClaimingRecord(rec);
    setClaimFormData({
      claimedBy: rec.claimedBy || '',
      claimedPhone: rec.claimedPhone || '',
      claimedIdentity: rec.claimedIdentity || '',
      claimedDate: new Date().toISOString().substring(0, 10) + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      notes: rec.notes || '',
    });
    setIsClaimModalOpen(true);
  };

  const handleSaveClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingRecord || !claimFormData.claimedBy) return;

    const updatedRecord: LostAndFoundRecord = {
      ...claimingRecord,
      status: 'Dikembalikan',
      claimedBy: claimFormData.claimedBy,
      claimedPhone: claimFormData.claimedPhone,
      claimedIdentity: claimFormData.claimedIdentity,
      claimedDate: claimFormData.claimedDate,
      notes: claimFormData.notes,
    };

    const updated = StorageService.saveLostAndFoundRecord(updatedRecord);
    setRecords(updated);
    setIsClaimModalOpen(false);
    showToast(`Serah terima barang "${claimingRecord.itemName}" ke penonton berhasil dicatat!`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="p-6 rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-800 border border-amber-300">
              <PackageSearch className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] uppercase">
                  LOST &amp; FOUND
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold">
                  Pencatatan Barang Temuan &amp; Pengembalian
                </span>
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 mt-1">
                Barang Temuan Penonton XXI
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola pendataan barang tertinggal di Studio, Toilet, &amp; Cafe XXI serta berita acara serah terima pengembalian ke pemiliknya.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs uppercase flex items-center space-x-2 shadow-md shadow-amber-500/20 transition cursor-pointer self-start md:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Barang Temuan</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center space-x-2 animate-in fade-in shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
            TOTAL BARANG TERCATAT
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-slate-900">{totalItems}</span>
            <span className="text-xs font-bold text-slate-500">Item</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-amber-200/90 bg-amber-50/50 shadow-xs">
          <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider block">
            TERSIMPAN (BELUM DIAMBIL)
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-amber-700">{countTersimpan}</span>
            <span className="text-xs font-bold text-amber-800">Barang</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-200/90 bg-emerald-50/50 shadow-xs">
          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
            BERHASIL DIKEMBALIKAN
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-emerald-700">{countDikembalikan}</span>
            <span className="text-xs font-bold text-emerald-600">
              ({returnRate}% Return Rate)
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/80 shadow-xs">
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
            DISPOSAL / KADALUARSA (&gt;30 HARI)
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-slate-700">{countDisposal}</span>
            <span className="text-xs font-bold text-slate-500">Barang</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-5 rounded-3xl border border-slate-200/90 bg-white text-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
          {/* Outlet Filter */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
              OUTLET BIOSKOP
            </label>
            <select
              value={selectedOutletId}
              disabled={Boolean(isManagerOrCleaner)}
              onChange={(e) => setSelectedOutletId(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:border-amber-400 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              {!isManagerOrCleaner && <option value="all">Semua Outlet XXI</option>}
              {filteredOutlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
              KATEGORI BARANG
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:border-amber-400"
            >
              <option value="all">Semua Kategori</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
              STATUS BARANG
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:border-amber-400"
            >
              <option value="all">Semua Status</option>
              <option value="Tersimpan">🟡 Tersimpan (Di Office/Kasir)</option>
              <option value="Dikembalikan">🟢 Dikembalikan ke Pemilik</option>
              <option value="Disposal">⚪ Disposal (&gt; 30 Hari)</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
              CARI BARANG / PEMILIK
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari HP, dompet, kunci, nama..."
                className="w-full text-xs font-bold pl-8 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:border-amber-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="p-6 rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
              <PackageSearch className="w-4 h-4" />
            </span>
            <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
              DAFTAR LAPORAN BARANG TEMUAN (LOST &amp; FOUND)
            </h3>
          </div>
          <span className="text-xs font-extrabold text-slate-500">
            Menampilkan {filteredRecords.length} item
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="uppercase text-[10px] font-black border-b border-amber-200 bg-amber-50/80 text-slate-800">
              <tr>
                <th className="py-3 px-3">OUTLET &amp; LOKASI</th>
                <th className="py-3 px-3">TGL &amp; JAM</th>
                <th className="py-3 px-3">KATEGORI &amp; NAMA BARANG</th>
                <th className="py-3 px-3">DESKRIPSI / CIRI-CIRI</th>
                <th className="py-3 px-3">PENEMU</th>
                <th className="py-3 px-3 text-center">STATUS</th>
                <th className="py-3 px-3">PENERIMA / SERAH TERIMA</th>
                <th className="py-3 px-3 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                    Belum ada data barang temuan yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const outletObj = outlets.find((o) => o.id === rec.outletId);
                  return (
                    <tr key={rec.id} className="hover:bg-amber-50/30 transition text-slate-800">
                      <td className="py-3 px-3 font-extrabold text-slate-900">
                        <div className="flex flex-col">
                          <span>{outletObj?.name || rec.outletId}</span>
                          <span className="text-[10px] text-amber-800 font-semibold flex items-center space-x-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>
                              {rec.location} {rec.showNumber ? `(Show ${rec.showNumber})` : ''}
                            </span>
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                        <div className="font-bold text-slate-800">{rec.date}</div>
                        <div className="text-[10px] text-slate-400">{rec.time}</div>
                      </td>

                      <td className="py-3 px-3 font-extrabold text-slate-900">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">
                            {rec.category}
                          </span>
                          <span className="text-xs text-slate-900 font-extrabold">
                            {rec.itemName}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={rec.description}>
                        {rec.description}
                      </td>

                      <td className="py-3 px-3 text-slate-700 font-semibold truncate max-w-[120px]">
                        {rec.finderName}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black border inline-flex items-center space-x-1 ${
                            rec.status === 'Tersimpan'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : rec.status === 'Dikembalikan'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              rec.status === 'Tersimpan'
                                ? 'bg-amber-500'
                                : rec.status === 'Dikembalikan'
                                ? 'bg-emerald-500'
                                : 'bg-slate-400'
                            }`}
                          ></span>
                          <span>{rec.status}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3 text-xs">
                        {rec.status === 'Dikembalikan' && rec.claimedBy ? (
                          <div className="flex flex-col">
                            <span className="font-extrabold text-emerald-900">
                              {rec.claimedBy}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {rec.claimedPhone || '-'} &bull; {rec.claimedDate || '-'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Belum diserahkan
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          {rec.status === 'Tersimpan' && (
                            <button
                              onClick={() => handleOpenClaimModal(rec)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black transition cursor-pointer shadow-2xs flex items-center space-x-1"
                              title="Proses Serah Terima ke Pemilik"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Serah Terima</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEdit(rec)}
                            className="p-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                            title="Edit Data"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {(currentUser?.role === 'admin' || currentUser?.role === 'area_manager') && (
                            <button
                              onClick={() => handleDelete(rec.id)}
                              className="p-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                              title="Hapus Data"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Modal 1: Tambah / Edit Penemuan Barang */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <PackageSearch className="w-5 h-5" />
                </span>
                <h3 className="font-extrabold text-base text-slate-900">
                  {editingRecord ? 'EDIT DATA BARANG TEMUAN' : 'CATAT PENEMUAN BARANG BARU'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                  OUTLET BIOSKOP XXI
                </label>
                <select
                  value={formData.outletId}
                  disabled={Boolean(isManagerOrCleaner)}
                  onChange={(e) => setFormData({ ...formData, outletId: e.target.value })}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {filteredOutlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                    TANGGAL PENEMUAN
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                    JAM PENEMUAN
                  </label>
                  <input
                    type="text"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    placeholder="HH:mm (contoh 14:30)"
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                    LOKASI SPESIFIK PENEMUAN
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Contoh: Studio 1 Row H, Toilet Wanita..."
                    required
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                    SHOWTIME (OPSIONAL)
                  </label>
                  <select
                    value={formData.showNumber || 0}
                    onChange={(e) => setFormData({ ...formData, showNumber: Number(e.target.value) })}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                  >
                    <option value={0}>Area Umum / Non-Show</option>
                    <option value={1}>Show 1</option>
                    <option value={2}>Show 2</option>
                    <option value={3}>Show 3</option>
                    <option value={4}>Show 4</option>
                    <option value={5}>Show 5</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                    KATEGORI BARANG
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                    NAMA BARANG
                  </label>
                  <input
                    type="text"
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    placeholder="Contoh: iPhone 15 Pro Dark Blue"
                    required
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                  DESKRIPSI &amp; CIRI-CIRI BARANG
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Masukkan warna, merk, casing, isi dompet, atau nomor identitas terkait..."
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                    NAMA PETUGAS PENEMU (CLEANER/STAFF)
                  </label>
                  <input
                    type="text"
                    value={formData.finderName}
                    onChange={(e) => setFormData({ ...formData, finderName: e.target.value })}
                    placeholder="Nama Petugas..."
                    required
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                    STATUS BARANG
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                  >
                    <option value="Tersimpan">🟡 Tersimpan (Di Office/Kasir)</option>
                    <option value="Dikembalikan">🟢 Dikembalikan ke Pemilik</option>
                    <option value="Disposal">⚪ Disposal (&gt;30 Hari)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                  CATATAN LOKASI PENYIMPANAN / LAINNYA
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Contoh: Disimpan di brankas security office..."
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase flex items-center space-x-1.5 transition cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Data</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Form Serah Terima Barang ke Pemilik */}
      {isClaimModalOpen && claimingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h3 className="font-extrabold text-base text-slate-900">
                  BERITA ACARA SERAH TERIMA BARANG
                </h3>
              </div>
              <button
                onClick={() => setIsClaimModalOpen(false)}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-slate-800 space-y-1">
              <div className="font-extrabold text-amber-900">
                Item: {claimingRecord.itemName} ({claimingRecord.category})
              </div>
              <div className="text-slate-600">
                Ditemukan di: {claimingRecord.location} pada tanggal {claimingRecord.date} ({claimingRecord.time})
              </div>
            </div>

            <form onSubmit={handleSaveClaim} className="space-y-4 mt-4">
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                  NAMA PEMILIK / PENERIMA BARANG
                </label>
                <input
                  type="text"
                  value={claimFormData.claimedBy}
                  onChange={(e) => setClaimFormData({ ...claimFormData, claimedBy: e.target.value })}
                  placeholder="Masukkan Nama Lengkap Penonton / Pemilik..."
                  required
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                    NO. HANDPHONE / WA PEMILIK
                  </label>
                  <input
                    type="text"
                    value={claimFormData.claimedPhone}
                    onChange={(e) => setClaimFormData({ ...claimFormData, claimedPhone: e.target.value })}
                    placeholder="081234567890"
                    required
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                    NO. IDENTITAS (KTP / SIM / PASPOR)
                  </label>
                  <input
                    type="text"
                    value={claimFormData.claimedIdentity}
                    onChange={(e) => setClaimFormData({ ...claimFormData, claimedIdentity: e.target.value })}
                    placeholder="3276012345670001"
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                  WAKTU PENYERAHAN
                </label>
                <input
                  type="text"
                  value={claimFormData.claimedDate}
                  onChange={(e) => setClaimFormData({ ...claimFormData, claimedDate: e.target.value })}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                  CATATAN SERAH TERIMA (OPSIONAL)
                </label>
                <input
                  type="text"
                  value={claimFormData.notes}
                  onChange={(e) => setClaimFormData({ ...claimFormData, notes: e.target.value })}
                  placeholder="Contoh: Diserahkan langsung di kantor supervisor XXI setelah verifikasi password HP..."
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase flex items-center space-x-1.5 transition cursor-pointer shadow-md"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Selesaikan Serah Terima</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
