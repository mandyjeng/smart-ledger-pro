
import React, { useMemo, useState } from 'react';
import { Transaction, Settings } from '../types';
import { fetchHistoryFromSheet } from '../services/googleSheetService';
import TransactionCard from './TransactionCard';

interface Props {
  transactions: Transaction[];
  settings: Settings;
  onMergeTransactions: (newTxs: Transaction[]) => void;
}

const Dashboard: React.FC<Props> = ({ transactions, settings, onMergeTransactions }) => {
  const [isFetching, setIsFetching] = useState(false);
  const [cloudItems, setCloudItems] = useState<Transaction[]>([]);

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const handleFetchCloud = async () => {
    if (!settings.googleSheetUrl) {
      alert("請先在設定中填入 Google Sheet URL");
      return;
    }
    setIsFetching(true);
    try {
      const data = await fetchHistoryFromSheet(settings.googleSheetUrl);
      if (data && data.length > 0) {
        setCloudItems(data.slice(0, 10)); // 只顯示前 10 筆
      } else {
        alert("雲端目前沒有新資料或尚未開放讀取權限。");
      }
    } catch (err) {
      alert("取得失敗，請確認 Script URL 是否正確。");
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border-3 border-zinc-900 rounded-3xl p-6 shadow-[6px_6px_0px_#18181b]">
          <span className="text-xs font-black uppercase text-zinc-400 block mb-2">當前結餘</span>
          <div className="text-4xl font-black tracking-tighter">${stats.balance.toLocaleString()}</div>
        </div>

        <div className="bg-white border-3 border-zinc-900 rounded-3xl p-6 shadow-[6px_6px_0px_#18181b]">
          <span className="text-xs font-black uppercase text-zinc-400 block mb-2">總收入</span>
          <div className="text-3xl font-black text-emerald-600 tracking-tighter">+${stats.income.toLocaleString()}</div>
        </div>

        <div className="bg-white border-3 border-zinc-900 rounded-3xl p-6 shadow-[6px_6px_0px_#18181b]">
          <span className="text-xs font-black uppercase text-zinc-400 block mb-2">總支出</span>
          <div className="text-3xl font-black text-red-500 tracking-tighter">-${stats.expense.toLocaleString()}</div>
        </div>
      </div>

      {/* Cloud Data Fetcher Block */}
      <div className="comic-card p-8 bg-zinc-50 border-dashed border-zinc-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h4 className="text-2xl font-black italic mb-1 flex items-center">
               <i className="fa-solid fa-cloud-arrow-down mr-3 text-red-500"></i>
               雲端同步明細
            </h4>
            <p className="text-zinc-500 font-bold text-sm">從您的 Google Sheet 取得最新 10 筆紀錄</p>
          </div>
          <button 
            onClick={handleFetchCloud}
            disabled={isFetching}
            className="bg-white px-8 py-3 rounded-2xl comic-btn font-black flex items-center justify-center min-w-[160px]"
          >
            {isFetching ? (
              <i className="fa-solid fa-circle-notch animate-spin mr-2"></i>
            ) : (
              <i className="fa-solid fa-sync-alt mr-2"></i>
            )}
            {isFetching ? '讀取中...' : '取得最新資料'}
          </button>
        </div>

        <div className="space-y-3">
           {cloudItems.length > 0 ? (
             cloudItems.map(item => (
               <div key={item.id} className="opacity-70 grayscale hover:grayscale-0 transition-all">
                 <TransactionCard transaction={item} onDelete={() => {}} />
               </div>
             ))
           ) : (
             <div className="border-2 border-zinc-200 border-dashed rounded-2xl py-12 flex flex-col items-center justify-center text-zinc-300">
                <i className="fa-solid fa-database text-4xl mb-3"></i>
                <span className="font-bold italic">尚無雲端資料，請點擊按鈕同步</span>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
