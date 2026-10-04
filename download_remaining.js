const https = require('https');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'public', 'assets', 'destinations');

const needed = [
  { name: 'coorg.jpg', url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?q=80&w=1000&auto=format&fit=crop' },
  { name: 'ooty.jpg', url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1000&auto=format&fit=crop' },
  { name: 'kodaikanal.jpg', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1000&auto=format&fit=crop' },
  { name: 'pondicherry.jpg', url: 'https://images.unsplash.com/photo-1509233725247-49e657c54213?q=80&w=1000&auto=format&fit=crop' },
  { name: 'rameswaram.jpg', url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1000&auto=format&fit=crop' },
  { name: 'mysore.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Mysore_Palace_Morning.jpg/1280px-Mysore_Palace_Morning.jpg' },
  { name: 'hampi.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Wide_angle_of_Galigopuram_of_Virupaksha_Temple%2C_Hampi_%2804%29_%28cropped%29.jpg/1280px-Wide_angle_of_Galigopuram_of_Virupaksha_Temple%2C_Hampi_%2804%29_%28cropped%29.jpg' }
];

function download(file, url) {
  return new Promise((resolve, reject) => {
    const dest = path.join(targetDir, file);
    function get(currentUrl, hops = 0) {
      if (hops > 5) return reject(new Error('Too many redirects'));
      https.get(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location, hops + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${currentUrl}`));
        }
        const stream = fs.createWriteStream(dest);
        res.pipe(stream);
        stream.on('finish', () => {
          stream.close();
          const size = fs.statSync(dest).size;
          resolve({ file, size });
        });
      }).on('error', reject);
    }
    get(url);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  for (const item of needed) {
    try {
      await sleep(2500);
      const res = await download(item.name, item.url);
      console.log(`Downloaded ${res.file}: ${(res.size / 1024).toFixed(1)} KB`);
    } catch (err) {
      console.error(`Error downloading ${item.name}: ${err.message}`);
    }
  }
  console.log('All remaining items processed!');
})();
