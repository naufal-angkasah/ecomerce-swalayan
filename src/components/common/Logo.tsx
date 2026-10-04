'use client';

import React from 'react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'light';
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className = '', variant = 'full' }: LogoProps) {

  if (variant === 'compact') {
    return (
      <Link href="/" className={`inline-flex items-center gap-2 group ${className}`}>
        {/* Shopping Cart Icon Box with Red Signage and Yellow Accent */}
        <div className="relative w-10 h-10 bg-gradient-to-br from-[#E5391B] to-[#C62818] rounded-lg p-1.5 flex items-center justify-center border-2 border-[#FFC107] shadow-sm">
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            {/* Wheels */}
            <circle cx="14" cy="32" r="3.5" fill="#FFFFFF" />
            <circle cx="28" cy="32" r="3.5" fill="#FFFFFF" />
            {/* Cart body */}
            <path
              d="M 4 8 L 8 8 L 13 26 L 31 26 L 35 13 L 9 13"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Groceries silhouette */}
            <rect x="14" y="6" width="5" height="9" rx="1" fill="#FFC107" />
            <rect x="21" y="4" width="6" height="11" rx="1" fill="#FFFFFF" />
            <circle cx="29" cy="9" r="3" fill="#FF6D00" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-[#E5391B] tracking-tight leading-none text-base">
            ALVIN
          </span>
          <span className="text-[10px] text-[#222222] font-semibold tracking-wider">
            SWALAYAN
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 group select-none ${className}`}>
      {/* Signage Red Box with Glowing Yellow Accent Border */}
      <div className="relative bg-gradient-to-br from-[#E5391B] to-[#C62818] rounded-lg px-2.5 py-1.5 flex items-center gap-2 border-2 border-[#FFC107] shadow-sm group-hover:brightness-105 transition-all">
        {/* Shopping Cart Icon with groceries */}
        <div className="w-8 h-8 flex-shrink-0">
          <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
            <circle cx="14" cy="32" r="3.5" fill="#FFFFFF" />
            <circle cx="28" cy="32" r="3.5" fill="#FFFFFF" />
            <path
              d="M 4 8 L 8 8 L 13 26 L 31 26 L 35 13 L 9 13"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="14" y="6" width="5" height="9" rx="1" fill="#FFC107" />
            <rect x="21" y="4" width="6" height="11" rx="1" fill="#FFFFFF" />
            <circle cx="29" cy="9" r="3" fill="#FF6D00" />
          </svg>
        </div>

        {/* Text Details */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-black text-white text-lg tracking-tight">ALVIN</span>
            <span className="font-extrabold text-[#FFC107] text-lg tracking-tight">SWALAYAN</span>
          </div>
          <div className="flex items-center justify-between text-[9px] text-white/90 font-medium tracking-wider mt-0.5">
            <span>HEMAT &amp; BERKUALITAS</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
