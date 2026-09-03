import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  BookOpen,
  KeyRound,
  Banknote,
  TrendingUp,
  Star,
  Clock,
  ShieldAlert,
  Target,
  BarChart2,
  UserPlus,
  CheckCircle2,
  Activity,
  ChevronRight,
} from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatNaira(amount) {
  return "₦" + Number(amount).toLocaleString();
}

function formatShortDay(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor, trend }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
      >
        <Icon size={20} className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
        {sub && (
          <p
            className={`text-xs mt-0.5 ${trend === "up" ? "text-green-600" : trend === "neutral" ? "text-gray-400" : "text-gray-400"}`}
          >
            {trend === "up" && "↑ "}
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Mini activity bar chart ──────────────────────────────────────────────────

function ActivityChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1.5 h-16">
      {data.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-primary/20 rounded-t-sm transition-all"
            style={{ height: `${Math.max(4, (d.count / max) * 52)}px` }}
            title={`${d.count} attempt${d.count !== 1 ? "s" : ""}`}
          >
            <div
              className="w-full bg-primary rounded-t-sm h-full"
              style={{ opacity: d.count === 0 ? 0 : 1 }}
            />
          </div>
          <span className="text-[9px] text-gray-400">
            {formatShortDay(d.date)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Admin gate ───────────────────────────────────────────────────────────────

function AdminGateCTA() {
  return (
    <div className="min-h-screen bg-tint flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <ShieldAlert size={32} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-primary-dark mb-1">
            Admin Access Required
          </h1>
          <p className="text-sm text-gray-500">
            Sign in with your admin account to view the dashboard.
          </p>
        </div>
        <Link
          to="/login"
          className="block w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-2xl text-sm transition"
        >
          Sign In as Admin
        </Link>
        <Link
          to="/"
          className="block w-full border-2 border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-2xl text-sm transition"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { authLoading, user, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .get("/dashboard")
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status !== 401 && status !== 403)
          console.error("Dashboard load error:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, isAdmin]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <span className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) return <AdminGateCTA />;

  if (!data) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <p className="text-gray-500">Failed to load dashboard.</p>
      </div>
    );
  }

  const codeUsagePct =
    data.total_codes > 0
      ? Math.round((data.used_codes / data.total_codes) * 100)
      : 0;

  const maxRevenue = Math.max(
    ...(data.revenue_by_quiz ?? []).map((r) => r.revenue),
    1,
  );

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-12 space-y-7">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary-dark">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Platform overview at a glance
            </p>
          </div>
          <Link
            to="/admin/users"
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark bg-white border border-primary/20 px-4 py-2 rounded-xl shadow-sm hover:shadow transition"
          >
            <Users size={15} /> View All Users <ChevronRight size={14} />
          </Link>
        </div>

        {/* ── Row 1: 4 primary stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={Users}
            label="Total Users"
            value={data.total_users.toLocaleString()}
            sub={`+${data.new_users_7d} this week`}
            trend="up"
            iconBg="bg-blue-50"
            iconColor="text-primary"
          />
          <StatCard
            icon={BookOpen}
            label="Total Quizzes"
            value={data.total_quizzes}
            sub={`${data.total_attempts.toLocaleString()} total attempts`}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
          />
          <StatCard
            icon={KeyRound}
            label="Codes Used"
            value={`${data.used_codes} / ${data.total_codes}`}
            sub={`${codeUsagePct}% redeemed`}
            iconBg="bg-green-50"
            iconColor="text-green-600"
          />
          <StatCard
            icon={Banknote}
            label="Est. Revenue"
            value={formatNaira(data.estimated_revenue)}
            sub={`${data.used_codes} paid access${data.used_codes !== 1 ? "es" : ""}`}
            iconBg="bg-amber-50"
            iconColor="text-amber-500"
          />
        </div>

        {/* ── Row 2: 3 performance stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            icon={Target}
            label="Avg. Score"
            value={`${data.avg_score}%`}
            sub="across all attempts"
            iconBg="bg-sky-50"
            iconColor="text-sky-500"
          />
          <StatCard
            icon={CheckCircle2}
            label="Pass Rate"
            value={`${data.pass_rate}%`}
            sub="of attempts passed"
            iconBg="bg-emerald-50"
            iconColor="text-emerald-500"
          />
          <StatCard
            icon={UserPlus}
            label="New Users (7d)"
            value={data.new_users_7d}
            sub="joined this week"
            trend={data.new_users_7d > 0 ? "up" : "neutral"}
            iconBg="bg-pink-50"
            iconColor="text-pink-500"
          />
        </div>

        {/* ── Row 3: Activity chart + Access Codes ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Activity chart */}
          <div className="sm:col-span-2 bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-primary" />
                <h2 className="font-bold text-gray-800">
                  Activity (Last 7 Days)
                </h2>
              </div>
              <span className="text-xs text-gray-400">
                {data.activity_last_7_days.reduce((s, d) => s + d.count, 0)}{" "}
                attempts
              </span>
            </div>
            <ActivityChart data={data.activity_last_7_days} />
          </div>

          {/* Access codes summary */}
          <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound size={16} className="text-green-500" />
              <h2 className="font-bold text-gray-800">Access Codes</h2>
            </div>
            <div className="flex gap-5 mb-4">
              <div>
                <p className="text-3xl font-bold text-green-600">
                  {data.unused_codes}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Unused</p>
              </div>
              <div className="w-px bg-gray-100" />
              <div>
                <p className="text-3xl font-bold text-gray-400">
                  {data.used_codes}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Used</p>
              </div>
            </div>
            {/* usage bar */}
            <div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${codeUsagePct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">{codeUsagePct}% redeemed</p>
            </div>
            <Link
              to="/admin/codes"
              className="mt-4 text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              Manage codes <ChevronRight size={12} />
            </Link>
          </div>
        </div>

        {/* ── Row 4: Revenue by quiz + Top quizzes ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Revenue by quiz */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={16} className="text-primary" />
              <h2 className="font-bold text-gray-800">Revenue by Quiz</h2>
            </div>
            {data.revenue_by_quiz?.length === 0 ? (
              <p className="text-sm text-gray-400">No revenue yet.</p>
            ) : (
              <div className="space-y-4">
                {data.revenue_by_quiz.map((item) => (
                  <div key={item.quiz_id ?? item.title}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-700 line-clamp-1 flex-1 pr-2 font-medium text-xs">
                        {item.title}
                      </span>
                      <span className="font-bold text-primary shrink-0 text-xs">
                        {item.revenue > 0 ? (
                          formatNaira(item.revenue)
                        ) : (
                          <span className="text-gray-300 font-normal">₦0</span>
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-tint rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{
                          width: `${(item.revenue / maxRevenue) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {item.used_codes} code{item.used_codes !== 1 ? "s" : ""}{" "}
                      redeemed
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Most attempted + top quizzes */}
          <div className="space-y-4">
            {/* Most attempted */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Star size={16} className="text-amber-400" />
                <h2 className="font-bold text-gray-800">Most Attempted Quiz</h2>
              </div>
              {data.most_attempted_quiz ? (
                <div>
                  <p className="text-sm font-bold text-primary-dark leading-snug mb-1">
                    {data.most_attempted_quiz.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {data.most_attempted_quiz.attempt_count} attempt
                    {data.most_attempted_quiz.attempt_count !== 1 ? "s" : ""}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No attempts yet.</p>
              )}
            </div>

            {/* Top 5 quizzes by attempts */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={16} className="text-violet-500" />
                <h2 className="font-bold text-gray-800">Top Quizzes</h2>
              </div>
              {data.top_quizzes?.length === 0 ? (
                <p className="text-sm text-gray-400">No quiz data yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.top_quizzes.map((q, i) => {
                    const maxAttempts = Math.max(
                      ...data.top_quizzes.map((x) => x.attempt_count),
                      1,
                    );
                    return (
                      <div key={q.id} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-300 w-4 shrink-0">
                          #{i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate mb-1">
                            {q.title}
                          </p>
                          <div className="w-full bg-tint rounded-full h-1.5">
                            <div
                              className="bg-violet-400 h-1.5 rounded-full"
                              style={{
                                width: `${(q.attempt_count / maxAttempts) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 shrink-0 font-semibold">
                          {q.attempt_count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 5: Recent attempts ── */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              <h2 className="font-bold text-gray-800">Recent Attempts</h2>
            </div>
            <Link
              to="/admin/users"
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              All users <ChevronRight size={12} />
            </Link>
          </div>
          {(data.recent_attempts ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">No recent activity.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.recent_attempts.map((attempt, i) => {
                const name = attempt.profiles?.full_name ?? "A student";
                const initials = name.slice(0, 2).toUpperCase();
                const quizTitle = attempt.quizzes?.title ?? "Unknown quiz";
                return (
                  <div
                    key={attempt.id ?? i}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">
                        <span className="font-semibold">{name}</span>
                        <span className="text-gray-400 font-normal"> · </span>
                        <span className="text-gray-500 text-xs">
                          {quizTitle}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400">
                        {relativeTime(attempt.created_at)}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                        attempt.score >= 50
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {attempt.score}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
