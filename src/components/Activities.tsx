import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestoreUtils';
import { TrendingUp, UserPlus, ReceiptText, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { ckb } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Activity {
  id: string;
  type: 'customer' | 'loan' | 'installment';
  title: string;
  subtitle: string;
  amount?: number;
  timestamp: string;
}

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;
    
    // Fetch recent customers
    const qCust = query(
      collection(db, 'customers'), 
      where('createdBy', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    // Fetch recent loans
    const qLoans = query(
      collection(db, 'loans'), 
      where('createdBy', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    // Fetch recent paid installments
    const qInst = query(
      collection(db, 'installments'), 
      where('createdBy', '==', uid),
      where('status', '==', 'paid'),
      orderBy('paidAt', 'desc'),
      limit(20)
    );

    const unsubCust = onSnapshot(qCust, (snap) => {
      const items: Activity[] = snap.docs.map(doc => ({
        id: doc.id,
        type: 'customer',
        title: 'زیادکردنی کڕیار',
        subtitle: doc.data().name,
        timestamp: doc.data().createdAt
      }));
      updateActivities(items, 'customer');
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'customers'));

    const unsubLoans = onSnapshot(qLoans, (snap) => {
      const items: Activity[] = snap.docs.map(doc => ({
        id: doc.id,
        type: 'loan',
        title: 'تۆمارکردنی قەرز',
        subtitle: doc.data().itemName,
        amount: doc.data().totalAmount,
        timestamp: doc.data().createdAt
      }));
      updateActivities(items, 'loan');
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'loans'));

    const unsubInst = onSnapshot(qInst, (snap) => {
      const items: Activity[] = snap.docs.map(doc => ({
        id: doc.id,
        type: 'installment',
        title: 'وەرگرتنی قیست',
        subtitle: 'قیستی مانگانە',
        amount: doc.data().amount,
        timestamp: doc.data().paidAt
      }));
      updateActivities(items, 'installment');
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'installments'));

    const updateActivities = (newItems: Activity[], type: string) => {
      setActivities(prev => {
        const filtered = prev.filter(a => a.type !== type);
        const combined = [...filtered, ...newItems].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        return combined.slice(0, 50);
      });
    };

    return () => {
      unsubCust();
      unsubLoans();
      unsubInst();
    };
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-100 dark:hover:border-blue-900/40 transition-all shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">هەموو چالاکییەکان</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">مێژووی هەموو گۆڕانکاری و چالاکییەکان</p>
        </div>
      </header>

      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 md:p-12 border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="space-y-8">
          {activities.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-600 mx-auto mb-6">
                <TrendingUp size={40} />
              </div>
              <p className="text-gray-400 dark:text-gray-500 font-bold">هیچ چالاکییەک نییە بۆ پیشاندان</p>
            </div>
          ) : (
            activities.map((activity, i) => (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={activity.id} 
                className="flex items-center gap-6 p-6 rounded-3xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-800 group"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 ${
                  activity.type === 'customer' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' :
                  activity.type === 'loan' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                  'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                }`}>
                  {activity.type === 'customer' ? <UserPlus size={24} /> :
                   activity.type === 'loan' ? <ReceiptText size={24} /> :
                   <TrendingUp size={24} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{activity.title}</p>
                    <span className="text-xs font-bold text-gray-300 dark:text-gray-700">•</span>
                    <p className="text-sm font-bold text-gray-400 dark:text-gray-500">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: ckb })}
                    </p>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">{activity.subtitle}</p>
                </div>
                {activity.amount && (
                  <div className="text-left">
                    <p className={`text-lg font-black ${activity.type === 'installment' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                      {activity.type === 'installment' ? '+' : ''}{activity.amount.toLocaleString()} دینار
                    </p>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
