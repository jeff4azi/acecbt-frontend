import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  BookOpen,
  TrendingUp,
  CheckCircle,
  LogIn,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function Profile() {
  const {
    user,
    profile,
    signOut,
    loading: authLoading,
    setProfile,
  } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    quizzes_unlocked: 0,
    quizzes_attempted: 0,
    average_score: 0,
  });

  // Inline name editing
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const inputRef = useRef(null);

  const fullName =
    profile?.full_name ?? user?.user_metadata?.full_name ?? "Student";
  const email = profile?.email ?? user?.email ?? "—";

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const [unlockedRes, historyRes] = await Promise.all([
          api.get("/unlocked").catch(() => ({ data: [] })),
          api.get("/history").catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const unlocked = unlockedRes.data ?? [];
        const history = historyRes.data ?? [];
        const avgScore = history.length
          ? Math.round(
              history.reduce((s, a) => s + a.score, 0) / history.length,
            )
          : 0;
        setStats({
          quizzes_unlocked: unlocked.length,
          quizzes_attempted: history.length,
          average_score: avgScore,
        });
      } catch (err) {
        if (cancelled) return;
        if (err?.response?.status === 401) return;
        console.error("Profile stats error:", err);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  function startEditing() {
    setNameInput(fullName === "Student" ? "" : fullName);
    setSaveError("");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function cancelEditing() {
    setEditing(false);
    setSaveError("");
  }

  async function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setSaveError("Name can't be empty.");
      return;
    }
    if (trimmed === fullName) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const res = await api.patch("/me", { full_name: trimmed });
      // Reflect the change in AuthContext so sidebar + everywhere updates immediately
      if (typeof setProfile === "function") {
        setProfile((prev) => ({ ...prev, full_name: res.data.full_name }));
      }
      setEditing(false);
    } catch (err) {
      setSaveError(err.response?.data?.error ?? "Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <span className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <LogIn size={28} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">
              Sign in to view your profile
            </h2>
            <p className="text-sm text-gray-500">
              Your stats are saved with your account.
            </p>
          </div>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition text-sm"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-xl mx-auto px-4 pt-10 pb-10 space-y-6">
        {/* Profile card */}
        <div className="bg-white rounded-2xl shadow-sm p-7 flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-md">
            {getInitials(fullName)}
          </div>

          {/* Name row — view or edit */}
          <div className="w-full flex flex-col items-center gap-1">
            {editing ? (
              <div className="w-full max-w-xs space-y-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") cancelEditing();
                  }}
                  maxLength={80}
                  placeholder="Your full name"
                  className="w-full text-center text-lg font-bold text-primary-dark px-3 py-2 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {saveError && (
                  <p className="text-xs text-red-500">{saveError}</p>
                )}
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={cancelEditing}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    <X size={14} /> Cancel
                  </button>
                  <button
                    onClick={saveName}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition disabled:opacity-60"
                  >
                    {saving ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-primary-dark">
                  {fullName}
                </h1>
                <button
                  onClick={startEditing}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition"
                  title="Edit name"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
            <p className="text-sm text-gray-500">{email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center gap-1 text-center">
            <div className="w-9 h-9 bg-tint rounded-full flex items-center justify-center mb-1">
              <BookOpen size={16} className="text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary-dark">
              {stats.quizzes_unlocked}
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
              {stats.quizzes_attempted}
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
              {stats.average_score}%
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
          <LogOut size={16} /> Log Out
        </button>
      </div>
    </div>
  );
}
