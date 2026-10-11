import React from 'react';
import { Plus, Download } from 'lucide-react';

interface HeaderProps {
  onOpenAddModal: () => void;
  onPrintReport: () => void;
  onOpenGuide: () => void;
  onOpenDownloadModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddModal,
  onPrintReport,
  onOpenGuide,
  onOpenDownloadModal,
}) => {
  return (
    <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-14">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              Kalkulator Penjualan & Modal
            </span>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden sm:flex items-center gap-6 text-xs font-medium text-slate-600">
            <button
              onClick={onOpenGuide}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Panduan Putar vs Simpan
            </button>
            <button
              onClick={onPrintReport}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cetak Nota / Laporan
            </button>
            <button
              onClick={onOpenDownloadModal}
              className="hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1 text-emerald-700 font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Data & Web Offline</span>
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenDownloadModal}
              className="sm:hidden flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh</span>
            </button>
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Form Lengkap</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
