import React from 'react';
import { motion } from 'motion/react';

export const AboutScreen: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-24 py-12"
    >
      <div className="space-y-8 text-center">
        <h1 className="text-7xl md:text-9xl font-headline italic leading-none">Our Story</h1>
        <p className="text-2xl text-on-surface-variant leading-relaxed font-light italic">
          "COOKIE is a gift to my wife who loves cooking and in return I eat the food I love with my love."
        </p>
      </div>

      <div className="aspect-video rounded-2xl overflow-hidden editorial-shadow bg-gradient-to-br from-primary/30 via-surface-container to-secondary/20 flex items-center justify-center">
        <p className="text-6xl md:text-8xl font-headline italic text-primary/40 select-none">COOKIE</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-4xl font-headline italic">The Digital Gastronome</h2>
        <p className="text-on-surface-variant leading-relaxed text-lg">
          COOKIE was born from a simple desire: to create a digital space that respects the tactile, sensory beauty of cooking. We believe that a recipe is more than just a set of instructions—it's a story, a memory, and a piece of art.
        </p>
        <p className="text-on-surface-variant leading-relaxed text-lg">
          Our platform is designed to be your companion in the kitchen, providing a seamless, beautiful experience from the first moment of inspiration to the final bite.
        </p>
      </div>
    </motion.div>
  );
};
