export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'area_manager' | 'manager' | 'cleaner';
  outletId?: string; // If manager or cleaner, restricted to this outlet
  areaId?: string; // If area_manager, restricted to this area
  assignedAreas?: string[]; // Optional array of area IDs
  password?: string;
  isActive?: boolean;
}

export interface Area {
  id: string;
  name: string;
  targetArea: number;
}

export interface Outlet {
  id: string;
  name: string;
  areaId: string;
  targetHead: number;
  umr?: number;
  class?: string;
  studios?: { name: string; capacity: number }[];
}

export interface ShowSaleInput {
  showNumber: number; // 1 to 5
  omsetCinema: number;
  omsetFnB: number;
  bill: number;
  penonton: number;
  updatedAt?: string;
  isFilled: boolean;
  isLocked?: boolean;
}

export interface DailySalesRecord {
  id: string;
  outletId: string;
  date: string; // YYYY-MM-DD
  shows: ShowSaleInput[];
  notes?: string;
  isMigrated?: boolean;
}

export interface ComputedShowMetrics {
  omsetCinema: number;
  omsetFnB: number;
  totalOmset: number;
  bill: number;
  penonton: number;
  dayaSerap: number; // %
  head: number; // SPH (Rp)
  at: number; // Avg Transaksi (Rp)
  targetHead: number;
  achievement: number; // %
  selisih: number; // Rp
  gboPercent: number; // %
}

export interface BakingProduct {
  id: number;
  name: string;
  unit: string; // PCS, BTL, TPIS
  targetDefault: number;
}

export interface BakingSaleRecord {
  id: string;
  outletId: string;
  year: number;
  month: number; // 1 to 12
  dailySales: { [day: number]: { [productId: number]: number } };
  productTargets: { [productId: number]: number };
}

export interface ToiletChecklist {
  bau: 'B' | 'K' | 'R' | '-' | '';
  lantai: 'B' | 'K' | 'R' | '-' | '';
  dinding: 'B' | 'K' | 'R' | '-' | '';
  pintu: 'B' | 'K' | 'R' | '-' | '';
  tSampah: 'B' | 'K' | 'R' | '-' | '';
  cermin: 'B' | 'K' | 'R' | '-' | '';
  closet: 'B' | 'K' | 'R' | '-' | '';
  urinoir: 'B' | 'K' | 'R' | '-' | '';
  tissu: 'B' | 'K' | 'R' | '-' | '';
  wastafel: 'B' | 'K' | 'R' | '-' | '';
  soap: 'B' | 'K' | 'R' | '-' | '';
  janitor: 'B' | 'K' | 'R' | '-' | '';
  lampu: 'B' | 'K' | 'R' | '-' | '';
  floorDrain: 'B' | 'K' | 'R' | '-' | '';
  calmatic: 'B' | 'K' | 'R' | '-' | '';
  calfresh: 'B' | 'K' | 'R' | '-' | '';
}

export interface ToiletInspectionRecord {
  id: string;
  outletId: string;
  date: string;
  showNumber: number; // 1 to 5
  type: 'Pria' | 'Wanita';
  inspectorName: string;
  time: string;
  notes?: string;
  checklist: ToiletChecklist;
  status: 'Sudah Lapor' | 'Belum Lapor';
}

export interface StudioOccupancyShow {
  studioName: string;
  capacity: number;
  shows: { [showNum: number]: number }; // penonton per show 1-6
  notes?: string;
}

export interface StudioOccupancyRecord {
  id: string;
  outletId: string;
  date: string;
  studios: StudioOccupancyShow[];
}

export interface MovieScreeningRecord {
  id: string;
  outletId: string;
  date: string;
  studioName: string;
  movieTitle: string;
  genre: 'Action' | 'Drama' | 'Horror' | 'Comedy' | 'Family' | 'Religion' | 'Animation' | 'Thriller' | 'Romance' | 'Sci-Fi' | 'Adventure' | 'Fantasy' | 'Biography';
  capacity: number;
  shows: { [showNum: number]: number }; // show 1-6 penonton
}

export interface SystemConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseConnected: boolean;
  mistralApiKey: string;
  ocrProvider: 'gemini' | 'mistral';
  activeTheme: 'gold_dark' | 'fresh_light';
}

export interface OutletAdministrationRecord {
  id: string;
  outletId: string;
  month: string; // YYYY-MM
  cogs: number;
  adjustment: number;
  spoil: number;
  waste: number;
  usage: number;
  updatedAt?: string;
}

export interface BopoRecord {
  id: string;
  outletId: string; // 'ALL' or specific outlet id
  month: string; // YYYY-MM
  pendapatanTiket: number;
  pendapatanFnb: number;
  pendapatanLain: number;
  biayaGaji: number;
  biayaSewa: number;
  biayaUtilitas: number;
  biayaMarketing: number;
  biayaPemeliharaan: number;
  biayaLainnya: number;
  updatedAt?: string;
}

export interface Employee {
  id: string;
  nik: string;
  name: string;
  jabatan: string;
  divisi: 'Cinema' | 'F&B' | 'Kasir' | 'Teknisi' | 'Cleaning' | 'Admin' | 'Manager';
  outletId: string;
  gender: 'L' | 'P';
  tanggalLahir?: string; // YYYY-MM-DD
  statusKerja: 'Tetap' | 'Kontrak' | 'Freelance' | 'Probation' | 'Magang' | 'Resign' | 'Terminate';
  tanggalKontrak: string; // YYYY-MM-DD
  habisKontrak: string; // YYYY-MM-DD
  phone: string;
  photoUrl?: string;
}

export interface EmployeeKpiRecord {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  score: number; // 0 - 100
  notes: string;
  gradedBy: string;
}

export interface LostAndFoundRecord {
  id: string;
  outletId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  location: string;
  showNumber?: number;
  category: 'Elektronik/HP' | 'Dompet/Dokumen' | 'Kunci' | 'Pakaian/Aksesoris' | 'Kacamata' | 'Lainnya';
  itemName: string;
  description: string;
  finderName: string;
  status: 'Tersimpan' | 'Dikembalikan' | 'Disposal';
  claimedBy?: string;
  claimedPhone?: string;
  claimedIdentity?: string;
  claimedDate?: string;
  notes?: string;
}

export interface WarehouseItem {
  id: string;
  outletId: string;
  name: string;
  unit: string;
  initialStock: number;
  minStock: number;
  category?: string;
  notes?: string;
}

export interface StockTransaction {
  id: string;
  outletId: string;
  itemId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: 'IN' | 'OUT';
  qty: number;
  notes: string;
  createdBy: string;
}

export interface StockOpnameItemResult {
  itemId: string;
  itemName: string;
  unit: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
  reason?: string;
}

export interface StockOpnameHistory {
  id: string;
  outletId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  performedBy: string;
  items: StockOpnameItemResult[];
  notes?: string;
  autoAdjusted?: boolean;
}

export interface CashierShowSaleInput {
  showNumber: number; // 1 to 5
  omsetCinema: number;
  omsetFnB: number; // Total F&B (omsetOffline + omsetMolling)
  omsetOffline?: number;
  omsetMolling?: number;
  bill: number;
  penonton: number; // Auto-synced from Outlet DailySalesRecord
  updatedAt?: string;
  isFilled: boolean;
  isLocked?: boolean;
}

export interface CashierDailyPerformanceRecord {
  id: string; // `${outletId}_${cashierId}_${date}`
  outletId: string;
  cashierId: string;
  cashierName: string;
  cashierNik?: string;
  date: string; // YYYY-MM-DD
  shows: CashierShowSaleInput[];
  notes?: string;
  updatedAt?: string;
}

export interface CashierProductItem {
  id: string;
  name: string;
  unit: string; // PCS, CUP, BOX, COMBO, dll
  category?: string;
}

export interface CashierMonthlyProductRecord {
  id: string; // `${outletId}_${cashierId}_${year}_${month}`
  outletId: string;
  cashierId: string;
  cashierName: string;
  year: number;
  month: number; // 1 to 12
  items: CashierProductItem[];
  dailySales: { [day: number]: { [itemId: string]: number } };
  updatedAt?: string;
}

export interface DailySectionSalesRecord {
  id: string; // `${outletId}_${date}`
  outletId: string;
  date: string; // YYYY-MM-DD
  omsetCafeBox: number;
  cafeBoxCashierId?: string;
  cafeBoxCashierName?: string;
  omsetGerobak: number;
  omsetDelivery: number;
  omsetGofood: number;
  omsetGrabfood: number;
  omsetShopeefood: number;
  notes?: string;
  updatedAt?: string;
}



