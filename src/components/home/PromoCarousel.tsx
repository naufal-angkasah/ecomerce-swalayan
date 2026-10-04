'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PromoBanner, BannerSettings } from '@/types';
import { bannerService, DEFAULT_BANNER_SETTINGS, INITIAL_BANNERS } from '@/services/bannerService';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export function PromoCarousel() {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [settings, setSettings] = useState<BannerSettings>(DEFAULT_BANNER_SETTINGS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Load banners and settings from service
  const loadData = useCallback(() => {
    const activeBanners = bannerService.getActive();
    setBanners(activeBanners.length > 0 ? activeBanners : INITIAL_BANNERS);
    setSettings(bannerService.getSettings());
  }, []);

  useEffect(() => {
    setIsClient(true);
    loadData();

    // Listen for storage events (if admin edits banners in another tab)
    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadData]);

  // Autoplay timer
  useEffect(() => {
    if (!settings.autoplay_enabled || isHovered || banners.length <= 1) return;

    const intervalMs = (settings.autoplay_duration || 4) * 1000;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [settings.autoplay_enabled, settings.autoplay_duration, isHovered, banners.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  // Touch swipe support
  const minSwipeDistance = 40;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  if (!isClient || banners.length === 0) {
    return (
      <div className="w-full aspect-[16/8] sm:aspect-[21/9] md:aspect-[2.8/1] max-h-[190px] sm:max-h-[240px] md:max-h-[300px] bg-gray-100 animate-pulse rounded-2xl my-3" />
    );
  }

  return (
    <section
      className="relative my-3 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      aria-label="Promo Banner Carousel"
    >
      {/* Carousel Viewport */}
      <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-gray-100 shadow-xs bg-gray-50">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {banners.map((banner, idx) => (
            <div
              key={banner.id || idx}
              className="w-full flex-shrink-0 relative aspect-[16/8] sm:aspect-[21/9] md:aspect-[2.8/1] max-h-[190px] sm:max-h-[240px] md:max-h-[300px] bg-gray-100 overflow-hidden"
            >
              <Link href={banner.target_url || '/catalog'} className="block w-full h-full relative">
                {/* Banner Image */}
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  className="w-full h-full object-cover object-center select-none transition-transform duration-700 hover:scale-102"
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />

                {/* Gradient Overlay for Title Legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-3 sm:p-5 text-white">
                  {banner.badge_text && (
                    <span className="inline-flex items-center gap-1 bg-[#E5391B] text-white text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full w-max shadow-sm uppercase tracking-wider mb-1 border border-white/20">
                      <Sparkles size={11} />
                      {banner.badge_text}
                    </span>
                  )}
                  <h3 className="text-xs sm:text-base md:text-lg font-black line-clamp-1 drop-shadow-md text-white">
                    {banner.title}
                  </h3>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows (visible on hover or focus) */}
      {banners.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-md flex items-center justify-center transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 z-10 cursor-pointer hover:scale-105 active:scale-95"
            aria-label="Banner sebelumnya"
          >
            <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-md flex items-center justify-center transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 z-10 cursor-pointer hover:scale-105 active:scale-95"
            aria-label="Banner berikutnya"
          >
            <ChevronRight size={20} className="sm:w-6 sm:h-6" />
          </button>
        </>
      )}

      {/* Pagination Indicator Dots (Alfagift / Indomaret style) */}
      {banners.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2.5">
          {banners.map((_, dotIdx) => (
            <button
              key={dotIdx}
              onClick={() => setCurrentIndex(dotIdx)}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                dotIdx === currentIndex
                  ? 'w-6 h-2 bg-[#E5391B]'
                  : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Pindah ke banner ${dotIdx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
