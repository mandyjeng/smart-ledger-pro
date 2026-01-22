
import React, { useMemo, useState } from 'react';
import { Transaction, Settings } from '../types';
import { fetchHistoryFromSheet } from '../services/googleSheetService';
import TransactionCard from './TransactionCard';

interface Props {
  transactions: Transaction[];
  settings: Settings;
  onMergeTransactions: (newTxs: Transaction[]) => void;
  children?: React.ReactNode;
}

const Dashboard: React.FC<Props> = ({ transactions, settings, onMergeTransactions, children }) => {
  const [isFetching, setIsFetching] = useState(false);
  const [cloudItems, setCloudItems] = useState<Transaction[]>([]);
  const [syncSuccess, setSyncSuccess] = useState(false);

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
    setSyncSuccess(false);
    
    try {
      const data = await fetchHistoryFromSheet(settings.googleSheetUrl);
      if (data && data.length > 0) {
        const latest10 = data.slice(0, 10);
        setCloudItems(latest10);
        onMergeTransactions(latest10);
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 3000);
      } else {
        alert("雲端讀取成功，但目前沒有歷史資料。請確保您的試算表不是空的。");
      }
    } catch (err: any) {
      alert(`讀取失敗！\n\n常見原因：GAS 腳本缺少 doGet() 函數。\n\n錯誤細節：${err.message}`);
    } finally {
      setIsFetching(false);
    }
  };

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

      {/* Cloud Data Fetcher Block - Now at the bottom */}
      <div className="comic-card p-4 md:p-8 bg-zinc-50 border-dashed border-zinc-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h4 className="text-xl md:text-2xl font-black italic mb-1 flex items-center">
               <i className="fa-solid fa-cloud-arrow-down mr-3 text-red-500"></i>
               雲端同步明細
            </h4>
            <p className="text-zinc-500 font-bold text-sm">從您的 Google Sheet 取得最新 10 筆紀錄</p>
          </div>
          
          <div className="flex flex-col items-center">
            <button 
              onClick={handleFetchCloud}
              disabled={isFetching}
              className={`bg-red-500 text-white px-6 md:px-8 py-3 rounded-2xl comic-btn font-black flex items-center justify-center min-w-full md:min-w-[240px] shadow-[4px_4px_0px_#18181b] disabled:bg-zinc-400 disabled:shadow-none transition-all ${syncSuccess ? 'bg-emerald-500' : ''}`}
            >
              {isFetching ? (
                <i className="fa-solid fa-circle-notch animate-spin mr-2"></i>
              ) : syncSuccess ? (
                <i className="fa-solid fa-check mr-2"></i>
              ) : (
                <i className="fa-solid fa-file-excel mr-2"></i>
              )}
              {isFetching ? '讀取中...' : syncSuccess ? '同步成功！' : '取得最新 10 筆資料'}
            </button>
            {syncSuccess && <span className="text-[10px] font-black text-emerald-600 mt-2 animate-bounce">資料已更新至本機</span>}
          </div>
        </div>

        <div className="space-y-3">
           {cloudItems.length > 0 ? (
             <div className="animate-pop">
               {cloudItems.map(item => (
                 <div key={item.id} className="mb-3 opacity-90 hover:opacity-100 transition-opacity">
                   <TransactionCard transaction={item} onDelete={() => {}} />
                 </div>
               ))}
             </div>
           ) : isFetching ? (
             <div className="py-12 flex flex-col items-center justify-center text-zinc-400">
                <i className="fa-solid fa-spinner animate-spin text-4xl mb-3"></i>
                <span className="font-bold italic">正在讀取雲端資料...</span>
             </div>
           ) : (
             <div className="border-2 border-zinc-200 border-dashed rounded-2xl py-12 flex flex-col items-center justify-center text-zinc-300">
                <i className="fa-solid fa-database text-4xl mb-3"></i>
                <span className="font-bold italic text-center px-4">尚無雲端資料，請點擊按鈕同步</span>
                <p className="text-[10px] mt-2 text-zinc-300 font-bold">小提示：寫入用 doPost，讀取用 doGet，兩者缺一不可喔！</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
