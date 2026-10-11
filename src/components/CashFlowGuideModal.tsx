import React from 'react';
import { X, Calendar, PiggyBank, ShieldCheck, Wallet } from 'lucide-react';

interface CashFlowGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CashFlowGuideModal: React.FC<CashFlowGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-bold text-neutral-900">
              Panduan: Simpanan Dihitung Setelah Untung 1 Bulan & Total Setelah Untung
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-neutral-700 leading-relaxed">
          {/* Konsep 1: Total Setelah Untung */}
          <div className="bg-neutral-900 text-white p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>1. APA ITU &apos;TOTAL SETELAH UNTUNG&apos;?</span>
            </div>
            <p className="text-neutral-300">
              <strong>Total Setelah Untung</strong> adalah total seluruh uang kas hasil penjualan setelah ditambahkan keuntungan bersih:
            </p>
            <div className="p-2.5 bg-neutral-800 rounded font-mono text-emerald-300 text-xs">
              Total Setelah Untung = Modal Pokok (HPP) + Total Keuntungan (Gain)
            </div>
            <p className="text-neutral-400 text-[11px]">
              Artinya jika Anda kulakan Rp 100.000 dan dapat untung Rp 20.000, maka Total Setelah Untung di tangan kasir adalah <strong>Rp 120.000</strong>.
            </p>
          </div>

          {/* Konsep 2: Mengapa Simpanan Baru Dihitung Setelah 1 Bulan? */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-neutral-900 text-sm">
              <Calendar className="w-4 h-4 text-blue-700" />
              <span>2. MENGAPA SIMPANAN DIHITUNG SETELAH UNTUNG 1 BULAN?</span>
            </div>
            <p>
              Banyak warung dan toko UMKM gulung tikar karena mengambil keuntungan harian sedikit-sedikit untuk jajan atau keperluan pribadi. Akibatnya saat distributor datang menagih atau ingin beli 1 wadah baru, uang kas belanja sudah berkurang.
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-neutral-600">
              <li>
                <strong>Hari ke-1 s/d Hari ke-30:</strong> Seluruh uang penjualan (modal pokok + laba harian) harus terus diputar 100% untuk belanja wadah dan stok dagangan agar rak toko selalu penuh.
              </li>
              <li>
                <strong>Tutup Buku di Akhir Bulan:</strong> Seluruh keuntungan diakumulasikan menjadi <strong>Untung 1 Bulan</strong>.
              </li>
              <li>
                <strong>Penyisihan Simpanan:</strong> Barulah di akhir bulan diambil persentase yang disepakati (misal 50% atau 70% dari untung 1 bulan) untuk disimpan ke tabungan pribadi atau dana darurat. Sisa labanya digulung menjadi tambahan modal kerja bulan berikutnya.
              </li>
            </ul>
          </div>

          {/* Contoh Nyata */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-900 text-xs">
              <PiggyBank className="w-4 h-4 text-blue-700" />
              <span>Simulasi Angka Nyata Penjualan 1 Bulan:</span>
            </div>
            <div className="space-y-1 text-blue-950 font-mono text-[11px]">
              <div>• Modal Pokok Terjual: Rp 2.000.000</div>
              <div>• Total Untung Bersih (Gain): Rp 600.000</div>
              <div className="font-bold pt-1 border-t border-blue-200">• TOTAL SETELAH UNTUNG: Rp 2.600.000</div>
            </div>
            <div className="pt-2 text-[11px] text-blue-800">
              Jika aturan simpanan bulanan adalah <strong>50%</strong>:
              <br />
              → <strong>Simpanan Setelah Untung 1 Bulan:</strong> Rp 300.000 (disimpan ke rekening tabungan).
              <br />
              → <strong>Modal Diputar Bulan Depan:</strong> Rp 2.300.000 (modal pokok Rp 2 jt + sisa laba Rp 300 rb untuk tambah barang).
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg cursor-pointer"
          >
            Saya Paham
          </button>
        </div>
      </div>
    </div>
  );
};
