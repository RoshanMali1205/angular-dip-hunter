/**
 * Generate PWA icons for Dip Hunter app.
 * Run: node generate-icons.js
 * Requires: npm install sharp
 *
 * Also generates Independence Day variants (Tiranga strip along the bottom
 * of the Dip Hunter icon) under public/icons-india/, used until 15 Aug EOD IST.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');
const defaultIconsDir = path.join(__dirname, 'public', 'icons-default');
const indiaIconsDir = path.join(__dirname, 'public', 'icons-india');

// Dip Hunter icon — teal gradient bg, white upward trending arrow
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2dd4bf"/>
      <stop offset="100%" stop-color="#0d9488"/>
    </linearGradient>
  </defs>

  <!-- Background rounded rect -->
  <rect width="512" height="512" rx="96" ry="96" fill="url(#bg)"/>

  <!-- Clean upward trending arrow -->
  <path d="M135,340 L255,270 L370,155"
        fill="none" stroke="#ffffff" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Arrowhead -->
  <path d="M310,160 L370,155 L365,215"
        fill="none" stroke="#ffffff" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

const defaultFaviconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#06b6d4;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="64" height="64" rx="12" fill="url(#bgGradient)"/>
  <g opacity="0.15">
    <line x1="0" y1="16" x2="64" y2="16" stroke="#10b981" stroke-width="0.5"/>
    <line x1="0" y1="32" x2="64" y2="32" stroke="#10b981" stroke-width="0.5"/>
    <line x1="0" y1="48" x2="64" y2="48" stroke="#10b981" stroke-width="0.5"/>
    <line x1="16" y1="0" x2="16" y2="64" stroke="#10b981" stroke-width="0.5"/>
    <line x1="32" y1="0" x2="32" y2="64" stroke="#10b981" stroke-width="0.5"/>
    <line x1="48" y1="0" x2="48" y2="64" stroke="#10b981" stroke-width="0.5"/>
  </g>
  <polyline
    points="8,48 16,36 24,40 32,24 40,32 48,20 56,28"
    fill="none"
    stroke="url(#chartGradient)"
    stroke-width="3"
    stroke-linecap="round"
    stroke-linejoin="round"
    filter="url(#glow)"
  />
  <circle cx="32" cy="24" r="3" fill="#06b6d4" opacity="0.8"/>
  <circle cx="48" cy="20" r="2.5" fill="#10b981" opacity="0.6"/>
  <circle cx="16" cy="36" r="2" fill="#8b5cf6" opacity="0.7"/>
  <path d="M 52 12 L 56 16 L 52 16 Z" fill="#10b981" opacity="0.9"/>
</svg>
`;

/**
 * Same Dip Hunter mark with a Tiranga band along the bottom edge
 * (saffron / white / green + mini Ashoka Chakra).
 */
function buildIndependenceDayIconSvg() {
  const bandTop = 400;
  const bandH = 112;
  const stripe = bandH / 3;
  const cx = 256;
  const cy = bandTop + bandH / 2;
  const r = 18;

  const spokes = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * Math.PI) / 12;
    const x2 = cx + (r - 2) * Math.cos(angle);
    const y2 = cy + (r - 2) * Math.sin(angle);
    return `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#000080" stroke-width="1.6"/>`;
  }).join('');

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2dd4bf"/>
      <stop offset="100%" stop-color="#0d9488"/>
    </linearGradient>
    <clipPath id="round">
      <rect width="512" height="512" rx="96" ry="96"/>
    </clipPath>
  </defs>

  <g clip-path="url(#round)">
    <rect width="512" height="512" fill="url(#bg)"/>

    <!-- Arrow lifted slightly so it clears the flag band -->
    <path d="M135,300 L255,230 L370,115"
          fill="none" stroke="#ffffff" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M310,120 L370,115 L365,175"
          fill="none" stroke="#ffffff" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Tiranga strip along the bottom -->
    <rect x="0" y="${bandTop}" width="512" height="${stripe}" fill="#FF9933"/>
    <rect x="0" y="${bandTop + stripe}" width="512" height="${stripe}" fill="#FFFFFF"/>
    <rect x="0" y="${bandTop + stripe * 2}" width="512" height="${stripe}" fill="#138808"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#000080" stroke-width="2.5"/>
    ${spokes}
    <circle cx="${cx}" cy="${cy}" r="3.5" fill="#000080"/>
  </g>
</svg>
`;
}

const indiaFaviconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2dd4bf"/>
      <stop offset="100%" stop-color="#0d9488"/>
    </linearGradient>
    <clipPath id="round">
      <rect width="64" height="64" rx="12" ry="12"/>
    </clipPath>
  </defs>
  <g clip-path="url(#round)">
    <rect width="64" height="64" fill="url(#bg)"/>
    <path d="M17,36 L32,28 L46,15" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M40,16 L46,15 L45,21" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="0" y="50" width="64" height="4.67" fill="#FF9933"/>
    <rect x="0" y="54.67" width="64" height="4.66" fill="#FFFFFF"/>
    <rect x="0" y="59.33" width="64" height="4.67" fill="#138808"/>
  </g>
</svg>
`;

async function writePngIcons(svg, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const svgBuffer = Buffer.from(svg);

  for (const size of sizes) {
    const outputPath = path.join(dir, `icon-${size}x${size}.png`);
    await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);
    console.log(`  ✓ ${path.relative(__dirname, outputPath)}`);
  }
}

async function generateIcons() {
  console.log('Generating Dip Hunter PWA icons...');
  await writePngIcons(svgIcon, iconsDir);
  await writePngIcons(svgIcon, defaultIconsDir);

  const faviconPath = path.join(__dirname, 'public', 'favicon.ico');
  const faviconDefaultPath = path.join(__dirname, 'public', 'favicon-default.ico');
  await sharp(Buffer.from(svgIcon)).resize(32, 32).png().toFile(faviconPath);
  await sharp(Buffer.from(svgIcon)).resize(32, 32).png().toFile(faviconDefaultPath);
  console.log('  ✓ favicon.ico (32x32)');
  console.log('  ✓ favicon-default.ico (32x32)');

  fs.writeFileSync(path.join(__dirname, 'public', 'favicon.svg'), defaultFaviconSvg.trim() + '\n');
  console.log('  ✓ favicon.svg');

  const independenceSvg = buildIndependenceDayIconSvg();

  console.log('\nGenerating Independence Day icons (flag strip at bottom)...');
  await writePngIcons(independenceSvg, indiaIconsDir);

  const indiaFaviconPath = path.join(__dirname, 'public', 'favicon-india.ico');
  await sharp(Buffer.from(independenceSvg)).resize(32, 32).png().toFile(indiaFaviconPath);
  console.log('  ✓ favicon-india.ico (32x32)');

  const indiaFaviconSvgPath = path.join(__dirname, 'public', 'favicon-india.svg');
  fs.writeFileSync(indiaFaviconSvgPath, indiaFaviconSvg.trim() + '\n');
  console.log('  ✓ favicon-india.svg');

  console.log('\nDone! Default icons in public/icons/, Tiranga-bottom in public/icons-india/');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
