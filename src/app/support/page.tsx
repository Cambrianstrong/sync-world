export const metadata = {
  title: 'Support — RFLCT',
  description: 'RFLCT help and support',
};

export default function SupportPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Support</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>We&apos;re here to help. Get in touch below.</p>

      <div style={{ padding: 24, border: '1px solid #e0e0e8', borderRadius: 12, marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginTop: 0, marginBottom: 12 }}>Contact</h2>
        <p style={{ marginBottom: 4 }}><strong>Email:</strong> <a href="mailto:cambrian@drumatized.com">cambrian@drumatized.com</a></p>
        <p style={{ margin: 0, color: '#666', fontSize: 14 }}>We typically respond within 24 hours on business days.</p>
      </div>

      <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 16 }}>Frequently Asked Questions</h2>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 6 }}>How do I upload music?</h3>
        <p style={{ margin: 0, color: '#444' }}>
          Go to Submit Music, drag and drop your audio files (WAV, AIFF, MP3, M4A, FLAC, OGG supported),
          fill in shared metadata for the batch, then review and submit. You can upload multiple tracks at once.
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 6 }}>What file formats are supported?</h3>
        <p style={{ margin: 0, color: '#444' }}>
          WAV, AIFF, MP3, M4A, FLAC, and OGG. We recommend uploading WAV or AIFF for the best quality.
          You can submit mains, cleans, instrumentals, and acapellas.
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 6 }}>How do I submit a music brief?</h3>
        <p style={{ margin: 0, color: '#444' }}>
          Navigate to Submit Music Brief from the menu. Fill out the project details, creative direction,
          and sound preferences. The more detail you provide, the better producers can match you with the right music.
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 6 }}>How do I download a track?</h3>
        <p style={{ margin: 0, color: '#444' }}>
          Browse the catalog, tap a track to preview it, add it to your cart, then proceed to checkout.
          Downloads will be available in your Downloads section after the track is Liked or Chosen.
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 6 }}>How does sync licensing work on RFLCT?</h3>
        <p style={{ margin: 0, color: '#444' }}>
          Tracks move through a pipeline: None → Liked → Chosen → Placed. When a supervisor finds a track
          they want to use, they mark it as Liked, then Chosen once a deal is in progress, and Placed once
          it&apos;s confirmed for use in their project.
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 6 }}>Can I edit or delete a track after uploading?</h3>
        <p style={{ margin: 0, color: '#444' }}>
          Yes. Go to your catalog in the Admin Dashboard (for admins) or your uploaded tracks list.
          You can edit metadata or delete tracks at any time.
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 6 }}>I forgot my password. How do I reset it?</h3>
        <p style={{ margin: 0, color: '#444' }}>
          On the login screen, tap &quot;Forgot password?&quot; and enter your email. We&apos;ll send you a
          reset link. If you don&apos;t receive it, check your spam folder or contact support.
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 6 }}>How do I delete my account?</h3>
        <p style={{ margin: 0, color: '#444' }}>
          Email us at cambrian@drumatized.com from your registered email address and request account
          deletion. We will delete your account and all associated data within 30 days.
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 6 }}>Is my music safe?</h3>
        <p style={{ margin: 0, color: '#444' }}>
          Yes. Your audio files are stored in encrypted cloud storage, and only you and authorized
          music supervisors can access them. We never sell or share your music without your consent.
        </p>
      </div>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 16 }}>Report an Issue</h2>
      <p style={{ color: '#444' }}>
        Found a bug or something not working as expected? Email us with:
      </p>
      <ul style={{ paddingLeft: 24, color: '#444' }}>
        <li>What you were trying to do</li>
        <li>What happened instead</li>
        <li>Your device and browser (if using web)</li>
        <li>Screenshots if possible</li>
      </ul>

      <p style={{ marginTop: 32, padding: 16, background: '#f5f5f8', borderRadius: 8, fontSize: 14, color: '#666' }}>
        RFLCT is a professional sync licensing platform. For business inquiries, partnership opportunities,
        or press, please email <a href="mailto:cambrian@drumatized.com">cambrian@drumatized.com</a>.
      </p>
    </div>
  );
}
