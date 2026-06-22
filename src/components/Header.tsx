import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Menu, X } from 'lucide-react';
import { Screen } from '../hooks/useNavigation';

interface HeaderProps {
  currentScreen: Screen;
  navigateTo: (screen: Screen) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentScreen, navigateTo, isMenuOpen, setIsMenuOpen }) => {
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isMenuOpen, setIsMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 safe-area-top">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button 
            onClick={() => navigateTo('library')}
            className="text-3xl font-headline font-bold italic tracking-[-0.06em] text-primary hover:opacity-70 transition-opacity"
          >
            COOKIE
          </button>
          
          <div className="hidden md:flex items-center space-x-10 text-sm font-label uppercase tracking-widest">
            <button onClick={() => navigateTo('library')} className={currentScreen === 'library' ? 'text-primary font-bold' : 'hover:text-primary'}>The Library</button>
            <button onClick={() => navigateTo('exports')} className={currentScreen === 'exports' ? 'text-primary font-bold' : 'hover:text-primary'}>My books</button>
            <button onClick={() => navigateTo('about')} className={currentScreen === 'about' ? 'text-primary font-bold' : 'hover:text-primary'}>About</button>
            <button onClick={() => navigateTo('add')} className="flex items-center space-x-2 bg-primary text-on-primary px-5 py-2.5 rounded-full hover:bg-primary-container transition-colors">
              <Plus size={16} />
              <span>Add Recipe</span>
            </button>
          </div>

          <button 
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
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-surface pt-24 px-6 md:hidden"
          >
            <nav className="flex flex-col space-y-8 text-2xl font-headline italic">
              <button
                type="button"
                onClick={() => navigateTo('library')}
                className={currentScreen === 'library' ? 'text-primary font-bold' : 'text-left hover:text-primary'}
              >
                The Library
              </button>
              <button
                type="button"
                onClick={() => navigateTo('exports')}
                className={currentScreen === 'exports' ? 'text-primary font-bold' : 'text-left hover:text-primary'}
              >
                My books
              </button>
              <button
                type="button"
                onClick={() => navigateTo('about')}
                className={currentScreen === 'about' ? 'text-primary font-bold' : 'text-left hover:text-primary'}
              >
                About
              </button>
              <button
                type="button"
                onClick={() => navigateTo('add')}
                className={currentScreen === 'add' ? 'text-primary font-bold' : 'text-left hover:text-primary'}
              >
                Add Recipe
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
