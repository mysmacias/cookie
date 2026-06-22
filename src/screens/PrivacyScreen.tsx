import React from 'react';
import { ScreenShell } from '../components/ui/ScreenShell';

interface PrivacyScreenProps {
  onBack: () => void;
}

export const PrivacyScreen: React.FC<PrivacyScreenProps> = ({ onBack }) => {
  return (
    <ScreenShell onBack={onBack} backLabel="Back" className="py-12">
      <div className="space-y-4">
        <h1 className="text-6xl font-headline italic">Privacy Policy</h1>
        <p className="text-on-surface-variant text-lg italic">Last updated: June 22, 2026</p>
      </div>

      <div className="space-y-8 text-on-surface-variant leading-relaxed text-lg">
        <section className="space-y-4">
          <h2 className="text-3xl font-headline italic text-on-surface">Summary</h2>
          <p>
            Cookie requires an account so your recipes, bookmarks, and edits stay with you across
            devices. We store that account data on our hosting provider (Cloudflare). We do not use
            analytics or advertising trackers. The optional <em className="not-italic">Scan from photo</em>{' '}
            feature sends a single image to Anthropic's Claude API, as described below.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-headline italic text-on-surface">Account Information</h2>
          <p>
            When you create an account, we collect your <strong className="font-semibold text-on-surface">email address</strong>{' '}
            and, if you provide one, your <strong className="font-semibold text-on-surface">name</strong>.
            If you sign in with Google or GitHub, we receive your email and display name from that
            provider. If you sign up with email and password, your password is hashed before storage —
            we never store it in plain text.
          </p>
          <p>
            We use a session cookie (<code className="text-sm bg-surface-container px-1.5 py-0.5 rounded">cookie_session</code>)
            to keep you signed in. It is HTTP-only and expires after 30 days of inactivity.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-headline italic text-on-surface">Recipe Data We Store</h2>
          <p>
            When you are signed in, the following is stored in our database and tied to your account:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Recipes you create, including text, ingredients, steps, and any images you attach</li>
            <li>Edits you make to bundled recipes</li>
            <li>Bookmarked recipe IDs</li>
          </ul>
          <p>
            Bundled recipes shipped with the app remain public app content; only your personal
            changes and additions are stored per account.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-headline italic text-on-surface">Data on Your Device</h2>
          <p>
            Some preferences (for example, library sort order and export settings) and generated
            PDF/Markdown exports may still be cached in your browser's local storage or IndexedDB
            for convenience. Recipe data you save while signed in is synced to your account on our
            servers.
          </p>
          <p>
            If you had recipes saved locally before creating an account, we offer a one-time import
            into your account on first sign-in, then remove that local copy.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-headline italic text-on-surface">Recipe Photo Scanning</h2>
          <p>
            The optional <em className="not-italic">Scan from photo</em> feature requires you to be
            signed in. When you use it, the single image you select is sent to Cloudflare Pages
            Functions and to Anthropic's Claude API to read the text and suggest recipe fields.
            The image is processed for that request only and is not used to train models or stored
            for any other purpose.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-headline italic text-on-surface">Third-Party Services</h2>
          <p>We use the following third parties to operate Cookie:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong className="font-semibold text-on-surface">Cloudflare</strong> — hosting, serverless functions, and database (D1)</li>
            <li><strong className="font-semibold text-on-surface">Anthropic</strong> — Claude API for the optional photo-scan feature</li>
            <li><strong className="font-semibold text-on-surface">Google</strong> — optional OAuth sign-in (only if you choose it)</li>
            <li><strong className="font-semibold text-on-surface">GitHub</strong> — optional OAuth sign-in (only if you choose it)</li>
          </ul>
          <p>
            We do not integrate third-party analytics or advertising networks. Each provider's
            handling of data is governed by their own privacy policies.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-headline italic text-on-surface">Your Choices</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong className="font-semibold text-on-surface">Sign out</strong> — ends your session on the current device</li>
            <li><strong className="font-semibold text-on-surface">Account deletion</strong> — contact us to request deletion of your account and associated recipe data</li>
            <li><strong className="font-semibold text-on-surface">Local cache</strong> — clearing your browser's site data removes on-device preferences and exports</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-headline italic text-on-surface">Children's Privacy</h2>
          <p>
            Cookie is not directed at children under 13. We do not knowingly collect personal
            information from children. If you believe we have inadvertently received such
            information, please contact us.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-headline italic text-on-surface">Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. Any changes will be reflected
            within the app with an updated revision date.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-headline italic text-on-surface">Contact</h2>
          <p>
            If you have questions about this privacy policy or want to request account deletion,
            please reach out to us through the contact details on our website.
          </p>
        </section>
      </div>
    </ScreenShell>
  );
};
