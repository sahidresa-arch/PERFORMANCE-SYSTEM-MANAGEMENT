import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  WarehouseItem,
  StockTransaction,
  StockOpnameHistory,
  StockOpnameItemResult,
} from '../../types';
import { StorageService } from '../../lib/storage';
import {
  Boxes,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Trash2,
  Edit2,
  Save,
  X,
  History,
  ClipboardList,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Info,
} from 'lucide-react';

interface WarehouseStockViewProps {
  currentUser: User | null;
  selectedDate: string;
}

export const WarehouseStockView: React.FC<WarehouseStockViewProps> = ({
  currentUser,
  selectedDate,
}) => {
  const outlets = StorageService.getOutlets();

  const isManagerOrCleaner =
    (currentUser?.role === 'manager' || currentUser?.role === 'cleaner') &&
    currentUser?.outletId;

  const filteredOutlets = outlets.filter((o) => {
    if (isManagerOrCleaner) return o.id === currentUser.outletId;
    return true;
  });

  const defaultOutletId =
    currentUser?.outletId || (outlets.length > 0 ? outlets[0].id : '');
  const [selectedOutletId, setSelectedOutletId] = useState<string>(defaultOutletId);

  // Tab State: 'dashboard' | 'transaksi' | 'master' | 'opname'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transaksi' | 'master' | 'opname'>('dashboard');

  // Realtime Data States
  const [items, setItems] = useState<WarehouseItem[]>(() => StorageService.getWarehouseItems());
  const [transactions, setTransactions] = useState<StockTransaction[]>(() => StorageService.getStockTransactions());
  const [opnameHistory, setOpnameHistory] = useState<StockOpnameHistory[]>(() => StorageService.getStockOpnameHistory());

  // Toast State
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  useEffect(() => {
    const handleStorageUpdate = () => {
      setItems(StorageService.getWarehouseItems());
      setTransactions(StorageService.getStockTransactions());
      setOpnameHistory(StorageService.getStockOpnameHistory());
    };
    window.addEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    return () => {
      window.removeEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    };
  }, []);

  const selectedOutletObj =
    outlets.find((o) => o.id === selectedOutletId) || outlets[0];

  // Filter Items by Outlet
  const outletItems = useMemo(
    () => items.filter((i) => i.outletId === selectedOutletId),
    [items, selectedOutletId]
  );

  // Filter Transactions by Outlet
  const outletTxList = useMemo(
    () => transactions.filter((t) => t.outletId === selectedOutletId),
    [transactions, selectedOutletId]
  );

  // Computed Item Calculations: Total IN, Total OUT, Sisa Sistem
  const calculatedItems = useMemo(() => {
    return outletItems.map((item) => {
      const itemTx = outletTxList.filter((t) => t.itemId === item.id);
      const totalIn = itemTx
        .filter((t) => t.type === 'IN')
        .reduce((sum, t) => sum + (t.qty || 0), 0);
      const totalOut = itemTx
        .filter((t) => t.type === 'OUT')
        .reduce((sum, t) => sum + (t.qty || 0), 0);
      const sisaSistem = (item.initialStock || 0) + totalIn - totalOut;
      const isLowStock = sisaSistem <= (item.minStock || 0);

      return {
        ...item,
        totalIn,
        totalOut,
        sisaSistem,
        isLowStock,
      };
    });
  }, [outletItems, outletTxList]);

  // Metric Summaries
  const totalItemCount = calculatedItems.length;
  const lowStockCount = calculatedItems.filter((i) => i.isLowStock).length;
  const totalTxInCount = outletTxList.filter((t) => t.type === 'IN').length;
  const totalTxOutCount = outletTxList.filter((t) => t.type === 'OUT').length;

  // Search & Category Filters for Dashboard
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredDashboardItems = useMemo(() => {
    return calculatedItems.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.unit.toLowerCase().includes(q) ||
          (item.category && item.category.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [calculatedItems, searchQuery, categoryFilter]);

  // TAB 2: Transaksi State
  const [txFormData, setTxFormData] = useState({
    itemId: outletItems[0]?.id || '',
    type: 'IN' as 'IN' | 'OUT',
    qty: 0,
    notes: 'Terima dari HO',
    date: selectedDate ? selectedDate.substring(0, 10) : new Date().toISOString().substring(0, 10),
  });

  useEffect(() => {
    if (outletItems.length > 0 && (!txFormData.itemId || !outletItems.some(i => i.id === txFormData.itemId))) {
      setTxFormData((prev) => ({ ...prev, itemId: outletItems[0].id }));
    }
  }, [outletItems]);

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txFormData.itemId || txFormData.qty <= 0) {
      alert('Pilih barang dan masukkan jumlah (qty) yang valid!');
      return;
    }

    const tx: StockTransaction = {
      id: `tx_${Date.now()}`,
      outletId: selectedOutletId,
      itemId: txFormData.itemId,
      date: txFormData.date,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      type: txFormData.type,
      qty: Number(txFormData.qty),
      notes: txFormData.notes || (txFormData.type === 'IN' ? 'Barang Masuk' : 'Barang Keluar Operasional'),
      createdBy: currentUser?.name || 'Staff XXI',
    };

    const updated = StorageService.saveStockTransaction(tx);
    setTransactions(updated);
    setTxFormData({
      itemId: outletItems[0]?.id || '',
      type: 'IN',
      qty: 0,
      notes: 'Terima dari HO',
      date: selectedDate ? selectedDate.substring(0, 10) : new Date().toISOString().substring(0, 10),
    });
    showToast(`Transaksi ${tx.type} barang berhasil dicatat!`);
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus transaksi kartu stok ini?')) {
      const updated = StorageService.deleteStockTransaction(id);
      setTransactions(updated);
      showToast('Transaksi kartu stok berhasil dihapus.');
    }
  };

  // TAB 3: Master Barang State
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [editingMasterItem, setEditingMasterItem] = useState<WarehouseItem | null>(null);
  const [masterFormData, setMasterFormData] = useState({
    name: '',
    unit: 'Pcs',
    initialStock: 100,
    minStock: 20,
    category: 'Kemasan Cafe',
    notes: '',
  });

  const handleOpenAddMaster = () => {
    setEditingMasterItem(null);
    setMasterFormData({
      name: '',
      unit: 'Pcs',
      initialStock: 100,
      minStock: 20,
      category: 'Kemasan Cafe',
      notes: '',
    });
    setIsMasterModalOpen(true);
  };

  const handleOpenEditMaster = (item: WarehouseItem) => {
    setEditingMasterItem(item);
    setMasterFormData({
      name: item.name,
      unit: item.unit,
      initialStock: item.initialStock,
      minStock: item.minStock,
      category: item.category || 'Kemasan Cafe',
      notes: item.notes || '',
    });
    setIsMasterModalOpen(true);
  };

  const handleSaveMaster = (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterFormData.name) return;

    const record: WarehouseItem = {
      id: editingMasterItem ? editingMasterItem.id : `wh_${Date.now()}`,
      outletId: selectedOutletId,
      name: masterFormData.name,
      unit: masterFormData.unit,
      initialStock: Number(masterFormData.initialStock),
      minStock: Number(masterFormData.minStock),
      category: masterFormData.category,
      notes: masterFormData.notes,
    };

    const updated = StorageService.saveWarehouseItem(record);
    setItems(updated);
    setIsMasterModalOpen(false);
    showToast(editingMasterItem ? 'Master barang berhasil diubah!' : 'Barang master baru berhasil ditambahkan!');
  };

  const handleDeleteMaster = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus barang master ini dari gudang?')) {
      const updated = StorageService.deleteWarehouseItem(id);
      setItems(updated);
      showToast('Barang master berhasil dihapus.');
    }
  };

  // TAB 4: Stock Opname State
  const [physicalCounts, setPhysicalCounts] = useState<{ [itemId: string]: number }>({});
  const [opnameReasons, setOpnameReasons] = useState<{ [itemId: string]: string }>({});
  const [autoAdjust, setAutoAdjust] = useState(true);
  const [isOpnameHistoryOpen, setIsOpnameHistoryOpen] = useState(false);

  // Sync initial physical counts from current system stock
  useEffect(() => {
    const counts: { [itemId: string]: number } = {};
    calculatedItems.forEach((item) => {
      counts[item.id] = item.sisaSistem;
    });
    setPhysicalCounts(counts);
  }, [calculatedItems]);

  const handlePhysicalCountChange = (itemId: string, val: number) => {
    setPhysicalCounts((prev) => ({
      ...prev,
      [itemId]: val,
    }));
  };

  const handleReasonChange = (itemId: string, val: string) => {
    setOpnameReasons((prev) => ({
      ...prev,
      [itemId]: val,
    }));
  };

  const handleSaveOpname = () => {
    if (calculatedItems.length === 0) {
      alert('Belum ada barang di gudang untuk di-opname!');
      return;
    }

    // Check if any item has difference and missing reason
    const results: StockOpnameItemResult[] = [];
    let hasUnexplainedDiff = false;

    for (const item of calculatedItems) {
      const phys = physicalCounts[item.id] ?? item.sisaSistem;
      const diff = phys - item.sisaSistem;
      const reason = opnameReasons[item.id] || '';

      if (diff !== 0 && !reason.trim()) {
        hasUnexplainedDiff = true;
      }

      results.push({
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        systemStock: item.sisaSistem,
        physicalStock: phys,
        difference: diff,
        reason,
      });
    }

    if (hasUnexplainedDiff) {
      alert('Semua barang yang memiliki selisih WAJIB diisi alasan selisihnya!');
      return;
    }

    const opnameRecord: StockOpnameHistory = {
      id: `opname_${Date.now()}`,
      outletId: selectedOutletId,
      date: selectedDate ? selectedDate.substring(0, 10) : new Date().toISOString().substring(0, 10),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      performedBy: currentUser?.name || 'Staff XXI',
      items: results,
      autoAdjusted: autoAdjust,
    };

    // Auto-adjust transactions if checked
    if (autoAdjust) {
      results.forEach((res) => {
        if (res.difference !== 0) {
          const isPositive = res.difference > 0;
          const adjTx: StockTransaction = {
            id: `tx_adj_${Date.now()}_${res.itemId}`,
            outletId: selectedOutletId,
            itemId: res.itemId,
            date: selectedDate ? selectedDate.substring(0, 10) : new Date().toISOString().substring(0, 10),
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            type: isPositive ? 'IN' : 'OUT',
            qty: Math.abs(res.difference),
            notes: `Adjustment Opname: ${res.reason || 'Koreksi Fisik'}`,
            createdBy: currentUser?.name || 'Opname Auto-Adjustment',
          };
          StorageService.saveStockTransaction(adjTx);
        }
      });
    }

    const updatedHistory = StorageService.saveStockOpnameHistory(opnameRecord);
    setOpnameHistory(updatedHistory);
    setTransactions(StorageService.getStockTransactions());
    showToast('Hasil Stock Opname Fisik berhasil disimpan dan disinkronkan!');
  };

  const handlePrintOpname = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="p-6 rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-800 border border-amber-300">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] uppercase">
                  MANAJEMEN STOK GUDANG
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold">
                  Digital Stock Opname &amp; Kartu Stok
                </span>
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 mt-1">
                Stok Barang &amp; Stock Opname Digital XXI
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pencatatan kartu stok keluar-masuk otomatis, peringatan stok menipis, dan verifikasi fisik stock opname.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Outlet Selector */}
            <div>
              <label className="text-[10px] font-extrabold text-amber-900 uppercase block mb-1">
                OUTLET BIOSKOP
              </label>
              <select
                value={selectedOutletId}
                disabled={Boolean(isManagerOrCleaner)}
                onChange={(e) => setSelectedOutletId(e.target.value)}
                className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 shadow-2xs focus:border-amber-400 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                {filteredOutlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Display */}
            <div>
              <label className="text-[10px] font-extrabold text-amber-900 uppercase block mb-1">
                TANGGAL HARI INI
              </label>
              <div className="px-3 py-2 rounded-xl border border-slate-300 bg-amber-50/60 text-amber-900 text-xs font-black flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>{selectedDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation (4 Tabs) */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-slate-950 shadow-md border-amber-400 scale-[1.01]'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>1. Dashboard Sisa Stok</span>
            {lowStockCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-black animate-pulse">
                {lowStockCount} Menipis
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('transaksi')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'transaksi'
                ? 'bg-amber-500 text-slate-950 shadow-md border-amber-400 scale-[1.01]'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>2. Kartu Stok (IN / OUT)</span>
          </button>

          <button
            onClick={() => setActiveTab('master')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'master'
                ? 'bg-amber-500 text-slate-950 shadow-md border-amber-400 scale-[1.01]'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>3. Master Barang Gudang</span>
          </button>

          <button
            onClick={() => setActiveTab('opname')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'opname'
                ? 'bg-amber-500 text-slate-950 shadow-md border-amber-400 scale-[1.01]'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>4. Stock Opname Fisik</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center space-x-2 animate-in fade-in shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TAB 1: DASHBOARD SISA STOK */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                TOTAL BARANG MASTER
              </span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-2xl font-black text-slate-900">{totalItemCount}</span>
                <span className="text-xs font-bold text-slate-500">Jenis Barang</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/50 shadow-xs">
              <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider block">
                STOK MENIPIS (&lt;= MIN STOK)
              </span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-2xl font-black text-rose-700">{lowStockCount}</span>
                <span className="text-xs font-bold text-rose-600">Item Perlu Reorder</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-xs">
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                TRANSAKSI MASUK (IN)
              </span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-2xl font-black text-emerald-700">{totalTxInCount}</span>
                <span className="text-xs font-bold text-emerald-600">Kali Penerimaan</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/50 shadow-xs">
              <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider block">
                TRANSAKSI KELUAR (OUT)
              </span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-2xl font-black text-amber-700">{totalTxOutCount}</span>
                <span className="text-xs font-bold text-amber-800">Kali Pemakaian</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-5 rounded-3xl border border-slate-200/90 bg-white text-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama barang, satuan, kategori..."
                  className="w-full text-xs font-bold pl-8 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <label className="text-xs font-extrabold text-slate-600 uppercase whitespace-nowrap">
                Kategori:
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:border-amber-400"
              >
                <option value="all">Semua Kategori</option>
                <option value="Kemasan Cafe">Kemasan Cafe</option>
                <option value="Bahan Baku">Bahan Baku</option>
                <option value="Sanitasi">Sanitasi</option>
              </select>
            </div>
          </div>

          {/* Main Stock Summary Table */}
          <div className="p-6 rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
                  <Boxes className="w-4 h-4" />
                </span>
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
                  REKAP SISA STOK SISTEM GUDANG ({selectedOutletObj?.name})
                </h3>
              </div>
              <span className="text-xs font-extrabold text-slate-500">
                Formula: Stok Awal + Total IN - Total OUT
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="uppercase text-[10px] font-black border-b border-amber-200 bg-amber-50/80 text-slate-800">
                  <tr>
                    <th className="py-3 px-3">NAMA BARANG</th>
                    <th className="py-3 px-3">KATEGORI</th>
                    <th className="py-3 px-3 text-center">SATUAN</th>
                    <th className="py-3 px-3 text-right">STOK AWAL</th>
                    <th className="py-3 px-3 text-right text-emerald-800">TOTAL MASUK (IN)</th>
                    <th className="py-3 px-3 text-right text-rose-800">TOTAL KELUAR (OUT)</th>
                    <th className="py-3 px-3 text-right font-black">SISA SISTEM</th>
                    <th className="py-3 px-3 text-center">STATUS STOK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredDashboardItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                        Belum ada data barang gudang. Silakan tambah di tab &quot;3. Master Barang Gudang&quot;.
                      </td>
                    </tr>
                  ) : (
                    filteredDashboardItems.map((item) => (
                      <tr key={item.id} className="hover:bg-amber-50/30 transition text-slate-800">
                        <td className="py-3 px-3 font-extrabold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {item.category || '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                            {item.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-600">
                          {item.initialStock.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-700">
                          +{item.totalIn.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-rose-700">
                          -{item.totalOut.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                          {item.sisaSistem.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {item.isLowStock ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center space-x-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Stok Menipis (&lt;={item.minStock})</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Stok Aman</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSAKSI KARTU STOK */}
      {activeTab === 'transaksi' && (
        <div className="space-y-6">
          {/* Form Transaksi IN / OUT */}
          <div className="p-6 rounded-3xl border border-amber-200/90 bg-white shadow-xs">
            <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-slate-100">
              <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <RefreshCw className="w-5 h-5" />
              </span>
              <h3 className="font-extrabold text-base text-slate-900">
                CATAT TRANSAKSI KELUAR / MASUK GUDANG (IN / OUT)
              </h3>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                    PILIH BARANG
                  </label>
                  <select
                    value={txFormData.itemId}
                    onChange={(e) => setTxFormData({ ...txFormData, itemId: e.target.value })}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                  >
                    {outletItems.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                    TIPE TRANSAKSI
                  </label>
                  <select
                    value={txFormData.type}
                    onChange={(e) =>
                      setTxFormData({
                        ...txFormData,
                        type: e.target.value as 'IN' | 'OUT',
                        notes: e.target.value === 'IN' ? 'Terima dari HO' : 'Dipakai Operasional',
                      })
                    }
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                  >
                    <option value="IN">📥 IN (Barang Masuk / Tambah Stok)</option>
                    <option value="OUT">📤 OUT (Barang Keluar / Kurang Stok)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                    JUMLAH (QTY)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={txFormData.qty || ''}
                    onChange={(e) => setTxFormData({ ...txFormData, qty: Number(e.target.value) })}
                    placeholder="Masukkan jumlah qty..."
                    required
                    className="w-full text-xs font-extrabold px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                    KETERANGAN / DOKUMEN
                  </label>
                  <input
                    type="text"
                    value={txFormData.notes}
                    onChange={(e) => setTxFormData({ ...txFormData, notes: e.target.value })}
                    placeholder="Contoh: Terima dari HO, Spoil, Penyesuaian..."
                    className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase flex items-center space-x-1.5 transition cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>SIMPAN TRANSAKSI STOK</span>
                </button>
              </div>
            </form>
          </div>

          {/* Transaction History Table */}
          <div className="p-6 rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
                  <History className="w-4 h-4" />
                </span>
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
                  RIWAYAT TRANSAKSI KARTU STOK ({selectedOutletObj?.name})
                </h3>
              </div>
              <span className="text-xs font-extrabold text-slate-500">
                {outletTxList.length} Transaksi Tercatat
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="uppercase text-[10px] font-black border-b border-amber-200 bg-amber-50/80 text-slate-800">
                  <tr>
                    <th className="py-3 px-3">TGL &amp; JAM</th>
                    <th className="py-3 px-3">NAMA BARANG</th>
                    <th className="py-3 px-3 text-center">TIPE</th>
                    <th className="py-3 px-3 text-right">IN (+)</th>
                    <th className="py-3 px-3 text-right">OUT (-)</th>
                    <th className="py-3 px-3">KETERANGAN</th>
                    <th className="py-3 px-3">PETUGAS</th>
                    <th className="py-3 px-3 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {outletTxList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                        Belum ada transaksi kartu stok di outlet ini.
                      </td>
                    </tr>
                  ) : (
                    outletTxList.map((tx) => {
                      const itemObj = items.find((i) => i.id === tx.itemId);
                      return (
                        <tr key={tx.id} className="hover:bg-amber-50/30 transition text-slate-800">
                          <td className="py-3 px-3 whitespace-nowrap text-slate-600 font-bold">
                            <div>{tx.date}</div>
                            <div className="text-[10px] text-slate-400">{tx.time}</div>
                          </td>
                          <td className="py-3 px-3 font-extrabold text-slate-900">
                            {itemObj?.name || 'Barang Terhapus'} ({itemObj?.unit || '-'})
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                                tx.type === 'IN'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border-rose-300'
                              }`}
                            >
                              {tx.type === 'IN' ? '📥 IN (MASUK)' : '📤 OUT (KELUAR)'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-extrabold text-emerald-700">
                            {tx.type === 'IN' ? `+${tx.qty.toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-extrabold text-rose-700">
                            {tx.type === 'OUT' ? `-${tx.qty.toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td className="py-3 px-3 text-slate-700 font-medium truncate max-w-xs" title={tx.notes}>
                            {tx.notes}
                          </td>
                          <td className="py-3 px-3 text-slate-500 text-[11px]">
                            {tx.createdBy}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {(currentUser?.role === 'admin' || currentUser?.role === 'area_manager') && (
                              <button
                                onClick={() => handleDeleteTransaction(tx.id)}
                                className="p-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                                title="Hapus Transaksi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
      )}

      {/* TAB 3: MASTER BARANG GUDANG */}
      {activeTab === 'master' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
                  <Layers className="w-4 h-4" />
                </span>
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
                  MASTER DAFTAR BARANG GUDANG ({selectedOutletObj?.name})
                </h3>
              </div>

              <button
                onClick={handleOpenAddMaster}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase flex items-center space-x-1.5 transition cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Barang Master</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="uppercase text-[10px] font-black border-b border-amber-200 bg-amber-50/80 text-slate-800">
                  <tr>
                    <th className="py-3 px-3">NAMA BARANG</th>
                    <th className="py-3 px-3">KATEGORI</th>
                    <th className="py-3 px-3 text-center">SATUAN</th>
                    <th className="py-3 px-3 text-right">STOK AWAL (INITIAL)</th>
                    <th className="py-3 px-3 text-right">MIN STOK (ALERT)</th>
                    <th className="py-3 px-3">CATATAN</th>
                    <th className="py-3 px-3 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {outletItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                        Belum ada barang master di outlet ini. Klik tombol di atas untuk menambah.
                      </td>
                    </tr>
                  ) : (
                    outletItems.map((item) => (
                      <tr key={item.id} className="hover:bg-amber-50/30 transition text-slate-800">
                        <td className="py-3 px-3 font-extrabold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {item.category || '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                            {item.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-slate-800">
                          {item.initialStock.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-amber-700">
                          {item.minStock.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-slate-500 truncate max-w-xs">
                          {item.notes || '-'}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => handleOpenEditMaster(item)}
                              className="p-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                              title="Edit Master"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {(currentUser?.role === 'admin' || currentUser?.role === 'area_manager') && (
                              <button
                                onClick={() => handleDeleteMaster(item.id)}
                                className="p-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                                title="Hapus Master"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STOCK OPNAME FISIK */}
      {activeTab === 'opname' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border border-slate-200/90 bg-white shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <ClipboardList className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    FORM PENGHITUNGAN STOCK OPNAME FISIK GUDANG
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Masukkan hasil hitung fisik di gudang. Sistem akan menghitung selisih secara realtime.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsOpnameHistoryOpen(true)}
                  className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition cursor-pointer flex items-center space-x-1.5"
                >
                  <History className="w-3.5 h-3.5 text-amber-700" />
                  <span>Riwayat Opname</span>
                </button>

                <button
                  onClick={handlePrintOpname}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center space-x-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Cetak Form</span>
                </button>
              </div>
            </div>

            {/* Opname Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="uppercase text-[10px] font-black border-b border-amber-200 bg-amber-50/80 text-slate-800">
                  <tr>
                    <th className="py-3 px-3">NAMA BARANG</th>
                    <th className="py-3 px-3 text-center">SATUAN</th>
                    <th className="py-3 px-3 text-right">SISA SISTEM (AUTO)</th>
                    <th className="py-3 px-3 text-center w-36">INPUT HITUNG FISIK</th>
                    <th className="py-3 px-3 text-right">SELISIH (FISIK - SISTEM)</th>
                    <th className="py-3 px-3 text-center">STATUS</th>
                    <th className="py-3 px-3">ALASAN SELISIH (WAJIB JIKA SELISIH)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {calculatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                        Belum ada barang gudang untuk di-opname.
                      </td>
                    </tr>
                  ) : (
                    calculatedItems.map((item) => {
                      const phys = physicalCounts[item.id] ?? item.sisaSistem;
                      const diff = phys - item.sisaSistem;
                      const isMatched = diff === 0;

                      return (
                        <tr key={item.id} className="hover:bg-amber-50/30 transition text-slate-800">
                          <td className="py-3 px-3 font-extrabold text-slate-900">
                            {item.name}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-700">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                              {item.unit}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                            {item.sisaSistem.toLocaleString('id-ID')}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <input
                              type="number"
                              inputMode="numeric"
                              value={phys}
                              onChange={(e) =>
                                handlePhysicalCountChange(item.id, Number(e.target.value))
                              }
                              className={`w-28 text-center text-sm font-extrabold px-2 py-1.5 rounded-xl border transition ${
                                isMatched
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                  : 'bg-rose-50 text-rose-900 border-rose-400 font-black'
                              }`}
                            />
                          </td>

                          <td className="py-3 px-3 text-right font-black text-sm">
                            {isMatched ? (
                              <span className="text-slate-400">0</span>
                            ) : diff > 0 ? (
                              <span className="text-emerald-700">+{diff.toLocaleString('id-ID')}</span>
                            ) : (
                              <span className="text-rose-700">{diff.toLocaleString('id-ID')}</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {isMatched ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>COCOK</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center space-x-1">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>SELISIH</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={opnameReasons[item.id] || ''}
                              onChange={(e) => handleReasonChange(item.id, e.target.value)}
                              placeholder={isMatched ? 'Tidak ada selisih...' : 'Wajib isi alasan selisih...'}
                              className={`w-full text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
                                !isMatched && !opnameReasons[item.id]
                                  ? 'border-rose-400 bg-rose-50/60 placeholder-rose-400 focus:border-rose-600'
                                  : 'border-slate-300 bg-white focus:border-amber-400'
                              }`}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Auto Adjustment & Submit Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoAdjust}
                  onChange={(e) => setAutoAdjust(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded-md border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
                <span>
                  Otomatis buat transaksi adjustment agar Sisa Sistem disesuaikan dengan Hasil Hitung Fisik.
                </span>
              </label>

              <button
                onClick={handleSaveOpname}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-md shadow-amber-500/20 transition cursor-pointer shrink-0"
              >
                <Save className="w-4 h-4 text-white" />
                <span>SIMPAN HASIL OPNAME FISIK</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Master Barang (Add / Edit) */}
      {isMasterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Layers className="w-5 h-5" />
                </span>
                <h3 className="font-extrabold text-base text-slate-900">
                  {editingMasterItem ? 'EDIT MASTER BARANG' : 'TAMBAH BARANG MASTER BARU'}
                </h3>
              </div>
              <button
                onClick={() => setIsMasterModalOpen(false)}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMaster} className="space-y-4 mt-4">
              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                  NAMA BARANG GUDANG
                </label>
                <input
                  type="text"
                  value={masterFormData.name}
                  onChange={(e) => setMasterFormData({ ...masterFormData, name: e.target.value })}
                  placeholder="Contoh: Popcorn Bucket 46oz XXI"
                  required
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                    SATUAN BARANG
                  </label>
                  <select
                    value={masterFormData.unit}
                    onChange={(e) => setMasterFormData({ ...masterFormData, unit: e.target.value })}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Box">Box</option>
                    <option value="Pack">Pack</option>
                    <option value="Roll">Roll</option>
                    <option value="Botol">Botol</option>
                    <option value="Kanister">Kanister</option>
                    <option value="Gallon">Gallon</option>
                    <option value="Bag">Bag (Karung)</option>
                    <option value="Kg">Kg</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                    KATEGORI BARANG
                  </label>
                  <select
                    value={masterFormData.category}
                    onChange={(e) => setMasterFormData({ ...masterFormData, category: e.target.value })}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                  >
                    <option value="Kemasan Cafe">Kemasan Cafe</option>
                    <option value="Bahan Baku">Bahan Baku</option>
                    <option value="Sanitasi">Sanitasi</option>
                    <option value="Atribut/Lainnya">Atribut/Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                    STOK AWAL (INITIAL)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={masterFormData.initialStock}
                    onChange={(e) => setMasterFormData({ ...masterFormData, initialStock: Number(e.target.value) })}
                    className="w-full text-xs font-extrabold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                    MIN STOK (ALERT)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={masterFormData.minStock}
                    onChange={(e) => setMasterFormData({ ...masterFormData, minStock: Number(e.target.value) })}
                    className="w-full text-xs font-extrabold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-600 uppercase block mb-1">
                  CATATAN / SPESIFIKASI
                </label>
                <input
                  type="text"
                  value={masterFormData.notes}
                  onChange={(e) => setMasterFormData({ ...masterFormData, notes: e.target.value })}
                  placeholder="Catatan opsional..."
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMasterModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase flex items-center space-x-1.5 transition cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Master</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal History Opname */}
      {isOpnameHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <History className="w-5 h-5" />
                </span>
                <h3 className="font-extrabold text-base text-slate-900">
                  RIWAYAT HASIL STOCK OPNAME ({selectedOutletObj?.name})
                </h3>
              </div>
              <button
                onClick={() => setIsOpnameHistoryOpen(false)}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {opnameHistory.filter((h) => h.outletId === selectedOutletId).length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold text-xs">
                  Belum ada riwayat stock opname yang disimpan di outlet ini.
                </div>
              ) : (
                opnameHistory
                  .filter((h) => h.outletId === selectedOutletId)
                  .map((history) => (
                    <div
                      key={history.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between font-black text-slate-900 border-b border-slate-200/80 pb-2">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-3.5 h-3.5 text-amber-600" />
                          <span>
                            {history.date} ({history.time})
                          </span>
                        </div>
                        <span className="text-slate-500 font-normal">
                          Petugas: <strong>{history.performedBy}</strong>
                        </span>
                      </div>

                      <div className="space-y-1">
                        {history.items.map((it) => (
                          <div
                            key={it.itemId}
                            className="flex items-center justify-between py-1 px-2 rounded-lg bg-white border border-slate-100 text-[11px]"
                          >
                            <span className="font-extrabold text-slate-800">
                              {it.itemName} ({it.unit})
                            </span>
                            <div className="flex items-center space-x-3">
                              <span>Sistem: {it.systemStock}</span>
                              <span>Fisik: {it.physicalStock}</span>
                              <span
                                className={`font-black ${
                                  it.difference === 0
                                    ? 'text-slate-400'
                                    : it.difference > 0
                                    ? 'text-emerald-700'
                                    : 'text-rose-700'
                                }`}
                              >
                                Selisih: {it.difference > 0 ? `+${it.difference}` : it.difference}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
