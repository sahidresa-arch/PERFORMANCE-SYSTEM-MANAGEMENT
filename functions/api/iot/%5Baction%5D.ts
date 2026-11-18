/**
 * Cloudflare Pages Functions — IoT Suhu & Kelembaban Telemetry Endpoint (/api/iot/:action)
 * Menerima HTTP POST JSON dari ESP32 / perangkat sensor dan menyimpannya ke shared Edge Store.
 */

interface SyncStoreData {
  cinema_sales: Record<string, any>;
  cinema_occupancy: Record<string, any>;
  cinema_config: Record<string, any>;
}

const g = globalThis as any;
if (!g.__CINEMA_XXI_EDGE_STORE__) {
  g.__CINEMA_XXI_EDGE_STORE__ = {
    cinema_sales: {},
    cinema_occupancy: {},
    cinema_config: {},
    hydrated: false,
  };
}

const EDGE_CACHE_URL = 'https://internal-sync.cinemaxxi.local/store-v1';

async function getHydratedStore(env: any): Promise<SyncStoreData> {
  const store = g.__CINEMA_XXI_EDGE_STORE__;
  const now = Date.now();
  if (store.hydrated && now - (store.lastHydratedAt || 0) < 4000) {
    return store;
  }

  try {
    const cache = (globalThis as any).caches?.default;
    if (cache) {
      const cachedResp = await cache.match(EDGE_CACHE_URL);
      if (cachedResp) {
        const raw = await cachedResp.json();
        if (raw && typeof raw === 'object') {
          if (raw.cinema_sales) Object.assign(store.cinema_sales, raw.cinema_sales);
          if (raw.cinema_occupancy) Object.assign(store.cinema_occupancy, raw.cinema_occupancy);
          if (raw.cinema_config) Object.assign(store.cinema_config, raw.cinema_config);
        }
      }
    }
  } catch {
    // ignore cache error
  }

  if (env && env.SYNC_KV && typeof env.SYNC_KV.get === 'function') {
    try {
      const raw = await env.SYNC_KV.get('CINEMA_XXI_STORE', 'json');
      if (raw && typeof raw === 'object') {
        if (raw.cinema_sales) Object.assign(store.cinema_sales, raw.cinema_sales);
        if (raw.cinema_occupancy) Object.assign(store.cinema_occupancy, raw.cinema_occupancy);
        if (raw.cinema_config) Object.assign(store.cinema_config, raw.cinema_config);
      }
    } catch {
      // ignore KV error
    }
  }

  store.hydrated = true;
  store.lastHydratedAt = now;
  return store;
}

async function persistEdgeStore(store: SyncStoreData, env: any, ctx: any): Promise<void> {
  const saveTask = async () => {
    const payload = JSON.stringify({
      cinema_sales: store.cinema_sales,
      cinema_occupancy: store.cinema_occupancy,
      cinema_config: store.cinema_config,
    });

    try {
      const cache = (globalThis as any).caches?.default;
      if (cache) {
        const resp = new Response(payload, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=2592000',
          },
        });
        await cache.put(EDGE_CACHE_URL, resp);
      }
    } catch {
      // ignore
    }

    if (env && env.SYNC_KV && typeof env.SYNC_KV.put === 'function') {
      try {
        await env.SYNC_KV.put('CINEMA_XXI_STORE', payload);
      } catch {
        // ignore
      }
    }
  };

  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(saveTask());
  } else {
    await saveTask();
  }
}

export const onRequest = async (context: any): Promise<Response> => {
  const { request, params, env } = context;
  const action = String(params?.action || '').toLowerCase();

  const jsonHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: jsonHeaders });
  }

  const store = await getHydratedStore(env);

  if (action === 'readings' && request.method === 'GET') {
    const row = store.cinema_sales['__SYSTEM_SYNC_IOT_MONITORING__'];
    const shows: any[] = Array.isArray(row?.shows) ? row.shows : [];
    const devices = shows
      .filter((s) => s && s.recordType === 'device' && s.payload && !s.payload.deleted)
      .map((s) => s.payload);
    const readings = shows
      .filter((s) => s && s.recordType === 'history' && Array.isArray(s.readings))
      .flatMap((s) => s.readings)
      .sort((a: any, b: any) => String(b.recordedAt || '').localeCompare(String(a.recordedAt || '')));
    return new Response(
      JSON.stringify({ ok: true, devices, readings, updatedAt: row?.updated_at || null }),
      { status: 200, headers: jsonHeaders }
    );
  }

  if (action === 'telemetry' && request.method === 'POST') {
    try {
      const body: any = await request.json();
      const rawDeviceId = String(body.deviceId || body.device_id || '').trim().toUpperCase();
      const tempVal = Number(body.temperature ?? body.temp);
      if (!rawDeviceId || Number.isNaN(tempVal)) {
        return new Response(
          JSON.stringify({ ok: false, error: 'deviceId dan temperature (angka) wajib diisi.' }),
          { status: 400, headers: jsonHeaders }
        );
      }

      const nowIso = new Date().toISOString();
      const rowId = '__SYSTEM_SYNC_IOT_MONITORING__';
      const existingRow = store.cinema_sales[rowId] || {
        id: rowId,
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows: [],
        updated_at: nowIso,
      };
      const shows: any[] = Array.isArray(existingRow.shows) ? [...existingRow.shows] : [];

      const devKey = `iotdev_${rawDeviceId}`;
      const existingDevIdx = shows.findIndex((s) => s && s.id === devKey);
      const existingDev = existingDevIdx >= 0 ? shows[existingDevIdx]?.payload : null;

      const roomType = String(body.roomType || body.room_type || existingDev?.roomType || 'server');
      const roomName = String(body.roomName || body.room_name || existingDev?.roomName || rawDeviceId);
      const outletId = String(body.outletId || body.outlet_id || existingDev?.outletId || 'the-park-sawangan-xxi');
      const tempRounded = Math.round(tempVal * 10) / 10;
      const rawHum = body.humidity ?? body.hum;
      const humRounded =
        roomType === 'projector' && rawHum !== undefined && rawHum !== null && !Number.isNaN(Number(rawHum))
          ? Math.round(Number(rawHum) * 10) / 10
          : null;
      const rssiVal = body.rssi !== undefined && body.rssi !== null && !Number.isNaN(Number(body.rssi))
        ? Number(body.rssi)
        : existingDev?.signalRssi ?? null;

      const occVal =
        body.occupancyPct !== undefined && body.occupancyPct !== null && !Number.isNaN(Number(body.occupancyPct))
          ? Number(body.occupancyPct)
          : existingDev?.occupancyOverridePct ?? null;
      const isHighOccStudio = roomType === 'studio' && occVal !== null && occVal > 50;
      const sopMinTemp = isHighOccStudio ? 22.0 : 23.0;
      const sopMaxTemp = isHighOccStudio ? 23.5 : 24.0;
      const isTempWithinSop = tempRounded >= sopMinTemp && tempRounded <= sopMaxTemp;
      const isHumidityWithinSop =
        roomType === 'projector' && humRounded !== null ? humRounded >= 40 && humRounded <= 60 : null;

      const nextDevice = {
        id: existingDev?.id || `dev-${rawDeviceId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        outletId,
        deviceId: rawDeviceId,
        roomName,
        roomType,
        connectionType: body.connectionType || existingDev?.connectionType || 'ethernet',
        sensorModel: body.sensorModel || existingDev?.sensorModel || 'ESP32 + SHT31',
        occupancyOverridePct: existingDev?.occupancyOverridePct ?? null,
        notes: existingDev?.notes || '',
        lastTemperature: tempRounded,
        lastHumidity: humRounded,
        lastSeenAt: nowIso,
        lastSource: body.source || 'hardware',
        signalRssi: rssiVal,
        updatedAt: nowIso,
        deleted: false,
      };

      const devWrapper = {
        id: devKey,
        recordType: 'device',
        updatedAt: nowIso,
        payload: nextDevice,
      };
      if (existingDevIdx >= 0) {
        shows[existingDevIdx] = devWrapper;
      } else {
        shows.push(devWrapper);
      }

      const reading = {
        id: `iot_${rawDeviceId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        outletId,
        deviceId: rawDeviceId,
        roomName,
        roomType,
        temperature: tempRounded,
        humidity: humRounded,
        source: body.source || 'hardware',
        occupancyPct: roomType === 'studio' ? occVal : null,
        sopMinTemp,
        sopMaxTemp,
        isTempWithinSop,
        isHumidityWithinSop,
        recordedAt: nowIso,
      };

      const histKey = `iothist_${rawDeviceId}`;
      const histIdx = shows.findIndex((s) => s && s.id === histKey);
      const prevReadings = histIdx >= 0 && Array.isArray(shows[histIdx]?.readings) ? shows[histIdx].readings : [];
      const histWrapper = {
        id: histKey,
        recordType: 'history',
        deviceId: rawDeviceId,
        updatedAt: nowIso,
        readings: [reading, ...prevReadings].slice(0, 30),
      };
      if (histIdx >= 0) {
        shows[histIdx] = histWrapper;
      } else {
        shows.push(histWrapper);
      }

      store.cinema_sales[rowId] = {
        id: rowId,
        outlet_id: '__SYSTEM_SYNC__',
        date: '2026-01-01',
        shows,
        updated_at: nowIso,
      };

      await persistEdgeStore(store, env, context);

      return new Response(
        JSON.stringify({
          ok: true,
          deviceId: rawDeviceId,
          roomName,
          temperature: tempRounded,
          humidity: humRounded,
          sopMinTemp,
          sopMaxTemp,
          isTempWithinSop,
          isHumidityWithinSop,
          recordedAt: nowIso,
        }),
        { status: 200, headers: jsonHeaders }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({ ok: false, error: err?.message || 'IoT telemetry error' }),
        { status: 500, headers: jsonHeaders }
      );
    }
  }

  return new Response(JSON.stringify({ ok: false, error: 'Unsupported IoT action' }), {
    status: 404,
    headers: jsonHeaders,
  });
};
