import React from 'react';
import { InventoryItem, GlobalSummary } from '../types/inventory';
import { formatRupiah, formatTanggalSederhana } from '../utils/calculator';
import { X, Download, FileSpreadsheet, FileJson, Laptop, ShieldCheck } from 'lucide-react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  modalAwal: number;
  summary: GlobalSummary;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  items,
  modalAwal,
  summary,
}) => {
  if (!isOpen) return null;

  // 1. Download CSV
  const handleDownloadCSV = () => {
    const headers = [
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
      'SISA KAS'
    ];

    let runningCash = modalAwal;
    const sorted = [...items].sort((a, b) => a.createdAt - b.createdAt);
    const rowCashMap = new Map<string, number>();
    for (const it of sorted) {
      runningCash = runningCash - (Number(it.hargaBeli) || 0) + ((Number(it.hargaJualSatuan) || 0) * (Number(it.jumlahBarangDijualSatuan) || 0));
      rowCashMap.set(it.id, runningCash);
    }

    const rows = items.map((item, idx) => {
      const hpp = item.hargaBeli / (item.jumlahBarangWadah || 1);
      const gainSatuan = item.hargaJualSatuan - hpp;
      const totalGain = Math.max(0, gainSatuan * item.jumlahBarangDijualSatuan);
      const modalKembali = hpp * item.jumlahBarangDijualSatuan;
      const sisaStok = Math.max(0, item.jumlahBarangWadah - item.jumlahBarangDijualSatuan);
      const nilaiSisa = sisaStok * hpp;
      const totalSetelahUntung = modalKembali + totalGain;
      const sisaKasRow = rowCashMap.get(item.id) ?? modalAwal;
      const tanggal = item.tanggalInput || formatTanggalSederhana(item.createdAt);

      return [
        idx + 1,
        `"${tanggal}"`,
        `"${item.namaBarang.replace(/"/g, '""')}"`,
        item.jumlahBarangWadah,
        item.hargaBeli,
        item.jumlahBarangDijualSatuan,
        item.hargaJualSatuan,
        Math.round(totalGain),
        Math.round(modalKembali),
        Math.round(nilaiSisa),
        Math.round(totalSetelahUntung),
        Math.round(sisaKasRow)
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `laporan_penjualan_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Download JSON Backup
  const handleDownloadJSON = () => {
    const backupData = {
      appName: 'Kalkulator Dagang & Arus Kas',
      exportedAt: new Date().toISOString(),
      modalAwal,
      summary,
      items,
    };
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const link = document.createElement('a');
    link.href = jsonStr;
    link.download = `backup_data_dagang_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. Download Standalone Offline HTML File
  const handleDownloadOfflineHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kalkulator Dagang Offline - Data Anda</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    h1 { margin-top: 0; font-size: 20px; color: #0f172a; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .stat { background: #f1f5f9; padding: 12px; border-radius: 8px; }
    .stat-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .stat-val { font-size: 18px; font-weight: 700; font-family: monospace; color: #0f172a; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
    th { background: #f1f5f9; padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1; }
    td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
    .mono { font-family: monospace; }
    .num { text-align: right; }
    .text-emerald { color: #047857; font-weight: bold; }
    .text-blue { color: #1d4ed8; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Kalkulator Pembukuan Dagang - Versi Offline Mandiri</h1>
    <p style="font-size: 12px; color: #64748b;">File ini dapat dibuka langsung di laptop atau HP tanpa koneksi internet.</p>
    <div class="grid">
      <div class="stat">
        <div class="stat-label">Modal Awal</div>
        <div class="stat-val">Rp ${modalAwal.toLocaleString('id-ID')}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Sisa Kas Berjalan</div>
        <div class="stat-val text-emerald">Rp ${summary.saldoKasSaatIni.toLocaleString('id-ID')}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Total Untung (Gain)</div>
        <div class="stat-val text-emerald">Rp ${summary.totalGainTerjual.toLocaleString('id-ID')}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Total Nilai Usaha</div>
        <div class="stat-val text-blue">Rp ${summary.totalSetelahUntung.toLocaleString('id-ID')}</div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2 style="font-size: 15px; margin: 0 0 10px 0;">Daftar Barang & Rincian Transaksi</h2>
    <table>
      <thead>
        <tr>
          <th>No</th>
          <th>Tanggal</th>
          <th>Nama Barang</th>
          <th style="text-align: center;">Isi Wadah</th>
          <th class="num">Harga Beli</th>
          <th style="text-align: center;">Terjual</th>
          <th class="num">Harga Jual</th>
          <th class="num">Untung</th>
          <th class="num">Uang Masuk Kas</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, idx) => {
          const hpp = item.hargaBeli / (item.jumlahBarangWadah || 1);
          const gainSatuan = item.hargaJualSatuan - hpp;
          const totalGain = Math.max(0, gainSatuan * item.jumlahBarangDijualSatuan);
          const modalKembali = hpp * item.jumlahBarangDijualSatuan;
          const totalSetelahUntung = modalKembali + totalGain;
          const tanggal = item.tanggalInput || new Date(item.createdAt).toLocaleDateString('id-ID');
          return `<tr>
            <td style="text-align: center; font-family: monospace;">${idx + 1}</td>
            <td style="font-family: monospace;">${tanggal}</td>
            <td><strong>${item.namaBarang}</strong></td>
            <td style="text-align: center; font-family: monospace;">${item.jumlahBarangWadah}</td>
            <td class="num mono">Rp ${item.hargaBeli.toLocaleString('id-ID')}</td>
            <td style="text-align: center; font-family: monospace; font-weight: bold;">${item.jumlahBarangDijualSatuan}</td>
            <td class="num mono">Rp ${item.hargaJualSatuan.toLocaleString('id-ID')}</td>
            <td class="num mono text-emerald">Rp ${totalGain.toLocaleString('id-ID')}</td>
            <td class="num mono" style="font-weight: bold;">Rp ${totalSetelahUntung.toLocaleString('id-ID')}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KalkulatorDagang_Offline_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Unduh Data & Aplikasi
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-600 mb-2">
            Pilih format unduhan yang Anda butuhkan untuk pembukuan atau penggunaan offline:
          </p>

          {/* Option 1: CSV / Excel */}
          <button
            onClick={() => {
              handleDownloadCSV();
              onClose();
            }}
            className="w-full p-3 rounded-xl border border-slate-200 hover:border-slate-900 bg-white hover:bg-slate-50 flex items-center gap-3 text-left transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-900">Unduh Format Excel (CSV)</div>
              <div className="text-[11px] text-slate-500">Bisa dibuka langsung di Microsoft Excel & Google Sheets</div>
            </div>
          </button>

          {/* Option 2: JSON Backup */}
          <button
            onClick={() => {
              handleDownloadJSON();
              onClose();
            }}
            className="w-full p-3 rounded-xl border border-slate-200 hover:border-slate-900 bg-white hover:bg-slate-50 flex items-center gap-3 text-left transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileJson className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-900">Unduh Cadangan Lengkap (JSON)</div>
              <div className="text-[11px] text-slate-500">Simpan seluruh data barang dan modal untuk cadangan aman</div>
            </div>
          </button>

          {/* Option 3: Standalone Offline Web HTML */}
          <button
            onClick={() => {
              handleDownloadOfflineHTML();
              onClose();
            }}
            className="w-full p-3 rounded-xl border border-slate-200 hover:border-slate-900 bg-white hover:bg-slate-50 flex items-center gap-3 text-left transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center shrink-0 group-hover:bg-violet-600 group-hover:text-white transition-colors">
              <Laptop className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-900">Unduh Aplikasi Web Offline (.html)</div>
              <div className="text-[11px] text-slate-500">Bisa dijalankan offline kapan saja di laptop/HP tanpa internet</div>
            </div>
          </button>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/70 flex justify-between items-center text-[11px] text-slate-500">
          <span className="flex items-center gap-1 text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Data siap disimpan</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
