const DAILY_POSITIVE_MESSAGES: string[] = [
  'semoga kalian sehat selalu.',
  'semangat melayani penonton dengan senyum terbaik hari ini!',
  'semoga setiap show hari ini berjalan lancar, ramai, dan penuh berkah.',
  'tetap kompak dan saling dukung ya tim, kerja hebat selalu membawa hasil baik!',
  'hari baru, semangat baru! Semoga target hari ini tercapai dengan gemilang.',
  'jaga kesehatan dan tetap ceria selama bertugas hari ini ya!',
  'terima kasih atas kerja keras kalian setiap hari, terus berikan yang terbaik!',
  'semoga rezeki dan kebahagiaan selalu menyertai seluruh tim hari ini.',
  'langkah kecil yang konsisten hari ini akan menjadi prestasi besar esok hari.',
  'tetap tenang, fokus, dan nikmati setiap proses kerja bersama tim hebatmu.',
  'senyum tulus kalian adalah kebahagiaan pertama bagi setiap pengunjung bioskop.',
  'semoga hari ini penuh energi positif dan kelancaran di semua area outlet.',
  'kebersamaan tim adalah kekuatan terbesar kita—sukses selalu untuk hari ini!',
  'jangan lupa minum air yang cukup dan tetap semangat melayani pengunjung!',
  'jadikan hari ini lebih baik dari kemarin dengan pelayanan yang sepenuh hati.',
  'semoga hari ini membawa banyak kabar baik, tawa, dan pencapaian luar biasa.',
  'tetap optimis dan percaya diri, kalian semua luar biasa!',
  'kerja keras yang ikhlas akan selalu berbuah manis pada waktunya.',
  'mulai hari dengan rasa syukur, jalani dengan semangat, akhiri dengan bangga.',
  'tetap solid, saling menguatkan, dan raih target terbaik hari ini!',
  'setiap tantangan adalah peluang untuk tim kita tumbuh semakin kuat.',
  'semoga suasana kerja hari ini selalu hangat, aman, dan menyenangkan.',
  'terus jaga kualitas dan keramahan, kalian kebanggaan Cinema XXI!',
  'semangat pagi hingga tutup show nanti, tetap fit dan penuh sukacita!',
];

/**
 * Menghasilkan kalimat positif otomatis yang berganti setiap hari berdasarkan tanggal YYYY-MM-DD.
 */
export function getDailyPositiveMessage(dateStr: string): string {
  const cleanDate = (dateStr || '').trim() || new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < cleanDate.length; i += 1) {
    hash = (hash * 31 + cleanDate.charCodeAt(i)) >>> 0;
  }
  const index = hash % DAILY_POSITIVE_MESSAGES.length;
  return DAILY_POSITIVE_MESSAGES[index];
}

// Daftar kata kotor, umpatan, makian, dan kata kasar/asusila (ID & EN)
// Kata motivasi umum seperti "menyerah", "gagal", "malas", dll. TIDAK diblokir agar kalimat positif seperti "jangan menyerah" tetap diperbolehkan.
const NEGATIVE_KEYWORDS: string[] = [
  // Kata kotor, umpatan & makian Indonesia / daerah
  'anjing',
  'anjir',
  'anjay',
  'anjrit',
  'njing',
  'njir',
  'asu',
  'babi',
  'bangsat',
  'bgst',
  'bajingan',
  'brengsek',
  'kampret',
  'keparat',
  'kontol',
  'kntl',
  'memek',
  'mmk',
  'ngentot',
  'entot',
  'ngewe',
  'jancok',
  'jancuk',
  'dancok',
  'dancuk',
  'goblok',
  'gblk',
  'tolol',
  'tll',
  'bego',
  'idiot',
  'dungu',
  'sialan',
  'setan',
  'laknat',
  'mampus',
  'modar',
  'taik',
  'tahi',
  'bacot',
  'bcot',
  'cocot',
  'congor',
  'kimak',
  'puki',
  'pukimak',
  'pantek',
  'sundal',
  'lonte',
  'pelacur',
  'pecun',
  'bencong',
  'banci',
  'pepek',
  'titit',
  'jembut',
  'colmek',
  'coli',
  'bokep',
  'bunuh diri',
  // Kata kotor / profanity Inggris
  'fuck',
  'fucking',
  'fucker',
  'motherfucker',
  'shit',
  'bullshit',
  'bitch',
  'asshole',
  'bastard',
  'dick',
  'cock',
  'pussy',
  'cunt',
  'slut',
  'whore',
  'moron',
];

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface NegativeCheckResult {
  isNegative: boolean;
  matchedWords: string[];
}

/**
 * Memeriksa apakah teks mengandung kata kotor, makian, atau umpatan kasar.
 */
export function detectNegativeWords(text: string): NegativeCheckResult {
  const raw = (text || '').trim().toLowerCase();
  if (!raw) {
    return { isNegative: false, matchedWords: [] };
  }

  // Normalisasi angka pengganti huruf umum (misal 4njing, b4bi, g0blok, t0lol)
  const leetNormalized = raw
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's');

  // Hilangkan pengulangan huruf berlebihan (misal "anjinggg" -> "anjing", "goblokkk" -> "goblok")
  const collapsedRepeats = leetNormalized.replace(/(.)\1{2,}/g, '$1');

  const variants = Array.from(new Set([raw, leetNormalized, collapsedRepeats]));
  const matchedSet = new Set<string>();

  for (const keyword of NEGATIVE_KEYWORDS) {
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword)}($|[^a-z0-9])`, 'i');
    for (const variant of variants) {
      if (pattern.test(variant)) {
        matchedSet.add(keyword);
        break;
      }
    }
  }

  return {
    isNegative: matchedSet.size > 0,
    matchedWords: Array.from(matchedSet),
  };
}
