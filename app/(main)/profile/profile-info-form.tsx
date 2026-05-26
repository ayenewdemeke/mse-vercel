'use client';

import { useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfile } from '@/app/actions/profile';
import { Camera } from 'lucide-react';

interface Props {
  user: {
    name: string;
    email: string;
    image: string | null;
    createdAt: Date;
  };
}

export default function ProfileInfoForm({ user }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(
    user.image ? `/api/storage/${user.image}` : null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProfile(fd);
      if (result?.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully.' });
      }
    });
  }

  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative group">
          {preview ? (
            <img
              src={preview}
              alt={user.name}
              className="h-20 w-20 rounded-full object-cover border-2 border-white shadow"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xl font-semibold border-2 border-white shadow">
              {initials}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Camera className="h-5 w-5 text-white" />
          </button>
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Change photo
          </button>
          <p className="text-xs text-slate-400 mt-0.5">JPG, PNG or WebP · max 5 MB</p>
        </div>
        <input
          ref={fileRef}
          name="image"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Name */}
      <div className="space-y-1">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" defaultValue={user.name} required />
      </div>

      {/* Email — read-only */}
      <div className="space-y-1">
        <Label className="text-slate-500">Email</Label>
        <Input value={user.email} readOnly className="bg-slate-50 text-slate-400 cursor-default" />
        <p className="text-xs text-slate-400">Email cannot be changed.</p>
      </div>

      {/* Member since */}
      <div className="text-xs text-slate-400">
        Member since{' '}
        {new Date(user.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </div>

      {message && (
        <div
          className={`text-sm px-4 py-3 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-600 border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
