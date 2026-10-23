import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  User,
  Employee,
  CashierMonthlyProductRecord,
} from '../../types';
import { StorageService } from '../../lib/storage';
import {
  CupSoda,
  Coffee,
  GlassWater,
  Sparkles,
  Search,
  Download,
  Filter,
  Users,
  TrendingUp,
  Award,
  Layers,
  FileSpreadsheet,
  UtensilsCrossed,
  Flame,
  Trophy,
  ShoppingBag,
} from 'lucide-react';

interface CashierBeverageCategoryViewProps {
  currentUser: User | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onNavigateToInput?: () => void;
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

export interface BeverageCategoryMeta {
  id: string;
  label: string;
  shortLabel: string;
  badgeBg: string;
  badgeText: string;
  cardBorder: string;
  cardBg: string;
  headerBg: string;
  isBeverage: boolean;
  productGroup: 'makanan' | 'minuman';
}

export const BEVERAGE_CATEGORIES: BeverageCategoryMeta[] = [
  // =========================================================
  // KELOMPOK KATEGORI MAKANAN (FOOD & SNACK CINEMA XXI)
  // =========================================================
  {
    id: 'Makanan - Popcorn',
    label: '🍿 Makanan • Popcorn XXI (Salt / Caramel / Sweet Glaze / Mix)',
    shortLabel: 'Makanan • Popcorn XXI',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-950',
    cardBorder: 'border-amber-300',
    cardBg: 'bg-amber-50/70',
    headerBg: 'bg-amber-100/90 text-amber-950',
    isBeverage: false,
    productGroup: 'makanan',
  },
  {
    id: 'Makanan - Gorengan & Snack',
    label: '🍟 Makanan • Gorengan & Snack (Sistagor / Fries / Bakso / Tahu / Siomay)',
    shortLabel: 'Makanan • Gorengan & Snack',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-950',
    cardBorder: 'border-orange-300',
    cardBg: 'bg-orange-50/70',
    headerBg: 'bg-orange-100/90 text-orange-950',
    isBeverage: false,
    productGroup: 'makanan',
  },
  {
    id: 'Makanan - Hotdog, Sosis & Savory',
    label: '🌭 Makanan • Hotdog, Sosis, Corndog, Nachos & Savory',
    shortLabel: 'Makanan • Hotdog, Sosis & Savory',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-950',
    cardBorder: 'border-red-300',
    cardBg: 'bg-red-50/70',
    headerBg: 'bg-red-100/90 text-red-950',
    isBeverage: false,
    productGroup: 'makanan',
  },
  {
    id: 'Makanan - Bakery & Pastry',
    label: '🥐 Makanan • Bakery & Pastry (Croissant / Churros / Roti / Donut / Puff)',
    shortLabel: 'Makanan • Bakery & Pastry',
    badgeBg: 'bg-yellow-100',
    badgeText: 'text-yellow-950',
    cardBorder: 'border-yellow-300',
    cardBg: 'bg-yellow-50/70',
    headerBg: 'bg-yellow-100/90 text-yellow-950',
    isBeverage: false,
    productGroup: 'makanan',
  },
  {
    id: 'Makanan - Paket Combo & Lainnya',
    label: '🍱 Makanan • Paket Combo & Makanan Lainnya',
    shortLabel: 'Makanan • Paket Combo & Lainnya',
    badgeBg: 'bg-lime-100',
    badgeText: 'text-lime-950',
    cardBorder: 'border-lime-300',
    cardBg: 'bg-lime-50/70',
    headerBg: 'bg-lime-100/90 text-lime-950',
    isBeverage: false,
    productGroup: 'makanan',
  },

  // =========================================================
  // KELOMPOK KATEGORI MINUMAN (BEVERAGE CINEMA XXI)
  // =========================================================
  {
    id: 'Minuman - Tea Series',
    label: '🍵 Minuman • Tea Series (XXI Java Tea / Lemon / Lychee / Milk Tea)',
    shortLabel: 'Minuman • Tea Series',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-900',
    cardBorder: 'border-emerald-300',
    cardBg: 'bg-emerald-50/60',
    headerBg: 'bg-emerald-100/90 text-emerald-950',
    isBeverage: true,
    productGroup: 'minuman',
  },
  {
    id: 'Minuman - Coffee Series',
    label: '☕ Minuman • Coffee Series (Kopi Susu / Latte / Cappuccino / Aren)',
    shortLabel: 'Minuman • Coffee Series',
    badgeBg: 'bg-stone-200',
    badgeText: 'text-stone-900',
    cardBorder: 'border-stone-300',
    cardBg: 'bg-stone-50/80',
    headerBg: 'bg-stone-200/90 text-stone-950',
    isBeverage: true,
    productGroup: 'minuman',
  },
  {
    id: 'Minuman - Soft Drink',
    label: '🥤 Minuman • Soft Drink & Soda (Coca-Cola / Sprite / Fanta / Nipis Madu)',
    shortLabel: 'Minuman • Soft Drink',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-900',
    cardBorder: 'border-rose-300',
    cardBg: 'bg-rose-50/60',
    headerBg: 'bg-rose-100/90 text-rose-950',
    isBeverage: true,
    productGroup: 'minuman',
  },
  {
    id: 'Minuman - Non-Coffee & Milk',
    label: '🍫 Minuman • Non-Coffee & Milk (Milo / Chocolate / Matcha / Taro / Susu)',
    shortLabel: 'Minuman • Non-Coffee & Milk',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-900',
    cardBorder: 'border-purple-300',
    cardBg: 'bg-purple-50/60',
    headerBg: 'bg-purple-100/90 text-purple-950',
    isBeverage: true,
    productGroup: 'minuman',
  },
  {
    id: 'Minuman - Juice & Blended',
    label: '🍊 Minuman • Juice, Smoothie, Blended & Squash',
    shortLabel: 'Minuman • Juice & Blended',
    badgeBg: 'bg-cyan-100',
    badgeText: 'text-cyan-900',
    cardBorder: 'border-cyan-300',
    cardBg: 'bg-cyan-50/60',
    headerBg: 'bg-cyan-100/90 text-cyan-950',
    isBeverage: true,
    productGroup: 'minuman',
  },
  {
    id: 'Minuman - Air Mineral & Kemasan',
    label: '💧 Minuman • Air Mineral & Botol Kemasan',
    shortLabel: 'Minuman • Air Mineral & Kemasan',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-900',
    cardBorder: 'border-sky-300',
    cardBg: 'bg-sky-50/60',
    headerBg: 'bg-sky-100/90 text-sky-950',
    isBeverage: true,
    productGroup: 'minuman',
  },
  {
    id: 'Minuman - Lainnya',
    label: '🧋 Minuman • Minuman Lainnya',
    shortLabel: 'Minuman • Lainnya',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-900',
    cardBorder: 'border-indigo-300',
    cardBg: 'bg-indigo-50/60',
    headerBg: 'bg-indigo-100/90 text-indigo-950',
    isBeverage: true,
    productGroup: 'minuman',
  },
];

interface DetectedCategoryResult {
  categoryId: string;
  group: 'makanan' | 'minuman';
  isConfident: boolean;
}

/**
 * Mesin deteksi cerdas nama produk Cinema XXI Cafe.
 * Mengevaluasi kata kunci MAKANAN terlebih dahulu (termasuk Popcorn, Gorengan, Bakery, Hotdog, Combo)
 * agar produk makanan seperti "Popcorn Caramel", "Popcorn Cup", "French Fries", "Croissant Coklat"
 * TIDAK PERNAH salah masuk ke kategori Minuman.
 */
function detectProductCategoryByName(rawName: string): DetectedCategoryResult {
  const lower = (rawName || '').toLowerCase().trim();
  if (!lower) {
    return {
      categoryId: 'Makanan - Paket Combo & Lainnya',
      group: 'makanan',
      isConfident: false,
    };
  }

  // Cek apakah ada kata minuman yang eksplisit (untuk membedakan "Caramel Latte" vs "Caramel Popcorn/Caramel (M)")
  const hasExplicitDrinkWord =
    /\b(tea|teh|kopi|coffee|latte|cappuccino|cappucino|americano|espresso|macchiato|machiato|mocha|moka|affogato|drink|minuman|soda|cola|sprite|fanta|pepsi|juice|jus|smoothie|smoothies|squash|mojito|mocktail|frappe|frappuccino|milkshake|float|mineral|aqua|minerale|ades|pristine|equil|yakult|pocari|mizone|buavita|pulpy|floridina|tebs|sosro|pucuk|frestea|hydro coco|cold brew|vietnam drip)\b/i.test(
      lower
    );

  // =========================================================
  // 1. PRIORITAS UTAMA: KATEGORI MAKANAN — POPCORN XXI
  // =========================================================
  if (
    lower.includes('popcorn') ||
    lower.includes('pop corn') ||
    lower.includes('pop-corn') ||
    lower.includes('berondong') ||
    lower.includes('sweet glaze') ||
    lower.includes('sweetglaze') ||
    lower.includes('extra caramel') ||
    lower.includes('honey butter') ||
    lower.includes('bucket popcorn') ||
    lower.includes('popcorn bucket') ||
    lower.includes('popcorn cup') ||
    lower.includes('popcorn box') ||
    lower.includes('jagung pop') ||
    lower.includes('kernel') ||
    (!hasExplicitDrinkWord &&
      /\b(salt|salted|caramel|karamel|glaze|mix|balado|bbq|barbeque|cheese)\s*(\(|\[)?\s*(jr|junior|s|m|l|xl|small|medium|large|reg|regular|jumbo|bucket|box|pack)\b/i.test(
        lower
      )) ||
    (!hasExplicitDrinkWord &&
      /\b(jr|junior|s|m|l|small|medium|large|reg|regular|jumbo|bucket)\s*(\)|\])?\s*(salt|salted|caramel|karamel|sweet glaze|glaze|mix)\b/i.test(
        lower
      )) ||
    (!hasExplicitDrinkWord &&
      /^(salt|salted|caramel|karamel|sweet glaze|mix popcorn|pop)\b/i.test(lower))
  ) {
    return {
      categoryId: 'Makanan - Popcorn',
      group: 'makanan',
      isConfident: true,
    };
  }

  // =========================================================
  // 2. KATEGORI MAKANAN — PAKET COMBO & BUNDLING
  // =========================================================
  if (
    /\b(combo|kombo|paket|bundling|bundle|package)\b/i.test(lower)
  ) {
    return {
      categoryId: 'Makanan - Paket Combo & Lainnya',
      group: 'makanan',
      isConfident: true,
    };
  }

  // =========================================================
  // 3. KATEGORI MAKANAN — BAKERY & PASTRY
  // =========================================================
  if (
    lower.includes('croissant') ||
    lower.includes('cromboloni') ||
    lower.includes('croffle') ||
    lower.includes('churros') ||
    lower.includes('churro') ||
    lower.includes('pastry') ||
    lower.includes('danish') ||
    lower.includes('puff') ||
    lower.includes('cinnamon roll') ||
    lower.includes('roti') ||
    lower.includes('bread') ||
    lower.includes('toast') ||
    lower.includes('donut') ||
    lower.includes('donat') ||
    lower.includes('doughnut') ||
    lower.includes('bomboloni') ||
    lower.includes('waffle') ||
    lower.includes('pancake') ||
    lower.includes('crepes') ||
    lower.includes('crepe') ||
    lower.includes('brownies') ||
    lower.includes('brownie') ||
    lower.includes('muffin') ||
    lower.includes('cupcake') ||
    lower.includes('cookies') ||
    lower.includes('cookie') ||
    lower.includes('biskuit') ||
    lower.includes('biscuit') ||
    lower.includes('strudel') ||
    lower.includes('eclair') ||
    lower.includes('macaron') ||
    lower.includes('bagel') ||
    lower.includes('pretzel') ||
    lower.includes('baking') ||
    lower.includes('bakery') ||
    /\b(cake|kue|pie|tart)\b/i.test(lower)
  ) {
    return {
      categoryId: 'Makanan - Bakery & Pastry',
      group: 'makanan',
      isConfident: true,
    };
  }

  // =========================================================
  // 4. KATEGORI MAKANAN — HOTDOG, SOSIS, CORNDOG, NACHOS & SAVORY
  // =========================================================
  if (
    lower.includes('hotdog') ||
    lower.includes('hot dog') ||
    lower.includes('sosis') ||
    lower.includes('sausage') ||
    lower.includes('bratwurst') ||
    lower.includes('frankfurter') ||
    lower.includes('corndog') ||
    lower.includes('corn dog') ||
    lower.includes('nachos') ||
    lower.includes('nacho') ||
    lower.includes('burger') ||
    lower.includes('hamburger') ||
    lower.includes('beef') ||
    lower.includes('sandwich') ||
    lower.includes('kebab') ||
    lower.includes('pizza') ||
    lower.includes('mac and cheese') ||
    lower.includes('mac & cheese') ||
    lower.includes('mac n cheese') ||
    lower.includes('spaghetti') ||
    lower.includes('pasta') ||
    lower.includes('lasagna') ||
    lower.includes('indomie') ||
    lower.includes('ramen') ||
    lower.includes('nasi') ||
    lower.includes('rice bowl') ||
    lower.includes('katsu') ||
    lower.includes('mentai') ||
    /\b(mie|mi)\b/i.test(lower)
  ) {
    return {
      categoryId: 'Makanan - Hotdog, Sosis & Savory',
      group: 'makanan',
      isConfident: true,
    };
  }

  // =========================================================
  // 5. KATEGORI MAKANAN — GORENGAN & SNACK XXI
  // =========================================================
  if (
    lower.includes('sistagor') ||
    lower.includes('french fries') ||
    lower.includes('kentang') ||
    lower.includes('fries') ||
    lower.includes('potato') ||
    lower.includes('wedges') ||
    lower.includes('tahu') ||
    lower.includes('tofu') ||
    lower.includes('bakso') ||
    lower.includes('baso') ||
    lower.includes('meatball') ||
    lower.includes('siomay') ||
    lower.includes('somay') ||
    lower.includes('dimsum') ||
    lower.includes('hakau') ||
    lower.includes('fishball') ||
    lower.includes('fish ball') ||
    lower.includes('fish roll') ||
    lower.includes('fish cake') ||
    lower.includes('odeng') ||
    lower.includes('pangsit') ||
    lower.includes('wonton') ||
    lower.includes('batagor') ||
    lower.includes('otak-otak') ||
    lower.includes('otak otak') ||
    lower.includes('pempek') ||
    lower.includes('cireng') ||
    lower.includes('singkong') ||
    lower.includes('cassava') ||
    lower.includes('pisang') ||
    lower.includes('nugget') ||
    lower.includes('chicken skin') ||
    lower.includes('kulit ayam') ||
    lower.includes('chicken pop') ||
    lower.includes('chicken strip') ||
    lower.includes('chicken wing') ||
    lower.includes('karaage') ||
    lower.includes('pok-pok') ||
    lower.includes('pok pok') ||
    lower.includes('ayam') ||
    lower.includes('chicken') ||
    lower.includes('crispy') ||
    lower.includes('onion ring') ||
    lower.includes('kacang') ||
    lower.includes('peanut') ||
    lower.includes('almond') ||
    lower.includes('cashew') ||
    lower.includes('kuaci') ||
    lower.includes('keripik') ||
    lower.includes('kripik') ||
    lower.includes('kerupuk') ||
    lower.includes('chips') ||
    lower.includes('chitato') ||
    lower.includes('lays') ||
    lower.includes('pringles') ||
    lower.includes('taro net') ||
    lower.includes('snack') ||
    lower.includes('cemilan') ||
    lower.includes('camilan') ||
    lower.includes('gorengan') ||
    lower.includes('risol') ||
    lower.includes('pastel') ||
    lower.includes('martabak') ||
    lower.includes('lumpia') ||
    lower.includes('samosa') ||
    lower.includes('edamame') ||
    lower.includes('jagung manis') ||
    lower.includes('sweet corn') ||
    lower.includes('corn cup') ||
    lower.includes('jasuke') ||
    /\b(ff)\b/i.test(lower)
  ) {
    return {
      categoryId: 'Makanan - Gorengan & Snack',
      group: 'makanan',
      isConfident: true,
    };
  }

  // Makanan lainnya (Es krim / Sundae / Permen / Jelly / Puding)
  if (
    lower.includes('makanan') ||
    lower.includes('ice cream') ||
    lower.includes('es krim') ||
    lower.includes('eskrim') ||
    lower.includes('sundae') ||
    lower.includes('gelato') ||
    lower.includes('permen') ||
    lower.includes('candy') ||
    lower.includes('pudding') ||
    lower.includes('puding') ||
    lower.includes('salad')
  ) {
    return {
      categoryId: 'Makanan - Paket Combo & Lainnya',
      group: 'makanan',
      isConfident: true,
    };
  }

  // =========================================================
  // 6. KATEGORI MINUMAN — TEA SERIES
  // =========================================================
  if (
    lower.includes('java tea') ||
    lower.includes('javatea') ||
    lower.includes('lemon tea') ||
    lower.includes('lychee tea') ||
    lower.includes('leci tea') ||
    lower.includes('peach tea') ||
    lower.includes('apple tea') ||
    lower.includes('strawberry tea') ||
    lower.includes('passion tea') ||
    lower.includes('mango tea') ||
    lower.includes('green tea') ||
    lower.includes('greentea') ||
    lower.includes('thai tea') ||
    lower.includes('thaitea') ||
    lower.includes('milk tea') ||
    lower.includes('milktea') ||
    lower.includes('jasmine tea') ||
    lower.includes('black tea') ||
    lower.includes('earl grey') ||
    lower.includes('oolong') ||
    lower.includes('chamomile') ||
    lower.includes('teh botol') ||
    lower.includes('teh pucuk') ||
    lower.includes('teh kotak') ||
    lower.includes('teh gelas') ||
    lower.includes('teh javana') ||
    lower.includes('teh tarik') ||
    lower.includes('teh manis') ||
    lower.includes('teh tawar') ||
    lower.includes('teh poci') ||
    lower.includes('teh kampul') ||
    lower.includes('teh leci') ||
    lower.includes('teh lemon') ||
    lower.includes('teh apel') ||
    lower.includes('tebs') ||
    lower.includes('sosro') ||
    lower.includes('frestea') ||
    lower.includes('fruit tea') ||
    lower.includes('fruittea') ||
    lower.includes('s-tee') ||
    lower.includes('ichi ocha') ||
    lower.includes('nu green') ||
    lower.includes('ito en') ||
    lower.includes('pokka') ||
    lower.includes('liang teh') ||
    lower.includes('wintermelon') ||
    /\b(tea|teh)\b/i.test(lower)
  ) {
    return {
      categoryId: 'Minuman - Tea Series',
      group: 'minuman',
      isConfident: true,
    };
  }

  // =========================================================
  // 7. KATEGORI MINUMAN — COFFEE SERIES
  // =========================================================
  if (
    lower.includes('kopi') ||
    lower.includes('coffee') ||
    lower.includes('coffe') ||
    lower.includes('cafe latte') ||
    lower.includes('caffe latte') ||
    lower.includes('cappuccino') ||
    lower.includes('cappucino') ||
    lower.includes('capucino') ||
    lower.includes('americano') ||
    lower.includes('espresso') ||
    lower.includes('expresso') ||
    lower.includes('macchiato') ||
    lower.includes('machiato') ||
    lower.includes('mochaccino') ||
    lower.includes('mocaccino') ||
    lower.includes('mocha') ||
    lower.includes('moka') ||
    lower.includes('affogato') ||
    lower.includes('gula aren') ||
    lower.includes('aren latte') ||
    lower.includes('pandan latte') ||
    lower.includes('caramel latte') ||
    lower.includes('vanilla latte') ||
    lower.includes('hazelnut latte') ||
    lower.includes('flat white') ||
    lower.includes('piccolo') ||
    lower.includes('long black') ||
    lower.includes('cold brew') ||
    lower.includes('vietnam drip') ||
    lower.includes('nescafe') ||
    lower.includes('good day') ||
    lower.includes('kopiko') ||
    lower.includes('torabika') ||
    lower.includes('luwak') ||
    /\b(latte)\b/i.test(lower)
  ) {
    return {
      categoryId: 'Minuman - Coffee Series',
      group: 'minuman',
      isConfident: true,
    };
  }

  // =========================================================
  // 8. KATEGORI MINUMAN — SOFT DRINK & ISOTONIK
  // =========================================================
  if (
    lower.includes('coca cola') ||
    lower.includes('coca-cola') ||
    lower.includes('cocacola') ||
    lower.includes('sprite') ||
    lower.includes('fanta') ||
    lower.includes('pepsi') ||
    lower.includes('7up') ||
    lower.includes('mirinda') ||
    lower.includes('root beer') ||
    lower.includes('rootbeer') ||
    lower.includes('sarsaparilla') ||
    lower.includes('a&w') ||
    lower.includes('aw root') ||
    lower.includes('soft drink') ||
    lower.includes('softdrink') ||
    lower.includes('soda') ||
    lower.includes('carbonated') ||
    lower.includes('schweppes') ||
    lower.includes('ginger ale') ||
    lower.includes('tonic water') ||
    lower.includes('nipis madu') ||
    lower.includes('big cola') ||
    lower.includes('pocari') ||
    lower.includes('mizone') ||
    lower.includes('isoplus') ||
    lower.includes('you c1000') ||
    lower.includes('you c 1000') ||
    lower.includes('you-c') ||
    lower.includes('kratingdaeng') ||
    lower.includes('red bull') ||
    lower.includes('redbull') ||
    lower.includes('hemaviton') ||
    lower.includes('adem sari') ||
    lower.includes('larutan') ||
    lower.includes('cap badak') ||
    /\b(coke|cola)\b/i.test(lower)
  ) {
    return {
      categoryId: 'Minuman - Soft Drink',
      group: 'minuman',
      isConfident: true,
    };
  }

  // =========================================================
  // 9. KATEGORI MINUMAN — AIR MINERAL & BOTOL KEMASAN
  // =========================================================
  if (
    lower.includes('air mineral') ||
    lower.includes('mineral water') ||
    lower.includes('aqua') ||
    lower.includes('le minerale') ||
    lower.includes('leminerale') ||
    lower.includes('ades') ||
    lower.includes('pristine') ||
    lower.includes('cleo') ||
    lower.includes('eternal plus') ||
    lower.includes('evian') ||
    lower.includes('equil') ||
    lower.includes('fiji') ||
    lower.includes('nestle pure') ||
    lower.includes('crystalline') ||
    lower.includes('ron 88') ||
    lower.includes('air putih') ||
    /\b(vit|club)\b/i.test(lower)
  ) {
    return {
      categoryId: 'Minuman - Air Mineral & Kemasan',
      group: 'minuman',
      isConfident: true,
    };
  }

  // =========================================================
  // 10. KATEGORI MINUMAN — JUICE, SMOOTHIE & BLENDED
  // =========================================================
  if (
    lower.includes('juice') ||
    lower.includes('smoothie') ||
    lower.includes('smoothies') ||
    lower.includes('blended') ||
    lower.includes('ice blend') ||
    lower.includes('frappe') ||
    lower.includes('frappuccino') ||
    lower.includes('slush') ||
    lower.includes('slurpee') ||
    lower.includes('squash') ||
    lower.includes('mojito') ||
    lower.includes('mocktail') ||
    lower.includes('lemonade') ||
    lower.includes('buavita') ||
    lower.includes('minute maid') ||
    lower.includes('pulpy') ||
    lower.includes('floridina') ||
    lower.includes('country choice') ||
    lower.includes('jungle juice') ||
    lower.includes('jeruk peras') ||
    lower.includes('es jeruk') ||
    lower.includes('ice jeruk') ||
    lower.includes('orange drink') ||
    lower.includes('alpukat') ||
    lower.includes('avocado') ||
    lower.includes('mangga') ||
    lower.includes('mango') ||
    lower.includes('jambu') ||
    lower.includes('guava') ||
    lower.includes('sirsak') ||
    lower.includes('soursop') ||
    lower.includes('semangka') ||
    lower.includes('watermelon') ||
    lower.includes('melon') ||
    lower.includes('buah naga') ||
    lower.includes('dragon fruit') ||
    lower.includes('kelapa') ||
    lower.includes('coconut') ||
    lower.includes('degan') ||
    lower.includes('hydro coco') ||
    lower.includes('cincau') ||
    lower.includes('grass jelly') ||
    lower.includes('cendol') ||
    lower.includes('dawet') ||
    lower.includes('es teler') ||
    lower.includes('es campur') ||
    lower.includes('es buah') ||
    lower.includes('es kuwut') ||
    lower.includes('es kelapa') ||
    lower.includes('kelengkeng') ||
    lower.includes('selasih') ||
    lower.includes('nata de coco') ||
    /\b(jus)\b/i.test(lower)
  ) {
    return {
      categoryId: 'Minuman - Juice & Blended',
      group: 'minuman',
      isConfident: true,
    };
  }

  // =========================================================
  // 11. KATEGORI MINUMAN — NON-COFFEE & MILK SERIES
  // =========================================================
  if (
    lower.includes('milo') ||
    lower.includes('ovaltine') ||
    lower.includes('coklat') ||
    lower.includes('cokelat') ||
    lower.includes('chocolate') ||
    lower.includes('choco') ||
    lower.includes('matcha') ||
    lower.includes('red velvet') ||
    lower.includes('redvelvet') ||
    lower.includes('taro') ||
    lower.includes('susu') ||
    lower.includes('milk') ||
    lower.includes('ultra milk') ||
    lower.includes('indomilk') ||
    lower.includes('frisian flag') ||
    lower.includes('bear brand') ||
    lower.includes('dancow') ||
    lower.includes('greenfields') ||
    lower.includes('cimory') ||
    lower.includes('yakult') ||
    lower.includes('yogurt') ||
    lower.includes('yoghurt') ||
    lower.includes('calpis') ||
    lower.includes('boba') ||
    lower.includes('brown sugar') ||
    lower.includes('milkshake') ||
    lower.includes('float') ||
    lower.includes('bandrek') ||
    lower.includes('bajigur') ||
    lower.includes('wedang') ||
    lower.includes('jahe') ||
    lower.includes('soy milk') ||
    lower.includes('sari kedelai')
  ) {
    return {
      categoryId: 'Minuman - Non-Coffee & Milk',
      group: 'minuman',
      isConfident: true,
    };
  }

  // =========================================================
  // 12. KATEGORI MINUMAN — MINUMAN LAINNYA (Kata kunci Es / Ice / Drink)
  // =========================================================
  if (
    lower.includes('minuman') ||
    lower.includes('beverage') ||
    lower.includes('drink') ||
    lower.includes('syrup') ||
    lower.includes('sirup') ||
    lower.includes('marjan') ||
    /\b(es|ice|iced|hot|cold|botol|bottle)\b/i.test(lower)
  ) {
    return {
      categoryId: 'Minuman - Lainnya',
      group: 'minuman',
      isConfident: true,
    };
  }

  return {
    categoryId: 'Makanan - Paket Combo & Lainnya',
    group: 'makanan',
    isConfident: false,
  };
}

/**
 * Resolusi kategori produk presisi tinggi:
 * - Memastikan Popcorn, Gorengan, Hotdog, Bakery, Combo SELALU masuk ke Kategori Makanan
 *   meskipun sebelumnya sempat tersimpan sebagai "Minuman - Lainnya" atau kategori minuman lain.
 * - Memastikan produk minuman (Tea, Coffee, Soft Drink, Non-Coffee, Juice, Air Mineral)
 *   masuk ke sub-kategori minuman yang tepat.
 */
export function resolveProductItemCategory(
  name: string,
  explicitCategory?: string
): string {
  const detected = detectProductCategoryByName(name);
  const cleanExplicit = (explicitCategory || '').trim();

  // Mapping nama kategori lama (legacy) ke ID kategori baru
  const normalizedExplicit =
    cleanExplicit === 'Makanan & Snack (Popcorn/Lainnya)'
      ? detected.group === 'makanan'
        ? detected.categoryId
        : 'Makanan - Popcorn'
      : cleanExplicit;

  const knownExplicitMeta = BEVERAGE_CATEGORIES.find(
    (c) => c.id.toLowerCase() === normalizedExplicit.toLowerCase()
  );

  // Jika nama produk terdeteksi secara spesifik (confident):
  if (detected.isConfident) {
    // 1. Jika dari nama produk jelas-jelas MAKANAN (misal Popcorn, Sistagor, Fries, Roti, Hotdog, Combo):
    if (detected.group === 'makanan') {
      // Jangan pernah biarkan masuk ke Minuman!
      if (!knownExplicitMeta || knownExplicitMeta.isBeverage) {
        return detected.categoryId;
      }
      // Jika item adalah Popcorn, selalu kunci di 'Makanan - Popcorn'
      if (detected.categoryId === 'Makanan - Popcorn') {
        return 'Makanan - Popcorn';
      }
      // Jika explicit masih default fallback makanan, gunakan hasil deteksi spesifik
      if (knownExplicitMeta.id === 'Makanan - Paket Combo & Lainnya') {
        return detected.categoryId;
      }
      return knownExplicitMeta.id;
    }

    // 2. Jika dari nama produk jelas-jelas MINUMAN:
    if (detected.group === 'minuman') {
      // Jangan biarkan masuk ke Makanan atau tertahan di fallback 'Minuman - Lainnya'
      if (
        !knownExplicitMeta ||
        !knownExplicitMeta.isBeverage ||
        knownExplicitMeta.id === 'Minuman - Lainnya'
      ) {
        return detected.categoryId;
      }
      return knownExplicitMeta.id;
    }
  }

  // Jika nama produk belum spesifik (misal "Item Produk Baru #1"), gunakan explicitCategory jika valid
  if (knownExplicitMeta) {
    return knownExplicitMeta.id;
  }

  return detected.categoryId;
}

export function getCategoryMeta(categoryId: string): BeverageCategoryMeta {
  return (
    BEVERAGE_CATEGORIES.find((c) => c.id === categoryId) ||
    BEVERAGE_CATEGORIES.find((c) => c.id === 'Makanan - Paket Combo & Lainnya') ||
    BEVERAGE_CATEGORIES[0]
  );
}

interface AggregatedProductEntry {
  key: string;
  name: string;
  unit: string;
  categoryId: string;
  dailyTotals: { [day: number]: number };
  totalMonthQty: number;
  todayQty: number;
  cashierBreakdown: { [cashierName: string]: number };
  cashierTodayBreakdown: { [cashierName: string]: number };
  sourceRefs: Array<{
    recordId: string;
    cashierId: string;
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

  const isAdmin =
    currentUser?.role === 'admin' || currentUser?.role === 'area_manager';

  const defaultOutletId =
    currentUser?.outletId || (outlets.length > 0 ? outlets[0].id : '');
  const [selectedOutletId, setSelectedOutletId] =
    useState<string>(defaultOutletId);

  // Filter Kasir: 'ALL' (Gabungan Seluruh Kasir Outlet) atau ID Kasir tertentu
  const [selectedCashierFilter, setSelectedCashierFilter] =
    useState<string>('ALL');

  // Filter Kategori:
  // 'ALL_PRODUCTS' (Semua Produk Makanan & Minuman) | 'ALL_FOODS' (Semua Makanan) | 'ALL_DRINKS' (Semua Minuman) | ID Kategori Spesifik
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>('ALL_PRODUCTS');

  // Mode periode Top 10 Terlaris: 'month' (Akumulasi Bulan Ini) | 'day' (Harian Tanggal Aktif)
  const [top10PeriodMode, setTop10PeriodMode] = useState<'month' | 'day'>('month');

  const [searchQuery, setSearchQuery] = useState<string>('');

  const parsedDate = selectedDate.split('-').map(Number);
  const [selectedYear, setSelectedYear] = useState<number>(
    parsedDate[0] || new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    parsedDate[1] || new Date().getMonth() + 1
  );
  const activeDay = parsedDate[2] || new Date().getDate();

  useEffect(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    if (y && m) {
      setSelectedYear(y);
      setSelectedMonth(m);
    }
  }, [selectedDate]);

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const handleStorageUpdate = (e: any) => {
      const t = e.detail?.type;
      if (!t || t === 'sdm-products' || t === 'employees' || t === 'all-reset') {
        setRefreshTick((prev) => prev + 1);
      }
    };
    window.addEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    return () =>
      window.removeEventListener(
        'cinema-xxi-storage-update',
        handleStorageUpdate
      );
  }, []);

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  const allEmployees = useMemo(
    () => StorageService.getEmployees(),
    [refreshTick]
  );

  const outletCashiers: Employee[] = useMemo(() => {
    return StorageService.getOutletCashiers(selectedOutletId);
  }, [selectedOutletId, refreshTick]);

  // Ambil seluruh record Tabel Excel Penjualan Item Produk Harian pada outlet, bulan & tahun ini
  const monthlyProductRecords: CashierMonthlyProductRecord[] = useMemo(() => {
    const allRecords = StorageService.getCashierMonthlyProductsAll();
    return allRecords.filter(
      (r) =>
        r.outletId === selectedOutletId &&
        Number(r.year) === Number(selectedYear) &&
        Number(r.month) === Number(selectedMonth)
    );
  }, [selectedOutletId, selectedYear, selectedMonth, refreshTick]);

  // Daftar kasir yang tampil di dropdown filter (gabungan kasir outlet + kasir yang punya record item)
  const cashierOptions = useMemo(() => {
    const map = new Map<string, string>();
    outletCashiers.forEach((c) => {
      map.set(c.id, `${c.name} (${c.jabatan})`);
    });
    monthlyProductRecords.forEach((r) => {
      if (!map.has(r.cashierId)) {
        const emp = allEmployees.find((e) => e.id === r.cashierId);
        map.set(
          r.cashierId,
          emp ? `${emp.name} (${emp.jabatan})` : r.cashierName || 'Kasir XXI'
        );
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [outletCashiers, monthlyProductRecords, allEmployees]);

  // Agregasi seluruh item produk dari Tabel Excel Penjualan Item Produk Harian
  const aggregatedItems: AggregatedProductEntry[] = useMemo(() => {
    const recordsToProcess =
      selectedCashierFilter === 'ALL'
        ? monthlyProductRecords
        : monthlyProductRecords.filter(
            (r) => r.cashierId === selectedCashierFilter
          );

    const itemMap = new Map<string, AggregatedProductEntry>();

    recordsToProcess.forEach((rec) => {
      const matchedEmp = allEmployees.find((e) => e.id === rec.cashierId);
      const cashierName = matchedEmp?.name || rec.cashierName || 'Kasir XXI';

      (rec.items || []).forEach((item) => {
        const cleanName = (item.name || '').trim();
        if (!cleanName) return;

        const normKey = cleanName.toLowerCase();
        // Selalu jalankan resolveProductItemCategory agar item seperti Popcorn tidak pernah salah masuk ke Minuman
        const resolvedCat = resolveProductItemCategory(cleanName, item.category);

        let entry = itemMap.get(normKey);
        if (!entry) {
          entry = {
            key: normKey,
            name: cleanName,
            unit: (item.unit || 'PCS').toUpperCase(),
            categoryId: resolvedCat,
            dailyTotals: {},
            totalMonthQty: 0,
            todayQty: 0,
            cashierBreakdown: {},
            cashierTodayBreakdown: {},
            sourceRefs: [],
          };
          itemMap.set(normKey, entry);
        } else {
          entry.categoryId = resolveProductItemCategory(cleanName, item.category || entry.categoryId);
        }

        entry.sourceRefs.push({
          recordId: rec.id,
          cashierId: rec.cashierId,
          itemId: item.id,
        });

        let itemCashierTotal = 0;
        for (let d = 1; d <= daysInMonth; d++) {
          const q = Number(rec.dailySales?.[d]?.[item.id] || 0);
          if (q > 0) {
            entry.dailyTotals[d] = (entry.dailyTotals[d] || 0) + q;
            entry.totalMonthQty += q;
            itemCashierTotal += q;
            if (d === activeDay) {
              entry.todayQty += q;
              entry.cashierTodayBreakdown[cashierName] =
                (entry.cashierTodayBreakdown[cashierName] || 0) + q;
            }
          }
        }

        if (itemCashierTotal > 0) {
          entry.cashierBreakdown[cashierName] =
            (entry.cashierBreakdown[cashierName] || 0) + itemCashierTotal;
        }
      });
    });

    return Array.from(itemMap.values()).sort(
      (a, b) => b.totalMonthQty - a.totalMonthQty || a.name.localeCompare(b.name)
    );
  }, [
    monthlyProductRecords,
    selectedCashierFilter,
    allEmployees,
    daysInMonth,
    activeDay,
  ]);

  // Handler untuk mengubah sub-kategori item langsung dari tabel Produk Perkategori
  // dan menyimpannya kembali ke record Tabel Excel Penjualan Item Produk Harian
  const handleChangeItemCategory = (
    entry: AggregatedProductEntry,
    newCategoryId: string
  ) => {
    const allRecords = StorageService.getCashierMonthlyProductsAll();
    const targetKey = entry.key;

    allRecords.forEach((rec) => {
      if (
        rec.outletId === selectedOutletId &&
        Number(rec.year) === Number(selectedYear) &&
        Number(rec.month) === Number(selectedMonth)
      ) {
        let changed = false;
        const updatedItems = (rec.items || []).map((it) => {
          if ((it.name || '').trim().toLowerCase() === targetKey) {
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
      }
    });

    setRefreshTick((prev) => prev + 1);
  };

  // Ringkasan per Kategori (Makanan & Minuman)
  const categorySummaries = useMemo(() => {
    return BEVERAGE_CATEGORIES.map((cat) => {
      const catItems = aggregatedItems.filter((i) => i.categoryId === cat.id);
      const monthTotal = catItems.reduce((acc, i) => acc + i.totalMonthQty, 0);
      const todayTotal = catItems.reduce((acc, i) => acc + i.todayQty, 0);
      const dailyTotals: { [day: number]: number } = {};
      for (let d = 1; d <= daysInMonth; d++) {
        dailyTotals[d] = catItems.reduce(
          (acc, i) => acc + (i.dailyTotals[d] || 0),
          0
        );
      }

      const topItem =
        catItems.length > 0 && catItems[0].totalMonthQty > 0
          ? catItems[0]
          : null;

      return {
        category: cat,
        skuCount: catItems.length,
        monthTotal,
        todayTotal,
        dailyTotals,
        topItem,
      };
    });
  }, [aggregatedItems, daysInMonth]);

  const foodCategorySummaries = useMemo(
    () => categorySummaries.filter((s) => s.category.productGroup === 'makanan'),
    [categorySummaries]
  );

  const beverageCategorySummaries = useMemo(
    () => categorySummaries.filter((s) => s.category.productGroup === 'minuman'),
    [categorySummaries]
  );

  const totalFoodMonth = useMemo(
    () => foodCategorySummaries.reduce((acc, s) => acc + s.monthTotal, 0),
    [foodCategorySummaries]
  );

  const totalFoodToday = useMemo(
    () => foodCategorySummaries.reduce((acc, s) => acc + s.todayTotal, 0),
    [foodCategorySummaries]
  );

  const totalBeverageMonth = useMemo(
    () => beverageCategorySummaries.reduce((acc, s) => acc + s.monthTotal, 0),
    [beverageCategorySummaries]
  );

  const totalBeverageToday = useMemo(
    () => beverageCategorySummaries.reduce((acc, s) => acc + s.todayTotal, 0),
    [beverageCategorySummaries]
  );

  const totalAllProductsMonth = totalFoodMonth + totalBeverageMonth;
  const totalAllProductsToday = totalFoodToday + totalBeverageToday;

  // =========================================================
  // TOP 10 PRODUK TERLARIS MAKANAN & TOP 10 PRODUK TERLARIS MINUMAN
  // =========================================================
  const top10FoodItems = useMemo(() => {
    const foods = aggregatedItems.filter((item) => {
      const meta = getCategoryMeta(item.categoryId);
      return meta.productGroup === 'makanan';
    });

    const sorted = [...foods].sort((a, b) => {
      const valA = top10PeriodMode === 'day' ? a.todayQty : a.totalMonthQty;
      const valB = top10PeriodMode === 'day' ? b.todayQty : b.totalMonthQty;
      if (valB !== valA) return valB - valA;
      return b.totalMonthQty - a.totalMonthQty || a.name.localeCompare(b.name);
    });

    return sorted.slice(0, 10);
  }, [aggregatedItems, top10PeriodMode]);

  const top10BeverageItems = useMemo(() => {
    const drinks = aggregatedItems.filter((item) => {
      const meta = getCategoryMeta(item.categoryId);
      return meta.productGroup === 'minuman';
    });

    const sorted = [...drinks].sort((a, b) => {
      const valA = top10PeriodMode === 'day' ? a.todayQty : a.totalMonthQty;
      const valB = top10PeriodMode === 'day' ? b.todayQty : b.totalMonthQty;
      if (valB !== valA) return valB - valA;
      return b.totalMonthQty - a.totalMonthQty || a.name.localeCompare(b.name);
    });

    return sorted.slice(0, 10);
  }, [aggregatedItems, top10PeriodMode]);

  // Filter daftar item untuk tabel utama
  const filteredItems = useMemo(() => {
    return aggregatedItems.filter((item) => {
      if (
        searchQuery.trim() &&
        !item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      ) {
        return false;
      }

      const catMeta = getCategoryMeta(item.categoryId);
      if (selectedCategoryFilter === 'ALL_PRODUCTS') {
        return true;
      }
      if (selectedCategoryFilter === 'ALL_FOODS') {
        return catMeta.productGroup === 'makanan';
      }
      if (selectedCategoryFilter === 'ALL_DRINKS') {
        return catMeta.productGroup === 'minuman';
      }
      return item.categoryId === selectedCategoryFilter;
    });
  }, [aggregatedItems, searchQuery, selectedCategoryFilter]);

  // Kelompokkan filteredItems berdasarkan kategori agar tabel memiliki sub-header & subtotal per kategori
  const groupedFilteredItems = useMemo(() => {
    const groups: Array<{
      category: BeverageCategoryMeta;
      items: AggregatedProductEntry[];
      dailySubtotals: { [day: number]: number };
      monthSubtotal: number;
    }> = [];

    BEVERAGE_CATEGORIES.forEach((cat) => {
      const itemsInCat = filteredItems.filter((i) => i.categoryId === cat.id);
      if (itemsInCat.length === 0) return;

      const dailySubtotals: { [day: number]: number } = {};
      let monthSubtotal = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const sub = itemsInCat.reduce(
          (acc, it) => acc + (it.dailyTotals[d] || 0),
          0
        );
        dailySubtotals[d] = sub;
        monthSubtotal += sub;
      }

      groups.push({
        category: cat,
        items: itemsInCat,
        dailySubtotals,
        monthSubtotal,
      });
    });

    return groups;
  }, [filteredItems, daysInMonth]);

  // Export Excel Rincian Produk Perkategori + Top 10 Makanan & Minuman
  const handleExportBeverageExcel = () => {
    const rows: Array<Record<string, any>> = [];
    let rowNum = 1;

    groupedFilteredItems.forEach((group) => {
      group.items.forEach((item) => {
        const rowObj: Record<string, any> = {
          NO: rowNum++,
          KELOMPOK:
            group.category.productGroup === 'makanan' ? 'MAKANAN' : 'MINUMAN',
          'KATEGORI PRODUK': group.category.shortLabel,
          'NAMA ITEM PRODUK': item.name,
        };
        for (let d = 1; d <= daysInMonth; d++) {
          rowObj[`Tgl ${d}`] = item.dailyTotals[d] || 0;
        }
        rowObj['TOTAL BULAN INI'] = item.totalMonthQty;
        rowObj['RINCIAN KASIR'] = Object.entries(item.cashierBreakdown)
          .map(([cName, q]) => `${cName}: ${q}`)
          .join(', ');
        rows.push(rowObj);
      });

      // Tambahkan baris subtotal kategori
      const subRow: Record<string, any> = {
        NO: '',
        KELOMPOK:
          group.category.productGroup === 'makanan' ? 'MAKANAN' : 'MINUMAN',
        'KATEGORI PRODUK': `SUBTOTAL ${group.category.shortLabel.toUpperCase()}`,
        'NAMA ITEM PRODUK': `${group.items.length} Item Produk`,
      };
      for (let d = 1; d <= daysInMonth; d++) {
        subRow[`Tgl ${d}`] = group.dailySubtotals[d] || 0;
      }
      subRow['TOTAL BULAN INI'] = group.monthSubtotal;
      subRow['RINCIAN KASIR'] = '';
      rows.push(subRow);
    });

    // Sheet Top 10 Makanan Terlaris
    const topFoodRows = top10FoodItems.map((item, idx) => ({
      PERINGKAT: `TOP #${idx + 1}`,
      'NAMA PRODUK MAKANAN': item.name,
      'SUB-KATEGORI': getCategoryMeta(item.categoryId).shortLabel,
      [`TERJUAL HARI INI (TGL ${activeDay})`]: item.todayQty,
      'TOTAL TERJUAL BULAN INI': item.totalMonthQty,
      'SHARE MAKANAN (%)':
        totalFoodMonth > 0
          ? `${((item.totalMonthQty / totalFoodMonth) * 100).toFixed(1)}%`
          : '0%',
      'RINCIAN KASIR': Object.entries(item.cashierBreakdown)
        .map(([cName, q]) => `${cName}: ${q}`)
        .join(', '),
    }));

    // Sheet Top 10 Minuman Terlaris
    const topDrinkRows = top10BeverageItems.map((item, idx) => ({
      PERINGKAT: `TOP #${idx + 1}`,
      'NAMA PRODUK MINUMAN': item.name,
      'SUB-KATEGORI': getCategoryMeta(item.categoryId).shortLabel,
      [`TERJUAL HARI INI (TGL ${activeDay})`]: item.todayQty,
      'TOTAL TERJUAL BULAN INI': item.totalMonthQty,
      'SHARE MINUMAN (%)':
        totalBeverageMonth > 0
          ? `${((item.totalMonthQty / totalBeverageMonth) * 100).toFixed(1)}%`
          : '0%',
      'RINCIAN KASIR': Object.entries(item.cashierBreakdown)
        .map(([cName, q]) => `${cName}: ${q}`)
        .join(', '),
    }));

    // Sheet Ringkasan Per Kategori
    const summaryRows = categorySummaries.map((s, idx) => ({
      NO: idx + 1,
      KELOMPOK: s.category.productGroup === 'makanan' ? 'MAKANAN' : 'MINUMAN',
      'KATEGORI PRODUK': s.category.label,
      'JUMLAH SKU': s.skuCount,
      [`TERJUAL TGL ${activeDay}`]: s.todayTotal,
      'TOTAL BULAN INI': s.monthTotal,
      'PRODUK TERLARIS': s.topItem
        ? `${s.topItem.name} (${s.topItem.totalMonthQty})`
        : '-',
    }));

    const wb = XLSX.utils.book_new();
    const wsDetail = XLSX.utils.json_to_sheet(
      rows.length > 0
        ? rows
        : [{ INFO: 'Belum ada data rincian produk pada periode ini' }]
    );
    const wsTopFood = XLSX.utils.json_to_sheet(
      topFoodRows.length > 0
        ? topFoodRows
        : [{ INFO: 'Belum ada data penjualan makanan' }]
    );
    const wsTopDrink = XLSX.utils.json_to_sheet(
      topDrinkRows.length > 0
        ? topDrinkRows
        : [{ INFO: 'Belum ada data penjualan minuman' }]
    );
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);

    XLSX.utils.book_append_sheet(wb, wsDetail, 'Rincian Produk Perkategori');
    XLSX.utils.book_append_sheet(wb, wsTopFood, 'Top 10 Makanan Terlaris');
    XLSX.utils.book_append_sheet(wb, wsTopDrink, 'Top 10 Minuman Terlaris');
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Rekap Per Kategori');

    const selectedOutlet =
      outlets.find((o) => o.id === selectedOutletId) || outlets[0];
    const safeOutlet = (selectedOutlet?.name || 'Outlet').replace(
      /[^a-zA-Z0-9]/g,
      '_'
    );
    XLSX.writeFile(
      wb,
      `Produk_Perkategori_${safeOutlet}_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}.xlsx`
    );
  };

  const selectedOutlet =
    outlets.find((o) => o.id === selectedOutletId) || outlets[0];

  // Helper mencari kasir kontributor tertinggi pada 1 item
  const getTopCashierForItem = (item: AggregatedProductEntry) => {
    const map =
      top10PeriodMode === 'day'
        ? item.cashierTodayBreakdown
        : item.cashierBreakdown;
    const entries = Object.entries(map).filter(([, q]) => q > 0);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return { name: entries[0][0], qty: entries[0][1] };
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* HEADER UTAMA & FILTER OUTLET / KASIR / PERIODE            */}
      {/* ========================================================= */}
      <div className="p-6 rounded-3xl border border-purple-200/90 bg-white text-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#581c87] to-[#7e22ce] text-[#FACC15] shadow-xs shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
                  Performance SDM &bull; Produk Perkategori (Makanan &amp; Minuman)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] uppercase tracking-wider">
                  Auto-Sync Tabel Excel Kasir
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Rincian otomatis penempatan produk <strong>Makanan (Popcorn, Gorengan, Hotdog, Bakery, Combo)</strong> &amp; <strong>Minuman (Tea, Coffee, Soft Drink, Non-Coffee, Juice, Mineral)</strong> beserta <strong>TOP 10 Produk Terlaris</strong> dari inputan <strong>Tabel Excel Penjualan Item Produk Harian</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2.5">
            {/* Pilih Outlet */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                1. OUTLET
              </label>
              <select
                value={selectedOutletId}
                disabled={!isAdmin}
                onChange={(e) => {
                  setSelectedOutletId(e.target.value);
                  setSelectedCashierFilter('ALL');
                }}
                className={`text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-2xs ${
                  !isAdmin ? 'opacity-80 cursor-not-allowed' : ''
                }`}
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Pilih Kasir */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                2. FILTER SDM KASIR
              </label>
              <select
                value={selectedCashierFilter}
                onChange={(e) => setSelectedCashierFilter(e.target.value)}
                className="text-xs font-black px-3 py-2 rounded-xl border border-purple-300 bg-purple-50/60 text-purple-950 shadow-2xs"
              >
                <option value="ALL">
                  Semua Kasir ({cashierOptions.length} SDM)
                </option>
                {cashierOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Pilih Bulan & Tahun */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                3. PERIODE BULAN
              </label>
              <div className="flex items-center space-x-1.5">
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    const m = Number(e.target.value);
                    setSelectedMonth(m);
                    const d = String(Math.min(activeDay, 28)).padStart(2, '0');
                    onDateChange(
                      `${selectedYear}-${String(m).padStart(2, '0')}-${d}`
                    );
                  }}
                  className="text-xs font-bold px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800"
                >
                  {MONTH_NAMES.map((mName, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {mName}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setSelectedYear(y);
                    const d = String(Math.min(activeDay, 28)).padStart(2, '0');
                    onDateChange(
                      `${y}-${String(selectedMonth).padStart(2, '0')}-${d}`
                    );
                  }}
                  className="text-xs font-bold px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800"
                >
                  {[2025, 2026, 2027].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tombol Buka Tabel Input Excel Kasir */}
            {onNavigateToInput && (
              <button
                type="button"
                onClick={onNavigateToInput}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center space-x-1.5 shadow-2xs transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Buka Tabel Input Kasir</span>
              </button>
            )}

            {/* Tombol Export Excel */}
            <button
              type="button"
              onClick={handleExportBeverageExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center space-x-1.5 shadow-2xs transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4 KARTU KPI RINGKASAN PRODUK MAKANAN & MINUMAN             */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5 pt-5 border-t border-slate-100">
          {/* KPI 1: Total Makanan Terjual */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100">
                Total Makanan Terjual ({MONTH_NAMES[selectedMonth - 1]})
              </span>
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            <div className="text-2xl font-black mt-1">
              {totalFoodMonth.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-bold text-amber-100">Pcs/Box</span>
            </div>
            <div className="text-[11px] text-amber-50 mt-1 flex items-center justify-between">
              <span>Hari Ini (Tgl {activeDay}): <strong>{totalFoodToday.toLocaleString('id-ID')}</strong></span>
              <span>
                {totalAllProductsMonth > 0
                  ? `${((totalFoodMonth / totalAllProductsMonth) * 100).toFixed(1)}% Share`
                  : '0%'}
              </span>
            </div>
          </div>

          {/* KPI 2: Total Minuman Terjual */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#581c87] to-[#6d28d9] text-white shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200">
                Total Minuman Terjual ({MONTH_NAMES[selectedMonth - 1]})
              </span>
              <CupSoda className="w-4 h-4 text-[#FACC15]" />
            </div>
            <div className="text-2xl font-black text-[#FACC15] mt-1">
              {totalBeverageMonth.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-bold text-white">Cup/Btl</span>
            </div>
            <div className="text-[11px] text-purple-200 mt-1 flex items-center justify-between">
              <span>Hari Ini (Tgl {activeDay}): <strong>{totalBeverageToday.toLocaleString('id-ID')}</strong></span>
              <span>
                {totalAllProductsMonth > 0
                  ? `${((totalBeverageMonth / totalAllProductsMonth) * 100).toFixed(1)}% Share`
                  : '0%'}
              </span>
            </div>
          </div>

          {/* KPI 3: Produk Makanan #1 Terlaris */}
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-900">
                🍿 Top #1 Makanan Terlaris
              </span>
              <Trophy className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-sm font-black text-slate-900 mt-1.5 truncate">
              {top10FoodItems.length > 0 && top10FoodItems[0].totalMonthQty > 0
                ? top10FoodItems[0].name
                : 'Belum Ada Penjualan Makanan'}
            </div>
            <div className="text-[11px] text-amber-800 font-bold mt-1">
              {top10FoodItems.length > 0 && top10FoodItems[0].totalMonthQty > 0
                ? `${top10FoodItems[0].totalMonthQty.toLocaleString('id-ID')} Pcs (${getCategoryMeta(top10FoodItems[0].categoryId).shortLabel})`
                : 'Otomatis muncul dari inputan tabel kasir'}
            </div>
          </div>

          {/* KPI 4: Produk Minuman #1 Terlaris */}
          <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900">
                🥤 Top #1 Minuman Terlaris
              </span>
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-sm font-black text-slate-900 mt-1.5 truncate">
              {top10BeverageItems.length > 0 &&
              top10BeverageItems[0].totalMonthQty > 0
                ? top10BeverageItems[0].name
                : 'Belum Ada Penjualan Minuman'}
            </div>
            <div className="text-[11px] text-emerald-800 font-bold mt-1">
              {top10BeverageItems.length > 0 &&
              top10BeverageItems[0].totalMonthQty > 0
                ? `${top10BeverageItems[0].totalMonthQty.toLocaleString('id-ID')} Cup (${getCategoryMeta(top10BeverageItems[0].categoryId).shortLabel})`
                : 'Otomatis muncul dari inputan tabel kasir'}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TOP 10 PRODUK TERLARIS MAKANAN & TOP 10 MINUMAN           */}
      {/* ========================================================= */}
      <div className="p-6 rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-slate-900">
                Leaderboard TOP 10 Produk Terlaris &bull; Makanan &amp; Minuman
              </h3>
              <p className="text-xs text-slate-500">
                Peringkat 10 besar item makanan (Popcorn, Gorengan, Bakery, Hotdog, Combo) dan 10 besar item minuman terlaris di{' '}
                <strong className="text-slate-700">{selectedOutlet?.name}</strong>
              </p>
            </div>
          </div>

          {/* Toggle Periode Perhitungan Top 10 */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTop10PeriodMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                top10PeriodMode === 'month'
                  ? 'bg-[#581c87] text-[#FACC15] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulan Ini ({MONTH_NAMES[selectedMonth - 1]} {selectedYear})
            </button>
            <button
              type="button"
              onClick={() => setTop10PeriodMode('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                top10PeriodMode === 'day'
                  ? 'bg-[#581c87] text-[#FACC15] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Harian (Tgl {activeDay} {MONTH_NAMES[selectedMonth - 1]})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* KOLOM KIRI: TOP 10 PRODUK TERLARIS MAKANAN */}
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50/50 to-white p-4 sm:p-5 flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-200/80">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-base shadow-2xs">
                  🍿
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase text-amber-950">
                    TOP 10 Produk Terlaris Makanan
                  </h4>
                  <p className="text-[11px] text-amber-800 font-medium">
                    Popcorn, Gorengan &amp; Snack, Hotdog/Sosis, Bakery &amp; Paket Combo
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-amber-950">
                  {(top10PeriodMode === 'day'
                    ? totalFoodToday
                    : totalFoodMonth
                  ).toLocaleString('id-ID')}{' '}
                  Pcs
                </div>
                <div className="text-[10px] font-semibold text-amber-700">
                  Total Makanan {top10PeriodMode === 'day' ? `Tgl ${activeDay}` : 'Bulan Ini'}
                </div>
              </div>
            </div>

            {top10FoodItems.length === 0 ? (
              <div className="py-10 px-4 text-center text-xs text-slate-400 flex-1 flex flex-col items-center justify-center">
                <UtensilsCrossed className="w-8 h-8 text-amber-300 mb-2" />
                <p className="font-bold text-slate-600">
                  Belum ada data produk makanan pada periode ini.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                  Produk seperti Popcorn, Sistagor, French Fries, Hotdog, Croissant &amp; Combo akan otomatis tampil di sini.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {top10FoodItems.map((item, idx) => {
                  const primaryQty =
                    top10PeriodMode === 'day' ? item.todayQty : item.totalMonthQty;
                  const maxFoodQty = Math.max(
                    1,
                    top10PeriodMode === 'day'
                      ? top10FoodItems[0]?.todayQty || 1
                      : top10FoodItems[0]?.totalMonthQty || 1
                  );
                  const totalGroupPool =
                    top10PeriodMode === 'day' ? totalFoodToday : totalFoodMonth;
                  const sharePct =
                    totalGroupPool > 0 ? (primaryQty / totalGroupPool) * 100 : 0;
                  const barWidth =
                    primaryQty > 0
                      ? Math.max(6, Math.round((primaryQty / maxFoodQty) * 100))
                      : 0;
                  const catMeta = getCategoryMeta(item.categoryId);
                  const topCashier = getTopCashierForItem(item);

                  const rankBadgeClass =
                    idx === 0
                      ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 ring-2 ring-amber-300'
                      : idx === 1
                      ? 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-900 ring-1 ring-slate-300'
                      : idx === 2
                      ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white'
                      : 'bg-amber-100 text-amber-900';

                  return (
                    <div
                      key={item.key}
                      className="p-3 rounded-xl border border-amber-200/70 bg-white hover:border-amber-400 transition shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${rankBadgeClass}`}
                          >
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-black text-xs text-slate-900 truncate">
                              {item.name}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black ${catMeta.badgeBg} ${catMeta.badgeText}`}
                              >
                                {catMeta.shortLabel.replace('Makanan • ', '')}
                              </span>
                              {topCashier && (
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  &bull; Top Kasir:{' '}
                                  <strong className="text-slate-700">
                                    {topCashier.name} ({topCashier.qty})
                                  </strong>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-black font-mono text-amber-950">
                            {primaryQty.toLocaleString('id-ID')}{' '}
                            <span className="text-[10px] font-bold text-slate-500">
                              Pcs
                            </span>
                          </div>
                          <div className="text-[10px] font-bold text-amber-700">
                            {sharePct.toFixed(1)}% dari Makanan
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar & Info Bulan/Hari */}
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="flex-1 h-2 rounded-full bg-amber-100/80 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-slate-500 shrink-0">
                          {top10PeriodMode === 'day'
                            ? `Bulan: ${item.totalMonthQty.toLocaleString('id-ID')}`
                            : `Tgl ${activeDay}: ${item.todayQty.toLocaleString('id-ID')}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* KOLOM KANAN: TOP 10 PRODUK TERLARIS MINUMAN */}
          <div className="rounded-2xl border border-purple-200 bg-gradient-to-b from-purple-50/50 to-white p-4 sm:p-5 flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-purple-200/80">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#581c87] text-[#FACC15] flex items-center justify-center font-black text-base shadow-2xs">
                  🥤
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase text-purple-950">
                    TOP 10 Produk Terlaris Minuman
                  </h4>
                  <p className="text-[11px] text-purple-800 font-medium">
                    Tea Series, Coffee Series, Soft Drink, Non-Coffee, Juice &amp; Mineral
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-purple-950">
                  {(top10PeriodMode === 'day'
                    ? totalBeverageToday
                    : totalBeverageMonth
                  ).toLocaleString('id-ID')}{' '}
                  Cup
                </div>
                <div className="text-[10px] font-semibold text-purple-700">
                  Total Minuman {top10PeriodMode === 'day' ? `Tgl ${activeDay}` : 'Bulan Ini'}
                </div>
              </div>
            </div>

            {top10BeverageItems.length === 0 ? (
              <div className="py-10 px-4 text-center text-xs text-slate-400 flex-1 flex flex-col items-center justify-center">
                <CupSoda className="w-8 h-8 text-purple-300 mb-2" />
                <p className="font-bold text-slate-600">
                  Belum ada data produk minuman pada periode ini.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                  Produk seperti XXI Java Tea, Lemon Tea, Lychee Tea, Kopi Susu, Milo &amp; Soft Drink akan otomatis tampil di sini.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {top10BeverageItems.map((item, idx) => {
                  const primaryQty =
                    top10PeriodMode === 'day' ? item.todayQty : item.totalMonthQty;
                  const maxDrinkQty = Math.max(
                    1,
                    top10PeriodMode === 'day'
                      ? top10BeverageItems[0]?.todayQty || 1
                      : top10BeverageItems[0]?.totalMonthQty || 1
                  );
                  const totalGroupPool =
                    top10PeriodMode === 'day'
                      ? totalBeverageToday
                      : totalBeverageMonth;
                  const sharePct =
                    totalGroupPool > 0 ? (primaryQty / totalGroupPool) * 100 : 0;
                  const barWidth =
                    primaryQty > 0
                      ? Math.max(6, Math.round((primaryQty / maxDrinkQty) * 100))
                      : 0;
                  const catMeta = getCategoryMeta(item.categoryId);
                  const topCashier = getTopCashierForItem(item);

                  const rankBadgeClass =
                    idx === 0
                      ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 ring-2 ring-amber-300'
                      : idx === 1
                      ? 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-900 ring-1 ring-slate-300'
                      : idx === 2
                      ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white'
                      : 'bg-purple-100 text-purple-900';

                  return (
                    <div
                      key={item.key}
                      className="p-3 rounded-xl border border-purple-200/70 bg-white hover:border-purple-400 transition shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${rankBadgeClass}`}
                          >
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-black text-xs text-slate-900 truncate">
                              {item.name}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black ${catMeta.badgeBg} ${catMeta.badgeText}`}
                              >
                                {catMeta.shortLabel.replace('Minuman • ', '')}
                              </span>
                              {topCashier && (
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  &bull; Top Kasir:{' '}
                                  <strong className="text-slate-700">
                                    {topCashier.name} ({topCashier.qty})
                                  </strong>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-black font-mono text-purple-950">
                            {primaryQty.toLocaleString('id-ID')}{' '}
                            <span className="text-[10px] font-bold text-slate-500">
                              Cup
                            </span>
                          </div>
                          <div className="text-[10px] font-bold text-purple-700">
                            {sharePct.toFixed(1)}% dari Minuman
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar & Info Bulan/Hari */}
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="flex-1 h-2 rounded-full bg-purple-100/80 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#581c87] to-purple-500 transition-all duration-300"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-slate-500 shrink-0">
                          {top10PeriodMode === 'day'
                            ? `Bulan: ${item.totalMonthQty.toLocaleString('id-ID')}`
                            : `Tgl ${activeDay}: ${item.todayQty.toLocaleString('id-ID')}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* KARTU FILTER SUB-KATEGORI MAKANAN & MINUMAN                */}
      {/* ========================================================= */}
      <div className="space-y-4">
        {/* A. Kelompok Kategori Makanan */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center space-x-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
              <span>Kelompok Kategori Makanan ({totalFoodMonth.toLocaleString('id-ID')} Pcs/Box)</span>
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {foodCategorySummaries.map((s) => {
              const isSelected = selectedCategoryFilter === s.category.id;
              const pct =
                totalFoodMonth > 0
                  ? ((s.monthTotal / totalFoodMonth) * 100).toFixed(1)
                  : '0.0';

              return (
                <button
                  key={s.category.id}
                  type="button"
                  onClick={() =>
                    setSelectedCategoryFilter(
                      isSelected ? 'ALL_PRODUCTS' : s.category.id
                    )
                  }
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-900 text-white border-amber-600 shadow-md scale-[1.01]'
                      : `${s.category.cardBg} ${s.category.cardBorder} hover:brightness-98 bg-white`
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950'
                            : `${s.category.badgeBg} ${s.category.badgeText}`
                        }`}
                      >
                        {s.category.shortLabel.replace('Makanan • ', '')}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          isSelected ? 'text-amber-200' : 'text-slate-500'
                        }`}
                      >
                        {s.skuCount} SKU
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-baseline justify-between">
                      <div>
                        <span
                          className={`text-xl font-black ${
                            isSelected ? 'text-[#FACC15]' : 'text-slate-900'
                          }`}
                        >
                          {s.monthTotal.toLocaleString('id-ID')}
                        </span>
                        <span
                          className={`text-[10px] ml-1 font-bold ${
                            isSelected ? 'text-amber-200' : 'text-slate-500'
                          }`}
                        >
                          Pcs
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black ${
                          isSelected ? 'text-emerald-300' : 'text-amber-800'
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>
                  </div>

                  <div
                    className={`mt-2 pt-2 border-t text-[10px] flex items-center justify-between ${
                      isSelected
                        ? 'border-amber-800 text-amber-200'
                        : 'border-slate-200/70 text-slate-600'
                    }`}
                  >
                    <span>Tgl {activeDay}:</span>
                    <strong
                      className={isSelected ? 'text-white' : 'text-slate-900'}
                    >
                      {s.todayTotal.toLocaleString('id-ID')} Pcs
                    </strong>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* B. Kelompok Kategori Minuman */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center space-x-1.5">
              <CupSoda className="w-3.5 h-3.5 text-purple-700" />
              <span>Kelompok Kategori Minuman ({totalBeverageMonth.toLocaleString('id-ID')} Cup/Btl)</span>
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {beverageCategorySummaries.map((s) => {
              const isSelected = selectedCategoryFilter === s.category.id;
              const pct =
                totalBeverageMonth > 0
                  ? ((s.monthTotal / totalBeverageMonth) * 100).toFixed(1)
                  : '0.0';

              return (
                <button
                  key={s.category.id}
                  type="button"
                  onClick={() =>
                    setSelectedCategoryFilter(
                      isSelected ? 'ALL_PRODUCTS' : s.category.id
                    )
                  }
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#581c87] text-white border-amber-400 shadow-md scale-[1.01]'
                      : `${s.category.cardBg} ${s.category.cardBorder} hover:brightness-98 bg-white`
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md truncate ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950'
                            : `${s.category.badgeBg} ${s.category.badgeText}`
                        }`}
                      >
                        {s.category.shortLabel.replace('Minuman • ', '')}
                      </span>
                      <span
                        className={`text-[10px] font-bold shrink-0 ${
                          isSelected ? 'text-purple-200' : 'text-slate-500'
                        }`}
                      >
                        {s.skuCount} SKU
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-baseline justify-between">
                      <div>
                        <span
                          className={`text-xl font-black ${
                            isSelected ? 'text-[#FACC15]' : 'text-slate-900'
                          }`}
                        >
                          {s.monthTotal.toLocaleString('id-ID')}
                        </span>
                        <span
                          className={`text-[10px] ml-1 font-bold ${
                            isSelected ? 'text-purple-200' : 'text-slate-500'
                          }`}
                        >
                          Cup
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black ${
                          isSelected ? 'text-emerald-300' : 'text-purple-800'
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>
                  </div>

                  <div
                    className={`mt-2 pt-2 border-t text-[10px] flex items-center justify-between ${
                      isSelected
                        ? 'border-purple-700 text-purple-200'
                        : 'border-slate-200/70 text-slate-600'
                    }`}
                  >
                    <span>Tgl {activeDay}:</span>
                    <strong
                      className={isSelected ? 'text-white' : 'text-slate-900'}
                    >
                      {s.todayTotal.toLocaleString('id-ID')} Cup
                    </strong>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BAR FILTER KATEGORI & PENCARIAN NAMA ITEM                  */}
      {/* ========================================================= */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="w-4 h-4 text-purple-800 mr-1" />
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('ALL_PRODUCTS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              selectedCategoryFilter === 'ALL_PRODUCTS'
                ? 'bg-[#581c87] text-[#FACC15] shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-purple-50'
            }`}
          >
            Semua Produk ({totalAllProductsMonth.toLocaleString('id-ID')})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('ALL_FOODS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              selectedCategoryFilter === 'ALL_FOODS'
                ? 'bg-amber-500 text-slate-950 shadow-2xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
            }`}
          >
            🍿 Semua Makanan ({totalFoodMonth.toLocaleString('id-ID')})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('ALL_DRINKS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              selectedCategoryFilter === 'ALL_DRINKS'
                ? 'bg-purple-700 text-white shadow-2xs'
                : 'bg-purple-50 text-purple-900 hover:bg-purple-100'
            }`}
          >
            🥤 Semua Minuman ({totalBeverageMonth.toLocaleString('id-ID')})
          </button>
          {BEVERAGE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedCategoryFilter === cat.id
                  ? 'bg-[#581c87] text-[#FACC15] shadow-2xs font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-purple-50'
              }`}
            >
              {cat.shortLabel}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute inset-y-0 left-3 my-auto text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama produk makanan / minuman..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 outline-hidden focus:border-purple-500"
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* TABEL RINCIAN HARIAN (TGL 1 S/D 31) PRODUK PERKATEGORI     */}
      {/* ========================================================= */}
      <div className="rounded-3xl border border-purple-200/90 bg-white text-slate-800 shadow-md overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-[#581c87] to-[#4c1d95] text-white flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#FACC15]" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">
              Tabel Matriks Harian Produk Perkategori (Makanan &amp; Minuman) &bull;{' '}
              {selectedOutlet?.name} ({MONTH_NAMES[selectedMonth - 1]}{' '}
              {selectedYear})
            </h3>
          </div>
          <span className="text-[11px] text-purple-200 font-semibold">
            Tips: Anda dapat mengubah sub-kategori langsung pada kolom{' '}
            <strong className="text-[#FACC15]">KATEGORI PRODUK</strong>
          </span>
        </div>

        <div className="overflow-x-auto max-h-[72vh]">
          <table className="w-full text-[11px] text-center border-collapse">
            <thead className="sticky top-0 z-20 font-black uppercase tracking-wider border-b border-slate-200 bg-slate-100 text-slate-700">
              <tr>
                <th className="py-2.5 px-2 border-r border-slate-200 w-10">
                  NO
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-left min-w-[220px] sticky left-0 bg-slate-100 z-30">
                  NAMA ITEM PRODUK
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 text-left min-w-[195px] bg-slate-100">
                  KATEGORI PRODUK
                </th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                  (day) => {
                    const dateObj = new Date(
                      selectedYear,
                      selectedMonth - 1,
                      day
                    );
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
                  }
                )}
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
                      <ShoppingBag className="w-8 h-8 text-slate-300" />
                      <div className="max-w-md space-y-1">
                        <p className="font-bold text-slate-700">
                          Belum ada data rincian item produk pada periode ini.
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
                    <tr
                      className={`${group.category.headerBg} border-y border-slate-200`}
                    >
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
                            {group.monthSubtotal.toLocaleString('id-ID')}{' '}
                            {group.category.productGroup === 'makanan'
                              ? 'Pcs/Box'
                              : 'Cup/Btl'}
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
                            title="Ubah sub-kategori makanan/minuman produk ini"
                          >
                            <optgroup label="🍿 KATEGORI MAKANAN">
                              {BEVERAGE_CATEGORIES.filter(
                                (c) => c.productGroup === 'makanan'
                              ).map((catOpt) => (
                                <option key={catOpt.id} value={catOpt.id}>
                                  {catOpt.shortLabel}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="🥤 KATEGORI MINUMAN">
                              {BEVERAGE_CATEGORIES.filter(
                                (c) => c.productGroup === 'minuman'
                              ).map((catOpt) => (
                                <option key={catOpt.id} value={catOpt.id}>
                                  {catOpt.shortLabel}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </td>
                        {Array.from(
                          { length: daysInMonth },
                          (_, i) => i + 1
                        ).map((day) => {
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
                        })}
                        <td className="py-2 px-3 border-r border-slate-200 font-black font-mono tabular-nums text-amber-950 bg-amber-50/70">
                          {item.totalMonthQty.toLocaleString('id-ID')}
                        </td>
                        <td className="py-1.5 px-3 text-left text-[10px] text-slate-600">
                          {Object.entries(item.cashierBreakdown).length > 0 ? (
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              {Object.entries(item.cashierBreakdown).map(
                                ([cName, q]) => (
                                  <span key={cName}>
                                    <strong className="text-slate-800">
                                      {cName}:
                                    </strong>{' '}
                                    {q}
                                  </span>
                                )
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">
                              Belum terjual
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {/* Baris Subtotal Per Kategori */}
                    <tr className="bg-slate-100/90 font-black text-slate-800 border-b-2 border-slate-200">
                      <td
                        colSpan={3}
                        className="py-2 px-3 text-right uppercase text-[10px] border-r border-slate-200"
                      >
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
