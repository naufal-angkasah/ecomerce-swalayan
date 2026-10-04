'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountAddressesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile');
  }, [router]);

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center text-xs text-gray-500">
      <div className="w-8 h-8 border-2 border-[#E5391B] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p>Mengarahkan ke halaman Profil &amp; Alamat...</p>
    </div>
  );
}
