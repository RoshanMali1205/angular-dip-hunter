/**
 * Generate PWA icons for Dip Hunter app.
 * Run: node generate-icons.js
 * Requires: npm install sharp
 */
const sharp = require('sharp');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outputDir = path.join(__dirname, 'public', 'icons');

// Dip Hunter icon — dark slate bg, emerald green stock chart dip with crosshair target
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="50%" stop-color="#ef4444"/>
      <stop offset="70%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#10b981" flood-opacity="0.4"/>
    </filter>
    <filter id="targetGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background rounded rect (maskable safe zone friendly) -->
  <rect width="512" height="512" rx="96" ry="96" fill="url(#bg)"/>
  
  <!-- Subtle grid lines -->
  <g stroke="#1e293b" stroke-width="1" opacity="0.5">
    <line x1="80" y1="140" x2="432" y2="140"/>
    <line x1="80" y1="210" x2="432" y2="210"/>
    <line x1="80" y1="280" x2="432" y2="280"/>
    <line x1="80" y1="350" x2="432" y2="350"/>
  </g>
  
  <!-- Glow area under chart line -->
  <path d="M80,220 L155,195 L220,210 L280,310 L320,340 L355,290 L432,180 L432,380 L80,380 Z" 
        fill="url(#glow)" opacity="0.5"/>
  
  <!-- Stock chart line showing a DIP -->
  <path d="M80,220 L155,195 L220,210 L280,310 L320,340 L355,290 L432,180" 
        fill="none" stroke="url(#line)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"
        filter="url(#shadow)"/>
  
  <!-- Crosshair / target on the dip point -->
  <g filter="url(#targetGlow)">
    <!-- Target circle -->
    <circle cx="320" cy="340" r="24" fill="none" stroke="#10b981" stroke-width="3" opacity="0.8"/>
    <circle cx="320" cy="340" r="14" fill="none" stroke="#10b981" stroke-width="2" opacity="0.6"/>
    <circle cx="320" cy="340" r="5" fill="#10b981"/>
    <!-- Crosshair lines -->
    <line x1="320" y1="308" x2="320" y2="328" stroke="#10b981" stroke-width="2" opacity="0.7"/>
    <line x1="320" y1="352" x2="320" y2="372" stroke="#10b981" stroke-width="2" opacity="0.7"/>
    <line x1="288" y1="340" x2="308" y2="340" stroke="#10b981" stroke-width="2" opacity="0.7"/>
    <line x1="332" y1="340" x2="352" y2="340" stroke="#10b981" stroke-width="2" opacity="0.7"/>
  </g>
  
  <!-- Small red dot at the lowest dip -->
  <circle cx="320" cy="340" r="6" fill="#ef4444" opacity="0.9"/>
  
  <!-- "DH" text label -->
  <text x="256" y="445" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" 
        font-size="56" font-weight="800" letter-spacing="6" fill="#e2e8f0" opacity="0.9">DH</text>
</svg>
`;

async function generateIcons() {
  console.log('Generating Dip Hunter PWA icons...');
  
  const svgBuffer = Buffer.from(svgIcon);
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  ✓ icon-${size}x${size}.png`);
  }
  
  console.log('\nDone! All icons generated in public/icons/');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
