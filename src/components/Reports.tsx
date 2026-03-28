import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Loan, Installment, Customer, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestoreUtils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Reports() {
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

  // Calculate Monthly Income (Paid installments by month)
  const monthlyData = installments
    .filter(inst => inst.status === 'paid' && inst.paidAt)
    .reduce((acc: any[], inst) => {
      const month = new Date(inst.paidAt!).toLocaleString('ckb', { month: 'short' });
      const existing = acc.find(d => d.name === month);
      if (existing) {
        existing.amount += inst.amount;
      } else {
        acc.push({ name: month, amount: inst.amount });
      }
      return acc;
    }, []);

  // Calculate Loan Status Distribution
  const loanStatusData = [
    { name: 'چالاک', value: loans.filter(l => l.status === 'active').length },
    { name: 'کۆتایی هاتووە', value: loans.filter(l => l.status === 'completed').length },
  ];

  // Calculate Top Debtors
  const topDebtors = loans
    .reduce((acc: any[], loan) => {
      const customer = customers.find(c => c.id === loan.customerId);
      const existing = acc.find(d => d.customerId === loan.customerId);
      if (existing) {
        existing.amount += loan.remainingAmount;
      } else {
        acc.push({ 
          customerId: loan.customerId, 
          name: customer?.name || 'نەناسراو', 
          amount: loan.remainingAmount 
        });
      }
      return acc;
    }, [])
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">ڕاپۆرتەکان</h1>
        <p className="text-gray-500 font-medium">شیکردنەوەی دارایی و ئامارەکانی سیستەم</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Income Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
              <TrendingUp size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">داهاتی مانگانە (دینار)</h2>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f9fafb' }}
                />
                <Bar dataKey="amount" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Loan Status Distribution */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <PieChartIcon size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">دابەشبوونی قەرزەکان</h2>
          </div>
          <div className="h-80 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={loanStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {loanStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Debtors */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm lg:col-span-2"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
              <Users size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">گەورەترین قەرزدارەکان</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDebtors} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 'bold' }} width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="amount" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {topDebtors.map((debtor, idx) => (
                <div key={debtor.customerId} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-100">
                      {idx + 1}
                    </div>
                    <span className="font-bold text-gray-900">{debtor.name}</span>
                  </div>
                  <span className="font-black text-orange-600">{debtor.amount.toLocaleString()} دینار</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
