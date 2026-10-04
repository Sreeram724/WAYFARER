const https = require('https');
const { db } = require('./db.js');
const pkgs = db.prepare('SELECT id, name, destination_name, image_url FROM packages').all();

function fetchMeta(photoId) {
  return new Promise((resolve) => {
    const url = `https://unsplash.com/photos/${photoId}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const titleMatch = data.match(/<title>([^<]+)<\/title>/);
        const descMatch = data.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i) ||
                          data.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
        resolve({
          title: titleMatch ? titleMatch[1].replace(' | Unsplash', '') : 'No title',
          desc: descMatch ? descMatch[1] : 'No desc'
        });
      });
    }).on('error', (e) => resolve({ title: e.message, desc: '' }));
  });
}

(async () => {
  for (const p of pkgs) {
    const match = p.image_url.match(/photo-([0-9a-fA-F-]+)/);
    const photoId = match ? match[1] : null;
    if (photoId) {
      const meta = await fetchMeta(photoId);
      console.log(`[PKG ${p.id}] ${p.name} (${p.destination_name})`);
      console.log(`  Current Image Title: ${meta.title}`);
      console.log(`  Current Image Desc: ${meta.desc.substring(0, 100)}`);
      console.log('---');
    }
  }
})();
