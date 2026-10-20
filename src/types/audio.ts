export interface AudioTrack {
  id: string;
  title: string;
  artist?: string;
  duration: number; // in seconds
  fileUrl?: string; // object URL or data URL
  fileType?: string;
  blobKey?: string; // IndexedDB key if persisted
  category: EventCategory;
  tags?: string[];
  bpm?: number;
  addedAt: number;
  isBuiltIn?: boolean;
}

// EventCategory is now an open string so custom IDs (e.g. 'cat_abc') work alongside built-ins
export type EventCategory = string;

export interface CustomCategory {
  id: string;      // unique, e.g. 'welcome' or 'cat_1234'
  label: string;   // display name
  icon: string;    // emoji or short text
  order: number;   // sort order
  isBuiltIn?: boolean; // built-in categories can't be deleted
}

// Default set of built-in categories
export const DEFAULT_CATEGORIES: CustomCategory[] = [
  { id: 'welcome', label: '01. Đón khách',  icon: '🎪', order: 1, isBuiltIn: true },
  { id: 'opening', label: '02. Khai mạc',   icon: '🎤', order: 2, isBuiltIn: true },
  { id: 'speech',  label: '03. Phát biểu',  icon: '🎙️', order: 3, isBuiltIn: true },
  { id: 'award',   label: '04. Trao giải',  icon: '🏆', order: 4, isBuiltIn: true },
  { id: 'game',    label: '05. Minigame',   icon: '🎲', order: 5, isBuiltIn: true },
  { id: 'ending',  label: '06. Bế mạc',    icon: '👋', order: 6, isBuiltIn: true },
];

export interface CueItem {
  id: string;
  trackId: string;
  title: string;
  sectionName: string; // e.g. "01. Khai mạc - MC bước ra"
  targetDeck: 'A' | 'B' | 'auto';
  autoPlayNext: boolean;
  fadeTime: number; // in seconds
  notes?: string;
  order: number;
}

export interface SoundPad {
  id: string;
  slot: number; // 0 to 15
  label: string;
  hotkey: string;
  color: string;
  soundType: 'builtin' | 'custom';
  builtinId?: string;
  trackId?: string;
  volume: number; // 0 to 1
  loop: boolean;
  ducking: boolean; // lowers master / deck volume when active
  fileUrl?: string;
  duration?: number;
}

export interface QuickLaunchSlot {
  id: string;
  slot: number; // 0 to 11
  label: string;
  trackId?: string;
  fileUrl?: string;
  duration?: number;
  volume: number; // 0 to 1
  loop: boolean;
  color: string; // accent color for the card
  hotkey?: string; // F1–F12
  startTime?: number; // playback start point in seconds (IN point)
  endTime?: number;   // playback end point in seconds (OUT point)
}

export interface DeckState {
  deckId: 'A' | 'B';
  track: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0 to 1
  pitch: number; // 0.8 to 1.2
  lowEQ: number; // -12 to +12 dB
  midEQ: number; // -12 to +12 dB
  highEQ: number; // -12 to +12 dB
  isLooping: boolean;
  isFadingOut: boolean;
  vuLevel: number; // 0 to 1
}

export interface MixerSettings {
  crossfader: number; // -1 (Deck A) to 1 (Deck B), 0 is center
  masterVolume: number; // 0 to 1
  isMuted: boolean;
  isDuckingActive: boolean;
  duckingAmount: number; // 0.2 means 80% drop
  autoFadeDuration: number; // seconds
}

export interface ProjectData {
  projectName: string;
  version: string;
  createdAt: number;
  updatedAt: number;
  tracks: Omit<AudioTrack, 'fileUrl'>[]; // metadata
  cues: CueItem[];
  soundpads: SoundPad[];
  quickLaunchSlots?: QuickLaunchSlot[];
  mixerSettings: MixerSettings;
  categories?: CustomCategory[]; // custom + built-in category config
}

export interface EventPreset {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;
  data: ProjectData;
}
