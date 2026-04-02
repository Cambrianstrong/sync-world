'use client';

import { useState } from 'react';
import { ENERGY_LEVELS, VOCAL_TYPES } from '@/lib/types';
import TopNav from '@/components/nav/TopNav';
import GenreTagInput from '@/components/ui/GenreTagInput';
import SubgenreInput from '@/components/ui/SubgenreInput';
import Notification, { useNotification } from '@/components/ui/Notification';
import { useAuth } from '@/hooks/useAuth';

export default function RequestPage() {
  const { profile, loading: authLoading } = useAuth();
  const { notif, notify } = useNotification();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    // Project / Campaign
    project: '',
    brand: '',
    campaign_type: '',
    deadline: '',
    // Creative Direction
    creative_themes: '',
    emotions: '',
    story_context: '',
    // Sound Direction
    genre: '',
    subgenre: '',
    genre_blends: '',
    energy: '',
    vocal: '',
    bpm_min: '',
    bpm_max: '',
    instrumentation: '',
    // References
    reference_tracks: '',
    reference_artists: '',
    // Additional
    description: '',
    contact_name: '',
    contact_email: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.project && !form.creative_themes && !form.genre && !form.description) {
      notify('Please fill in at least a project name, creative theme, or genre.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (!res.ok) {
        notify(`Error: ${json.error}`, 'error');
      } else {
        notify('Music brief submitted! The team has been notified.', 'success');
        setForm({
          project: '', brand: '', campaign_type: '', deadline: '',
          creative_themes: '', emotions: '', story_context: '',
          genre: '', subgenre: '', genre_blends: '', energy: '', vocal: '',
          bpm_min: '', bpm_max: '', instrumentation: '',
          reference_tracks: '', reference_artists: '',
          description: '', contact_name: '', contact_email: '',
        });
      }
    } catch (err) {
      notify('Failed to submit brief. Please try again.', 'error');
    }

    setSubmitting(false);
  }

  const update = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  const formGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase',
    letterSpacing: 0.3, fontWeight: 500,
  };
  const hintStyle: React.CSSProperties = {
    fontSize: 11, color: 'var(--dim)', marginTop: 2, fontStyle: 'italic',
  };

  const CAMPAIGN_TYPES = [
    'TV Commercial', 'Digital Ad', 'Film / Trailer', 'TV Show / Series',
    'Sports Campaign', 'Brand Anthem', 'Social Media', 'Podcast / Audio',
    'Event / Live', 'Gaming', 'Other',
  ];

  if (authLoading || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <p style={{ color: 'var(--dim)', fontSize: 14 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <TopNav role={profile?.role} userName={profile?.full_name} />
      <div className="page-container" style={{ maxWidth: 800 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          Submit Music Brief
        </h1>
        <p style={{ color: 'var(--dim)', fontSize: 14, marginBottom: 28 }}>
          Tell us exactly what you need. The more detail you provide about your project, creative direction, and sound preferences, the better we can match you with the right music.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Section 1: Project & Campaign */}
          <div style={{
            padding: 24, background: 'var(--surface-solid)', border: '1px solid var(--border)',
            borderRadius: 16, boxShadow: 'var(--shadow-sm)', marginBottom: 20,
          }}>
            <h2 style={{ fontSize: 15, marginBottom: 4 }}>Project & Campaign</h2>
            <p style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 16 }}>
              What is this music for?
            </p>
            <div className="grid-2col">
              <div style={formGroupStyle}>
                <label style={labelStyle}>Project / Campaign Name *</label>
                <input
                  value={form.project}
                  onChange={e => update('project', e.target.value)}
                  placeholder="e.g. Nike Summer 2026, FIFA World Cup Spot"
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Brand / Client</label>
                <input
                  value={form.brand}
                  onChange={e => update('brand', e.target.value)}
                  placeholder="e.g. Nike, Apple, Netflix"
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Campaign Type</label>
                <select value={form.campaign_type} onChange={e => update('campaign_type', e.target.value)}>
                  <option value="">Select type...</option>
                  {CAMPAIGN_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Deadline</label>
                <input
                  value={form.deadline}
                  onChange={e => update('deadline', e.target.value)}
                  type="date"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Creative Direction */}
          <div style={{
            padding: 24, background: 'var(--surface-solid)', border: '1px solid var(--border)',
            borderRadius: 16, boxShadow: 'var(--shadow-sm)', marginBottom: 20,
          }}>
            <h2 style={{ fontSize: 15, marginBottom: 4 }}>Creative Direction & Themes</h2>
            <p style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 16 }}>
              Describe the story, emotion, and creative vision.
            </p>
            <div className="grid-2col">
              <div style={{ ...formGroupStyle, gridColumn: 'span 2' }}>
                <label style={labelStyle}>Key Creative Themes</label>
                <textarea
                  value={form.creative_themes}
                  onChange={e => update('creative_themes', e.target.value)}
                  rows={3}
                  placeholder="e.g. Sports-driven themes tied to FIFA World Cup. Emphasis on movement, momentum, and storytelling across multiple chapters."
                />
                <div style={hintStyle}>What is the visual/narrative direction? What moments does the music need to support?</div>
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Core Emotions</label>
                <input
                  value={form.emotions}
                  onChange={e => update('emotions', e.target.value)}
                  placeholder="e.g. Determination, grit, energy, confidence"
                />
                <div style={hintStyle}>What should the audience feel?</div>
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Story Context</label>
                <input
                  value={form.story_context}
                  onChange={e => update('story_context', e.target.value)}
                  placeholder="e.g. Journey-focused, 'this is my moment'"
                />
                <div style={hintStyle}>The arc or narrative the music supports</div>
              </div>
            </div>
          </div>

          {/* Section 3: Music Direction & Sound */}
          <div style={{
            padding: 24, background: 'var(--surface-solid)', border: '1px solid var(--border)',
            borderRadius: 16, boxShadow: 'var(--shadow-sm)', marginBottom: 20,
          }}>
            <h2 style={{ fontSize: 15, marginBottom: 4 }}>Music Direction & Sound</h2>
            <p style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 16 }}>
              Describe the sound, genre, and musical qualities you need.
            </p>
            <div className="grid-2col">
              <div style={{ ...formGroupStyle, gridColumn: 'span 2' }}>
                <label style={labelStyle}>Genre(s)</label>
                <GenreTagInput
                  value={form.genre}
                  onChange={v => update('genre', v)}
                  placeholder="Select primary genres..."
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Sub-Genre / Style</label>
                <SubgenreInput
                  value={form.subgenre}
                  onChange={v => update('subgenre', v)}
                  placeholder="e.g. Trap, Neo-Soul, Drill"
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Genre Blends / Crossovers</label>
                <input
                  value={form.genre_blends}
                  onChange={e => update('genre_blends', e.target.value)}
                  placeholder="e.g. Hip-hop / country crossover, Latin-inspired fusion"
                />
                <div style={hintStyle}>Any cross-genre or fusion interests</div>
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Energy Level</label>
                <select value={form.energy} onChange={e => update('energy', e.target.value)}>
                  <option value="">Any Energy</option>
                  {ENERGY_LEVELS.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Vocal Type</label>
                <select value={form.vocal} onChange={e => update('vocal', e.target.value)}>
                  <option value="">Any Vocal</option>
                  {VOCAL_TYPES.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>BPM Range</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input value={form.bpm_min} onChange={e => update('bpm_min', e.target.value)} type="number" min="40" max="220" placeholder="Min" style={{ flex: 1 }} />
                  <span style={{ color: 'var(--dim)', fontSize: 12 }}>to</span>
                  <input value={form.bpm_max} onChange={e => update('bpm_max', e.target.value)} type="number" min="40" max="220" placeholder="Max" style={{ flex: 1 }} />
                </div>
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Instrumentation Notes</label>
                <input
                  value={form.instrumentation}
                  onChange={e => update('instrumentation', e.target.value)}
                  placeholder="e.g. Strings + strong beat, orchestral elements"
                />
                <div style={hintStyle}>Specific instruments or production style</div>
              </div>
            </div>
          </div>

          {/* Section 4: References */}
          <div style={{
            padding: 24, background: 'var(--surface-solid)', border: '1px solid var(--border)',
            borderRadius: 16, boxShadow: 'var(--shadow-sm)', marginBottom: 20,
          }}>
            <h2 style={{ fontSize: 15, marginBottom: 4 }}>Reference Tracks & Artists</h2>
            <p style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 16 }}>
              Help us understand the sound by pointing to existing music.
            </p>
            <div className="grid-2col">
              <div style={{ ...formGroupStyle, gridColumn: 'span 2' }}>
                <label style={labelStyle}>Reference Tracks</label>
                <textarea
                  value={form.reference_tracks}
                  onChange={e => update('reference_tracks', e.target.value)}
                  rows={2}
                  placeholder="e.g. Drake - 'God's Plan', Kendrick Lamar - 'HUMBLE.', or Spotify/YouTube links"
                />
                <div style={hintStyle}>Specific songs that capture the vibe you want</div>
              </div>
              <div style={{ ...formGroupStyle, gridColumn: 'span 2' }}>
                <label style={labelStyle}>Reference Artists / Sounds</label>
                <input
                  value={form.reference_artists}
                  onChange={e => update('reference_artists', e.target.value)}
                  placeholder="e.g. Billie Eilish vibe, Felipe Hess, Anderson .Paak energy"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Additional Notes & Contact */}
          <div style={{
            padding: 24, background: 'var(--surface-solid)', border: '1px solid var(--border)',
            borderRadius: 16, boxShadow: 'var(--shadow-sm)', marginBottom: 20,
          }}>
            <h2 style={{ fontSize: 15, marginBottom: 4 }}>Additional Details</h2>
            <p style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 16 }}>
              Anything else we should know, plus contact info for follow-up.
            </p>
            <div className="grid-2col">
              <div style={{ ...formGroupStyle, gridColumn: 'span 2' }}>
                <label style={labelStyle}>Additional Notes / Opportunities</label>
                <textarea
                  value={form.description}
                  onChange={e => update('description', e.target.value)}
                  rows={4}
                  placeholder="Any other context — what makes this brief unique, specific requirements, track quantity needed, cleared vs. unreleased preferences, etc."
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Contact Name</label>
                <input
                  value={form.contact_name}
                  onChange={e => update('contact_name', e.target.value)}
                  placeholder="Who should we follow up with?"
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Contact Email</label>
                <input
                  value={form.contact_email}
                  onChange={e => update('contact_email', e.target.value)}
                  type="email"
                  placeholder="Best email for follow-up"
                />
              </div>
            </div>
          </div>

          <button type="submit" disabled={submitting} style={{
            padding: '14px 32px', borderRadius: 12, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 600,
            cursor: submitting ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif",
            opacity: submitting ? 0.7 : 1,
          }}>
            {submitting ? 'Submitting...' : 'Submit Brief'}
          </button>
        </form>

        <Notification {...notif} />
      </div>
    </div>
  );
}
