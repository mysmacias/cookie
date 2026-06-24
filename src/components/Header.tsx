import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Menu, X, LogOut } from 'lucide-react';
import { Screen } from '../hooks/useNavigation';
import { useAuth } from '../context/AuthContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface HeaderProps {
  currentScreen: Screen;
  navigateTo: (screen: Screen, recipe?: import('../types').Recipe) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
}

function NavButton({
  label,
  screen,
  currentScreen,
  navigateTo,
  onNavigate,
  className = '',
}: {
  label: string;
  screen: Screen;
  currentScreen: Screen;
  navigateTo: (screen: Screen) => void;
  onNavigate?: () => void;
  className?: string;
}) {
  const active = currentScreen === screen;
  return (
    <button
      type="button"
      onClick={() => { navigateTo(screen); onNavigate?.(); }}
      aria-current={active ? 'page' : undefined}
      className={`${active ? 'text-primary font-bold' : 'hover:text-primary'} ${className}`}
    >
      {label}
    </button>
  );
}

export const Header: React.FC<HeaderProps> = ({ currentScreen, navigateTo, isMenuOpen, setIsMenuOpen }) => {
  const auth = useAuth();
  const reducedMotion = useReducedMotion();
  const menuTrapRef = useFocusTrap(isMenuOpen, () => setIsMenuOpen(false));

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 safe-area-top print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigateTo('library')}
            className="text-3xl font-headline font-bold italic tracking-[-0.06em] text-primary hover:opacity-70 transition-opacity"
          >
            COOKIE
          </button>

          <nav aria-label="Main" className="hidden md:flex items-center space-x-10 text-sm font-label uppercase tracking-widest">
            <NavButton label="The Library" screen="library" currentScreen={currentScreen} navigateTo={navigateTo} />
            <NavButton label="Graph" screen="graph" currentScreen={currentScreen} navigateTo={navigateTo} />
            <NavButton label="Cook plan" screen="cook-plan" currentScreen={currentScreen} navigateTo={navigateTo} />
            <NavButton label="Shopping" screen="shopping" currentScreen={currentScreen} navigateTo={navigateTo} />
            <NavButton label="Meal plan" screen="meal-plan" currentScreen={currentScreen} navigateTo={navigateTo} />
            <NavButton label="Collections" screen="collections" currentScreen={currentScreen} navigateTo={navigateTo} />
            <NavButton label="My books" screen="exports" currentScreen={currentScreen} navigateTo={navigateTo} />
            <NavButton label="About" screen="about" currentScreen={currentScreen} navigateTo={navigateTo} />
            {auth.user && (
              <button
                type="button"
                onClick={() => navigateTo('settings')}
                className="text-on-surface-variant normal-case tracking-normal font-body text-xs max-w-[140px] truncate hover:text-primary transition-colors"
                title={`${auth.user.name || auth.user.email} — Settings`}
              >
                {auth.user.name || auth.user.email}
              </button>
            )}
            {auth.isGuest && (
              <button
                type="button"
                onClick={() => navigateTo('settings')}
                className="text-on-surface-variant normal-case tracking-normal font-body text-xs hover:text-primary transition-colors"
                title="Guest — Settings"
              >
                Guest
              </button>
            )}
            <button type="button" onClick={() => navigateTo('add')} className="flex items-center space-x-2 bg-primary text-on-primary px-5 py-2.5 rounded-full hover:bg-primary-container transition-colors">
              <Plus size={16} />
              <span>Add Recipe</span>
            </button>
            <button
              type="button"
              onClick={() => (auth.isGuest ? auth.exitGuest() : void auth.logout())}
              className="flex items-center space-x-2 hover:text-secondary transition-colors"
              aria-label={auth.isGuest ? 'Exit guest' : 'Sign out'}
            >
              <LogOut size={16} />
            </button>
          </nav>

          <button
            type="button"
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            id="mobile-menu"
            ref={menuTrapRef}
            initial={reducedMotion ? false : { opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-surface pt-24 px-6 md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <nav aria-label="Main" className="flex flex-col space-y-8 text-2xl font-headline italic">
              <NavButton label="The Library" screen="library" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
              <NavButton label="Graph" screen="graph" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
              <NavButton label="Cook plan" screen="cook-plan" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
              <NavButton label="Shopping list" screen="shopping" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
              <NavButton label="Meal plan" screen="meal-plan" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
              <NavButton label="Collections" screen="collections" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
              <NavButton label="Settings" screen="settings" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
              <NavButton label="Privacy" screen="privacy" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
              <NavButton label="My books" screen="exports" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
              <NavButton label="About" screen="about" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
              <NavButton label="Add Recipe" screen="add" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
              {auth.user && (
                <button
                  type="button"
                  onClick={() => { navigateTo('settings'); closeMenu(); }}
                  className="text-base not-italic font-body text-on-surface-variant pt-4 border-t border-outline-variant/30 text-left hover:text-primary w-full"
                >
                  Signed in as {auth.user.name || auth.user.email}
                </button>
              )}
              {auth.isGuest && (
                <button
                  type="button"
                  onClick={() => { navigateTo('settings'); closeMenu(); }}
                  className="text-base not-italic font-body text-on-surface-variant pt-4 border-t border-outline-variant/30 text-left hover:text-primary w-full"
                >
                  Browsing as guest
                </button>
              )}
              <button
                type="button"
                onClick={() => { if (auth.isGuest) { auth.exitGuest(); } else { void auth.logout(); } closeMenu(); }}
                className="text-left text-secondary hover:opacity-80 flex items-center gap-3"
              >
                <LogOut size={22} />
                {auth.isGuest ? 'Exit guest' : 'Sign out'}
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
