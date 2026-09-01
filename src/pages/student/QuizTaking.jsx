import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_DURATION_SECONDS = 15 * 60; // 15 minutes

const MOCK_QUESTIONS = [
  {
    id: 1,
    question_text: "If 2x + 5 = 13, what is the value of x?",
    question_image_url: null,
    options: [
      { text: "3", image_url: null },
      { text: "4", image_url: null },
      { text: "6", image_url: null },
      { text: "8", image_url: null },
    ],
    correct_option_index: 1, // used only at submit time
    explanation: "Subtract 5 from both sides: 2x = 8, then divide by 2: x = 4.",
  },
  {
    id: 2,
    question_text: "Simplify: (3² + 4²)",
    question_image_url: null,
    options: [
      { text: "25", image_url: null },
      { text: "49", image_url: null },
      { text: "7", image_url: null },
      { text: "12", image_url: null },
    ],
    correct_option_index: 0,
    explanation: "3² = 9 and 4² = 16. 9 + 16 = 25.",
  },
  {
    id: 3,
    question_text:
      "A train travels 120 km in 2 hours. What is its average speed?",
    question_image_url: null,
    options: [
      { text: "40 km/h", image_url: null },
      { text: "60 km/h", image_url: null },
      { text: "80 km/h", image_url: null },
      { text: "100 km/h", image_url: null },
    ],
    correct_option_index: 1,
    explanation: "Speed = Distance ÷ Time = 120 ÷ 2 = 60 km/h.",
  },
  {
    id: 4,
    question_text:
      "What is the area of a circle with radius 7 cm? (Take π = 22/7)",
    question_image_url: null,
    options: [
      { text: "44 cm²", image_url: null },
      { text: "154 cm²", image_url: null },
      { text: "22 cm²", image_url: null },
      { text: "308 cm²", image_url: null },
    ],
    correct_option_index: 1,
    explanation: "Area = πr² = (22/7) × 7² = 22 × 7 = 154 cm².",
  },
  {
    id: 5,
    question_text: "Which of the following is a prime number?",
    question_image_url: null,
    options: [
      { text: "1", image_url: null },
      { text: "9", image_url: null },
      { text: "11", image_url: null },
      { text: "15", image_url: null },
    ],
    correct_option_index: 2,
    explanation: "11 is divisible only by 1 and itself, making it prime.",
  },
  {
    id: 6,
    question_text: "Convert 0.35 to a fraction in its lowest terms.",
    question_image_url: null,
    options: [
      { text: "35/100", image_url: null },
      { text: "7/20", image_url: null },
      { text: "1/4", image_url: null },
      { text: "3/5", image_url: null },
    ],
    correct_option_index: 1,
    explanation: "0.35 = 35/100. Dividing both by 5 gives 7/20.",
  },
  {
    id: 7,
    question_text:
      "Find the gradient of the line passing through (2, 3) and (4, 7).",
    question_image_url: null,
    options: [
      { text: "1", image_url: null },
      { text: "2", image_url: null },
      { text: "3", image_url: null },
      { text: "4", image_url: null },
    ],
    correct_option_index: 1,
    explanation: "Gradient = (7 - 3) / (4 - 2) = 4 / 2 = 2.",
  },
  {
    id: 8,
    question_text: "The mode of the data set {3, 5, 5, 7, 7, 7, 9} is:",
    question_image_url: null,
    options: [
      { text: "5", image_url: null },
      { text: "7", image_url: null },
      { text: "9", image_url: null },
      { text: "3", image_url: null },
    ],
    correct_option_index: 1,
    explanation: "7 appears three times — more than any other value.",
  },
];

const PASS_MARK = 50;

// ─── Timer display ────────────────────────────────────────────────────────────

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuizTaking() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: optionIndex }
  const [timeLeft, setTimeLeft] = useState(MOCK_DURATION_SECONDS);
  const [showConfirm, setShowConfirm] = useState(false);
  const hasSubmitted = useRef(false);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(autoSubmit = false) {
    if (hasSubmitted.current) return;
    hasSubmitted.current = true;

    // Compute results against correct answers
    let correct = 0;
    const breakdown = MOCK_QUESTIONS.map((q) => {
      const selected = answers[q.id] ?? null;
      const isCorrect = selected === q.correct_option_index;
      if (isCorrect) correct++;
      return {
        question_text: q.question_text,
        options: q.options,
        selected_option: selected,
        correct_option: q.correct_option_index,
        explanation: q.explanation,
      };
    });

    const total = MOCK_QUESTIONS.length;
    const wrong =
      total -
      correct -
      (Object.keys(answers).length < total
        ? total - Object.keys(answers).length
        : 0);
    const score = Math.round((correct / total) * 100);

    navigate(`/quiz/${quizId}/result`, {
      replace: true,
      state: {
        score,
        correct_count: correct,
        wrong_count: total - correct,
        total_questions: total,
        pass_mark: PASS_MARK,
        per_question: breakdown,
        auto_submitted: autoSubmit,
      },
    });
  }

  function attemptSubmit() {
    const unanswered = MOCK_QUESTIONS.length - Object.keys(answers).length;
    if (unanswered > 0) {
      setShowConfirm(true);
    } else {
      handleSubmit();
    }
  }

  const question = MOCK_QUESTIONS[currentIndex];
  const isLast = currentIndex === MOCK_QUESTIONS.length - 1;
  const isUrgent = timeLeft <= 60;

  return (
    <div className="min-h-screen bg-tint flex flex-col">
      {/* ── Sticky header: timer + progress ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1.5">
          {MOCK_QUESTIONS.map((q, i) => (
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
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* ── Question body ── */}
      <div className="flex-1 max-w-xl w-full mx-auto px-4 pt-6 pb-4 flex flex-col gap-5">
        {/* Question number + text */}
        <div>
          <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-2">
            Question {currentIndex + 1} of {MOCK_QUESTIONS.length}
          </p>
          <p className="text-gray-900 font-semibold text-base leading-relaxed">
            {question.question_text}
          </p>
          {question.question_image_url && (
            <img
              src={question.question_image_url}
              alt="Question"
              className="mt-3 w-full rounded-xl object-cover max-h-52"
            />
          )}
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {question.options.map((option, idx) => {
            const selected = answers[question.id] === idx;
            return (
              <button
                key={idx}
                onClick={() =>
                  setAnswers((prev) => ({ ...prev, [question.id]: idx }))
                }
                className={`flex items-center gap-3 w-full p-4 rounded-xl border-2 text-left transition ${
                  selected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-gray-200 bg-white hover:border-accent-light text-gray-700"
                }`}
              >
                <span
                  className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    selected
                      ? "bg-primary border-primary text-white"
                      : "border-gray-300 text-gray-400"
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1 text-sm font-medium">
                  {option.text}
                </span>
                {option.image_url && (
                  <img
                    src={option.image_url}
                    alt={`Option ${String.fromCharCode(65 + idx)}`}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Navigation */}
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
              className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-xl text-sm transition"
            >
              Submit Quiz
            </button>
          ) : (
            <button
              onClick={() =>
                setCurrentIndex((i) =>
                  Math.min(MOCK_QUESTIONS.length - 1, i + 1),
                )
              }
              className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 text-sm transition"
            >
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Confirm submit modal ── */}
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
              You have {MOCK_QUESTIONS.length - Object.keys(answers).length}{" "}
              unanswered question(s). Unanswered questions will be marked wrong.
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
