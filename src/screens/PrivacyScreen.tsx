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
        <p className="text-on-surface-variant text-lg italic">Last updated: March 2026</p>
      </div>

      <div className="space-y-8 text-on-surface-variant leading-relaxed text-lg">
        <section className="space-y-4">
          <h2 className="text-3xl font-headline italic text-on-surface">Information We Collect</h2>
          <p>
            Cookie is designed with your privacy in mind. The app stores your recipe data, bookmarks, 
            and preferences locally on your device. We do not collect, transmit, or store any personal 
            information on external servers.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-headline italic text-on-surface">Local Storage</h2>
          <p>
            All data you create within Cookie — including custom recipes and bookmarks — is stored 
            exclusively on your device using local storage. This data is not accessible to us or any 
            third parties.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-headline italic text-on-surface">Third-Party Services</h2>
          <p>
            Cookie does not integrate with any third-party analytics, advertising, or tracking services. 
            Your cooking journey is entirely your own.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-headline italic text-on-surface">Images</h2>
          <p>
            Recipe images included with the app are bundled within the application. Any images you
            load or add to your recipes — hero photos and step photos — are stored only in your
            browser's local storage; they are not uploaded or shared. Your browser only accesses
            your camera or photo library when you explicitly choose to add or change an image.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-headline italic text-on-surface">Recipe Photo Scanning</h2>
          <p>
            The optional <em className="not-italic">Scan from photo</em> feature is the one exception:
            when you choose to scan a recipe, that single image is sent to our hosting provider
            (Cloudflare) and to Anthropic's Claude API to read the text and suggest recipe fields.
            The image is processed for that request only and is not used to train models or stored
            for any other purpose. If you don't use this feature, no images ever leave your device.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-headline italic text-on-surface">Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. Any changes will be reflected within 
            the app with an updated revision date.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-headline italic text-on-surface">Contact</h2>
          <p>
            If you have questions about this privacy policy, please reach out to us through the
            contact details on our website.
          </p>
        </section>
      </div>
    </ScreenShell>
  );
};
