import React, { useState, useMemo } from 'react';
import { InventoryItem } from '../types/inventory';
import { calculateItem, formatRupiah, formatAngka, formatTanggalSederhana } from '../utils/calculator';
import { Plus, Minus, Trash2, Edit2, Search, Calendar, Clock } from 'lucide-react';

interface InventoryTableProps {
  items: InventoryItem[];
  modalAwal: number;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  onUpdateSoldQty: (id: string, delta: number) => void;
  onSetSoldQty: (id: string, qty: number) => void;
  onResetToSampleData: () => void;
  onClearAll: () => void;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  modalAwal,
  onEditItem,
  onDeleteItem,
  onUpdateSoldQty,
  onSetSoldQty,
  onResetToSampleData,
  onClearAll,
  selectedMonth,
  onSelectMonth,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalQuickSoldItem, setModalQuickSoldItem] = useState<InventoryItem | null>(null);
  const [quickSoldInputVal, setQuickSoldInputVal] = useState<number>(0);

  // Extract unique months from items
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    items.forEach((item) => {
      const dateStr = item.tanggalInput || new Date(item.createdAt).toISOString().slice(0, 7);
      const ym = dateStr.slice(0, 7); // YYYY-MM
      if (ym) monthSet.add(ym);
    });
    return Array.from(monthSet).sort().reverse();
  }, [items]);

  // Calculate Running Cash Balance ("Sisa Kas") per item chronologically
  const runningCashMap = useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...items].sort((a, b) => a.createdAt - b.createdAt);
    let cash = modalAwal;
    for (const it of sorted) {
      const hargaBeli = Number(it.hargaBeli) || 0;
      const hargaJual = Number(it.hargaJualSatuan) || 0;
      const terjual = Number(it.jumlahBarangDijualSatuan) || 0;
      cash = cash - hargaBeli + (hargaJual * terjual);
      map.set(it.id, cash);
    }
    return map;
  }, [items, modalAwal]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Month filter
      if (selectedMonth !== 'all') {
        const itemMonth = (item.tanggalInput || new Date(item.createdAt).toISOString().slice(0, 7)).slice(0, 7);
        if (itemMonth !== selectedMonth) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return item.namaBarang.toLowerCase().includes(query) || (item.catatan || '').toLowerCase().includes(query);
      }
      return true;
    });
  }, [items, selectedMonth, searchQuery]);

  const handleOpenQuickSoldModal = (item: InventoryItem) => {
    setModalQuickSoldItem(item);
    setQuickSoldInputVal(item.jumlahBarangDijualSatuan);
  };

  const handleSaveQuickSoldModal = () => {
    if (modalQuickSoldItem) {
      const val = Math.min(modalQuickSoldItem.jumlahBarangWadah, Math.max(0, Number(quickSoldInputVal) || 0));
      onSetSoldQty(modalQuickSoldItem.id, val);
      setModalQuickSoldItem(null);
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-xs border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
      {/* Table Toolbar & Month Filter */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Daftar Pembukuan Barang
          </span>
          <span className="text-xs font-mono font-medium text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md">
            {filteredItems.length} Data
          </span>

          {/* Month Selector Filter Tabs */}
          <div className="flex items-center gap-1.5 ml-0 sm:ml-2 flex-wrap">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <button
              onClick={() => onSelectMonth('all')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                selectedMonth === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Semua Bulan
            </button>
            {availableMonths.map((ym) => {
              const [year, month] = ym.split('-');
              const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
              return (
                <button
                  key={ym}
                  onClick={() => onSelectMonth(ym)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                    selectedMonth === ym
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {monthName}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama barang..."
                className="w-full sm:w-48 pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          )}

          {items.length === 0 ? (
            <button
              onClick={onResetToSampleData}
              className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Lihat Contoh Sprite
            </button>
          ) : (
            <button
              onClick={onClearAll}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Hapus Semua
            </button>
          )}
        </div>
      </div>

      {/* Clean Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/90 text-slate-700 font-semibold select-none">
              <th className="py-3 px-3 text-center w-10 text-slate-500">NO</th>
              <th className="py-3 px-2 text-left min-w-[100px]">WAKTU</th>
              <th className="py-3 px-3 min-w-[140px]">NAMA BARANG</th>
              <th className="py-3 px-2 text-center min-w-[70px]">ISI</th>
              <th className="py-3 px-2 text-right min-w-[95px]">HARGA BELI</th>
              <th className="py-3 px-2 text-center min-w-[130px] bg-emerald-50/50 text-emerald-950 font-bold">
                TERJUAL
              </th>
              <th className="py-3 px-2 text-right min-w-[90px]">HARGA JUAL</th>
              <th className="py-3 px-2 text-right min-w-[105px]">GAIN (UNTUNG)</th>
              <th className="py-3 px-2 text-right min-w-[100px]">EQUITY (MODAL)</th>
              <th className="py-3 px-3 text-right min-w-[125px] bg-slate-200/50 text-slate-950 font-bold">
                TOTAL SETELAH UNTUNG
              </th>
              <th className="py-3 px-3 text-right min-w-[120px] bg-emerald-100/60 text-emerald-950 font-extrabold">
                SISA KAS
              </th>
              <th className="py-3 px-2 text-center min-w-[60px]">AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 px-4 text-center">
                  <div className="max-w-md mx-auto space-y-1.5 text-slate-500">
                    <p className="text-sm font-semibold text-slate-800">
                      {searchQuery || selectedMonth !== 'all' ? 'Tidak ada barang yang cocok dengan filter.' : 'Belum ada data barang'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Masukkan nama barang, harga beli, dan harga jual pada form di atas. Data akan langsung terhitung rapi.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item, index) => {
                const calc = calculateItem(item);
                const tanggalTampil = formatTanggalSederhana(item.tanggalInput || item.createdAt);
                const jamTampil = item.waktuInput ? item.waktuInput.slice(0, 5) : new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                const rowSisaKas = runningCashMap.get(item.id) ?? modalAwal;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* NO */}
                    <td className="py-2.5 px-2 text-center align-middle font-mono font-bold text-slate-400 bg-slate-50/40">
                      {index + 1}
                    </td>

                    {/* WAKTU INPUT */}
                    <td className="py-2.5 px-2 align-middle font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{tanggalTampil}</div>
                      <div className="text-[10px] text-slate-400">{jamTampil}</div>
                    </td>

                    {/* NAMA BARANG */}
                    <td className="py-2.5 px-3 align-middle font-medium text-slate-900">
                      <div className="font-semibold text-slate-900">{item.namaBarang}</div>
                      {item.catatan && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                          {item.catatan}
                        </div>
                      )}
                    </td>

                    {/* ISI WADAH */}
                    <td className="py-2.5 px-2 text-center align-middle font-mono tabular-nums text-slate-700 font-medium">
                      {item.jumlahBarangWadah} {item.satuanUnit || 'pcs'}
                    </td>

                    {/* HARGA BELI */}
                    <td className="py-2.5 px-2 text-right align-middle font-mono tabular-nums font-semibold text-slate-900">
                      {formatRupiah(item.hargaBeli)}
                    </td>

                    {/* TERJUAL (INPUT ANGKA LANGSUNG + MODEL POPUP) */}
                    <td className="py-2.5 px-2 text-center align-middle bg-emerald-50/20">
                      <div className="inline-flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-300 shadow-2xs">
                        <button
                          onClick={() => onUpdateSoldQty(item.id, -1)}
                          disabled={item.jumlahBarangDijualSatuan <= 0}
                          title="Kurangi 1 unit terjual"
                          className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Minus className="w-3 h-3 text-slate-700" />
                        </button>

                        <input
                          type="number"
                          min="0"
                          max={item.jumlahBarangWadah}
                          value={item.jumlahBarangDijualSatuan}
                          onChange={(e) => {
                            const val = Math.min(item.jumlahBarangWadah, Math.max(0, Number(e.target.value) || 0));
                            onSetSoldQty(item.id, val);
                          }}
                          className="w-11 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-200 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                          title="Ketik angka terjual"
                        />

                        <button
                          onClick={() => onUpdateSoldQty(item.id, 1)}
                          disabled={item.jumlahBarangDijualSatuan >= item.jumlahBarangWadah}
                          title="Tambah 1 unit terjual"
                          className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-slate-700" />
                        </button>

                        <button
                          onClick={() => handleOpenQuickSoldModal(item)}
                          className="ml-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 cursor-pointer"
                          title="Buka Model Input Terjual"
                        >
                          Ubah
                        </button>
                      </div>
                    </td>

                    {/* HARGA JUAL */}
                    <td className="py-2.5 px-2 text-right align-middle font-mono tabular-nums font-semibold text-slate-900">
                      {formatRupiah(item.hargaJualSatuan)}
                    </td>

                    {/* GAIN (UNTUNG) */}
                    <td className="py-2.5 px-2 text-right align-middle font-mono tabular-nums font-bold">
                      {calc.totalGainTerjual > 0 ? (
                        <span className="text-emerald-700">+{formatRupiah(calc.totalGainTerjual)}</span>
                      ) : (
                        <span className="text-slate-400">Rp 0</span>
                      )}
                    </td>

                    {/* EQUITY (MODAL TERTINGGAL / SISA STOK) */}
                    <td className="py-2.5 px-2 text-right align-middle font-mono tabular-nums text-slate-700 font-medium">
                      {formatRupiah(item.jumlahBarangDijualSatuan === 0 ? item.hargaBeli : calc.nilaiSisaStok)}
                    </td>

                    {/* TOTAL SETELAH UNTUNG */}
                    <td className="py-2.5 px-3 text-right align-middle font-mono tabular-nums font-bold text-slate-950 bg-slate-100/60">
                      {formatRupiah(calc.totalSetelahUntungTerjual)}
                    </td>

                    {/* SISA KAS (PENGGANTI SIMPANAN BULANAN) */}
                    <td className="py-2.5 px-3 text-right align-middle font-mono tabular-nums font-extrabold bg-emerald-50/50">
                      <span className={rowSisaKas < 0 ? 'text-rose-600' : 'text-emerald-900'}>
                        {formatRupiah(rowSisaKas)}
                      </span>
                    </td>

                    {/* AKSI */}
                    <td className="py-2.5 px-2 text-center align-middle">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEditItem(item)}
                          title="Edit"
                          className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          title="Hapus"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Sold Modal Dialog */}
      {modalQuickSoldItem && (() => {
        const tempItem: InventoryItem = {
          ...modalQuickSoldItem,
          jumlahBarangDijualSatuan: Math.min(modalQuickSoldItem.jumlahBarangWadah, Math.max(0, Number(quickSoldInputVal) || 0)),
        };
        const tempCalc = calculateItem(tempItem);

        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveQuickSoldModal();
              } else if (e.key === 'Escape') {
                setModalQuickSoldItem(null);
              }
            }}
          >
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 sm:p-6 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mb-1">
                    Model Input Status Terjual
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {modalQuickSoldItem.namaBarang}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kapasitas wadah: <strong className="text-slate-800 font-mono">{modalQuickSoldItem.jumlahBarangWadah} unit</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalQuickSoldItem(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {/* Large Numerical Input and +/- Steppers */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Ketik Jumlah Unit yang Sudah Terjual:
                  </label>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickSoldInputVal(Math.max(0, (Number(quickSoldInputVal) || 0) - 1))}
                      disabled={Number(quickSoldInputVal) <= 0}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <input
                      type="number"
                      min="0"
                      max={modalQuickSoldItem.jumlahBarangWadah}
                      value={quickSoldInputVal}
                      onChange={(e) => setQuickSoldInputVal(Math.min(modalQuickSoldItem.jumlahBarangWadah, Math.max(0, Number(e.target.value) || 0)))}
                      className="flex-1 text-center py-2.5 text-2xl font-mono font-extrabold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                      autoFocus
                    />

                    <button
                      type="button"
                      onClick={() => setQuickSoldInputVal(Math.min(modalQuickSoldItem.jumlahBarangWadah, (Number(quickSoldInputVal) || 0) + 1))}
                      disabled={Number(quickSoldInputVal) >= modalQuickSoldItem.jumlahBarangWadah}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Range Slider */}
                  <div className="mt-3">
                    <input
                      type="range"
                      min="0"
                      max={modalQuickSoldItem.jumlahBarangWadah}
                      value={quickSoldInputVal}
                      onChange={(e) => setQuickSoldInputVal(Number(e.target.value))}
                      className="w-full accent-slate-900 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-0.5">
                      <span>0 (Belum Laku)</span>
                      <span>{Math.round(modalQuickSoldItem.jumlahBarangWadah / 2)} (Setengah)</span>
                      <span>{modalQuickSoldItem.jumlahBarangWadah} (Semua Laku)</span>
                    </div>
                  </div>
                </div>

                {/* Quick Shortcuts */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQuickSoldInputVal(0)}
                    className="py-1.5 px-2 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Reset (0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSoldInputVal(Math.max(0, (Number(quickSoldInputVal) || 0) - 5))}
                    className="py-1.5 px-2 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    -5 Unit
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSoldInputVal(Math.min(modalQuickSoldItem.jumlahBarangWadah, (Number(quickSoldInputVal) || 0) + 5))}
                    className="py-1.5 px-2 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    +5 Unit
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSoldInputVal(modalQuickSoldItem.jumlahBarangWadah)}
                    className="py-1.5 px-2 text-[11px] font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg cursor-pointer"
                  >
                    Semua ({modalQuickSoldItem.jumlahBarangWadah})
                  </button>
                </div>

                {/* Financial Feedback Preview */}
                <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Unit Terjual:</span>
                    <span className="font-bold text-white font-mono">
                      {quickSoldInputVal} / {modalQuickSoldItem.jumlahBarangWadah} unit
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Untung (Gain):</span>
                      <span className="font-extrabold text-emerald-400 text-sm">
                        +{formatRupiah(tempCalc.totalGainTerjual)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Uang Masuk Kas:</span>
                      <span className="font-extrabold text-white text-sm">
                        +{formatRupiah(tempCalc.totalSetelahUntungTerjual)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalQuickSoldItem(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickSoldModal}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer shadow-xs active:scale-[0.98] transition-all"
                >
                  Terapkan ({quickSoldInputVal} Terjual)
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
