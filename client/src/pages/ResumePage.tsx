import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore.js";
import { authService } from "../services/auth.js";
import { resumeService } from "../services/resume.js";
import type { Resume } from "../services/resume.js";
import { format } from "date-fns";
import {
  LayoutDashboard, Kanban, BarChart3, Mail, FileText,
  Upload, Trash2, Check, AlertTriangle, X, ClipboardPaste,
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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <LayoutDashboard size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">JobTracker</h1>
        </div>

        <nav className="flex items-center gap-1">
          <button onClick={() => navigate("/kanban")} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition">
            <Kanban size={16} /> Kanban
          </button>
          <button onClick={() => navigate("/metrics")} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition">
            <BarChart3 size={16} /> Metrics
          </button>
          <button onClick={() => navigate("/gmail")} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition">
            <Mail size={16} /> Gmail
          </button>
          <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md">
            <FileText size={16} /> Resume
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <span className="text-gray-600 text-sm"><strong>{user?.name || user?.email}</strong></span>
          <button onClick={handleLogout} className="text-sm font-medium text-gray-600 hover:text-red-600 transition">Logout</button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-3xl mx-auto w-full">
        {/* Alerts */}
        {successMsg && (
          <div className="mb-6 bg-green-50 text-green-700 px-4 py-3 rounded-lg border border-green-200 flex items-center gap-2">
            <Check size={16} /> {successMsg}
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-lg border border-red-200 flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={16} /></button>
          </div>
        )}

        {/* Resume Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${resume ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-400"}`}>
                <FileText size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">My Resume</h2>
                {resume ? (
                  <p className="text-sm text-gray-500">
                    Updated {format(new Date(resume.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                    {" · "}{resume.rawText.length.toLocaleString()} characters
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">Upload your resume to get match scores on your applications</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {resume && (
                <button onClick={handleDelete} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition">
                  <Trash2 size={16} /> Delete
                </button>
              )}
            </div>
          </div>

          {/* Upload options */}
          <div className="flex gap-3 mb-4">
            <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition ${isUploading ? "opacity-50 pointer-events-none" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"}`}>
              <Upload size={18} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-600">{isUploading ? "Uploading..." : "Upload PDF"}</span>
              <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={() => setPasteMode(!pasteMode)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg transition ${pasteMode ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"}`}
            >
              <ClipboardPaste size={18} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Paste Text</span>
            </button>
          </div>

          {/* Paste area */}
          {pasteMode && (
            <div className="space-y-3">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste your resume text here..."
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none text-sm"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">{pasteText.length} characters (min 50)</span>
                <div className="flex gap-2">
                  <button onClick={() => { setPasteMode(false); setPasteText(""); }} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition">
                    Cancel
                  </button>
                  <button
                    onClick={handlePasteSubmit}
                    disabled={isUploading || pasteText.trim().length < 50}
                    className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50"
                  >
                    {isUploading ? "Saving..." : "Save Resume"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Resume preview */}
          {resume && !pasteMode && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100 max-h-64 overflow-y-auto">
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{resume.rawText.slice(0, 2000)}{resume.rawText.length > 2000 ? "..." : ""}</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-1">How match scores work</h3>
          <p className="text-sm text-blue-700">
            Your resume is compared against each job description using semantic embeddings (all-MiniLM-L6-v2).
            The score (0–100%) measures how similar your resume content is to the job requirements.
            Add a job description when creating an application to see the score.
          </p>
        </div>
      </main>
    </div>
  );
}
