import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChevronRight,
  Check,
  Lock,
  Clock,
  Trophy,
  Zap,
  AlertCircle,
  LogIn,
  X,
  Copy,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { JAMB_SUBJECTS } from "../../lib/jambSubjects";

const SUBJECT_COLORS = {
  English: "bg-blue-500",
  "Agric Science": "bg-green-600",
  Arabic: "bg-teal-600",
  "Fine Art": "bg-pink-500",
  Biology: "bg-emerald-500",
  Chemistry: "bg-purple-500",
  Commerce: "bg-amber-500",
  Computer: "bg-sky-500",
  CRS: "bg-orange-500",
  Economics: "bg-indigo-500",
  French: "bg-blue-600",
  Geography: "bg-lime-600",
  Government: "bg-red-500",
  Hausa: "bg-yellow-600",
  History: "bg-amber-700",
  "Home Econs": "bg-rose-500",
  Igbo: "bg-teal-500",
  IRS: "bg-green-700",
  Literature: "bg-violet-500",
  Maths: "bg-blue-700",
  Music: "bg-fuchsia-500",
  PHE: "bg-orange-600",
  Physics: "bg-cyan-600",
  Accounting: "bg-emerald-600",
  Yoruba: "bg-red-600",
};

// ─── Payment Overlay ──────────────────────────────────────────────────────────

function PaymentOverlay({ quiz, settings, user, onClose, onUnlocked }) {
  const [accessCode, setAccessCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState("");
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  function copyAccount() {
    navigator.clipboard.writeText(settings?.account_number ?? "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function buildWhatsAppLink() {
    if (!settings || !quiz) return "#";
    const msg = `Hello, I have made payment for the "${quiz.title}" quiz (₦${Number(quiz.price).toLocaleString()}). I will attach my receipt.`;
    return `https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(msg)}`;
  }

  async function handleRedeem(e) {
    e.preventDefault();
    if (!accessCode.trim()) return;
    setRedeemError("");
    setRedeemLoading(true);
    try {
      await api.post(`/quizzes/${quiz.id}/redeem`, { code: accessCode.trim() });
      onUnlocked(quiz.id);
    } catch (err) {
      if (err?.response?.status === 401) return;
      setRedeemError(
        err.response?.data?.error ?? "Invalid or already-used code.",
      );
    } finally {
      setRedeemLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="h-1.5 w-full bg-linear-to-r from-primary to-accent" />
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-gray-900 text-base">Unlock Quiz</h2>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                {quiz.title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition shrink-0 ml-2"
            >
              <X size={18} />
            </button>
          </div>

          {/* Price */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3 text-center">
            <span className="text-2xl font-extrabold text-primary">
              ₦{Number(quiz.price).toLocaleString()}
            </span>
          </div>

          {/* Payment details */}
          {settings && (
            <div className="space-y-2 text-sm bg-gray-50 rounded-2xl p-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Bank</span>
                <span className="font-medium text-gray-800">
                  {settings.bank_name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Account No.</span>
                <span className="flex items-center gap-1.5 font-mono font-semibold text-gray-800">
                  {settings.account_number}
                  <button
                    onClick={copyAccount}
                    className="text-primary hover:text-primary-dark"
                  >
                    {copied ? (
                      <Check size={13} className="text-green-500" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="font-medium text-gray-800">
                  {settings.account_name}
                </span>
              </div>
            </div>
          )}

          {settings && (
            <a
              href={buildWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-2xl transition text-sm"
            >
              <ExternalLink size={14} /> I've Paid — Send Proof on WhatsApp
            </a>
          )}

          {/* Code redemption */}
          {user ? (
            <div>
              <p className="text-xs text-gray-400 mb-2 font-medium">
                Have an access code?
              </p>
              {redeemError && (
                <p className="mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
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
                  className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-mono tracking-widest uppercase"
                />
                <button
                  type="submit"
                  disabled={redeemLoading}
                  className="bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition disabled:opacity-60 flex items-center gap-1.5"
                >
                  {redeemLoading && (
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Unlock
                </button>
              </form>
            </div>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-2xl text-sm transition"
            >
              <LogIn size={15} /> Sign in to unlock with a code
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Subject + Year Selector ──────────────────────────────────────────────────

function SubjectSelector({
  label,
  isEnglish,
  selectedSubject,
  selectedQuizId,
  groupedQuizzes,
  unlockedIds,
  onSelectSubject,
  onSelectQuiz,
  settings,
  user,
  onUnlocked,
}) {
  const [showPayment, setShowPayment] = useState(null); // quiz object
  const years =
    selectedSubject && groupedQuizzes[selectedSubject]
      ? groupedQuizzes[selectedSubject]
      : [];
  const allLocked =
    years.length > 0 && years.every((q) => !unlockedIds.has(q.id));

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border-2 transition ${
        selectedQuizId ? "border-primary" : "border-gray-100"
      }`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {selectedQuizId ? (
              <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check size={11} className="text-white" />
              </span>
            ) : (
              <span className="w-5 h-5 rounded-full border-2 border-gray-300" />
            )}
            <span className="text-sm font-semibold text-gray-700">{label}</span>
          </div>
          {isEnglish && (
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Compulsory
            </span>
          )}
        </div>

        {/* Subject selection — only for non-English */}
        {!isEnglish && (
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-1.5">Subject</p>
            <div className="flex flex-wrap gap-1.5">
              {JAMB_SUBJECTS.filter(
                (s) => s !== "English" && groupedQuizzes[s],
              ).map((subj) => (
                <button
                  key={subj}
                  onClick={() => onSelectSubject(subj)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                    selectedSubject === subj
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {subj}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Year / quiz selection */}
        {(isEnglish ? true : !!selectedSubject) && (
          <>
            <p className="text-xs text-gray-400 mb-1.5">Year</p>
            {years.length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                {isEnglish
                  ? "No English JAMB quizzes available yet."
                  : "No quizzes for this subject yet."}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {years.map((quiz) => {
                  const unlocked = unlockedIds.has(quiz.id);
                  const selected = selectedQuizId === quiz.id;
                  return (
                    <button
                      key={quiz.id}
                      onClick={() => {
                        if (!unlocked) {
                          setShowPayment(quiz);
                        } else {
                          onSelectQuiz(quiz.id);
                        }
                      }}
                      className={`relative flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl font-semibold border-2 transition ${
                        selected
                          ? "bg-primary border-primary text-white"
                          : unlocked
                            ? "border-green-200 bg-green-50 text-green-700 hover:border-green-400"
                            : "border-gray-200 bg-gray-50 text-gray-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                      }`}
                    >
                      {unlocked ? (
                        selected ? null : (
                          <Check size={10} className="text-green-500" />
                        )
                      ) : (
                        <Lock size={10} />
                      )}
                      {quiz.jamb_year ?? "—"}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment overlay */}
      {showPayment && (
        <PaymentOverlay
          quiz={showPayment}
          settings={settings}
          user={user}
          onClose={() => setShowPayment(null)}
          onUnlocked={(quizId) => {
            onUnlocked(quizId);
            onSelectQuiz(quizId);
            setShowPayment(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JambSubjectPicker() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [groupedQuizzes, setGroupedQuizzes] = useState({});
  const [unlockedIds, setUnlockedIds] = useState(new Set());
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Duration — user selects in minutes, max 120
  const [durationMinutes, setDurationMinutes] = useState(120);

  // English — just pick year (subject is fixed)
  const [englishQuizId, setEnglishQuizId] = useState(null);

  // Subjects 2–4
  const [subs, setSubs] = useState([
    { subject: "", quizId: null },
    { subject: "", quizId: null },
    { subject: "", quizId: null },
  ]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function load() {
      try {
        const reqs = [api.get("/jamb/quizzes"), api.get("/settings")];
        if (user) {
          reqs.push(api.get("/unlocked").catch(() => ({ data: [] })));
        }
        const results = await Promise.all(reqs);
        if (cancelled) return;

        const grouped = results[0].data ?? {};
        setGroupedQuizzes(grouped);
        setSettings(results[1].data);

        if (user) {
          setUnlockedIds(
            new Set((results[2]?.data ?? []).map((u) => u.quiz_id)),
          );
        }

        // Auto-select english year if only one is available
        const englishYears = grouped["English"] ?? [];
        if (englishYears.length === 1 && user) {
          // only auto-select if unlocked
        }
      } catch (err) {
        if (cancelled) return;
        if (err?.response?.status === 401) return;
        setError("Failed to load JAMB quizzes. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  function setSubSubject(idx, subject) {
    setSubs((prev) => {
      const next = [...prev];
      next[idx] = { subject, quizId: null };
      return next;
    });
  }

  function setSubQuizId(idx, quizId) {
    setSubs((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], quizId };
      return next;
    });
  }

  function handleUnlocked(quizId) {
    setUnlockedIds((prev) => new Set([...prev, quizId]));
  }

  // Validate: all 4 must be set, no duplicate subjects
  const selectedSubjects = [
    "English",
    ...subs.map((s) => s.subject).filter(Boolean),
  ];
  const hasDuplicateSubject =
    new Set(selectedSubjects).size !== selectedSubjects.length;

  const isReady =
    !!englishQuizId && subs.every((s) => !!s.quizId) && !hasDuplicateSubject;

  // Total questions and estimated time info
  const totalQuestions = 180; // 60 + 40 + 40 + 40

  function handleStart() {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!isReady) return;

    const params = {
      english: englishQuizId,
      s2: subs[0].quizId,
      s3: subs[1].quizId,
      s4: subs[2].quizId,
      duration: durationMinutes * 60,
      subjects: [
        { key: "english", subject: "English", quizId: englishQuizId },
        { key: "subject2", subject: subs[0].subject, quizId: subs[0].quizId },
        { key: "subject3", subject: subs[1].subject, quizId: subs[1].quizId },
        { key: "subject4", subject: subs[2].subject, quizId: subs[2].quizId },
      ],
    };

    navigate("/jamb/take", { state: params });
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm max-w-sm w-full">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-12 space-y-6">
        {/* Header */}
        <div className="bg-linear-to-br from-primary to-primary-dark rounded-3xl p-6 text-white shadow-lg overflow-hidden relative">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-accent/25 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Zap size={18} className="text-amber-300" />
              </div>
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider">
                JAMB Exam Mode
              </span>
            </div>
            <h1 className="text-2xl font-extrabold leading-tight mb-1">
              Pick Your Subjects
            </h1>
            <p className="text-sm text-white/80">
              English is compulsory. Choose 3 more subjects and pick a year for
              each.
            </p>
            <div className="flex items-center gap-4 mt-4 text-xs text-white/70">
              <span className="flex items-center gap-1">
                <BookOpen size={12} />
                {totalQuestions} questions
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                Up to 2 hours
              </span>
              <span className="flex items-center gap-1">
                <Trophy size={12} />
                Score /400
              </span>
            </div>
          </div>
        </div>

        {/* Subject selectors */}
        <div className="space-y-4">
          {/* English — compulsory */}
          <SubjectSelector
            label="Subject 1 — English Language"
            isEnglish
            selectedSubject="English"
            selectedQuizId={englishQuizId}
            groupedQuizzes={groupedQuizzes}
            unlockedIds={unlockedIds}
            onSelectSubject={() => {}}
            onSelectQuiz={setEnglishQuizId}
            settings={settings}
            user={user}
            onUnlocked={handleUnlocked}
          />

          {/* Subjects 2, 3, 4 */}
          {subs.map((sub, idx) => (
            <SubjectSelector
              key={idx}
              label={`Subject ${idx + 2}`}
              isEnglish={false}
              selectedSubject={sub.subject}
              selectedQuizId={sub.quizId}
              groupedQuizzes={groupedQuizzes}
              unlockedIds={unlockedIds}
              onSelectSubject={(s) => setSubSubject(idx, s)}
              onSelectQuiz={(id) => setSubQuizId(idx, id)}
              settings={settings}
              user={user}
              onUnlocked={handleUnlocked}
            />
          ))}
        </div>

        {/* Duplicate subject warning */}
        {hasDuplicateSubject && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800">
            <AlertCircle size={16} className="text-amber-500 shrink-0" />
            You've selected the same subject more than once.
          </div>
        )}

        {/* Duration picker */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-primary" />
              <span className="text-sm font-semibold text-gray-800">
                Exam Duration
              </span>
            </div>
            <span className="text-sm font-bold text-primary">
              {durationMinutes} min
            </span>
          </div>
          <input
            type="range"
            min={30}
            max={120}
            step={15}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[11px] text-gray-400 mt-1">
            <span>30 min</span>
            <span>1 hr</span>
            <span>1.5 hrs</span>
            <span>2 hrs (max)</span>
          </div>
        </div>

        {/* Summary + Start */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-gray-800 text-sm">Summary</h3>
          <div className="space-y-2 text-sm">
            {[
              { label: "English", quizId: englishQuizId, subject: "English" },
              ...subs.map((s, i) => ({
                label: `Subject ${i + 2}`,
                quizId: s.quizId,
                subject: s.subject,
              })),
            ].map(({ label, quizId, subject }, i) => {
              const quiz = quizId
                ? (groupedQuizzes[subject] ?? []).find((q) => q.id === quizId)
                : null;
              return (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-gray-500">{label}</span>
                  {quiz ? (
                    <span className="font-semibold text-gray-800">
                      {subject} {quiz.jamb_year}
                    </span>
                  ) : (
                    <span className="text-gray-300 italic text-xs">
                      Not selected
                    </span>
                  )}
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-gray-500">Duration</span>
              <span className="font-semibold text-gray-800">
                {durationMinutes} min
              </span>
            </div>
          </div>

          {!user ? (
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-base transition shadow-md"
            >
              <LogIn size={18} /> Sign in to Start
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={!isReady}
              className="w-full bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-base transition shadow-md"
            >
              Start Exam <ChevronRight size={18} />
            </button>
          )}

          {/* Leaderboard link */}
          <button
            onClick={() => navigate("/jamb/leaderboard")}
            className="w-full flex items-center justify-center gap-2 text-primary hover:text-primary-dark text-sm font-medium py-2"
          >
            <Trophy size={15} /> View JAMB Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}
