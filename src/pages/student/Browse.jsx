import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Lock,
  Unlock,
  Clock,
  BookOpen,
  SlidersHorizontal,
} from "lucide-react";
import api from "../../lib/api";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

function QuizCard({ quiz, unlocked }) {
  return (
    <Link
      to={`/quiz/${quiz.id}`}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 leading-snug">
          {quiz.title}
        </h3>
        {unlocked ? (
          <span className="shrink-0 flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
            <Unlock size={11} /> Unlocked
          </span>
        ) : (
          <span className="shrink-0 flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full">
            <Lock size={11} /> Locked
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 line-clamp-2">{quiz.description}</p>
      <div className="flex items-center gap-4 text-xs text-gray-500 mt-auto pt-1 border-t border-gray-50">
        <span className="flex items-center gap-1">
          <BookOpen size={13} className="text-accent" />
          {quiz.question_count ?? "—"} questions
        </span>
        <span className="flex items-center gap-1">
          <Clock size={13} className="text-accent" />
          {quiz.duration_minutes} min
        </span>
        <span className="ml-auto font-bold text-primary text-base">
          ₦{Number(quiz.price).toLocaleString()}
        </span>
      </div>
    </Link>
  );
}

export default function Browse() {
  const [quizzes, setQuizzes] = useState([]);
  const [unlockedIds, setUnlockedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    async function load() {
      try {
        const [quizzesRes, unlockedRes] = await Promise.all([
          api.get("/quizzes"),
          api.get("/unlocked").catch(() => ({ data: [] })),
        ]);
        setQuizzes(quizzesRes.data);
        setUnlockedIds(new Set((unlockedRes.data ?? []).map((u) => u.quiz_id)));
      } catch (err) {
        console.error("Browse load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = quizzes.filter((q) =>
      q.title.toLowerCase().includes(query.toLowerCase()),
    );
    if (sort === "newest") {
      list = [...list].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
    } else if (sort === "price-asc") {
      list = [...list].sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sort === "price-desc") {
      list = [...list].sort((a, b) => Number(b.price) - Number(a.price));
    }
    return list;
  }, [quizzes, query, sort]);

  if (loading) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <span className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary-dark">
            Browse Quizzes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Find the quiz you need and start practising
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search quizzes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-accent-light bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm text-gray-800 placeholder-gray-400 transition"
            />
          </div>
          <div className="relative">
            <SlidersHorizontal
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="pl-9 pr-8 py-2.5 rounded-xl border border-accent-light bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm text-gray-700 appearance-none cursor-pointer transition"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
              <Search size={28} className="text-accent-light" />
            </div>
            <p className="font-semibold text-gray-700 mb-1">No quizzes found</p>
            <p className="text-sm text-gray-400">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                unlocked={unlockedIds.has(quiz.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
