/*
 * Prepare the owner's testimonial photographs without changing their content.
 *   node tools/prepare-testimonials.cjs "C:\\path\\to\\source-folder"
 * Requires sharp, available in this workspace's installed dependencies.
 * Original files stay untouched. tools/testimonials-sources.json retains IDs
 * permanently; new filenames receive new IDs without renumbering existing ones.
 * Renamed files are never matched by guesswork: review the persisted map first.
 */
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const sourceFolder = path.resolve(process.argv[2] || path.join(os.homedir(), 'Downloads', 'תמונות המלצות  לאתר טיפולי'));
const fullFolder = path.join(root, 'docs/assets/images/testimonials');
const thumbFolder = path.join(root, 'docs/assets/optimized/testimonials');
const artifactFolder = path.join(root, 'artifacts');
const sourceMapFile = path.join(root, 'tools/testimonials-sources.json');
const compareAscii = (first, second) => first < second ? -1 : first > second ? 1 : 0;
const escapeXml = text => String(text).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[character]));

sharp.concurrency(1);
sharp.cache({memory: 32, files: 0, items: 30});

function validName(sourceName) {
 return typeof sourceName === 'string' && !/[\\/]/.test(sourceName) && /\.jpe?g$/i.test(sourceName);
}

function reconcileSources(existing, filenames) {
 if(!Array.isArray(existing) || !Array.isArray(filenames))throw new Error('Source mapping and filenames must be arrays.');
 const mapping = [], ids = new Set(), names = new Set();
 let lastId = 0;
 for(const entry of existing) {
  if(!entry || !['id,sourceName', 'id,retired,sourceName'].includes(Object.keys(entry).sort().join(',')))throw new Error('Source mappings may contain only id, sourceName and optional retired.');
  if(entry.retired !== undefined && typeof entry.retired !== 'boolean')throw new Error('Retired must be a boolean: ' + entry.id);
  const match = /^therapy-(\d{2,})$/.exec(entry.id), numericId = Number(match?.[1]);
  if(!match || !Number.isSafeInteger(numericId) || numericId < 1 || entry.id !== 'therapy-' + String(numericId).padStart(2, '0'))throw new Error('Invalid persisted testimonial ID: ' + entry.id);
  if(!validName(entry.sourceName))throw new Error('Invalid source filename in mapping: ' + entry.sourceName);
  if(ids.has(entry.id) || names.has(entry.sourceName.toLowerCase()))throw new Error('Duplicate testimonial ID or source filename: ' + entry.id);
  ids.add(entry.id);names.add(entry.sourceName.toLowerCase());lastId = Math.max(lastId, numericId);
  mapping.push({id: entry.id, sourceName: entry.sourceName, ...(entry.retired === undefined ? {} : {retired: entry.retired})});
 }
 const current = new Set();
 for(const filename of filenames) {
  if(!validName(filename) || current.has(filename))throw new Error('Invalid or duplicate input source filename: ' + filename);
  current.add(filename);
 }
 const byName = new Map(mapping.map(entry => [entry.sourceName, entry]));
 const added = [];
 for(const filename of [...current].sort(compareAscii)) {
  if(byName.has(filename))continue;
  if(names.has(filename.toLowerCase()))throw new Error('A filename differs only by case from a mapped source. Review the rename explicitly: ' + filename);
  const entry = {id: 'therapy-' + String(++lastId).padStart(2, '0'), sourceName: filename};
  mapping.push(entry);added.push(entry);byName.set(filename, entry);names.add(filename.toLowerCase());
 }
 const active = mapping.filter(entry => !entry.retired && current.has(entry.sourceName)).sort((first, second) => Number(first.id.slice(8)) - Number(second.id.slice(8)));
 const missing = mapping.filter(entry => !entry.retired && !current.has(entry.sourceName));
 return {mapping, active, missing, added};
}

async function preparePhoto({sourceName, id}) {
 const source = path.join(sourceFolder, sourceName);
 const image = `assets/images/testimonials/${id}.webp`;
 const thumbnail = `assets/optimized/testimonials/${id}-480.webp`;
 // Auto-orient before proportional resizing. Normal encoding strips EXIF and
 // other metadata; do not add withMetadata(), cropping, redaction or retouching.
 const full = await sharp(source).rotate().resize({width: 2000, fit: 'inside', withoutEnlargement: true})
  .webp({quality: 92, alphaQuality: 100, effort: 5}).toFile(path.join(root, 'docs', image));
 const thumb = await sharp(source).rotate().resize({width: 480, fit: 'inside', withoutEnlargement: true})
  .webp({quality: 85, alphaQuality: 100, effort: 5}).toFile(path.join(root, 'docs', thumbnail));
 const encoded = await sharp(path.join(root, 'docs', image)).metadata();
 const encodedThumb = await sharp(path.join(root, 'docs', thumbnail)).metadata();
 if(encoded.exif || encoded.xmp || encodedThumb.exif || encodedThumb.xmp)throw new Error('Unexpected retained metadata: ' + sourceName);
 return {id, sourceName, image, thumbnail, width: full.width, height: full.height,
  thumbWidth: thumb.width, thumbHeight: thumb.height, fullBytes: full.size, thumbBytes: thumb.size};
}

async function contactSheet(manifest) {
 const columns = 4, cellWidth = 400, cellHeight = 500;
 const rows = Math.ceil(manifest.length / columns), layers = [];
 for(let index = 0; index < manifest.length; index++) {
  const entry = manifest[index];
  const left = (index % columns) * cellWidth, top = Math.floor(index / columns) * cellHeight;
  const photo = await sharp(path.join(root, 'docs', entry.image))
   .resize({width: 370, height: 425, fit: 'contain', background: '#ffffff'}).png().toBuffer();
  layers.push({input: photo, left: left + 15, top: top + 60});
  const label = `<svg width="400" height="55"><rect width="400" height="55" fill="#f4f1e9"/><text x="15" y="22" font-family="Arial,sans-serif" font-size="18" fill="#302f29">${escapeXml(entry.id)}</text><text x="15" y="44" font-family="Arial,sans-serif" font-size="13" fill="#59584f">${escapeXml(entry.sourceName)}</text></svg>`;
  layers.push({input: Buffer.from(label), left, top});
 }
 await sharp({create: {width: columns * cellWidth, height: rows * cellHeight, channels: 3, background: '#ffffff'}})
  .composite(layers).jpeg({quality: 90}).toFile(path.join(artifactFolder, 'testimonials-contactsheet.jpg'));
}

async function main() {
 const entries = await fs.readdir(sourceFolder, {withFileTypes: true});
 const files = entries.filter(entry => entry.isFile() && /\.jpe?g$/i.test(entry.name)).map(entry => entry.name).sort(compareAscii);
 if(!files.length)throw new Error('No JPG testimonial photographs found in ' + sourceFolder);
 let persisted;
 try { persisted = JSON.parse(await fs.readFile(sourceMapFile, 'utf8')); }
 catch(error) { throw new Error('Cannot read tools/testimonials-sources.json. Restore its ID history before preparing photographs. ' + error.message); }
 if(!Array.isArray(persisted) || !persisted.length)throw new Error('The persisted testimonial ID history is empty or invalid. Restore tools/testimonials-sources.json before preparing photographs.');
 const plan = reconcileSources(persisted, files);
 for(const entry of plan.missing)console.warn('Source missing; retaining its reserved ID and existing assets: ' + entry.id + ' (' + entry.sourceName + ')');
 if(plan.added.length) {
  // Reserve IDs atomically before encoding so an interrupted run cannot reuse
  // an ID whose image may already have been written. Never delete map history.
  const temporaryMap = sourceMapFile + '.tmp';
  await fs.writeFile(temporaryMap, JSON.stringify(plan.mapping, null, 2) + '\n', {encoding: 'utf8', flag: 'wx'});
  await fs.rename(temporaryMap, sourceMapFile);
 }
 await Promise.all([fullFolder, thumbFolder, artifactFolder].map(folder => fs.mkdir(folder, {recursive: true})));
 const manifest = [];
 for(const entry of plan.active)manifest.push(await preparePhoto(entry));
 await fs.writeFile(path.join(artifactFolder, 'testimonials-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
 if(manifest.length)await contactSheet(manifest);
 const totals = manifest.reduce((total, entry) => ({fullBytes: total.fullBytes + entry.fullBytes, thumbBytes: total.thumbBytes + entry.thumbBytes}), {fullBytes: 0, thumbBytes: 0});
 console.log(JSON.stringify({images: manifest.length, newSources: plan.added.length, missingSources: plan.missing.length, ...totals, manifest: 'artifacts/testimonials-manifest.json', contactSheet: manifest.length ? 'artifacts/testimonials-contactsheet.jpg' : null}, null, 2));
}

module.exports = {reconcileSources};
if(require.main === module)main().catch(error => {console.error(error); process.exitCode = 1;});
