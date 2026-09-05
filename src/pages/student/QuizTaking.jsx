import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  LogIn,
  X,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Collapsible question navigator ───────────────────────────────────────────
function QuestionNav({ questions, currentIndex, answers, onSelect }) {
  const total = questions.length;
  const answered = Object.keys(answers).filter((id) =>
    questions.some((q) => q.id === id),
  ).length;

  // Collapse by default when there are more than 20 questions
  const [open, setOpen] = useState(total <= 20);

  function handleSelect(i) {
    onSelect(i);
    // Auto-collapse after picking a question (only when there are many)
    if (total > 20) setOpen(false);
  }

  return (
    <div className="flex-1 min-w-0">
      {/* Summary bar — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left"
        aria-expanded={open}
        aria-label="Toggle question navigator"
      >
        <span className="text-xs font-semibold text-gray-500">
          Q{currentIndex + 1}/{total}
        </span>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${(answered / total) * 100}%` }}
          />
        </div>
        <span className="text-[11px] text-gray-400 shrink-0">
          {answered}/{total}
        </span>
        {open ? (
          <ChevronUp size={14} className="text-gray-400 shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-gray-400 shrink-0" />
        )}
      </button>

      {/* Expandable grid */}
      {open && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => handleSelect(i)}
              className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                i === currentIndex
                  ? "bg-primary text-white ring-2 ring-primary/30"
                  : answers[q.id] !== undefined
                    ? "bg-accent text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Session persistence helpers ───────────────────────────────────────────────
// Key is scoped to quiz + user so two users on the same device don't collide.
function sessionKey(quizId, userId) {
  return `quiz_session_${quizId}_${userId}`;
}

function loadSession(quizId, userId) {
  try {
    const raw = sessionStorage.getItem(sessionKey(quizId, userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(quizId, userId, data) {
  try {
    sessionStorage.setItem(sessionKey(quizId, userId), JSON.stringify(data));
  } catch {
    // sessionStorage full or unavailable — fail silently
  }
}

function clearSession(quizId, userId) {
  try {
    sessionStorage.removeItem(sessionKey(quizId, userId));
  } catch {
    // ignore
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function QuizTaking() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showQuit, setShowQuit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassage, setShowPassage] = useState(false);

  // Refs that are always current — safe to read from timer / submit callbacks
  const answersRef = useRef({});
  const timeLeftRef = useRef(null);
  const hasSubmitted = useRef(false);
  const timerRef = useRef(null);
  const quizRef = useRef(null);
  const questionsRef = useRef([]);

  // Keep refs in sync
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);
  useEffect(() => {
    quizRef.current = quiz;
  }, [quiz]);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  // ── Persist answers + currentIndex whenever they change ──────────────────
  useEffect(() => {
    if (!user || !quizId || timeLeft === null) return;
    // Read the existing startedAt and questions from storage so we never overwrite them
    const existing = loadSession(quizId, user.id);
    if (!existing?.startedAt) return; // not initialized yet, load() handles the first write
    saveSession(quizId, user.id, {
      startedAt: existing.startedAt,
      questions: existing.questions, // preserve the cached question subset
      answers,
      currentIndex,
    });
  }, [answers, currentIndex, user, quizId, timeLeft]);

  // ── Load quiz + questions, restore session if available ──────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      try {
        // Check for an existing session first — if there's one with a cached
        // question set, we can skip the /attempt-questions API call entirely
        // so a mid-quiz refresh resumes the exact same question subset.
        const saved = loadSession(quizId, user.id);

        // Always fetch quiz metadata (needed for duration & pass_mark)
        const quizRes = await api.get(`/quizzes/${quizId}`);
        if (cancelled) return;

        const loadedQuiz = quizRes.data;
        const totalSeconds = loadedQuiz.duration_minutes * 60;
        setQuiz(loadedQuiz);

        if (
          saved?.startedAt &&
          Array.isArray(saved.questions) &&
          saved.questions.length > 0
        ) {
          // ── Resume: use cached question subset, not a new random draw ──
          const loadedQuestions = saved.questions;
          setQuestions(loadedQuestions);

          const elapsed = Math.floor((Date.now() - saved.startedAt) / 1000);
          const remaining = totalSeconds - elapsed;

          if (remaining <= 0) {
            // Time ran out while away — restore answers then auto-submit
            const restoredAnswers = saved.answers ?? {};
            answersRef.current = restoredAnswers;
            setAnswers(restoredAnswers);
            setQuestions(loadedQuestions);
            questionsRef.current = loadedQuestions;
            quizRef.current = loadedQuiz;
            setTimeLeft(0);
            timeLeftRef.current = 0;
            if (!cancelled) setLoading(false);
            setTimeout(() => handleSubmit(true), 50);
            return;
          }

          setAnswers(saved.answers ?? {});
          setCurrentIndex(saved.currentIndex ?? 0);
          setTimeLeft(remaining);
        } else {
          // ── Fresh attempt: fetch a new random subset from the server ──
          const questionsRes = await api.get(
            `/quizzes/${quizId}/attempt-questions`,
          );
          if (cancelled) return;

          const loadedQuestions = questionsRes.data;
          setQuestions(loadedQuestions);

          const startedAt = Date.now();
          saveSession(quizId, user.id, {
            startedAt,
            questions: loadedQuestions,
            answers: {},
            currentIndex: 0,
          });
          setTimeLeft(totalSeconds);
        }
      } catch (err) {
        if (cancelled) return;
        if (err?.response?.status === 401) return;
        setError(err.response?.data?.error ?? "Failed to load quiz.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, quizId]);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === null) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        timeLeftRef.current = next;

        if (next <= 0) {
          clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft !== null]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (autoSubmit = false) => {
      if (hasSubmitted.current) return;
      const currentQuiz = quizRef.current;
      if (!currentQuiz) return;

      hasSubmitted.current = true;
      clearInterval(timerRef.current);
      setSubmitting(true);

      // Clear saved session — quiz is done
      if (user) clearSession(quizId, user.id);

      const totalSeconds = currentQuiz.duration_minutes * 60;
      const timeTaken = totalSeconds - (timeLeftRef.current ?? 0);
      const currentAnswers = answersRef.current;
      const currentQuestions = questionsRef.current;

      let correct = 0;
      const breakdown = currentQuestions.map((q) => {
        const selected = currentAnswers[q.id] ?? null;
        const isCorrect = selected === q.correct_option_index;
        if (isCorrect) correct++;
        return {
          question_text: q.question_text,
          question_image_url: q.question_image_url || null,
          options: q.options,
          selected_option: selected,
          correct_option: q.correct_option_index,
          explanation: q.explanation,
        };
      });

      const total = currentQuestions.length;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;

      try {
        await api.post(`/quizzes/${quizId}/attempts`, {
          correct_count: correct,
          wrong_count: total - correct,
          total_questions: total,
          time_taken_seconds: timeTaken,
        });
      } catch (err) {
        if (err?.response?.status !== 401) {
          console.warn(
            "Attempt save failed:",
            err.response?.data?.error ?? err.message,
          );
        }
      }

      navigate(`/quiz/${quizId}/result`, {
        replace: true,
        state: {
          score,
          correct_count: correct,
          wrong_count: total - correct,
          total_questions: total,
          pass_mark: currentQuiz.pass_mark,
          per_question: breakdown,
          auto_submitted: autoSubmit,
          time_taken_seconds: timeTaken,
        },
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [quizId, user],
  );

  function attemptSubmit() {
    setShowConfirm(true);
  }

  function handleQuit() {
    // Stop the timer immediately
    clearInterval(timerRef.current);
    // Wipe the session — no attempt was posted, nothing to clean on the backend
    if (user) clearSession(quizId, user.id);
    // Navigate back to the quiz detail page
    navigate(`/quiz/${quizId}`, { replace: true });
  }

  // ── Render guards ─────────────────────────────────────────────────────────
  if (authLoading || loading) {
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
              Sign in to take this quiz
            </h2>
            <p className="text-sm text-gray-500">
              You need an account to record your attempt and score.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition text-sm"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-full text-gray-500 hover:text-gray-700 text-sm"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error || !quiz || questions.length === 0) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm max-w-sm w-full">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">
            {error || "This quiz has no questions yet."}
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

  const question = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const isUrgent = (timeLeft ?? 0) <= 60;

  return (
    <div className="min-h-screen bg-tint flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
        <QuestionNav
          questions={questions}
          currentIndex={currentIndex}
          answers={answers}
          onSelect={setCurrentIndex}
        />
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`font-mono font-bold text-lg px-3 py-1 rounded-xl ${
              isUrgent
                ? "bg-red-100 text-red-600 animate-pulse"
                : "bg-tint text-primary-dark"
            }`}
          >
            {formatTime(timeLeft ?? 0)}
          </div>
          <button
            onClick={() => setShowQuit(true)}
            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
            title="Quit quiz"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 max-w-xl w-full mx-auto px-4 pt-6 pb-4 flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-2">
            Question {currentIndex + 1} of {questions.length}
          </p>
          {/* Passage button — shown only when this question has a passage */}
          {question.passage && (
            <button
              onClick={() => setShowPassage(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition mb-3"
            >
              <BookOpen size={13} />
              Read Passage
            </button>
          )}
          <p className="text-gray-900 font-semibold text-base leading-relaxed">
            {question.question_text}
          </p>
          {question.question_image_url && (
            <a
              href={question.question_image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 group"
              title="Click to open larger view"
            >
              <img
                src={question.question_image_url}
                alt="Question diagram"
                className="w-full rounded-xl border border-gray-200 max-h-64 object-contain bg-white group-hover:ring-2 group-hover:ring-primary/30 transition"
                loading="lazy"
              />
              <p className="text-[11px] text-gray-400 mt-1 text-right">
                Tap image to open larger
              </p>
            </a>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {(question.options ?? []).map((option, idx) => {
            const selected = answers[question.id] === idx;
            const hasText = !!option.text && option.text.trim().length > 0;
            const hasImage = !!option.image_url;
            return (
              <button
                key={idx}
                onClick={() =>
                  setAnswers((prev) => ({ ...prev, [question.id]: idx }))
                }
                className={`flex items-start gap-3 w-full p-4 rounded-xl border-2 text-left transition ${
                  selected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-gray-200 bg-white hover:border-accent-light text-gray-700"
                }`}
              >
                <span
                  className={`shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    selected
                      ? "bg-primary border-primary text-white"
                      : "border-gray-300 text-gray-400"
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <div className="flex-1 min-w-0 space-y-2">
                  {hasText && (
                    <span className="block text-sm font-medium break-words">
                      {option.text}
                    </span>
                  )}
                  {hasImage && (
                    <a
                      href={option.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="block"
                      title="Click to open larger view"
                    >
                      <img
                        src={option.image_url}
                        alt={`Option ${String.fromCharCode(65 + idx)}`}
                        className={`rounded-lg border border-gray-200 bg-white object-contain hover:ring-2 hover:ring-primary/30 transition ${
                          hasText ? "w-full max-h-52" : "w-full max-h-60"
                        }`}
                        loading="lazy"
                      />
                    </a>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 mt-auto pt-2">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          {isLast ? (
            <button
              onClick={attemptSubmit}
              disabled={submitting}
              className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2"
            >
              {submitting && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Submit Quiz
            </button>
          ) : (
            <button
              onClick={() =>
                setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
              }
              className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 text-sm transition"
            >
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Quit confirmation modal */}
      {showQuit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowQuit(false)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-1.5 w-full bg-linear-to-r from-red-400 to-red-600" />
            <div className="p-6">
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-3">
                  <X size={26} className="text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  Quit this quiz?
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Your progress will be lost and no attempt will be recorded.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowQuit(false)}
                  className="flex-1 border-2 border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 text-sm transition"
                >
                  Keep going
                </button>
                <button
                  onClick={handleQuit}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-sm transition"
                >
                  Quit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-1.5 w-full bg-linear-to-r from-primary to-accent" />
            <div className="p-6">
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                  <AlertTriangle size={26} className="text-amber-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  Submit quiz?
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  This will end your attempt and record your score.
                </p>
              </div>

              {(() => {
                const answered = Object.keys(answersRef.current).length;
                const unanswered = questions.length - answered;
                return (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-tint rounded-xl px-3 py-3 text-center">
                        <p className="text-xl font-bold text-primary">
                          {answered}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Answered
                        </p>
                      </div>
                      <div
                        className={`rounded-xl px-3 py-3 text-center ${unanswered > 0 ? "bg-red-50" : "bg-tint"}`}
                      >
                        <p
                          className={`text-xl font-bold ${unanswered > 0 ? "text-red-500" : "text-primary"}`}
                        >
                          {unanswered}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Skipped
                        </p>
                      </div>
                      <div
                        className={`rounded-xl px-3 py-3 text-center ${isUrgent ? "bg-red-50" : "bg-tint"}`}
                      >
                        <p
                          className={`text-xl font-bold font-mono ${isUrgent ? "text-red-500" : "text-primary-dark"}`}
                        >
                          {formatTime(timeLeft ?? 0)}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Remaining
                        </p>
                      </div>
                    </div>
                    {unanswered > 0 && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4 text-center">
                        Skipped questions will be marked as wrong.
                      </p>
                    )}
                  </>
                );
              })()}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 border-2 border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 text-sm transition"
                >
                  Keep going
                </button>
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    handleSubmit();
                  }}
                  disabled={submitting}
                  className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2"
                >
                  {submitting && (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Passage slide-in panel */}
      {showPassage && question.passage && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPassage(false)}
          />
          <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
            {/* drag handle — mobile only */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-amber-600" />
                <span className="font-bold text-gray-900 text-sm">
                  {question.passage.title ?? "Passage"}
                </span>
              </div>
              <button
                onClick={() => setShowPassage(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>
            {/* Body — scrollable */}
            <div className="overflow-y-auto flex-1 px-5 py-4">
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {question.passage.body}
              </p>
            </div>
            {/* Footer */}
            <div className="shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowPassage(false)}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl text-sm transition"
              >
                Back to Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
