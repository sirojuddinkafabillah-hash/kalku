import React, { useState } from 'react';
import { GlobalSummary } from '../types/inventory';
import { formatRupiah, formatAngka } from '../utils/calculator';
import { Wallet, RefreshCw, Edit3, Check, TrendingUp, TrendingDown, ArrowDownRight, ArrowUpRight, Percent, ShieldCheck } from 'lucide-react';

interface SummaryCardsProps {
  summary: GlobalSummary;
  modalAwal: number;
  onUpdateModalAwal: (newModal: number) => void;
  onOpenGuide: () => void;
  currentRealTime: string;
  bulanFilter: string;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
  modalAwal,
  onUpdateModalAwal,
  onOpenGuide,
  currentRealTime,
  bulanFilter,
}) => {
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [modalInput, setModalInput] = useState(String(modalAwal));

  const handleSaveModal = () => {
    const val = Math.max(0, Number(modalInput) || 0);
    onUpdateModalAwal(val);
    setIsEditingModal(false);
  };

  const isTumbuh = summary.persenTumbuhRugi > 0;
  const isRugi = summary.saldoKasSaatIni < 0;

  return (
    <section className="mb-6 space-y-4">
      {/* Capital Setup Bar & Dynamic Flow Explanation */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Modal Awal Setting */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
              Rp
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Modal Awal Usaha
                </span>
                {!isEditingModal && (
                  <button
                    onClick={() => {
                      setModalInput(String(modalAwal));
                      setIsEditingModal(true);
                    }}
                    className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Ubah Modal Awal"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isEditingModal ? (
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={modalInput}
                    onChange={(e) => setModalInput(e.target.value)}
                    className="px-2 py-1 text-base font-bold font-mono text-slate-900 bg-white rounded focus:outline-none w-36"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveModal}
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-white cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-2xl font-extrabold font-mono tabular-nums text-white">
                  {formatRupiah(modalAwal)}
                </div>
              )}
            </div>
          </div>

          {/* Quick Flow Breakdown & Real-Time Clock */}
          <div className="flex items-center gap-4 text-xs font-mono border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6">
            <div>
              <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                <span>Total Beli Barang:</span>
              </div>
              <div className="text-sm font-bold text-rose-400 tabular-nums">
                -{formatRupiah(summary.totalPengeluaranBeli)}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hasil Penjualan Masuk:</span>
              </div>
              <div className="text-sm font-bold text-emerald-400 tabular-nums">
                +{formatRupiah(summary.totalPemasukanJual)}
              </div>
            </div>

            <div className="hidden lg:block pl-2 border-l border-slate-800 text-[11px]">
              <span className="text-slate-500 block">Waktu Sistem Real-time:</span>
              <span className="text-slate-300 font-mono font-semibold">{currentRealTime}</span>
            </div>
          </div>
        </div>

        {/* Informative Explanation of the Formula */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 leading-relaxed">
          <div>
            <strong className="text-emerald-300">Aliran Sisa Kas:</strong> Setiap input barang memotong kas. Saat barang terjual, modal kembali dan keuntungan langsung masuk menambah sisa kas untuk diputar belanja barang berikutnya.
          </div>
          <div className="text-slate-300 font-mono shrink-0">
            Periode: <span className="text-white font-bold">{bulanFilter === 'all' ? 'Semua Periode' : `Bulan ${bulanFilter}`}</span>
          </div>
        </div>
      </div>

      {/* 4 Main Summary Cards Focusing on SISA KAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: SISA KAS SAAT INI (FOKUS UTAMA) */}
        <div className="bg-emerald-900 text-white rounded-2xl p-5 shadow-xs border border-emerald-700 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-200">
            <div className="flex items-center gap-1.5 uppercase tracking-wide">
              <Wallet className="w-4 h-4 text-emerald-300" />
              <span>Sisa Kas Saat Ini</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-950 bg-emerald-300 font-bold px-2 py-0.5 rounded">
              Uang di Kasir
            </span>
          </div>

          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
            {formatRupiah(summary.saldoKasSaatIni)}
          </div>

          <div className="mt-2 text-xs text-emerald-200/90 leading-snug">
            Sisa modal ({formatRupiah(summary.sisaModalSebelumJual)}) + hasil jual ({formatRupiah(summary.totalPemasukanJual)}).
          </div>

          <div className="mt-2 text-[11px] text-emerald-300 font-semibold">
            Kas siap dipakai belanja kulakan stok baru
          </div>
        </div>

        {/* Card 2: TOTAL UNTUNG (GAIN) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
            <div className="flex items-center gap-1.5 uppercase tracking-wide">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Total Untung (Gain)</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
              Laba Bersih
            </span>
          </div>

          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono tabular-nums">
            +{formatRupiah(summary.totalGainTerjual)}
          </div>

          <p className="mt-2 text-xs text-slate-600 leading-snug">
            Keuntungan nyata dari barang yang telah terjual.
          </p>

          <div className="mt-2 text-[11px] text-slate-500 font-mono">
            Rata-rata Margin: {formatAngka(summary.rataRataMargin, 1)}%
          </div>
        </div>

        {/* Card 3: PERSENTASE TUMBUH & RUGI */}
        <div className={`rounded-2xl p-5 shadow-xs border ${
          isTumbuh
            ? 'bg-emerald-50/80 border-emerald-200'
            : isRugi
            ? 'bg-rose-50/80 border-rose-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-1.5 uppercase tracking-wide text-slate-800">
              <Percent className="w-4 h-4 text-slate-700" />
              <span>Pertumbuhan Modal</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
              isTumbuh
                ? 'bg-emerald-200 text-emerald-900'
                : isRugi
                ? 'bg-rose-200 text-rose-900'
                : 'bg-slate-200 text-slate-700'
            }`}>
              {isTumbuh ? 'Tumbuh' : isRugi ? 'Defisit' : 'Impas (BEP)'}
            </span>
          </div>

          <div className="mt-3 text-2xl sm:text-3xl font-extrabold font-mono tabular-nums">
            <span className={isTumbuh ? 'text-emerald-800' : isRugi ? 'text-rose-700' : 'text-slate-800'}>
              {isTumbuh ? `+${formatAngka(summary.persenTumbuhRugi, 1)}%` : isRugi ? `-${formatAngka(Math.abs(summary.persenTumbuhRugi), 1)}%` : '0.0%'}
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-600 leading-snug">
            {isTumbuh
              ? `Pertumbuhan laba riil sebesar +${formatRupiah(summary.totalGainTerjual)}.`
              : isRugi
              ? 'Arus kas berada di bawah modal awal. Jual sisa stok.'
              : 'Belum ada barang laku terjual.'}
          </p>

          <div className="mt-2 text-[11px] text-slate-500 font-mono">
            Nilai Stok di Rak: {formatRupiah(summary.totalNilaiSisaStok)}
          </div>
        </div>

        {/* Card 4: TOTAL SETELAH UNTUNG (NILAI TOTAL EKUITAS) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
            <div className="flex items-center gap-1.5 uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-slate-700" />
              <span>Total Setelah Untung</span>
            </div>
            <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              Modal + Untung
            </span>
          </div>

          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
            {formatRupiah(summary.totalSetelahUntung)}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs font-mono text-slate-600">
            <div>
              <span className="text-slate-400 block text-[10px]">Modal Awal:</span>
              <span className="font-semibold text-slate-800">{formatRupiah(modalAwal)}</span>
            </div>
            <div>
              <span className="text-emerald-600 block text-[10px]">+ Total Untung:</span>
              <span className="font-bold text-emerald-700">+{formatRupiah(summary.totalGainTerjual)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
