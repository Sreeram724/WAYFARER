const https = require('https');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'public', 'assets', 'destinations');

const downloads = [
  { name: 'kerala.jpg', url: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=1000&auto=format&fit=crop' },
  { name: 'munnar.jpg', url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1000&auto=format&fit=crop' },
  { name: 'alleppey.jpg', url: 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?q=80&w=1000&auto=format&fit=crop' },
  { name: 'wayanad.jpg', url: 'https://images.unsplash.com/photo-1672597557538-fd88dec3aae2?q=80&w=1000&auto=format&fit=crop' },
  { name: 'ooty.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/NMR_train_at_Ketti_05-02-26_75.jpeg/1280px-NMR_train_at_Ketti_05-02-26_75.jpeg' },
  { name: 'kodaikanal.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Kodaikanal_lake.jpg' },
  { name: 'coorg.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Abbey_Falls_New.jpg/1280px-Abbey_Falls_New.jpg' },
  { name: 'mysore.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Mysore_Palace_Morning.jpg/1280px-Mysore_Palace_Morning.jpg' },
  { name: 'hampi.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Wide_angle_of_Galigopuram_of_Virupaksha_Temple%2C_Hampi_%2804%29_%28cropped%29.jpg/1280px-Wide_angle_of_Galigopuram_of_Virupaksha_Temple%2C_Hampi_%2804%29_%28cropped%29.jpg' },
  { name: 'pondicherry.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Pondicherry-Rock_beach_aerial_view.jpg/1280px-Pondicherry-Rock_beach_aerial_view.jpg' },
  { name: 'rameswaram.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Pamban_Bridge_Train_Passing.jpg/1280px-Pamban_Bridge_Train_Passing.jpg' },
  { name: 'madurai.jpg', url: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=1000&auto=format&fit=crop' },
  { name: 'varanasi.jpg', url: 'https://images.unsplash.com/photo-1571536802807-30451e3955d8?q=80&w=1000&auto=format&fit=crop' },
  { name: 'jaipur.jpg', url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?q=80&w=1000&auto=format&fit=crop' },
  { name: 'manali.jpg', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1000&auto=format&fit=crop' },
  { name: 'goa.jpg', url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=1000&auto=format&fit=crop' }
];

function download(file, url) {
  return new Promise((resolve, reject) => {
    const dest = path.join(targetDir, file);
    function get(currentUrl, hops = 0) {
      if (hops > 5) return reject(new Error('Too many redirects'));
      https.get(currentUrl, { headers: { 'User-Agent': 'WayfarerTravelBot/1.0 (travel-site)' } }, (res) => {
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

(async () => {
  for (const item of downloads) {
    try {
      const res = await download(item.name, item.url);
      console.log(`Downloaded ${res.file}: ${(res.size / 1024).toFixed(1)} KB`);
    } catch (err) {
      console.error(`Error downloading ${item.name}: ${err.message}`);
    }
  }
  console.log('Finished downloading all destination assets!');
})();
