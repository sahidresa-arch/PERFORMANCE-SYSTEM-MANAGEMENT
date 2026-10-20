import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  User,
  CashierMonthlyProductRecord,
  CashierProductItem,
} from '../../types';
import { StorageService } from '../../lib/storage';
import {
  CupSoda,
  Coffee,
  GlassWater,
  Sparkles,
  Download,
  Search,
  Filter,
  ArrowUpRight,
  Layers,
  Award,
  TrendingUp,
  Users,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';

export interface BeverageCategoryDef {
  id: string;
  label: string;
  shortLabel: string;
  isBeverage: boolean;
  badgeBg: string;
  badgeText: string;
  barColor: string;
  headerBg: string;
}

export const BEVERAGE_CATEGORIES: BeverageCategoryDef[] = [
  {
    id: 'Minuman - Tea Series',
    label: 'Tea Series (Java Tea / Lemon Tea / Flavored Tea)',
    shortLabel: 'Tea Series',
    isBeverage: true,
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-900',
    barColor: 'bg-amber-500',
    headerBg: 'bg-amber-50/80 text-amber-950',
  },
  {
    id: 'Minuman - Coffee Series',
    label: 'Coffee Series (Kopi Susu / Latte / Americano)',
    shortLabel: 'Coffee Series',
    isBeverage: true,
    badgeBg: 'bg-stone-100 border-stone-300',
    badgeText: 'text-stone-800',
    barColor: 'bg-stone-700',
    headerBg: 'bg-stone-100/90 text-stone-900',
  },
  {
    id: 'Minuman - Soft Drink',
    label: 'Soft Drink & Carbonated (Cola / Sprite / Fanta / Soda)',
    shortLabel: 'Soft Drink',
    isBeverage: true,
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-900',
    barColor: 'bg-rose-600',
    headerBg: 'bg-rose-50/80 text-rose-950',
  },
  {
    id: 'Minuman - Non-Coffee & Milk',
    label: 'Non-Coffee, Milk & Choco (Matcha / Chocolate / Taro / Milo)',
    shortLabel: 'Milk & Non-Coffee',
    isBeverage: true,
    badgeBg: 'bg-purple-50 border-purple-200',
    badgeText: 'text-purple-900',
    barColor: 'bg-purple-600',
    headerBg: 'bg-purple-50/80 text-purple-950',
  },
  {
    id: 'Minuman - Juice & Blended',
    label: 'Blended, Slush & Mocktail (Smoothie / Squash / Yakult / Jus)',
    shortLabel: 'Blended & Mocktail',
    isBeverage: true,
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-900',
    barColor: 'bg-emerald-600',
    headerBg: 'bg-emerald-50/80 text-emerald-950',
  },
  {
    id: 'Minuman - Air Mineral & Kemasan',
    label: 'Air Mineral & Minuman Kemasan (Aqua / Botol / Kaleng)',
    shortLabel: 'Air Mineral & Botol',
    isBeverage: true,
    badgeBg: 'bg-sky-50 border-sky-200',
    badgeText: 'text-sky-900',
    barColor: 'bg-sky-600',
    headerBg: 'bg-sky-50/80 text-sky-950',
  },
  {
    id: 'Minuman - Lainnya',
    label: 'Minuman Lainnya (General Beverage)',
    shortLabel: 'Minuman Lainnya',
    isBeverage: true,
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-900',
    barColor: 'bg-indigo-600',
    headerBg: 'bg-indigo-50/80 text-indigo-950',
  },
  {
    id: 'Popcorn',
    label: 'Makanan - Popcorn',
    shortLabel: 'Popcorn (Non-Minuman)',
    isBeverage: false,
    badgeBg: 'bg-yellow-50 border-yellow-200',
    badgeText: 'text-yellow-900',
    barColor: 'bg-yellow-500',
    headerBg: 'bg-slate-100 text-slate-800',
  },
  {
    id: 'Combo',
    label: 'Paket Combo (Popcorn + Drink)',
    shortLabel: 'Paket Combo',
    isBeverage: false,
    badgeBg: 'bg-orange-50 border-orange-200',
    badgeText: 'text-orange-900',
    barColor: 'bg-orange-500',
    headerBg: 'bg-slate-100 text-slate-800',
  },
  {
    id: 'Snack & Bakery',
    label: 'Makanan - Snack, Gorengan & Bakery',
    shortLabel: 'Snack & Bakery',
    isBeverage: false,
    badgeBg: 'bg-slate-100 border-slate-200',
    badgeText: 'text-slate-700',
    barColor: 'bg-slate-500',
    headerBg: 'bg-slate-100 text-slate-800',
  },
];

/**
 * Deteksi otomatis kategori minuman / produk berdasarkan nama item & kategori tersimpan
 */
export function resolveProductItemCategory(
  name: string,
  explicitCategory?: string
): string {
  const cleanExplicit = (explicitCategory || '').trim();
  const knownExplicit = BEVERAGE_CATEGORIES.find(
    (c) => c.id.toLowerCase() === cleanExplicit.toLowerCase()
  );
  if (knownExplicit) {
    return knownExplicit.id;
  }

  const lower = (name || '').toLowerCase();

  // 1. Cek Non-Minuman terlebih dahulu jika nama jelas makanan/combo
  if (
    lower.includes('popcorn') ||
    lower.includes('caramel') && lower.includes('pop')
  ) {
    return 'Popcorn';
  }
  if (lower.includes('combo') || lower.includes('paket')) {
    return 'Combo';
  }
  if (
    lower.includes('sistagor') ||
    lower.includes('hotdog') ||
    lower.includes('hot dog') ||
    lower.includes('nacho') ||
    lower.includes('french fries') ||
    lower.includes('kentang') ||
    lower.includes('sosis') ||
    lower.includes('croissant') ||
    lower.includes('churros') ||
    lower.includes('roti') ||
    lower.includes('donut') ||
    lower.includes('donat') ||
    lower.includes('puff') ||
    lower.includes('dimsum') ||
    lower.includes('bakso') ||
    lower.includes('fish roll') ||
    lower.includes('corndog') ||
    lower.includes('corn dog')
  ) {
    return 'Snack & Bakery';
  }

  // 2. Deteksi Sub-Kategori Minuman Spesifik
  if (
    lower.includes('tea') ||
    lower.includes('teh') ||
    lower.includes('java tea') ||
    lower.includes('lemon tea') ||
    lower.includes('lychee tea') ||
    lower.includes('peach tea') ||
    lower.includes('thai tea') ||
    lower.includes('jasmine') ||
    lower.includes('earl grey') ||
    lower.includes('oolong')
  ) {
    return 'Minuman - Tea Series';
  }

  if (
    lower.includes('coffee') ||
    lower.includes('kopi') ||
    lower.includes('latte') ||
    lower.includes('cappuccino') ||
    lower.includes('americano') ||
    lower.includes('espresso') ||
    lower.includes('macchiato') ||
    lower.includes('mocha') ||
    lower.includes('moccacino') ||
    lower.includes('aren') ||
    lower.includes('affogato') ||
    lower.includes('cold brew')
  ) {
    return 'Minuman - Coffee Series';
  }

  if (
    lower.includes('cola') ||
    lower.includes('coke') ||
    lower.includes('sprite') ||
    lower.includes('fanta') ||
    lower.includes('pepsi') ||
    lower.includes('soda') ||
    lower.includes('root beer') ||
    lower.includes('aw ') ||
    lower.includes('a&w') ||
    lower.includes('soft drink') ||
    lower.includes('softdrink') ||
    lower.includes('carbonated')
  ) {
    return 'Minuman - Soft Drink';
  }

  if (
    lower.includes('matcha') ||
    lower.includes('choco') ||
    lower.includes('cokelat') ||
    lower.includes('coklat') ||
    lower.includes('taro') ||
    lower.includes('red velvet') ||
    lower.includes('milo') ||
    lower.includes('milk') ||
    lower.includes('susu') ||
    lower.includes('ovaltine') ||
    lower.includes('brown sugar') ||
    lower.includes('boba')
  ) {
    return 'Minuman - Non-Coffee & Milk';
  }

  if (
    lower.includes('juice') ||
    lower.includes('jus') ||
    lower.includes('slush') ||
    lower.includes('smoothie') ||
    lower.includes('squash') ||
    lower.includes('yakult') ||
    lower.includes('mocktail') ||
    lower.includes('blended') ||
    lower.includes('frappe') ||
    lower.includes('float') ||
    lower.includes('lemonade') ||
    lower.includes('orange') ||
    lower.includes('mango') ||
    lower.includes('strawberry') ||
    lower.includes('berry')
  ) {
    return 'Minuman - Juice & Blended';
  }

  if (
    lower.includes('aqua') ||
    lower.includes('mineral') ||
    lower.includes('air putih') ||
    lower.includes('ades') ||
    lower.includes('le minerale') ||
    lower.includes('vit ') ||
    lower.includes('pristine') ||
    lower.includes('botol') ||
    lower.includes('btl') ||
    lower.includes('kaleng') ||
    lower.includes('pokka') ||
    lower.includes('pucuk') ||
    lower.includes('sosro')
  ) {
    return 'Minuman - Air Mineral & Kemasan';
  }

  // Jika kategori tersimpan adalah 'Minuman' atau mengandung kata drink/ice/es/cup
  if (
    cleanExplicit.toLowerCase().includes('minuman') ||
    cleanExplicit.toLowerCase().includes('drink') ||
    cleanExplicit.toLowerCase().includes('beverage') ||
    lower.includes('ice ') ||
    lower.includes('iced ') ||
    lower.includes('es ') ||
    lower.includes('hot ') ||
    lower.includes('drink') ||
    lower.includes('cup')
  ) {
    return 'Minuman - Lainnya';
  }

  if (cleanExplicit.toLowerCase() === 'popcorn') return 'Popcorn';
  if (cleanExplicit.toLowerCase() === 'combo') return 'Combo';
  if (
    cleanExplicit.toLowerCase() === 'snack' ||
    cleanExplicit.toLowerCase() === 'bakery'
  ) {
    return 'Snack & Bakery';
  }

  // Default untuk halaman Minuman Perkategori: jika belum terdeteksi makanan, anggap Minuman Lainnya jika user menginput di item kasir
  return 'Minuman - Lainnya';
}

export function isBeverageCategoryId(categoryId: string): boolean {
  const found = BEVERAGE_CATEGORIES.find((c) => c.id === categoryId);
  return found ? found.isBeverage : categoryId.startsWith('Minuman');
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

const DAY_NAMES = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];

interface CashierBeverageCategoryViewProps {
  currentUser: User | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onNavigateToInput?: () => void;
}

interface AggregatedBeverageRow {
  key: string;
  name: string;
  unit: string;
  categoryId: string;
  dailyTotals: { [day: number]: number };
  totalMonthQty: number;
  selectedDayQty: number;
  cashierBreakdown: { [cashierName: string]: number };
  sourceRefs: Array<{
    recordId: string;
    outletId: string;
    cashierId: string;
    cashierName: string;
    itemId: string;
  }>;
}

export const CashierBeverageCategoryView: React.FC<
  CashierBeverageCategoryViewProps
> = ({ currentUser, selectedDate, onDateChange, onNavigateToInput }) => {
  const allOutlets = StorageService.getOutlets();
  const userAssignedAreaIds =
    currentUser?.role === 'area_manager'
      ? currentUser.assignedAreas && currentUser.assignedAreas.length > 0
        ? currentUser.assignedAreas
        : currentUser.areaId
        ? [currentUser.areaId]
        : []
      : null;

  const outlets =
    (currentUser?.role === 'manager' || currentUser?.role === 'cleaner') &&
    currentUser?.outletId
      ? allOutlets.filter((o) => o.id === currentUser.outletId)
      : userAssignedAreaIds && userAssignedAreaIds.length > 0
      ? allOutlets.filter((o) => userAssignedAreaIds.includes(o.areaId))
      : allOutlets;

  const isAdminOrArea =
    currentUser?.role === 'admin' || currentUser?.role === 'area_manager';

  const defaultOutletId =
    currentUser?.outletId || (outlets.length > 0 ? outlets[0].id : '');

  const [selectedOutletId, setSelectedOutletId] = useState<string>(defaultOutletId);
  const [selectedCashierFilter, setSelectedCashierFilter] = useState<string>('ALL');

  const parsedYear = Number(selectedDate.split('-')[0]) || new Date().getFullYear();
  const parsedMonth = Number(selectedDate.split('-')[1]) || new Date().getMonth() + 1;
  const activeDay = Number(selectedDate.split('-')[2]) || 1;

  const [selectedYear, setSelectedYear] = useState<number>(parsedYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(parsedMonth);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL_BEVERAGES');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [syncTick, setSyncTick] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const y = Number(selectedDate.split('-')[0]);
    const m = Number(selectedDate.split('-')[1]);
    if (y && m) {
      setSelectedYear(y);
      setSelectedMonth(m);
    }
  }, [selectedDate]);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      const t = e?.detail?.type;
      if (
        !t ||
        t === 'sdm-products' ||
        t === 'employees' ||
        t === 'remote-sync' ||
        t === 'all-reset'
      ) {
        setSyncTick((prev) => prev + 1);
      }
    };
    window.addEventListener('cinema-xxi-storage-update', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('cinema-xxi-storage-update', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const cashierList = useMemo(() => {
    if (selectedOutletId === 'ALL') {
      const allowedOutletIds = new Set(outlets.map((o) => o.id));
      return StorageService.getOutletCashiers().filter((c) =>
        allowedOutletIds.has(c.outletId)
      );
    }
    return StorageService.getOutletCashiers(selectedOutletId);
  }, [selectedOutletId, outlets, syncTick]);

  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Ambil seluruh record Tabel Excel Penjualan Item Produk Harian yang sesuai filter Outlet, Kasir, Bulan & Tahun
  const matchingRecords = useMemo(() => {
    const allRecords = StorageService.getCashierMonthlyProductsAll();
    const allowedOutletIds = new Set(outlets.map((o) => o.id));

    return allRecords.filter((rec) => {
      if (rec.year !== selectedYear || rec.month !== selectedMonth) return false;
      if (selectedOutletId === 'ALL') {
        if (!allowedOutletIds.has(rec.outletId)) return false;
      } else if (rec.outletId !== selectedOutletId) {
        return false;
      }
      if (
        selectedCashierFilter !== 'ALL' &&
        rec.cashierId !== selectedCashierFilter
      ) {
        return false;
      }
      return true;
    });
  }, [
    selectedOutletId,
    selectedCashierFilter,
    selectedYear,
    selectedMonth,
    outlets,
    syncTick,
  ]);

  // Gabungkan dan rincikan seluruh item produk dari Tabel Excel Penjualan Item Produk Harian
  const aggregatedItems = useMemo(() => {
    const map = new Map<string, AggregatedBeverageRow>();

    matchingRecords.forEach((rec) => {
      const cashierDisplayName =
        rec.cashierName ||
        cashierList.find((c) => c.id === rec.cashierId)?.name ||
        'Kasir XXI';

      (rec.items || []).forEach((item: CashierProductItem) => {
        const cleanName = (item.name || '').trim();
        if (!cleanName) return;

        const normKey = cleanName.toLowerCase();
        const resolvedCat = resolveProductItemCategory(cleanName, item.category);

        let entry = map.get(normKey);
        if (!entry) {
          entry = {
            key: normKey,
            name: cleanName,
            unit: (item.unit || 'CUP').toUpperCase(),
            categoryId: resolvedCat,
            dailyTotals: {},
            totalMonthQty: 0,
            selectedDayQty: 0,
            cashierBreakdown: {},
            sourceRefs: [],
          };
          map.set(normKey, entry);
        } else if (
          item.category &&
          BEVERAGE_CATEGORIES.some((c) => c.id === item.category)
        ) {
          entry.categoryId = item.category;
        }

        entry.sourceRefs.push({
          recordId: rec.id,
          outletId: rec.outletId,
          cashierId: rec.cashierId,
          cashierName: cashierDisplayName,
          itemId: item.id,
        });

        let itemTotalForThisCashier = 0;
        for (let d = 1; d <= daysInMonth; d++) {
          const qty = Number(rec.dailySales?.[d]?.[item.id] || 0);
          if (qty > 0) {
            entry.dailyTotals[d] = (entry.dailyTotals[d] || 0) + qty;
            entry.totalMonthQty += qty;
            itemTotalForThisCashier += qty;
            if (d === activeDay) {
              entry.selectedDayQty += qty;
            }
          }
        }

        if (itemTotalForThisCashier > 0) {
          entry.cashierBreakdown[cashierDisplayName] =
            (entry.cashierBreakdown[cashierDisplayName] || 0) +
            itemTotalForThisCashier;
        }
      });
    });

    return Array.from(map.values()).sort(
      (a, b) => b.totalMonthQty - a.totalMonthQty || a.name.localeCompare(b.name)
    );
  }, [matchingRecords, cashierList, daysInMonth, activeDay]);

  // Statistik per Kategori Minuman
  const categorySummaries = useMemo(() => {
    const beverageOnlyCats = BEVERAGE_CATEGORIES.filter((c) => c.isBeverage);
    const totalAllBeverageMonth = aggregatedItems
      .filter((it) => isBeverageCategoryId(it.categoryId))
      .reduce((acc, it) => acc + it.totalMonthQty, 0);

    const totalAllBeverageToday = aggregatedItems
      .filter((it) => isBeverageCategoryId(it.categoryId))
      .reduce((acc, it) => acc + it.selectedDayQty, 0);

    const cards = beverageOnlyCats.map((cat) => {
      const itemsInCat = aggregatedItems.filter((it) => it.categoryId === cat.id);
      const monthQty = itemsInCat.reduce((acc, it) => acc + it.totalMonthQty, 0);
      const todayQty = itemsInCat.reduce((acc, it) => acc + it.selectedDayQty, 0);
      const sharePct =
        totalAllBeverageMonth > 0 ? (monthQty / totalAllBeverageMonth) * 100 : 0;

      return {
        category: cat,
        skuCount: itemsInCat.length,
        monthQty,
        todayQty,
        sharePct,
        topItem: itemsInCat[0]?.name || '-',
        items: itemsInCat,
      };
    });

    return {
      totalAllBeverageMonth,
      totalAllBeverageToday,
      cards,
    };
  }, [aggregatedItems]);

  // Filter item yang ditampilkan di tabel matriks sesuai tab kategori & pencarian
  const filteredItems = useMemo(() => {
    return aggregatedItems.filter((item) => {
      if (activeCategoryFilter === 'ALL_BEVERAGES') {
        if (!isBeverageCategoryId(item.categoryId)) return false;
      } else if (activeCategoryFilter !== 'ALL_PRODUCTS') {
        if (item.categoryId !== activeCategoryFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchCat = item.categoryId.toLowerCase().includes(q);
        if (!matchName && !matchCat) return false;
      }
      return true;
    });
  }, [aggregatedItems, activeCategoryFilter, searchQuery]);

  // Kelompokkan filteredItems berdasarkan kategori untuk ditampilkan rapi di tabel
  const groupedFilteredItems = useMemo(() => {
    const groups: Array<{
      category: BeverageCategoryDef;
      items: AggregatedBeverageRow[];
      dailySubtotals: { [day: number]: number };
      monthSubtotal: number;
    }> = [];

    BEVERAGE_CATEGORIES.forEach((cat) => {
      const items = filteredItems.filter((it) => it.categoryId === cat.id);
      if (items.length === 0) return;

      const dailySubtotals: { [day: number]: number } = {};
      let monthSubtotal = 0;

      items.forEach((it) => {
        monthSubtotal += it.totalMonthQty;
        for (let d = 1; d <= daysInMonth; d++) {
          const q = it.dailyTotals[d] || 0;
          if (q > 0) {
            dailySubtotals[d] = (dailySubtotals[d] || 0) + q;
          }
        }
      });

      groups.push({
        category: cat,
        items,
        dailySubtotals,
        monthSubtotal,
      });
    });

    return groups;
  }, [filteredItems, daysInMonth]);

  // Ubah kategori item langsung & simpan kembali ke record Tabel Excel Penjualan Item Produk Harian
  const handleChangeItemCategory = (
    row: AggregatedBeverageRow,
    newCategoryId: string
  ) => {
    const allRecords = StorageService.getCashierMonthlyProductsAll();
    const targetRecordIds = new Set(row.sourceRefs.map((r) => r.recordId));

    allRecords.forEach((rec) => {
      if (!targetRecordIds.has(rec.id)) return;
      let changed = false;
      const updatedItems = (rec.items || []).map((it) => {
        if (it.name.trim().toLowerCase() === row.key) {
          changed = true;
          return { ...it, category: newCategoryId };
        }
        return it;
      });
      if (changed) {
        StorageService.saveCashierMonthlyProducts({
          ...rec,
          items: updatedItems,
        });
      }
    });

    setSyncTick((prev) => prev + 1);
    const catObj = BEVERAGE_CATEGORIES.find((c) => c.id === newCategoryId);
    triggerToast(
      `Kategori "${row.name}" diperbarui menjadi ${catObj?.shortLabel || newCategoryId}.`
    );
  };

  // Export Excel Rincian Minuman Perkategori
  const handleExportBeverageExcel = () => {
    const exportRows: Array<Record<string, any>> = [];
    let no = 1;

    groupedFilteredItems.forEach((group) => {
      group.items.forEach((item) => {
        const rowObj: Record<string, any> = {
          NO: no++,
          'KATEGORI MINUMAN': group.category.shortLabel,
          'NAMA ITEM MINUMAN / PRODUK': item.name,
        };
        for (let d = 1; d <= daysInMonth; d++) {
          rowObj[`Tgl ${d}`] = item.dailyTotals[d] || 0;
        }
        rowObj['TOTAL BULAN INI'] = item.totalMonthQty;
        rowObj['RINCIAN PER KASIR'] = Object.entries(item.cashierBreakdown)
          .map(([cName, q]) => `${cName} (${q})`)
          .join(', ');
        exportRows.push(rowObj);
      });

      // Baris Subtotal Kategori
      const subRow: Record<string, any> = {
        NO: '',
        'KATEGORI MINUMAN': `SUBTOTAL ${group.category.shortLabel.toUpperCase()}`,
        'NAMA ITEM MINUMAN / PRODUK': `${group.items.length} Item Produk`,
      };
      for (let d = 1; d <= daysInMonth; d++) {
        subRow[`Tgl ${d}`] = group.dailySubtotals[d] || 0;
      }
      subRow['TOTAL BULAN INI'] = group.monthSubtotal;
      subRow['RINCIAN PER KASIR'] = '';
      exportRows.push(subRow);
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Minuman Perkategori');
    const outletLabel =
      selectedOutletId === 'ALL'
        ? 'Semua_Outlet'
        : outlets.find((o) => o.id === selectedOutletId)?.name || 'Outlet';
    const safeOutlet = outletLabel.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(
      wb,
      `Rekap_Minuman_Perkategori_${safeOutlet}_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}.xlsx`
    );
  };

  // Cari Top Kasir Penjual Minuman Bulan Ini
  const topBeverageCashier = useMemo(() => {
    const totalsByCashier: Record<string, number> = {};
    aggregatedItems
      .filter((it) => isBeverageCategoryId(it.categoryId))
      .forEach((it) => {
        Object.entries(it.cashierBreakdown).forEach(([cName, qty]) => {
          totalsByCashier[cName] = (totalsByCashier[cName] || 0) + qty;
        });
      });
    const sorted = Object.entries(totalsByCashier).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? { name: sorted[0][0], qty: sorted[0][1] } : null;
  }, [aggregatedItems]);

  // Cari Kategori Minuman Terlaris
  const topBeverageCategory = useMemo(() => {
    const sorted = [...categorySummaries.cards].sort(
      (a, b) => b.monthQty - a.monthQty
    );
    return sorted[0] && sorted[0].monthQty > 0 ? sorted[0] : null;
  }, [categorySummaries]);

  return (
    <div className="space-y-5 pb-10">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl bg-purple-950 text-[#FACC15] border border-amber-400/40 shadow-xl text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#3D1A5E] via-[#581c87] to-[#4c1d95] p-5 text-white shadow-md border border-amber-400/30">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <CupSoda className="w-4 h-4" />
              <span>Performance SDM &bull; Submenu Analitik Produk Kasir</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Rincian Penjualan Minuman Perkategori
            </h1>
            <p className="text-xs text-purple-100/90 max-w-3xl">
              Terintegrasi otomatis dari inputan item produk kasir pada{' '}
              <strong className="text-[#FACC15]">
                Tabel Excel Penjualan Item Produk Harian
              </strong>
              . Mengelompokkan setiap item ke dalam sub-kategori minuman (Tea Series,
              Coffee Series, Soft Drink, Non-Coffee &amp; Milk, Blended/Juice, hingga
              Air Mineral).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onNavigateToInput && (
              <button
                type="button"
                onClick={onNavigateToInput}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Buka Tabel Excel Input Item Kasir</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleExportBeverageExcel}
              disabled={filteredItems.length === 0}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1.5 border border-white/20 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#FACC15]" />
              <span>Export Excel Perkategori</span>
            </button>
          </div>
        </div>

        {/* Filter Bar (Outlet, Kasir, Bulan, Tahun, Tanggal Aktif) */}
        <div className="mt-4 pt-4 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-200 mb-1">
              Filter Outlet XXI
            </label>
            <select
              value={selectedOutletId}
              onChange={(e) => {
                setSelectedOutletId(e.target.value);
                setSelectedCashierFilter('ALL');
              }}
              className="w-full px-3 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold border border-purple-200 outline-hidden"
            >
              {isAdminOrArea && (
                <option value="ALL">Semua Outlet ({outlets.length} Outlet)</option>
              )}
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-200 mb-1">
              Filter SDM Kasir
            </label>
            <select
              value={selectedCashierFilter}
              onChange={(e) => setSelectedCashierFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold border border-purple-200 outline-hidden"
            >
              <option value="ALL">Semua Kasir (Gabungan)</option>
              {cashierList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.jabatan ? `(${c.jabatan})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-200 mb-1">
              Bulan Rekap
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                const nextM = Number(e.target.value);
                setSelectedMonth(nextM);
                const dStr = String(Math.min(activeDay, 28)).padStart(2, '0');
                onDateChange(
                  `${selectedYear}-${String(nextM).padStart(2, '0')}-${dStr}`
                );
              }}
              className="w-full px-3 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold border border-purple-200 outline-hidden"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-200 mb-1">
              Tahun Rekap
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                const nextY = Number(e.target.value);
                setSelectedYear(nextY);
                const dStr = String(Math.min(activeDay, 28)).padStart(2, '0');
                onDateChange(
                  `${nextY}-${String(selectedMonth).padStart(2, '0')}-${dStr}`
                );
              }}
              className="w-full px-3 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold border border-purple-200 outline-hidden"
            >
              {[2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-200 mb-1">
              Highlight Tanggal Harian
            </label>
            <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-amber-300">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>
                Tgl {activeDay} {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Kartu KPI Ringkasan Minuman Perkategori */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>TOTAL MINUMAN (BULAN INI)</span>
            <CupSoda className="w-4 h-4 text-purple-700" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono tabular-nums">
            {categorySummaries.totalAllBeverageMonth.toLocaleString('id-ID')}{' '}
            <span className="text-xs font-bold text-slate-500">Cup/Pcs</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Hari terpilih (Tgl {activeDay}):{' '}
            <strong className="text-purple-800">
              {categorySummaries.totalAllBeverageToday.toLocaleString('id-ID')} Cup
            </strong>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>KATEGORI MINUMAN TERLARIS</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-base font-black text-slate-900 truncate">
            {topBeverageCategory
              ? topBeverageCategory.category.shortLabel
              : 'Belum Ada Input'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {topBeverageCategory ? (
              <>
                Terjual{' '}
                <strong className="text-amber-700">
                  {topBeverageCategory.monthQty.toLocaleString('id-ID')} Cup
                </strong>{' '}
                ({topBeverageCategory.sharePct.toFixed(1)}% dari total minuman)
              </>
            ) : (
              'Isi di Tabel Excel Item Produk Harian'
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>PRODUK MINUMAN TERLARIS #1</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          {(() => {
            const topBevItem = aggregatedItems.find((it) =>
              isBeverageCategoryId(it.categoryId)
            );
            return (
              <>
                <div className="mt-2 text-base font-black text-slate-900 truncate">
                  {topBevItem && topBevItem.totalMonthQty > 0
                    ? topBevItem.name
                    : 'Belum Ada Data'}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {topBevItem && topBevItem.totalMonthQty > 0 ? (
                    <>
                      Total{' '}
                      <strong className="text-emerald-700">
                        {topBevItem.totalMonthQty.toLocaleString('id-ID')}{' '}
                        {topBevItem.unit}
                      </strong>{' '}
                      bulan ini
                    </>
                  ) : (
                    'Menunggu input penjualan item harian'
                  )}
                </div>
              </>
            );
          })()}
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>TOP SDM PENJUAL MINUMAN</span>
            <Award className="w-4 h-4 text-purple-700" />
          </div>
          <div className="mt-2 text-base font-black text-slate-900 truncate">
            {topBeverageCashier ? topBeverageCashier.name : 'Belum Ada Data'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {topBeverageCashier ? (
              <>
                Kontribusi{' '}
                <strong className="text-purple-800">
                  {topBeverageCashier.qty.toLocaleString('id-ID')} Cup/Pcs
                </strong>{' '}
                minuman
              </>
            ) : (
              'Otomatis dihitung dari tabel kasir'
            )}
          </div>
        </div>
      </div>

      {/* Grid Rincian Kartu Sub-Kategori Minuman */}
      <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-purple-700" />
              <span>Komposisi &amp; Rincian Minuman Per Kategori</span>
            </h2>
            <p className="text-xs text-slate-500">
              Klik pada salah satu kartu kategori di bawah untuk memfilter tabel
              matriks harian.
            </p>
          </div>
          {activeCategoryFilter !== 'ALL_BEVERAGES' && (
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('ALL_BEVERAGES')}
              className="text-xs font-bold text-purple-700 hover:text-purple-950 underline cursor-pointer"
            >
              Tampilkan Semua Kategori Minuman
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {categorySummaries.cards.map((card) => {
            const isSelected = activeCategoryFilter === card.category.id;
            return (
              <button
                key={card.category.id}
                type="button"
                onClick={() =>
                  setActiveCategoryFilter((prev) =>
                    prev === card.category.id ? 'ALL_BEVERAGES' : card.category.id
                  )
                }
                className={`text-left p-3.5 rounded-2xl border transition cursor-pointer ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:border-purple-300 bg-slate-50/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-900 truncate">
                    {card.category.shortLabel}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-500">
                    {card.skuCount} Item
                  </span>
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <div className="text-xl font-black text-slate-900 font-mono tabular-nums">
                    {card.monthQty.toLocaleString('id-ID')}{' '}
                    <span className="text-[10px] font-semibold text-slate-500">
                      Cup/Pcs
                    </span>
                  </div>
                  <div className="text-xs font-bold text-purple-800 font-mono">
                    {card.sharePct.toFixed(1)}%
                  </div>
                </div>

                {/* Progress Bar Share */}
                <div className="mt-2 w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full ${card.category.barColor} transition-all duration-300`}
                    style={{ width: `${Math.min(100, card.sharePct)}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="truncate max-w-[150px]">
                    Top: <strong className="text-slate-700">{card.topItem}</strong>
                  </span>
                  <span>Tgl {activeDay}: {card.todayQty}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabel Matriks Harian (Tanggal 1 - 31) Rincian Minuman Perkategori */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar Filter Kategori & Search */}
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('ALL_BEVERAGES')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeCategoryFilter === 'ALL_BEVERAGES'
                  ? 'bg-purple-900 text-[#FACC15] shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Semua Minuman
            </button>
            {BEVERAGE_CATEGORIES.filter((c) => c.isBeverage).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeCategoryFilter === cat.id
                    ? 'bg-purple-900 text-[#FACC15] shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {cat.shortLabel}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('ALL_PRODUCTS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeCategoryFilter === 'ALL_PRODUCTS'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              + Lihat Popcorn/Combo/Snack
            </button>
          </div>

          <div className="relative min-w-[250px]">
            <Search className="w-3.5 h-3.5 absolute inset-y-0 left-3 my-auto text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama minuman / kategori..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 outline-hidden focus:border-purple-500"
            />
          </div>
        </div>

        {/* Spreadsheet Matrix 1 - 31 */}
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-[11px] text-center border-collapse">
            <thead className="sticky top-0 z-20 font-black uppercase tracking-wider border-b border-slate-200 bg-slate-100 text-slate-700">
              <tr>
                <th className="py-2.5 px-2 border-r border-slate-200 w-10">NO</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-left min-w-[220px] sticky left-0 bg-slate-100 z-30">
                  NAMA ITEM MINUMAN / PRODUK
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 text-left min-w-[165px] bg-slate-100">
                  KATEGORI MINUMAN
                </th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const dateObj = new Date(selectedYear, selectedMonth - 1, day);
                  const dayName = DAY_NAMES[dateObj.getDay()];
                  const isWeekend = dayName === 'SAB' || dayName === 'MIN';
                  const isSelectedDay = day === activeDay;

                  return (
                    <th
                      key={day}
                      className={`py-2 px-1 border-r border-slate-200 min-w-[42px] ${
                        isSelectedDay
                          ? 'bg-purple-800 text-[#FACC15] font-black'
                          : isWeekend
                          ? 'bg-amber-100 text-amber-900 font-black'
                          : ''
                      }`}
                    >
                      <div className="text-[11px] font-black">{day}</div>
                      <div className="text-[9px] opacity-80 font-semibold">
                        {dayName}
                      </div>
                    </th>
                  );
                })}
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[80px] bg-amber-100 text-amber-900 font-black">
                  TOTAL
                </th>
                <th className="py-2.5 px-3 min-w-[180px] bg-slate-100 text-left text-slate-700">
                  RINCIAN KASIR
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {groupedFilteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={daysInMonth + 5}
                    className="py-12 px-4 text-center text-xs text-slate-500"
                  >
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <CupSoda className="w-8 h-8 text-slate-300" />
                      <div className="max-w-md space-y-1">
                        <p className="font-bold text-slate-700">
                          Belum ada data rincian item minuman pada periode ini.
                        </p>
                        <p className="text-slate-400">
                          Data pada halaman ini otomatis diambil dari inputan produk di{' '}
                          <strong>
                            Input Sales &amp; Item Kasir &rarr; Tabel Excel Penjualan
                            Item Produk Harian
                          </strong>
                          .
                        </p>
                      </div>
                      {onNavigateToInput && (
                        <button
                          type="button"
                          onClick={onNavigateToInput}
                          className="px-4 py-2 rounded-xl bg-purple-800 hover:bg-purple-700 text-[#FACC15] font-black text-xs flex items-center space-x-1.5 shadow-2xs transition cursor-pointer"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>Input Item di Tabel Excel Kasir Sekarang</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                groupedFilteredItems.map((group) => (
                  <React.Fragment key={group.category.id}>
                    {/* Baris Header Kelompok Kategori */}
                    <tr className={`${group.category.headerBg} border-y border-slate-200`}>
                      <td
                        colSpan={daysInMonth + 5}
                        className="py-2 px-3 text-left font-black text-xs uppercase tracking-wider"
                      >
                        <div className="flex items-center justify-between">
                          <span>
                            {group.category.label} ({group.items.length} Item)
                          </span>
                          <span className="font-mono">
                            Subtotal Kategori:{' '}
                            {group.monthSubtotal.toLocaleString('id-ID')} Cup/Pcs
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Baris Item di dalam Kategori */}
                    {group.items.map((item, idx) => (
                      <tr
                        key={item.key}
                        className="hover:bg-amber-50/40 transition bg-white"
                      >
                        <td className="py-2 px-2 border-r border-slate-200 font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-left font-bold text-slate-900 sticky left-0 bg-white z-10 min-w-[220px]">
                          {item.name}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 text-left">
                          <select
                            value={item.categoryId}
                            onChange={(e) =>
                              handleChangeItemCategory(item, e.target.value)
                            }
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-[11px] font-bold text-slate-800 outline-hidden focus:border-purple-500 cursor-pointer"
                            title="Ubah sub-kategori minuman/produk ini"
                          >
                            {BEVERAGE_CATEGORIES.map((catOpt) => (
                              <option key={catOpt.id} value={catOpt.id}>
                                {catOpt.shortLabel}
                              </option>
                            ))}
                          </select>
                        </td>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                          (day) => {
                            const val = item.dailyTotals[day] || 0;
                            const isSelectedDay = day === activeDay;
                            return (
                              <td
                                key={day}
                                className={`py-1.5 px-1 border-r border-slate-200 font-mono tabular-nums ${
                                  isSelectedDay ? 'bg-purple-50/80' : ''
                                } ${
                                  val > 0
                                    ? 'text-emerald-900 font-black bg-emerald-50/60'
                                    : 'text-slate-300'
                                }`}
                              >
                                {val > 0 ? val : '-'}
                              </td>
                            );
                          }
                        )}
                        <td className="py-2 px-3 border-r border-slate-200 font-black font-mono tabular-nums text-amber-950 bg-amber-50/70">
                          {item.totalMonthQty.toLocaleString('id-ID')}
                        </td>
                        <td className="py-1.5 px-3 text-left text-[10px] text-slate-600">
                          {Object.entries(item.cashierBreakdown).length > 0 ? (
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              {Object.entries(item.cashierBreakdown).map(
                                ([cName, q]) => (
                                  <span key={cName}>
                                    <strong className="text-slate-800">{cName}:</strong>{' '}
                                    {q}
                                  </span>
                                )
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Belum terjual</span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {/* Baris Subtotal Per Kategori */}
                    <tr className="bg-slate-100/90 font-black text-slate-800 border-b-2 border-slate-200">
                      <td colSpan={3} className="py-2 px-3 text-right uppercase text-[10px] border-r border-slate-200">
                        Subtotal {group.category.shortLabel}
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                        (day) => {
                          const sub = group.dailySubtotals[day] || 0;
                          return (
                            <td
                              key={day}
                              className="py-2 px-1 border-r border-slate-200 font-mono tabular-nums text-[11px]"
                            >
                              {sub > 0 ? sub : '-'}
                            </td>
                          );
                        }
                      )}
                      <td className="py-2 px-3 border-r border-slate-200 font-mono tabular-nums bg-amber-100/80 text-amber-950">
                        {group.monthSubtotal.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 px-3 text-left text-[10px] text-slate-500">
                        {group.items.length} SKU
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
            {filteredItems.length > 0 && (
              <tfoot>
                <tr className="bg-purple-950 text-white font-black text-[11px]">
                  <td colSpan={3} className="py-3 px-4 text-left uppercase">
                    GRAND TOTAL ITEM DITAMPILKAN ({MONTH_NAMES[selectedMonth - 1]}{' '}
                    {selectedYear})
                  </td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                    (day) => {
                      const dayGrand = filteredItems.reduce(
                        (acc, it) => acc + (it.dailyTotals[day] || 0),
                        0
                      );
                      return (
                        <td
                          key={day}
                          className="py-3 px-1 border-r border-purple-900 font-mono tabular-nums text-[#FACC15]"
                        >
                          {dayGrand > 0 ? dayGrand : '-'}
                        </td>
                      );
                    }
                  )}
                  <td className="py-3 px-3 bg-amber-400 text-slate-950 font-mono tabular-nums text-xs font-black">
                    {filteredItems
                      .reduce((acc, it) => acc + it.totalMonthQty, 0)
                      .toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 text-left text-[10px] text-purple-200">
                    {filteredItems.length} Total Baris Produk
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
