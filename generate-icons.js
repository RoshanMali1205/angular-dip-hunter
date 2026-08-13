/**
 * Generate PWA icons for Dip Hunter app.
 * Run: node generate-icons.js
 * Requires: npm install sharp
 *
 * Also generates Independence Day (Tiranga) icons under public/icons-india/
 * used until 15 Aug EOD IST.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');
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

/** Rounded-square Indian flag (Tiranga) with Ashoka Chakra. */
function buildIndiaFlagSvg() {
  const spokes = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * Math.PI) / 12;
    const x2 = 256 + 54 * Math.cos(angle);
    const y2 = 256 + 54 * Math.sin(angle);
    return `<line x1="256" y1="256" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#000080" stroke-width="5"/>`;
  }).join('');

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <clipPath id="round">
      <rect width="512" height="512" rx="96" ry="96"/>
    </clipPath>
  </defs>
  <g clip-path="url(#round)">
    <rect width="512" height="170.67" y="0" fill="#FF9933"/>
    <rect width="512" height="170.67" y="170.67" fill="#FFFFFF"/>
    <rect width="512" height="170.66" y="341.34" fill="#138808"/>
    <circle cx="256" cy="256" r="58" fill="none" stroke="#000080" stroke-width="10"/>
    ${spokes}
    <circle cx="256" cy="256" r="10" fill="#000080"/>
  </g>
</svg>
`;
}

const indiaFaviconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <clipPath id="round">
      <rect width="64" height="64" rx="12" ry="12"/>
    </clipPath>
  </defs>
  <g clip-path="url(#round)">
    <rect width="64" height="21.33" y="0" fill="#FF9933"/>
    <rect width="64" height="21.34" y="21.33" fill="#FFFFFF"/>
    <rect width="64" height="21.33" y="42.67" fill="#138808"/>
    <circle cx="32" cy="32" r="7.2" fill="none" stroke="#000080" stroke-width="1.4"/>
    <circle cx="32" cy="32" r="1.2" fill="#000080"/>
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

  const faviconPath = path.join(__dirname, 'public', 'favicon.ico');
  await sharp(Buffer.from(svgIcon)).resize(32, 32).png().toFile(faviconPath);
  console.log('  ✓ favicon.ico (32x32)');

  console.log('\nGenerating Independence Day (Tiranga) icons...');
  await writePngIcons(buildIndiaFlagSvg(), indiaIconsDir);

  const indiaFaviconPath = path.join(__dirname, 'public', 'favicon-india.ico');
  await sharp(Buffer.from(buildIndiaFlagSvg())).resize(32, 32).png().toFile(indiaFaviconPath);
  console.log('  ✓ favicon-india.ico (32x32)');

  const indiaFaviconSvgPath = path.join(__dirname, 'public', 'favicon-india.svg');
  fs.writeFileSync(indiaFaviconSvgPath, indiaFaviconSvg.trim() + '\n');
  console.log('  ✓ favicon-india.svg');

  console.log('\nDone! Icons generated in public/icons/ and public/icons-india/');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
