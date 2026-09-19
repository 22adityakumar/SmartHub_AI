import React, { useState, useEffect } from 'react';
import { Share2, FileText, CheckCircle2, History, Save, Sparkles, Clipboard, CheckSquare, Layers, HelpCircle } from 'lucide-react';

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

export default function ProposalGenerator({ selectedModel }) {
  // Input fields
  const [customer, setCustomer] = useState('Power Utility Corp');
  const [projectName, setProjectName] = useState('33kV Substation Extension');
  const [capacity, setCapacity] = useState('25MVA');
  const [location, setLocation] = useState('New Delhi, India');
  
  const [generating, setGenerating] = useState(false);
  const [activeProposal, setActiveProposal] = useState(null); // stores { id, draft, ... }
  const [editorText, setEditorText] = useState('');
  const [reviewerName, setReviewerName] = useState('Lead Design Engineer');
  const [savingReview, setSavingReview] = useState(false);
  
  // Archival proposals
  const [pastProposals, setPastProposals] = useState([]);
  const [activeTab, setActiveTab] = useState('creator');

  const presets = [
    {
      label: "33kV Substation Extension",
      customer: "State Grid India",
      project: "33kV Substation Extension",
      capacity: "25MVA",
      location: "Bihar, India"
    },
    {
      label: "11kV Industrial Power Room",
      customer: "Tata Steel Corp",
      project: "11kV Distribution Switchroom",
      capacity: "15MVA",
      location: "Jamshedpur, India"
    }
  ];

  useEffect(() => {
    fetchPastProposals();
  }, []);

  const fetchPastProposals = async () => {
    try {
      const response = await fetch(`${API_BASE}/proposals`);
      if (response.ok) {
        const data = await response.json();
        setPastProposals(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (generating) return;

    setGenerating(true);
    setActiveProposal(null);
    setEditorText('');

    const formData = new FormData();
    formData.append('customer_name', customer);
    formData.append('project_name', projectName);
    formData.append('capacity', capacity);
    formData.append('location', location);
    if (selectedModel) {
      formData.append('model', selectedModel);
    }

    try {
      const response = await fetch(`${API_BASE}/proposals/generate`, {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        const data = await response.json();
        setActiveProposal(data);
        setEditorText(data.draft);
        fetchPastProposals();
      } else {
        alert("Failed to draft proposal template.");
      }
    } catch (err) {
      alert("Error contacting the backend generator API.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!activeProposal || !reviewerName.trim() || savingReview) return;

    setSavingReview(true);
    const formData = new FormData();
    formData.append('reviewed_by', reviewerName);
    formData.append('edited_draft', editorText);

    try {
      const response = await fetch(`${API_BASE}/proposals/${activeProposal.id}/review`, {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        const data = await response.json();
        setActiveProposal(data);
        fetchPastProposals();
        alert("Draft reviewed, signed-off and locked in SQL DB successfully!");
      } else {
        alert("Failed to save review.");
      }
    } catch (err) {
      alert("Error connecting to server.");
    } finally {
      setSavingReview(false);
    }
  };

  const applyPreset = (preset) => {
    setCustomer(preset.customer);
    setProjectName(preset.project);
    setCapacity(preset.capacity);
    setLocation(preset.location);
    setActiveProposal(null);
  };

  const selectPastProposal = (prop) => {
    setActiveProposal(prop);
    setEditorText(prop.generated_draft);
    setReviewerName(prop.reviewed_by || 'Lead Design Engineer');
    setActiveTab('creator');
  };

  return (
    <div className="space-y-6 animate-fade-in text-gray-250">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-900/30 p-6 rounded-2xl border border-gray-900">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Share2 className="h-6 w-6 text-accentBlue" />
            Proposal & Tender Draft Generator
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Auto-generate technical tender templates by fetching standard contract clauses (Qdrant RAG) and historical bid projects (SQLite DB).
          </p>
        </div>
        
        <div className="flex bg-gray-950/80 border border-gray-800 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('creator')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'creator'
                ? 'bg-accentBlue text-white shadow-lg shadow-blue-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Proposal Draft Creator
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'archive'
                ? 'bg-accentBlue text-white shadow-lg shadow-blue-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Tender Archive ({pastProposals.length})
          </button>
        </div>
      </div>

      {activeTab === 'creator' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Creator Inputs */}
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 lg:col-span-2 space-y-5 h-fit">
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-b-gray-900 pb-3">
                <Sparkles className="h-4.5 w-4.5 text-accentBlue" />
                Project Parameters
              </h3>

              {/* Presets */}
              <div className="space-y-1.5">
                <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Quick Presets</span>
                <div className="grid grid-cols-1 gap-2">
                  {presets.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`text-xs p-2.5 text-left rounded-xl border transition-all flex items-center justify-between ${
                        customer === preset.customer && projectName === preset.project
                          ? 'bg-blue-950/40 border-accentBlue text-white'
                          : 'bg-gray-900/40 border-gray-855 hover:border-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      <span className="font-semibold">{preset.label}</span>
                      <Sparkles className="h-3.5 w-3.5 text-accentBlue opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
              
              <form onSubmit={handleGenerate} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Customer / Utility Name</label>
                  <input
                    type="text"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    className="w-full bg-gray-955 border border-gray-850 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-accentBlue font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Project Name</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full bg-gray-955 border border-gray-850 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-accentBlue font-medium"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Capacity/Rating</label>
                    <input
                      type="text"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="w-full bg-gray-955 border border-gray-850 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-accentBlue font-medium"
                      placeholder="e.g. 25MVA"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-gray-955 border border-gray-850 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-accentBlue font-medium"
                      required
                    />
                  </div>
                </div>
              </form>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 text-white transition-all text-xs uppercase tracking-wider ${
                generating
                  ? 'bg-gray-800 cursor-not-allowed text-gray-500'
                  : 'bg-accentBlue hover:bg-blue-600 active:scale-[0.98]'
              }`}
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Assembling Tender Elements...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Draft Tender Proposal
                </>
              )}
            </button>
          </div>

          {/* Draft text Editor & Review Box */}
          <div className="lg:col-span-3">
            {activeProposal ? (
              <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-gray-900 pb-3 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <FileText className="h-4.5 w-4.5 text-accentBlue" />
                        Technical Proposal Document
                      </h3>
                      <p className="text-[10px] text-gray-500 uppercase mt-0.5">
                        Client: {activeProposal.customer_name} | Subsystem: {activeProposal.project_name}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 bg-gray-950 border border-gray-850 px-2.5 py-0.5 rounded-lg font-mono">
                      ID: #{activeProposal.id}
                    </span>
                  </div>

                  {/* Simulated Document Header */}
                  <div className="bg-gray-950/80 border border-gray-900 p-4 rounded-t-xl text-[11px] text-gray-400 border-b-0 space-y-1">
                    <div><strong>Project:</strong> {activeProposal.project_name} ({activeProposal.capacity})</div>
                    <div><strong>Location:</strong> {activeProposal.location}</div>
                    <div><strong>Customer:</strong> {activeProposal.customer_name}</div>
                  </div>

                  {/* Fake Editor Toolbar */}
                  <div className="bg-gray-900/60 border border-gray-900 p-2 text-gray-500 flex items-center gap-4 text-xs">
                    <span className="font-bold cursor-default hover:text-white px-1">B</span>
                    <span className="italic cursor-default hover:text-white px-1">I</span>
                    <span className="underline cursor-default hover:text-white px-1">U</span>
                    <span className="h-4 w-px bg-gray-850" />
                    <span className="font-mono cursor-default hover:text-white px-1">H1</span>
                    <span className="font-mono cursor-default hover:text-white px-1">H2</span>
                    <span className="h-4 w-px bg-gray-855" />
                    <Clipboard className="h-3.5 w-3.5 cursor-default hover:text-white" />
                  </div>

                  {/* Main Text Editor */}
                  <textarea
                    value={editorText}
                    onChange={(e) => setEditorText(e.target.value)}
                    rows="14"
                    className="w-full bg-gray-950/40 border border-gray-900 border-t-0 rounded-b-xl p-4 text-gray-300 focus:outline-none focus:border-accentBlue text-xs leading-relaxed font-mono resize-none focus:ring-0"
                  />
                </div>

                {/* Citations/References consulted */}
                {activeProposal.citations && activeProposal.citations.length > 0 && (
                  <div className="p-3 bg-gray-950/40 border border-gray-900 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-bold text-accentBlue uppercase tracking-wider flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-accentBlue" />
                      Reference Tender Clauses Vectorized (RAG)
                    </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {deduplicateCitations(activeProposal.citations).map((cite, idx) => (
                        <span key={idx} className="text-[10px] text-gray-400 bg-gray-950 border border-gray-900 px-2.5 py-1 rounded-lg">
                          {cite.filename} (Page {cite.page})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review Signature Action */}
                <form onSubmit={handleSaveReview} className="pt-4 border-t border-gray-900 flex flex-col md:flex-row gap-3 items-end justify-between">
                  <div className="w-full md:w-2/3">
                    <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase">Sign-off Review (Reviewing Engineer Name)</label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="e.g. Lead Engineer John Doe..."
                      className="w-full bg-gray-950 border border-gray-850 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-accentBlue font-bold"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingReview || !reviewerName.trim()}
                    className="bg-accentEmerald hover:bg-emerald-600 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider shrink-0 w-full md:w-auto"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Sign-off Draft
                  </button>
                </form>

                {/* Review status indicator */}
                {activeProposal.reviewed_by && (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2 text-xs font-semibold animate-pulse">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                    <span>Approved & Locked in SQL database by: {activeProposal.reviewed_by}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-panel p-20 rounded-2xl border border-gray-800 h-full flex flex-col items-center justify-center text-center text-gray-500">
                <Sparkles className="h-12 w-12 text-gray-700 mb-3" />
                <h4 className="text-white font-bold">Tender Draftboard Empty</h4>
                <p className="text-xs mt-1.5 max-w-xs leading-relaxed">
                  Fill in customer requirements on the left, load a preset, or consult the archive to begin drafting technical bids.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'archive' && (
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 overflow-hidden">
          <h3 className="text-base font-bold text-white mb-4 border-b border-gray-900 pb-3 flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-accentBlue" />
            Historical Bid Proposals Database (SQLite ORM Archive)
          </h3>
          {pastProposals.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <History className="h-12 w-12 mx-auto text-gray-700 mb-2" />
              <p>No proposals generated in the database yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pastProposals.map((prop) => (
                <div
                  key={prop.id}
                  onClick={() => selectPastProposal(prop)}
                  className="bg-gray-955 border border-gray-900 p-5 rounded-2xl hover:border-accentBlue/30 cursor-pointer space-y-3.5 transition-all group hover:bg-gray-900/10"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-white text-sm group-hover:text-accentBlue transition-colors truncate max-w-[170px]">
                      {prop.project_name}
                    </h4>
                    <span className="text-[9px] text-gray-500 bg-gray-950 px-2 py-0.5 rounded border border-gray-850 font-mono">
                      ID: #{prop.id}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1 bg-gray-950/40 p-3 rounded-xl border border-gray-900">
                    <div>Customer: <strong className="text-white">{prop.customer_name}</strong></div>
                    <div>Location: <strong>{prop.location}</strong></div>
                    <div>Rating: <strong>{prop.capacity}</strong></div>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-900 flex justify-between items-center text-[10px]">
                    <span className="text-gray-500 font-semibold">{new Date(prop.created_at).toLocaleDateString()}</span>
                    {prop.reviewed_by ? (
                      <span className="text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2.5 py-0.5 rounded-full font-bold">
                        ✓ Locked ({prop.reviewed_by})
                      </span>
                    ) : (
                      <span className="text-amber-400 bg-amber-950/20 border border-amber-900/30 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                        Draft Status
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
