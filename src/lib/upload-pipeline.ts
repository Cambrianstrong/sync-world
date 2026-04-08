import { SupabaseClient } from '@supabase/supabase-js';

// Valid audio MIME types
const VALID_AUDIO_TYPES = [
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/aiff',
  'audio/x-aiff',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/flac',
  'audio/ogg',
];

// Also accept by extension since MIME detection can be unreliable
const VALID_EXTENSIONS = ['wav', 'aiff', 'aif', 'mp3', 'mp4', 'm4a', 'aac', 'flac', 'ogg'];

// Storage bucket name
const STORAGE_BUCKET = 'tracks';

export type UploadStatus =
  | 'pending'
  | 'validating'
  | 'creating_track'
  | 'uploading'
  | 'verifying_storage'
  | 'registering'
  | 'verifying_playback'
  | 'complete'
  | 'failed'
  | 'rolling_back';

export interface FileUploadProgress {
  fileName: string;
  status: UploadStatus;
  progress: number; // 0–100 for upload phase
  error?: string;
}

export interface SongUploadProgress {
  songTitle: string;
  status: 'pending' | 'in_progress' | 'complete' | 'failed' | 'partial';
  trackId?: string;
  files: FileUploadProgress[];
  error?: string;
}

export interface UploadPipelineOptions {
  supabase: SupabaseClient;
  onProgress: (progress: SongUploadProgress[]) => void;
  maxRetries?: number; // default 3
  retryBaseDelayMs?: number; // default 1000 (exponential backoff)
}

/**
 * Validates an audio file for upload
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size <= 0) {
    return { valid: false, error: 'File size must be greater than 0 bytes' };
  }

  // Check MIME type
  if (VALID_AUDIO_TYPES.includes(file.type)) {
    return { valid: true };
  }

  // Check file extension as fallback
  const fileName = file.name.toLowerCase();
  const extension = fileName.split('.').pop();
  if (extension && VALID_EXTENSIONS.includes(extension)) {
    return { valid: true };
  }

  return {
    valid: false,
    error: `Invalid audio format. Supported formats: ${VALID_EXTENSIONS.join(', ')}`,
  };
}

/**
 * Retry wrapper with exponential backoff and jitter
 * Delay = baseDelay * 2^attempt + random(0, baseDelay/2)
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelay: number,
  label: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const exponentialDelay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * (baseDelay / 2);
        const delay = exponentialDelay + jitter;

        console.warn(
          `${label} failed (attempt ${attempt + 1}/${maxRetries + 1}). ` +
            `Retrying in ${Math.round(delay)}ms. Error: ${lastError.message}`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`${label} failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`);
}

/**
 * Get the extension from a filename
 */
function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

/**
 * Generate a storage path for a track file
 */
function getStoragePath(trackId: string, versionType: string, fileName: string): string {
  return `${trackId}/${versionType}/${fileName}`;
}

/**
 * Get folder path from storage path
 */
function getFolderPath(storagePath: string): string {
  return storagePath.substring(0, storagePath.lastIndexOf('/'));
}

/**
 * Delete a file from storage, silently failing if it doesn't exist
 */
async function safeDeleteStorageFile(
  supabase: SupabaseClient,
  storagePath: string
): Promise<void> {
  try {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
  } catch (error) {
    console.warn(`Failed to delete storage file ${storagePath}:`, error);
  }
}

/**
 * Delete a track record from the database, silently failing if it doesn't exist
 */
async function safeDeleteTrackRecord(supabase: SupabaseClient, trackId: string): Promise<void> {
  try {
    await supabase.from('tracks').delete().eq('id', trackId);
  } catch (error) {
    console.warn(`Failed to delete track record ${trackId}:`, error);
  }
}

/**
 * Unregister a file by calling the API endpoint
 */
async function safeUnregisterFile(
  supabase: SupabaseClient,
  trackId: string,
  fileName: string
): Promise<void> {
  try {
    const response = await fetch('/api/tracks/unregister-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, fileName }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.warn(`Failed to unregister file ${fileName} for track ${trackId}:`, error);
  }
}

/**
 * Verify that a file exists in storage and has correct size
 */
async function verifyStorageFile(
  supabase: SupabaseClient,
  storagePath: string,
  expectedSize: number
): Promise<boolean> {
  try {
    const folderPath = getFolderPath(storagePath);
    const fileName = storagePath.split('/').pop();

    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(folderPath);

    if (error) {
      console.error(`Failed to list storage folder ${folderPath}:`, error);
      return false;
    }

    const uploadedFile = data?.find((file) => file.name === fileName);
    if (!uploadedFile) {
      console.error(`File not found in storage: ${storagePath}`);
      return false;
    }

    // Allow 1% tolerance or at least > 0
    const actualSize = uploadedFile.metadata?.size ?? 0;
    const sizeTolerance = Math.max(expectedSize * 0.01, 1);
    const sizeMatch = Math.abs(actualSize - expectedSize) <= sizeTolerance;

    if (!sizeMatch) {
      console.warn(
        `File size mismatch for ${storagePath}. Expected ~${expectedSize}, got ${actualSize}`
      );
    }

    return actualSize > 0;
  } catch (error) {
    console.error(`Error verifying storage file ${storagePath}:`, error);
    return false;
  }
}

/**
 * Upload a single song (track + all its files) with full rollback on failure
 */
export async function uploadSong(
  supabase: SupabaseClient,
  trackData: Record<string, any>,
  files: { file: File; versionType: string }[],
  onFileProgress: (fileIndex: number, progress: FileUploadProgress) => void,
  options?: { maxRetries?: number; retryBaseDelayMs?: number }
): Promise<{ trackId: string | null; success: boolean; failedFiles: string[] }> {
  const maxRetries = options?.maxRetries ?? 3;
  const retryBaseDelayMs = options?.retryBaseDelayMs ?? 1000;

  const failedFiles: string[] = [];
  let trackId: string | null = null;
  const uploadedStoragePaths: string[] = [];
  const registeredFiles: string[] = [];

  try {
    // Step 1: Validate all files first
    for (let i = 0; i < files.length; i++) {
      onFileProgress(i, {
        fileName: files[i].file.name,
        status: 'validating',
        progress: 0,
      });

      const validation = validateAudioFile(files[i].file);
      if (!validation.valid) {
        onFileProgress(i, {
          fileName: files[i].file.name,
          status: 'failed',
          progress: 0,
          error: validation.error,
        });
        failedFiles.push(files[i].file.name);
      }
    }

    if (failedFiles.length > 0) {
      return { trackId: null, success: false, failedFiles };
    }

    // Step 2: Create track record
    onFileProgress(0, {
      fileName: files[0]?.file.name || 'unknown',
      status: 'creating_track',
      progress: 0,
    });

    const { data: trackRecord, error: trackError } = await supabase
      .from('tracks')
      .insert(trackData)
      .select()
      .single();

    if (trackError || !trackRecord) {
      console.error('Failed to create track record:', trackError);
      return { trackId: null, success: false, failedFiles: files.map((f) => f.file.name) };
    }

    trackId = trackRecord.id;
    const currentTrackId: string = trackRecord.id;

    // Step 3: Upload each file
    for (let i = 0; i < files.length; i++) {
      const { file, versionType } = files[i];
      const fileName = file.name;
      const storagePath = getStoragePath(currentTrackId, versionType, fileName);

      try {
        // Upload file with retry
        onFileProgress(i, {
          fileName,
          status: 'uploading',
          progress: 0,
        });

        await withRetry(
          async () => {
            const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, file);
            if (error) throw error;
          },
          maxRetries,
          retryBaseDelayMs,
          `Upload ${fileName}`
        );

        uploadedStoragePaths.push(storagePath);

        // Verify storage file exists
        onFileProgress(i, {
          fileName,
          status: 'verifying_storage',
          progress: 80,
        });

        const verified = await verifyStorageFile(supabase, storagePath, file.size);
        if (!verified) {
          throw new Error(`Storage verification failed for ${fileName}`);
        }

        // Register file via API with retry
        onFileProgress(i, {
          fileName,
          status: 'registering',
          progress: 85,
        });

        await withRetry(
          async () => {
            const response = await fetch('/api/tracks/register-file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                track_id: currentTrackId,
                version_type: versionType,
                file_name: fileName,
                file_size: file.size,
                storage_path: storagePath,
                format: getFileExtension(fileName).toUpperCase() || 'MP3',
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
          },
          maxRetries,
          retryBaseDelayMs,
          `Register ${fileName}`
        );

        registeredFiles.push(fileName);

        onFileProgress(i, {
          fileName,
          status: 'verifying_playback',
          progress: 95,
        });
      } catch (error) {
        console.error(`Upload failed for file ${fileName}:`, error);
        failedFiles.push(fileName);

        // Rollback: delete any previously uploaded files from this song
        console.warn(`Rolling back upload for ${fileName}`);
        for (const path of uploadedStoragePaths) {
          await safeDeleteStorageFile(supabase, path);
        }

        // Unregister any previously registered files
        for (const regFileName of registeredFiles) {
          await safeUnregisterFile(supabase, currentTrackId, regFileName);
        }

        // Delete the track record
        await safeDeleteTrackRecord(supabase, currentTrackId);
        trackId = null;

        onFileProgress(i, {
          fileName,
          status: 'failed',
          progress: 0,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // If any file failed, the entire song upload is considered failed
    if (failedFiles.length > 0) {
      return { trackId: null, success: false, failedFiles };
    }

    // Step 4: Post-upload verification (non-fatal)
    try {
      onFileProgress(0, {
        fileName: files[0]?.file.name || 'unknown',
        status: 'verifying_playback',
        progress: 95,
      });

      const response = await fetch(`/api/play?trackId=${trackId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.signedUrl) {
        console.warn(`No signed URL returned for track ${trackId}`);
      }
    } catch (error) {
      console.warn(`Post-upload verification failed for track ${trackId}:`, error);
      // Non-fatal: don't rollback
    }

    // Mark all files as complete
    for (let i = 0; i < files.length; i++) {
      onFileProgress(i, {
        fileName: files[i].file.name,
        status: 'complete',
        progress: 100,
      });
    }

    // Fire-and-forget: kick off Cyanite AI tagging. Does not block upload UX
    // and does not roll back the upload if it fails.
    if (trackId) {
      fetch('/api/tracks/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId }),
      }).catch((e) => console.warn('AI analyze kickoff failed:', e));
    }

    return { trackId, success: true, failedFiles: [] };
  } catch (error) {
    console.error('Unexpected error in uploadSong:', error);

    // Final rollback attempt
    if (trackId) {
      for (const path of uploadedStoragePaths) {
        await safeDeleteStorageFile(supabase, path);
      }
      for (const fileName of registeredFiles) {
        await safeUnregisterFile(supabase, trackId, fileName);
      }
      await safeDeleteTrackRecord(supabase, trackId);
    }

    return {
      trackId: null,
      success: false,
      failedFiles: files.map((f) => f.file.name),
    };
  }
}

/**
 * Orchestrator: uploads all songs and manages progress state
 */
export async function uploadAllSongs(
  options: UploadPipelineOptions,
  songs: {
    trackData: Record<string, any>;
    files: { file: File; versionType: string }[];
    title: string;
  }[]
): Promise<{ totalSuccess: number; totalFailed: number; results: SongUploadProgress[] }> {
  const maxRetries = options.maxRetries ?? 3;
  const retryBaseDelayMs = options.retryBaseDelayMs ?? 1000;

  const results: SongUploadProgress[] = songs.map((song) => ({
    songTitle: song.title,
    status: 'pending',
    files: song.files.map((f) => ({
      fileName: f.file.name,
      status: 'pending' as UploadStatus,
      progress: 0,
    })),
  }));

  let totalSuccess = 0;
  let totalFailed = 0;

  // Upload songs sequentially to avoid overwhelming the server
  for (let songIndex = 0; songIndex < songs.length; songIndex++) {
    const song = songs[songIndex];
    const result = results[songIndex];

    result.status = 'in_progress';
    options.onProgress(results);

    try {
      const uploadResult = await uploadSong(
        options.supabase,
        song.trackData,
        song.files,
        (fileIndex, fileProgress) => {
          result.files[fileIndex] = fileProgress;
          options.onProgress(results);
        },
        { maxRetries, retryBaseDelayMs }
      );

      if (uploadResult.success) {
        result.status = 'complete';
        result.trackId = uploadResult.trackId || undefined;
        totalSuccess++;
      } else {
        if (uploadResult.failedFiles.length === song.files.length) {
          result.status = 'failed';
          totalFailed++;
        } else {
          result.status = 'partial';
          totalFailed++;
        }
        result.error = `${uploadResult.failedFiles.length} file(s) failed to upload`;
      }
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : String(error);
      totalFailed++;
    }

    options.onProgress(results);
  }

  return { totalSuccess, totalFailed, results };
}
