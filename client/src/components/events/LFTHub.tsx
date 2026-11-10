import React, { useState, useEffect } from 'react';
import {
  Users,
  Sparkles,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  Shield,
  Trash2,
  Edit3,
  Search,
  MessageSquare,
  Plus,
} from 'lucide-react';
import { LFTPost, User } from '../../types';
import { lftService } from '../../services/api';
import { Button } from '../common/Button';

interface LFTHubProps {
  eventId: string;
  currentUser: User | null;
  onTeamInviteSent?: () => void;
  onCreateTeamClick?: () => void;
}

const COMMON_SKILLS = [
  'Frontend (React/Vue)',
  'Backend (Node/Python)',
  'AI / Machine Learning',
  'UI / UX Design',
  'Mobile App Dev',
  'Cloud & DevOps',
  'CyberSecurity',
  'Data Science',
  'Fullstack',
  'Blockchain / Web3',
];

export const LFTHub: React.FC<LFTHubProps> = ({
  eventId,
  currentUser,
  onTeamInviteSent,
  onCreateTeamClick,
}) => {
  const [posts, setPosts] = useState<LFTPost[]>([]);
  const [myPost, setMyPost] = useState<LFTPost | null>(null);
  const [myTeam, setMyTeam] = useState<{ id: string; name: string; inviteCode: string; isLeader: boolean; memberCount: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [isInviting, setIsInviting] = useState<string | null>(null);
  const [showBroadcastForm, setShowBroadcastForm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Form state
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [contactPreference, setContactPreference] = useState('email');
  const [searchFilter, setSearchFilter] = useState('');

  const fetchLFTPosts = async () => {
    try {
      setIsLoading(true);
      const res = await lftService.getEventLFTPosts(eventId);
      if (res.data?.success) {
        setPosts(res.data.posts || []);
        setMyPost(res.data.myPost || null);
        setMyTeam(res.data.myTeam || null);
        if (res.data.myPost) {
          setSelectedSkills(res.data.myPost.skills || []);
          setBio(res.data.myPost.bio || '');
          setContactPreference(res.data.myPost.contactPreference || 'email');
        }
      }
    } catch (_) {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLFTPosts();
  }, [eventId]);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      if (selectedSkills.length >= 6) return;
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setStatusMessage(null);
    setIsPosting(true);

    try {
      const res = await lftService.createOrUpdateLFTPost(eventId, {
        skills: selectedSkills.length > 0 ? selectedSkills : ['Problem Solving', 'General Tech'],
        bio: bio.trim(),
        contactPreference,
      });

      if (res.data?.success) {
        setStatusMessage({ text: res.data.message || 'Profile broadcast successfully!', isError: false });
        setShowBroadcastForm(false);
        fetchLFTPosts();
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
    if (!window.confirm('Withdraw your Looking For Team post?')) return;
    try {
      await lftService.deleteLFTPost(eventId);
      setMyPost(null);
      setSelectedSkills([]);
      setBio('');
      setStatusMessage({ text: 'LFT post withdrawn successfully.', isError: false });
      fetchLFTPosts();
    } catch (err: any) {
      setStatusMessage({ text: 'Failed to remove post.', isError: true });
    }
  };

  const handleInvite = async (lftId: string) => {
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
          text: res.data.message || 'Invitation sent successfully!',
          isError: false,
        });
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

  const filteredPosts = posts.filter((p) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    const name = p.userName?.toLowerCase() || '';
    const dept = p.userDepartment?.toLowerCase() || '';
    const skills = p.skills?.map((s) => s.toLowerCase()).join(' ') || '';
    const pBio = p.bio?.toLowerCase() || '';
    return name.includes(q) || dept.includes(q) || skills.includes(q) || pBio.includes(q);
  });

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Users className="h-4 w-4" />
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Looking for Team (LFT) Matching Hub
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Solo participants can broadcast their skills and availability, and team leaders can recruit teammates directly.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && !myPost && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowBroadcastForm(!showBroadcastForm)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              {showBroadcastForm ? 'Cancel' : 'Broadcast Availability'}
            </Button>
          )}

          {myPost && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBroadcastForm(!showBroadcastForm)}
                leftIcon={<Edit3 className="h-3.5 w-3.5" />}
              >
                {showBroadcastForm ? 'Close Edit' : 'Edit My Pitch'}
              </Button>
              <button
                type="button"
                onClick={handleDeletePost}
                title="Withdraw LFT Profile"
                className="rounded-xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/40 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Message Notification */}
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
            className="text-xs underline hover:opacity-80 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Broadcast Form (Collapsible) */}
      {showBroadcastForm && (
        <form
          onSubmit={handleBroadcast}
          className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 p-5 dark:border-indigo-900/40 dark:from-slate-800/80 dark:to-slate-900 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3 dark:border-slate-700">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              {myPost ? 'Update Your Candidate Profile' : 'Broadcast Availability to Team Leaders'}
            </h4>
            <span className="text-[11px] text-slate-500">Pick up to 6 skills</span>
          </div>

          {/* Skill Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Primary Skills & Technical Strengths
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SKILLS.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <button
                    type="button"
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bio / Candidate Pitch */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Short Pitch & Background ({bio.length}/1000)
            </label>
            <textarea
              rows={2}
              maxLength={1000}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. 3rd-year CS student with experience in PyTorch and React. Looking to build an AI/ML prototype or hackathon project..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Contact Preference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Preferred Contact Method
              </label>
              <select
                value={contactPreference}
                onChange={(e) => setContactPreference(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="email">College Email ({currentUser?.email})</option>
                <option value="in_app">In-App CampusPulse Notifications</option>
                <option value="discord">Discord / Chat</option>
                <option value="phone">Direct Mobile Call / WhatsApp</option>
              </select>
            </div>

            <div className="flex items-end justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setShowBroadcastForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isPosting}
              >
                {myPost ? 'Update Pitch' : 'Broadcast to Hub'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Roster & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search candidates by skill, name, or department..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {filteredPosts.length}
          </span>
          candidate{filteredPosts.length !== 1 ? 's' : ''} looking for a team
        </div>
      </div>

      {/* Candidates List Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Loading Looking for Team roster...
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center dark:border-slate-800">
          <Users className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {searchFilter ? 'No candidates match your search.' : 'No solo candidates currently posted for this event.'}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 max-w-xs mx-auto">
            {currentUser && !myPost
              ? 'Be the first to broadcast your availability so team leaders can recruit you!'
              : 'Solo students looking for a team will appear here.'}
          </p>
          {currentUser && !myPost && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 cursor-pointer"
              onClick={() => setShowBroadcastForm(true)}
            >
              Broadcast My Profile
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPosts.map((post) => {
            const isMe = currentUser && (post.userId === currentUser.id || post.userId === currentUser._id);
            return (
              <div
                key={post.id || post._id}
                className={`rounded-2xl border p-4 transition-all ${
                  isMe
                    ? 'border-indigo-300 bg-indigo-50/30 dark:border-indigo-900/60 dark:bg-indigo-950/20'
                    : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        post.userAvatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
                      }
                      alt={post.userName}
                      className="h-11 w-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {post.userName}
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

                  {/* Invite or Status Action */}
                  {!isMe && currentUser && (
                    <Button
                      variant={myTeam?.isLeader ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => handleInvite(post.id)}
                      isLoading={isInviting === post.id}
                      leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                    >
                      {myTeam?.isLeader ? 'Invite to Team' : 'Recruit'}
                    </Button>
                  )}
                </div>

                {/* Skills */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {post.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Pitch / Bio */}
                {post.bio && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    "{post.bio}"
                  </p>
                )}

                {/* Footer metadata */}
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 dark:border-slate-800">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Prefers {post.contactPreference}
                  </span>
                  <span>
                    Posted {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
