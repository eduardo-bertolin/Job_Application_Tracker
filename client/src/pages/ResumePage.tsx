import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore.js";
import { authService } from "../services/auth.js";
import { resumeService } from "../services/resume.js";
import type { Resume } from "../services/resume.js";
import { format } from "date-fns";
import {
  LayoutDashboard, Kanban, BarChart3, Mail, FileText,
  Upload, Trash2, Check, AlertTriangle, X, ClipboardPaste, Target,
} from "lucide-react";

export function ResumePage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [resume, setResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadResume = async () => {
    try {
      setIsLoading(true);
      const r = await resumeService.get();
      setResume(r);
    } catch {
      setError("Failed to load resume");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResume();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large (max 5MB)");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      await resumeService.uploadFile(file);
      setSuccessMsg("Resume uploaded successfully!");
      setTimeout(() => setSuccessMsg(null), 5000);
      await loadResume();
    } catch {
      setError("Failed to upload resume");
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handlePasteSubmit = async () => {
    if (pasteText.trim().length < 50) {
      setError("Resume text too short (min 50 characters)");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      await resumeService.uploadText(pasteText.trim());
      setSuccessMsg("Resume saved successfully!");
      setTimeout(() => setSuccessMsg(null), 5000);
      setPasteMode(false);
      setPasteText("");
      await loadResume();
    } catch {
      setError("Failed to save resume");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete your resume? Match scores will no longer be available.")) return;
    try {
      await resumeService.remove();
      setResume(null);
      setSuccessMsg("Resume deleted");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError("Failed to delete resume");
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 glass px-6 py-4 flex flex-col sm:flex-row justify-between items-center shrink-0 border-b border-slate-200/50">
        <div className="flex items-center gap-3 mb-4 sm:mb-0">
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-2.5 rounded-xl shadow-md shadow-primary-500/20">
            <LayoutDashboard size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">JobTracker</h1>
        </div>

        <nav className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50 shadow-sm">
          <button onClick={() => navigate("/kanban")} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-white/60 rounded-lg transition-all">
            <Kanban size={16} /> Kanban
          </button>
          <button onClick={() => navigate("/metrics")} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-white/60 rounded-lg transition-all">
            <BarChart3 size={16} /> Metrics
          </button>
          <button onClick={() => navigate("/gmail")} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-white/60 rounded-lg transition-all">
            <Mail size={16} /> Gmail
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-700 bg-white rounded-lg shadow-sm ring-1 ring-slate-200/50 transition-all">
            <FileText size={16} className="text-primary-600" /> Resume
          </button>
        </nav>
        
        <div className="flex items-center gap-5 mt-4 sm:mt-0">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Welcome</span>
            <span className="text-sm font-bold text-slate-800">{user?.name || user?.email}</span>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
          <button 
            onClick={handleLogout}
            className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors px-2"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-3xl mx-auto w-full">
        {/* Alerts */}
        {successMsg && (
          <div className="mb-6 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl border border-emerald-200/60 shadow-sm flex items-center gap-3">
            <div className="bg-emerald-100 p-1.5 rounded-md"><Check size={16} /></div> 
            <span className="font-medium">{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-200/60 shadow-sm flex items-center gap-3">
            <div className="bg-red-100 p-1.5 rounded-md"><AlertTriangle size={16} /></div>
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-md transition-colors"><X size={16} /></button>
          </div>
        )}

        {/* Resume Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 sm:p-8 mb-6 overflow-hidden relative group">
          {/* subtle decorative background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full blur-3xl opacity-50 -mr-20 -mt-20 pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl shadow-inner ${resume ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-50 text-slate-400 border border-slate-100"}`}>
                <FileText size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">My Resume</h2>
                {resume ? (
                  <p className="text-sm font-medium text-slate-500 mt-0.5">
                    Updated {format(new Date(resume.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                    <span className="mx-2 text-slate-300">•</span>
                    {resume.rawText.length.toLocaleString()} characters
                  </p>
                ) : (
                  <p className="text-sm text-slate-500 mt-0.5">Upload your resume to get match scores on your applications</p>
                )}
              </div>
            </div>

            {resume && (
              <button onClick={handleDelete} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-200 border border-transparent rounded-xl transition-all shadow-sm">
                <Trash2 size={16} /> Delete
              </button>
            )}
          </div>

          {/* Upload options */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 relative z-10">
            <label className={`flex-1 flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isUploading ? "opacity-50 pointer-events-none" : "border-slate-300 hover:border-primary-400 hover:bg-primary-50 hover:shadow-md"}`}>
              <Upload size={24} className="text-slate-400 mb-1" />
              <span className="text-sm font-semibold text-slate-700">{isUploading ? "Uploading..." : "Upload PDF"}</span>
              <span className="text-xs text-slate-500 text-center">Drag & drop or click to browse</span>
              <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={() => setPasteMode(!pasteMode)}
              className={`flex-1 flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-xl transition-all ${pasteMode ? "border-primary-400 bg-primary-50 shadow-inner" : "border-slate-300 hover:border-primary-400 hover:bg-primary-50 hover:shadow-md"}`}
            >
              <ClipboardPaste size={24} className={pasteMode ? "text-primary-500 mb-1" : "text-slate-400 mb-1"} />
              <span className={`text-sm font-semibold ${pasteMode ? "text-primary-700" : "text-slate-700"}`}>Paste Text</span>
              <span className="text-xs text-slate-500 text-center">Directly paste your resume content</span>
            </button>
          </div>

          {/* Paste area */}
          {pasteMode && (
            <div className="space-y-4 relative z-10 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste your resume text here..."
                rows={10}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none text-sm text-slate-700 bg-white"
              />
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <span className="text-xs font-medium text-slate-500">{pasteText.length} characters (min 50)</span>
                <div className="flex gap-3">
                  <button onClick={() => { setPasteMode(false); setPasteText(""); }} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handlePasteSubmit}
                    disabled={isUploading || pasteText.trim().length < 50}
                    className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? "Saving..." : "Save Resume"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Resume preview */}
          {resume && !pasteMode && (
            <div className="mt-6 p-5 bg-slate-50 rounded-xl border border-slate-200/60 max-h-72 overflow-y-auto relative z-10 shadow-inner">
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed font-medium">
                {resume.rawText.slice(0, 2000)}
                {resume.rawText.length > 2000 ? <span className="text-slate-400 italic">... [content truncated for preview]</span> : ""}
              </p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-gradient-to-r from-primary-50 to-indigo-50 border border-primary-100/50 rounded-2xl p-6 shadow-sm flex gap-4 items-start">
          <div className="bg-white p-2 rounded-lg shadow-sm text-primary-500 shrink-0">
            <Target size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary-900 mb-1.5 tracking-tight">How AI match scores work</h3>
            <p className="text-sm text-primary-800/80 leading-relaxed font-medium">
              Your resume is compared against each job description using semantic AI embeddings.
              The score (0–100%) measures how closely your experience aligns with the job requirements.
              Add a job description when creating an application to instantly see your match score!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
