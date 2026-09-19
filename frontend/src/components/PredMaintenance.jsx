import React, { useState, useEffect } from 'react';
import { Activity, Wrench, ShieldAlert, CheckCircle2, History, AlertTriangle, Play, Sparkles, CheckSquare, Gauge } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const deduplicateCitations = (citations) => {
  if (!citations) return [];
  const seen = new Set();
  return citations.filter(cite => {
    const filename = (cite.filename || '').trim();
    const page = String(cite.page || '').trim();
    const key = `${filename}-${page}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default function PredMaintenance({ selectedModel }) {
  const [equipmentName, setEquipmentName] = useState('Transformer X');
  const [telemetry, setTelemetry] = useState('Oil temperature is 95°C and cooling fan is stationary.');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  
  // Create history fields
  const [histEquipment, setHistEquipment] = useState('');
  const [histFailure, setHistFailure] = useState('');
  const [histSymptoms, setHistSymptoms] = useState('');
  const [histResolution, setHistResolution] = useState('');
  const [creatingHistory, setCreatingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('diagnostic');

  const presets = [
    {
      label: "Transformer X Overheating",
      equipment: "Transformer X",
      text: "Oil temperature sensor is reading 95°C, humming noise has increased, radiator is hot to touch, cooling fan appears stationary."
    },
    {
      label: "MCC Panel Ground Fault",
      equipment: "MCC Panel A",
      text: "Main circuit breaker tripped. Visual sign of blackening on copper terminals. Insulation resistance measured at 0.5 Megaohms."
    },
    {
      label: "GIS SF6 Gas Leak",
      equipment: "GIS Switchgear B",
      text: "Low SF6 gas pressure warning triggered on DevOps (SF6 pressure drops below 0.42 MPa). Ambient temperature is 35°C."
    }
  ];

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const r = await fetch(`${API_BASE}/maintenance/history`);
      if (r.ok) {
        const data = await r.json();
        setHistory(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    if (!equipmentName.trim() || !telemetry.trim() || analyzing) return;

    setAnalyzing(true);
    setResult(null);

    const formData = new FormData();
    formData.append('equipment_name', equipmentName);
    formData.append('telemetry', telemetry);
    if (selectedModel) {
      formData.append('model', selectedModel);
    }

    try {
      const response = await fetch(`${API_BASE}/maintenance/analyze`, {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        alert("Failed to analyze telemetry.");
      }
    } catch (err) {
      alert("Error contacting the backend server.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateHistory = async (e) => {
    e.preventDefault();
    if (!histEquipment || !histFailure || !histSymptoms || !histResolution || creatingHistory) return;

    setCreatingHistory(true);
    const formData = new FormData();
    formData.append('equipment_name', histEquipment);
    formData.append('failure_mode', histFailure);
    formData.append('symptoms', histSymptoms);
    formData.append('resolution', histResolution);

    try {
      const response = await fetch(`${API_BASE}/maintenance/history`, {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        setHistEquipment('');
        setHistFailure('');
        setHistSymptoms('');
        setHistResolution('');
        fetchHistory();
        alert("Maintenance record logged successfully in SQL database!");
      } else {
        alert("Failed to log maintenance record.");
      }
    } catch (err) {
      alert("Error connecting to server.");
    } finally {
      setCreatingHistory(false);
    }
  };

  const applyPreset = (preset) => {
    setEquipmentName(preset.equipment);
    setTelemetry(preset.text);
    setResult(null);
  };

  return (
    <div className="space-y-6 animate-fade-in text-gray-250">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-900/30 p-6 rounded-2xl border border-gray-900">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Wrench className="h-6 w-6 text-accentBlue" />
            Predictive Maintenance Assistant
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Analyze equipment telemetry using local OEM manuals (Qdrant RAG) and historical failure logs (SQLite SQL queries).
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-gray-950/80 border border-gray-800 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('diagnostic')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'diagnostic'
                ? 'bg-accentBlue text-white shadow-lg shadow-blue-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Diagnostic Analyzer
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'logs'
                ? 'bg-accentBlue text-white shadow-lg shadow-blue-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Historical DB Logs
          </button>
        </div>
      </div>

      {activeTab === 'diagnostic' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Telemetry Input Panel */}
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 lg:col-span-2 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-gray-900 pb-3">
                <Activity className="h-4.5 w-4.5 text-accentBlue" />
                Telemetry Diagnostic Input
              </h3>

              {/* Presets Selection */}
              <div className="space-y-1.5">
                <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Quick Presets</span>
                <div className="grid grid-cols-1 gap-2">
                  {presets.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`text-xs p-2.5 text-left rounded-xl border transition-all flex items-center justify-between ${
                        equipmentName === preset.equipment && telemetry === preset.text
                          ? 'bg-blue-950/40 border-accentBlue text-white'
                          : 'bg-gray-900/40 border-gray-850 hover:border-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      <span className="font-semibold">{preset.label}</span>
                      <Sparkles className="h-3.5 w-3.5 text-accentBlue opacity-60" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Input fields */}
              <form onSubmit={handleAnalyze} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Equipment Under Test</label>
                  <select
                    value={equipmentName}
                    onChange={(e) => setEquipmentName(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-850 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-accentBlue"
                  >
                    <option value="Transformer X">Transformer X (Main Power Step-down)</option>
                    <option value="MCC Panel A">MCC Panel A (Motor Control Center)</option>
                    <option value="GIS Switchgear B">GIS Switchgear B (Gas Insulated Switchgear)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Sensor Alarm / DevOps Symptoms</label>
                  <textarea
                    value={telemetry}
                    onChange={(e) => setTelemetry(e.target.value)}
                    rows="5"
                    className="w-full bg-gray-950 border border-gray-850 rounded-xl px-3.5 py-3 text-xs text-white focus:outline-none focus:border-accentBlue leading-relaxed"
                    placeholder="Describe temperature, noise, pressures, visual cues, or protection tripping events..."
                  />
                </div>
              </form>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={analyzing || !telemetry.trim()}
              className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 text-white transition-all text-xs uppercase tracking-wider ${
                analyzing || !telemetry.trim()
                  ? 'bg-gray-800 cursor-not-allowed text-gray-500'
                  : 'bg-accentBlue hover:bg-blue-600 active:scale-[0.98]'
              }`}
            >
              {analyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Querying Local DBs & Manuals...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Initiate Diagnosis
                </>
              )}
            </button>
          </div>

          {/* Analysis Output Panel */}
          <div className="lg:col-span-3">
            {result ? (
              <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-5 animate-fade-in">
                {/* Header info */}
                <div className="flex items-center justify-between border-b border-gray-900 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <ShieldAlert className="h-4.5 w-4.5 text-amber-500" />
                      Maintenance Diagnostic Report
                    </h3>
                    <p className="text-[10px] text-gray-500 uppercase mt-0.5">Asset: {result.equipment}</p>
                  </div>
                  <div className="bg-gray-950/80 border border-gray-850 rounded-xl px-4 py-2 flex items-center gap-2.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Analysis Confidence</span>
                    <span className="h-2 w-16 bg-gray-900 rounded-full overflow-hidden inline-block border border-gray-800">
                      <span className="h-full bg-emerald-500 block w-full rounded-full pulse-green" />
                    </span>
                    <span className="text-xs font-bold text-emerald-400">HIGH</span>
                  </div>
                </div>

                {/* Analysis Body */}
                <div className="bg-gray-950/40 border border-gray-900 p-5 rounded-2xl">
                  <div className="prose prose-invert max-w-none text-xs text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">
                    {result.analysis}
                  </div>
                </div>

                {/* Citations references */}
                {result.citations && result.citations.length > 0 && (
                  <div className="pt-4 border-t border-gray-900 space-y-2">
                    <h4 className="text-[11px] font-bold text-accentBlue uppercase tracking-wider flex items-center gap-1.5">
                      <Gauge className="h-3.5 w-3.5" />
                      RAG Vector References (OEM Manuals)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {deduplicateCitations(result.citations).map((cite, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] bg-gray-950/60 border border-gray-900 px-3 py-2.5 rounded-xl text-gray-400 flex items-center justify-between"
                        >
                          <span className="truncate mr-3">Manual: <strong>{cite.filename}</strong></span>
                          <span className="shrink-0 bg-gray-900 px-2 py-0.5 rounded text-[10px] border border-gray-850 font-mono">Page {cite.page}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-panel p-12 rounded-2xl border border-gray-800 h-full flex flex-col items-center justify-center text-center text-gray-500">
                <AlertTriangle className="h-12 w-12 text-gray-700 mb-3" />
                <h4 className="text-white font-bold">Diagnostic Dashboard Idle</h4>
                <p className="text-xs mt-1.5 max-w-xs leading-relaxed">
                  Apply a quick preset on the left or type custom symptoms, then click "Initiate Diagnosis" to generate diagnostic conclusions.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add history case */}
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 lg:col-span-1 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-gray-900 pb-3">
              <History className="h-4.5 w-4.5 text-accentBlue" />
              Log SQL Maintenance Record
            </h3>
            
            <form onSubmit={handleCreateHistory} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 mb-1 font-semibold uppercase">Equipment Name</label>
                <input
                  type="text"
                  value={histEquipment}
                  onChange={(e) => setHistEquipment(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-accentBlue"
                  placeholder="e.g. Transformer X"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold uppercase">Failure Mode</label>
                <input
                  type="text"
                  value={histFailure}
                  onChange={(e) => setHistFailure(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-accentBlue"
                  placeholder="e.g. Jammed Cooling Fan"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold uppercase">Observed Symptoms</label>
                <textarea
                  value={histSymptoms}
                  onChange={(e) => setHistSymptoms(e.target.value)}
                  rows="2"
                  className="w-full bg-gray-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-accentBlue leading-relaxed"
                  placeholder="Temp high, hum noise..."
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold uppercase">Action & Resolution Taken</label>
                <textarea
                  value={histResolution}
                  onChange={(e) => setHistResolution(e.target.value)}
                  rows="3"
                  className="w-full bg-gray-950 border border-gray-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-accentBlue leading-relaxed"
                  placeholder="Replaced motor coil, clean fins..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={creatingHistory}
                className="w-full bg-accentBlue hover:bg-blue-600 active:scale-[0.98] text-white py-2.5 px-4 rounded-xl font-bold transition-all uppercase tracking-wider text-[11px]"
              >
                Log to SQL DB
              </button>
            </form>
          </div>

          {/* History cases list */}
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 lg:col-span-2 overflow-hidden flex flex-col">
            <h3 className="text-base font-bold text-white mb-4 border-b border-gray-900 pb-3 flex items-center gap-2">
              <Database className="h-4.5 w-4.5 text-accentBlue" />
              Historical Failure Database (SQLite SQL Table)
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3.5 max-h-[500px] pr-1">
              {history.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-12">No historical records logged in SQL.</p>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="bg-gray-950/50 border border-gray-900 p-4 rounded-xl space-y-2 hover:border-gray-800 transition-colors">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-white text-sm">{h.equipment_name}</h4>
                      <span className="text-[10px] text-rose-400 bg-rose-950/30 border border-rose-900/30 px-2.5 py-0.5 rounded-full font-bold">
                        {h.failure_mode}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 leading-relaxed">
                      <strong>Symptoms:</strong> {h.symptoms}
                    </div>
                    <div className="text-xs text-emerald-400 leading-relaxed flex items-start gap-1">
                      <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span><strong>Resolution:</strong> {h.resolution}</span>
                    </div>
                    <div className="text-[10px] text-gray-600 text-right">
                      Logged: {new Date(h.date_recorded).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
