
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard');

  // 從 Google Sheet 獲取最新資料的函數
  const refreshDataFromSheet = useCallback(async (showLoading = true) => {
    if (!settings.googleSheetUrl || !settings.googleSheetUrl.startsWith('http')) return;
    
    if (showLoading) setIsSyncing(true);
    try {
      const data = await fetchHistoryFromSheet(settings.googleSheetUrl);
      if (data && data.length > 0) {
        setTransactions(data);
        localStorage.setItem('transactions', JSON.stringify(data));
      }
    } catch (error) {
      console.error("同步雲端資料失敗:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [settings.googleSheetUrl]);

  // 1. 頁面加載時先查一次資料
  useEffect(() => {
    const saved = localStorage.getItem('transactions');
    if (saved) setTransactions(JSON.parse(saved));
    
    // 初始化從雲端更新
    refreshDataFromSheet(false);
  }, [refreshDataFromSheet]);

  // 監聽本地設定變化
  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  // 按類別分組明細
  const groupedHistory = useMemo(() => {
    const groups: Record<string, { txs: Transaction[], total: number }> = {};
    transactions.forEach(tx => {
      if (!groups[tx.category]) {
        groups[tx.category] = { txs: [], total: 0 };
      }
      groups[tx.category].txs.push(tx);
      groups[tx.category].total += (tx.type === 'expense' ? -tx.amount : tx.amount);
    });
    return Object.entries(groups).sort((a, b) => b[1].txs.length - a[1].txs.length);
  }, [transactions]);

  // 2. 送出資料時更新總覽並同步
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
        
        // 立即更新本地 State 以更新總覽
        const updatedTransactions = [newTx, ...transactions];
        setTransactions(updatedTransactions);
        localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
        setAiInput('');

        // 異步同步至 Google Sheet
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

  // 3. 切換標籤邏輯：如果是點擊明細，則重新抓取雲端資料
  const handleTabChange = (tab: 'dashboard' | 'history' | 'settings') => {
    setActiveTab(tab);
    if (tab === 'history') {
      refreshDataFromSheet(true);
    }
  };

  const deleteTransaction = (id: string) => {
    if (confirm('確定要刪除這筆本地紀錄嗎？ (雲端紀錄需手動於 Google Sheet 刪除)')) {
      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);
      localStorage.setItem('transactions', JSON.stringify(updated));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 min-h-screen flex flex-col">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-500 rounded-2xl border-3 border-zinc-900 flex items-center justify-center rotate-3 shadow-[4px_4px_0px_#18181b]">
              <i className="fa-solid fa-calculator text-white text-2xl"></i>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic">MandyJeng</h1>
          </div>
          <p className="text-zinc-500 font-bold text-lg">
            你好，{settings.userName}！{isSyncing ? '正在與雲端同步中...' : '資料已同步。'}
          </p>
        </div>
        
        <nav className="flex items-center bg-white border-3 border-zinc-900 rounded-2xl p-1.5 shadow-[4px_4px_0px_#18181b]">
          <button onClick={() => handleTabChange('dashboard')} className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${activeTab === 'dashboard' ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100'}`}>總覽</button>
          <button onClick={() => handleTabChange('history')} className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${activeTab === 'history' ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100'}`}>明細</button>
          <button onClick={() => handleTabChange('settings')} className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${activeTab === 'settings' ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100'}`}>設定</button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 animate-pop">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-10">
              <Dashboard transactions={transactions}>
                {/* AI Input Section */}
                <div className="bg-yellow-400 border-4 border-zinc-900 rounded-3xl p-8 shadow-[8px_8px_0px_#18181b] relative overflow-hidden">
                  <div className="absolute -right-8 -bottom-8 opacity-10 rotate-12">
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
                      {isAiProcessing ? '分析中...' : '送出紀錄'}
                    </button>
                  </form>
                </div>
              </Dashboard>
            </div>

            <div className="lg:col-span-4">
              <div className="comic-card p-6 h-fit sticky top-10">
                <h3 className="text-xl font-black mb-6 border-b-3 border-zinc-900 pb-2 italic text-zinc-800 flex items-center justify-between">
                  <span>最新動態 (5筆)</span>
                  {isSyncing && <i className="fa-solid fa-sync fa-spin text-xs text-zinc-400"></i>}
                </h3>
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
          <div className="space-y-12">
            <div className="flex items-center justify-between border-b-4 border-zinc-900 pb-4">
              <h2 className="text-3xl font-black uppercase italic text-zinc-800 flex items-center">
                分類明細
                {isSyncing && <span className="ml-4 text-sm font-black text-red-500 animate-pulse">更新中...</span>}
              </h2>
              <div className="text-xs font-black bg-zinc-100 px-3 py-1 rounded-full border-2 border-zinc-900">共 {transactions.length} 筆</div>
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
                      <span className={`font-black ${data.total >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
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
                <div className="col-span-full py-20 text-center text-zinc-400 font-bold">
                  {isSyncing ? '正在從雲端下載資料...' : '尚無紀錄'}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="comic-card p-10">
              <h2 className="text-3xl font-black mb-8 italic text-red-500">偏好設定</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-black uppercase mb-2">顯示名稱</label>
                  <input type="text" value={settings.userName} onChange={(e) => setSettings({...settings, userName: e.target.value})} className="w-full input-comic text-xl font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-black uppercase mb-2">Google Sheet URL (API)</label>
                  <input type="text" value={settings.googleSheetUrl} onChange={(e) => setSettings({...settings, googleSheetUrl: e.target.value})} className="w-full input-comic font-mono text-xs" />
                  <p className="mt-2 text-[10px] text-zinc-400 font-bold uppercase italic">請複製 GAS 部署後的網頁應用程式 URL。</p>
                </div>
                
                <div className="pt-4">
                  <button onClick={() => { handleTabChange('dashboard'); window.scrollTo(0, 0); }} className="w-full bg-zinc-900 text-white font-black py-4 rounded-xl comic-btn text-xl">
                    確認儲存
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-20 border-t-3 border-zinc-900 pt-8 flex flex-col md:flex-row justify-between items-center text-zinc-400 font-black text-xs uppercase tracking-widest gap-4">
         <div>© 2026 MandyJeng App</div>
         <div className="flex space-x-6">
            <span>MODERN LEDGER</span>
            <span>PROFESSIONAL EDITION</span>
         </div>
      </footer>
    </div>
  );
};

export default App;
