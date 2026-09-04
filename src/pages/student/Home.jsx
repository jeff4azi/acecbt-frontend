import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Lock,
  Unlock,
  Clock,
  BookOpen,
  ChevronRight,
  Sparkles,
  Zap,
  X,
  TrendingUp,
  Award,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getInitials(name) {
  if (!name) return "👋";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Ad Popup Modal (centered, auto-dismiss after duration_seconds) ───────────

function AdPopup({ ads, onClose }) {
  // Pick one ad at random when the popup first mounts
  const [ad] = useState(() => {
    if (!ads?.length) return null;
    return ads[Math.floor(Math.random() * ads.length)];
  });
  const [timeLeft, setTimeLeft] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!ad) return;
    const total = Math.max(2, Number(ad.duration_seconds));
    setTimeLeft(total);
    const tick = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(tick);
          setVisible(false);
          setTimeout(onClose, 300);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [ad, onClose]);

  if (!ad) return null;
  const hasLink = !!ad.link_url && ad.link_url.trim().length > 0;
  const total = Math.max(2, Number(ad.duration_seconds));
  const progress = ((total - timeLeft) / total) * 100;

  function handleAdClick() {
    if (!hasLink) return;
    window.open(ad.link_url, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/*
        Card: full width up to 420px, never taller than 90dvh (falls back to 90vh).
        flex-col lets the image grow/shrink naturally while the footer stays put.
      */}
      <div
        className={`relative w-full max-w-[420px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          visible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
        style={{ maxHeight: "min(90dvh, 90vh)" }}
      >
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onClose, 300);
          }}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition backdrop-blur-sm"
          aria-label="Close ad"
        >
          <X size={16} />
        </button>

        {/*
          Image section: grows to fill remaining space, never less than 120px,
          never more than 55vh so the footer is always reachable on phone screens.
          object-contain so no cropping — ads display at their natural ratio.
        */}
        <div
          onClick={handleAdClick}
          className={`flex-1 min-h-[120px] overflow-hidden bg-gray-50 ${hasLink ? "cursor-pointer" : ""}`}
          style={{ maxHeight: "55vh" }}
          title={hasLink ? `Opens: ${ad.link_url}` : undefined}
        >
          <img
            src={ad.image_url}
            alt="Sponsored"
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>

        {/* Footer — fixed height, never scrolls off screen */}
        <div className="shrink-0 p-4 pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" />
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                Sponsored
              </span>
            </div>
            <span className="text-xs font-medium text-gray-400">
              Closing in {timeLeft}s
            </span>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-1">
            <div
              className="bg-primary h-1 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          {hasLink ? (
            <a
              href={ad.link_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                window.open(ad.link_url, "_blank", "noopener,noreferrer");
              }}
              className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-2xl text-sm transition shadow-md active:scale-[0.98]"
            >
              Learn more <ChevronRight size={16} />
            </a>
          ) : (
            <button
              onClick={() => {
                setVisible(false);
                setTimeout(onClose, 300);
              }}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-2xl text-sm transition shadow-md active:scale-[0.98]"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Accent colour helper (same logic as Browse page) ────────────────────────

const ACCENTS = [
  { bar: "bg-blue-500", icon: "text-blue-400" },
  { bar: "bg-violet-500", icon: "text-violet-400" },
  { bar: "bg-emerald-500", icon: "text-emerald-400" },
  { bar: "bg-orange-500", icon: "text-orange-400" },
  { bar: "bg-rose-500", icon: "text-rose-400" },
  { bar: "bg-cyan-500", icon: "text-cyan-400" },
];

function accentFor(title = "") {
  let hash = 0;
  for (let i = 0; i < title.length; i++)
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  return ACCENTS[hash % ACCENTS.length];
}

// ─── Quiz Card ────────────────────────────────────────────────────────────────

function QuizCard({ quiz, unlocked }) {
  const accent = accentFor(quiz.title);

  return (
    <Link
      to={`/quiz/${quiz.id}`}
      className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Accent bar */}
      <div className={`h-1 w-full ${accent.bar}`} />

      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Status + pass mark */}
        <div className="flex items-center justify-between gap-2">
          {unlocked ? (
            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">
              <Unlock size={10} strokeWidth={2.5} /> Unlocked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 text-[11px] font-semibold px-2.5 py-1 rounded-full">
              <Lock size={10} strokeWidth={2.5} /> Premium
            </span>
          )}
          <span className="text-xs text-gray-400 font-medium">
            Pass: {quiz.pass_mark ?? 50}%
          </span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {quiz.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed flex-1">
          {quiz.description || "No description available."}
        </p>

        {/* Attempts badge */}
        {(quiz.attempt_count ?? 0) > 0 && (
          <div>
            <span className="inline-flex items-center gap-1 text-[11px] bg-tint text-primary-dark px-2 py-0.5 rounded-lg font-medium">
              <TrendingUp size={11} />
              {quiz.attempt_count} attempts
            </span>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 pt-2.5 border-t border-gray-50 mt-auto">
          <span
            className={`flex items-center gap-1.5 text-xs font-medium ${accent.icon}`}
          >
            <BookOpen size={12} strokeWidth={2} />
            <span className="text-gray-600">
              {quiz.question_limit != null
                ? `${quiz.question_limit} Qs`
                : `${quiz.question_count ?? 0} Qs`}
            </span>
          </span>
          <span
            className={`flex items-center gap-1.5 text-xs font-medium ${accent.icon}`}
          >
            <Clock size={12} strokeWidth={2} />
            <span className="text-gray-600">{quiz.duration_minutes} min</span>
          </span>
          <div className="ml-auto flex items-center gap-1">
            <span className="font-extrabold text-primary text-sm">
              ₦{Number(quiz.price).toLocaleString()}
            </span>
            <ChevronRight
              size={14}
              className="text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Recent Card ──────────────────────────────────────────────────────────────

function RecentCard({ attempt }) {
  return (
    <Link
      to={`/quiz/${attempt.quiz?.id ?? attempt.quiz_id}`}
      className="shrink-0 w-60 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-2 hover:shadow-md transition-shadow active:scale-[0.98] transition-transform"
    >
      <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 min-h-[2.5rem]">
        {attempt.quiz?.title ?? "Quiz"}
      </h3>
      <div className="mt-auto space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Last score</span>
          <span
            className={`font-bold ${
              attempt.score >= (attempt.quiz?.pass_mark ?? 50)
                ? "text-green-600"
                : "text-red-500"
            }`}
          >
            {attempt.score}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              attempt.score >= (attempt.quiz?.pass_mark ?? 50)
                ? "bg-green-500"
                : "bg-accent"
            }`}
            style={{ width: `${attempt.score}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [ads, setAds] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [unlockedIds, setUnlockedIds] = useState(new Set());
  const [recentAttempts, setRecentAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAd, setShowAd] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function load() {
      try {
        const reqs = [];
        reqs.push(api.get("/ads"));
        reqs.push(api.get("/quizzes"));
        if (user) {
          reqs.push(
            api.get("/unlocked").catch(() => ({ data: [] })),
            api.get("/history").catch(() => ({ data: [] })),
          );
        } else {
          reqs.push(
            Promise.resolve({ data: [] }),
            Promise.resolve({ data: [] }),
          );
        }

        const [adsRes, quizzesRes, unlockedRes, historyRes] =
          await Promise.all(reqs);
        if (cancelled) return;

        const activeAds = (adsRes.data ?? []).filter((a) => a.is_active);
        setAds(activeAds);
        setQuizzes(quizzesRes.data ?? []);
        setUnlockedIds(new Set((unlockedRes.data ?? []).map((u) => u.quiz_id)));

        const seen = new Set();
        const recent = [];
        for (const a of historyRes.data ?? []) {
          const qid = a.quiz?.id ?? a.quiz_id;
          if (!seen.has(qid)) {
            seen.add(qid);
            recent.push(a);
            if (recent.length === 4) break;
          }
        }
        setRecentAttempts(recent);

        if (activeAds.length > 0) {
          setTimeout(() => !cancelled && setShowAd(true), 800);
        }
      } catch (err) {
        if (cancelled) return;
        if (err?.response?.status === 401) return;
        console.error("Home load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const unlockedQuizzes = quizzes.filter((q) => unlockedIds.has(q.id));
  const lockedQuizzes = quizzes.filter((q) => !unlockedIds.has(q.id));
  const fullName = user?.user_metadata?.full_name ?? null;
  const displayName = fullName || (user ? "there" : "there");

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tint">
      {/* Ad popup */}
      {showAd && <AdPopup ads={ads} onClose={() => setShowAd(false)} />}

      <div className="max-w-3xl mx-auto px-4 pt-6 pb-10 space-y-8">
        {/* ── Greeting / Header Card ─────────────────────────────────── */}
        <section className="bg-gradient-to-br from-primary to-primary-dark rounded-3xl p-6 text-white shadow-lg overflow-hidden relative">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -right-20 -bottom-20 w-56 h-56 rounded-full bg-accent/30 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl font-bold shrink-0 ring-2 ring-white/30">
              {getInitials(fullName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/70 mb-0.5 flex items-center gap-1">
                <Zap size={12} className="text-amber-300" />
                {greeting()}
              </p>
              <h1 className="text-2xl font-bold leading-tight truncate">
                Hi, {displayName.split(" ")[0]}
              </h1>
              <p className="text-sm text-white/80 mt-1">
                {user
                  ? unlockedQuizzes.length > 0
                    ? `You have ${unlockedQuizzes.length} unlocked quiz${
                        unlockedQuizzes.length !== 1 ? "zes" : ""
                      } — ready to practice?`
                    : "Explore quizzes and start building your skills today."
                  : "Sign in to unlock quizzes and track your progress."}
              </p>
            </div>
          </div>

          {unlockedQuizzes.length > 0 && (
            <div className="relative mt-5 flex gap-3 overflow-x-auto pb-0.5 -mx-1 px-1">
              {unlockedQuizzes.slice(0, 4).map((q) => (
                <Link
                  key={q.id}
                  to={`/quiz/${q.id}`}
                  className="shrink-0 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 transition active:scale-[0.98] max-w-[200px]"
                >
                  <div className="flex items-center gap-1 mb-1">
                    <Unlock size={12} className="text-green-300" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-green-200">
                      Unlocked
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white line-clamp-2 leading-snug">
                    {q.title}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Continue / Recent ──────────────────────────────────────── */}
        {recentAttempts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Award size={15} className="text-primary" />
                </div>
                <h2 className="font-bold text-primary-dark text-base">
                  Continue where you left off
                </h2>
              </div>
              <Link
                to="/history"
                className="flex items-center gap-0.5 text-xs text-primary hover:underline font-medium"
              >
                See all <ChevronRight size={13} />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {recentAttempts.map((a) => (
                <RecentCard key={a.id} attempt={a} />
              ))}
            </div>
          </section>
        )}

        {/* ── My Unlocked Quizzes ────────────────────────────────────── */}
        {user && unlockedQuizzes.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
                  <Unlock size={15} className="text-green-600" />
                </div>
                <h2 className="font-bold text-primary-dark text-base">
                  My Unlocked Quizzes
                </h2>
                <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  {unlockedQuizzes.length}
                </span>
              </div>
            </div>
            {unlockedQuizzes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8 bg-white rounded-2xl border border-dashed border-gray-200">
                No unlocked quizzes yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {unlockedQuizzes.map((quiz) => (
                  <QuizCard key={quiz.id} quiz={quiz} unlocked={true} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Available / All Quizzes ────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center">
                <BookOpen size={15} className="text-accent" />
              </div>
              <h2 className="font-bold text-primary-dark text-base">
                {user && unlockedQuizzes.length > 0
                  ? "More Quizzes"
                  : "Available Quizzes"}
              </h2>
              <span className="text-xs font-semibold bg-accent/15 text-accent-dark px-2 py-0.5 rounded-full">
                {lockedQuizzes.length + (user ? 0 : unlockedQuizzes.length)}
              </span>
            </div>
            <Link
              to="/browse"
              className="flex items-center gap-0.5 text-xs text-primary hover:underline font-medium"
            >
              Browse all <ChevronRight size={13} />
            </Link>
          </div>
          {quizzes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center">
              <BookOpen size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-400">
                No quizzes published yet. Check back soon.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(user && unlockedQuizzes.length > 0
                ? lockedQuizzes
                : quizzes
              ).map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  unlocked={unlockedIds.has(quiz.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
