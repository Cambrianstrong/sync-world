import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

interface CartItem {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number | null;
  energy: string;
  mood: string | null;
  vocal: string;
  writers: string | null;
  producers: string | null;
  key: string | null;
  status: string;
  download_count: number;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const tracks: CartItem[] = body.tracks;

  if (!tracks || tracks.length === 0) {
    return NextResponse.json({ error: 'No tracks in cart' }, { status: 400 });
  }

  // Get user profile for the email
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .limit(1)
    .maybeSingle();

  const userName = profile?.full_name || user.email?.split('@')[0] || 'User';
  const userEmail = user.email!;

  // Generate signed URLs for each track
  const trackResults: {
    title: string;
    artist: string;
    genre: string;
    bpm: number | null;
    energy: string;
    mood: string | null;
    vocal: string;
    writers: string | null;
    producers: string | null;
    key: string | null;
    files: { name: string; url: string; versionType: string }[];
  }[] = [];

  for (const track of tracks) {
    const { data: files } = await supabase
      .from('track_files')
      .select('storage_path, version_type, file_name')
      .eq('track_id', track.id);

    const trackFiles: { name: string; url: string; versionType: string }[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const { data: urlData } = await supabase.storage
          .from('tracks')
          .createSignedUrl(file.storage_path, 86400); // 24 hour links

        if (urlData?.signedUrl) {
          trackFiles.push({
            name: file.file_name,
            url: urlData.signedUrl,
            versionType: file.version_type,
          });
        }
      }
    }

    // Update download count
    await supabase.from('tracks')
      .update({ download_count: (track.download_count || 0) + 1 })
      .eq('id', track.id);

    // Log activity
    await supabase.from('activity_log').insert({
      type: 'download',
      text: `'${track.title}' downloaded via cart by ${userName}`,
      track_id: track.id,
      user_id: user.id,
    });

    trackResults.push({
      title: track.title,
      artist: track.artist,
      genre: track.genre,
      bpm: track.bpm,
      energy: track.energy,
      mood: track.mood,
      vocal: track.vocal,
      writers: track.writers,
      producers: track.producers,
      key: track.key,
      files: trackFiles,
    });
  }

  // Build email HTML
  const emailHtml = buildEmailHtml(trackResults, userName);

  // Send email
  let emailSent = false;
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Sync World <noreply@resend.dev>',
        to: userEmail,
        subject: `Your Sync World Selection - ${tracks.length} Track${tracks.length !== 1 ? 's' : ''}`,
        html: emailHtml,
      });
      emailSent = true;
    } catch (err) {
      console.error('[Checkout] Email send error:', err);
    }
  } else {
    console.warn('[Checkout] No RESEND_API_KEY set, skipping email');
  }

  return NextResponse.json({
    success: true,
    emailSent,
    trackCount: trackResults.length,
    tracks: trackResults,
  });
}

function buildEmailHtml(
  tracks: {
    title: string;
    artist: string;
    genre: string;
    bpm: number | null;
    energy: string;
    mood: string | null;
    vocal: string;
    writers: string | null;
    producers: string | null;
    key: string | null;
    files: { name: string; url: string; versionType: string }[];
  }[],
  userName: string,
): string {
  const trackRows = tracks.map(t => {
    const fileLinks = t.files.length > 0
      ? t.files.map(f =>
        `<a href="${f.url}" style="display:inline-block;margin:4px 4px 0 0;padding:6px 14px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;">${f.versionType.charAt(0).toUpperCase() + f.versionType.slice(1)}</a>`
      ).join('')
      : '<span style="color:#999;font-size:12px;">No files available</span>';

    const info = [
      t.genre ? `Genre: ${t.genre}` : null,
      t.bpm ? `BPM: ${t.bpm}` : null,
      t.key ? `Key: ${t.key}` : null,
      t.energy ? `Energy: ${t.energy}` : null,
      t.mood ? `Mood: ${t.mood}` : null,
      t.vocal ? `Vocal: ${t.vocal}` : null,
      t.writers ? `Writers: ${t.writers}` : null,
      t.producers ? `Producers: ${t.producers}` : null,
    ].filter(Boolean).join(' &bull; ');

    return `
      <div style="padding:20px 0;border-bottom:1px solid #eee;">
        <div style="font-size:16px;font-weight:700;color:#111;">${t.title}</div>
        <div style="font-size:13px;color:#666;margin:4px 0 8px;">
          ${t.artist}${t.writers ? ` &bull; Writers: ${t.writers}` : ''}${t.producers ? ` &bull; Producers: ${t.producers}` : ''}
        </div>
        <div style="font-size:11px;color:#888;line-height:1.6;margin-bottom:10px;">${info}</div>
        <div>${fileLinks}</div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
      <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:32px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#fff;letter-spacing:-0.5px;">Sync World</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">Music Sync Licensing Portal</div>
          </div>

          <!-- Body -->
          <div style="padding:32px;">
            <div style="font-size:16px;color:#111;margin-bottom:4px;">Hi ${userName},</div>
            <div style="font-size:14px;color:#666;margin-bottom:24px;line-height:1.5;">
              Here are your selected tracks with download links and song information.
              <strong>Download links expire in 24 hours.</strong>
            </div>

            <div style="font-size:12px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
              ${tracks.length} Track${tracks.length !== 1 ? 's' : ''} Selected
            </div>

            ${trackRows}
          </div>

          <!-- Footer -->
          <div style="padding:24px 32px;background:#fafafa;border-top:1px solid #eee;text-align:center;">
            <div style="font-size:11px;color:#999;line-height:1.5;">
              This email was sent from Sync World. Download links expire in 24 hours.<br>
              For questions, contact your Sync World admin.
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
