import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();

  // Only allow updating safe fields
  const allowedFields: Record<string, any> = {};
  if (body.full_name !== undefined) allowedFields.full_name = body.full_name;
  if (body.company !== undefined) allowedFields.company = body.company;
  if (body.phone !== undefined) allowedFields.phone = body.phone;
  if (body.bio !== undefined) allowedFields.bio = body.bio;
  if (body.website !== undefined) allowedFields.website = body.website;
  if (body.location !== undefined) allowedFields.location = body.location;
  if (body.specialties !== undefined) allowedFields.specialties = body.specialties;

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Try to update existing profile
  const { data: updated, error } = await supabase
    .from('profiles')
    .update(allowedFields)
    .eq('id', user.id)
    .select()
    .maybeSingle();

  if (error) {
    // If no row exists, insert instead
    if (error.code === 'PGRST116' || !updated) {
      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email || '',
          role: user.user_metadata?.role || 'viewer',
          ...allowedFields,
        })
        .select()
        .maybeSingle();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      return NextResponse.json({ profile: inserted });
    }
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }

  return NextResponse.json({ profile: updated });
}
