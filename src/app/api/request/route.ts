import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .limit(1)
    .maybeSingle();

  const body = await request.json();

  // Insert the music request (new fields + legacy fields for backward compat)
  const { data: requestData, error: insertError } = await supabase.from('music_requests').insert({
    user_id: user.id,
    user_name: profile?.full_name || user.email?.split('@')[0] || null,
    user_email: user.email || null,
    // Project & Campaign
    project: body.project || null,
    brand: body.brand || null,
    campaign_type: body.campaign_type || null,
    deadline: body.deadline || null,
    // Creative Direction
    creative_themes: body.creative_themes || null,
    emotions: body.emotions || null,
    story_context: body.story_context || null,
    // Sound Direction
    genre: body.genre || null,
    subgenre: body.subgenre || null,
    genre_blends: body.genre_blends || null,
    energy: body.energy || null,
    vocal: body.vocal || null,
    bpm_min: body.bpm_min ? parseInt(body.bpm_min) : null,
    bpm_max: body.bpm_max ? parseInt(body.bpm_max) : null,
    instrumentation: body.instrumentation || null,
    // References
    reference: body.reference_tracks || null,
    reference_artists: body.reference_artists || null,
    // Additional
    description: body.description || null,
    contact_name: body.contact_name || null,
    contact_email: body.contact_email || null,
    // Legacy fields
    mood: body.emotions || body.mood || null,
    theme: body.creative_themes || body.theme || null,
  }).select().single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Log activity
  const briefSummary = body.project || body.genre || body.creative_themes || 'General brief';
  await supabase.from('activity_log').insert({
    type: 'submission',
    text: `Music brief submitted by ${profile?.full_name || user.email}: ${briefSummary}`,
    user_id: user.id,
  });

  // Get all admin + producer users to notify them about new briefs
  const { data: notifyUsers } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .in('role', ['admin', 'producer']);

  const notifyEmails = notifyUsers?.map(a => a.email).filter(Boolean) || [];

  // Create in-app notifications for all admins and producers
  const briefTitle = body.project || body.brand || body.genre || 'General Brief';
  const notifInserts = (notifyUsers || [])
    .filter(u => u.id !== user.id) // Don't notify the submitter
    .map(u => ({
      user_id: u.id,
      type: 'brief',
      title: 'New Music Brief',
      body: `${profile?.full_name || user.email} submitted a brief: ${briefTitle}`,
      link: '/requests',
    }));

  if (notifInserts.length > 0) {
    await supabase.from('notifications').insert(notifInserts);
  }

  // Send email to admins
  let emailSent = false;
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey && notifyEmails.length > 0) {
    try {
      const resend = new Resend(resendKey);
      const userName = profile?.full_name || user.email || 'A viewer';

      const sections = [
        {
          title: 'Project & Campaign',
          fields: [
            body.project ? ['Project', body.project] : null,
            body.brand ? ['Brand / Client', body.brand] : null,
            body.campaign_type ? ['Campaign Type', body.campaign_type] : null,
            body.deadline ? ['Deadline', body.deadline] : null,
          ].filter(Boolean),
        },
        {
          title: 'Creative Direction',
          fields: [
            body.creative_themes ? ['Key Creative Themes', body.creative_themes] : null,
            body.emotions ? ['Core Emotions', body.emotions] : null,
            body.story_context ? ['Story Context', body.story_context] : null,
          ].filter(Boolean),
        },
        {
          title: 'Music Direction & Sound',
          fields: [
            body.genre ? ['Genre(s)', body.genre] : null,
            body.subgenre ? ['Sub-Genre', body.subgenre] : null,
            body.genre_blends ? ['Genre Blends', body.genre_blends] : null,
            body.energy ? ['Energy', body.energy] : null,
            body.vocal ? ['Vocal', body.vocal] : null,
            (body.bpm_min || body.bpm_max) ? ['BPM', `${body.bpm_min || '?'} - ${body.bpm_max || '?'}`] : null,
            body.instrumentation ? ['Instrumentation', body.instrumentation] : null,
          ].filter(Boolean),
        },
        {
          title: 'References',
          fields: [
            body.reference_tracks ? ['Reference Tracks', body.reference_tracks] : null,
            body.reference_artists ? ['Reference Artists', body.reference_artists] : null,
          ].filter(Boolean),
        },
        {
          title: 'Additional',
          fields: [
            body.description ? ['Notes', body.description] : null,
            body.contact_name ? ['Contact', body.contact_name] : null,
            body.contact_email ? ['Contact Email', body.contact_email] : null,
          ].filter(Boolean),
        },
      ].filter(s => s.fields.length > 0);

      const sectionsHtml = sections.map(section => {
        const fieldsHtml = (section.fields as string[][]).map(([label, value]) =>
          `<div style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;">
            <strong style="color:#555;">${label}:</strong> ${value}
          </div>`
        ).join('');

        return `
          <div style="margin-bottom:20px;">
            <div style="font-size:13px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #6366f1;">
              ${section.title}
            </div>
            ${fieldsHtml}
          </div>
        `;
      }).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
          <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
            <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
              <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:32px;text-align:center;">
                <div style="font-size:24px;font-weight:700;color:#fff;letter-spacing:-0.5px;">Sync World</div>
                <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">New Music Brief</div>
              </div>
              <div style="padding:32px;">
                <div style="font-size:14px;color:#666;margin-bottom:24px;line-height:1.5;">
                  <strong style="color:#111;">${userName}</strong> (${user.email}) has submitted a new music brief:
                </div>
                <div style="background:#fafafa;border-radius:12px;padding:20px;border:1px solid #eee;">
                  ${sectionsHtml}
                </div>
              </div>
              <div style="padding:24px 32px;background:#fafafa;border-top:1px solid #eee;text-align:center;">
                <div style="font-size:11px;color:#999;">
                  View all briefs in your Sync World Admin Dashboard.
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Sync World <noreply@resend.dev>',
        to: notifyEmails,
        subject: `New Music Brief: ${body.project || body.brand || body.genre || 'General'} - from ${userName}`,
        html,
      });
      emailSent = true;
    } catch (err) {
      console.error('[Request] Email send error:', err);
    }
  }

  return NextResponse.json({ success: true, emailSent });
}
