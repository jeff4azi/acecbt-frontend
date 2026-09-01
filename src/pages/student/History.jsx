import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, BookOpen, Clock, LogIn } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function History() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    api
      .get("/history")
      .then((res) => {
        if (!cancelled) setAttempts(res.data ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 401) return;
        console.error("History load error:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

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
              Sign in to see your history
            </h2>
            <p className="text-sm text-gray-500">
              Your past quiz attempts are stored with your account.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition text-sm"
            >
              Sign In
            </button>
            <Link
              to="/"
              className="w-full text-primary hover:underline font-medium text-sm"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary-dark">My History</h1>
          <p className="text-sm text-gray-500 mt-1">Your past quiz attempts</p>
        </div>

        {attempts.length === 0 ? (
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
                to={`/quiz/${attempt.quiz?.id ?? attempt.quiz_id}`}
                className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug">
                    {attempt.quiz?.title ?? "Quiz"}
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
                  {formatDate(attempt.created_at)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
