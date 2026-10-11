import React, { useState } from 'react';
import { InventoryItem, GlobalSummary } from '../types/inventory';
import { Sparkles, RefreshCw, AlertCircle, ChevronDown, ChevronUp, CheckCircle, Copy, Check, DollarSign, Package, TrendingUp } from 'lucide-react';

interface AiAdvisorProps {
  items: InventoryItem[];
  summary: GlobalSummary;
  modalAwal: number;
  bulanFilter: string;
}

export const AiAdvisor: React.FC<AiAdvisorProps> = ({
  items,
  summary,
  modalAwal,
  bulanFilter,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<'general' | 'cashflow' | 'restock' | 'pricing'>('general');
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFetchAiAdvice = async (mode: 'general' | 'cashflow' | 'restock' | 'pricing' = activeMode) => {
    setActiveMode(mode);
    setIsLoading(true);
    setErrorMsg(null);
    setIsOpen(true);

    try {
      const response = await fetch('/api/ai/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items,
          summary,
          modalAwal,
          bulanFilter,
          focusMode: mode,
        }),
      });

      if (!response.ok) {
        throw new Error('Gagal menghubungi asisten AI');
      }

      const data = await response.json();
      setAnalysisText(data.analysis || 'Tidak ada analisis yang dihasilkan.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal memuat analisis AI. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAdvice = () => {
    if (!analysisText) return;
    navigator.clipboard.writeText(analysisText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalItemsCount = items.length;
  const soldItemsCount = items.filter((i) => i.jumlahBarangDijualSatuan > 0).length;
  const isKasSehat = summary.saldoKasSaatIni >= modalAwal * 0.4;

  return (
    <div className="bg-white/95 backdrop-blur-xs border border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Asisten Evaluasi & Penasihat Bisnis AI
              </h2>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Smart Advisor Real-time
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluasi otomatis perputaran kas toko, deteksi rugi/modal macet, dan saran restock cerdas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => handleFetchAiAdvice(activeMode)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Mengevaluasi...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{analysisText ? 'Perbarui Evaluasi AI' : 'Minta Evaluasi & Saran AI'}</span>
              </>
            )}
          </button>

          {analysisText && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title={isOpen ? 'Sembunyikan Analisis' : 'Tampilkan Analisis'}
            >
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Quick Financial Health Badges */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <span className="text-slate-400 block text-[10px]">Likuiditas Kas:</span>
          <span className={`font-bold ${isKasSehat ? 'text-emerald-700' : 'text-amber-700'}`}>
            {isKasSehat ? '✅ Kas Cukup Putar' : '⚠️ Kas Menipis'}
          </span>
        </div>

        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <span className="text-slate-400 block text-[10px]">Tingkat Laku:</span>
          <span className="font-bold text-slate-800">
            {soldItemsCount} / {totalItemsCount} Barang ({totalItemsCount > 0 ? Math.round((soldItemsCount / totalItemsCount) * 100) : 0}%)
          </span>
        </div>

        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <span className="text-slate-400 block text-[10px]">Pertumbuhan Modal:</span>
          <span className={`font-bold ${summary.persenTumbuhRugi > 0 ? 'text-emerald-700' : summary.persenTumbuhRugi < 0 ? 'text-rose-700' : 'text-slate-700'}`}>
            {summary.persenTumbuhRugi > 0 ? `+${summary.persenTumbuhRugi.toFixed(1)}%` : `${summary.persenTumbuhRugi.toFixed(1)}%`}
          </span>
        </div>

        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <span className="text-slate-400 block text-[10px]">Aset Tertahan di Stok:</span>
          <span className="font-bold text-slate-700">
            Rp {Math.round(summary.totalNilaiSisaStok).toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      {/* Analysis Output Container */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-200/80 animate-in fade-in duration-150">
          {/* Quick Focus Mode Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3">
            {[
              { id: 'general', label: '📊 Evaluasi Menyeluruh', icon: TrendingUp },
              { id: 'cashflow', label: '💰 Arus Kas & Likuiditas', icon: DollarSign },
              { id: 'restock', label: '📦 Saran Restock & Stok', icon: Package },
              { id: 'pricing', label: '🏷️ Harga & Margin', icon: Sparkles },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleFetchAiAdvice(tab.id as any)}
                disabled={isLoading}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeMode === tab.id
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {isLoading && (
            <div className="py-8 text-center text-slate-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
              <p className="text-xs font-medium text-slate-700">
                AI sedang menganalisis buku kas toko Anda...
              </p>
              <p className="text-[11px] text-slate-400">
                Menghitung margin per barang, modal tertahan, dan rekomendasi langkah bisnis.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!isLoading && analysisText && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50/90 border border-slate-200/90 rounded-xl text-xs text-slate-800 leading-relaxed whitespace-pre-line font-sans shadow-2xs">
                {analysisText}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 flex-wrap gap-2">
                <span className="flex items-center gap-1 text-emerald-700">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Dihitung dari data real-time transaksi saat ini</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyAdvice}
                    className="flex items-center gap-1 px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                    <span>{copied ? 'Tersalin' : 'Salin Saran AI'}</span>
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="hover:text-slate-800 underline cursor-pointer ml-1"
                  >
                    Tutup Panel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
