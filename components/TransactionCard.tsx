
import React from 'react';
import { Transaction } from '../types';

interface Props {
  transaction: Transaction;
  onDelete: (id: string) => void;
}

const TransactionCard: React.FC<Props> = ({ transaction, onDelete }) => {
  const isExpense = transaction.type === 'expense';

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between mb-3 hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isExpense ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
          <i className={`fa-solid ${isExpense ? 'fa-arrow-trend-down' : 'fa-arrow-trend-up'}`}></i>
        </div>
        <div>
          <h4 className="font-semibold text-slate-800">{transaction.description || transaction.category}</h4>
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span>{transaction.category}</span>
            <span>•</span>
            <span>{transaction.date}</span>
          </div>
        </div>
      </div>
      <div className="text-right flex items-center space-x-4">
        <span className={`font-bold ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
          {isExpense ? '-' : '+'}${transaction.amount.toLocaleString()}
        </span>
        <button 
          onClick={() => onDelete(transaction.id)}
          className="text-slate-300 hover:text-red-400 transition-colors"
        >
          <i className="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </div>
  );
};

export default TransactionCard;
