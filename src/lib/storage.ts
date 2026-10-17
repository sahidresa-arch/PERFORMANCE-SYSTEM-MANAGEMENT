import {
  User,
  Area,
  Outlet,
  DailySalesRecord,
  ShowSaleInput,
  BakingSaleRecord,
  ToiletInspectionRecord,
  StudioOccupancyRecord,
  MovieScreeningRecord,
  SystemConfig,
  ComputedShowMetrics,
  OutletAdministrationRecord,
  BopoRecord,
  Employee,
  EmployeeKpiRecord,
  LostAndFoundRecord,
  WarehouseItem,
  StockTransaction,
  StockOpnameHistory,
} from '../types';
import {
  INITIAL_AREAS,
  INITIAL_OUTLETS,
  INITIAL_USERS,
  BAKING_PRODUCTS,
} from './constants';
import { MIGRATED_SALES_2025 } from './data/sales2025Data';
import { MIGRATED_SALES_2026 } from './data/sales2026Data';
import { MIGRATED_OCCUPANCY_RECORDS } from './data/migratedOccupancyData';

const KEYS = {
  USER: 'cinema_xxi_current_user',
  USERS_LIST: 'cinema_xxi_users_list',
  AREAS: 'cinema_xxi_areas',
  OUTLETS: 'cinema_xxi_outlets',
  SALES: 'cinema_xxi_daily_sales',
  BAKING: 'cinema_xxi_baking_sales',
  INSPECTION: 'cinema_xxi_toilet_inspections',
  OCCUPANCY: 'cinema_xxi_occupancy_records',
  MOVIES: 'cinema_xxi_movies_history',
  CONFIG: 'cinema_xxi_config',
  GENRE_REGISTRY: 'cinema_xxi_movie_genres',
  ADMINISTRATION: 'cinema_xxi_outlet_administration',
  BOPO: 'cinema_xxi_bopo_records',
  EMPLOYEES: 'cinema_xxi_employees',
  EMPLOYEE_KPIS: 'cinema_xxi_employee_kpis',
  LOST_FOUND: 'cinema_xxi_lost_and_found',
  WAREHOUSE_ITEMS: 'cinema_xxi_warehouse_items',
  STOCK_TRANSACTIONS: 'cinema_xxi_stock_transactions',
  STOCK_OPNAME_HISTORY: 'cinema_xxi_stock_opname_history',
};

// Helper perbandingan teks & regex yang aman
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function cleanTitleForCompare(t: string): string {
  return (t || '')
    .toUpperCase()
    .replace(/\[\s*(?:\d{1,2}\+|SU|BO|PG|R|D\d*)\s*\]/gi, '')
    .replace(/\(\s*(?:\d{1,2}\+|SU|BO|PG|R|D\d*)\s*\)/gi, '')
    .replace(/\b(?:13\+|17\+|21\+|SU|BO|PG-?13?|R13\+|D17\+)\b/gi, '')
    .replace(/[^A-Z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Katalog Terverifikasi Resmi Film Bioskop Cinema XXI (Box Office 2024-2025)
// Mencegah kesalahan alokasi genre film di seluruh outlet
export const KNOWN_FILM_GENRES: {
  [cleanTitle: string]: 'Action' | 'Drama' | 'Horror' | 'Comedy' | 'Family' | 'Religion' | 'Animation';
} = {
  // === HORROR ===
  'SIKSA KUBUR': 'Horror',
  'BADARAWUHI DI DESA PENARI': 'Horror',
  'BADARAWUHI': 'Horror',
  'KKN DI DESA PENARI': 'Horror',
  'VINA: SEBELUM 7 HARI': 'Horror',
  'VINA SEBELUM 7 HARI': 'Horror',
  'VINA': 'Horror',
  'KUASA GELAP': 'Horror',
  'LEMBAYUNG': 'Horror',
  'SEKAWAN LIMO': 'Horror',
  'KEMAH TERLARANG': 'Horror',
  'KEMAH TERLARANG: KESURUPAN MASSAL': 'Horror',
  'TEBUSAN DOSA': 'Horror',
  'DANYANG: MAHAR MAUT': 'Horror',
  'DANYANG': 'Horror',
  'SANTET SEGORO PITU': 'Horror',
  'SANTET': 'Horror',
  'PETAK UMPET': 'Horror',
  'JURNAL RISA': 'Horror',
  'JURNAL RISA BY RISA SARASWATI': 'Horror',
  'SUMALA': 'Horror',
  'PERJANJIAN SETAN': 'Horror',
  'KROMOLEO': 'Horror',
  'DOSA MUSYRIK': 'Horror',
  'WANITA AHLI NERAKA': 'Horror',
  'GUNA-GUNA ISTRI MUDA': 'Horror',
  'PANGGONAN WINGIT': 'Horror',
  'PANGGONAN WINGIT 2': 'Horror',
  'MENJELANG AJAL': 'Horror',
  'TEMURUN': 'Horror',
  'RITUAL': 'Horror',
  'KERETA BERDARAH': 'Horror',
  'TRINIL': 'Horror',
  'TRINIL: KEMBALIKAN TUBUHKU': 'Horror',
  'MUNKAR': 'Horror',
  'PASAR SETAN': 'Horror',
  'MALAM PENCABUT NYAWA': 'Horror',
  'THAGHUT': 'Horror',
  'PENGABDI SETAN': 'Horror',
  'PENGABDI SETAN 2': 'Horror',
  'PENGABDI SETAN 2: COMMUNION': 'Horror',
  'SUZANNA': 'Horror',
  'SUZZANNA': 'Horror',
  'SUZZANNA: MALAM JUMAT KLIWON': 'Horror',
  'SUZZANNA: BERNAPAS DALAM KUBUR': 'Horror',
  'MAKMUM': 'Horror',
  'MAKMUM 2': 'Horror',
  'ALIEN: ROMULUS': 'Horror',
  'ALIEN ROMULUS': 'Horror',
  'SMILE 2': 'Horror',
  'SMILE': 'Horror',
  'NOSFERATU': 'Horror',
  'THE SUBSTANCE': 'Horror',
  'TERRIFIER 3': 'Horror',
  'TERRIFIER': 'Horror',
  'HERETIC': 'Horror',
  'THE CONJURING': 'Horror',
  'CONJURING': 'Horror',
  'THE CONJURING: LAST RITES': 'Horror',
  'INSIDIOUS': 'Horror',
  'INSIDIOUS: THE RED DOOR': 'Horror',
  'THE NUN': 'Horror',
  'THE NUN 2': 'Horror',
  'ANNABELLE': 'Horror',
  'ANNABELLE COMES HOME': 'Horror',
  'EXHUMA': 'Horror',
  'EVIL DEAD RISE': 'Horror',
  'EVIL DEAD': 'Horror',
  'HUJAN KEMATIAN': 'Horror',
  'ASUHAN': 'Horror',
  'DOMBA KELAM': 'Horror',
  'ALMARHUM': 'Horror',
  'TUMBAL DARAH': 'Horror',
  'SEWU DINO': 'Horror',
  'IVANNA': 'Horror',
  'DANUR': 'Horror',
  'DANUR 2': 'Horror',
  'DANUR 3': 'Horror',
  'QODRAT': 'Horror',
  'SIKSA NERAKA': 'Horror',
  'KERAMAT': 'Horror',
  'KERAMAT 2': 'Horror',
  'INANG': 'Horror',
  'QORIN': 'Horror',
  'HIDAYAH': 'Horror',
  'WAKTU MAGHRIB': 'Horror',
  'IBLIS DALAM DARAH': 'Horror',
  'DI AMBANG KEMATIAN': 'Horror',
  'LAMPOR': 'Horror',
  'BAYI AJAIB': 'Horror',
  'PERJANJIAN GAIB': 'Horror',
  'LOSMEN MELATI': 'Horror',
  'KHANZAB': 'Horror',
  'SOSOK KETIGA': 'Horror',
  'KUTUKAN CAKAR MONYET': 'Horror',
  'PRIMBON': 'Horror',
  'KUTUKAN SEMBILAN SETAN': 'Horror',
  'KASALINAN': 'Horror',
  'LONGLEGS': 'Horror',
  'SPEAK NO EVIL': 'Horror',
  'A QUIET PLACE': 'Horror',
  'A QUIET PLACE: DAY ONE': 'Horror',
  'ABIGAIL': 'Horror',
  'TAROT': 'Horror',
  'IMMACULATE': 'Horror',
  'THE FIRST OMEN': 'Horror',
  'OMEN': 'Horror',
  'NIGHT SWIM': 'Horror',
  'TRAP': 'Horror',

  // === COMEDY ===
  'AGAK LAEN': 'Comedy',
  'KANG MAK': 'Comedy',
  'KANG MAK FROM ALAM GHAIB': 'Comedy',
  'KAKA BOSS': 'Comedy',
  'PASUTRI GAJE': 'Comedy',
  'MUKIDI': 'Comedy',
  'RUMAH DINAS BAPAK': 'Comedy',
  'KELUARGA SUPER IRIT': 'Comedy',
  'CATATAN HARIAN MENANTU SINTING': 'Comedy',
  'WARKOP DKI': 'Comedy',
  'WARKOP DKI REBORN': 'Comedy',
  'CEK TOKO SEBELAH': 'Comedy',
  'CEK TOKO SEBELAH 2': 'Comedy',
  'SUSAH SINYAL': 'Comedy',
  'MY STUPID BOSS': 'Comedy',
  'MY STUPID BOSS 2': 'Comedy',
  'ORANG KAYA BARU': 'Comedy',
  'HELLO GHOST': 'Comedy',
  'SRIMULAT': 'Comedy',
  'SRIMULAT: HIL YANG MUSTAHAL': 'Comedy',
  'MENDADAK DANGDUT': 'Comedy',
  'JOMBLO': 'Comedy',
  'YOWIS BEN': 'Comedy',
  'YOWIS BEN 2': 'Comedy',
  'YOWIS BEN 3': 'Comedy',
  'YOWIS BEN FINALE': 'Comedy',
  'BEETLEJUICE BEETLEJUICE': 'Comedy',
  'BEETLEJUICE': 'Comedy',
  'MY ANNOYING BROTHER': 'Comedy',
  'GURU-GURU GOKIL': 'Comedy',
  'GARA-GARA WARISAN': 'Comedy',
  'NAGA NAGA NAGA': 'Comedy',
  'GHOSTBUSTERS: FROZEN EMPIRE': 'Comedy',
  'GHOSTBUSTERS': 'Comedy',

  // === DRAMA ===
  'BILA ESOK IBU TIADA': 'Drama',
  'BOLEHKAH SEKALI SAJA KUMENANGIS': 'Drama',
  'LAURA': 'Drama',
  'LAURA: A TRUE STORY OF A FIGHTER': 'Drama',
  'IPAR ADALAH MAUT': 'Drama',
  'HOME SWEET LOAN': 'Drama',
  'DILAN 1983: WO AI NI': 'Drama',
  'DILAN 1983': 'Drama',
  'DILAN 1990': 'Drama',
  'DILAN 1991': 'Drama',
  'ANCIKA: DIA YANG BERSAMAKU 1995': 'Drama',
  'ANCIKA': 'Drama',
  'DUA HATI BIRU': 'Drama',
  'DUA GARIS BIRU': 'Drama',
  'SEHIDUP SEMATI': 'Drama',
  'KUPAT TAHU': 'Drama',
  'ROMEO INGKAR JANJI': 'Drama',
  'HEARTBREAK MOTEL': 'Drama',
  'PERAYAAN MATI RASA': 'Drama',
  '1 KAKAK 7 PONAKAN': 'Drama',
  'SORE: ISTRI DARI MASA DEPAN': 'Drama',
  'SORE': 'Drama',
  'WICKED': 'Drama',
  'IT ENDS WITH US': 'Drama',
  'WE LIVE IN TIME': 'Drama',
  'A COMPLETE UNKNOWN': 'Drama',
  'ALL WE IMAGINE AS LIGHT': 'Drama',
  'JATUH CINTA SEPERTI DI FILM-FILM': 'Drama',
  'OPPENHEIMER': 'Drama',
  'BARBIE': 'Drama',
  'TITANIC': 'Drama',
  'THE NOTEBOOK': 'Drama',
  'LA LA LAND': 'Drama',
  'HABIBIE & AINUN': 'Drama',
  'HABIBIE DAN AINUN': 'Drama',
  'HABIBIE': 'Drama',
  'GLEN ANGGARA': 'Drama',
  'GITA CINTA DARI SMA': 'Drama',
  'JOKER': 'Drama',
  'JOKER: FOLIE A DEUX': 'Drama',
  'KUPU-KUPU KERTAS': 'Drama',
  'DEAR NATHAN': 'Drama',
  'MARIPOSA': 'Drama',
  'KUKIRA KAU RUMAH': 'Drama',
  'YUNI': 'Drama',
  'PENYALIN CAHAYA': 'Drama',
  'SOBAT AMBYAR': 'Drama',
  'LOSMEN BU BROTO': 'Drama',
  'RANAH 3 WARNA': 'Drama',
  'MIRACLE IN CELL NO. 7': 'Drama',
  'AUTOBIOGRAPHY': 'Drama',
  'BALADA SI ROY': 'Drama',
  'DEAR DAVID': 'Drama',
  'JALAN YANG JAUH JANGAN LUPA PULANG': 'Drama',
  'LASKAR PELANGI': 'Drama',
  'SANG PEMIMPI': 'Drama',

  // === ANIMATION ===
  'MOANA 2': 'Animation',
  'MOANA': 'Animation',
  'INSIDE OUT 2': 'Animation',
  'INSIDE OUT': 'Animation',
  'THE WILD ROBOT': 'Animation',
  'WILD ROBOT': 'Animation',
  'TRANSFORMERS ONE': 'Animation',
  'DESPICABLE ME 4': 'Animation',
  'DESPICABLE ME': 'Animation',
  'DESPICABLE ME 2': 'Animation',
  'DESPICABLE ME 3': 'Animation',
  'MINIONS': 'Animation',
  'MINIONS: THE RISE OF GRU': 'Animation',
  'KUNG FU PANDA 4': 'Animation',
  'KUNG FU PANDA': 'Animation',
  'SPIDER-MAN: ACROSS THE SPIDER-VERSE': 'Animation',
  'SPIDER-MAN: INTO THE SPIDER-VERSE': 'Animation',
  'SONIC THE HEDGEHOG 3': 'Animation',
  'SONIC 3': 'Animation',
  'SONIC THE HEDGEHOG': 'Animation',
  'MUFASA: THE LION KING': 'Animation',
  'THE LION KING': 'Animation',
  'JUMBO': 'Animation',
  'SI JUKI THE MOVIE': 'Animation',
  'SI JUKI: HARTA PULAU MONYET': 'Animation',
  'SI JUKI': 'Animation',
  'DORAEMON: NOBITA\'S EARTH SYMPHONY': 'Animation',
  'DORAEMON': 'Animation',
  'STAND BY ME DORAEMON': 'Animation',
  'DETECTIVE CONAN: THE MILLION-DOLLAR PENTAGRAM': 'Animation',
  'DETECTIVE CONAN': 'Animation',
  'CONAN': 'Animation',
  'HAIKYU!! THE DUMPSTER BATTLE': 'Animation',
  'HAIKYU': 'Animation',
  'BLUE LOCK: EPISODE NAGI': 'Animation',
  'BLUE LOCK': 'Animation',
  'JUJUTSU KAISEN 0': 'Animation',
  'JUJUTSU KAISEN': 'Animation',
  'SPY X FAMILY CODE: WHITE': 'Animation',
  'SPY X FAMILY': 'Animation',
  'LOOK BACK': 'Animation',
  'FLOW': 'Animation',
  'THE BOY AND THE HERON': 'Animation',
  'TOY STORY': 'Animation',
  'TOY STORY 4': 'Animation',
  'THE SUPER MARIO BROS. MOVIE': 'Animation',
  'SUPER MARIO': 'Animation',
  'ZOOTOPIA': 'Animation',
  'ZOOTOPIA 2': 'Animation',
  'FROZEN': 'Animation',
  'FROZEN 2': 'Animation',
  'FINDING NEMO': 'Animation',
  'FINDING DORY': 'Animation',
  'COCO': 'Animation',
  'ENCANTO': 'Animation',
  'TURNING RED': 'Animation',
  'LUCA': 'Animation',
  'SOUL': 'Animation',
  'RAYA AND THE LAST DRAGON': 'Animation',
  'BIG HERO 6': 'Animation',
  'ONE PIECE FILM: RED': 'Animation',
  'ONE PIECE': 'Animation',
  'DEMON SLAYER': 'Animation',
  'KIMETSU NO YAIBA': 'Animation',
  'DRAGON BALL SUPER': 'Animation',
  'MY HERO ACADEMIA': 'Animation',
  'SUZUME': 'Animation',
  'WEATHERING WITH YOU': 'Animation',
  'YOUR NAME': 'Animation',
  'THE FIRST SLAM DUNK': 'Animation',
  'SLAM DUNK': 'Animation',
  'WALL-E': 'Animation',
  'UP': 'Animation',
  'RATATOUILLE': 'Animation',
  'CARS': 'Animation',
  'CARS 2': 'Animation',
  'CARS 3': 'Animation',
  'SHREK': 'Animation',
  'PUSS IN BOOTS: THE LAST WISH': 'Animation',
  'PUSS IN BOOTS': 'Animation',
  'HOW TO TRAIN YOUR DRAGON': 'Animation',
  'SING': 'Animation',
  'SING 2': 'Animation',
  'THE SECRET LIFE OF PETS': 'Animation',
  'HOTEL TRANSYLVANIA': 'Animation',
  'THE GARFIELD MOVIE': 'Animation',
  'GARFIELD': 'Animation',
  'ELEMENTAL': 'Animation',

  // === FAMILY ===
  'PADDINGTON IN PERU': 'Family',
  'PADDINGTON': 'Family',
  'PADDINGTON 2': 'Family',
  'WONKA': 'Family',
  'HAROLD AND THE PURPLE CRAYON': 'Family',
  'HAROLD': 'Family',
  'PETUALANGAN SHERINA 2': 'Family',
  'PETUALANGAN SHERINA': 'Family',
  'SHERINA': 'Family',
  'KELUARGA CEMARA': 'Family',
  'KELUARGA CEMARA 2': 'Family',
  'MATILDA': 'Family',
  'CLIFFORD THE BIG RED DOG': 'Family',
  'PETER RABBIT': 'Family',
  'THE BOSS BABY': 'Family',
  'BOSS BABY': 'Family',
  'CHARLIE AND THE CHOCOLATE FACTORY': 'Family',
  'KULARI KE PANTAI': 'Family',
  'JEMBATAN PENSIL': 'Family',
  'SURAU DAN SILEK': 'Family',
  'DENIAS': 'Family',

  // === RELIGION ===
  '172 DAYS': 'Religion',
  'PERJALANAN PEMBUKTIAN CINTA': 'Religion',
  'PEMBUKTIAN CINTA': 'Religion',
  'BUYA HAMKA': 'Religion',
  'HAMKA & SITI RAHAM': 'Religion',
  'AYAT-AYAT CINTA': 'Religion',
  'AYAT-AYAT CINTA 2': 'Religion',
  'KETIKA CINTA BERTASBIH': 'Religion',
  'KETIKA CINTA BERTASBIH 2': 'Religion',
  'SURGA YANG TAK DIRINDUKAN': 'Religion',
  'SURGA YANG TAK DIRINDUKAN 2': 'Religion',
  'SURGA YANG TAK DIRINDUKAN 3': 'Religion',
  'NEGERI 5 MENARA': 'Religion',
  'SANG PENCERAH': 'Religion',
  'HAFALAN SHALAT DELISA': 'Religion',
  'MENGEJAR SURGA': 'Religion',
  'MERINDU CAHAYA DE AMSTEL': 'Religion',
  'MERINDU CAHAYA': 'Religion',
  'DUA SURGA DALAM CINTANYA': 'Religion',
  'LA TAHZAN': 'Religion',
  'CINTA SUBUH': 'Religion',
  'BILAL: A NEW BREED OF HERO': 'Religion',
  'BILAL': 'Religion',
  'SANG KIAI': 'Religion',
  'EMAK INGIN NAIK HAJI': 'Religion',
  'PINTU SURGA TERAKHIR': 'Religion',
  'DI BAWAH LINDUNGAN KA\'BAH': 'Religion',
  'ASSALAMUALAIKUM BEIJING': 'Religion',
  '99 CAHAYA DI LANGIT EROPA': 'Religion',
  'BULAN TERBELAH DI LANGIT AMERIKA': 'Religion',
  'DULMULUK DULMALIK': 'Religion',

  // === ACTION ===
  'GLADIATOR II': 'Action',
  'GLADIATOR 2': 'Action',
  'GLADIATOR': 'Action',
  'VENOM: THE LAST DANCE': 'Action',
  'VENOM': 'Action',
  'VENOM: LET THERE BE CARNAGE': 'Action',
  'KRAVEN THE HUNTER': 'Action',
  'KRAVEN': 'Action',
  'RED ONE': 'Action',
  'DEADPOOL & WOLVERINE': 'Action',
  'DEADPOOL AND WOLVERINE': 'Action',
  'DEADPOOL': 'Action',
  'DEADPOOL 2': 'Action',
  'FURIOSA: A MAD MAX SAGA': 'Action',
  'FURIOSA': 'Action',
  'MAD MAX': 'Action',
  'MAD MAX: FURY ROAD': 'Action',
  'TWISTERS': 'Action',
  'TWISTER': 'Action',
  'CIVIL WAR': 'Action',
  'BAD BOYS: RIDE OR DIE': 'Action',
  'BAD BOYS': 'Action',
  'THE BEEKEEPER': 'Action',
  'BEEKEEPER': 'Action',
  'DUNE: PART TWO': 'Action',
  'DUNE': 'Action',
  'DUNE 2': 'Action',
  'KINGDOM OF THE PLANET OF THE APES': 'Action',
  'PLANET OF THE APES': 'Action',
  'GODZILLA X KONG: THE NEW EMPIRE': 'Action',
  'GODZILLA VS KONG': 'Action',
  'GODZILLA MINUS ONE': 'Action',
  'GODZILLA': 'Action',
  'KONG': 'Action',
  'MISSION: IMPOSSIBLE - DEAD RECKONING': 'Action',
  'MISSION: IMPOSSIBLE': 'Action',
  'MISSION IMPOSSIBLE': 'Action',
  'FAST & FURIOUS': 'Action',
  'FAST X': 'Action',
  'FAST AND FURIOUS': 'Action',
  'JOHN WICK: CHAPTER 4': 'Action',
  'JOHN WICK': 'Action',
  'CAPTAIN AMERICA: BRAVE NEW WORLD': 'Action',
  'CAPTAIN AMERICA': 'Action',
  'THUNDERBOLTS': 'Action',
  '13 BOM DI JAKARTA': 'Action',
  '13 BOM': 'Action',
  'KABUT BERDURI': 'Action',
  'THE SHADOW STRAYS': 'Action',
  '24 JAM BERSAMA GASPAR': 'Action',
  'SRI ASIH': 'Action',
  'GUNDALA': 'Action',
  'THE RAID': 'Action',
  'THE RAID 2': 'Action',
  'MERANTAU': 'Action',
  'THE ODYSSEY': 'Action',
  'ODYSSEY': 'Action',
  'AVENGERS: ENDGAME': 'Action',
  'AVENGERS: INFINITY WAR': 'Action',
  'AVENGERS': 'Action',
  'SPIDER-MAN: NO WAY HOME': 'Action',
  'SPIDER-MAN: FAR FROM HOME': 'Action',
  'SPIDER-MAN: HOMECOMING': 'Action',
  'BATMAN': 'Action',
  'THE BATMAN': 'Action',
  'THE DARK KNIGHT': 'Action',
  'SUPERMAN': 'Action',
  'JURASSIC WORLD: REBIRTH': 'Action',
  'JURASSIC WORLD': 'Action',
  'JURASSIC PARK': 'Action',
  'TERMINATOR': 'Action',
  'THE MATRIX': 'Action',
  'KINGSMAN': 'Action',
  'TOP GUN: MAVERICK': 'Action',
  'TOP GUN': 'Action',
  'BORDERLANDS': 'Action',
  'THE FALL GUY': 'Action',
  'FALL GUY': 'Action',
  'BALLERINA': 'Action',
  'INDIANA JONES AND THE DIAL OF DESTINY': 'Action',
  'INDIANA JONES': 'Action',
  'AQUAMAN AND THE LOST KINGDOM': 'Action',
  'AQUAMAN': 'Action',
  'BLUE BEETLE': 'Action',
  'SHAZAM': 'Action',
  'THE MARVELS': 'Action',
  'ANT-MAN AND THE WASP: QUANTUMANIA': 'Action',
  'ANT-MAN': 'Action',
  'GUARDIANS OF THE GALAXY VOL. 3': 'Action',
  'GUARDIANS OF THE GALAXY': 'Action',
  'BLACK PANTHER: WAKANDA FOREVER': 'Action',
  'BLACK PANTHER': 'Action',
  'THOR: LOVE AND THUNDER': 'Action',
  'THOR': 'Action',
  'DOCTOR STRANGE IN THE MULTIVERSE OF MADNESS': 'Action',
  'DOCTOR STRANGE': 'Action',
  'SHANG-CHI AND THE LEGEND OF THE TEN RINGS': 'Action',
  'SHANG-CHI': 'Action',
  'ETERNALS': 'Action',
  'BLACK WIDOW': 'Action',
  'NO TIME TO DIE': 'Action',
  '007': 'Action',
  'JAMES BOND': 'Action',
  'TENET': 'Action',
  'FREE GUY': 'Action',
  'UNCHARTED': 'Action',
  'MORBIUS': 'Action',
  'BULLET TRAIN': 'Action',
  'THE NIGHT COMES FOR US': 'Action',
  'HEADSHOT': 'Action',
  'FOXTROT SIX': 'Action',
  'HIT & RUN': 'Action',
};

// Initialize clean data structures
// Semua fitur (sales, baking, okupansi, card inspection) murni orisinal tanpa data dummy palsu.

export const StorageService = {
  // Config
  getConfig(): SystemConfig {
    const DEFAULT_MISTRAL_API_KEY = 'mstrl_AtUyYnNPgt6tVyUqo0TjtDXPwG8RyyS8_3oxmaZ';
    const envMistralKey =
      (import.meta as any).env?.VITE_MISTRAL_API_KEY ||
      (window as any).MISTRAL_API_KEY ||
      DEFAULT_MISTRAL_API_KEY;
    const envSupabaseUrl =
      (import.meta as any).env?.VITE_SUPABASE_URL ||
      'https://ctwzvxjjorrczwtcbote.supabase.co';
    const envSupabaseAnonKey =
      (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
      'sb_publishable_2UV0MOXUy0C5NqWsXaxhtg_LRO76v0v';

    const raw = localStorage.getItem(KEYS.CONFIG);
    let config: SystemConfig = {
      supabaseUrl: envSupabaseUrl,
      supabaseAnonKey: envSupabaseAnonKey,
      supabaseConnected: Boolean(envSupabaseUrl && envSupabaseAnonKey),
      mistralApiKey: envMistralKey,
      ocrProvider: 'mistral',
      activeTheme: 'gold_dark',
    };

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        config = {
          ...config,
          ...parsed,
          mistralApiKey: parsed.mistralApiKey || envMistralKey,
          supabaseUrl: parsed.supabaseUrl || envSupabaseUrl,
          supabaseAnonKey: parsed.supabaseAnonKey || envSupabaseAnonKey,
          supabaseConnected: Boolean(
            (parsed.supabaseUrl || envSupabaseUrl) && (parsed.supabaseAnonKey || envSupabaseAnonKey)
          ),
        };
      } catch {
        // use default
      }
    }

    if (config.mistralApiKey && config.mistralApiKey.trim()) {
      config.ocrProvider = 'mistral';
    }

    return config;
  },

  saveConfig(conf: Partial<SystemConfig>): SystemConfig {
    const current = this.getConfig();
    const updated = { ...current, ...conf };
    if (updated.mistralApiKey && updated.mistralApiKey.trim()) {
      updated.ocrProvider = 'mistral';
    }
    localStorage.setItem(KEYS.CONFIG, JSON.stringify(updated));
    this.broadcastChange('config');

    // Sync global config to Supabase if connected
    import('./supabase')
      .then((m) => m.syncConfigToSupabase(updated))
      .catch(() => {});

    return updated;
  },

  // Auth User Session
  getCurrentUser(): User | null {
    const raw = localStorage.getItem(KEYS.USER);
    if (!raw || raw === 'null') {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setCurrentUser(user: User | null) {
    if (user) {
      localStorage.setItem(KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.USER);
    }
    this.broadcastChange('auth');
  },

  resetSession() {
    localStorage.removeItem(KEYS.USER);
    this.broadcastChange('auth');
  },

  getUsersList(): User[] {
    const SYNC_VERSION_KEY = 'cinema_xxi_users_synced_v5_admin123';
    const isSynced = localStorage.getItem(SYNC_VERSION_KEY);
    if (!isSynced) {
      localStorage.setItem(SYNC_VERSION_KEY, 'true');
      return this.resetUsersToDefault();
    }

    const raw = localStorage.getItem(KEYS.USERS_LIST);
    const deletedRaw = localStorage.getItem('cinema_xxi_deleted_user_ids');
    const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];

    const buildDedupedInitial = () => {
      const seenIds = new Set<string>();
      const seenUsernames = new Set<string>();
      const deduped: User[] = [];
      INITIAL_USERS.forEach((u) => {
        if (!seenIds.has(u.id) && !seenUsernames.has(u.username)) {
          seenIds.add(u.id);
          seenUsernames.add(u.username);
          deduped.push({ ...u });
        }
      });
      return deduped;
    };

    if (!raw) {
      const initList = buildDedupedInitial();
      localStorage.setItem(KEYS.USERS_LIST, JSON.stringify(initList));
      return initList;
    }

    try {
      const parsed: User[] = JSON.parse(raw);
      const seenIds = new Set<string>();
      const seenUsernames = new Set<string>();
      const cleanedList: User[] = [];
      let changed = false;

      // 1. Process stored users and deduplicate + purge deleted + sync default passwords
      parsed.forEach((u) => {
        if (!u.id || !u.username) {
          changed = true;
          return;
        }
        if (deletedIds.includes(u.id) || deletedIds.includes(u.username)) {
          changed = true;
          return;
        }
        if (!seenIds.has(u.id) && !seenUsernames.has(u.username)) {
          seenIds.add(u.id);
          seenUsernames.add(u.username);

          // Force admin password to cinema2121 if it's admin123 or empty
          if (u.id === 'user-admin' && (u.password === 'admin123' || !u.password)) {
            u.password = 'cinema2121';
            changed = true;
          }

          const matchingInit = INITIAL_USERS.find(
            (iu) => iu.id === u.id || iu.username === u.username
          );
          if (matchingInit && matchingInit.password && (!u.password || u.password === 'password123')) {
            u.password = matchingInit.password;
            changed = true;
          }

          cleanedList.push(u);
        } else {
          changed = true; // found duplicate
        }
      });

      // 2. Auto-seed missing INITIAL_USERS
      INITIAL_USERS.forEach((initUser) => {
        if (
          !deletedIds.includes(initUser.id) &&
          !deletedIds.includes(initUser.username) &&
          !seenIds.has(initUser.id) &&
          !seenUsernames.has(initUser.username)
        ) {
          seenIds.add(initUser.id);
          seenUsernames.add(initUser.username);
          cleanedList.push({ ...initUser });
          changed = true;
        }
      });

      if (changed) {
        localStorage.setItem(KEYS.USERS_LIST, JSON.stringify(cleanedList));
      }

      return cleanedList;
    } catch {
      const initList = buildDedupedInitial();
      localStorage.setItem(KEYS.USERS_LIST, JSON.stringify(initList));
      return initList;
    }
  },

  saveUser(user: User): User[] {
    // If a user is re-saved, remove them from deletedIds list if present
    const deletedRaw = localStorage.getItem('cinema_xxi_deleted_user_ids');
    let deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
    if (deletedIds.length > 0) {
      deletedIds = deletedIds.filter((id) => id !== user.id && id !== user.username);
      localStorage.setItem('cinema_xxi_deleted_user_ids', JSON.stringify(deletedIds));
    }

    const list = this.getUsersList();
    const idx = list.findIndex((u) => u.id === user.id || u.username === user.username);
    if (idx >= 0) {
      list[idx] = user;
    } else {
      list.push(user);
    }
    localStorage.setItem(KEYS.USERS_LIST, JSON.stringify(list));
    this.broadcastChange('users');
    return list;
  },

  deleteUser(userId: string): User[] {
    const currentList = this.getUsersList();
    const targetUser = currentList.find((u) => u.id === userId || u.username === userId);

    // Track deleted IDs in localStorage so getUsersList will not restore them from INITIAL_USERS
    const deletedRaw = localStorage.getItem('cinema_xxi_deleted_user_ids');
    const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
    if (targetUser) {
      if (!deletedIds.includes(targetUser.id)) deletedIds.push(targetUser.id);
      if (!deletedIds.includes(targetUser.username)) deletedIds.push(targetUser.username);
    } else {
      if (!deletedIds.includes(userId)) deletedIds.push(userId);
    }
    localStorage.setItem('cinema_xxi_deleted_user_ids', JSON.stringify(deletedIds));

    const list = currentList.filter((u) => u.id !== userId && u.username !== userId);
    localStorage.setItem(KEYS.USERS_LIST, JSON.stringify(list));
    this.broadcastChange('users');
    return list;
  },

  resetUsersToDefault(): User[] {
    localStorage.removeItem('cinema_xxi_deleted_user_ids');
    localStorage.setItem('cinema_xxi_users_synced_v5_admin123', 'true');
    const seenIds = new Set<string>();
    const seenUsernames = new Set<string>();
    const deduped: User[] = [];

    INITIAL_USERS.forEach((u) => {
      if (!seenIds.has(u.id) && !seenUsernames.has(u.username)) {
        seenIds.add(u.id);
        seenUsernames.add(u.username);
        deduped.push({ ...u, password: 'admin123' });
      }
    });

    localStorage.setItem(KEYS.USERS_LIST, JSON.stringify(deduped));
    this.broadcastChange('users');
    return deduped;
  },

  // Areas
  getAreas(): Area[] {
    const syncedV2 = localStorage.getItem('cinema_xxi_areas_synced_v2_db');
    const raw = localStorage.getItem(KEYS.AREAS);
    if (!raw || !syncedV2) {
      localStorage.setItem(KEYS.AREAS, JSON.stringify(INITIAL_AREAS));
      localStorage.setItem('cinema_xxi_areas_synced_v2_db', 'true');
      return INITIAL_AREAS;
    }
    try {
      const stored: Area[] = JSON.parse(raw);
      const updated = stored.map((sa) => {
        const init = INITIAL_AREAS.find((ia) => ia.id === sa.id);
        if (init) {
          return {
            ...sa,
            name: sa.name || init.name,
            targetArea: sa.targetArea !== undefined && sa.targetArea > 0 ? sa.targetArea : init.targetArea,
          };
        }
        return sa;
      });
      INITIAL_AREAS.forEach((ia) => {
        if (!updated.some((a) => a.id === ia.id)) {
          updated.push(ia);
        }
      });
      return updated;
    } catch {
      return INITIAL_AREAS;
    }
  },

  saveArea(area: Area): Area[] {
    const list = this.getAreas();
    const idx = list.findIndex((a) => a.id === area.id);
    if (idx >= 0) {
      list[idx] = area;
    } else {
      list.push(area);
    }
    localStorage.setItem(KEYS.AREAS, JSON.stringify(list));
    localStorage.setItem('cinema_xxi_areas_synced_v2_db', 'true');
    this.broadcastChange('areas');
    return list;
  },

  // Outlets
  getOutlets(): Outlet[] {
    const syncedOutletsV2 = localStorage.getItem('cinema_xxi_outlets_target_synced_v2_db');
    const raw = localStorage.getItem(KEYS.OUTLETS);
    if (!raw) {
      localStorage.setItem(KEYS.OUTLETS, JSON.stringify(INITIAL_OUTLETS));
      localStorage.setItem('cinema_xxi_outlets_target_synced_v2_db', 'true');
      return INITIAL_OUTLETS;
    }
    try {
      const stored: Outlet[] = JSON.parse(raw);
      // Synchronize studios, targetHead, and umr from INITIAL_OUTLETS
      const updatedList = stored.map((so) => {
        const init = INITIAL_OUTLETS.find((io) => io.id === so.id);
        if (init) {
          return {
            ...so,
            targetHead: !syncedOutletsV2
              ? init.targetHead
              : (so.targetHead !== undefined ? so.targetHead : init.targetHead),
            studios: init.studios || so.studios,
            umr: init.umr,
          };
        }
        return so;
      });
      // Also ensure all standard outlets are included
      INITIAL_OUTLETS.forEach((io) => {
        if (!updatedList.some((o) => o.id === io.id)) {
          updatedList.push(io);
        }
      });
      const finalOutlets = updatedList.filter(
        (o) =>
          !['premiere-cibinong-xxi', 'premiere-living-world-kota-wisata-xxi', 'premiere-aeon-sentul-xxi'].includes(o.id)
      );
      localStorage.setItem(KEYS.OUTLETS, JSON.stringify(finalOutlets));
      localStorage.setItem('cinema_xxi_outlets_target_synced_v2_db', 'true');
      return finalOutlets;
    } catch {
      const cleanInit = INITIAL_OUTLETS.filter(
        (o) =>
          !['premiere-cibinong-xxi', 'premiere-living-world-kota-wisata-xxi', 'premiere-aeon-sentul-xxi'].includes(o.id)
      );
      localStorage.setItem(KEYS.OUTLETS, JSON.stringify(cleanInit));
      localStorage.setItem('cinema_xxi_outlets_target_synced_v2_db', 'true');
      return cleanInit;
    }
  },

  saveOutlet(outlet: Outlet): Outlet[] {
    const list = this.getOutlets();
    const idx = list.findIndex((o) => o.id === outlet.id);
    if (idx >= 0) {
      list[idx] = outlet;
    } else {
      list.push(outlet);
    }
    localStorage.setItem(KEYS.OUTLETS, JSON.stringify(list));
    this.broadcastChange('outlets');
    return list;
  },

  deleteOutlet(outletId: string): Outlet[] {
    const list = this.getOutlets().filter((o) => o.id !== outletId);
    localStorage.setItem(KEYS.OUTLETS, JSON.stringify(list));
    this.broadcastChange('outlets');
    return list;
  },

  // Daily Sales
  getDailySales(): DailySalesRecord[] {
    const raw = localStorage.getItem(KEYS.SALES);
    let list: DailySalesRecord[] = [];
    if (raw) {
      try {
        list = JSON.parse(raw);
      } catch {
        list = [];
      }
    }

    // Auto-seed and sync migrated 2025 & 2026 data
    let updated = false;
    const allMigrated = [...MIGRATED_SALES_2025, ...MIGRATED_SALES_2026];
    const migratedMap = new Set(allMigrated.map((m) => `${m.outletId}_${m.date}`));

    // Purge any stale/obsolete migrated records that were removed from source data
    const initialLen = list.length;
    list = list.filter((item) => {
      if (item.isMigrated || item.date <= '2026-09-30') {
        return migratedMap.has(`${item.outletId}_${item.date}`);
      }
      return true;
    });
    if (list.length !== initialLen) {
      updated = true;
    }

    allMigrated.forEach((migrated) => {
      const index = list.findIndex(
        (item) => item.outletId === migrated.outletId && item.date === migrated.date
      );
      if (index === -1) {
        list.push(migrated);
        updated = true;
      } else {
        // Always keep migrated record synchronized with source definition
        list[index] = migrated;
        updated = true;
      }
    });

    if (updated || !raw) {
      localStorage.setItem(KEYS.SALES, JSON.stringify(list));
    }

    return list;
  },

  getDailySaleByOutletAndDate(outletId: string, date: string): DailySalesRecord {
    const list = this.getDailySales();
    const existing = list.find((s) => s.outletId === outletId && s.date === date);
    if (existing) return existing;

    // Return empty 5-show skeleton
    return {
      id: `sales-${outletId}-${date}`,
      outletId,
      date,
      shows: [1, 2, 3, 4, 5].map((num) => ({
        showNumber: num,
        omsetCinema: 0,
        omsetFnB: 0,
        bill: 0,
        penonton: 0,
        isFilled: false,
      })),
    };
  },

  saveDailySale(record: DailySalesRecord): DailySalesRecord {
    const list = this.getDailySales();
    const idx = list.findIndex((s) => s.outletId === record.outletId && s.date === record.date);
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.push(record);
    }
    localStorage.setItem(KEYS.SALES, JSON.stringify(list));
    this.broadcastChange('sales');

    // Asynchronous background sync ke Supabase jika terhubung
    import('./supabase')
      .then((m) => m.syncSalesToSupabase([record]))
      .catch(() => {});

    return record;
  },

  // Get latest cumulative show POS totals for a daily record
  getLatestShowTotals(shows: ShowSaleInput[] = []): {
    omsetCinema: number;
    omsetFnB: number;
    bill: number;
    penonton: number;
  } {
    if (!shows || shows.length === 0) {
      return { omsetCinema: 0, omsetFnB: 0, bill: 0, penonton: 0 };
    }
    const filledShows = shows.filter(
      (s) => s.isFilled || (s.omsetCinema || 0) > 0 || (s.omsetFnB || 0) > 0 || (s.penonton || 0) > 0 || (s.bill || 0) > 0
    );
    if (filledShows.length === 0) {
      return { omsetCinema: 0, omsetFnB: 0, bill: 0, penonton: 0 };
    }
    const latestShow = [...filledShows].sort((a, b) => b.showNumber - a.showNumber)[0];
    return {
      omsetCinema: latestShow.omsetCinema || 0,
      omsetFnB: latestShow.omsetFnB || 0,
      bill: latestShow.bill || 0,
      penonton: latestShow.penonton || 0,
    };
  },

  // Formula Calculations according to User Prompt
  calculateMetrics(
    omsetCinema: number,
    omsetFnB: number,
    bill: number,
    penonton: number,
    targetHead: number
  ): ComputedShowMetrics {
    const totalOmset = (omsetCinema || 0) + (omsetFnB || 0);

    // Rumus Daya Serap hasil dari bill dibagi penonton = daya serap dalam persentase
    const dayaSerap = penonton > 0 ? (bill / penonton) * 100 : 0;

    // Rumus Head hasil dari Omset FnB dibagi Penonton = Head (SPH)
    const head = penonton > 0 ? omsetFnB / penonton : 0;

    // Rumus AT (Average Transaksi) hasil dari omset FnB dibagi Bill = AT
    const at = bill > 0 ? omsetFnB / bill : 0;

    // Rumus Achievment hasil dari Head dibagi target head dikali 100 dalam persentase
    const achievement = targetHead > 0 ? (head / targetHead) * 100 : 0;

    // Rumus Selisih (Rp): ACv SPH dikurangi target Head, lalu hasilnya dikalikan dengan jumlah penonton (+ / -)
    // Selisih Rupiah = (Head - Target Head) * Penonton
    const selisih = targetHead > 0 && penonton > 0 ? (head - targetHead) * penonton : 0;

    // % GBO (FnB to Cinema ratio)
    const gboPercent = omsetCinema > 0 ? (omsetFnB / omsetCinema) * 100 : 0;

    return {
      omsetCinema: omsetCinema || 0,
      omsetFnB: omsetFnB || 0,
      totalOmset,
      bill: bill || 0,
      penonton: penonton || 0,
      dayaSerap: Number(dayaSerap.toFixed(2)),
      head: Math.round(head),
      at: Math.round(at),
      targetHead: targetHead || 0,
      achievement: Number(achievement.toFixed(2)),
      selisih: Math.round(selisih),
      gboPercent: Number(gboPercent.toFixed(2)),
    };
  },

  // Baking Sales
  getBakingSales(): BakingSaleRecord[] {
    const raw = localStorage.getItem(KEYS.BAKING);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  getBakingSaleByOutlet(outletId: string, year: number, month: number): BakingSaleRecord {
    const list = this.getBakingSales();
    const existing = list.find((b) => b.outletId === outletId && b.year === year && b.month === month);
    if (existing) return existing;

    const productTargets: { [productId: number]: number } = {};
    BAKING_PRODUCTS.forEach((p) => {
      productTargets[p.id] = p.targetDefault;
    });

    return {
      id: `baking-${outletId}-${year}-${month}`,
      outletId,
      year,
      month,
      dailySales: {},
      productTargets,
    };
  },

  saveBakingSale(record: BakingSaleRecord): BakingSaleRecord {
    const list = this.getBakingSales();
    const idx = list.findIndex(
      (b) => b.outletId === record.outletId && b.year === record.year && b.month === record.month
    );
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.push(record);
    }
    localStorage.setItem(KEYS.BAKING, JSON.stringify(list));
    this.broadcastChange('baking');
    return record;
  },

  // Toilet Inspections
  getInspections(): ToiletInspectionRecord[] {
    const raw = localStorage.getItem(KEYS.INSPECTION);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveInspection(record: ToiletInspectionRecord): ToiletInspectionRecord {
    const list = this.getInspections();
    const idx = list.findIndex((i) => i.id === record.id);
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.unshift(record);
    }
    localStorage.setItem(KEYS.INSPECTION, JSON.stringify(list));
    this.broadcastChange('inspection');

    // Asynchronous background sync ke Supabase jika terhubung
    import('./supabase')
      .then((m) => m.syncInspectionToSupabase(record))
      .catch(() => {});

    return record;
  },

  // Movie Screening History
  getMovieHistory(): MovieScreeningRecord[] {
    const raw = localStorage.getItem(KEYS.MOVIES);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveMovieHistory(record: MovieScreeningRecord): MovieScreeningRecord {
    const list = this.getMovieHistory();
    const idx = list.findIndex((m) => m.id === record.id);
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.unshift(record);
    }
    localStorage.setItem(KEYS.MOVIES, JSON.stringify(list));
    this.broadcastChange('movies');
    return record;
  },

  // Helper untuk normalisasi teks genre ke 13 kategori standar bioskop Cinema XXI
  normalizeGenre(
    raw: string
  ): 'Action' | 'Drama' | 'Horror' | 'Comedy' | 'Family' | 'Religion' | 'Animation' | 'Thriller' | 'Romance' | 'Sci-Fi' | 'Adventure' | 'Fantasy' | 'Biography' {
    if (!raw) return 'Action';
    const clean = raw.trim().toUpperCase();

    if (clean === 'HORROR' || clean === 'HOROR' || clean === 'HOR') return 'Horror';
    if (clean === 'COMEDY' || clean === 'KOMEDI' || clean === 'COM' || clean === 'KMD') return 'Comedy';
    if (clean === 'ANIMATION' || clean === 'ANIMASI' || clean === 'ANI' || clean === 'ANIME' || clean === 'KARTUN') return 'Animation';
    if (clean === 'ROMANCE' || clean === 'ROMANTIS' || clean === 'MELODRAMA') return 'Romance';
    if (clean === 'THRILLER' || clean === 'MYSTERY') return 'Thriller';
    if (clean === 'SCI-FI' || clean === 'SCIFI') return 'Sci-Fi';
    if (clean === 'ADVENTURE' || clean === 'PETUALANGAN') return 'Adventure';
    if (clean === 'FANTASY') return 'Fantasy';
    if (clean === 'BIOGRAPHY' || clean === 'BIOGRAFI' || clean === 'HISTORY' || clean === 'SEJARAH') return 'Biography';
    if (clean === 'DRAMA' || clean === 'DRA') return 'Drama';
    if (clean === 'FAMILY' || clean === 'KELUARGA' || clean === 'FAM' || clean === 'ANAK') return 'Family';
    if (clean === 'RELIGION' || clean === 'RELIGI' || clean === 'REL' || clean === 'ISLAM' || clean === 'ISLAMI' || clean === 'ROHANI') return 'Religion';
    if (clean === 'ACTION' || clean === 'AKSI' || clean === 'ACT') return 'Action';

    // Cek kata kunci parsial
    if (clean.includes('HORROR') || clean.includes('HOROR')) return 'Horror';
    if (clean.includes('COMEDY') || clean.includes('KOMEDI')) return 'Comedy';
    if (clean.includes('ANIMAT') || clean.includes('ANIMAS') || clean.includes('ANIME')) return 'Animation';
    if (clean.includes('ROMANC') || clean.includes('ROMANT')) return 'Romance';
    if (clean.includes('THRILL') || clean.includes('MYSTER')) return 'Thriller';
    if (clean.includes('SCI-FI') || clean.includes('SCIFI')) return 'Sci-Fi';
    if (clean.includes('ADVENTUR') || clean.includes('PETUALANG')) return 'Adventure';
    if (clean.includes('FANTAS')) return 'Fantasy';
    if (clean.includes('BIOGRAPH') || clean.includes('BIOGRAFI') || clean.includes('HISTORY') || clean.includes('SEJARAH')) return 'Biography';
    if (clean.includes('RELIG') || clean.includes('ISLAM') || clean.includes('DAKWAH')) return 'Religion';
    if (clean.includes('FAMIL') || clean.includes('KELUARG')) return 'Family';
    if (clean.includes('DRAMA')) return 'Drama';
    if (clean.includes('ACTION') || clean.includes('AKSI') || clean.includes('FIGHT')) return 'Action';

    return 'Action';
  },

  // Cek apakah suatu kata / sel teks adalah nama / singkatan genre
  isGenreWord(word: string): boolean {
    if (!word) return false;
    const clean = word
      .trim()
      .toUpperCase()
      .replace(/^(?:GENRE|KATEGORI|JENIS)[\s:=]*/i, '')
      .replace(/^[\[\(\<]+|[\]\)\>]+$/g, '')
      .trim();
    if (!clean || clean.length < 2) return false;
    if (/^(?:\d+|\d+\/\d+|rp\b|pg\b|su\b|bo\b|d\d+|r\d+)/i.test(clean)) return false;
    return /\b(?:ACTION|AKSI|ACT|HORROR|HOROR|HOR|COMEDY|KOMEDI|COM|KMD|DRAMA|DRA|ANIMATION|ANIMASI|ANI|ANIME|KARTUN|FAMILY|KELUARGA|FAM|ANAK|RELIGION|RELIGI|REL|ISLAM|ISLAMI|THRILLER|MYSTERY|MISTERI|ROMANCE|ROMANTIS|SCI-FI|SCIFI|ADVENTURE|PETUALANGAN|FANTASY|BIOGRAPHY|BIOGRAFI|HISTORY|SEJARAH)\b/i.test(clean);
  },

  // Helper cerdas mendeteksi genre berdasarkan judul film (Cinema XXI 2024-2025)
  detectGenre(title: string): 'Action' | 'Drama' | 'Horror' | 'Comedy' | 'Family' | 'Religion' | 'Animation' | 'Thriller' | 'Romance' | 'Sci-Fi' | 'Adventure' | 'Fantasy' | 'Biography' {
    const raw = (title || '').trim();
    if (!raw) return 'Action';
    const t = raw.toUpperCase();

    // 0. Deteksi jika judul memuat tag genre eksplisit: [HORROR], (COMEDY), Genre: Drama, dll
    const explicitMatch = t.match(/\b(?:GENRE|KATEGORI)?\s*[:=\(\[]\s*(HORROR|HOROR|COMEDY|KOMEDI|ANIMATION|ANIMASI|DRAMA|FAMILY|KELUARGA|RELIGION|RELIGI|ACTION|AKSI|THRILLER|ROMANCE)[\]\)]?/i);
    if (explicitMatch) {
      return this.normalizeGenre(explicitMatch[1]);
    }

    // 1. Horror (Film Horor Box Office Indonesia & Internasional)
    if (
      t.includes('EVIL DEAD') ||
      t.includes('DEAD BURN') ||
      t.includes('SIKSA KUBUR') ||
      t.includes('BADARAWUHI') ||
      t.includes('DESA PENARI') ||
      t.includes('HANTU') ||
      t.includes('POCONG') ||
      t.includes('LEMBAYUNG') ||
      t.includes('CONJURING') ||
      t.includes('EXHUMA') ||
      t.includes('VINA') ||
      t.includes('SEKAWAN LIMO') ||
      t.includes('HORROR') ||
      t.includes('HOROR') ||
      t.includes('KUNTILANAK') ||
      t.includes('MALAM PENCABUT') ||
      t.includes('KUASA GELAP') ||
      t.includes('KEMAH TERLARANG') ||
      t.includes('TEBUSAN DOSA') ||
      t.includes('DANYANG') ||
      t.includes('SANTET') ||
      t.includes('SEGORO PITU') ||
      t.includes('THAGHUT') ||
      t.includes('PETAK UMPET') ||
      t.includes('JURNAL RISA') ||
      t.includes('PANGGONAN WINGIT') ||
      t.includes('SUZANNA') ||
      t.includes('SUZZANNA') ||
      t.includes('MAKMUM') ||
      t.includes('KERETA BERDARAH') ||
      t.includes('TRINIL') ||
      t.includes('MUNKAR') ||
      t.includes('PASAR SETAN') ||
      t.includes('ALIEN ROMULUS') ||
      t.includes('ALIEN: ROMULUS') ||
      t.includes('SMILE 2') ||
      t.includes('SMILE') ||
      t.includes('NOSFERATU') ||
      t.includes('EXORCIST') ||
      t.includes('INSIDIOUS') ||
      t.includes('ANNABELLE') ||
      t.includes('THE NUN') ||
      t.includes('TERRIFIER') ||
      t.includes('HALLOWEEN') ||
      t.includes('ZOMBIE') ||
      t.includes('IBLIS') ||
      t.includes('SETAN') ||
      t.includes('MAYAT') ||
      t.includes('KAFAN') ||
      t.includes('PESUGIHAN') ||
      t.includes('JAILANGKUNG') ||
      t.includes('JELANGKUNG') ||
      t.includes('SUMALA') ||
      t.includes('PERJANJIAN SETAN') ||
      t.includes('KROMOLEO') ||
      t.includes('MENJELANG AJAL') ||
      t.includes('TEMURUN') ||
      t.includes('RITUAL') ||
      t.includes('DOSA MUSYRIK') ||
      t.includes('WANITA AHLI NERAKA') ||
      t.includes('GUNA-GUNA ISTRI MUDA') ||
      t.includes('THE SUBSTANCE') ||
      t.includes('HERETIC') ||
      t.includes('SEWU DINO') ||
      t.includes('IVANNA') ||
      t.includes('DANUR') ||
      t.includes('QODRAT') ||
      t.includes('SIKSA NERAKA') ||
      t.includes('KERAMAT') ||
      t.includes('INANG') ||
      t.includes('QORIN') ||
      t.includes('WAKTU MAGHRIB') ||
      t.includes('DI AMBANG KEMATIAN') ||
      t.includes('KHANZAB') ||
      t.includes('SOSOK KETIGA') ||
      t.includes('LONGLEGS') ||
      t.includes('SPEAK NO EVIL') ||
      t.includes('A QUIET PLACE') ||
      t.includes('ABIGAIL') ||
      t.includes('TAROT') ||
      t.includes('IMMACULATE') ||
      t.includes('FIRST OMEN') ||
      t.includes('NIGHT SWIM') ||
      t.includes('TRAP') ||
      t.includes('TEROR') ||
      t.includes('KUBUR')
    ) {
      return 'Horror';
    }

    // 2. Animation (Animasi Box Office)
    if (
      t.includes('TOY STORY') ||
      t.includes('MOANA') ||
      t.includes('INSIDE OUT') ||
      t.includes('DESPICABLE') ||
      t.includes('MINIONS') ||
      t.includes('KUNG FU PANDA') ||
      t.includes('WILD ROBOT') ||
      t.includes('SONIC') ||
      t.includes('DORAEMON') ||
      t.includes('DETECTIVE CONAN') ||
      t.includes('CONAN') ||
      t.includes('TRANSFORMERS ONE') ||
      t.includes('SPIDER-MAN ACROSS') ||
      t.includes('SPIDER-MAN INTO') ||
      t.includes('SUPER MARIO') ||
      t.includes('ZOOTOPIA') ||
      t.includes('FROZEN') ||
      t.includes('SHREK') ||
      t.includes('PUSS IN BOOTS') ||
      t.includes('HOW TO TRAIN YOUR DRAGON') ||
      t.includes('FINDING NEMO') ||
      t.includes('FINDING DORY') ||
      t.includes('SING 2') ||
      t.includes('COCO') ||
      t.includes('ENCANTO') ||
      t.includes('TURNING RED') ||
      t.includes('LUCA') ||
      t.includes('SOUL') ||
      t.includes('ONWARD') ||
      t.includes('RAYA AND THE LAST DRAGON') ||
      t.includes('BIG HERO 6') ||
      t.includes('LION KING') ||
      t.includes('MUFASA') ||
      t.includes('INCREDIBLES') ||
      t.includes('RATATOUILLE') ||
      t.includes('CARS 2') ||
      t.includes('CARS 3') ||
      t.includes('MONSTERS INC') ||
      t.includes('WALL-E') ||
      t.includes('SPONGEBOB') ||
      t.includes('JUMBO') ||
      t.includes('SI JUKI') ||
      t.includes('ANIME') ||
      t.includes('ANIMATION') ||
      t.includes('ANIMASI') ||
      t.includes('DISNEY') ||
      t.includes('PIXAR') ||
      t.includes('GHIBLI') ||
      t.includes('HAIKYU') ||
      t.includes('BLUE LOCK') ||
      t.includes('JUJUTSU KAISEN') ||
      t.includes('SPY X FAMILY') ||
      t.includes('LOOK BACK') ||
      t.includes('FLOW') ||
      t.includes('ONE PIECE') ||
      t.includes('DEMON SLAYER') ||
      t.includes('KIMETSU NO YAIBA') ||
      t.includes('DRAGON BALL') ||
      t.includes('SUZUME') ||
      t.includes('WEATHERING WITH YOU') ||
      t.includes('YOUR NAME') ||
      t.includes('SLAM DUNK') ||
      t.includes('HOTEL TRANSYLVANIA') ||
      t.includes('THE GARFIELD MOVIE') ||
      t.includes('ELEMENTAL')
    ) {
      return 'Animation';
    }

    // 3. Comedy (Komedi Box Office)
    if (
      t.includes('AGAK LAEN') ||
      t.includes('KANG MAK') ||
      t.includes('KAKA BOSS') ||
      t.includes('WARKOP DKI') ||
      t.includes('WARKOP') ||
      t.includes('KOMEDI') ||
      t.includes('COMEDY') ||
      t.includes('PASUTRI GAJE') ||
      t.includes('MUKIDI') ||
      t.includes('RUMAH DINAS BAPAK') ||
      t.includes('GARA-GARA WARISAN') ||
      t.includes('CEK TOKO SEBELAH') ||
      t.includes('SUSAH SINYAL') ||
      t.includes('MY STUPID BOSS') ||
      t.includes('ORANG KAYA BARU') ||
      t.includes('HELLO GHOST') ||
      t.includes('SRIMULAT') ||
      t.includes('MENDADAK DANGDUT') ||
      t.includes('JOMBLO') ||
      t.includes('YOWIS BEN') ||
      t.includes('KELUARGA SUPER IRIT') ||
      t.includes('BEETLEJUICE') ||
      t.includes('MY ANNOYING BROTHER') ||
      t.includes('GURU-GURU GOKIL') ||
      t.includes('NAGA NAGA NAGA') ||
      t.includes('GHOSTBUSTERS')
    ) {
      return 'Comedy';
    }

    // 4. Religion (Religi & Dakwah)
    if (
      t.includes('172 DAYS') ||
      t.includes('BUYA HAMKA') ||
      t.includes('HAMKA') ||
      t.includes('AYAT-AYAT CINTA') ||
      t.includes('KETIKA CINTA BERTASBIH') ||
      t.includes('SURGA YANG TAK DIRINDUKAN') ||
      t.includes('NEGERI 5 MENARA') ||
      t.includes('SANG PENCERAH') ||
      t.includes('HAFALAN SHALAT DELISA') ||
      t.includes('MENGEJAR SURGA') ||
      t.includes('MERINDU CAHAYA') ||
      t.includes('PEMBUKTIAN CINTA') ||
      t.includes('LA TAHZAN') ||
      t.includes('CINTA SUBUH') ||
      t.includes('BILAL') ||
      t.includes('SANG KIAI') ||
      t.includes('EMAK INGIN NAIK HAJI') ||
      t.includes('PINTU SURGA TERAKHIR') ||
      t.includes('DI BAWAH LINDUNGAN KA\'BAH') ||
      t.includes('ASSALAMUALAIKUM BEIJING') ||
      t.includes('99 CAHAYA DI LANGIT EROPA') ||
      t.includes('BULAN TERBELAH DI LANGIT AMERIKA') ||
      t.includes('DULMULUK DULMALIK') ||
      t.includes('PESANTREN') ||
      t.includes('DAKWAH') ||
      t.includes('RELIGI')
    ) {
      return 'Religion';
    }

    // 5. Family (Keluarga & Anak-anak)
    if (
      t.includes('KELUARGA CEMARA') ||
      t.includes('PETUALANGAN SHERINA') ||
      t.includes('SHERINA') ||
      t.includes('PADDINGTON') ||
      t.includes('WONKA') ||
      t.includes('MATILDA') ||
      t.includes('CLIFFORD') ||
      t.includes('PETER RABBIT') ||
      t.includes('BOSS BABY') ||
      t.includes('THE BOSS BABY') ||
      t.includes('CHARLIE AND THE CHOCOLATE') ||
      t.includes('HAROLD AND THE PURPLE CRAYON') ||
      t.includes('KULARI KE PANTAI') ||
      t.includes('JEMBATAN PENSIL') ||
      t.includes('SURAU DAN SILEK') ||
      t.includes('DENIAS') ||
      t.includes('FAMILY')
    ) {
      return 'Family';
    }

    // 6. Drama (Drama & Percintaan 2024-2025)
    if (
      t.includes('BILA ESOK IBU TIADA') ||
      t.includes('BOLEHKAH SEKALI SAJA KUMENANGIS') ||
      t.includes('LAURA') ||
      t.includes('IPAR ADALAH MAUT') ||
      t.includes('HOME SWEET LOAN') ||
      t.includes('DILAN 1983') ||
      t.includes('DILAN 1990') ||
      t.includes('DILAN 1991') ||
      t.includes('ANCIKA') ||
      t.includes('DUA HATI BIRU') ||
      t.includes('DUA GARIS BIRU') ||
      t.includes('SEHIDUP SEMATI') ||
      t.includes('KUPAT TAHU') ||
      t.includes('ROMEO INGKAR JANJI') ||
      t.includes('HEARTBREAK MOTEL') ||
      t.includes('PERAYAAN MATI RASA') ||
      t.includes('1 KAKAK 7 PONAKAN') ||
      t.includes('SORE: ISTRI DARI MASA DEPAN') ||
      t.includes('WICKED') ||
      t.includes('IT ENDS WITH US') ||
      t.includes('WE LIVE IN TIME') ||
      t.includes('A COMPLETE UNKNOWN') ||
      t.includes('ALL WE IMAGINE AS LIGHT') ||
      t.includes('JATUH CINTA SEPERTI DI FILM') ||
      t.includes('OPPENHEIMER') ||
      t.includes('BARBIE') ||
      t.includes('TITANIC') ||
      t.includes('NOTEBOOK') ||
      t.includes('LA LA LAND') ||
      t.includes('HABIBIE') ||
      t.includes('GLEN ANGGARA') ||
      t.includes('GITA CINTA DARI SMA') ||
      t.includes('JOKER') ||
      t.includes('KUPU-KUPU KERTAS') ||
      t.includes('DEAR NATHAN') ||
      t.includes('MARIPOSA') ||
      t.includes('KUKIRA KAU RUMAH') ||
      t.includes('YUNI') ||
      t.includes('PENYALIN CAHAYA') ||
      t.includes('SOBAT AMBYAR') ||
      t.includes('LOSMEN BU BROTO') ||
      t.includes('RANAH 3 WARNA') ||
      t.includes('MIRACLE IN CELL NO') ||
      t.includes('AUTOBIOGRAPHY') ||
      t.includes('BALADA SI ROY') ||
      t.includes('DEAR DAVID') ||
      t.includes('JALAN YANG JAUH JANGAN LUPA PULANG') ||
      t.includes('LASKAR PELANGI') ||
      t.includes('SANG PEMIMPI') ||
      t.includes('DRAMA')
    ) {
      return 'Drama';
    }

    // 7. Action (Aksi & Blockbuster)
    if (
      t.includes('GLADIATOR') ||
      t.includes('VENOM') ||
      t.includes('KRAVEN') ||
      t.includes('RED ONE') ||
      t.includes('DEADPOOL') ||
      t.includes('WOLVERINE') ||
      t.includes('FURIOSA') ||
      t.includes('MAD MAX') ||
      t.includes('TWISTERS') ||
      t.includes('CIVIL WAR') ||
      t.includes('BAD BOYS') ||
      t.includes('BEEKEEPER') ||
      t.includes('DUNE') ||
      t.includes('PLANET OF THE APES') ||
      t.includes('GODZILLA') ||
      t.includes('KONG') ||
      t.includes('MISSION IMPOSSIBLE') ||
      t.includes('FAST & FURIOUS') ||
      t.includes('FAST AND FURIOUS') ||
      t.includes('FAST X') ||
      t.includes('JOHN WICK') ||
      t.includes('CAPTAIN AMERICA') ||
      t.includes('THUNDERBOLTS') ||
      t.includes('13 BOM DI JAKARTA') ||
      t.includes('13 BOM') ||
      t.includes('KABUT BERDURI') ||
      t.includes('SHADOW STRAYS') ||
      t.includes('GASPAR') ||
      t.includes('SRI ASIH') ||
      t.includes('GUNDALA') ||
      t.includes('THE RAID') ||
      t.includes('MERANTAU') ||
      t.includes('ODYSSEY') ||
      t.includes('AVENGERS') ||
      t.includes('SPIDER-MAN') ||
      t.includes('BATMAN') ||
      t.includes('SUPERMAN') ||
      t.includes('JURASSIC') ||
      t.includes('TERMINATOR') ||
      t.includes('MATRIX') ||
      t.includes('KINGSMAN') ||
      t.includes('TOP GUN') ||
      t.includes('BORDERLANDS') ||
      t.includes('FALL GUY') ||
      t.includes('BALLERINA') ||
      t.includes('INDIANA JONES') ||
      t.includes('AQUAMAN') ||
      t.includes('BLUE BEETLE') ||
      t.includes('SHAZAM') ||
      t.includes('MARVELS') ||
      t.includes('ANT-MAN') ||
      t.includes('GUARDIANS OF THE GALAXY') ||
      t.includes('BLACK PANTHER') ||
      t.includes('THOR') ||
      t.includes('DOCTOR STRANGE') ||
      t.includes('SHANG-CHI') ||
      t.includes('ETERNALS') ||
      t.includes('BLACK WIDOW') ||
      t.includes('JAMES BOND') ||
      t.includes('007') ||
      t.includes('TENET') ||
      t.includes('FREE GUY') ||
      t.includes('UNCHARTED') ||
      t.includes('MORBIUS') ||
      t.includes('BULLET TRAIN') ||
      t.includes('ACTION') ||
      t.includes('AKSI')
    ) {
      return 'Action';
    }

    return 'Action';
  },

  // Dapatkan seluruh pemetaan genre film yang tersimpan di memori pengguna
  getFilmGenreRegistry(): {
    [cleanTitle: string]: 'Action' | 'Drama' | 'Horror' | 'Comedy' | 'Family' | 'Religion' | 'Animation' | 'Thriller' | 'Romance' | 'Sci-Fi' | 'Adventure' | 'Fantasy' | 'Biography';
  } {
    const raw = localStorage.getItem(KEYS.GENRE_REGISTRY);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  // Simpan / update alokasi genre film ke memori global dan sinkronkan ke seluruh record
  setFilmGenre(title: string, genre: string) {
    const raw = (title || '').trim();
    if (!raw) return;
    const clean = cleanTitleForCompare(raw);
    if (!clean) return;
    const normalized = this.normalizeGenre(genre);

    // 1. Simpan ke registry global
    const registry = this.getFilmGenreRegistry();
    registry[clean] = normalized;
    localStorage.setItem(KEYS.GENRE_REGISTRY, JSON.stringify(registry));

    // 2. Perbarui seluruh data okupansi di localStorage yang memuat film ini
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((k) => {
        if (k.startsWith('cinema_xxi_occupancy_records_')) {
          const rawItem = localStorage.getItem(k);
          if (rawItem) {
            try {
              const parsed = JSON.parse(rawItem);
              let changed = false;
              if (Array.isArray(parsed)) {
                parsed.forEach((row) => {
                  const rowTitle = cleanTitleForCompare(row.filmTitle || row.notes || '');
                  if (rowTitle) {
                    const isSame =
                      rowTitle === clean ||
                      (clean.length >= 4 &&
                        (rowTitle.startsWith(clean) || clean.startsWith(rowTitle)));

                    if (isSame) {
                      row.genre = normalized;
                      changed = true;
                    }
                  }
                });
                if (changed) {
                  localStorage.setItem(k, JSON.stringify(parsed));
                }
              }
            } catch {}
          }
        }
      });
    } catch {}

    // 3. Perbarui movie history records
    const movies = this.getMovieHistory();
    let moviesChanged = false;
    movies.forEach((m) => {
      const mTitle = cleanTitleForCompare(m.movieTitle || '');
      if (mTitle) {
        const isSame =
          mTitle === clean ||
          (clean.length >= 4 &&
            (mTitle.startsWith(clean) || clean.startsWith(mTitle)));

        if (isSame) {
          m.genre = normalized;
          moviesChanged = true;
        }
      }
    });
    if (moviesChanged) {
      localStorage.setItem(KEYS.MOVIES, JSON.stringify(movies));
    }

    this.broadcastChange('genre-updated');
  },

  // Ekstraksi jumlah penonton presisi tinggi:
  // Jika formatnya '778 / 2' atau '24/0' atau '(tertulis 778 / 2)', ambil angka 778 saja (abaikan / 2)
  parseAudienceCount(val: any): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') {
      return isNaN(val) ? 0 : Math.floor(Math.max(0, val));
    }
    const str = String(val).trim();
    if (!str || str === '-' || str === '0' || str === '0/0') return 0;

    // Format "778 / 2", "778/2", "24/0", "(tertulis 778 / 2)"
    const slashMatch = str.match(/(\d[\d\.]*)\s*\/\s*\d+/);
    if (slashMatch) {
      return parseInt(slashMatch[1].replace(/\./g, ''), 10) || 0;
    }

    // Ambil angka murni jika ada (misal "778")
    const numMatch = str.match(/(\d[\d\.]*)/);
    if (numMatch) {
      return parseInt(numMatch[1].replace(/\./g, ''), 10) || 0;
    }

    return 0;
  },

  // Resolusi genre film presisi tinggi: Mencegah salah alokasi genre film
  resolveFilmGenre(
    title: string,
    existingGenre?: string
  ): 'Action' | 'Drama' | 'Horror' | 'Comedy' | 'Family' | 'Religion' | 'Animation' | 'Thriller' | 'Romance' | 'Sci-Fi' | 'Adventure' | 'Fantasy' | 'Biography' {
    // 0. Prioritas Utama: Jika ada existingGenre valid yang dibaca dari dokumen / OCR / LLM
    if (existingGenre && existingGenre.trim() && this.isGenreWord(existingGenre)) {
      const norm = this.normalizeGenre(existingGenre);
      if (norm) return norm;
    }

    const raw = (title || '').trim();
    if (!raw) {
      return existingGenre ? this.normalizeGenre(existingGenre) : 'Action';
    }

    // 1. Cek tag genre eksplisit di dalam teks judul: [HORROR], (COMEDY), GENRE: ANIMATION, dsb
    const tagMatch =
      raw.match(
        /[\[\(]\s*(HORROR|HOROR|COMEDY|KOMEDI|ANIMATION|ANIMASI|DRAMA|FAMILY|KELUARGA|RELIGION|RELIGI|ACTION|AKSI|THRILLER|ROMANCE)\s*[\]\)]/i
      ) ||
      raw.match(
        /\b(?:GENRE|KATEGORI|JENIS)\s*[:=]\s*(HORROR|HOROR|COMEDY|KOMEDI|ANIMATION|ANIMASI|DRAMA|FAMILY|KELUARGA|RELIGION|RELIGI|ACTION|AKSI|THRILLER|ROMANCE)\b/i
      );
    if (tagMatch) {
      return this.normalizeGenre(tagMatch[1]);
    }

    const clean = cleanTitleForCompare(raw);
    if (!clean) {
      return existingGenre ? this.normalizeGenre(existingGenre) : 'Action';
    }

    // 2. Mapping custom yang pernah disimpan oleh user di registry (manual selection override)
    const userRegistry = this.getFilmGenreRegistry();
    if (userRegistry[clean]) {
      return userRegistry[clean];
    }
    for (const [savedTitle, savedGenre] of Object.entries(userRegistry)) {
      const cleanSaved = cleanTitleForCompare(savedTitle);
      if (cleanSaved === clean) return savedGenre;
      if (cleanSaved.length >= 3 && clean.length >= 3) {
        if (clean.includes(cleanSaved) || cleanSaved.includes(clean)) {
          return savedGenre;
        }
      }
    }

    // 3. Katalog terverifikasi KNOWN_FILM_GENRES (Box Office XXI) dengan pencocokan kata & frasa
    if (KNOWN_FILM_GENRES[clean]) {
      return KNOWN_FILM_GENRES[clean];
    }
    for (const [knownKey, knownGenre] of Object.entries(KNOWN_FILM_GENRES)) {
      const cleanKey = cleanTitleForCompare(knownKey);
      if (cleanKey === clean) {
        return knownGenre;
      }
      if (clean.length >= 3 && cleanKey.length >= 3) {
        if (clean.includes(cleanKey) || cleanKey.includes(clean)) {
          return knownGenre;
        }
      }

      // Pencocokan kata-kata signifikan (token matching)
      const cleanWords = clean.split(' ').filter((w) => w.length >= 3);
      const knownWords = cleanKey.split(' ').filter((w) => w.length >= 3);
      if (cleanWords.length > 0 && knownWords.length > 0) {
        const commonWords = cleanWords.filter((w) => knownWords.includes(w));
        if (
          commonWords.length >= Math.min(cleanWords.length, knownWords.length) &&
          commonWords.length >= 1
        ) {
          return knownGenre;
        }
      }
    }

    // 4. Deteksi cerdas berdasarkan kata kunci judul film XXI
    const detectedFromTitle = this.detectGenre(clean);
    if (detectedFromTitle && detectedFromTitle !== 'Action') {
      return detectedFromTitle;
    }

    // 5. Fallback jika ada existingGenre apapun
    if (existingGenre && existingGenre.trim()) {
      return this.normalizeGenre(existingGenre);
    }

    return detectedFromTitle || 'Action';
  },

  // Synchronize scanned / occupancy rows into movie history records
  syncOccupancyToMovieHistory(
    outletId: string,
    date: string,
    rows: Array<{
      id?: string;
      studioName: string;
      filmTitle?: string;
      genre?: string;
      capacity?: number;
      shows: { [showNum: number]: number };
      notes?: string;
    }>
  ) {
    if (!Array.isArray(rows) || rows.length === 0) return;
    const normDate = this.normalizeDateStr(date);
    const existingList = this.getMovieHistory();

    // Hapus data lama untuk outlet & tanggal ini agar jika di-upload/scan 2x dalam 1 tanggal,
    // tetap pakai data TERBARU saja (mencegah duplikat/double)
    const filteredList = existingList.filter(
      (m) => !(m.outletId === outletId && (m.date === date || m.date === normDate))
    );

    const newRecords: MovieScreeningRecord[] = [];

    rows.forEach((row, idx) => {
      const rawTitle = (row.filmTitle || row.notes || '').trim();
      const title = rawTitle || (row.studioName ? `${row.studioName}` : `Studio ${idx + 1}`);

      const titles = title.includes(';')
        ? title.split(';').map((t: string) => t.trim()).filter(Boolean)
        : [title];

      titles.forEach((singleTitle, tIdx) => {
        const recordId = `rec_${outletId}_${normDate}_${(row.studioName || `studio_${idx}`).replace(/\s+/g, '_')}_${idx}_${tIdx}`;
        const genre = this.resolveFilmGenre(singleTitle, row.genre);
        const capacity = row.capacity || 200;

        newRecords.push({
          id: recordId,
          outletId,
          date: normDate,
          studioName: row.studioName || `Studio ${idx + 1}`,
          movieTitle: singleTitle,
          genre,
          capacity,
          shows: tIdx === 0 ? (row.shows || {}) : { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
        });
      });
    });

    const updatedList = [...newRecords, ...filteredList];
    localStorage.setItem(KEYS.MOVIES, JSON.stringify(updatedList));
    this.broadcastChange('movies');
  },

  // Get all uploaded movies ever across all scans and occupancy records (tanpa duplikat)
  getAllUploadedMovies(): MovieScreeningRecord[] {
    const movieMap = new Map<string, MovieScreeningRecord>();
    const handledDatesSet = new Set<string>();

    const processRows = (outId: string, d: string, rows: any[]) => {
      const normD = this.normalizeDateStr(d);
      handledDatesSet.add(`${outId}_${normD}`);
      handledDatesSet.add(`${outId}_${d}`);

      rows.forEach((r, idx) => {
        const rawTitle = (r.filmTitle || r.notes || '').trim();
        const title = rawTitle || (r.studioName ? `${r.studioName}` : `Studio ${idx + 1}`);
        if (!title) return;

        const titles = title.includes(';')
          ? title.split(';').map((t: string) => t.trim()).filter(Boolean)
          : [title];

        titles.forEach((singleTitle: string, tIdx: number) => {
          const studioKey = (r.studioName || `Studio_${idx}`).toLowerCase();
          const cleanTitle = cleanTitleForCompare(singleTitle);
          // Map key unik per outlet, tanggal, studio, dan judul film
          const mapKey = `${outId}_${normD}_${studioKey}_${cleanTitle}_${idx}_${tIdx}`;
          if (!movieMap.has(mapKey)) {
            movieMap.set(mapKey, {
              id: `agg_${outId}_${normD}_${idx}_${tIdx}`,
              outletId: outId,
              date: normD,
              studioName: r.studioName || 'Studio',
              movieTitle: singleTitle,
              genre: this.resolveFilmGenre(singleTitle, r.genre),
              capacity: r.capacity || 200,
              shows: tIdx === 0 ? (r.shows || {}) : { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
            });
          }
        });
      });
    };

    // 1. Scan seluruh record okupansi di localStorage TERLEBIH DAHULU (data scan / edit TERBARU)
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((k) => {
        if (
          k.startsWith('cinema_xxi_occupancy_records_') ||
          (k.startsWith('cinema_xxi_occupancy_') &&
            !k.startsWith('cinema_xxi_occupancy_manifest') &&
            !k.startsWith('cinema_xxi_occupancy_records_'))
        ) {
          const prefix = k.startsWith('cinema_xxi_occupancy_records_')
            ? 'cinema_xxi_occupancy_records_'
            : 'cinema_xxi_occupancy_';
          const keyBody = k.replace(prefix, '');
          const underscoreIdx = keyBody.lastIndexOf('_');
          if (underscoreIdx > 0) {
            const outletId = keyBody.substring(0, underscoreIdx);
            const date = keyBody.substring(underscoreIdx + 1);

            const raw = localStorage.getItem(k);
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                const rows: any[] = Array.isArray(parsed) ? parsed : parsed?.rows || [];
                if (rows.length > 0) {
                  processRows(outletId, date, rows);
                }
              } catch {
                // ignore
              }
            }
          }
        }
      });
    } catch {
      // ignore
    }

    // 2. Scan dari persistent manifest catalog
    try {
      const manifestRaw = localStorage.getItem('cinema_xxi_occupancy_manifest');
      if (manifestRaw) {
        const manifest = JSON.parse(manifestRaw);
        Object.values(manifest).forEach((entry: any) => {
          if (entry && entry.outletId && entry.date) {
            const rows: any[] = Array.isArray(entry.data)
              ? entry.data
              : Array.isArray(entry.rows)
              ? entry.rows
              : [];
            if (rows.length > 0) {
              processRows(entry.outletId, entry.date, rows);
            }
          }
        });
      }
    } catch {
      // ignore
    }

    // 3. Tambahkan dari MIGRATED_OCCUPANCY_RECORDS untuk outlet & date yang belum tersimpan di localStorage
    MIGRATED_OCCUPANCY_RECORDS.forEach((migrated) => {
      const normD = this.normalizeDateStr(migrated.date);
      const handledKey = `${migrated.outletId}_${normD}`;
      if (!handledDatesSet.has(handledKey) && !handledDatesSet.has(`${migrated.outletId}_${migrated.date}`)) {
        processRows(migrated.outletId, migrated.date, migrated.rows);
      }
    });

    // 4. Tambahkan dari getMovieHistory() HANYA jika tanggal+outlet+studio+title tersebut belum ada
    const fromMovies = this.getMovieHistory();
    fromMovies.forEach((m) => {
      const studioKey = (m.studioName || '').toLowerCase();
      const normD = this.normalizeDateStr(m.date);
      const cleanTitle = cleanTitleForCompare(m.movieTitle);
      const mapKey = `${m.outletId}_${normD}_${studioKey}_${cleanTitle}`;
      let exists = false;
      for (const key of movieMap.keys()) {
        if (key.startsWith(`${m.outletId}_${normD}_${studioKey}_${cleanTitle}`)) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        movieMap.set(mapKey, {
          ...m,
          date: normD,
          genre: this.resolveFilmGenre(m.movieTitle, m.genre),
        });
      }
    });

    return Array.from(movieMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  },

  // Studio Occupancy Records
  getOccupancyRecord(outletId: string, date: string): Array<{
    id: string;
    studioName: string;
    filmTitle?: string;
    genre?: string;
    capacity?: number;
    shows: { [showNum: number]: number };
    notes: string;
  }> | null {
    const normTargetDate = this.normalizeDateStr(date);
    let raw = localStorage.getItem(`${KEYS.OCCUPANCY}_${outletId}_${normTargetDate}`);
    if (!raw) {
      raw = localStorage.getItem(`${KEYS.OCCUPANCY}_${outletId}_${date}`);
    }
    // Check with older prefix if not found
    if (!raw) {
      raw = localStorage.getItem(`cinema_xxi_occupancy_${outletId}_${normTargetDate}`);
      if (!raw) {
        raw = localStorage.getItem(`cinema_xxi_occupancy_${outletId}_${date}`);
      }
    }

    // Check persistent manifest backup
    if (!raw) {
      try {
        const manifestRaw = localStorage.getItem('cinema_xxi_occupancy_manifest');
        if (manifestRaw) {
          const manifest = JSON.parse(manifestRaw);
          const entry =
            manifest[`${outletId}_${normTargetDate}`] ||
            manifest[`${outletId}_${date}`];
          if (entry && (entry.data || entry.rows)) {
            raw = JSON.stringify(entry.data || entry.rows);
          }
        }
      } catch {
        // ignore
      }
    }

    if (!raw) {
      const migrated = MIGRATED_OCCUPANCY_RECORDS.find(
        (m) =>
          m.outletId === outletId &&
          (m.date === date || this.normalizeDateStr(m.date) === normTargetDate)
      );
      if (migrated) {
        this.saveOccupancyRecord(outletId, migrated.date, migrated.rows);
        return migrated.rows.map((s) => ({
          ...s,
          genre: this.resolveFilmGenre(s.filmTitle || s.notes || '', s.genre),
        }));
      }
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => ({
          ...s,
          genre: this.resolveFilmGenre(s.filmTitle || s.notes || '', s.genre),
        }));
      }
      if (parsed && Array.isArray(parsed.rows)) {
        return parsed.rows.map((s: any) => ({
          ...s,
          genre: this.resolveFilmGenre(s.filmTitle || s.notes || '', s.genre),
        }));
      }
      if (parsed && typeof parsed === 'object') {
        return Object.entries(parsed).map(([studioName, val]: [string, any], idx) => {
          const t = val.notes || val.filmTitle || '';
          return {
            id: `${outletId}_${studioName}_${idx}`,
            studioName,
            filmTitle: t,
            genre: this.resolveFilmGenre(t, val.genre),
            shows: val.shows || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
            notes: val.notes || '',
          };
        });
      }
      return null;
    } catch {
      return null;
    }
  },

  normalizeDateStr(d: string): string {
    if (!d) return '';
    const clean = d.trim();
    const parts = clean.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return clean;
  },

  saveOccupancyRecord(
    outletId: string,
    date: string,
    data: Array<{
      id: string;
      studioName: string;
      filmTitle?: string;
      genre?: string;
      capacity?: number;
      shows: { [showNum: number]: number };
      notes: string;
    }> | any
  ) {
    const normDate = this.normalizeDateStr(date);
    const resolvedData = Array.isArray(data)
      ? data.map((row) => ({
          ...row,
          genre: this.resolveFilmGenre(row.filmTitle || row.notes || '', row.genre),
        }))
      : data;

    // Save with primary normalized key
    localStorage.setItem(`${KEYS.OCCUPANCY}_${outletId}_${normDate}`, JSON.stringify(resolvedData));
    if (normDate !== date) {
      localStorage.setItem(`${KEYS.OCCUPANCY}_${outletId}_${date}`, JSON.stringify(resolvedData));
    }
    // Also save legacy key for compatibility
    localStorage.setItem(`cinema_xxi_occupancy_${outletId}_${normDate}`, JSON.stringify(resolvedData));

    // Save to persistent manifest catalog to ensure it never gets lost
    try {
      const manifestRaw = localStorage.getItem('cinema_xxi_occupancy_manifest');
      const manifest = manifestRaw ? JSON.parse(manifestRaw) : {};
      manifest[`${outletId}_${normDate}`] = {
        outletId,
        date: normDate,
        data: resolvedData,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('cinema_xxi_occupancy_manifest', JSON.stringify(manifest));
    } catch {
      // ignore
    }

    this.broadcastChange('occupancy');

    // Auto-sync into movie history records
    if (Array.isArray(resolvedData)) {
      this.syncOccupancyToMovieHistory(outletId, normDate, resolvedData);
    }

    // Asynchronous background sync ke Supabase jika terhubung
    import('./supabase')
      .then((m) => m.syncOccupancyToSupabase(outletId, normDate, Array.isArray(data) ? data : []))
      .catch(() => {});
  },

  // Broadcast & Sync (Asynchronous to prevent React setState-in-render collisions)
  broadcastChange(type: string) {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('cinema-xxi-storage-update', { detail: { type } }));
    }, 0);
  },

  // Reset all to fresh initial state
  resetAllData() {
    localStorage.removeItem(KEYS.SALES);
    localStorage.removeItem(KEYS.BAKING);
    localStorage.removeItem(KEYS.INSPECTION);
    localStorage.removeItem(KEYS.MOVIES);
    localStorage.removeItem(KEYS.AREAS);
    localStorage.removeItem(KEYS.OUTLETS);

    // Clear all occupancy records
    try {
      const allKeys = Object.keys(localStorage);
      allKeys.forEach((k) => {
        if (k.startsWith('cinema_xxi_occupancy_')) {
          localStorage.removeItem(k);
        }
      });
    } catch {
      // ignore
    }

    this.broadcastChange('all-reset');
  },

  // Outlet Administration
  getOutletAdministrations(): OutletAdministrationRecord[] {
    const raw = localStorage.getItem(KEYS.ADMINISTRATION);
    if (!raw) {
      const defaults: OutletAdministrationRecord[] = [
        {
          id: 'admin_bogor1_2026_10',
          outletId: 'bogor_1',
          month: '2026-10',
          cogs: 45000000,
          adjustment: 1500000,
          spoil: 750000,
          waste: 500000,
          usage: 42000000,
          updatedAt: '2026-10-09',
        },
        {
          id: 'admin_bogor2_2026_10',
          outletId: 'bogor_2',
          month: '2026-10',
          cogs: 38000000,
          adjustment: 1000000,
          spoil: 600000,
          waste: 400000,
          usage: 36000000,
          updatedAt: '2026-10-09',
        },
      ];
      localStorage.setItem(KEYS.ADMINISTRATION, JSON.stringify(defaults));
      return defaults;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveOutletAdministrationRecord(record: OutletAdministrationRecord) {
    const records = this.getOutletAdministrations();
    const idx = records.findIndex(
      (r) => r.outletId === record.outletId && r.month === record.month
    );
    if (idx >= 0) {
      records[idx] = { ...records[idx], ...record, updatedAt: new Date().toISOString().split('T')[0] };
    } else {
      records.push({
        ...record,
        id: record.id || `admin_${record.outletId}_${record.month}`,
        updatedAt: new Date().toISOString().split('T')[0],
      });
    }
    localStorage.setItem(KEYS.ADMINISTRATION, JSON.stringify(records));
    this.broadcastChange('administration');
  },

  // BOPO Records
  getBopoRecords(): BopoRecord[] {
    const raw = localStorage.getItem(KEYS.BOPO);
    if (!raw) {
      const defaults: BopoRecord[] = [
        {
          id: 'bopo_bogor1_2026_10',
          outletId: 'bogor_1',
          month: '2026-10',
          pendapatanTiket: 185000000,
          pendapatanFnb: 95000000,
          pendapatanLain: 12000000,
          biayaGaji: 45000000,
          biayaSewa: 60000000,
          biayaUtilitas: 18000000,
          biayaMarketing: 8000000,
          biayaPemeliharaan: 10000000,
          biayaLainnya: 5000000,
          updatedAt: '2026-10-09',
        },
        {
          id: 'bopo_bogor2_2026_10',
          outletId: 'bogor_2',
          month: '2026-10',
          pendapatanTiket: 150000000,
          pendapatanFnb: 80000000,
          pendapatanLain: 10000000,
          biayaGaji: 40000000,
          biayaSewa: 50000000,
          biayaUtilitas: 15000000,
          biayaMarketing: 6000000,
          biayaPemeliharaan: 8000000,
          biayaLainnya: 4000000,
          updatedAt: '2026-10-09',
        },
      ];
      localStorage.setItem(KEYS.BOPO, JSON.stringify(defaults));
      return defaults;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveBopoRecord(record: BopoRecord) {
    const records = this.getBopoRecords();
    const idx = records.findIndex(
      (r) => r.outletId === record.outletId && r.month === record.month
    );
    if (idx >= 0) {
      records[idx] = { ...records[idx], ...record, updatedAt: new Date().toISOString().split('T')[0] };
    } else {
      records.push({
        ...record,
        id: record.id || `bopo_${record.outletId}_${record.month}`,
        updatedAt: new Date().toISOString().split('T')[0],
      });
    }
    localStorage.setItem(KEYS.BOPO, JSON.stringify(records));
    this.broadcastChange('bopo');
  },

  // Employees (HC Area)
  getEmployees(): Employee[] {
    const raw = localStorage.getItem(KEYS.EMPLOYEES);
    const sawanganEmployees: Employee[] = [
      { id: 'saw_1', nik: '00000007464', name: 'Wisnu Saputra', jabatan: 'Cinema Assistant Manager', divisi: 'Cinema', outletId: 'the-park-sawangan-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2017-02-28', habisKontrak: '2028-02-28', phone: '085697956229' },
      { id: 'saw_2', nik: '00000011659', name: 'Apudin', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'the-park-sawangan-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-16', habisKontrak: '2027-06-16', phone: '085711742436' },
      { id: 'saw_3', nik: '00000015589', name: 'Muhammad Badrussalam', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'the-park-sawangan-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-16', phone: '0881024894756' },
      { id: 'saw_4', nik: '00000019244', name: 'Muhammad Mukhaimin', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'the-park-sawangan-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-01', habisKontrak: '2027-05-01', phone: '089639710438' },
      { id: 'saw_5', nik: '00000020226', name: 'Ary Sopyan Sidik', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'the-park-sawangan-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-25', phone: '085772037865' },
      { id: 'saw_6', nik: '00000011375', name: 'Qhailas Mustafa Jhubhair', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'the-park-sawangan-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-06-01', phone: '089614799949' },
      { id: 'saw_7', nik: '00000019350', name: 'Dandi Gusnandi', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'the-park-sawangan-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-01', habisKontrak: '2027-05-01', phone: '082120914432' },
      { id: 'saw_8', nik: '00000023205', name: 'Anisa Amriasih', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'the-park-sawangan-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-01', habisKontrak: '2027-07-01', phone: '08816852389' },
      { id: 'saw_9', nik: '00000025022', name: 'Dhea Fakhira', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'the-park-sawangan-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-01', habisKontrak: '2027-03-01', phone: '08989898107' },
      { id: 'saw_10', nik: '00000025460', name: 'Davina Aprilia Rakhmat', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'the-park-sawangan-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-08-01', habisKontrak: '2027-08-01', phone: '085810941783' },
      { id: 'saw_11', nik: '00000016765', name: 'Marsha Fahira Hermawan', jabatan: 'Cinema Supervisor', divisi: 'Cinema', outletId: 'the-park-sawangan-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-22', habisKontrak: '2027-06-22', phone: '082114917516' },
      { id: 'saw_12', nik: '00000014196', name: 'Aneke Yuliana', jabatan: 'Guide', divisi: 'Cinema', outletId: 'the-park-sawangan-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-25', phone: '089513145782' },
      { id: 'saw_13', nik: '00000014281', name: 'Ade Irma', jabatan: 'Guide', divisi: 'Cinema', outletId: 'the-park-sawangan-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-25', phone: '087886517980' },
      { id: 'saw_14', nik: '00000021686', name: 'Davina Adinda Pertiwi', jabatan: 'Guide', divisi: 'Cinema', outletId: 'the-park-sawangan-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-12-01', habisKontrak: '2026-12-01', phone: '085691542058' },
      { id: 'saw_15', nik: '00000024032', name: 'Sisi Aprilia Zara', jabatan: 'Guide', divisi: 'Cinema', outletId: 'the-park-sawangan-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-21', habisKontrak: '2027-06-21', phone: '085882827029' },
      { id: 'saw_16', nik: '11064043706', name: 'Imam Santoso', jabatan: 'Technical', divisi: 'Cinema', outletId: 'the-park-sawangan-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-06-21', habisKontrak: '2030-06-21', phone: '085714555264' },
      { id: 'saw_17', nik: '01039121320', name: 'Ismail Ramli', jabatan: 'Technical', divisi: 'Cinema', outletId: 'the-park-sawangan-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-06-21', habisKontrak: '2030-06-21', phone: '087876485497' },
      { id: 'saw_18', nik: '01060131709', name: 'Fery Ramadhan Siregar', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'the-park-sawangan-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-06-21', habisKontrak: '2030-06-21', phone: '089514745111' },
    ];

    if (!raw) {
      const defaults: Employee[] = [
        { id: 'img_emp_1', nik: '000000240215', name: 'Budi Santoso', jabatan: 'Technical', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2024-02-15', habisKontrak: '2027-02-15', phone: '081234567801' },
        { id: 'img_emp_2', nik: '00000014492', name: 'Fenita Fitriani', jabatan: 'Guide', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-13', habisKontrak: '2027-07-13', phone: '081234567802' },
        { id: 'img_emp_3', nik: '00000015943', name: 'Indah Lestari', jabatan: 'Guide', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-16', phone: '081234567803' },
        { id: 'img_emp_4', nik: '00000020171', name: 'Amanda Sri Permani', jabatan: 'Guide', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-25', phone: '081234567804' },
        { id: 'img_emp_5', nik: '00000024917', name: 'Amanda Aurellya', jabatan: 'Guide', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-02-16', habisKontrak: '2027-02-16', phone: '081234567805' },
        { id: 'img_emp_6', nik: '00000013407', name: 'Eko Komarudin', jabatan: 'Technical', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-11-23', habisKontrak: '2026-11-23', phone: '081234567806' },
        { id: 'img_emp_7', nik: '00000019532', name: 'Axcel Raditia Putra', jabatan: 'Technical', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-16', habisKontrak: '2027-05-16', phone: '081234567807' },
        { id: 'img_emp_8', nik: '00000014491', name: 'Amanah Supwiro', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-25', phone: '081234567808' },
        { id: 'img_emp_9', nik: '00000015901', name: 'Annisa Pratiwi', jabatan: 'Cinema Supervisor', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-16', phone: '081234567809' },
        { id: 'img_emp_10', nik: '00000008663', name: 'Rahmat Jaya Purnama', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Magang', tanggalKontrak: '2026-06-26', habisKontrak: '2026-12-26', phone: '081234567810' },
        { id: 'img_emp_11', nik: '00000015745', name: 'Muhammad Bagus Alfatah', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-13', habisKontrak: '2027-07-13', phone: '081234567811' },
        { id: 'img_emp_12', nik: '00000021619', name: 'Jimmy Yolanda', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-13', habisKontrak: '2027-07-13', phone: '081234567812' },
        { id: 'img_emp_13', nik: '00000011371', name: 'Juli Zulkipli', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-06-01', phone: '081234567813' },
        { id: 'img_emp_14', nik: '00000015457', name: 'Agam Aldi', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-16', phone: '081234567814' },
        { id: 'img_emp_15', nik: '00000012329', name: 'Helmalia Putri', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-16', phone: '081234567815' },
        { id: 'img_emp_16', nik: '00000013226', name: 'Puji Lestari', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-11-16', habisKontrak: '2026-11-16', phone: '081234567816' },
        { id: 'img_emp_17', nik: '00000013229', name: 'Juwita', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-11-16', habisKontrak: '2026-11-16', phone: '081234567817' },
        { id: 'img_emp_18', nik: '00000020084', name: 'Silvi Clara Sita', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-16', habisKontrak: '2027-06-16', phone: '081234567818' },
        { id: 'img_emp_19', nik: '00000020721', name: 'Gita Ayu Lestari', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-08-16', habisKontrak: '2026-08-16', phone: '081234567819' },
        { id: 'img_emp_20', nik: '00000023240', name: 'Maulida Choerunnisa', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-01', habisKontrak: '2027-07-01', phone: '081234567820' },
        { id: 'img_emp_21', nik: '00000025668', name: 'Liskya Sifa Sandria', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-16', habisKontrak: '2027-06-16', phone: '081234567821' },
        { id: 'img_emp_22', nik: '00000013699', name: 'Fajriani Nur Jelita', jabatan: 'Accounting Officer', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-13', habisKontrak: '2027-07-13', phone: '081234567822' },
        { id: 'img_emp_23', nik: '00000018698', name: 'Dwi Intan Suryani', jabatan: 'Hello Sunday Waiters', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-02-16', habisKontrak: '2027-02-16', phone: '081234567823' },
        { id: 'img_emp_24', nik: '00000019617', name: 'Rivany Yudi Nursabilillah', jabatan: 'Hello Sunday Waiters', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-16', habisKontrak: '2027-05-16', phone: '081234567824' },
        { id: 'img_emp_25', nik: '00000023259', name: 'Muhammad Rifky Faddilah Azzikra', jabatan: 'Hello Sunday Waiters', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-01', habisKontrak: '2027-07-01', phone: '081234567825' },
        { id: 'img_emp_26', nik: '00000011377', name: 'Muhamad Daud', jabatan: 'Hello Sunday Barista', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-06-01', phone: '081234567826' },
        { id: 'img_emp_27', nik: '00000011974', name: 'Sofian Yudistira', jabatan: 'Hello Sunday Barista', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-25', phone: '081234567827' },
        { id: 'img_emp_28', nik: '00000024531', name: 'Roby Yulianto', jabatan: 'Premiere Chef De Partie', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-13', habisKontrak: '2027-07-13', phone: '081234567828' },
        { id: 'img_emp_29', nik: '01073161964', name: 'Rachmat Hidayat', jabatan: 'Premiere Commis', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-13', habisKontrak: '2030-07-13', phone: '081234567829' },
        { id: 'img_emp_30', nik: '00000014577', name: 'Muhamad Nasir', jabatan: 'Hello Sunday Cook Helper', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-25', phone: '081234567830' },
        { id: 'img_emp_31', nik: '00000015891', name: 'Muhamad Sidik Adi Putra Permana', jabatan: 'Hello Sunday Cook Helper', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-16', phone: '081234567831' },
        { id: 'img_emp_32', nik: '01070175297', name: 'Dani Nugraha', jabatan: 'Cinema Assistant Manager', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-16', habisKontrak: '2030-07-16', phone: '081234567832' },
        ...sawanganEmployees,
      ];
      localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(defaults));
      return defaults;
    }
    const bogorSquareEmployees: Employee[] = [
      { id: 'bs_1', nik: '01063101768', name: 'Tajudin', jabatan: 'Cinema Manager', divisi: 'Cinema', outletId: 'bogor-square-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-06-21', habisKontrak: '2030-06-21', phone: '-' },
      { id: 'bs_2', nik: '00000011310', name: 'Ervina Aprilia', jabatan: 'Guide', divisi: 'Cinema', outletId: 'bogor-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
      { id: 'bs_3', nik: '00000019508', name: 'Destia Fitriani', jabatan: 'Guide', divisi: 'Cinema', outletId: 'bogor-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-16', habisKontrak: '2027-05-15', phone: '-' },
      { id: 'bs_4', nik: '01060091714', name: 'Irwan', jabatan: 'Technical', divisi: 'Cinema', outletId: 'bogor-square-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-09', habisKontrak: '2030-07-09', phone: '-' },
      { id: 'bs_5', nik: '01009040440', name: 'Nursuhandoyo', jabatan: 'Technical', divisi: 'Cinema', outletId: 'bogor-square-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-09', habisKontrak: '2030-07-09', phone: '-' },
      { id: 'bs_6', nik: '01056131651', name: 'Agus Rohadi', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'bogor-square-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-09', habisKontrak: '2030-07-09', phone: '-' },
      { id: 'bs_7', nik: '00000021113', name: 'Muhamad Aldi', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'bogor-square-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-10-01', habisKontrak: '2027-09-30', phone: '-' },
      { id: 'bs_8', nik: '01061081735', name: 'Adi Wijaya', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'bogor-square-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-09', habisKontrak: '2030-07-09', phone: '-' },
      { id: 'bs_9', nik: '00000014530', name: 'Ipan Maulana', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'bogor-square-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'bs_10', nik: '00000016116', name: 'Endang Supriatna', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'bogor-square-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-15', habisKontrak: '2027-04-14', phone: '-' },
      { id: 'bs_11', nik: '00000012384', name: 'Sinta Maskuroh', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'bogor-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-15', phone: '-' },
      { id: 'bs_12', nik: '00000014531', name: 'Tifani Anastasya', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'bogor-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'bs_13', nik: '00000019502', name: 'Euis Zuariah', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'bogor-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-16', habisKontrak: '2027-05-15', phone: '-' },
      { id: 'bs_14', nik: '00000025765', name: 'Dila Siti Padila', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'bogor-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-01', habisKontrak: '2027-06-30', phone: '-' },
      { id: 'bs_15', nik: '00000025889', name: 'Neza Fida Aprilia', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'bogor-square-xxi', gender: 'P', statusKerja: 'Magang', tanggalKontrak: '2026-07-02', habisKontrak: '2026-10-01', phone: '-' },
    ];

    const bgmEmployees: Employee[] = [
      { id: 'bgm_1', nik: '01063111762', name: 'Muhammad Fahmi', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'bogor-great-mall-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-09', habisKontrak: '2030-07-09', phone: '-' },
      { id: 'bgm_2', nik: '01056121662', name: 'Wisma Sajuta', jabatan: 'Technical', divisi: 'Cinema', outletId: 'bogor-great-mall-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-09', habisKontrak: '2030-07-09', phone: '-' },
      { id: 'bgm_3', nik: '00000012167', name: 'Sahrizal', jabatan: 'Technical', divisi: 'Cinema', outletId: 'bogor-great-mall-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-01', habisKontrak: '2027-06-30', phone: '-' },
      { id: 'bgm_4', nik: '00000014188', name: 'Nia Amelia Aswar', jabatan: 'Guide', divisi: 'Cinema', outletId: 'bogor-great-mall-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-24', habisKontrak: '2027-03-23', phone: '-' },
      { id: 'bgm_5', nik: '00000013701', name: 'Dian Herlinawati', jabatan: 'Guide', divisi: 'Cinema', outletId: 'bogor-great-mall-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-12-15', habisKontrak: '2027-12-16', phone: '-' },
      { id: 'bgm_6', nik: 'R17746608', name: 'Azi ardiansyah', jabatan: 'Customer Relation', divisi: 'Cinema', outletId: 'bogor-great-mall-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-09', habisKontrak: '2030-07-09', phone: '-' },
      { id: 'bgm_7', nik: 'R17748032', name: 'Muhamad alamsah', jabatan: 'Customer Relation', divisi: 'Cinema', outletId: 'bogor-great-mall-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-09', habisKontrak: '2030-07-09', phone: '-' },
      { id: 'bgm_8', nik: '00000013528', name: 'Ahmad yunus', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'bogor-great-mall-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-12-01', habisKontrak: '2026-12-01', phone: '-' },
      { id: 'bgm_9', nik: '00000017283', name: 'Dika Pratama', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'bogor-great-mall-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-09-22', habisKontrak: '2026-09-21', phone: '-' },
      { id: 'bgm_10', nik: '00000011696', name: 'M syahroji', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'bogor-great-mall-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-16', habisKontrak: '2027-07-16', phone: '-' },
      { id: 'bgm_11', nik: '00000012332', name: 'Lusi Julianti', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'bogor-great-mall-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-15', habisKontrak: '2027-07-15', phone: '-' },
      { id: 'bgm_12', nik: '00000016088', name: 'Winda Wulansari', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'bogor-great-mall-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-14', habisKontrak: '2027-04-14', phone: '-' },
      { id: 'bgm_13', nik: '00000019511', name: 'Suci Aulia', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'bogor-great-mall-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-16', habisKontrak: '2027-04-14', phone: '-' },
      { id: 'bgm_14', nik: '00000017630', name: 'Hazri Farhan Arafah', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'bogor-great-mall-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-10-23', habisKontrak: '2026-10-22', phone: '-' },
      { id: 'bgm_15', nik: '00000014529', name: 'Dian Ramadhanty', jabatan: 'Cinema Supervisor', divisi: 'Cinema', outletId: 'bogor-great-mall-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
    ];

    const botaniEmployees: Employee[] = [
      { id: 'bot_1', nik: '11064163712', name: 'RIDWANSYAH', jabatan: 'Cinema Manager', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-15', habisKontrak: '2030-07-15', phone: '-' },
      { id: 'bot_2', nik: '00000011698', name: 'TRIA DEWI YULIANTI', jabatan: 'Cinema Supervisor', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-15', habisKontrak: '2027-07-15', phone: '-' },
      { id: 'bot_3', nik: '00000015902', name: 'ICA NURUL ANISAH PUTRI', jabatan: 'Guide', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-15', habisKontrak: '2027-04-15', phone: '-' },
      { id: 'bot_4', nik: '01057131664', name: 'ANDRIANSYAH SUMADJI', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-15', habisKontrak: '2030-07-15', phone: '-' },
      { id: 'bot_5', nik: '01057961695', name: 'TARYONO', jabatan: 'Technical', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-15', habisKontrak: '2030-07-15', phone: '-' },
      { id: 'bot_6', nik: '01057198736', name: 'M DANU SAPUTRA', jabatan: 'Customer Relation', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-15', habisKontrak: '2030-07-15', phone: '-' },
      { id: 'bot_7', nik: '00000019518', name: 'RIZKI RAMADHAN', jabatan: 'Technical', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-15', habisKontrak: '2027-05-15', phone: '-' },
      { id: 'bot_8', nik: '00000025053', name: 'Ratu Frasti Syahna', jabatan: 'Guide', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-16', habisKontrak: '2027-03-16', phone: '-' },
      { id: 'bot_9', nik: '00000019562', name: 'Ghamal Bunga', jabatan: 'Guide', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-15', habisKontrak: '2027-05-15', phone: '-' },
      { id: 'bot_10', nik: '00000021867', name: 'Amanda Lidiya Sari', jabatan: 'Guide', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-01-01', habisKontrak: '2026-12-31', phone: '-' },
      { id: 'bot_11', nik: '00000020158', name: 'Muhamad Kahfi Harbowo', jabatan: 'Technical', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-25', phone: '-' },
      { id: 'bot_12', nik: '00000011440', name: 'Hamzah Warisi', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
      { id: 'bot_13', nik: '00000017691', name: 'R. M. Irsan', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-10-04', habisKontrak: '2026-10-04', phone: '-' },
      { id: 'bot_14', nik: '00000024053', name: 'Reza Fachlevy', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-18', habisKontrak: '2027-07-18', phone: '-' },
      { id: 'bot_15', nik: '00000011962', name: 'Toto Dwi Septianto', jabatan: 'Mixologist', divisi: 'F&B', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-25', phone: '-' },
      { id: 'bot_16', nik: '00000014502', name: 'Putri Salsabila', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'bot_17', nik: '00000017688', name: 'Adilla Agrien Binangkit', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-10-24', habisKontrak: '2026-10-24', phone: '-' },
      { id: 'bot_18', nik: '00000019489', name: 'Samsul Harahap', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-16', habisKontrak: '2027-05-15', phone: '-' },
      { id: 'bot_19', nik: '00000020172', name: 'Nur Sheva Salsabila', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-24', phone: '-' },
      { id: 'bot_20', nik: '00000020941', name: 'Amanda', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-09-16', habisKontrak: '2026-09-15', phone: '-' },
      { id: 'bot_21', nik: '00000025877', name: 'Anugrah Kristama', jabatan: 'Accounting Officer', divisi: 'F&B', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-15', phone: '-' },
      { id: 'bot_22', nik: '00000024330', name: 'NENG SILVA', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-11-29', habisKontrak: '2026-11-29', phone: '-' },
      { id: 'bot_23', nik: '00000017326', name: 'SITI NURMAYANI AGUSTIN', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-09-27', habisKontrak: '2026-09-27', phone: '-' },
      { id: 'bot_24', nik: '00000014638', name: 'FAHRUR ROZI', jabatan: 'Mixologist', divisi: 'F&B', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-21', habisKontrak: '2027-07-21', phone: '-' },
    ];

    const boxiesEmployees: Employee[] = [
      { id: 'box_1', nik: '00000011990', name: 'Fathin Adji Pratama', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-24', phone: '-' },
      { id: 'box_2', nik: '00000020386', name: 'Adam Zacky Fadilah', jabatan: 'Cafe Mixologist', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-15', phone: '-' },
      { id: 'box_3', nik: '00000020157', name: 'Teguh Budianto', jabatan: 'Technical', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-24', phone: '-' },
      { id: 'box_4', nik: '00000025751', name: 'Sara Deva Afkara', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'boxies-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-24', phone: '-' },
      { id: 'box_5', nik: '00000025679', name: 'Aprilia DW 3 Bln', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'boxies-xxi', gender: 'P', statusKerja: 'Magang', tanggalKontrak: '2026-06-08', habisKontrak: '2026-09-07', phone: '-' },
      { id: 'box_6', nik: '00000025095', name: 'Muhamad Buzairimi', jabatan: 'Cafe Commis', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-14', habisKontrak: '2027-03-15', phone: '-' },
      { id: 'box_7', nik: '00000014501', name: 'Ferdi Maulana Rasyid', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'boxies-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'box_8', nik: '00000014503', name: 'Resa Novianti', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'boxies-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'box_9', nik: '00000014189', name: 'Wati Herawati', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'boxies-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'box_10', nik: '700199', name: 'Mirantie Maulidya Rosdayana', jabatan: 'Cinema Supervisor', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'box_11', nik: '00000022095', name: 'Tiara Destianti Putri', jabatan: 'Guide', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-02-01', habisKontrak: '2027-01-31', phone: '-' },
      { id: 'box_12', nik: '00000024294', name: 'Rany Bunardi', jabatan: 'Guide', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-11-01', habisKontrak: '2026-10-31', phone: '-' },
      { id: 'box_13', nik: '03058933281', name: 'Sardiyanto', jabatan: 'Cinema Manager', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '1993-04-21', habisKontrak: '2030-04-21', phone: '-' },
      { id: 'box_14', nik: '00000007209', name: 'Mega Setiawan', jabatan: 'Customer Relation', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2020-01-24', habisKontrak: '2030-01-24', phone: '-' },
      { id: 'box_15', nik: '00000017689', name: 'FARHAN MAULANA CONTRACK 3', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'boxies-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-10-24', habisKontrak: '2026-10-24', phone: '-' },
      { id: 'box_16', nik: '01057071673', name: 'Febian PERMANENT', jabatan: 'Technical', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2007-11-07', habisKontrak: '2030-11-07', phone: '-' },
    ];

    const btmEmployees: Employee[] = [
      { id: 'btm_1', nik: '01063101767', name: 'Sutan Jamaludin Lubis', jabatan: 'Technical', divisi: 'Cinema', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-06-20', habisKontrak: '2030-06-20', phone: '-' },
      { id: 'btm_2', nik: '00000025107', name: 'Cindy Nurrahmawati', jabatan: 'Guide', divisi: 'Cinema', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-16', habisKontrak: '2027-03-15', phone: '-' },
      { id: 'btm_3', nik: '00000020159', name: 'Gita Putri Hikmawati', jabatan: 'Guide', divisi: 'Cinema', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-24', phone: '-' },
      { id: 'btm_4', nik: '00000020906', name: 'Elis Tiyani', jabatan: 'Guide', divisi: 'Cinema', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-09-16', habisKontrak: '2026-09-15', phone: '-' },
      { id: 'btm_5', nik: '00000016492', name: 'Jaka Saputra', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-25', habisKontrak: '2027-05-24', phone: '-' },
      { id: 'btm_6', nik: '03058963277', name: 'Nasrullah', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-06-20', habisKontrak: '2030-06-20', phone: '-' },
      { id: 'btm_7', nik: '03058123284', name: 'Ujang Saepudin', jabatan: 'Technical', divisi: 'Cinema', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-06-20', habisKontrak: '2030-06-20', phone: '-' },
      { id: 'btm_8', nik: '00000025641', name: 'Intan Nuraeni', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-16', habisKontrak: '2027-06-15', phone: '-' },
      { id: 'btm_9', nik: '00000009280', name: 'Rizka Halma', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Magang', tanggalKontrak: '2026-05-06', habisKontrak: '2026-08-05', phone: '-' },
      { id: 'btm_10', nik: '00000025459', name: 'Rico Jasanta', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Magang', tanggalKontrak: '2026-08-01', habisKontrak: '2027-07-31', phone: '-' },
      { id: 'btm_11', nik: '00000025699', name: 'Antara Maidani Kaimudin', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Magang', tanggalKontrak: '2026-06-10', habisKontrak: '2026-09-09', phone: '-' },
      { id: 'btm_12', nik: '00000020154', name: 'Citra Melina', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-24', phone: '-' },
      { id: 'btm_13', nik: '00000025662', name: 'Fellisa Wanda Kristian', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-16', habisKontrak: '2027-06-15', phone: '-' },
      { id: 'btm_14', nik: '00000023545', name: 'Jeny Indira', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-08-01', habisKontrak: '2027-07-31', phone: '-' },
      { id: 'btm_15', nik: '00000025945', name: 'Tustinia Alyawati', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Magang', tanggalKontrak: '2026-07-05', habisKontrak: '2026-10-04', phone: '-' },
      { id: 'btm_16', nik: '00000023465', name: 'Ardhito Sayudha Bagas Praditya', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-08-01', habisKontrak: '2027-07-31', phone: '-' },
      { id: 'btm_17', nik: '00000024914', name: 'Ferry Irawan', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-02-16', habisKontrak: '2027-02-15', phone: '-' },
      { id: 'btm_18', nik: '00000012314', name: 'Intan Aprillia Citra', jabatan: 'Cinema Supervisor', divisi: 'Cinema', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-07-16', habisKontrak: '2026-07-15', phone: '-' },
      { id: 'btm_19', nik: '00000014765', name: 'Ambar Wulandari', jabatan: 'Cinema Supervisor', divisi: 'Cinema', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'btm_20', nik: '00000025060', name: 'Zagarr Gatin', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-16', habisKontrak: '2027-03-15', phone: '-' },
      { id: 'btm_21', nik: '00000024915', name: 'Melia Dela Sapitri', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-02-16', habisKontrak: '2027-02-15', phone: '-' },
      { id: 'btm_22', nik: '00000024427', name: 'Muhamad Faizan Rijali', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-02-16', habisKontrak: '2027-02-15', phone: '-' },
      { id: 'btm_23', nik: '00000025011', name: 'Abdul Aziz Alfarizi', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-01', habisKontrak: '2027-02-28', phone: '-' },
      { id: 'btm_24', nik: '00000021621', name: 'Aditya Pramesti', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-12-01', habisKontrak: '2026-11-30', phone: '-' },
      { id: 'btm_25', nik: '00000014509', name: 'Nurkholifah Surahman', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'btm_26', nik: '00000014540', name: 'Guslatifah Sapitri', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
    ];

    const cibinongEmployees: Employee[] = [
      { id: 'cib_1', nik: '00000014660', name: 'Ratna Safitri', jabatan: 'Cinema Supervisor', divisi: 'Cinema', outletId: 'cibinong-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-26', habisKontrak: '2027-03-25', phone: '-' },
      { id: 'cib_2', nik: '01060021734', name: 'YULIANTO', jabatan: 'Technical', divisi: 'Cinema', outletId: 'cibinong-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2002-11-20', habisKontrak: '2030-11-20', phone: '-' },
      { id: 'cib_3', nik: '01060141713', name: 'IRFAN MAULANA', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'cibinong-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2011-01-18', habisKontrak: '2030-01-18', phone: '-' },
      { id: 'cib_4', nik: '00000021483', name: 'Ridho Febriandi', jabatan: 'Technical', divisi: 'Cinema', outletId: 'cibinong-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-11-16', habisKontrak: '2027-11-15', phone: '-' },
      { id: 'cib_5', nik: '00000022480', name: 'Dhea Marcella Putri', jabatan: 'Guide', divisi: 'Cinema', outletId: 'cibinong-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-01', habisKontrak: '2027-03-31', phone: '-' },
      { id: 'cib_6', nik: '00000015444', name: 'Ira Mayasari', jabatan: 'Guide', divisi: 'Cinema', outletId: 'cibinong-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-15', phone: '-' },
      { id: 'cib_7', nik: '00000016097', name: 'Vebi Suci Kristanti', jabatan: 'Guide', divisi: 'Cinema', outletId: 'cibinong-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-15', phone: '-' },
      { id: 'cib_8', nik: '01032161108', name: 'Fachri Mohamad Wahyudin', jabatan: 'Cinema Area Manager', divisi: 'Cinema', outletId: 'cibinong-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2013-07-01', habisKontrak: '2030-07-01', phone: '-' },
    ];

    const cipanasEmployees: Employee[] = [
      { id: 'cip_1', nik: '00000015136', name: 'ADIES FEBRIANSYAH', jabatan: 'Cinema Assistant Manager', divisi: 'Cinema', outletId: 'ciplaz-cipanas-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-21', habisKontrak: '2027-03-20', phone: '-' },
      { id: 'cip_2', nik: '00000026373', name: 'Andini Agustini', jabatan: 'Guide', divisi: 'Cinema', outletId: 'ciplaz-cipanas-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-01', habisKontrak: '2027-04-30', phone: '-' },
      { id: 'cip_3', nik: '00000025366', name: 'Muhammad Faisal Herwanto', jabatan: 'Technical', divisi: 'Cinema', outletId: 'ciplaz-cipanas-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-01', habisKontrak: '2027-04-30', phone: '-' },
      { id: 'cip_4', nik: '00000025367', name: 'Ferdy Firmansyah Putra Hidayat', jabatan: 'Technical', divisi: 'Cinema', outletId: 'ciplaz-cipanas-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-01', habisKontrak: '2027-04-30', phone: '-' },
      { id: 'cip_5', nik: '00000025452', name: 'M Jabbar R', jabatan: 'Technical', divisi: 'Cinema', outletId: 'ciplaz-cipanas-xxi', gender: 'L', statusKerja: 'Magang', tanggalKontrak: '2026-06-01', habisKontrak: '2026-08-31', phone: '-' },
      { id: 'cip_6', nik: '00000025525', name: 'Muhaemin', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'ciplaz-cipanas-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
      { id: 'cip_7', nik: '00000025526', name: 'Bimaseto Aji Prasetyo Dwiasro', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'ciplaz-cipanas-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
      { id: 'cip_8', nik: '00000025375', name: 'Muhamad Adam Abdilah', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'ciplaz-cipanas-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-01', habisKontrak: '2027-04-30', phone: '-' },
      { id: 'cip_9', nik: '00000025524', name: 'M. Yazied Sugiarto', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'ciplaz-cipanas-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
      { id: 'cip_10', nik: '00000025534', name: 'Parningotan Saputra Sinaga', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'ciplaz-cipanas-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
      { id: 'cip_11', nik: '00000025226', name: 'Fatimah Zahra', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ciplaz-cipanas-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-15', phone: '-' },
      { id: 'cip_12', nik: '000000253005', name: 'Rahayu Qoyumi', jabatan: 'Guide', divisi: 'Cinema', outletId: 'ciplaz-cipanas-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-15', phone: '-' },
      { id: 'cip_13', nik: '00000025369', name: 'Rini Alifriani', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ciplaz-cipanas-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-01', habisKontrak: '2027-04-30', phone: '-' },
      { id: 'cip_14', nik: '00000025371', name: 'Dina Silvia', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ciplaz-cipanas-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-01', habisKontrak: '2027-04-30', phone: '-' },
      { id: 'cip_15', nik: '00000025522', name: 'Laura Nur Fatimah Rochmat', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ciplaz-cipanas-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
    ];

    const parungEmployees: Employee[] = [
      { id: 'prg_1', nik: '00000015238', name: 'Muhamad Lufiyanto', jabatan: 'Technical', divisi: 'Cinema', outletId: 'ciplaz-parung-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'prg_2', nik: '03059973298', name: 'Hasan Basri', jabatan: 'Technical', divisi: 'Cinema', outletId: 'ciplaz-parung-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-06-20', habisKontrak: '2030-06-20', phone: '-' },
      { id: 'prg_3', nik: '00000014527', name: 'Trisna Andrian', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'ciplaz-parung-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'prg_4', nik: '00000025072', name: 'Ervina', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ciplaz-parung-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-16', habisKontrak: '2027-03-15', phone: '-' },
      { id: 'prg_5', nik: '01059198839', name: 'Wulan Maulida', jabatan: 'Guide', divisi: 'Cinema', outletId: 'ciplaz-parung-xxi', gender: 'P', statusKerja: 'Tetap', tanggalKontrak: '2025-10-16', habisKontrak: '2030-10-16', phone: '-' },
      { id: 'prg_6', nik: '00000023255', name: 'Ardita Wulandari', jabatan: 'Guide', divisi: 'Cinema', outletId: 'ciplaz-parung-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-01', habisKontrak: '2027-06-30', phone: '-' },
      { id: 'prg_7', nik: '00000015590', name: 'Afrida Isnaini Farhana', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ciplaz-parung-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-15', phone: '-' },
      { id: 'prg_8', nik: '00000018692', name: 'Diaz Ayuni Paradita', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ciplaz-parung-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-02-16', habisKontrak: '2027-02-15', phone: '-' },
      { id: 'prg_9', nik: '00000020722', name: 'Sri Wahyuni', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ciplaz-parung-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-08-16', habisKontrak: '2027-08-14', phone: '-' },
      { id: 'prg_10', nik: '00000025020', name: 'Marshelyna', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ciplaz-parung-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-01', habisKontrak: '2027-02-28', phone: '-' },
      { id: 'prg_11', nik: '00000013394', name: 'Rendy Birawan', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'ciplaz-parung-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-11-23', habisKontrak: '2026-11-22', phone: '-' },
      { id: 'prg_12', nik: '00000017629', name: 'Anggih Prayoga', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'ciplaz-parung-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-10-23', habisKontrak: '2026-10-22', phone: '-' },
      { id: 'prg_13', nik: '00000019549', name: 'Rifky Sayyidina Alwi', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'ciplaz-parung-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-16', habisKontrak: '2027-05-15', phone: '-' },
      { id: 'prg_14', nik: '00000014203', name: 'Nurul Fitriani', jabatan: 'Cinema Assistant Manager', divisi: 'Cinema', outletId: 'ciplaz-parung-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
    ];

    const margoEmployees: Employee[] = [
      { id: 'mgo_1', nik: '190802', name: 'M Abdul Basit', jabatan: 'Regional Manager', divisi: 'Cinema', outletId: 'margo-city-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2019-08-15', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'mgo_2', nik: '201105', name: 'Fachri Mohamad Wahyudin', jabatan: 'Area Manager', divisi: 'Cinema', outletId: 'margo-city-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2020-11-01', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'mgo_3', nik: '210403', name: 'Susi Karmaiyati', jabatan: 'Cinema Manager', divisi: 'Cinema', outletId: 'margo-city-xxi', gender: 'P', statusKerja: 'Tetap', tanggalKontrak: '2021-04-10', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'mgo_4', nik: '211012', name: 'Rachmat Abdilah Ash Suhendi', jabatan: 'Cinema Manager', divisi: 'Cinema', outletId: 'margo-city-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2021-10-15', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'mgo_5', nik: '00000014523', name: 'Imam Al Fakri', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'margo-city-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-16', phone: '-' },
      { id: 'mgo_6', nik: '00000015456', name: 'Nur Firman Hadi', jabatan: 'Cafe Commis', divisi: 'Cinema', outletId: 'margo-city-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-16', phone: '-' },
      { id: 'mgo_7', nik: '00000019553', name: 'Erfan Tri Ardianto', jabatan: 'Cafe Commis', divisi: 'Cinema', outletId: 'margo-city-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-16', phone: '-' },
      { id: 'mgo_8', nik: '00000025574', name: 'Muhammad Nuzul Hidayatullah', jabatan: 'Cafe Commis', divisi: 'Cinema', outletId: 'margo-city-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-16', phone: '-' },
      { id: 'mgo_9', nik: '00000013559', name: 'Alfonsus Ruslan', jabatan: 'Cafe Mixologist', divisi: 'Cinema', outletId: 'margo-city-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-16', phone: '-' },
      { id: 'mgo_10', nik: '00000023552', name: 'Fajar Rahman', jabatan: 'Cafe Mixologist', divisi: 'Cinema', outletId: 'margo-city-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-16', phone: '-' },
      { id: 'mgo_11', nik: '00000018704', name: 'Nursyifa Tri Fauziah', jabatan: 'Cafe Cashier', divisi: 'Cinema', outletId: 'margo-city-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-16', phone: '-' },
      { id: 'mgo_12', nik: '00000020173', name: 'Enok Nurhasanah', jabatan: 'Cafe Cashier', divisi: 'Cinema', outletId: 'margo-city-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-16', phone: '-' },
      { id: 'mgo_13', nik: '00000021132', name: 'Anisa Nur Safitri', jabatan: 'Cafe Cashier', divisi: 'Cinema', outletId: 'margo-city-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-16', phone: '-' },
      { id: 'mgo_14', nik: '00000021211', name: 'Rose Oktaqi\'ah', jabatan: 'Cafe Cashier', divisi: 'Cinema', outletId: 'margo-city-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-16', phone: '-' },
      { id: 'mgo_15', nik: '00000023480', name: 'Rani Nur Oktaviani', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'margo-city-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-16', phone: '-' },
      { id: 'mgo_16', nik: '00000023554', name: 'Depi Elsavitri', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'margo-city-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-16', phone: '-' },
      { id: 'mgo_17', nik: '00000025006', name: 'Andini Kusumawati', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'margo-city-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-16', phone: '-' },
      { id: 'mgo_18', nik: '01065175804', name: 'Fety Fariza Satifa', jabatan: 'Accounting Officer', divisi: 'F&B', outletId: 'margo-city-xxi', gender: 'P', statusKerja: 'Tetap', tanggalKontrak: '2026-07-16', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'mgo_19', nik: '240522', name: 'Rena Susilowati', jabatan: 'Guide', divisi: 'Cinema', outletId: 'margo-city-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2024-05-15', habisKontrak: '2027-05-15', phone: '-' },
      { id: 'mgo_20', nik: '230919', name: 'Yustinus Lintang Fajar Setyohadi', jabatan: 'Waiter/s', divisi: 'F&B', outletId: 'margo-city-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2023-09-01', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'mgo_21', nik: '231102', name: 'Willy Marshal', jabatan: 'CR', divisi: 'Cinema', outletId: 'margo-city-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2023-11-10', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'mgo_22', nik: '230402', name: 'Didik Gunawan', jabatan: 'CS', divisi: 'Cinema', outletId: 'margo-city-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2023-04-01', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'mgo_23', nik: '230403', name: 'Siti Hasanah', jabatan: 'CS', divisi: 'Cinema', outletId: 'margo-city-xxi', gender: 'P', statusKerja: 'Tetap', tanggalKontrak: '2023-04-05', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'mgo_24', nik: '220618', name: 'Fajriani Nur Jelita', jabatan: 'Accounting Officer', divisi: 'Cinema', outletId: 'margo-city-xxi', gender: 'P', statusKerja: 'Tetap', tanggalKontrak: '2022-06-01', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'mgo_25', nik: '230114', name: 'Anggi Gustiawan', jabatan: 'Barista / Mixologist', divisi: 'F&B', outletId: 'margo-city-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2023-01-20', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'mgo_26', nik: '220805', name: 'Dede Erwin Kadarusman', jabatan: 'Kitchen', divisi: 'F&B', outletId: 'margo-city-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2022-08-10', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'mgo_27', nik: '220311', name: 'Jayub Januar', jabatan: 'Teknikal', divisi: 'Cinema', outletId: 'margo-city-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2022-03-15', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'mgo_28', nik: '240109', name: 'Rose Oktaqiah', jabatan: 'Cashier', divisi: 'F&B', outletId: 'margo-city-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2024-01-10', habisKontrak: '2027-01-10', phone: '-' },
    ];

    const pesonaEmployees: Employee[] = [
      { id: 'psn_1', nik: '00000015022', name: 'Darwanto', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'pesona-square-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-20', habisKontrak: '2027-06-20', phone: '-' },
      { id: 'psn_2', nik: '00000011357', name: 'Dadan', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'pesona-square-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
      { id: 'psn_3', nik: '00000019746', name: 'Muhammad Ilham', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'pesona-square-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-16', habisKontrak: '2027-05-15', phone: '-' },
      { id: 'psn_4', nik: '00000016486', name: 'Sarah Syahadatia', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'pesona-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-25', habisKontrak: '2027-05-24', phone: '-' },
      { id: 'psn_5', nik: '00000017192', name: 'Hilda Sri Bahagia', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'pesona-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-20', habisKontrak: '2027-06-20', phone: '-' },
      { id: 'psn_6', nik: '00000023300', name: 'Margaretha Vira Gisheila', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'pesona-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-01', habisKontrak: '2027-06-30', phone: '-' },
      { id: 'psn_7', nik: '00000024841', name: 'Syifa Setya Athirah', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'pesona-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-20', habisKontrak: '2027-06-20', phone: '-' },
      { id: 'psn_8', nik: '00000024843', name: 'Elsa', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'pesona-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-20', habisKontrak: '2027-06-20', phone: '-' },
      { id: 'psn_9', nik: '00000013233', name: 'Mis Ferianti', jabatan: 'Premiere Waiters', divisi: 'F&B', outletId: 'pesona-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-20', habisKontrak: '2027-06-20', phone: '-' },
      { id: 'psn_10', nik: '00000014667', name: 'Rendy Alviansyah', jabatan: 'Premiere Waiters', divisi: 'F&B', outletId: 'pesona-square-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-20', habisKontrak: '2027-06-20', phone: '-' },
      { id: 'psn_11', nik: '00000011662', name: 'Randy Erik Saputra', jabatan: 'Premiere Barista', divisi: 'F&B', outletId: 'pesona-square-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-16', habisKontrak: '2027-06-15', phone: '-' },
      { id: 'psn_12', nik: '00000011663', name: 'Septiyan', jabatan: 'Premiere Barista', divisi: 'Cinema', outletId: 'pesona-square-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-16', habisKontrak: '2027-06-15', phone: '-' },
      { id: 'psn_13', nik: '00000015512', name: 'Muhammad Rivaldi', jabatan: 'Premiere Cook Helper', divisi: 'F&B', outletId: 'pesona-square-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-15', habisKontrak: '2027-04-14', phone: '-' },
      { id: 'psn_14', nik: '00000020726', name: 'Thomas Hardianto', jabatan: 'Premiere Cook Helper', divisi: 'Cinema', outletId: 'pesona-square-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-08-16', habisKontrak: '2027-08-15', phone: '-' },
      { id: 'psn_15', nik: '01065111787', name: 'Mohamad Rajib Lukmansyah', jabatan: 'Cinema Manager', divisi: 'Cinema', outletId: 'pesona-square-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2016-02-11', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'psn_16', nik: '00000014524', name: 'Mia Amelia', jabatan: 'Guide', divisi: 'Cinema', outletId: 'pesona-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-20', habisKontrak: '2027-06-20', phone: '-' },
      { id: 'psn_17', nik: '00000017322', name: 'Putri Nurhaliza', jabatan: 'Guide', divisi: 'Cinema', outletId: 'pesona-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-20', habisKontrak: '2027-06-20', phone: '-' },
      { id: 'psn_18', nik: '00000023580', name: 'Rheka Anjani', jabatan: 'Guide', divisi: 'Cinema', outletId: 'pesona-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-08-01', habisKontrak: '2027-07-31', phone: '-' },
      { id: 'psn_19', nik: '00000024912', name: 'Nur Arini Muslich', jabatan: 'Guide', divisi: 'Cinema', outletId: 'pesona-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-20', habisKontrak: '2027-06-20', phone: '-' },
      { id: 'psn_20', nik: '00000014764', name: 'Muhamad Irvan Fahri', jabatan: 'Technical', divisi: 'Cinema', outletId: 'pesona-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-20', habisKontrak: '2027-06-20', phone: '-' },
      { id: 'psn_21', nik: '00000023579', name: 'Rizky Ariesta Wardhani', jabatan: 'Technical', divisi: 'Cinema', outletId: 'pesona-square-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-08-01', habisKontrak: '2027-07-31', phone: '-' },
      { id: 'psn_22', nik: '01070091830', name: 'Fadilah Subakti', jabatan: 'Technical', divisi: 'Cinema', outletId: 'pesona-square-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-06-20', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'psn_23', nik: '01075102039', name: 'Suprayogi', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'pesona-square-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-06-20', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'psn_24', nik: '250101', name: 'Dewi Lestari', jabatan: 'Guide', divisi: 'Cinema', outletId: 'pesona-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-01-01', habisKontrak: '2026-12-31', phone: '-' },
      { id: 'psn_25', nik: 'NIK-25770', name: 'Muhammad Pito Ramadhan', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'pesona-square-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-01', habisKontrak: '2027-06-30', phone: '-' },
    ];

    const cimanggisEmployees: Employee[] = [
      { id: 'cmg_1', nik: '00000019663', name: 'Mutiara Rahmah Amalia', jabatan: 'Guide', divisi: 'Cinema', outletId: 'citymall-cimanggis-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-16', habisKontrak: '2027-05-15', phone: '-' },
      { id: 'cmg_2', nik: '00000025097', name: 'Ria Pramita Anjar Sari', jabatan: 'Guide', divisi: 'Cinema', outletId: 'citymall-cimanggis-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-16', habisKontrak: '2027-03-15', phone: '-' },
      { id: 'cmg_3', nik: '00000014592', name: 'Muchamad Ridwandi', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'citymall-cimanggis-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'cmg_4', nik: '01006060349', name: 'Norman Natalia', jabatan: 'Technical', divisi: 'Cinema', outletId: 'citymall-cimanggis-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2006-03-24', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'cmg_5', nik: '00000011944', name: 'Novi Kurniawan', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'citymall-cimanggis-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-23', habisKontrak: '2027-06-22', phone: '-' },
      { id: 'cmg_6', nik: '00000017329', name: 'Andrea Aisya Sulaeman', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'citymall-cimanggis-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-09-27', habisKontrak: '2026-09-26', phone: '-' },
      { id: 'cmg_7', nik: '00000023771', name: 'Achmad Fiqri Ferdiansha', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'citymall-cimanggis-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-09-01', habisKontrak: '2026-08-31', phone: '-' },
      { id: 'cmg_8', nik: '00000023494', name: 'Sukma Pratama Saputri', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'citymall-cimanggis-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-08-01', habisKontrak: '2026-07-31', phone: '-' },
      { id: 'cmg_9', nik: '00000021868', name: 'Gibran Febriansyah', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'citymall-cimanggis-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-01-01', habisKontrak: '2026-12-31', phone: '-' },
      { id: 'cmg_10', nik: 'NIK-00000025019', name: 'Agustia Putri', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'citymall-cimanggis-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-01', habisKontrak: '2027-02-28', phone: '-' },
      { id: 'cmg_11', nik: 'NIK-08023173647', name: 'Dede Kurniadi', jabatan: 'Technical', divisi: 'Cinema', outletId: 'citymall-cimanggis-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2018-12-20', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'cmg_12', nik: '01070081824', name: 'Catur Cita Damasari', jabatan: 'Cinema Manager', divisi: 'Cinema', outletId: 'citymall-cimanggis-xxi', gender: 'P', statusKerja: 'Tetap', tanggalKontrak: '2018-08-16', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
    ];

    const jambuDuaEmployees: Employee[] = [
      { id: 'jbd_1', nik: '01150072905', name: 'Wahyudin', jabatan: 'Cinema Manager', divisi: 'Cinema', outletId: 'plaza-jambu-dua-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2007-10-15', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'jbd_2', nik: '01063111756', name: 'Ade Hidayat', jabatan: 'Technical', divisi: 'Cinema', outletId: 'plaza-jambu-dua-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-15', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'jbd_3', nik: '01037101234', name: 'Muhammad Ismail', jabatan: 'Technical', divisi: 'Cinema', outletId: 'plaza-jambu-dua-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-15', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'jbd_4', nik: '03058133280', name: 'Rohayati', jabatan: 'Guide', divisi: 'Cinema', outletId: 'plaza-jambu-dua-xxi', gender: 'P', statusKerja: 'Tetap', tanggalKontrak: '2026-07-15', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'jbd_5', nik: '00000011346', name: 'Mohammad Agi Irawan', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'plaza-jambu-dua-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
      { id: 'jbd_6', nik: '00000023485', name: 'Muhamad Adi Apriadi', jabatan: 'Cafe Commis', divisi: 'Cinema', outletId: 'plaza-jambu-dua-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-08-01', habisKontrak: '2027-07-31', phone: '-' },
      { id: 'jbd_7', nik: '00000024919', name: 'Lena Berliana', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'plaza-jambu-dua-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-02-16', habisKontrak: '2027-02-15', phone: '-' },
      { id: 'jbd_8', nik: '00000014498', name: 'Helmi Anggraeni', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'plaza-jambu-dua-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'jbd_9', nik: '00000012341', name: 'Muhamad Rizki', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'plaza-jambu-dua-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-15', phone: '-' },
      { id: 'jbd_10', nik: '00000015246', name: 'Sandika', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'plaza-jambu-dua-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-24', habisKontrak: '2027-03-23', phone: '-' },
      { id: 'jbd_11', nik: '00000019762', name: 'Zulfa Fitriya', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'plaza-jambu-dua-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-16', habisKontrak: '2027-05-15', phone: '-' },
      { id: 'jbd_12', nik: '00000015618', name: 'Farah Andini Niaty', jabatan: 'Cafe Cashier', divisi: 'Cinema', outletId: 'plaza-jambu-dua-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-15', phone: '-' },
      { id: 'jbd_13', nik: '00000022321', name: 'Defiana Putri Utami', jabatan: 'Guide', divisi: 'Cinema', outletId: 'plaza-jambu-dua-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-01', habisKontrak: '2027-02-28', phone: '-' },
      { id: 'jbd_14', nik: '00000024358', name: 'Ilham Bayhaqi', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'plaza-jambu-dua-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-11-01', habisKontrak: '2026-10-31', phone: '-' },
      { id: 'jbd_15', nik: '00000009676', name: 'Siti Nurparida', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'plaza-jambu-dua-xxi', gender: 'P', statusKerja: 'Magang', tanggalKontrak: '2026-07-16', habisKontrak: '2026-10-14', phone: '-' },
      { id: 'jbd_16', nik: '00000015561', name: 'Muzdhalifah Azzahra', jabatan: 'Guide', divisi: 'Cinema', outletId: 'plaza-jambu-dua-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-15', phone: '-' },
    ];

    const qsquareEmployees: Employee[] = [
      { id: 'qsq_1', nik: '01075042031', name: 'Jhansen Supriyanto Aritonang', jabatan: 'Cinema Manager', divisi: 'Cinema', outletId: 'q-square-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '1983-10-08', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'qsq_2', nik: '00000023230', name: 'Ashifa Bintang Maharani', jabatan: 'Guide', divisi: 'Cinema', outletId: 'q-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-01', habisKontrak: '2027-06-30', phone: '-' },
      { id: 'qsq_3', nik: '00000014499', name: 'Kamila Oktavia Dewanti', jabatan: 'Guide', divisi: 'Cinema', outletId: 'q-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'qsq_4', nik: '00000023242', name: 'Marsya Putri Amalia', jabatan: 'Guide', divisi: 'Cinema', outletId: 'q-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-01', habisKontrak: '2027-06-30', phone: '-' },
      { id: 'qsq_5', nik: '00000023241', name: 'Siti Fadilah', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'q-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-01', habisKontrak: '2027-06-30', phone: '-' },
      { id: 'qsq_6', nik: '01056141656', name: 'Muhammad Haerurahman', jabatan: 'Technical', divisi: 'Cinema', outletId: 'q-square-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-16', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'qsq_7', nik: '01057161682', name: 'Nova Sasongko Hidayat', jabatan: 'Technical', divisi: 'Cinema', outletId: 'q-square-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-16', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'qsq_8', nik: '00000013399', name: 'Muhamad Iqbal', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'q-square-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-11-23', habisKontrak: '2027-11-22', phone: '-' },
      { id: 'qsq_9', nik: '00000016021', name: 'Tina Irnawati', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'q-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-15', phone: '-' },
      { id: 'qsq_10', nik: '00000015881', name: 'Salsa Aqeela Sidik', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'q-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-15', phone: '-' },
      { id: 'qsq_11', nik: '00000011356', name: 'Alfiansyah', jabatan: 'Barista / Mixologist', divisi: 'F&B', outletId: 'q-square-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
      { id: 'qsq_12', nik: '00000024913', name: 'Abdurrahman', jabatan: 'Barista / Mixologist', divisi: 'F&B', outletId: 'q-square-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-02-17', habisKontrak: '2027-02-16', phone: '-' },
      { id: 'qsq_13', nik: '00000024916', name: 'Oktavia Nur Afrianti', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'q-square-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-02-17', habisKontrak: '2027-02-16', phone: '-' },
      { id: 'qsq_14', nik: '00000023999', name: 'Dimas Saputra', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'q-square-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-09-25', habisKontrak: '2026-09-24', phone: '-' },
    ];

    const depokEmployees: Employee[] = [
      { id: 'dpk_1', nik: 'NIK-29159', name: 'Mochamad Sanusi', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'depok-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-11-16', habisKontrak: '2026-11-15', phone: '-' },
      { id: 'dpk_2', nik: 'NIK-34460', name: 'Burhannudin Gunawan', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'depok-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-01', habisKontrak: '2027-06-30', phone: '-' },
      { id: 'dpk_3', nik: 'NIK-23205', name: 'Hasan Zufriansyah', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'depok-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-24', phone: '-' },
      { id: 'dpk_4', nik: 'NIK-32365', name: 'Rivqy Saputra', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'depok-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-10-01', habisKontrak: '2026-09-30', phone: '-' },
      { id: 'dpk_5', nik: 'NIK-23635', name: 'Istiana', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'depok-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-15', phone: '-' },
      { id: 'dpk_6', nik: 'NIK-25919', name: 'Nuur Syifa Adawiyah', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'depok-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'dpk_7', nik: 'NIK-28563', name: 'Rahmania', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'depok-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-09-27', habisKontrak: '2026-09-26', phone: '-' },
      { id: 'dpk_8', nik: 'NIK-29932', name: 'Nuralifah', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'depok-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-02-16', habisKontrak: '2027-02-15', phone: '-' },
      { id: 'dpk_9', nik: 'NIK-34735', name: 'Natalie Putri Lestari', jabatan: 'Cafe Cashier', divisi: 'Cinema', outletId: 'depok-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-08-01', habisKontrak: '2027-07-31', phone: '-' },
      { id: 'dpk_10', nik: 'NIK-11574', name: 'Ferin Susanto', jabatan: 'Cinema Manager', divisi: 'Cinema', outletId: 'depok-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-06-21', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'dpk_11', nik: 'NIK-25539', name: 'Marimar Sephtalia Saputri', jabatan: 'Guide', divisi: 'Cinema', outletId: 'depok-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-21', habisKontrak: '2027-06-21', phone: '-' },
      { id: 'dpk_12', nik: 'NIK-26809', name: 'Nadifah Yulikha Warad', jabatan: 'Guide', divisi: 'Cinema', outletId: 'depok-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-15', phone: '-' },
      { id: 'dpk_13', nik: 'NIK-27031', name: 'Khairani Putri', jabatan: 'Guide', divisi: 'Cinema', outletId: 'depok-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-15', phone: '-' },
      { id: 'dpk_14', nik: 'NIK-187', name: 'Wiyani', jabatan: 'Guide', divisi: 'Cinema', outletId: 'depok-xxi', gender: 'P', statusKerja: 'Tetap', tanggalKontrak: '2026-06-21', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'dpk_15', nik: 'NIK-23245', name: 'Feriyansyah', jabatan: 'Technical', divisi: 'Cinema', outletId: 'depok-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-24', phone: '-' },
      { id: 'dpk_16', nik: 'NIK-165', name: 'Juhairi', jabatan: 'Technical', divisi: 'Cinema', outletId: 'depok-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-06-21', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'dpk_17', nik: 'NIK-601', name: 'Edward', jabatan: 'Technical', divisi: 'Cinema', outletId: 'depok-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-06-21', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'dpk_18', nik: 'NIK-186', name: 'Mohamad Irvan', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'depok-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-06-21', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
    ];

    const kotwisEmployees: Employee[] = [
      { id: 'ktw_1', nik: '01070121834', name: 'Inka Nurachim', jabatan: 'Cinema Supervisor', divisi: 'Cinema', outletId: 'living-world-kota-wisata-xxi', gender: 'P', statusKerja: 'Tetap', tanggalKontrak: '2012-01-12', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'ktw_2', nik: '00000020010', name: 'Esa Octa Sukmawati', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'living-world-kota-wisata-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-06-16', habisKontrak: '2027-06-15', phone: '-' },
      { id: 'ktw_3', nik: '00000020225', name: 'Rafika Nisa Eliya Rachman', jabatan: 'Guide', divisi: 'Cinema', outletId: 'living-world-kota-wisata-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-25', phone: '-' },
      { id: 'ktw_4', nik: '00000012128', name: 'Faisal Azhar', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'living-world-kota-wisata-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-01', habisKontrak: '2027-06-30', phone: '-' },
      { id: 'ktw_5', nik: '00000025633', name: 'Rizki Azkia', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'living-world-kota-wisata-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-16', habisKontrak: '2027-06-15', phone: '-' },
      { id: 'ktw_6', nik: '00000014630', name: 'Suci Dwi Handayani', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'living-world-kota-wisata-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'ktw_7', nik: '01115104211', name: 'FARUQ', jabatan: 'Cinema Manager', divisi: 'Cinema', outletId: 'living-world-kota-wisata-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2010-08-01', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'ktw_8', nik: '00000019763', name: 'Ade Lintang Agustin', jabatan: 'Guide', divisi: 'Cinema', outletId: 'living-world-kota-wisata-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2024-05-16', habisKontrak: '2027-05-15', phone: '-' },
      { id: 'ktw_9', nik: '00000014525', name: 'Rizal Fikri', jabatan: 'Mixologist', divisi: 'F&B', outletId: 'living-world-kota-wisata-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2023-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'ktw_10', nik: '00000014669', name: 'Widyawati', jabatan: 'Guide', divisi: 'Cinema', outletId: 'living-world-kota-wisata-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-22', habisKontrak: '2027-07-22', phone: '-' },
      { id: 'ktw_11', nik: '00000019757', name: 'Ichtiar Indra Darmawan', jabatan: 'Technical', divisi: 'Cinema', outletId: 'living-world-kota-wisata-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2024-05-16', habisKontrak: '2027-05-15', phone: '-' },
      { id: 'ktw_12', nik: '00000019775', name: 'Wahyu Wahidin', jabatan: 'Technical', divisi: 'Cinema', outletId: 'living-world-kota-wisata-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2024-05-16', habisKontrak: '2027-05-15', phone: '-' },
      { id: 'ktw_13', nik: '00000015142', name: 'Masādah', jabatan: 'Cashier', divisi: 'F&B', outletId: 'living-world-kota-wisata-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2023-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'ktw_14', nik: '00000026105', name: 'Dian Rachmawaty', jabatan: 'Cashier', divisi: 'F&B', outletId: 'living-world-kota-wisata-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-08-01', habisKontrak: '2027-07-31', phone: '-' },
      { id: 'ktw_15', nik: '00000014727', name: 'Ichsan Sidik', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'living-world-kota-wisata-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2023-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'ktw_16', nik: '00000019773', name: 'Tedi Maulana', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'living-world-kota-wisata-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-05-16', habisKontrak: '2027-05-15', phone: '-' },
      { id: 'ktw_17', nik: '00000021924', name: 'Andriansyah', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'living-world-kota-wisata-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-01-01', habisKontrak: '2027-12-31', phone: '-' },
      { id: 'ktw_18', nik: '00000025090', name: 'Ardi Apriyanto', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'living-world-kota-wisata-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-16', habisKontrak: '2027-03-15', phone: '-' },
      { id: 'ktw_19', nik: '00000014652', name: 'Syahrul Aditya Pratama', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'living-world-kota-wisata-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2023-03-25', habisKontrak: '2027-03-24', phone: '-' },
    ];

    const cileungsiEmployees: Employee[] = [
      { id: 'cls_1', nik: '01179198152', name: 'Seli Andika Putri', jabatan: 'Cinema Supervisor', divisi: 'Cinema', outletId: 'metmall-cileungsi-xxi', gender: 'P', statusKerja: 'Tetap', tanggalKontrak: '2011-12-09', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'cls_2', nik: '00000007065', name: 'ANI KUSMIATI', jabatan: 'Guide', divisi: 'Cinema', outletId: 'metmall-cileungsi-xxi', gender: 'P', statusKerja: 'Tetap', tanggalKontrak: '2013-10-23', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'cls_3', nik: '00000014521', name: 'DEA NURAINI', jabatan: 'Guide', divisi: 'Cinema', outletId: 'metmall-cileungsi-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-18', habisKontrak: '2027-03-17', phone: '-' },
      { id: 'cls_4', nik: '00000014766', name: 'NURIN PUTRI HIDAYAT', jabatan: 'Guide', divisi: 'Cinema', outletId: 'metmall-cileungsi-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-18', habisKontrak: '2027-03-17', phone: '-' },
      { id: 'cls_5', nik: '00000015148', name: 'DISTA VISIARINA', jabatan: 'Guide', divisi: 'Cinema', outletId: 'metmall-cileungsi-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-18', habisKontrak: '2027-03-17', phone: '-' },
      { id: 'cls_6', nik: '00000024251', name: 'REHAN PIRLANA', jabatan: 'Technical', divisi: 'Cinema', outletId: 'metmall-cileungsi-xxi', gender: 'L', statusKerja: 'Magang', tanggalKontrak: '2026-07-09', habisKontrak: '2027-07-09', phone: '-' },
      { id: 'cls_7', nik: '01065961785', name: 'JOKO SUPRIONO', jabatan: 'Technical', divisi: 'Cinema', outletId: 'metmall-cileungsi-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '1996-06-12', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'cls_8', nik: '01006130348', name: 'MUHAMMAD FAJARUDIN', jabatan: 'Technical', divisi: 'Cinema', outletId: 'metmall-cileungsi-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2008-09-12', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'cls_9', nik: '00000014463', name: 'SANJAYA', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'metmall-cileungsi-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-09', habisKontrak: '2027-07-09', phone: '-' },
      { id: 'cls_10', nik: '00000012556', name: 'MUSLIM', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'metmall-cileungsi-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-09', habisKontrak: '2027-07-09', phone: '-' },
      { id: 'cls_11', nik: '00000014522', name: 'RAMDONI', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'metmall-cileungsi-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-18', habisKontrak: '2027-03-17', phone: '-' },
      { id: 'cls_12', nik: '00000015035', name: 'ANGGI RASIDDIN', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'metmall-cileungsi-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-18', habisKontrak: '2027-03-17', phone: '-' },
      { id: 'cls_13', nik: '00000013235', name: 'INDI DEWANTI', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'metmall-cileungsi-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-09', habisKontrak: '2027-07-09', phone: '-' },
      { id: 'cls_14', nik: '00000015935', name: 'LESTARI', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'metmall-cileungsi-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-09', habisKontrak: '2027-04-08', phone: '-' },
      { id: 'cls_15', nik: '00000020018', name: 'ALDA APRILLIA', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'metmall-cileungsi-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-09', habisKontrak: '2027-06-08', phone: '-' },
      { id: 'cls_16', nik: '00000021019', name: 'NAYLA RATU APRILLIA', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'metmall-cileungsi-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-09-15', habisKontrak: '2027-09-14', phone: '-' },
      { id: 'cls_17', nik: '00000021514', name: 'NIKEN TANIA', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'metmall-cileungsi-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-11-08', habisKontrak: '2027-11-07', phone: '-' },
      { id: 'cls_18', nik: 'NIK-500128', name: 'SELLY AMELIA MANSYUR', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'metmall-cileungsi-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-25', habisKontrak: '2027-07-24', phone: '-' },
      { id: 'cls_19', nik: '00000025532', name: 'FAZAR SUMINTRA', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'metmall-cileungsi-xxi', gender: 'L', statusKerja: 'Magang', tanggalKontrak: '2026-07-09', habisKontrak: '2027-07-09', phone: '-' },
      { id: 'cls_20', nik: '00000012520', name: 'Sherly Sonia', jabatan: 'Cinema Assistant Manager', divisi: 'Cinema', outletId: 'metmall-cileungsi-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-25', habisKontrak: '2027-07-24', phone: '-' },
      { id: 'cls_21', nik: '00000026079', name: 'Muhamad Dendi Afrizal', jabatan: 'Accounting Officer', divisi: 'F&B', outletId: 'metmall-cileungsi-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-08-01', habisKontrak: '2027-07-31', phone: '-' },
    ];

    const tajurEmployees: Employee[] = [
      { id: 'tjr_1', nik: '03059163309', name: 'Sumarsono', jabatan: 'Cinema Manager', divisi: 'Cinema', outletId: 'ramayana-tajur-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-06-20', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'tjr_2', nik: '00000022323', name: 'Sulistiani', jabatan: 'Guide', divisi: 'Cinema', outletId: 'ramayana-tajur-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-01', habisKontrak: '2027-02-28', phone: '-' },
      { id: 'tjr_3', nik: '01057151684', name: 'Novi Olivianita Pujiyama', jabatan: 'Guide', divisi: 'Cinema', outletId: 'ramayana-tajur-xxi', gender: 'P', statusKerja: 'Tetap', tanggalKontrak: '2026-07-09', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'tjr_4', nik: '01057151665', name: 'Asep Royani', jabatan: 'Customer Relation', divisi: 'Cinema', outletId: 'ramayana-tajur-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-09', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'tjr_5', nik: '00000020016', name: 'Aulia Setyahadi Krishna', jabatan: 'Technical', divisi: 'Cinema', outletId: 'ramayana-tajur-xxi', gender: 'L', statusKerja: 'Magang', tanggalKontrak: '2026-06-16', habisKontrak: '2027-06-15', phone: '-' },
      { id: 'tjr_6', nik: '01057141688', name: 'Riko Oktora', jabatan: 'Technical', divisi: 'Cinema', outletId: 'ramayana-tajur-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-09', habisKontrak: 'Seterusnya (Tetap)', phone: '-' },
      { id: 'tjr_7', nik: '00000014659', name: 'Muhamad Fadli', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'ramayana-tajur-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'tjr_8', nik: '00000013526', name: 'Rico Al Fyandi', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'ramayana-tajur-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-12-01', habisKontrak: '2026-11-30', phone: '-' },
      { id: 'tjr_9', nik: '00000014507', name: 'Fikri Haikal', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'ramayana-tajur-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-26', habisKontrak: '2027-03-25', phone: '-' },
      { id: 'tjr_10', nik: '00000019474', name: 'Mohammad Do\'a Rizky', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'ramayana-tajur-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-16', habisKontrak: '2027-05-15', phone: '-' },
      { id: 'tjr_11', nik: '00000014533', name: 'Rosiana Dewi', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ramayana-tajur-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
      { id: 'tjr_12', nik: '00000020156', name: 'Amadea Mahwa Nursyahbani', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ramayana-tajur-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-24', phone: '-' },
      { id: 'tjr_13', nik: '00000023585', name: 'Beby Maisan Andrian', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ramayana-tajur-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-08-01', habisKontrak: '2026-07-31', phone: '-' },
    ];

    const cianjurEmployees: Employee[] = [
      { id: 'cjr_1', nik: '00000016466', name: 'YOLA DZULQA CAHYANI', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'citimall-cianjur-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-25', habisKontrak: '2027-05-24', phone: '-' },
      { id: 'cjr_2', nik: '00000020373', name: 'LINDA HANDAYANI', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'citimall-cianjur-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-15', phone: '-' },
      { id: 'cjr_3', nik: '00000018072', name: 'YUSSY OCTAVIANI', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'citimall-cianjur-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-12-01', habisKontrak: '2026-11-01', phone: '-' },
      { id: 'cjr_4', nik: '00000019310', name: 'NABILA ALIYAH', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'citimall-cianjur-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-01', habisKontrak: '2027-04-30', phone: '-' },
      { id: 'cjr_5', nik: '00000022078', name: 'DESTY FITRIYANI', jabatan: 'Guide', divisi: 'Cinema', outletId: 'citimall-cianjur-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-02-01', habisKontrak: '2027-01-31', phone: '-' },
      { id: 'cjr_6', nik: '00000023210', name: 'FIRANI AMANDA', jabatan: 'Guide', divisi: 'Cinema', outletId: 'citimall-cianjur-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-01', habisKontrak: '2027-06-30', phone: '-' },
      { id: 'cjr_7', nik: '00000025372', name: 'SANIA SRIWULAN DARI', jabatan: 'Guide', divisi: 'Cinema', outletId: 'citimall-cianjur-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
      { id: 'cjr_8', nik: '00000016494', name: 'RANGGA PRATAMA', jabatan: 'Cinema Supervisor', divisi: 'Cinema', outletId: 'citimall-cianjur-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
      { id: 'cjr_9', nik: '00000016470', name: 'MUHAMMAD RESTU RAMADHAN', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'citimall-cianjur-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-25', habisKontrak: '2027-05-24', phone: '-' },
      { id: 'cjr_10', nik: '00000019370', name: 'ZAKY RIZKI RIJALDI', jabatan: 'Technical', divisi: 'Cinema', outletId: 'citimall-cianjur-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-01', habisKontrak: '2027-04-30', phone: '-' },
      { id: 'cjr_11', nik: '00000016498', name: 'RESTU SUPIYANDI', jabatan: 'Technical', divisi: 'Cinema', outletId: 'citimall-cianjur-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
      { id: 'cjr_12', nik: '00000016458', name: 'SATYA RAKA PRAMUDYA', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'citimall-cianjur-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-25', habisKontrak: '2027-05-24', phone: '-' },
      { id: 'cjr_13', nik: '00000025519', name: 'RIO M MAULIDAN', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'citimall-cianjur-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
      { id: 'cjr_14', nik: '00000025603', name: 'MUHAMMAD IRGI ALFARIZI', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'citimall-cianjur-xxi', gender: 'L', statusKerja: 'Magang', tanggalKontrak: '2026-06-02', habisKontrak: '2027-07-01', phone: '-' },
      { id: 'cjr_15', nik: '00000023212', name: 'M ARDI KUSUMA ANDARI', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'citimall-cianjur-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-01', habisKontrak: '2027-06-30', phone: '-' },
      { id: 'cjr_16', nik: '00000009647', name: 'ARIF HIDAYAT', jabatan: 'Cinema Manager', divisi: 'Cinema', outletId: 'citimall-cianjur-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-12-01', habisKontrak: '2026-11-30', phone: '-' },
    ];

    const INIT_KEY = 'EMPLOYEES_INITIALIZED_V6';
    const isInitialized = localStorage.getItem(INIT_KEY);

    let resultList: Employee[] = [];

    if (!raw || !isInitialized) {
      const allDefaults: Employee[] = [
        { id: 'img_emp_1', nik: '000000240215', name: 'Budi Santoso', jabatan: 'Technical', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2024-02-15', habisKontrak: '2027-02-15', phone: '081234567801' },
        { id: 'img_emp_2', nik: '00000014492', name: 'Fenita Fitriani', jabatan: 'Guide', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-13', habisKontrak: '2027-07-13', phone: '081234567802' },
        { id: 'img_emp_3', nik: '00000015943', name: 'Indah Lestari', jabatan: 'Guide', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-16', phone: '081234567803' },
        { id: 'img_emp_4', nik: '00000020171', name: 'Amanda Sri Permani', jabatan: 'Guide', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-25', phone: '081234567804' },
        { id: 'img_emp_5', nik: '00000024917', name: 'Amanda Aurellya', jabatan: 'Guide', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-02-16', habisKontrak: '2027-02-16', phone: '081234567805' },
        { id: 'img_emp_6', nik: '00000013407', name: 'Eko Komarudin', jabatan: 'Technical', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-11-23', habisKontrak: '2026-11-23', phone: '081234567806' },
        { id: 'img_emp_7', nik: '00000019532', name: 'Axcel Raditia Putra', jabatan: 'Technical', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-16', habisKontrak: '2027-05-16', phone: '081234567807' },
        { id: 'img_emp_8', nik: '00000014491', name: 'Amanah Supwiro', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-25', phone: '081234567808' },
        { id: 'img_emp_9', nik: '00000015901', name: 'Annisa Pratiwi', jabatan: 'Cinema Supervisor', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-16', phone: '081234567809' },
        { id: 'img_emp_10', nik: '00000008663', name: 'Rahmat Jaya Purnama', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Magang', tanggalKontrak: '2026-06-26', habisKontrak: '2026-12-26', phone: '081234567810' },
        { id: 'img_emp_11', nik: '00000015745', name: 'Muhammad Bagus Alfatah', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-13', habisKontrak: '2027-07-13', phone: '081234567811' },
        { id: 'img_emp_12', nik: '00000021619', name: 'Jimmy Yolanda', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-13', habisKontrak: '2027-07-13', phone: '081234567812' },
        { id: 'img_emp_13', nik: '00000011371', name: 'Juli Zulkipli', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-06-01', phone: '081234567813' },
        { id: 'img_emp_14', nik: '00000015457', name: 'Agam Aldi', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-16', phone: '081234567814' },
        { id: 'img_emp_15', nik: '00000012329', name: 'Helmalia Putri', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-16', phone: '081234567815' },
        { id: 'img_emp_16', nik: '00000013226', name: 'Puji Lestari', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-11-16', habisKontrak: '2026-11-16', phone: '081234567816' },
        { id: 'img_emp_17', nik: '00000013229', name: 'Juwita', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-11-16', habisKontrak: '2026-11-16', phone: '081234567817' },
        { id: 'img_emp_18', nik: '00000020084', name: 'Silvi Clara Sita', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-16', habisKontrak: '2027-06-16', phone: '081234567818' },
        { id: 'img_emp_19', nik: '00000020721', name: 'Gita Ayu Lestari', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-08-16', habisKontrak: '2026-08-16', phone: '081234567819' },
        { id: 'img_emp_20', nik: '00000023240', name: 'Maulida Choerunnisa', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-01', habisKontrak: '2027-07-01', phone: '081234567820' },
        { id: 'img_emp_21', nik: '00000025668', name: 'Liskya Sifa Sandria', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-16', habisKontrak: '2027-06-16', phone: '081234567821' },
        { id: 'img_emp_22', nik: '00000013699', name: 'Fajriani Nur Jelita', jabatan: 'Accounting Officer', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-13', habisKontrak: '2027-07-13', phone: '081234567822' },
        { id: 'img_emp_23', nik: '00000018698', name: 'Dwi Intan Suryani', jabatan: 'Hello Sunday Waiters', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-02-16', habisKontrak: '2027-02-16', phone: '081234567823' },
        { id: 'img_emp_24', nik: '00000019617', name: 'Rivany Yudi Nursabilillah', jabatan: 'Hello Sunday Waiters', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-16', habisKontrak: '2027-05-16', phone: '081234567824' },
        { id: 'img_emp_25', nik: '00000023259', name: 'Muhammad Rifky Faddilah Azzikra', jabatan: 'Hello Sunday Waiters', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-01', habisKontrak: '2027-07-01', phone: '081234567825' },
        { id: 'img_emp_26', nik: '00000011377', name: 'Muhamad Daud', jabatan: 'Hello Sunday Barista', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-06-01', phone: '081234567826' },
        { id: 'img_emp_27', nik: '00000011974', name: 'Sofian Yudistira', jabatan: 'Hello Sunday Barista', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-25', phone: '081234567827' },
        { id: 'img_emp_28', nik: '00000024531', name: 'Roby Yulianto', jabatan: 'Premiere Chef De Partie', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-13', habisKontrak: '2027-07-13', phone: '081234567828' },
        { id: 'img_emp_29', nik: '01073161964', name: 'Rachmat Hidayat', jabatan: 'Premiere Commis', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-13', habisKontrak: '2030-07-13', phone: '081234567829' },
        { id: 'img_emp_30', nik: '00000014577', name: 'Muhamad Nasir', jabatan: 'Hello Sunday Cook Helper', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-25', phone: '081234567830' },
        { id: 'img_emp_31', nik: '00000015891', name: 'Muhamad Sidik Adi Putra Permana', jabatan: 'Hello Sunday Cook Helper', divisi: 'F&B', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-16', phone: '081234567831' },
        { id: 'img_emp_32', nik: '01070175297', name: 'Dani Nugraha', jabatan: 'Cinema Assistant Manager', divisi: 'Cinema', outletId: 'aeon-sentul-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-16', habisKontrak: '2030-07-16', phone: '081234567832' },
        ...sawanganEmployees,
        ...bogorSquareEmployees,
        ...bgmEmployees,
        ...botaniEmployees,
        ...boxiesEmployees,
        ...btmEmployees,
        ...cibinongEmployees,
        ...cipanasEmployees,
        ...parungEmployees,
        ...margoEmployees,
        ...pesonaEmployees,
        ...cimanggisEmployees,
        ...jambuDuaEmployees,
        ...qsquareEmployees,
        ...depokEmployees,
        ...kotwisEmployees,
        ...cileungsiEmployees,
        ...tajurEmployees,
        ...cianjurEmployees,
      ];
      resultList = allDefaults;
      localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(allDefaults));
      localStorage.setItem(INIT_KEY, 'true');
    } else {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          resultList = parsed;
        }
      } catch {
        resultList = [];
      }
    }

    // Deduplicate list by ID and by clean NIK
    const seenIds = new Set<string>();
    const seenNiks = new Set<string>();
    const deduplicated: Employee[] = [];

    for (const emp of resultList) {
      if (!emp || !emp.id) continue;
      const cleanNik = emp.nik ? emp.nik.trim() : '';
      if (seenIds.has(emp.id)) continue;
      if (cleanNik && cleanNik !== '-' && seenNiks.has(cleanNik)) continue;

      seenIds.add(emp.id);
      if (cleanNik && cleanNik !== '-') seenNiks.add(cleanNik);
      deduplicated.push(emp);
    }

    if (deduplicated.length !== resultList.length) {
      localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(deduplicated));
    }

    return deduplicated;
  },

  saveEmployee(emp: Employee): Employee[] {
    const list = this.getEmployees();
    const cleanNik = emp.nik ? emp.nik.trim() : '';
    
    // Find matching employee by ID OR by clean NIK
    const idx = list.findIndex(
      (e) => e.id === emp.id || (cleanNik && cleanNik !== '-' && e.nik?.trim() === cleanNik)
    );

    if (idx >= 0) {
      // Preserve original ID if it matched by NIK
      list[idx] = { ...list[idx], ...emp, id: list[idx].id || emp.id };
    } else {
      list.unshift(emp);
    }

    // Ensure strict uniqueness
    const seenIds = new Set<string>();
    const seenNiks = new Set<string>();
    const deduplicated: Employee[] = [];

    for (const item of list) {
      if (!item || !item.id) continue;
      const n = item.nik ? item.nik.trim() : '';
      if (seenIds.has(item.id)) continue;
      if (n && n !== '-' && seenNiks.has(n)) continue;

      seenIds.add(item.id);
      if (n && n !== '-') seenNiks.add(n);
      deduplicated.push(item);
    }

    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(deduplicated));
    this.broadcastChange('employees');
    return deduplicated;
  },

  deleteEmployee(id: string): Employee[] {
    const currentList = this.getEmployees();
    const list = currentList.filter((e) => e.id !== id && e.nik !== id);
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(list));
    this.broadcastChange('employees');
    return list;
  },

  getEmployeeKpis(): EmployeeKpiRecord[] {
    const raw = localStorage.getItem(KEYS.EMPLOYEE_KPIS);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.some((k: any) => k.id === 'kpi_emp_1_2026-10')) {
        localStorage.removeItem(KEYS.EMPLOYEE_KPIS);
        return [];
      }
      return parsed;
    } catch {
      return [];
    }
  },

  saveEmployeeKpis(records: EmployeeKpiRecord[]) {
    localStorage.setItem(KEYS.EMPLOYEE_KPIS, JSON.stringify(records));
    this.broadcastChange('employee-kpis');
  },

  // Lost & Found
  getLostAndFoundRecords(): LostAndFoundRecord[] {
    const raw = localStorage.getItem(KEYS.LOST_FOUND);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.some((item: any) => item.id === 'laf_1')) {
        const cleaned = parsed.filter((item: any) => !['laf_1', 'laf_2', 'laf_3'].includes(item.id));
        localStorage.setItem(KEYS.LOST_FOUND, JSON.stringify(cleaned));
        return cleaned;
      }
      return parsed;
    } catch {
      return [];
    }
  },

  saveLostAndFoundRecord(rec: LostAndFoundRecord): LostAndFoundRecord[] {
    const list = this.getLostAndFoundRecords();
    const idx = list.findIndex((item) => item.id === rec.id);
    if (idx >= 0) {
      list[idx] = rec;
    } else {
      list.unshift(rec);
    }
    localStorage.setItem(KEYS.LOST_FOUND, JSON.stringify(list));
    this.broadcastChange('lost-found');
    return list;
  },

  deleteLostAndFoundRecord(id: string): LostAndFoundRecord[] {
    const list = this.getLostAndFoundRecords().filter((item) => item.id !== id);
    localStorage.setItem(KEYS.LOST_FOUND, JSON.stringify(list));
    this.broadcastChange('lost-found');
    return list;
  },

  // Warehouse & Inventory Management
  getWarehouseItems(): WarehouseItem[] {
    const raw = localStorage.getItem(KEYS.WAREHOUSE_ITEMS);
    if (!raw) {
      const defaultItems: WarehouseItem[] = [
        { id: 'wh_1', outletId: 'the-park-sawangan-xxi', name: 'Popcorn Bucket 46oz XXI', unit: 'Pcs', initialStock: 500, minStock: 100, category: 'Kemasan Cafe' },
        { id: 'wh_2', outletId: 'the-park-sawangan-xxi', name: 'Cup Cold XXI 16oz', unit: 'Pcs', initialStock: 800, minStock: 200, category: 'Kemasan Cafe' },
        { id: 'wh_3', outletId: 'the-park-sawangan-xxi', name: 'Sedotan Steril XXI', unit: 'Pack', initialStock: 50, minStock: 10, category: 'Kemasan Cafe' },
        { id: 'wh_4', outletId: 'the-park-sawangan-xxi', name: 'Jagung Popcorn Kernel (25kg)', unit: 'Bag', initialStock: 15, minStock: 3, category: 'Bahan Baku' },
        { id: 'wh_5', outletId: 'the-park-sawangan-xxi', name: 'Minyak Mentega Popcorn', unit: 'Kanister', initialStock: 20, minStock: 5, category: 'Bahan Baku' },
        { id: 'wh_6', outletId: 'the-park-sawangan-xxi', name: 'Tisu Toilet Jumbo Roll', unit: 'Roll', initialStock: 60, minStock: 15, category: 'Sanitasi' },
        { id: 'wh_7', outletId: 'the-park-sawangan-xxi', name: 'Sabun Cuci Tangan Liquid 5L', unit: 'Gallon', initialStock: 8, minStock: 2, category: 'Sanitasi' },

        { id: 'wh_8', outletId: 'margo-city-xxi', name: 'Popcorn Bucket 46oz XXI', unit: 'Pcs', initialStock: 1000, minStock: 200, category: 'Kemasan Cafe' },
        { id: 'wh_9', outletId: 'margo-city-xxi', name: 'Cup Cold XXI 16oz', unit: 'Pcs', initialStock: 1500, minStock: 300, category: 'Kemasan Cafe' },
        { id: 'wh_10', outletId: 'margo-city-xxi', name: 'Tisu Toilet Jumbo Roll', unit: 'Roll', initialStock: 100, minStock: 20, category: 'Sanitasi' },

        { id: 'wh_11', outletId: 'aeon-sentul-xxi', name: 'Popcorn Bucket 46oz XXI', unit: 'Pcs', initialStock: 800, minStock: 150, category: 'Kemasan Cafe' },
        { id: 'wh_12', outletId: 'aeon-sentul-xxi', name: 'Cup Cold XXI 16oz', unit: 'Pcs', initialStock: 1200, minStock: 250, category: 'Kemasan Cafe' },
      ];
      localStorage.setItem(KEYS.WAREHOUSE_ITEMS, JSON.stringify(defaultItems));
      return defaultItems;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveWarehouseItem(item: WarehouseItem): WarehouseItem[] {
    const list = this.getWarehouseItems();
    const idx = list.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    localStorage.setItem(KEYS.WAREHOUSE_ITEMS, JSON.stringify(list));
    this.broadcastChange('warehouse-items');
    return list;
  },

  deleteWarehouseItem(id: string): WarehouseItem[] {
    const list = this.getWarehouseItems().filter((i) => i.id !== id);
    localStorage.setItem(KEYS.WAREHOUSE_ITEMS, JSON.stringify(list));
    this.broadcastChange('warehouse-items');
    return list;
  },

  getStockTransactions(): StockTransaction[] {
    const raw = localStorage.getItem(KEYS.STOCK_TRANSACTIONS);
    if (!raw) {
      const defaultTx: StockTransaction[] = [
        {
          id: 'tx_1',
          outletId: 'the-park-sawangan-xxi',
          itemId: 'wh_1',
          date: new Date().toISOString().substring(0, 10),
          time: '09:00',
          type: 'IN',
          qty: 200,
          notes: 'Terima kiriman dari HO Pusat',
          createdBy: 'Manager Sawangan',
        },
        {
          id: 'tx_2',
          outletId: 'the-park-sawangan-xxi',
          itemId: 'wh_1',
          date: new Date().toISOString().substring(0, 10),
          time: '18:00',
          type: 'OUT',
          qty: 150,
          notes: 'Pemakaian Operasional Cafe XXI',
          createdBy: 'Cleaner Sawangan',
        },
      ];
      localStorage.setItem(KEYS.STOCK_TRANSACTIONS, JSON.stringify(defaultTx));
      return defaultTx;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveStockTransaction(tx: StockTransaction): StockTransaction[] {
    const list = this.getStockTransactions();
    const idx = list.findIndex((t) => t.id === tx.id);
    if (idx >= 0) {
      list[idx] = tx;
    } else {
      list.unshift(tx);
    }
    localStorage.setItem(KEYS.STOCK_TRANSACTIONS, JSON.stringify(list));
    this.broadcastChange('stock-transactions');
    return list;
  },

  deleteStockTransaction(id: string): StockTransaction[] {
    const list = this.getStockTransactions().filter((t) => t.id !== id);
    localStorage.setItem(KEYS.STOCK_TRANSACTIONS, JSON.stringify(list));
    this.broadcastChange('stock-transactions');
    return list;
  },

  getStockOpnameHistory(): StockOpnameHistory[] {
    const raw = localStorage.getItem(KEYS.STOCK_OPNAME_HISTORY);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveStockOpnameHistory(history: StockOpnameHistory): StockOpnameHistory[] {
    const list = this.getStockOpnameHistory();
    list.unshift(history);
    localStorage.setItem(KEYS.STOCK_OPNAME_HISTORY, JSON.stringify(list));
    this.broadcastChange('stock-opname');
    return list;
  },
};


