import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { getProjectWithStats } from '@/app/actions/projects';
import { Pencil, Trash2, Users, FileText, LayoutGrid, MapPin, Calendar } from 'lucide-react';

export default async function ProjectDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectWithStats(id);
  if (!project) notFound();

  const stats = [
    { label: 'Total Designs', value: project.designsCount, icon: LayoutGrid, color: 'text-blue-600 bg-blue-50' },
    { label: 'Project Members', value: project.membersCount, icon: Users, color: 'text-amber-600 bg-amber-50' },
    { label: 'Documents', value: project.documentsCount, icon: FileText, color: 'text-teal-600 bg-teal-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 mb-1">{project.name}</h1>
          <div className="flex items-center gap-1 text-sm text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            <span>{project.location}</span>
          </div>
        </div>
        {project.isOwner && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" asChild>
              <Link href={`/projects/${id}/delete`}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card rounded-xl border p-5 flex items-center gap-4">
            <div className={`rounded-lg p-2.5 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{value}</p>
              <p className="text-sm text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border p-6 max-w-lg">
        <h2 className="font-semibold text-slate-800 mb-4">Project Details</h2>
        <div className="space-y-3">
          {project.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/storage/${project.image}`}
              alt={project.name}
              className="w-full h-40 object-cover rounded-md mb-4"
            />
          )}
          <div className="flex justify-between text-sm py-2 border-b">
            <span className="text-slate-500">Name</span>
            <span className="font-medium text-slate-800">{project.name}</span>
          </div>
          <div className="flex justify-between text-sm py-2 border-b">
            <span className="text-slate-500">Location</span>
            <span className="font-medium text-slate-800">{project.location}</span>
          </div>
          <div className="flex justify-between text-sm py-2 border-b">
            <span className="text-slate-500">Latitude</span>
            <span className="font-mono text-slate-800">{project.latitude}°</span>
          </div>
          <div className="flex justify-between text-sm py-2 border-b">
            <span className="text-slate-500">Longitude</span>
            <span className="font-mono text-slate-800">{project.longitude}°</span>
          </div>
          <div className="flex justify-between text-sm py-2 border-b">
            <span className="text-slate-500">Owner</span>
            <span className="font-medium text-slate-800">{project.owner.name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm py-2 text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            <span>Created {format(new Date(project.createdAt), 'MMM d, yyyy')}</span>
          </div>
          {project.description && (
            <div className="pt-2">
              <p className="text-xs text-slate-500 mb-1">Description</p>
              <p className="text-sm text-slate-700 whitespace-pre-line">{project.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
