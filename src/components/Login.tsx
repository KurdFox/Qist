import React, { useState } from 'react';
import { auth, db, signIn } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { LogIn, ShieldCheck, Phone, Lock, UserPlus, Loader2, AlertCircle, Info, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPhoneInfo, setShowPhoneInfo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const formatEmail = (p: string) => `${p.trim()}@phone.local`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phone || !password) {
      setError('تکایە هەموو خانەکان پڕبکەرەوە');
      return;
    }

    if (phone.length !== 11) {
      setError('ژمارەی مۆبایل دەبێت ١١ ژمارە بێت');
      return;
    }

    if (isSignup && password !== confirmPassword) {
      setError('پاسۆردەکان وەک یەک نین');
      return;
    }

    if (password.length < 6) {
      setError('پاسۆرد دەبێت لانی کەم ٦ پیت بێت');
      return;
    }

    setLoading(true);
    try {
      const email = formatEmail(phone);
      if (isSignup) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: email,
          role: 'user',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('ئەم ژمارەیە پێشتر بەکارهاتووە');
      } else if (err.code === 'auth/invalid-email') {
        setError('ژمارەی مۆبایلەکە هەڵەیە');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('ژمارەی مۆبایل یان پاسۆرد هەڵەیە');
      } else {
        setError('هەڵەیەک ڕوویدا، تکایە دووبارە هەوڵ بدەرەوە');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 text-center border border-white/50 backdrop-blur-sm"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-600 text-white mb-6 shadow-xl shadow-blue-200">
          <ShieldCheck size={40} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">بەخێربێیت</h1>
        <p className="text-gray-500 mb-8 font-medium">سیستەمی بەڕێوەبردنی قیستی کوردی</p>

        <div className="flex bg-gray-50 p-1.5 rounded-2xl mb-8 border border-gray-100">
          <button
            onClick={() => { setIsSignup(false); setError(null); }}
            className={cn(
              "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
              !isSignup ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            چوونەژوورەوە
          </button>
          <button
            onClick={() => { setIsSignup(true); setError(null); }}
            className={cn(
              "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
              isSignup ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            دروستکردنی هەژمار
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border border-red-100"
              >
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative group">
            <Phone className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input
              type="tel"
              placeholder="ژمارەی مۆبایل"
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (val.length <= 11) setPhone(val);
              }}
              className="w-full pr-14 pl-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-200 outline-none transition-all font-bold text-gray-700 placeholder:text-right"
            />
            <button
              type="button"
              onClick={() => setShowPhoneInfo(!showPhoneInfo)}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
            >
              <Info size={18} />
            </button>
            <AnimatePresence>
              {showPhoneInfo && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute left-0 bottom-full mb-2 w-full bg-blue-600 text-white p-3 rounded-xl text-[10px] font-bold shadow-xl z-10 text-center"
                >
                  ژمارە موبایل لە ١١ ژمارە پێك هاتووە
                  <div className="absolute left-6 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-blue-600"></div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative group">
            <Lock className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="پاسۆرد"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pr-14 pl-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-200 outline-none transition-all font-bold text-gray-700"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {isSignup && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="relative group"
            >
              <Lock className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="تەئکیدکردنەوەی پاسۆرد"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pr-14 pl-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-200 outline-none transition-all font-bold text-gray-700"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isSignup ? <UserPlus size={20} /> : <LogIn size={20} />}
                {isSignup ? 'دروستکردنی هەژمار' : 'چوونەژوورەوە'}
              </>
            )}
          </button>
        </form>

        <div className="relative my-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-4 text-gray-400 font-bold">یان</span>
          </div>
        </div>

        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 hover:border-blue-200 transition-all group shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          چوونەژوورەوە بە گووگڵ
        </button>
        
        <div className="mt-10 pt-8 border-t border-gray-50 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          هەموو مافەکان پارێزراوە &copy; ٢٠٢٦ بۆ <a href="https://hosheytech.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Hoshey Tech</a>
        </div>
      </motion.div>
    </div>
  );
}
