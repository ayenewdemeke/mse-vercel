'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Invalid email or password' };
        default:
          return { error: 'Something went wrong' };
      }
    }
    throw error;
  }
}

export async function register(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!name || !email || !password) {
    return { error: 'All fields are required' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' };
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters' };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: 'An account with this email already exists' };
  }

  const hashedPassword = await hashPassword(password);

  await db.user.create({
    data: { name, email, password: hashedPassword },
  });

  return { success: true };
}

export async function logout() {
  await signOut({ redirect: false });
  return { success: true };
}
