'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile';
import { trpc } from '@/lib/trpc/client';
import {
  Users,
  RefreshCw,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  Trash2,
  UserPlus,
  FileText,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// Format date to readable date string
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

// Format time
function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

// Format responded at timestamp
function formatRespondedAt(date: Date | null): string {
  if (!date) return 'Not responded';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

// Get status badge styles
function getStatusBadge(status: string) {
  switch (status) {
    case 'accepted':
      return { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle2 };
    case 'declined':
      return { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle };
    case 'pending':
    default:
      return { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: AlertCircle };
  }
}

// Get session status color
function getSessionStatusColor(status: string) {
  switch (status) {
    case 'scheduled':
      return 'bg-twilight-500';
    case 'completed':
      return 'bg-green-500';
    case 'cancelled':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

type TabType = 'rsvps' | 'details';

export default function GroupSessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const utils = trpc.useUtils();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('rsvps');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedMentees, setSelectedMentees] = useState<string[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    agenda: '',
    scheduledAt: '',
    scheduledTime: '',
    durationMinutes: 60,
    maxParticipants: '',
    location: '',
    status: 'scheduled' as 'scheduled' | 'available' | 'booked' | 'completed' | 'cancelled',
  });

  // TRPC queries
  const { data: session, isLoading } = trpc.groupSessions.getGroupSessionDetail.useQuery(
    { sessionId },
    { enabled: !!sessionId }
  );

  const { data: classMembers } = trpc.groupSessions.getClassMembers.useQuery(
    { classId: session?.classId || '' },
    { enabled: !!session?.classId }
  );

  // Mutations
  const updateSession = trpc.groupSessions.update.useMutation({
    onSuccess: () => {
      utils.groupSessions.getGroupSessionDetail.invalidate({ sessionId });
      utils.groupSessions.getMyGroupSessions.invalidate();
      setShowEditDialog(false);
    },
  });

  const deleteSession = trpc.groupSessions.delete.useMutation({
    onSuccess: () => {
      router.push('/mentor/group-sessions');
    },
  });

  const inviteMentees = trpc.groupSessions.inviteMentees.useMutation({
    onSuccess: () => {
      utils.groupSessions.getGroupSessionDetail.invalidate({ sessionId });
      setShowInviteDialog(false);
      setSelectedMentees([]);
    },
  });

  // Initialize edit form when session loads
  useEffect(() => {
    if (session) {
      const scheduledDate = new Date(session.scheduledAt);
      setEditForm({
        title: session.title,
        description: session.description || '',
        agenda: session.agenda || '',
        scheduledAt: scheduledDate.toISOString().split('T')[0],
        scheduledTime: scheduledDate.toTimeString().slice(0, 5),
        durationMinutes: session.durationMinutes,
        maxParticipants: session.maxParticipants?.toString() || '',
        location: session.location || '',
        status: session.status,
      });
    }
  }, [session]);

  // Pull to refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollTop = contentRef.current?.scrollTop ?? 0;
    if (scrollTop <= 0) {
      setTouchStart(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (touchStart === null) return;
      const currentTouch = e.touches[0].clientY;
      const distance = currentTouch - touchStart;
      if (distance > 0) {
        setPullDistance(Math.min(distance, 100));
      }
    },
    [touchStart]
  );

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= 60 && !isRefreshing) {
      setIsRefreshing(true);
      await utils.groupSessions.getGroupSessionDetail.invalidate({ sessionId });
      setIsRefreshing(false);
    }
    setTouchStart(null);
    setPullDistance(0);
  }, [pullDistance, isRefreshing, utils, sessionId]);

  useEffect(() => {
    if (touchStart === null) {
      setPullDistance(0);
    }
  }, [touchStart]);

  // Handle edit submit
  const handleEditSubmit = () => {
    const [hours, minutes] = editForm.scheduledTime.split(':').map(Number);
    const scheduledDate = new Date(editForm.scheduledAt);
    scheduledDate.setHours(hours, minutes, 0, 0);

    updateSession.mutate({
      sessionId,
      title: editForm.title,
      description: editForm.description || null,
      agenda: editForm.agenda || null,
      scheduledAt: scheduledDate.toISOString(),
      durationMinutes: editForm.durationMinutes,
      maxParticipants: editForm.maxParticipants ? parseInt(editForm.maxParticipants) : null,
      location: editForm.location || null,
      status: editForm.status,
    });
  };

  // Handle delete
  const handleDelete = () => {
    deleteSession.mutate({ sessionId });
  };

  // Handle invite
  const handleInvite = () => {
    if (selectedMentees.length === 0) return;
    inviteMentees.mutate({ sessionId, userIds: selectedMentees });
  };

  // Toggle mentee selection
  const toggleMenteeSelection = (userId: string) => {
    setSelectedMentees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Get mentees not yet invited
  const uninvitedMentees = classMembers?.filter(
    (member) => !session?.rsvps.some((rsvp) => rsvp.userId === member.userId)
  );

  if (isLoading) {
    return (
      <MobileLayout title="Group Session" showBack showNotifications>
        <div className="flex min-h-[50vh] items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-twilight-400" />
        </div>
      </MobileLayout>
    );
  }

  if (!session) {
    return (
      <MobileLayout title="Group Session" showBack showNotifications>
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
          <p className="text-gray-400">Session not found</p>
          <button
            onClick={() => router.push('/mentor/group-sessions')}
            className="mt-4 text-twilight-400 hover:text-twilight-300"
          >
            Back to sessions
          </button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title={session.title} showBack showNotifications>
      <div
        ref={contentRef}
        className="px-4 py-6"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid="session-detail-page"
      >
        {/* Pull to refresh indicator */}
        {(pullDistance > 0 || isRefreshing) && (
          <div
            className="flex items-center justify-center py-4 transition-all duration-200"
            style={{ height: isRefreshing ? 48 : pullDistance * 0.5 }}
            data-testid="pull-to-refresh-indicator"
          >
            <RefreshCw
              className={`h-6 w-6 text-twilight-400 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </div>
        )}

        {/* Session header */}
        <div className="mb-6" data-testid="session-header">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${getSessionStatusColor(session.status)}`} />
                <h1 className="text-2xl font-bold text-white">{session.title}</h1>
              </div>
              {session.className && (
                <p className="mt-1 text-sm text-gray-400">{session.className}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditDialog(true)}
                className="rounded-lg bg-gray-800 p-2 text-gray-300 hover:bg-gray-700"
                data-testid="edit-button"
              >
                <Edit2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="rounded-lg bg-gray-800 p-2 text-red-400 hover:bg-gray-700"
                data-testid="delete-button"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick info */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(session.scheduledAt)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTime(session.scheduledAt)} ({session.durationMinutes}m)
            </span>
            {session.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {session.location}
              </span>
            )}
            {session.maxParticipants && (
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Max: {session.maxParticipants}
              </span>
            )}
          </div>
        </div>

        {/* RSVP Summary Cards */}
        <div className="mb-6 grid grid-cols-3 gap-3" data-testid="rsvp-summary">
          <div className="rounded-xl bg-green-500/10 p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{session.rsvpCounts.accepted}</p>
            <p className="text-xs text-green-400/70">Accepted</p>
          </div>
          <div className="rounded-xl bg-amber-500/10 p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{session.rsvpCounts.pending}</p>
            <p className="text-xs text-amber-400/70">Pending</p>
          </div>
          <div className="rounded-xl bg-red-500/10 p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{session.rsvpCounts.declined}</p>
            <p className="text-xs text-red-400/70">Declined</p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="mb-4 flex rounded-xl bg-gray-900 p-1" data-testid="tab-navigation">
          <button
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              activeTab === 'rsvps' ? 'bg-twilight-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('rsvps')}
            data-testid="tab-rsvps"
          >
            <Users className="mr-1 inline-block h-4 w-4" />
            RSVPs ({session.rsvps.length})
          </button>
          <button
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              activeTab === 'details' ? 'bg-twilight-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('details')}
            data-testid="tab-details"
          >
            <FileText className="mr-1 inline-block h-4 w-4" />
            Details
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'rsvps' && (
          <div className="space-y-3" data-testid="rsvps-list">
            {/* Invite button */}
            {session.classId && uninvitedMentees && uninvitedMentees.length > 0 && (
              <button
                onClick={() => setShowInviteDialog(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-700 bg-gray-900/50 p-4 text-twilight-400 hover:border-twilight-500 hover:bg-gray-900"
                data-testid="invite-more-button"
              >
                <UserPlus className="h-5 w-5" />
                Invite more mentees ({uninvitedMentees.length} available)
              </button>
            )}

            {/* RSVP list */}
            {session.rsvps.length > 0 ? (
              session.rsvps.map((rsvp) => {
                const statusStyle = getStatusBadge(rsvp.status);
                const StatusIcon = statusStyle.icon;

                return (
                  <div
                    key={rsvp.id}
                    className="rounded-xl bg-gray-900 p-4"
                    data-testid={`rsvp-item-${rsvp.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${statusStyle.bg}`}
                        >
                          <StatusIcon className={`h-5 w-5 ${statusStyle.text}`} />
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {rsvp.user.name || rsvp.user.email}
                          </p>
                          <p className="text-xs text-gray-400">{rsvp.user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          {rsvp.status.charAt(0).toUpperCase() + rsvp.status.slice(1)}
                        </span>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatRespondedAt(rsvp.respondedAt)}
                        </p>
                      </div>
                    </div>
                    {rsvp.notes && (
                      <p className="mt-2 text-sm text-gray-400 italic">&quot;{rsvp.notes}&quot;</p>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl bg-gray-900 p-8 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-600" />
                <p className="mt-4 text-gray-400">No participants invited yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-4" data-testid="session-details">
            {/* Description */}
            <div className="rounded-xl bg-gray-900 p-4">
              <h3 className="mb-2 text-sm font-medium text-gray-400">Description</h3>
              <p className="text-white">{session.description || 'No description provided'}</p>
            </div>

            {/* Agenda */}
            <div className="rounded-xl bg-gray-900 p-4" data-testid="agenda-section">
              <h3 className="mb-2 text-sm font-medium text-gray-400">Agenda</h3>
              <p className="whitespace-pre-wrap text-white">
                {session.agenda || 'No agenda provided'}
              </p>
            </div>

            {/* Session Info */}
            <div className="rounded-xl bg-gray-900 p-4">
              <h3 className="mb-2 text-sm font-medium text-gray-400">Session Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className="capitalize text-white">{session.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration</span>
                  <span className="text-white">{session.durationMinutes} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Participants</span>
                  <span className="text-white">{session.maxParticipants || 'Unlimited'}</span>
                </div>
                {session.location && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Location</span>
                    <span className="text-white">{session.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-h-[90vh] overflow-y-auto bg-gray-900 text-white">
            <DialogHeader>
              <DialogTitle>Edit Group Session</DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEditSubmit();
              }}
              className="space-y-4"
              data-testid="edit-session-form"
            >
              {/* Title */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none"
                  data-testid="edit-input-title"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none"
                  rows={2}
                  data-testid="edit-input-description"
                />
              </div>

              {/* Agenda */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">Agenda</label>
                <textarea
                  value={editForm.agenda}
                  onChange={(e) => setEditForm({ ...editForm, agenda: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none"
                  rows={3}
                  data-testid="edit-input-agenda"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Date</label>
                  <input
                    type="date"
                    value={editForm.scheduledAt}
                    onChange={(e) => setEditForm({ ...editForm, scheduledAt: e.target.value })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none"
                    data-testid="edit-input-date"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Time</label>
                  <input
                    type="time"
                    value={editForm.scheduledTime}
                    onChange={(e) => setEditForm({ ...editForm, scheduledTime: e.target.value })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none"
                    data-testid="edit-input-time"
                  />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Duration (minutes)
                </label>
                <select
                  value={editForm.durationMinutes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, durationMinutes: parseInt(e.target.value) })
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none"
                  data-testid="edit-input-duration"
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                  <option value={120}>120 minutes</option>
                </select>
              </div>

              {/* Max Participants */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Max Participants
                </label>
                <input
                  type="number"
                  value={editForm.maxParticipants}
                  onChange={(e) => setEditForm({ ...editForm, maxParticipants: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none"
                  placeholder="Leave empty for unlimited"
                  min={1}
                  data-testid="edit-input-max-participants"
                />
              </div>

              {/* Location */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">Location</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none"
                  data-testid="edit-input-location"
                />
              </div>

              {/* Status */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value as typeof editForm.status })
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none"
                  data-testid="edit-input-status"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <DialogFooter className="gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditDialog(false)}
                  className="rounded-lg border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateSession.isPending}
                  className="rounded-lg bg-twilight-600 px-4 py-2 font-medium text-white hover:bg-twilight-700 disabled:opacity-50"
                >
                  {updateSession.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="bg-gray-900 text-white">
            <DialogHeader>
              <DialogTitle>Delete Group Session</DialogTitle>
            </DialogHeader>
            <p className="text-gray-400">
              Are you sure you want to delete this group session? This action cannot be undone and
              all RSVPs will be removed.
            </p>
            <DialogFooter className="gap-2">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="rounded-lg border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteSession.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
                data-testid="confirm-delete-button"
              >
                {deleteSession.isPending ? 'Deleting...' : 'Delete Session'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invite Mentees Dialog */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent className="max-h-[90vh] overflow-y-auto bg-gray-900 text-white">
            <DialogHeader>
              <DialogTitle>Invite Mentees</DialogTitle>
            </DialogHeader>

            <div className="space-y-3" data-testid="invite-mentees-list">
              {uninvitedMentees && uninvitedMentees.length > 0 ? (
                uninvitedMentees.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => toggleMenteeSelection(member.userId)}
                    className={`flex w-full items-center justify-between rounded-xl p-4 text-left transition-colors ${
                      selectedMentees.includes(member.userId)
                        ? 'bg-twilight-600/20 ring-1 ring-twilight-500'
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                    data-testid={`invite-mentee-${member.userId}`}
                  >
                    <div>
                      <p className="font-medium text-white">
                        {member.user.name || member.user.email}
                      </p>
                      <p className="text-sm text-gray-400">{member.user.email}</p>
                    </div>
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full ${
                        selectedMentees.includes(member.userId)
                          ? 'bg-twilight-500'
                          : 'border border-gray-600'
                      }`}
                    >
                      {selectedMentees.includes(member.userId) && (
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-center text-gray-400">All class members are already invited</p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <button
                onClick={() => {
                  setShowInviteDialog(false);
                  setSelectedMentees([]);
                }}
                className="rounded-lg border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={inviteMentees.isPending || selectedMentees.length === 0}
                className="rounded-lg bg-twilight-600 px-4 py-2 font-medium text-white hover:bg-twilight-700 disabled:opacity-50"
                data-testid="confirm-invite-button"
              >
                {inviteMentees.isPending
                  ? 'Inviting...'
                  : `Invite ${selectedMentees.length} Mentee${selectedMentees.length !== 1 ? 's' : ''}`}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}
