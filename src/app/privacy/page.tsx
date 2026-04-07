export const metadata = {
  title: 'Privacy Policy — RFLCT',
  description: 'RFLCT privacy policy',
};

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Last updated: April 2, 2026</p>

      <h2 style={{ fontSize: 20, marginTop: 32, marginBottom: 12 }}>1. Introduction</h2>
      <p>
        RFLCT (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the RFLCT sync licensing platform (the &quot;Service&quot;).
        This page informs you of our policies regarding the collection, use, and disclosure of personal
        data when you use our Service and the choices you have associated with that data.
      </p>

      <h2 style={{ fontSize: 20, marginTop: 32, marginBottom: 12 }}>2. Information We Collect</h2>
      <p><strong>Account Information:</strong> When you sign up, we collect your email, name, company/label, phone number, location, and professional details you provide.</p>
      <p><strong>Content You Upload:</strong> Audio files, track metadata (title, artist, genre, tags), and music briefs you submit.</p>
      <p><strong>Usage Data:</strong> Information on how you interact with the Service, including tracks played, downloaded, and briefs viewed.</p>
      <p><strong>Device Information:</strong> Browser type, IP address, and device identifiers for security and analytics.</p>

      <h2 style={{ fontSize: 20, marginTop: 32, marginBottom: 12 }}>3. How We Use Your Information</h2>
      <ul style={{ paddingLeft: 24 }}>
        <li>To provide and maintain the Service</li>
        <li>To notify you about changes, briefs, and sync opportunities</li>
        <li>To process music submissions and licensing transactions</li>
        <li>To allow participation in interactive features</li>
        <li>To provide customer support</li>
        <li>To detect, prevent, and address technical issues</li>
      </ul>

      <h2 style={{ fontSize: 20, marginTop: 32, marginBottom: 12 }}>4. Data Storage and Security</h2>
      <p>
        Your data is stored securely on Supabase infrastructure with industry-standard encryption at rest
        and in transit. Audio files are stored in encrypted cloud storage. We implement appropriate technical
        and organizational measures to protect your personal data.
      </p>

      <h2 style={{ fontSize: 20, marginTop: 32, marginBottom: 12 }}>5. Data Sharing</h2>
      <p>We do not sell your personal information. We may share data with:</p>
      <ul style={{ paddingLeft: 24 }}>
        <li><strong>Music supervisors and brands</strong> who view tracks you upload to the catalog</li>
        <li><strong>Service providers</strong> (Supabase, Vercel) who host and maintain the Service</li>
        <li><strong>Legal authorities</strong> when required by law</li>
      </ul>

      <h2 style={{ fontSize: 20, marginTop: 32, marginBottom: 12 }}>6. Your Rights</h2>
      <p>You have the right to:</p>
      <ul style={{ paddingLeft: 24 }}>
        <li>Access the personal information we hold about you</li>
        <li>Request correction of inaccurate data</li>
        <li>Request deletion of your account and associated data</li>
        <li>Export your uploaded content</li>
        <li>Opt out of marketing communications</li>
      </ul>
      <p>To exercise these rights, contact us at cambrian@drumatized.com.</p>

      <h2 style={{ fontSize: 20, marginTop: 32, marginBottom: 12 }}>7. Children&apos;s Privacy</h2>
      <p>
        The Service is not intended for users under 13. We do not knowingly collect personal information
        from children under 13. If you become aware that a child has provided us with personal data,
        please contact us immediately.
      </p>

      <h2 style={{ fontSize: 20, marginTop: 32, marginBottom: 12 }}>8. Cookies</h2>
      <p>
        We use cookies and similar tracking technologies to maintain sessions and analyze usage.
        You can instruct your browser to refuse cookies, but some features may not function properly.
      </p>

      <h2 style={{ fontSize: 20, marginTop: 32, marginBottom: 12 }}>9. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of any changes by posting
        the new policy on this page and updating the &quot;Last updated&quot; date.
      </p>

      <h2 style={{ fontSize: 20, marginTop: 32, marginBottom: 12 }}>10. Contact Us</h2>
      <p>
        If you have questions about this Privacy Policy, please contact us at:<br />
        <strong>Email:</strong> cambrian@drumatized.com
      </p>
    </div>
  );
}
