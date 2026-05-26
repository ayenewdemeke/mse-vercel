import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { getDesignWithData } from '@/app/actions/design-inputs';
import { getProject } from '@/app/actions/projects';
import { format } from 'date-fns';
import DeleteDesignButton from '../delete-design-button';
import ExternalStabilityView from './external-stability-view';
import InternalStabilityView from './internal-stability-view';

export default async function DesignViewPage({
  params,
}: {
  params: Promise<{ id: string; designId: string }>;
}) {
  const { id, designId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [design, project] = await Promise.all([getDesignWithData(designId, id), getProject(id)]);
  if (!design || !project) notFound();

  const currentUserId = session.user.id;
  const isOwner = project.userId === currentUserId;
  const canEdit = isOwner || design.userId === currentUserId;
  const typeKey = design.designType.key;
  const isExternal =
    typeKey === 'abutment_external_stability' ||
    typeKey === 'wing_external_stability_ll' ||
    typeKey === 'wing_external_stability';
  const isInternal =
    typeKey === 'abutment_internal_stability' ||
    typeKey === 'wing_internal_stability';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-1 -ml-2">
            <Link href={`/projects/${id}/designs`}>← Designs</Link>
          </Button>
          <h1 className="text-2xl font-semibold text-slate-800">{design.designType.name}</h1>
          {design.name && <p className="text-slate-700 text-sm font-medium">{design.name}</p>}
          <p className="text-slate-500 text-sm">
            Created by {design.creator.name} · {format(new Date(design.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(isExternal || isInternal) && (
            <Button asChild size="sm">
              <Link href={`/projects/${id}/designs/${designId}/analyze`}>Analyze</Link>
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${id}/designs/${designId}/edit`}>Edit</Link>
            </Button>
          )}
          {canEdit && <DeleteDesignButton designId={designId} projectId={id} />}
        </div>
      </div>

      {isExternal ? (
        <ExternalStabilityView
          designType={typeKey}
          abutmentExternal={design.abutmentExternalStability ?? undefined}
          wingExternalLl={design.wingExternalStabilityLl ?? undefined}
          wingExternal={design.wingExternalStability ?? undefined}
        />
      ) : (
        <InternalStabilityView
          designType={typeKey}
          abutmentInternal={design.abutmentInternalStability ?? undefined}
          wingInternal={design.wingInternalStability ?? undefined}
        />
      )}
    </div>
  );
}
