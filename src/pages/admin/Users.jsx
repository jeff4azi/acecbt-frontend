import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Trophy,
  BookOpen,
  KeyRound,
} from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

function relativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const PAGE_SIZE = 20;

export default function UsersPage() {
  const { authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // debounced
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(() => {
    if (authLoading) return;
    setLoading(true);
    setError("");
    api
      .get("/users", { params: { page, limit: PAGE_SIZE, search: query } })
      .then((res) => {
        setUsers(res.data.users);
        setTotal(res.data.total);
      })
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoading(false));
  }, [page, query, authLoading]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (authLoading) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <span className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-12 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-primary-dark flex items-center gap-2">
            <Users size={22} /> Users
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString()} registered user{total !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition shadow-sm"
          />
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-center text-red-500 py-12 text-sm">{error}</p>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                No users found{query ? ` for "${query}"` : ""}.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">
                        User
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">
                        Role
                      </th>
                      <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3">
                        Quizzes
                      </th>
                      <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3">
                        Attempts
                      </th>
                      <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3">
                        Best Score
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-tint/60 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {getInitials(u.full_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 truncate">
                                {u.full_name}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {u.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {u.is_admin ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                              <ShieldCheck size={11} /> Admin
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Student
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-sm font-semibold text-gray-700">
                            {u.unlocked_quizzes}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-sm font-semibold text-gray-700">
                            {u.attempt_count}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {u.best_score !== null ? (
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                u.best_score >= 50
                                  ? "bg-green-50 text-green-700"
                                  : "bg-red-50 text-red-500"
                              }`}
                            >
                              {u.best_score}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-400">
                          {relativeTime(u.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {users.map((u) => (
                  <div key={u.id} className="px-4 py-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {getInitials(u.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-gray-800 text-sm truncate">
                          {u.full_name}
                        </p>
                        {u.is_admin && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            <ShieldCheck size={9} /> Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mb-2">
                        {u.email}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <KeyRound size={11} className="text-green-500" />{" "}
                          {u.unlocked_quizzes} quiz
                          {u.unlocked_quizzes !== 1 ? "zes" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen size={11} className="text-violet-400" />{" "}
                          {u.attempt_count} attempt
                          {u.attempt_count !== 1 ? "s" : ""}
                        </span>
                        {u.best_score !== null && (
                          <span className="flex items-center gap-1">
                            <Trophy size={11} className="text-amber-400" />{" "}
                            {u.best_score}%
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-400 shrink-0">
                      {relativeTime(u.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && total > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-tint disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={15} /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-tint disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
