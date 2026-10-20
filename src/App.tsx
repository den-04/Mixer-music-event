import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import type { 
  AudioTrack, CueItem, SoundPad, DeckState, MixerSettings, EventCategory, ProjectData,
  QuickLaunchSlot
} from './types/audio';
import { audioEngine } from './services/audioEngine';
import type { VUMeterData } from './services/audioEngine';
import { storageService } from './services/storage';
import { generateDemoTrackBlob } from './services/sampleAudioGenerator';
import { Header } from './components/Header';
import { DeckPlayer } from './components/DeckPlayer';
import { MixerSection } from './components/MixerSection';
import { Soundboard } from './components/Soundboard';
import { QuickLaunchBoard } from './components/QuickLaunchBoard';
import { LibraryManager } from './components/LibraryManager';
import { CueListManager } from './components/CueListManager';
import { HotkeysModal } from './components/HotkeysModal';
import { PresetModal } from './components/PresetModal';

const DEFAULT_SOUNDPADS: SoundPad[] = [
  { id: 'pad-1', slot: 0, label: '👏 Vỗ tay lớn', hotkey: '1', color: '#00e676', soundType: 'builtin', builtinId: 'applause', volume: 0.9, loop: false, ducking: false },
  { id: 'pad-2', slot: 1, label: '🎺 Kèn trao giải', hotkey: '2', color: '#00f2fe', soundType: 'builtin', builtinId: 'fanfare', volume: 0.95, loop: false, ducking: true },
  { id: 'pad-3', slot: 2, label: '🥁 Trống hồi hộp', hotkey: '3', color: '#ff9100', soundType: 'builtin', builtinId: 'drumroll', volume: 0.9, loop: false, ducking: false },
  { id: 'pad-4', slot: 3, label: '⏰ Đếm ngược 5s', hotkey: '4', color: '#ffd600', soundType: 'builtin', builtinId: 'countdown', volume: 0.9, loop: false, ducking: true },
  { id: 'pad-5', slot: 4, label: '✅ Trả lời đúng', hotkey: '5', color: '#00e676', soundType: 'builtin', builtinId: 'correct', volume: 0.85, loop: false, ducking: false },
  { id: 'pad-6', slot: 5, label: '❌ Còi báo sai', hotkey: '6', color: '#ff1744', soundType: 'builtin', builtinId: 'wrong', volume: 0.85, loop: false, ducking: false },
  { id: 'pad-7', slot: 6, label: '🎁 Quay số may mắn', hotkey: '7', color: '#d500f9', soundType: 'builtin', builtinId: 'jackpot', volume: 0.9, loop: false, ducking: false },
  { id: 'pad-8', slot: 7, label: '🔔 Chuông khai mạc', hotkey: '8', color: '#7c4dff', soundType: 'builtin', builtinId: 'gong', volume: 0.9, loop: false, ducking: false },
  { id: 'pad-9', slot: 8, label: '👏 Vỗ tay nhiệt liệt', hotkey: '9', color: '#00e676', soundType: 'builtin', builtinId: 'applause', volume: 0.9, loop: false, ducking: false },
  { id: 'pad-10', slot: 9, label: '🎺 Fanfare vinh danh', hotkey: '0', color: '#00f2fe', soundType: 'builtin', builtinId: 'fanfare', volume: 0.9, loop: false, ducking: true },
  { id: 'pad-11', slot: 10, label: '🥁 Trống dồn', hotkey: '-', color: '#ff9100', soundType: 'builtin', builtinId: 'drumroll', volume: 0.85, loop: false, ducking: false },
  { id: 'pad-12', slot: 11, label: '⏰ Đếm ngược', hotkey: '=', color: '#ffd600', soundType: 'builtin', builtinId: 'countdown', volume: 0.85, loop: false, ducking: false }
];

export const App: React.FC = () => {
  // Project Info
  const [projectName, setProjectName] = useState('SỰ KIỆN GALA DINNER & HỘI NGHỊ 2026');
  const [isSaved, setIsSaved] = useState(false);
  const [showHotkeysModal, setShowHotkeysModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);

  // Music Library
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');

  // Cue List
  const [cues, setCues] = useState<CueItem[]>([]);
  const [activeCueIndex, setActiveCueIndex] = useState<number>(-1);

  // Soundpads
  const [soundpads, setSoundpads] = useState<SoundPad[]>(DEFAULT_SOUNDPADS);
  const [activePadSlot, setActivePadSlot] = useState<number | null>(null);

  // Quick Launch Board (important tracks)
  const [quickLaunchSlots, setQuickLaunchSlots] = useState<QuickLaunchSlot[]>(
    Array.from({ length: 12 }, (_, i) => ({
      id: `ql-${i}`,
      slot: i,
      label: '',
      volume: 0.9,
      loop: false,
      color: ['#00f2fe','#ff6d00','#00e676','#ffd600','#d500f9','#ff1744','#7c4dff','#00b0ff','#ff6f00','#64dd17','#f50057','#00bcd4'][i],
    }))
  );
  const [middleTab, setMiddleTab] = useState<'soundboard' | 'quicklaunch'>('soundboard');

  // Deck A State
  const [deckA, setDeckA] = useState<DeckState>({
    deckId: 'A',
    track: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.9,
    pitch: 1.0,
    lowEQ: 0,
    midEQ: 0,
    highEQ: 0,
    isLooping: false,
    isFadingOut: false,
    vuLevel: 0
  });

  // Deck B State
  const [deckB, setDeckB] = useState<DeckState>({
    deckId: 'B',
    track: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.9,
    pitch: 1.0,
    lowEQ: 0,
    midEQ: 0,
    highEQ: 0,
    isLooping: false,
    isFadingOut: false,
    vuLevel: 0
  });

  // Mixer Settings
  const [mixerSettings, setMixerSettings] = useState<MixerSettings>({
    crossfader: 0,
    masterVolume: 1.0,
    isMuted: false,
    isDuckingActive: false,
    duckingAmount: 0.25,
    autoFadeDuration: 3
  });

  const [masterVU, setMasterVU] = useState<number>(0);

  // Audio Engine VU, Time and PlayState subscriptions
  useEffect(() => {
    const unsubVU = audioEngine.onVU((data: VUMeterData) => {
      setDeckA((prev) => ({ ...prev, vuLevel: data.deckA }));
      setDeckB((prev) => ({ ...prev, vuLevel: data.deckB }));
      setMasterVU(data.master);
    });

    const unsubTime = audioEngine.onTime((deck, current, dur) => {
      if (deck === 'A') {
        setDeckA((prev) => ({ ...prev, currentTime: current, duration: dur || prev.duration }));
      } else {
        setDeckB((prev) => ({ ...prev, currentTime: current, duration: dur || prev.duration }));
      }
    });

    const unsubPlayState = audioEngine.onPlayState((deck, isPlaying) => {
      if (deck === 'A') {
        setDeckA((prev) => ({ ...prev, isPlaying }));
      } else {
        setDeckB((prev) => ({ ...prev, isPlaying }));
      }
    });

    const unsubEnded = audioEngine.onEnded((deck) => {
      if (deck === 'A') {
        setDeckA((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
      } else {
        setDeckB((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
      }
    });

    return () => {
      unsubVU();
      unsubTime();
      unsubPlayState();
      unsubEnded();
    };
  }, []);

  // Re-hydrate project state from ProjectData object
  const hydrateProjectData = async (data: ProjectData) => {
    setProjectName(data.projectName || 'SỰ KIỆN GALA DINNER 2026');
    setCues(data.cues || []);
    if (data.soundpads && data.soundpads.length > 0) {
      setSoundpads(data.soundpads);
    }
    if (data.quickLaunchSlots && data.quickLaunchSlots.length > 0) {
      // Re-create fileUrl for each slot from IndexedDB (Object URLs expire between sessions)
      const restoredSlots = await Promise.all(
        data.quickLaunchSlots.map(async (slot) => {
          if (!slot.trackId) return slot;
          const blob = await storageService.getAudioBlob(slot.trackId);
          if (blob) {
            return { ...slot, fileUrl: URL.createObjectURL(blob) };
          }
          return { ...slot, fileUrl: undefined }; // blob missing – clear invalid URL
        })
      );
      setQuickLaunchSlots(restoredSlots);
    }

    if (data.mixerSettings) {
      setMixerSettings(data.mixerSettings);
      if (data.mixerSettings.duckingAmount) {
        audioEngine.setDuckingLevel(data.mixerSettings.duckingAmount);
      }
    }

    // Restore Audio URLs from IndexedDB blobs
    const restoredTracks: AudioTrack[] = [];
    for (const t of data.tracks) {
      const blob = await storageService.getAudioBlob(t.id);
      if (blob) {
        const fileUrl = URL.createObjectURL(blob);
        restoredTracks.push({ ...t, fileUrl });
      } else {
        restoredTracks.push({ ...t });
      }
    }
    setTracks(restoredTracks);
    setIsSaved(true);
  };

  // Initialize and load default preset or saved project on startup
  useEffect(() => {
    async function loadInitialData() {
      try {
        // 1. Check if user configured a default preset to auto-run on startup
        const defaultPresetId = await storageService.getDefaultPresetId();
        let targetData: ProjectData | null = null;

        if (defaultPresetId) {
          const presets = await storageService.getPresets();
          const found = presets.find((p) => p.id === defaultPresetId);
          if (found) {
            targetData = found.data;
          }
        }

        // 2. Fallback to last saved project state
        if (!targetData) {
          targetData = await storageService.loadProjectState();
        }

        if (targetData && targetData.tracks && targetData.tracks.length > 0) {
          await hydrateProjectData(targetData);
        } else {
          // Clean slate: start with empty library so user can add their own tracks
          setTracks([]);
          setCues([]);
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
      }
    }
    loadInitialData();
  }, []);

  // Generate 4 sample demo tracks
  const handleGenerateDemoMusic = async () => {
    const demoConfigs: { id: string; title: string; category: EventCategory; type: 'welcome' | 'opening' | 'speech' | 'award' }[] = [
      { id: 'demo-1', title: '01. Đón Khách - Chill Acoustic Lounge', category: 'welcome', type: 'welcome' },
      { id: 'demo-2', title: '02. Khai Mạc - Epic Intro Fanfare', category: 'opening', type: 'opening' },
      { id: 'demo-3', title: '03. Lãnh Đạo Phát Biểu - Ambient Piano', category: 'speech', type: 'speech' },
      { id: 'demo-4', title: '04. Trao Giải & Vinh Danh - Grand Award', category: 'award', type: 'award' }
    ];

    const newTracks: AudioTrack[] = [];
    const newCues: CueItem[] = [];

    for (let i = 0; i < demoConfigs.length; i++) {
      const cfg = demoConfigs[i];
      const trackId = `demo_${Date.now()}_${i}`;
      const blob = await generateDemoTrackBlob(cfg.type);
      await storageService.saveAudioBlob(trackId, blob);
      const fileUrl = URL.createObjectURL(blob);

      const track: AudioTrack = {
        id: trackId,
        title: cfg.title,
        duration: 24,
        fileUrl,
        category: cfg.category,
        addedAt: Date.now() + i,
        isBuiltIn: true
      };
      newTracks.push(track);

      newCues.push({
        id: `cue_${trackId}`,
        trackId: trackId,
        title: cfg.title,
        sectionName: cfg.title.split('-')[0].trim(),
        targetDeck: i % 2 === 0 ? 'A' : 'B',
        autoPlayNext: false,
        fadeTime: 2,
        notes: i === 0 ? 'Phát lặp đón khách' : i === 1 ? 'MC bước ra sân khấu' : i === 2 ? 'MC mời lãnh đạo phát biểu' : 'MC đọc giải thưởng',
        order: cues.length + i
      });
    }

    setTracks((prev) => [...prev, ...newTracks]);
    setCues(newCues);
    setIsSaved(false);
  };

  // Add Tracks from user computer (File Picker or Drag & Drop)
  const handleAddTracks = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    setIsImporting(true);
    setImportProgress(`Đang nạp ${fileList.length} bài hát...`);

    try {
      const blobItems: { id: string; blob: Blob }[] = [];
      const preparedTracks: AudioTrack[] = [];
      const timestamp = Date.now();

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const trackId = `track_${timestamp}_${i}_${Math.random().toString(36).slice(2, 6)}`;
        blobItems.push({ id: trackId, blob: file });

        const fileUrl = URL.createObjectURL(file);

        // Auto-detect category based on filename
        const nameLower = file.name.toLowerCase();
        let category: EventCategory = 'welcome';
        if (nameLower.includes('khai mac') || nameLower.includes('intro') || nameLower.includes('open')) {
          category = 'opening';
        } else if (nameLower.includes('phat bieu') || nameLower.includes('speech') || nameLower.includes('mc')) {
          category = 'speech';
        } else if (nameLower.includes('trao giai') || nameLower.includes('vinh danh') || nameLower.includes('award')) {
          category = 'award';
        } else if (nameLower.includes('game') || nameLower.includes('tro choi') || nameLower.includes('soi dong')) {
          category = 'game';
        } else if (nameLower.includes('ket') || nameLower.includes('end') || nameLower.includes('chao')) {
          category = 'ending';
        }

        preparedTracks.push({
          id: trackId,
          title: file.name.replace(/\.[^/.]+$/, ''), // remove extension
          duration: 180, // initial estimate, will be updated in background
          fileUrl,
          fileType: file.type,
          category,
          addedAt: timestamp + i
        });
      }

      // Save all audio blobs into IndexedDB in a single batch transaction!
      await storageService.saveAudioBlobsBatch(blobItems);

      // Add to tracks state immediately so they show up on screen with zero delay!
      setTracks((prev) => {
        const nextTracks = [...prev, ...preparedTracks];
        // Auto persist project state with new tracks
        storageService.saveProjectState({
          projectName,
          tracks: nextTracks,
          cues,
          soundpads,
          mixerSettings
        }).catch(console.error);
        return nextTracks;
      });
      setIsSaved(false);

      // Extract exact durations in background with timeout safety
      Promise.all(
        preparedTracks.map(async (t) => {
          if (!t.fileUrl) return null;
          const dur = await new Promise<number>((res) => {
            const audio = new Audio();
            const tm = setTimeout(() => res(180), 1500);
            audio.onloadedmetadata = () => {
              clearTimeout(tm);
              res(audio.duration && !isNaN(audio.duration) ? audio.duration : 180);
            };
            audio.onerror = () => {
              clearTimeout(tm);
              res(180);
            };
            audio.src = t.fileUrl!;
          });
          return { id: t.id, duration: dur };
        })
      ).then((durations) => {
        setTracks((prev) => {
          const updated = prev.map((trk) => {
            const found = durations.find((d) => d && d.id === trk.id);
            return found ? { ...trk, duration: found.duration } : trk;
          });
          storageService.saveProjectState({
            projectName,
            tracks: updated,
            cues,
            soundpads,
            mixerSettings
          }).catch(console.error);
          return updated;
        });
      });
    } catch (err) {
      console.error('Error importing multiple files:', err);
      alert('Có lỗi khi thêm các bài hát, vui lòng thử lại!');
    } finally {
      setIsImporting(false);
      setImportProgress('');
    }
  };

  // Delete tracks
  const handleDeleteTracks = async (trackIds: string[]) => {
    for (const id of trackIds) {
      await storageService.deleteAudioBlob(id);
    }
    setTracks((prev) => prev.filter((t) => !trackIds.includes(t.id)));
    setCues((prev) => prev.filter((c) => !trackIds.includes(c.trackId)));
    setIsSaved(false);
  };

  // Clear all tracks and cues completely
  const handleClearAllTracks = async () => {
    audioEngine.stop('A');
    audioEngine.stop('B');
    setDeckA((prev) => ({ ...prev, track: null, isPlaying: false, currentTime: 0 }));
    setDeckB((prev) => ({ ...prev, track: null, isPlaying: false, currentTime: 0 }));
    setTracks([]);
    setCues([]);
    setActiveCueIndex(-1);
    await storageService.clearAllAudioBlobs();
    await storageService.saveProjectState({
      projectName,
      tracks: [],
      cues: [],
      soundpads,
      mixerSettings
    });
    setIsSaved(true);
  };

  // Update track category
  const handleUpdateTrackCategory = (trackId: string, category: EventCategory) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, category } : t))
    );
    setIsSaved(false);
  };

  // Send Track to Deck A or Deck B
  const handleSendToDeck = async (track: AudioTrack, deckId: 'A' | 'B', autoplay = false) => {
    let fileUrl = track.fileUrl;

    // If fileUrl is missing (e.g. after page reload), re-create it from IndexedDB
    if (!fileUrl) {
      const blob = await storageService.getAudioBlob(track.id);
      if (!blob) {
        console.error(`Cannot find audio blob for track: ${track.title}`);
        return;
      }
      fileUrl = URL.createObjectURL(blob);
      // Update track in library with new URL
      setTracks((prev) => prev.map((t) => t.id === track.id ? { ...t, fileUrl } : t));
    }

    // Update deck state optimistically
    const setDeck = deckId === 'A' ? setDeckA : setDeckB;
    setDeck((prev) => ({
      ...prev,
      track: { ...track, fileUrl },
      duration: track.duration,
      currentTime: 0,
      isPlaying: false // will be updated by onPlayState listener
    }));

    // Load track into engine (this also resumes AudioContext)
    await audioEngine.loadTrack(deckId, fileUrl, autoplay);
  };

  // Deck Controls Handlers
  const handleDeckPlay = async (deckId: 'A' | 'B') => {
    // Play is async — isPlaying state will be synced via onPlayState listener
    await audioEngine.play(deckId);
  };

  const handleDeckPause = (deckId: 'A' | 'B') => {
    audioEngine.pause(deckId);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, isPlaying: false }));
    else setDeckB((prev) => ({ ...prev, isPlaying: false }));
  };

  const handleDeckStop = (deckId: 'A' | 'B') => {
    audioEngine.stop(deckId);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
    else setDeckB((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
  };

  const handleDeckSeek = (deckId: 'A' | 'B', seconds: number) => {
    audioEngine.seek(deckId, seconds);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, currentTime: seconds }));
    else setDeckB((prev) => ({ ...prev, currentTime: seconds }));
  };

  const handleDeckCue = (deckId: 'A' | 'B') => {
    audioEngine.seek(deckId, 0);
    audioEngine.pause(deckId);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, currentTime: 0, isPlaying: false }));
    else setDeckB((prev) => ({ ...prev, currentTime: 0, isPlaying: false }));
  };

  const handleDeckFadeOut = (deckId: 'A' | 'B', duration = 2) => {
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, isFadingOut: true }));
    else setDeckB((prev) => ({ ...prev, isFadingOut: true }));

    audioEngine.fadeOutDeck(deckId, duration).then(() => {
      if (deckId === 'A') {
        setDeckA((prev) => ({ ...prev, isPlaying: false, isFadingOut: false }));
      } else {
        setDeckB((prev) => ({ ...prev, isPlaying: false, isFadingOut: false }));
      }
    });
  };

  const handleDeckVolumeChange = (deckId: 'A' | 'B', vol: number) => {
    audioEngine.setDeckVolume(deckId, vol);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, volume: vol }));
    else setDeckB((prev) => ({ ...prev, volume: vol }));
  };

  const handleDeckPitchChange = (deckId: 'A' | 'B', pitch: number) => {
    audioEngine.setPitch(deckId, pitch);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, pitch }));
    else setDeckB((prev) => ({ ...prev, pitch }));
  };

  const handleDeckLoopToggle = (deckId: 'A' | 'B') => {
    const nextLoop = deckId === 'A' ? !deckA.isLooping : !deckB.isLooping;
    audioEngine.setLoop(deckId, nextLoop);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, isLooping: nextLoop }));
    else setDeckB((prev) => ({ ...prev, isLooping: nextLoop }));
  };

  const handleDeckEQChange = (deckId: 'A' | 'B', low: number, mid: number, high: number) => {
    audioEngine.setEQ(deckId, low, mid, high);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, lowEQ: low, midEQ: mid, highEQ: high }));
    else setDeckB((prev) => ({ ...prev, lowEQ: low, midEQ: mid, highEQ: high }));
  };

  const handleDeckEject = (deckId: 'A' | 'B') => {
    audioEngine.stop(deckId);
    if (deckId === 'A') setDeckA((prev) => ({ ...prev, track: null, isPlaying: false, currentTime: 0 }));
    else setDeckB((prev) => ({ ...prev, track: null, isPlaying: false, currentTime: 0 }));
  };

  // Mixer Operations
  const handleCrossfaderChange = (val: number) => {
    audioEngine.setCrossfader(val);
    setMixerSettings((prev) => ({ ...prev, crossfader: val }));
  };

  const handleAutoCrossfade = (targetDeck: 'A' | 'B', duration = 3) => {
    audioEngine.autoCrossfade(targetDeck, duration).then(() => {
      setMixerSettings((prev) => ({ ...prev, crossfader: targetDeck === 'A' ? -1 : 1 }));
    });
  };

  const handleMasterVolumeChange = (vol: number) => {
    audioEngine.setMasterVolume(vol);
    setMixerSettings((prev) => ({ ...prev, masterVolume: vol }));
  };

  const handleToggleMute = () => {
    const muted = audioEngine.toggleMute();
    setMixerSettings((prev) => ({ ...prev, isMuted: muted }));
  };

  const handleToggleDucking = () => {
    const next = !mixerSettings.isDuckingActive;
    audioEngine.setDucking(next);
    setMixerSettings((prev) => ({ ...prev, isDuckingActive: next }));
  };

  const handleDuckingAmountChange = (amount: number) => {
    audioEngine.setDuckingLevel(amount);
    setMixerSettings((prev) => ({ ...prev, duckingAmount: amount }));
  };

  const handleFadeOutAll = () => {
    setDeckA((prev) => ({ ...prev, isFadingOut: true }));
    setDeckB((prev) => ({ ...prev, isFadingOut: true }));
    audioEngine.fadeOutAll(2).then(() => {
      setDeckA((prev) => ({ ...prev, isPlaying: false, isFadingOut: false }));
      setDeckB((prev) => ({ ...prev, isPlaying: false, isFadingOut: false }));
    });
  };

  // Soundpad Triggers
  const handleTriggerPad = (pad: SoundPad) => {
    setActivePadSlot(pad.slot);
    setTimeout(() => setActivePadSlot(null), 800);

    let identifier = pad.builtinId || 'applause';
    if (pad.soundType === 'custom' && pad.trackId) {
      const track = tracks.find((t) => t.id === pad.trackId);
      if (track?.fileUrl) {
        identifier = track.fileUrl;
      }
    }

    audioEngine.playSoundpad(pad.soundType, identifier, pad.volume, pad.ducking);

    // If applause or fanfare, trigger party confetti!
    if (pad.builtinId === 'applause' || pad.builtinId === 'fanfare') {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.85 }
      });
    }
  };

  const handleStopAllPads = () => {
    setActivePadSlot(null);
    audioEngine.setDucking(false);
  };

  const handleUpdatePad = (updated: SoundPad) => {
    setSoundpads((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setIsSaved(false);
  };

  // Quick Launch Board Handlers
  const handleUpdateQuickSlot = (updated: QuickLaunchSlot) => {
    setQuickLaunchSlots((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    setIsSaved(false);
  };

  const handleAssignTrackToSlot = async (slotId: string, track: AudioTrack) => {
    let fileUrl = track.fileUrl;
    if (!fileUrl) {
      const blob = await storageService.getAudioBlob(track.id);
      if (blob) fileUrl = URL.createObjectURL(blob);
    }
    setQuickLaunchSlots((prev) => prev.map((s) =>
      s.id === slotId
        ? { ...s, trackId: track.id, label: track.title, fileUrl, duration: track.duration }
        : s
    ));
    setIsSaved(false);
  };

  const handleClearQuickSlot = (slotId: string) => {
    setQuickLaunchSlots((prev) => prev.map((s) =>
      s.id === slotId
        ? { ...s, trackId: undefined, label: '', fileUrl: undefined, duration: undefined }
        : s
    ));
    setIsSaved(false);
  };

  // Cue List Operations
  const handleAddToCueList = (selectedTracks: AudioTrack[]) => {
    const startOrder = cues.length;
    const newCues: CueItem[] = selectedTracks.map((track, idx) => ({
      id: `cue_${Date.now()}_${idx}`,
      trackId: track.id,
      title: track.title,
      sectionName: `${(startOrder + idx + 1).toString().padStart(2, '0')}. ${track.title}`,
      targetDeck: 'auto',
      autoPlayNext: false,
      fadeTime: 2,
      order: startOrder + idx
    }));

    setCues((prev) => [...prev, ...newCues]);
    setIsSaved(false);
  };

  // Stage GO (Advance to next cue)
  const handleGoNextCue = useCallback(() => {
    if (cues.length === 0) return;
    const nextIdx = (activeCueIndex + 1) % cues.length;
    const cue = cues[nextIdx];
    const track = tracks.find((t) => t.id === cue.trackId);
    if (!track) return;

    // Determine target deck: if 'auto', use idle deck
    let targetDeck: 'A' | 'B' = 'A';
    if (cue.targetDeck === 'A') targetDeck = 'A';
    else if (cue.targetDeck === 'B') targetDeck = 'B';
    else {
      // Auto: if Deck A is playing, send to Deck B and fade to B
      if (deckA.isPlaying && !deckB.isPlaying) targetDeck = 'B';
      else if (deckB.isPlaying && !deckA.isPlaying) targetDeck = 'A';
      else targetDeck = deckA.isPlaying ? 'B' : 'A';
    }

    handleSendToDeck(track, targetDeck, true);

    // Auto transition crossfader to target deck
    audioEngine.autoCrossfade(targetDeck, cue.fadeTime || 2);
    setMixerSettings((prev) => ({ ...prev, crossfader: targetDeck === 'A' ? -1 : 1 }));

    setActiveCueIndex(nextIdx);
  }, [activeCueIndex, cues, tracks, deckA.isPlaying, deckB.isPlaying]);

  const handleJumpToCue = (index: number) => {
    const cue = cues[index];
    const track = tracks.find((t) => t.id === cue.trackId);
    if (!track) return;

    const targetDeck = cue.targetDeck === 'B' ? 'B' : 'A';
    handleSendToDeck(track, targetDeck, true);
    setActiveCueIndex(index);
  };

  const handleMoveCue = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= cues.length) return;
    const next = [...cues];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    setCues(next);
    setIsSaved(false);
  };

  const handleDeleteCue = (cueId: string) => {
    setCues((prev) => prev.filter((c) => c.id !== cueId));
    setIsSaved(false);
  };

  const handleUpdateCueNotes = (cueId: string, notes: string) => {
    setCues((prev) => prev.map((c) => (c.id === cueId ? { ...c, notes } : c)));
    setIsSaved(false);
  };

  // Project Save & Export & Import
  const handleSaveProject = async () => {
    await storageService.saveProjectState({
      projectName,
      tracks,
      cues,
      soundpads,
      quickLaunchSlots,
      mixerSettings
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleExportProject = () => {
    const data: ProjectData = {
      projectName,
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tracks: tracks.map((t) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { fileUrl, ...rest } = t;
        return rest;
      }),
      cues,
      soundpads,
      quickLaunchSlots,
      mixerSettings
    };
    storageService.exportProjectFile(data);
  };

  const handleImportProject = async (file: File) => {
    try {
      const data = await storageService.parseProjectFile(file);
      await hydrateProjectData(data);
      alert(`Đã nạp thành công kịch bản: "${data.projectName}"`);
    } catch (err: any) {
      alert(`Lỗi khi mở file kịch bản: ${err?.message || err}`);
    }
  };

  // Keyboard Hotkeys Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger hotkeys if typing in input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleGoNextCue();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleFadeOutAll();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMute();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleToggleDucking();
      } else if (e.key === 'Escape') {
        handleStopAllPads();
      } else if (e.key === '[') {
        handleAutoCrossfade('A', 3);
      } else if (e.key === ']') {
        handleAutoCrossfade('B', 3);
      } else if (e.key === '\\') {
        handleCrossfaderChange(0);
      } else if (e.key === '?') {
        setShowHotkeysModal(true);
      } else {
        // Soundpad Hotkeys 1..9, 0, -, =
        const pad = soundpads.find((p) => p.hotkey === e.key);
        if (pad) {
          e.preventDefault();
          handleTriggerPad(pad);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [soundpads, handleGoNextCue]);

  return (
    <div className="eventmix-app">
      {/* Top Application Header */}
      <Header
        projectName={projectName}
        onUpdateProjectName={(name) => {
          setProjectName(name);
          setIsSaved(false);
        }}
        onSaveProject={handleSaveProject}
        onExportProject={handleExportProject}
        onImportProject={handleImportProject}
        onOpenPresets={() => setShowPresetModal(true)}
        onOpenHotkeys={() => setShowHotkeysModal(true)}
        isSaved={isSaved}
      />

      {/* Main Studio Console Grid */}
      <main className="console-main-layout">
        {/* Top Deck & Mixer Console (Dual Deck A/B + Master Mixer) */}
        <section className="top-console-row">
          <DeckPlayer
            deckId="A"
            state={deckA}
            onPlay={() => handleDeckPlay('A')}
            onPause={() => handleDeckPause('A')}
            onStop={() => handleDeckStop('A')}
            onSeek={(s) => handleDeckSeek('A', s)}
            onCue={() => handleDeckCue('A')}
            onFadeOut={(d) => handleDeckFadeOut('A', d)}
            onVolumeChange={(v) => handleDeckVolumeChange('A', v)}
            onPitchChange={(p) => handleDeckPitchChange('A', p)}
            onLoopToggle={() => handleDeckLoopToggle('A')}
            onEQChange={(l, m, h) => handleDeckEQChange('A', l, m, h)}
            onEject={() => handleDeckEject('A')}
          />

          <MixerSection
            settings={mixerSettings}
            masterVU={masterVU}
            onCrossfaderChange={handleCrossfaderChange}
            onAutoCrossfade={handleAutoCrossfade}
            onMasterVolumeChange={handleMasterVolumeChange}
            onToggleMute={handleToggleMute}
            onToggleDucking={handleToggleDucking}
            onFadeOutAll={handleFadeOutAll}
            onDuckingAmountChange={handleDuckingAmountChange}
          />

          <DeckPlayer
            deckId="B"
            state={deckB}
            onPlay={() => handleDeckPlay('B')}
            onPause={() => handleDeckPause('B')}
            onStop={() => handleDeckStop('B')}
            onSeek={(s) => handleDeckSeek('B', s)}
            onCue={() => handleDeckCue('B')}
            onFadeOut={(d) => handleDeckFadeOut('B', d)}
            onVolumeChange={(v) => handleDeckVolumeChange('B', v)}
            onPitchChange={(p) => handleDeckPitchChange('B', p)}
            onLoopToggle={() => handleDeckLoopToggle('B')}
            onEQChange={(l, m, h) => handleDeckEQChange('B', l, m, h)}
            onEject={() => handleDeckEject('B')}
          />
        </section>

        {/* Middle Section: Tabs — Âm Hiệu / Bàn Nhạc Quan Trọng */}
        <section className="soundboard-row">
          {/* Tab bar */}
          <div className="mid-tab-bar">
            <button
              className={`mid-tab-btn ${middleTab === 'soundboard' ? 'mid-tab-active' : ''}`}
              onClick={() => setMiddleTab('soundboard')}
            >
              🎛️ ÂM HIỆU TỨC THỜI
            </button>
            <button
              className={`mid-tab-btn ${middleTab === 'quicklaunch' ? 'mid-tab-active mid-tab-active-ql' : ''}`}
              onClick={() => setMiddleTab('quicklaunch')}
            >
              ⭐ BÀN NHẠC QUAN TRỌNG
              {quickLaunchSlots.filter(s => s.trackId).length > 0 && (
                <span className="mid-tab-badge">{quickLaunchSlots.filter(s => s.trackId).length}</span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          {middleTab === 'soundboard' ? (
            <Soundboard
              pads={soundpads}
              tracks={tracks}
              activePadSlot={activePadSlot}
              onTriggerPad={handleTriggerPad}
              onStopAllPads={handleStopAllPads}
              onUpdatePad={handleUpdatePad}
            />
          ) : (
            <QuickLaunchBoard
              slots={quickLaunchSlots}
              tracks={tracks}
              onUpdateSlot={handleUpdateQuickSlot}
              onAssignTrack={handleAssignTrackToSlot}
              onClearSlot={handleClearQuickSlot}
            />
          )}
        </section>

        {/* Bottom Section: Split Pane (Event Library + Cue List Timeline) */}
        <section className="bottom-split-row">
          {/* Left: Music Library Manager with Multi-selection */}
          <div className="split-col-library">
            <LibraryManager
              tracks={tracks}
              isImporting={isImporting}
              importProgress={importProgress}
              onAddTracks={handleAddTracks}
              onDeleteTracks={handleDeleteTracks}
              onClearAllTracks={handleClearAllTracks}
              onSendToDeck={handleSendToDeck}
              onAddToCueList={handleAddToCueList}
              onUpdateTrackCategory={handleUpdateTrackCategory}
              onGenerateDemoMusic={handleGenerateDemoMusic}
            />
          </div>

          {/* Right: Stage Cue List / Script with GO Next Cue Button */}
          <div className="split-col-cue">
            <CueListManager
              cues={cues}
              tracks={tracks}
              activeCueIndex={activeCueIndex}
              onGoNextCue={handleGoNextCue}
              onJumpToCue={handleJumpToCue}
              onMoveCue={handleMoveCue}
              onDeleteCue={handleDeleteCue}
              onUpdateCueNotes={handleUpdateCueNotes}
            />
          </div>
        </section>
      </main>

      {/* Hotkeys Modal */}
      {showHotkeysModal && (
        <HotkeysModal onClose={() => setShowHotkeysModal(false)} />
      )}

      {/* Preset Management Modal */}
      {showPresetModal && (
        <PresetModal
          isOpen={showPresetModal}
          onClose={() => setShowPresetModal(false)}
          currentProjectData={{
            projectName,
            tracks,
            cues,
            soundpads,
            quickLaunchSlots,
            mixerSettings
          }}
          onLoadPreset={async (presetData) => {
            await hydrateProjectData(presetData);
          }}
        />
      )}
    </div>
  );
};

export default App;
