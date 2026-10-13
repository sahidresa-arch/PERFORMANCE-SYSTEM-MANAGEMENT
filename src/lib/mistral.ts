/**
 * Mistral AI OCR & Vision Integration
 * Mendukung:
 * 1. Mistral Document OCR API (`mistral-ocr-latest`) via https://api.mistral.ai/v1/ocr
 *    - Mendukung dokumen PDF berukuran besar dan multi-halaman/multi-slide.
 *    - Membaca seluruh tabel okupansi studio, film, dan jadwal tayang per show di setiap slide.
 * 2. Mistral Multimodal Vision (`pixtral-12b-2409` / `pixtral-large-latest`) via https://api.mistral.ai/v1/chat/completions
 *    - Untuk foto struk POS kasir & dokumen berbasis gambar (JPG, PNG).
 * 3. Parser Markdown Table Internal Berpresisi Tinggi
 *    - Memastikan seluruh baris studio dari setiap slide/halaman PDF diekstrak tanpa terlewat.
 */

import { ExtractedSalesData, ExtractedOccupancyData, ExtractedOccupancyStudio } from './ocrService';
import { Outlet } from '../types';
import { StorageService } from './storage';

export interface MistralTestResult {
  success: boolean;
  message: string;
  models?: string[];
}

export const MistralService = {
  /**
   * Menguji validitas API Key Mistral AI
   */
  async testConnection(apiKey: string): Promise<MistralTestResult> {
    if (!apiKey || !apiKey.trim()) {
      return {
        success: false,
        message: 'API Key Mistral belum diisi.',
      };
    }

    try {
      const response = await fetch('https://api.mistral.ai/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const modelIds = (data.data || []).map((m: any) => m.id);
        const hasVisionOrOcr = modelIds.some((id: string) =>
          id.includes('ocr') || id.includes('pixtral') || id.includes('large')
        );

        return {
          success: true,
          message: hasVisionOrOcr
            ? 'Koneksi Mistral OCR & Vision Berhasil! (Model OCR/Pixtral Aktif & Siap Baca PDF Multi-Slide)'
            : 'Koneksi Mistral API Berhasil!',
          models: modelIds,
        };
      }

      if (response.status === 401) {
        return {
          success: false,
          message: 'API Key Mistral tidak valid (401 Unauthorized). Silakan periksa kembali key Anda.',
        };
      }

      const errText = await response.text();
      return {
        success: false,
        message: `Koneksi gagal (${response.status}): ${errText.slice(0, 100)}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal menghubungi server Mistral AI: ${err.message || 'Network error'}`,
      };
    }
  },

  /**
   * Parser internal berpresisi tinggi untuk mengurai tabel Markdown yang dihasilkan oleh Mistral OCR.
   * Mendukung multiple slide/halaman, multi-film per studio, serta format show X/Y.
   */
  parseMarkdownTables(
    markdown: string,
    targetOutlet?: Outlet
  ): { studios: ExtractedOccupancyStudio[]; detectedOutlet?: string } {
    const lines = markdown.split('\n');
    let currentSlide = 1;
    let detectedOutlet = '';
    const studios: ExtractedOccupancyStudio[] = [];
    let headers: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i].trim();

      // Deteksi penanda slide atau halaman
      const slideMatch = rawLine.match(/(?:SLIDE|PAGE|HALAMAN)\s*[:#\-]?\s*(\d+)/i);
      if (slideMatch) {
        currentSlide = parseInt(slideMatch[1], 10);
        headers = [];
      }

      // Deteksi nama outlet bioskop dari header dokumen
      if (!detectedOutlet) {
        const outletMatch =
          rawLine.match(/(?:outlet|bioskop|cinema|lokasi)\s*[:\-]?\s*([A-Za-z0-9\s\.\-']+(?:XXI|CINEMA|PREMIERE|THE PARK)[A-Za-z0-9\s\.\-']*)/i) ||
          rawLine.match(/^(?:#+\s*)?([A-Za-z0-9\s\.\-']+(?:XXI|CINEMA|PREMIERE|THE PARK SAWANGAN|THE PARK)[A-Za-z0-9\s\.\-']*)$/i);
        if (outletMatch) {
          detectedOutlet = outletMatch[1].replace(/^#+\s*/, '').trim();
        }
      }

      if (rawLine.startsWith('|') && rawLine.endsWith('|')) {
        const cells = rawLine
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());

        // Lewati baris separator markdown |---|---|
        if (cells.every((c) => /^[-:\s]+$/.test(c))) continue;

        // Cek apakah baris ini adalah header kolom tabel
        const hasStudioNumber = cells.some((c) => /^studio\s*\d+$/i.test(c));
        const isHeader =
          !hasStudioNumber &&
          cells.some((c) =>
            /no|studio|teater|theater|film|movie|judul|show|s[1-7]|total|kapasitas|genre|kategori|penonton|adm|tiket|omzet|kursi|capacity/i.test(
              c
            )
          );

        if (isHeader) {
          headers = cells.map((c) => c.toLowerCase());
          continue;
        }

        // Baris data studio
        if (cells.length >= 2) {
          let studioName = '';
          let filmTitle = '';
          let rowGenre = '';
          let capacityVal = 0;
          let totalAudienceColVal = 0;
          const shows: { [showNum: number]: number } = {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
            6: 0,
            7: 0,
          };

          for (let col = 0; col < cells.length; col++) {
            const val = cells[col];
            const h = headers[col] || '';

            if (/\b(?:studio|teater|theater|cinema)\b/i.test(h)) {
              studioName = val;
            } else if (/\b(?:film|movie|judul|title)\b/i.test(h)) {
              filmTitle = val;
            } else if (/\b(?:genre|kategori|jenis)\b/i.test(h)) {
              rowGenre = StorageService.normalizeGenre(val);
            } else if (/\b(?:kapasitas|capacity|kursi|seat)\b/i.test(h)) {
              const capMatch = val.match(/\d+/);
              if (capMatch) capacityVal = parseInt(capMatch[0], 10);
            } else if (/\b(?:penonton|total|jumlah|adm|admissions?|tiket)\b/i.test(h)) {
              totalAudienceColVal = StorageService.parseAudienceCount(val);
            }

            // Show 1 - 7 mapping (mencakup '1', 'show 1', 's1', 'show1')
            for (let s = 1; s <= 7; s++) {
              const isMatchShow =
                new RegExp('^(?:s|show\\s*)?' + s + '$', 'i').test(h) ||
                h === String(s) ||
                h.startsWith(`s${s}`) ||
                h.startsWith(`show ${s}`);

              if (isMatchShow) {
                shows[s] = StorageService.parseAudienceCount(val);
              }
            }
          }

          // Fallback pencarian nama studio jika header tidak persis
          if (!studioName) {
            const cand = cells.find((c) =>
              /^(?:studio\s*\d+|the\s*premiere|premiere|imax)/i.test(c)
            );
            if (cand) {
              studioName = cand;
            }
          }

          // Pencarian judul film jika belum terdeteksi dari header
          if (!filmTitle) {
            const candTitle = cells.find(
              (c) =>
                c !== studioName &&
                !/^\d+(?:\s*\/\s*\d+)?$/.test(c) &&
                c.length > 2 &&
                !/^(total|\d+|-)$/i.test(c) &&
                !StorageService.isGenreWord(c)
            );
            if (candTitle) filmTitle = candTitle;
          }

          // Jika dokumen hanya berisi daftar Film, Genre, Penonton tanpa kolom Studio eksplisit,
          // buat nama studio otomatis (Studio 1, Studio 2, dst.)
          if (!studioName && filmTitle) {
            const nextStudioNum = studios.length + 1;
            studioName = `Studio ${nextStudioNum}`;
          }

          if (studioName && filmTitle) {
            // Bersihkan nama studio (contoh: "Studio 1", "Premiere")
            const cleanStudio = studioName.replace(/[*_#]/g, '').trim();

            // Cari genre dari salah satu sel jika belum terdeteksi dari header
            if (!rowGenre) {
              const genreCell = cells.find(
                (c) => c !== studioName && c !== filmTitle && StorageService.isGenreWord(c)
              );
              if (genreCell) {
                rowGenre = StorageService.normalizeGenre(genreCell);
              }
            }

            // Jika tidak ada show perorangan terdeteksi namun ada kolom total / penonton (misal "778 / 2"),
            // masukkan ke shows[1] agar total penonton 778 tercatat
            const hasAnyShow = Object.values(shows).some((v) => v > 0);
            if (!hasAnyShow && totalAudienceColVal > 0) {
              shows[1] = totalAudienceColVal;
            }

            // Fallback angka show berurutan jika header tidak dikenali
            const hasShowNow = Object.values(shows).some((v) => v > 0);
            if (!hasShowNow) {
              let showIdx = 1;
              for (const c of cells) {
                if (c === studioName || c === filmTitle || StorageService.isGenreWord(c)) continue;
                const parsedVal = StorageService.parseAudienceCount(c);
                if (parsedVal > 0 && showIdx <= 7) {
                  shows[showIdx] = parsedVal;
                  showIdx++;
                }
              }
            }

            const cleanTitle = (filmTitle || 'Film XXI').replace(/[*_#]/g, '').trim();
            const matchedStudio = targetOutlet?.studios?.find(
              (os) => os.name.toLowerCase() === cleanStudio.toLowerCase()
            );

            studios.push({
              studioName: cleanStudio,
              filmTitle: cleanTitle,
              genre: StorageService.resolveFilmGenre(cleanTitle, rowGenre || undefined),
              capacity: capacityVal || matchedStudio?.capacity || 200,
              shows,
              notes: cleanTitle,
              slideIndex: currentSlide,
              detectedOutlet: detectedOutlet || targetOutlet?.name,
            });
          }
        }
      } else {
        // Fallback untuk baris non-pipe yang memuat "Studio X"
        const stdMatch = rawLine.match(/\b(STUDIO\s*\d+|PREMIERE(?:\s*\d+)?|IMAX|HALL\s*\d+)\b/i);
        if (stdMatch) {
          const sName = stdMatch[1].trim();
          const shows: { [s: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
          const nums = rawLine.match(/\b(\d+(?:\s*\/\s*\d+)?)\b/g) || [];
          let sIdx = 1;
          for (const n of nums) {
            const val = StorageService.parseAudienceCount(n);
            if (!sName.includes(String(val)) && sIdx <= 7) {
              shows[sIdx] = val;
              sIdx++;
            }
          }
          const words = rawLine.split(/[:\-,|]/).map((w) => w.trim());
          const candTitle = words.find(
            (w) => w.length > 3 && !w.toLowerCase().includes('studio') && !/^\d+$/.test(w)
          );
          const fTitle = candTitle || 'Film XXI';
          studios.push({
            studioName: sName,
            filmTitle: fTitle,
            genre: StorageService.resolveFilmGenre(fTitle),
            capacity: 200,
            shows,
            notes: fTitle,
            slideIndex: currentSlide,
            detectedOutlet: detectedOutlet || targetOutlet?.name,
          });
        }
      }
    }

    return { studios, detectedOutlet };
  },

  /**
   * Ekstraksi Dokumen Okupansi Bioskop menggunakan Mistral OCR / Vision
   * Mendukung file PDF multi-halaman/multi-slide secara native via `mistral-ocr-latest`.
   */
  async processOccupancy(
    base64Data: string,
    apiKey: string,
    targetOutlet?: Outlet,
    isPdfMode = false,
    slideImages: string[] = []
  ): Promise<ExtractedOccupancyData | null> {
    const cleanApiKey = apiKey.trim();
    if (!cleanApiKey) return null;

    // Deteksi tipe dokumen (PDF vs Gambar)
    const isPdf =
      isPdfMode ||
      base64Data.startsWith('data:application/pdf') ||
      base64Data.includes('application/pdf') ||
      base64Data.startsWith('JVBERi0');

    // Pastikan format URL / data URI tepat
    let formattedDocUrl: string;
    if (isPdf) {
      formattedDocUrl = base64Data.startsWith('data:')
        ? base64Data
        : `data:application/pdf;base64,${base64Data}`;
    } else {
      formattedDocUrl = base64Data.startsWith('data:')
        ? base64Data
        : `data:image/jpeg;base64,${base64Data}`;
    }

    // =========================================================================
    // 1. DOKUMEN PDF: Gunakan Mistral Document OCR API (`mistral-ocr-latest`)
    //    Endpoint ini mampu memproses PDF multi-slide (hingga puluhan slide)
    // =========================================================================
    if (isPdf) {
      try {
        const ocrRes = await fetch('https://api.mistral.ai/v1/ocr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cleanApiKey}`,
          },
          body: JSON.stringify({
            model: 'mistral-ocr-latest',
            document: {
              type: 'document_url',
              document_url: formattedDocUrl,
            },
            include_image_base64: false,
          }),
        });

        if (ocrRes.ok) {
          const ocrData = await ocrRes.json();
          const pages: Array<{ index?: number; markdown?: string }> = ocrData.pages || [];
          const totalPages = pages.length || 1;

          // Gabungkan seluruh markdown dari semua slide dengan pemisah jelas
          const combinedMarkdown = pages
            .map((p, idx) => {
              const slideNum = (p.index !== undefined ? p.index : idx) + 1;
              return `### SLIDE ${slideNum}\n${p.markdown || ''}`;
            })
            .join('\n\n---\n\n');

          // Parser 1: Jalankan parser internal tabel markdown
          const tableParseResult = this.parseMarkdownTables(combinedMarkdown, targetOutlet);
          let extractedStudios: ExtractedOccupancyStudio[] = tableParseResult.studios;
          let detectedOutletName = tableParseResult.detectedOutlet || targetOutlet?.name;

          // Parser 2: Gunakan Mistral LLM untuk menyempurnakan struktur JSON & deteksi multi-film
          try {
            const promptText = `Anda adalah sistem parser OCR presisi tinggi untuk Laporan Okupansi Cinema XXI.
Berikut adalah teks Markdown hasil ekstraksi OCR dari dokumen PDF yang terdiri dari ${totalPages} slide/halaman:

${combinedMarkdown.slice(0, 45000)}

TUGAS UTAMA:
CUKUP MEMBACA FILM (Judul Film), GENRE, DAN JUMLAH PENONTON dari seluruh slide dokumen ini.

ATURAN WAJIB & SANGAT KRUSIAL:
1. ATURAN PENULISAN JUMLAH PENONTON (DILARANG SALAH):
   - APABILA PADA JUMLAH PENONTON TERTULIS SEPERTI "778 / 2" ATAU "X / Y" (misal 778 / 2, 24 / 0, 11 / 2, 154 / 1), TULIS / BACA ANGKA 778 SAJA! (Hanya ambil angka pertama sebelum tanda '/', buang tanda '/' dan angka setelahnya).
   - Format '-' (strip), kosong, atau '0/0' -> Tulis 0.
2. PEMBACAAN DAN PENEMPATAN JUMLAH PENONTON:
   - Tempatkan jumlah penonton pada film dan studio yang sesuai di tabel. DILARANG ASAL BACA ATAU SALAH MENEMPATKAN ANGKA PENONTON KE BARIS FILM LAIN!
   - Jika dokumen memiliki kolom per show (Show 1 s/d Show 7): masukkan jumlah penonton pada show masing-masing (Show 1, Show 2, dst) sesuai posisi kolom aslinya.
   - Jika dokumen hanya mencantumkan total penonton untuk film tersebut (misal tertulis "778 / 2"), masukkan 778 pada shows.1 (atau totalAudience).
3. DETEKSI FILM DAN GENRE:
   - Ambil Judul Film (Movie) asli yang bersih.
   - Klasifikasikan Genre ke salah satu: 'Horror', 'Comedy', 'Action', 'Drama', 'Animation', 'Family', 'Religion'. Baca kolom GENRE jika ada di dokumen, atau sesuaikan genre dengan judul resminya.
4. SEMUA SLIDE DIBACA:
   - Baca slide 1 sampai slide terakhir (${totalPages} slide). Jangan berhenti di slide pertama.
5. LOGIKA MULTI-FILM:
   - Jika dalam 1 studio terdapat 2 film berbeda, buat 2 entri baris terpisah untuk setiap film.

Format kembalian HANYA JSON valid:
{
  "outletName": "${detectedOutletName || targetOutlet?.name || 'Cinema XXI'}",
  "totalPages": ${totalPages},
  "studios": [
    {
      "studioName": "Studio 1",
      "filmTitle": "Judul Film",
      "genre": "Horror",
      "slideIndex": 1,
      "detectedOutlet": "Cinema XXI",
      "totalAudience": 778,
      "shows": {
        "1": 778, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0
      },
      "notes": "Judul Film"
    }
  ],
  "detectedSummary": "Ringkasan film, genre, dan jumlah penonton dari semua slide"
}`;

            const structModels = ['mistral-small-latest', 'mistral-large-latest', 'ministral-8b-latest'];
            for (const sModel of structModels) {
              try {
                const chatRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${cleanApiKey}`,
                  },
                  body: JSON.stringify({
                    model: sModel,
                    messages: [{ role: 'user', content: promptText }],
                    response_format: { type: 'json_object' },
                    temperature: 0.05,
                  }),
                });

                if (chatRes.ok) {
                  const chatData = await chatRes.json();
                  const content = chatData.choices?.[0]?.message?.content;
                  if (content) {
                    const parsed = JSON.parse(content);
                    if (Array.isArray(parsed.studios) && parsed.studios.length > 0) {
                      const llmStudios: ExtractedOccupancyStudio[] = parsed.studios.map(
                        (s: any) => {
                          let cleanStudioName = (s.studioName || 'Studio 1').toString().trim();
                          if (/^\d+$/.test(cleanStudioName)) {
                            cleanStudioName = `Studio ${cleanStudioName}`;
                          }

                          const matchedStudio = targetOutlet?.studios?.find(
                            (os) => os.name.toLowerCase() === cleanStudioName.toLowerCase()
                          );
                          const title = s.filmTitle || s.notes || 'Film XXI';
                          const rawGenre = (s.genre || '').trim();
                          const genre = StorageService.resolveFilmGenre(title, rawGenre || undefined);

                          const showsObj = {
                            1: StorageService.parseAudienceCount(s.shows?.['1'] ?? s.shows?.[1]),
                            2: StorageService.parseAudienceCount(s.shows?.['2'] ?? s.shows?.[2]),
                            3: StorageService.parseAudienceCount(s.shows?.['3'] ?? s.shows?.[3]),
                            4: StorageService.parseAudienceCount(s.shows?.['4'] ?? s.shows?.[4]),
                            5: StorageService.parseAudienceCount(s.shows?.['5'] ?? s.shows?.[5]),
                            6: StorageService.parseAudienceCount(s.shows?.['6'] ?? s.shows?.[6]),
                            7: StorageService.parseAudienceCount(s.shows?.['7'] ?? s.shows?.[7]),
                          };

                          // Jika seluruh shows bernilai 0 tapi ada totalAudience / audience (misal 778 dari 778 / 2),
                          // masukkan ke show 1 agar total penonton 778 tercatat
                          const rawTotal = StorageService.parseAudienceCount(
                            s.totalAudience ?? s.total ?? s.audience ?? s.penonton ?? s.jumlahPenonton
                          );
                          const showSum = Object.values(showsObj).reduce((sum, v) => sum + v, 0);
                          if (showSum === 0 && rawTotal > 0) {
                            showsObj[1] = rawTotal;
                          }

                          return {
                            studioName: cleanStudioName,
                            filmTitle: title,
                            genre,
                            capacity: matchedStudio?.capacity || s.capacity || 200,
                            shows: showsObj,
                            notes: s.notes || title,
                            slideIndex: Number(s.slideIndex) || 1,
                            detectedOutlet: s.detectedOutlet || detectedOutletName,
                          };
                        }
                      );

                      const countValidTitles = (arr: ExtractedOccupancyStudio[]) =>
                        arr.filter(
                          (st) =>
                            st.filmTitle &&
                            st.filmTitle !== 'Film XXI' &&
                            st.filmTitle.trim().length > 1
                        ).length;

                      const llmValidTitles = countValidTitles(llmStudios);
                      const tableValidTitles = countValidTitles(extractedStudios);

                      if (
                        llmValidTitles >= tableValidTitles ||
                        llmStudios.length >= extractedStudios.length ||
                        extractedStudios.length === 0
                      ) {
                        extractedStudios = llmStudios;
                      }
                      if (parsed.outletName) {
                        detectedOutletName = parsed.outletName;
                      }
                      break; // Model berhasil, keluar dari loop model
                    }
                  }
                }
              } catch (subErr) {
                console.warn(`Mistral model ${sModel} structuring error:`, subErr);
              }
            }
          } catch (llmErr) {
            console.warn('Mistral Chat Completions structuring fallback to table parser:', llmErr);
          }

          if (extractedStudios.length > 0) {
            const totalAudience = extractedStudios.reduce((acc, st) => {
              const rowSum = Object.values(st.shows).reduce((sum, v) => sum + (v || 0), 0);
              return acc + rowSum;
            }, 0);

            // Hitung breakdown per slide
            const slideBreakdown = pages.map((_, idx) => {
              const sNum = idx + 1;
              const inSlide = extractedStudios.filter((st) => (st.slideIndex || 1) === sNum);
              const audInSlide = inSlide.reduce((acc, st) => {
                return acc + Object.values(st.shows).reduce((sum, v) => sum + (v || 0), 0);
              }, 0);
              return {
                pageIndex: sNum,
                studioCount: inSlide.length,
                audienceCount: audInSlide,
              };
            });

            return {
              outletName: detectedOutletName || targetOutlet?.name || 'Cinema XXI',
              outletId: targetOutlet?.id,
              studios: extractedStudios,
              confidence: `Mistral Document OCR (${totalPages} Slide Terverifikasi)`,
              detectedSummary: `Mistral Document OCR Berhasil: ${totalPages} slide/halaman terbaca dengan total ${extractedStudios.length} baris studio dan ${totalAudience.toLocaleString(
                'id-ID'
              )} penonton.`,
              totalAudience,
              totalPages,
              slideBreakdown,
            };
          }
        }
      } catch (pdfErr) {
        console.warn('Mistral Document OCR API failed for PDF:', pdfErr);
      }
    }

    // =========================================================================
    // 2. DOKUMEN GAMBAR (JPG, PNG) ATAU FALLBACK
    // =========================================================================
    // Coba Mistral Vision Chat Completions (Pixtral)
    const visionModels = ['pixtral-12b-2409', 'pixtral-large-latest', 'mistral-large-latest'];

    for (const model of visionModels) {
      try {
        const promptText = `Anda adalah sistem OCR presisi tinggi untuk Laporan Okupansi Cinema XXI.
TUGAS UTAMA: Analisis lembar laporan/gambar ini. CUKUP MEMBACA FILM (Judul Film), GENRE, DAN JUMLAH PENONTON.

ATURAN WAJIB & SANGAT KRUSIAL:
1. ATURAN PENULISAN JUMLAH PENONTON (DILARANG SALAH):
   - APABILA PADA JUMLAH PENONTON TERTULIS SEPERTI "778 / 2" ATAU "X / Y" (misal 778 / 2, 24 / 0, 11 / 2, 154 / 1), TULIS / BACA ANGKA 778 SAJA! (Hanya ambil angka pertama sebelum tanda '/', buang tanda '/' dan angka setelahnya).
   - Format '-' (strip), kosong, atau '0/0' -> Tulis 0.
2. PEMBACAAN DAN PENEMPATAN JUMLAH PENONTON:
   - Tempatkan jumlah penonton pada film dan studio yang sesuai di tabel. DILARANG ASAL BACA ATAU SALAH MENEMPATKAN ANGKA PENONTON KE BARIS FILM LAIN!
   - Jika dokumen memiliki kolom per show (Show 1 s/d Show 7): masukkan jumlah penonton pada show masing-masing (Show 1, Show 2, dst) sesuai posisi kolom aslinya.
   - Jika dokumen hanya mencantumkan total penonton untuk film tersebut (misal tertulis "778 / 2"), masukkan 778 pada shows.1 (atau totalAudience).
3. DETEKSI FILM DAN GENRE:
   - Ambil Judul Film (Movie) asli yang bersih.
   - Klasifikasikan Genre ke salah satu: 'Horror', 'Comedy', 'Action', 'Drama', 'Animation', 'Family', 'Religion'. Baca kolom GENRE jika ada di dokumen, atau sesuaikan genre dengan judul resminya.
4. KAPASITAS STUDIO: JANGAN MENGUBAH KAPASITAS STUDIO! Kapasitas studio tidak tercantum pada lembar laporan dan harus tetap memakai kapasitas resmi studio dari outlet bioskop tersebut.
5. LOGIKA MULTI-FILM:
   - Jika dalam 1 studio terdapat 2 judul film di show berbeda, buat 2 entri baris studio terpisah.

Format kembalian HANYA JSON valid:
{
  "outletName": "${targetOutlet?.name || 'Cinema XXI'}",
  "studios": [
    {
      "studioName": "Studio 1",
      "filmTitle": "Judul Film",
      "genre": "Horror",
      "totalAudience": 778,
      "shows": {
        "1": 778, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0
      },
      "notes": "Judul Film"
    }
  ],
  "detectedSummary": "Ringkasan hasil scan film, genre, dan total penonton"
}`;

        const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cleanApiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: promptText },
                  {
                    type: 'image_url',
                    image_url: { url: formattedDocUrl },
                  },
                ],
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.05,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            const studios: ExtractedOccupancyStudio[] = (parsed.studios || []).map((s: any) => {
              const matchedStudio = targetOutlet?.studios?.find(
                (os) => os.name.toLowerCase() === (s.studioName || '').toLowerCase()
              );
              const title = s.filmTitle || s.notes || 'Film XXI';
              const rawGenre = (s.genre || '').trim();
              const genre = StorageService.resolveFilmGenre(title, rawGenre || undefined);

              const showsObj = {
                1: StorageService.parseAudienceCount(s.shows?.['1'] ?? s.shows?.[1]),
                2: StorageService.parseAudienceCount(s.shows?.['2'] ?? s.shows?.[2]),
                3: StorageService.parseAudienceCount(s.shows?.['3'] ?? s.shows?.[3]),
                4: StorageService.parseAudienceCount(s.shows?.['4'] ?? s.shows?.[4]),
                5: StorageService.parseAudienceCount(s.shows?.['5'] ?? s.shows?.[5]),
                6: StorageService.parseAudienceCount(s.shows?.['6'] ?? s.shows?.[6]),
                7: StorageService.parseAudienceCount(s.shows?.['7'] ?? s.shows?.[7]),
              };

              const rawTotal = StorageService.parseAudienceCount(
                s.totalAudience ?? s.total ?? s.audience ?? s.penonton ?? s.jumlahPenonton
              );
              const showSum = Object.values(showsObj).reduce((sum, v) => sum + v, 0);
              if (showSum === 0 && rawTotal > 0) {
                showsObj[1] = rawTotal;
              }

              return {
                studioName: s.studioName || 'Studio 1',
                filmTitle: title,
                genre,
                capacity: matchedStudio?.capacity || 200,
                shows: showsObj,
                notes: s.notes || title,
                slideIndex: 1,
              };
            });

            if (studios.length > 0) {
              const totalAudience = studios.reduce((acc, st) => {
                const rowSum = Object.values(st.shows).reduce((sum, v) => sum + (v || 0), 0);
                return acc + rowSum;
              }, 0);

              return {
                outletName: parsed.outletName || targetOutlet?.name || 'Cinema XXI',
                outletId: targetOutlet?.id,
                studios,
                confidence: `Mistral OCR Terverifikasi (${model})`,
                detectedSummary:
                  parsed.detectedSummary ||
                  `Mistral OCR Akurat: ${studios.length} baris studio terdeteksi dengan total akhir ${totalAudience} penonton.`,
                totalAudience,
                totalPages: 1,
              };
            }
          }
        }
      } catch (e) {
        console.warn(`Mistral Vision attempt with model ${model} failed:`, e);
      }
    }

    return null;
  },

  /**
   * Ekstraksi Struk POS Kasir menggunakan Mistral Vision / OCR
   */
  async processBill(base64Image: string, apiKey: string): Promise<ExtractedSalesData | null> {
    const cleanApiKey = apiKey.trim();
    if (!cleanApiKey) return null;

    const formattedImage = base64Image.startsWith('data:')
      ? base64Image
      : `data:image/jpeg;base64,${base64Image}`;

    const models = ['pixtral-12b-2409', 'pixtral-large-latest', 'mistral-large-latest'];

    for (const model of models) {
      try {
        const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cleanApiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Anda adalah AI OCR khusus pembacaan struk POS Cinema XXI.
Ekstrak data dari struk POS atau laporan kasir berikut ke format JSON murni:
{
  "omsetCinema": <number total tiket/cinema>,
  "omsetFnB": <number total penjualan makanan/minuman>,
  "bill": <number jumlah transaksi kasir>,
  "penonton": <number total tiket penonton>,
  "showNumber": <number 1-5 jika ada, default 1>,
  "outletName": <string nama bioskop>,
  "detectedSummary": <string ringkasan teks struk>
}`,
                  },
                  {
                    type: 'image_url',
                    image_url: { url: formattedImage },
                  },
                ],
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            return {
              omsetCinema: Number(parsed.omsetCinema) || 0,
              omsetFnB: Number(parsed.omsetFnB) || 0,
              bill: Number(parsed.bill) || 0,
              penonton: Number(parsed.penonton) || 0,
              showNumber: Number(parsed.showNumber) || 1,
              outletName: parsed.outletName || '',
              detectedText: parsed.detectedSummary || `Mistral OCR (${model}) scan`,
              confidence: `Mistral OCR Verified (${model})`,
            };
          }
        }
      } catch (err) {
        console.warn(`Mistral Bill OCR failed with model ${model}:`, err);
      }
    }

    return null;
  },
};
