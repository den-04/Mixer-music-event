import type { AudioTrack, CueItem, SoundPad, ProjectData, MixerSettings, QuickLaunchSlot, EventPreset } from '../types/audio';

const DB_NAME = 'EventMixerProDB';
const DB_VERSION = 1;
const BLOB_STORE = 'audio_blobs';
const META_STORE = 'metadata';

class StorageService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(BLOB_STORE)) {
          db.createObjectStore(BLOB_STORE);
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
      };
    });
  }

  async saveAudioBlob(id: string, blob: Blob): Promise<void> {
    await this.init();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(BLOB_STORE, 'readwrite');
      const store = tx.objectStore(BLOB_STORE);
      const req = store.put(blob, id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async saveAudioBlobsBatch(items: { id: string; blob: Blob }[]): Promise<void> {
    await this.init();
    if (!this.db || items.length === 0) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(BLOB_STORE, 'readwrite');
      const store = tx.objectStore(BLOB_STORE);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      for (const item of items) {
        store.put(item.blob, item.id);
      }
    });
  }

  async getAudioBlob(id: string): Promise<Blob | null> {
    await this.init();
    if (!this.db) return null;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(BLOB_STORE, 'readonly');
      const store = tx.objectStore(BLOB_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteAudioBlob(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(BLOB_STORE, 'readwrite');
      const store = tx.objectStore(BLOB_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clearAllAudioBlobs(): Promise<void> {
    await this.init();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(BLOB_STORE, 'readwrite');
      const store = tx.objectStore(BLOB_STORE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Save full project metadata
  async saveProjectState(data: {
    tracks: AudioTrack[];
    cues: CueItem[];
    soundpads: SoundPad[];
    quickLaunchSlots?: QuickLaunchSlot[];
    mixerSettings: MixerSettings;
    projectName: string;
  }): Promise<void> {
    await this.init();
    if (!this.db) return;
    const sanitizedTracks = data.tracks.map(t => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { fileUrl, ...rest } = t;
      return rest;
    });

    const project: ProjectData = {
      projectName: data.projectName,
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tracks: sanitizedTracks,
      cues: data.cues,
      soundpads: data.soundpads,
      quickLaunchSlots: data.quickLaunchSlots,
      mixerSettings: data.mixerSettings
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(META_STORE, 'readwrite');
      const store = tx.objectStore(META_STORE);
      const req = store.put(project, 'current_project');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Load project metadata from local database
  async loadProjectState(): Promise<ProjectData | null> {
    await this.init();
    if (!this.db) return null;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      const req = store.get('current_project');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  // Preset Management
  async getPresets(): Promise<EventPreset[]> {
    await this.init();
    if (!this.db) return [];
    return new Promise((resolve) => {
      const tx = this.db!.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      const req = store.get('saved_presets');
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async savePreset(preset: EventPreset): Promise<void> {
    await this.init();
    if (!this.db) return;
    const presets = await this.getPresets();
    const existingIndex = presets.findIndex(p => p.id === preset.id);
    if (existingIndex >= 0) {
      presets[existingIndex] = preset;
    } else {
      presets.unshift(preset);
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(META_STORE, 'readwrite');
      const store = tx.objectStore(META_STORE);
      const req = store.put(presets, 'saved_presets');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deletePreset(presetId: string): Promise<void> {
    await this.init();
    if (!this.db) return;
    const presets = await this.getPresets();
    const filtered = presets.filter(p => p.id !== presetId);

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(META_STORE, 'readwrite');
      const store = tx.objectStore(META_STORE);
      const req = store.put(filtered, 'saved_presets');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async setDefaultPresetId(id: string | null): Promise<void> {
    await this.init();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(META_STORE, 'readwrite');
      const store = tx.objectStore(META_STORE);
      const req = store.put(id, 'default_preset_id');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getDefaultPresetId(): Promise<string | null> {
    await this.init();
    if (!this.db) return null;
    return new Promise((resolve) => {
      const tx = this.db!.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      const req = store.get('default_preset_id');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  // Export project to a downloadable .eventmix JSON file
  exportProjectFile(projectData: ProjectData): void {
    const jsonStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (projectData.projectName || 'kich-ban-su-kien').replace(/[^a-z0-9_-]/gi, '_');
    link.href = url;
    link.download = `${safeName}_${new Date().toISOString().slice(0, 10)}.eventmix`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Parse imported .eventmix or .json file
  async parseProjectFile(file: File): Promise<ProjectData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content) as ProjectData;
          if (!parsed.tracks || !parsed.cues) {
            throw new Error('Định dạng file kịch bản không hợp lệ.');
          }
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
}

export const storageService = new StorageService();
