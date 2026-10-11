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

export type EventCategory = 
  | 'all'
  | 'welcome'     // 01. Đón khách
  | 'opening'     // 02. Khai mạc / MC Chào
  | 'speech'      // 03. Phát biểu / Nhạc nền nhẹ
  | 'award'       // 04. Trao giải / Vinh danh
  | 'game'        // 05. Minigame / Hoạt náo
  | 'ending'      // 06. Bế mạc / Chào khách
  | 'custom';     // Tùy chỉnh

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
