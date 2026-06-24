import { useEffect } from 'react';

type Handler = (e: KeyboardEvent) => void;

interface Config {
  onQuickCreate?: () => void;
  onFullCreate?: () => void;
  onToggleView?: () => void;
  onCommandPalette?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onOpenDrawer?: () => void;
  onToggleSelect?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  onHelp?: () => void;
  onGoBoard?: () => void;
  onGoList?: () => void;
}

// Custom keyboard shortcut hook — simpler than react-hotkeys-hook for our
// limited needs and doesn't pull in a new dep. Ignores events fired from
// inside text inputs, textareas, contenteditable, and our markdown editor.
export function useTaskKeyboard(cfg: Config) {
  useEffect(() => {
    const handler: Handler = (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      if (target.closest('.w-md-editor')) return;

      // Platform-aware modifier
      const cmd = e.metaKey || e.ctrlKey;

      // Cmd+K — command palette
      if (cmd && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        cfg.onCommandPalette?.();
        return;
      }

      // ? — help
      if (e.key === '?' && !cmd) {
        e.preventDefault();
        cfg.onHelp?.();
        return;
      }

      switch (e.key) {
        case 'c':
          e.preventDefault();
          cfg.onQuickCreate?.();
          break;
        case 'C':
          e.preventDefault();
          cfg.onFullCreate?.();
          break;
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          cfg.onNext?.();
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          cfg.onPrev?.();
          break;
        case 'Enter':
        case 'o':
          e.preventDefault();
          cfg.onOpenDrawer?.();
          break;
        case 'x':
          e.preventDefault();
          cfg.onToggleSelect?.();
          break;
        case 'Backspace':
        case 'Delete':
          e.preventDefault();
          cfg.onDelete?.();
          break;
        case 'Escape':
          cfg.onClose?.();
          break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [cfg]);
}

interface KeyboardHelpProps {
  open: boolean;
  onClose: () => void;
}

// Stay simple — tailwind-based help modal. ? opens it, Esc closes.
export function KeyboardHelp({ open, onClose }: KeyboardHelpProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const groups: Array<{ title: string; rows: Array<[string, string]> }> = [
    {
      title: 'Global',
      rows: [
        ['?', 'Show this help'],
        ['⌘K', 'Command palette'],
        ['/', 'Focus search'],
      ],
    },
    {
      title: 'Tasks',
      rows: [
        ['C', 'Quick create'],
        ['⇧C', 'Full create (drawer)'],
        ['V B', 'Switch to Board view'],
        ['V L', 'Switch to List view'],
        ['J / ↓', 'Next task'],
        ['K / ↑', 'Previous task'],
        ['Enter / O', 'Open drawer'],
        ['X', 'Toggle select'],
        ['⇧X', 'Range select'],
        ['⌫', 'Delete (soft + undo)'],
        ['⌘Z', 'Undo last action'],
        ['Esc', 'Close / deselect'],
      ],
    },
    {
      title: 'Drawer',
      rows: [
        ['E', 'Edit title'],
        ['S', 'Status picker'],
        ['A', 'Assignee picker'],
        ['P', 'Priority picker'],
        ['L', 'Label picker'],
        ['D', 'Due date picker'],
        ['C', 'Focus comment composer'],
        ['⌘↩', 'Save / post comment'],
      ],
    },
  ];
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl mx-4 rounded-xl shadow-2xl bg-card border border-border p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Keyboard shortcuts</h2>
          <button onClick={onClose} className="text-muted-foreground/70 hover:text-muted-foreground">
            Esc
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {g.title}
              </div>
              <div className="space-y-1">
                {g.rows.map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{desc}</span>
                    <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/30">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
