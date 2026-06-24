interface Props {
  user: {
    id: number;
    name: string;
  };
  lastEventAt: string | null;
  lastEventSource: string | null;
}

function sinceAgo(iso: string | null): { label: string; color: string } {
  if (!iso) return { label: 'idle', color: 'bg-zinc-500' };
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 120) return { label: `${Math.max(0, Math.round(diff))}s ago`, color: 'bg-green-500' };
  if (diff < 600) return { label: `${Math.round(diff / 60)}m ago`, color: 'bg-amber-500' };
  return { label: `${Math.round(diff / 60)}m ago`, color: 'bg-zinc-500' };
}

export default function LiveActivityTile({ user, lastEventAt, lastEventSource }: Props) {
  const { label, color } = sinceAgo(lastEventAt);
  return (
    <div className="border border-border rounded-lg p-3 bg-background min-w-[160px]">
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
        <div className="font-medium text-sm truncate">{user.name}</div>
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {lastEventSource && (
        <div className="text-xs text-muted-foreground mt-1">{lastEventSource}</div>
      )}
    </div>
  );
}
