import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getProjects } from '@/app/actions/projects';
import { format } from 'date-fns';
import { Plus, MapPin, FolderOpen } from 'lucide-react';

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 mb-1">Projects</h1>
          <p className="text-slate-500 text-sm">Manage your MSE design projects.</p>
        </div>
        <Button asChild>
          <Link href="/projects/create">
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-slate-700 mb-1">No projects yet</p>
          <p className="text-sm text-slate-500 mb-4">Create your first MSE design project to get started.</p>
          <Button asChild size="sm">
            <Link href="/projects/create">Create Project</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-card rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <div className="h-36 bg-slate-100 relative overflow-hidden">
                {project.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/storage/${project.image}`}
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FolderOpen className="h-10 w-10 text-slate-300" />
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-4">
                <h2 className="font-semibold text-slate-800 truncate mb-1">{project.name}</h2>
                <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{project.location}</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Added {format(new Date(project.createdAt), 'MMM d, yyyy')}
                </p>
                <Button asChild size="sm" className="w-full">
                  <Link href={`/projects/${project.id}/dashboard`}>Open Project</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
