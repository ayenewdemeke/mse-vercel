'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';

export type MemberWithUser = {
  id: string;
  userId: string;
  memberRoleId: string;
  createdAt: Date;
  user: { id: string; name: string | null; email: string; image: string | null };
  memberRole: { id: string; name: string };
};

async function requireOwner(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== session.user.id) return null;
  return session.user.id;
}

async function requireMember(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return null;
  if (project.userId === userId) return userId;
  const member = await db.member.findFirst({ where: { projectId, userId } });
  return member ? userId : null;
}

export async function getMembers(projectId: string): Promise<MemberWithUser[]> {
  const userId = await requireMember(projectId);
  if (!userId) return [];
  return db.member.findMany({
    where: { projectId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      memberRole: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getMember(projectId: string, memberId: string) {
  const userId = await requireMember(projectId);
  if (!userId) return null;
  return db.member.findUnique({
    where: { id: memberId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      memberRole: { select: { id: true, name: true } },
    },
  });
}

export async function getMemberRoles() {
  return db.memberRole.findMany({ orderBy: { name: 'asc' } });
}

export async function searchUserByEmail(projectId: string, email: string) {
  const ownerId = await requireOwner(projectId);
  if (!ownerId) return { error: 'Forbidden' as const };

  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, name: true, email: true },
  });
  if (!user) return { user: null as null };

  const existing = await db.member.findFirst({ where: { projectId, userId: user.id } });
  if (existing) return { error: 'This user is already a member of this project' as const };

  return { user };
}

export async function addMember(projectId: string, userId: string, memberRoleId: string) {
  const ownerId = await requireOwner(projectId);
  if (!ownerId) return { error: 'Forbidden' };

  const existing = await db.member.findFirst({ where: { projectId, userId } });
  if (existing) return { error: 'This user is already a member of this project' };

  await db.member.create({
    data: { projectId, userId, creatorId: ownerId, memberRoleId },
  });

  redirect(`/projects/${projectId}/members`);
}

export async function updateMemberRole(memberId: string, projectId: string, memberRoleId: string) {
  const ownerId = await requireOwner(projectId);
  if (!ownerId) return { error: 'Forbidden' };

  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member || member.projectId !== projectId) return { error: 'Not found' };

  await db.member.update({ where: { id: memberId }, data: { memberRoleId } });

  redirect(`/projects/${projectId}/members/${memberId}`);
}

export async function removeMember(memberId: string, projectId: string) {
  const ownerId = await requireOwner(projectId);
  if (!ownerId) return { error: 'Forbidden' };

  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member || member.projectId !== projectId) return { error: 'Not found' };
  if (member.userId === ownerId) return { error: 'Cannot remove the project owner' };

  const designCount = await db.design.count({ where: { projectId, userId: member.userId } });
  if (designCount > 0) return { error: 'Cannot remove a member who has created designs in this project' };

  await db.member.delete({ where: { id: memberId } });

  redirect(`/projects/${projectId}/members`);
}
