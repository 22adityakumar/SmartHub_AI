import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Wrench, 
  HelpCircle, 
  Search, 
  Share2, 
  HardDrive,
  Database,
  Cpu, 
  ShieldAlert,
  Server,
  Layers,
  Sparkles
} from 'lucide-react';

import EngAssistant from './components/EngAssistant';
import PredMaintenance from './components/PredMaintenance';
import CustSupport from './components/CustSupport';
import EnterpriseSearch from './components/EnterpriseSearch';
import ProposalGenerator from './components/ProposalGenerator';
import DocumentManager from './components/DocumentManager';

const API_BASE = 'http://localhost:8000/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('engineering');
  const [status, setStatus] = useState({
    ollama_connected: false,
    ollama_models: [],
    current_default_model: '',
    database_stats: { documents: 0, chat_sessions: 0, proposals: 0 }
  });
  const [selectedModel, setSelectedModel] = useState('');
  const [pollingInterval, setPollingInterval] = useState(null);

  useEffect(() => {
    fetchStatus();
    // Poll status every 5 seconds to show active connections
    const interval = setInterval(fetchStatus, 5000);
    setPollingInterval(interval);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/status`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        if (!selectedModel && data.ollama_models.length > 0) {
          // Default to qwen or llama if present
          const hasQwen = data.ollama_models.some(m => m.startsWith('qwen2.5'));
          const hasLlama = data.ollama_models.some(m => m.startsWith('llama3.2'));
          
          if (hasQwen) {
            setSelectedModel(data.ollama_models.find(m => m.startsWith('qwen2.5')));
          } else if (hasLlama) {
            setSelectedModel(data.ollama_models.find(m => m.startsWith('llama3.2')));
          } else {
            setSelectedModel(data.ollama_models[0]);
          }
        }
      }
    } catch (err) {
      console.error("Backend status fetch failed.", err);
      setStatus(prev => ({ ...prev, ollama_connected: false }));
    }
  };

  const menuItems = [
    { id: 'engineering', name: 'Engineering Knowledge', icon: <BookOpen className="h-4.5 w-4.5" />, desc: 'Consult blueprints & manuals' },
    { id: 'maintenance', name: 'Predictive Maintenance', icon: <Wrench className="h-4.5 w-4.5" />, desc: 'Telemetry & DevOps diagnostics' },
    { id: 'support', name: 'Customer Support Bot', icon: <HelpCircle className="h-4.5 w-4.5" />, desc: 'Client portal simulator' },
    { id: 'search', name: 'Enterprise Search', icon: <Search className="h-4.5 w-4.5" />, desc: 'Search SQL & manuals' },
    { id: 'proposal', name: 'Proposal Draft Generator', icon: <Share2 className="h-4.5 w-4.5" />, desc: 'Sales bid document creator' },
    { id: 'documents', name: 'Document Database', icon: <HardDrive className="h-4.5 w-4.5" />, desc: 'Manage vectorized files' }
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'engineering':
        return <EngAssistant selectedModel={selectedModel} />;
      case 'maintenance':
        return <PredMaintenance selectedModel={selectedModel} />;
      case 'support':
        return <CustSupport selectedModel={selectedModel} />;
      case 'search':
        return <EnterpriseSearch />;
      case 'proposal':
        return <ProposalGenerator selectedModel={selectedModel} />;
      case 'documents':
        return <DocumentManager />;
      default:
        return <EngAssistant selectedModel={selectedModel} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-150 font-sans">
      {/* Sidebar navigation */}
      <div className="w-80 border-r border-gray-900 bg-gray-950 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo / Brand */}
          <div className="px-6 py-6 border-b border-gray-900 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-accentBlue to-accentCyan flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-white text-lg tracking-tight flex items-center gap-1">
                Industrial RAG
                <span className="text-[10px] text-accentBlue bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-900/30">
                  v1.0
                </span>
              </h1>
              <p className="text-[10px] text-gray-500 font-medium uppercase mt-0.5">Heavy Machinery AI Suite</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-4 space-y-1">
            {menuItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3.5 transition-all duration-200 group relative ${
                    active 
                      ? 'bg-blue-950/40 text-white border-l-2 border-accentBlue shadow-md' 
                      : 'text-gray-400 hover:bg-gray-900/40 hover:text-white border-l-2 border-transparent'
                  }`}
                >
                  <span className={`${active ? 'text-accentBlue' : 'text-gray-500 group-hover:text-white'} transition-colors`}>
                    {item.icon}
                  </span>
                  <div>
                    <span className="block font-semibold text-sm leading-none">{item.name}</span>
                    <span className="block text-[10px] text-gray-500 mt-1 leading-none font-normal">{item.desc}</span>
                  </div>
                  
                  {active && (
                    <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-accentBlue shadow-md shadow-blue-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Database Status Panel at bottom */}
        <div className="p-4 border-t border-gray-900 bg-gray-950">
          <div className="glass-panel p-4 rounded-xl space-y-2 border border-gray-900">
            <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-accentBlue" />
              SQL-SQLite DB Stats
            </span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-gray-900/50 p-2 rounded-lg border border-gray-900">
                <span className="block font-bold text-white text-sm">
                  {status.database_stats.documents}
                </span>
                <span className="text-[9px] text-gray-500">Files</span>
              </div>
              <div className="bg-gray-900/50 p-2 rounded-lg border border-gray-900">
                <span className="block font-bold text-white text-sm">
                  {status.database_stats.chat_sessions}
                </span>
                <span className="text-[9px] text-gray-500">Chats</span>
              </div>
              <div className="bg-gray-900/50 p-2 rounded-lg border border-gray-900">
                <span className="block font-bold text-white text-sm">
                  {status.database_stats.proposals}
                </span>
                <span className="text-[9px] text-gray-500">Bids</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#030712]">
        {/* Top Header Controls */}
        <header className="h-16 border-b border-gray-900 bg-gray-950 flex items-center justify-between px-8">
          {/* Active Title */}
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Active Workspace</span>
            <h2 className="text-base font-bold text-white leading-none mt-1">
              {menuItems.find(m => m.id === activeTab)?.name}
            </h2>
          </div>

          {/* Model Selector & Connection Indicator */}
          <div className="flex items-center gap-6">
            {/* Ollama Model selector */}
            <div className="flex items-center gap-2">
              <Cpu className="h-4.5 w-4.5 text-gray-400" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={status.ollama_models.length === 0}
                className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accentBlue font-semibold cursor-pointer"
              >
                {status.ollama_models.length === 0 ? (
                  <option>No models found</option>
                ) : (
                  status.ollama_models.map((model) => (
                    <option key={model} value={model}>
                      Ollama: {model}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Connection Indicator */}
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-gray-400" />
              <span className={`h-2 w-2 rounded-full ${
                status.ollama_connected ? 'bg-emerald-500 pulse-green' : 'bg-rose-500 animate-pulse'
              }`} />
              <span className="text-xs font-semibold text-gray-400">
                {status.ollama_connected ? 'Ollama Online' : 'Ollama Offline'}
              </span>
            </div>
          </div>
        </header>

        {/* Main Work Surface */}
        <main className="flex-1 overflow-y-auto p-8">
          {renderActiveTab()}
        </main>
      </div>
    </div>
  );
}
