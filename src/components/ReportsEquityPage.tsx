import React, { useState, useMemo } from 'react';
import { InventoryItem, GlobalSummary } from '../types/inventory';
import { calculateItem, formatRupiah, formatAngka } from '../utils/calculator';
import { 
  TrendingUp, 
  Wallet, 
  Package, 
  BarChart3, 
  Calendar, 
  ArrowUpRight, 
  PieChart, 
  ShieldCheck, 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles,
  Search,
  SlidersHorizontal,
  DollarSign,
  Layers,
  ArrowDownRight
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportsEquityPageProps {
  items: InventoryItem[];
  modalAwal: number;
  summary: GlobalSummary;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  onPrintReport: () => void;
}

export const ReportsEquityPage: React.FC<ReportsEquityPageProps> = ({
  items,
  modalAwal,
  summary,
  selectedMonth,
  onSelectMonth,
  onPrintReport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'gain' | 'terjual' | 'omset' | 'nilaiStok' | 'terbaru'>('gain');

  // Extract available months from items
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    items.forEach((item) => {
      const month = (item.tanggalInput || new Date(item.createdAt).toISOString().slice(0, 7)).slice(0, 7);
      monthSet.add(month);
    });
    return Array.from(monthSet).sort().reverse();
  }, [items]);

  // Filter items by selected month
  const filteredItems = useMemo(() => {
    let result = items;
    if (selectedMonth !== 'all') {
      result = result.filter((item) => {
        const itemMonth = (item.tanggalInput || new Date(item.createdAt).toISOString().slice(0, 7)).slice(0, 7);
        return itemMonth === selectedMonth;
      });
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((item) => 
        item.namaBarang.toLowerCase().includes(q) ||
        (item.catatan && item.catatan.toLowerCase().includes(q))
      );
    }
    return result;
  }, [items, selectedMonth, searchTerm]);

  // Calculated items list with metrics
  const analyzedItems = useMemo(() => {
    return filteredItems.map((item, idx) => {
      const calc = calculateItem(item);
      return {
        item,
        calc,
        originalIndex: idx,
      };
    });
  }, [filteredItems]);

  // Sorted items
  const sortedAnalyzedItems = useMemo(() => {
    return [...analyzedItems].sort((a, b) => {
      switch (sortBy) {
        case 'gain':
          return b.calc.totalGainTerjual - a.calc.totalGainTerjual;
        case 'terjual':
          return b.item.jumlahBarangDijualSatuan - a.item.jumlahBarangDijualSatuan;
        case 'omset':
          return b.calc.totalPendapatanTerjual - a.calc.totalPendapatanTerjual;
        case 'nilaiStok':
          return b.calc.nilaiSisaStok - a.calc.nilaiSisaStok;
        case 'terbaru':
        default:
          return b.item.createdAt - a.item.createdAt;
      }
    });
  }, [analyzedItems, sortBy]);

  // Top gain items
  const topGainItems = useMemo(() => {
    return [...analyzedItems]
      .filter((i) => i.calc.totalGainTerjual > 0)
      .sort((a, b) => b.calc.totalGainTerjual - a.calc.totalGainTerjual)
      .slice(0, 3);
  }, [analyzedItems]);

  // Top units sold items
  const topSoldItems = useMemo(() => {
    return [...analyzedItems]
      .filter((i) => i.item.jumlahBarangDijualSatuan > 0)
      .sort((a, b) => b.item.jumlahBarangDijualSatuan - a.item.jumlahBarangDijualSatuan)
      .slice(0, 3);
  }, [analyzedItems]);

  // Equity calculations
  const totalEkuitasUsaha = summary.saldoKasSaatIni + summary.totalNilaiSisaStok;
  const pertumbuhanEkuitasNominal = totalEkuitasUsaha - modalAwal;
  const persenPertumbuhanEkuitas = modalAwal > 0 ? (pertumbuhanEkuitasNominal / modalAwal) * 100 : 0;

  // Percentage breakdown of business equity
  const totalAssets = Math.max(1, totalEkuitasUsaha);
  const percentCash = Math.max(0, Math.min(100, (summary.saldoKasSaatIni / totalAssets) * 100));
  const percentStock = Math.max(0, Math.min(100, (summary.totalNilaiSisaStok / totalAssets) * 100));

  // Export report to Excel
  const handleExportExcel = () => {
    const reportData = analyzedItems.map((entry, idx) => ({
      'No': idx + 1,
      'Tanggal Input': entry.item.tanggalInput || new Date(entry.item.createdAt).toISOString().slice(0, 10),
      'Nama Barang': entry.item.namaBarang,
      'Wadah Kulakan': `${entry.item.jumlahBarangWadah} ${entry.item.satuanUnit} / ${entry.item.satuanWadah}`,
      'Harga Beli Kulakan (Rp)': entry.item.hargaBeli,
      'HPP Pokok Satuan (Rp)': Math.round(entry.calc.hppSatuan),
      'Unit Terjual': entry.item.jumlahBarangDijualSatuan,
      'Sisa Stok Unit': entry.calc.sisaStokSatuan,
      'Harga Jual Satuan (Rp)': entry.item.hargaJualSatuan,
      'Total Omset Masuk Kas (Rp)': entry.calc.totalPendapatanTerjual,
      'Modal Pokok Kembali (Rp)': Math.round(entry.calc.totalModalKembali),
      'Laba Bersih Terjual (Rp)': Math.round(entry.calc.totalGainTerjual),
      'Margin Laba (%)': Number(entry.calc.marginPersen.toFixed(1)),
      'Nilai Sisa Stok / Ekuitas Aset (Rp)': Math.round(entry.calc.nilaiSisaStok),
      'Status Lunas Modal': entry.calc.isModalLunas ? 'LUNAS (BEP)' : 'Belum Lunas'
    }));

    const summarySheetData = [
      { 'Indikator Ekuitas & Keuangan': 'Modal Awal Usaha', 'Nilai (Rp)': modalAwal },
      { 'Indikator Ekuitas & Keuangan': 'Total Pengeluaran Kulakan', 'Nilai (Rp)': summary.totalPengeluaranBeli },
      { 'Indikator Ekuitas & Keuangan': 'Total Omset Masuk Kas', 'Nilai (Rp)': summary.totalPemasukanJual },
      { 'Indikator Ekuitas & Keuangan': 'Modal Pokok Kembali', 'Nilai (Rp)': summary.totalModalKembali },
      { 'Indikator Ekuitas & Keuangan': 'Total Laba Bersih Terealisasi (Gain)', 'Nilai (Rp)': summary.totalGainTerjual },
      { 'Indikator Ekuitas & Keuangan': 'Nilai Ekuitas Stok Tersisa di Rak', 'Nilai (Rp)': summary.totalNilaiSisaStok },
      { 'Indikator Ekuitas & Keuangan': 'Saldo Kas Cair di Kasir', 'Nilai (Rp)': summary.saldoKasSaatIni },
      { 'Indikator Ekuitas & Keuangan': 'TOTAL EKUITAS BISNIS (Kas + Stok)', 'Nilai (Rp)': totalEkuitasUsaha },
      { 'Indikator Ekuitas & Keuangan': 'Pertumbuhan Modal / ROI (%)', 'Nilai (Rp)': `${persenPertumbuhanEkuitas.toFixed(2)}%` },
    ];

    const wb = XLSX.utils.book_new();
    const wsReport = XLSX.utils.json_to_sheet(reportData);
    const wsSummary = XLSX.utils.json_to_sheet(summarySheetData);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Ekuitas');
    XLSX.utils.book_append_sheet(wb, wsReport, 'Rincian Penjualan');

    const fileName = `Laporan_Ekuitas_Penjualan_${selectedMonth === 'all' ? 'Semua_Periode' : selectedMonth}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Filter Controls */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Laporan Penjualan & Posisi Ekuitas Usaha
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Real-time
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Audit komprehensif kas riil, nilai sisa aset stok barang, dan laba bersih terealisasi
              </p>
            </div>
          </div>

          {/* Month Selector & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-mono">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <select
                value={selectedMonth}
                onChange={(e) => onSelectMonth(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-slate-900 text-white">Semua Periode</option>
                {availableMonths.map((m) => {
                  const [y, mon] = m.split('-');
                  const monthName = new Date(Number(y), Number(mon) - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                  return (
                    <option key={m} value={m} className="bg-slate-900 text-white">
                      {monthName}
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-mono font-semibold transition-colors cursor-pointer shadow-xs"
              title="Unduh laporan lengkap ke file Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ekspor Excel</span>
            </button>

            <button
              onClick={onPrintReport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/20"
              title="Cetak laporan resmi dalam format nota / A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 PRIMARY EQUITY & CASH METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Modal Awal Usaha */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 shadow-[0_15px_35px_rgba(0,0,0,0.3)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="uppercase tracking-wider font-semibold">1. Modal Awal Disiapkan</span>
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {formatRupiah(modalAwal)}
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800">
            <span>Kulakan Modal:</span>
            <span className="text-slate-200 font-semibold">{formatRupiah(summary.totalPengeluaranBeli)}</span>
          </div>
        </div>

        {/* 2. Sisa Kas Berjalan di Kasir */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 shadow-[0_15px_35px_rgba(0,0,0,0.3)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="uppercase tracking-wider font-semibold">2. Saldo Kas Riil (Cair)</span>
            <div className={`p-2 rounded-xl border ${
              summary.saldoKasSaatIni >= modalAwal 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono tracking-tight ${
            summary.saldoKasSaatIni >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {formatRupiah(summary.saldoKasSaatIni)}
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800">
            <span>Uang Masuk Kasir:</span>
            <span className="text-emerald-400 font-semibold">+{formatRupiah(summary.totalPemasukanJual)}</span>
          </div>
        </div>

        {/* 3. Nilai Ekuitas Sisa Stok (Aset Barang) */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 shadow-[0_15px_35px_rgba(0,0,0,0.3)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="uppercase tracking-wider font-semibold">3. Ekuitas Stok di Rak</span>
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-300 tracking-tight">
            {formatRupiah(summary.totalNilaiSisaStok)}
          </div>
          <div className="mt-2 text-[11px] font-mono text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800">
            <span>Modal Pokok Kembali:</span>
            <span className="text-slate-200 font-semibold">{formatRupiah(summary.totalModalKembali)}</span>
          </div>
        </div>

        {/* 4. Total Ekuitas Usaha (Net Business Value) */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 shadow-[0_15px_35px_rgba(0,0,0,0.3)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="uppercase tracking-wider font-semibold">4. Total Ekuitas Bisnis</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-300 tracking-tight">
            {formatRupiah(totalEkuitasUsaha)}
          </div>
          <div className="mt-2 text-[11px] font-mono flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-slate-400">Pertumbuhan Modal:</span>
            <span className={`font-bold flex items-center gap-0.5 ${
              pertumbuhanEkuitasNominal >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {pertumbuhanEkuitasNominal >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5 inline" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 inline" />
              )}
              {persenPertumbuhanEkuitas >= 0 ? '+' : ''}{formatAngka(persenPertumbuhanEkuitas, 1)}%
            </span>
          </div>
        </div>
      </div>

      {/* EQUITY BREAKDOWN COMPOSITION & SALES PERFORMANCE STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Breakdown of Equity & Profit */}
        <div className="lg:col-span-7 bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Struktur Komposisi Ekuitas Usaha
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Nilai Riil Toko: <strong className="text-white">{formatRupiah(totalEkuitasUsaha)}</strong>
            </span>
          </div>

          {/* Visual Percentage Bar */}
          <div className="space-y-2">
            <div className="h-6 w-full bg-slate-950/80 rounded-xl p-1 border border-slate-800 flex overflow-hidden">
              <div
                style={{ width: `${percentCash}%` }}
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-l-lg transition-all duration-500 relative group"
                title={`Kas Cair: ${percentCash.toFixed(1)}%`}
              />
              <div
                style={{ width: `${percentStock}%` }}
                className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-r-lg transition-all duration-500 relative group"
                title={`Ekuitas Stok: ${percentStock.toFixed(1)}%`}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-slate-300 pt-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" />
                <span>Kas Tunai di Kasir: <strong>{formatRupiah(summary.saldoKasSaatIni)}</strong> ({percentCash.toFixed(1)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-purple-500 inline-block" />
                <span>Nilai Stok di Rak: <strong>{formatRupiah(summary.totalNilaiSisaStok)}</strong> ({percentStock.toFixed(1)}%)</span>
              </div>
            </div>
          </div>

          {/* 3 Secondary Financial Insights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs font-mono">
            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl">
              <span className="text-slate-400 text-[11px] block">Laba Bersih Terealisasi</span>
              <span className="text-emerald-400 font-bold text-base mt-1 block">
                +{formatRupiah(summary.totalGainTerjual)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">Dari unit yang sudah laku</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl">
              <span className="text-slate-400 text-[11px] block">Rata-rata Margin Laba</span>
              <span className="text-cyan-400 font-bold text-base mt-1 block">
                {formatAngka(summary.rataRataMargin, 1)}%
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">Margin kotor per produk</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl">
              <span className="text-slate-400 text-[11px] block">Potensi Untung Sisa Stok</span>
              <span className="text-amber-300 font-bold text-base mt-1 block">
                +{formatRupiah(Math.max(0, summary.totalSetelahUntungPenuh - summary.totalPengeluaranBeli - summary.totalGainTerjual))}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">Jika sisa stok terjual habis</span>
            </div>
          </div>

          {/* Monthly Profit Savings Simulation */}
          <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-2xl space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-emerald-300 font-bold">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Alokasi Tabungan Laba Bulanan ({50}%)
              </span>
              <span className="text-white text-sm">{formatRupiah(summary.totalSimpananSetelah1Bulan)}</span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Disisihkan dari total untung bersih untuk memperbesar modal cadangan atau dana darurat toko. Sisa kas siap diputar kembali untuk kulakan: <strong className="text-white font-mono">{formatRupiah(summary.totalKasDiputarBulanDepan)}</strong>.
            </p>
          </div>
        </div>

        {/* Right Column: Top Performing Products */}
        <div className="lg:col-span-5 bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Produk Terlaris & Kontributor Laba
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">{filteredItems.length} barang</span>
            </div>

            {/* Top Profit Items */}
            <div className="space-y-3 mb-5">
              <div className="text-[11px] font-mono font-semibold text-emerald-400 uppercase tracking-wider">
                Top Penghasil Laba Bersih
              </div>
              {topGainItems.length > 0 ? (
                topGainItems.map((entry, idx) => (
                  <div key={entry.item.id} className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="text-white font-medium truncate">{entry.item.namaBarang}</div>
                        <div className="text-[10px] text-slate-400">{entry.item.jumlahBarangDijualSatuan} terjual</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-emerald-400 font-bold">+{formatRupiah(entry.calc.totalGainTerjual)}</div>
                      <div className="text-[10px] text-slate-500">Margin {entry.calc.marginPersen.toFixed(0)}%</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 font-mono py-2 text-center bg-slate-950/50 rounded-xl">
                  Belum ada unit barang yang terjual
                </div>
              )}
            </div>

            {/* Top Sold Units */}
            <div className="space-y-3">
              <div className="text-[11px] font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                Top Volume Unit Terjual
              </div>
              {topSoldItems.length > 0 ? (
                topSoldItems.map((entry, idx) => (
                  <div key={entry.item.id} className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="text-white font-medium truncate">{entry.item.namaBarang}</div>
                        <div className="text-[10px] text-slate-400">Sisa stok: {entry.calc.sisaStokSatuan} unit</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-cyan-300 font-bold">{entry.item.jumlahBarangDijualSatuan} {entry.item.satuanUnit}</div>
                      <div className="text-[10px] text-slate-500">Omset {formatRupiah(entry.calc.totalPendapatanTerjual)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 font-mono py-2 text-center bg-slate-950/50 rounded-xl">
                  Belum ada catatan penjualan
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Status BEP Toko:</span>
            <span className={`font-semibold ${summary.totalPemasukanJual >= summary.totalPengeluaranBeli ? 'text-emerald-400' : 'text-amber-300'}`}>
              {summary.totalPemasukanJual >= summary.totalPengeluaranBeli 
                ? 'Modal Kulakan Sudah Tertutup Penuh' 
                : `Kurang ${formatRupiah(summary.totalPengeluaranBeli - summary.totalPemasukanJual)} untuk balik modal kulakan`}
            </span>
          </div>
        </div>
      </div>

      {/* DETAILED SALES & EQUITY BREAKDOWN TABLE */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
        {/* Table Filters & Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Tabel Rincian Penjualan & Ekuitas Aset Per Barang
              </h2>
              <p className="text-[11px] font-mono text-slate-400">
                Menampilkan omset uang masuk kas, modal balik, keuntungan bersih, dan sisa aset stok
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama barang..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono w-44 sm:w-56"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="gain" className="bg-slate-900 text-white">Urut: Laba Terbesar</option>
                <option value="terjual" className="bg-slate-900 text-white">Urut: Unit Terlaris</option>
                <option value="omset" className="bg-slate-900 text-white">Urut: Omset Terbesar</option>
                <option value="nilaiStok" className="bg-slate-900 text-white">Urut: Nilai Sisa Stok</option>
                <option value="terbaru" className="bg-slate-900 text-white">Urut: Tanggal Terbaru</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-300 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                <th className="py-3 px-3.5 font-bold">No</th>
                <th className="py-3 px-3.5 font-bold">Barang & Tanggal</th>
                <th className="py-3 px-3.5 font-bold text-right">Modal Kulakan</th>
                <th className="py-3 px-3.5 font-bold text-center">Terjual / Stok</th>
                <th className="py-3 px-3.5 font-bold text-right">Harga Jual</th>
                <th className="py-3 px-3.5 font-bold text-right text-cyan-300">Omset Masuk Kas</th>
                <th className="py-3 px-3.5 font-bold text-right text-emerald-300">Untung Bersih</th>
                <th className="py-3 px-3.5 font-bold text-right text-purple-300">Nilai Sisa Stok</th>
                <th className="py-3 px-3.5 font-bold text-center">Status Modal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
              {sortedAnalyzedItems.length > 0 ? (
                sortedAnalyzedItems.map((entry, index) => {
                  const { item, calc } = entry;
                  const percentSold = item.jumlahBarangWadah > 0 
                    ? (item.jumlahBarangDijualSatuan / item.jumlahBarangWadah) * 100 
                    : 0;

                  return (
                    <tr 
                      key={item.id}
                      className="hover:bg-slate-900/70 transition-colors"
                    >
                      <td className="py-3 px-3.5 text-slate-500 font-semibold">
                        {index + 1}
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="font-bold font-sans text-white text-xs">
                          {item.namaBarang}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {item.tanggalInput || new Date(item.createdAt).toISOString().slice(0, 10)} · {item.jumlahBarangWadah} {item.satuanUnit} / {item.satuanWadah}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <div className="text-slate-200 font-semibold">{formatRupiah(item.hargaBeli)}</div>
                        <div className="text-[10px] text-slate-500">HPP: {formatRupiah(calc.hppSatuan)}/{item.satuanUnit}</div>
                      </td>

                      <td className="py-3 px-3.5 text-center">
                        <div className="inline-flex items-center gap-1 font-bold text-slate-200">
                          <span className="text-emerald-400">{item.jumlahBarangDijualSatuan}</span>
                          <span className="text-slate-500">/</span>
                          <span>{item.jumlahBarangWadah}</span>
                        </div>
                        <div className="w-16 h-1 bg-slate-800 rounded-full mx-auto mt-1 overflow-hidden">
                          <div 
                            style={{ width: `${Math.min(100, percentSold)}%` }}
                            className="h-full bg-emerald-400 rounded-full"
                          />
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-right text-slate-300 font-medium">
                        {formatRupiah(item.hargaJualSatuan)}
                      </td>

                      <td className="py-3 px-3.5 text-right font-bold text-cyan-300">
                        {formatRupiah(calc.totalPendapatanTerjual)}
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <div className="font-bold text-emerald-400">
                          +{formatRupiah(calc.totalGainTerjual)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Margin {calc.marginPersen.toFixed(0)}%
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-right font-semibold text-purple-300">
                        {formatRupiah(calc.nilaiSisaStok)}
                      </td>

                      <td className="py-3 px-3.5 text-center">
                        {calc.isModalLunas ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Lunas Modal
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            Sisa {formatRupiah(Math.max(0, item.hargaBeli - calc.totalPendapatanTerjual))}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-mono text-xs">
                    {searchTerm ? 'Tidak ada barang yang cocok dengan kata kunci pencarian.' : 'Belum ada data barang di periode ini.'}
                  </td>
                </tr>
              )}
            </tbody>
            {/* Table Footer Totals */}
            {sortedAnalyzedItems.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 font-mono font-bold text-xs text-white border-t border-slate-700">
                  <td colSpan={2} className="py-3.5 px-3.5 uppercase tracking-wider">
                    Total Keseluruhan ({sortedAnalyzedItems.length} Barang)
                  </td>
                  <td className="py-3.5 px-3.5 text-right text-slate-200">
                    {formatRupiah(summary.totalPengeluaranBeli)}
                  </td>
                  <td className="py-3.5 px-3.5 text-center text-slate-400">
                    -
                  </td>
                  <td className="py-3.5 px-3.5 text-right text-slate-400">
                    -
                  </td>
                  <td className="py-3.5 px-3.5 text-right text-cyan-300 text-sm">
                    {formatRupiah(summary.totalPemasukanJual)}
                  </td>
                  <td className="py-3.5 px-3.5 text-right text-emerald-400 text-sm">
                    +{formatRupiah(summary.totalGainTerjual)}
                  </td>
                  <td className="py-3.5 px-3.5 text-right text-purple-300 text-sm">
                    {formatRupiah(summary.totalNilaiSisaStok)}
                  </td>
                  <td className="py-3.5 px-3.5 text-center text-[10px] text-slate-400">
                    {summary.totalPemasukanJual >= summary.totalPengeluaranBeli ? 'BEP Tercapai' : 'Proses BEP'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
