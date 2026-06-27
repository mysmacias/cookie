import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Menu, X, LogOut } from 'lucide-react';
import { Screen } from '../hooks/useNavigation';
import { useAuth } from '../context/AuthContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { CookieLogo } from './CookieLogo';

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
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="p-2 -ml-2 hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              aria-controls="side-menu"
              aria-label="Toggle menu"
            >
              <Menu />
            </button>
            <CookieLogo onClick={() => navigateTo('library')} reducedMotion={reducedMotion} />
          </div>

          <button
            type="button"
            onClick={() => navigateTo('add')}
            className="flex items-center space-x-2 bg-primary text-on-primary px-5 py-2.5 rounded-full hover:bg-primary-container transition-colors text-sm font-label uppercase tracking-widest"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Recipe</span>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            key="side-menu-overlay"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm print:hidden"
            onClick={closeMenu}
            aria-hidden="true"
          />
        )}
        {isMenuOpen && (
          <motion.aside
              key="side-menu"
              id="side-menu"
              ref={menuTrapRef}
              initial={reducedMotion ? false : { x: '-100%' }}
              animate={{ x: 0 }}
              exit={reducedMotion ? undefined : { x: '-100%' }}
              transition={reducedMotion ? undefined : { type: 'spring', stiffness: 360, damping: 38 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[85vw] bg-surface border-r border-outline-variant/30 flex flex-col safe-area-top print:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="flex items-center justify-between px-6 h-20 border-b border-outline-variant/30 shrink-0">
                <span className="text-2xl font-headline font-bold italic tracking-[-0.06em] text-primary">COOKIE</span>
                <button
                  type="button"
                  onClick={closeMenu}
                  className="p-2 -mr-2 hover:text-primary transition-colors"
                  aria-label="Close menu"
                >
                  <X />
                </button>
              </div>

              <nav aria-label="Main" className="flex-1 overflow-y-auto px-6 py-8 flex flex-col space-y-6 text-xl font-headline italic">
                <NavButton label="The Library" screen="library" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
                <NavButton label="Graph" screen="graph" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
                <NavButton label="Cook plan" screen="cook-plan" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
                <NavButton label="Shopping list" screen="shopping" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
                <NavButton label="Meal plan" screen="meal-plan" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
                <NavButton label="Collections" screen="collections" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
                <NavButton label="My books" screen="exports" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
                <NavButton label="Settings" screen="settings" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
                <NavButton label="About" screen="about" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
                <NavButton label="Privacy" screen="privacy" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
                <NavButton label="Add Recipe" screen="add" currentScreen={currentScreen} navigateTo={navigateTo} onNavigate={closeMenu} className="text-left" />
              </nav>

              <div className="px-6 py-6 border-t border-outline-variant/30 shrink-0 safe-area-bottom">
                {auth.user && (
                  <button
                    type="button"
                    onClick={() => { navigateTo('settings'); closeMenu(); }}
                    className="block text-sm font-body text-on-surface-variant text-left hover:text-primary w-full mb-4 truncate"
                    title={`${auth.user.name || auth.user.email} — Settings`}
                  >
                    Signed in as {auth.user.name || auth.user.email}
                  </button>
                )}
                {auth.isGuest && (
                  <button
                    type="button"
                    onClick={() => { navigateTo('settings'); closeMenu(); }}
                    className="block text-sm font-body text-on-surface-variant text-left hover:text-primary w-full mb-4"
                  >
                    Browsing as guest
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { if (auth.isGuest) { auth.exitGuest(); } else { void auth.logout(); } closeMenu(); }}
                  className="text-left text-secondary hover:opacity-80 flex items-center gap-3 text-sm font-label uppercase tracking-widest"
                >
                  <LogOut size={18} />
                  {auth.isGuest ? 'Exit guest' : 'Sign out'}
                </button>
              </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};
