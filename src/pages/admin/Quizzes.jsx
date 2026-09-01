import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, BookOpen, Info, ShieldAlert } from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

function DeleteModal({ quiz, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="font-bold text-gray-900 mb-1">Delete quiz?</h2>
        <p className="text-sm text-gray-500 mb-5">
          "<strong>{quiz.title}</strong>" will be permanently deleted. This
          cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 text-sm transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl text-sm transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminGateCTA() {
  return (
    <div className="min-h-screen bg-tint flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <ShieldAlert size={32} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-primary-dark mb-1">
            Admin Access Required
          </h1>
          <p className="text-sm text-gray-500">
            Sign in with your admin account to manage quizzes.
          </p>
        </div>
        <Link
          to="/admin/login"
          className="block w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-2xl text-sm transition"
        >
          Sign In as Admin
        </Link>
        <Link
          to="/"
          className="block w-full border-2 border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-2xl text-sm transition"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default function Quizzes() {
  const { authLoading, user, isAdmin } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .get("/quizzes/admin")
      .then((res) => {
        if (!cancelled) setQuizzes(res.data);
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          // interceptor handles
        } else {
          console.error("Quizzes load error:", err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, isAdmin]);

  async function confirmDelete() {
    setDeleteError("");
    try {
      await api.delete(`/quizzes/${toDelete.id}`);
      setQuizzes((prev) => prev.filter((q) => q.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        // interceptor handles
      } else {
        setDeleteError(err.response?.data?.error ?? "Could not delete quiz.");
      }
      setToDelete(null);
    }
  }

  if (authLoading || (loading && isAdmin)) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <span className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <AdminGateCTA />;
  }

  // We don't have has_attempts from the list endpoint — the backend blocks delete
  // server-side and returns a 400 error, which we surface as deleteError below.

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary-dark">Quizzes</h1>
            <p className="text-sm text-gray-500 mt-1">
              {quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""} total
            </p>
          </div>
          <Link
            to="/admin/quizzes/new"
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-sm"
          >
            <Plus size={16} /> New Quiz
          </Link>
        </div>

        {deleteError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <Info size={15} /> {deleteError}
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Title
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Price
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Duration
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {quizzes.map((quiz) => (
                <tr key={quiz.id} className="hover:bg-gray-50/60 transition">
                  <td className="px-5 py-4 font-medium text-gray-900 text-sm">
                    {quiz.title}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700">
                    ₦{Number(quiz.price).toLocaleString()}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <BookOpen size={13} className="text-accent" />
                      {quiz.duration_minutes} min
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        quiz.is_published
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {quiz.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        to={`/admin/quizzes/${quiz.id}/edit`}
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-dark bg-tint hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                      >
                        <Pencil size={13} /> Edit
                      </Link>
                      <button
                        onClick={() => setToDelete(quiz)}
                        className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {quizzes.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-gray-400"
                  >
                    No quizzes yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 text-sm leading-snug">
                  {quiz.title}
                </h3>
                <span
                  className={`shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    quiz.is_published
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {quiz.is_published ? "Published" : "Draft"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <span className="font-bold text-primary">
                  ₦{Number(quiz.price).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen size={12} className="text-accent" />
                  {quiz.duration_minutes} min
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/admin/quizzes/${quiz.id}/edit`}
                  className="flex-1 text-center text-xs font-medium text-primary bg-tint py-2 rounded-lg"
                >
                  Edit
                </Link>
                <button
                  onClick={() => setToDelete(quiz)}
                  className="flex-1 text-xs font-medium text-red-500 bg-red-50 py-2 rounded-lg flex items-center justify-center gap-1"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
          {quizzes.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-12">
              No quizzes yet.
            </p>
          )}
        </div>
      </div>

      {toDelete && (
        <DeleteModal
          quiz={toDelete}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
