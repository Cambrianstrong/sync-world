import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET: Fetch notifications for the current user
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const unreadOnly = request.nextUrl.searchParams.get('unread') === 'true';

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also get unread count
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  return NextResponse.json({ notifications: data || [], unreadCount: count || 0 });
}

// PATCH: Mark notifications as read
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();

  if (body.markAllRead) {
    // Mark all as read
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
  } else if (body.id) {
    // Mark single notification as read
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', body.id)
      .eq('user_id', user.id);
  }

  return NextResponse.json({ success: true });
}
