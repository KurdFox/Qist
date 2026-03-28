import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, addDoc, writeBatch, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Customer, Loan, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestoreUtils';
import { ReceiptText, Plus, Search, Calendar, DollarSign, Package, User, Loader2, X, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { addMonths, format } from 'date-fns';
import { cn } from '../lib/utils';

export default function LoanManagement() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    itemName: '',
    totalAmount: 0,
    downPayment: 0,
    monthsCount: 12,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    currency: 'IQD' as 'IQD' | 'USD'
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const qLoans = query(collection(db, 'loans'), where('createdBy', '==', auth.currentUser.uid));
    const qCustomers = query(collection(db, 'customers'), where('createdBy', '==', auth.currentUser.uid));

    const unsubLoans = onSnapshot(qLoans, (snapshot) => {
      setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'loans'));

    const unsubCustomers = onSnapshot(qCustomers, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'customers'));

    return () => {
      unsubLoans();
      unsubCustomers();
    };
  }, []);

  const openAddModal = () => {
    setEditingLoan(null);
    setFormData({
      customerId: '',
      itemName: '',
      totalAmount: 0,
      downPayment: 0,
      monthsCount: 12,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      currency: 'IQD'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (loan: Loan) => {
    setEditingLoan(loan);
    setFormData({
      customerId: loan.customerId,
      itemName: loan.itemName,
      totalAmount: loan.totalAmount,
      downPayment: loan.downPayment,
      monthsCount: loan.monthsCount,
      startDate: loan.startDate,
      currency: loan.currency || 'IQD'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !formData.customerId) return;
    setLoading(true);
    try {
      const remainingAmount = formData.totalAmount - formData.downPayment;
      const monthlyInstallment = Math.round(remainingAmount / formData.monthsCount);
      
      const loanData = {
        ...formData,
        remainingAmount,
        monthlyInstallment,
        status: editingLoan ? editingLoan.status : 'active',
        createdBy: auth.currentUser.uid,
        createdAt: editingLoan ? editingLoan.createdAt : new Date().toISOString()
      };

      if (editingLoan) {
        // If financial terms changed, we might need to regenerate installments
        // For simplicity in this version, we'll update the loan and warn that installments are static
        // or we could regenerate them. Let's regenerate them if the user confirms (or just do it)
        const batch = writeBatch(db);
        
        // Update loan
        batch.update(doc(db, 'loans', editingLoan.id), loanData);

        // Delete old installments
        const instQuery = query(collection(db, 'installments'), where('loanId', '==', editingLoan.id));
        const instSnap = await getDocs(instQuery);
        instSnap.docs.forEach(d => batch.delete(d.ref));

        // Generate new installments
        for (let i = 1; i <= formData.monthsCount; i++) {
          const dueDate = format(addMonths(new Date(formData.startDate), i), 'yyyy-MM-dd');
          const instRef = doc(collection(db, 'installments'));
          batch.set(instRef, {
            loanId: editingLoan.id,
            customerId: formData.customerId,
            amount: monthlyInstallment,
            currency: formData.currency,
            dueDate,
            status: 'pending',
            createdBy: auth.currentUser.uid
          });
        }
        await batch.commit();
      } else {
        const loanRef = await addDoc(collection(db, 'loans'), loanData);
        
        // Generate installments
        const batch = writeBatch(db);
        for (let i = 1; i <= formData.monthsCount; i++) {
          const dueDate = format(addMonths(new Date(formData.startDate), i), 'yyyy-MM-dd');
          const instRef = doc(collection(db, 'installments'));
          batch.set(instRef, {
            loanId: loanRef.id,
            customerId: formData.customerId,
            amount: monthlyInstallment,
            currency: formData.currency,
            dueDate,
            status: 'pending',
            createdBy: auth.currentUser.uid
          });
        }
        await batch.commit();
      }

      setIsModalOpen(false);
      setFormData({
        customerId: '',
        itemName: '',
        totalAmount: 0,
        downPayment: 0,
        monthsCount: 12,
        startDate: format(new Date(), 'yyyy-MM-dd'),
        currency: 'IQD'
      });
    } catch (err) {
      handleFirestoreError(err, editingLoan ? OperationType.UPDATE : OperationType.CREATE, 'loans');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!loanToDelete) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      // Delete loan
      batch.delete(doc(db, 'loans', loanToDelete.id));

      // Delete installments
      const instQuery = query(collection(db, 'installments'), where('loanId', '==', loanToDelete.id));
      const instSnap = await getDocs(instQuery);
      instSnap.docs.forEach(d => batch.delete(d.ref));

      await batch.commit();
      setIsDeleteModalOpen(false);
      setLoanToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'loans');
    } finally {
      setLoading(false);
    }
  };

  const getCustomer = (id: string) => customers.find(c => c.id === id);

  const filteredLoans = loans.filter(l => {
    const customerName = getCustomer(l.customerId)?.name || '';
    return customerName.toLowerCase().includes(search.toLowerCase()) || 
           l.itemName.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2 font-display">بەڕێوەبردنی قەرزەکان</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">تۆمارکردنی قەرزی نوێ و بینینی خشتەی قیستەکان</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg dark:shadow-none"
        >
          <Plus size={20} />
          تۆمارکردنی قەرز
        </button>
      </header>

      <div className="relative group">
        <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
        <input
          type="text"
          placeholder="گەڕان بەدوای ناوی کڕیار یان جۆری کاڵا..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pr-14 pl-6 py-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 focus:border-blue-200 dark:focus:border-blue-800 outline-none transition-all font-medium text-gray-900 dark:text-white"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <th className="px-8 py-6 text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">کڕیار</th>
                <th className="px-8 py-6 text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">کاڵا</th>
                <th className="px-8 py-6 text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">کۆی گشتی</th>
                <th className="px-8 py-6 text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">ماوە</th>
                <th className="px-8 py-6 text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">مانگ</th>
                <th className="px-8 py-6 text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">دۆخ</th>
                <th className="px-8 py-6 text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">کردارەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filteredLoans.map((loan) => {
                const customer = getCustomer(loan.customerId);
                return (
                  <tr key={loan.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-xl shadow-inner">
                          {customer?.emoji || customer?.name?.charAt(0) || '?'}
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">{customer?.name || 'کڕیاری نەناسراو'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-medium text-gray-600 dark:text-gray-400">{loan.itemName}</td>
                    <td className="px-8 py-6 font-black text-gray-900 dark:text-white">
                      {loan.totalAmount.toLocaleString()} {loan.currency === 'USD' ? '$' : 'د.ع'}
                    </td>
                    <td className="px-8 py-6 font-black text-orange-600 dark:text-orange-400">
                      {loan.remainingAmount.toLocaleString()} {loan.currency === 'USD' ? '$' : 'د.ع'}
                    </td>
                    <td className="px-8 py-6 font-bold text-gray-500 dark:text-gray-400">{loan.monthsCount} مانگ</td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-bold",
                        loan.status === 'active' ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      )}>
                        {loan.status === 'active' ? 'چالاک' : 'تەواوبوو'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 transition-opacity">
                        <button 
                          onClick={() => openEditModal(loan)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setLoanToDelete(loan);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Loan Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl p-8 md:p-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingLoan ? 'دەستکاری قەرز' : 'تۆمارکردنی قەرزی نوێ'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              {editingLoan && (
                <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl flex gap-3 text-orange-800 dark:text-orange-400 text-sm">
                  <AlertTriangle size={20} className="shrink-0" />
                  <p className="font-medium">تێبینی: گۆڕینی بڕی پارە یان مانگەکان دەبێتە هۆی دووبارە دروستکردنەوەی هەموو قیستەکان بۆ ئەم قەرزە.</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mr-1 flex items-center gap-2">
                      <User size={16} className="text-blue-500" /> کڕیار
                    </label>
                    <select
                      required
                      value={formData.customerId}
                      onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 focus:border-blue-200 dark:focus:border-blue-600 outline-none transition-all font-medium appearance-none text-gray-900 dark:text-white"
                    >
                      <option value="">کڕیار هەڵبژێرە...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mr-1 flex items-center gap-2">
                      <Package size={16} className="text-blue-500" /> ناوی کاڵا
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.itemName}
                      onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 focus:border-blue-200 dark:focus:border-blue-600 outline-none transition-all font-medium text-gray-900 dark:text-white"
                      placeholder="ناوی کاڵاکە بنووسە..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mr-1 flex items-center gap-2">
                      <DollarSign size={16} className="text-blue-500" /> جۆری دراو
                    </label>
                    <select
                      required
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'IQD' | 'USD' })}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 focus:border-blue-200 dark:focus:border-blue-600 outline-none transition-all font-medium appearance-none text-gray-900 dark:text-white"
                    >
                      <option value="IQD">دیناری عێراقی (IQD)</option>
                      <option value="USD">دۆلاری ئەمریکی (USD)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mr-1 flex items-center gap-2">
                      <DollarSign size={16} className="text-blue-500" /> نرخی گشتی
                    </label>
                    <input
                      required
                      type="number"
                      value={formData.totalAmount}
                      onChange={(e) => setFormData({ ...formData, totalAmount: Number(e.target.value) })}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 focus:border-blue-200 dark:focus:border-blue-600 outline-none transition-all font-medium text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mr-1 flex items-center gap-2">
                      <DollarSign size={16} className="text-blue-500" /> بڕی پێشەکی
                    </label>
                    <input
                      required
                      type="number"
                      value={formData.downPayment}
                      onChange={(e) => setFormData({ ...formData, downPayment: Number(e.target.value) })}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 focus:border-blue-200 dark:focus:border-blue-600 outline-none transition-all font-medium text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mr-1 flex items-center gap-2">
                      <Calendar size={16} className="text-blue-500" /> ژمارەی مانگەکانی قیست
                    </label>
                    <input
                      required
                      type="number"
                      value={formData.monthsCount}
                      onChange={(e) => setFormData({ ...formData, monthsCount: Number(e.target.value) })}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 focus:border-blue-200 dark:focus:border-blue-600 outline-none transition-all font-medium text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mr-1 flex items-center gap-2">
                      <Calendar size={16} className="text-blue-500" /> بەرواری دەستپێکردن
                    </label>
                    <input
                      required
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 focus:border-blue-200 dark:focus:border-blue-600 outline-none transition-all font-medium text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-blue-900 dark:text-blue-300">قیستی مانگانە:</span>
                    <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                      {formData.totalAmount > formData.downPayment 
                        ? Math.round((formData.totalAmount - formData.downPayment) / formData.monthsCount).toLocaleString() 
                        : 0} {formData.currency === 'USD' ? '$' : 'د.ع'}
                    </span>
                  </div>
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full flex items-center justify-center gap-3 py-5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg dark:shadow-none disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <ReceiptText size={20} />}
                  {editingLoan ? 'پاشەکەوتکردنی گۆڕانکارییەکان' : 'تۆمارکردنی قەرز و خشتەی قیستەکان'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">دڵنیایت لە سڕینەوە؟</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium mb-8">
                سڕینەوەی ئەم قەرزە دەبێتە هۆی سڕینەوەی هەموو ئەو قیستانەی کە پەیوەندییان پێوەیەتی. ئەم کردارە ناگەڕێتەوە.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  disabled={loading}
                  onClick={handleDelete}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                  بەڵێ، بسڕەوە
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

