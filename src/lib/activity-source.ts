// Shared styling + labels for activity event sources.
// Keep colors consistent across DayRibbon, WorkWindowList, and any
// future source-aware dashboard surface.

export type KnownSource =
  | 'commit'
  | 'file_edit'
  | 'push'
  | 'branch_switch'
  | 'prompt'
  | 'shell_command'
  | 'focus_session';

export interface SourceStyle {
  label: string;
  /** Tailwind background class for a filled swatch (bg-X-500). */
  bg: string;
  /** Tailwind text class for contrast on the bg swatch. */
  text: string;
  /** Tailwind background class used for soft fills / badges. */
  bgSoft: string;
  /** Tailwind border color class. */
  border: string;
  /** Tailwind solid color class (for thin accent lines). */
  solid: string;
  /** Short emoji/icon for compact displays. */
  icon: string;
}

const STYLES: Record<KnownSource, SourceStyle> = {
  commit: {
    label: 'commit',
    bg: 'bg-blue-500',
    text: 'text-white',
    bgSoft: 'bg-blue-500/15',
    border: 'border-blue-500/40',
    solid: 'bg-blue-500',
    icon: '●',
  },
  file_edit: {
    label: 'edit',
    bg: 'bg-sky-500',
    text: 'text-white',
    bgSoft: 'bg-sky-500/15',
    border: 'border-sky-500/40',
    solid: 'bg-sky-500',
    icon: '✎',
  },
  push: {
    label: 'push',
    bg: 'bg-indigo-500',
    text: 'text-white',
    bgSoft: 'bg-indigo-500/15',
    border: 'border-indigo-500/40',
    solid: 'bg-indigo-500',
    icon: '↑',
  },
  branch_switch: {
    label: 'branch',
    bg: 'bg-violet-500',
    text: 'text-white',
    bgSoft: 'bg-violet-500/15',
    border: 'border-violet-500/40',
    solid: 'bg-violet-500',
    icon: '⎇',
  },
  prompt: {
    label: 'prompt',
    bg: 'bg-emerald-500',
    text: 'text-white',
    bgSoft: 'bg-emerald-500/15',
    border: 'border-emerald-500/40',
    solid: 'bg-emerald-500',
    icon: '✦',
  },
  shell_command: {
    label: 'shell',
    bg: 'bg-amber-500',
    text: 'text-white',
    bgSoft: 'bg-amber-500/15',
    border: 'border-amber-500/40',
    solid: 'bg-amber-500',
    icon: '$',
  },
  focus_session: {
    label: 'focus',
    bg: 'bg-rose-500',
    text: 'text-white',
    bgSoft: 'bg-rose-500/15',
    border: 'border-rose-500/40',
    solid: 'bg-rose-500',
    icon: '◆',
  },
};

const UNKNOWN: SourceStyle = {
  label: 'unknown',
  bg: 'bg-slate-500',
  text: 'text-white',
  bgSoft: 'bg-slate-500/15',
  border: 'border-slate-500/40',
  solid: 'bg-slate-500',
  icon: '?',
};

export function getSourceStyle(source: string): SourceStyle {
  return (STYLES as Record<string, SourceStyle>)[source] ?? UNKNOWN;
}

export function isKnownSource(source: string): source is KnownSource {
  return source in STYLES;
}

/** Order of sources in legends / badges (stable). */
export const SOURCE_ORDER: KnownSource[] = [
  'prompt',
  'commit',
  'file_edit',
  'push',
  'branch_switch',
  'shell_command',
  'focus_session',
];
