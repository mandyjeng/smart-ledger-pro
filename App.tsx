
import React, { useState, useEffect } from 'react';
import { Transaction, Settings } from './types';  
import { DEFAULT_SETTINGS } from './constants';
import { parseEntryWithAI } from './services/geminiService';
import { syncToGoogleSheet } from './services/googleSheetService';
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

  const handleMergeTransactions = (newTxs: Transaction[]) => {
    setTransactions(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const uniqueNew = newTxs.filter(t => !existingIds.has(t.id));
      return [...uniqueNew, ...prev];
    });
  };

  const gasScript = `function doGet(e) {
  var action = e.parameter.action;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (action === "getHistory") {
    var data = sheet.getDataRange().getValues();
    var results = [];
    for (var i = 1; i < data.length; i++) {
      if (!data[i][5]) continue;
      results.push({
        date: data[i][0], 
        type: data[i][1] === '收入' ? 'income' : 'expense',
        category: data[i][2],
        amount: data[i][3],
        description: data[i][4],
        id: data[i][5]
      });
    }
    return ContentService.createTextOutput(JSON.stringify(results.slice(-10).reverse())).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  if (sheet.getLastRow() === 0) sheet.appendRow(["日期", "類型", "類別", "金額", "描述", "ID"]);
  sheet.appendRow([data.date, data.type === 'income' ? '收入' : '支出', data.category, data.amount, data.description, data.id]);
  return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
}`;

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
            你好，{settings.userName}！準備好記錄今天的每一筆開支了嗎？
          </p>
        </div>
        
        <nav className="flex items-center bg-white border-3 border-zinc-900 rounded-2xl p-1.5 shadow-[4px_4px_0px_#18181b]">
          <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${activeTab === 'dashboard' ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100'}`}>總覽</button>
          <button onClick={() => setActiveTab('history')} className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${activeTab === 'history' ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100'}`}>明細</button>
          <button onClick={() => setActiveTab('settings')} className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${activeTab === 'settings' ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100'}`}>設定</button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 animate-pop">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-10">
              <Dashboard transactions={transactions} settings={settings} onMergeTransactions={handleMergeTransactions}>
                {/* AI Input Section - Moved inside Dashboard to control ordering */}
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
                <h3 className="text-xl font-black mb-6 border-b-3 border-zinc-900 pb-2 italic text-zinc-800">最近動態</h3>
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
            <h2 className="text-3xl font-black uppercase italic text-zinc-800">所有紀錄</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {transactions.length > 0 ? (
                transactions.map(tx => (
                  <TransactionCard key={tx.id} transaction={tx} onDelete={deleteTransaction} />
                ))
              ) : (
                <div className="col-span-full py-20 text-center text-zinc-400 font-bold">尚無紀錄</div>
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
                
                {/* GAS Script Guide */}
                <div className="mt-10 pt-10 border-t-2 border-zinc-100">
                  <h4 className="text-lg font-black mb-3 italic">
                    <i className="fa-solid fa-code mr-2 text-zinc-400"></i>
                    Google Apps Script 腳本範例
                  </h4>
                  <div className="bg-zinc-900 rounded-xl p-4 relative group">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(gasScript);
                        alert('已複製到剪貼簿！');
                      }}
                      className="absolute top-2 right-2 bg-zinc-700 text-white text-[10px] font-black px-2 py-1 rounded hover:bg-zinc-600 transition-colors"
                    >
                      複製代碼
                    </button>
                    <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto max-h-[200px] leading-relaxed">
                      {gasScript}
                    </pre>
                  </div>
                  <p className="mt-3 text-[10px] text-zinc-500 font-bold leading-relaxed">
                    1. 打開您的試算表 &gt; 擴充功能 &gt; Apps Script<br/>
                    2. 貼上以上程式碼<br/>
                    3. 點擊「部署」 &gt; 「新部署」<br/>
                    4. 權限設定為「所有人 (Anyone)」
                  </p>
                </div>

                <div className="pt-4">
                  <button onClick={() => { setActiveTab('dashboard'); window.scrollTo(0, 0); }} className="w-full bg-zinc-900 text-white font-black py-4 rounded-xl comic-btn text-xl">
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
