import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Loan, Installment, Customer, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestoreUtils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, PieChart as PieChartIcon, 
  BarChart3, Wallet, CreditCard, ArrowUpRight, ArrowDownRight, Activity, Calendar
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';

export default function Reports() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loans, setLoans] = useState<Loan[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const qLoans = query(collection(db, 'loans'), where('createdBy', '==', uid));
    const qInst = query(collection(db, 'installments'), where('createdBy', '==', uid));
    const qCust = query(collection(db, 'customers'), where('createdBy', '==', uid));

    const unsubLoans = onSnapshot(qLoans, (snap) => {
      setLoans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'loans'));

    const unsubInst = onSnapshot(qInst, (snap) => {
      setInstallments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Installment)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'installments'));

    const unsubCust = onSnapshot(qCust, (snap) => {
      setCustomers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'customers'));

    return () => {
      unsubLoans();
      unsubInst();
      unsubCust();
    };
  }, []);

  // Calculate Summary Stats
  const totalDebtIQD = loans.filter(l => l.currency === 'IQD' || !l.currency).reduce((acc, l) => acc + l.totalAmount, 0);
  const totalDebtUSD = loans.filter(l => l.currency === 'USD').reduce((acc, l) => acc + l.totalAmount, 0);

  const totalRemainingIQD = installments.filter(i => i.status === 'pending' && (i.currency === 'IQD' || !i.currency)).reduce((acc, i) => acc + i.amount, 0);
  const totalRemainingUSD = installments.filter(i => i.status === 'pending' && i.currency === 'USD').reduce((acc, i) => acc + i.amount, 0);

  const totalCollectedIQD = totalDebtIQD - totalRemainingIQD;
  const totalCollectedUSD = totalDebtUSD - totalRemainingUSD;

  const activeLoansCount = loans.filter(l => l.status === 'active').length;
  
  // Weighted completion rate (rough estimate using 1500 exchange rate for normalization)
  const normalizedTotalDebt = totalDebtIQD + (totalDebtUSD * 1500);
  const normalizedTotalCollected = totalCollectedIQD + (totalCollectedUSD * 1500);
  const completionRate = normalizedTotalDebt > 0 ? (normalizedTotalCollected / normalizedTotalDebt) * 100 : 0;

  // Calculate Recent Collections
  const recentCollections = installments
    .filter(inst => inst.status === 'paid' && inst.paidAt)
    .sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime())
    .slice(0, 5)
    .map(inst => {
      const loan = loans.find(l => l.id === inst.loanId);
      const customer = customers.find(c => c.id === loan?.customerId);
      return {
        ...inst,
        customerName: customer?.name || 'نەناسراو',
        customerEmoji: customer?.emoji || '👤'
      };
    });

  // Calculate Loan Status Distribution
  const loanStatusData = [
    { name: 'چالاک', value: loans.filter(l => l.status === 'active').length },
    { name: 'کۆتایی هاتووە', value: loans.filter(l => l.status === 'completed').length },
  ];

  // Calculate Top Debtors
  const topDebtors = customers
    .map(customer => {
      const customerInstallments = installments.filter(i => i.customerId === customer.id && i.status === 'pending');
      const amountIQD = customerInstallments.filter(i => i.currency === 'IQD' || !i.currency).reduce((acc, i) => acc + i.amount, 0);
      const amountUSD = customerInstallments.filter(i => i.currency === 'USD').reduce((acc, i) => acc + i.amount, 0);

      return {
        customerId: customer.id,
        name: customer.name,
        amountIQD,
        amountUSD,
        emoji: customer.emoji || '👤'
      };
    })
    .filter(d => d.amountIQD > 0 || d.amountUSD > 0)
    .sort((a, b) => (b.amountIQD + b.amountUSD * 1500) - (a.amountIQD + a.amountUSD * 1500))
    .slice(0, 5);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const chartGridColor = isDark ? '#1f2937' : '#f3f4f6';
  const chartTextColor = isDark ? '#9ca3af' : '#4b5563';
  const tooltipBg = isDark ? '#111827' : '#fff';

  const summaryCards = [
    {
      title: 'کۆی گشتی قەرزەکان',
      iqd: totalDebtIQD.toLocaleString(),
      usd: totalDebtUSD.toLocaleString(),
      icon: Wallet,
      color: 'blue'
    },
    {
      title: 'کۆی وەرگیراو',
      iqd: totalCollectedIQD.toLocaleString(),
      usd: totalCollectedUSD.toLocaleString(),
      icon: TrendingUp,
      color: 'green'
    },
    {
      title: 'کۆی ماوە',
      iqd: totalRemainingIQD.toLocaleString(),
      usd: totalRemainingUSD.toLocaleString(),
      icon: CreditCard,
      color: 'orange'
    },
    {
      title: 'ڕێژەی تەواوبوون',
      value: completionRate.toFixed(1),
      unit: '%',
      icon: Activity,
      color: 'purple'
    }
  ];

  return (
    <div className="space-y-10 pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-2 font-display">ڕاپۆرتەکان</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">شیکردنەوەی وردی داتاکان و گەشەی کارەکەت</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <Calendar className="text-blue-500" size={18} />
          <span className="text-sm font-bold text-gray-600 dark:text-gray-400">ئەمڕۆ: {new Date().toLocaleDateString('ckb')}</span>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all group relative overflow-hidden"
          >
            <div className={cn(
              "absolute top-0 left-0 w-1.5 h-full",
              card.color === 'blue' ? "bg-blue-500" :
              card.color === 'green' ? "bg-green-500" :
              card.color === 'orange' ? "bg-orange-500" : "bg-purple-500"
            )} />
            
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                card.color === 'blue' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" :
                card.color === 'green' ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" :
                card.color === 'orange' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" :
                "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
              )}>
                <card.icon size={24} />
              </div>
            </div>
            
            <h3 className="text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-widest mb-1">{card.title}</h3>
            {card.iqd !== undefined ? (
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-gray-900 dark:text-white font-display">{card.iqd}</span>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">د.ع</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-blue-600 dark:text-blue-400 font-display">{card.usd}</span>
                  <span className="text-[10px] font-bold text-blue-400/60 dark:text-blue-500/60">$</span>
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-gray-900 dark:text-white font-display">{card.value}</span>
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{card.unit}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Collections List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                <DollarSign size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">دوایین وەرگیراوەکان</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">٥ دوایین قیستی وەرگیراو</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {recentCollections.length > 0 ? (
              recentCollections.map((item, idx) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-green-500/30 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center text-xl shadow-sm">
                      {item.customerEmoji}
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white block">{item.customerName}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {new Date(item.paidAt!).toLocaleDateString('ckb')}
                      </span>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className={cn(
                      "text-lg font-black block",
                      item.currency === 'USD' ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400"
                    )}>
                      {item.amount.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {item.currency === 'USD' ? '$' : 'دینار'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                <Activity size={48} className="mb-4 opacity-20" />
                <p className="font-bold">هیچ وەرگیراوێک نییە</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Loan Status Donut Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col"
        >
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <PieChartIcon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">دۆخی قەرزەکان</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">دابەشبوونی گشتی</p>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="h-64 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={loanStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {loanStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: tooltipBg, borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: isDark ? '#fff' : '#000', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-gray-900 dark:text-white">{loans.length}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">کۆی قەرز</span>
              </div>
            </div>
            
            <div className="w-full space-y-3 mt-6">
              {loanStatusData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{item.name}</span>
                  </div>
                  <span className="text-sm font-black text-gray-900 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Top Debtors List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm lg:col-span-3"
        >
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">گەورەترین قەرزدارەکان</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">٥ کڕیار بە زۆرترین بڕی قەرز</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {topDebtors.map((debtor, idx) => {
              const maxNormalized = topDebtors[0].amountIQD + (topDebtors[0].amountUSD * 1500);
              const currentNormalized = debtor.amountIQD + (debtor.amountUSD * 1500);
              const percentage = (currentNormalized / maxNormalized) * 100;

              return (
                <motion.div 
                  key={debtor.customerId}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + (idx * 0.1) }}
                  className="group relative p-5 rounded-[2rem] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all overflow-hidden"
                >
                  {/* Progress Background */}
                  <div 
                    className="absolute inset-y-0 right-0 bg-blue-50/50 dark:bg-blue-900/10 transition-all duration-1000 ease-out"
                    style={{ width: `${percentage}%` }}
                  />

                  <div className="relative flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center text-2xl shadow-sm border border-gray-100 dark:border-gray-700 group-hover:scale-110 transition-transform">
                        {debtor.emoji}
                      </div>
                      <div>
                        <span className="font-black text-gray-900 dark:text-white block text-base">{debtor.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">پلەی {idx + 1}</span>
                          <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                          <span className="text-[10px] font-black text-blue-500">{Math.round(percentage)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left space-y-1">
                      {debtor.amountIQD > 0 && (
                        <div className="flex flex-col items-end">
                          <span className="text-lg font-black text-orange-600 dark:text-orange-400 leading-none">{debtor.amountIQD.toLocaleString()}</span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">دینار</span>
                        </div>
                      )}
                      {debtor.amountUSD > 0 && (
                        <div className="flex flex-col items-end">
                          <span className="text-lg font-black text-blue-600 dark:text-blue-400 leading-none">{debtor.amountUSD.toLocaleString()}</span>
                          <span className="text-[9px] font-bold text-blue-400/60 dark:text-blue-500/60 uppercase tracking-widest">دۆلار</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
