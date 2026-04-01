import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .limit(1)
    .maybeSingle();

  const role = profile?.role || user.user_metadata?.role || 'viewer';

  // Filter by status if provided
  const statusFilter = request.nextUrl.searchParams.get('status');

  // All roles can see requests (admin, producer, viewer)
  let query = supabase
    .from('music_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (statusFilter && ['Open', 'In Review', 'Filled', 'Closed'].includes(statusFilter)) {
    query = query.eq('status', statusFilter);
  }

  const { data: requests, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ requests: requests || [] });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .limit(1)
    .maybeSingle();

  const role = profile?.role || 'viewer';
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing brief id' }, { status: 400 });
  }

  // If only updating status, admin only
  if (updates.status && Object.keys(updates).length === 1) {
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    if (!['Open', 'In Review', 'Filled', 'Closed'].includes(updates.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
  }

  // For full edits: admin can edit any brief, viewers can edit their own
  if (role !== 'admin') {
    const { data: brief } = await supabase
      .from('music_requests')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();

    if (!brief || brief.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own briefs' }, { status: 403 });
    }
  }

  // Allowed fields for update
  const allowed = ['project', 'brand', 'campaign_type', 'deadline', 'creative_themes',
    'emotions', 'story_context', 'genre', 'subgenre', 'genre_blends', 'energy', 'vocal',
    'bpm_min', 'bpm_max', 'instrumentation', 'reference', 'reference_artists',
    'description', 'mood', 'theme', 'contact_name', 'contact_email', 'status'];

  const safeUpdates: Record<string, any> = {};
  for (const key of allowed) {
    if (key in updates) safeUpdates[key] = updates[key];
  }

  const { error } = await supabase
    .from('music_requests')
    .update(safeUpdates)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
