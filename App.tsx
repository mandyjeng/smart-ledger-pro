
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Settings } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { parseEntryWithAI } from './services/geminiService';
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard');

  useEffect(() => {
    const saved = localStorage.getItem('transactions');
    if (saved) setTransactions(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

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
        setTransactions(prev => [newTx, ...prev]);
        setAiInput('');
        if (settings.googleSheetUrl) {
          syncToGoogleSheet(newTx, settings.googleSheetUrl.trim());
        }
      }
    } catch (error: any) {
      alert("AI 處理失敗，請稍後再試。");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const deleteTransaction = (id: string) => {
    if (confirm('確定要刪除這筆紀錄嗎？')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 min-h-screen flex flex-col">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-500 rounded-2xl border-3 border-zinc-900 flex items-center justify-center rotate-3 shadow-[4px_4px_0px_#18181b]">
              <i className="fa-solid fa-paw text-white text-2xl"></i>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic">PawLedger</h1>
          </div>
          <p className="text-zinc-500 font-bold text-lg">
            嘿 {settings.userName}！今天存了多少骨頭？
          </p>
        </div>
        
        <nav className="flex items-center bg-white border-3 border-zinc-900 rounded-2xl p-1.5 shadow-[4px_4px_0px_#18181b]">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${activeTab === 'dashboard' ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100'}`}
          >
            總覽
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${activeTab === 'history' ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100'}`}
          >
            明細
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${activeTab === 'settings' ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100'}`}
          >
            設定
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 animate-pop">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-10">
              <Dashboard transactions={transactions} settings={settings} onMergeTransactions={(newTxs) => setTransactions(prev => [...newTxs, ...prev])} />
              
              {/* AI Input Block */}
              <div className="bg-yellow-400 border-4 border-zinc-900 rounded-3xl p-8 shadow-[8px_8px_0px_#18181b] relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 opacity-10 rotate-12">
                   <i className="fa-solid fa-brain text-9xl"></i>
                </div>
                <h3 className="text-2xl font-black mb-4 flex items-center">
                  <i className="fa-solid fa-wand-magic-sparkles mr-3"></i>
                  智能記帳助理
                </h3>
                <form onSubmit={handleAiSubmit} className="relative z-10">
                  <input 
                    type="text"
                    placeholder="例如：晚餐花了 350 元..."
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    className="w-full bg-white border-3 border-zinc-900 rounded-2xl py-5 px-6 text-xl font-bold placeholder:text-zinc-400 shadow-[4px_4px_0px_rgba(0,0,0,0.1)] focus:outline-none"
                  />
                  <button 
                    disabled={isAiProcessing || !aiInput.trim()}
                    className="mt-4 bg-zinc-900 text-white w-full py-4 rounded-xl font-black text-lg comic-btn disabled:opacity-50"
                  >
                    {isAiProcessing ? '處理中...' : '送出紀錄'}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-4">
              <div className="comic-card p-6 h-fit sticky top-10">
                <h3 className="text-xl font-black mb-6 border-b-3 border-zinc-900 pb-2 italic">最近動態</h3>
                <div className="space-y-4">
                  {transactions.length > 0 ? (
                    transactions.slice(0, 5).map(tx => <TransactionCard key={tx.id} transaction={tx} onDelete={deleteTransaction} />)
                  ) : (
                    <p className="text-center py-10 text-zinc-400 font-bold italic">目前沒有紀錄</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-black uppercase italic">所有紀錄</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {transactions.map(tx => (
                <TransactionCard key={tx.id} transaction={tx} onDelete={deleteTransaction} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto space-y-8">
            <div className="comic-card p-10">
              <h2 className="text-3xl font-black mb-8 italic text-red-500">偏好設定</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-black uppercase mb-2">顯示名稱</label>
                  <input 
                    type="text" 
                    value={settings.userName} 
                    onChange={(e) => setSettings({...settings, userName: e.target.value})}
                    className="w-full input-comic text-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black uppercase mb-2">Google Sheet URL</label>
                  <input 
                    type="text" 
                    value={settings.googleSheetUrl} 
                    onChange={(e) => setSettings({...settings, googleSheetUrl: e.target.value})}
                    className="w-full input-comic font-mono text-xs"
                    placeholder="https://script.google.com/..."
                  />
                </div>
                <div className="pt-4">
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className="w-full bg-zinc-900 text-white font-black py-4 rounded-xl comic-btn text-xl"
                  >
                    確認儲存
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Updated to © 2026 MandyJeng App */}
      <footer className="mt-20 border-t-3 border-zinc-900 pt-8 flex justify-between items-center opacity-60 font-black text-xs uppercase tracking-widest">
         <div>© 2026 MandyJeng App</div>
         <div className="space-x-4">
            <span>MODERN COMIC LEDGER</span>
         </div>
      </footer>
    </div>
  );
};

export default App;
