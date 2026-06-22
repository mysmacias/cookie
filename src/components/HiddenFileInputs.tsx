import React from 'react';

interface HiddenFileInputsProps {
  galleryRef: React.RefObject<HTMLInputElement | null>;
  cameraRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const HiddenFileInputs: React.FC<HiddenFileInputsProps> = ({
  galleryRef,
  cameraRef,
  onChange,
}) => (
  <>
    <input
      ref={galleryRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={onChange}
    />
    <input
      ref={cameraRef}
      type="file"
      accept="image/*"
      capture="environment"
      className="hidden"
      onChange={onChange}
    />
  </>
);
