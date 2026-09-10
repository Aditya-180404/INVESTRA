import React, { useState } from 'react';
import { LayoutDashboard, Network, Upload, FileText, AlertTriangle, Search, Bell } from 'lucide-react';
import Dashboard from './components/Dashboard';
import GraphView from './components/GraphView';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex h-screen bg-slate-900 text-slate-50 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold text-blue-500 tracking-wider">INVESTRA</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Intelligence Platform</p>
        </div>
        
        <nav className="flex-1 py-4">
          <ul className="space-y-2 px-3">
            <li>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <LayoutDashboard size={20} className="mr-3" />
                Dashboard
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab('graph')}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${activeTab === 'graph' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <Network size={20} className="mr-3" />
                Network Graph
              </button>
            </li>
            <li>
              <button 
                className="w-full flex items-center px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Upload size={20} className="mr-3" />
                Data Ingestion
              </button>
            </li>
            <li>
              <button 
                className="w-full flex items-center px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <FileText size={20} className="mr-3" />
                Cases & Evidence
              </button>
            </li>
          </ul>
        </nav>
        
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          INVESTRA MVP - SIH 2026
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-8 z-10">
          <div className="flex items-center bg-slate-800 rounded-full px-4 py-1.5 w-96 border border-slate-700">
            <Search size={16} className="text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search entities, cases, or records..." 
              className="bg-transparent border-none outline-none text-sm w-full placeholder-slate-500"
            />
          </div>
          <div className="flex items-center space-x-4">
            <button className="text-slate-400 hover:text-white relative">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>
            </button>
            <div className="flex items-center space-x-3 border-l border-slate-700 pl-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
                ID
              </div>
              <div className="text-sm">
                <p className="font-medium">Investigator Doe</p>
                <p className="text-xs text-slate-400">Cyber Cell</p>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto bg-slate-950/30">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'graph' && <GraphView />}
        </div>
      </main>

    </div>
  );
}

export default App;
