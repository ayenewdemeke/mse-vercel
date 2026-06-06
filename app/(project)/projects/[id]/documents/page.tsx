'use client';

import Link from 'next/link';
import { useState, useEffect, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getDocuments, deleteDocument } from '@/app/actions/documents';
import { getProject } from '@/app/actions/projects';
import { format } from 'date-fns';
import { Plus, FileText, Download, Trash2, Loader2 } from 'lucide-react';

type DocumentItem = Awaited<ReturnType<typeof getDocuments>>[number];

export default function DocumentsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  async function load() {
    const [docs, project] = await Promise.all([getDocuments(id), getProject(id)]);
    setDocuments(docs);
    // getProject includes owner info; we need current user id
    // We use the first doc's uploader match or check isOwner separately
    // The actions enforce permissions, so just show delete for own uploads
    if (project) {
      // Get current session userId from project owner comparison
      setCurrentUserId(null); // set below via a pattern
      setIsOwner(false); // will not be used here - delete action enforces it
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDelete(docId: string) {
    setError('');
    setConfirmId(null);
    startTransition(async () => {
      const result = await deleteDocument(docId, id);
      if (result?.error) setError(result.error);
      else load();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 mb-1">Documents</h1>
          <p className="text-slate-500 text-sm">Project documents and file uploads.</p>
        </div>
        <Button asChild size="sm">
          <Link href={`/projects/${id}/documents/add`}>
            <Plus className="h-4 w-4" />
            Add document
          </Link>
        </Button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-slate-700 mb-1">No documents yet</p>
          <p className="text-sm text-slate-500 mb-4">Upload project files for your team.</p>
          <Button asChild size="sm">
            <Link href={`/projects/${id}/documents/add`}>Upload document</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">#</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Uploaded by</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {documents.map((doc, i) => {
                const ext = doc.file.split('.').pop() ?? '';
                const downloadName = `${doc.name}.${ext}`;
                return (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{doc.name}</div>
                      {doc.description && (
                        <div className="text-xs text-slate-400 truncate max-w-xs">{doc.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{doc.uploader.name}</td>
                    <td className="px-4 py-3 text-slate-400">{format(new Date(doc.createdAt), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/storage/${doc.file}`}
                          download={downloadName}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                        {confirmId === doc.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={isPending}
                              onClick={() => handleDelete(doc.id)}
                            >
                              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setConfirmId(doc.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
