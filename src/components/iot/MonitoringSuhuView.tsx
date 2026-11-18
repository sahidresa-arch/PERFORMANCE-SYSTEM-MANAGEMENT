import React, { useEffect, useMemo, useState } from 'react';
import {
  Thermometer,
  Droplets,
  Wifi,
  Cable,
  Server,
  Projector,
  Film,
  Building2,
  Plus,
  RefreshCw,
  Code2,
  Play,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  X,
  Users,
  RotateCcw,
} from 'lucide-react';
import { IotRoomType, IotSensorDevice, IotTelemetryReading, Outlet, User } from '../../types';
import { StorageService } from '../../lib/storage';
import { pullIotMonitoringNow } from '../../lib/supabase';

interface MonitoringSuhuViewProps {
  currentUser: User | null;
  selectedDate: string;
}

const ROOM_TYPE_META: Record<
  IotRoomType,
  { label: string; icon: React.ElementType; order: number; badgeClass: string }
> = {
  server: {
    label: 'Ruang Server',
    icon: Server,
    order: 1,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  projector: {
    label: 'Ruang Projector',
    icon: Projector,
    order: 2,
    badgeClass: 'bg-purple-50 text-[#4A1D6A] border-purple-200',
  },
  lobby: {
    label: 'Lobi',
    icon: Building2,
    order: 3,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  studio: {
    label: 'Studio',
    icon: Film,
    order: 4,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  other: {
    label: 'Ruangan Lainnya',
    icon: Thermometer,
    order: 5,
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
  },
};

function formatDateTimeShort(iso: string | null | undefined): string {
  if (!iso) return 'Belum ada data';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

export const MonitoringSuhuView: React.FC<MonitoringSuhuViewProps> = ({
  currentUser,
  selectedDate,
}) => {
  const isAreaOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'area_manager';

  const outlets = useMemo<Outlet[]>(() => StorageService.getOutlets(), []);
  const accessibleOutlets = useMemo(() => {
    if (isAreaOrAdmin) return outlets;
    return outlets.filter((o) => o.id === currentUser?.outletId);
  }, [outlets, isAreaOrAdmin, currentUser?.outletId]);

  const [selectedOutletId, setSelectedOutletId] = useState<string>(() => {
    if (!isAreaOrAdmin && currentUser?.outletId) return currentUser.outletId;
    const sawangan = outlets.find((o) => o.id === 'the-park-sawangan-xxi');
    return sawangan ? sawangan.id : outlets[0]?.id || 'the-park-sawangan-xxi';
  });

  const [roomFilter, setRoomFilter] = useState<'ALL' | IotRoomType>('ALL');
  const [devices, setDevices] = useState<IotSensorDevice[]>(() => StorageService.getIotDevices());
  const [readings, setReadings] = useState<IotTelemetryReading[]>(() =>
    StorageService.getIotReadings()
  );
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [setupDevice, setSetupDevice] = useState<IotSensorDevice | null>(null);
  const [testDevice, setTestDevice] = useState<IotSensorDevice | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<IotSensorDevice | null>(null);

  // Add device form state
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<IotRoomType>('server');
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newConnType, setNewConnType] = useState<'ethernet' | 'wifi'>('ethernet');
  const [newNotes, setNewNotes] = useState('');

  // Test telemetry modal state
  const [testTemp, setTestTemp] = useState('23.4');
  const [testHum, setTestHum] = useState('52');
  const [testOccupancy, setTestOccupancy] = useState<string>('auto');
  const [testSending, setTestSending] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  // ESP32 sketch copy state
  const [copiedSketch, setCopiedSketch] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [sketchTransport, setSketchTransport] = useState<'wifi' | 'ethernet'>('ethernet');

  const reloadLocal = () => {
    setDevices(StorageService.getIotDevices());
    setReadings(StorageService.getIotReadings());
  };

  useEffect(() => {
    const onStorageChange = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (
        !detail ||
        detail.type === 'iot-monitoring' ||
        detail.type === 'occupancy'
      ) {
        reloadLocal();
      }
    };
    window.addEventListener('cinema-xxi-data-changed', onStorageChange);
    return () => window.removeEventListener('cinema-xxi-data-changed', onStorageChange);
  }, []);

  const handleManualRefresh = async () => {
    setIsSyncing(true);
    try {
      await pullIotMonitoringNow();
      // Also query server /api/iot/readings in case ESP32 pushed recently
      const resp = await fetch('/api/iot/readings', { cache: 'no-store' });
      if (resp.ok) {
        const json = await resp.json();
        if (json?.ok && Array.isArray(json.devices)) {
          json.devices.forEach((d: IotSensorDevice) => {
            if (d && d.deviceId) {
              StorageService.saveIotDevice(d, false);
            }
          });
        }
      }
      reloadLocal();
    } catch {
      reloadLocal();
    } finally {
      setIsSyncing(false);
    }
  };

  const outletDevices = useMemo(() => {
    return devices
      .filter((d) => d.outletId === selectedOutletId)
      .filter((d) => roomFilter === 'ALL' || d.roomType === roomFilter)
      .sort((a, b) => {
        const ordA = ROOM_TYPE_META[a.roomType]?.order ?? 9;
        const ordB = ROOM_TYPE_META[b.roomType]?.order ?? 9;
        if (ordA !== ordB) return ordA - ordB;
        return a.roomName.localeCompare(b.roomName, undefined, { numeric: true });
      });
  }, [devices, selectedOutletId, roomFilter]);

  const outletReadings = useMemo(() => {
    return readings
      .filter((r) => r.outletId === selectedOutletId)
      .filter((r) => roomFilter === 'ALL' || r.roomType === roomFilter)
      .slice(0, 40);
  }, [readings, selectedOutletId, roomFilter]);

  // Evaluate each device with real/override studio occupancy & SOP rules
  const evaluatedDevices = useMemo(() => {
    return outletDevices.map((dev) => {
      const autoOcc =
        dev.roomType === 'studio'
          ? StorageService.getStudioOccupancyPct(dev.outletId, dev.roomName, selectedDate)
          : { pct: null, capacity: 0, peakAudience: 0, showLabel: '' };

      const effectiveOccPct =
        dev.roomType === 'studio'
          ? dev.occupancyOverridePct !== undefined && dev.occupancyOverridePct !== null
            ? dev.occupancyOverridePct
            : autoOcc.pct
          : null;

      const sop = StorageService.evaluateIotSop(dev.roomType, effectiveOccPct);
      const hasTemp = dev.lastTemperature !== undefined && dev.lastTemperature !== null;
      const tempVal = hasTemp ? Number(dev.lastTemperature) : null;
      const hasHum =
        sop.monitorHumidity && dev.lastHumidity !== undefined && dev.lastHumidity !== null;
      const humVal = hasHum ? Number(dev.lastHumidity) : null;

      const isTempOk =
        tempVal !== null ? tempVal >= sop.sopMinTemp && tempVal <= sop.sopMaxTemp : null;
      const isHumOk =
        humVal !== null ? humVal >= sop.sopMinHumidity && humVal <= sop.sopMaxHumidity : null;

      let status: 'waiting' | 'ok' | 'alert' = 'waiting';
      let statusLabel = 'Menunggu Sensor';
      if (tempVal !== null) {
        const tempViolation = isTempOk === false;
        const humViolation = sop.monitorHumidity && isHumOk === false;
        if (tempViolation || humViolation) {
          status = 'alert';
          if (tempViolation && humViolation) {
            statusLabel = 'Suhu & Kelembaban di Luar SOP';
          } else if (tempViolation) {
            statusLabel =
              tempVal < sop.sopMinTemp
                ? `Terlalu Dingin (< ${sop.sopMinTemp}°C)`
                : `Suhu Tinggi (> ${sop.sopMaxTemp}°C)`;
          } else {
            statusLabel =
              humVal! < sop.sopMinHumidity
                ? `Kelembaban Rendah (< ${sop.sopMinHumidity}%)`
                : `Kelembaban Tinggi (> ${sop.sopMaxHumidity}%)`;
          }
        } else {
          status = 'ok';
          statusLabel = 'Sesuai SOP';
        }
      }

      return {
        dev,
        autoOcc,
        effectiveOccPct,
        sop,
        isTempOk,
        isHumOk,
        status,
        statusLabel,
      };
    });
  }, [outletDevices, selectedDate]);

  const summary = useMemo(() => {
    let total = evaluatedDevices.length;
    let ok = 0;
    let alert = 0;
    let waiting = 0;
    evaluatedDevices.forEach((item) => {
      if (item.status === 'ok') ok++;
      else if (item.status === 'alert') alert++;
      else waiting++;
    });
    return { total, ok, alert, waiting };
  }, [evaluatedDevices]);

  const selectedOutlet = outlets.find((o) => o.id === selectedOutletId);

  const handleOpenAddModal = () => {
    const codePrefix = selectedOutletId
      .split('-')
      .slice(0, 2)
      .map((w) => w.slice(0, 2).toUpperCase())
      .join('');
    const nextNum = String(outletDevices.length + 1).padStart(2, '0');
    setNewRoomName('');
    setNewRoomType('server');
    setNewDeviceId(`ESP32-${codePrefix || 'XXI'}-ROOM-${nextNum}`);
    setNewConnType('ethernet');
    setNewNotes('');
    setShowAddModal(true);
  };

  const handleCreateDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !newDeviceId.trim()) return;
    const normDevId = newDeviceId.trim().toUpperCase().replace(/\s+/g, '-');
    StorageService.saveIotDevice({
      id: `dev-${normDevId.toLowerCase()}-${Date.now().toString(36)}`,
      outletId: selectedOutletId,
      deviceId: normDevId,
      roomName: newRoomName.trim(),
      roomType: newRoomType,
      connectionType: newConnType,
      sensorModel:
        newConnType === 'ethernet' ? 'ESP32 + SHT31 + W5500 LAN' : 'ESP32 + SHT31 (Wi-Fi)',
      occupancyOverridePct: null,
      notes: newNotes.trim() || undefined,
      lastTemperature: null,
      lastHumidity: null,
      lastSeenAt: null,
      lastSource: null,
      signalRssi: null,
    });
    setShowAddModal(false);
    reloadLocal();
  };

  const handleOccupancyOverrideChange = (dev: IotSensorDevice, val: string) => {
    const nextOverride = val === 'auto' ? null : Number(val);
    StorageService.saveIotDevice({
      ...dev,
      occupancyOverridePct: nextOverride,
    });
    reloadLocal();
  };

  const handleOpenTestModal = (dev: IotSensorDevice) => {
    setTestDevice(dev);
    setTestTemp(
      dev.lastTemperature !== null && dev.lastTemperature !== undefined
        ? String(dev.lastTemperature)
        : dev.roomType === 'studio'
        ? '23.2'
        : '23.5'
    );
    setTestHum(
      dev.lastHumidity !== null && dev.lastHumidity !== undefined ? String(dev.lastHumidity) : '52'
    );
    setTestOccupancy(
      dev.occupancyOverridePct !== null && dev.occupancyOverridePct !== undefined
        ? String(dev.occupancyOverridePct)
        : 'auto'
    );
    setTestFeedback(null);
  };

  const handleSendTestTelemetry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testDevice) return;
    const tempNum = Number(testTemp.replace(',', '.'));
    if (Number.isNaN(tempNum)) {
      setTestFeedback('Masukkan angka suhu yang valid (misal: 23.4).');
      return;
    }

    const humNum =
      testDevice.roomType === 'projector' ? Number(testHum.replace(',', '.')) : null;
    if (testDevice.roomType === 'projector' && (humNum === null || Number.isNaN(humNum))) {
      setTestFeedback('Masukkan angka kelembaban (% RH) yang valid untuk Ruang Projector.');
      return;
    }

    setTestSending(true);
    setTestFeedback(null);

    try {
      let occToUse: number | null =
        testOccupancy === 'auto' ? null : Number(testOccupancy);
      if (occToUse === null && testDevice.roomType === 'studio') {
        occToUse = StorageService.getStudioOccupancyPct(
          testDevice.outletId,
          testDevice.roomName,
          selectedDate
        ).pct;
      }

      // Apply optional studio occupancy override cleanly if user picked one in test modal
      if (testDevice.roomType === 'studio') {
        const nextOverride = testOccupancy === 'auto' ? null : Number(testOccupancy);
        if ((testDevice.occupancyOverridePct ?? null) !== nextOverride) {
          StorageService.saveIotDevice(
            { ...testDevice, occupancyOverridePct: nextOverride },
            true
          );
        }
      }

      // Send via real HTTP endpoint /api/iot/telemetry (same endpoint ESP32 hardware calls!)
      try {
        await fetch('/api/iot/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            outletId: testDevice.outletId,
            deviceId: testDevice.deviceId,
            roomName: testDevice.roomName,
            roomType: testDevice.roomType,
            temperature: tempNum,
            humidity: humNum,
            occupancyPct: occToUse,
            source: 'simulation',
          }),
        });
      } catch {
        // Offline / static preview fallback still saves locally + sync queue
      }

      StorageService.recordIotTelemetry({
        outletId: testDevice.outletId,
        deviceId: testDevice.deviceId,
        roomName: testDevice.roomName,
        roomType: testDevice.roomType,
        temperature: tempNum,
        humidity: humNum,
        occupancyPct: occToUse,
        source: 'simulation',
        dateForOccupancy: selectedDate,
      });

      reloadLocal();
      setTestDevice(null);
    } finally {
      setTestSending(false);
    }
  };

  const handleOpenSetupModal = (dev?: IotSensorDevice) => {
    const target =
      dev ||
      outletDevices.find((d) => d.roomType === 'server') ||
      outletDevices[0] || {
        id: 'dev-tps-server-01',
        outletId: selectedOutletId,
        deviceId: 'ESP32-TPS-SERVER-01',
        roomName: 'Ruang Server',
        roomType: 'server' as IotRoomType,
        connectionType: 'ethernet' as const,
        sensorModel: 'ESP32 + SHT31',
        updatedAt: new Date().toISOString(),
      };
    setSetupDevice(target);
    setSketchTransport(target.connectionType || 'ethernet');
    setCopiedSketch(false);
    setCopiedEndpoint(false);
  };

  const apiEndpointUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'https://your-app-domain/api/iot/telemetry';
    return `${window.location.origin}/api/iot/telemetry`;
  }, []);

  const generatedArduinoSketch = useMemo(() => {
    if (!setupDevice) return '';
    const isProj = setupDevice.roomType === 'projector';
    if (sketchTransport === 'ethernet') {
      return `/*
 * Cinema XXI - Sensor Suhu ${isProj ? '& Kelembaban ' : ''}(${setupDevice.roomName})
 * Hardware: ESP32 DevKit V1 + Sensor SHT31 (I2C) + Modul LAN W5500 (Switch Hub)
 * Wiring SHT31  : VCC->3V3, GND->GND, SDA->GPIO21, SCL->GPIO22
 * Wiring W5500  : 3V3->3V3, GND->GND, CS->GPIO5, SCK->GPIO18, MISO->GPIO19, MOSI->GPIO23
 */
#include <Wire.h>
#include <SPI.h>
#include <Ethernet.h>
#include <Adafruit_SHT31.h>

byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0x01 };
const char* SERVER_HOST = "${typeof window !== 'undefined' ? window.location.hostname : 'domain-aplikasi-anda.pages.dev'}";
const int   SERVER_PORT = ${typeof window !== 'undefined' && window.location.protocol === 'http:' ? (window.location.port || '3000') : '80'};
const char* DEVICE_ID   = "${setupDevice.deviceId}";
const char* OUTLET_ID   = "${setupDevice.outletId}";
const char* ROOM_NAME   = "${setupDevice.roomName}";
const char* ROOM_TYPE   = "${setupDevice.roomType}";

Adafruit_SHT31 sht31 = Adafruit_SHT31();
EthernetClient client;

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  if (!sht31.begin(0x44)) {
    Serial.println("Sensor SHT31 tidak terdeteksi!");
  }
  Ethernet.init(5); // CS Pin GPIO 5
  if (Ethernet.begin(mac) == 0) {
    Serial.println("Gagal DHCP dari Switch Hub!");
  } else {
    Serial.print("IP ESP32 LAN: ");
    Serial.println(Ethernet.localIP());
  }
}

void loop() {
  float t = sht31.readTemperature();
  float h = sht31.readHumidity();

  if (!isnan(t)) {
    String json = "{";
    json += "\\"outletId\\":\\"" + String(OUTLET_ID) + "\\",";
    json += "\\"deviceId\\":\\"" + String(DEVICE_ID) + "\\",";
    json += "\\"roomName\\":\\"" + String(ROOM_NAME) + "\\",";
    json += "\\"roomType\\":\\"" + String(ROOM_TYPE) + "\\",";
    json += "\\"temperature\\":" + String(t, 1);
    ${isProj ? 'json += ",\\"humidity\\":" + String(h, 1);' : '// Kelembaban hanya diaktifkan di Ruang Projector'}
    json += "}";

    if (client.connect(SERVER_HOST, SERVER_PORT)) {
      client.println("POST /api/iot/telemetry HTTP/1.1");
      client.println("Host: " + String(SERVER_HOST));
      client.println("Content-Type: application/json");
      client.print("Content-Length: ");
      client.println(json.length());
      client.println("Connection: close");
      client.println();
      client.println(json);
      client.stop();
      Serial.println("Terkirim: " + json);
    }
  }
  delay(60000); // Kirim tiap 1 menit
}`;
    }

    return `/*
 * Cinema XXI - Sensor Suhu ${isProj ? '& Kelembaban ' : ''}(${setupDevice.roomName})
 * Hardware: ESP32 DevKit V1 + Sensor SHT31 (I2C) via Wi-Fi
 * Wiring SHT31: VCC->3V3, GND->GND, SDA->GPIO21, SCL->GPIO22
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_SHT31.h>

const char* WIFI_SSID   = "NAMA_WIFI_BIOSKOP";
const char* WIFI_PASS   = "PASSWORD_WIFI";
const char* API_URL     = "${apiEndpointUrl}";
const char* DEVICE_ID   = "${setupDevice.deviceId}";
const char* OUTLET_ID   = "${setupDevice.outletId}";
const char* ROOM_NAME   = "${setupDevice.roomName}";
const char* ROOM_TYPE   = "${setupDevice.roomType}";

Adafruit_SHT31 sht31 = Adafruit_SHT31();

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  if (!sht31.begin(0x44)) {
    Serial.println("Sensor SHT31 tidak terdeteksi!");
  }
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Terhubung!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    float t = sht31.readTemperature();
    float h = sht31.readHumidity();
    if (!isnan(t)) {
      HTTPClient http;
      http.begin(API_URL);
      http.addHeader("Content-Type", "application/json");
      String json = "{";
      json += "\\"outletId\\":\\"" + String(OUTLET_ID) + "\\",";
      json += "\\"deviceId\\":\\"" + String(DEVICE_ID) + "\\",";
      json += "\\"roomName\\":\\"" + String(ROOM_NAME) + "\\",";
      json += "\\"roomType\\":\\"" + String(ROOM_TYPE) + "\\",";
      json += "\\"rssi\\":" + String(WiFi.RSSI()) + ",";
      json += "\\"temperature\\":" + String(t, 1);
      ${isProj ? 'json += ",\\"humidity\\":" + String(h, 1);' : '// Kelembaban hanya dikirim/dipantau untuk Ruang Projector'}
      json += "}";
      int code = http.POST(json);
      Serial.printf("HTTP %d -> %s\\n", code, json.c_str());
      http.end();
    }
  }
  delay(60000); // Kirim tiap 1 menit
}`;
  }, [setupDevice, sketchTransport, apiEndpointUrl]);

  const handleCopyText = async (text: string, which: 'sketch' | 'endpoint') => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === 'sketch') {
        setCopiedSketch(true);
        setTimeout(() => setCopiedSketch(false), 2000);
      } else {
        setCopiedEndpoint(true);
        setTimeout(() => setCopiedEndpoint(false), 2000);
      }
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#F3E8FF] border border-[#E9D5FF] flex items-center justify-center text-[#4A1D6A] shrink-0">
              <Thermometer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-[#111827]">
                  Monitoring Suhu &amp; Kelembaban
                </h1>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-purple-50 text-[#4A1D6A] border border-purple-200">
                  IoT ESP32 + SHT31
                </span>
              </div>
              <p className="text-xs text-[#6B7280] mt-1">
                Pemantauan otomatis suhu ruangan &amp; kelembaban Ruang Projector •{' '}
                <span className="font-semibold text-[#374151]">
                  {selectedOutlet?.name || selectedOutletId}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-xs font-semibold text-[#374151] transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Refresh Sensor'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenSetupModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-xs font-semibold text-[#4A1D6A] transition-colors cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Setup Alat &amp; Kode ESP32</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4A1D6A] hover:bg-[#3b1656] text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Titik Sensor</span>
            </button>
          </div>
        </div>

        {/* Filter Bar + SOP Banner */}
        <div className="mt-5 pt-4 border-t border-[#F3F4F6] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {accessibleOutlets.length > 1 && (
              <select
                value={selectedOutletId}
                onChange={(e) => setSelectedOutletId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-xs font-semibold text-[#111827] focus:outline-hidden focus:ring-2 focus:ring-[#4A1D6A]/20"
              >
                {accessibleOutlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}

            <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#F3F4F6]">
              {(
                [
                  { id: 'ALL', label: 'Semua' },
                  { id: 'server', label: 'Server' },
                  { id: 'projector', label: 'Projector' },
                  { id: 'lobby', label: 'Lobi' },
                  { id: 'studio', label: 'Studio' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRoomFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    roomFilter === tab.id
                      ? 'bg-white text-[#4A1D6A] shadow-2xs'
                      : 'text-[#6B7280] hover:text-[#111827]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* SOP Compliance Reference Strip */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <div className="px-2.5 py-1.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] text-[#374151]">
              <span className="font-bold text-[#111827]">SOP Ruangan:</span> 23.0 – 24.0°C
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
              <span className="font-bold">Studio Okupansi &gt;50%:</span> 22.0 – 23.5°C
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-[#4A1D6A]">
              <span className="font-bold">Kelembaban:</span> Khusus Ruang Projector (40–60% RH)
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-2xs">
          <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
            Total Titik Sensor
          </p>
          <p className="text-2xl font-bold text-[#111827] mt-1 tabular-nums">{summary.total}</p>
          <p className="text-[11px] text-[#6B7280] mt-1">Titik terdaftar di outlet ini</p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            Sesuai SOP
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{summary.ok}</p>
          <p className="text-[11px] text-emerald-600 mt-1">Suhu &amp; RH dalam batas aman</p>
        </div>

        <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
            Di Luar SOP
          </p>
          <p className="text-2xl font-bold text-rose-600 mt-1 tabular-nums">{summary.alert}</p>
          <p className="text-[11px] text-rose-600 mt-1">Perlu cek AC / dehumidifier</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-2xs">
          <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
            Menunggu Sensor
          </p>
          <p className="text-2xl font-bold text-[#374151] mt-1 tabular-nums">{summary.waiting}</p>
          <p className="text-[11px] text-[#6B7280] mt-1">Belum ada data alat masuk</p>
        </div>
      </div>

      {/* Room Monitoring Cards Grid */}
      {evaluatedDevices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#D1D5DB] p-10 text-center">
          <Thermometer className="w-10 h-10 text-[#9CA3AF] mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#111827]">
            Belum Ada Titik Sensor di Kategori Ini
          </h3>
          <p className="text-xs text-[#6B7280] mt-1 max-w-md mx-auto">
            Tambahkan titik sensor baru untuk mulai memantau suhu ruangan outlet ini dengan ESP32 +
            SHT31.
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4A1D6A] text-white text-xs font-semibold hover:bg-[#3b1656] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Titik Sensor</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {evaluatedDevices.map(
            ({ dev, autoOcc, effectiveOccPct, sop, isTempOk, isHumOk, status, statusLabel }) => {
              const meta = ROOM_TYPE_META[dev.roomType] || ROOM_TYPE_META.other;
              const RoomIcon = meta.icon;
              const hasReading = dev.lastTemperature !== null && dev.lastTemperature !== undefined;

              const cardBorder =
                status === 'alert'
                  ? 'border-rose-300 ring-1 ring-rose-100'
                  : status === 'ok'
                  ? 'border-emerald-200'
                  : 'border-[#E5E7EB]';

              return (
                <div
                  key={dev.id}
                  className={`bg-white rounded-2xl border ${cardBorder} p-4 shadow-2xs flex flex-col justify-between transition-all`}
                >
                  <div>
                    {/* Top Row: Room & Connection */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${meta.badgeClass}`}
                        >
                          <RoomIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-[#111827] truncate">
                            {dev.roomName}
                          </h3>
                          <p className="text-[11px] text-[#6B7280] font-mono truncate">
                            {dev.deviceId}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 ${
                          dev.connectionType === 'ethernet'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}
                      >
                        {dev.connectionType === 'ethernet' ? (
                          <Cable className="w-3 h-3" />
                        ) : (
                          <Wifi className="w-3 h-3" />
                        )}
                        {dev.connectionType === 'ethernet' ? 'LAN Switch Hub' : 'Wi-Fi'}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      {status === 'ok' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {statusLabel}
                        </span>
                      )}
                      {status === 'alert' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-lg">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {statusLabel}
                        </span>
                      )}
                      {status === 'waiting' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B7280] bg-[#F3F4F6] border border-[#E5E7EB] px-2.5 py-0.5 rounded-lg">
                          <Clock className="w-3.5 h-3.5" />
                          Menunggu Sensor Terpasang
                        </span>
                      )}

                      {dev.lastSource && (
                        <span className="text-[10px] font-medium text-[#6B7280] px-2 py-0.5 rounded bg-[#F9FAFB] border border-[#E5E7EB]">
                          {dev.lastSource === 'hardware' ? 'Alat Live' : 'Tes Simulasi'}
                        </span>
                      )}
                    </div>

                    {/* Readings Area */}
                    <div className="mt-3.5 grid grid-cols-1 gap-2.5">
                      {/* Temperature Box */}
                      <div
                        className={`rounded-xl p-3 border ${
                          !hasReading
                            ? 'bg-[#F9FAFB] border-[#E5E7EB]'
                            : isTempOk
                            ? 'bg-emerald-50/40 border-emerald-200/80'
                            : 'bg-rose-50/60 border-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#6B7280] flex items-center gap-1">
                            <Thermometer className="w-3.5 h-3.5 text-[#4A1D6A]" />
                            Suhu Ruangan
                          </span>
                          <span className="text-[11px] font-semibold text-[#374151]">
                            SOP: {sop.sopMinTemp.toFixed(1)} – {sop.sopMaxTemp.toFixed(1)}°C
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-baseline justify-between">
                          {hasReading ? (
                            <span
                              className={`text-2xl font-bold tabular-nums ${
                                isTempOk ? 'text-[#111827]' : 'text-rose-600'
                              }`}
                            >
                              {Number(dev.lastTemperature).toFixed(1)}°C
                            </span>
                          ) : (
                            <span className="text-lg font-bold text-[#9CA3AF]">--.-°C</span>
                          )}
                          <span className="text-[10px] text-[#6B7280]">
                            {formatDateTimeShort(dev.lastSeenAt)}
                          </span>
                        </div>
                      </div>

                      {/* Humidity Box — STRICTLY ONLY FOR RUANG PROJECTOR */}
                      {sop.monitorHumidity && (
                        <div
                          className={`rounded-xl p-3 border ${
                            dev.lastHumidity === null || dev.lastHumidity === undefined
                              ? 'bg-purple-50/30 border-purple-200/70'
                              : isHumOk
                              ? 'bg-purple-50/50 border-purple-200'
                              : 'bg-amber-50 border-amber-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-[#4A1D6A] flex items-center gap-1">
                              <Droplets className="w-3.5 h-3.5" />
                              Kelembaban (Khusus Projector)
                            </span>
                            <span className="text-[11px] font-semibold text-[#4A1D6A]">
                              SOP: {sop.sopMinHumidity} – {sop.sopMaxHumidity}% RH
                            </span>
                          </div>
                          <div className="mt-1 flex items-baseline justify-between">
                            {dev.lastHumidity !== null && dev.lastHumidity !== undefined ? (
                              <span
                                className={`text-xl font-bold tabular-nums ${
                                  isHumOk ? 'text-[#4A1D6A]' : 'text-amber-700'
                                }`}
                              >
                                {Number(dev.lastHumidity).toFixed(1)}% RH
                              </span>
                            ) : (
                              <span className="text-base font-bold text-[#9CA3AF]">--.-% RH</span>
                            )}
                            <span className="text-[10px] text-[#6B7280]">Lensa &amp; optik aman</span>
                          </div>
                        </div>
                      )}

                      {/* Studio Occupancy Dynamic SOP Control */}
                      {dev.roomType === 'studio' && (
                        <div className="rounded-xl px-3 py-2 bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#374151]">
                              <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>
                                Okupansi:{' '}
                                {effectiveOccPct !== null ? `${effectiveOccPct}%` : 'Belum input'}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#6B7280] truncate">
                              {dev.occupancyOverridePct !== null &&
                              dev.occupancyOverridePct !== undefined
                                ? `Mode uji coba (>50% = SOP 22–23.5°C)`
                                : autoOcc.showLabel
                                ? `Rekap (${autoOcc.showLabel}: ${autoOcc.peakAudience}/${autoOcc.capacity} kursi)`
                                : 'Otomatis ikut Rekap Okupansi harian'}
                            </p>
                          </div>

                          <select
                            value={
                              dev.occupancyOverridePct !== null &&
                              dev.occupancyOverridePct !== undefined
                                ? String(dev.occupancyOverridePct)
                                : 'auto'
                            }
                            onChange={(e) => handleOccupancyOverrideChange(dev, e.target.value)}
                            title="Simulasi Okupansi Studio untuk uji SOP >50%"
                            className="px-2 py-1 rounded-lg border border-[#D1D5DB] bg-white text-[11px] font-semibold text-[#374151] cursor-pointer shrink-0"
                          >
                            <option value="auto">Auto Okupansi</option>
                            <option value="30">Uji 30% (≤50%)</option>
                            <option value="65">Uji 65% (&gt;50%)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-4 pt-3 border-t border-[#F3F4F6] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenTestModal(dev)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#4A1D6A] hover:bg-[#3b1656] text-white text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>Tes Kirim Data</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenSetupModal(dev)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[11px] font-semibold text-[#374151] cursor-pointer"
                      >
                        <Code2 className="w-3 h-3" />
                        <span>Kode ESP32</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeviceToDelete(dev)}
                        title="Hapus titik sensor"
                        className="p-1.5 rounded-lg border border-[#E5E7EB] hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-[#9CA3AF] cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* Telemetry Log Table */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#111827]">
              Riwayat Pembacaan Sensor Terbaru
            </h2>
            <p className="text-[11px] text-[#6B7280]">
              Menampilkan data terbaru dari alat ESP32 maupun pengujian sistem (maks. 30 log per
              sensor).
            </p>
          </div>
          {outletReadings.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-xs font-semibold text-[#6B7280] transition-colors cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Bersihkan Log Tes</span>
            </button>
          )}
        </div>

        {outletReadings.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#6B7280]">
            Belum ada data telemetri masuk untuk outlet ini. Gunakan tombol{' '}
            <span className="font-semibold text-[#4A1D6A]">Tes Kirim Data</span> pada kartu ruangan
            di atas atau hubungkan ESP32 Anda ke endpoint{' '}
            <code className="px-1.5 py-0.5 rounded bg-[#F3F4F6] font-mono text-[11px]">
              /api/iot/telemetry
            </code>
            .
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-bold text-[#6B7280] uppercase">
                  <th className="py-2.5 px-4">Waktu</th>
                  <th className="py-2.5 px-4">Ruangan</th>
                  <th className="py-2.5 px-4">Device ID</th>
                  <th className="py-2.5 px-4 text-right">Suhu (°C)</th>
                  <th className="py-2.5 px-4 text-right">Kelembaban (Projector)</th>
                  <th className="py-2.5 px-4">SOP Berlaku</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Sumber</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {outletReadings.map((r) => {
                  const isProj = r.roomType === 'projector';
                  const overallOk =
                    r.isTempWithinSop && (!isProj || r.isHumidityWithinSop !== false);
                  return (
                    <tr key={r.id} className="hover:bg-[#F9FAFB]/70">
                      <td className="py-2.5 px-4 text-[#6B7280] whitespace-nowrap">
                        {formatDateTimeShort(r.recordedAt)}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-[#111827]">
                        {r.roomName}
                        {r.roomType === 'studio' &&
                          r.occupancyPct !== null &&
                          r.occupancyPct !== undefined && (
                            <span className="ml-1.5 text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                              Okupansi {r.occupancyPct}%
                            </span>
                          )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-[#6B7280]">
                        {r.deviceId}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-bold tabular-nums ${
                          r.isTempWithinSop ? 'text-[#111827]' : 'text-rose-600'
                        }`}
                      >
                        {r.temperature.toFixed(1)}°C
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold tabular-nums">
                        {isProj && r.humidity !== null && r.humidity !== undefined ? (
                          <span
                            className={
                              r.isHumidityWithinSop === false ? 'text-amber-700' : 'text-[#4A1D6A]'
                            }
                          >
                            {Number(r.humidity).toFixed(1)}% RH
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-[#374151] whitespace-nowrap">
                        {r.sopMinTemp.toFixed(1)}–{r.sopMaxTemp.toFixed(1)}°C
                        {isProj ? ' • 40–60% RH' : ''}
                      </td>
                      <td className="py-2.5 px-4">
                        {overallOk ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                            Sesuai SOP
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold">
                            Di Luar SOP
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-[#6B7280]">
                        {r.source === 'hardware' ? 'ESP32 Live' : 'Simulasi'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Tambah Titik Sensor */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#111827]">Tambah Titik Sensor Baru</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateDevice} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Tipe Ruangan
                </label>
                <select
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value as IotRoomType)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D1D5DB] text-xs font-medium text-[#111827]"
                >
                  <option value="server">Ruang Server (SOP 23–24°C)</option>
                  <option value="projector">Ruang Projector (SOP 23–24°C + Kelembaban 40–60%)</option>
                  <option value="studio">Studio (SOP 23–24°C / 22–23.5°C jika Okupansi &gt;50%)</option>
                  <option value="lobby">Lobi / Area Publik (SOP 23–24°C)</option>
                  <option value="other">Ruangan Lainnya (SOP 23–24°C)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Nama Ruangan
                </label>
                <input
                  type="text"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Contoh: Ruang Server, Ruang Projector, Studio 1"
                  className="w-full px-3 py-2 rounded-xl border border-[#D1D5DB] text-xs text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Device ID (Harus sama dengan di Kode ESP32)
                </label>
                <input
                  type="text"
                  required
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value.toUpperCase())}
                  placeholder="ESP32-TPS-SERVER-02"
                  className="w-full px-3 py-2 rounded-xl border border-[#D1D5DB] text-xs font-mono text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Koneksi Jaringan Alat
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewConnType('ethernet')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                      newConnType === 'ethernet'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'bg-white border-[#D1D5DB] text-[#6B7280]'
                    }`}
                  >
                    <Cable className="w-3.5 h-3.5" />
                    Kabel LAN (Switch Hub)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewConnType('wifi')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                      newConnType === 'wifi'
                        ? 'bg-sky-50 border-sky-300 text-sky-700'
                        : 'bg-white border-[#D1D5DB] text-[#6B7280]'
                    }`}
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    Wi-Fi ESP32
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Catatan Lokasi (Opsional)
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Misal: Ditempel di dekat rak server utama"
                  className="w-full px-3 py-2 rounded-xl border border-[#D1D5DB] text-xs text-[#111827]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#D1D5DB] text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#4A1D6A] text-white text-xs font-semibold hover:bg-[#3b1656] cursor-pointer"
                >
                  Simpan Titik Sensor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tes Kirim Data (Simulasi Telemetry) */}
      {testDevice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#111827]">
                  Tes Kirim Data Sensor — {testDevice.roomName}
                </h3>
                <p className="text-[11px] text-[#6B7280] font-mono">{testDevice.deviceId}</p>
              </div>
              <button
                type="button"
                onClick={() => setTestDevice(null)}
                className="p-1 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendTestTelemetry} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[11px] text-[#4B5563]">
                Simulasi ini mengirim payload JSON langsung ke{' '}
                <code className="font-mono text-[#4A1D6A]">/api/iot/telemetry</code> untuk menguji
                evaluasi batas SOP dan pencatatan riwayat sebelum perangkat ESP32 fisik aktif.
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Suhu (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={testTemp}
                  onChange={(e) => setTestTemp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D1D5DB] text-sm font-bold text-[#111827]"
                />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTestTemp('22.8')}
                    className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold cursor-pointer"
                  >
                    22.8°C (SOP Studio &gt;50%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestTemp('23.5')}
                    className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold cursor-pointer"
                  >
                    23.5°C (SOP Normal)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestTemp('26.2')}
                    className="px-2 py-1 rounded bg-rose-50 text-rose-700 text-[10px] font-semibold cursor-pointer"
                  >
                    26.2°C (Uji Peringatan Panas)
                  </button>
                </div>
              </div>

              {testDevice.roomType === 'projector' && (
                <div>
                  <label className="block text-xs font-semibold text-[#4A1D6A] mb-1">
                    Kelembaban Ruang Projector (% RH) — SOP 40–60%
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={testHum}
                    onChange={(e) => setTestHum(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-purple-300 text-sm font-bold text-[#4A1D6A]"
                  />
                </div>
              )}

              {testDevice.roomType === 'studio' && (
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Okupansi Studio untuk Uji SOP
                  </label>
                  <select
                    value={testOccupancy}
                    onChange={(e) => setTestOccupancy(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D1D5DB] text-xs font-semibold text-[#111827]"
                  >
                    <option value="auto">Otomatis dari Rekap Okupansi ({selectedDate})</option>
                    <option value="30">Simulasi Okupansi 30% (SOP 23.0–24.0°C)</option>
                    <option value="70">Simulasi Okupansi 70% (&gt;50% → SOP 22.0–23.5°C)</option>
                  </select>
                </div>
              )}

              {testFeedback && (
                <p className="text-xs font-semibold text-rose-600">{testFeedback}</p>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTestDevice(null)}
                  className="px-4 py-2 rounded-xl border border-[#D1D5DB] text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={testSending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4A1D6A] text-white text-xs font-semibold hover:bg-[#3b1656] cursor-pointer disabled:opacity-60"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{testSending ? 'Mengirim...' : 'Kirim Data Tes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Setup Alat & Kode ESP32 */}
      {setupDevice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-[#111827]">
                  Panduan Setup ESP32 + SHT31 — {setupDevice.roomName}
                </h3>
                <p className="text-[11px] text-[#6B7280] font-mono">
                  Device ID: {setupDevice.deviceId} • Outlet: {setupDevice.outletId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSetupDevice(null)}
                className="p-1 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Endpoint Banner */}
              <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#374151] uppercase">
                    Endpoint Penerima Data Sensor (POST JSON)
                  </p>
                  <p className="text-xs font-mono text-[#4A1D6A] truncate mt-0.5">
                    {apiEndpointUrl}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(apiEndpointUrl, 'endpoint')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D1D5DB] bg-white hover:bg-[#F3F4F6] text-xs font-semibold text-[#374151] cursor-pointer shrink-0"
                >
                  {copiedEndpoint ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin URL</span>
                    </>
                  )}
                </button>
              </div>

              {/* Wiring Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-[#E5E7EB]">
                  <p className="font-bold text-[#111827] mb-1.5">1. Wiring Sensor SHT31 → ESP32</p>
                  <ul className="space-y-1 text-[#4B5563] font-mono text-[11px]">
                    <li>VCC → Pin 3V3</li>
                    <li>GND → Pin GND</li>
                    <li>SDA → GPIO 21</li>
                    <li>SCL → GPIO 22</li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl border border-[#E5E7EB]">
                  <p className="font-bold text-[#111827] mb-1.5">2. Pilih Koneksi Jaringan</p>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setSketchTransport('ethernet')}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                        sketchTransport === 'ethernet'
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'border-[#D1D5DB] text-[#6B7280]'
                      }`}
                    >
                      LAN Switch Hub (W5500)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSketchTransport('wifi')}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                        sketchTransport === 'wifi'
                          ? 'bg-sky-50 border-sky-300 text-sky-700'
                          : 'border-[#D1D5DB] text-[#6B7280]'
                      }`}
                    >
                      Wi-Fi ESP32
                    </button>
                  </div>
                  <p className="text-[11px] text-[#6B7280]">
                    {sketchTransport === 'ethernet'
                      ? 'W5500 SPI: CS→GPIO5, SCK→18, MISO→19, MOSI→23'
                      : 'Isi SSID & Password Wi-Fi bioskop langsung di kode.'}
                  </p>
                </div>
              </div>

              {/* Arduino Sketch Code */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#111827]">
                    Kode Arduino IDE (.ino) Siap Upload
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(generatedArduinoSketch, 'sketch')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4A1D6A] hover:bg-[#3b1656] text-white text-xs font-semibold cursor-pointer"
                  >
                    {copiedSketch ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Kode Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Kode Arduino</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-[#111827] text-[#E5E7EB] text-[11px] font-mono overflow-x-auto leading-relaxed max-h-72">
                  {generatedArduinoSketch}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Device Modal */}
      {deviceToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-sm p-5 shadow-xl">
            <h3 className="text-sm font-bold text-[#111827]">Hapus Titik Sensor?</h3>
            <p className="text-xs text-[#6B7280] mt-1.5">
              Titik sensor <span className="font-semibold text-[#111827]">{deviceToDelete.roomName}</span>{' '}
              (<span className="font-mono">{deviceToDelete.deviceId}</span>) akan dihapus dari daftar
              monitoring.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeviceToDelete(null)}
                className="px-3.5 py-2 rounded-xl border border-[#D1D5DB] text-xs font-semibold text-[#374151] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  StorageService.deleteIotDevice(deviceToDelete.id);
                  setDeviceToDelete(null);
                  reloadLocal();
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset Simulation Logs Modal */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-sm p-5 shadow-xl">
            <h3 className="text-sm font-bold text-[#111827]">Bersihkan Log &amp; Reset Status?</h3>
            <p className="text-xs text-[#6B7280] mt-1.5">
              Semua angka tes suhu/kelembaban dan riwayat di outlet{' '}
              <span className="font-semibold text-[#111827]">{selectedOutlet?.name}</span> akan
              dikosongkan ke status &ldquo;Menunggu Sensor&rdquo;. Titik sensor tetap tersimpan.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-[#D1D5DB] text-xs font-semibold text-[#374151] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  StorageService.resetIotTelemetryForOutlet(selectedOutletId);
                  setConfirmResetOpen(false);
                  reloadLocal();
                }}
                className="px-3.5 py-2 rounded-xl bg-[#4A1D6A] hover:bg-[#3b1656] text-white text-xs font-semibold cursor-pointer"
              >
                Ya, Bersihkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
