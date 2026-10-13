import React, { useState, useEffect, useMemo } from 'react';
import { User, Outlet } from '../../types';
import { StorageService, cleanTitleForCompare } from '../../lib/storage';
import { OccupancyScanModal } from './OccupancyScanModal';
import {
  Download,
  Upload,
  Calendar,
  Building2,
  Film,
  Plus,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

interface RekapOkupansiProps {
  currentUser: User | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

type DateMode = 'single' | 'range';

export interface StudioRowModel {
  id: string;
  outletId: string;
  studioName: string;
  filmTitle: string;
  genre?: string;
  capacity: number;
  shows: { [showNum: number]: number };
  notes: string;
}

const GENRE_BADGES: { [g: string]: string } = {
  Horror: 'bg-rose-100 text-rose-900 border-rose-300 font-extrabold',
  Comedy: 'bg-emerald-100 text-emerald-950 border-emerald-300 font-extrabold',
  Action: 'bg-amber-100 text-amber-950 border-amber-300 font-extrabold',
  Drama: 'bg-blue-100 text-blue-950 border-blue-300 font-extrabold',
  Romance: 'bg-pink-100 text-pink-950 border-pink-300 font-extrabold',
  Thriller: 'bg-orange-100 text-orange-950 border-orange-300 font-extrabold',
  'Sci-Fi': 'bg-cyan-100 text-cyan-950 border-cyan-300 font-extrabold',
  Adventure: 'bg-lime-100 text-lime-950 border-lime-300 font-extrabold',
  Fantasy: 'bg-violet-100 text-violet-950 border-violet-300 font-extrabold',
  Animation: 'bg-indigo-100 text-indigo-950 border-indigo-300 font-extrabold',
  Family: 'bg-purple-100 text-purple-950 border-purple-300 font-extrabold',
  Religion: 'bg-yellow-100 text-yellow-950 border-yellow-400 font-extrabold',
  Biography: 'bg-teal-100 text-teal-950 border-teal-300 font-extrabold',
};

export const RekapOkupansi: React.FC<RekapOkupansiProps> = ({
  currentUser,
  selectedDate,
  onDateChange,
}) => {
  const areas = useMemo(() => StorageService.getAreas(), []);
  const rawOutlets = useMemo(() => StorageService.getOutlets(), []);
  const isManagerOrCleaner = (currentUser?.role === 'manager' || currentUser?.role === 'cleaner') && currentUser?.outletId;
  const outlets = useMemo(() => {
    return isManagerOrCleaner
      ? rawOutlets.filter((o) => o.id === currentUser?.outletId)
      : rawOutlets;
  }, [rawOutlets, isManagerOrCleaner, currentUser?.outletId]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'area_manager';

  // 1. Date filter state: Single or Range
  const [dateMode, setDateMode] = useState<DateMode>('single');
  const [startDate, setStartDate] = useState<string>(selectedDate);
  const [endDate, setEndDate] = useState<string>(selectedDate);

  // Sync startDate with selectedDate if single
  useEffect(() => {
    if (dateMode === 'single') {
      setStartDate(selectedDate);
      setEndDate(selectedDate);
    }
  }, [selectedDate, dateMode]);

  // 2. Outlet & Area filter state
  const [filterType, setFilterType] = useState<'all' | 'area' | 'outlet'>(isManagerOrCleaner ? 'outlet' : 'all');
  const [selectedAreaId, setSelectedAreaId] = useState<string>(areas[0]?.id || '');
  const [selectedOutletId, setSelectedOutletId] = useState<string>(isManagerOrCleaner ? currentUser.outletId! : 'all');
  const [viewTableMode, setViewTableMode] = useState<'detail' | 'studioSummary'>('detail');
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper to generate date list in range
  const dateList = useMemo(() => {
    if (dateMode === 'single') return [selectedDate];
    if (!startDate || !endDate) return [selectedDate];
    const dates: string[] = [];
    const [sY, sM, sD] = startDate.split('-').map(Number);
    const [eY, eM, eD] = endDate.split('-').map(Number);
    if (!sY || !sM || !sD || !eY || !eM || !eD) return [selectedDate];

    const current = new Date(sY, sM - 1, sD);
    const end = new Date(eY, eM - 1, eD);

    if (current > end) {
      return [startDate];
    }
    let count = 0;
    while (current <= end && count < 62) {
      const yStr = current.getFullYear();
      const mStr = String(current.getMonth() + 1).padStart(2, '0');
      const dStr = String(current.getDate()).padStart(2, '0');
      dates.push(`${yStr}-${mStr}-${dStr}`);
      current.setDate(current.getDate() + 1);
      count++;
    }
    return dates;
  }, [dateMode, selectedDate, startDate, endDate]);

  // Outlets filtered based on user selection
  const displayedOutlets = useMemo(() => {
    if (!isAdmin && currentUser?.outletId) {
      return outlets.filter((o) => o.id === currentUser.outletId);
    }
    if (filterType === 'all') {
      return outlets;
    }
    if (filterType === 'area') {
      return outlets.filter((o) => o.areaId === selectedAreaId);
    }
    if (filterType === 'outlet' && selectedOutletId && selectedOutletId !== 'all') {
      return outlets.filter((o) => o.id === selectedOutletId);
    }
    return outlets;
  }, [outlets, isAdmin, currentUser, filterType, selectedAreaId, selectedOutletId]);

  const SHOW_NUMBERS = [1, 2, 3, 4, 5, 6, 7];

  // Helper: Create default studio rows for an outlet
  const createDefaultRowsForOutlet = (outlet: Outlet): StudioRowModel[] => {
    const studiosList = outlet.studios || [];
    return studiosList.map((s, idx) => ({
      id: `${outlet.id}_${s.name}_${idx}`,
      outletId: outlet.id,
      studioName: s.name,
      filmTitle: '',
      genre: 'Action',
      capacity: s.capacity,
      shows: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
      notes: '',
    }));
  };

  // State: In-memory live rows per outlet for current single date
  const [outletRowsMap, setOutletRowsMap] = useState<{
    [outletId: string]: StudioRowModel[];
  }>({});

  // Load/reload records whenever selectedDate changes or storage updates
  useEffect(() => {
    const loadRecords = () => {
      const newMap: { [outletId: string]: StudioRowModel[] } = {};
      outlets.forEach((o) => {
        const saved = StorageService.getOccupancyRecord(o.id, selectedDate);
        if (saved && Array.isArray(saved) && saved.length > 0) {
          const expandedRows: StudioRowModel[] = [];
          saved.forEach((s, idx) => {
            const matched = o.studios?.find(
              (cs) => cs.name.toLowerCase() === s.studioName.toLowerCase()
            );
            const title = (s.filmTitle || s.notes || '').trim();
            const capacity = s.capacity || matched?.capacity || 200;

            if (title.includes(';')) {
              // Otomatis pisahkan judul film gabungan (titik koma) menjadi baris film terpisah di studio yang sama
              const titles = title.split(';').map((t) => t.trim()).filter(Boolean);
              titles.forEach((singleTitle, tIdx) => {
                const detectedGenre = StorageService.resolveFilmGenre(singleTitle, s.genre);
                expandedRows.push({
                  id: `${s.id || `${o.id}_${s.studioName}`}_split_${tIdx}_${idx}_${Date.now()}`,
                  outletId: o.id,
                  studioName: s.studioName,
                  filmTitle: singleTitle,
                  genre: detectedGenre,
                  capacity,
                  shows: tIdx === 0 ? (s.shows || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }) : { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
                  notes: singleTitle,
                });
              });
            } else {
              const detectedGenre = StorageService.resolveFilmGenre(title, s.genre);
              expandedRows.push({
                id: s.id || `${o.id}_${s.studioName}_${idx}`,
                outletId: o.id,
                studioName: s.studioName,
                filmTitle: title,
                genre: detectedGenre,
                capacity,
                shows: s.shows || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
                notes: s.notes || title,
              });
            }
          });
          newMap[o.id] = expandedRows;
        } else {
          newMap[o.id] = createDefaultRowsForOutlet(o);
        }
      });
      setOutletRowsMap(newMap);
    };

    loadRecords();

    window.addEventListener('cinema-xxi-storage-update', loadRecords);
    return () => {
      window.removeEventListener('cinema-xxi-storage-update', loadRecords);
    };
  }, [selectedDate, outlets]);

  // Handler: Change show audience in a row
  const handleShowInputChange = (
    outletId: string,
    rowId: string,
    showNum: number,
    value: number
  ) => {
    setOutletRowsMap((prev) => {
      const rows = prev[outletId] || [];
      const updated = rows.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            shows: {
              ...r.shows,
              [showNum]: value,
            },
          };
        }
        return r;
      });
      StorageService.saveOccupancyRecord(outletId, selectedDate, updated);
      return { ...prev, [outletId]: updated };
    });
  };

  // Handler: Change notes / film title in a row with automatic accurate genre allocation
  const handleNotesChange = (
    outletId: string,
    rowId: string,
    notes: string
  ) => {
    setOutletRowsMap((prev) => {
      const rows = prev[outletId] || [];
      const targetRow = rows.find((r) => r.id === rowId);
      const autoGen = StorageService.resolveFilmGenre(notes, targetRow?.genre);
      const updated = rows.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            notes,
            filmTitle: notes,
            genre: autoGen,
          };
        }
        return r;
      });
      StorageService.saveOccupancyRecord(outletId, selectedDate, updated);
      return { ...prev, [outletId]: updated };
    });
  };

  // Handler: Add a second film row for a studio (multi-film logic)
  const handleAddFilmRow = (outletId: string, studioName: string) => {
    const outlet = outlets.find((o) => o.id === outletId);
    const matched = outlet?.studios?.find(
      (s) => s.name.toLowerCase() === studioName.toLowerCase()
    );
    const capacity = matched?.capacity || 200;

    setOutletRowsMap((prev) => {
      const rows = prev[outletId] || [];
      const newRow: StudioRowModel = {
        id: `${outletId}_${studioName}_film2_${Date.now()}`,
        outletId,
        studioName,
        filmTitle: '',
        capacity,
        shows: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
        notes: '',
      };

      // Find the last index of this studio and insert after it
      const lastIdx = rows.reduce(
        (last, r, i) => (r.studioName.toLowerCase() === studioName.toLowerCase() ? i : last),
        -1
      );
      const updated = [...rows];
      if (lastIdx >= 0) {
        updated.splice(lastIdx + 1, 0, newRow);
      } else {
        updated.push(newRow);
      }

      StorageService.saveOccupancyRecord(outletId, selectedDate, updated);
      return { ...prev, [outletId]: updated };
    });

    setToastMessage(`Baris film baru berhasil ditambahkan untuk ${studioName}!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handler: Delete extra film row (only if more than 1 row exists for this studio)
  const handleDeleteFilmRow = (outletId: string, rowId: string) => {
    setOutletRowsMap((prev) => {
      const rows = prev[outletId] || [];
      const target = rows.find((r) => r.id === rowId);
      if (!target) return prev;

      const studioRows = rows.filter(
        (r) => r.studioName.toLowerCase() === target.studioName.toLowerCase()
      );
      if (studioRows.length <= 1) {
        return prev; // Do not delete the only row of a studio
      }

      const updated = rows.filter((r) => r.id !== rowId);
      StorageService.saveOccupancyRecord(outletId, selectedDate, updated);
      return { ...prev, [outletId]: updated };
    });

    setToastMessage(`Baris film berhasil dihapus.`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Handler: Split combined multi-film titles (titles containing ';') into separate rows
  const handleSplitAllMultiFilmRows = () => {
    let splitCount = 0;
    setOutletRowsMap((prev) => {
      const newMap = { ...prev };
      Object.keys(newMap).forEach((outId) => {
        const rows = newMap[outId] || [];
        const expanded: StudioRowModel[] = [];
        rows.forEach((r) => {
          const title = (r.filmTitle || r.notes || '').trim();
          if (title.includes(';')) {
            splitCount++;
            const titles = title.split(';').map((t) => t.trim()).filter(Boolean);
            titles.forEach((singleTitle, tIdx) => {
              const detectedGenre = StorageService.resolveFilmGenre(singleTitle, r.genre);
              expanded.push({
                id: `${r.id}_split_${tIdx}_${Date.now()}`,
                outletId: r.outletId,
                studioName: r.studioName,
                filmTitle: singleTitle,
                genre: detectedGenre,
                capacity: r.capacity,
                shows: tIdx === 0 ? r.shows : { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
                notes: singleTitle,
              });
            });
          } else {
            expanded.push(r);
          }
        });
        newMap[outId] = expanded;
        StorageService.saveOccupancyRecord(outId, selectedDate, expanded);
      });
      return newMap;
    });

    if (splitCount > 0) {
      setToastMessage(`Berhasil memisahkan film gabungan menjadi baris film terpisah!`);
    } else {
      setToastMessage(`Semua judul film di studio sudah berada dalam baris terpisah.`);
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handler: Applied from OccupancyScanModal
  const handleApplyScanData = (
    outletId: string,
    date: string,
    scannedRows: Array<{
      id: string;
      studioName: string;
      filmTitle: string;
      genre?: string;
      capacity: number;
      shows: { [showNum: number]: number };
      notes: string;
    }>
  ) => {
    const formatted: StudioRowModel[] = [];
    scannedRows.forEach((s, idx) => {
      const title = (s.filmTitle || s.notes || '').trim();
      if (title.includes(';')) {
        const parts = title.split(';').map((t) => t.trim()).filter(Boolean);
        parts.forEach((singleTitle, pIdx) => {
          const genre = StorageService.resolveFilmGenre(singleTitle, s.genre);
          formatted.push({
            id: `${s.id || `${outletId}_${s.studioName}_${idx}`}_split_${pIdx}_${Date.now()}`,
            outletId,
            studioName: s.studioName,
            filmTitle: singleTitle,
            genre,
            capacity: s.capacity,
            shows: pIdx === 0 ? s.shows : { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
            notes: singleTitle,
          });
        });
      } else {
        const genre = StorageService.resolveFilmGenre(title, s.genre);
        formatted.push({
          id: s.id || `${outletId}_${s.studioName}_${idx}`,
          outletId,
          studioName: s.studioName,
          filmTitle: title,
          genre,
          capacity: s.capacity,
          shows: s.shows,
          notes: s.notes || title,
        });
      }
    });

    StorageService.saveOccupancyRecord(outletId, date, formatted);

    setTimeout(() => {
      if (date === selectedDate) {
        setOutletRowsMap((prev) => ({
          ...prev,
          [outletId]: formatted,
        }));
      }

      const targetOutletName =
        outlets.find((o) => o.id === outletId)?.name || 'Bioskop XXI';
      setToastMessage(
        `Data Okupansi ${targetOutletName} berhasil diterapkan (${formatted.length} baris film terpisah & genre teralokasi tepat)!`
      );
      setTimeout(() => setToastMessage(null), 4000);
    }, 0);
  };

  const handleRowGenreChange = (rowId: string, outletId: string, newGenre: string) => {
    // Cari judul film dari tableRows untuk dukungan mode single maupun range
    const aggRow = tableRows.find((r) => r.rowId === rowId && r.outletId === outletId);
    const filmTitle = aggRow?.filmTitle || aggRow?.notes || '';

    if (filmTitle) {
      StorageService.setFilmGenre(filmTitle, newGenre);
    }

    setOutletRowsMap((prev) => {
      const targetOutlet = outlets.find((o) => o.id === outletId);
      const currentRows =
        prev[outletId] || (targetOutlet ? createDefaultRowsForOutlet(targetOutlet) : []);
      const updated = currentRows.map((r) => {
        if (
          r.id === rowId ||
          (filmTitle &&
            cleanTitleForCompare(r.filmTitle || r.notes || '') === cleanTitleForCompare(filmTitle))
        ) {
          return { ...r, genre: newGenre };
        }
        return r;
      });
      StorageService.saveOccupancyRecord(outletId, selectedDate, updated);
      return {
        ...prev,
        [outletId]: updated,
      };
    });
  };

  // Compile aggregated table rows for the view
  interface AggregatedRow {
    outletId: string;
    outletName: string;
    outletClass: string;
    areaName: string;
    rowId: string;
    studioName: string;
    filmTitle: string;
    genre: string;
    capacity: number;
    showAudience: { [showNum: number]: number };
    totalAudience: number;
    activeShows: number;
    totalAvailableSeats: number;
    overallRate: number;
    notes: string;
    isMultiFilmRow: boolean;
    filmIndex: number;
    totalFilmsInStudio: number;
  }

  const tableRows: AggregatedRow[] = useMemo(() => {
    const rows: AggregatedRow[] = [];

    displayedOutlets.forEach((outlet) => {
      const area = areas.find((a) => a.id === outlet.areaId);

      if (dateMode === 'single') {
        // Single date: use live outletRowsMap
        const outletRows = outletRowsMap[outlet.id] || createDefaultRowsForOutlet(outlet);

        // Count how many rows each studioName has
        const studioCountMap: { [sName: string]: number } = {};
        outletRows.forEach((r) => {
          studioCountMap[r.studioName] = (studioCountMap[r.studioName] || 0) + 1;
        });

        const currentFilmIndexMap: { [sName: string]: number } = {};

        outletRows.forEach((r) => {
          const totalFilms = studioCountMap[r.studioName] || 1;
          const currIdx = (currentFilmIndexMap[r.studioName] || 0) + 1;
          currentFilmIndexMap[r.studioName] = currIdx;

          const totalAud = SHOW_NUMBERS.reduce(
            (acc, num) => acc + (r.shows[num] || 0),
            0
          );
          const activeShowsCount =
            SHOW_NUMBERS.filter((num) => (r.shows[num] || 0) > 0).length || 1;
          const totalCap = r.capacity * activeShowsCount;
          const overallRate = totalCap > 0 ? (totalAud / totalCap) * 100 : 0;
          const detectedGenre = StorageService.resolveFilmGenre(r.filmTitle || r.notes || '', r.genre);

          rows.push({
            outletId: outlet.id,
            outletName: outlet.name,
            outletClass: outlet.class || 'A',
            areaName: area?.name || 'Area Bogor & Depok',
            rowId: r.id,
            studioName: r.studioName,
            filmTitle: r.filmTitle,
            genre: detectedGenre,
            capacity: r.capacity,
            showAudience: r.shows,
            totalAudience: totalAud,
            activeShows: activeShowsCount,
            totalAvailableSeats: totalCap,
            overallRate,
            notes: r.notes,
            isMultiFilmRow: totalFilms > 1,
            filmIndex: currIdx,
            totalFilmsInStudio: totalFilms,
          });
        });
      } else {
        // Range date: Aggregate across all dates in dateList by studio AND filmTitle (so multiple films in 1 studio stay split!)
        const baseRows = outlet.studios || [];

        interface FilmEntry {
          studioName: string;
          filmTitle: string;
          genre: string;
          capacity: number;
          shows: { [showNum: number]: number };
          dailyShowsSum: number;
          recordedDatesSet: Set<string>;
        }

        const studioFilmMap = new Map<string, FilmEntry>();

        dateList.forEach((dt) => {
          const saved = StorageService.getOccupancyRecord(outlet.id, dt);
          if (saved && Array.isArray(saved)) {
            saved.forEach((s) => {
              const sName = s.studioName;
              const rawTitle = (s.filmTitle || s.notes || '').trim();
              const titles = rawTitle.includes(';')
                ? rawTitle.split(';').map((t) => t.trim()).filter(Boolean)
                : [rawTitle || 'Film Tanpa Judul'];

              const activeShowsOnThisDate = SHOW_NUMBERS.filter(
                (num) => (s.shows?.[num] || 0) > 0
              ).length;

              titles.forEach((t) => {
                const key = `${sName}___${t}`;
                if (!studioFilmMap.has(key)) {
                  const matchedCap =
                    baseRows.find((bs) => bs.name.toLowerCase() === sName.toLowerCase())
                      ?.capacity || s.capacity || 200;
                  const detectedGenre = StorageService.resolveFilmGenre(t, s.genre);
                  studioFilmMap.set(key, {
                    studioName: sName,
                    filmTitle: t,
                    genre: detectedGenre,
                    capacity: matchedCap,
                    shows: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
                    dailyShowsSum: 0,
                    recordedDatesSet: new Set<string>(),
                  });
                }

                const entry = studioFilmMap.get(key)!;
                SHOW_NUMBERS.forEach((num) => {
                  entry.shows[num] += s.shows?.[num] || 0;
                });
                entry.dailyShowsSum += activeShowsOnThisDate;
                entry.recordedDatesSet.add(dt);
              });
            });
          }
        });

        // Fallback for studios with no data in date range
        if (studioFilmMap.size === 0) {
          baseRows.forEach((studio) => {
            studioFilmMap.set(`${studio.name}___`, {
              studioName: studio.name,
              filmTitle: '',
              genre: 'Action',
              capacity: studio.capacity,
              shows: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
              dailyShowsSum: 0,
              recordedDatesSet: new Set<string>(),
            });
          });
        }

        // Count films per studio for index badges
        const studioCountMap: { [sName: string]: number } = {};
        studioFilmMap.forEach((entry) => {
          studioCountMap[entry.studioName] = (studioCountMap[entry.studioName] || 0) + 1;
        });

        const currentFilmIndexMap: { [sName: string]: number } = {};

        Array.from(studioFilmMap.values()).forEach((entry, idx) => {
          const totalFilms = studioCountMap[entry.studioName] || 1;
          const currIdx = (currentFilmIndexMap[entry.studioName] || 0) + 1;
          currentFilmIndexMap[entry.studioName] = currIdx;

          const totalAud = SHOW_NUMBERS.reduce(
            (acc, num) => acc + (entry.shows[num] || 0),
            0
          );

          const activeSlots = SHOW_NUMBERS.filter(
            (num) => (entry.shows[num] || 0) > 0
          ).length;

          let totalShowsInPeriod = entry.dailyShowsSum || activeSlots;

          if (totalAud === 0) {
            totalShowsInPeriod = 0;
          }

          const totalCap = entry.capacity * totalShowsInPeriod;
          const overallRate = totalCap > 0 ? (totalAud / totalCap) * 100 : 0;

          rows.push({
            outletId: outlet.id,
            outletName: outlet.name,
            outletClass: outlet.class || 'A',
            areaName: area?.name || 'Area Bogor & Depok',
            rowId: `${outlet.id}_${entry.studioName}_${idx}`,
            studioName: entry.studioName,
            filmTitle: entry.filmTitle,
            genre: entry.genre,
            capacity: entry.capacity,
            showAudience: entry.shows,
            totalAudience: totalAud,
            activeShows: totalShowsInPeriod,
            totalAvailableSeats: totalCap,
            overallRate,
            notes: entry.filmTitle,
            isMultiFilmRow: totalFilms > 1,
            filmIndex: currIdx,
            totalFilmsInStudio: totalFilms,
          });
        });
      }
    });

    return rows;
  }, [
    displayedOutlets,
    dateMode,
    selectedDate,
    startDate,
    endDate,
    dateList,
    outletRowsMap,
    areas,
  ]);

  // Aggregated Studio Summary (Tabel Penjumlahan Keterisian Studio - Tanpa Judul Film)
  const studioSummaryList = useMemo(() => {
    const summaryMap: {
      [key: string]: {
        outletId: string;
        outletName: string;
        studioName: string;
        capacity: number;
        totalShowsCount: number;
        totalAudience: number;
        totalCapacity: number;
      };
    } = {};

    tableRows.forEach((row) => {
      const key = `${row.outletId}_${row.studioName.toLowerCase()}`;
      if (!summaryMap[key]) {
        summaryMap[key] = {
          outletId: row.outletId,
          outletName: row.outletName,
          studioName: row.studioName,
          capacity: row.capacity,
          totalShowsCount: 0,
          totalAudience: 0,
          totalCapacity: 0,
        };
      }

      summaryMap[key].totalShowsCount += row.activeShows;
      summaryMap[key].totalAudience += row.totalAudience;
      summaryMap[key].totalCapacity += row.totalAvailableSeats;
    });

    return Object.values(summaryMap).map((s) => {
      const rate = s.totalCapacity > 0 ? (s.totalAudience / s.totalCapacity) * 100 : 0;
      return {
        ...s,
        occupancyRate: Math.round(rate * 10) / 10,
      };
    });
  }, [tableRows]);

  // Overall Metrics
  const totalAudienceAll = tableRows.reduce((acc, r) => acc + r.totalAudience, 0);
  const totalBaseCapacityAll = tableRows.reduce((acc, r) => acc + r.capacity, 0);
  const totalCapacitySlots = tableRows.reduce(
    (acc, r) => acc + r.totalAvailableSeats,
    0
  );
  const overallAvgOccupancy =
    totalCapacitySlots > 0
      ? ((totalAudienceAll / totalCapacitySlots) * 100).toFixed(1)
      : '0.0';

  // Outlet dengan Okupansi Rate Tertinggi
  const topOutletStat = useMemo(() => {
    const map: { [outletId: string]: { name: string; totalAud: number; totalCap: number } } = {};
    tableRows.forEach((r) => {
      if (!map[r.outletId]) {
        map[r.outletId] = { name: r.outletName, totalAud: 0, totalCap: 0 };
      }
      map[r.outletId].totalAud += r.totalAudience;
      map[r.outletId].totalCap += r.totalAvailableSeats;
    });

    const list = Object.values(map).map((item) => {
      const rate = item.totalCap > 0 ? (item.totalAud / item.totalCap) * 100 : 0;
      return { ...item, rate };
    });

    list.sort((a, b) => b.rate - a.rate || b.totalAud - a.totalAud);
    return list[0] || null;
  }, [tableRows]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Outlet',
      'Area',
      'Class',
      'Studio',
      'Kapasitas',
      'Show 1',
      'Show 2',
      'Show 3',
      'Show 4',
      'Show 5',
      'Show 6',
      'Show 7',
      'Total Penonton',
      'Okupansi (%)',
      'Keterangan / Film',
      'Genre',
    ];
    const rows = tableRows.map((r) => {
      const show1Pct =
        r.capacity > 0
          ? Math.round(
              (r.showAudience[1] / (r.capacity * dateList.length)) * 100
            )
          : 0;
      const show2Pct =
        r.capacity > 0
          ? Math.round(
              (r.showAudience[2] / (r.capacity * dateList.length)) * 100
            )
          : 0;
      const show3Pct =
        r.capacity > 0
          ? Math.round(
              (r.showAudience[3] / (r.capacity * dateList.length)) * 100
            )
          : 0;
      const show4Pct =
        r.capacity > 0
          ? Math.round(
              (r.showAudience[4] / (r.capacity * dateList.length)) * 100
            )
          : 0;
      const show5Pct =
        r.capacity > 0
          ? Math.round(
              (r.showAudience[5] / (r.capacity * dateList.length)) * 100
            )
          : 0;
      const show6Pct =
        r.capacity > 0
          ? Math.round(
              (r.showAudience[6] / (r.capacity * dateList.length)) * 100
            )
          : 0;
      const show7Pct =
        r.capacity > 0
          ? Math.round(
              (r.showAudience[7] / (r.capacity * dateList.length)) * 100
            )
          : 0;

      return [
        `"${r.outletName}"`,
        `"${r.areaName}"`,
        r.outletClass,
        `"${r.studioName}${r.isMultiFilmRow ? ` (Film ${r.filmIndex})` : ''}"`,
        r.capacity,
        `"${r.showAudience[1]}/${show1Pct}%"`,
        `"${r.showAudience[2]}/${show2Pct}%"`,
        `"${r.showAudience[3]}/${show3Pct}%"`,
        `"${r.showAudience[4]}/${show4Pct}%"`,
        `"${r.showAudience[5]}/${show5Pct}%"`,
        `"${r.showAudience[6]}/${show6Pct}%"`,
        `"${r.showAudience[7]}/${show7Pct}%"`,
        r.totalAudience,
        `${r.overallRate.toFixed(1)}%`,
        `"${r.notes}"`,
        `"${r.genre || '-'}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `okupansi_${dateMode === 'range' ? `${startDate}_sd_${endDate}` : selectedDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Count unique film titles (Jumlah Film)
  const uniqueFilmsCount = useMemo(() => {
    const filmSet = new Set<string>();
    tableRows.forEach((r) => {
      const title = cleanTitleForCompare(r.filmTitle || r.notes || '');
      if (title && title.length > 1) {
        filmSet.add(title);
      }
    });
    return filmSet.size;
  }, [tableRows]);

  // Top Metric Cards (5 Cards)
  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="p-6 rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] uppercase">
              Analisis Tingkat Keterisian Penonton
            </span>
            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-bold text-[10px]">
              {dateMode === 'range'
                ? `Rentang: ${startDate} s/d ${endDate}`
                : `Tanggal: ${selectedDate}`}
            </span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center space-x-2 mt-1 text-slate-900">
            <span>📈 Okupansi Rate Cinema (Pershow &amp; Harian)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Menghitung persentase okupansi per show (Show 1 s/d 7 format penonton/%) dan akumulasi kapasitas studio. Mendukung multi-film per studio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Upload / Scan Okupansi Button */}
          <button
            onClick={() => setIsScanModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-700 to-amber-600 hover:from-cyan-600 hover:to-amber-500 text-white flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
            title="Upload & Scan Laporan Okupansi (Mendukung PDF Multi-Slide dengan Mistral OCR)"
          >
            <Upload className="w-4 h-4" />
            <span>Scan Okupansi (PDF Multi-Slide / OCR)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Unduh Laporan CSV</span>
          </button>
        </div>
      </div>

      {/* 5 Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Penonton
          </span>
          <p className="text-2xl font-black text-emerald-800 mt-2">
            {totalAudienceAll.toLocaleString('id-ID')}
          </p>
          <span className="text-xs text-slate-400 font-semibold block mt-0.5">
            {totalAudienceAll > 0 ? 'Penonton Terdata' : 'Belum Ada Penonton'}
          </span>
        </div>

        <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Rata-Rata Okupansi
          </span>
          <p className="text-2xl font-black text-amber-800 mt-2">
            {overallAvgOccupancy}%
          </p>
          <span className="text-xs text-slate-400 font-semibold block mt-0.5">
            Rerata Tingkat Kursi
          </span>
        </div>

        <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Jumlah Film Tayang
          </span>
          <p className="text-2xl font-black text-indigo-900 mt-2">
            {uniqueFilmsCount} Film
          </p>
          <span className="text-xs text-slate-400 font-semibold block mt-0.5">
            Judul Film Berbeda
          </span>
        </div>

        <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Kursi Studio
          </span>
          <p className="text-2xl font-black text-cyan-800 mt-2">
            {totalBaseCapacityAll.toLocaleString('id-ID')}
          </p>
          <span className="text-xs text-slate-400 font-semibold block mt-0.5">
            Kapasitas {displayedOutlets.length} Outlet
          </span>
        </div>

        <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            OKUPANSI TERTINGGI
          </span>
          <p
            className="text-lg font-black text-purple-900 mt-2 truncate"
            title={topOutletStat && topOutletStat.totalAud > 0 ? topOutletStat.name : '-'}
          >
            {topOutletStat && topOutletStat.totalAud > 0 ? topOutletStat.name : '-'}
          </p>
          <span className="text-xs text-emerald-700 font-bold block mt-0.5">
            {topOutletStat && topOutletStat.totalAud > 0
              ? `${topOutletStat.rate.toFixed(1)}% Okupansi (${topOutletStat.totalAud.toLocaleString('id-ID')} penonton)`
              : 'Belum ada data penonton'}
          </span>
        </div>
      </div>

      {/* FILTER ROW: Date Mode + Outlet Selector (Semua / Area / Outlet) */}
      <div className="p-5 rounded-3xl border border-amber-200/90 bg-white text-slate-800 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Bagian 1: Filter Tanggal & Rentang Tanggal */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setDateMode('single')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  dateMode === 'single'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1 Tanggal
              </button>
              <button
                type="button"
                onClick={() => setDateMode('range')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  dateMode === 'range'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rentang Tanggal
              </button>
            </div>

            {dateMode === 'single' ? (
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-600">Tanggal:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-2xs focus:border-amber-400"
                />
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-amber-50/50 p-1.5 rounded-xl border border-amber-200">
                <span className="text-xs font-bold text-amber-900 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>Dari:</span>
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:border-amber-400"
                />
                <span className="text-xs font-bold text-amber-900">s/d:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:border-amber-400"
                />
              </div>
            )}
          </div>

          {/* Info status badge (sama persis di semua filter) */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-500">
              Menampilkan {displayedOutlets.length} outlet ({tableRows.length} baris studio)
            </span>
            {dateMode === 'single' && (
              <span className="text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Mode Input Aktif
              </span>
            )}
          </div>
        </div>

        {/* Bagian 2: Filter Outlet (Semua Outlet, Pilihan Area, atau Outlet Spesifik) */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <span className="text-xs font-extrabold text-amber-900 uppercase flex items-center space-x-1">
            <Building2 className="w-4 h-4 text-amber-600" />
            <span>Filter Bioskop:</span>
          </span>

          {/* Mode Selector: Semua Outlet / Per Area / Per Outlet */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setFilterType('all');
                setSelectedOutletId('all');
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Outlet ({outlets.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterType('area');
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                filterType === 'area'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pilihan Area
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterType('outlet');
                if (selectedOutletId === 'all' && outlets.length > 0) {
                  setSelectedOutletId(outlets[0].id);
                }
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                filterType === 'outlet'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Per Outlet
            </button>
          </div>

          {/* Dropdown Area jika mode = area */}
          {filterType === 'area' && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-600">Pilih Area:</span>
              <select
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-amber-900 shadow-2xs focus:border-amber-400"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dropdown Outlet jika mode = outlet */}
          {filterType === 'outlet' && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-600">Pilih Outlet:</span>
              <select
                value={selectedOutletId}
                disabled={!isAdmin && !!currentUser?.outletId}
                onChange={(e) => setSelectedOutletId(e.target.value)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-amber-900 shadow-2xs focus:border-amber-400"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Studio Occupancy Table */}
      <div className="p-6 rounded-3xl border border-slate-200/90 bg-white text-slate-800 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-black uppercase text-slate-900 tracking-tight">
              Tabel Rekapitulasi Okupansi Rate
            </h3>

            {/* View Mode Toggle: Detail Per Film vs Penjumlahan Studio */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewTableMode('detail')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  viewTableMode === 'detail'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🎥 Detail Per Film
              </button>
              <button
                type="button"
                onClick={() => setViewTableMode('studioSummary')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  viewTableMode === 'studioSummary'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📊 Penjumlahan Per Studio (Tanpa Film)
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {viewTableMode === 'detail' && (
              <button
                type="button"
                onClick={handleSplitAllMultiFilmRows}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-700 hover:bg-purple-600 text-white flex items-center space-x-1.5 transition shadow-2xs cursor-pointer"
                title="Pisahkan film gabungan menjadi baris terpisah per studio"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Pisah Baris Film</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsScanModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center space-x-1.5 transition shadow-2xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Scan Laporan (Gambar / PDF)</span>
            </button>
          </div>
        </div>

        {viewTableMode === 'studioSummary' ? (
          /* TABEL PENJUMLAHAN KETERISIAN STUDIO (TANPA FILM) */
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="uppercase text-[11px] font-black border-b border-slate-200 bg-slate-50 text-slate-700 tracking-wider">
                <tr>
                  <th className="py-3.5 px-3.5 border-r border-slate-200">NAMA OUTLET</th>
                  <th className="py-3.5 px-3.5 border-r border-slate-200">STUDIO</th>
                  <th className="py-3.5 px-3.5 text-center border-r border-slate-200">KAPASITAS KURSI</th>
                  <th className="py-3.5 px-3 text-center border-r border-slate-200">TOTAL PERTUNJUKAN</th>
                  <th className="py-3.5 px-3.5 text-center border-r border-slate-200">TOTAL PENONTON</th>
                  <th className="py-3.5 px-3.5 text-center border-r border-slate-200">TOTAL KAPASITAS SEAT</th>
                  <th className="py-3.5 px-3.5 text-center">RATA-RATA OKUPANSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {studioSummaryList.map((row, idx) => {
                  const isFirstOfOutlet =
                    idx === 0 || studioSummaryList[idx - 1].outletId !== row.outletId;
                  const outletRowCount = studioSummaryList.filter(
                    (r) => r.outletId === row.outletId
                  ).length;

                  return (
                    <tr
                      key={`${row.outletId}_${row.studioName}`}
                      className="hover:bg-amber-50/40 transition bg-white"
                    >
                      {isFirstOfOutlet && (
                        <td
                          rowSpan={outletRowCount}
                          className="py-3.5 px-3.5 font-black text-amber-950 bg-amber-50/30 border-r border-slate-200 align-top"
                        >
                          {row.outletName}
                        </td>
                      )}
                      <td className="py-3.5 px-3.5 font-black text-slate-800 border-r border-slate-200">
                        {row.studioName}
                      </td>
                      <td className="py-3.5 px-3.5 text-center font-bold text-slate-700 border-r border-slate-200">
                        {row.capacity.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-700 border-r border-slate-200">
                        {row.totalShowsCount} Show
                      </td>
                      <td className="py-3.5 px-3.5 text-center font-black text-emerald-800 border-r border-slate-200">
                        {row.totalAudience.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-3.5 text-center font-bold text-slate-600 border-r border-slate-200">
                        {row.totalCapacity.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-3.5 text-center font-black">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs border font-extrabold ${
                            row.occupancyRate >= 60
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : row.occupancyRate >= 30
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-rose-100 text-rose-900 border-rose-300'
                          }`}
                        >
                          {row.occupancyRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-black uppercase text-xs">
                <tr>
                  <td colSpan={2} className="py-3.5 px-3.5 border-r border-slate-700">
                    TOTAL AKUMULASI DARI {studioSummaryList.length} STUDIO
                  </td>
                  <td className="py-3.5 px-3 text-center border-r border-slate-700">
                    {studioSummaryList.reduce((acc, s) => acc + s.capacity, 0).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-3 text-center border-r border-slate-700">
                    {studioSummaryList.reduce((acc, s) => acc + s.totalShowsCount, 0)} Show
                  </td>
                  <td className="py-3.5 px-3.5 text-center text-amber-400 border-r border-slate-700">
                    {studioSummaryList.reduce((acc, s) => acc + s.totalAudience, 0).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-3.5 text-center text-slate-300 border-r border-slate-700">
                    {studioSummaryList.reduce((acc, s) => acc + s.totalCapacity, 0).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-3.5 text-center text-emerald-400">
                    {(() => {
                      const totAud = studioSummaryList.reduce((acc, s) => acc + s.totalAudience, 0);
                      const totCap = studioSummaryList.reduce((acc, s) => acc + s.totalCapacity, 0);
                      return totCap > 0 ? ((totAud / totCap) * 100).toFixed(1) + '%' : '0.0%';
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          /* TABEL DETAIL PER FILM */
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="uppercase text-[11px] font-black border-b border-slate-200 bg-slate-50 text-slate-700 tracking-wider">
              <tr>
                <th className="py-3.5 px-3.5 border-r border-slate-200">NAMA OUTLET</th>
                <th className="py-3.5 px-3 border-r border-slate-200">STUDIO</th>
                <th className="py-3.5 px-3 text-center border-r border-slate-200">KAPASITAS</th>
                <th className="py-3.5 px-2 text-center min-w-[85px] border-r border-slate-100">SHOW 1</th>
                <th className="py-3.5 px-2 text-center min-w-[85px] border-r border-slate-100">SHOW 2</th>
                <th className="py-3.5 px-2 text-center min-w-[85px] border-r border-slate-100">SHOW 3</th>
                <th className="py-3.5 px-2 text-center min-w-[85px] border-r border-slate-100">SHOW 4</th>
                <th className="py-3.5 px-2 text-center min-w-[85px] border-r border-slate-100">SHOW 5</th>
                <th className="py-3.5 px-2 text-center min-w-[85px] border-r border-slate-100">SHOW 6</th>
                <th className="py-3.5 px-2 text-center min-w-[85px] border-r border-slate-200">SHOW 7</th>
                <th className="py-3.5 px-3 text-center border-r border-slate-200 min-w-[110px]">TOTAL OKUPANSI</th>
                <th className="py-3.5 px-3 min-w-[200px] border-r border-slate-200">KETERANGAN / JUDUL FILM</th>
                <th className="py-3.5 px-2.5 text-center min-w-[100px]">GENRE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {tableRows.map((row, idx) => {
                // Determine whether this row is the start of an outlet group for rowSpan
                const isFirstOfOutlet =
                  idx === 0 || tableRows[idx - 1].outletId !== row.outletId;
                const outletRowCount = tableRows.filter(
                  (r) => r.outletId === row.outletId
                ).length;

                return (
                  <tr
                    key={row.rowId}
                    className={`hover:bg-amber-50/40 transition ${
                      row.isMultiFilmRow ? 'bg-purple-50/20' : idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                    }`}
                  >
                    {isFirstOfOutlet && (
                      <td
                        rowSpan={outletRowCount}
                        className="py-3.5 px-3.5 font-extrabold text-amber-950 align-top border-r border-slate-200 bg-white"
                      >
                        <div className="text-xs font-black text-amber-900">
                          {row.outletName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                          {row.areaName}
                        </div>
                      </td>
                    )}

                    {/* Studio Name dengan Tombol Tambah & Hapus Baris Film */}
                    <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap border-r border-slate-200">
                      <div className="flex items-center justify-between space-x-2">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-extrabold text-slate-900">{row.studioName}</span>
                          {row.isMultiFilmRow && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-black bg-purple-100 text-purple-900 border border-purple-200">
                              Film {row.filmIndex}
                            </span>
                          )}
                        </div>

                        {dateMode === 'single' && (
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleAddFilmRow(row.outletId, row.studioName)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-950 hover:bg-amber-200 border border-amber-300 transition cursor-pointer"
                              title={`Tambah baris film di ${row.studioName}`}
                            >
                              + Film
                            </button>
                            {row.totalFilmsInStudio > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteFilmRow(row.outletId, row.rowId)}
                                className="p-1 rounded text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                                title="Hapus baris film ini"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Studio Capacity */}
                    <td className="py-3 px-3 text-center font-black text-amber-900 border-r border-slate-200">
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-black">
                        {row.capacity}
                      </span>
                    </td>

                    {/* SHOW 1 s/d 7 (Readonly hasil scan, format pemisah garing: penonton / persentase%) */}
                    {SHOW_NUMBERS.map((sNum) => {
                      const audience = row.showAudience[sNum] || 0;
                      const capMultiplier = row.capacity * dateList.length;
                      const pct =
                        capMultiplier > 0
                          ? Math.round((audience / capMultiplier) * 100)
                          : 0;

                      return (
                        <td
                          key={sNum}
                          className="py-2.5 px-2 text-center whitespace-nowrap border-r border-slate-100"
                        >
                          {audience > 0 ? (
                            <span className="inline-flex items-center justify-center space-x-1">
                              <span className="font-extrabold text-slate-900 text-xs">
                                {audience}
                              </span>
                              <span className="text-slate-400 font-normal">/</span>
                              <span
                                className={`font-bold text-[11px] ${
                                  pct >= 70
                                    ? 'text-emerald-700 font-extrabold'
                                    : pct >= 40
                                    ? 'text-amber-700'
                                    : 'text-slate-500'
                                }`}
                              >
                                {pct}%
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-300 font-medium text-[11px]">
                              0 / 0%
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* TOTAL OKUPANSI (Pemisah garing miring: Total Penonton / Persentase) */}
                    <td className="py-3 px-3 text-center whitespace-nowrap border-r border-slate-200 bg-amber-50/20">
                      <span className="inline-flex items-center justify-center space-x-1 font-black">
                        <span className="text-slate-900 font-black text-xs">
                          {row.totalAudience}
                        </span>
                        <span className="text-slate-400 font-normal">/</span>
                        <span
                          className={`font-black text-xs ${
                            row.overallRate >= 70
                              ? 'text-emerald-700'
                              : row.overallRate >= 40
                              ? 'text-amber-800'
                              : 'text-slate-600'
                          }`}
                        >
                          {row.overallRate.toFixed(1)}%
                        </span>
                      </span>
                    </td>

                    {/* KETERANGAN / JUDUL FILM (Hasil dari scan gambar/pdf - Murni Judul Film) */}
                    <td className="py-2.5 px-3 border-r border-slate-200">
                      {dateMode === 'single' ? (
                        <div className="flex items-center space-x-1.5 w-full min-w-[140px] max-w-[260px]">
                          <Film className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <input
                            type="text"
                            value={row.filmTitle || row.notes || ''}
                            onChange={(e) =>
                              handleNotesChange(row.outletId, row.rowId, e.target.value)
                            }
                            placeholder="Judul Film..."
                            className="w-full text-xs font-bold px-2 py-1 rounded-lg border border-transparent hover:border-slate-300 focus:border-amber-400 bg-transparent focus:bg-white text-slate-800 transition focus:outline-hidden"
                            title="Klik untuk mengubah judul film (genre akan otomatis disesuaikan)"
                          />
                        </div>
                      ) : row.filmTitle || row.notes ? (
                        <div
                          className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 max-w-[240px] truncate"
                          title={row.filmTitle || row.notes}
                        >
                          <Film className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate">{row.filmTitle || row.notes}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs italic font-normal">
                          -
                        </span>
                      )}
                    </td>

                    {/* GENRE FILM (Pilihan Interaktif & Otomatis) */}
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <select
                        value={row.genre || 'Action'}
                        onChange={(e) =>
                          handleRowGenreChange(row.rowId, row.outletId, e.target.value)
                        }
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase border shadow-2xs cursor-pointer focus:outline-hidden ${
                          GENRE_BADGES[row.genre || 'Action'] || 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}
                      >
                        {[
                          'Action',
                          'Horror',
                          'Comedy',
                          'Drama',
                          'Romance',
                          'Thriller',
                          'Sci-Fi',
                          'Adventure',
                          'Fantasy',
                          'Animation',
                          'Family',
                          'Religion',
                          'Biography',
                        ].map((g) => (
                          <option
                            key={g}
                            value={g}
                            className="bg-white text-slate-800 font-bold"
                          >
                            {g}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}

              {/* Total Akumulasi Row */}
              <tr className="bg-emerald-50/95 font-black text-slate-900 border-t-2 border-emerald-500 shadow-inner">
                <td
                  colSpan={2}
                  className="py-3.5 px-3.5 uppercase text-emerald-950 font-black border-r border-emerald-200"
                >
                  TOTAL AKUMULASI ({tableRows.length} BARIS STUDIO)
                </td>
                <td className="py-3.5 px-3 text-center text-amber-950 font-black border-r border-emerald-200">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-950 font-black">
                    {totalBaseCapacityAll}
                  </span>
                </td>
                {SHOW_NUMBERS.map((sNum) => {
                  const showAudSum = tableRows.reduce(
                    (acc, r) => acc + (r.showAudience[sNum] || 0),
                    0
                  );
                  const activeCap = tableRows
                    .filter((r) => (r.showAudience[sNum] || 0) > 0)
                    .reduce((acc, r) => acc + (r.capacity || 0), 0);
                  const showRate =
                    activeCap > 0
                      ? ((showAudSum / activeCap) * 100).toFixed(1)
                      : '0.0';

                  return (
                    <td
                      key={sNum}
                      className="py-2.5 px-1.5 text-center border-r border-emerald-200 whitespace-nowrap bg-emerald-100/70"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span className="font-black text-xs text-emerald-950">
                          {showAudSum}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800">
                          / {showRate}%
                        </span>
                      </div>
                    </td>
                  );
                })}
                <td className="py-3.5 px-3 text-center text-emerald-950 whitespace-nowrap border-r border-emerald-200 bg-emerald-200/80">
                  <span className="inline-flex items-center justify-center space-x-1 font-black text-xs">
                    <span className="text-emerald-950 font-black text-sm">{totalAudienceAll}</span>
                    <span className="text-emerald-700 font-normal">/</span>
                    <span className="text-emerald-900 font-black">{overallAvgOccupancy}%</span>
                  </span>
                </td>
                <td className="py-3.5 px-3 text-emerald-800 text-[11px] font-bold border-r border-emerald-200">
                  {displayedOutlets.length} outlet terakumulasi &bull; {totalAudienceAll} penonton
                </td>
                <td className="py-3.5 px-2 text-center text-emerald-800 text-[11px] font-bold">
                  -
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>

      {/* Dedicated Occupancy Scan Modal */}
      <OccupancyScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        initialOutletId={selectedOutletId !== 'all' ? selectedOutletId : displayedOutlets[0]?.id}
        initialDate={selectedDate}
        onApplyData={handleApplyScanData}
      />
    </div>
  );
};
