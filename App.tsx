
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
  const [showGuide, setShowGuide] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

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
        const syncSuccess = await syncToGoogleSheet(newTx, settings.googleSheetUrl.trim());
        if (!syncSuccess) {
          console.error("同步至試算表失敗，請檢查網址設定。");
        }
      }
    } else {
      alert("抱歉，AI 無法解析這段文字。請換個說法。");
    }
    setIsAiProcessing(false);
  };

  const handleTestConnection = async () => {
    if (!settings.googleSheetUrl) return;
    setTestStatus('testing');
    
    const dummyTx: Transaction = {
      id: 'test-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: '測試',
      description: '測試連線',
      type: 'expense'
    };
    
    // 確保使用修剪過的網址
    const success = await syncToGoogleSheet(dummyTx, settings.googleSheetUrl.trim());
    setTestStatus(success ? 'success' : 'error');
    
    if (!success) {
      alert("連線失敗！請檢查：\n1. 網址是否正確且以 /exec 結尾\n2. Google Script 是否已發布為「所有人(Anyone)」\n3. 網址前後是否有看不見的空格");
    }
    
    setTimeout(() => setTestStatus('idle'), 3000);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const scriptCode = `function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    sheet.appendRow([data.date, data.type === 'income' ? '收入' : '支出', data.category, data.amount, data.description, data.id]);
    return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pt-8 px-4 max-w-4xl mx-auto">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Smart Ledger Pro</h1>
          <p className="text-slate-500 text-sm">歡迎回來, {settings.userName}</p>
        </div>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`p-2 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-blue-100 text-blue-600' : 'bg-white text-slate-400 hover:bg-slate-100'}`}
        >
          <i className="fa-solid fa-cog"></i>
        </button>
      </header>

      <main className="mb-24">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <Dashboard transactions={transactions} />
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                <i className="fa-solid fa-sparkles text-blue-500 mr-2"></i>
                AI 快速記帳
              </h3>
              <form onSubmit={handleAiSubmit} className="relative">
                <input 
                  type="text"
                  placeholder="試試說：今天晚餐 250 元"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  disabled={isAiProcessing}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <button type="submit" disabled={isAiProcessing || !aiInput.trim()} className="absolute right-2 top-2 bottom-2 bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isAiProcessing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
                </button>
              </form>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 mb-4">最近紀錄</h3>
              <div className="space-y-1">
                {transactions.slice(0, 5).map(tx => <TransactionCard key={tx.id} transaction={tx} onDelete={deleteTransaction} />)}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-6">歷史紀錄</h2>
            {transactions.map(tx => <TransactionCard key={tx.id} transaction={tx} onDelete={deleteTransaction} />)}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <h2 className="text-xl font-bold mb-6">設定</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">您的名字</label>
              <input type="text" value={settings.userName} onChange={(e) => setSettings({...settings, userName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-700">Google Sheet Web App URL</label>
                <button onClick={() => setShowGuide(!showGuide)} className="text-xs text-blue-600 hover:underline">如何設定？</button>
              </div>
              <div className="flex space-x-2">
                <input 
                  type="text"
                  placeholder="https://script.google.com/macros/s/..."
                  value={settings.googleSheetUrl}
                  onChange={(e) => setSettings({...settings, googleSheetUrl: e.target.value})}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 font-mono text-xs"
                />
                <button 
                  onClick={handleTestConnection}
                  disabled={!settings.googleSheetUrl || testStatus === 'testing'}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    testStatus === 'success' ? 'bg-green-100 text-green-700' : 
                    testStatus === 'error' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {testStatus === 'testing' ? <i className="fa-solid fa-spinner fa-spin"></i> : 
                   testStatus === 'success' ? <i className="fa-solid fa-check"></i> :
                   testStatus === 'error' ? <i className="fa-solid fa-xmark"></i> : '測試'}
                </button>
              </div>
            </div>

            {showGuide && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 space-y-4">
                <h4 className="font-bold underline">後端設定重點：</h4>
                <ol className="list-decimal list-inside space-y-2">
                  <li>確定您部署的是「網頁應用程式 (Web App)」。</li>
                  <li><strong>存取權：</strong>務必選擇<strong>「所有人 (Anyone)」</strong>。</li>
                  <li><strong>網址確認：</strong>網址必須以 <code>/exec</code> 結尾，不可使用 <code>/dev</code>（測試版網址）。</li>
                  <li>每次修改程式碼後，都必須<strong>「新增部署」</strong>才會生效。</li>
                </ol>
                <pre className="bg-white/50 p-2 rounded border border-blue-200 overflow-x-auto">{scriptCode}</pre>
              </div>
            )}
            
            <div className="pt-6 border-t flex justify-center">
              <button onClick={() => setActiveTab('dashboard')} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold">儲存並返回</button>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 md:hidden flex justify-around items-center">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}>
          <i className="fa-solid fa-chart-pie text-xl"></i>
          <span className="text-[10px] font-bold">總覽</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400'}`}>
          <i className="fa-solid fa-list-ul text-xl"></i>
          <span className="text-[10px] font-bold">紀錄</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center ${activeTab === 'settings' ? 'text-blue-600' : 'text-slate-400'}`}>
          <i className="fa-solid fa-sliders text-xl"></i>
          <span className="text-[10px] font-bold">設定</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
