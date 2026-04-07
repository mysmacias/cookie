import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Clock, Flame, Heart, ArrowRight, UtensilsCrossed, ImagePlus, Check } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Recipe } from '../types';
import { updateRecipe } from '../services/recipeStore';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

interface RecipeCardProps {
  recipe: Recipe;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onRecipeImageChanged: () => void;
  onClick: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onSelectToggle?: () => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  isBookmarked,
  onToggleBookmark,
  onRecipeImageChanged,
  onClick,
  selectionMode = false,
  selected = false,
  onSelectToggle,
}) => {
  const [imageMenuOpen, setImageMenuOpen] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const applyHeroImage = (dataUrl: string) => {
    const next = dataUrl.trim();
    if (!next) return;
    updateRecipe({ ...recipe, image: next });
    onRecipeImageChanged();
    setImageMenuOpen(false);
  };

  const pickFromNativeLibrary = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 88,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });
      if (photo.dataUrl) applyHeroImage(photo.dataUrl);
    } catch {
      /* user cancelled or unavailable */
    }
  };

  const pickFromNativeCamera = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 88,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      if (photo.dataUrl) applyHeroImage(photo.dataUrl);
    } catch {
      /* user cancelled or unavailable */
    }
  };

  const onGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    applyHeroImage(await readFileAsDataUrl(file));
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group space-y-6 ${selectionMode ? 'cursor-pointer ring-2 ring-offset-2 ring-offset-surface rounded-xl' : 'cursor-pointer'} ${selectionMode && selected ? 'ring-primary' : selectionMode ? 'ring-outline-variant/40' : ''}`}
      onClick={() => {
        if (selectionMode) onSelectToggle?.();
        else onClick();
      }}
      role={selectionMode ? 'checkbox' : undefined}
      aria-checked={selectionMode ? selected : undefined}
    >
      <div className="aspect-[4/5] overflow-hidden rounded-xl bg-surface-container relative">
        {recipe.image ? (
          <img 
            src={recipe.image} 
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-container-high">
            <UtensilsCrossed size={48} className="text-outline-variant" />
          </div>
        )}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onGalleryFile}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onGalleryFile}
        />

        <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 max-w-[min(100%,calc(100%-5.5rem))] pr-1">
          <span className="bg-surface/65 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-label uppercase tracking-widest border border-outline-variant/20">
            {recipe.category}
          </span>
          <div className="relative">
            <button
              type="button"
              aria-expanded={imageMenuOpen}
              aria-haspopup="true"
              aria-label="Change card photo"
              onClick={(e) => {
                e.stopPropagation();
                setImageMenuOpen((o) => !o);
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface/65 text-primary shadow-md backdrop-blur-md transition-colors hover:bg-surface/80 border border-outline-variant/20"
            >
              <ImagePlus size={14} strokeWidth={2.25} />
            </button>
            {imageMenuOpen ? (
              <div
                role="menu"
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-1 min-w-[168px] rounded-xl border border-outline-variant/40 bg-surface py-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full px-3 py-2.5 text-left text-[10px] font-label uppercase tracking-widest hover:bg-surface-container transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageMenuOpen(false);
                    if (Capacitor.isNativePlatform()) {
                      void pickFromNativeLibrary();
                    } else {
                      galleryInputRef.current?.click();
                    }
                  }}
                >
                  Photo library
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full px-3 py-2.5 text-left text-[10px] font-label uppercase tracking-widest hover:bg-surface-container transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageMenuOpen(false);
                    if (Capacitor.isNativePlatform()) {
                      void pickFromNativeCamera();
                    } else {
                      cameraInputRef.current?.click();
                    }
                  }}
                >
                  Take photo
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          aria-label={isBookmarked ? 'Remove from saved recipes' : 'Save recipe'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark();
          }}
          className={`absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full shadow-md backdrop-blur-md transition-colors ${
            isBookmarked
              ? 'bg-secondary/75 text-on-primary hover:bg-secondary/85'
              : 'bg-surface/65 text-primary hover:bg-surface/80'
          }`}
        >
          <Heart size={16} fill={isBookmarked ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>
        {recipe.isHeirloom && (
          <div className="absolute bottom-4 left-4 z-10">
            <span className="bg-secondary/95 text-on-primary backdrop-blur px-2.5 py-1 rounded-full text-[9px] font-label uppercase tracking-widest">
              Heirloom
            </span>
          </div>
        )}
        {selectionMode ? (
          <div
            className={`absolute bottom-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-md ${
              selected ? 'bg-primary border-primary text-on-primary' : 'bg-surface/80 border-outline-variant text-on-surface-variant'
            }`}
            aria-hidden
          >
            {selected ? <Check size={18} strokeWidth={3} /> : null}
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-headline italic leading-tight group-hover:text-primary transition-colors">
            {recipe.title}
          </h3>
          <ArrowRight className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" size={20} />
        </div>
        <div className="flex items-center space-x-4 text-xs font-label uppercase tracking-widest text-on-surface-variant">
          <span className="flex items-center space-x-1">
            <Clock size={12} />
            <span>{recipe.time}</span>
          </span>
          <span className="flex items-center space-x-1">
            <Flame size={12} />
            <span>{recipe.difficulty}</span>
          </span>
        </div>
        {recipe.tags && recipe.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {recipe.tags.slice(0, 4).map((t, i) => (
              <span
                key={`${t}-${i}`}
                className="text-[9px] font-label uppercase tracking-wider text-primary/80 bg-primary/8 px-2 py-0.5 rounded-full"
              >
                {t}
              </span>
            ))}
            {recipe.tags.length > 4 ? (
              <span className="text-[9px] font-label uppercase tracking-wider text-on-surface-variant">
                +{recipe.tags.length - 4}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};
