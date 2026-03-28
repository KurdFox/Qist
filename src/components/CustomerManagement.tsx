import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Customer, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestoreUtils';
import { UserPlus, Search, MapPin, Phone, CreditCard, Loader2, X, Edit2, Smile, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    idNumber: '',
    emoji: '👤'
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'customers'), where('createdBy', '==', auth.currentUser.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'customers'));
    return unsub;
  }, []);

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', address: '', idNumber: '', emoji: '👤' });
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      idNumber: customer.idNumber,
      emoji: customer.emoji || '👤'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      if (editingCustomer) {
        await updateDoc(doc(db, 'customers', editingCustomer.id), {
          ...formData
        });
      } else {
        await addDoc(collection(db, 'customers'), {
          ...formData,
          createdBy: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      setFormData({ name: '', phone: '', address: '', idNumber: '', emoji: '👤' });
    } catch (err) {
      handleFirestoreError(err, editingCustomer ? OperationType.UPDATE : OperationType.CREATE, 'customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingCustomer) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'customers', editingCustomer.id));
      setIsDeleteConfirmOpen(false);
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'customers');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  const emojis = ['👤', '👨', '👩', '👴', '👵', '👨‍💼', '👩‍💼', '👨‍🔧', '👩‍🔧', '👨‍⚕️', '👩‍⚕️', '🌟', '💎', '🔥', '🏢', '🏠'];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">بەڕێوەبردنی کڕیاران</h1>
          <p className="text-gray-500 font-medium">لیستی هەموو کڕیارەکان و زیادکردنی کڕیاری نوێ</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <UserPlus size={20} />
          زیادکردنی کڕیار
        </button>
      </header>

      <div className="relative group">
        <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
        <input
          type="text"
          placeholder="گەڕان بەدوای ناوی کڕیار یان ژمارەی مۆبایل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pr-14 pl-6 py-5 bg-white border border-gray-100 rounded-3xl shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-200 outline-none transition-all font-medium"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredCustomers.map((customer) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={customer.id}
              className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all group relative"
            >
              <button 
                onClick={() => openEditModal(customer)}
                className="absolute top-6 left-6 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Edit2 size={18} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl shadow-inner">
                  {customer.emoji || customer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{customer.name}</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">کڕیار</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                    <Phone size={16} />
                  </div>
                  <span className="text-sm font-medium">{customer.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                    <MapPin size={16} />
                  </div>
                  <span className="text-sm font-medium">{customer.address || 'ناونیشان دیارینەکراوە'}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                    <CreditCard size={16} />
                  </div>
                  <span className="text-sm font-medium">{customer.idNumber || 'ژمارەی ناسنامە نییە'}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add/Edit Customer Modal */}
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
              className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-8 md:p-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingCustomer ? 'دەستکاری کڕیار' : 'زیادکردنی کڕیار'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col items-center gap-4 mb-4">
                  <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center text-4xl shadow-inner border-2 border-dashed border-blue-200">
                    {formData.emoji}
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {emojis.map(e => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setFormData({ ...formData, emoji: e })}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all hover:scale-110",
                          formData.emoji === e ? "bg-blue-600 text-white shadow-lg" : "bg-gray-50 hover:bg-gray-100"
                        )}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 mr-1">ناوی تەواو</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-200 outline-none transition-all font-medium"
                    placeholder="ناوی کڕیار بنووسە..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 mr-1">ژمارەی مۆبایل</label>
                  <input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-200 outline-none transition-all font-medium"
                    placeholder="٠٧٥٠٠٠٠٠٠٠٠"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 mr-1">ناونیشان</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-200 outline-none transition-all font-medium"
                    placeholder="ناونیشانی کڕیار..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 mr-1">ژمارەی ناسنامە</label>
                  <input
                    type="text"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-200 outline-none transition-all font-medium"
                    placeholder="ژمارەی ناسنامەی کڕیار..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  {editingCustomer && (
                    <button
                      type="button"
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      className="flex-1 flex items-center justify-center gap-3 py-5 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all border border-red-100"
                    >
                      <Trash2 size={20} />
                      سڕینەوە
                    </button>
                  )}
                  <button
                    disabled={loading}
                    type="submit"
                    className={cn(
                      "flex-[2] flex items-center justify-center gap-3 py-5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50",
                      !editingCustomer && "flex-1"
                    )}
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (editingCustomer ? <Smile size={20} /> : <UserPlus size={20} />)}
                    {editingCustomer ? 'پاشەکەوتکردنی گۆڕانکارییەکان' : 'تۆمارکردنی کڕیار'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 text-center"
            >
              <div className="w-20 h-20 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-6 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">ئایا دڵنیایت؟</h3>
              <p className="text-gray-500 font-medium mb-8">
                سڕینەوەی کڕیارەکە دەبێتە هۆی سڕینەوەی هەموو زانیارییەکانی، ئەم کارە ناگەڕێتەوە.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                >
                  نەخێر
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="animate-spin" size={18} />}
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
