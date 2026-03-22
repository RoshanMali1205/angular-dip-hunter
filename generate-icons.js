/**
 * Generate PWA icons for Dip Hunter app.
 * Run: node generate-icons.js
 * Requires: npm install sharp
 */
const sharp = require('sharp');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outputDir = path.join(__dirname, 'public', 'icons');

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

  // Generate favicon (32x32 PNG as favicon.ico)
  const faviconPath = path.join(__dirname, 'public', 'favicon.ico');
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(faviconPath);
  console.log('  ✓ favicon.ico (32x32)');
  
  console.log('\nDone! All icons generated in public/icons/');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
