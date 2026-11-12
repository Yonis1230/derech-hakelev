'use strict';
// Refresh shared invitations and footer links in every existing static page.
const fs = require('node:fs');
const path = require('node:path');
const community = require('./whatsapp-community.cjs');
const root = path.resolve(__dirname, '../docs');
function visit(directory) {
 for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
  const file = path.join(directory, entry.name);
  if (entry.isDirectory()) visit(file);
  else if (entry.name.endsWith('.html')) {
   const original = fs.readFileSync(file, 'utf8');
   let html = original;
   for (const location of ['article', 'articles_index', 'home']) {
    html = html.replace(new RegExp('<!-- community:' + location + ':start -->[\\s\\S]*?<!-- community:' + location + ':end -->', 'g'), community.invitation(location));
   }
   html = html.replace(/<footer\b[\s\S]*?<\/footer>/g, footer => {
    if (footer.includes('<!-- community:footer:start -->')) return footer.replace(/<!-- community:footer:start -->[\s\S]*?<!-- community:footer:end -->/, community.footer());
    return footer.replace(/(<a\b[^>]*href="https:\/\/www\.tiktok\.com\/[^>]*>[\s\S]*?<\/a>)/, '$1\n' + community.footer());
   });
   html = html.replace(/measurement\.js\?v=[^"\s]+/g, 'measurement.js?v=20261112-community').replace(/styles\.css\?v=[^"\s]+/g, 'styles.css?v=20261112-community');
   if (html !== original) fs.writeFileSync(file, html);
  }
 }
}
visit(root);
console.log('Shared community invitations and footer links synchronized.');
