'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { Storage } from '@/lib/storage';
import bcrypt from 'bcryptjs';

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  const userId = session.user.id;

  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'Name is required' };

  const file = formData.get('image') as File | null;
  let imagePath: string | undefined;

  if (file && file.size > 0) {
    if (!file.type.startsWith('image/')) return { error: 'File must be an image' };
    if (file.size > 5 * 1024 * 1024) return { error: 'Image must be under 5 MB' };

    // Delete old image if present
    const existing = await db.user.findUnique({ where: { id: userId }, select: { image: true } });
    if (existing?.image) {
      await Storage.delete('userImages', existing.image);
    }

    imagePath = await Storage.put('userImages', file);
  }

  await db.user.update({
    where: { id: userId },
    data: { name, ...(imagePath !== undefined && { image: imagePath }) },
  });

  return { success: true };
}

export async function changePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  const userId = session.user.id;

  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!currentPassword || !newPassword || !confirmPassword)
    return { error: 'All password fields are required' };
  if (newPassword.length < 8)
    return { error: 'New password must be at least 8 characters' };
  if (newPassword !== confirmPassword)
    return { error: 'New passwords do not match' };

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: 'User not found' };

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return { error: 'Current password is incorrect' };

  const hashed = await bcrypt.hash(newPassword, 12);
  await db.user.update({ where: { id: userId }, data: { password: hashed } });

  return { success: true };
}

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, createdAt: true },
  });
}
