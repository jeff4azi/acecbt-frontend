import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Medal } from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

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

function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Leaderboard() {
  const { quizId } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [leaderboard, setLeaderboard] = useState([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    async function load() {
      try {
        const [lbRes, quizRes] = await Promise.all([
          api.get(`/quizzes/${quizId}/leaderboard`),
          api.get(`/quizzes/${quizId}`),
        ]);
        if (cancelled) return;
        setLeaderboard(lbRes.data);
        setQuizTitle(quizRes.data.title);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          // interceptor handles session teardown + redirect
        } else {
          console.error("Leaderboard load error:", err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, quizId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-tint flex items-center justify-center">
        <span className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tint">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary-dark">Leaderboard</h1>
          {quizTitle && (
            <p className="text-sm text-gray-500 mt-1">{quizTitle}</p>
          )}
        </div>

        {leaderboard.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-20">
            No attempts yet — be the first!
          </p>
        ) : (
          <>
            {/* Podium for top 3 */}
            {leaderboard.length >= 3 && (
              <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 flex items-end justify-center gap-3">
                {/* 2nd */}
                <div className="flex flex-col items-center flex-1">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 mb-1">
                    {initials(leaderboard[1]?.profiles?.full_name)}
                  </div>
                  <p className="text-xs font-semibold text-gray-700 text-center line-clamp-1">
                    {leaderboard[1]?.profiles?.full_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {leaderboard[1]?.score}%
                  </p>
                  <div className="mt-1 bg-gray-400 text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center">
                    2
                  </div>
                </div>
                {/* 1st */}
                <div className="flex flex-col items-center flex-1 -mb-2">
                  <Medal size={22} className="text-yellow-400 mb-1" />
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary mb-1 ring-2 ring-primary">
                    {initials(leaderboard[0]?.profiles?.full_name)}
                  </div>
                  <p className="text-xs font-bold text-gray-800 text-center line-clamp-1">
                    {leaderboard[0]?.profiles?.full_name}
                  </p>
                  <p className="text-xs text-primary font-semibold">
                    {leaderboard[0]?.score}%
                  </p>
                  <div className="mt-1 bg-primary text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center">
                    1
                  </div>
                </div>
                {/* 3rd */}
                <div className="flex flex-col items-center flex-1">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700 mb-1">
                    {initials(leaderboard[2]?.profiles?.full_name)}
                  </div>
                  <p className="text-xs font-semibold text-gray-700 text-center line-clamp-1">
                    {leaderboard[2]?.profiles?.full_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {leaderboard[2]?.score}%
                  </p>
                  <div className="mt-1 bg-amber-600 text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center">
                    3
                  </div>
                </div>
              </div>
            )}

            {/* Full list */}
            <div className="space-y-2">
              {leaderboard.map((entry, index) => {
                const rank = index + 1;
                const isMe = user && entry.user_id === user.id;
                const name = entry.profiles?.full_name ?? "Unknown";

                return (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl transition ${
                      isMe
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-white shadow-sm border border-transparent"
                    }`}
                  >
                    <div className="w-6 flex justify-center shrink-0">
                      <MedalIcon rank={rank} />
                    </div>
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isMe
                          ? "bg-primary text-white"
                          : "bg-tint text-primary-dark"
                      }`}
                    >
                      {initials(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold truncate ${isMe ? "text-primary-dark" : "text-gray-800"}`}
                      >
                        {name}
                        {isMe && (
                          <span className="ml-2 text-xs font-medium bg-primary text-white px-1.5 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        Time: {formatTime(entry.time_taken_seconds)}
                      </p>
                    </div>
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
          </>
        )}
      </div>
    </div>
  );
}
