import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { formatRupiah } from '../utils/calculator';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  item?: InventoryItem | null;
  mode?: 'single' | 'all';
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  item,
  mode = 'single',
}) => {
  if (!isOpen) return null;

  const isAll = mode === 'all';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-700/80 text-slate-100 rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {isAll ? 'Kosongkan Seluruh Tabel?' : 'Hapus Barang Ini?'}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Penyimpanan MongoDB Atlas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {isAll ? (
            <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-200 leading-relaxed font-sans">
              <div className="flex items-center gap-2 font-bold font-mono text-rose-300 mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Peringatan Penghapusan Masal</span>
              </div>
              Seluruh data transaksi dan stok barang akan dihapus permanen dari database MongoDB Atlas. Uang kasir akan dihitung ulang berdasarkan modal awal.
            </div>
          ) : item ? (
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
              <div className="text-sm font-bold text-white font-sans">
                {item.namaBarang}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                <div>
                  <span>Kemas: </span>
                  <span className="text-slate-200">{item.jumlahBarangWadah} {item.satuanUnit} / {item.satuanWadah}</span>
                </div>
                <div>
                  <span>Beli: </span>
                  <span className="text-slate-200">{formatRupiah(item.hargaBeli)}</span>
                </div>
                <div>
                  <span>Terjual: </span>
                  <span className="text-emerald-400 font-semibold">{item.jumlahBarangDijualSatuan} unit</span>
                </div>
                <div>
                  <span>Harga Jual: </span>
                  <span className="text-slate-200">{formatRupiah(item.hargaJualSatuan)}</span>
                </div>
              </div>
            </div>
          ) : null}

          <p className="text-xs text-slate-400 font-sans">
            Data akan segera diperbarui secara langsung di server MongoDB Atlas.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-mono font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isAll ? 'Ya, Kosongkan Semua' : 'Ya, Hapus Sekarang'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
