/*
 * Prepare only manually reviewed game-testimonial sources:
 *   node tools/prepare-game-testimonials.cjs "C:\\path\\to\\source-folder"
 *
 * tools/game-testimonials-sources.json owns the reviewed selections and stable
 * IDs. This helper never changes that map, creates editorial quotes, removes
 * images, or imports files merely because they appear in the source folder.
 * Original photographs and screenshots remain untouched.
 */
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const docs = path.join(root, 'docs');
const sourceMapFile = path.join(root, 'tools/game-testimonials-sources.json');
const manifestFile = path.join(root, 'artifacts/game-testimonials-manifest.json');
const imageNamePattern = /\.(?:jpe?g|png|webp|avif)$/i;
const reviewIdPattern = /^game-review-(\d{2,})$/;

sharp.concurrency(1);
sharp.cache({memory: 32, files: 0, items: 30});

function validSourceName(value) {
  return typeof value === 'string' && value === value.trim() &&
    !/[\x00-\x1f<>:"/\\|?*]/.test(value) && imageNamePattern.test(value) &&
    value !== '.' && value !== '..' && path.basename(value) === value;
}

function validateSourceMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1 || !Array.isArray(value.sources)) {
    throw new Error('Expected {version: 1, sources: [...]} in tools/game-testimonials-sources.json.');
  }
  const ids = new Set(), names = new Set();
  for (const entry of value.sources) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || !validSourceName(entry.sourceName)) {
      throw new Error('Invalid reviewed source filename: ' + entry?.sourceName);
    }
    const sourceKey = entry.sourceName.toLowerCase();
    if (names.has(sourceKey)) throw new Error('Duplicate reviewed source filename: ' + entry.sourceName);
    names.add(sourceKey);
    if (!['include', 'therapy', 'duplicate', 'exclude'].includes(entry.status)) {
      throw new Error('Invalid reviewed source status for ' + entry.sourceName + ': ' + entry.status);
    }
    if (entry.status === 'include' || entry.status === 'therapy') {
      const prefix = entry.status === 'therapy' ? 'therapy-facebook-' : 'game-review-';
      const match = (entry.status === 'therapy' ? /^therapy-facebook-(\d{2,})$/ : reviewIdPattern).exec(entry.id);
      const number = Number(match?.[1]);
      if (!match || !Number.isSafeInteger(number) || number < 1 || entry.id !== prefix + String(number).padStart(2, '0')) {
        throw new Error('Invalid stable game-review ID: ' + entry.id);
      }
      if (ids.has(entry.id)) throw new Error('Duplicate stable game-review ID: ' + entry.id);
      ids.add(entry.id);
    } else {
      if (entry.id !== undefined) throw new Error('Only included sources may reserve an output ID: ' + entry.sourceName);
      if (entry.status === 'duplicate' && (typeof entry.duplicateOf !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.duplicateOf))) {
        throw new Error('A duplicate source must identify its retained review: ' + entry.sourceName);
      }
      if (entry.status === 'exclude' && (typeof entry.reason !== 'string' || !entry.reason.trim())) {
        throw new Error('An excluded source must have a reviewed reason: ' + entry.sourceName);
      }
    }
  }
  return value.sources;
}

async function statIfPresent(filename) {
  try { return await fs.stat(filename); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function prepareVariant(source, sourceStat, destination, width, quality) {
  const previous = await statIfPresent(destination);
  if (!previous || previous.mtimeMs < sourceStat.mtimeMs) {
    await fs.mkdir(path.dirname(destination), {recursive: true});
    // Auto-orient, then scale proportionally without enlarging or cropping.
    // Sharp's default encoding strips EXIF/XMP; do not call withMetadata().
    await sharp(source).rotate().resize({width, fit: 'inside', withoutEnlargement: true})
      .webp({quality, alphaQuality: 100, effort: 5}).toFile(destination);
  }
  const [metadata, outputStat] = await Promise.all([sharp(destination).metadata(), fs.stat(destination)]);
  if (metadata.format !== 'webp' || !metadata.width || !metadata.height || metadata.exif || metadata.xmp) {
    throw new Error('Invalid prepared WebP or retained metadata: ' + destination);
  }
  return {width: metadata.width, height: metadata.height, bytes: outputStat.size};
}

async function main() {
  const sourceFolder = path.resolve(process.argv[2] || path.join(os.homedir(), 'Downloads', 'תמונות המלצות לאתר'));
  let persisted;
  try { persisted = JSON.parse(await fs.readFile(sourceMapFile, 'utf8')); }
  catch (error) {
    throw new Error('Cannot read the curated tools/game-testimonials-sources.json; no images prepared. ' + error.message);
  }
  const sources = validateSourceMap(persisted);
  const folderEntries = await fs.readdir(sourceFolder, {withFileTypes: true});
  const files = new Map();
  for (const entry of folderEntries) {
    if (!entry.isFile() || !imageNamePattern.test(entry.name)) continue;
    const key = entry.name.toLowerCase();
    if (files.has(key)) throw new Error('Source filenames differ only by case; review explicitly: ' + entry.name);
    files.set(key, entry.name);
  }
  const mappedNames = new Set(sources.map(entry => entry.sourceName.toLowerCase()));
  const unmapped = [...files.entries()].filter(([key]) => !mappedNames.has(key)).map(([, name]) => name);
  for (const name of unmapped) console.warn('Unreviewed source skipped; add a reviewed map entry first: ' + name);

  const manifest = [], missing = [];
  for (const entry of sources) {
    if (!['include', 'therapy'].includes(entry.status)) continue;
    const actualName = files.get(entry.sourceName.toLowerCase());
    if (!actualName) {
      missing.push(entry.sourceName);
      console.warn('Included source missing; preserving its map entry and any existing images: ' + entry.id + ' (' + entry.sourceName + ')');
      continue;
    }
    const source = path.join(sourceFolder, actualName);
    const sourceStat = await fs.stat(source);
    const collection = entry.status === 'therapy' ? 'testimonials' : 'game-testimonials';
    const image = `assets/images/${collection}/${entry.id}.webp`;
    const thumbnail = `assets/optimized/${collection}/${entry.id}-480.webp`;
    const full = await prepareVariant(source, sourceStat, path.join(docs, image), 2000, 92);
    const thumb = await prepareVariant(source, sourceStat, path.join(docs, thumbnail), 480, 85);
    manifest.push({
      id: entry.id, sourceName: entry.sourceName, image, thumbnail,
      width: full.width, height: full.height,
      thumbWidth: thumb.width, thumbHeight: thumb.height,
      fullBytes: full.bytes, thumbBytes: thumb.bytes
    });
  }
  await fs.mkdir(path.dirname(manifestFile), {recursive: true});
  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  const totals = manifest.reduce((result, item) => ({fullBytes: result.fullBytes + item.fullBytes, thumbBytes: result.thumbBytes + item.thumbBytes}), {fullBytes: 0, thumbBytes: 0});
  console.log(JSON.stringify({
    images: manifest.length,
    therapyImages: sources.filter(entry => entry.status === 'therapy').length,
    duplicatesSkipped: sources.filter(entry => entry.status === 'duplicate').length,
    excludedSkipped: sources.filter(entry => entry.status === 'exclude').length,
    missingIncluded: missing.length,
    unreviewedSkipped: unmapped.length,
    ...totals,
    manifest: 'artifacts/game-testimonials-manifest.json'
  }, null, 2));
}

module.exports = {validSourceName, validateSourceMap, prepareVariant};
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
