import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ profile: null, debug: { authError: authError?.message } }, { status: 401 });
  }

  // Try with RLS
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .limit(1)
    .maybeSingle();

  // If RLS blocks the query, return user info as a fallback profile
  if (!profile) {
    return NextResponse.json({
      profile: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: user.user_metadata?.role || 'viewer',
        created_at: user.created_at,
      },
      debug: {
        profileError: profileError?.message,
        userId: user.id,
        userEmail: user.email,
        note: 'Using fallback profile - RLS may be blocking profiles table read',
      },
    });
  }

  return NextResponse.json({ profile });
}
