import {
  Users,
  BookOpen,
  KeyRound,
  Banknote,
  TrendingUp,
  Star,
  Clock,
} from "lucide-react";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_DATA = {
  total_users: 1248,
  total_quizzes: 14,
  total_codes: 840,
  used_codes: 623,
  unused_codes: 217,
  estimated_revenue: 249200,
  revenue_by_quiz: [
    { title: "WAEC Mathematics 2024", used_codes: 210, revenue: 105000 },
    { title: "JAMB English Language", used_codes: 156, revenue: 46800 },
    { title: "NECO Physics", used_codes: 98, revenue: 39200 },
    { title: "WAEC Biology 2024", used_codes: 87, revenue: 34800 },
    { title: "JAMB Chemistry", used_codes: 72, revenue: 25200 },
  ],
  most_attempted_quiz: { title: "WAEC Mathematics 2024", attempts: 847 },
  recent_attempts: [
    {
      id: 1,
      quiz_title: "WAEC Mathematics 2024",
      user_name: "Chukwuemeka Obi",
      score: 78,
      ts: Date.now() - 2 * 60 * 60 * 1000,
    },
    {
      id: 2,
      quiz_title: "JAMB English Language",
      user_name: "Fatima Al-Hassan",
      score: 90,
      ts: Date.now() - 5 * 60 * 60 * 1000,
    },
    {
      id: 3,
      quiz_title: "NECO Physics",
      user_name: "Tunde Adeyemi",
      score: 55,
      ts: Date.now() - 8 * 60 * 60 * 1000,
    },
    {
      id: 4,
      quiz_title: "WAEC Biology 2024",
      user_name: "Ngozi Eze",
      score: 42,
      ts: Date.now() - 23 * 60 * 60 * 1000,
    },
    {
      id: 5,
      quiz_title: "JAMB Chemistry",
      user_name: "Bashir Musa",
      score: 65,
      ts: Date.now() - 26 * 60 * 60 * 1000,
    },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

function formatNaira(amount) {
  return "₦" + amount.toLocaleString();
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const d = MOCK_DATA;
  const codeUsagePercent = Math.round((d.used_codes / d.total_codes) * 100);

  // Max revenue for bar scaling
  const maxRevenue = Math.max(...d.revenue_by_quiz.map((r) => r.revenue));

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-10 space-y-8">
        {/* Header */}
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
            value={d.total_users.toLocaleString()}
            iconBg="bg-blue-50"
            iconColor="text-primary"
          />
          <StatCard
            icon={BookOpen}
            label="Total Quizzes"
            value={d.total_quizzes}
            iconBg="bg-accent/10"
            iconColor="text-accent"
          />
          <StatCard
            icon={KeyRound}
            label="Codes Used"
            value={`${d.used_codes} / ${d.total_codes}`}
            sub={`${codeUsagePercent}% redeemed`}
            iconBg="bg-green-50"
            iconColor="text-green-600"
          />
          <StatCard
            icon={Banknote}
            label="Est. Revenue"
            value={formatNaira(d.estimated_revenue)}
            iconBg="bg-amber-50"
            iconColor="text-amber-500"
          />
        </div>

        {/* Two-column section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by quiz */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-primary" />
              <h2 className="font-bold text-gray-800">Revenue by Quiz</h2>
            </div>
            <div className="space-y-3">
              {d.revenue_by_quiz.map((item) => (
                <div key={item.title}>
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
                      style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.used_codes} codes redeemed
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Most attempted + unused codes */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Star size={16} className="text-accent" />
                <h2 className="font-bold text-gray-800">Most Attempted Quiz</h2>
              </div>
              <p className="text-base font-semibold text-primary-dark">
                {d.most_attempted_quiz.title}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {d.most_attempted_quiz.attempts.toLocaleString()} attempts
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound size={16} className="text-green-500" />
                <h2 className="font-bold text-gray-800">Access Codes</h2>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {d.unused_codes}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Unused</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-400">
                    {d.used_codes}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Used</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-primary" />
            <h2 className="font-bold text-gray-800">Recent Attempts</h2>
          </div>
          <div className="space-y-3">
            {d.recent_attempts.map((attempt) => (
              <div key={attempt.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-tint flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {attempt.user_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">
                    <span className="font-medium">{attempt.user_name}</span>{" "}
                    <span className="text-gray-400">attempted</span>{" "}
                    <span className="font-medium">{attempt.quiz_title}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    {relativeTime(attempt.ts)}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-bold ${
                    attempt.score >= 50 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {attempt.score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
