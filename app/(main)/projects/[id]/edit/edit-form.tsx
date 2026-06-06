'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateProject } from '@/app/actions/projects';
import { Loader2, ArrowLeft } from 'lucide-react';

type Project = {
  id: string;
  name: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  image: string | null;
};

export default function EditProjectForm({ project }: { project: Project }) {
  const [imagePreview, setImagePreview] = useState<string | null>(
    project.image ? `/api/storage/${project.image}` : null
  );
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProject(project.id, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/projects/${project.id}/dashboard`}>
            <ArrowLeft className="h-4 w-4" />Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Edit project</h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic data */}
        <div className="bg-card rounded-xl border p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Basic data</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
              <Input id="name" name="name" placeholder="Project name" defaultValue={project.name} required disabled={isPending} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location <span className="text-red-500">*</span></Label>
              <Input id="location" name="location" placeholder="e.g. I-25 Mile Marker 210" defaultValue={project.location} required disabled={isPending} />
            </div>
            <div className="space-y-1.5">
              <Label>Project image</Label>
              <input
                type="file"
                name="image"
                accept="image/*"
                onChange={handleImageChange}
                disabled={isPending}
                className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Preview" className="h-24 rounded-md object-cover mt-2" />
              )}
            </div>
          </div>
        </div>

        {/* Coordinates */}
        <div className="bg-card rounded-xl border p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Coordinates <span className="text-xs font-normal text-slate-400">(optional)</span></h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="latitude">Latitude (°)</Label>
              <Input
                id="latitude"
                name="latitude"
                type="number"
                step="0.00000001"
                placeholder="e.g. 38.855"
                defaultValue={project.latitude ?? undefined}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="longitude">Longitude (°)</Label>
              <Input
                id="longitude"
                name="longitude"
                type="number"
                step="0.00000001"
                placeholder="e.g. -104.921"
                defaultValue={project.longitude ?? undefined}
                disabled={isPending}
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-card rounded-xl border p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Description</h2>
          <textarea
            name="description"
            placeholder="Optional project description…"
            rows={5}
            defaultValue={project.description ?? ''}
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none disabled:opacity-50"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" asChild>
            <Link href={`/projects/${project.id}/dashboard`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
