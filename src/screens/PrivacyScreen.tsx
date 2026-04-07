import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { SwipeBackWrapper } from '../components/SwipeBackWrapper';

interface PrivacyScreenProps {
  onBack: () => void;
}

export const PrivacyScreen: React.FC<PrivacyScreenProps> = ({ onBack }) => {
  return (
    <SwipeBackWrapper onBack={onBack}>
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto space-y-12 py-12"
    >
      <button 
        onClick={onBack}
        className="flex items-center space-x-2 text-sm font-label uppercase tracking-widest hover:text-primary transition-colors"
      >
        <ChevronLeft size={16} />
        <span>Back</span>
      </button>

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
            load or add to your recipes are stored exclusively on your device and never leave your 
            phone — they are not uploaded, shared, or transmitted to any server. The app does not 
            access your camera or photo library unless you explicitly choose to add an image to a 
            recipe in the future.
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
            If you have questions about this privacy policy, please reach out to us through the App Store 
            listing.
          </p>
        </section>
      </div>
    </motion.div>
    </SwipeBackWrapper>
  );
};
