export type UserRole = 'admin' | 'producer' | 'viewer';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  company: string | null;
  email: string;
  created_at: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  writers: string | null;
  producers: string | null;
  publisher: string | null;
  status: 'Released' | 'Unreleased (Complete)' | 'Demo (WIP)';
  genre: string;
  subgenre: string | null;
  bpm: number | null;
  energy: 'Very High' | 'High' | 'Medium' | 'Low';
  mood: string | null;
  theme: string | null;
  vocal: 'Male Vox' | 'Female Vox' | 'Duet' | 'Group' | 'Instrumental';
  key: string | null;
  has_main: boolean;
  has_clean: boolean;
  has_inst: boolean;
  has_acap: boolean;
  label: string | null;
  splits: string | null;
  priority: 'High' | 'Medium' | 'Low';
  seasonal: string | null;
  download_url: string | null;
  lyrics: string | null;
  notes: string | null;
  sync_status: 'none' | 'liked' | 'chosen' | 'placed';
  download_count: number;
  submitted_by: string | null;
  date_added: string;
  created_at: string;
}

export interface TrackFile {
  id: string;
  track_id: string;
  version_type: 'main' | 'clean' | 'instrumental' | 'acapella';
  file_name: string;
  file_size: number | null;
  storage_path: string;
  format: 'WAV' | 'AIFF' | 'MP3';
  uploaded_at: string;
}

export interface Submission {
  id: string;
  date_sent: string | null;
  recipient: string | null;
  email: string | null;
  platform: 'DISCO' | 'Google Drive' | 'Box' | 'Other' | null;
  track_ids: string[];
  category: string | null;
  download_link: string | null;
  downloaded: boolean;
  date_downloaded: string | null;
  interest: boolean;
  placement_offer: boolean;
  placement_details: string | null;
  fee_offered: string | null;
  status: 'Draft' | 'Sent' | 'Followed Up' | 'Placed' | 'Passed';
  follow_up_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  relationship: 'Primary' | 'Submission Contact' | 'Decision Maker' | 'Other' | null;
  last_contact: string | null;
  notes: string | null;
  created_at: string;
}

export interface ActivityItem {
  id: string;
  type: 'upload' | 'download' | 'interest' | 'placed' | 'submission';
  text: string;
  track_id: string | null;
  user_id: string | null;
  created_at: string;
}

export const GENRES = [
  'Hip-Hop', 'R&B', 'Pop', 'Country', 'Latin', 'Brazilian',
  'Electronic', 'Afrobeats', 'Rock', 'Gospel', 'Jazz', 'Orchestral', 'Other'
] as const;

export const ENERGY_LEVELS = ['Very High', 'High', 'Medium', 'Low'] as const;

export const VOCAL_TYPES = ['Male Vox', 'Female Vox', 'Duet', 'Group', 'Instrumental'] as const;

export const TRACK_STATUSES = ['Released', 'Unreleased (Complete)', 'Demo (WIP)'] as const;

export const PUBLISHERS = [
  'Warner Chappell',
  'Sony ATV',
  'Universal Music Publishing Group',
  'BMG',
  'Kobalt',
  'Concord',
  'Downtown Music Publishing',
  'Pulse Music Group',
  'Independent',
  'Other',
] as const;

export const ENERGY_MAP: Record<string, { width: number; color: string }> = {
  'Very High': { width: 100, color: '#ef4444' },
  'High': { width: 75, color: '#f59e0b' },
  'Medium': { width: 50, color: '#6366f1' },
  'Low': { width: 25, color: '#888' },
};
