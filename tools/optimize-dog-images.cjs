/*
 * Regenerate the public site's responsive images after adding/replacing photos:
 *   node tools/optimize-dog-images.cjs
 * Requires sharp (already available with the workspace's Astro dependencies).
 * Originals are preserved. Only images referenced by the dog website are used.
 */
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const docs = path.join(root, 'docs');
const widths = [480, 960];
const sources = new Set();
const manifest = {};

// Keep image encoding bounded even on machines with many CPU cores.
sharp.concurrency(1);
sharp.cache({memory: 32, files: 0, items: 30});

function addSource(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/').split(/[?#]/)[0];
  if (!/^assets\/images\/.+\.(?:webp|png|jpe?g)$/i.test(normalized)) return;
  if (/favicon/i.test(normalized)) return;
  sources.add(normalized);
}

async function collectSources() {
  // HTML points directly to these optimized assets so they must remain sources.
  addSource('assets/images/brand/logo.png');
  addSource('assets/images/games/bundle.png');
  const context = {window: {}};
  vm.runInNewContext(await fs.readFile(path.join(docs, 'catalog.js'), 'utf8'), context);
  for (const product of context.window.DERECH_CATALOG || []) {
    for (const image of product.images || []) addSource(image);
  }
  for (const image of context.window.DERECH_HOME_IMAGES || []) addSource(image);
  for (const htmlPath of ['index.html', 'pages/games/index.html']) {
    const html = await fs.readFile(path.join(docs, htmlPath), 'utf8');
    for (const match of html.matchAll(/\bsrc=["']([^"']+)["']/g)) {
      const relative = path.posix.normalize(path.posix.join(path.posix.dirname(htmlPath), match[1]));
      addSource(relative);
    }
  }
  // Memory-game image names are assembled by its click handler.
  for (const prefix of ['p', 's']) {
    for (let index = 1; index <= 5; index++) addSource(`assets/images/games/1/${prefix}${index}.webp`);
  }
}

async function optimizeImage(source) {
  const input = path.join(docs, source);
  const inputStat = await fs.stat(input);
  const requestedWidths = source.endsWith('/brand/logo.png') ? [128] : widths;
  const stem = source.replace(/^assets\/images\//, '').replace(/\.[^.]+$/, '');
  const variants = [];
  let originalMetadata;
  for (const width of requestedWidths) {
    const relative = `assets/optimized/${stem}-${width}.webp`;
    const output = path.join(docs, relative);
    let outputStat;
    try { outputStat = await fs.stat(output); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!outputStat || outputStat.mtimeMs < inputStat.mtimeMs) {
      await fs.mkdir(path.dirname(output), {recursive: true});
      // Rotate according to EXIF and scale proportionally: never crop cards/boxes.
      await sharp(input).rotate().resize({width, fit: 'inside', withoutEnlargement: true})
        .webp({quality: 80, alphaQuality: 90, effort: 4}).toFile(output);
      outputStat = await fs.stat(output);
    }
    const metadata = await sharp(output).metadata();
    if (!originalMetadata) originalMetadata = await sharp(input).metadata();
    variants.push({src: relative, width: metadata.width, height: metadata.height, bytes: outputStat.size});
  }
  const largest = variants.at(-1);
  const uniqueWidths = variants.filter((variant, index) => variants.findIndex(item => item.width === variant.width) === index);
  manifest[source] = {
    src: largest.src,
    srcset: uniqueWidths.map(variant => `${variant.src} ${variant.width}w`).join(', '),
    width: largest.width,
    height: largest.height
  };
  return {
    source,
    originalBytes: inputStat.size,
    generatedBytes: variants.reduce((total, variant) => total + variant.bytes, 0),
    largestBytes: largest.bytes,
    inputWidth: originalMetadata.width,
    inputHeight: originalMetadata.height
  };
}

async function main() {
  await collectSources();
  const queue = [...sources].sort();
  const results = [];
  let next = 0;
  console.log(`Optimizing ${queue.length} referenced dog-site images; originals stay unchanged.`);
  const worker = async () => {
    while (next < queue.length) {
      const source = queue[next++];
      results.push(await optimizeImage(source));
      if (results.length % 25 === 0) console.log(`${results.length}/${queue.length} images ready`);
    }
  };
  await Promise.all([worker(), worker()]);
  const logo = path.join(docs, 'assets/images/brand/logo.png');
  const favicon = path.join(docs, 'assets/optimized/favicon-32.png');
  const logoStat = await fs.stat(logo);
  let faviconStat;
  try { faviconStat = await fs.stat(favicon); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!faviconStat || faviconStat.mtimeMs < logoStat.mtimeMs) {
    await sharp(logo).rotate().resize({width: 32, height: 32, fit: 'contain', background: {r: 0, g: 0, b: 0, alpha: 0}})
      .png({compressionLevel: 9}).toFile(favicon);
    faviconStat = await fs.stat(favicon);
  }
  const sorted = Object.fromEntries(Object.keys(manifest).sort().map(key => [key, manifest[key]]));
  const output = '// Generated by tools/optimize-dog-images.cjs. Edit original image paths in catalog.js.\n'
    + 'window.DERECH_MEDIA = ' + JSON.stringify(sorted, null, 2) + ';\n';
  const manifestPath = path.join(docs, 'media.js');
  let previous;
  try { previous = await fs.readFile(manifestPath, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (previous !== output) await fs.writeFile(manifestPath, output, 'utf8');
  const totals = results.reduce((total, image) => ({
    originalBytes: total.originalBytes + image.originalBytes,
    generatedBytes: total.generatedBytes + image.generatedBytes,
    largestVariantBytes: total.largestVariantBytes + image.largestBytes
  }), {originalBytes: 0, generatedBytes: 0, largestVariantBytes: 0});
  console.log(JSON.stringify({images: queue.length, ...totals, faviconBytes: faviconStat.size,
    reductionPercent: Number((100 * (1 - totals.largestVariantBytes / totals.originalBytes)).toFixed(1)),
    manifest: 'docs/media.js', output: 'docs/assets/optimized/'}, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
