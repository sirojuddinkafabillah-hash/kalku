/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem } from './types/inventory';
import { calculateSummary } from './utils/calculator';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { QuickAddBar } from './components/QuickAddBar';
import { InventoryTable } from './components/InventoryTable';
import { ItemModal } from './components/ItemModal';
import { CashFlowGuideModal } from './components/CashFlowGuideModal';
import { DownloadModal } from './components/DownloadModal';
import { PrintReportView } from './components/PrintReportView';
import { AiAdvisor } from './components/AiAdvisor';
import { Download, HelpCircle, Sparkles, Clock } from 'lucide-react';

const ALL_STORAGE_KEYS = [
  'kalkulator_penjualan_rolling_items',
  'kalkulator_penjualan_monthly_items',
  'kalkulator_penjualan_simple_items',
  'kalkulator_dagang_items_v1',
];
const PERCENT_KEY = 'kalkulator_penjualan_monthly_save_pct';
const MODAL_KEY = 'kalkulator_penjualan_modal_awal';

function loadPersistedItems(): InventoryItem[] {
  for (const key of ALL_STORAGE_KEYS) {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading key:', key, e);
    }
  }
  return [];
}

export default function App() {
  const [modalAwal, setModalAwal] = useState<number>(() => {
    try {
      const storedModal = localStorage.getItem(MODAL_KEY);
      if (storedModal !== null && !isNaN(Number(storedModal))) {
        return Number(storedModal);
      }
    } catch (e) {
      console.error(e);
    }
    return 50000;
  });

  const [items, setItems] = useState<InventoryItem[]>(() => {
    return loadPersistedItems();
  });

  const [globalSavePercentMonthly, setGlobalSavePercentMonthly] = useState<number>(() => {
    try {
      const storedPct = localStorage.getItem(PERCENT_KEY);
      if (storedPct !== null) {
        return Number(storedPct);
      }
    } catch (e) {
      console.error(e);
    }
    return 50;
  });

  // Real-time ticking clock
  const [currentRealTime, setCurrentRealTime] = useState<string>(() => {
    return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentRealTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Monthly Filter Selection (Default: 'all' or active month)
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isPrintView, setIsPrintView] = useState(false);

  // Sync to all keys so data is permanently safe
  useEffect(() => {
    try {
      const json = JSON.stringify(items);
      for (const key of ALL_STORAGE_KEYS) {
        localStorage.setItem(key, json);
      }
    } catch (e) {
      console.error('Failed to save to local storage', e);
    }
  }, [items]);

  const handleUpdateModalAwal = (val: number) => {
    setModalAwal(val);
    try {
      localStorage.setItem(MODAL_KEY, String(val));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateSavePercent = (pct: number) => {
    setGlobalSavePercentMonthly(pct);
    try {
      localStorage.setItem(PERCENT_KEY, String(pct));
    } catch (e) {
      console.error(e);
    }
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        persentaseLabaDisimpanBulanan: pct,
        updatedAt: Date.now(),
      }))
    );
  };

  // Real-time monthly filtered calculations
  const filteredMonthlyItems = useMemo(() => {
    if (selectedMonth === 'all') return items;
    return items.filter((item) => {
      const ym = (item.tanggalInput || new Date(item.createdAt).toISOString().slice(0, 7)).slice(0, 7);
      return ym === selectedMonth;
    });
  }, [items, selectedMonth]);

  const summary = useMemo(() => {
    return calculateSummary(filteredMonthlyItems, modalAwal);
  }, [filteredMonthlyItems, modalAwal]);

  const handleAddItem = (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const currentClock = new Date(now).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newItem: InventoryItem = {
      ...itemData,
      id: `item-${now}-${Math.random().toString(36).substring(2, 6)}`,
      persentaseLabaDisimpanBulanan: itemData.persentaseLabaDisimpanBulanan ?? globalSavePercentMonthly,
      tanggalInput: itemData.tanggalInput || new Date(now).toISOString().slice(0, 10),
      waktuInput: itemData.waktuInput || currentClock,
      createdAt: now,
      updatedAt: now,
    };
    setItems((prev) => [newItem, ...prev]);
  };

  const handleSaveModalItem = (
    itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ) => {
    const now = Date.now();
    if (editId) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editId
            ? { ...item, ...itemData, updatedAt: now }
            : item
        )
      );
    } else {
      handleAddItem(itemData);
    }
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateSoldQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newQty = Math.min(
          item.jumlahBarangWadah,
          Math.max(0, item.jumlahBarangDijualSatuan + delta)
        );
        return {
          ...item,
          jumlahBarangDijualSatuan: newQty,
          updatedAt: Date.now(),
        };
      })
    );
  };

  // Direct number input for sold quantity
  const handleSetSoldQty = (id: string, qty: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const validQty = Math.min(item.jumlahBarangWadah, Math.max(0, qty));
        return {
          ...item,
          jumlahBarangDijualSatuan: validQty,
          updatedAt: Date.now(),
        };
      })
    );
  };

  const handleLoadUserSpriteExample = () => {
    handleUpdateModalAwal(50000);
    const spriteItem: InventoryItem = {
      id: `sprite-${Date.now()}`,
      namaBarang: 'Sprite',
      satuanWadah: 'Botol',
      jumlahBarangWadah: 1,
      satuanUnit: 'btl',
      hargaBeli: 32000,
      jumlahBarangDijualSatuan: 0,
      hargaJualSatuan: 74000,
      perputaranBulan: 1,
      persentaseLabaDisimpanBulanan: globalSavePercentMonthly,
      tanggalInput: new Date().toISOString().slice(0, 10),
      waktuInput: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      catatan: 'Beli Rp 32.000 memotong modal. Ketik 1 di kolom terjual saat laku untuk untung Rp 42.000!',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setItems((prev) => [spriteItem, ...prev]);
  };

  const handleClearAll = () => {
    if (items.length === 0) return;
    if (window.confirm('Kosongkan semua data barang dari tabel?')) {
      setItems([]);
    }
  };

  if (isPrintView) {
    return (
      <PrintReportView
        items={filteredMonthlyItems}
        summary={summary}
        onBack={() => setIsPrintView(false)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans antialiased">
      {/* Header Bar */}
      <Header
        onOpenAddModal={() => {
          setEditingItem(null);
          setIsItemModalOpen(true);
        }}
        onPrintReport={() => setIsPrintView(true)}
        onOpenGuide={() => setIsGuideModalOpen(true)}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                Kalkulator Penjualan & Modal Berputar
              </h1>
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-800 bg-emerald-100/90 font-bold px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3 text-emerald-700 animate-pulse" />
                <span>{currentRealTime}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Input angka terjual langsung, persentase tumbuh & rugi real-time, serta evaluasi & rekomendasi cerdas dari AI
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <button
              onClick={() => setIsDownloadModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-xl cursor-pointer transition-all shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Unduh Data / Web Offline</span>
            </button>

            <button
              onClick={handleLoadUserSpriteExample}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50/80 border border-emerald-200 hover:bg-emerald-100 rounded-xl cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ Contoh Sprite</span>
            </button>

            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Panduan</span>
            </button>
          </div>
        </div>

        {/* AI Business Advisor & Evaluator */}
        <AiAdvisor
          items={filteredMonthlyItems}
          summary={summary}
          modalAwal={modalAwal}
          bulanFilter={selectedMonth}
        />

        {/* Rolling Cash Balance & Capital Cards Focusing on Sisa Kas */}
        <SummaryCards
          summary={summary}
          modalAwal={modalAwal}
          onUpdateModalAwal={handleUpdateModalAwal}
          onOpenGuide={() => setIsGuideModalOpen(true)}
          currentRealTime={currentRealTime}
          bulanFilter={selectedMonth}
        />

        {/* Quick Add Bar */}
        <QuickAddBar
          onAdd={handleAddItem}
        />

        {/* Main Table with Numeric Sold Input, Sisa Kas & Real-Time Timestamps */}
        <InventoryTable
          items={items}
          modalAwal={modalAwal}
          onEditItem={(item) => {
            setEditingItem(item);
            setIsItemModalOpen(true);
          }}
          onDeleteItem={handleDeleteItem}
          onUpdateSoldQty={handleUpdateSoldQty}
          onSetSoldQty={handleSetSoldQty}
          onResetToSampleData={handleLoadUserSpriteExample}
          onClearAll={handleClearAll}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
        />
      </main>

      {/* Footer */}
      <footer className="no-print mt-auto border-t border-slate-200 bg-white/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Kalkulator Penjualan & Arus Kas Dagang Real-time dengan Evaluasi AI</span>
          <span>Semua data Anda tersimpan aman otomatis di browser lokal</span>
        </div>
      </footer>

      {/* Modals */}
      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveModalItem}
        editingItem={editingItem}
      />

      <CashFlowGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        items={filteredMonthlyItems}
        modalAwal={modalAwal}
        summary={summary}
      />
    </div>
  );
}
