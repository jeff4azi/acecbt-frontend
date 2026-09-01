import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Lock, Unlock, Clock, BookOpen, ChevronRight } from "lucide-react";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_ADS = [
  {
    id: 1,
    image_url: "https://picsum.photos/seed/ad1/800/300",
    link_url: "https://example.com/promo1",
    duration_seconds: 5,
  },
  {
    id: 2,
    image_url: "https://picsum.photos/seed/ad2/800/300",
    link_url: "https://example.com/promo2",
    duration_seconds: 7,
  },
  {
    id: 3,
    image_url: "https://picsum.photos/seed/ad3/800/300",
    link_url: "https://example.com/promo3",
    duration_seconds: 6,
  },
];

const MOCK_RECENT = [
  { id: "1", title: "WAEC Mathematics 2024", lastScore: 78, progress: 78 },
  { id: "2", title: "JAMB English Language", lastScore: 65, progress: 65 },
  { id: "3", title: "NECO Physics", lastScore: 82, progress: 82 },
];

const MOCK_QUIZZES = [
  {
    id: "1",
    title: "WAEC Mathematics 2024",
    description:
      "Comprehensive past questions covering algebra, geometry, and statistics.",
    price: 500,
    question_count: 60,
    duration_minutes: 90,
    is_unlocked: true,
  },
  {
    id: "2",
    title: "JAMB English Language",
    description:
      "Practice with comprehension passages and lexis & structure questions.",
    price: 300,
    question_count: 40,
    duration_minutes: 60,
    is_unlocked: false,
  },
  {
    id: "3",
    title: "NECO Physics",
    description:
      "All topics from mechanics to modern physics with detailed explanations.",
    price: 400,
    question_count: 50,
    duration_minutes: 75,
    is_unlocked: true,
  },
  {
    id: "4",
    title: "WAEC Biology 2024",
    description:
      "Cell biology, genetics, ecology, and evolution covered in full.",
    price: 400,
    question_count: 50,
    duration_minutes: 75,
    is_unlocked: false,
  },
  {
    id: "5",
    title: "JAMB Chemistry",
    description:
      "Organic, inorganic, and physical chemistry with worked examples.",
    price: 350,
    question_count: 40,
    duration_minutes: 60,
    is_unlocked: false,
  },
  {
    id: "6",
    title: "NECO Government",
    description:
      "Nigerian government structure, history, and political theory.",
    price: 250,
    question_count: 45,
    duration_minutes: 60,
    is_unlocked: false,
  },
];

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
        // Fade out
        setVisible(false);
        setTimeout(() => {
          const next = (index + 1) % ads.length;
          setCurrent(next);
          setVisible(true);
          schedule(next);
        }, 350);
      }, ad.duration_seconds * 1000);
    }

    schedule(current);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        className={`w-full h-40 sm:h-52 object-cover transition-opacity duration-350 ${visible ? "opacity-100" : "opacity-0"}`}
      />
    </a>
  );
}

// ─── Quiz Card (compact, for grid) ───────────────────────────────────────────

function QuizCard({ quiz }) {
  return (
    <Link
      to={`/quiz/${quiz.id}`}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
          {quiz.title}
        </h3>
        {quiz.is_unlocked ? (
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
          {quiz.question_count} Qs
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {quiz.duration_minutes} min
        </span>
        <span className="ml-auto font-bold text-primary text-sm">
          ₦{quiz.price.toLocaleString()}
        </span>
      </div>
    </Link>
  );
}

// ─── Continue Card (horizontal scroll row) ────────────────────────────────────

function ContinueCard({ quiz }) {
  return (
    <Link
      to={`/quiz/${quiz.id}`}
      className="shrink-0 w-52 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-2 hover:shadow-md transition-shadow"
    >
      <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">
        {quiz.title}
      </h3>
      <div className="mt-auto">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Last score</span>
          <span className="font-semibold text-primary">{quiz.lastScore}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-accent h-1.5 rounded-full"
            style={{ width: `${quiz.progress}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-8 space-y-8">
        {/* Ad Banner */}
        <section>
          <AdBanner ads={MOCK_ADS} />
        </section>

        {/* Continue where you left off */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-primary-dark text-base">
              Continue where you left off
            </h2>
            <Link
              to="/browse"
              className="flex items-center gap-0.5 text-xs text-primary hover:underline"
            >
              See all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {MOCK_RECENT.map((quiz) => (
              <ContinueCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        </section>

        {/* Available Quizzes */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MOCK_QUIZZES.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
