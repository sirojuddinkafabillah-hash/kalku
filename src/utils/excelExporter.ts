import * as XLSX from 'xlsx';
import { InventoryItem } from '../types/inventory';
import { calculateItem } from './calculator';

export const USER_IMAGE_HEADERS = [
  'No',
  'Tanggal Input',
  'Nama Barang',
  'Jumlah 1 Wadah',
  'Harga Beli 1 Wadah',
  'Jumlah Terjual Satuan',
  'Harga Jual Satuan',
  'Gain (Untung Terealisasi)',
  'Modal Pokok Kembali',
  'Nilai Sisa Stok (Equity)',
  'TOTAL SETELAH UNTUNG (Uang Masuk Kas)',
  'SISA KAS',
];

// Exact 21 sample rows from the user's uploaded image
export const USER_IMAGE_SAMPLE_ROWS: any[] = [
  {
    'No': 1,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'sprite',
    'Jumlah 1 Wadah': 12,
    'Harga Beli 1 Wadah': 32000,
    'Jumlah Terjual Satuan': 0,
    'Harga Jual Satuan': 3500,
    'Gain (Untung Terealisasi)': 0,
    'Modal Pokok Kembali': 0,
    'Nilai Sisa Stok (Equity)': 32000,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 0,
    'SISA KAS': 68900
  },
  {
    'No': 2,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'coco pie',
    'Jumlah 1 Wadah': 12,
    'Harga Beli 1 Wadah': 20700,
    'Jumlah Terjual Satuan': 0,
    'Harga Jual Satuan': 2000,
    'Gain (Untung Terealisasi)': 0,
    'Modal Pokok Kembali': 0,
    'Nilai Sisa Stok (Equity)': 20700,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 0,
    'SISA KAS': 100900
  },
  {
    'No': 3,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'aquviva',
    'Jumlah 1 Wadah': 48,
    'Harga Beli 1 Wadah': 38000,
    'Jumlah Terjual Satuan': 0,
    'Harga Jual Satuan': 1000,
    'Gain (Untung Terealisasi)': 0,
    'Modal Pokok Kembali': 0,
    'Nilai Sisa Stok (Equity)': 38000,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 0,
    'SISA KAS': 121600
  },
  {
    'No': 4,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'kiko',
    'Jumlah 1 Wadah': 30,
    'Harga Beli 1 Wadah': 19200,
    'Jumlah Terjual Satuan': 0,
    'Harga Jual Satuan': 1000,
    'Gain (Untung Terealisasi)': 0,
    'Modal Pokok Kembali': 0,
    'Nilai Sisa Stok (Equity)': 19200,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 0,
    'SISA KAS': 159600
  },
  {
    'No': 5,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'pino',
    'Jumlah 1 Wadah': 8,
    'Harga Beli 1 Wadah': 9600,
    'Jumlah Terjual Satuan': 0,
    'Harga Jual Satuan': 1500,
    'Gain (Untung Terealisasi)': 0,
    'Modal Pokok Kembali': 0,
    'Nilai Sisa Stok (Equity)': 9600,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 0,
    'SISA KAS': 178800
  },
  {
    'No': 6,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'aquviva',
    'Jumlah 1 Wadah': 24,
    'Harga Beli 1 Wadah': 19000,
    'Jumlah Terjual Satuan': 24,
    'Harga Jual Satuan': 1000,
    'Gain (Untung Terealisasi)': 5000,
    'Modal Pokok Kembali': 19000,
    'Nilai Sisa Stok (Equity)': 0,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 24000,
    'SISA KAS': 188400
  },
  {
    'No': 7,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'pino',
    'Jumlah 1 Wadah': 4,
    'Harga Beli 1 Wadah': 4800,
    'Jumlah Terjual Satuan': 4,
    'Harga Jual Satuan': 1500,
    'Gain (Untung Terealisasi)': 1200,
    'Modal Pokok Kembali': 4800,
    'Nilai Sisa Stok (Equity)': 0,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 6000,
    'SISA KAS': 183400
  },
  {
    'No': 8,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'kiko',
    'Jumlah 1 Wadah': 20,
    'Harga Beli 1 Wadah': 6400,
    'Jumlah Terjual Satuan': 20,
    'Harga Jual Satuan': 1000,
    'Gain (Untung Terealisasi)': 13600,
    'Modal Pokok Kembali': 6400,
    'Nilai Sisa Stok (Equity)': 0,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 20000,
    'SISA KAS': 182200
  },
  {
    'No': 9,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'aquviva',
    'Jumlah 1 Wadah': 24,
    'Harga Beli 1 Wadah': 19000,
    'Jumlah Terjual Satuan': 24,
    'Harga Jual Satuan': 1000,
    'Gain (Untung Terealisasi)': 5000,
    'Modal Pokok Kembali': 19000,
    'Nilai Sisa Stok (Equity)': 0,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 24000,
    'SISA KAS': 168600
  },
  {
    'No': 10,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'golda aren',
    'Jumlah 1 Wadah': 12,
    'Harga Beli 1 Wadah': 35400,
    'Jumlah Terjual Satuan': 12,
    'Harga Jual Satuan': 3500,
    'Gain (Untung Terealisasi)': 6600,
    'Modal Pokok Kembali': 35400,
    'Nilai Sisa Stok (Equity)': 0,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 42000,
    'SISA KAS': 163600
  },
  {
    'No': 11,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'sprite',
    'Jumlah 1 Wadah': 12,
    'Harga Beli 1 Wadah': 32000,
    'Jumlah Terjual Satuan': 12,
    'Harga Jual Satuan': 3500,
    'Gain (Untung Terealisasi)': 10000,
    'Modal Pokok Kembali': 32000,
    'Nilai Sisa Stok (Equity)': 0,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 42000,
    'SISA KAS': 157000
  },
  {
    'No': 12,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'Pino',
    'Jumlah 1 Wadah': 4,
    'Harga Beli 1 Wadah': 4000,
    'Jumlah Terjual Satuan': 4,
    'Harga Jual Satuan': 1500,
    'Gain (Untung Terealisasi)': 2000,
    'Modal Pokok Kembali': 4000,
    'Nilai Sisa Stok (Equity)': 0,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 6000,
    'SISA KAS': 147000
  },
  {
    'No': 13,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'kiko',
    'Jumlah 1 Wadah': 10,
    'Harga Beli 1 Wadah': 6000,
    'Jumlah Terjual Satuan': 10,
    'Harga Jual Satuan': 1000,
    'Gain (Untung Terealisasi)': 4000,
    'Modal Pokok Kembali': 6000,
    'Nilai Sisa Stok (Equity)': 0,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 10000,
    'SISA KAS': 145000
  },
  {
    'No': 14,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'sprite',
    'Jumlah 1 Wadah': 12,
    'Harga Beli 1 Wadah': 32000,
    'Jumlah Terjual Satuan': 12,
    'Harga Jual Satuan': 3500,
    'Gain (Untung Terealisasi)': 10000,
    'Modal Pokok Kembali': 32000,
    'Nilai Sisa Stok (Equity)': 0,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 42000,
    'SISA KAS': 141000
  },
  {
    'No': 15,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'dilan',
    'Jumlah 1 Wadah': 25,
    'Harga Beli 1 Wadah': 21000,
    'Jumlah Terjual Satuan': 25,
    'Harga Jual Satuan': 1000,
    'Gain (Untung Terealisasi)': 4000,
    'Modal Pokok Kembali': 21000,
    'Nilai Sisa Stok (Equity)': 0,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 25000,
    'SISA KAS': 131000
  },
  {
    'No': 16,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'le minarel',
    'Jumlah 1 Wadah': 23,
    'Harga Beli 1 Wadah': 36000,
    'Jumlah Terjual Satuan': 23,
    'Harga Jual Satuan': 2000,
    'Gain (Untung Terealisasi)': 10000,
    'Modal Pokok Kembali': 36000,
    'Nilai Sisa Stok (Equity)': 0,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 46000,
    'SISA KAS': 127000
  },
  {
    'No': 17,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'colagen',
    'Jumlah 1 Wadah': 12,
    'Harga Beli 1 Wadah': 9000,
    'Jumlah Terjual Satuan': 12,
    'Harga Jual Satuan': 2000,
    'Gain (Untung Terealisasi)': 15000,
    'Modal Pokok Kembali': 9000,
    'Nilai Sisa Stok (Equity)': 0,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 24000,
    'SISA KAS': 117000
  },
  {
    'No': 18,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'teh pucuk',
    'Jumlah 1 Wadah': 24,
    'Harga Beli 1 Wadah': 62000,
    'Jumlah Terjual Satuan': 24,
    'Harga Jual Satuan': 3500,
    'Gain (Untung Terealisasi)': 22000,
    'Modal Pokok Kembali': 62000,
    'Nilai Sisa Stok (Equity)': 0,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 84000,
    'SISA KAS': 102000
  },
  {
    'No': 19,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'sprite imut',
    'Jumlah 1 Wadah': 12,
    'Harga Beli 1 Wadah': 32000,
    'Jumlah Terjual Satuan': 12,
    'Harga Jual Satuan': 3500,
    'Gain (Untung Terealisasi)': 10000,
    'Modal Pokok Kembali': 32000,
    'Nilai Sisa Stok (Equity)': 0,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 42000,
    'SISA KAS': 80000
  },
  {
    'No': 20,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'golda biasa',
    'Jumlah 1 Wadah': 12,
    'Harga Beli 1 Wadah': 32000,
    'Jumlah Terjual Satuan': 12,
    'Harga Jual Satuan': 3500,
    'Gain (Untung Terealisasi)': 10000,
    'Modal Pokok Kembali': 32000,
    'Nilai Sisa Stok (Equity)': 0,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 42000,
    'SISA KAS': 70000
  },
  {
    'No': 21,
    'Tanggal Input': '2026-10-16',
    'Nama Barang': 'sprite imut',
    'Jumlah 1 Wadah': 12,
    'Harga Beli 1 Wadah': 32000,
    'Jumlah Terjual Satuan': 12,
    'Harga Jual Satuan': 3500,
    'Gain (Untung Terealisasi)': 10000,
    'Modal Pokok Kembali': 32000,
    'Nilai Sisa Stok (Equity)': 0,
    'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': 42000,
    'SISA KAS': 60000
  }
];

// Helper to compute running cash and format rows matching the user's spreadsheet
export function buildExcelExportRows(items: InventoryItem[], modalAwal: number) {
  let runningCash = Number(modalAwal) || 0;
  const sorted = [...items].sort((a, b) => a.createdAt - b.createdAt);
  const rowCashMap = new Map<string, number>();

  for (const it of sorted) {
    const beli = Number(it.hargaBeli) || 0;
    const jual = Number(it.hargaJualSatuan) || 0;
    const terjual = Number(it.jumlahBarangDijualSatuan) || 0;
    const uangMasuk = jual * terjual;
    runningCash = runningCash - beli + uangMasuk;
    rowCashMap.set(it.id, runningCash);
  }

  return items.map((item, idx) => {
    const calc = calculateItem(item);
    const uangMasuk = calc.totalPendapatanTerjual;
    const modalBalik = Math.round(calc.totalModalKembali);
    const untungTerealisasi = Math.round(calc.totalGainTerjual);
    const sisaStokEquity = Math.round(calc.nilaiSisaStok);
    const sisaKasRow = Math.round(rowCashMap.get(item.id) ?? runningCash);

    return {
      'No': idx + 1,
      'Tanggal Input': item.tanggalInput || new Date(item.createdAt).toISOString().slice(0, 10),
      'Nama Barang': item.namaBarang,
      'Jumlah 1 Wadah': item.jumlahBarangWadah,
      'Harga Beli 1 Wadah': item.hargaBeli,
      'Jumlah Terjual Satuan': item.jumlahBarangDijualSatuan,
      'Harga Jual Satuan': item.hargaJualSatuan,
      'Gain (Untung Terealisasi)': untungTerealisasi,
      'Modal Pokok Kembali': modalBalik,
      'Nilai Sisa Stok (Equity)': sisaStokEquity,
      'TOTAL SETELAH UNTUNG (Uang Masuk Kas)': uangMasuk,
      'SISA KAS': sisaKasRow,
    };
  });
}

// Export to .xlsx matching the user's Excel screenshot format
export function exportToStyledExcel(items: InventoryItem[], modalAwal: number, filename?: string) {
  const exportRows = buildExcelExportRows(items, modalAwal);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportRows, { header: USER_IMAGE_HEADERS });

  // Set explicit column widths to match user's layout
  ws['!cols'] = [
    { wch: 6 },   // No
    { wch: 14 },  // Tanggal Input
    { wch: 22 },  // Nama Barang
    { wch: 16 },  // Jumlah 1 Wadah
    { wch: 18 },  // Harga Beli 1 Wadah
    { wch: 22 },  // Jumlah Terjual Satuan
    { wch: 18 },  // Harga Jual Satuan
    { wch: 24 },  // Gain (Untung Terealisasi)
    { wch: 20 },  // Modal Pokok Kembali
    { wch: 22 },  // Nilai Sisa Stok (Equity)
    { wch: 38 },  // TOTAL SETELAH UNTUNG (Uang Masuk Kas)
    { wch: 16 },  // SISA KAS
  ];

  // Auto-filter covering all 12 columns like in Excel screenshot
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:L1');
  ws['!autofilter'] = { ref: `A1:L${range.e.r + 1}` };

  XLSX.utils.book_append_sheet(wb, ws, 'Laporan_Kasir');

  const finalName = filename || `Laporan_Penjualan_NiagaNova_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, finalName);
}

// Export to .csv matching the user's screenshot format
export function exportToStandardCSV(items: InventoryItem[], modalAwal: number, filename?: string) {
  const exportRows = buildExcelExportRows(items, modalAwal);
  const rows = exportRows.map((r) => [
    r['No'],
    r['Tanggal Input'],
    `"${r['Nama Barang']}"`,
    r['Jumlah 1 Wadah'],
    r['Harga Beli 1 Wadah'],
    r['Jumlah Terjual Satuan'],
    r['Harga Jual Satuan'],
    r['Gain (Untung Terealisasi)'],
    r['Modal Pokok Kembali'],
    r['Nilai Sisa Stok (Equity)'],
    r['TOTAL SETELAH UNTUNG (Uang Masuk Kas)'],
    r['SISA KAS'],
  ].join(','));

  const csvContent = [USER_IMAGE_HEADERS.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename || `Laporan_Penjualan_NiagaNova_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Download template Excel with exact sample items from user image
export function downloadUserImageTemplateExcel() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(USER_IMAGE_SAMPLE_ROWS, { header: USER_IMAGE_HEADERS });

  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 22 },
    { wch: 16 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
    { wch: 24 },
    { wch: 20 },
    { wch: 22 },
    { wch: 38 },
    { wch: 16 },
  ];

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:L22');
  ws['!autofilter'] = { ref: `A1:L${range.e.r + 1}` };

  XLSX.utils.book_append_sheet(wb, ws, 'Data_Toko');
  XLSX.writeFile(wb, 'Template_Excel_Format_Toko.xlsx');
}

// Download template CSV with exact sample items from user image
export function downloadUserImageTemplateCSV() {
  const rows = USER_IMAGE_SAMPLE_ROWS.map((r) => [
    r['No'],
    r['Tanggal Input'],
    `"${r['Nama Barang']}"`,
    r['Jumlah 1 Wadah'],
    r['Harga Beli 1 Wadah'],
    r['Jumlah Terjual Satuan'],
    r['Harga Jual Satuan'],
    r['Gain (Untung Terealisasi)'],
    r['Modal Pokok Kembali'],
    r['Nilai Sisa Stok (Equity)'],
    r['TOTAL SETELAH UNTUNG (Uang Masuk Kas)'],
    r['SISA KAS'],
  ].join(','));

  const csvContent = [USER_IMAGE_HEADERS.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'Template_CSV_Format_Toko.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
