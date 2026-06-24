import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  event: {
    at: string;
    source: string;
    metadata?: any;
  } | null;
}

export default function DiffPreviewModal({ open, onClose, event }: Props) {
  if (!open || !event) return null;
  const meta = event.metadata ?? {};
  const filePath = meta.filePath ?? meta.sha ?? '—';
  const diff = meta.diffPreview ?? meta.diffsPerFile?.[filePath] ?? '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-lg max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="min-w-0">
            <div className="font-mono text-sm truncate">{filePath}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {event.source} · {new Date(event.at).toLocaleString()}
              {meta.status && ` · ${meta.status}`}
              {meta.branch && ` · ${meta.branch}`}
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded shrink-0 ml-2" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-auto p-4">
          {diff ? (
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/30 p-3 rounded border border-border overflow-auto">
              {diff}
            </pre>
          ) : meta.diffsPerFile && typeof meta.diffsPerFile === 'object' ? (
            <div className="space-y-3">
              {Object.entries(meta.diffsPerFile).map(([p, d]) => (
                <div key={p}>
                  <div className="font-mono text-xs text-muted-foreground mb-1">{p}</div>
                  <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/30 p-3 rounded border border-border overflow-auto">
                    {String(d ?? '(no diff)')}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No diff preview available for this event.</div>
          )}
          {meta.message && (
            <div className="mt-4">
              <div className="text-xs text-muted-foreground mb-1">Commit message</div>
              <div className="text-sm whitespace-pre-wrap">{meta.message}</div>
            </div>
          )}
          {meta.sha && (
            <div className="mt-2 text-xs text-muted-foreground font-mono">sha: {meta.sha}</div>
          )}
        </div>
      </div>
    </div>
  );
}
