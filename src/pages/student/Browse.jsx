import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Lock,
  Unlock,
  Clock,
  BookOpen,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

// Deterministic accent colour from the quiz title so each card feels distinct
// but the same quiz always gets the same colour.
const ACCENTS = [
  {
    bar: "bg-blue-500",
    badge: "bg-blue-50 text-blue-600",
    icon: "text-blue-400",
  },
  {
    bar: "bg-violet-500",
    badge: "bg-violet-50 text-violet-600",
    icon: "text-violet-400",
  },
  {
    bar: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-600",
    icon: "text-emerald-400",
  },
  {
    bar: "bg-orange-500",
    badge: "bg-orange-50 text-orange-600",
    icon: "text-orange-400",
  },
  {
    bar: "bg-rose-500",
    badge: "bg-rose-50 text-rose-600",
    icon: "text-rose-400",
  },
  {
    bar: "bg-cyan-500",
    badge: "bg-cyan-50 text-cyan-600",
    icon: "text-cyan-400",
  },
];

function accentFor(title = "") {
  let hash = 0;
  for (let i = 0; i < title.length; i++)
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  return ACCENTS[hash % ACCENTS.length];
}

function QuizCard({ quiz, unlocked }) {
  const accent = accentFor(quiz.title);

  return (
    <Link
      to={`/quiz/${quiz.id}`}
      className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Accent bar */}
      <div className={`h-1 w-full ${accent.bar}`} />

      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Top row: status badge */}
        <div className="flex items-center justify-between gap-2">
          {unlocked ? (
            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">
              <Unlock size={10} strokeWidth={2.5} /> Unlocked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-500 text-[11px] font-semibold px-2.5 py-1 rounded-full">
              <Lock size={10} strokeWidth={2.5} /> Locked
            </span>
          )}
          <span className="text-xs text-gray-400 font-medium">
            Pass: {quiz.pass_mark ?? 50}%
          </span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {quiz.title}
        </h3>

        {/* Description */}
        {quiz.description ? (
          <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed flex-1">
            {quiz.description}
          </p>
        ) : (
          <div className="flex-1" />
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
          <div
            className={`flex items-center gap-1.5 text-xs font-medium ${accent.icon}`}
          >
            <BookOpen size={13} strokeWidth={2} />
            <span className="text-gray-600">
              {quiz.question_count ?? "—"} Qs
            </span>
          </div>
          <div
            className={`flex items-center gap-1.5 text-xs font-medium ${accent.icon}`}
          >
            <Clock size={13} strokeWidth={2} />
            <span className="text-gray-600">{quiz.duration_minutes} min</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <span className="text-base font-extrabold text-primary">
              ₦{Number(quiz.price).toLocaleString()}
            </span>
            <ChevronRight
              size={15}
              className="text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Browse() {
  const { user, loading: authLoading } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [unlockedIds, setUnlockedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function load() {
      try {
        const quizzesReq = api.get("/quizzes");
        const unlockedReq = user
          ? api.get("/unlocked").catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] });
        const [quizzesRes, unlockedRes] = await Promise.all([
          quizzesReq,
          unlockedReq,
        ]);
        if (cancelled) return;
        setQuizzes(quizzesRes.data ?? []);
        setUnlockedIds(new Set((unlockedRes.data ?? []).map((u) => u.quiz_id)));
      } catch (err) {
        if (cancelled) return;
        if (err?.response?.status === 401) return;
        console.error("Browse load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

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

  if (authLoading || loading) {
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
