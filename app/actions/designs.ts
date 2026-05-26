'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';

export type DesignListItem = Prisma.DesignGetPayload<{
  include: {
    creator: { select: { id: true; name: true } };
    designType: { select: { id: true; name: true; key: true } };
  };
}>;

async function requireMember(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return null;
  if (project.userId === userId) return { userId, isOwner: true };
  const member = await db.member.findFirst({ where: { projectId, userId } });
  return member ? { userId, isOwner: false } : null;
}

export async function getDesigns(projectId: string): Promise<DesignListItem[]> {
  const access = await requireMember(projectId);
  if (!access) return [];
  return db.design.findMany({
    where: { projectId },
    include: {
      creator: { select: { id: true, name: true } },
      designType: { select: { id: true, name: true, key: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getDesignTypes() {
  return db.designType.findMany({ orderBy: { name: 'asc' } });
}

export async function deleteDesign(designId: string, projectId: string) {
  const access = await requireMember(projectId);
  if (!access) return { error: 'Forbidden' };

  const design = await db.design.findUnique({ where: { id: designId } });
  if (!design || design.projectId !== projectId) return { error: 'Not found' };

  if (!access.isOwner && design.userId !== access.userId) return { error: 'Forbidden' };

  await db.design.delete({ where: { id: designId } });

  redirect(`/projects/${projectId}/designs`);
}
