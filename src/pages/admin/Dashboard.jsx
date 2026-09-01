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
} from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

function relativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

function formatNaira(amount) {
  return "₦" + Number(amount).toLocaleString();
}

function StatCard({ icon: Icon, label, value, iconBg, iconColor, sub }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
      >
        <Icon size={22} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

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
          to="/admin/login"
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

export default function Dashboard() {
  const { authLoading, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
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
        if (status === 401 || status === 403) {
          // interceptor handles session teardown + redirect
        } else {
          console.error("Dashboard load error:", err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  if (authLoading || (loading && user)) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <span className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AdminGateCTA />;
  }

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
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Platform overview at a glance
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Users"
            value={data.total_users.toLocaleString()}
            iconBg="bg-blue-50"
            iconColor="text-primary"
          />
          <StatCard
            icon={BookOpen}
            label="Total Quizzes"
            value={data.total_quizzes}
            iconBg="bg-accent/10"
            iconColor="text-accent"
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
            iconBg="bg-amber-50"
            iconColor="text-amber-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by quiz */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-primary" />
              <h2 className="font-bold text-gray-800">Revenue by Quiz</h2>
            </div>
            {data.revenue_by_quiz?.length === 0 ? (
              <p className="text-sm text-gray-400">No revenue yet.</p>
            ) : (
              <div className="space-y-3">
                {data.revenue_by_quiz.map((item) => (
                  <div key={item.quiz_id ?? item.title}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 line-clamp-1 flex-1 pr-2">
                        {item.title}
                      </span>
                      <span className="font-semibold text-primary shrink-0">
                        {formatNaira(item.revenue)}
                      </span>
                    </div>
                    <div className="w-full bg-tint rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${(item.revenue / maxRevenue) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.used_codes} codes redeemed
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Most attempted + codes summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Star size={16} className="text-accent" />
                <h2 className="font-bold text-gray-800">Most Attempted Quiz</h2>
              </div>
              {data.most_attempted_quiz ? (
                <p className="text-base font-semibold text-primary-dark">
                  {data.most_attempted_quiz.title}
                </p>
              ) : (
                <p className="text-sm text-gray-400">No attempts yet.</p>
              )}
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound size={16} className="text-green-500" />
                <h2 className="font-bold text-gray-800">Access Codes</h2>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {data.unused_codes}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Unused</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-400">
                    {data.used_codes}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Used</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent attempts */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-primary" />
            <h2 className="font-bold text-gray-800">Recent Attempts</h2>
          </div>
          {(data.recent_attempts ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {data.recent_attempts.map((attempt, i) => (
                <div key={attempt.id ?? i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-tint flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {(attempt.profiles?.full_name ?? attempt.user_id ?? "?")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">
                      <span className="font-medium">
                        {attempt.profiles?.full_name ?? "A student"}
                      </span>{" "}
                      <span className="text-gray-400">attempted a quiz</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {relativeTime(attempt.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
