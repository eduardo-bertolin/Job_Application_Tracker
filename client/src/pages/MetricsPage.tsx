import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore.js";
import { authService } from "../services/auth.js";
import { metricsService } from "../services/metrics.js";
import type { DashboardMetrics } from "../services/metrics.js";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import {
  LayoutDashboard, Kanban, TrendingUp, Users, Clock, BarChart3,
  Briefcase, ArrowRight, Mail, FileText
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

const STATUS_COLORS: Record<string, string> = {
  APPLIED: "#6366f1",
  SCREENING: "#f59e0b",
  INTERVIEW: "#3b82f6",
  OFFER: "#10b981",
  REJECTED: "#ef4444",
};

export function MetricsPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    metricsService
      .getMetrics()
      .then(setMetrics)
      .catch(() => setError("Failed to load metrics"))
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    navigate("/login");
  };

  // Transform statusCounts for bar chart
  const statusData = metrics
    ? Object.entries(metrics.statusCounts).map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        count,
        fill: STATUS_COLORS[status] || "#94a3b8",
      }))
    : [];

  // Transform timeline for area chart
  const timelineData = metrics
    ? metrics.timeline.map((t) => ({
        week: new Date(t.week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        applications: t.count,
      }))
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-lg border border-red-200">{error}</div>
      </div>
    );
  }

  const isEmpty = !metrics || metrics.total === 0;

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
          <button
            onClick={() => navigate("/kanban")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-white/60 rounded-lg transition-all"
          >
            <Kanban size={16} /> Kanban
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-700 bg-white rounded-lg shadow-sm ring-1 ring-slate-200/50 transition-all"
          >
            <BarChart3 size={16} className="text-primary-600" /> Metrics
          </button>
          <button
            onClick={() => navigate("/gmail")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-white/60 rounded-lg transition-all"
          >
            <Mail size={16} /> Gmail
          </button>
          <button
            onClick={() => navigate("/resume")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-white/60 rounded-lg transition-all"
          >
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

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {isEmpty ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <Briefcase size={64} className="text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">No data yet</h2>
            <p className="text-gray-500 mb-6 max-w-md">
              Add some job applications to your Kanban board and come back here to see insights about your job search.
            </p>
            <button
              onClick={() => navigate("/kanban")}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition font-medium"
            >
              Go to Kanban <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <SummaryCard
                icon={<Briefcase size={20} />}
                label="Total Applications"
                value={metrics!.total.toString()}
                color="blue"
              />
              <SummaryCard
                icon={<TrendingUp size={20} />}
                label="Response Rate"
                value={`${metrics!.responseRate}%`}
                color="green"
              />
              <SummaryCard
                icon={<Users size={20} />}
                label="Interview Conversion"
                value={`${metrics!.interviewConversionRate}%`}
                color="purple"
              />
              <SummaryCard
                icon={<Clock size={20} />}
                label="Avg. Days to Response"
                value={metrics!.avgDaysToResponse !== null ? `${metrics!.avgDaysToResponse}d` : "N/A"}
                color="amber"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Status Bar Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Applications by Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {statusData.map((entry, i) => (
                        <rect key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Timeline Area Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Applications Over Time</h3>
                {timelineData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={timelineData}>
                      <defs>
                        <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="applications"
                        stroke="#6366f1"
                        fillOpacity={1}
                        fill="url(#colorApps)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
                    Need at least 2 weeks of data to show timeline
                  </div>
                )}
              </div>
            </div>

            {/* Top Companies */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Companies</h3>
              {metrics!.topCompanies.length > 0 ? (
                <div className="space-y-3">
                  {metrics!.topCompanies.map((c, i) => (
                    <div key={c.company} className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-400 w-6">#{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-gray-800">{c.company}</span>
                          <span className="text-sm text-gray-500">{c.count} apps</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{
                              width: `${(c.count / metrics!.topCompanies[0].count) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No company data yet</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "blue" | "green" | "purple" | "amber";
}) {
  const colorMap = {
    blue: "from-blue-500 to-blue-600 shadow-blue-500/20",
    green: "from-emerald-400 to-emerald-500 shadow-emerald-500/20",
    purple: "from-purple-500 to-purple-600 shadow-purple-500/20",
    amber: "from-amber-400 to-amber-500 shadow-amber-500/20",
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 flex items-start gap-4 hover:shadow-md hover:-translate-y-1 transition-all group overflow-hidden relative">
      <div className={`p-3.5 rounded-xl bg-gradient-to-br ${colorMap[color]} shadow-lg text-white relative z-10`}>
        {icon}
      </div>
      <div className="relative z-10">
        <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
        <p className="text-3xl font-bold text-slate-800 tracking-tight">{value}</p>
      </div>
      {/* Decorative gradient blur in background */}
      <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${colorMap[color]} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
    </div>
  );
}
