'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { deleteDesign } from '@/app/actions/designs';
import { Loader2, Trash2 } from 'lucide-react';

export default function DeleteDesignButton({ designId, projectId }: { designId: string; projectId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteDesign(designId, projectId);
    });
  }

  if (!confirm) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-red-500 hover:text-red-600 hover:bg-red-50"
        onClick={() => setConfirm(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="destructive" size="sm" disabled={isPending} onClick={handleDelete}>
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Delete'}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
        Cancel
      </Button>
    </div>
  );
}
