import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Customer, Loan, Installment, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestoreUtils';
import { Wallet, Users, CreditCard, AlertCircle, TrendingUp, ArrowUpRight, ArrowDownRight, UserPlus, ReceiptText, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ckb } from 'date-fns/locale';

interface Activity {
  id: string;
  type: 'customer' | 'loan' | 'installment';
  title: string;
  subtitle: string;
  amount?: number;
  timestamp: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLoans: 0,
    receivedAmount: 0,
    remainingAmount: 0,
    overdueCount: 0,
    customerCount: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;

    const customersQuery = query(collection(db, 'customers'), where('createdBy', '==', uid));
    const loansQuery = query(collection(db, 'loans'), where('createdBy', '==', uid));
    const installmentsQuery = query(collection(db, 'installments'), where('createdBy', '==', uid));

    // Recent activities queries
    const recentCustQuery = query(collection(db, 'customers'), where('createdBy', '==', uid), orderBy('createdAt', 'desc'), limit(5));
    const recentLoansQuery = query(collection(db, 'loans'), where('createdBy', '==', uid), orderBy('createdAt', 'desc'), limit(5));
    const recentPaidInstQuery = query(collection(db, 'installments'), where('createdBy', '==', uid), where('status', '==', 'paid'), orderBy('paidAt', 'desc'), limit(5));

    const unsubCustomers = onSnapshot(customersQuery, (snapshot) => {
      setStats(prev => ({ ...prev, customerCount: snapshot.size }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'customers'));

    const unsubLoans = onSnapshot(loansQuery, (snapshot) => {
      const loans = snapshot.docs.map(doc => doc.data() as Loan);
      const total = loans.reduce((acc, loan) => acc + (loan.totalAmount || 0), 0);
      const remaining = loans.reduce((acc, loan) => acc + (loan.remainingAmount || 0), 0);
      setStats(prev => ({ 
        ...prev, 
        totalLoans: total,
        remainingAmount: remaining,
        receivedAmount: total - remaining
      }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'loans'));

    const unsubInstallments = onSnapshot(installmentsQuery, (snapshot) => {
      const installments = snapshot.docs.map(doc => doc.data() as Installment);
      const today = new Date().toISOString().split('T')[0];
      const overdue = installments.filter(inst => inst.status === 'pending' && inst.dueDate < today).length;
      setStats(prev => ({ ...prev, overdueCount: overdue }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'installments'));

    // Activity listeners
    const unsubRecentCust = onSnapshot(recentCustQuery, (snap) => {
      const items: Activity[] = snap.docs.map(doc => ({
        id: doc.id,
        type: 'customer',
        title: 'زیادکردنی کڕیار',
        subtitle: doc.data().name,
        timestamp: doc.data().createdAt
      }));
      updateActivities(items, 'customer');
    });

    const unsubRecentLoans = onSnapshot(recentLoansQuery, (snap) => {
      const items: Activity[] = snap.docs.map(doc => ({
        id: doc.id,
        type: 'loan',
        title: 'تۆمارکردنی قەرز',
        subtitle: doc.data().itemName,
        amount: doc.data().totalAmount,
        timestamp: doc.data().createdAt
      }));
      updateActivities(items, 'loan');
    });

    const unsubRecentPaid = onSnapshot(recentPaidInstQuery, (snap) => {
      const items: Activity[] = snap.docs.map(doc => ({
        id: doc.id,
        type: 'installment',
        title: 'وەرگرتنی قیست',
        subtitle: 'قیستی مانگانە',
        amount: doc.data().amount,
        timestamp: doc.data().paidAt
      }));
      updateActivities(items, 'installment');
    });

    const updateActivities = (newItems: Activity[], type: string) => {
      setActivities(prev => {
        const filtered = prev.filter(a => a.type !== type);
        const combined = [...filtered, ...newItems].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        return combined.slice(0, 5);
      });
    };

    return () => {
      unsubCustomers();
      unsubLoans();
      unsubInstallments();
      unsubRecentCust();
      unsubRecentLoans();
      unsubRecentPaid();
    };
  }, []);

  const cards = [
    { 
      title: 'کۆی گشتی قەرزەکان', 
      value: stats.totalLoans.toLocaleString() + ' دینار', 
      icon: Wallet, 
      color: 'bg-blue-600'
    },
    { 
      title: 'پارەی وەرگیراو', 
      value: stats.receivedAmount.toLocaleString() + ' دینار', 
      icon: TrendingUp, 
      color: 'bg-green-600'
    },
    { 
      title: 'پارەی ماوە', 
      value: stats.remainingAmount.toLocaleString() + ' دینار', 
      icon: CreditCard, 
      color: 'bg-orange-600'
    },
    { 
      title: 'قیستی دواکەوتوو', 
      value: stats.overdueCount.toString(), 
      icon: AlertCircle, 
      color: 'bg-red-600'
    },
  ];

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900 tracking-tight mb-2">داشبۆرد</h1>
          <p className="text-gray-500 font-medium">بەخێربێیتەوە بۆ سیستەمی بەڕێوەبردنی قیستەکانت</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Users size={24} />
          </div>
          <div className="pr-2 pl-6">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">کۆی کڕیاران</p>
            <p className="text-xl font-display font-bold text-gray-900">{stats.customerCount}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all group relative overflow-hidden"
          >
            <div className={cn("absolute top-0 left-0 w-2 h-full", card.color)} />
            <div className="flex items-start justify-between mb-6">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg", card.color)}>
                <card.icon size={28} />
              </div>
            </div>
            <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider mb-2">{card.title}</h3>
            <p className="text-2xl font-display font-bold text-gray-900 truncate">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-gray-900">چالاکییەکانی ئەم دواییە</h2>
            <Link to="/activities" className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">بینینی هەمووی</Link>
          </div>
          <div className="space-y-6">
            {activities.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-400 font-bold">هیچ چالاکییەک نییە</p>
              </div>
            ) : (
              activities.map((activity, i) => (
                <div key={activity.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    activity.type === 'customer' ? 'bg-purple-50 text-purple-600' :
                    activity.type === 'loan' ? 'bg-blue-50 text-blue-600' :
                    'bg-green-50 text-green-600'
                  }`}>
                    {activity.type === 'customer' ? <UserPlus size={20} /> :
                     activity.type === 'loan' ? <ReceiptText size={20} /> :
                     <TrendingUp size={20} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: ckb })}
                    </p>
                  </div>
                  <div className="text-left">
                    {activity.amount && (
                      <p className={`text-sm font-display font-bold ${activity.type === 'installment' ? 'text-green-600' : 'text-blue-600'}`}>
                        {activity.type === 'installment' ? '+' : ''}{activity.amount.toLocaleString()} دینار
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 font-bold">{activity.subtitle}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

