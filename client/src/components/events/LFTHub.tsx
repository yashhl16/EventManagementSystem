import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Sparkles,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  MessageCircle,
  Search,
  Plus,
  Trash2,
  Edit3,
  X,
  ExternalLink,
  Copy,
  Check,
  MessageSquare,
  Filter,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { LFTPost, User } from '../../types';
import { lftService } from '../../services/api';
import { Button } from '../common/Button';
import confetti from 'canvas-confetti';

interface LFTHubProps {
  eventId: string;
  currentUser: User | null;
  onTeamInviteSent?: () => void;
  onCreateTeamClick?: () => void;
}

const PRESET_SKILLS = [
  'Frontend',
  'React',
  'Backend',
  'Node.js',
  'Python',
  'AI / ML',
  'UI / UX',
  'Mobile App',
  'Cloud / DevOps',
  'CyberSecurity',
  'Data Science',
  'Fullstack',
];

const FILTER_PILLS = [
  'All',
  'Frontend',
  'Backend',
  'AI / ML',
  'UI / UX',
  'Python',
  'React',
  'Mobile App',
  'Cloud / DevOps',
];

export const LFTHub: React.FC<LFTHubProps> = ({
  eventId,
  currentUser,
  onTeamInviteSent,
  onCreateTeamClick,
}) => {
  const [posts, setPosts] = useState<LFTPost[]>([]);
  const [myPost, setMyPost] = useState<LFTPost | null>(null);
  const [myTeam, setMyTeam] = useState<{
    id: string;
    name: string;
    inviteCode: string;
    isLeader: boolean;
    memberCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [isInviting, setIsInviting] = useState<string | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Form state for creating / editing LFT post
  const [formSkills, setFormSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formContactPreference, setFormContactPreference] = useState('WhatsApp');
  const [formContactInfo, setFormContactInfo] = useState('');
  const [formStatus, setFormStatus] = useState<'OPEN' | 'MATCHED'>('OPEN');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkillFilter, setSelectedSkillFilter] = useState('All');

  // Connect / Teammate Contact Modal
  const [candidateForConnect, setCandidateForConnect] = useState<LFTPost | null>(null);
  const [copiedContact, setCopiedContact] = useState(false);

  const fetchLFTPosts = async () => {
    try {
      setIsLoading(true);
      const res = await lftService.getEventLFTPosts(eventId);
      if (res.data?.success) {
        setPosts(res.data.posts || []);
        setMyPost(res.data.myPost || null);
        setMyTeam(res.data.myTeam || null);

        if (res.data.myPost) {
          setFormSkills(res.data.myPost.skills || []);
          setFormBio(res.data.myPost.bio || '');
          setFormContactPreference(res.data.myPost.contactPreference || 'WhatsApp');
          setFormContactInfo(res.data.myPost.contactInfo || res.data.myPost.contactPreference || '');
          setFormStatus((res.data.myPost.status?.toUpperCase() as any) === 'MATCHED' ? 'MATCHED' : 'OPEN');
        } else if (currentUser) {
          // Pre-populate with current user phone or email
          setFormContactInfo(currentUser.phone || currentUser.email || '');
        }
      }
    } catch (err) {
      console.error('Failed to load LFT posts', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLFTPosts();
  }, [eventId]);

  const togglePresetSkill = (skill: string) => {
    if (formSkills.includes(skill)) {
      setFormSkills(formSkills.filter((s) => s !== skill));
    } else {
      if (formSkills.length >= 8) return;
      setFormSkills([...formSkills, skill]);
    }
  };

  const handleAddCustomSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();
    const clean = customSkillInput.trim().replace(/^,+|,+$/g, '');
    if (!clean) return;
    if (!formSkills.includes(clean) && formSkills.length < 8) {
      setFormSkills([...formSkills, clean]);
    }
    setCustomSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormSkills(formSkills.filter((s) => s !== skillToRemove));
  };

  const openCreateOrEditModal = () => {
    if (myPost) {
      setFormSkills(myPost.skills || []);
      setFormBio(myPost.bio || '');
      setFormContactPreference(myPost.contactPreference || 'WhatsApp');
      setFormContactInfo(myPost.contactInfo || myPost.contactPreference || '');
      setFormStatus(myPost.status?.toUpperCase() === 'MATCHED' ? 'MATCHED' : 'OPEN');
    } else {
      setFormSkills(['Frontend', 'Problem Solving']);
      setFormBio('');
      setFormContactPreference('WhatsApp');
      setFormContactInfo(currentUser?.phone || currentUser?.email || '');
      setFormStatus('OPEN');
    }
    setShowPostModal(true);
  };

  const handleSubmitLFTPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsPosting(true);
    setStatusMessage(null);

    const skillsToSave = formSkills.length > 0 ? formSkills : ['Problem Solving', 'General Tech'];

    try {
      const res = await lftService.createOrUpdateLFTPost(eventId, {
        skills: skillsToSave,
        bio: formBio.trim(),
        contactPreference: formContactPreference,
        contactInfo: formContactInfo.trim() || currentUser.email,
        status: formStatus,
      });

      if (res.data?.success) {
        setStatusMessage({
          text: res.data.message || 'Looking For Team profile broadcast successfully!',
          isError: false,
        });
        setShowPostModal(false);
        confetti({ particleCount: 60, spread: 60 });
        await fetchLFTPosts();
      }
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to post LFT profile.',
        isError: true,
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Withdraw your Looking For Team post from the teammate directory?')) return;
    try {
      await lftService.deleteLFTPost(eventId);
      setMyPost(null);
      setStatusMessage({ text: 'LFT post withdrawn successfully.', isError: false });
      await fetchLFTPosts();
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to remove post.',
        isError: true,
      });
    }
  };

  const handleMarkAsMatched = async () => {
    try {
      await lftService.createOrUpdateLFTPost(eventId, {
        skills: formSkills,
        bio: formBio,
        contactInfo: formContactInfo,
        contactPreference: formContactPreference,
        status: 'MATCHED',
      });
      setStatusMessage({
        text: 'Congratulations! Your status is now updated to MATCHED.',
        isError: false,
      });
      confetti({ particleCount: 70, spread: 70 });
      await fetchLFTPosts();
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to update status.',
        isError: true,
      });
    }
  };

  const handleInviteToTeam = async (lftId: string) => {
    if (!myTeam?.isLeader) {
      if (onCreateTeamClick) {
        onCreateTeamClick();
      } else {
        setStatusMessage({ text: 'Create a team first to invite candidates!', isError: true });
      }
      return;
    }

    setIsInviting(lftId);
    setStatusMessage(null);

    try {
      const res = await lftService.inviteLFTParticipant(eventId, lftId);
      if (res.data?.success) {
        setStatusMessage({
          text: res.data.message || 'Team invitation sent successfully!',
          isError: false,
        });
        setCandidateForConnect(null);
        confetti({ particleCount: 60, spread: 60 });
        if (onTeamInviteSent) onTeamInviteSent();
      }
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to send invitation.',
        isError: true,
      });
    } finally {
      setIsInviting(null);
    }
  };

  // Filter and search logic
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      // 1. Skill tag filter pill
      if (selectedSkillFilter !== 'All') {
        const hasSkill = (p.skills || []).some(
          (s) => s.toLowerCase() === selectedSkillFilter.toLowerCase()
        );
        if (!hasSkill) return false;
      }

      // 2. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (p.userName || p.candidateName || '').toLowerCase();
        const dept = (p.userDepartment || '').toLowerCase();
        const skills = (p.skills || []).map((s) => s.toLowerCase()).join(' ');
        const bioText = (p.bio || '').toLowerCase();
        return name.includes(q) || dept.includes(q) || skills.includes(q) || bioText.includes(q);
      }

      return true;
    });
  }, [posts, selectedSkillFilter, searchQuery]);

  return (
    <section
      id="lft-hub-section"
      className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6"
    >
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Users className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Find Teammates (LFT Hub)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Connect with skilled solo peers, broadcast your availability, and recruit teammates for this event.
          </p>
        </div>

        {/* Action Button: Post LFT Request */}
        <div className="flex items-center gap-2 shrink-0">
          {currentUser ? (
            myPost ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openCreateOrEditModal}
                  leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                >
                  Edit My LFT Request
                </Button>
                {myPost.status?.toUpperCase() !== 'MATCHED' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleMarkAsMatched}
                    className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    Mark Matched ✓
                  </Button>
                )}
                <button
                  type="button"
                  onClick={handleDeletePost}
                  title="Withdraw My LFT Request"
                  className="rounded-xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/40 cursor-pointer transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={openCreateOrEditModal}
                leftIcon={<Plus className="h-4 w-4" />}
                className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 font-bold"
              >
                Post LFT Request
              </Button>
            )
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.location.href = `/student/login?redirect=/events/${eventId}`;
              }}
            >
              Sign In to Post LFT
            </Button>
          )}
        </div>
      </div>

      {/* Action Status Notification */}
      {statusMessage && (
        <div
          className={`rounded-2xl p-4 text-xs flex items-center justify-between gap-3 ${
            statusMessage.isError
              ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.isError ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            )}
            <span className="font-semibold">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs underline hover:opacity-80 cursor-pointer font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teammates by skill, name, or pitch..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Active Candidates Count */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {filteredPosts.length} Teammate{filteredPosts.length !== 1 ? 's' : ''} Available
            </span>
          </div>
        </div>

        {/* Skill Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
            <Filter className="h-3 w-3" /> Filter:
          </span>
          {FILTER_PILLS.map((skill) => {
            const isActive = selectedSkillFilter === skill;
            return (
              <button
                type="button"
                key={skill}
                onClick={() => setSelectedSkillFilter(skill)}
                className={`rounded-full px-3 py-1 text-xs font-semibold shrink-0 transition cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {skill}
              </button>
            );
          })}
        </div>
      </div>

      {/* Teammate Directory / Cards Grid */}
      {isLoading ? (
        <div className="py-14 text-center text-xs text-slate-400 space-y-2">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p>Loading teammate directory...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-14 text-center dark:border-slate-800 space-y-3">
          <Users className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {searchQuery || selectedSkillFilter !== 'All'
                ? 'No matching teammates found'
                : 'No solo teammates currently posted for this event'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {currentUser && !myPost
                ? 'Be the first to post your LFT request so team leaders can recruit you!'
                : 'Check back soon or broaden your skill filter to discover candidates.'}
            </p>
          </div>
          {currentUser && !myPost && (
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateOrEditModal}
              leftIcon={<Plus className="h-4 w-4" />}
              className="mt-2"
            >
              Post LFT Request
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPosts.map((post) => {
            const isMe = currentUser && (post.userId === currentUser.id || post.userId === currentUser._id);
            const isMatched = post.status?.toUpperCase() === 'MATCHED';

            return (
              <div
                key={post.id || post._id}
                className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                  isMe
                    ? 'border-indigo-300 bg-indigo-50/25 dark:border-indigo-900/60 dark:bg-indigo-950/20'
                    : 'border-slate-200/80 bg-white hover:border-indigo-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-850 dark:hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Header: Avatar, Name, Department & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          post.userAvatar ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
                        }
                        alt={post.userName || post.candidateName}
                        className="h-12 w-12 rounded-full object-cover border-2 border-slate-100 dark:border-slate-700 shrink-0 shadow-sm"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {post.userName || post.candidateName}
                          </h4>
                          {isMe && (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {post.userDepartment || 'Campus Student'}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold shrink-0 ${
                        isMatched
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      {isMatched ? 'MATCHED' : 'LOOKING FOR TEAM'}
                    </span>
                  </div>

                  {/* Skill Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(post.skills || []).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-lg bg-indigo-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Pitch / Bio */}
                  {post.bio ? (
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50 text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">
                      "{post.bio}"
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No pitch provided.</p>
                  )}
                </div>

                {/* Footer metadata & Connect Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                    <MessageSquare className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    Prefers {post.contactPreference || 'WhatsApp / Email'}
                  </span>

                  {/* Connect / Invite Button */}
                  {isMe ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openCreateOrEditModal}
                      leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                    >
                      Edit Pitch
                    </Button>
                  ) : (
                    <Button
                      variant={myTeam?.isLeader ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setCandidateForConnect(post)}
                      leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                      className="cursor-pointer font-bold shrink-0"
                    >
                      {myTeam?.isLeader ? 'Connect / Invite' : 'Connect'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* POST CREATION / EDIT MODAL */}
      {/* ========================================================================= */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {myPost ? 'Edit LFT Request' : 'Post LFT Request'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Broadcast your technical strengths and preferred contact details.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPostModal(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLFTPost} className="space-y-4">
              {/* Skill Badges Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Primary Skill Badges ({formSkills.length}/8)
                  </label>
                  <span className="text-[11px] text-slate-400">Select or type custom tag</span>
                </div>

                {/* Selected pills */}
                {formSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    {formSkills.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(s)}
                          className="hover:opacity-80"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Preset quick-select tags */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_SKILLS.map((skill) => {
                    const isSelected = formSkills.includes(skill);
                    return (
                      <button
                        type="button"
                        key={skill}
                        onClick={() => togglePresetSkill(skill)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {skill}
                      </button>
                    );
                  })}
                </div>

                {/* Custom skill input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                    onKeyDown={handleAddCustomSkill}
                    placeholder="Add custom skill (e.g. Next.js, Figma, Go)..."
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomSkill}
                  >
                    Add Tag
                  </Button>
                </div>
              </div>

              {/* Short Pitch / Bio */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Short Pitch / Bio
                  </label>
                  <span className="text-[11px] text-slate-400">{formBio.length}/1000</span>
                </div>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  placeholder="e.g. Looking for a hackathon team, experience in Next.js and Tailwind, eager to lead frontend architecture and UI prototypes..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
                />
              </div>

              {/* Contact Information & Preferred Channel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Preferred Contact Channel
                  </label>
                  <select
                    value={formContactPreference}
                    onChange={(e) => setFormContactPreference(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="WhatsApp">WhatsApp / Mobile</option>
                    <option value="Email">College Email</option>
                    <option value="Discord">Discord</option>
                    <option value="Telegram">Telegram</option>
                    <option value="In-App">In-App CampusPulse</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Handle / Details
                  </label>
                  <input
                    type="text"
                    value={formContactInfo}
                    onChange={(e) => setFormContactInfo(e.target.value)}
                    placeholder="e.g. +91 9876543210 or @username"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Listing Status
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="OPEN"
                      checked={formStatus === 'OPEN'}
                      onChange={() => setFormStatus('OPEN')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Open (Actively seeking teammates)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="MATCHED"
                      checked={formStatus === 'MATCHED'}
                      onChange={() => setFormStatus('MATCHED')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Matched (Team formed)</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowPostModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isPosting}
                  className="font-bold bg-indigo-600 hover:bg-indigo-700"
                >
                  {myPost ? 'Update LFT Request' : 'Publish LFT Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONNECT / INVITE TO TEAM MODAL */}
      {/* ========================================================================= */}
      {candidateForConnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                Connect with Teammate
              </h3>
              <button
                type="button"
                onClick={() => setCandidateForConnect(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Candidate Details */}
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <img
                src={
                  candidateForConnect.userAvatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
                }
                alt={candidateForConnect.userName || candidateForConnect.candidateName}
                className="h-12 w-12 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
              <div className="overflow-hidden">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {candidateForConnect.userName || candidateForConnect.candidateName}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {candidateForConnect.userDepartment || 'Campus Student'}
                </p>
                <span className="inline-block mt-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                  Prefers {candidateForConnect.contactPreference || 'WhatsApp / Email'}
                </span>
              </div>
            </div>

            {/* Pitch snippet */}
            {candidateForConnect.bio && (
              <div className="text-xs text-slate-600 dark:text-slate-300 italic p-3 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/40">
                "{candidateForConnect.bio}"
              </div>
            )}

            {/* Direct Contact Options */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Direct Contact Details
              </span>

              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 text-xs">
                <span className="font-mono text-slate-800 dark:text-slate-200 truncate">
                  {candidateForConnect.contactInfo ||
                    candidateForConnect.userEmail ||
                    candidateForConnect.contactPreference ||
                    'Contact via College Email'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const info =
                      candidateForConnect.contactInfo ||
                      candidateForConnect.userEmail ||
                      candidateForConnect.contactPreference ||
                      '';
                    navigator.clipboard.writeText(info);
                    setCopiedContact(true);
                    setTimeout(() => setCopiedContact(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer shrink-0 ml-2"
                >
                  {copiedContact ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>

              {/* Action buttons based on contact channel */}
              <div className="flex gap-2 pt-1">
                {candidateForConnect.contactInfo?.match(/^[0-9+ ]+$/) ? (
                  <a
                    href={`https://wa.me/${candidateForConnect.contactInfo.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Open WhatsApp Chat
                  </a>
                ) : candidateForConnect.userEmail ? (
                  <a
                    href={`mailto:${candidateForConnect.userEmail}?subject=LFT%20Teammate%20Invite%20for%20Hackathon`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-700 transition"
                  >
                    <Mail className="h-4 w-4" />
                    Send Direct Email
                  </a>
                ) : null}
              </div>
            </div>

            {/* Official Team Invitation Section */}
            <div className="border-t border-slate-100 pt-4 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Official Competition Team Invitation
              </span>

              {myTeam ? (
                myTeam.isLeader ? (
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 font-bold"
                    isLoading={isInviting === candidateForConnect.id}
                    onClick={() => handleInviteToTeam(candidateForConnect.id)}
                    leftIcon={<UserPlus className="h-4 w-4" />}
                  >
                    Send Invitation to Join "{myTeam.name}"
                  </Button>
                ) : (
                  <p className="text-xs text-slate-500">
                    You are a member of team "{myTeam.name}". Only your team leader can send official roster invites.
                  </p>
                )
              ) : (
                <div className="rounded-xl bg-purple-50 p-3 text-xs text-purple-900 dark:bg-purple-950/40 dark:text-purple-300 space-y-2">
                  <p>
                    Are you forming a team? Create an official team to send direct roster invitations to candidates!
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-purple-300 hover:bg-purple-100"
                    onClick={() => {
                      setCandidateForConnect(null);
                      if (onCreateTeamClick) onCreateTeamClick();
                    }}
                  >
                    Create a Team Now &rarr;
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
