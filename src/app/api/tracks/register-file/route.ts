import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Check user has upload permissions (admin or producer/songwriter)
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !['admin', 'producer/songwriter'].includes(profile.role)) {
    return NextResponse.json({ error: 'Not authorized to upload' }, { status: 403 });
  }

  const body = await request.json();
  const { track_id, version_type, file_name, file_size, storage_path, format } = body;

  if (!track_id || !version_type || !file_name || !storage_path || !format) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await admin.from('track_files').insert({
    track_id,
    version_type,
    file_name,
    file_size: file_size || 0,
    storage_path,
    format,
  }).select().single();

  if (error) {
    console.error('track_files insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, file: data });
}
