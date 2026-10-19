import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem } from './types/inventory';
import { calculateSummary } from './utils/calculator';
import { Header, AppPage } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { QuickAddBar } from './components/QuickAddBar';
import { InventoryTable } from './components/InventoryTable';
import { ItemModal } from './components/ItemModal';
import { CashFlowGuideModal } from './components/CashFlowGuideModal';
import { DownloadModal } from './components/DownloadModal';
import { PrintReportView } from './components/PrintReportView';
import { AuthModal } from './components/AuthModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ReportsEquityPage } from './components/ReportsEquityPage';
import { ImportDataPage } from './components/ImportDataPage';
import { CosmicInteractiveBackground, BackgroundTheme } from './components/CosmicInteractiveBackground';
import { useAuth } from './context/AuthContext';
import { 
  Cloud, 
  CheckCircle2, 
  ShieldCheck, 
  HelpCircle, 
  RefreshCw,
  Database,
  AlertCircle,
  TrendingUp,
  UploadCloud
} from 'lucide-react';
import {
  fetchInventoryFromMongo,
  saveItemToMongo,
  updateItemInMongo,
  deleteItemFromMongo,
  clearAllItemsFromMongo,
  saveSettingsToMongo,
  batchRestoreToMongo,
  checkMongoDbStatus,
  MongoDbStatus
} from './services/mongoApi';

export default function App() {
  const { user } = useAuth();

  // App Core State (Loaded directly from MongoDB Atlas)
  const [modalAwal, setModalAwal] = useState<number>(50000);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [globalSavePercentMonthly, setGlobalSavePercentMonthly] = useState<number>(50);

  // Database status
  const [isMongoLoading, setIsMongoLoading] = useState<boolean>(true);
  const [mongoStatus, setMongoStatus] = useState<MongoDbStatus | null>(null);
  const [isSavingMongo, setIsSavingMongo] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

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

  // UI Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Active Navigation Page (Kasir & Inventori, Laporan & Ekuitas, Impor Data)
  const [activePage, setActivePage] = useState<AppPage>('inventory');

  // Delete Confirmation State (Replaces window.confirm)
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [isConfirmClearAllOpen, setIsConfirmClearAllOpen] = useState<boolean>(false);

  // Background Theme
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>(() => {
    try {
      const stored = localStorage.getItem('niaganova_bg_theme');
      if (stored && ['cosmic-nebula', 'aurora-emerald', 'cyber-sapphire', 'light-crystal'].includes(stored)) {
        return stored as BackgroundTheme;
      }
    } catch (e) {
      console.error(e);
    }
    return 'cosmic-nebula';
  });

  const handleThemeChange = (theme: BackgroundTheme) => {
    setBackgroundTheme(theme);
    try {
      localStorage.setItem('niaganova_bg_theme', theme);
    } catch (e) {
      console.error(e);
    }
  };

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // 1. Initial Load from MongoDB Atlas (Not localStorage)
  const loadMongoData = async () => {
    setIsMongoLoading(true);
    try {
      // Clear old legacy localStorage keys to ensure pure MongoDB storage
      try {
        const legacyKeys = [
          'kalkulator_penjualan_rolling_items',
          'kalkulator_penjualan_monthly_items',
          'kalkulator_penjualan_simple_items',
          'kalkulator_dagang_items_v1',
          'kalkulator_penjualan_modal_awal'
        ];
        for (const k of legacyKeys) {
          localStorage.removeItem(k);
        }
      } catch (e) {
        console.warn('LocalStorage cleanup:', e);
      }

      const [invData, dbStatus] = await Promise.all([
        fetchInventoryFromMongo(),
        checkMongoDbStatus(),
      ]);

      if (dbStatus) {
        setMongoStatus(dbStatus);
      }

      if (invData && invData.success) {
        setItems(invData.items || []);
        if (typeof invData.modalAwal === 'number') {
          setModalAwal(invData.modalAwal);
        }
        if (typeof invData.globalSavePercentMonthly === 'number') {
          setGlobalSavePercentMonthly(invData.globalSavePercentMonthly);
        }
        setNotification(`Terhubung ke MongoDB Atlas (Cluster0). Data berhasil dimuat (${invData.items?.length || 0} barang).`);
      }
    } catch (err) {
      console.error('Error loading from MongoDB Atlas:', err);
      setNotification('Gagal memuat data dari MongoDB Atlas. Memeriksa koneksi...');
    } finally {
      setIsMongoLoading(false);
    }
  };

  useEffect(() => {
    loadMongoData();

    // Check status periodically
    const timer = setInterval(async () => {
      const status = await checkMongoDbStatus();
      if (status) setMongoStatus(status);
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  // Filtered items by selected month
  const filteredMonthlyItems = useMemo(() => {
    if (selectedMonth === 'all') return items;
    return items.filter((item) => {
      const itemMonth = (item.tanggalInput || new Date(item.createdAt).toISOString().slice(0, 7)).slice(0, 7);
      return itemMonth === selectedMonth;
    });
  }, [items, selectedMonth]);

  // Overall financial summary
  const summary = useMemo(() => {
    return calculateSummary(filteredMonthlyItems, modalAwal);
  }, [filteredMonthlyItems, modalAwal]);

  // Handlers for Items with MongoDB Atlas persistence
  const handleAddItem = async (newItemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const item: InventoryItem = {
      ...newItemData,
      id: `item_${now}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
      persentaseLabaDisimpanBulanan: newItemData.persentaseLabaDisimpanBulanan ?? globalSavePercentMonthly,
    };

    // Immediate optimistic update
    setItems((prev) => [item, ...prev]);

    // Save to MongoDB Atlas
    setIsSavingMongo(true);
    try {
      await saveItemToMongo(item);
      setNotification(`Barang "${item.namaBarang}" berhasil disimpan ke MongoDB Atlas.`);
    } catch (err) {
      console.error('Failed to save item to MongoDB Atlas:', err);
    } finally {
      setIsSavingMongo(false);
    }
  };

  const handleSaveItem = async (
    itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ) => {
    const now = Date.now();
    let updatedTargetItem: InventoryItem | null = null;

    if (editId) {
      setItems((prev) =>
        prev.map((i) => {
          if (i.id === editId) {
            const updated = {
              ...i,
              ...itemData,
              updatedAt: now,
            };
            updatedTargetItem = updated;
            return updated;
          }
          return i;
        })
      );

      if (updatedTargetItem) {
        setIsSavingMongo(true);
        try {
          await saveItemToMongo(updatedTargetItem);
          setNotification(`Perubahan "${itemData.namaBarang}" disimpan ke MongoDB Atlas.`);
        } finally {
          setIsSavingMongo(false);
        }
      }
    } else {
      const newItem: InventoryItem = {
        ...itemData,
        id: `item_${now}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: now,
        updatedAt: now,
        persentaseLabaDisimpanBulanan: itemData.persentaseLabaDisimpanBulanan ?? globalSavePercentMonthly,
      };
      setItems((prev) => [newItem, ...prev]);

      setIsSavingMongo(true);
      try {
        await saveItemToMongo(newItem);
        setNotification(`Barang "${newItem.namaBarang}" berhasil disimpan ke MongoDB Atlas.`);
      } finally {
        setIsSavingMongo(false);
      }
    }

    setIsItemModalOpen(false);
    setEditingItem(null);
  };

  // Triggered by row delete icon
  const handleRequestDeleteItem = (id: string) => {
    const target = items.find((i) => i.id === id);
    if (target) {
      setItemToDelete(target);
    }
  };

  // Confirmed Delete execution (Fixed, works without window.confirm)
  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete) return;
    const { id, namaBarang } = itemToDelete;

    // Optimistically update React state immediately
    setItems((prev) => prev.filter((i) => i.id !== id));
    setItemToDelete(null);

    // Call MongoDB Atlas deletion
    setIsSavingMongo(true);
    try {
      const ok = await deleteItemFromMongo(id);
      if (ok) {
        setNotification(`Barang "${namaBarang}" berhasil dihapus dari MongoDB Atlas.`);
      } else {
        setNotification(`Peringatan: Gagal menghapus "${namaBarang}" dari server MongoDB.`);
      }
    } catch (err) {
      console.error('Failed to delete item from MongoDB Atlas:', err);
    } finally {
      setIsSavingMongo(false);
    }
  };

  // Triggered by "Hapus Semua" toolbar button
  const handleRequestClearAll = () => {
    setIsConfirmClearAllOpen(true);
  };

  // Confirmed Clear All execution (Fixed, works without window.confirm)
  const handleConfirmClearAll = async () => {
    setIsConfirmClearAllOpen(false);
    setItems([]);

    setIsSavingMongo(true);
    try {
      const ok = await clearAllItemsFromMongo();
      if (ok) {
        setNotification('Seluruh data barang berhasil dikosongkan dari MongoDB Atlas.');
      }
    } catch (err) {
      console.error('Failed to clear items from MongoDB Atlas:', err);
    } finally {
      setIsSavingMongo(false);
    }
  };

  const handleUpdateSoldQty = async (id: string, delta: number) => {
    let newQty = 0;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          newQty = Math.min(
            item.jumlahBarangWadah,
            Math.max(0, item.jumlahBarangDijualSatuan + delta)
          );
          return {
            ...item,
            jumlahBarangDijualSatuan: newQty,
            updatedAt: Date.now(),
          };
        }
        return item;
      })
    );

    try {
      await updateItemInMongo(id, { jumlahBarangDijualSatuan: newQty });
    } catch (e) {
      console.error('Failed to update sold qty in MongoDB Atlas:', e);
    }
  };

  const handleSetSoldQty = async (id: string, qty: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const clamped = Math.min(item.jumlahBarangWadah, Math.max(0, qty));
          return {
            ...item,
            jumlahBarangDijualSatuan: clamped,
            updatedAt: Date.now(),
          };
        }
        return item;
      })
    );

    try {
      await updateItemInMongo(id, { jumlahBarangDijualSatuan: qty });
    } catch (e) {
      console.error('Failed to set sold qty in MongoDB Atlas:', e);
    }
  };

  const handleUpdateModalAwal = async (newModal: number) => {
    setModalAwal(newModal);
    try {
      await saveSettingsToMongo(newModal, globalSavePercentMonthly);
      setNotification(`Modal awal usaha Rp ${newModal.toLocaleString('id-ID')} disimpan ke MongoDB Atlas.`);
    } catch (e) {
      console.error('Failed to update modalAwal in MongoDB Atlas:', e);
    }
  };

  const handleRestoreData = async (restoredItems: InventoryItem[], restoredModalAwal?: number) => {
    setItems(restoredItems);
    if (restoredModalAwal !== undefined && restoredModalAwal >= 0) {
      setModalAwal(restoredModalAwal);
    }

    setIsSavingMongo(true);
    try {
      await batchRestoreToMongo(restoredItems, restoredModalAwal ?? modalAwal, globalSavePercentMonthly);
      setNotification(`Data cadangan berhasil dipulihkan dan disimpan ke database MongoDB Atlas (${restoredItems.length} barang).`);
    } catch (e) {
      console.error('Failed to restore data to MongoDB Atlas:', e);
    } finally {
      setIsSavingMongo(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleImportSuccess = (
    importedItems: InventoryItem[], 
    newModal?: number, 
    mode: 'append' | 'replace' = 'append'
  ) => {
    if (typeof newModal === 'number' && newModal >= 0) {
      setModalAwal(newModal);
    }
    if (mode === 'replace') {
      setItems(importedItems);
    } else {
      setItems((prev) => {
        const incomingIds = new Set(importedItems.map(i => i.id));
        return [...importedItems, ...prev.filter(p => !incomingIds.has(p.id))];
      });
    }
    loadMongoData();
    setNotification(`Berhasil mengimpor ${importedItems.length} barang ke database MongoDB Atlas!`);
  };

  return (
    <div className="relative min-h-screen flex flex-col text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-200 font-sans">
      {/* Dynamic Cursor-Interactive Background (Bintang, Titik, Campuran Gambar Dagang Bergerak Sesuai Kursor) */}
      <CosmicInteractiveBackground
        currentTheme={backgroundTheme}
        onThemeChange={handleThemeChange}
      />

      {/* Main Foreground Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Header with Navigation */}
        <Header
          activePage={activePage}
          onChangePage={setActivePage}
          itemsCount={items.length}
          onOpenAddModal={() => {
            setEditingItem(null);
            setIsItemModalOpen(true);
          }}
          onPrintReport={handlePrint}
          onOpenGuide={() => setIsGuideModalOpen(true)}
          onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          isSyncingCloud={isSavingMongo}
        />

        {/* Dynamic Notification Toast */}
        {notification && (
          <div className="no-print bg-slate-900/90 backdrop-blur-md border-b border-emerald-500/30 px-4 py-2.5 text-xs text-emerald-200 animate-in fade-in">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium">{notification}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotification(null)}
                className="text-emerald-400 hover:text-emerald-100 font-bold cursor-pointer ml-4 p-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* MongoDB Atlas IP Whitelist Notice (if needed) */}
        {mongoStatus?.needsIpWhitelist && (
          <div className="no-print bg-amber-950/80 backdrop-blur-md border-b border-amber-500/40 px-4 py-2 text-xs text-amber-200">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 font-mono">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Setup MongoDB Atlas:</strong> Mohon tambahkan <code className="bg-amber-900/60 px-1.5 py-0.5 rounded text-amber-100 font-bold">0.0.0.0/0</code> pada menu <strong>Network Access</strong> di dashboard MongoDB Atlas agar database dapat diakses penuh dari cloud.
                </span>
              </div>
              <button
                type="button"
                onClick={loadMongoData}
                className="shrink-0 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] cursor-pointer transition-colors"
              >
                Cek Ulang
              </button>
            </div>
          </div>
        )}

        {/* Main Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          {/* PAGE 1: KASIR & INVENTORI */}
          {activePage === 'inventory' && (
            <div className="space-y-6">
              {/* Title & Quick Actions Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/60 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold tracking-wide">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      NIAGANOVA MATRIX
                    </span>
                    <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                      Pencatatan Arus Kas & Sisa Modal
                    </h1>
                    <span className="text-[11px] font-mono text-slate-400 font-medium">
                      · {currentRealTime}
                    </span>

                    {/* MongoDB Atlas Live Database Badge */}
                    <div 
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-semibold"
                      title="Penyimpanan database: MongoDB Atlas Cluster0 (sirojuddinkafabillah_db_user)"
                    >
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      <span>MongoDB Atlas:</span>
                      <span className="text-white font-bold">Online</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-sans">
                    Penyimpanan tersentralisasi di server MongoDB Atlas. Perhitungan sisa kas kasir real-time dan pemantauan perputaran modal usaha.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto font-mono">
                  <button
                    type="button"
                    onClick={loadMongoData}
                    disabled={isMongoLoading}
                    title="Muat ulang data dari MongoDB Atlas"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl cursor-pointer transition-all shadow-xs disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isMongoLoading ? 'animate-spin' : ''}`} />
                    <span>{isMongoLoading ? 'Memuat...' : 'Refresh DB'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePage('reports')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl cursor-pointer transition-all shadow-xs"
                    title="Buka laporan penjualan dan ekuitas usaha"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Laporan & Ekuitas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePage('import')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl cursor-pointer transition-all shadow-xs"
                    title="Impor file Excel atau CSV"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Impor Data</span>
                  </button>
                </div>
              </div>

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
                globalSavePercentMonthly={globalSavePercentMonthly}
              />

              {/* Main Table with Numeric Sold Input, Sisa Kas & Real-Time Timestamps */}
              <InventoryTable
                items={items}
                modalAwal={modalAwal}
                onEditItem={(item) => {
                  setEditingItem(item);
                  setIsItemModalOpen(true);
                }}
                onDeleteItem={handleRequestDeleteItem}
                onUpdateSoldQty={handleUpdateSoldQty}
                onSetSoldQty={handleSetSoldQty}
                onClearAll={handleRequestClearAll}
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
              />
            </div>
          )}

          {/* PAGE 2: LAPORAN PENJUALAN & EKUITAS */}
          {activePage === 'reports' && (
            <ReportsEquityPage
              items={items}
              modalAwal={modalAwal}
              summary={summary}
              selectedMonth={selectedMonth}
              onSelectMonth={setSelectedMonth}
              onPrintReport={handlePrint}
            />
          )}

          {/* PAGE 3: IMPOR DATA (EXCEL / CSV / JSON) */}
          {activePage === 'import' && (
            <ImportDataPage
              currentItemsCount={items.length}
              currentModalAwal={modalAwal}
              currentItems={items}
              onImportSuccess={handleImportSuccess}
              onNavigateToInventory={() => setActivePage('inventory')}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="no-print mt-auto border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-xl py-5 text-center text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5 font-mono text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              <span className="text-slate-300 font-semibold tracking-wide">NiagaNova Matrix</span>
              <span className="text-slate-600">·</span>
              <span>Kalkulator Dagang & Arus Kas Real-time</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Database: <strong className="text-emerald-400">MongoDB Atlas</strong> (Cluster0)</span>
            </div>
          </div>
        </footer>

        {/* Modals */}
        <ItemModal
          isOpen={isItemModalOpen}
          onClose={() => {
            setIsItemModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveItem}
          editingItem={editingItem}
        />

        <CashFlowGuideModal
          isOpen={isGuideModalOpen}
          onClose={() => setIsGuideModalOpen(false)}
        />

        <DownloadModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          items={items}
          modalAwal={modalAwal}
          summary={summary}
          onRestoreData={handleRestoreData}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />

        {/* Dedicated Delete Confirmation Modal (Reliable, no window.confirm) */}
        <DeleteConfirmModal
          isOpen={!!itemToDelete}
          onClose={() => setItemToDelete(null)}
          onConfirm={handleConfirmDeleteItem}
          item={itemToDelete}
          mode="single"
        />

        {/* Dedicated Clear All Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={isConfirmClearAllOpen}
          onClose={() => setIsConfirmClearAllOpen(false)}
          onConfirm={handleConfirmClearAll}
          mode="all"
        />

        {/* Print View Component */}
        <PrintReportView
          items={filteredMonthlyItems}
          summary={summary}
          modalAwal={modalAwal}
        />
      </div>
    </div>
  );
}
