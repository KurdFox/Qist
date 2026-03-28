import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, updateDoc, doc, increment, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Customer, Installment, OperationType, Loan } from '../types';
import { handleFirestoreError } from '../lib/firestoreUtils';
import { CreditCard, CheckCircle2, Clock, Search, Filter, Loader2, User, RotateCcw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function InstallmentTracking() {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const qInst = query(collection(db, 'installments'), where('createdBy', '==', auth.currentUser.uid));
    const qCust = query(collection(db, 'customers'), where('createdBy', '==', auth.currentUser.uid));
    const qLoans = query(collection(db, 'loans'), where('createdBy', '==', auth.currentUser.uid));

    const unsubInst = onSnapshot(qInst, (snapshot) => {
      setInstallments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Installment)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'installments'));

    const unsubCust = onSnapshot(qCust, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'customers'));

    const unsubLoans = onSnapshot(qLoans, (snapshot) => {
      setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'loans'));

    return () => {
      unsubInst();
      unsubCust();
      unsubLoans();
    };
  }, []);

  const handlePay = async (installment: Installment) => {
    if (!auth.currentUser) return;
    setLoadingId(installment.id);
    try {
      const instRef = doc(db, 'installments', installment.id);
      const loanRef = doc(db, 'loans', installment.loanId);

      await updateDoc(instRef, {
        status: 'paid',
        paidAt: new Date().toISOString()
      });

      await updateDoc(loanRef, {
        remainingAmount: increment(-installment.amount)
      });

      const loanSnap = await getDoc(loanRef);
      if (loanSnap.exists() && loanSnap.data().remainingAmount <= 0) {
        await updateDoc(loanRef, { status: 'completed' });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'installments');
    } finally {
      setLoadingId(null);
    }
  };

  const handleRevert = async (installment: Installment) => {
    if (!auth.currentUser) return;
    setLoadingId(installment.id);
    try {
      const instRef = doc(db, 'installments', installment.id);
      const loanRef = doc(db, 'loans', installment.loanId);

      await updateDoc(instRef, {
        status: 'pending',
        paidAt: null
      });

      await updateDoc(loanRef, {
        remainingAmount: increment(installment.amount),
        status: 'active'
      });
      setRevertingId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'installments');
    } finally {
      setLoadingId(null);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  
  const stats = {
    totalIQD: loans.filter(l => l.currency === 'IQD' || !l.currency).reduce((acc, l) => acc + l.totalAmount, 0),
    totalUSD: loans.filter(l => l.currency === 'USD').reduce((acc, l) => acc + l.totalAmount, 0),
    pendingIQD: installments.filter(i => i.status === 'pending' && (i.currency === 'IQD' || !i.currency)).reduce((acc, i) => acc + i.amount, 0),
    pendingUSD: installments.filter(i => i.status === 'pending' && i.currency === 'USD').reduce((acc, i) => acc + i.amount, 0),
    overdue: installments.filter(i => i.status === 'pending' && i.dueDate < today).length
  };

  const paidIQD = stats.totalIQD - stats.pendingIQD;
  const paidUSD = stats.totalUSD - stats.pendingUSD;

  const groupedData = customers
    .map(customer => {
      const customerInstallments = installments.filter(i => i.customerId === customer.id);
      const customerLoans = loans.filter(l => l.customerId === customer.id);
      
      const totalIQD = customerLoans.filter(l => l.currency === 'IQD' || !l.currency).reduce((acc, l) => acc + l.totalAmount, 0);
      const totalUSD = customerLoans.filter(l => l.currency === 'USD').reduce((acc, l) => acc + l.totalAmount, 0);

      const pendingIQD = customerInstallments
        .filter(i => i.status === 'pending' && (i.currency === 'IQD' || !i.currency))
        .reduce((acc, i) => acc + i.amount, 0);
      const pendingUSD = customerInstallments
        .filter(i => i.status === 'pending' && i.currency === 'USD')
        .reduce((acc, i) => acc + i.amount, 0);
        
      const paidIQD = totalIQD - pendingIQD;
      const paidUSD = totalUSD - pendingUSD;

      const overdueCount = customerInstallments
        .filter(i => i.status === 'pending' && i.dueDate < today).length;

      return {
        customer,
        installments: customerInstallments.sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
        pendingIQD,
        pendingUSD,
        paidIQD,
        paidUSD,
        overdueCount
      };
    })
    .filter(group => {
      const nameMatch = group.customer.name.toLowerCase().includes(search.toLowerCase());
      if (!nameMatch) return false;

      if (filter === 'pending') return group.pendingIQD > 0 || group.pendingUSD > 0;
      if (filter === 'paid') return group.paidIQD > 0 || group.paidUSD > 0;
      return true;
    })
    .sort((a, b) => (b.pendingIQD + b.pendingUSD * 1500) - (a.pendingIQD + a.pendingUSD * 1500)); // Rough sort by value

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2 font-display">بەدواداچوونی قیستەکان</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">بەڕێوەبردنی دارایی و وەرگرتنی قیستە مانگانەکان</p>
        </div>
      </header>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
            <Clock size={24} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">کۆی ماوە</p>
            <div className="flex flex-wrap gap-x-4">
              <p className="text-lg font-black text-gray-900 dark:text-white">{stats.pendingIQD.toLocaleString()} <span className="text-[10px] font-bold opacity-50">د.ع</span></p>
              <p className="text-lg font-black text-blue-600 dark:text-blue-400">{stats.pendingUSD.toLocaleString()} <span className="text-[10px] font-bold opacity-50">$</span></p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
            <CheckCircle2 size={24} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">کۆی وەرگیراو</p>
            <div className="flex flex-wrap gap-x-4">
              <p className="text-lg font-black text-gray-900 dark:text-white">{paidIQD.toLocaleString()} <span className="text-[10px] font-bold opacity-50">د.ع</span></p>
              <p className="text-lg font-black text-blue-600 dark:text-blue-400">{paidUSD.toLocaleString()} <span className="text-[10px] font-bold opacity-50">$</span></p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">دواکەوتوو</p>
            <p className="text-lg font-black text-gray-900 dark:text-white">{stats.overdue} قیست</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 relative group">
          <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="گەڕان بەدوای ناوی کڕیار..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-14 pl-6 py-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 focus:border-blue-200 dark:focus:border-blue-800 outline-none transition-all font-medium text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex bg-white dark:bg-gray-900 p-2 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
          {(['all', 'pending', 'paid'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-8 py-3 rounded-2xl text-sm font-bold transition-all",
                filter === f ? "bg-blue-600 text-white shadow-lg dark:shadow-none" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              {f === 'all' ? 'هەمووی' : f === 'pending' ? 'ماوە' : 'دراوە'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {groupedData.map((group) => {
            const isExpanded = expandedCustomerId === group.customer.id;
            
            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                key={group.customer.id}
                className={cn(
                  "bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-all",
                  isExpanded && "ring-2 ring-blue-100 dark:ring-blue-900/40 shadow-xl"
                )}
              >
                {/* Customer Row */}
                <div 
                  onClick={() => setExpandedCustomerId(isExpanded ? null : group.customer.id)}
                  className="px-5 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-xl sm:text-2xl shadow-sm shrink-0">
                      {group.customer.emoji || group.customer.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white line-clamp-1">{group.customer.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
                          <CreditCard size={10} /> {group.installments.length} قیست
                        </span>
                        {group.overdueCount > 0 && (
                          <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                            <AlertCircle size={10} /> {group.overdueCount} دواکەوتوو
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8 border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-50 dark:border-gray-800">
                    <div className="text-right">
                      <p className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mb-0.5 sm:mb-1">کۆی قەرزی ماوە</p>
                      <div className="flex flex-col items-end">
                        {group.pendingIQD > 0 && (
                          <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                            {group.pendingIQD.toLocaleString()} <span className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500">د.ع</span>
                          </p>
                        )}
                        {group.pendingUSD > 0 && (
                          <p className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400">
                            {group.pendingUSD.toLocaleString()} <span className="text-[10px] sm:text-xs font-bold text-blue-400/60 dark:text-blue-500/60">$</span>
                          </p>
                        )}
                        {group.pendingIQD === 0 && group.pendingUSD === 0 && (
                          <p className="text-lg sm:text-xl font-black text-gray-300 dark:text-gray-700">0</p>
                        )}
                      </div>
                    </div>
                    <div className={cn(
                      "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shrink-0",
                      isExpanded ? "bg-blue-600 text-white rotate-180" : "bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                    )}>
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20"
                    >
                      <div className="p-4 sm:p-8">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse min-w-[500px]">
                              <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                  <th className="px-4 sm:px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">بەروار</th>
                                  <th className="px-4 sm:px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">بڕی قیست</th>
                                  <th className="px-4 sm:px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">دۆخ</th>
                                  <th className="px-4 sm:px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-left">کردار</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {group.installments
                                  .filter(inst => filter === 'all' || inst.status === filter)
                                  .map((inst) => {
                                    const isOverdue = inst.status === 'pending' && inst.dueDate < today;
                                    return (
                                      <tr key={inst.id} className={cn(
                                        "hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors",
                                        isOverdue && "bg-red-50/10 dark:bg-red-900/10"
                                      )}>
                                        <td className="px-4 sm:px-6 py-4">
                                          <div className="flex flex-col">
                                            <span className={cn("font-bold text-sm", isOverdue ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300")}>
                                              {inst.dueDate}
                                            </span>
                                            {inst.status === 'paid' && (
                                              <span className="text-[10px] text-green-500 dark:text-green-400 font-bold">دراوە: {inst.paidAt?.split('T')[0]}</span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4">
                                          <span className="font-black text-gray-900 dark:text-white">{inst.amount.toLocaleString()}</span>
                                          <span className="text-[10px] text-gray-400 dark:text-gray-500 mr-1">{inst.currency === 'USD' ? '$' : 'د.ع'}</span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-center">
                                          <span className={cn(
                                            "inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                            inst.status === 'paid' ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : 
                                            isOverdue ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                                          )}>
                                            {inst.status === 'paid' ? 'دراوە' : isOverdue ? 'دواکەوتوو' : 'ماوە'}
                                          </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-left">
                                          {inst.status === 'pending' ? (
                                            <button
                                              disabled={loadingId === inst.id}
                                              onClick={() => handlePay(inst)}
                                              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold hover:bg-blue-700 transition-all shadow-md dark:shadow-none disabled:opacity-50"
                                            >
                                              {loadingId === inst.id ? <Loader2 className="animate-spin" size={12} /> : 'وەرگرتن'}
                                            </button>
                                          ) : (
                                            <div className="inline-flex items-center gap-2">
                                              {revertingId === inst.id ? (
                                                <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 p-1 rounded-lg border border-red-100 dark:border-red-900/30">
                                                  <button
                                                    onClick={() => handleRevert(inst)}
                                                    disabled={loadingId === inst.id}
                                                    className="px-2 py-1 bg-red-600 text-white rounded-md text-[9px] font-bold"
                                                  >
                                                    بەڵێ
                                                  </button>
                                                  <button
                                                    onClick={() => setRevertingId(null)}
                                                    className="px-2 py-1 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-md text-[9px] font-bold"
                                                  >
                                                    نەخێر
                                                  </button>
                                                </div>
                                              ) : (
                                                <button
                                                  onClick={() => setRevertingId(inst.id)}
                                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                >
                                                  <RotateCcw size={14} />
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {groupedData.length === 0 && (
          <div className="py-20 text-center bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-gray-300 dark:text-gray-600" size={32} />
            </div>
            <p className="text-gray-400 dark:text-gray-500 font-bold">هیچ کڕیارێک یان قیستێک نەدۆزرایەوە</p>
          </div>
        )}
      </div>
    </div>
  );
}
