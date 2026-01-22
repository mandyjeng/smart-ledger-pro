
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Transaction } from '../types';

interface Props {
  transactions: Transaction[];
}

const Dashboard: React.FC<Props> = ({ transactions }) => {
  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const COLORS = ['#EF4444', '#FBBF24', '#3B82F6', '#10B981', '#8B5CF6', '#F97316'];

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="bg-white border-3 border-zinc-900 rounded-3xl p-6 shadow-[6px_6px_0px_#18181b] flex flex-col justify-between">
          <span className="text-xs font-black uppercase text-zinc-400">當前結餘</span>
          <div className="flex items-baseline space-x-1">
            <span className="text-4xl font-black tracking-tighter">${stats.balance.toLocaleString()}</span>
          </div>
        </div>

        {/* Income Card */}
        <div className="bg-white border-3 border-zinc-900 rounded-3xl p-6 shadow-[6px_6px_0px_#18181b] flex flex-col justify-between">
          <span className="text-xs font-black uppercase text-zinc-400">總收入</span>
          <div className="text-3xl font-black text-emerald-600 tracking-tighter">+${stats.income.toLocaleString()}</div>
        </div>

        {/* Expense Card */}
        <div className="bg-white border-3 border-zinc-900 rounded-3xl p-6 shadow-[6px_6px_0px_#18181b] flex flex-col justify-between">
          <span className="text-xs font-black uppercase text-zinc-400">總支出</span>
          <div className="text-3xl font-black text-red-500 tracking-tighter">-${stats.expense.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="comic-card p-8">
          <h4 className="text-lg font-black mb-6 italic">收支趨勢</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[] /* Simplified for example */}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis hide />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="income" fill="#FBBF24" radius={[5, 5, 0, 0]} />
                <Bar dataKey="expense" fill="#EF4444" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center text-zinc-300 font-black italic h-full -mt-64">
               數據視覺化
            </div>
          </div>
        </div>

        <div className="comic-card p-8">
          <h4 className="text-lg font-black mb-6 italic">支出類別</h4>
          <div className="h-64 flex items-center justify-center">
             <i className="fa-solid fa-chart-pie text-6xl text-zinc-100"></i>
             <span className="absolute text-zinc-400 font-black italic">暫無分類數據</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
