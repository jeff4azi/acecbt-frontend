import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, BookOpen, Info } from "lucide-react";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const INITIAL_QUIZZES = [
  {
    id: "1",
    title: "WAEC Mathematics 2024",
    price: 500,
    question_count: 60,
    is_published: true,
    has_attempts: true,
  },
  {
    id: "2",
    title: "JAMB English Language",
    price: 300,
    question_count: 40,
    is_published: true,
    has_attempts: true,
  },
  {
    id: "3",
    title: "NECO Physics",
    price: 400,
    question_count: 50,
    is_published: true,
    has_attempts: false,
  },
  {
    id: "4",
    title: "WAEC Biology 2024",
    price: 400,
    question_count: 50,
    is_published: false,
    has_attempts: false,
  },
  {
    id: "5",
    title: "JAMB Chemistry",
    price: 350,
    question_count: 40,
    is_published: true,
    has_attempts: false,
  },
  {
    id: "6",
    title: "NECO Government",
    price: 250,
    question_count: 45,
    is_published: false,
    has_attempts: false,
  },
];

// ─── Delete confirm modal ─────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState(INITIAL_QUIZZES);
  const [toDelete, setToDelete] = useState(null);

  function confirmDelete() {
    setQuizzes((prev) => prev.filter((q) => q.id !== toDelete.id));
    setToDelete(null);
  }

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-10">
        {/* Header */}
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
                  Questions
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
                    ₦{quiz.price.toLocaleString()}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <BookOpen size={13} className="text-accent" />{" "}
                      {quiz.question_count}
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
                      <div className="relative group">
                        <button
                          onClick={() =>
                            !quiz.has_attempts && setToDelete(quiz)
                          }
                          disabled={quiz.has_attempts}
                          className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                            quiz.has_attempts
                              ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                              : "text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100"
                          }`}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                        {quiz.has_attempts && (
                          <div className="absolute bottom-full right-0 mb-1 w-48 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 hidden group-hover:block z-10 whitespace-normal">
                            Can't delete — has attempts. Edit instead.
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
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
                  ₦{quiz.price.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen size={12} className="text-accent" />{" "}
                  {quiz.question_count} Qs
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/admin/quizzes/${quiz.id}/edit`}
                  className="flex-1 text-center text-xs font-medium text-primary bg-tint py-2 rounded-lg"
                >
                  Edit
                </Link>
                <div className="flex-1 relative group">
                  <button
                    onClick={() => !quiz.has_attempts && setToDelete(quiz)}
                    disabled={quiz.has_attempts}
                    className={`w-full text-xs font-medium py-2 rounded-lg flex items-center justify-center gap-1 ${
                      quiz.has_attempts
                        ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                        : "text-red-500 bg-red-50"
                    }`}
                  >
                    {quiz.has_attempts ? (
                      <>
                        <Info size={12} /> Has attempts
                      </>
                    ) : (
                      <>
                        <Trash2 size={12} /> Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
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
