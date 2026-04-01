import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .limit(1)
    .maybeSingle();

  const formData = await request.formData();
  const briefId = formData.get('brief_id') as string;
  const title = formData.get('title') as string;
  const artist = formData.get('artist') as string;
  const genre = formData.get('genre') as string;
  const vocal = formData.get('vocal') as string;
  const energy = formData.get('energy') as string || 'Medium';
  const mood = formData.get('mood') as string || null;
  const notes = formData.get('notes') as string || null;

  // Get all audio files
  const files: File[] = [];
  for (const [key, value] of formData.entries()) {
    if (key === 'files' && value instanceof File) {
      files.push(value);
    }
  }

  if (!briefId || !title || !artist || files.length === 0) {
    return NextResponse.json({ error: 'Brief ID, title, artist, and at least one file are required' }, { status: 400 });
  }

  // Detect versions from file names
  const fileNames = files.map(f => f.name.toLowerCase());
  const hasMain = fileNames.some(n => n.includes('main')) || files.length === 1;
  const hasClean = fileNames.some(n => n.includes('clean'));
  const hasInst = fileNames.some(n => n.includes('inst'));
  const hasAcap = fileNames.some(n => n.includes('acap'));

  // 1. Create the track in the catalog
  const { data: track, error: trackError } = await supabase.from('tracks').insert({
    title,
    artist,
    genre: genre || 'Other',
    vocal: vocal || 'Male Vox',
    energy,
    mood,
    notes,
    status: 'Unreleased (Complete)',
    has_main: hasMain,
    has_clean: hasClean,
    has_inst: hasInst,
    has_acap: hasAcap,
    submitted_by: user.id,
    splits: 'TBD',
  }).select().single();

  if (trackError) {
    return NextResponse.json({ error: `Track creation failed: ${trackError.message}` }, { status: 500 });
  }

  // 2. Upload each audio file to storage + create track_files records
  let uploadedCount = 0;
  for (const file of files) {
    const ext = file.name.split('.').pop()?.toUpperCase() || 'MP3';
    const versionType = file.name.toLowerCase().includes('clean') ? 'clean'
      : file.name.toLowerCase().includes('inst') ? 'instrumental'
      : file.name.toLowerCase().includes('acap') ? 'acapella'
      : 'main';

    const storagePath = `${track.id}/${versionType}/${file.name}`;

    // Convert File to ArrayBuffer for server-side upload
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from('tracks')
      .upload(storagePath, buffer, { contentType: file.type });

    if (uploadError) {
      console.error(`Upload error for ${file.name}:`, uploadError);
      continue;
    }

    await supabase.from('track_files').insert({
      track_id: track.id,
      version_type: versionType,
      file_name: file.name,
      file_size: file.size,
      storage_path: storagePath,
      format: ext as 'WAV' | 'AIFF' | 'MP3',
    });

    uploadedCount++;
  }

  // 3. Link track to the brief
  await supabase.from('brief_submissions').upsert({
    brief_id: briefId,
    track_id: track.id,
    submitted_by: user.id,
    submitted_by_name: profile?.full_name || user.email?.split('@')[0] || 'Unknown',
    notes,
  }, { onConflict: 'brief_id,track_id' });

  // 4. Log activity
  await supabase.from('activity_log').insert({
    type: 'upload',
    text: `'${title}' uploaded and submitted to brief by ${profile?.full_name || user.email}`,
    track_id: track.id,
    user_id: user.id,
  });

  return NextResponse.json({
    success: true,
    track: { id: track.id, title: track.title },
    filesUploaded: uploadedCount,
  });
}
