import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Clock,
  Copy,
  Check,
  ExternalLink,
  Trophy,
  Play,
  AlertCircle,
  LogIn,
  BookOpen,
  TrendingUp,
  Target,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";

function useCopyToClipboard(text, timeout = 2000) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    });
  }
  return { copied, copy };
}

// Clear any stale quiz session from a previous attempt so the next
// "Start Quiz" click always generates a fresh random subset.
function clearQuizSession(quizId, userId) {
  try {
    sessionStorage.removeItem(`quiz_session_${quizId}_${userId}`);
  } catch {
    // ignore
  }
}

export default function QuizDetail() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [accessCode, setAccessCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState("");

  const { copied, copy } = useCopyToClipboard(settings?.account_number ?? "");

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function load() {
      try {
        const unlockedReq = user
          ? api
              .get(`/unlocked/${quizId}`)
              .catch(() => ({ data: { unlocked: false } }))
          : Promise.resolve({ data: { unlocked: false } });

        const [quizRes, settingsRes, unlockedRes] = await Promise.all([
          api.get(`/quizzes/${quizId}`),
          api.get("/settings"),
          unlockedReq,
        ]);
        if (cancelled) return;
        setQuiz(quizRes.data);
        setSettings(settingsRes.data);
        setIsUnlocked(unlockedRes.data?.unlocked ?? false);
      } catch (err) {
        if (cancelled) return;
        if (err?.response?.status === 401) return;
        setError("Failed to load quiz details. Please try again.");
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, quizId]);

  async function handleRedeem(e) {
    e.preventDefault();
    if (!accessCode.trim()) return;
    setRedeemError("");
    setRedeemLoading(true);
    try {
      await api.post(`/quizzes/${quizId}/redeem`, { code: accessCode.trim() });
      setIsUnlocked(true);
    } catch (err) {
      if (err?.response?.status === 401) {
        /* session termination handled by interceptor */
        return;
      }
      setRedeemError(
        err.response?.data?.error ?? "Invalid or already-used code.",
      );
    } finally {
      setRedeemLoading(false);
    }
  }

  function buildWhatsAppLink() {
    if (!settings || !quiz) return "#";
    const msg = `Hello, I have made payment for the "${quiz.title}" quiz (₦${Number(quiz.price).toLocaleString()}). I have made payment for this quiz and will attach my receipt.`;
    return `https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(msg)}`;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <span className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm max-w-sm w-full">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">
            {error || "Quiz not found."}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-xl mx-auto px-4 pt-8 pb-10 space-y-5">
        {/* Quiz header */}
        <div className="bg-gradient-to-br from-primary to-primary-dark rounded-3xl p-6 text-white shadow-lg overflow-hidden relative">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-10 -bottom-16 w-52 h-52 rounded-full bg-accent/25 blur-3xl" />
          <div className="relative">
            <div className="flex items-start justify-between mb-4 gap-3">
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider pt-1">
                Ace Edu CBT
              </span>
              {!isUnlocked && (
                <span className="text-xl font-extrabold bg-white/15 backdrop-blur-sm px-3 py-1 rounded-xl border border-white/20 shrink-0">
                  ₦{Number(quiz.price).toLocaleString()}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold leading-tight mb-2">
              {quiz.title}
            </h1>
            {quiz.description && (
              <p className="text-sm text-white/80 leading-relaxed mb-5">
                {quiz.description}
              </p>
            )}
            {/* Stats grid - attempt count front & centre for buyers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-3 border border-white/20 ring-2 ring-accent/50">
                <div className="flex items-center gap-1.5 text-[11px] text-white/80 font-semibold mb-0.5">
                  <TrendingUp size={11} className="text-green-300" />
                  Attempts
                </div>
                <div className="text-lg font-extrabold text-white">
                  {Number(quiz.attempt_count ?? 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-white/70 mt-0.5">
                  people already took it
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-3 py-3 border border-white/15">
                <div className="flex items-center gap-1.5 text-[11px] text-white/80 font-semibold mb-0.5">
                  <BookOpen size={11} className="text-sky-300" />
                  Questions
                </div>
                <div className="text-lg font-extrabold text-white">
                  {quiz.question_limit != null
                    ? quiz.question_limit
                    : (quiz.question_count ?? 0)}
                </div>
                <div className="text-[10px] text-white/70 mt-0.5">
                  {quiz.question_limit != null
                    ? "per attempt"
                    : "multiple choice"}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-3 py-3 border border-white/15">
                <div className="flex items-center gap-1.5 text-[11px] text-white/80 font-semibold mb-0.5">
                  <Clock size={11} className="text-amber-300" />
                  Duration
                </div>
                <div className="text-lg font-extrabold text-white">
                  {quiz.duration_minutes}
                  <span className="text-xs font-semibold text-white/70 ml-0.5">
                    min
                  </span>
                </div>
                <div className="text-[10px] text-white/70 mt-0.5">
                  time limit
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-3 py-3 border border-white/15">
                <div className="flex items-center gap-1.5 text-[11px] text-white/80 font-semibold mb-0.5">
                  <Target size={11} className="text-pink-300" />
                  Pass mark
                </div>
                <div className="text-lg font-extrabold text-white">
                  {quiz.pass_mark}
                  <span className="text-xs font-semibold text-white/70 ml-0.5">
                    %
                  </span>
                </div>
                <div className="text-[10px] text-white/70 mt-0.5">
                  score to pass
                </div>
              </div>
            </div>
          </div>
        </div>

        {isUnlocked ? (
          /* ── Unlocked state ── */
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-7 h-7 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 11V7a4 4 0 018 0v4M5 11h14a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7a1 1 0 011-1z"
                  />
                </svg>
              </div>
              <p className="font-semibold text-green-800 text-sm">
                You have access to this quiz
              </p>
            </div>
            <button
              onClick={() => {
                // Clear any stale session so a fresh random subset is generated
                if (user) clearQuizSession(quizId, user.id);
                navigate(`/quiz/${quizId}/take`);
              }}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-base transition shadow-md"
            >
              <Play size={18} /> Start Quiz
            </button>
            <button
              onClick={() => navigate(`/quiz/${quizId}/leaderboard`)}
              className="w-full bg-white hover:bg-tint text-primary border-2 border-primary font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition"
            >
              <Trophy size={16} /> View Leaderboard
            </button>
          </div>
        ) : (
          /* ── Locked state ── */
          <div className="space-y-4">
            {!user ? (
              <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-primary/20 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <LogIn size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-gray-800 text-sm mb-0.5">
                    Sign in to unlock with an access code
                  </h2>
                  <p className="text-xs text-gray-500">
                    Or pay via the details below and request access.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/login")}
                  className="bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-2 rounded-xl text-sm transition shrink-0"
                >
                  Sign In
                </button>
              </div>
            ) : null}

            {settings && (
              <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
                <h2 className="font-bold text-gray-800">Payment Details</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bank</span>
                    <span className="font-medium text-gray-800">
                      {settings.bank_name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Account Number</span>
                    <span className="flex items-center gap-2 font-medium text-gray-800">
                      {settings.account_number}
                      <button
                        onClick={copy}
                        className="text-primary hover:text-primary-dark transition"
                        title="Copy"
                      >
                        {copied ? (
                          <Check size={15} className="text-green-500" />
                        ) : (
                          <Copy size={15} />
                        )}
                      </button>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account Name</span>
                    <span className="font-medium text-gray-800">
                      {settings.account_name}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-100">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-bold text-primary text-base">
                      ₦{Number(quiz.price).toLocaleString()}
                    </span>
                  </div>
                </div>
                <a
                  href={buildWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition text-sm"
                >
                  <ExternalLink size={15} /> I've Paid — Send Proof on WhatsApp
                </a>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-1">
                Have an access code?
              </h2>
              <p className="text-xs text-gray-400 mb-3">Format: ACE-XXXXXX</p>
              {redeemError && (
                <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {redeemError}
                </p>
              )}
              <form onSubmit={handleRedeem} className="flex gap-2">
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="ACE-XXXXXX"
                  maxLength={10}
                  disabled={!user}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-accent-light focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-mono tracking-widest uppercase disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={redeemLoading || !user}
                  className="bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition disabled:opacity-60 flex items-center gap-1.5"
                >
                  {redeemLoading && (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Unlock
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
