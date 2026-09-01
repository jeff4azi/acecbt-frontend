import { useParams } from "react-router-dom";
import { Medal } from "lucide-react";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_LEADERBOARD = [
  {
    id: "u1",
    full_name: "Chukwuemeka Obi",
    score: 97,
    time_taken_seconds: 1820,
  },
  {
    id: "u2",
    full_name: "Fatima Al-Hassan",
    score: 95,
    time_taken_seconds: 2100,
  },
  { id: "u3", full_name: "Tunde Adeyemi", score: 92, time_taken_seconds: 2340 },
  { id: "u4", full_name: "Ngozi Eze", score: 88, time_taken_seconds: 2600 },
  { id: "u5", full_name: "Bashir Musa", score: 85, time_taken_seconds: 2750 },
  // Simulated current user
  { id: "current", full_name: "You", score: 75, time_taken_seconds: 3100 },
  { id: "u7", full_name: "Amaka Nwosu", score: 70, time_taken_seconds: 3200 },
  { id: "u8", full_name: "Seun Akinlade", score: 65, time_taken_seconds: 3400 },
  { id: "u9", full_name: "Hauwa Ibrahim", score: 60, time_taken_seconds: 3600 },
  { id: "u10", full_name: "Dele Okafor", score: 55, time_taken_seconds: 3900 },
];

const MOCK_CURRENT_USER_ID = "current";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function MedalIcon({ rank }) {
  if (rank === 1) return <Medal size={18} className="text-yellow-400" />;
  if (rank === 2) return <Medal size={18} className="text-gray-400" />;
  if (rank === 3) return <Medal size={18} className="text-amber-600" />;
  return (
    <span className="text-sm font-bold text-gray-400 w-5 text-center">
      {rank}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Leaderboard() {
  useParams(); // quizId available if needed

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary-dark">Leaderboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Top scorers for this quiz
          </p>
        </div>

        {/* Top 3 podium */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 flex items-end justify-center gap-3">
          {/* 2nd */}
          <div className="flex flex-col items-center flex-1">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 mb-1">
              {MOCK_LEADERBOARD[1].full_name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <p className="text-xs font-semibold text-gray-700 text-center line-clamp-1">
              {MOCK_LEADERBOARD[1].full_name}
            </p>
            <p className="text-xs text-gray-500">
              {MOCK_LEADERBOARD[1].score}%
            </p>
            <div className="mt-1 bg-gray-400 text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center">
              2
            </div>
          </div>
          {/* 1st */}
          <div className="flex flex-col items-center flex-1 -mb-2">
            <Medal size={22} className="text-yellow-400 mb-1" />
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary mb-1 ring-2 ring-primary">
              {MOCK_LEADERBOARD[0].full_name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <p className="text-xs font-bold text-gray-800 text-center line-clamp-1">
              {MOCK_LEADERBOARD[0].full_name}
            </p>
            <p className="text-xs text-primary font-semibold">
              {MOCK_LEADERBOARD[0].score}%
            </p>
            <div className="mt-1 bg-primary text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center">
              1
            </div>
          </div>
          {/* 3rd */}
          <div className="flex flex-col items-center flex-1">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700 mb-1">
              {MOCK_LEADERBOARD[2].full_name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <p className="text-xs font-semibold text-gray-700 text-center line-clamp-1">
              {MOCK_LEADERBOARD[2].full_name}
            </p>
            <p className="text-xs text-gray-500">
              {MOCK_LEADERBOARD[2].score}%
            </p>
            <div className="mt-1 bg-amber-600 text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center">
              3
            </div>
          </div>
        </div>

        {/* Full list */}
        <div className="space-y-2">
          {MOCK_LEADERBOARD.map((entry, index) => {
            const rank = index + 1;
            const isCurrentUser = entry.id === MOCK_CURRENT_USER_ID;

            return (
              <div
                key={entry.id}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition ${
                  isCurrentUser
                    ? "bg-primary/10 border-2 border-primary"
                    : "bg-white shadow-sm border border-transparent"
                }`}
              >
                {/* Rank */}
                <div className="w-6 flex justify-center shrink-0">
                  <MedalIcon rank={rank} />
                </div>

                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCurrentUser
                      ? "bg-primary text-white"
                      : "bg-tint text-primary-dark"
                  }`}
                >
                  {entry.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${isCurrentUser ? "text-primary-dark" : "text-gray-800"}`}
                  >
                    {entry.full_name}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs font-medium bg-primary text-white px-1.5 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    Time: {formatTime(entry.time_taken_seconds)}
                  </p>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <span
                    className={`text-sm font-bold ${
                      entry.score >= 80
                        ? "text-green-600"
                        : entry.score >= 50
                          ? "text-primary"
                          : "text-red-500"
                    }`}
                  >
                    {entry.score}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
