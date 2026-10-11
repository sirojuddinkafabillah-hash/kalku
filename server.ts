import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// AI Evaluation and Advice Endpoint
app.post('/api/ai/evaluate', async (req, res) => {
  try {
    const { items, summary, modalAwal, bulanFilter, focusMode = 'general' } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        success: true,
        source: 'local',
        analysis: generateHeuristicAnalysis(items, summary, modalAwal, focusMode),
      });
    }

    const itemsSummary = (items || []).map((i: any, idx: number) => 
      `${idx + 1}. ${i.namaBarang} - Beli: Rp ${i.hargaBeli} (isi ${i.jumlahBarangWadah} unit, HPP: Rp ${Math.round(i.hargaBeli / (i.jumlahBarangWadah || 1))}) - Jual: Rp ${i.hargaJualSatuan} - Terjual: ${i.jumlahBarangDijualSatuan} unit (Sisa: ${i.jumlahBarangWadah - i.jumlahBarangDijualSatuan}) - Laba: Rp ${Math.max(0, (i.hargaJualSatuan - (i.hargaBeli / (i.jumlahBarangWadah || 1))) * i.jumlahBarangDijualSatuan)}`
    ).join('\n');

    let focusInstruction = '';
    if (focusMode === 'cashflow') {
      focusInstruction = 'FOKUS UTAMA: Analisis likuiditas kas, risiko modal macet di stok, persentase pertumbuhan (ROI) vs pengeluaran, dan keamanan penarikan simpanan bulanan.';
    } else if (focusMode === 'restock') {
      focusInstruction = 'FOKUS UTAMA: Prioritas belanja dan restock. Barang mana yang harus segera dibeli kembali wadah berikutnya dan barang mana yang lambat bergerak yang perlu dipromosikan.';
    } else if (focusMode === 'pricing') {
      focusInstruction = 'FOKUS UTAMA: Evaluasi harga jual dan margin keuntungan. Apakah ada barang dengan margin terlalu tipis atau harga jual yang bisa dioptimalkan.';
    } else {
      focusInstruction = 'FOKUS UTAMA: Evaluasi komprehensif mencakup pertumbuhan modal (ROI), kesehatan kas siap putar, kinerja produk laku vs sisa, dan 4 saran taktis.';
    }

    const prompt = `Anda adalah seorang konsultan keuangan dan analis bisnis retail/toko kelontong UMKM profesional di Indonesia.
Evaluasi pembukuan toko berikut dan berikan saran konkret yang praktis:

DATA KEUANGAN:
- Modal Awal Usaha: Rp ${modalAwal?.toLocaleString('id-ID')}
- Total Pengeluaran Beli Barang: Rp ${summary?.totalPengeluaranBeli?.toLocaleString('id-ID')}
- Total Pemasukan dari Penjualan: Rp ${summary?.totalPemasukanJual?.toLocaleString('id-ID')}
- Sisa Kas Toko Berjalan: Rp ${summary?.saldoKasSaatIni?.toLocaleString('id-ID')}
- Total Untung Terealisasi (Gain): Rp ${summary?.totalGainTerjual?.toLocaleString('id-ID')}
- Nilai Aset Stok Belum Laku: Rp ${summary?.totalNilaiSisaStok?.toLocaleString('id-ID')}
- Total Ekuitas Toko Setelah Untung: Rp ${summary?.totalSetelahUntung?.toLocaleString('id-ID')}
- Persentase Pertumbuhan Modal: ${summary?.persenTumbuhRugi?.toFixed(1) || '0'}%
- Periode/Bulan: ${bulanFilter === 'all' ? 'Semua Periode' : 'Bulan ' + bulanFilter}

${focusInstruction}

DAFTAR BARANG:
${itemsSummary || '(Belum ada barang)'}

Instruksi Analisis:
1. Hitung dan komentari Persentase Pertumbuhan Modal (ROI) serta status (tumbuh, rugi, atau impas).
2. Evaluasi Sisa Kas: Apakah kas tunai saat ini cukup untuk kulakan lagi, atau modal sedang banyak tertahan di stok belum laku?
3. Analisis Produk: Mana produk yang paling berkontribusi pada laba dan mana yang lambat laku.
4. Saran Strategis Konkret: Berikan rekomendasi langkah nyata untuk pemilik toko (misal: penyesuaian harga, promosi barang belum laku, strategi restock wadah berikutnya, dan pengelolaan kas).

Format jawaban dalam bahasa Indonesia yang ramah, profesional, mudah dipahami pedagang, terstruktur dengan poin-poin yang jelas dan rapi.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Anda adalah penasihat keuangan toko retail dan UMKM yang sangat teliti, ramah, dan berorientasi pada keberlangsungan perputaran modal kas pedagang.',
      },
    });

    const text = response.text || '';
    return res.status(200).json({
      success: true,
      source: 'gemini',
      analysis: text,
    });
  } catch (err: any) {
    console.error('Gemini API error, falling back to heuristic analysis:', err);
    const { items, summary, modalAwal, focusMode } = req.body;
    return res.status(200).json({
      success: true,
      source: 'local-fallback',
      analysis: generateHeuristicAnalysis(items, summary, modalAwal, focusMode),
    });
  }
});

// Heuristic fallback advice if API key is not present or network unavailable
function generateHeuristicAnalysis(items: any[], summary: any, modalAwal: number, focusMode: string = 'general'): string {
  const modal = modalAwal || 50000;
  const untung = summary?.totalGainTerjual || 0;
  const kas = summary?.saldoKasSaatIni || 0;
  const stok = summary?.totalNilaiSisaStok || 0;
  const persenTumbuh = modal > 0 ? ((untung / modal) * 100).toFixed(1) : '0';

  const soldItems = (items || []).filter((i: any) => i.jumlahBarangDijualSatuan > 0);
  const unsoldItems = (items || []).filter((i: any) => i.jumlahBarangDijualSatuan === 0);

  if (focusMode === 'cashflow') {
    return `💰 **EVALUASI KESEHATAN ARUS KAS & PERTUMBUHAN MODAL**

1. **Pertumbuhan Modal (ROI): +${persenTumbuh}%**
   - Laba terealisasi: **Rp ${untung.toLocaleString('id-ID')}** dari modal awal Rp ${modal.toLocaleString('id-ID')}.
   - Saldo Kas Tersedia: **Rp ${kas.toLocaleString('id-ID')}**.

2. **Kondisi Kas Siap Putar vs Modal Terikat:**
   - Kas likuid siap belanja: **Rp ${kas.toLocaleString('id-ID')}**.
   - Modal tertahan di stok: **Rp ${stok.toLocaleString('id-ID')}**.
   - ${kas < modal * 0.3 ? '⚠️ **Peringatan Kas:** Kas likuid Anda menipis karena banyak modal tertahan di stok belum laku. Disarankan tahan belanja barang baru sebelum sisa stok terjual.' : '✅ **Kas Aman:** Rasio kas cukup baik untuk membeli wadah dagangan selanjutnya.'}

3. **Pengelolaan Sisa Kas Berjalan:**
   - Sisa kas saat ini sebesar **Rp ${kas.toLocaleString('id-ID')}** siap digunakan berputar untuk kulakan produk selanjutnya.`;
  }

  if (focusMode === 'restock') {
    return `📦 **REKOMENDASI RESTOCK & PENGELOLAAN STOK**

1. **Produk Berjalan Cepat (Fast-Moving):**
   - ${soldItems.length > 0 ? soldItems.map((i: any) => `• **${i.namaBarang}**: Terjual ${i.jumlahBarangDijualSatuan}/${i.jumlahBarangWadah} unit. Siapkan modal untuk belanja wadah baru jika stok menipis.`).join('\n   - ') : 'Belum ada produk yang mulai terjual.'}

2. **Produk Tertahan (Perlu Promosi):**
   - ${unsoldItems.length > 0 ? unsoldItems.map((i: any) => `• **${i.namaBarang}**: Modal tertahan Rp ${i.hargaBeli.toLocaleString('id-ID')} (belum ada penjualan). Taruh di etalase depan atau tawarkan langsung ke pembeli.`).join('\n   - ') : 'Semua produk telah mulai terjual dengan baik.'}

3. **Strategi Belanja Wadah Baru:**
   - Gunakan kas siap putar Rp ${kas.toLocaleString('id-ID')} hanya untuk barang yang perputarannya cepat.`;
  }

  if (focusMode === 'pricing') {
    return `🏷️ **EVALUASI HARGA JUAL & MARGIN KEUNTUNGAN**

1. **Rata-rata Margin Toko: ${(summary?.rataRataMargin || 0).toFixed(1)}%**
   - Rentang margin yang sehat untuk toko kelontong adalah 15% - 35%.

2. **Pemeriksaan Harga Produk:**
   ${(items || []).map((i: any) => {
     const hpp = i.jumlahBarangWadah > 0 ? i.hargaBeli / i.jumlahBarangWadah : 0;
     const margin = i.hargaJualSatuan > 0 ? ((i.hargaJualSatuan - hpp) / i.hargaJualSatuan) * 100 : 0;
     return `• **${i.namaBarang}**: HPP Rp ${Math.round(hpp).toLocaleString('id-ID')} ➔ Jual Rp ${i.hargaJualSatuan.toLocaleString('id-ID')} (Margin: ${margin.toFixed(1)}%) ${margin < 10 ? '⚠️ Margin tipis!' : '✅ Margin ideal'}`;
   }).join('\n   ')}

3. **Saran Penyesuaian:**
   - Untuk produk dengan margin di bawah 10%, pertimbangkan menaikkan harga jual satuan secara bertahap atau cari agen grosir dengan harga beli lebih murah.`;
  }

  return `📊 **EVALUASI PERPUTARAN MODAL & KINERJA BISNIS**

1. **Pertumbuhan Modal (ROI): +${persenTumbuh}%**
   - Modal Awal: Rp ${modal.toLocaleString('id-ID')}, Keuntungan Terealisasi: Rp ${untung.toLocaleString('id-ID')}.
   - Total Ekuitas Nilai Toko (Kas + Stok): Rp ${(summary?.totalSetelahUntung || modal).toLocaleString('id-ID')}.

2. **Kondisi Kas Tunai & Likuiditas:**
   - Kas tunai yang siap diputar saat ini: **Rp ${kas.toLocaleString('id-ID')}**.
   - Aset modal yang masih tertahan di stok rak: **Rp ${stok.toLocaleString('id-ID')}** (${unsoldItems.length} produk belum terjual).
   - ${kas < modal * 0.3 ? '⚠️ **Perhatian Kas:** Kas tunai Anda di bawah 30% dari modal awal. Fokuskan penjualan stok yang masih tersisa agar kas segera pulih sebelum membeli stok baru.' : '✅ **Kas Sehat:** Anda memiliki kas likuid yang cukup untuk membeli wadah atau variasi produk berikutnya.'}

3. **Performa Produk:**
   - Produk Aktif Terjual: ${soldItems.length} barang menghasilkan perputaran uang.
   - Produk Belum Laku: ${unsoldItems.length} barang masih mengikat modal kas.

4. **Saran Strategis dari AI:**
   - **Prioritaskan Penjualan Stok:** Untuk barang yang belum laku, letakkan di bagian depan kasir atau buat paket promo agar modal Rp ${stok.toLocaleString('id-ID')} cepat kembali.
   - **Disiplin Kas Berjalan:** Jaga sisa kas toko agar perputaran kas selalu aman dan siap dipakai belanja stok wadah berikutnya.`;
}

// Development vs Production serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
