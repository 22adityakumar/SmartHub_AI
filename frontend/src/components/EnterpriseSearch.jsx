import React, { useState } from 'react';
import { Search, Database, FileText, CheckSquare, Settings, Share2, CornerDownRight } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

export default function EnterpriseSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || searching) return;

    setSearching(true);
    setSearched(true);
    try {
      const response = await fetch(`${API_BASE}/search?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      } else {
        alert("Failed to execute search");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'document_chunk':
        return <FileText className="h-5 w-5 text-blue-400 shrink-0" />;
      case 'document_metadata':
        return <Database className="h-5 w-5 text-emerald-400 shrink-0" />;
      case 'proposal_record':
        return <Share2 className="h-5 w-5 text-purple-400 shrink-0" />;
      case 'maintenance_log':
        return <Settings className="h-5 w-5 text-amber-400 shrink-0" />;
      default:
        return <CheckSquare className="h-5 w-5 text-gray-400 shrink-0" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="text-center py-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
          <Search className="h-8 w-8 text-accentBlue" />
          Enterprise Search
        </h2>
        <p className="text-gray-400 mt-2 max-w-lg mx-auto text-sm">
          Unified semantic and structured search across DevOps maintenance databases, Active SharePoint metadata, client proposal archives, and indexed technical manual vectors.
        </p>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="flex gap-2 bg-gray-900 border border-gray-800 p-2 rounded-xl focus-within:border-accentBlue transition-colors">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for switchgear SOPs, transformer insulation, maintenance guidelines, or past tenders..."
          className="flex-1 bg-transparent px-3 py-2 text-white placeholder-gray-500 focus:outline-none text-sm"
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="bg-accentBlue hover:bg-blue-600 disabled:bg-gray-800 text-white px-5 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm disabled:cursor-not-allowed"
        >
          {searching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Search className="h-4 w-4" />
              Search
            </>
          )}
        </button>
      </form>

      {/* Results Box */}
      <div className="space-y-4">
        {searching && (
          <div className="py-20 text-center space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-accentBlue border-t-transparent mx-auto" />
            <p className="text-sm text-gray-500">Querying SQL database tables and Qdrant vector space...</p>
          </div>
        )}

        {!searching && searched && results.length === 0 && (
          <div className="glass-panel p-12 rounded-xl border border-gray-800 text-center text-gray-500">
            <Database className="h-12 w-12 mx-auto mb-2 text-gray-700" />
            <h4 className="text-white font-medium">No Results Found</h4>
            <p className="text-sm mt-1">Try keywords like "insulation", "switchgear", "fan", or "maintenance".</p>
          </div>
        )}

        {!searching && results.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-gray-500 px-1 uppercase flex items-center justify-between">
              <span>Search Results ({results.length})</span>
              <span>Relevance Score Sort</span>
            </div>
            
            <div className="space-y-3">
              {results.map((r, idx) => (
                <div key={idx} className="glass-card p-5 rounded-xl border border-gray-800 flex gap-4 items-start hover:border-accentBlue/30 transition-all duration-200">
                  <div className="p-2 bg-gray-900 border border-gray-800 rounded-lg">
                    {getIcon(r.type)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="font-bold text-white text-base leading-snug">{r.title}</h4>
                      <span className="text-[10px] bg-gray-950 border border-gray-850 text-gray-400 px-2.5 py-0.5 rounded-full shrink-0 font-medium">
                        Score: {r.score.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-accentBlue font-medium flex items-center gap-1">
                      <CornerDownRight className="h-3.5 w-3.5" />
                      Source: {r.source}
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed font-normal bg-gray-950/40 border border-gray-900 p-3 rounded-lg mt-1 font-sans">
                      {r.snippet}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
