import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { getMembers } from '@/app/actions/members';
import { getProject } from '@/app/actions/projects';
import { format } from 'date-fns';
import { Plus, Users } from 'lucide-react';

export default async function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const [project, members] = await Promise.all([getProject(id), getMembers(id)]);
  if (!project) notFound();

  const isOwner = project.userId === session?.user?.id;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 mb-1">Team members</h1>
          <p className="text-slate-500 text-sm">Manage who has access to this project.</p>
        </div>
        {isOwner && (
          <Button asChild size="sm">
            <Link href={`/projects/${id}/members/add`}>
              <Plus className="h-4 w-4" />
              Add member
            </Link>
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-slate-700 mb-1">No members yet</p>
          <p className="text-sm text-slate-500">Add team members to collaborate on this project.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">#</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Added</th>
                {isOwner && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((member, i) => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{member.user.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{member.user.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {member.memberRole.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{format(new Date(member.createdAt), 'MMM d, yyyy')}</td>
                  {isOwner && (
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/projects/${id}/members/${member.id}`}>View</Link>
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
