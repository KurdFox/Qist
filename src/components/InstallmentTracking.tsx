import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, updateDoc, doc, increment, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Customer, Installment, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestoreUtils';
import { CreditCard, CheckCircle2, Clock, Search, Filter, Loader2, User, RotateCcw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function InstallmentTracking() {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const qInst = query(collection(db, 'installments'), where('createdBy', '==', auth.currentUser.uid));
    const qCust = query(collection(db, 'customers'), where('createdBy', '==', auth.currentUser.uid));

    const unsubInst = onSnapshot(qInst, (snapshot) => {
      setInstallments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Installment)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'installments'));

    const unsubCust = onSnapshot(qCust, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'customers'));

    return () => {
      unsubInst();
      unsubCust();
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
    pending: installments.filter(i => i.status === 'pending').reduce((acc, i) => acc + i.amount, 0),
    paid: installments.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.amount, 0),
    overdue: installments.filter(i => i.status === 'pending' && i.dueDate < today).length
  };

  const groupedData = customers
    .map(customer => {
      const customerInstallments = installments.filter(i => i.customerId === customer.id);
      const pendingAmount = customerInstallments
        .filter(i => i.status === 'pending')
        .reduce((acc, i) => acc + i.amount, 0);
      const paidAmount = customerInstallments
        .filter(i => i.status === 'paid')
        .reduce((acc, i) => acc + i.amount, 0);
      const overdueCount = customerInstallments
        .filter(i => i.status === 'pending' && i.dueDate < today).length;

      return {
        customer,
        installments: customerInstallments.sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
        pendingAmount,
        paidAmount,
        overdueCount
      };
    })
    .filter(group => {
      const nameMatch = group.customer.name.toLowerCase().includes(search.toLowerCase());
      if (!nameMatch) return false;

      if (filter === 'pending') return group.pendingAmount > 0;
      if (filter === 'paid') return group.paidAmount > 0;
      return true;
    })
    .sort((a, b) => b.pendingAmount - a.pendingAmount);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">بەدواداچوونی قیستەکان</h1>
          <p className="text-gray-500 font-medium">بەڕێوەبردنی دارایی و وەرگرتنی قیستە مانگانەکان</p>
        </div>
      </header>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">کۆی ماوە</p>
            <p className="text-lg font-black text-gray-900">{stats.pending.toLocaleString()} د.ع</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">کۆی وەرگیراو</p>
            <p className="text-lg font-black text-gray-900">{stats.paid.toLocaleString()} د.ع</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">دواکەوتوو</p>
            <p className="text-lg font-black text-gray-900">{stats.overdue} قیست</p>
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
            className="w-full pr-14 pl-6 py-5 bg-white border border-gray-100 rounded-3xl shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-200 outline-none transition-all font-medium"
          />
        </div>
        <div className="flex bg-white p-2 rounded-3xl border border-gray-100 shadow-sm">
          {(['all', 'pending', 'paid'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-8 py-3 rounded-2xl text-sm font-bold transition-all",
                filter === f ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-500 hover:bg-gray-50"
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
                  "bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden transition-all",
                  isExpanded && "ring-2 ring-blue-100 shadow-xl"
                )}
              >
                {/* Customer Row */}
                <div 
                  onClick={() => setExpandedCustomerId(isExpanded ? null : group.customer.id)}
                  className="px-8 py-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl shadow-sm">
                      {group.customer.emoji || group.customer.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900">{group.customer.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <CreditCard size={10} /> {group.installments.length} قیست
                        </span>
                        {group.overdueCount > 0 && (
                          <span className="text-[10px] font-black text-red-600 uppercase tracking-wider flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-full">
                            <AlertCircle size={10} /> {group.overdueCount} دواکەوتوو
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-left">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">کۆی قەرزی ماوە</p>
                      <p className="text-xl font-black text-gray-900">
                        {group.pendingAmount.toLocaleString()} <span className="text-xs font-bold text-gray-400">د.ع</span>
                      </p>
                    </div>
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                      isExpanded ? "bg-blue-600 text-white rotate-180" : "bg-gray-50 text-gray-400"
                    )}>
                      <ChevronDown size={20} />
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
                      className="border-t border-gray-50 bg-gray-50/30"
                    >
                      <div className="p-8">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                          <table className="w-full text-right border-collapse">
                            <thead>
                              <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">بەروار</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">بڕی قیست</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">دۆخ</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left">کردار</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {group.installments
                                .filter(inst => filter === 'all' || inst.status === filter)
                                .map((inst) => {
                                  const isOverdue = inst.status === 'pending' && inst.dueDate < today;
                                  return (
                                    <tr key={inst.id} className={cn(
                                      "hover:bg-blue-50/30 transition-colors",
                                      isOverdue && "bg-red-50/10"
                                    )}>
                                      <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                          <span className={cn("font-bold text-sm", isOverdue ? "text-red-600" : "text-gray-700")}>
                                            {inst.dueDate}
                                          </span>
                                          {inst.status === 'paid' && (
                                            <span className="text-[10px] text-green-500 font-bold">دراوە: {inst.paidAt?.split('T')[0]}</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className="font-black text-gray-900">{inst.amount.toLocaleString()}</span>
                                        <span className="text-[10px] text-gray-400 mr-1">د.ع</span>
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                        <span className={cn(
                                          "inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                          inst.status === 'paid' ? "bg-green-100 text-green-700" : 
                                          isOverdue ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                                        )}>
                                          {inst.status === 'paid' ? 'دراوە' : isOverdue ? 'دواکەوتوو' : 'ماوە'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-left">
                                        {inst.status === 'pending' ? (
                                          <button
                                            disabled={loadingId === inst.id}
                                            onClick={() => handlePay(inst)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:opacity-50"
                                          >
                                            {loadingId === inst.id ? <Loader2 className="animate-spin" size={12} /> : 'وەرگرتن'}
                                          </button>
                                        ) : (
                                          <div className="inline-flex items-center gap-2">
                                            {revertingId === inst.id ? (
                                              <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-100">
                                                <button
                                                  onClick={() => handleRevert(inst)}
                                                  disabled={loadingId === inst.id}
                                                  className="px-2 py-1 bg-red-600 text-white rounded-md text-[9px] font-bold"
                                                >
                                                  بەڵێ
                                                </button>
                                                <button
                                                  onClick={() => setRevertingId(null)}
                                                  className="px-2 py-1 bg-white text-gray-500 rounded-md text-[9px] font-bold"
                                                >
                                                  نەخێر
                                                </button>
                                              </div>
                                            ) : (
                                              <button
                                                onClick={() => setRevertingId(inst.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {groupedData.length === 0 && (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-gray-300" size={32} />
            </div>
            <p className="text-gray-400 font-bold">هیچ کڕیارێک یان قیستێک نەدۆزرایەوە</p>
          </div>
        )}
      </div>
    </div>
  );
}
