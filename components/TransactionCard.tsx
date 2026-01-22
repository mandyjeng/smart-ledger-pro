
import React from 'react';
import { Transaction } from '../types';

interface Props {
  transaction: Transaction;
  onDelete: (id: string) => void;
}

const TransactionCard: React.FC<Props> = ({ transaction, onDelete }) => {
  const isExpense = transaction.type === 'expense';

  return (
    <div className="bg-white p-4 border-2 border-zinc-900 rounded-2xl flex items-center justify-between group transition-all hover:bg-zinc-50">
      <div className="flex items-center space-x-4">
        <div className={`w-10 h-10 rounded-xl border-2 border-zinc-900 flex items-center justify-center shadow-[2px_2px_0px_#18181b] ${isExpense ? 'bg-red-500' : 'bg-emerald-500'}`}>
          <i className={`fa-solid ${isExpense ? 'fa-arrow-down' : 'fa-arrow-up'} text-white text-xs`}></i>
        </div>
        <div>
          <h4 className="font-black text-zinc-900 leading-none mb-1">{transaction.description}</h4>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black uppercase text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-md">{transaction.category}</span>
            <span className="text-[10px] font-bold text-zinc-300">{transaction.date}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span className={`font-black text-lg tracking-tighter ${isExpense ? 'text-zinc-900' : 'text-emerald-600'}`}>
          {isExpense ? '-' : '+'}${transaction.amount.toLocaleString()}
        </span>
        <button 
          onClick={() => onDelete(transaction.id)}
          className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center text-zinc-300 hover:text-red-500 transition-all"
        >
          <i className="fa-solid fa-trash-can text-sm"></i>
        </button>
      </div>
    </div>
  );
};

export default TransactionCard;
