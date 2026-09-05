import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  LogIn,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  if (h > 0) return `${h}:${m}:${s}`;
  return `${m}:${s}`;
}

// ── Session persistence ───────────────────────────────────────────────────────

function sessionKey(userId, paramHash) {
  return `jamb_session_${userId}_${paramHash}`;
}

function hashParams(params) {
  // A simple hash so resuming only works for the same selection
  return [
    params.english,
    params.s2,
    params.s3,
    params.s4,
    params.duration,
  ].join("_");
}

function loadSession(userId, paramHash) {
  try {
    const raw = sessionStorage.getItem(sessionKey(userId, paramHash));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(userId, paramHash, data) {
  try {
    sessionStorage.setItem(sessionKey(userId, paramHash), JSON.stringify(data));
  } catch {}
}

function clearSession(userId, paramHash) {
  try {
    sessionStorage.removeItem(sessionKey(userId, paramHash));
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────

export default function JambExam() {
  const navigate = useNavigate();
  const { state: params } = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // subjectData: { key, subject, quizId, questions[] }[]
  const [subjectData, setSubjectData] = useState([]);
  const [activeSubjectIdx, setActiveSubjectIdx] = useState(0);

  // answers: { [questionId]: optionIndex }
  const [answers, setAnswers] = useState({});
  // currentIndexPerSubject: { [key]: number }
  const [currentIndexPerSubject, setCurrentIndexPerSubject] = useState({});

  const [timeLeft, setTimeLeft] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showQuit, setShowQuit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const answersRef = useRef({});
  const timeLeftRef = useRef(null);
  const hasSubmitted = useRef(false);
  const timerRef = useRef(null);
  const subjectDataRef = useRef([]);
  const paramsRef = useRef(params);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);
  useEffect(() => {
    subjectDataRef.current = subjectData;
  }, [subjectData]);

  // Persist session on every answer/index change
  useEffect(() => {
    if (!user || !params || timeLeft === null) return;
    const ph = hashParams(params);
    const existing = loadSession(user.id, ph);
    if (!existing?.startedAt) return;
    saveSession(user.id, ph, {
      startedAt: existing.startedAt,
      subjectData: existing.subjectData,
      answers,
      currentIndexPerSubject,
    });
  }, [answers, currentIndexPerSubject, user, params, timeLeft]);

  // ── Load questions ────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    if (!params?.english || !params?.s2 || !params?.s3 || !params?.s4) {
      setError("Invalid exam configuration. Please go back and try again.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      const ph = hashParams(params);
      const saved = loadSession(user.id, ph);

      try {
        if (
          saved?.startedAt &&
          Array.isArray(saved.subjectData) &&
          saved.subjectData.length === 4
        ) {
          // Resume
          const elapsed = Math.floor((Date.now() - saved.startedAt) / 1000);
          const remaining = params.duration - elapsed;

          if (remaining <= 0) {
            // Time expired while away — restore and auto-submit
            const restoredAnswers = saved.answers ?? {};
            answersRef.current = restoredAnswers;
            subjectDataRef.current = saved.subjectData;
            if (!cancelled) {
              setSubjectData(saved.subjectData);
              setAnswers(restoredAnswers);
              setCurrentIndexPerSubject(saved.currentIndexPerSubject ?? {});
              setTimeLeft(0);
              setLoading(false);
            }
            setTimeout(() => handleSubmit(true), 50);
            return;
          }

          if (!cancelled) {
            setSubjectData(saved.subjectData);
            setAnswers(saved.answers ?? {});
            setCurrentIndexPerSubject(saved.currentIndexPerSubject ?? {});
            setTimeLeft(remaining);
            setLoading(false);
          }
          return;
        }

        // Fresh — fetch questions
        const res = await api.get(
          `/jamb/questions?english=${params.english}&s2=${params.s2}&s3=${params.s3}&s4=${params.s4}`,
        );
        if (cancelled) return;

        const data = res.data;
        const ordered = [
          {
            key: "english",
            subject: data.english?.subject ?? "English",
            year: data.english?.year ?? "",
            quizId: data.english?.quizId,
            questions: data.english?.questions ?? [],
          },
          {
            key: "subject2",
            subject: data.subject2?.subject ?? "",
            year: data.subject2?.year ?? "",
            quizId: data.subject2?.quizId,
            questions: data.subject2?.questions ?? [],
          },
          {
            key: "subject3",
            subject: data.subject3?.subject ?? "",
            year: data.subject3?.year ?? "",
            quizId: data.subject3?.quizId,
            questions: data.subject3?.questions ?? [],
          },
          {
            key: "subject4",
            subject: data.subject4?.subject ?? "",
            year: data.subject4?.year ?? "",
            quizId: data.subject4?.quizId,
            questions: data.subject4?.questions ?? [],
          },
        ];

        const startedAt = Date.now();
        saveSession(user.id, ph, {
          startedAt,
          subjectData: ordered,
          answers: {},
          currentIndexPerSubject: {},
        });

        setSubjectData(ordered);
        setTimeLeft(params.duration);
      } catch (err) {
        if (cancelled) return;
        if (err?.response?.status === 401) return;
        if (err?.response?.status === 403) {
          setError(
            "One or more quizzes are not unlocked. Please go back and unlock them first.",
          );
        } else {
          setError(
            err.response?.data?.error ?? "Failed to load exam questions.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // ── Countdown ─────────────────────────────────────────────────────────────
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
      hasSubmitted.current = true;
      clearInterval(timerRef.current);
      setSubmitting(true);

      const currentParams = paramsRef.current;
      if (user && currentParams) {
        clearSession(user.id, hashParams(currentParams));
      }

      const timeTaken =
        (currentParams?.duration ?? 7200) - (timeLeftRef.current ?? 0);
      const currentAnswers = answersRef.current;
      const currentSubjectData = subjectDataRef.current;

      // Build per-subject breakdown
      const subjectResults = {};
      for (const sd of currentSubjectData) {
        let correct = 0;
        const breakdown = sd.questions.map((q) => {
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
        subjectResults[sd.key] = {
          correct,
          total: sd.questions.length,
          breakdown,
        };
      }

      // Save attempt to backend
      try {
        await api.post("/jamb/attempts", {
          englishQuizId: currentParams.english,
          subject2QuizId: currentParams.s2,
          subject3QuizId: currentParams.s3,
          subject4QuizId: currentParams.s4,
          timeTakenSeconds: timeTaken,
          subjects: subjectResults,
        });
      } catch (err) {
        if (err?.response?.status !== 401) {
          console.warn(
            "JAMB attempt save failed:",
            err.response?.data?.error ?? err.message,
          );
        }
      }

      // Build result state for the result page
      const subjectBreakdown = currentSubjectData.map((sd) => {
        const res = subjectResults[sd.key];
        const score = res.total
          ? Math.min(100, Math.round((res.correct / res.total) * 100))
          : 0;
        return {
          key: sd.key,
          subject: sd.subject,
          year: sd.year,
          score,
          correct: res.correct,
          total: res.total,
          breakdown: res.breakdown,
        };
      });

      const totalScore = subjectBreakdown.reduce((a, b) => a + b.score, 0);

      navigate("/jamb/result", {
        replace: true,
        state: {
          totalScore,
          subjectBreakdown,
          timeTakenSeconds: timeTaken,
          autoSubmitted: autoSubmit,
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, navigate],
  );

  function handleQuit() {
    clearInterval(timerRef.current);
    if (user && params) clearSession(user.id, hashParams(params));
    navigate("/jamb", { replace: true });
  }

  // ── Render guards ─────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <div className="text-center space-y-3">
          <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin block mx-auto" />
          <p className="text-sm text-gray-500">Loading exam questions…</p>
        </div>
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
              Sign in to take this exam
            </h2>
            <p className="text-sm text-gray-500">
              You need an account to start a JAMB practice session.
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

  if (error) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm max-w-sm w-full">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">{error}</p>
          <button
            onClick={() => navigate("/jamb", { replace: true })}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (subjectData.length === 0) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm max-w-sm w-full">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">No questions available.</p>
          <button
            onClick={() => navigate("/jamb", { replace: true })}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const activeSub = subjectData[activeSubjectIdx];
  const currentIdx = currentIndexPerSubject[activeSub.key] ?? 0;
  const question = activeSub.questions[currentIdx];
  const isUrgent = (timeLeft ?? 0) <= 120; // last 2 min
  const totalAnswered = Object.keys(answers).length;
  const totalQuestions = subjectData.reduce(
    (a, s) => a + s.questions.length,
    0,
  );

  function answeredInSubject(key) {
    const sd = subjectData.find((s) => s.key === key);
    if (!sd) return 0;
    return sd.questions.filter((q) => answers[q.id] !== undefined).length;
  }

  function setCurrentIdx(idx) {
    setCurrentIndexPerSubject((prev) => ({
      ...prev,
      [activeSub.key]: idx,
    }));
  }

  return (
    <div className="min-h-screen bg-tint flex flex-col">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        {/* Subject tabs */}
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {subjectData.map((sd, i) => {
            const answered = answeredInSubject(sd.key);
            const total = sd.questions.length;
            const isActive = i === activeSubjectIdx;
            return (
              <button
                key={sd.key}
                onClick={() => setActiveSubjectIdx(i)}
                className={`flex-1 min-w-20 px-3 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="block">{sd.subject}</span>
                <span
                  className={`block text-[10px] mt-0.5 ${
                    isActive ? "text-primary/70" : "text-gray-400"
                  }`}
                >
                  {answered}/{total}
                </span>
              </button>
            );
          })}
        </div>

        {/* Question navigator + timer */}
        <div className="px-3 py-2 flex items-center gap-3">
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {activeSub.questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(i)}
                className={`w-6 h-6 rounded-md text-[10px] font-bold transition ${
                  i === currentIdx
                    ? "bg-primary text-white"
                    : answers[q.id] !== undefined
                      ? "bg-accent text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`font-mono font-bold text-base px-3 py-1 rounded-xl ${
                isUrgent
                  ? "bg-red-100 text-red-600 animate-pulse"
                  : "bg-tint text-primary-dark"
              }`}
            >
              {formatTime(timeLeft ?? 0)}
            </div>
            <button
              onClick={() => setShowQuit(true)}
              className="p-1.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
              title="Quit exam"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Question body ── */}
      <div className="flex-1 max-w-xl w-full mx-auto px-4 pt-5 pb-4 flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-1">
            {activeSub.subject} {activeSub.year} — Q{currentIdx + 1} of{" "}
            {activeSub.questions.length}
          </p>
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

        {/* Options */}
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
                    <span className="block text-sm font-medium wrap-break-word">
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

        {/* Prev / Next / Submit */}
        <div className="flex items-center gap-3 mt-auto pt-2">
          <button
            onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
            disabled={currentIdx === 0}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition"
          >
            <ChevronLeft size={16} /> Prev
          </button>

          {currentIdx < activeSub.questions.length - 1 ? (
            <button
              onClick={() =>
                setCurrentIdx(
                  Math.min(activeSub.questions.length - 1, currentIdx + 1),
                )
              }
              className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 text-sm transition"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : activeSubjectIdx < subjectData.length - 1 ? (
            <button
              onClick={() => setActiveSubjectIdx((i) => i + 1)}
              className="flex-1 bg-accent hover:bg-accent-dark text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 text-sm transition"
            >
              Next Subject <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={submitting}
              className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2"
            >
              {submitting && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Submit Exam
            </button>
          )}
        </div>
      </div>

      {/* Quit modal */}
      {showQuit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowQuit(false)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-1.5 w-full bg-linear-to-r from-red-400 to-red-600" />
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <X size={26} className="text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Quit exam?</h2>
              <p className="text-sm text-gray-500 mt-1 mb-5">
                Your progress will be lost and no attempt will be recorded.
              </p>
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
                  Submit exam?
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  This will end your session and record your score.
                </p>
              </div>

              {/* Per-subject summary */}
              <div className="space-y-1.5 mb-4">
                {subjectData.map((sd) => {
                  const total = sd.questions.length;
                  const answered = sd.questions.filter(
                    (q) => answers[q.id] !== undefined,
                  ).length;
                  const unanswered = total - answered;
                  return (
                    <div
                      key={sd.key}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-gray-500 font-medium">
                        {sd.subject}
                      </span>
                      <span
                        className={
                          unanswered > 0
                            ? "text-amber-600 font-semibold"
                            : "text-green-600 font-semibold"
                        }
                      >
                        {answered}/{total} answered
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                  <span className="text-gray-500 font-medium">Total</span>
                  <span className="font-bold text-gray-800">
                    {totalAnswered}/{totalQuestions}
                  </span>
                </div>
              </div>

              {totalAnswered < totalQuestions && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4 text-center">
                  Unanswered questions will be marked wrong.
                </p>
              )}

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
    </div>
  );
}
