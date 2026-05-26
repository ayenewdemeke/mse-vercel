'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { Storage } from '@/lib/storage';
import { redirect } from 'next/navigation';

export type DocumentItem = {
  id: string;
  name: string;
  file: string;
  description: string | null;
  userId: string;
  createdAt: Date;
  uploader: { id: string; name: string };
};

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

export async function getDocuments(projectId: string): Promise<DocumentItem[]> {
  const access = await requireMember(projectId);
  if (!access) return [];
  return db.document.findMany({
    where: { projectId },
    include: { uploader: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createDocument(projectId: string, formData: FormData) {
  const access = await requireMember(projectId);
  if (!access) return { error: 'Forbidden' };

  const name = (formData.get('name') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const file = formData.get('file') as File | null;

  if (!name) return { error: 'Document name is required' };
  if (!file || file.size === 0) return { error: 'A file is required' };
  if (file.size > 20 * 1024 * 1024) return { error: 'File must be under 20 MB' };

  const filePath = await Storage.put('documents', file);
  await db.document.create({
    data: { name, description, file: filePath, userId: access.userId, projectId },
  });

  redirect(`/projects/${projectId}/documents`);
}

export async function deleteDocument(documentId: string, projectId: string) {
  const access = await requireMember(projectId);
  if (!access) return { error: 'Forbidden' };

  const document = await db.document.findUnique({ where: { id: documentId } });
  if (!document || document.projectId !== projectId) return { error: 'Not found' };

  if (!access.isOwner && document.userId !== access.userId) return { error: 'Forbidden' };

  await Storage.delete('documents', document.file);
  await db.document.delete({ where: { id: documentId } });

  redirect(`/projects/${projectId}/documents`);
}
