import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  APIProvider,
  APILoadingStatus,
  AdvancedMarker,
  Map as GoogleMap,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { Area, Outlet, User } from '../../types';
import { StorageService } from '../../lib/storage';
import {
  Building2,
  Check,
  Clock,
  Edit3,
  ExternalLink,
  Globe,
  Layers,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  RefreshCw,
  Search,
  Share2,
  Star,
} from 'lucide-react';

interface GoogleReviewViewProps {
  currentUser: User | null;
}

interface LatLngLiteral {
  lat: number;
  lng: number;
}

interface LiveReviewItem {
  authorName: string;
  authorPhotoUrl?: string;
  authorUri?: string;
  rating: number;
  relativeTime: string;
  text: string;
}

interface LivePlaceDetails {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: LatLngLiteral;
  rating?: number;
  userRatingCount?: number;
  googleMapsURI?: string;
  websiteURI?: string;
  nationalPhoneNumber?: string;
  primaryTypeDisplayName?: string;
  weekdayDescriptions?: string[];
  openNow?: boolean;
  photoUrl?: string;
  reviews?: LiveReviewItem[];
}

type PlaceTab = 'ringkasan' | 'ulasan' | 'tentang';

function formatOutletSearchName(outlet: Outlet | undefined): string {
  if (!outlet) return 'Cinema XXI Indonesia';
  return outlet.name
    .replace(/^(CAFE|HS)\s+/i, '')
    .trim();
}

function buildDefaultMapsQuery(outlet: Outlet | undefined): string {
  if (!outlet) return 'Cinema XXI Indonesia';
  const savedAddress = (outlet.address || '').trim();
  const baseName = formatOutletSearchName(outlet);
  if (savedAddress) {
    return `${baseName}, ${savedAddress}`;
  }
  return baseName;
}

function buildFallbackMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildDirectionsUrl(query: string, location?: LatLngLiteral): string {
  const dest = location
    ? `${location.lat},${location.lng}`
    : query;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}

function isQuotaError(err: unknown): boolean {
  const anyErr = err as any;
  const status = String(anyErr?.status || anyErr?.code || '');
  const msg = String(anyErr?.message || err || '');
  return (
    status === 'RESOURCE_EXHAUSTED' ||
    status === 'OVER_QUERY_LIMIT' ||
    status === '429' ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('QuotaExceeded') ||
    msg.includes('429')
  );
}

const DEFAULT_REGIONAL_VIEWPORT: LatLngLiteral = {
  lat: -6.5971,
  lng: 106.806,
};

interface InteractiveOutletMapProps {
  outlet: Outlet;
  searchQuery: string;
  refreshTick: number;
  placeData: LivePlaceDetails | null;
  mapType: 'roadmap' | 'hybrid';
  onClientPlaceResolved: (place: LivePlaceDetails) => void;
  onOpenGoogleMaps: () => void;
}

const InteractiveOutletMap: React.FC<InteractiveOutletMapProps> = ({
  outlet,
  searchQuery,
  refreshTick,
  placeData,
  mapType,
  onClientPlaceResolved,
  onOpenGoogleMaps,
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const loadingStatus = useApiLoadingStatus();

  useEffect(() => {
    if (loadingStatus === APILoadingStatus.AUTH_FAILURE) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
  }, [loadingStatus]);

  // Client-side Places fallback when /api/maps-place hasn't populated coordinates/photo
  useEffect(() => {
    if (!placesLib || !searchQuery) return;
    if (placeData?.location && placeData?.id) return;

    let isCancelled = false;

    const lookupPlaceViaSdk = async () => {
      try {
        const request = {
          textQuery: searchQuery,
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'googleMapsURI',
            'websiteURI',
            'nationalPhoneNumber',
            'primaryTypeDisplayName',
            'regularOpeningHours',
            'photos',
            'reviews',
          ],
          language: 'id',
          region: 'ID',
          maxResultCount: 1,
        };

        const { places } = await (placesLib as any).Place.searchByText(request);
        if (isCancelled) return;

        const firstPlace = places?.[0];
        if (!firstPlace || !firstPlace.location) return;

        const rawLoc = firstPlace.location as any;
        const lat = typeof rawLoc.lat === 'function' ? rawLoc.lat() : Number(rawLoc.lat);
        const lng = typeof rawLoc.lng === 'function' ? rawLoc.lng() : Number(rawLoc.lng);
        const resolvedLocation: LatLngLiteral = { lat, lng };

        let photoUrl: string | undefined;
        try {
          if (firstPlace.photos?.[0]?.getURI) {
            photoUrl = firstPlace.photos[0].getURI({ maxWidth: 800 });
          }
        } catch {
          photoUrl = undefined;
        }

        const reviews: LiveReviewItem[] = Array.isArray(firstPlace.reviews)
          ? firstPlace.reviews.map((r: any) => ({
              authorName: r?.authorAttribution?.displayName || 'Pengguna Google',
              authorPhotoUrl: r?.authorAttribution?.photoURI || undefined,
              authorUri: r?.authorAttribution?.uri || undefined,
              rating: typeof r?.rating === 'number' ? r.rating : 0,
              relativeTime: r?.relativePublishTimeDescription || '',
              text: r?.text || r?.originalText || '',
            }))
          : [];

        onClientPlaceResolved({
          id: firstPlace.id || outlet.id,
          displayName: firstPlace.displayName || formatOutletSearchName(outlet),
          formattedAddress: firstPlace.formattedAddress || outlet.address || '',
          location: resolvedLocation,
          rating: typeof firstPlace.rating === 'number' ? firstPlace.rating : undefined,
          userRatingCount:
            typeof firstPlace.userRatingCount === 'number'
              ? firstPlace.userRatingCount
              : undefined,
          googleMapsURI: firstPlace.googleMapsURI || undefined,
          websiteURI: firstPlace.websiteURI || undefined,
          nationalPhoneNumber: firstPlace.nationalPhoneNumber || undefined,
          primaryTypeDisplayName: firstPlace.primaryTypeDisplayName || undefined,
          weekdayDescriptions: Array.isArray(firstPlace.regularOpeningHours?.weekdayDescriptions)
            ? firstPlace.regularOpeningHours.weekdayDescriptions
            : undefined,
          photoUrl,
          reviews,
        });
      } catch (err) {
        if (!isCancelled && isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      }
    };

    void lookupPlaceViaSdk();

    return () => {
      isCancelled = true;
    };
  }, [
    placesLib,
    outlet.id,
    outlet.name,
    outlet.address,
    searchQuery,
    refreshTick,
    placeData?.id,
    placeData?.location,
    onClientPlaceResolved,
  ]);

  // Smoothly pan & zoom whenever resolved outlet coordinates update
  useEffect(() => {
    if (map && placeData?.location) {
      map.panTo(placeData.location);
      map.setZoom(17);
    }
  }, [map, placeData?.location]);

  if (loadingStatus === APILoadingStatus.FAILED || loadingStatus === APILoadingStatus.AUTH_FAILURE) {
    return (
      <a
        href={placeData?.googleMapsURI || buildFallbackMapsUrl(searchQuery)}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center bg-gradient-to-br from-slate-50 to-teal-50/40 hover:bg-teal-50/50 transition-colors"
      >
        <div className="w-14 h-14 rounded-2xl bg-[#EA4335] text-white flex items-center justify-center shadow-md">
          <MapPin className="w-7 h-7" />
        </div>
        <div className="max-w-md space-y-1">
          <h3 className="text-sm font-extrabold text-[#111827]">
            {placeData?.displayName || formatOutletSearchName(outlet)}
          </h3>
          <p className="text-xs text-[#6B7280]">
            Klik di sini untuk membuka peta interaktif &amp; ulasan Google Review langsung di Google Maps.
          </p>
        </div>
        <span className="px-4 py-2 rounded-xl bg-[#0F766E] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs">
          <span>Buka di Google Maps</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </span>
      </a>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {(loadingStatus === APILoadingStatus.LOADING || loadingStatus === APILoadingStatus.NOT_LOADED) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-100/90 text-[#6B7280]">
          <Loader2 className="w-6 h-6 animate-spin text-[#0F766E]" />
          <span className="text-xs font-semibold">Memuat peta Google Maps...</span>
        </div>
      )}

      <GoogleMap
        mapId="DEMO_MAP_ID"
        defaultCenter={placeData?.location || DEFAULT_REGIONAL_VIEWPORT}
        defaultZoom={placeData?.location ? 17 : 12}
        mapTypeId={mapType}
        gestureHandling="greedy"
        clickableIcons={false}
        disableDefaultUI={false}
        streetViewControl={false}
        mapTypeControl={false}
        fullscreenControl={false}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        onClick={onOpenGoogleMaps}
        style={{ width: '100%', height: '100%' }}
      >
        {placeData?.location && (
          <AdvancedMarker
            position={placeData.location}
            title={`${placeData.displayName} — Klik untuk buka Google Maps`}
            onClick={onOpenGoogleMaps}
          >
            <div className="flex items-center gap-1.5 cursor-pointer group -translate-y-1">
              {/* Classic Red Google Maps Pin */}
              <div className="relative flex items-center justify-center drop-shadow-md transition-transform group-hover:scale-110">
                <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M16 0C7.163 0 0 7.163 0 16C0 27.25 16 42 16 42C16 42 32 27.25 32 16C32 7.163 24.837 0 16 0Z"
                    fill="#EA4335"
                  />
                  <circle cx="16" cy="15.5" r="6" fill="#991B1B" />
                </svg>
              </div>
              {/* Floating Place Label matching Google Maps style */}
              <span className="px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-xs border border-red-200 shadow-sm text-[12px] font-bold text-[#B91C1C] whitespace-nowrap">
                {placeData.displayName}
              </span>
            </div>
          </AdvancedMarker>
        )}
      </GoogleMap>
    </div>
  );
};

export const GoogleReviewView: React.FC<GoogleReviewViewProps> = ({ currentUser }) => {
  const [areas, setAreas] = useState<Area[]>(() => StorageService.getAreas());
  const [outlets, setOutlets] = useState<Outlet[]>(() => StorageService.getOutlets());

  const [apiKey, setApiKey] = useState<string>(() => {
    return (
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
      (typeof process !== 'undefined' ? (process as any).env?.GOOGLE_MAPS_API_KEY : '') ||
      (globalThis as any).GOOGLE_MAPS_API_KEY ||
      ''
    );
  });
  const [isCheckingConfig, setIsCheckingConfig] = useState<boolean>(() => !apiKey);

  useEffect(() => {
    if (apiKey) {
      setIsCheckingConfig(false);
      return;
    }
    let cancelled = false;
    fetch('/api/maps-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.apiKey) {
          setApiKey(String(data.apiKey));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsCheckingConfig(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    const handleStorageUpdate = (e: any) => {
      const type = e?.detail?.type;
      if (!type || type === 'outlets' || type === 'areas' || type === 'all-reset') {
        setAreas(StorageService.getAreas());
        setOutlets(StorageService.getOutlets());
      }
    };
    window.addEventListener('cinema-xxi-storage-update', handleStorageUpdate);
    return () => window.removeEventListener('cinema-xxi-storage-update', handleStorageUpdate);
  }, []);

  const isManagerLocked = currentUser?.role === 'manager' && Boolean(currentUser?.outletId);

  const permittedAreas = useMemo(() => {
    if (currentUser?.role === 'area_manager') {
      const allowedIds = new Set<string>(
        currentUser.assignedAreas && currentUser.assignedAreas.length > 0
          ? currentUser.assignedAreas
          : currentUser.areaId
          ? [currentUser.areaId]
          : []
      );
      if (allowedIds.size > 0) {
        return areas.filter((a) => allowedIds.has(a.id));
      }
    }
    return areas;
  }, [areas, currentUser]);

  const selectableOutlets = useMemo(() => {
    if (isManagerLocked && currentUser?.outletId) {
      return outlets.filter((o) => o.id === currentUser.outletId);
    }
    const areaIds = new Set(permittedAreas.map((a) => a.id));
    return outlets.filter(
      (o) =>
        areaIds.has(o.areaId) &&
        !o.id.startsWith('hs-') &&
        !o.id.startsWith('premiere-')
    );
  }, [outlets, permittedAreas, isManagerLocked, currentUser?.outletId]);

  const [selectedAreaId, setSelectedAreaId] = useState<string>(() => {
    if (currentUser?.role === 'manager' && currentUser?.outletId) {
      const assigned = StorageService.getOutlets().find((o) => o.id === currentUser.outletId);
      if (assigned) return assigned.areaId;
    }
    return permittedAreas[0]?.id || 'ALL';
  });

  const [selectedOutletId, setSelectedOutletId] = useState<string>(() => {
    if (currentUser?.role === 'manager' && currentUser?.outletId) {
      return currentUser.outletId;
    }
    return selectableOutlets[0]?.id || '';
  });

  useEffect(() => {
    if (isManagerLocked && currentUser?.outletId) {
      setSelectedOutletId(currentUser.outletId);
      const assigned = outlets.find((o) => o.id === currentUser.outletId);
      if (assigned) {
        setSelectedAreaId(assigned.areaId);
      }
      return;
    }
    const outletsInArea =
      selectedAreaId === 'ALL'
        ? selectableOutlets
        : selectableOutlets.filter((o) => o.areaId === selectedAreaId);

    if (outletsInArea.length > 0 && !outletsInArea.some((o) => o.id === selectedOutletId)) {
      setSelectedOutletId(outletsInArea[0].id);
    }
  }, [isManagerLocked, currentUser?.outletId, outlets, selectedAreaId, selectableOutlets, selectedOutletId]);

  const filteredOutlets = useMemo(() => {
    if (isManagerLocked) return selectableOutlets;
    if (selectedAreaId === 'ALL') return selectableOutlets;
    return selectableOutlets.filter((o) => o.areaId === selectedAreaId);
  }, [isManagerLocked, selectableOutlets, selectedAreaId]);

  const activeOutlet = useMemo(() => {
    return (
      outlets.find((o) => o.id === selectedOutletId) ||
      filteredOutlets[0] ||
      selectableOutlets[0]
    );
  }, [outlets, selectedOutletId, filteredOutlets, selectableOutlets]);

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState('');
  const [addressSavedToast, setAddressSavedToast] = useState(false);
  const [activeTab, setActiveTab] = useState<PlaceTab>('ringkasan');
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setIsEditingAddress(false);
    setAddressDraft(activeOutlet?.address || '');
    setActiveTab('ringkasan');
  }, [activeOutlet?.id, activeOutlet?.address]);

  const [placeData, setPlaceData] = useState<LivePlaceDetails | null>(null);
  const [isLoadingPlace, setIsLoadingPlace] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const mapsLinkRef = useRef<HTMLAnchorElement | null>(null);
  const searchQuery = useMemo(() => buildDefaultMapsQuery(activeOutlet), [activeOutlet]);

  // Fetch rich live Place details (photo, rating, reviews, address, website, phone, coordinates)
  useEffect(() => {
    if (!searchQuery) return;
    let cancelled = false;
    setIsLoadingPlace(true);
    setPlaceData(null);

    fetch(`/api/maps-place?q=${encodeURIComponent(searchQuery)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          if (res.status === 429 || data?.quotaExceeded) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
          return null;
        }
        return data;
      })
      .then((data) => {
        if (!cancelled && data?.place) {
          setPlaceData(data.place);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingPlace(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchQuery, refreshTick]);

  const targetGoogleMapsUrl = useMemo(() => {
    if (placeData?.googleMapsURI) {
      return placeData.googleMapsURI;
    }
    return buildFallbackMapsUrl(searchQuery);
  }, [placeData?.googleMapsURI, searchQuery]);

  const targetDirectionsUrl = useMemo(() => {
    return buildDirectionsUrl(searchQuery, placeData?.location);
  }, [searchQuery, placeData?.location]);

  const handleOpenGoogleMaps = () => {
    if (mapsLinkRef.current) {
      mapsLinkRef.current.click();
    }
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(targetGoogleMapsUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      handleOpenGoogleMaps();
    }
  };

  const handleSaveAddressToDatabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOutlet) return;
    const updated = StorageService.saveOutlet({
      ...activeOutlet,
      address: addressDraft.trim(),
    });
    setOutlets(updated);
    setIsEditingAddress(false);
    setAddressSavedToast(true);
    setRefreshTick((t) => t + 1);
    setTimeout(() => setAddressSavedToast(false), 2500);
  };

  const displayTitle = placeData?.displayName || formatOutletSearchName(activeOutlet);
  const displayRating = placeData?.rating;
  const displayReviewCount = placeData?.userRatingCount;

  const renderStars = (score: number) => {
    const rounded = Math.round(score);
    return (
      <div className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((starIdx) => (
          <Star
            key={starIdx}
            className={`w-3.5 h-3.5 ${
              starIdx <= rounded
                ? 'fill-amber-400 text-amber-400'
                : 'fill-slate-200 text-slate-200'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3.5">
      {/* Hidden native anchor for direct Google Maps launch on map/pin click */}
      <a
        ref={mapsLinkRef}
        href={targetGoogleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden"
        aria-hidden="true"
      >
        Buka Google Maps
      </a>

      {/* Top Outlet Selection & Database Address Bar */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-3.5 sm:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#581c87] to-[#7C3AED] text-[#FACC15] flex items-center justify-center shrink-0 shadow-xs">
              <MapPin className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-[#111827] tracking-tight">
                  Google Review &bull; Google Maps
                </h1>
                {isManagerLocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-[#581c87] border border-purple-200 text-[10px] font-bold">
                    <Lock className="w-3 h-3" />
                    Sesuai Login Outlet
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#6B7280] truncate">
                Klik langsung pada peta atau pin lokasi untuk masuk ke halaman Google Maps &amp; ulasan outlet.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isManagerLocked && (
              <>
                <select
                  value={selectedAreaId}
                  onChange={(e) => setSelectedAreaId(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-[#E5E7EB] bg-[#F8F9FC] text-xs font-semibold text-[#374151] focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {currentUser?.role === 'admin' && <option value="ALL">Semua Area</option>}
                  {permittedAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>

                <select
                  value={activeOutlet?.id || ''}
                  onChange={(e) => setSelectedOutletId(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-[#E5E7EB] bg-white text-xs font-bold text-[#111827] focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[205px]"
                >
                  {filteredOutlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            {isManagerLocked && activeOutlet && (
              <div className="h-9 px-3 rounded-xl border border-purple-200 bg-purple-50/70 flex items-center gap-2 text-xs font-extrabold text-[#4A1D6A]">
                <Building2 className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span>{activeOutlet.name}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsEditingAddress((prev) => !prev)}
              className="h-9 px-3 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F8F9FC] text-xs font-semibold text-[#374151] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sesuaikan alamat outlet di database"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>Alamat Database</span>
            </button>

            <a
              href={targetGoogleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-[#581c87] to-[#6D28D9] hover:from-[#4c1d95] hover:to-[#581c87] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-all"
            >
              <span>Buka Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#FACC15]" />
            </a>
          </div>
        </div>

        {isEditingAddress && activeOutlet && (
          <form
            onSubmit={handleSaveAddressToDatabase}
            className="mt-3 pt-3 border-t border-[#E5E7EB] flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <input
              type="text"
              value={addressDraft}
              onChange={(e) => setAddressDraft(e.target.value)}
              placeholder={`Masukkan alamat lengkap ${activeOutlet.name} di database (opsional)...`}
              className="flex-1 h-9 px-3 rounded-xl border border-[#D1D5DB] text-xs text-[#111827] focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Alamat</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingAddress(false)}
                className="h-9 px-3 rounded-xl border border-[#E5E7EB] text-xs font-semibold text-[#6B7280] hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
            </div>
          </form>
        )}

        {addressSavedToast && (
          <div className="mt-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
            Alamat outlet berhasil disimpan ke database &amp; peta diperbarui.
          </div>
        )}
      </div>

      {/* Main Split Google Maps View matching Screenshot */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col lg:flex-row min-h-[600px]">
        {/* LEFT PANEL: Google Maps Place Sidebar Card */}
        <div className="w-full lg:w-[375px] xl:w-[395px] shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-[#E5E7EB] flex flex-col relative z-10">
          {/* Top Floating Search Pill */}
          <div className="p-3 pb-2 bg-white">
            <div className="h-10 px-3.5 rounded-full border border-[#D1D5DB] bg-white shadow-2xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Search className="w-4 h-4 text-[#6B7280] shrink-0" />
                <span className="text-xs font-semibold text-[#111827] truncate">
                  {displayTitle}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setRefreshTick((t) => t + 1)}
                title="Muat ulang data Google Maps"
                className="p-1 rounded-full hover:bg-slate-100 text-[#6B7280] hover:text-[#111827] cursor-pointer shrink-0"
              >
                {isLoadingPlace ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F766E]" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Place Hero Image (from live Google Places photo) */}
          <a
            href={targetGoogleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative h-[175px] w-full bg-slate-100 overflow-hidden group"
            title="Klik untuk membuka galeri foto di Google Maps"
          >
            {placeData?.photoUrl ? (
              <img
                src={placeData.photoUrl}
                alt={displayTitle}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#3D1A5E] via-[#581c87] to-[#4c1d95] text-white">
                {isLoadingPlace ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[#FACC15]" />
                ) : (
                  <MapPin className="w-7 h-7 text-[#FACC15]" />
                )}
                <span className="text-xs font-bold tracking-wide">{displayTitle}</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />
            <span className="absolute bottom-2 right-2.5 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-semibold inline-flex items-center gap-1">
              <span>Google Maps</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </span>
          </a>

          {/* Place Title, Rating & Category */}
          <div className="px-4 pt-3.5 pb-2">
            <a
              href={targetGoogleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[19px] font-bold text-[#111827] hover:text-[#0F766E] leading-snug transition-colors"
            >
              {displayTitle}
            </a>

            <div className="mt-1 flex items-center flex-wrap gap-1.5 text-xs">
              {displayRating !== undefined ? (
                <>
                  <span className="font-bold text-[#111827]">
                    {displayRating.toFixed(1).replace('.', ',')}
                  </span>
                  {renderStars(displayRating)}
                  {displayReviewCount !== undefined && (
                    <span className="text-[#6B7280]">
                      ({displayReviewCount.toLocaleString('id-ID')})
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[#6B7280]">
                  {isLoadingPlace ? 'Mengambil rating Google...' : 'Lihat rating di Google Maps'}
                </span>
              )}
            </div>

            <div className="mt-1 flex items-center gap-2 text-xs text-[#6B7280]">
              <span>{placeData?.primaryTypeDisplayName || 'Bioskop'}</span>
              {typeof placeData?.openNow === 'boolean' && (
                <>
                  <span>&bull;</span>
                  <span
                    className={`font-semibold ${
                      placeData.openNow ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {placeData.openNow ? 'Buka' : 'Tutup'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 3 Google Maps Tabs: Ringkasan | Ulasan | Tentang */}
          <div className="flex border-b border-[#E5E7EB] px-2">
            {(
              [
                { key: 'ringkasan', label: 'Ringkasan' },
                { key: 'ulasan', label: 'Ulasan' },
                { key: 'tentang', label: 'Tentang' },
              ] as { key: PlaceTab; label: string }[]
            ).map((tab) => {
              const isTabActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2.5 text-xs font-semibold text-center relative cursor-pointer transition-colors ${
                    isTabActive ? 'text-[#0F766E]' : 'text-[#6B7280] hover:text-[#111827]'
                  }`}
                >
                  {tab.label}
                  {isTabActive && (
                    <span className="absolute bottom-0 left-4 right-4 h-[3px] rounded-t-full bg-[#0F766E]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Panel Content */}
          <div className="flex-1 overflow-y-auto max-h-[340px] lg:max-h-[365px]">
            {activeTab === 'ringkasan' && (
              <div>
                {/* Action Circles Row matching Screenshot */}
                <div className="grid grid-cols-4 gap-1 px-3 py-3.5 border-b border-[#F3F4F6]">
                  <a
                    href={targetDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1.5 group text-center"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#0F766E] text-white flex items-center justify-center shadow-xs group-hover:bg-[#115E59] transition-colors">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-[#0F766E]">Rute</span>
                  </a>

                  <a
                    href={targetGoogleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1.5 group text-center"
                  >
                    <div className="w-9 h-9 rounded-full border border-[#A7F3D0] bg-teal-50/70 text-[#0F766E] flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-[#0F766E]">Buka Maps</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setActiveTab('ulasan')}
                    className="flex flex-col items-center gap-1.5 group text-center cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full border border-[#A7F3D0] bg-teal-50/70 text-[#0F766E] flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-[#0F766E]">Ulasan</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="flex flex-col items-center gap-1.5 group text-center cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full border border-[#A7F3D0] bg-teal-50/70 text-[#0F766E] flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                      {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                    </div>
                    <span className="text-[11px] font-semibold text-[#0F766E]">
                      {copiedLink ? 'Tersalin' : 'Bagikan'}
                    </span>
                  </button>
                </div>

                {/* Info Rows (Address, Website, Phone, Hours) */}
                <div className="divide-y divide-[#F3F4F6]">
                  <a
                    href={targetGoogleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                    <span className="text-xs text-[#1F2937] leading-relaxed">
                      {placeData?.formattedAddress ||
                        activeOutlet?.address ||
                        'Klik untuk melihat alamat lengkap di Google Maps'}
                    </span>
                  </a>

                  {placeData?.websiteURI && (
                    <a
                      href={placeData.websiteURI}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <Globe className="w-4 h-4 text-[#0F766E] shrink-0" />
                      <span className="text-xs text-[#1F2937] truncate">
                        {placeData.websiteURI.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')}
                      </span>
                    </a>
                  )}

                  {placeData?.nationalPhoneNumber && (
                    <a
                      href={`tel:${placeData.nationalPhoneNumber.replace(/\s+/g, '')}`}
                      className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <Phone className="w-4 h-4 text-[#0F766E] shrink-0" />
                      <span className="text-xs text-[#1F2937]">
                        {placeData.nationalPhoneNumber}
                      </span>
                    </a>
                  )}

                  {placeData?.weekdayDescriptions && placeData.weekdayDescriptions.length > 0 && (
                    <div className="px-4 py-3 flex items-start gap-3">
                      <Clock className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                      <div className="text-xs text-[#1F2937]">
                        <div className="font-semibold text-emerald-700 mb-1">
                          {placeData.openNow === true
                            ? 'Buka sekarang'
                            : placeData.openNow === false
                            ? 'Tutup sementara'
                            : 'Jam Operasional'}
                        </div>
                        <div className="text-[11px] text-[#6B7280]">
                          {placeData.weekdayDescriptions[0]}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'ulasan' && (
              <div className="p-4 space-y-3">
                <a
                  href={targetGoogleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  <span>Buka Semua Ulasan di Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {placeData?.reviews && placeData.reviews.length > 0 ? (
                  <div className="space-y-3 divide-y divide-[#F3F4F6]">
                    {placeData.reviews.map((rev, idx) => (
                      <div key={idx} className={idx > 0 ? 'pt-3' : ''}>
                        <div className="flex items-center gap-2">
                          {rev.authorPhotoUrl ? (
                            <img
                              src={rev.authorPhotoUrl}
                              alt={rev.authorName}
                              className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-purple-100 text-[#581c87] text-[11px] font-bold flex items-center justify-center shrink-0">
                              {rev.authorName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-[#111827] truncate">
                              {rev.authorName}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {renderStars(rev.rating)}
                              {rev.relativeTime && (
                                <span className="text-[10px] text-[#6B7280]">
                                  {rev.relativeTime}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {rev.text && (
                          <p className="mt-1.5 text-[11px] text-[#374151] leading-relaxed">
                            {rev.text}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-[#6B7280]">
                    {isLoadingPlace
                      ? 'Mengambil ulasan terbaru dari Google...'
                      : 'Klik tombol di atas untuk melihat dan membalas ulasan langsung di Google Maps.'}
                  </div>
                )}

                <div className="pt-2 text-[10px] text-[#9CA3AF] text-center">
                  Ulasan &amp; rating bersumber langsung dari Google Maps
                </div>
              </div>
            )}

            {activeTab === 'tentang' && (
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-[#111827] mb-1.5">
                    Jam Operasional Mingguan
                  </h3>
                  {placeData?.weekdayDescriptions && placeData.weekdayDescriptions.length > 0 ? (
                    <ul className="space-y-1 text-[11px] text-[#374151]">
                      {placeData.weekdayDescriptions.map((line, i) => (
                        <li key={i} className="flex justify-between py-0.5 border-b border-slate-50">
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[#6B7280]">
                      Informasi jam operasional lengkap tersedia di halaman resmi Google Maps.
                    </p>
                  )}
                </div>

                <a
                  href={targetGoogleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-xl border border-[#0F766E] text-[#0F766E] hover:bg-teal-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Lihat Profil Lengkap di Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Full Interactive Google Map (Clicking directly opens Google Maps!) */}
        <div className="flex-1 relative h-[500px] lg:h-[640px] bg-slate-100">
          {isCheckingConfig ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#6B7280]">
              <Loader2 className="w-6 h-6 animate-spin text-[#0F766E]" />
              <span className="text-xs font-semibold">Menyiapkan peta Google Maps...</span>
            </div>
          ) : apiKey && activeOutlet ? (
            <APIProvider
              apiKey={apiKey}
              libraries={['places', 'marker']}
              language="id"
              region="ID"
            >
              <InteractiveOutletMap
                outlet={activeOutlet}
                searchQuery={searchQuery}
                refreshTick={refreshTick}
                placeData={placeData}
                mapType={mapType}
                onClientPlaceResolved={(resolved) =>
                  setPlaceData((prev) => prev || resolved)
                }
                onOpenGoogleMaps={handleOpenGoogleMaps}
              />
            </APIProvider>
          ) : (
            <div className="w-full h-full relative bg-slate-100">
              <iframe
                key={`${searchQuery}_${mapType}`}
                title={`Peta Lokasi ${displayTitle}`}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(searchQuery)}&t=${
                  mapType === 'hybrid' ? 'k' : 'm'
                }&z=16&hl=id&ie=UTF8&iwloc=&output=embed`}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              {currentUser?.role === 'admin' && (
                <div className="absolute bottom-6 right-3 z-10 max-w-xs bg-white/95 backdrop-blur-xs border border-amber-200 shadow-md rounded-xl px-3 py-2 text-[11px] text-amber-900 leading-snug">
                  <strong className="block text-amber-950">Info Admin:</strong>
                  Tambahkan <code className="font-mono font-bold">GOOGLE_MAPS_API_KEY</code> di Variables Cloudflare lalu redeploy agar foto, rating &amp; daftar ulasan muncul otomatis.
                </div>
              )}
            </div>
          )}

          {/* Top-right floating hint to enter Google Maps */}
          <a
            href={targetGoogleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-full bg-white/95 hover:bg-white backdrop-blur-xs border border-[#E5E7EB] shadow-md text-[11px] font-bold text-[#111827] hover:text-[#0F766E] inline-flex items-center gap-1.5 transition-all"
          >
            <span>Klik peta untuk buka Google Maps</span>
            <ExternalLink className="w-3 h-3 text-[#0F766E]" />
          </a>

          {/* Bottom-left Map Layers ("Lapisan") Toggle matching screenshot */}
          <button
            type="button"
            onClick={() => setMapType((prev) => (prev === 'roadmap' ? 'hybrid' : 'roadmap'))}
            className="absolute bottom-6 left-3 z-10 w-16 h-16 rounded-xl border-2 border-white shadow-lg overflow-hidden bg-slate-800 cursor-pointer group"
            title="Ubah lapisan peta (Peta / Satelit)"
          >
            <div
              className={`w-full h-full flex flex-col items-center justify-end p-1.5 transition-colors ${
                mapType === 'hybrid'
                  ? 'bg-gradient-to-br from-emerald-800 to-slate-900'
                  : 'bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-50'
              }`}
            >
              <span className="px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold inline-flex items-center gap-1">
                <Layers className="w-2.5 h-2.5" />
                {mapType === 'hybrid' ? 'Peta' : 'Satelit'}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
