import React, { useState, useRef } from 'react';
import { InventoryItem } from '../types/inventory';
import { importItemsToMongo } from '../services/mongoApi';
import { calculateItem, formatRupiah } from '../utils/calculator';
import * as XLSX from 'xlsx';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  ArrowRight, 
  RefreshCw, 
  Database,
  Eye,
  Trash2,
  Info,
  ClipboardPaste,
  Sparkles,
  Table
} from 'lucide-react';
import {
  USER_IMAGE_HEADERS,
  USER_IMAGE_SAMPLE_ROWS,
  exportToStyledExcel,
  exportToStandardCSV,
  downloadUserImageTemplateExcel,
  downloadUserImageTemplateCSV,
  buildExcelExportRows
} from '../utils/excelExporter';

interface ImportDataPageProps {
  currentItemsCount: number;
  currentModalAwal: number;
  currentItems?: InventoryItem[];
  onImportSuccess: (importedItems: InventoryItem[], newModalAwal?: number, mode?: 'append' | 'replace') => void;
  onNavigateToInventory: () => void;
}

interface ParsedRow {
  isValid: boolean;
  error?: string;
  item: InventoryItem;
}

// Robust number parser supporting Indonesian currency formats (e.g., 50.000, Rp 120.000,00, 1.500.000, 4500)
export const parseIndonesianNumber = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let str = String(val).trim();
  
  // Strip currency prefixes
  str = str.replace(/^(Rp\.?|IDR)\s*/i, '').trim();

  const hasDot = str.includes('.');
  const hasComma = str.includes(',');

  if (hasDot && hasComma) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasDot && !hasComma) {
    const parts = str.split('.');
    if (parts.length > 2) {
      str = parts.join('');
    } else if (parts.length === 2 && parts[1].length === 3) {
      str = parts.join('');
    }
  } else if (hasComma && !hasDot) {
    const parts = str.split(',');
    if (parts.length > 2) {
      str = parts.join('');
    } else if (parts.length === 2 && parts[1].length === 3) {
      str = parts.join('');
    } else {
      str = parts.join('.');
    }
  }

  const num = parseFloat(str.replace(/[^0-9.-]+/g, ''));
  return isNaN(num) ? 0 : num;
};

// Convert Excel date serial numbers (e.g. 46311) to standard YYYY-MM-DD
export const formatExcelSerialDate = (val: any): string => {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (typeof val === 'number' && val > 20000 && val < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + val * 86400000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }
  if (typeof val === 'string' && /^\d{5}(\.\d+)?$/.test(val.trim())) {
    const num = parseFloat(val);
    if (num > 20000 && num < 60000) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + num * 86400000);
      if (!isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    }
  }
  return String(val || '').trim() || new Date().toISOString().slice(0, 10);
};

export const ImportDataPage: React.FC<ImportDataPageProps> = ({
  currentItemsCount,
  currentModalAwal,
  currentItems = [],
  onImportSuccess,
  onNavigateToInventory,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [newModalAwal, setNewModalAwal] = useState<number | ''>(currentModalAwal);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find column value by potential matching header names
  const findValue = (row: any, candidates: string[]): any => {
    if (!row || typeof row !== 'object') return undefined;
    const keys = Object.keys(row);
    for (const cand of candidates) {
      const match = keys.find(k => k.trim().toLowerCase() === cand.toLowerCase());
      if (match !== undefined && row[match] !== undefined && row[match] !== null) {
        return row[match];
      }
    }
    return undefined;
  };

  // Convert raw row objects into valid InventoryItem
  const processRawData = (rows: any[], sourceName: string) => {
    setSelectedFileName(sourceName);
    setResultMessage(null);

    const now = Date.now();
    const parsed: ParsedRow[] = [];

    rows.forEach((row, idx) => {
      if (!row || Object.values(row).every(v => v === null || v === undefined || String(v).trim() === '')) {
        return;
      }

      // 1. Nama Barang
      const namaBarang = String(findValue(row, [
        'Nama Barang', 'nama barang', 'nama_barang', 'nama', 'barang', 'item', 'produk', 'nama produk', 
        'deskripsi', 'description', 'uraian', 'product', 'nama_produk', 'kode/nama', 'title'
      ]) || '').trim();

      // 2. Satuan Wadah (default 'Dus' or read from wadah)
      const satuanWadah = String(findValue(row, [
        'Satuan Wadah', 'satuan wadah', 'satuan_wadah', 'wadah', 'kemasan', 'satuan beli', 'packaging', 
        'pack', 'dus', 'karton', 'satuan', 'unit wadah', 'satuan_beli'
      ]) || 'Dus').trim();

      // 3. Jumlah 1 Wadah (exact match with user image column)
      let jumlahBarangWadah = parseIndonesianNumber(findValue(row, [
        'Jumlah 1 Wadah', 'jumlah 1 wadah', 'isi wadah', 'isi', 'jumlah barang wadah', 'qty wadah', 'isi 1 wadah', 
        'jumlah', 'qty', 'kuantitas', 'kapasitas', 'isi per wadah', 'pcs per dus', 'isi dus', 
        'isi karton', 'banyaknya', 'isi_wadah', 'jumlah_barang_wadah', 'isi/kemasan', 'pcs/dus'
      ]));
      if (jumlahBarangWadah <= 0) jumlahBarangWadah = 1;

      // 4. Satuan Unit
      const satuanUnit = String(findValue(row, [
        'Satuan Unit', 'satuan unit', 'satuan_unit', 'unit', 'satuan kecil', 'satuan jual', 'satuan_ecer', 'satuan_eceran', 'pcs'
      ]) || 'pcs').trim();

      // 5. Harga Beli 1 Wadah (exact match with user image column)
      let hargaBeli = parseIndonesianNumber(findValue(row, [
        'Harga Beli 1 Wadah', 'harga beli 1 wadah', 'harga beli', 'harga_beli', 'modal wadah', 'modal', 'beli', 
        'buy price', 'cost', 'hpp', 'harga pokok', 'harga kulakan', 'harga modal', 'harga grosir', 
        'kulakan', 'total modal', 'modal beli', 'harga beli wadah', 'harga_beli_wadah'
      ]));

      // 6. Harga Jual Satuan (exact match with user image column)
      let hargaJualSatuan = parseIndonesianNumber(findValue(row, [
        'Harga Jual Satuan', 'harga jual satuan', 'harga jual', 'harga_jual', 'harga_jual_satuan', 'jual', 
        'harga ecer', 'harga eceran', 'sell price', 'price', 'tarif', 'harga jual eceran', 
        'pricelist', 'harga_eceran', 'harga_jual_unit'
      ]));

      // 7. Jumlah Terjual Satuan (exact match with user image column)
      const jumlahBarangDijualSatuan = parseIndonesianNumber(findValue(row, [
        'Jumlah Terjual Satuan', 'jumlah terjual satuan', 'jumlah terjual', 'terjual', 'jumlah_terjual', 
        'unit terjual', 'laku', 'sold', 'qty jual', 'sudah laku', 'terjual satuan', 'penjualan', 'qty terjual', 'terjual (unit)'
      ])) || 0;

      // 8. Tanggal Input (exact match with user image column)
      const rawTanggal = findValue(row, [
        'Tanggal Input', 'tanggal input', 'tanggal', 'tgl', 'date', 'created_at', 'waktu', 'tanggal masuk', 'tanggal beli'
      ]);
      const tanggalInput = formatExcelSerialDate(rawTanggal);

      // 9. Catatan
      const catatan = String(findValue(row, [
        'Catatan', 'catatan', 'keterangan', 'note', 'notes', 'ket', 'supplier', 'suplier', 'distributor'
      ]) || '').trim();

      // Smart fallback: If hargaJualSatuan is empty but hargaBeli is filled, auto-calculate +25% markup
      if (hargaJualSatuan <= 0 && hargaBeli > 0) {
        const modalPerUnit = hargaBeli / Math.max(1, jumlahBarangWadah);
        hargaJualSatuan = Math.ceil((modalPerUnit * 1.25) / 500) * 500;
      }

      // If hargaBeli is empty but hargaJualSatuan is filled, estimate 80% cost
      if (hargaBeli <= 0 && hargaJualSatuan > 0) {
        hargaBeli = Math.round(hargaJualSatuan * jumlahBarangWadah * 0.8);
      }

      let error: string | undefined = undefined;
      if (!namaBarang) {
        error = 'Nama barang tidak boleh kosong';
      } else if (hargaBeli <= 0 && hargaJualSatuan <= 0) {
        error = 'Harap isi harga beli atau harga jual';
      }

      const item: InventoryItem = {
        id: `import_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        namaBarang: namaBarang || `Barang Baris ${idx + 1}`,
        satuanWadah: satuanWadah || 'Dus',
        jumlahBarangWadah: Math.max(1, jumlahBarangWadah),
        satuanUnit: satuanUnit || 'pcs',
        hargaBeli: Math.max(0, hargaBeli),
        jumlahBarangDijualSatuan: Math.max(0, jumlahBarangDijualSatuan),
        hargaJualSatuan: Math.max(0, hargaJualSatuan),
        perputaranBulan: 1,
        persentaseLabaDisimpanBulanan: 50,
        tanggalInput: tanggalInput || new Date().toISOString().slice(0, 10),
        catatan: catatan || undefined,
        createdAt: now + idx,
        updatedAt: now + idx,
      };

      parsed.push({
        isValid: !error,
        error,
        item,
      });
    });

    if (parsed.length === 0) {
      setResultMessage({
        type: 'error',
        text: 'Tidak ada baris data yang terbaca. Pastikan tabel memiliki baris header dan isi data.'
      });
    }

    setParsedRows(parsed);
  };

  // Parse Text pasted from Excel or Google Sheets
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      setResultMessage({ type: 'error', text: 'Kotak teks masih kosong. Salin tabel dari Excel atau Google Sheets lalu tempel di sini.' });
      return;
    }

    const lines = pastedText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 1) {
      setResultMessage({ type: 'error', text: 'Teks tidak memiliki baris data.' });
      return;
    }

    const firstLine = lines[0];
    let delimiter = '\t';
    if (firstLine.includes('\t')) {
      delimiter = '\t';
    } else if (firstLine.includes(';') && (firstLine.match(/;/g)?.length || 0) >= (firstLine.match(/,/g)?.length || 0)) {
      delimiter = ';';
    } else if (firstLine.includes(',')) {
      delimiter = ',';
    }

    const headerCols = firstLine.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    
    const isHeader = headerCols.some(col => 
      ['nama', 'barang', 'item', 'produk', 'wadah', 'isi', 'harga', 'beli', 'jual', 'terjual', 'modal'].some(kw => 
        col.toLowerCase().includes(kw)
      )
    );

    const rows: any[] = [];
    const dataStartIndex = isHeader ? 1 : 0;
    const finalHeaders = isHeader 
      ? headerCols 
      : ['No', 'Tanggal Input', 'Nama Barang', 'Jumlah 1 Wadah', 'Harga Beli 1 Wadah', 'Jumlah Terjual Satuan', 'Harga Jual Satuan'];

    for (let i = dataStartIndex; i < lines.length; i++) {
      const parts = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (parts.length === 0 || parts.every(p => p === '')) continue;

      const rowObj: any = {};
      finalHeaders.forEach((h, hIdx) => {
        rowObj[h] = parts[hIdx] !== undefined ? parts[hIdx] : '';
      });
      rows.push(rowObj);
    }

    if (rows.length === 0) {
      setResultMessage({ type: 'error', text: 'Gagal mengekstrak data dari teks yang ditempel.' });
      return;
    }

    processRawData(rows, `Tempel Teks (${rows.length} Baris)`);
  };

  // Handle file reading
  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          if (Array.isArray(content)) {
            processRawData(content, file.name);
          } else if (content.items && Array.isArray(content.items)) {
            if (typeof content.modalAwal === 'number') {
              setNewModalAwal(content.modalAwal);
            }
            processRawData(content.items, file.name);
          } else {
            setResultMessage({ type: 'error', text: 'Format JSON harus berupa array barang atau objek dengan properti "items".' });
          }
        } catch {
          setResultMessage({ type: 'error', text: 'File JSON rusak atau tidak valid.' });
        }
      };
      reader.readAsText(file);
    } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', raw: false });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (jsonData.length === 0) {
            setResultMessage({ type: 'error', text: 'Lembar kerja pertama dalam file Excel/CSV kosong.' });
            return;
          }

          processRawData(jsonData, file.name);
        } catch (err) {
          console.error('Error parsing spreadsheet:', err);
          setResultMessage({ type: 'error', text: 'Gagal membaca file Excel/CSV. Pastikan format tabel memiliki baris header.' });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setResultMessage({ type: 'error', text: 'Format file tidak didukung. Harap gunakan .xlsx, .xls, .csv, atau .json.' });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Instant Sample Test with exact 21 rows from user's image
  const handleLoadSampleFromImage = () => {
    processRawData(USER_IMAGE_SAMPLE_ROWS, 'Format Gambar Pengguna (21 Produk Lengkap)');
  };

  // Update item in preview table directly
  const handleUpdatePreviewRow = (idx: number, field: keyof InventoryItem, value: any) => {
    setParsedRows(prev => {
      const updated = [...prev];
      const target = { ...updated[idx].item, [field]: value };
      
      let error: string | undefined = undefined;
      if (!target.namaBarang) error = 'Nama barang tidak boleh kosong';
      else if (target.hargaBeli <= 0 && target.hargaJualSatuan <= 0) error = 'Harap isi harga beli atau jual';

      updated[idx] = {
        isValid: !error,
        error,
        item: target
      };
      return updated;
    });
  };

  // Submit parsed valid items to MongoDB Atlas
  const handleExecuteImport = async () => {
    const validItems = parsedRows.filter(r => r.isValid).map(r => r.item);
    if (validItems.length === 0) {
      setResultMessage({ type: 'error', text: 'Tidak ada data barang yang valid untuk diimpor. Mohon periksa baris bertanda merah.' });
      return;
    }

    setIsProcessing(true);
    setResultMessage(null);

    try {
      const modalAwalParam = typeof newModalAwal === 'number' && newModalAwal >= 0 ? newModalAwal : undefined;
      const res = await importItemsToMongo(validItems, importMode, modalAwalParam);

      if (res.success) {
        setResultMessage({
          type: 'success',
          text: `Berhasil mengimpor ${validItems.length} barang ke database! Mode: ${importMode === 'replace' ? 'Ganti Seluruh Data' : 'Gabungkan'}.`
        });
        onImportSuccess(validItems, modalAwalParam, importMode);
      } else {
        // Apply to local Kasir state so the user is never blocked by temporary database lag
        onImportSuccess(validItems, modalAwalParam, importMode);
        setResultMessage({
          type: 'success',
          text: `Data ${validItems.length} barang telah berhasil diterapkan ke Kasir & Inventori! (${res.message})`
        });
      }
    } catch (err: any) {
      // Even if network throw, apply to local React app state
      const modalAwalParam = typeof newModalAwal === 'number' && newModalAwal >= 0 ? newModalAwal : undefined;
      onImportSuccess(validItems, modalAwalParam, importMode);
      setResultMessage({
        type: 'success',
        text: `Data ${validItems.length} barang berhasil diterapkan ke Kasir & Inventori! (Tersimpan di memori lokal)`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Export current inventory in database using the exact 12-column format
  const handleExportCurrentInventory = () => {
    if (!currentItems || currentItems.length === 0) {
      setResultMessage({ type: 'error', text: 'Belum ada data barang di toko untuk diekspor.' });
      return;
    }
    exportToStyledExcel(currentItems, currentModalAwal);
    setResultMessage({
      type: 'success',
      text: `Berhasil mengekspor ${currentItems.length} data barang ke file Excel (.xlsx) dengan 12 kolom sesuai format gambar!`
    });
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  // Running cash calculation for the preview table
  let runningCashPreview = typeof newModalAwal === 'number' ? newModalAwal : currentModalAwal;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Header */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Pusat Impor & Ekspor Data Kasir Toko
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#1f4e78] text-cyan-200 border border-cyan-500/40">
                  Format 12 Kolom Excel
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Dukungan format tabel persis gambar: No, Tanggal, Nama, Wadah, Beli, Terjual, Jual, Gain, Modal Kembali, Sisa Stok, Total Omset, Sisa Kas
              </p>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2 font-mono">
            {/* Export Current Data Button */}
            {currentItems.length > 0 && (
              <button
                onClick={handleExportCurrentInventory}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Ekspor seluruh data barang toko saat ini ke file Excel dengan 12 kolom persis seperti gambar"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ekspor Excel Format Ini ({currentItems.length} Barang)</span>
              </button>
            )}

            {/* Load 21 Sample Items from Image */}
            <button
              onClick={handleLoadSampleFromImage}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1f4e78]/80 hover:bg-[#1f4e78] border border-cyan-500/50 text-cyan-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="Muat 21 data produk contoh dari gambar (sprite, coco pie, aquviva, kiko, pino, dilan, dll)"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Coba 21 Data Gambar (1-Klik)</span>
            </button>

            {/* Download Template Excel */}
            <button
              onClick={downloadUserImageTemplateExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              title="Unduh file template Excel (.xlsx) dengan 12 kolom persis seperti gambar"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Unduh Template Excel</span>
            </button>

            {/* Download Template CSV */}
            <button
              onClick={downloadUserImageTemplateCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              title="Unduh file template CSV dengan 12 kolom persis seperti gambar"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Unduh Template CSV</span>
            </button>

            <button
              onClick={onNavigateToInventory}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <span>Buka Kasir</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Alert Result Message */}
      {resultMessage && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 font-mono text-xs transition-all ${
          resultMessage.type === 'success' 
            ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200 shadow-lg shadow-emerald-950/40' 
            : 'bg-rose-950/70 border-rose-500/50 text-rose-200 shadow-lg shadow-rose-950/40'
        }`}>
          {resultMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="font-bold text-white mb-0.5">
              {resultMessage.type === 'success' ? 'Berhasil!' : 'Perhatian'}
            </div>
            <div>{resultMessage.text}</div>
            {resultMessage.type === 'success' && (
              <button
                onClick={onNavigateToInventory}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-sm transition-all"
              >
                <span>Buka & Cek Barang di Kasir & Inventori</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* INPUT METHODS & CONFIGURATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload or Paste Tabs */}
        <div className="lg:col-span-8 bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col justify-between">
          <div>
            {/* Tab Header Selector */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Unggah File (.xlsx / .csv)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    activeTab === 'paste'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>Salin-Tempel Teks Excel</span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                <span>MongoDB Atlas Cluster0</span>
              </span>
            </div>

            {/* TAB 1: FILE UPLOAD (DRAG & DROP) */}
            {activeTab === 'upload' && (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[220px] ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                    : selectedFileName
                    ? 'border-cyan-500/60 bg-cyan-950/20'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-950/40 hover:bg-slate-950/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, .json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-inner">
                  {selectedFileName ? (
                    <FileSpreadsheet className="w-7 h-7 text-emerald-400" />
                  ) : (
                    <UploadCloud className="w-7 h-7 text-cyan-400" />
                  )}
                </div>

                {selectedFileName ? (
                  <div>
                    <div className="text-sm font-bold text-white font-mono flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{selectedFileName}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      {parsedRows.length} baris data terbaca ({validCount} valid, {invalidCount} tidak valid)
                    </p>
                    <p className="text-[11px] text-cyan-400 mt-2 font-mono underline">
                      Klik untuk memilih file lain
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-bold text-white tracking-tight">
                      Tarik file Excel format tabel ke sini, atau klik untuk memilih
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Mendukung format file persis gambar (.xlsx, .xls, .csv) atau JSON
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        .XLSX (Format Gambar)
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        .CSV
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        .JSON
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: COPY-PASTE DIRECT TEXT */}
            {activeTab === 'paste' && (
              <div className="space-y-3">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Tempel baris tabel langsung dari Excel (Ctrl+V):
No\tTanggal Input\tNama Barang\tJumlah 1 Wadah\tHarga Beli 1 Wadah\tJumlah Terjual Satuan\tHarga Jual Satuan
1\t2026-10-16\tsprite\t12\t32000\t0\t3500
2\t2026-10-16\tcoco pie\t12\t20700\t0\t2000
3\t2026-10-16\taquviva\t48\t38000\t0\t1000`}
                  rows={8}
                  className="w-full p-3 text-xs bg-slate-950 border border-slate-700 rounded-2xl text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-cyan-500 resize-y"
                />

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-[11px] font-mono text-slate-400">
                    Tips: Di Excel/Google Sheets, pilih baris lalu tekan <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Ctrl+C</kbd>, lalu <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Ctrl+V</kbd> di sini.
                  </p>
                  <button
                    type="button"
                    onClick={handleProcessPastedText}
                    className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-cyan-500/20"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Proses Teks Hasil Paste</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Guide Note */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-start gap-2 text-[11px] font-mono text-slate-400">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              12 Kolom yang dibaca otomatis: <strong>No</strong>, <strong>Tanggal Input</strong>, <strong>Nama Barang</strong>, <strong>Jumlah 1 Wadah</strong>, <strong>Harga Beli 1 Wadah</strong>, <strong>Jumlah Terjual Satuan</strong>, <strong>Harga Jual Satuan</strong>, <strong>Gain</strong>, <strong>Modal Pokok Kembali</strong>, <strong>Nilai Sisa Stok</strong>, <strong>TOTAL SETELAH UNTUNG</strong>, dan <strong>SISA KAS</strong>.
            </span>
          </div>
        </div>

        {/* Right Column: Configuration & Submit */}
        <div className="lg:col-span-4 bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Database className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Pengaturan Penyimpanan
              </h2>
            </div>

            {/* Mode: Append vs Replace */}
            <div className="space-y-2">
              <label className="block text-xs font-mono font-semibold text-slate-300">
                Metode Impor ke Database:
              </label>

              <div className="space-y-2">
                <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  importMode === 'append'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="mt-1 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="text-xs font-bold font-mono text-emerald-300">
                      Gabungkan (Append)
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-sans">
                      Menambahkan data baru tanpa menghapus {currentItemsCount} barang yang sudah ada di MongoDB Atlas.
                    </div>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  importMode === 'replace'
                    ? 'bg-rose-950/40 border-rose-500/50 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="mt-1 text-rose-500 focus:ring-rose-500"
                  />
                  <div>
                    <div className="text-xs font-bold font-mono text-rose-300">
                      Ganti Seluruh Data (Replace)
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-sans">
                      Mengosongkan database terlebih dahulu, lalu memasukkan hanya barang dari file impor ini.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Awal Setting */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label className="block text-xs font-mono font-semibold text-slate-300">
                Modal Awal Usaha (Rp):
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={newModalAwal}
                onChange={(e) => setNewModalAwal(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="50000"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] font-mono text-slate-400">
                Nilai modal kasir awal yang digunakan untuk menghitung kolom SISA KAS berjalan.
              </p>
            </div>
          </div>

          {/* Action Execution Button */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <button
              onClick={handleExecuteImport}
              disabled={validCount === 0 || isProcessing}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke MongoDB Atlas...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Proses Impor {validCount > 0 ? `(${validCount} Barang)` : ''}</span>
                </>
              )}
            </button>

            {parsedRows.length > 0 && (
              <button
                onClick={() => {
                  setParsedRows([]);
                  setSelectedFileName(null);
                  setPastedText('');
                  setResultMessage(null);
                }}
                className="w-full py-2 px-3 text-xs font-mono text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Pratinjau File</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PREVIEW & INLINE EDITABLE VALIDATION TABLE MATCHING USER'S IMAGE */}
      {parsedRows.length > 0 && (
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#1f4e78] border border-cyan-500/40 flex items-center justify-center text-cyan-200">
                <Table className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <span>Pratinjau Tabel Excel ({parsedRows.length} Baris)</span>
                  <span className="text-[10px] text-cyan-400 font-normal">
                    (Format 12 Kolom Persis Seperti Gambar)
                  </span>
                </h2>
                <p className="text-[11px] font-mono text-slate-400">
                  Dapat diedit langsung sebelum disimpan ke database MongoDB Atlas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                ✓ {validCount} Siap Diimpor
              </span>
              {invalidCount > 0 && (
                <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                  ✕ {invalidCount} Tidak Valid
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 max-h-[520px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 shadow-md">
                <tr className="bg-[#1f4e78] text-white font-mono text-[10px] font-bold uppercase tracking-wider border-b border-cyan-800/80">
                  <th className="py-3 px-2 text-center w-10 border-r border-[#2a6496]">No</th>
                  <th className="py-3 px-3 min-w-[100px] border-r border-[#2a6496]">Tanggal Input</th>
                  <th className="py-3 px-3 min-w-[140px] border-r border-[#2a6496]">Nama Barang</th>
                  <th className="py-3 px-3 text-right min-w-[100px] border-r border-[#2a6496]">Jumlah 1 Wadah</th>
                  <th className="py-3 px-3 text-right min-w-[120px] border-r border-[#2a6496]">Harga Beli 1 Wadah</th>
                  <th className="py-3 px-3 text-right min-w-[120px] border-r border-[#2a6496]">Jumlah Terjual Satuan</th>
                  <th className="py-3 px-3 text-right min-w-[110px] border-r border-[#2a6496]">Harga Jual Satuan</th>
                  <th className="py-3 px-3 text-right min-w-[130px] border-r border-[#2a6496] text-emerald-200">Gain (Untung Terealisasi)</th>
                  <th className="py-3 px-3 text-right min-w-[120px] border-r border-[#2a6496]">Modal Pokok Kembali</th>
                  <th className="py-3 px-3 text-right min-w-[120px] border-r border-[#2a6496]">Nilai Sisa Stok (Equity)</th>
                  <th className="py-3 px-3 text-right min-w-[170px] border-r border-[#2a6496] text-cyan-200">TOTAL SETELAH UNTUNG (Uang Masuk Kas)</th>
                  <th className="py-3 px-3 text-right min-w-[110px] text-amber-200">SISA KAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                {parsedRows.map((row, idx) => {
                  const { item, isValid, error } = row;
                  const calc = calculateItem(item);
                  
                  // Compute row's cash effect
                  const beli = Number(item.hargaBeli) || 0;
                  const uangMasuk = calc.totalPendapatanTerjual;
                  runningCashPreview = runningCashPreview - beli + uangMasuk;

                  return (
                    <tr 
                      key={item.id}
                      className={isValid ? 'hover:bg-slate-900/60' : 'bg-rose-950/20 hover:bg-rose-950/30'}
                    >
                      <td className="py-2 px-2 text-center text-slate-500 border-r border-slate-800">{idx + 1}</td>
                      <td className="py-2 px-3 text-slate-300 border-r border-slate-800 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.tanggalInput || ''}
                          onChange={(e) => handleUpdatePreviewRow(idx, 'tanggalInput', e.target.value)}
                          className="w-24 px-1.5 py-1 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-500 focus:outline-none text-slate-300 text-xs"
                        />
                      </td>
                      <td className="py-2 px-3 font-sans font-bold text-white border-r border-slate-800">
                        <input
                          type="text"
                          value={item.namaBarang}
                          onChange={(e) => handleUpdatePreviewRow(idx, 'namaBarang', e.target.value)}
                          className="w-full px-2 py-1 bg-slate-900/80 border border-slate-700/60 rounded text-white font-sans text-xs focus:border-cyan-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-right border-r border-slate-800">
                        <input
                          type="number"
                          min="1"
                          value={item.jumlahBarangWadah}
                          onChange={(e) => handleUpdatePreviewRow(idx, 'jumlahBarangWadah', Math.max(1, Number(e.target.value)))}
                          className="w-16 px-1.5 py-1 bg-slate-900/80 border border-slate-700/60 rounded text-white text-xs text-right focus:border-cyan-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-right border-r border-slate-800">
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={item.hargaBeli}
                          onChange={(e) => handleUpdatePreviewRow(idx, 'hargaBeli', Math.max(0, Number(e.target.value)))}
                          className="w-24 px-1.5 py-1 bg-slate-900/80 border border-slate-700/60 rounded text-white text-xs text-right focus:border-cyan-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-right border-r border-slate-800">
                        <input
                          type="number"
                          min="0"
                          value={item.jumlahBarangDijualSatuan}
                          onChange={(e) => handleUpdatePreviewRow(idx, 'jumlahBarangDijualSatuan', Math.max(0, Number(e.target.value)))}
                          className="w-16 px-1.5 py-1 bg-slate-900/80 border border-slate-700/60 rounded text-white text-xs text-right focus:border-cyan-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-right border-r border-slate-800">
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={item.hargaJualSatuan}
                          onChange={(e) => handleUpdatePreviewRow(idx, 'hargaJualSatuan', Math.max(0, Number(e.target.value)))}
                          className="w-20 px-1.5 py-1 bg-slate-900/80 border border-slate-700/60 rounded text-white text-xs text-right focus:border-cyan-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-400 border-r border-slate-800">
                        {Math.round(calc.totalGainTerjual).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300 border-r border-slate-800">
                        {Math.round(calc.totalModalKembali).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300 border-r border-slate-800">
                        {Math.round(calc.nilaiSisaStok).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-cyan-300 border-r border-slate-800">
                        {Math.round(uangMasuk).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-amber-300">
                        {Math.round(runningCashPreview).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
