import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, XCircle, BookOpen, Clock } from "lucide-react";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_HISTORY = [
  {
    id: "a1",
    quiz_id: "1",
    quiz_title: "WAEC Mathematics 2024",
    score: 78,
    correct_count: 47,
    wrong_count: 13,
    total_questions: 60,
    passed: true,
    date: "2024-08-20T10:30:00",
  },
  {
    id: "a2",
    quiz_id: "2",
    quiz_title: "JAMB English Language",
    score: 45,
    correct_count: 18,
    wrong_count: 22,
    total_questions: 40,
    passed: false,
    date: "2024-08-15T14:00:00",
  },
  {
    id: "a3",
    quiz_id: "1",
    quiz_title: "WAEC Mathematics 2024",
    score: 63,
    correct_count: 38,
    wrong_count: 22,
    total_questions: 60,
    passed: true,
    date: "2024-08-10T09:15:00",
  },
  {
    id: "a4",
    quiz_id: "3",
    quiz_title: "NECO Physics",
    score: 82,
    correct_count: 41,
    wrong_count: 9,
    total_questions: 50,
    passed: true,
    date: "2024-08-01T16:45:00",
  },
  {
    id: "a5",
    quiz_id: "4",
    quiz_title: "WAEC Biology 2024",
    score: 38,
    correct_count: 19,
    wrong_count: 31,
    total_questions: 50,
    passed: false,
    date: "2024-07-28T11:20:00",
  },
  {
    id: "a6",
    quiz_id: "5",
    quiz_title: "JAMB Chemistry",
    score: 70,
    correct_count: 28,
    wrong_count: 12,
    total_questions: 40,
    passed: true,
    date: "2024-07-20T08:00:00",
  },
];

// ─── DEV toggle — set to true to preview empty state ─────────────────────────
const PREVIEW_EMPTY = false;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function History() {
  // Sort most recent first
  const attempts = PREVIEW_EMPTY
    ? []
    : [...MOCK_HISTORY].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary-dark">My History</h1>
          <p className="text-sm text-gray-500 mt-1">Your past quiz attempts</p>
        </div>

        {attempts.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
              <Clock size={28} className="text-accent-light" />
            </div>
            <p className="font-semibold text-gray-700 mb-1">No attempts yet</p>
            <p className="text-sm text-gray-400 mb-6">
              You haven't attempted any quizzes yet — browse quizzes to get
              started
            </p>
            <Link
              to="/browse"
              className="bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition"
            >
              Browse Quizzes
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {attempts.map((attempt) => (
              <Link
                key={attempt.id}
                to={`/quiz/${attempt.quiz_id}`}
                className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug">
                    {attempt.quiz_title}
                  </h3>
                  <span
                    className={`shrink-0 flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      attempt.passed
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {attempt.passed ? (
                      <>
                        <CheckCircle size={11} /> Pass
                      </>
                    ) : (
                      <>
                        <XCircle size={11} /> Fail
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span
                    className={`text-xl font-bold ${attempt.passed ? "text-green-600" : "text-red-500"}`}
                  >
                    {attempt.score}%
                  </span>

                  <span className="flex items-center gap-1">
                    <CheckCircle size={12} className="text-green-400" />
                    {attempt.correct_count} correct
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle size={12} className="text-red-400" />
                    {attempt.wrong_count} wrong
                  </span>
                  <span className="flex items-center gap-1 ml-auto">
                    <BookOpen size={12} className="text-accent" />
                    {attempt.total_questions} Qs
                  </span>
                </div>

                <p className="text-xs text-gray-400 mt-2">
                  {formatDate(attempt.date)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
