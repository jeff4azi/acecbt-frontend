import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CheckCircle, XCircle, RotateCcw, Trophy } from "lucide-react";

// ─── Fallback mock result (used when navigating to the page standalone) ───────

const MOCK_RESULT = {
  score: 75,
  correct_count: 6,
  wrong_count: 2,
  total_questions: 8,
  pass_mark: 50,
  per_question: [
    {
      question_text: "If 2x + 5 = 13, what is the value of x?",
      options: [{ text: "3" }, { text: "4" }, { text: "6" }, { text: "8" }],
      selected_option: 1,
      correct_option: 1,
      explanation:
        "Subtract 5 from both sides: 2x = 8, then divide by 2: x = 4.",
    },
    {
      question_text: "Simplify: (3² + 4²)",
      options: [{ text: "25" }, { text: "49" }, { text: "7" }, { text: "12" }],
      selected_option: 1,
      correct_option: 0,
      explanation: "3² = 9 and 4² = 16. 9 + 16 = 25.",
    },
    {
      question_text:
        "A train travels 120 km in 2 hours. What is its average speed?",
      options: [
        { text: "40 km/h" },
        { text: "60 km/h" },
        { text: "80 km/h" },
        { text: "100 km/h" },
      ],
      selected_option: 1,
      correct_option: 1,
      explanation: "Speed = Distance ÷ Time = 120 ÷ 2 = 60 km/h.",
    },
    {
      question_text:
        "What is the area of a circle with radius 7 cm? (Take π = 22/7)",
      options: [
        { text: "44 cm²" },
        { text: "154 cm²" },
        { text: "22 cm²" },
        { text: "308 cm²" },
      ],
      selected_option: 1,
      correct_option: 1,
      explanation: "Area = πr² = (22/7) × 7² = 22 × 7 = 154 cm².",
    },
    {
      question_text: "Which of the following is a prime number?",
      options: [{ text: "1" }, { text: "9" }, { text: "11" }, { text: "15" }],
      selected_option: 2,
      correct_option: 2,
      explanation: "11 is divisible only by 1 and itself, making it prime.",
    },
    {
      question_text: "Convert 0.35 to a fraction in its lowest terms.",
      options: [
        { text: "35/100" },
        { text: "7/20" },
        { text: "1/4" },
        { text: "3/5" },
      ],
      selected_option: 1,
      correct_option: 1,
      explanation: "0.35 = 35/100. Dividing both by 5 gives 7/20.",
    },
    {
      question_text:
        "Find the gradient of the line passing through (2, 3) and (4, 7).",
      options: [{ text: "1" }, { text: "2" }, { text: "3" }, { text: "4" }],
      selected_option: 1,
      correct_option: 1,
      explanation: "Gradient = (7 - 3) / (4 - 2) = 4 / 2 = 2.",
    },
    {
      question_text: "The mode of the data set {3, 5, 5, 7, 7, 7, 9} is:",
      options: [{ text: "5" }, { text: "7" }, { text: "9" }, { text: "3" }],
      selected_option: 0,
      correct_option: 1,
      explanation: "7 appears three times — more than any other value.",
    },
  ],
};

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="10"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={score >= 50 ? "#22c55e" : "#ef4444"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900">{score}%</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Result() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  const result = state ?? MOCK_RESULT;
  const passed = result.score >= result.pass_mark;

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-xl mx-auto px-4 pt-8 pb-10 space-y-6">
        {/* Score card */}
        <div className="bg-white rounded-2xl shadow-sm p-7 text-center space-y-4">
          <ScoreRing score={result.score} />

          <div>
            <span
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold ${
                passed
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {passed ? <CheckCircle size={15} /> : <XCircle size={15} />}
              {passed ? "Passed" : "Failed"}
            </span>
          </div>

          <div className="flex justify-center gap-6 text-sm text-gray-600 pt-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {result.correct_count}
              </p>
              <p className="text-xs mt-0.5">Correct</p>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">
                {result.wrong_count}
              </p>
              <p className="text-xs mt-0.5">Wrong</p>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-700">
                {result.total_questions}
              </p>
              <p className="text-xs mt-0.5">Total</p>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Pass mark: {result.pass_mark}%
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/quiz/${quizId}/take`, { replace: true })}
            className="flex-1 bg-white border-2 border-primary text-primary hover:bg-tint font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 transition text-sm"
          >
            <RotateCcw size={15} /> Retake Quiz
          </button>
          <button
            onClick={() => navigate(`/quiz/${quizId}/leaderboard`)}
            className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 transition text-sm"
          >
            <Trophy size={15} /> Leaderboard
          </button>
        </div>

        {/* Review answers */}
        <div>
          <h2 className="font-bold text-primary-dark text-base mb-4">
            Review Answers
          </h2>
          <div className="space-y-4">
            {result.per_question.map((item, idx) => {
              const isCorrect = item.selected_option === item.correct_option;
              const notAnswered = item.selected_option === null;

              return (
                <div
                  key={idx}
                  className={`bg-white rounded-2xl p-5 border-l-4 shadow-sm ${
                    notAnswered
                      ? "border-gray-300"
                      : isCorrect
                        ? "border-green-400"
                        : "border-red-400"
                  }`}
                >
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-xs font-bold text-gray-400 shrink-0 mt-0.5">
                      Q{idx + 1}
                    </span>
                    <p className="text-sm font-medium text-gray-800">
                      {item.question_text}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {item.options.map((opt, oi) => {
                      const isSelected = oi === item.selected_option;
                      const isRight = oi === item.correct_option;

                      let cls = "text-gray-600 bg-gray-50";
                      if (isRight)
                        cls = "text-green-700 bg-green-50 font-semibold";
                      if (isSelected && !isRight)
                        cls = "text-red-600 bg-red-50";

                      return (
                        <div
                          key={oi}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${cls}`}
                        >
                          {isRight ? (
                            <CheckCircle
                              size={13}
                              className="text-green-500 shrink-0"
                            />
                          ) : isSelected ? (
                            <XCircle
                              size={13}
                              className="text-red-400 shrink-0"
                            />
                          ) : (
                            <span className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>
                            {String.fromCharCode(65 + oi)}. {opt.text}
                          </span>
                          {isSelected && !isRight && (
                            <span className="ml-auto text-red-400 text-xs">
                              Your answer
                            </span>
                          )}
                          {isRight && (
                            <span className="ml-auto text-green-500 text-xs">
                              Correct
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {item.explanation && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                      <span className="font-semibold text-gray-600">
                        Explanation:{" "}
                      </span>
                      {item.explanation}
                    </div>
                  )}

                  {notAnswered && (
                    <p className="mt-2 text-xs text-gray-400 italic">
                      Not answered
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
