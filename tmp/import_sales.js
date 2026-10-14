const { createClient } = require('@supabase/supabase-js');

const rawData = [
  { date: '2026-10-01', bill: 10, penonton: 12, fnb: 2240700, cin: 720000 },
  { date: '2026-10-02', bill: 4, penonton: 5, fnb: 828135, cin: 400000 },
  { date: '2026-10-03', bill: 25, penonton: 55, fnb: 7170502, cin: 5500000 },
  { date: '2026-10-04', bill: 24, penonton: 48, fnb: 7534065, cin: 4800000 },
  { date: '2026-10-05', bill: 11, penonton: 22, fnb: 2758140, cin: 1320000 },
  { date: '2026-10-06', bill: 4, penonton: 12, fnb: 650265, cin: 720000 },
  { date: '2026-10-07', bill: 12, penonton: 15, fnb: 2275928, cin: 900000 },
  { date: '2026-10-08', bill: 4, penonton: 4, fnb: 664125, cin: 240000 },
  { date: '2026-10-09', bill: 7, penonton: 8, fnb: 851235, cin: 640000 },
  { date: '2026-10-10', bill: 24, penonton: 23, fnb: 5937855, cin: 2300000 },
  { date: '2026-10-11', bill: 13, penonton: 18, fnb: 4371623, cin: 1800000 },
  { date: '2026-10-12', bill: 3, penonton: 6, fnb: 422730, cin: 360000 },
  { date: '2026-10-13', bill: 5, penonton: 13, fnb: 792330, cin: 780000 },
  { date: '2026-10-14', bill: 7, penonton: 6, fnb: 1226610, cin: 360000 }
];

const outletId = 'premiere-pesona-square-xxi';

async function run() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Supabase env missing');
    return;
  }
  const sb = createClient(url, key);

  for (const row of rawData) {
    const recordId = `${outletId}_${row.date}`;
    const shows = [1, 2, 3, 4, 5].map(sNum => ({
      showNumber: sNum,
      omsetCinema: sNum === 5 ? row.cin : 0,
      omsetFnB: sNum === 5 ? row.fnb : 0,
      bill: sNum === 5 ? row.bill : 0,
      penonton: sNum === 5 ? row.penonton : 0,
      isFilled: sNum === 5,
      isLocked: sNum === 5
    }));

    const payload = {
      id: recordId,
      outlet_id: outletId,
      date: row.date,
      shows: shows,
      notes: 'Imported via OCR Chat Assistant'
    };

    const { error } = await sb.from('cinema_sales').upsert(payload);
    if (error) {
      console.error(`Error upserting ${row.date}:`, error.message);
    } else {
      console.log(`Successfully imported ${row.date} for Show 5`);
    }
  }
}

run();
