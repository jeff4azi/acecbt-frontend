import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Trophy,
  Lightbulb,
} from "lucide-react";

// ─── Score Arc ────────────────────────────────────────────────────────────────

function ScoreArc({ score, total = 400 }) {
  const pct = score / total;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - pct * circumference;
  const colour = pct >= 0.5 ? "#22c55e" : "#ef4444";

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
          stroke={colour}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-gray-900">{score}</span>
        <span className="text-xs font-semibold text-gray-400">/{total}</span>
      </div>
    </div>
  );
}

// ─── Subject Score Bar ─────────────────────────────────────────────────────────

function SubjectBar({ subject, score }) {
  const pct = score;
  const colour =
    pct >= 70 ? "bg-green-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-gray-700">{subject}</span>
        <span
          className={`font-bold ${pct >= 50 ? "text-green-600" : "text-red-500"}`}
        >
          {score}/100
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${colour}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Answer Review (per-subject tab) ─────────────────────────────────────────

function AnswerReview({ breakdown }) {
  return (
    <div className="space-y-4">
      {breakdown.map((item, idx) => {
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
              <p className="text-sm font-medium text-gray-800 flex-1">
                {item.question_text}
              </p>
            </div>

            {item.question_image_url && (
              <a
                href={item.question_image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block mb-3"
              >
                <img
                  src={item.question_image_url}
                  alt="Question diagram"
                  className="w-full rounded-xl border border-gray-200 max-h-48 object-contain bg-white"
                  loading="lazy"
                />
              </a>
            )}

            <div className="space-y-1.5">
              {(item.options ?? []).map((opt, oi) => {
                const isSelected = oi === item.selected_option;
                const isRight = oi === item.correct_option;
                const optHasText = !!opt.text && opt.text.trim().length > 0;
                const optHasImage = !!opt.image_url;

                let cls = "text-gray-600 bg-gray-50";
                if (isRight) cls = "text-green-700 bg-green-50 font-semibold";
                if (isSelected && !isRight) cls = "text-red-600 bg-red-50";

                return (
                  <div
                    key={oi}
                    className={`flex flex-col gap-1.5 px-3 py-2 rounded-lg ${cls}`}
                  >
                    <div className="flex items-center gap-2">
                      {isRight ? (
                        <CheckCircle
                          size={13}
                          className="text-green-500 shrink-0"
                        />
                      ) : isSelected ? (
                        <XCircle size={13} className="text-red-400 shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="text-xs">
                        {String.fromCharCode(65 + oi)}.{" "}
                        {optHasText ? (
                          opt.text
                        ) : (
                          <em className="text-[11px] opacity-70">
                            (image only)
                          </em>
                        )}
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
                    {optHasImage && (
                      <a
                        href={opt.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-5"
                      >
                        <img
                          src={opt.image_url}
                          alt={`Option ${String.fromCharCode(65 + oi)}`}
                          className="h-20 rounded-lg border border-gray-200 bg-white object-contain"
                          loading="lazy"
                        />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>

            {item.explanation && (
              <div className="mt-3 flex gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3">
                <Lightbulb
                  size={15}
                  className="text-amber-500 shrink-0 mt-0.5"
                />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <span className="font-semibold block mb-0.5">
                    Explanation
                  </span>
                  {item.explanation}
                </div>
              </div>
            )}

            {notAnswered && (
              <p className="mt-2 text-xs text-gray-400 italic">Not answered</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JambResult() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [activeSubjectIdx, setActiveSubjectIdx] = useState(0);

  // state is passed from JambExam via navigate
  const result = state ?? null;

  if (!result) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm max-w-sm w-full">
          <p className="text-gray-700 font-medium">No result data found.</p>
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

  const { totalScore, subjectBreakdown, autoSubmitted } = result;

  const activeSub = subjectBreakdown?.[activeSubjectIdx];

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-xl mx-auto px-4 pt-8 pb-10 space-y-6">
        {/* Score card */}
        <div className="bg-white rounded-2xl shadow-sm p-7 text-center space-y-5">
          {autoSubmitted && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-800 font-medium">
              Time's up — exam was submitted automatically.
            </div>
          )}

          <ScoreArc score={totalScore} total={400} />

          <div>
            <p className="text-lg font-extrabold text-gray-900">
              JAMB Practice Score
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {totalScore >= 200
                ? "Great performance! Keep it up 🎉"
                : "Keep practising — you'll get there!"}
            </p>
          </div>

          {/* Per-subject breakdown */}
          <div className="space-y-3 pt-2 border-t border-gray-100 text-left">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Subject Breakdown
            </p>
            {(subjectBreakdown ?? []).map((sb) => (
              <SubjectBar
                key={sb.key}
                subject={`${sb.subject}${sb.year ? ` ${sb.year}` : ""}`}
                score={sb.score}
              />
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/jamb", { replace: true })}
            className="flex-1 bg-white border-2 border-primary text-primary hover:bg-tint font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 transition text-sm"
          >
            <RotateCcw size={15} /> Try Again
          </button>
          <button
            onClick={() => navigate("/jamb/leaderboard")}
            className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 transition text-sm"
          >
            <Trophy size={15} /> Leaderboard
          </button>
        </div>

        {/* Review answers */}
        {subjectBreakdown?.length > 0 && (
          <div>
            <h2 className="font-bold text-primary-dark text-base mb-4">
              Review Answers
            </h2>

            {/* Subject tabs */}
            <div className="flex bg-white rounded-2xl border border-gray-100 p-1 gap-1 mb-4 shadow-sm overflow-x-auto">
              {subjectBreakdown.map((sb, i) => (
                <button
                  key={sb.key}
                  onClick={() => setActiveSubjectIdx(i)}
                  className={`flex-1 min-w-fit px-3 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                    i === activeSubjectIdx
                      ? "bg-primary text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {sb.subject}
                  <span
                    className={`ml-1 ${
                      i === activeSubjectIdx ? "text-white/80" : "text-gray-400"
                    }`}
                  >
                    {sb.score}/100
                  </span>
                </button>
              ))}
            </div>

            {activeSub && (
              <AnswerReview breakdown={activeSub.breakdown ?? []} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
