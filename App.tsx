
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, Settings } from './types';
import { DEFAULT_SETTINGS } from './constants';
// import { parseEntryWithAI } from './services/geminiService';
import { parseEntryWithAI } from './services/ai-parser';
import { syncToGoogleSheet, fetchHistoryFromSheet } from './services/googleSheetService';
import Dashboard from './components/Dashboard';
import TransactionCard from './components/TransactionCard';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('app_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  
  const [aiInput, setAiInput] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard');

  const refreshDataFromSheet = useCallback(async (showLoading = true) => {
    if (!settings.googleSheetUrl || !settings.googleSheetUrl.startsWith('http')) return;
    
    if (showLoading) setIsSyncing(true);
    try {
      const data = await fetchHistoryFromSheet(settings.googleSheetUrl);
      if (data && Array.isArray(data)) {
        setTransactions(data);
        localStorage.setItem('transactions', JSON.stringify(data));
      }
    } catch (error) {
      console.error("同步雲端資料失敗:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [settings.googleSheetUrl]);

  useEffect(() => {
    const saved = localStorage.getItem('transactions');
    if (saved) {
      try {
        setTransactions(JSON.parse(saved));
      } catch(e) {}
    }
    refreshDataFromSheet(false);
  }, [refreshDataFromSheet]);

  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  // 計算本週週一的日期 (YYYY-MM-DD)
  const mondayDateStr = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0 (Sun) - 6 (Sat)
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 如果是週日，往回扣 6 天到週一；否則扣到當週週一
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  }, []);

  // 按類別分組明細 (僅限本週)
  const groupedHistory = useMemo(() => {
    const groups: Record<string, { txs: Transaction[], total: number }> = {};
    
    // 篩選出本週的交易
    const weeklyTransactions = transactions.filter(tx => tx.date >= mondayDateStr);

    weeklyTransactions.forEach(tx => {
      const cat = tx.category || '未分類';
      if (!groups[cat]) {
        groups[cat] = { txs: [], total: 0 };
      }
      groups[cat].txs.push(tx);
      groups[cat].total += (tx.type === 'expense' ? -tx.amount : tx.amount);
    });
    return Object.entries(groups).sort((a, b) => b[1].txs.length - a[1].txs.length);
  }, [transactions, mondayDateStr]);

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim() || isAiProcessing) return;

    setIsAiProcessing(true);
    try {
      const parsed = await parseEntryWithAI(aiInput);
      if (parsed) {
        const newTx: Transaction = {
          id: crypto.randomUUID(),
          date: parsed.date || new Date().toISOString().split('T')[0],
          amount: parsed.amount,
          category: parsed.category,
          description: parsed.description,
          type: parsed.type,
        };
        
        const updated = [newTx, ...transactions];
        setTransactions(updated);
        localStorage.setItem('transactions', JSON.stringify(updated));
        setAiInput('');

        if (settings.googleSheetUrl) {
          syncToGoogleSheet(newTx, settings.googleSheetUrl.trim());
        }
      }
    } catch (error: any) {
      alert(`⚠️ 錯誤：${error.message}`);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleTabChange = (tab: 'dashboard' | 'history' | 'settings') => {
    setActiveTab(tab);
    if (tab === 'history') {
      refreshDataFromSheet(true);
    }
  };

  const deleteTransaction = (id: string) => {
    if (confirm('確定要刪除這筆紀錄嗎？')) {
      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);
      localStorage.setItem('transactions', JSON.stringify(updated));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 min-h-screen flex flex-col">
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-500 rounded-2xl border-3 border-zinc-900 flex items-center justify-center shadow-[4px_4px_0px_#18181b]">
              <i className="fa-solid fa-calculator text-white text-2xl"></i>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tight">
              {settings.userName}的記帳小本本
            </h1>
          </div>
          <p className="text-zinc-500 font-bold text-lg leading-none">
            你好，{settings.userName}！{isSyncing ? '同步中...' : '資料已更新'}
          </p>
        </div>
        
        <nav className="flex items-center bg-white border-3 border-zinc-900 rounded-2xl p-1.5 shadow-[4px_4px_0px_#18181b]">
          <button onClick={() => handleTabChange('dashboard')} className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${activeTab === 'dashboard' ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100'}`}>總覽</button>
          <button onClick={() => handleTabChange('history')} className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${activeTab === 'history' ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100'}`}>本週明細</button>
          <button onClick={() => handleTabChange('settings')} className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${activeTab === 'settings' ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100'}`}>設定</button>
        </nav>
      </header>

      <main className="flex-1 animate-pop">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-10">
              <Dashboard transactions={transactions}>
                <div className="bg-yellow-400 border-4 border-zinc-900 rounded-3xl p-8 shadow-[8px_8px_0px_#18181b] relative overflow-hidden">
                  <div className="absolute -right-8 -bottom-8 opacity-10">
                     <i className="fa-solid fa-wand-sparkles text-9xl"></i>
                  </div>
                  <h3 className="text-2xl font-black mb-4 flex items-center">
                    <i className="fa-solid fa-wand-magic-sparkles mr-3"></i>
                    AI 記帳
                  </h3>
                  <form onSubmit={handleAiSubmit} className="relative z-10">
                    <input 
                      type="text"
                      placeholder="例如：午餐花了 200 元..."
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      className="w-full bg-white border-3 border-zinc-900 rounded-2xl py-5 px-6 text-xl font-bold shadow-[4px_4px_0px_rgba(0,0,0,0.1)] focus:outline-none"
                    />
                    <button disabled={isAiProcessing || !aiInput.trim()} className="mt-4 bg-zinc-900 text-white w-full py-4 rounded-xl font-black text-lg comic-btn disabled:opacity-50">
                      {isAiProcessing ? '處理中...' : '送出紀錄'}
                    </button>
                  </form>
                </div>
              </Dashboard>
            </div>

            <div className="lg:col-span-4">
              <div className="comic-card p-6 h-fit sticky top-10">
                <h3 className="text-xl font-black mb-6 border-b-3 border-zinc-900 pb-2 text-zinc-800 flex items-center justify-between">
                  <span>最新動態 (5筆)</span>
                  {isSyncing && <i className="fa-solid fa-sync fa-spin text-xs text-zinc-400"></i>}
                </h3>
                <div className="space-y-4">
                  {transactions.length > 0 ? (
                    transactions.slice(0, 5).map(tx => <TransactionCard key={tx.id} transaction={tx} onDelete={deleteTransaction} />)
                  ) : (
                    <p className="text-center py-10 text-zinc-400 font-bold">目前沒有紀錄</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between border-b-4 border-zinc-900 pb-4">
              <div className="space-y-1">
                <h2 className="text-3xl font-black uppercase text-zinc-800 flex items-center">
                  本週分類明細
                  {isSyncing && <span className="ml-4 text-sm font-black text-red-500 animate-pulse uppercase">更新中</span>}
                </h2>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  統計範圍：{mondayDateStr} 至今
                </p>
              </div>
              <div className="text-xs font-black bg-zinc-100 px-3 py-1 rounded-full border-2 border-zinc-900">本週共 {groupedHistory.reduce((acc, curr) => acc + curr[1].txs.length, 0)} 筆</div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {groupedHistory.length > 0 ? (
                groupedHistory.map(([category, data]) => (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-xl font-black text-zinc-900 flex items-center">
                        <span className="w-2 h-8 bg-red-500 mr-3 rounded-full"></span>
                        {category}
                      </h3>
                      <span className={`font-black text-lg ${data.total >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {data.total >= 0 ? '+' : ''}{data.total.toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {data.txs.map(tx => (
                        <TransactionCard key={tx.id} transaction={tx} onDelete={deleteTransaction} />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center text-zinc-400 font-bold uppercase">
                  {isSyncing ? '正在連線雲端資料庫...' : '本週尚無任何紀錄'}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="comic-card p-10">
              <h2 className="text-3xl font-black mb-8 text-red-500">偏好設定</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-black uppercase mb-2">你的名字</label>
                  <input type="text" value={settings.userName} onChange={(e) => setSettings({...settings, userName: e.target.value})} className="w-full input-comic text-xl font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-black uppercase mb-2">Google Sheet URL</label>
                  <input type="text" value={settings.googleSheetUrl} onChange={(e) => setSettings({...settings, googleSheetUrl: e.target.value})} className="w-full input-comic font-mono text-xs" />
                  <p className="mt-2 text-[10px] text-zinc-400 font-bold uppercase">請複製 GAS 部署後的網頁應用程式網址。</p>
                </div>
                
                <div className="pt-4">
                  <button onClick={() => { handleTabChange('dashboard'); window.scrollTo(0, 0); }} className="w-full bg-zinc-900 text-white font-black py-4 rounded-xl comic-btn text-xl">
                    儲存設定
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-20 border-t-3 border-zinc-900 pt-8 flex flex-col md:flex-row justify-between items-center text-zinc-400 font-black text-xs uppercase tracking-widest gap-4">
         <div>© 2026 Smart Ledger</div>
         <div className="flex space-x-6">
            <span>Weekly Focus</span>
            <span>Clean UI</span>
         </div>
      </footer>
    </div>
  );
};

export default App;
