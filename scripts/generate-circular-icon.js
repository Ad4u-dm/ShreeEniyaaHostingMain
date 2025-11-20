const sharp = require('sharp');
const path = require('path');

async function generateCircularIcon() {
  const inputPath = path.join(__dirname, '../public/logo.jpg');
  const outputPath = path.join(__dirname, '../public/icon.png');

  console.log('Generating circular favicon...');

  try {
    const size = 512;

    // Create a circular mask
    const circleSVG = `
      <svg width="${size}" height="${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/>
      </svg>
    `;

    // Process the image to be circular
    await sharp(inputPath)
      .resize(size, size, { fit: 'cover' })
      .composite([{
        input: Buffer.from(circleSVG),
        blend: 'dest-in'
      }])
      .png()
      .toFile(outputPath);

    console.log('✓ Circular favicon generated successfully at public/icon.png');

    // Also create smaller sizes for different use cases
    const sizes = [16, 32, 64, 128, 256];
    for (const iconSize of sizes) {
      const sizedOutputPath = path.join(__dirname, `../public/icon-${iconSize}.png`);

      await sharp(inputPath)
        .resize(iconSize, iconSize, { fit: 'cover' })
        .composite([{
          input: Buffer.from(`
            <svg width="${iconSize}" height="${iconSize}">
              <circle cx="${iconSize/2}" cy="${iconSize/2}" r="${iconSize/2}" fill="white"/>
            </svg>
          `),
          blend: 'dest-in'
        }])
        .png()
        .toFile(sizedOutputPath);

      console.log(`✓ Generated ${iconSize}x${iconSize} icon`);
    }

  } catch (error) {
    console.error('Error generating circular icon:', error);
    process.exit(1);
  }
}

generateCircularIcon();
