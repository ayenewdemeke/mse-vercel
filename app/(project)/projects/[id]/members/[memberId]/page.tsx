'use client';

import Link from 'next/link';
import { useState, useEffect, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getMember, getMemberRoles, updateMemberRole, removeMember } from '@/app/actions/members';
import { getProject } from '@/app/actions/projects';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, User } from 'lucide-react';

type Role = { id: string; name: string };
type Member = Awaited<ReturnType<typeof getMember>>;
type Project = Awaited<ReturnType<typeof getProject>>;

export default function MemberDetailPage() {
  const params = useParams<{ id: string; memberId: string }>();
  const { id, memberId } = params;

  const [member, setMember] = useState<Member>(null);
  const [project, setProject] = useState<Project>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    Promise.all([getMember(id, memberId), getProject(id), getMemberRoles()]).then(
      ([m, p, r]) => {
        setMember(m);
        setProject(p);
        setRoles(r);
        if (m) setSelectedRole(m.memberRoleId);
      }
    );
  }, [id, memberId]);

  if (!member || !project) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Loading…</div>
    );
  }

  const isOwner = project.userId === member.userId;
  // We can't access session here, but we check isOwner-of-project from the project owner check
  // The action itself enforces authorization
  const canManage = true; // actions enforce owner-only

  function handleUpdateRole(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await updateMemberRole(memberId, id, selectedRole);
      if (result?.error) setError(result.error);
    });
  }

  function handleRemove() {
    setError('');
    startTransition(async () => {
      const result = await removeMember(memberId, id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/projects/${id}/members`}>
            <ArrowLeft className="h-4 w-4" />Back
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold text-slate-800">Member details</h1>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-card rounded-xl border p-6 space-y-4 mb-4">
        <div className="flex items-center gap-4">
          {member.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/storage/${member.user.image}`}
              alt={member.user.name ?? ''}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-slate-200 flex items-center justify-center">
              <User className="h-7 w-7 text-slate-400" />
            </div>
          )}
          <div>
            <p className="font-semibold text-slate-800 text-lg">{member.user.name ?? 'No name'}</p>
            <p className="text-sm text-slate-500">{member.user.email}</p>
          </div>
        </div>

        <div className="divide-y">
          <div className="flex justify-between text-sm py-2.5">
            <span className="text-slate-500">Role</span>
            <span className="font-medium text-slate-800">{member.memberRole.name}</span>
          </div>
          <div className="flex justify-between text-sm py-2.5">
            <span className="text-slate-500">Date added</span>
            <span className="text-slate-700">{format(new Date(member.createdAt), 'MMMM d, yyyy')}</span>
          </div>
          {isOwner && (
            <div className="flex justify-between text-sm py-2.5">
              <span className="text-slate-500">Status</span>
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                Project Owner
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Edit role */}
      {canManage && !isOwner && (
        <div className="bg-card rounded-xl border p-6 mb-4">
          {!editMode ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Change this member&apos;s role</p>
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                Edit role
              </Button>
            </div>
          ) : (
            <form onSubmit={handleUpdateRole} className="space-y-4">
              <h3 className="font-medium text-slate-800">Update role</h3>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                required
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" type="button" onClick={() => { setEditMode(false); setSelectedRole(member.memberRoleId); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Remove member */}
      {canManage && !isOwner && (
        <div className="bg-card rounded-xl border border-red-200 p-6">
          {!confirmRemove ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Remove this member from the project</p>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={() => setConfirmRemove(true)}
              >
                Remove member
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">
                Are you sure you want to remove <strong>{member.user.name ?? member.user.email}</strong> from this project?
                Members with existing designs cannot be removed.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setConfirmRemove(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={handleRemove}
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm remove
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
