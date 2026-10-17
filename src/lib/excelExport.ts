import * as XLSX from 'xlsx';

export interface ExcelExportOptions {
  title: string;
  subtitle?: string;
  metaInfo?: string;
  sheetName?: string;
  filename: string;
  data: Record<string, any>[];
  columnWidths?: { [key: string]: number };
}

export function exportToPrettyExcel({
  title,
  subtitle,
  metaInfo,
  sheetName = 'Laporan',
  filename,
  data,
  columnWidths,
}: ExcelExportOptions) {
  if (!data || data.length === 0) return;

  const keys = Object.keys(data[0]);

  // Construct sheet matrix (Array of Arrays)
  const sheetRows: any[][] = [];

  // Header Banner
  sheetRows.push([title.toUpperCase()]);
  if (subtitle) sheetRows.push([subtitle]);
  if (metaInfo) sheetRows.push([metaInfo]);
  sheetRows.push([`Waktu Unduh: ${new Date().toLocaleString('id-ID')}`]);
  sheetRows.push([]); // Spacing row

  // Table Column Headers
  sheetRows.push(keys);

  // Table Data Rows
  data.forEach((row) => {
    sheetRows.push(keys.map((k) => row[k]));
  });

  // Create Worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);

  // Enable Excel Gridlines / Borders
  worksheet['!views'] = [{ showGridLines: true }];

  // Compute Auto-fit Column Widths
  const cols = keys.map((key) => {
    let maxLen = key.length;

    // Custom width override
    if (columnWidths && columnWidths[key]) {
      return { wch: columnWidths[key] };
    }

    // Calculate maximum string length in data rows
    data.forEach((row) => {
      const val = row[key];
      if (val !== null && val !== undefined) {
        const strVal = String(val);
        if (strVal.length > maxLen) {
          maxLen = strVal.length;
        }
      }
    });

    return { wch: Math.max(maxLen + 4, 12) };
  });

  worksheet['!cols'] = cols;

  // Create Workbook & Export
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, cleanFilename);
}
