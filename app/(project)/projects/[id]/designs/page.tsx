import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { getDesigns } from '@/app/actions/designs';
import { getProject } from '@/app/actions/projects';
import { format } from 'date-fns';
import { Plus, LayoutGrid, FileDown } from 'lucide-react';
import DeleteDesignButton from './delete-design-button';

export default async function DesignsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const [project, designs] = await Promise.all([getProject(id), getDesigns(id)]);
  if (!project) notFound();

  const currentUserId = session?.user?.id ?? '';
  const isOwner = project.userId === currentUserId;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 mb-1">Designs</h1>
          <p className="text-slate-500 text-sm">MSE stability design calculations for this project.</p>
        </div>
        <div className="flex items-center gap-2">
          {designs.length > 0 && (
            <a
              href={`/api/projects/${id}/report`}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              <FileDown className="h-4 w-4" />
              Report
            </a>
          )}
          <Button asChild size="sm">
            <Link href={`/projects/${id}/designs/add`}>
              <Plus className="h-4 w-4" />
              Add design
            </Link>
          </Button>
        </div>
      </div>

      {designs.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <LayoutGrid className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-slate-700 mb-1">No designs yet</p>
          <p className="text-sm text-slate-500 mb-4">Create your first stability design calculation.</p>
          <Button asChild size="sm">
            <Link href={`/projects/${id}/designs/add`}>Add design</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">#</th>
                <th className="text-left px-4 py-3">Design type</th>
                <th className="text-left px-4 py-3">Added by</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {designs.map((design, i) => (
                <tr key={design.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{design.designType.name}</p>
                    {design.name && <p className="text-xs text-slate-500 mt-0.5">{design.name}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{design.creator.name}</td>
                  <td className="px-4 py-3 text-slate-400">{format(new Date(design.createdAt), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/projects/${id}/designs/${design.id}`}>View</Link>
                      </Button>
                      {(isOwner || design.userId === currentUserId) && (
                        <DeleteDesignButton designId={design.id} projectId={id} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
