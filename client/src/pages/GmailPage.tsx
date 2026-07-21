import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../stores/authStore.js";
import { authService } from "../services/auth.js";
import { gmailService } from "../services/gmail.js";
import type { GmailStatus, EmailSuggestion } from "../services/gmail.js";
import { format } from "date-fns";
import {
  LayoutDashboard, Kanban, BarChart3, Mail, RefreshCw, Unplug,
  Check, X, ArrowRight, AlertTriangle, Zap,
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
          <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md">
            <Mail size={16} /> Gmail
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <span className="text-gray-600 text-sm"><strong>{user?.name || user?.email}</strong></span>
          <button onClick={handleLogout} className="text-sm font-medium text-gray-600 hover:text-red-600 transition">Logout</button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-4xl mx-auto w-full">
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

        {/* Connection Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${status?.connected ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-400"}`}>
                <Mail size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Gmail Connection</h2>
                {status?.connected ? (
                  <div className="text-sm text-gray-500">
                    Connected {status.connectedAt && `since ${format(new Date(status.connectedAt), "MMM d, yyyy")}`}
                    {status.lastSyncAt && ` · Last sync: ${format(new Date(status.lastSyncAt), "MMM d, h:mm a")}`}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Connect your Gmail to auto-detect status updates from emails</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {status?.connected ? (
                <>
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                    {isSyncing ? "Syncing..." : "Sync Now"}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition"
                  >
                    <Unplug size={16} /> Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={handleConnect}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
                >
                  <Mail size={16} /> Connect Gmail
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Suggestions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Zap size={18} className="text-yellow-500" />
              Pending Suggestions
              {suggestions.length > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-medium">{suggestions.length}</span>
              )}
            </h3>
          </div>

          {suggestions.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Mail size={40} className="mx-auto mb-3 opacity-50" />
              <p>No pending suggestions</p>
              <p className="text-sm mt-1">{status?.connected ? "Click Sync Now to check for new emails" : "Connect Gmail to get started"}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {suggestions.map((s) => (
                <div key={s.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONFIDENCE_COLORS[s.confidence]}`}>
                        {s.confidence}
                      </span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(s.emailDate), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="font-medium text-gray-800 truncate">{s.emailSubject}</p>
                    <p className="text-sm text-gray-500 truncate">{s.emailFrom}</p>
                    {s.snippet && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{s.snippet}</p>}

                    <div className="mt-2 flex items-center gap-2 text-sm">
                      {s.application ? (
                        <span className="text-blue-600 font-medium">{s.application.companyName} — {s.application.jobTitle}</span>
                      ) : (
                        <span className="text-gray-400 italic">No matched application</span>
                      )}
                      <ArrowRight size={14} className="text-gray-300" />
                      <span className="font-semibold text-gray-700">{STATUS_LABELS[s.suggestedStatus] || s.suggestedStatus}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-1">
                    {s.application && (
                      <button
                        onClick={() => handleApply(s.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition"
                      >
                        <Check size={14} /> Apply
                      </button>
                    )}
                    <button
                      onClick={() => handleDismiss(s.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                    >
                      <X size={14} /> Dismiss
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
