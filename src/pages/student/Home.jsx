import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Lock, Unlock, Clock, BookOpen, ChevronRight } from "lucide-react";
import api from "../../lib/api";

// ─── Ad Banner ────────────────────────────────────────────────────────────────

function AdBanner({ ads }) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!ads.length) return;

    function schedule(index) {
      const ad = ads[index];
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          // pick a random different ad if more than one
          let next = index;
          if (ads.length > 1) {
            do {
              next = Math.floor(Math.random() * ads.length);
            } while (next === index);
          }
          setCurrent(next);
          setVisible(true);
          schedule(next);
        }, 350);
      }, ad.duration_seconds * 1000);
    }

    schedule(current);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ads]);

  if (!ads.length) return null;

  const ad = ads[current];

  return (
    <a
      href={ad.link_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl overflow-hidden shadow-md"
    >
      <img
        src={ad.image_url}
        alt="Advertisement"
        className={`w-full h-40 sm:h-52 object-cover transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      />
    </a>
  );
}

// ─── Quiz Card (grid) ─────────────────────────────────────────────────────────

function QuizCard({ quiz, unlocked }) {
  return (
    <Link
      to={`/quiz/${quiz.id}`}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
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
      <p className="text-xs text-gray-500 line-clamp-2">{quiz.description}</p>
      <div className="flex items-center gap-3 text-xs text-gray-500 mt-auto">
        <span className="flex items-center gap-1">
          <BookOpen size={12} />
          {quiz.question_count ?? "—"} Qs
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {quiz.duration_minutes} min
        </span>
        <span className="ml-auto font-bold text-primary text-sm">
          ₦{Number(quiz.price).toLocaleString()}
        </span>
      </div>
    </Link>
  );
}

// ─── Recent attempt card (horizontal scroll) ──────────────────────────────────

function RecentCard({ attempt }) {
  return (
    <Link
      to={`/quiz/${attempt.quiz?.id ?? attempt.quiz_id}`}
      className="shrink-0 w-52 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-2 hover:shadow-md transition-shadow"
    >
      <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">
        {attempt.quiz?.title ?? "Quiz"}
      </h3>
      <div className="mt-auto">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Last score</span>
          <span className="font-semibold text-primary">{attempt.score}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-accent h-1.5 rounded-full"
            style={{ width: `${attempt.score}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [ads, setAds] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [unlockedIds, setUnlockedIds] = useState(new Set());
  const [recentAttempts, setRecentAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [adsRes, quizzesRes, unlockedRes, historyRes] = await Promise.all(
          [
            api.get("/ads"),
            api.get("/quizzes"),
            api.get("/unlocked").catch(() => ({ data: [] })),
            api.get("/history").catch(() => ({ data: [] })),
          ],
        );

        setAds(adsRes.data);
        setQuizzes(quizzesRes.data);
        setUnlockedIds(new Set((unlockedRes.data ?? []).map((u) => u.quiz_id)));

        // Build "continue" row: get the most recent attempt per quiz (max 3)
        const seen = new Set();
        const recent = [];
        for (const a of historyRes.data ?? []) {
          const qid = a.quiz?.id ?? a.quiz_id;
          if (!seen.has(qid)) {
            seen.add(qid);
            recent.push(a);
            if (recent.length === 3) break;
          }
        }
        setRecentAttempts(recent);
      } catch (err) {
        console.error("Home load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Enrich quizzes with question count (not returned by list endpoint — we just show
  // duration + price from the quiz row; question count needs a separate call which
  // is expensive, so we omit it on the home page list).
  const enriched = quizzes.map((q) => ({
    ...q,
    is_unlocked: unlockedIds.has(q.id),
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <span className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-8 space-y-8">
        {ads.length > 0 && (
          <section>
            <AdBanner ads={ads} />
          </section>
        )}

        {recentAttempts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-primary-dark text-base">
                Continue where you left off
              </h2>
              <Link
                to="/history"
                className="flex items-center gap-0.5 text-xs text-primary hover:underline"
              >
                See all <ChevronRight size={13} />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {recentAttempts.map((a) => (
                <RecentCard key={a.id} attempt={a} />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-primary-dark text-base">
              Available Quizzes
            </h2>
            <Link
              to="/browse"
              className="flex items-center gap-0.5 text-xs text-primary hover:underline"
            >
              Browse all <ChevronRight size={13} />
            </Link>
          </div>
          {enriched.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">
              No quizzes published yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {enriched.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  unlocked={quiz.is_unlocked}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
