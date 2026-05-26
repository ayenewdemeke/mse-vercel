'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { Storage } from '@/lib/storage';
import { redirect } from 'next/navigation';

export type ProjectListItem = {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  description: string | null;
  image: string | null;
  createdAt: Date;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<ProjectListItem[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const userId = session.user.id;
  return db.project.findMany({
    where: { OR: [{ userId }, { members: { some: { userId } } }] },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, location: true,
      latitude: true, longitude: true,
      description: true, image: true, createdAt: true,
    },
  });
}

export async function getProject(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  return db.project.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          memberRole: true,
        },
      },
    },
  });
}

export async function getProjectWithStats(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;

  const project = await db.project.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true } } },
  });
  if (!project) return null;

  const isMember = await db.member.findFirst({
    where: { projectId: id, userId },
  });
  if (!isMember && project.userId !== userId) return null;

  const [designsCount, membersCount, documentsCount] = await Promise.all([
    db.design.count({ where: { projectId: id } }),
    db.member.count({ where: { projectId: id } }),
    db.document.count({ where: { projectId: id } }),
  ]);

  return {
    ...project,
    isOwner: project.userId === userId,
    designsCount,
    membersCount,
    documentsCount,
  };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createProject(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const userId = session.user.id;
  const name = (formData.get('name') as string)?.trim();
  const location = (formData.get('location') as string)?.trim();
  const latitude = parseFloat(formData.get('latitude') as string);
  const longitude = parseFloat(formData.get('longitude') as string);
  const description = (formData.get('description') as string)?.trim() || null;
  const imageFile = formData.get('image') as File | null;

  if (!name || !location) return { error: 'Name and location are required' };
  if (isNaN(latitude) || isNaN(longitude)) return { error: 'Valid coordinates are required' };

  let imagePath: string | null = null;
  if (imageFile && imageFile.size > 0) {
    if (imageFile.size > 10 * 1024 * 1024) return { error: 'Image must be under 10 MB' };
    imagePath = await Storage.put('projectImages', imageFile);
  }

  const designerRole = await db.memberRole.findFirst({ where: { name: 'Designer' } });

  const project = await db.project.create({
    data: { userId, name, location, latitude, longitude, description, image: imagePath },
  });

  await db.member.create({
    data: {
      projectId: project.id,
      userId,
      creatorId: userId,
      memberRoleId: designerRole!.id,
    },
  });

  redirect('/projects');
}

export async function updateProject(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.userId !== session.user.id) return { error: 'Forbidden' };

  const name = (formData.get('name') as string)?.trim();
  const location = (formData.get('location') as string)?.trim();
  const latitude = parseFloat(formData.get('latitude') as string);
  const longitude = parseFloat(formData.get('longitude') as string);
  const description = (formData.get('description') as string)?.trim() || null;
  const imageFile = formData.get('image') as File | null;

  if (!name || !location) return { error: 'Name and location are required' };
  if (isNaN(latitude) || isNaN(longitude)) return { error: 'Valid coordinates are required' };

  let imagePath = project.image;
  if (imageFile && imageFile.size > 0) {
    if (imageFile.size > 10 * 1024 * 1024) return { error: 'Image must be under 10 MB' };
    if (project.image) await Storage.delete('projectImages', project.image);
    imagePath = await Storage.put('projectImages', imageFile);
  }

  await db.project.update({
    where: { id },
    data: { name, location, latitude, longitude, description, image: imagePath },
  });

  redirect(`/projects/${id}/dashboard`);
}

export async function deleteProject(id: string, email: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  const userId = session.user.id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.email !== email) return { error: 'The confirmation email you entered is not correct' };

  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId) return { error: 'Forbidden' };

  const [otherMembers, designs, documents] = await Promise.all([
    db.member.count({ where: { projectId: id, userId: { not: userId } } }),
    db.design.count({ where: { projectId: id } }),
    db.document.count({ where: { projectId: id } }),
  ]);

  if (otherMembers > 0 || designs > 0 || documents > 0) {
    return {
      error:
        'Remove all other members, designs, and documents before deleting this project.',
    };
  }

  if (project.image) await Storage.delete('projectImages', project.image);
  await db.project.delete({ where: { id } });

  redirect('/projects');
}
