import { useRef, useCallback } from 'react';
import { fileToDataUrl } from '../utils/fileHelpers';

/** Phones/tablets expose a real camera via <input capture>; gate the camera button on a coarse pointer. */
const supportsCamera =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

export function useImagePicker(onPick: (dataUrl: string) => void) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const dataUrl = await fileToDataUrl(file);
      onPick(dataUrl);
    },
    [onPick],
  );

  const openLibrary = useCallback(() => {
    galleryInputRef.current?.click();
  }, []);

  const openCamera = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  return {
    galleryInputRef,
    cameraInputRef,
    handleFileChange,
    openLibrary,
    openCamera,
    supportsCamera,
  };
}
