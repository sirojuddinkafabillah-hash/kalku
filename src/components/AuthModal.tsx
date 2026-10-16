import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Mail, Lock, Cloud, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal login dengan Google';
      if (msg.includes('popup-closed-by-user')) {
        setErrorMsg('Jendela login ditutup sebelum selesai.');
      } else {
        setErrorMsg('Gagal masuk dengan Google: ' + msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Mohon isi email dan kata sandi');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (isRegisterMode) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setErrorMsg('Email atau kata sandi tidak cocok.');
      } else if (msg.includes('email-already-in-use')) {
        setErrorMsg('Email ini sudah terdaftar. Silakan pilih "Masuk".');
      } else if (msg.includes('invalid-email')) {
        setErrorMsg('Format email tidak valid.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden text-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header with Dark Emerald gradient */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 p-6 text-white text-center relative border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl backdrop-blur-md mb-2 shadow-inner">
            <Cloud className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white font-sans">
            {isRegisterMode ? 'Daftar Akun Cloud Toko' : 'Masuk ke Akun Online'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-mono">
            Data tersinkron otomatis ke server database. Hapus riwayat browser kapan saja tanpa takut data hilang.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Benefits summary badge */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-start gap-2.5 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">Pencadangan Cloud Otomatis</span>
              Setiap kali Anda menambah barang atau mencatat penjualan, data otomatis dicadangkan ke Google Firestore.
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1-Click Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-700 rounded-xl shadow-xs text-xs font-mono font-semibold text-slate-200 bg-slate-950 hover:bg-slate-800 hover:border-slate-600 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Masuk Cepat dengan Akun Google</span>
          </button>

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono">
              <span className="bg-slate-900 px-2 text-slate-500">atau masuk dengan email</span>
            </div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3 font-mono">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Alamat Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Kata Sandi</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : isRegisterMode ? (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                  <span>Daftar Akun Baru</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                  <span>Masuk Akun</span>
                </>
              )}
            </button>
          </form>

          {/* Toggle Register / Login */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setErrorMsg(null);
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-mono font-medium cursor-pointer underline underline-offset-4"
            >
              {isRegisterMode
                ? 'Sudah punya akun? Masuk di sini'
                : 'Belum punya akun? Klik untuk Buat Akun Baru'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
