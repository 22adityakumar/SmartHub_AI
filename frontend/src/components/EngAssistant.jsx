import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, Send, BookOpen, Clock, Bot, User, HelpCircle, FileText } from 'lucide-react';

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

export default function EngAssistant({ selectedModel }) {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingCitations, setStreamingCitations] = useState([]);
  const [selectedCitation, setSelectedCitation] = useState(null);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      fetchSessionMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSessions = async () => {
    try {
      const r = await fetch(`${API_BASE}/chat/sessions?feature_type=engineering`);
      if (r.ok) {
        const data = await r.json();
        setSessions(data);
        if (data.length > 0 && !activeSessionId) {
          setActiveSessionId(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSessionMessages = async (sid) => {
    try {
      const r = await fetch(`${API_BASE}/chat/session/${sid}`);
      if (r.ok) {
        const data = await r.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const createNewSession = async () => {
    const title = `Engineering Chat - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    try {
      const r = await fetch(`${API_BASE}/chat/session?title=${encodeURIComponent(title)}&feature_type=engineering`, {
        method: 'POST'
      });
      if (r.ok) {
        const newSession = await r.json();
        setSessions([newSession, ...sessions]);
        setActiveSessionId(newSession.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSession = async (sid, e) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation thread?")) return;
    try {
      const r = await fetch(`${API_BASE}/chat/session/${sid}`, { method: 'DELETE' });
      if (r.ok) {
        const updated = sessions.filter(s => s.id !== sid);
        setSessions(updated);
        if (activeSessionId === sid) {
          setActiveSessionId(updated.length > 0 ? updated[0].id : null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeSessionId || loading) return;

    const userMessageText = inputValue.trim();
    setInputValue('');
    setLoading(true);
    setStreamingText('');
    setStreamingCitations([]);
    setSelectedCitation(null);

    // Optimistically push User message
    const tempUserMsg = { sender: 'user', text: userMessageText, id: Date.now() };
    setMessages(prev => [...prev, tempUserMsg]);

    const formData = new FormData();
    formData.append('session_id', activeSessionId);
    formData.append('message', userMessageText);
    if (selectedModel) {
      formData.append('model', selectedModel);
    }

    try {
      const response = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error("API return error");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let citationsExtracted = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: !done });
          
          // Split chunk by lines since multiple chunks could arrive together or citations could be printed
          const lines = chunkStr.split('\n');
          for (let line of lines) {
            if (line.startsWith('[CITATIONS]')) {
              try {
                const citeData = JSON.parse(line.replace('[CITATIONS]', '').trim());
                setStreamingCitations(citeData);
                citationsExtracted = true;
              } catch (err) {
                console.error("Error parsing citations stream line", err);
              }
            } else {
              // Standard text content
              setStreamingText(prev => prev + line);
            }
          }
        }
      }

      // Reload messages list from DB to get completed message IDs and persisted data
      fetchSessionMessages(activeSessionId);
    } catch (err) {
      console.error(err);
      setStreamingText(prev => prev + `\n\n[Error communicating with server. Ensure backend and Ollama are online.]`);
    } finally {
      setLoading(false);
      setStreamingText('');
      setStreamingCitations([]);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-9rem)] animate-fade-in">
      {/* Session List Sidebar */}
      <div className="glass-panel rounded-xl border border-gray-800 p-4 flex flex-col h-full lg:col-span-1">
        <button
          onClick={createNewSession}
          className="w-full bg-accentBlue hover:bg-blue-600 active:scale-[0.98] text-white py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all mb-4"
        >
          <Plus className="h-4 w-4" />
          New Discussion
        </button>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {sessions.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No chats active.</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between gap-3 cursor-pointer group transition-all ${
                  activeSessionId === s.id
                    ? 'bg-blue-950/40 border border-blue-900/60 text-white'
                    : 'border border-transparent text-gray-400 hover:bg-gray-900/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="h-4 w-4 shrink-0 text-accentBlue" />
                  <span className="truncate text-sm font-medium">{s.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 rounded transition-opacity"
                  title="Delete Session"
                >
                  <Clock className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="lg:col-span-3 flex flex-col h-full glass-panel rounded-xl border border-gray-800 overflow-hidden">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-gray-800/80 bg-gray-950/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accentBlue" />
            <h3 className="font-semibold text-white">Engineering Knowledge Assistant</h3>
          </div>
          <span className="text-xs text-gray-500 bg-gray-900 border border-gray-800 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-green"></span>
            Ready for manuals lookup
          </span>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!activeSessionId ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-3">
              <Bot className="h-12 w-12 text-gray-700" />
              <div>
                <h4 className="text-white font-medium">No Conversation Selected</h4>
                <p className="text-sm mt-1">Create or select a discussion thread to consult engineering databases.</p>
              </div>
            </div>
          ) : (
            <>
              {messages.length === 0 && !streamingText && (
                <div className="max-w-md mx-auto text-center py-16 space-y-4">
                  <Bot className="h-12 w-12 mx-auto text-accentBlue/60" />
                  <h4 className="text-white text-lg font-medium">Ask anything about specs or manuals</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Query insulation classes, Recommended torques, wiring guidelines or relays. The assistant reads PDF documentation and generates responses with precise file citations.
                  </p>
                  <div className="grid grid-cols-1 gap-2 pt-2 text-left">
                    <button
                      onClick={() => setInputValue("What is the insulation class for Transformer X?")}
                      className="text-xs p-2.5 rounded-lg border border-gray-800 hover:border-accentBlue/40 bg-gray-900/50 hover:bg-gray-950 text-gray-400 hover:text-white transition-all text-left"
                    >
                      "What is the insulation class for Transformer X?"
                    </button>
                    <button
                      onClick={() => setInputValue("Show standard torque recommendations for electric switchboards.")}
                      className="text-xs p-2.5 rounded-lg border border-gray-800 hover:border-accentBlue/40 bg-gray-900/50 hover:bg-gray-950 text-gray-400 hover:text-white transition-all text-left"
                    >
                      "Show standard torque recommendations for electric switchboards."
                    </button>
                  </div>
                </div>
              )}

              {/* Messages Render */}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 max-w-[85%] ${
                    m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${
                    m.sender === 'user' 
                      ? 'bg-blue-950 border-blue-800 text-accentBlue' 
                      : 'bg-gray-900 border-gray-800 text-purple-400'
                  }`}>
                    {m.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>

                  <div className={`p-4 rounded-xl space-y-2 border ${
                    m.sender === 'user'
                      ? 'bg-blue-950/20 border-blue-900/50 text-white'
                      : 'bg-gray-900/40 border-gray-800 text-gray-250'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    
                    {/* Citations block */}
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-gray-800/80 space-y-1">
                        <span className="text-xs font-semibold text-accentBlue flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          Source Citations
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {deduplicateCitations(m.citations).map((cite, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedCitation(cite)}
                              className="text-xs bg-gray-950 hover:bg-gray-900 text-gray-400 hover:text-white border border-gray-800 hover:border-accentBlue/30 px-2 py-1 rounded transition-all flex items-center gap-1.5"
                            >
                              <FileText className="h-3 w-3 text-accentBlue" />
                              {cite.filename} (Pg {cite.page})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming AI response */}
              {streamingText && (
                <div className="flex gap-3 max-w-[85%] mr-auto">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 border bg-gray-900 border-gray-800 text-purple-400">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="p-4 rounded-xl space-y-2 border bg-gray-900/40 border-gray-800 text-gray-250">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{streamingText}</p>
                    {streamingCitations.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-gray-800/80 space-y-1">
                        <span className="text-xs font-semibold text-accentBlue flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          Source Citations
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {deduplicateCitations(streamingCitations).map((cite, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedCitation(cite)}
                              className="text-xs bg-gray-950 hover:bg-gray-900 text-gray-400 hover:text-white border border-gray-800 hover:border-accentBlue/30 px-2 py-1 rounded transition-all flex items-center gap-1.5"
                            >
                              <FileText className="h-3 w-3 text-accentBlue" />
                              {cite.filename} (Pg {cite.page})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Spinner while loading */}
              {loading && !streamingText && (
                <div className="flex gap-3 max-w-[85%] mr-auto">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 border bg-gray-900 border-gray-800 text-purple-400">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="p-4 rounded-xl border bg-gray-900/40 border-gray-800 text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-accentBlue border-t-transparent" />
                      <span className="text-sm font-medium">Scanning Qdrant and calling Ollama...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-gray-800 bg-gray-950/30">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={!activeSessionId || loading}
              placeholder={activeSessionId ? "Ask a technical question..." : "Select a session to begin..."}
              className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accentBlue disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            />
            <button
              type="submit"
              disabled={!activeSessionId || loading || !inputValue.trim()}
              className="bg-accentBlue hover:bg-blue-600 active:scale-[0.98] disabled:bg-gray-800 text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Citation Preview Modal */}
      {selectedCitation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-accentBlue" />
                Citation Details
              </h4>
              <button
                onClick={() => setSelectedCitation(null)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕ Close
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Document: <strong>{selectedCitation.filename}</strong></span>
                <span>Page: <strong>{selectedCitation.page}</strong></span>
              </div>
              <div className="bg-gray-950 border border-gray-850 p-4 rounded-lg text-sm text-gray-300 max-h-60 overflow-y-auto leading-relaxed">
                {selectedCitation.text || "Embedding matching snippet is loaded. Double-check specifications in full source PDF."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
