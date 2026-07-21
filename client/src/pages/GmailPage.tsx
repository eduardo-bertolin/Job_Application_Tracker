import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../stores/authStore.js";
import { authService } from "../services/auth.js";
import { gmailService } from "../services/gmail.js";
import type { GmailStatus, EmailSuggestion } from "../services/gmail.js";
import { format } from "date-fns";
import {
  LayoutDashboard, Kanban, BarChart3, Mail, RefreshCw, Unplug,
  Check, X, ArrowRight, AlertTriangle, Zap, FileText, Clock
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  APPLIED: "Applied", SCREENING: "Screening", INTERVIEW: "Interview",
  OFFER: "Offer", REJECTED: "Rejected",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  HIGH: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-gray-100 text-gray-600",
};

export function GmailPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [suggestions, setSuggestions] = useState<EmailSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [s, sugs] = await Promise.all([
        gmailService.getStatus(),
        gmailService.getSuggestions().catch(() => []),
      ]);
      setStatus(s);
      setSuggestions(sugs);
    } catch {
      setError("Failed to load Gmail status");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get("connected") === "true") {
      setSuccessMsg("Gmail connected successfully!");
      setTimeout(() => setSuccessMsg(null), 5000);
    }
    if (searchParams.get("error") === "oauth_failed") {
      setError("Failed to connect Gmail. Please try again.");
    }
    loadData();
  }, [searchParams]);



  const handleConnect = async () => {
    try {
      const authUrl = await gmailService.connect();
      window.location.href = authUrl;
    } catch {
      setError("Failed to start Gmail connection");
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect Gmail? Pending suggestions will remain.")) return;
    try {
      await gmailService.disconnect();
      setStatus({ connected: false, lastSyncAt: null, connectedAt: null, pendingSuggestions: 0 });
    } catch {
      setError("Failed to disconnect");
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      const result = await gmailService.sync();
      setSuggestions(result.suggestions);
      setSuccessMsg(`Sync complete. ${result.newSuggestions} new suggestion(s) found.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      // Refresh status
      const s = await gmailService.getStatus();
      setStatus(s);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Gmail access revoked. Please reconnect.");
        setStatus({ connected: false, lastSyncAt: null, connectedAt: null, pendingSuggestions: 0 });
      } else {
        setError("Sync failed. Please try again.");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApply = async (id: string) => {
    try {
      await gmailService.applySuggestion(id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      setSuccessMsg("Status updated!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError("Failed to apply suggestion");
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await gmailService.dismissSuggestion(id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setError("Failed to dismiss suggestion");
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
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-700 bg-white rounded-lg shadow-sm ring-1 ring-slate-200/50 transition-all">
            <Mail size={16} className="text-primary-600" /> Gmail
          </button>
          <button onClick={() => navigate("/resume")} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-white/60 rounded-lg transition-all">
            <FileText size={16} /> Resume
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

      <main className="flex-1 p-8 max-w-4xl mx-auto w-full">
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

        {/* Connection Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 sm:p-8 mb-6 overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full blur-3xl opacity-50 -mr-20 -mt-20 pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl shadow-inner ${status?.connected ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-50 text-slate-400 border border-slate-100"}`}>
                <Mail size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Gmail Connection</h2>
                {status?.connected ? (
                  <div className="text-sm font-medium text-slate-500 mt-0.5 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <span>Connected {status.connectedAt && `since ${format(new Date(status.connectedAt), "MMM d, yyyy")}`}</span>
                    <span className="hidden sm:inline text-slate-300">•</span>
                    <span>{status.lastSyncAt ? `Last sync: ${format(new Date(status.lastSyncAt), "MMM d, h:mm a")}` : "Not synced yet"}</span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 mt-0.5">Connect your Gmail to auto-detect status updates from emails</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {status?.connected ? (
                <>
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                    {isSyncing ? "Syncing..." : "Sync Now"}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 border border-transparent rounded-xl transition-all shadow-sm"
                  >
                    <Unplug size={16} /> Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={handleConnect}
                  className="group relative flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all shadow-md hover:shadow-lg overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2"><Mail size={18} /> Connect Gmail</span>
                  <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Suggestions */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 tracking-tight">
              <div className="p-1.5 bg-yellow-100 rounded-md"><Zap size={16} className="text-yellow-600" /></div>
              Pending Suggestions
              {suggestions.length > 0 && (
                <span className="bg-primary-100 text-primary-700 text-xs px-2.5 py-0.5 rounded-full font-bold ml-2 shadow-sm border border-primary-200/50">{suggestions.length}</span>
              )}
            </h3>
          </div>

          {suggestions.length === 0 ? (
            <div className="p-16 text-center">
              <div className="inline-flex p-4 rounded-full bg-slate-50 mb-4 border border-slate-100">
                <Mail size={48} className="text-slate-300" />
              </div>
              <p className="text-lg font-semibold text-slate-700">No pending suggestions</p>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto">{status?.connected ? "Click Sync Now to scan your recent emails for updates." : "Connect Gmail to start receiving smart updates for your applications."}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {suggestions.map((s) => (
                <div key={s.id} className="p-6 flex flex-col sm:flex-row items-start gap-5 hover:bg-slate-50/80 transition-colors group">
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold shadow-sm ${CONFIDENCE_COLORS[s.confidence]}`}>
                        {s.confidence} MATCH
                      </span>
                      <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                        <Clock size={12} />
                        {format(new Date(s.emailDate), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 truncate text-lg mb-1">{s.emailSubject}</p>
                    <p className="text-sm font-medium text-slate-500 truncate mb-2">From: {s.emailFrom}</p>
                    {s.snippet && <p className="text-sm text-slate-600/90 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 line-clamp-2">{s.snippet}</p>}

                    <div className="mt-4 flex items-center gap-3 text-sm p-3 bg-primary-50 rounded-xl border border-primary-100/50 inline-flex">
                      {s.application ? (
                        <span className="text-primary-700 font-semibold">{s.application.companyName} — {s.application.jobTitle}</span>
                      ) : (
                        <span className="text-slate-400 italic">No matched application</span>
                      )}
                      <div className="w-6 h-px bg-primary-200"></div>
                      <ArrowRight size={14} className="text-primary-400" />
                      <div className="w-6 h-px bg-primary-200"></div>
                      <span className="font-bold text-primary-800 uppercase tracking-tight">{STATUS_LABELS[s.suggestedStatus] || s.suggestedStatus}</span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-stretch gap-2 shrink-0 pt-1 w-full sm:w-auto">
                    {s.application && (
                      <button
                        onClick={() => handleApply(s.id)}
                        className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all shadow-sm shadow-emerald-500/20"
                      >
                        <Check size={16} /> Apply
                      </button>
                    )}
                    <button
                      onClick={() => handleDismiss(s.id)}
                      className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all shadow-sm"
                    >
                      <X size={16} /> Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
