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
  Layers,
  HelpCircle,
  Eye,
  Trash2,
  Info
} from 'lucide-react';

interface ImportDataPageProps {
  currentItemsCount: number;
  currentModalAwal: number;
  onImportSuccess: (importedItems: InventoryItem[], newModalAwal?: number) => void;
  onNavigateToInventory: () => void;
}

interface ParsedRow {
  isValid: boolean;
  error?: string;
  item: InventoryItem;
}

export const ImportDataPage: React.FC<ImportDataPageProps> = ({
  currentItemsCount,
  currentModalAwal,
  onImportSuccess,
  onNavigateToInventory,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [newModalAwal, setNewModalAwal] = useState<number | ''>(currentModalAwal);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean and parse numbers from Excel / CSV strings
  const cleanNumber = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const str = String(val).replace(/[^0-9.-]+/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  // Find column value by potential matching header names
  const findValue = (row: any, candidates: string[]): any => {
    const keys = Object.keys(row);
    for (const cand of candidates) {
      const match = keys.find(k => k.trim().toLowerCase() === cand.toLowerCase());
      if (match !== undefined && row[match] !== undefined && row[match] !== null) {
        return row[match];
      }
    }
    return undefined;
  };

  // Parse raw objects into InventoryItem array
  const processRawData = (rows: any[], fileName: string) => {
    setSelectedFileName(fileName);
    setResultMessage(null);

    const now = Date.now();
    const parsed: ParsedRow[] = [];

    rows.forEach((row, idx) => {
      // Check if row is empty
      if (!row || Object.values(row).every(v => v === null || v === undefined || String(v).trim() === '')) {
        return;
      }

      const namaBarang = String(findValue(row, [
        'nama barang', 'nama_barang', 'nama', 'barang', 'item', 'produk', 'nama produk', 'product'
      ]) || '').trim();

      const satuanWadah = String(findValue(row, [
        'satuan wadah', 'satuan_wadah', 'wadah', 'kemasan', 'satuan beli'
      ]) || 'Dus').trim();

      const jumlahBarangWadah = cleanNumber(findValue(row, [
        'jumlah 1 wadah', 'isi wadah', 'isi', 'jumlah barang wadah', 'qty wadah', 'isi 1 wadah', 'jumlah'
      ])) || 24;

      const satuanUnit = String(findValue(row, [
        'satuan unit', 'satuan_unit', 'unit', 'satuan', 'pcs'
      ]) || 'pcs').trim();

      const hargaBeli = cleanNumber(findValue(row, [
        'harga beli', 'harga_beli', 'harga beli 1 wadah', 'modal wadah', 'modal', 'beli', 'buy price', 'cost'
      ]));

      const hargaJualSatuan = cleanNumber(findValue(row, [
        'harga jual satuan', 'harga jual', 'harga_jual', 'harga_jual_satuan', 'jual', 'harga ecer', 'sell price', 'price'
      ]));

      const jumlahBarangDijualSatuan = cleanNumber(findValue(row, [
        'jumlah terjual satuan', 'jumlah terjual', 'terjual', 'jumlah_terjual', 'unit terjual', 'laku', 'sold'
      ])) || 0;

      const tanggalInput = String(findValue(row, [
        'tanggal input', 'tanggal', 'tgl', 'date', 'created_at'
      ]) || new Date().toISOString().slice(0, 10)).trim();

      const catatan = String(findValue(row, [
        'catatan', 'keterangan', 'note', 'notes'
      ]) || '').trim();

      // Validation
      let error: string | undefined = undefined;
      if (!namaBarang) {
        error = 'Nama barang tidak boleh kosong';
      } else if (hargaBeli <= 0) {
        error = 'Harga beli harus lebih besar dari Rp 0';
      } else if (hargaJualSatuan <= 0) {
        error = 'Harga jual satuan harus lebih besar dari Rp 0';
      } else if (jumlahBarangWadah <= 0) {
        error = 'Isi wadah harus minimal 1 unit';
      }

      const item: InventoryItem = {
        id: `import_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        namaBarang: namaBarang || `Barang Baris ${idx + 1}`,
        satuanWadah: satuanWadah || 'Dus',
        jumlahBarangWadah: Math.max(1, jumlahBarangWadah),
        satuanUnit: satuanUnit || 'pcs',
        hargaBeli: Math.max(0, hargaBeli),
        jumlahBarangDijualSatuan: Math.max(0, Math.min(jumlahBarangWadah, jumlahBarangDijualSatuan)),
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

    setParsedRows(parsed);
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
            setResultMessage({ type: 'error', text: 'Format file JSON tidak dikenali. Harus berupa array barang atau objek dengan properti "items".' });
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
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            setResultMessage({ type: 'error', text: 'Lembar kerja (sheet) pertama dalam file Excel/CSV kosong.' });
            return;
          }

          processRawData(jsonData, file.name);
        } catch (err) {
          console.error(err);
          setResultMessage({ type: 'error', text: 'Gagal membaca file Excel/CSV. Pastikan format tabel memiliki baris header.' });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setResultMessage({ type: 'error', text: 'Format file tidak didukung. Harap gunakan file .xlsx, .xls, .csv, atau .json.' });
    }
  };

  // Drag and drop handlers
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

  // Download template Excel
  const handleDownloadTemplateExcel = () => {
    const templateData = [
      {
        'Tanggal Input': new Date().toISOString().slice(0, 10),
        'Nama Barang': 'Air Mineral 600ml',
        'Satuan Wadah': 'Dus',
        'Jumlah 1 Wadah': 24,
        'Satuan Unit': 'botol',
        'Harga Beli 1 Wadah': 48000,
        'Jumlah Terjual Satuan': 5,
        'Harga Jual Satuan': 3000,
        'Catatan': 'Kulakan grosir toko agen'
      },
      {
        'Tanggal Input': new Date().toISOString().slice(0, 10),
        'Nama Barang': 'Kopi Sachet Hitam',
        'Satuan Wadah': 'Renceng',
        'Jumlah 1 Wadah': 10,
        'Satuan Unit': 'sachet',
        'Harga Beli 1 Wadah': 12000,
        'Jumlah Terjual Satuan': 4,
        'Harga Jual Satuan': 2000,
        'Catatan': 'Stok warung'
      },
      {
        'Tanggal Input': new Date().toISOString().slice(0, 10),
        'Nama Barang': 'Minyak Goreng 2L',
        'Satuan Wadah': 'Karton',
        'Jumlah 1 Wadah': 6,
        'Satuan Unit': 'pouch',
        'Harga Beli 1 Wadah': 190000,
        'Jumlah Terjual Satuan': 2,
        'Harga Jual Satuan': 36000,
        'Catatan': 'Minyak kemasan premium'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    ws['!cols'] = [
      { wch: 14 },
      { wch: 25 },
      { wch: 14 },
      { wch: 16 },
      { wch: 12 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 25 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Template Kulakan');
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
      'Jumlah Terjual Satuan',
      'Harga Jual Satuan',
      'Catatan'
    ];
    const sampleRows = [
      `"${new Date().toISOString().slice(0, 10)}","Air Mineral 600ml","Dus",24,"botol",48000,5,3000,"Kulakan agen"`,
      `"${new Date().toISOString().slice(0, 10)}","Kopi Sachet","Renceng",10,"sachet",12000,4,2000,"Stok toko"`,
      `"${new Date().toISOString().slice(0, 10)}","Minyak Goreng 2L","Karton",6,"pouch",190000,2,36000,"Kemasan pouch"`
    ];
    const csvContent = [headers.join(','), ...sampleRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Template_Impor_Barang_NiagaNova.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit parsed valid items to MongoDB Atlas
  const handleExecuteImport = async () => {
    const validItems = parsedRows.filter(r => r.isValid).map(r => r.item);
    if (validItems.length === 0) {
      setResultMessage({ type: 'error', text: 'Tidak ada data barang yang valid untuk diimpor.' });
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

        // Trigger callback to update React App state
        onImportSuccess(validItems, modalAwalParam);
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
                  Excel / CSV / JSON
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Unggah ribuan data barang sekaligus dan simpan otomatis ke database MongoDB Atlas
              </p>
            </div>
          </div>

          {/* Quick Template Download Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleDownloadTemplateExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-mono font-semibold transition-colors cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Contoh Template Excel</span>
            </button>

            <button
              onClick={handleDownloadTemplateCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-mono font-semibold transition-colors cursor-pointer shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Contoh Template CSV</span>
            </button>

            <button
              onClick={onNavigateToInventory}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/20"
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
            ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200' 
            : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
        }`}>
          {resultMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="font-bold text-white mb-0.5">
              {resultMessage.type === 'success' ? 'Impor Berhasil' : 'Perhatian'}
            </div>
            <div>{resultMessage.text}</div>
            {resultMessage.type === 'success' && (
              <button
                onClick={onNavigateToInventory}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-sm"
              >
                <span>Lihat Barang di Halaman Kasir & Inventori</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* DROP ZONE & CONFIGURATION SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Drag & Drop Upload Zone */}
        <div className="lg:col-span-8 bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  1. Pilih atau Tarik File Data (.xlsx, .csv, .json)
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Penyimpanan: MongoDB Atlas
              </span>
            </div>

            {/* Drop Container */}
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
                    {parsedRows.length} baris data berhasil dibaca ({validCount} valid, {invalidCount} tidak valid)
                  </p>
                  <p className="text-[11px] text-cyan-400 mt-2 font-mono underline">
                    Klik untuk memilih file lain
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-bold text-white tracking-tight">
                    Tarik file ke sini, atau klik untuk memilih
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
          </div>

          {/* Guide Note */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-start gap-2 text-[11px] font-mono text-slate-400">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              Kolom yang didukung otomatis: <strong>Nama Barang</strong>, <strong>Satuan Wadah</strong> (Dus/Karton), <strong>Jumlah Wadah</strong> (Isi), <strong>Harga Beli</strong>, <strong>Harga Jual Satuan</strong>, dan <strong>Jumlah Terjual</strong>.
            </span>
          </div>
        </div>

        {/* Import Configuration Card */}
        <div className="lg:col-span-4 bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Database className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                2. Pengaturan Impor
              </h2>
            </div>

            {/* Mode: Append vs Replace */}
            <div className="space-y-2">
              <label className="block text-xs font-mono font-semibold text-slate-300">
                Metode Penyimpanan Data:
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
                      Data yang diimpor akan ditambahkan ke {currentItemsCount} barang yang sudah ada di database tanpa menghapus data sebelumnya.
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

      {/* PREVIEW VALIDATION TABLE */}
      {parsedRows.length > 0 && (
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  3. Pratinjau Data Sebelum Disimpan ({parsedRows.length} Baris)
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

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-900 text-slate-300 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <th className="py-2.5 px-3 font-bold">No</th>
                  <th className="py-2.5 px-3 font-bold">Status</th>
                  <th className="py-2.5 px-3 font-bold">Nama Barang</th>
                  <th className="py-2.5 px-3 font-bold">Kemasan / Wadah</th>
                  <th className="py-2.5 px-3 font-bold text-right">Harga Beli</th>
                  <th className="py-2.5 px-3 font-bold text-right">Harga Jual</th>
                  <th className="py-2.5 px-3 font-bold text-center">Terjual</th>
                  <th className="py-2.5 px-3 font-bold text-right text-emerald-300">Untung/Unit</th>
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
                      <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3">
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
                      <td className="py-2.5 px-3 font-sans font-bold text-white">
                        {item.namaBarang}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {item.jumlahBarangWadah} {item.satuanUnit} / {item.satuanWadah}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-200">
                        {formatRupiah(item.hargaBeli)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-200">
                        {formatRupiah(item.hargaJualSatuan)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-300">
                        {item.jumlahBarangDijualSatuan} unit
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
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
