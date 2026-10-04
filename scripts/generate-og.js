const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E5391B" />
      <stop offset="50%" stop-color="#D32F2F" />
      <stop offset="100%" stop-color="#B71C1C" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F9FAFB" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="#000000" flood-opacity="0.28" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)" />

  <!-- Background Decorative Shapes -->
  <circle cx="100" cy="80" r="260" fill="#FFFFFF" opacity="0.05" />
  <circle cx="1120" cy="520" r="320" fill="#FFC107" opacity="0.08" />
  <circle cx="1080" cy="100" r="150" fill="#FFFFFF" opacity="0.04" />
  
  <!-- Central White Card -->
  <rect x="80" y="65" width="1040" height="500" rx="24" fill="url(#cardGrad)" filter="url(#shadow)" stroke="#FFC107" stroke-width="4" />

  <!-- Brand Logo Header in Card -->
  <g transform="translate(150, 110)">
    <!-- Shopping Cart Icon Badge -->
    <rect x="0" y="0" width="100" height="100" rx="22" fill="#E5391B" stroke="#FFC107" stroke-width="3" />
    <g transform="translate(15, 15)">
      <circle cx="24" cy="50" r="5" fill="#FFFFFF" />
      <circle cx="48" cy="50" r="5" fill="#FFFFFF" />
      <circle cx="24" cy="50" r="2.5" fill="#C62818" />
      <circle cx="48" cy="50" r="2.5" fill="#C62818" />
      <path d="M 4 12 L 12 12 L 20 42 L 54 42 L 62 20 L 16 20" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      <rect x="24" y="5" width="9" height="14" rx="2" fill="#FFC107" />
      <rect x="36" y="2" width="10" height="17" rx="2" fill="#FFFFFF" />
      <circle cx="50" cy="9" r="5" fill="#FF6D00" />
    </g>

    <!-- Brand Typography -->
    <text x="125" y="58" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="56" fill="#222222" letter-spacing="-1">ALVIN <tspan fill="#E5391B">SWALAYAN</tspan></text>
    <text x="128" y="88" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="20" fill="#FF6D00" letter-spacing="3">HEMAT &amp; BERKUALITAS</text>

    <!-- Location Pill -->
    <rect x="680" y="25" width="170" height="44" rx="22" fill="#FEF2F2" stroke="#E5391B" stroke-width="2" />
    <text x="765" y="52" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="16" fill="#E5391B" text-anchor="middle">BANDA ACEH</text>
  </g>

  <!-- Divider Line -->
  <line x1="150" y1="250" x2="1050" y2="250" stroke="#E5E7EB" stroke-width="2" />

  <!-- Catchy Headline & Description -->
  <text x="150" y="310" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="32" fill="#111827">
    Belanja Kebutuhan Harian &amp; Sembako Online
  </text>
  <text x="150" y="355" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="20" fill="#6B7280">
    Pesan beras, minyak goreng, kopi Aceh, susu &amp; bumbu dapur langsung diantar ke rumah Anda.
  </text>

  <!-- Feature Pills -->
  <g transform="translate(150, 400)">
    <!-- Pill 1 -->
    <rect x="0" y="0" width="280" height="52" rx="14" fill="#F0FDF4" stroke="#86EFAC" stroke-width="1.5" />
    <text x="140" y="33" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="16" fill="#166534" text-anchor="middle">Layanan Antar ke Rumah</text>

    <!-- Pill 2 -->
    <rect x="300" y="0" width="280" height="52" rx="14" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5" />
    <text x="440" y="33" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="16" fill="#92400E" text-anchor="middle">350+ Produk Terlengkap</text>

    <!-- Pill 3 -->
    <rect x="600" y="0" width="300" height="52" rx="14" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5" />
    <text x="750" y="33" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="16" fill="#1E40AF" text-anchor="middle">Harga Hemat &amp; Bergaransi</text>
  </g>

  <!-- Bottom Bar: URL & Open Everyday -->
  <g transform="translate(150, 495)">
    <text x="0" y="20" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="16" fill="#E5391B">
      alvin-swalayan.vercel.app
    </text>
    <text x="900" y="20" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="15" fill="#9CA3AF" text-anchor="end">
      Buka Setiap Hari: 07.30 - 22.30 WIB
    </text>
  </g>
</svg>
`;

async function generate() {
  const publicDir = path.join(__dirname, '..', 'public');
  const appDir = path.join(__dirname, '..', 'src', 'app');
  const faviconSvg = fs.readFileSync(path.join(publicDir, 'favicon.svg'));

  // 1. Generate og-image.png (512x512 square icon for crisp WhatsApp/social previews)
  await sharp(faviconSvg)
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'og-image.png'));
  console.log('Created public/og-image.png (512x512)');

  // 2. Also create app/opengraph-image.png (512x512) for Next.js automatic OG discovery
  await sharp(faviconSvg)
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(path.join(appDir, 'opengraph-image.png'));
  console.log('Created src/app/opengraph-image.png (512x512)');

  // 3. Create square 512x512 icon-512.png
  await sharp(faviconSvg)
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Created public/icon-512.png');
}

generate().catch(console.error);
