import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  LogIn,
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

export default function QuizTaking() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: optionIndex }
  const [timeLeft, setTimeLeft] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const hasSubmitted = useRef(false);
  const timerRef = useRef(null);

  // Load quiz + questions
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      try {
        const [quizRes, questionsRes] = await Promise.all([
          api.get(`/quizzes/${quizId}`),
          api.get(`/quizzes/${quizId}/questions`),
        ]);
        if (cancelled) return;
        setQuiz(quizRes.data);
        setQuestions(questionsRes.data);
        setTimeLeft(quizRes.data.duration_minutes * 60);
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
  }, [authLoading, user, quizId]);

  // Start countdown once timeLeft is set
  useEffect(() => {
    if (timeLeft === null) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft !== null]);

  async function handleSubmit(autoSubmit = false) {
    if (hasSubmitted.current || !quiz) return;
    hasSubmitted.current = true;
    clearInterval(timerRef.current);
    setSubmitting(true);

    const totalSeconds = quiz.duration_minutes * 60;
    const timeTaken = totalSeconds - (timeLeft ?? 0);

    let correct = 0;
    const breakdown = questions.map((q) => {
      const selected = answers[q.id] ?? null;
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

    const total = questions.length;
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
        pass_mark: quiz.pass_mark,
        per_question: breakdown,
        auto_submitted: autoSubmit,
        time_taken_seconds: timeTaken,
      },
    });
  }

  function attemptSubmit() {
    const unanswered = questions.length - Object.keys(answers).length;
    if (unanswered > 0) setShowConfirm(true);
    else handleSubmit();
  }

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
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1.5">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                i === currentIndex
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
        <div
          className={`shrink-0 font-mono font-bold text-lg px-3 py-1 rounded-xl ${
            isUrgent
              ? "bg-red-100 text-red-600 animate-pulse"
              : "bg-tint text-primary-dark"
          }`}
        >
          {formatTime(timeLeft ?? 0)}
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 max-w-xl w-full mx-auto px-4 pt-6 pb-4 flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-2">
            Question {currentIndex + 1} of {questions.length}
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
                          hasText
                            ? "w-full max-h-52"
                            : "w-full max-h-60"
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

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-amber-500" />
              </div>
              <h2 className="font-bold text-gray-900">Submit anyway?</h2>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              You have {questions.length - Object.keys(answers).length}{" "}
              unanswered question(s). They will be marked wrong.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 text-sm transition"
              >
                Go back
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  handleSubmit();
                }}
                className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl text-sm transition"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
