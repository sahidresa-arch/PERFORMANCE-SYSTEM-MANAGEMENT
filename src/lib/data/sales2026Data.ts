import { DailySalesRecord } from '../../types';

// Outlet ID Map (Area Bogor 1 & Depok)
// NSR310-1201 CAFE LIVING WORLD KOTA WISATA CIBUBUR -> living-world-kota-wisata-xxi
// NSR222-1201 CAFE PESONA SQUARE XXI -> pesona-square-xxi
// NSR299-1201 CAFE MARGO CITY XXI -> margo-city-xxi
// NSR053-1201 CAFE METMALL CILENGSI XXI -> metmall-cileungsi-xxi
// NSR323-1201 CAFE CITYMALL CIMANGGIS XXI -> citymall-cimanggis-xxi
// NSR270-1201 CAFE Q SQUARE XXI - KAB.BOGOR -> q-square-xxi
// NSR058-1201 CAFE CIBINONG XXI -> cibinong-xxi
// NSR216-1201 CAFE The Park Sawangan XXI -> the-park-sawangan-xxi
// NSR263-1201 CAFE PLAZA JAMBU DUA BOGOR -> plaza-jambu-dua-xxi
// NSR213-1201 CAFE CIPLAZ DEPOK XXI -> depok-xxi
// NSR288-1201 CAFE CIPLAZ PARUNG XXI -> ciplaz-parung-xxi
// NSR299-1204 HS MARGO CITY XXI -> hs-margo-city-xxi
// NSR222-1202 PREMIERE PESONA SQUARE XXI -> premiere-pesona-square-xxi
// NSR299-1202 PREMIERE MARGO CITY XXI -> premiere-margo-city-xxi
//
// Outlet ID Map (Area Bogor 2)
// NSR-AEON CAFE AEON SENTUL XXI -> aeon-sentul-xxi
// NSR-BOTANI CAFE BOTANI XXI -> botani-xxi
// NSR-BGM CAFE BOGOR GREAT MALL XXI -> bogor-great-mall-xxi
// NSR-BOXIES CAFE BOXIES XXI -> boxies-xxi
// NSR-CIANJUR CAFE CITIMALL CIANJUR XXI -> citimall-cianjur-xxi
// NSR-BSQ CAFE BOGOR SQUARE XXI-RAMAYANA -> bogor-square-xxi
// NSR-BTM CAFE BTM XXI BOGOR -> btm-xxi
// NSR-TAJUR CAFE RAMAYANA TAJUR XXI -> ramayana-tajur-xxi
// NSR-AEON-HS HS AEON SENTUL XXI -> hs-aeon-sentul-xxi
// NSR-CIPANAS CAFE CIPLAZ CIPANAS XXI -> ciplaz-cipanas-xxi

interface RawSales2026Row {
  monthStr: string; // 'Jan-26', 'Feb-26', etc.
  date: string;     // '2026-01-31', etc.
  outletCode: string;
  lob: string;
  outletName: string;
  outletId: string;
  bill: number;
  penonton: number;
  omsetFnB: number;
  omsetCinema: number;
}

export const RAW_SALES_2026: RawSales2026Row[] = [
  // --- JANUARI 2026 (Jan-26 / 2026-01-31) ---
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR310-1201', lob: 'CAFE', outletName: 'LIVING WORLD KOTA WISATA CIBUBUR', outletId: 'living-world-kota-wisata-xxi', bill: 6848, penonton: 27247, omsetFnB: 1056287000, omsetCinema: 1378530000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR222-1201', lob: 'CAFE', outletName: 'PESONA SQUARE XXI', outletId: 'pesona-square-xxi', bill: 3943, penonton: 16815, omsetFnB: 460301000, omsetCinema: 687560000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR299-1201', lob: 'CAFE', outletName: 'MARGO CITY XXI', outletId: 'margo-city-xxi', bill: 9780, penonton: 35399, omsetFnB: 1199973000, omsetCinema: 1978690000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR053-1201', lob: 'CAFE', outletName: 'METMALL CILENGSI XXI', outletId: 'metmall-cileungsi-xxi', bill: 6577, penonton: 30653, omsetFnB: 706309000, omsetCinema: 1269950000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR323-1201', lob: 'CAFE', outletName: 'CITYMALL CIMANGGIS XXI', outletId: 'citymall-cimanggis-xxi', bill: 2849, penonton: 12919, omsetFnB: 242113000, omsetCinema: 465350000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR270-1201', lob: 'CAFE', outletName: 'Q SQUARE XXI - KAB.BOGOR', outletId: 'q-square-xxi', bill: 1788, penonton: 7440, omsetFnB: 139812000, omsetCinema: 270220000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR058-1201', lob: 'CAFE', outletName: 'CIBINONG XXI', outletId: 'cibinong-xxi', bill: 8677, penonton: 36115, omsetFnB: 986857000, omsetCinema: 2011075000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR216-1201', lob: 'CAFE', outletName: 'The Park Sawangan XXI', outletId: 'the-park-sawangan-xxi', bill: 5535, penonton: 24178, omsetFnB: 582140000, omsetCinema: 1205850000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR263-1201', lob: 'CAFE', outletName: 'PLAZA JAMBU DUA BOGOR', outletId: 'plaza-jambu-dua-xxi', bill: 4437, penonton: 22157, omsetFnB: 368891000, omsetCinema: 794110000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR213-1201', lob: 'CAFE', outletName: 'CIPLAZ DEPOK XXI', outletId: 'depok-xxi', bill: 5865, penonton: 27065, omsetFnB: 463625000, omsetCinema: 1116335000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR288-1201', lob: 'CAFE', outletName: 'CIPLAZ PARUNG XXI', outletId: 'ciplaz-parung-xxi', bill: 2817, penonton: 15564, omsetFnB: 255198000, omsetCinema: 638620000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR299-1204', lob: 'HS', outletName: 'MARGO CITY XXI', outletId: 'hs-margo-city-xxi', bill: 1224, penonton: 0, omsetFnB: 280098521, omsetCinema: 0 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR222-1202', lob: 'PREMIERE', outletName: 'PESONA SQUARE XXI', outletId: 'premiere-pesona-square-xxi', bill: 545, penonton: 1068, omsetFnB: 122867294, omsetCinema: 87200000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR299-1202', lob: 'PREMIERE', outletName: 'MARGO CITY XXI', outletId: 'premiere-margo-city-xxi', bill: 1175, penonton: 2305, omsetFnB: 210899778, omsetCinema: 184600000 },

  // --- FEBRUARI 2026 (Feb-26 / 2026-02-28) ---
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR310-1201', lob: 'CAFE', outletName: 'LIVING WORLD KOTA WISATA CIBUBUR', outletId: 'living-world-kota-wisata-xxi', bill: 2548, penonton: 9934, omsetFnB: 340315000, omsetCinema: 501840000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR222-1201', lob: 'CAFE', outletName: 'PESONA SQUARE XXI', outletId: 'pesona-square-xxi', bill: 1760, penonton: 7877, omsetFnB: 191883000, omsetCinema: 323070000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR053-1201', lob: 'CAFE', outletName: 'METMALL CILENGSI XXI', outletId: 'metmall-cileungsi-xxi', bill: 2402, penonton: 12159, omsetFnB: 276939000, omsetCinema: 500215000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR299-1201', lob: 'CAFE', outletName: 'MARGO CITY XXI', outletId: 'margo-city-xxi', bill: 3842, penonton: 13941, omsetFnB: 402773000, omsetCinema: 755085000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR270-1201', lob: 'CAFE', outletName: 'Q SQUARE XXI - KAB.BOGOR', outletId: 'q-square-xxi', bill: 728, penonton: 2901, omsetFnB: 54436000, omsetCinema: 104295000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR323-1201', lob: 'CAFE', outletName: 'CITYMALL CIMANGGIS XXI', outletId: 'citymall-cimanggis-xxi', bill: 1119, penonton: 5042, omsetFnB: 92019000, omsetCinema: 179730000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR216-1201', lob: 'CAFE', outletName: 'The Park Sawangan XXI', outletId: 'the-park-sawangan-xxi', bill: 2147, penonton: 9588, omsetFnB: 213324000, omsetCinema: 474175000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR058-1201', lob: 'CAFE', outletName: 'CIBINONG XXI', outletId: 'cibinong-xxi', bill: 3492, penonton: 15612, omsetFnB: 378652000, omsetCinema: 849980000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR263-1201', lob: 'CAFE', outletName: 'PLAZA JAMBU DUA BOGOR', outletId: 'plaza-jambu-dua-xxi', bill: 1495, penonton: 8305, omsetFnB: 117290000, omsetCinema: 292610000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR288-1201', lob: 'CAFE', outletName: 'CIPLAZ PARUNG XXI', outletId: 'ciplaz-parung-xxi', bill: 1174, penonton: 7073, omsetFnB: 110067000, omsetCinema: 287770000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR213-1201', lob: 'CAFE', outletName: 'CIPLAZ DEPOK XXI', outletId: 'depok-xxi', bill: 2065, penonton: 11004, omsetFnB: 150019000, omsetCinema: 443405000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR299-1204', lob: 'HS', outletName: 'MARGO CITY XXI', outletId: 'hs-margo-city-xxi', bill: 1105, penonton: 0, omsetFnB: 279630663, omsetCinema: 0 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR222-1202', lob: 'PREMIERE', outletName: 'PESONA SQUARE XXI', outletId: 'premiere-pesona-square-xxi', bill: 184, penonton: 319, omsetFnB: 38131752, omsetCinema: 25960000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR299-1202', lob: 'PREMIERE', outletName: 'MARGO CITY XXI', outletId: 'premiere-margo-city-xxi', bill: 489, penonton: 1173, omsetFnB: 84032578, omsetCinema: 92300000 },

  // --- MARET 2026 (Mar-26 / 2026-03-31) ---
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR310-1201', lob: 'CAFE', outletName: 'LIVING WORLD KOTA WISATA CIBUBUR', outletId: 'living-world-kota-wisata-xxi', bill: 5915, penonton: 29163, omsetFnB: 855621064, omsetCinema: 1459290000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR299-1201', lob: 'CAFE', outletName: 'MARGO CITY XXI', outletId: 'margo-city-xxi', bill: 10063, penonton: 38556, omsetFnB: 1214330000, omsetCinema: 2223150000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR222-1201', lob: 'CAFE', outletName: 'PESONA SQUARE XXI', outletId: 'pesona-square-xxi', bill: 4060, penonton: 22006, omsetFnB: 449689000, omsetCinema: 957260000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR270-1201', lob: 'CAFE', outletName: 'Q SQUARE XXI - KAB.BOGOR', outletId: 'q-square-xxi', bill: 2553, penonton: 11881, omsetFnB: 214772000, omsetCinema: 461730000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR323-1201', lob: 'CAFE', outletName: 'CITYMALL CIMANGGIS XXI', outletId: 'citymall-cimanggis-xxi', bill: 3531, penonton: 17978, omsetFnB: 310985000, omsetCinema: 693480000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR053-1201', lob: 'CAFE', outletName: 'METMALL CILENGSI XXI', outletId: 'metmall-cileungsi-xxi', bill: 6090, penonton: 42748, omsetFnB: 782659000, omsetCinema: 1871980000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR216-1201', lob: 'CAFE', outletName: 'The Park Sawangan XXI', outletId: 'the-park-sawangan-xxi', bill: 6046, penonton: 35022, omsetFnB: 695222000, omsetCinema: 1855585000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR058-1201', lob: 'CAFE', outletName: 'CIBINONG XXI', outletId: 'cibinong-xxi', bill: 10120, penonton: 52585, omsetFnB: 1143881000, omsetCinema: 3081380000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR213-1201', lob: 'CAFE', outletName: 'CIPLAZ DEPOK XXI', outletId: 'depok-xxi', bill: 6010, penonton: 37108, omsetFnB: 537000000, omsetCinema: 1618675000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR263-1201', lob: 'CAFE', outletName: 'PLAZA JAMBU DUA BOGOR', outletId: 'plaza-jambu-dua-xxi', bill: 4394, penonton: 29260, omsetFnB: 413044000, omsetCinema: 1253345000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR288-1201', lob: 'CAFE', outletName: 'CIPLAZ PARUNG XXI', outletId: 'ciplaz-parung-xxi', bill: 3523, penonton: 25811, omsetFnB: 367847000, omsetCinema: 1126910000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR299-1204', lob: 'HS', outletName: 'MARGO CITY XXI', outletId: 'hs-margo-city-xxi', bill: 1661, penonton: 0, omsetFnB: 482736166, omsetCinema: 0 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR222-1202', lob: 'PREMIERE', outletName: 'PESONA SQUARE XXI', outletId: 'premiere-pesona-square-xxi', bill: 352, penonton: 591, omsetFnB: 67736850, omsetCinema: 53360000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR299-1202', lob: 'PREMIERE', outletName: 'MARGO CITY XXI', outletId: 'premiere-margo-city-xxi', bill: 788, penonton: 2086, omsetFnB: 161281491, omsetCinema: 180720000 },

  // --- APRIL 2026 (Apr-26 / 2026-04-30) ---
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR310-1201', lob: 'CAFE', outletName: 'LIVING WORLD KOTA WISATA CIBUBUR', outletId: 'living-world-kota-wisata-xxi', bill: 8751, penonton: 33452, omsetFnB: 1176703000, omsetCinema: 1637305000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR222-1201', lob: 'CAFE', outletName: 'PESONA SQUARE XXI', outletId: 'pesona-square-xxi', bill: 5857, penonton: 24606, omsetFnB: 651979080, omsetCinema: 1005065000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR299-1201', lob: 'CAFE', outletName: 'MARGO CITY XXI', outletId: 'margo-city-xxi', bill: 15140, penonton: 54863, omsetFnB: 1651434616, omsetCinema: 2982410000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR323-1201', lob: 'CAFE', outletName: 'CITYMALL CIMANGGIS XXI', outletId: 'citymall-cimanggis-xxi', bill: 4869, penonton: 22199, omsetFnB: 411405400, omsetCinema: 779215000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR270-1201', lob: 'CAFE', outletName: 'Q SQUARE XXI - KAB.BOGOR', outletId: 'q-square-xxi', bill: 3169, penonton: 12751, omsetFnB: 238984000, omsetCinema: 456275000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR053-1201', lob: 'CAFE', outletName: 'METMALL CILENGSI XXI', outletId: 'metmall-cileungsi-xxi', bill: 7116, penonton: 37629, omsetFnB: 791820000, omsetCinema: 1546470000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR216-1201', lob: 'CAFE', outletName: 'The Park Sawangan XXI', outletId: 'the-park-sawangan-xxi', bill: 7589, penonton: 33587, omsetFnB: 803175080, omsetCinema: 1636545000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR058-1201', lob: 'CAFE', outletName: 'CIBINONG XXI', outletId: 'cibinong-xxi', bill: 11516, penonton: 48990, omsetFnB: 1284688000, omsetCinema: 2679585000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR288-1201', lob: 'CAFE', outletName: 'CIPLAZ PARUNG XXI', outletId: 'ciplaz-parung-xxi', bill: 3641, penonton: 20522, omsetFnB: 325037000, omsetCinema: 825860000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR213-1201', lob: 'CAFE', outletName: 'CIPLAZ DEPOK XXI', outletId: 'depok-xxi', bill: 6519, penonton: 31597, omsetFnB: 501967000, omsetCinema: 1282395000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR263-1201', lob: 'CAFE', outletName: 'PLAZA JAMBU DUA BOGOR', outletId: 'plaza-jambu-dua-xxi', bill: 5278, penonton: 28810, omsetFnB: 436030000, omsetCinema: 1159365000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR299-1204', lob: 'HS', outletName: 'MARGO CITY XXI', outletId: 'hs-margo-city-xxi', bill: 1790, penonton: 0, omsetFnB: 403402028, omsetCinema: 0 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR222-1202', lob: 'PREMIERE', outletName: 'PESONA SQUARE XXI', outletId: 'premiere-pesona-square-xxi', bill: 545, penonton: 1071, omsetFnB: 114658194, omsetCinema: 86480000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR299-1202', lob: 'PREMIERE', outletName: 'MARGO CITY XXI', outletId: 'premiere-margo-city-xxi', bill: 1316, penonton: 3282, omsetFnB: 249650805, omsetCinema: 253940000 },

  // --- MEI 2026 (May-26 / 2026-05-31) ---
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR310-1201', lob: 'CAFE', outletName: 'LIVING WORLD KOTA WISATA CIBUBUR', outletId: 'living-world-kota-wisata-xxi', bill: 8048, penonton: 28284, omsetFnB: 1097449100, omsetCinema: 1452830000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR222-1201', lob: 'CAFE', outletName: 'PESONA SQUARE XXI', outletId: 'pesona-square-xxi', bill: 4380, penonton: 18130, omsetFnB: 470117500, omsetCinema: 766340000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR299-1201', lob: 'CAFE', outletName: 'MARGO CITY XXI', outletId: 'margo-city-xxi', bill: 11731, penonton: 40026, omsetFnB: 1314729900, omsetCinema: 2270950000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR270-1201', lob: 'CAFE', outletName: 'Q SQUARE XXI - KAB.BOGOR', outletId: 'q-square-xxi', bill: 2414, penonton: 8796, omsetFnB: 187191000, omsetCinema: 327930000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR323-1201', lob: 'CAFE', outletName: 'CITYMALL CIMANGGIS XXI', outletId: 'citymall-cimanggis-xxi', bill: 3290, penonton: 13899, omsetFnB: 276832500, omsetCinema: 511090000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR053-1201', lob: 'CAFE', outletName: 'METMALL CILENGSI XXI', outletId: 'metmall-cileungsi-xxi', bill: 6014, penonton: 33227, omsetFnB: 709281180, omsetCinema: 1406655000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR216-1201', lob: 'CAFE', outletName: 'The Park Sawangan XXI', outletId: 'the-park-sawangan-xxi', bill: 6264, penonton: 25668, omsetFnB: 644154100, omsetCinema: 1313285000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR058-1201', lob: 'CAFE', outletName: 'CIBINONG XXI', outletId: 'cibinong-xxi', bill: 10560, penonton: 45081, omsetFnB: 1190362400, omsetCinema: 2549414000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR288-1201', lob: 'CAFE', outletName: 'CIPLAZ PARUNG XXI', outletId: 'ciplaz-parung-xxi', bill: 3028, penonton: 15356, omsetFnB: 271036000, omsetCinema: 640970000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR263-1201', lob: 'CAFE', outletName: 'PLAZA JAMBU DUA BOGOR', outletId: 'plaza-jambu-dua-xxi', bill: 4330, penonton: 21347, omsetFnB: 349789529, omsetCinema: 893635000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR213-1201', lob: 'CAFE', outletName: 'CIPLAZ DEPOK XXI', outletId: 'depok-xxi', bill: 6616, penonton: 30462, omsetFnB: 487272700, omsetCinema: 1281545000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR299-1204', lob: 'HS', outletName: 'MARGO CITY XXI', outletId: 'hs-margo-city-xxi', bill: 1881, penonton: 0, omsetFnB: 400144867, omsetCinema: 0 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR222-1202', lob: 'PREMIERE', outletName: 'PESONA SQUARE XXI', outletId: 'premiere-pesona-square-xxi', bill: 486, penonton: 963, omsetFnB: 103315810, omsetCinema: 82340000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR299-1202', lob: 'PREMIERE', outletName: 'MARGO CITY XXI', outletId: 'premiere-margo-city-xxi', bill: 1279, penonton: 2502, omsetFnB: 225118118, omsetCinema: 211140000 },

  // --- JUNI 2026 (Jun-26 / 2026-06-30) ---
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR310-1201', lob: 'CAFE', outletName: 'LIVING WORLD KOTA WISATA CIBUBUR', outletId: 'living-world-kota-wisata-xxi', bill: 10508, penonton: 37619, omsetFnB: 1415154984, omsetCinema: 1796955000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR222-1201', lob: 'CAFE', outletName: 'PESONA SQUARE XXI', outletId: 'pesona-square-xxi', bill: 5783, penonton: 23039, omsetFnB: 631637614, omsetCinema: 926230000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR299-1201', lob: 'CAFE', outletName: 'MARGO CITY XXI', outletId: 'margo-city-xxi', bill: 13139, penonton: 46009, omsetFnB: 1536966600, omsetCinema: 2452250000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR270-1201', lob: 'CAFE', outletName: 'Q SQUARE XXI - KAB.BOGOR', outletId: 'q-square-xxi', bill: 3070, penonton: 11251, omsetFnB: 245437200, omsetCinema: 393515000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR323-1201', lob: 'CAFE', outletName: 'CITYMALL CIMANGGIS XXI', outletId: 'citymall-cimanggis-xxi', bill: 4216, penonton: 18118, omsetFnB: 387243000, omsetCinema: 625310000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR053-1201', lob: 'CAFE', outletName: 'METMALL CILENGSI XXI', outletId: 'metmall-cileungsi-xxi', bill: 6902, penonton: 38821, omsetFnB: 833149600, omsetCinema: 1551170000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR216-1201', lob: 'CAFE', outletName: 'The Park Sawangan XXI', outletId: 'the-park-sawangan-xxi', bill: 8492, penonton: 34869, omsetFnB: 876351540, omsetCinema: 1656180000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR058-1201', lob: 'CAFE', outletName: 'CIBINONG XXI', outletId: 'cibinong-xxi', bill: 12947, penonton: 54706, omsetFnB: 1471904700, omsetCinema: 2923005000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR288-1201', lob: 'CAFE', outletName: 'CIPLAZ PARUNG XXI', outletId: 'ciplaz-parung-xxi', bill: 3914, penonton: 20605, omsetFnB: 342592000, omsetCinema: 811825000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR263-1201', lob: 'CAFE', outletName: 'PLAZA JAMBU DUA BOGOR', outletId: 'plaza-jambu-dua-xxi', bill: 4426, penonton: 22794, omsetFnB: 374036500, omsetCinema: 910785000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR213-1201', lob: 'CAFE', outletName: 'CIPLAZ DEPOK XXI', outletId: 'depok-xxi', bill: 8047, penonton: 36211, omsetFnB: 586080500, omsetCinema: 1433285000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR299-1204', lob: 'HS', outletName: 'MARGO CITY XXI', outletId: 'hs-margo-city-xxi', bill: 1569, penonton: 0, omsetFnB: 321843046, omsetCinema: 0 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR222-1202', lob: 'PREMIERE', outletName: 'PESONA SQUARE XXI', outletId: 'premiere-pesona-square-xxi', bill: 593, penonton: 1227, omsetFnB: 128311644, omsetCinema: 93460000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR299-1202', lob: 'PREMIERE', outletName: 'MARGO CITY XXI', outletId: 'premiere-margo-city-xxi', bill: 1767, penonton: 3868, omsetFnB: 321139407, omsetCinema: 292180000 },

  // ==========================================
  // AREA BOGOR 2 - 2026 (Januari s/d Juni 2026)
  // ==========================================

  // --- JANUARI 2026 (Jan-26 / 2026-01-31) ---
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR-AEON', lob: 'CAFE', outletName: 'AEON SENTUL XXI', outletId: 'aeon-sentul-xxi', bill: 7951, penonton: 27026, omsetFnB: 933786000, omsetCinema: 1327060000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR-BOTANI', lob: 'CAFE', outletName: 'BOTANI XXI', outletId: 'botani-xxi', bill: 7361, penonton: 30585, omsetFnB: 832054000, omsetCinema: 1573880000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR-BGM', lob: 'CAFE', outletName: 'BOGOR GREAT MALL XXI', outletId: 'bogor-great-mall-xxi', bill: 1600, penonton: 7802, omsetFnB: 146261000, omsetCinema: 280955000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR-BOXIES', lob: 'CAFE', outletName: 'BOXIES XXI', outletId: 'boxies-xxi', bill: 3235, penonton: 18364, omsetFnB: 288665000, omsetCinema: 602710000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR-CIANJUR', lob: 'CAFE', outletName: 'CITIMALL CIANJUR XXI', outletId: 'citimall-cianjur-xxi', bill: 3206, penonton: 16018, omsetFnB: 372791000, omsetCinema: 781425000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR-BSQ', lob: 'CAFE', outletName: 'BOGOR SQUARE XXI-RAMAYANA', outletId: 'bogor-square-xxi', bill: 2786, penonton: 12809, omsetFnB: 242286000, omsetCinema: 525115000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR-BTM', lob: 'CAFE', outletName: 'BTM XXI BOGOR', outletId: 'btm-xxi', bill: 7324, penonton: 37744, omsetFnB: 636822000, omsetCinema: 1538835000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR-TAJUR', lob: 'CAFE', outletName: 'RAMAYANA TAJUR XXI', outletId: 'ramayana-tajur-xxi', bill: 2655, penonton: 13306, omsetFnB: 166054000, omsetCinema: 402490000 },
  { monthStr: 'Jan-26', date: '2026-01-31', outletCode: 'NSR-AEON-HS', lob: 'HS', outletName: 'AEON SENTUL XXI', outletId: 'hs-aeon-sentul-xxi', bill: 990, penonton: 1730, omsetFnB: 219011752, omsetCinema: 189775000 },

  // --- FEBRUARI 2026 (Feb-26 / 2026-02-28) ---
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR-AEON', lob: 'CAFE', outletName: 'AEON SENTUL XXI', outletId: 'aeon-sentul-xxi', bill: 3050, penonton: 10257, omsetFnB: 319417000, omsetCinema: 496215000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR-BGM', lob: 'CAFE', outletName: 'BOGOR GREAT MALL XXI', outletId: 'bogor-great-mall-xxi', bill: 741, penonton: 3760, omsetFnB: 62230000, omsetCinema: 134915000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR-BOXIES', lob: 'CAFE', outletName: 'BOXIES XXI', outletId: 'boxies-xxi', bill: 1155, penonton: 6836, omsetFnB: 98768000, omsetCinema: 223095000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR-BOTANI', lob: 'CAFE', outletName: 'BOTANI XXI', outletId: 'botani-xxi', bill: 3115, penonton: 14077, omsetFnB: 317234000, omsetCinema: 726240000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR-CIANJUR', lob: 'CAFE', outletName: 'CITIMALL CIANJUR XXI', outletId: 'citimall-cianjur-xxi', bill: 1160, penonton: 6512, omsetFnB: 133429000, omsetCinema: 312945000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR-BTM', lob: 'CAFE', outletName: 'BTM XXI BOGOR', outletId: 'btm-xxi', bill: 3164, penonton: 16036, omsetFnB: 260005000, omsetCinema: 644660000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR-BSQ', lob: 'CAFE', outletName: 'BOGOR SQUARE XXI-RAMAYANA', outletId: 'bogor-square-xxi', bill: 1042, penonton: 5273, omsetFnB: 83528000, omsetCinema: 213820000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR-TAJUR', lob: 'CAFE', outletName: 'RAMAYANA TAJUR XXI', outletId: 'ramayana-tajur-xxi', bill: 991, penonton: 5501, omsetFnB: 59068000, omsetCinema: 162710000 },
  { monthStr: 'Feb-26', date: '2026-02-28', outletCode: 'NSR-AEON-HS', lob: 'HS', outletName: 'AEON SENTUL XXI', outletId: 'hs-aeon-sentul-xxi', bill: 489, penonton: 755, omsetFnB: 105012816, omsetCinema: 83300000 },

  // --- MARET 2026 (Mar-26 / 2026-03-31) ---
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR-AEON', lob: 'CAFE', outletName: 'AEON SENTUL XXI', outletId: 'aeon-sentul-xxi', bill: 7150, penonton: 31401, omsetFnB: 824726000, omsetCinema: 1541230000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR-BOTANI', lob: 'CAFE', outletName: 'BOTANI XXI', outletId: 'botani-xxi', bill: 7905, penonton: 37741, omsetFnB: 902638000, omsetCinema: 2129640000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR-BGM', lob: 'CAFE', outletName: 'BOGOR GREAT MALL XXI', outletId: 'bogor-great-mall-xxi', bill: 2880, penonton: 15582, omsetFnB: 229462000, omsetCinema: 601030000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR-BSQ', lob: 'CAFE', outletName: 'BOGOR SQUARE XXI-RAMAYANA', outletId: 'bogor-square-xxi', bill: 3378, penonton: 19821, omsetFnB: 309322000, omsetCinema: 865070000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR-CIANJUR', lob: 'CAFE', outletName: 'CITIMALL CIANJUR XXI', outletId: 'citimall-cianjur-xxi', bill: 3311, penonton: 22760, omsetFnB: 430050000, omsetCinema: 1209170000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR-BOXIES', lob: 'CAFE', outletName: 'BOXIES XXI', outletId: 'boxies-xxi', bill: 4384, penonton: 32167, omsetFnB: 385507000, omsetCinema: 1105600000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR-TAJUR', lob: 'CAFE', outletName: 'RAMAYANA TAJUR XXI', outletId: 'ramayana-tajur-xxi', bill: 2833, penonton: 19403, omsetFnB: 213423000, omsetCinema: 646590000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR-BTM', lob: 'CAFE', outletName: 'BTM XXI BOGOR', outletId: 'btm-xxi', bill: 7373, penonton: 45322, omsetFnB: 670410000, omsetCinema: 2124245000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR-AEON-HS', lob: 'HS', outletName: 'AEON SENTUL XXI', outletId: 'hs-aeon-sentul-xxi', bill: 708, penonton: 800, omsetFnB: 152222037, omsetCinema: 102200000 },
  { monthStr: 'Mar-26', date: '2026-03-31', outletCode: 'NSR-CIPANAS', lob: 'CAFE', outletName: 'CIPLAZ CIPANAS XXI', outletId: 'ciplaz-cipanas-xxi', bill: 3476, penonton: 18490, omsetFnB: 294616000, omsetCinema: 720465000 },

  // --- APRIL 2026 (Apr-26 / 2026-04-30) ---
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR-AEON', lob: 'CAFE', outletName: 'AEON SENTUL XXI', outletId: 'aeon-sentul-xxi', bill: 9624, penonton: 34406, omsetFnB: 1101503000, omsetCinema: 1668935000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR-CIPANAS', lob: 'CAFE', outletName: 'CIPLAZ CIPANAS XXI', outletId: 'ciplaz-cipanas-xxi', bill: 3384, penonton: 14773, omsetFnB: 255490000, omsetCinema: 515225000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR-BOTANI', lob: 'CAFE', outletName: 'BOTANI XXI', outletId: 'botani-xxi', bill: 9772, penonton: 44766, omsetFnB: 1095991000, omsetCinema: 2253040000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR-CIANJUR', lob: 'CAFE', outletName: 'CITIMALL CIANJUR XXI', outletId: 'citimall-cianjur-xxi', bill: 3732, penonton: 20436, omsetFnB: 445235000, omsetCinema: 973610000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR-BSQ', lob: 'CAFE', outletName: 'BOGOR SQUARE XXI-RAMAYANA', outletId: 'bogor-square-xxi', bill: 3512, penonton: 16338, omsetFnB: 292062000, omsetCinema: 663080000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR-BGM', lob: 'CAFE', outletName: 'BOGOR GREAT MALL XXI', outletId: 'bogor-great-mall-xxi', bill: 3276, penonton: 16788, omsetFnB: 259683000, omsetCinema: 590340000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR-BOXIES', lob: 'CAFE', outletName: 'BOXIES XXI', outletId: 'boxies-xxi', bill: 5593, penonton: 30181, omsetFnB: 410871000, omsetCinema: 985205000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR-TAJUR', lob: 'CAFE', outletName: 'RAMAYANA TAJUR XXI', outletId: 'ramayana-tajur-xxi', bill: 3200, penonton: 17865, omsetFnB: 199055750, omsetCinema: 511597000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR-BTM', lob: 'CAFE', outletName: 'BTM XXI BOGOR', outletId: 'btm-xxi', bill: 8203, penonton: 43979, omsetFnB: 714403000, omsetCinema: 1882770000 },
  { monthStr: 'Apr-26', date: '2026-04-30', outletCode: 'NSR-AEON-HS', lob: 'HS', outletName: 'AEON SENTUL XXI', outletId: 'hs-aeon-sentul-xxi', bill: 1138, penonton: 1804, omsetFnB: 238634910, omsetCinema: 199640000 },

  // --- MEI 2026 (May-26 / 2026-05-31) ---
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR-AEON', lob: 'CAFE', outletName: 'AEON SENTUL XXI', outletId: 'aeon-sentul-xxi', bill: 8608, penonton: 29530, omsetFnB: 987120300, omsetCinema: 1457550000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR-CIPANAS', lob: 'CAFE', outletName: 'CIPLAZ CIPANAS XXI', outletId: 'ciplaz-cipanas-xxi', bill: 2921, penonton: 10588, omsetFnB: 219605600, omsetCinema: 386635000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR-BOTANI', lob: 'CAFE', outletName: 'BOTANI XXI', outletId: 'botani-xxi', bill: 8904, penonton: 38792, omsetFnB: 988369400, omsetCinema: 2082140000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR-CIANJUR', lob: 'CAFE', outletName: 'CITIMALL CIANJUR XXI', outletId: 'citimall-cianjur-xxi', bill: 3580, penonton: 18606, omsetFnB: 439218600, omsetCinema: 932080000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR-BOXIES', lob: 'CAFE', outletName: 'BOXIES XXI', outletId: 'boxies-xxi', bill: 4246, penonton: 21485, omsetFnB: 337410000, omsetCinema: 719045000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR-BGM', lob: 'CAFE', outletName: 'BOGOR GREAT MALL XXI', outletId: 'bogor-great-mall-xxi', bill: 2251, penonton: 10827, omsetFnB: 183394383, omsetCinema: 396635000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR-BSQ', lob: 'CAFE', outletName: 'BOGOR SQUARE XXI-RAMAYANA', outletId: 'bogor-square-xxi', bill: 3078, penonton: 13798, omsetFnB: 253101084, omsetCinema: 577350000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR-BTM', lob: 'CAFE', outletName: 'BTM XXI BOGOR', outletId: 'btm-xxi', bill: 7906, penonton: 37422, omsetFnB: 687105538, omsetCinema: 1689910000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR-TAJUR', lob: 'CAFE', outletName: 'RAMAYANA TAJUR XXI', outletId: 'ramayana-tajur-xxi', bill: 2630, penonton: 13986, omsetFnB: 171278000, omsetCinema: 435930000 },
  { monthStr: 'May-26', date: '2026-05-31', outletCode: 'NSR-AEON-HS', lob: 'HS', outletName: 'AEON SENTUL XXI', outletId: 'hs-aeon-sentul-xxi', bill: 1058, penonton: 1387, omsetFnB: 212814398, omsetCinema: 162525000 },

  // --- JUNI 2026 (Jun-26 / 2026-06-30) ---
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR-AEON', lob: 'CAFE', outletName: 'AEON SENTUL XXI', outletId: 'aeon-sentul-xxi', bill: 9952, penonton: 33893, omsetFnB: 1152924200, omsetCinema: 1604075000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR-CIPANAS', lob: 'CAFE', outletName: 'CIPLAZ CIPANAS XXI', outletId: 'ciplaz-cipanas-xxi', bill: 2877, penonton: 11212, omsetFnB: 231927500, omsetCinema: 386405000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR-CIANJUR', lob: 'CAFE', outletName: 'CITIMALL CIANJUR XXI', outletId: 'citimall-cianjur-xxi', bill: 4222, penonton: 19730, omsetFnB: 487303000, omsetCinema: 917275000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR-BOTANI', lob: 'CAFE', outletName: 'BOTANI XXI', outletId: 'botani-xxi', bill: 9505, penonton: 41613, omsetFnB: 1082887700, omsetCinema: 2047090000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR-BSQ', lob: 'CAFE', outletName: 'BOGOR SQUARE XXI-RAMAYANA', outletId: 'bogor-square-xxi', bill: 4002, penonton: 16250, omsetFnB: 343913010, omsetCinema: 653250000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR-BGM', lob: 'CAFE', outletName: 'BOGOR GREAT MALL XXI', outletId: 'bogor-great-mall-xxi', bill: 2776, penonton: 12822, omsetFnB: 232485000, omsetCinema: 445080000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR-BOXIES', lob: 'CAFE', outletName: 'BOXIES XXI', outletId: 'boxies-xxi', bill: 4189, penonton: 21743, omsetFnB: 358498000, omsetCinema: 702505000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR-TAJUR', lob: 'CAFE', outletName: 'RAMAYANA TAJUR XXI', outletId: 'ramayana-tajur-xxi', bill: 2923, penonton: 13536, omsetFnB: 189096000, omsetCinema: 397174000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR-BTM', lob: 'CAFE', outletName: 'BTM XXI BOGOR', outletId: 'btm-xxi', bill: 7979, penonton: 39086, omsetFnB: 705835000, omsetCinema: 1631575000 },
  { monthStr: 'Jun-26', date: '2026-06-30', outletCode: 'NSR-AEON-HS', lob: 'HS', outletName: 'AEON SENTUL XXI', outletId: 'hs-aeon-sentul-xxi', bill: 1249, penonton: 2130, omsetFnB: 280551578, omsetCinema: 219144248 },

  // ==========================================
  // PERIODE JULI, AGUSTUS, SEPTEMBER 2026
  // ==========================================

  // --- JULI 2026 (Jul-26 / 2026-07-31) ---
  { monthStr: 'Jul-26', date: '2026-07-31', outletCode: 'NSR216-1201', lob: 'CAFE', outletName: 'The Park Sawangan XXI', outletId: 'the-park-sawangan-xxi', bill: 8312, penonton: 32937, omsetFnB: 928199000, omsetCinema: 1539715000 },
  { monthStr: 'Jul-26', date: '2026-07-31', outletCode: 'NSR-AEON', lob: 'CAFE', outletName: 'AEON SENTUL XXI', outletId: 'aeon-sentul-xxi', bill: 13799, penonton: 44791, omsetFnB: 1641879195, omsetCinema: 2125105000 },
  { monthStr: 'Jul-26', date: '2026-07-31', outletCode: 'NSR-AEON-HS', lob: 'HS', outletName: 'AEON SENTUL XXI', outletId: 'hs-aeon-sentul-xxi', bill: 1779, penonton: 3021, omsetFnB: 361041450, omsetCinema: 294575000 },

  // --- AGUSTUS 2026 (Aug-26 / 2026-08-31) ---
  { monthStr: 'Aug-26', date: '2026-08-31', outletCode: 'NSR216-1201', lob: 'CAFE', outletName: 'The Park Sawangan XXI', outletId: 'the-park-sawangan-xxi', bill: 8444, penonton: 31509, omsetFnB: 912729000, omsetCinema: 1579030000 },
  { monthStr: 'Aug-26', date: '2026-08-31', outletCode: 'NSR-AEON', lob: 'CAFE', outletName: 'AEON SENTUL XXI', outletId: 'aeon-sentul-xxi', bill: 13166, penonton: 43558, omsetFnB: 1590173800, omsetCinema: 2136015000 },
  { monthStr: 'Aug-26', date: '2026-08-31', outletCode: 'NSR-AEON-HS', lob: 'HS', outletName: 'AEON SENTUL XXI', outletId: 'hs-aeon-sentul-xxi', bill: 1926, penonton: 3236, omsetFnB: 392870940, omsetCinema: 352450000 },

  // --- SEPTEMBER 2026 (Sep-26 / 2026-09-30) ---
  { monthStr: 'Sep-26', date: '2026-09-30', outletCode: 'NSR216-1201', lob: 'CAFE', outletName: 'The Park Sawangan XXI', outletId: 'the-park-sawangan-xxi', bill: 4762, penonton: 18916, omsetFnB: 491918184, omsetCinema: 901230000 },
  { monthStr: 'Sep-26', date: '2026-09-30', outletCode: 'NSR-AEON', lob: 'CAFE', outletName: 'AEON SENTUL XXI', outletId: 'aeon-sentul-xxi', bill: 6889, penonton: 22223, omsetFnB: 751981800, omsetCinema: 1059930000 },
  { monthStr: 'Sep-26', date: '2026-09-30', outletCode: 'NSR-AEON-HS', lob: 'HS', outletName: 'AEON SENTUL XXI', outletId: 'hs-aeon-sentul-xxi', bill: 983, penonton: 1477, omsetFnB: 214288306, omsetCinema: 146830000 },

  // --- OKTOBER 2026 (Daily: 01 - 09 Oktober 2026) ---
  // The Park Sawangan XXI (CAFE)
  { monthStr: 'Oct-26', date: '2026-10-01', outletCode: 'NSR216-1201', lob: 'CAFE', outletName: 'The Park Sawangan XXI', outletId: 'the-park-sawangan-xxi', bill: 113, penonton: 602, omsetFnB: 12003000, omsetCinema: 24080000 },
  { monthStr: 'Oct-26', date: '2026-10-02', outletCode: 'NSR216-1201', lob: 'CAFE', outletName: 'The Park Sawangan XXI', outletId: 'the-park-sawangan-xxi', bill: 163, penonton: 577, omsetFnB: 14824000, omsetCinema: 28850000 },
  { monthStr: 'Oct-26', date: '2026-10-03', outletCode: 'NSR216-1201', lob: 'CAFE', outletName: 'The Park Sawangan XXI', outletId: 'the-park-sawangan-xxi', bill: 113, penonton: 1200, omsetFnB: 33881000, omsetCinema: 66000000 },
  { monthStr: 'Oct-26', date: '2026-10-04', outletCode: 'NSR216-1201', lob: 'CAFE', outletName: 'The Park Sawangan XXI', outletId: 'the-park-sawangan-xxi', bill: 279, penonton: 1036, omsetFnB: 31727000, omsetCinema: 56980000 },
  { monthStr: 'Oct-26', date: '2026-10-05', outletCode: 'NSR216-1201', lob: 'CAFE', outletName: 'The Park Sawangan XXI', outletId: 'the-park-sawangan-xxi', bill: 97, penonton: 483, omsetFnB: 9039000, omsetCinema: 19320000 },
  { monthStr: 'Oct-26', date: '2026-10-06', outletCode: 'NSR216-1201', lob: 'CAFE', outletName: 'The Park Sawangan XXI', outletId: 'the-park-sawangan-xxi', bill: 87, penonton: 387, omsetFnB: 7812000, omsetCinema: 15480000 },
  { monthStr: 'Oct-26', date: '2026-10-07', outletCode: 'NSR216-1201', lob: 'CAFE', outletName: 'The Park Sawangan XXI', outletId: 'the-park-sawangan-xxi', bill: 65, penonton: 301, omsetFnB: 6308000, omsetCinema: 12040000 },
  { monthStr: 'Oct-26', date: '2026-10-08', outletCode: 'NSR216-1201', lob: 'CAFE', outletName: 'The Park Sawangan XXI', outletId: 'the-park-sawangan-xxi', bill: 88, penonton: 415, omsetFnB: 9852000, omsetCinema: 16600000 },
  { monthStr: 'Oct-26', date: '2026-10-09', outletCode: 'NSR216-1201', lob: 'CAFE', outletName: 'The Park Sawangan XXI', outletId: 'the-park-sawangan-xxi', bill: 109, penonton: 509, omsetFnB: 9674000, omsetCinema: 25450000 },

  // HS AEON Sentul XXI (HS)
  { monthStr: 'Oct-26', date: '2026-10-01', outletCode: 'NSR-AEON-HS', lob: 'HS', outletName: 'AEON SENTUL XXI', outletId: 'hs-aeon-sentul-xxi', bill: 28, penonton: 40, omsetFnB: 4012470, omsetCinema: 3000000 },
  { monthStr: 'Oct-26', date: '2026-10-02', outletCode: 'NSR-AEON-HS', lob: 'HS', outletName: 'AEON SENTUL XXI', outletId: 'hs-aeon-sentul-xxi', bill: 25, penonton: 37, omsetFnB: 4453680, omsetCinema: 3700000 },
  { monthStr: 'Oct-26', date: '2026-10-03', outletCode: 'NSR-AEON-HS', lob: 'HS', outletName: 'AEON SENTUL XXI', outletId: 'hs-aeon-sentul-xxi', bill: 65, penonton: 83, omsetFnB: 13819575, omsetCinema: 12450000 },
  { monthStr: 'Oct-26', date: '2026-10-04', outletCode: 'NSR-AEON-HS', lob: 'HS', outletName: 'AEON SENTUL XXI', outletId: 'hs-aeon-sentul-xxi', bill: 62, penonton: 62, omsetFnB: 13493865, omsetCinema: 9300000 },
  { monthStr: 'Oct-26', date: '2026-10-05', outletCode: 'NSR-AEON-HS', lob: 'HS', outletName: 'AEON SENTUL XXI', outletId: 'hs-aeon-sentul-xxi', bill: 15, penonton: 12, omsetFnB: 2678445, omsetCinema: 900000 },
  { monthStr: 'Oct-26', date: '2026-10-06', outletCode: 'NSR-AEON-HS', lob: 'HS', outletName: 'AEON SENTUL XXI', outletId: 'hs-aeon-sentul-xxi', bill: 21, penonton: 48, omsetFnB: 3998610, omsetCinema: 3600000 },
  { monthStr: 'Oct-26', date: '2026-10-07', outletCode: 'NSR-AEON-HS', lob: 'HS', outletName: 'AEON SENTUL XXI', outletId: 'hs-aeon-sentul-xxi', bill: 25, penonton: 24, omsetFnB: 4039035, omsetCinema: 1800000 },
  { monthStr: 'Oct-26', date: '2026-10-08', outletCode: 'NSR-AEON-HS', lob: 'HS', outletName: 'AEON SENTUL XXI', outletId: 'hs-aeon-sentul-xxi', bill: 23, penonton: 49, omsetFnB: 3685605, omsetCinema: 3675000 },
  { monthStr: 'Oct-26', date: '2026-10-09', outletCode: 'NSR-AEON-HS', lob: 'HS', outletName: 'AEON SENTUL XXI', outletId: 'hs-aeon-sentul-xxi', bill: 24, penonton: 28, omsetFnB: 4889115, omsetCinema: 2800000 },

  // Café Aeon Sentul XXI (CAFE)
  { monthStr: 'Oct-26', date: '2026-10-01', outletCode: 'NSR-AEON', lob: 'CAFE', outletName: 'AEON SENTUL XXI', outletId: 'aeon-sentul-xxi', bill: 151, penonton: 446, omsetFnB: 15241000, omsetCinema: 18305000 },
  { monthStr: 'Oct-26', date: '2026-10-02', outletCode: 'NSR-AEON', lob: 'CAFE', outletName: 'AEON SENTUL XXI', outletId: 'aeon-sentul-xxi', bill: 175, penonton: 719, omsetFnB: 23692000, omsetCinema: 32675000 },
  { monthStr: 'Oct-26', date: '2026-10-03', outletCode: 'NSR-AEON', lob: 'CAFE', outletName: 'AEON SENTUL XXI', outletId: 'aeon-sentul-xxi', bill: 523, penonton: 1547, omsetFnB: 59607000, omsetCinema: 79350000 },
  { monthStr: 'Oct-26', date: '2026-10-04', outletCode: 'NSR-AEON', lob: 'CAFE', outletName: 'AEON SENTUL XXI', outletId: 'aeon-sentul-xxi', bill: 389, penonton: 1135, omsetFnB: 44228000, omsetCinema: 57670000 },
  { monthStr: 'Oct-26', date: '2026-10-05', outletCode: 'NSR-AEON', lob: 'CAFE', outletName: 'AEON SENTUL XXI', outletId: 'aeon-sentul-xxi', bill: 103, penonton: 330, omsetFnB: 10810000, omsetCinema: 13350000 },
  { monthStr: 'Oct-26', date: '2026-10-06', outletCode: 'NSR-AEON', lob: 'CAFE', outletName: 'AEON SENTUL XXI', outletId: 'aeon-sentul-xxi', bill: 99, penonton: 272, omsetFnB: 8676000, omsetCinema: 11010000 },
  { monthStr: 'Oct-26', date: '2026-10-07', outletCode: 'NSR-AEON', lob: 'CAFE', outletName: 'AEON SENTUL XXI', outletId: 'aeon-sentul-xxi', bill: 113, penonton: 357, omsetFnB: 11501000, omsetCinema: 14475000 },
  { monthStr: 'Oct-26', date: '2026-10-08', outletCode: 'NSR-AEON', lob: 'CAFE', outletName: 'AEON SENTUL XXI', outletId: 'aeon-sentul-xxi', bill: 130, penonton: 377, omsetFnB: 12041000, omsetCinema: 15080000 },
  { monthStr: 'Oct-26', date: '2026-10-09', outletCode: 'NSR-AEON', lob: 'CAFE', outletName: 'AEON SENTUL XXI', outletId: 'aeon-sentul-xxi', bill: 154, penonton: 555, omsetFnB: 16223000, omsetCinema: 24975000 },
];

export const MIGRATED_SALES_2026: DailySalesRecord[] = RAW_SALES_2026.map((row) => ({
  id: `sales-${row.outletId}-${row.date}`,
  outletId: row.outletId,
  date: row.date,
  isMigrated: true,
  shows: [
    { showNumber: 1, omsetCinema: 0, omsetFnB: 0, bill: 0, penonton: 0, isFilled: false },
    { showNumber: 2, omsetCinema: 0, omsetFnB: 0, bill: 0, penonton: 0, isFilled: false },
    { showNumber: 3, omsetCinema: 0, omsetFnB: 0, bill: 0, penonton: 0, isFilled: false },
    { showNumber: 4, omsetCinema: 0, omsetFnB: 0, bill: 0, penonton: 0, isFilled: false },
    {
      showNumber: 5,
      omsetCinema: row.omsetCinema,
      omsetFnB: row.omsetFnB,
      bill: row.bill,
      penonton: row.penonton,
      isFilled: true,
    },
  ],
}));
