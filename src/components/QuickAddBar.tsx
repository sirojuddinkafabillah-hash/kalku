import React, { useState } from 'react';
import { InventoryItem } from '../types/inventory';
import { calculateItem, formatRupiah } from '../utils/calculator';
import { Plus, Calendar } from 'lucide-react';

interface QuickAddBarProps {
  onAdd: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  globalSavePercentMonthly?: number;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({ onAdd, globalSavePercentMonthly = 0 }) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [tanggalInput, setTanggalInput] = useState(todayStr);
  const [namaBarang, setNamaBarang] = useState('');
  const [jumlahWadah, setJumlahWadah] = useState<number | ''>('');
  const [hargaBeli, setHargaBeli] = useState<number | ''>('');
  const [jumlahJual, setJumlahJual] = useState<number | ''>(0); // Default 0 (Belum terjual!)
  const [hargaJual, setHargaJual] = useState<number | ''>('');

  const numJumlahWadah = Number(jumlahWadah) || 0;
  const numHargaBeli = Number(hargaBeli) || 0;
  const numHargaJual = Number(hargaJual) || 0;
  const numJumlahJual = Number(jumlahJual) || 0;

  const hasBasicData = numJumlahWadah > 0 && numHargaBeli > 0 && numHargaJual > 0;

  const previewCalc = hasBasicData
    ? calculateItem({
        id: 'tmp',
        namaBarang: namaBarang || 'Barang',
        satuanWadah: 'Wadah',
        jumlahBarangWadah: numJumlahWadah,
        satuanUnit: 'pcs',
        hargaBeli: numHargaBeli,
        jumlahBarangDijualSatuan: numJumlahJual,
        hargaJualSatuan: numHargaJual,
        perputaranBulan: 1,
        persentaseLabaDisimpanBulanan: globalSavePercentMonthly,
        tanggalInput: tanggalInput || todayStr,
        createdAt: 0,
        updatedAt: 0,
      })
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaBarang.trim()) return;
    if (numJumlahWadah <= 0) return;
    if (numHargaBeli <= 0) return;
    if (numHargaJual <= 0) return;

    onAdd({
      namaBarang: namaBarang.trim(),
      satuanWadah: 'Wadah',
      jumlahBarangWadah: numJumlahWadah,
      satuanUnit: 'pcs',
      hargaBeli: numHargaBeli,
      jumlahBarangDijualSatuan: numJumlahJual,
      hargaJualSatuan: numHargaJual,
      perputaranBulan: 1,
      persentaseLabaDisimpanBulanan: globalSavePercentMonthly,
      tanggalInput: tanggalInput || todayStr,
    });

    setNamaBarang('');
    setJumlahWadah('');
    setHargaBeli('');
    setJumlahJual(0);
    setHargaJual('');
  };

  return (
    <div className="bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <span>+ Input Barang Baru</span>
        </h2>
        <span className="text-[11px] text-slate-500">
          Harga beli memotong modal tunai, untung otomatis dihitung saat ada barang terjual
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          {/* Tanggal Input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Tanggal</span>
            </label>
            <input
              type="date"
              required
              value={tanggalInput}
              onChange={(e) => setTanggalInput(e.target.value)}
              className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
            />
          </div>

          {/* Nama Barang */}
          <div className="md:col-span-1">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Nama Barang
            </label>
            <input
              type="text"
              required
              value={namaBarang}
              onChange={(e) => setNamaBarang(e.target.value)}
              placeholder="Contoh: Sprite"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Isi Wadah */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Isi 1 Wadah
            </label>
            <input
              type="number"
              min="1"
              required
              value={jumlahWadah}
              onChange={(e) => setJumlahWadah(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="1 atau 24"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Harga Beli */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Harga Beli (Modal)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              required
              value={hargaBeli}
              onChange={(e) => setHargaBeli(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="32000"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Harga Jual */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Harga Jual Satuan
            </label>
            <input
              type="number"
              min="0"
              step="50"
              required
              value={hargaJual}
              onChange={(e) => setHargaJual(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="74000"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Terjual */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Terjual (Default 0)
            </label>
            <input
              type="number"
              min="0"
              value={jumlahJual}
              onChange={(e) => setJumlahJual(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs">
            {previewCalc ? (
              <div className="flex items-center gap-2.5 flex-wrap text-slate-600 font-mono text-[11px]">
                <span className="text-red-600 font-semibold">
                  Potong Kas: -{formatRupiah(numHargaBeli)}
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                {numJumlahJual === 0 ? (
                  <span className="text-slate-500">
                    Untung: <strong className="text-slate-700">Rp 0</strong> (Belum ada yang laku)
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold">
                    Untung Nyata ({numJumlahJual} laku): +{formatRupiah(previewCalc.totalGainTerjual)}
                  </span>
                )}
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>
                  Masuk Kas: <strong className="text-slate-900 font-bold">+{formatRupiah(previewCalc.totalSetelahUntungTerjual)}</strong>
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">
                Isi data barang di atas untuk melihat perhitungan otomatis aliran modal kas Anda.
              </span>
            )}
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Simpan Barang</span>
          </button>
        </div>
      </form>
    </div>
  );
};
