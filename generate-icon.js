const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

/**
 * Convert an SVG file to PNG with high quality rendering
 * @param {string} svgPath - Path to the SVG file
 * @param {number} outputSize - Output size (default: auto from SVG)
 * @param {number} scale - Internal scale factor for better quality (default: 4)
 */
async function svgToPng(svgPath, outputSize, scale = 4) {
  // Read SVG file
  let svgContent = fs.readFileSync(svgPath, 'utf8');
  
  // Extract original dimensions from SVG
  let origWidth, origHeight;
  const widthMatch = svgContent.match(/width="(\d+)"/);
  const heightMatch = svgContent.match(/height="(\d+)"/);
  const viewBoxMatch = svgContent.match(/viewBox="[\d\s]+ (\d+) (\d+)"/);
  
  if (widthMatch && heightMatch) {
    origWidth = parseInt(widthMatch[1]);
    origHeight = parseInt(heightMatch[1]);
  } else if (viewBoxMatch) {
    origWidth = parseInt(viewBoxMatch[1]);
    origHeight = parseInt(viewBoxMatch[2]);
  } else {
    origWidth = 128;
    origHeight = 128;
  }
  
  // Calculate output dimensions
  const finalSize = outputSize || Math.max(origWidth, origHeight);
  const aspectRatio = origWidth / origHeight;
  let finalWidth, finalHeight;
  
  if (aspectRatio >= 1) {
    finalWidth = finalSize;
    finalHeight = Math.round(finalSize / aspectRatio);
  } else {
    finalHeight = finalSize;
    finalWidth = Math.round(finalSize * aspectRatio);
  }
  
  // Use higher internal resolution for smoother rendering
  const renderWidth = finalWidth * scale;
  const renderHeight = finalHeight * scale;
  
  // Modify SVG to render at higher resolution
  svgContent = svgContent
    .replace(/width="(\d+)"/, `width="${renderWidth}"`)
    .replace(/height="(\d+)"/, `height="${renderHeight}"`);
  
  // Create high-res canvas
  const hiResCanvas = createCanvas(renderWidth, renderHeight);
  const hiResCtx = hiResCanvas.getContext('2d');
  
  // Enable high quality rendering
  hiResCtx.imageSmoothingEnabled = true;
  hiResCtx.imageSmoothingQuality = 'high';
  hiResCtx.antialias = 'subpixel';
  
  // Convert SVG to data URL and load as image
  const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
  const image = await loadImage(svgDataUrl);
  
  // Draw image on high-res canvas
  hiResCtx.drawImage(image, 0, 0, renderWidth, renderHeight);
  
  // Create final canvas and downscale for anti-aliasing effect
  const finalCanvas = createCanvas(finalWidth, finalHeight);
  const finalCtx = finalCanvas.getContext('2d');
  
  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = 'high';
  
  // Downscale from high-res to final size (this creates smooth edges)
  finalCtx.drawImage(hiResCanvas, 0, 0, renderWidth, renderHeight, 0, 0, finalWidth, finalHeight);
  
  // Generate output path (same name, .png extension)
  const pngPath = svgPath.replace(/\.svg$/i, '.png');
  
  // Save to PNG
  const buffer = finalCanvas.toBuffer('image/png');
  fs.writeFileSync(pngPath, buffer);
  
  console.log(`Converted: ${svgPath} -> ${pngPath} (${finalWidth}x${finalHeight}, ${scale}x supersampling)`);
  return pngPath;
}

// Main: get SVG path from command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  // Default: convert icon.svg in resources folder
  const defaultSvg = path.join(__dirname, 'resources', 'icon.svg');
  if (fs.existsSync(defaultSvg)) {
    svgToPng(defaultSvg, 128, 4).catch(console.error);
  } else {
    console.log('Usage: node generate-icon.js <svg-file> [output-size] [scale-factor]');
    console.log('Example: node generate-icon.js resources/icon.svg 128 4');
    console.log('  output-size: final PNG size (default: from SVG)');
    console.log('  scale-factor: supersampling for quality (default: 4, higher = smoother)');
  }
} else {
  const svgPath = path.resolve(args[0]);
  const outputSize = args[1] ? parseInt(args[1]) : undefined;
  const scale = args[2] ? parseInt(args[2]) : 4;
  
  if (!fs.existsSync(svgPath)) {
    console.error(`File not found: ${svgPath}`);
    process.exit(1);
  }
  
  svgToPng(svgPath, outputSize, scale).catch(console.error);
}