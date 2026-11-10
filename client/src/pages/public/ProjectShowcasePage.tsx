import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Trophy,
  Heart,
  ExternalLink,
  Github,
  Figma,
  FileText,
  Search,
  ArrowLeft,
  Users,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Filter,
  Download,
  Flame,
} from 'lucide-react';
import { Submission, EventRound } from '../../types';
import { showcaseService, roundService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/common/Button';

export const ProjectShowcasePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [rounds, setRounds] = useState<EventRound[]>([]);
  const [eventData, setEventData] = useState<any>(null);
  const [totalVotes, setTotalVotes] = useState<number>(0);
  const [userVotedId, setUserVotedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'votes' | 'recent'>('votes');
  const [voteFeedback, setVoteFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  const fetchShowcaseData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const [showcaseRes, roundsRes] = await Promise.all([
        showcaseService.getEventShowcase(id, {
          roundId: selectedRoundFilter !== 'all' ? selectedRoundFilter : undefined,
          search: searchQuery.trim() || undefined,
          sortBy,
        }),
        roundService.getEventRounds(id).catch(() => ({ data: { rounds: [] } })),
      ]);

      if (showcaseRes.data?.success) {
        setSubmissions(showcaseRes.data.submissions || []);
        setTotalVotes(showcaseRes.data.totalVotes || 0);
        setUserVotedId(showcaseRes.data.userVotedSubmissionId || null);
        setEventData(showcaseRes.data.event || null);
      }

      if (roundsRes.data?.success) {
        setRounds(roundsRes.data.rounds || []);
      }
    } catch (_) {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShowcaseData();
  }, [id, selectedRoundFilter, sortBy]);

  const handleVote = async (submissionId: string) => {
    if (!isAuthenticated) {
      navigate('/student/login', { state: { from: window.location.pathname } });
      return;
    }

    if (!id) return;
    setIsVoting(submissionId);
    setVoteFeedback(null);

    // If user already voted for this project, retract vote
    if (userVotedId === submissionId) {
      try {
        const res = await showcaseService.retractVote(id);
        if (res.data?.success) {
          setUserVotedId(null);
          setSubmissions((prev) =>
            prev.map((s) => (s.id === submissionId ? { ...s, votesCount: Math.max(0, (s.votesCount || 1) - 1), hasVoted: false } : s))
          );
          setTotalVotes((prev) => Math.max(0, prev - 1));
          setVoteFeedback({ text: 'Vote retracted.', isError: false });
        }
      } catch (err: any) {
        setVoteFeedback({ text: err.response?.data?.message || 'Failed to retract vote.', isError: true });
      } finally {
        setIsVoting(null);
      }
      return;
    }

    // Cast or switch vote
    try {
      const res = await showcaseService.castVote(id, submissionId);
      if (res.data?.success) {
        const prevVoted = userVotedId;
        setUserVotedId(submissionId);

        setSubmissions((prev) =>
          prev.map((s) => {
            if (s.id === submissionId) {
              return { ...s, votesCount: (s.votesCount || 0) + 1, hasVoted: true };
            }
            if (prevVoted && s.id === prevVoted) {
              return { ...s, votesCount: Math.max(0, (s.votesCount || 1) - 1), hasVoted: false };
            }
            return s;
          })
        );

        if (!prevVoted) {
          setTotalVotes((prev) => prev + 1);
        }

        setVoteFeedback({ text: res.data.message || 'Vote recorded successfully!', isError: false });
      }
    } catch (err: any) {
      setVoteFeedback({ text: err.response?.data?.message || 'Failed to record vote.', isError: true });
    } finally {
      setIsVoting(null);
    }
  };

  // Compute Leaderboard Top 3 Podium
  const topPodium = [...submissions]
    .sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0))
    .slice(0, 3)
    .filter((s) => (s.votesCount || 0) > 0);

  const filteredSubmissions = submissions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = s.title.toLowerCase();
    const desc = (s.description || '').toLowerCase();
    const team = (s.teamName || '').toLowerCase();
    return title.includes(q) || desc.includes(q) || team.includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Back navigation */}
        <div className="flex items-center justify-between">
          <Link
            to={`/events/${id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Event Overview
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
              <Flame className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
              People's Choice Award Active
            </span>
          </div>
        </div>

        {/* Hero Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 p-8 sm:p-10 text-white shadow-2xl">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-slate-950">
                <Trophy className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Official Project Showcase & Voting Gallery
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {eventData?.title || 'Competition Deliverables Showcase'}
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed max-w-2xl">
              Explore submissions, inspect prototypes and slide decks, and cast your official vote for the People's Choice Award. Every authenticated student and attendee gets 1 vote per event.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold">
              <span className="rounded-xl bg-white/10 px-3.5 py-1.5 backdrop-blur-md">
                🏆 {submissions.length} Showcase Submissions
              </span>
              <span className="rounded-xl bg-amber-400/20 text-amber-200 px-3.5 py-1.5 backdrop-blur-md border border-amber-400/30">
                ❤️ {totalVotes} Total Votes Cast
              </span>
            </div>
          </div>
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        </div>

        {/* Feedback Alert */}
        {voteFeedback && (
          <div
            className={`rounded-2xl p-4 text-xs flex items-center justify-between gap-3 ${
              voteFeedback.isError
                ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {voteFeedback.isError ? (
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              )}
              <span className="font-semibold">{voteFeedback.text}</span>
            </div>
            <button
              onClick={() => setVoteFeedback(null)}
              className="text-xs underline hover:opacity-80 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Leaderboard Podium (Top 3) */}
        {topPodium.length > 0 && (
          <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/60 via-white to-indigo-50/40 p-6 shadow-sm dark:border-amber-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  People's Choice Leaderboard Podium
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Live Top Rankings
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {topPodium.map((podiumItem, idx) => {
                const rankLabels = ['1st Place (Gold)', '2nd Place (Silver)', '3rd Place (Bronze)'];
                const rankBadges = [
                  'bg-amber-500 text-white shadow-amber-200',
                  'bg-slate-400 text-white shadow-slate-200',
                  'bg-amber-700 text-white shadow-amber-900',
                ];

                return (
                  <div
                    key={podiumItem.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800/80 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-sm ${rankBadges[idx]}`}>
                        #{idx + 1} {rankLabels[idx]}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                        <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                        {podiumItem.votesCount}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {podiumItem.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Team: {podiumItem.teamName || 'Independent'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Toolbar: Search, Round Filter & Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects by title, team, or keywords..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white shadow-sm"
              />
            </div>

            {rounds.length > 0 && (
              <select
                value={selectedRoundFilter}
                onChange={(e) => setSelectedRoundFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white shadow-sm"
              >
                <option value="all">All Competition Stages</option>
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    Round {r.roundNumber}: {r.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Sort by:</span>
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900 shadow-sm text-xs">
              <button
                type="button"
                onClick={() => setSortBy('votes')}
                className={`rounded-lg px-3 py-1 font-semibold transition cursor-pointer ${
                  sortBy === 'votes'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                🔥 Most Voted
              </button>
              <button
                type="button"
                onClick={() => setSortBy('recent')}
                className={`rounded-lg px-3 py-1 font-semibold transition cursor-pointer ${
                  sortBy === 'recent'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                🕒 Recent
              </button>
            </div>
          </div>
        </div>

        {/* Submissions Gallery Grid */}
        {isLoading ? (
          <div className="py-20 text-center text-xs text-slate-400">
            Loading public project gallery...
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 py-16 text-center dark:border-slate-800 space-y-2">
            <Trophy className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              No project submissions found
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? 'No projects match your filter. Try clearing your search query.'
                : 'Participating teams have not uploaded deliverables yet. Check back soon!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubmissions.map((sub) => {
              const isVotedByMe = userVotedId === sub.id;

              return (
                <div
                  key={sub.id || sub._id}
                  className={`rounded-3xl border bg-white p-6 shadow-sm flex flex-col justify-between transition-all dark:bg-slate-900 ${
                    isVotedByMe
                      ? 'border-rose-300 ring-2 ring-rose-400/20 shadow-md shadow-rose-100/50 dark:border-rose-900/60 dark:ring-rose-950/40'
                      : 'border-slate-200/80 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header tags */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        <Users className="h-3 w-3" />
                        {sub.teamName || 'Solo Project'}
                      </span>

                      {sub.roundTitle && (
                        <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                          {sub.roundTitle}
                        </span>
                      )}
                    </div>

                    {/* Project Title & Description */}
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white line-clamp-1">
                        {sub.title}
                      </h3>
                      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                        {sub.description || 'No description provided for this deliverable submission.'}
                      </p>
                    </div>

                    {/* Member Avatars */}
                    {sub.members && sub.members.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <div className="flex -space-x-2">
                          {sub.members.slice(0, 4).map((m, idx) => (
                            <img
                              key={idx}
                              src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                              alt={m.name}
                              title={m.name}
                              className="h-6 w-6 rounded-full border-2 border-white object-cover dark:border-slate-900"
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {sub.members.length} team member{sub.members.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {/* Deliverable Resource Links */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {sub.fileUrl && (
                        <a
                          href={sub.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
                        >
                          <FileText className="h-3.5 w-3.5 text-indigo-500" />
                          View Deck / Doc
                        </a>
                      )}

                      {sub.githubUrl && (
                        <a
                          href={sub.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
                        >
                          <Github className="h-3.5 w-3.5" />
                          Code
                        </a>
                      )}

                      {sub.figmaUrl && (
                        <a
                          href={sub.figmaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
                        >
                          <Figma className="h-3.5 w-3.5 text-purple-500" />
                          Prototype
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Voting Action Footer */}
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                        <Heart className="h-4 w-4 fill-rose-500" />
                      </span>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {sub.votesCount || 0}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        vote{(sub.votesCount || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <Button
                      variant={isVotedByMe ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => handleVote(sub.id)}
                      isLoading={isVoting === sub.id}
                      className={
                        isVotedByMe
                          ? 'bg-rose-600 hover:bg-rose-700 text-white border-transparent'
                          : 'hover:border-rose-300 hover:text-rose-600'
                      }
                      leftIcon={
                        <Heart
                          className={`h-3.5 w-3.5 ${
                            isVotedByMe ? 'fill-white text-white' : 'text-slate-400'
                          }`}
                        />
                      }
                    >
                      {isVotedByMe ? 'Voted' : 'Vote'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
