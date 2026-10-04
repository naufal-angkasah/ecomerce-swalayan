'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';

interface ScrollToTopProps {
  className?: string;
  threshold?: number;
}

export function ScrollToTop({ className = '', threshold = 250 }: ScrollToTopProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [threshold]);

  const scrollToTop = () => {
    const startPosition = window.pageYOffset || document.documentElement.scrollTop;
    if (startPosition <= 0) return;

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }

    // Dynamic duration (500ms to 750ms) for an elegant, visible, gentle gliding motion
    const duration = Math.min(750, Math.max(500, Math.abs(startPosition) * 0.28));
    let startTime: number | null = null;

    // Cubic easeInOut: smooth acceleration from rest and gentle deceleration into the top
    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animateScroll = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeInOutCubic(progress);

      window.scrollTo(0, Math.round(startPosition * (1 - ease)));

      if (elapsed < duration) {
        animationFrameId.current = requestAnimationFrame(animateScroll);
      } else {
        window.scrollTo(0, 0);
        animationFrameId.current = null;
      }
    };

    animationFrameId.current = requestAnimationFrame(animateScroll);
  };

  if (!isVisible) return null;

  const isAdmin = pathname?.startsWith('/admin');
  const positionClass = isAdmin
    ? 'bottom-6 right-6'
    : 'bottom-20 right-4 sm:bottom-6 sm:right-6';

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll ke paling atas"
      title="Kembali ke paling atas"
      className={`fixed z-40 p-3 sm:p-3.5 rounded-full bg-[#E5391B] hover:bg-[#C62818] active:bg-[#B71C1C] text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 transition-all duration-200 cursor-pointer flex items-center justify-center group focus:outline-none focus:ring-4 focus:ring-red-400/40 animate-in fade-in zoom-in-90 print:hidden ${positionClass} ${className}`}
    >
      <ArrowUp size={22} className="stroke-[2.5] group-hover:-translate-y-0.5 transition-transform" />
    </button>
  );
}
