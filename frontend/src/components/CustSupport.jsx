import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, Send, ShieldCheck, Heart, User, Bot } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

export default function CustSupport({ selectedModel }) {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    initSession();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initSession = async () => {
    // Create a simulation session for Customer Support
    const title = `Support Simulator - ${new Date().toLocaleDateString()}`;
    try {
      const r = await fetch(`${API_BASE}/chat/session?title=${encodeURIComponent(title)}&feature_type=customer_support`, {
        method: 'POST'
      });
      if (r.ok) {
        const data = await r.json();
        setSession(data);
      }
    } catch (e) {
      console.error("Failed to init support session", e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !session || loading) return;

    const userText = inputValue.trim();
    setInputValue('');
    setLoading(true);
    setStreamingText('');

    // Add user message to log
    const tempUserMsg = { sender: 'user', text: userText, id: Date.now() };
    setMessages(prev => [...prev, tempUserMsg]);

    const formData = new FormData();
    formData.append('session_id', session.id);
    formData.append('message', userText);
    if (selectedModel) {
      formData.append('model', selectedModel);
    }

    try {
      const response = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("API error");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: !done });
          const lines = chunkStr.split('\n');
          for (let line of lines) {
            if (!line.startsWith('[CITATIONS]')) {
              setStreamingText(prev => prev + line);
            }
          }
        }
      }

      // Refresh messages list
      const r = await fetch(`${API_BASE}/chat/session/${session.id}`);
      if (r.ok) {
        const data = await r.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error(err);
      setStreamingText(prev => prev + `\n\n[Error communicating with support API. Please try again.]`);
    } finally {
      setLoading(false);
      setStreamingText('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-9rem)] flex flex-col glass-panel rounded-xl border border-gray-800 overflow-hidden animate-fade-in">
      {/* Simulation Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 to-blue-950/40 px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-purple-500 pulse-purple shadow-purple-500/50" />
          <div>
            <h3 className="font-bold text-white flex items-center gap-1.5 text-sm">
              <ShieldCheck className="h-4 w-4 text-purple-400" />
              Customer Support Simulator (External View)
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Testing sandbox mimicking public-facing client chatbot. Accesses only FAQ and catalog vector spaces.
            </p>
          </div>
        </div>
        <span className="text-[10px] text-purple-300 bg-purple-950/50 border border-purple-800/40 px-2 py-0.5 rounded-full font-medium">
          Sandbox Mode
        </span>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && !streamingText && (
          <div className="text-center py-16 space-y-4 max-w-sm mx-auto">
            <HelpCircle className="h-12 w-12 mx-auto text-purple-400/50" />
            <h4 className="text-white text-base font-bold">How can we help you today?</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              This chatbot answers consumer questions about controller installation, warranty terms, accessories, and spare parts.
            </p>
            <div className="grid grid-cols-1 gap-2 pt-2">
              <button
                onClick={() => setInputValue("What is the warranty period for industrial controllers?")}
                className="text-xs p-2.5 rounded-lg border border-gray-850 hover:border-purple-500/30 bg-gray-900/40 text-gray-400 hover:text-white transition-all text-left"
              >
                "What is the warranty period for controllers?"
              </button>
              <button
                onClick={() => setInputValue("How do I install the controller mounting brackets?")}
                className="text-xs p-2.5 rounded-lg border border-gray-850 hover:border-purple-500/30 bg-gray-900/40 text-gray-400 hover:text-white transition-all text-left"
              >
                "How do I install the controller mounting brackets?"
              </button>
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 max-w-[80%] ${
              m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${
              m.sender === 'user' 
                ? 'bg-purple-950 border-purple-900 text-purple-400' 
                : 'bg-gray-900 border-gray-800 text-gray-400'
            }`}>
              {m.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className={`p-3.5 rounded-xl border text-sm leading-relaxed whitespace-pre-wrap ${
              m.sender === 'user'
                ? 'bg-purple-950/20 border-purple-900/40 text-white'
                : 'bg-gray-900/35 border-gray-800 text-gray-300'
            }`}>
              {m.text}
            </div>
          </div>
        ))}

        {streamingText && (
          <div className="flex gap-3 max-w-[80%] mr-auto">
            <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 border bg-gray-900 border-gray-800 text-gray-400">
              <Bot className="h-4 w-4" />
            </div>
            <div className="p-3.5 rounded-xl border border-gray-800 bg-gray-900/35 text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">
              {streamingText}
            </div>
          </div>
        )}

        {loading && !streamingText && (
          <div className="flex gap-3 max-w-[80%] mr-auto">
            <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 border bg-gray-900 border-gray-800 text-gray-400">
              <Bot className="h-4 w-4" />
            </div>
            <div className="p-3.5 rounded-xl border border-gray-800 bg-gray-900/35 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-purple-500 border-t-transparent" />
                <span>Typing support reply...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Client Input */}
      <div className="p-4 border-t border-gray-800 bg-gray-950/20">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading || !session}
            placeholder="Type a message to customer support..."
            className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 disabled:opacity-50 text-sm"
          />
          <button
            type="submit"
            disabled={loading || !session || !inputValue.trim()}
            className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 active:scale-[0.98] text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <div className="flex items-center justify-center gap-1 text-[10px] text-gray-600 mt-2">
          <Heart className="h-3 w-3 text-rose-600 fill-current" />
          <span>Made for Industrial Customer Operations</span>
        </div>
      </div>
    </div>
  );
}
