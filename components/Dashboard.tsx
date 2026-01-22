
import React, { useMemo } from 'react';
import { Transaction } from '../types';

interface Props {
  transactions: Transaction[];
  children?: React.ReactNode;
}

const Dashboard: React.FC<Props> = ({ transactions, children }) => {
  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  return (
    <div className="space-y-10">
      {/* Stat Cards - Forced 3 columns even on mobile */}
      <div className="grid grid-cols-3 gap-2 md:gap-6">
        <div className="bg-white border-2 md:border-3 border-zinc-900 rounded-2xl md:rounded-3xl p-3 md:p-6 shadow-[3px_3px_0px_#18181b] md:shadow-[6px_6px_0px_#18181b]">
          <span className="text-[10px] md:text-xs font-black uppercase text-zinc-400 block mb-1">當前結餘</span>
          <div className="text-sm sm:text-xl md:text-2xl lg:text-4xl font-black tracking-tighter truncate">
            ${stats.balance.toLocaleString()}
          </div>
        </div>

        <div className="bg-white border-2 md:border-3 border-zinc-900 rounded-2xl md:rounded-3xl p-3 md:p-6 shadow-[3px_3px_0px_#18181b] md:shadow-[6px_6px_0px_#18181b]">
          <span className="text-[10px] md:text-xs font-black uppercase text-zinc-400 block mb-1">總收入</span>
          <div className="text-sm sm:text-xl md:text-2xl lg:text-3xl font-black text-emerald-600 tracking-tighter truncate">
            +${stats.income.toLocaleString()}
          </div>
        </div>

        <div className="bg-white border-2 md:border-3 border-zinc-900 rounded-2xl md:rounded-3xl p-3 md:p-6 shadow-[3px_3px_0px_#18181b] md:shadow-[6px_6px_0px_#18181b]">
          <span className="text-[10px] md:text-xs font-black uppercase text-zinc-400 block mb-1">總支出</span>
          <div className="text-sm sm:text-xl md:text-2xl lg:text-3xl font-black text-red-500 tracking-tighter truncate">
            -${stats.expense.toLocaleString()}
          </div>
        </div>
      </div>

      {/* AI Bookkeeping is inserted here via children */}
      {children}
    </div>
  );
};

export default Dashboard;
