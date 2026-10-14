const { createClient } = require('@supabase/supabase-js');

const rawData = [
  { date: '2026-10-01', bill: 174, penonton: 558, fnb: 21218000, cin: 21165000 },
  { date: '2026-10-02', bill: 190, penonton: 672, fnb: 26916000, cin: 33860000 },
  { date: '2026-10-03', bill: 377, penonton: 1370, fnb: 56212000, cin: 77150000 },
  { date: '2026-10-04', bill: 288, penonton: 1085, fnb: 40733000, cin: 61290000 },
  { date: '2026-10-05', bill: 111, penonton: 488, fnb: 14194000, cin: 19675000 },
  { date: '2026-10-06', bill: 81, penonton: 297, fnb: 10842000, cin: 11590000 },
  { date: '2026-10-07', bill: 124, penonton: 431, fnb: 14996000, cin: 15935000 },
  { date: '2026-10-08', bill: 136, penonton: 582, fnb: 15460000, cin: 21370000 },
  { date: '2026-10-09', bill: 206, penonton: 786, fnb: 23158000, cin: 33360000 },
  { date: '2026-10-10', bill: 391, penonton: 1408, fnb: 49696000, cin: 71700000 },
  { date: '2026-10-11', bill: 316, penonton: 1183, fnb: 43151000, cin: 63450000 },
  { date: '2026-10-12', bill: 103, penonton: 419, fnb: 12959000, cin: 15985000 },
  { date: '2026-10-13', bill: 92, penonton: 371, fnb: 13150000, cin: 14785000 },
  { date: '2026-10-14', bill: 106, penonton: 432, fnb: 13449000, cin: 17065000 }
];

const outletId = 'living-world-kota-wisata-xxi';

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
      shows: shows
    };

    const { error } = await sb.from('cinema_sales').upsert(payload);
    if (error) {
      console.error(`Error upserting ${row.date}:`, error.message);
    } else {
      console.log(`Successfully imported Living World ${row.date} for Show 5`);
    }
  }
}

run();
