import React from 'react';
import { Screen } from '../hooks/useNavigation';

interface FooterProps {
  navigateTo: (screen: Screen) => void;
}

const FooterLink: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="hover:text-primary transition-colors">
    {children}
  </button>
);

export const Footer: React.FC<FooterProps> = ({ navigateTo }) => {
  return (
    <footer className="border-t border-outline-variant/30 py-20 bg-surface-container-low safe-area-bottom">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="space-y-6">
          <h3 className="text-2xl font-headline italic">COOKIE</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Elevating the art of home cooking through beautiful design and thoughtful technology.
          </p>
        </div>
        <div>
          <h4 className="text-xs font-label uppercase tracking-widest mb-6 opacity-50">Explore</h4>
          <ul className="space-y-4 text-sm">
            <li><FooterLink onClick={() => navigateTo('library')}>Library</FooterLink></li>
            <li><FooterLink onClick={() => navigateTo('discover')}>Discover</FooterLink></li>
            <li><FooterLink onClick={() => navigateTo('meal-plan')}>Meal plan</FooterLink></li>
            <li><FooterLink onClick={() => navigateTo('shopping')}>Shopping list</FooterLink></li>
            <li><FooterLink onClick={() => navigateTo('collections')}>Collections</FooterLink></li>
            <li><FooterLink onClick={() => navigateTo('exports')}>My books</FooterLink></li>
            <li><FooterLink onClick={() => navigateTo('about')}>Our Story</FooterLink></li>
            <li><FooterLink onClick={() => navigateTo('add')}>Submit Recipe</FooterLink></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-label uppercase tracking-widest mb-6 opacity-50">Legal</h4>
          <ul className="space-y-4 text-sm">
            <li><FooterLink onClick={() => navigateTo('privacy')}>Privacy</FooterLink></li>
          </ul>
        </div>
      </div>
    </footer>
  );
};
