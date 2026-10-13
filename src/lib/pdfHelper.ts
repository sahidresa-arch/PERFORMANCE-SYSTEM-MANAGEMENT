import * as pdfjsLib from 'pdfjs-dist';
import { ExtractedOccupancyStudio } from './ocrService';
import { Outlet } from '../types';
import { StorageService } from './storage';

// Configure pdf.js worker in browser environment
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('Could not set pdf.js workerSrc:', e);
  }
}

export interface ExtractedPageText {
  pageNum: number;
  lines: string[];
  rowCells: string[][];
  fullText: string;
}

export interface PdfParseResult {
  pagesCount: number;
  slideImages: string[];
  pagesText: ExtractedPageText[];
  extractedStudios: ExtractedOccupancyStudio[];
  detectedOutlet?: string;
  detectedDate?: string;
  detectedClass?: string;
  jumlahFilm?: number;
  isNativeTextExtracted: boolean;
}

/**
 * Mengkonversi base64 string (dengan atau tanpa prefix data:...) ke Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = atob(clean);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const PdfHelper = {
  /**
   * Membaca dan menganalisis seluruh halaman/slide dari file PDF:
   * 1. Render setiap slide ke high-resolution JPEG gambar (untuk visual preview & AI multimodal)
   * 2. Ekstrak text layer asli terstruktur baris dan kolom untuk membaca tabel Studio, Film, dan Show
   */
  async parsePdfDocument(
    base64Pdf: string,
    targetOutlet?: Outlet
  ): Promise<PdfParseResult> {
    const bytes = base64ToUint8Array(base64Pdf);
    const loadingTask = pdfjsLib.getDocument({
      data: bytes,
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const pagesCount = pdfDoc.numPages;
    const slideImages: string[] = [];
    const pagesText: ExtractedPageText[] = [];

    for (let pageNum = 1; pageNum <= pagesCount; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);

        // 1. Render halaman ke Canvas (scale 2.2 untuk keterbacaan teks & OCR yang sangat tajam)
        try {
          const viewport = page.getViewport({ scale: 2.2 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({
              canvasContext: ctx,
              viewport,
              canvas,
            }).promise;
            const imgData = canvas.toDataURL('image/jpeg', 0.92);
            slideImages.push(imgData);
          }
        } catch (renderErr) {
          console.warn(`Gagal me-render canvas slide ${pageNum}:`, renderErr);
        }

        // 2. Ekstrak text content terstruktur dengan koordinat posisi (Y, X)
        try {
          const textContent = await page.getTextContent();
          const items = textContent.items as Array<{
            str: string;
            transform: number[];
            width: number;
            height: number;
          }>;

          // Kelompokkan item teks berdasarkan baris vertikal (Y posisi yang berdekatan)
          const linesMap = new Map<number, Array<{ x: number; width: number; text: string }>>();
          const lineThreshold = 5; // toleransi 5px untuk baris yang sama

          items.forEach((item) => {
            const str = (item.str || '').trim();
            if (!str) return;

            const x = item.transform[4];
            const y = Math.round(item.transform[5]);
            const width = item.width || 0;

            // Cari kelompok baris yang pas
            let matchedY: number | null = null;
            for (const existingY of linesMap.keys()) {
              if (Math.abs(existingY - y) <= lineThreshold) {
                matchedY = existingY;
                break;
              }
            }

            if (matchedY !== null) {
              linesMap.get(matchedY)!.push({ x, width, text: str });
            } else {
              linesMap.set(y, [{ x, width, text: str }]);
            }
          });

          // Urutkan baris dari atas ke bawah (y tinggi ke rendah di PDF)
          const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);
          const pageLines: string[] = [];
          const pageRowCells: string[][] = [];

          sortedY.forEach((y) => {
            const lineItems = linesMap.get(y)!;
            // Urutkan kolom dari kiri ke kanan
            lineItems.sort((a, b) => a.x - b.x);

            // Gabungkan item yang berdekatan secara horizontal (gap < 5) ke dalam sel kolom yang sama
            const cells: string[] = [];
            let currentCell = '';
            let lastEndX = -999;

            lineItems.forEach((li) => {
              if (lastEndX === -999) {
                currentCell = li.text;
                lastEndX = li.x + li.width;
              } else if (li.x - lastEndX < 5) {
                currentCell += ' ' + li.text;
                lastEndX = Math.max(lastEndX, li.x + li.width);
              } else {
                if (currentCell.trim()) {
                  cells.push(currentCell.trim());
                }
                currentCell = li.text;
                lastEndX = li.x + li.width;
              }
            });

            if (currentCell.trim()) {
              cells.push(currentCell.trim());
            }

            if (cells.length > 0) {
              pageRowCells.push(cells);
              pageLines.push(cells.join(' | '));
            }
          });

          pagesText.push({
            pageNum,
            lines: pageLines,
            rowCells: pageRowCells,
            fullText: pageLines.join('\n'),
          });
        } catch (textErr) {
          console.warn(`Gagal membaca text layer slide ${pageNum}:`, textErr);
        }
      } catch (pageErr) {
        console.warn(`Gagal memuat slide ${pageNum}:`, pageErr);
      }
    }

    // 3. Analisis data studio & penonton langsung dari teks asli PDF
    const textExtraction = this.parseOccupancyFromStructuredText(
      pagesText,
      targetOutlet
    );

    return {
      pagesCount,
      slideImages,
      pagesText,
      extractedStudios: textExtraction.studios,
      detectedOutlet: textExtraction.detectedOutlet,
      detectedDate: textExtraction.detectedDate,
      detectedClass: textExtraction.detectedClass,
      jumlahFilm: textExtraction.jumlahFilm,
      isNativeTextExtracted: textExtraction.studios.length > 0,
    };
  },

  /**
   * Parser presisi tinggi untuk membaca tabel Studio (angka / nama), Judul Film (Movie),
   * dan Jadwal Penonton Show 1 s/d Show 7 (format X/Y) dari dokumen PDF asli Cinema XXI.
   */
  parseOccupancyFromStructuredText(
    pages: ExtractedPageText[],
    targetOutlet?: Outlet
  ): {
    studios: ExtractedOccupancyStudio[];
    detectedOutlet?: string;
    detectedDate?: string;
    detectedClass?: string;
    jumlahFilm?: number;
  } {
    const allOutlets = StorageService.getOutlets();
    let detectedOutlet: string | undefined;
    let detectedDate: string | undefined;
    let detectedClass: string | undefined;

    // Deteksi outlet bioskop dari seluruh teks dokumen
    const fullDocText = pages.map((p) => p.fullText).join('\n').toUpperCase();
    for (const out of allOutlets) {
      const cleanName = out.name.replace(/^CAFE\s+/i, '').trim().toUpperCase();
      if (cleanName.length > 3 && fullDocText.includes(cleanName)) {
        detectedOutlet = out.name;
        detectedClass = out.class;
        break;
      }
    }

    // Deteksi Class / Grade dari header dokumen jika tertulis eksplisit (misal CLASS: A, GRADE B, KELAS C, dll)
    const classMatch = fullDocText.match(/(?:CLASS|GRADE|KELAS)\s*[:\s-]*\s*([A-D]|PREMIERE|HS|[A-Z0-9]+)/i);
    if (classMatch) {
      const rawClass = classMatch[1].toUpperCase().trim();
      detectedClass = rawClass.startsWith('GRADE') || rawClass.startsWith('CLASS')
        ? rawClass.replace(/^(?:GRADE|CLASS)\s*/i, '').trim()
        : rawClass;
    }

    // Deteksi tanggal (format YYYY-MM-DD, DD-MM-YYYY, atau DD-Agt-2026)
    const monthMap: { [key: string]: string } = {
      jan: '01', januari: '01',
      feb: '02', februari: '02',
      mar: '03', maret: '03', march: '03',
      apr: '04', april: '04',
      mei: '05', may: '05',
      jun: '06', juni: '06', june: '06',
      jul: '07', juli: '07', july: '07',
      agt: '08', aug: '08', agustus: '08', august: '08',
      sep: '09', sept: '09', september: '09',
      okt: '10', oct: '10', oktober: '10', october: '10',
      nov: '11', november: '11',
      des: '12', dec: '12', desember: '12', december: '12',
    };

    const indonesianDateMatch = fullDocText.match(/(\d{1,2})[\s\-/\.]([A-Za-z]{3,10})[\s\-/\.](\d{2,4})/i);
    if (indonesianDateMatch) {
      const day = indonesianDateMatch[1].padStart(2, '0');
      const monthRaw = indonesianDateMatch[2].toLowerCase();
      let year = indonesianDateMatch[3];
      if (year.length === 2) year = '20' + year;
      const foundKey = Object.keys(monthMap).find((k) => monthRaw.startsWith(k));
      const monthNum = foundKey ? monthMap[foundKey] : undefined;
      if (monthNum) {
        detectedDate = `${year}-${monthNum}-${day}`;
      }
    }

    if (!detectedDate) {
      const dateMatch = fullDocText.match(/(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})/);
      if (dateMatch) {
        const parts = dateMatch[1].split(/[-/\.]/);
        if (parts.length === 3) {
          let day = parts[0].padStart(2, '0');
          let month = parts[1].padStart(2, '0');
          let year = parts[2];
          if (year.length === 2) year = '20' + year;
          if (parts[0].length === 4) {
            detectedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          } else {
            detectedDate = `${year}-${month}-${day}`;
          }
        }
      }
    }

    // Map untuk menggabungkan penonton jika 1 film dalam 1 studio memiliki beberapa baris tarif tiket
    const groupedStudiosMap = new Map<string, ExtractedOccupancyStudio>();

    pages.forEach((page) => {
      const slideIndex = page.pageNum;
      let isImaxSection = false;
      let isPremiereSection = false;
      let lastExtractedGroupKey: string | null = null;
      let detectedShowCols: { [showNum: number]: number } = {};
      let totalColIdx: number | null = null;

      page.rowCells.forEach((cells) => {
        if (!cells || cells.length < 1) return;

        const rowLineUpper = cells.join(' ').toUpperCase();

        // Deteksi header/section pembatas tabel IMAX atau Premiere
        if (rowLineUpper.includes('IMAX') || rowLineUpper.includes('IMEX')) {
          isImaxSection = true;
          isPremiereSection = false;
        } else if (rowLineUpper.includes('PREMIERE') || rowLineUpper.includes('THE PREMIERE')) {
          isPremiereSection = true;
          isImaxSection = false;
        }

        if (cells.length < 2) return;

        // Cek baris header tabel & subtotal
        const isHeaderRow = cells.some((c) =>
          /^(?:studio|teater|movie|film|genre|kategori|ticket\s*price|tarif|show\s*1|s1|total\s*tickets|total\s*amount)$/i.test(c.trim())
        );
        if (isHeaderRow) {
          cells.forEach((c, idx) => {
            const m = c.trim().match(/^(?:show|pertunjukan|s)\s*[-:]?\s*([1-7])/i);
            if (m) {
              detectedShowCols[parseInt(m[1], 10)] = idx;
            }
            if (/(?:total\s*tickets?|total\s*tiket|total\s*penonton|tot\s*tkt|admissions|gross|total\s*amount)/i.test(c.trim())) {
              if (totalColIdx === null || idx < totalColIdx) {
                totalColIdx = idx;
              }
            }
          });
          return;
        }

        if (/^(?:total|grand\s*total|subtotal)$/i.test(cells[0].trim())) return;

        // 1. Cari lokasi kolom show pertama (format 'X/Y' misal '0/0', '13/0', '21/2')
        const firstShowIdx = cells.findIndex((c) => /\b\d+\s*\/\s*\d+\b/.test(c.trim()));
        if (firstShowIdx === -1 && Object.keys(detectedShowCols).length === 0) {
          // Gabungkan teks jika ini adalah baris lanjutan judul film yang terpotong ke bawah
          const textOnly = cells.join(' ').trim();
          if (textOnly && lastExtractedGroupKey && !/^(?:total|grand|printed|tanggal|laporan|page|http|printed\s*date)/i.test(textOnly)) {
            const existing = groupedStudiosMap.get(lastExtractedGroupKey);
            if (existing && !existing.filmTitle.includes(textOnly)) {
              existing.filmTitle = `${existing.filmTitle} ${textOnly}`.trim();
              existing.notes = existing.filmTitle;
              existing.genre = StorageService.resolveFilmGenre(existing.filmTitle, existing.genre);
            }
          }
          return;
        }

        // 2. Identifikasi Nama Studio
        let studioName = '';
        let studioCellIdx = -1;
        const maxSearchStudioIdx = firstShowIdx !== -1 ? Math.min(firstShowIdx, 3) : 3;

        for (let cIdx = 0; cIdx < maxSearchStudioIdx; cIdx++) {
          let cellText = cells[cIdx].trim().replace(/^[#\s]+|[.:\s]+$/g, '');
          if (!cellText) continue;

          const numOnlyMatch = cellText.match(/^(\d{1,2})$/);
          const imaxMatch = cellText.match(/^(?:studio|st|std|teater|theater|cinema|hall)?\s*[-:]?\s*(?:imax|imex)(?:\s*[-:]?\s*(\d{1,2}))?$/i);
          const premMatch = cellText.match(/^(?:studio|st|std|teater|theater|cinema|the)?\s*[-:]?\s*premiere(?:\s*[-:]?\s*(\d{1,2}))?$/i);
          const sNumMatch = cellText.match(/^(?:studio|st|std|teater|theater|cinema|s)\s*[-:]?\s*(\d{1,2})$/i);
          const hallMatch = cellText.match(/^(?:hall)\s*[-:]?\s*(\d{1,2})$/i);

          if (imaxMatch) {
            studioName = imaxMatch[1] ? `IMAX ${imaxMatch[1]}` : 'IMAX';
            studioCellIdx = cIdx;
            break;
          } else if (premMatch) {
            studioName = premMatch[1] ? `Premiere ${premMatch[1]}` : 'Premiere 1';
            studioCellIdx = cIdx;
            break;
          } else if (sNumMatch) {
            studioName = isImaxSection ? 'IMAX' : isPremiereSection ? 'Premiere 1' : `Studio ${sNumMatch[1]}`;
            studioCellIdx = cIdx;
            break;
          } else if (numOnlyMatch) {
            studioName = isImaxSection ? 'IMAX' : isPremiereSection ? 'Premiere 1' : `Studio ${numOnlyMatch[1]}`;
            studioCellIdx = cIdx;
            break;
          } else if (hallMatch) {
            studioName = `Hall ${hallMatch[1]}`;
            studioCellIdx = cIdx;
            break;
          }
        }

        if (!studioName || studioCellIdx === -1) {
          if (isImaxSection) {
            studioName = 'IMAX';
            studioCellIdx = 0;
          } else if (isPremiereSection) {
            studioName = 'Premiere 1';
            studioCellIdx = 0;
          } else {
            return;
          }
        }

        // 3. Ekstrak Judul Film & Genre dari sel antara Studio dan awal Show
        const limitShowIdx = firstShowIdx !== -1 ? firstShowIdx : (detectedShowCols[1] || cells.length);
        const metaCells = cells.slice(studioCellIdx + 1, limitShowIdx);
        let extractedGenre: string | null = null;
        const titleTokens: string[] = [];

        metaCells.forEach((mc) => {
          const raw = mc.trim();
          if (!raw) return;

          // Abaikan sensor rating & tarif (e.g. Rp 40.000, Rp 45.000, 40.000)
          if (/^(?:\d{1,2}\+|su|bo|pg-?\d*|r-?\d*|d\d*|r\d*|rp\s*[\d\.]+|\b\d{2,3}\.000\b)$/i.test(raw)) {
            return;
          }

          // Abaikan format teknologi teater
          if (/^(?:2d|3d|atmos|dolby|imax|4dx)$/i.test(raw)) {
            return;
          }

          if (!extractedGenre && StorageService.isGenreWord(raw)) {
            extractedGenre = StorageService.normalizeGenre(raw);
            return;
          }

          titleTokens.push(raw);
        });

        let filmTitle = titleTokens.join(' ').trim();

        // Deteksi dan bersihkan tag genre dalam kurung/di ujung judul
        const bracketGenre = filmTitle.match(/[\[\(]\s*(HORROR|HOROR|COMEDY|KOMEDI|ANIMATION|ANIMASI|DRAMA|FAMILY|KELUARGA|RELIGION|RELIGI|ACTION|AKSI)\s*[\]\)]/i);
        if (bracketGenre) {
          if (!extractedGenre) {
            extractedGenre = StorageService.normalizeGenre(bracketGenre[1]);
          }
          filmTitle = filmTitle.replace(bracketGenre[0], '').trim();
        }

        const trailingGenre = filmTitle.match(/\s+[-–—|/]?\s*(HORROR|HOROR|COMEDY|KOMEDI|ANIMATION|ANIMASI|DRAMA|FAMILY|KELUARGA|RELIGION|RELIGI|ACTION|AKSI)$/i);
        if (trailingGenre) {
          if (!extractedGenre) {
            extractedGenre = StorageService.normalizeGenre(trailingGenre[1]);
          }
          filmTitle = filmTitle.slice(0, trailingGenre.index).trim();
        }

        filmTitle = filmTitle
          .replace(/^[-:|\s]+|[-:|\s]+$/g, '')
          .replace(/\s{2,}/g, ' ')
          .trim();

        if (!filmTitle || filmTitle.length < 2) return;

        const finalGenre = StorageService.resolveFilmGenre(
          filmTitle,
          extractedGenre || undefined
        );

        // 4. Ekstrak Penonton Show 1 s/d Show 7 dengan mapping presisi
        const shows: { [s: number]: number } = {
          1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0
        };

        let runningShowSum = 0;
        for (let sIdx = 1; sIdx <= 7; sIdx++) {
          let sc = '';
          if (detectedShowCols[sIdx] !== undefined && cells[detectedShowCols[sIdx]]) {
            sc = cells[detectedShowCols[sIdx]].trim();
          } else if (firstShowIdx !== -1) {
            const colIdx = firstShowIdx + (sIdx - 1);
            // Jangan membaca kolom di posisi atau setelah totalColIdx
            if (totalColIdx !== null && colIdx >= totalColIdx) {
              break;
            }
            sc = cells[colIdx] ? cells[colIdx].trim() : '';
          }

          let showVal = 0;
          if (sc && sc !== '-' && sc !== '0') {
            const parsedVal = StorageService.parseAudienceCount(sc);
            // Jika nilai sama persis dengan total penjumlahan show sebelumnya, ini adalah kolom Total Tiket!
            if (parsedVal > 0 && runningShowSum > 0 && parsedVal === runningShowSum) {
              showVal = 0;
            } else if (parsedVal >= 10000) {
              // Angka >= 10000 adalah harga tiket (contoh Rp 35.000, 40.000, 50.000)
              showVal = 0;
            } else {
              showVal = parsedVal;
            }
          }
          shows[sIdx] = showVal;
          runningShowSum += showVal;
        }

        // Jika semua shows bernilai 0 namun ada kolom total / penonton (misal "778 / 2"):
        if (runningShowSum === 0) {
          if (totalColIdx !== null && cells[totalColIdx]) {
            const totVal = StorageService.parseAudienceCount(cells[totalColIdx]);
            if (totVal > 0 && totVal < 10000) {
              shows[1] = totVal;
              runningShowSum = totVal;
            }
          } else {
            // Coba cari dari sel di setelah limitShowIdx
            for (let cIdx = limitShowIdx; cIdx < cells.length; cIdx++) {
              const cellAud = StorageService.parseAudienceCount(cells[cIdx]);
              if (cellAud > 0 && cellAud < 10000) {
                shows[1] = cellAud;
                runningShowSum = cellAud;
                break;
              }
            }
          }
        }

        // 5. Agregasi multi-tarif
        const groupKey = `${slideIndex}_${studioName}_${filmTitle.toUpperCase()}`;
        const matchedOutletStudio = targetOutlet?.studios?.find(
          (os) =>
            os.name.toLowerCase() === studioName.toLowerCase() ||
            (studioName.toLowerCase().includes('imax') && (os.name.toLowerCase().includes('imax') || os.name.toLowerCase().includes('imex'))) ||
            (studioName.toLowerCase().includes('imex') && (os.name.toLowerCase().includes('imax') || os.name.toLowerCase().includes('imex')))
        );
        const capacity = matchedOutletStudio?.capacity || 200;

        if (groupedStudiosMap.has(groupKey)) {
          const existing = groupedStudiosMap.get(groupKey)!;
          for (let s = 1; s <= 7; s++) {
            existing.shows[s] = (existing.shows[s] || 0) + (shows[s] || 0);
          }
          if (extractedGenre) {
            existing.genre = extractedGenre;
          }
        } else {
          groupedStudiosMap.set(groupKey, {
            studioName,
            filmTitle,
            genre: finalGenre,
            capacity,
            shows,
            notes: filmTitle,
            slideIndex,
            detectedOutlet: detectedOutlet || targetOutlet?.name,
          });
        }
        lastExtractedGroupKey = groupKey;
      });
    });

    const studios = Array.from(groupedStudiosMap.values());
    const uniqueFilms = new Set(
      studios
        .map((s) => (s.filmTitle || s.notes || '').trim().toUpperCase())
        .filter((t) => t && t !== '-' && t.length > 1)
    );

    return {
      studios,
      detectedOutlet,
      detectedDate,
      detectedClass,
      jumlahFilm: uniqueFilms.size,
    };
  },
};
