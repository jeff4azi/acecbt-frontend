import { useNavigate } from "react-router-dom";
import { LogOut, BookOpen, TrendingUp, CheckCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// ─── Mock stats (replace with real data later) ────────────────────────────────
const MOCK_STATS = {
  quizzes_unlocked: 3,
  quizzes_attempted: 6,
  average_score: 63,
};

// ─── Derive initials from name or email ──────────────────────────────────────
function getInitials(nameOrEmail) {
  if (!nameOrEmail) return "?";
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nameOrEmail.slice(0, 2).toUpperCase();
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Real email from auth; full_name mocked until profiles are fetched
  const email = user?.email ?? "—";
  const fullName = user?.user_metadata?.full_name ?? "Student";

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-xl mx-auto px-4 pt-10 pb-10 space-y-6">
        {/* Avatar + info */}
        <div className="bg-white rounded-2xl shadow-sm p-7 flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-md">
            {getInitials(fullName)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary-dark">{fullName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{email}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center gap-1 text-center">
            <div className="w-9 h-9 bg-tint rounded-full flex items-center justify-center mb-1">
              <BookOpen size={16} className="text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary-dark">
              {MOCK_STATS.quizzes_unlocked}
            </p>
            <p className="text-xs text-gray-500 leading-tight">
              Quizzes
              <br />
              Unlocked
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center gap-1 text-center">
            <div className="w-9 h-9 bg-tint rounded-full flex items-center justify-center mb-1">
              <CheckCircle size={16} className="text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary-dark">
              {MOCK_STATS.quizzes_attempted}
            </p>
            <p className="text-xs text-gray-500 leading-tight">
              Attempts
              <br />
              Made
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center gap-1 text-center">
            <div className="w-9 h-9 bg-tint rounded-full flex items-center justify-center mb-1">
              <TrendingUp size={16} className="text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary-dark">
              {MOCK_STATS.average_score}%
            </p>
            <p className="text-xs text-gray-500 leading-tight">
              Average
              <br />
              Score
            </p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 border border-red-200 text-red-600 font-semibold py-3.5 rounded-2xl transition shadow-sm"
        >
          <LogOut size={16} />
          Log Out
        </button>
      </div>
    </div>
  );
}
