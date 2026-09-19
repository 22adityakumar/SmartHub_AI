import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, CheckCircle2, AlertCircle, HardDrive } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

export default function DocumentManager() {
  const [documents, setDocuments] = useState([]);
  const [category, setCategory] = useState('engineering');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_BASE}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error("Failed to fetch documents", err);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setErrorMsg(null);
    setStatusMsg(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg("Please select a file to upload.");
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_category', category);

    try {
      const response = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setStatusMsg(`Successfully uploaded ${data.filename} (${data.chunk_count} chunks indexed).`);
        setFile(null);
        // Clear file input
        document.getElementById('file-input').value = '';
        fetchDocuments();
      } else {
        setErrorMsg(data.detail || "Failed to upload document.");
      }
    } catch (err) {
      setErrorMsg("Error connecting to server. Is the backend API running?");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm("Are you sure you want to delete this document from the RAG store? All vector embeddings will be permanently removed.")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/documents/${docId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setDocuments(documents.filter(doc => doc.id !== docId));
      } else {
        alert("Failed to delete document.");
      }
    } catch (err) {
      alert("Error connecting to server.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <HardDrive className="h-6 w-6 text-accentBlue" />
          Enterprise Document Store
        </h2>
        <p className="text-gray-400 mt-1">
          Upload and manage documentation databases. Files are parsed, embedded, and mapped to specific vector store channels.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="glass-panel p-6 rounded-xl border border-gray-800 md:col-span-1">
          <h3 className="text-lg font-semibold text-white mb-4">Ingest Document</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">RAG Target Channel</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accentBlue"
              >
                <option value="engineering">Engineering Knowledge Base (Manuals, Specs, Standards)</option>
                <option value="customer_support">Customer Support Portal (FAQ, Guides, Catalogs)</option>
                <option value="proposals">Proposal Archive (Past Proposals & Bid Templates)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Select File (PDF or TXT)</label>
              <div className="border-2 border-dashed border-gray-800 rounded-lg p-4 text-center hover:border-accentBlue cursor-pointer transition-colors duration-200">
                <input
                  type="file"
                  id="file-input"
                  accept=".pdf,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file-input" className="cursor-pointer space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-gray-500 hover:text-accentBlue transition-colors" />
                  <span className="block text-sm text-gray-400">
                    {file ? file.name : "Browse files..."}
                  </span>
                  <span className="block text-xs text-gray-600">
                    Max size 50MB. Text-based documents only.
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading || !file}
              className={`w-full py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 text-white transition-all ${
                uploading || !file
                  ? 'bg-gray-800 cursor-not-allowed text-gray-500'
                  : 'bg-accentBlue hover:bg-blue-600 active:scale-[0.98]'
              }`}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Processing & Indexing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload & Vectorize
                </>
              )}
            </button>
          </form>

          {/* Feedback messages */}
          {statusMsg && (
            <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
              <span>{statusMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="mt-4 p-3 bg-rose-950/40 border border-rose-500/20 text-rose-400 rounded-lg flex items-start gap-2 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Documents Table */}
        <div className="glass-panel p-6 rounded-xl border border-gray-800 md:col-span-2 overflow-hidden">
          <h3 className="text-lg font-semibold text-white mb-4">Indexed Documents Database</h3>
          <div className="overflow-x-auto">
            {documents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-700" />
                <p>No documents indexed yet. Upload manual PDFs to populate the RAG platform.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-xs font-semibold uppercase">
                    <th className="pb-3 pl-2">Filename</th>
                    <th className="pb-3">Channel</th>
                    <th className="pb-3">Size</th>
                    <th className="pb-3">Vector Chunks</th>
                    <th className="pb-3 pr-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50 text-sm">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-900/30 transition-colors">
                      <td className="py-3.5 pl-2 font-medium text-white flex items-center gap-2 max-w-[200px] truncate">
                        <FileText className="h-4 w-4 text-accentBlue shrink-0" />
                        <span title={doc.filename}>{doc.filename}</span>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          doc.doc_category === 'engineering' 
                            ? 'bg-blue-950/50 text-blue-400 border border-blue-800/30' 
                            : doc.doc_category === 'customer_support' 
                            ? 'bg-purple-950/50 text-purple-400 border border-purple-800/30' 
                            : 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/30'
                        }`}>
                          {doc.doc_category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 text-gray-400">
                        {(doc.file_size / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-3.5 font-semibold text-gray-300">
                        {doc.chunk_count}
                      </td>
                      <td className="py-3.5 pr-2 text-right">
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-1.5 text-gray-500 hover:text-rose-500 rounded hover:bg-rose-950/20 transition-all duration-150"
                          title="Delete document and clear vectors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
