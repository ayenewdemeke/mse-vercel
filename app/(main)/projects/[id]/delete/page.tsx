'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { deleteProject } from '@/app/actions/projects';
import { Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function DeleteProjectPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await deleteProject(id, email);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/projects/${id}/dashboard`}>
            <ArrowLeft className="h-4 w-4" />Back
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold text-slate-800">Delete Project</h1>
      </div>

      <div className="bg-card rounded-xl border border-red-200 p-6">
        <div className="flex gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-slate-800 mb-1">This action is irreversible</p>
            <p className="text-sm text-slate-500">
              Deleting this project will permanently remove all its data. The project must have no
              other members, designs, or documents before it can be deleted.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">
              Confirm your email address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isPending}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" asChild>
              <Link href={`/projects/${id}/dashboard`}>Cancel</Link>
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending || !email}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
