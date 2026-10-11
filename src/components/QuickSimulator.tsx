import React, { useState } from 'react';
import { InventoryItem } from '../types/inventory';
import { calculateItem, formatRupiah, formatAngka } from '../utils/calculator';
import { Calculator, Plus, Wallet, PiggyBank, Target } from 'lucide-react';

interface QuickSimulatorProps {
  onAddFromSimulator: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const QuickSimulator: React.FC<QuickSimulatorProps> = ({ onAddFromSimulator }) => {
  const [namaBarang, setNamaBarang] = useState('Biskuit Kaleng Khong Guan');
  const [satuanWadah, setSatuanWadah] = useState('Dus');
  const [jumlahWadah, setJumlahWadah] = useState(6);
  const [satuanUnit, setSatuanUnit] = useState('Kaleng');
  const [hargaBeli, setHargaBeli] = useState(570000); // Rp 570.000 (HPP 95.000)
  const [hargaJual, setHargaJual] = useState(115000); // Jual 115.000
  const [jumlahJual, setJumlahJual] = useState(4);
  const [persenSimpan, setPersenSimpan] = useState(50);

  const mockItem: InventoryItem = {
    id: 'sim',
    namaBarang,
    satuanWadah,
    jumlahBarangWadah: Math.max(1, jumlahWadah),
    satuanUnit,
    hargaBeli,
    jumlahBarangDijualSatuan: Math.min(jumlahWadah, Math.max(0, jumlahJual)),
    hargaJualSatuan: hargaJual,
    perputaranBulan: 1,
    persentaseLabaDisimpanBulanan: persenSimpan,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const calc = calculateItem(mockItem);

  const targetMargins = [10, 15, 20, 25, 30];
  const targetPrices = targetMargins.map((m) => {
    const suggestedPrice = Math.ceil((calc.hppSatuan / (1 - m / 100)) / 500) * 500;
    return {
      margin: m,
      price: suggestedPrice,
      gain: suggestedPrice - calc.hppSatuan,
    };
  });

  const handlePushToTable = () => {
    onAddFromSimulator({
      namaBarang,
      satuanWadah,
      jumlahBarangWadah: Math.max(1, jumlahWadah),
      satuanUnit,
      hargaBeli,
      jumlahBarangDijualSatuan: Math.min(jumlahWadah, Math.max(0, jumlahJual)),
      hargaJualSatuan: hargaJual,
      perputaranBulan: 1,
      persentaseLabaDisimpanBulanan: persenSimpan,
      catatan: 'Ditambahkan dari simulasi cepat',
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs">
        <div className="max-w-2xl">
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-700" />
            <span>Kalkulator Simulasi Penjualan & Untung 1 Bulan</span>
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Hitung perkiraan laba, total setelah untung, dan simpanan setelah 1 bulan sebelum kulakan wadah stok grosir.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Nama Rencana Barang
            </label>
            <input
              type="text"
              value={namaBarang}
              onChange={(e) => setNamaBarang(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Wadah Grosir
              </label>
              <input
                type="text"
                value={satuanWadah}
                onChange={(e) => setSatuanWadah(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Isi Satuan (1 Wadah)
              </label>
              <input
                type="number"
                min="1"
                value={jumlahWadah}
                onChange={(e) => setJumlahWadah(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg font-mono focus:ring-2 focus:ring-neutral-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Satuan Eceran
            </label>
            <input
              type="text"
              value={satuanUnit}
              onChange={(e) => setSatuanUnit(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Harga Beli 1 Wadah (Modal)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-400">Rp</span>
              <input
                type="number"
                min="0"
                step="500"
                value={hargaBeli}
                onChange={(e) => setHargaBeli(Math.max(0, Number(e.target.value)))}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg font-mono focus:ring-2 focus:ring-neutral-900 focus:outline-none"
              />
            </div>
            <div className="mt-1 text-[11px] text-neutral-500 font-mono">
              HPP: {formatRupiah(calc.hppSatuan)} / {satuanUnit}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Harga Jual per Satuan
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-400">Rp</span>
              <input
                type="number"
                min="0"
                step="500"
                value={hargaJual}
                onChange={(e) => setHargaJual(Math.max(0, Number(e.target.value)))}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg font-mono focus:ring-2 focus:ring-neutral-900 focus:outline-none"
              />
            </div>
            <div className="mt-1 text-[11px] text-neutral-500 font-mono">
              Untung: {formatRupiah(calc.gainSatuan)} / {satuanUnit} ({formatAngka(calc.marginPersen, 1)}%)
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Simulasi Terjual ({jumlahJual} dari {jumlahWadah} {satuanUnit})
            </label>
            <input
              type="range"
              min="0"
              max={jumlahWadah}
              value={jumlahJual}
              onChange={(e) => setJumlahJual(Number(e.target.value))}
              className="w-full accent-neutral-900 cursor-pointer mt-2"
            />
            <div className="mt-1 flex justify-between text-[11px] text-neutral-500 font-mono">
              <span>0 unit</span>
              <span>BEP: {calc.bepSatuan} unit</span>
              <span>{jumlahWadah} unit</span>
            </div>
          </div>
        </div>

        {/* Live Simulation Outcomes */}
        <div className="mt-6 pt-6 border-t border-neutral-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-neutral-900 text-white rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>TOTAL SETELAH UNTUNG:</span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-emerald-300 font-mono tabular-nums">
              {formatRupiah(calc.totalSetelahUntungTerjual)}
            </div>
            <p className="mt-1 text-xs text-neutral-300">
              Modal pokok yang kembali ({formatRupiah(calc.totalModalKembali)}) ditambah untung bersih ({formatRupiah(calc.totalGainTerjual)}).
            </p>
          </div>

          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
              <PiggyBank className="w-4 h-4 text-blue-700" />
              <span>SIMPANAN SETELAH UNTUNG 1 BULAN:</span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-blue-900 font-mono tabular-nums">
              {formatRupiah(calc.simpananSetelahUntung1Bulan)}
            </div>
            <p className="mt-1 text-xs text-neutral-600">
              Disisihkan di akhir bulan ({persenSimpan}% dari laba bulanan) tanpa mengganggu perputaran modal selama 30 hari berjalan.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end">
          <button
            onClick={handlePushToTable}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Simpan Hasil Simulasi ke Tabel</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-neutral-700" />
            <span>Target Margin Keuntungan</span>
          </h3>
          <span className="text-xs text-neutral-500 font-mono">
            HPP: {formatRupiah(calc.hppSatuan)}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {targetPrices.map((target) => (
            <button
              key={target.margin}
              onClick={() => setHargaJual(target.price)}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                hargaJual === target.price
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800'
              }`}
            >
              <div className="text-xs font-bold">Margin {target.margin}%</div>
              <div className="mt-1 text-sm font-extrabold font-mono tabular-nums">
                {formatRupiah(target.price)}
              </div>
              <div className={`mt-0.5 text-[11px] font-mono ${hargaJual === target.price ? 'text-neutral-300' : 'text-neutral-500'}`}>
                Untung +{formatRupiah(target.gain)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
