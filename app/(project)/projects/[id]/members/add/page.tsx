'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchUserByEmail, addMember, getMemberRoles } from '@/app/actions/members';
import { ArrowLeft, Loader2, Search, UserCheck } from 'lucide-react';
import { useEffect } from 'react';

type Role = { id: string; name: string };
type FoundUser = { id: string; name: string | null; email: string };

export default function AddMemberPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [foundUser, setFoundUser] = useState<FoundUser | null | undefined>(undefined);
  const [selectedRole, setSelectedRole] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getMemberRoles().then(setRoles);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFoundUser(undefined);
    startTransition(async () => {
      const result = await searchUserByEmail(id, email);
      if ('error' in result && result.error) {
        setError(result.error);
        setFoundUser(undefined);
      } else {
        setFoundUser(result.user ?? null);
      }
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!foundUser || !selectedRole) return;
    setError('');
    startTransition(async () => {
      const result = await addMember(id, foundUser.id, selectedRole);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/projects/${id}/members`}>
            <ArrowLeft className="h-4 w-4" />Back
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold text-slate-800">Add member</h1>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Step 1: Search */}
      <div className="bg-card rounded-xl border p-6 mb-4">
        <h2 className="font-semibold text-slate-800 mb-4">Search by email</h2>
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isPending}
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </Button>
        </form>
      </div>

      {/* Step 2: Result */}
      {foundUser === null && (
        <div className="bg-card rounded-xl border p-6 text-sm text-slate-500 text-center">
          No user found with email <span className="font-medium text-slate-700">{email}</span>.
          They must register first.
        </div>
      )}

      {foundUser && (
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800">{foundUser.name ?? 'No name'}</p>
              <p className="text-sm text-slate-500">{foundUser.email}</p>
            </div>
          </div>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="role">Member role <span className="text-red-500">*</span></Label>
              <select
                id="role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                required
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="">Select a role…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => setFoundUser(undefined)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !selectedRole}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Add member
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
