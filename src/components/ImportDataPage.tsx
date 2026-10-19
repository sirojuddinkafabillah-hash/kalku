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
  Edit3
} from 'lucide-react';

interface ImportDataPageProps {
  currentItemsCount: number;
  currentModalAwal: number;
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
    // Determine which is decimal separator
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // 1.500.000,50 -> dot is thousand, comma is decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,500,000.50 -> comma is thousand, dot is decimal
      str = str.replace(/,/g, '');
    }
  } else if (hasDot && !hasComma) {
    const parts = str.split('.');
    if (parts.length > 2) {
      // Multiple dots: e.g. 1.500.000
      str = parts.join('');
    } else if (parts.length === 2 && parts[1].length === 3) {
      // 50.000 -> Indonesian thousands separator!
      str = parts.join('');
    } else if (parts.length === 2 && parts[1].length !== 3) {
      // e.g. 2.5 or 10.50 -> decimal
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

// Pre-defined sample items for instant test
const SAMPLE_IMPORT_ITEMS: any[] = [
  {
    'Tanggal Input': new Date().toISOString().slice(0, 10),
    'Nama Barang': 'Air Mineral 600ml',
    'Satuan Wadah': 'Dus',
    'Jumlah 1 Wadah': 24,
    'Satuan Unit': 'botol',
    'Harga Beli 1 Wadah': 48000,
    'Harga Jual Satuan': 3000,
    'Jumlah Terjual Satuan': 6,
    'Catatan': 'Kulakan grosir agen sembako'
  },
  {
    'Tanggal Input': new Date().toISOString().slice(0, 10),
    'Nama Barang': 'Kopi Sachet Hitam Mantap',
    'Satuan Wadah': 'Renceng',
    'Jumlah 1 Wadah': 10,
    'Satuan Unit': 'sachet',
    'Harga Beli 1 Wadah': 12000,
    'Harga Jual Satuan': 2000,
    'Jumlah Terjual Satuan': 5,
    'Catatan': 'Stok warung laris'
  },
  {
    'Tanggal Input': new Date().toISOString().slice(0, 10),
    'Nama Barang': 'Minyak Goreng Refill 2L',
    'Satuan Wadah': 'Karton',
    'Jumlah 1 Wadah': 6,
    'Satuan Unit': 'pouch',
    'Harga Beli 1 Wadah': 190000,
    'Harga Jual Satuan': 36000,
    'Jumlah Terjual Satuan': 2,
    'Catatan': 'Minyak goreng kemasan'
  },
  {
    'Tanggal Input': new Date().toISOString().slice(0, 10),
    'Nama Barang': 'Beras Premium 5kg',
    'Satuan Wadah': 'Karung',
    'Jumlah 1 Wadah': 5,
    'Satuan Unit': 'kg',
    'Harga Beli 1 Wadah': 68000,
    'Harga Jual Satuan': 15000,
    'Jumlah Terjual Satuan': 3,
    'Catatan': 'Beras pulen wangi'
  },
  {
    'Tanggal Input': new Date().toISOString().slice(0, 10),
    'Nama Barang': 'Gula Pasir Kristal 1kg',
    'Satuan Wadah': 'Karton',
    'Jumlah 1 Wadah': 10,
    'Satuan Unit': 'kg',
    'Harga Beli 1 Wadah': 155000,
    'Harga Jual Satuan': 18000,
    'Jumlah Terjual Satuan': 4,
    'Catatan': 'Gula pasir putih murni'
  }
];

export const ImportDataPage: React.FC<ImportDataPageProps> = ({
  currentItemsCount,
  currentModalAwal,
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

  // Find column value by candidates
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

      const namaBarang = String(findValue(row, [
        'nama barang', 'nama_barang', 'nama', 'barang', 'item', 'produk', 'nama produk', 
        'deskripsi', 'description', 'uraian', 'product', 'nama_produk', 'kode/nama', 'title'
      ]) || '').trim();

      const satuanWadah = String(findValue(row, [
        'satuan wadah', 'satuan_wadah', 'wadah', 'kemasan', 'satuan beli', 'packaging', 
        'pack', 'dus', 'karton', 'satuan', 'unit wadah', 'satuan_beli'
      ]) || 'Dus').trim();

      let jumlahBarangWadah = parseIndonesianNumber(findValue(row, [
        'jumlah 1 wadah', 'isi wadah', 'isi', 'jumlah barang wadah', 'qty wadah', 'isi 1 wadah', 
        'jumlah', 'qty', 'kuantitas', 'kapasitas', 'isi per wadah', 'pcs per dus', 'isi dus', 
        'isi karton', 'banyaknya', 'isi_wadah', 'jumlah_barang_wadah', 'isi/kemasan', 'pcs/dus'
      ]));
      if (jumlahBarangWadah <= 0) jumlahBarangWadah = 1;

      const satuanUnit = String(findValue(row, [
        'satuan unit', 'satuan_unit', 'unit', 'satuan kecil', 'satuan jual', 'satuan_ecer', 'satuan_eceran', 'pcs'
      ]) || 'pcs').trim();

      let hargaBeli = parseIndonesianNumber(findValue(row, [
        'harga beli 1 wadah', 'harga beli', 'harga_beli', 'modal wadah', 'modal', 'beli', 
        'buy price', 'cost', 'hpp', 'harga pokok', 'harga kulakan', 'harga modal', 'harga grosir', 
        'kulakan', 'total modal', 'modal beli', 'harga beli wadah', 'harga_beli_wadah'
      ]));

      let hargaJualSatuan = parseIndonesianNumber(findValue(row, [
        'harga jual satuan', 'harga jual', 'harga_jual', 'harga_jual_satuan', 'jual', 
        'harga ecer', 'harga eceran', 'sell price', 'price', 'tarif', 'harga jual eceran', 
        'pricelist', 'harga_eceran', 'harga_jual_unit'
      ]));

      const jumlahBarangDijualSatuan = parseIndonesianNumber(findValue(row, [
        'jumlah terjual satuan', 'jumlah terjual', 'terjual', 'jumlah_terjual', 'unit terjual', 
        'laku', 'sold', 'qty jual', 'sudah laku', 'terjual satuan', 'penjualan', 'qty terjual', 'terjual (unit)'
      ])) || 0;

      const tanggalInput = String(findValue(row, [
        'tanggal input', 'tanggal', 'tgl', 'date', 'created_at', 'waktu', 'tanggal masuk', 'tanggal beli'
      ]) || new Date().toISOString().slice(0, 10)).trim();

      const catatan = String(findValue(row, [
        'catatan', 'keterangan', 'note', 'notes', 'ket', 'supplier', 'suplier', 'distributor'
      ]) || '').trim();

      // Smart fallback: If hargaJualSatuan is empty but hargaBeli is filled, auto-calculate +25% markup
      if (hargaJualSatuan <= 0 && hargaBeli > 0) {
        const modalPerUnit = hargaBeli / Math.max(1, jumlahBarangWadah);
        hargaJualSatuan = Math.ceil((modalPerUnit * 1.25) / 500) * 500; // Round to nearest Rp 500
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

  // Parse Text pasted from Excel or Google Sheets (tab or semicolon separated)
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

    // Detect delimiter: tab (\t), semicolon (;), or comma (,)
    const firstLine = lines[0];
    let delimiter = '\t';
    if (firstLine.includes('\t')) {
      delimiter = '\t';
    } else if (firstLine.includes(';') && (firstLine.match(/;/g)?.length || 0) >= (firstLine.match(/,/g)?.length || 0)) {
      delimiter = ';';
    } else if (firstLine.includes(',')) {
      delimiter = ',';
    }

    // Check if first line looks like headers or data
    const headerCols = firstLine.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    
    // Check if any header matches known keywords
    const isHeader = headerCols.some(col => 
      ['nama', 'barang', 'item', 'produk', 'wadah', 'isi', 'harga', 'beli', 'jual', 'terjual', 'modal'].some(kw => 
        col.toLowerCase().includes(kw)
      )
    );

    const rows: any[] = [];
    const dataStartIndex = isHeader ? 1 : 0;
    const finalHeaders = isHeader 
      ? headerCols 
      : ['Nama Barang', 'Satuan Wadah', 'Jumlah 1 Wadah', 'Harga Beli 1 Wadah', 'Harga Jual Satuan', 'Jumlah Terjual Satuan'];

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

  // Instant Sample Test
  const handleLoadSample = () => {
    processRawData(SAMPLE_IMPORT_ITEMS, 'Contoh Data Toko (5 Produk)');
  };

  // Download template Excel
  const handleDownloadTemplateExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(SAMPLE_IMPORT_ITEMS);
    ws['!cols'] = [
      { wch: 14 },
      { wch: 26 },
      { wch: 14 },
      { wch: 16 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 26 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Data Barang Toko');
    XLSX.writeFile(wb, 'Template_Impor_Barang_NiagaNova.xlsx');
  };

  // Download template CSV
  const handleDownloadTemplateCSV = () => {
    const headers = [
      'Tanggal Input',
      'Nama Barang',
      'Satuan Wadah',
      'Jumlah 1 Wadah',
      'Satuan Unit',
      'Harga Beli 1 Wadah',
      'Harga Jual Satuan',
      'Jumlah Terjual Satuan',
      'Catatan'
    ];
    const rows = SAMPLE_IMPORT_ITEMS.map(i => [
      i['Tanggal Input'],
      `"${i['Nama Barang']}"`,
      i['Satuan Wadah'],
      i['Jumlah 1 Wadah'],
      i['Satuan Unit'],
      i['Harga Beli 1 Wadah'],
      i['Harga Jual Satuan'],
      i['Jumlah Terjual Satuan'],
      `"${i['Catatan']}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Template_Impor_Barang_NiagaNova.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Update item in preview table directly
  const handleUpdatePreviewRow = (idx: number, field: keyof InventoryItem, value: any) => {
    setParsedRows(prev => {
      const updated = [...prev];
      const target = { ...updated[idx].item, [field]: value };
      
      // revalidate
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
          text: `Berhasil mengimpor ${validItems.length} barang ke MongoDB Atlas! Mode: ${importMode === 'replace' ? 'Ganti Seluruh Data' : 'Gabungkan'}.`
        });

        // Trigger callback to update React App state immediately
        onImportSuccess(validItems, modalAwalParam, importMode);
      } else {
        setResultMessage({
          type: 'error',
          text: `Gagal menyimpan ke MongoDB Atlas: ${res.message}`
        });
      }
    } catch (err: any) {
      setResultMessage({
        type: 'error',
        text: `Terjadi kendala jaringan: ${err?.message || 'Server offline'}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Header */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Pusat Impor Data Penjualan & Kulakan
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Excel / CSV / Copy-Paste
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Simpan ribuan data kulakan & harga jual sekaligus ke database MongoDB Atlas Cluster0
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 font-mono">
            <button
              onClick={handleLoadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="Coba impor 5 data produk toko contoh dalam 1-klik"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Coba Data Contoh (1-Klik)</span>
            </button>

            <button
              onClick={handleDownloadTemplateExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Unduh Template Excel</span>
            </button>

            <button
              onClick={handleDownloadTemplateCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
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
              {resultMessage.type === 'success' ? 'Impor Berhasil Disimpan!' : 'Perhatian'}
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
                      Tarik file ke sini, atau klik untuk memilih file
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Mendukung format Microsoft Excel (.xlsx, .xls), Tabel CSV (.csv), dan JSON
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        .XLSX
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
                  placeholder={`Contoh tempel (bisa dari Excel / Google Sheets):
Nama Barang\tSatuan Wadah\tIsi\tHarga Beli\tHarga Jual
Beras 5kg\tKarung\t5\t65000\t15000
Gula Pasir\tKarton\t10\t145000\t17500
Kopi Sachet\tRenceng\t10\t12000\t2000`}
                  rows={8}
                  className="w-full p-3 text-xs bg-slate-950 border border-slate-700 rounded-2xl text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-cyan-500 resize-y"
                />

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-[11px] font-mono text-slate-400">
                    Tips: Di Excel/Google Sheets, pilih kolom data lalu tekan <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Ctrl+C</kbd>, lalu <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Ctrl+V</kbd> di sini.
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
              Format kolom didukung fleksibel: <strong>Nama Barang</strong>, <strong>Satuan Wadah</strong> (Dus/Karton), <strong>Jumlah Isi</strong>, <strong>Harga Beli</strong> (contoh: Rp 50.000), <strong>Harga Jual</strong>, dan <strong>Terjual</strong>.
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
                Nilai modal kasir awal yang digunakan untuk menghitung arus kas berjalan.
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

      {/* PREVIEW & INLINE EDITABLE VALIDATION TABLE */}
      {parsedRows.length > 0 && (
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <span>Pratinjau Data ({parsedRows.length} Baris)</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (Bisa diedit langsung pada tabel sebelum disimpan)
                  </span>
                </h2>
                <p className="text-[11px] font-mono text-slate-400">
                  Periksa kelengkapan nama, wadah, modal beli, dan harga jual sebelum masuk database
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

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-900 text-slate-300 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <th className="py-2.5 px-3 font-bold w-12">No</th>
                  <th className="py-2.5 px-3 font-bold w-20">Status</th>
                  <th className="py-2.5 px-3 font-bold min-w-[180px]">Nama Barang</th>
                  <th className="py-2.5 px-3 font-bold min-w-[140px]">Kemasan & Isi</th>
                  <th className="py-2.5 px-3 font-bold min-w-[120px] text-right">Harga Beli (Wadah)</th>
                  <th className="py-2.5 px-3 font-bold min-w-[120px] text-right">Harga Jual (Satuan)</th>
                  <th className="py-2.5 px-3 font-bold min-w-[90px] text-center">Terjual</th>
                  <th className="py-2.5 px-3 font-bold min-w-[110px] text-right text-emerald-300">Untung/Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                {parsedRows.map((row, idx) => {
                  const { item, isValid, error } = row;
                  const calc = calculateItem(item);

                  return (
                    <tr 
                      key={item.id}
                      className={isValid ? 'hover:bg-slate-900/60' : 'bg-rose-950/20 hover:bg-rose-950/30'}
                    >
                      <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3">
                        {isValid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Valid</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-semibold" title={error}>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{error || 'Error'}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.namaBarang}
                          onChange={(e) => handleUpdatePreviewRow(idx, 'namaBarang', e.target.value)}
                          className="w-full px-2 py-1 bg-slate-900/80 border border-slate-700/60 rounded text-white font-sans text-xs focus:border-cyan-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={item.jumlahBarangWadah}
                            onChange={(e) => handleUpdatePreviewRow(idx, 'jumlahBarangWadah', Math.max(1, Number(e.target.value)))}
                            className="w-14 px-1.5 py-1 bg-slate-900/80 border border-slate-700/60 rounded text-white text-xs text-center focus:border-cyan-500 focus:outline-none"
                          />
                          <span className="text-slate-400 text-[10px]">{item.satuanUnit} /</span>
                          <span className="text-slate-300 text-[10px] font-semibold">{item.satuanWadah}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={item.hargaBeli}
                          onChange={(e) => handleUpdatePreviewRow(idx, 'hargaBeli', Math.max(0, Number(e.target.value)))}
                          className="w-24 px-1.5 py-1 bg-slate-900/80 border border-slate-700/60 rounded text-white text-xs text-right focus:border-cyan-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={item.hargaJualSatuan}
                          onChange={(e) => handleUpdatePreviewRow(idx, 'hargaJualSatuan', Math.max(0, Number(e.target.value)))}
                          className="w-24 px-1.5 py-1 bg-slate-900/80 border border-slate-700/60 rounded text-white text-xs text-right focus:border-cyan-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={item.jumlahBarangDijualSatuan}
                          onChange={(e) => handleUpdatePreviewRow(idx, 'jumlahBarangDijualSatuan', Math.max(0, Number(e.target.value)))}
                          className="w-14 px-1.5 py-1 bg-slate-900/80 border border-slate-700/60 rounded text-white text-xs text-center focus:border-cyan-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-400">
                        +{formatRupiah(calc.gainSatuan)}
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
