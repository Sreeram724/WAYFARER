const https = require('https');

// Candidate images for each destination
const candidates = {
  munnar: [
    'https://images.unsplash.com/photo-1590682680695-43b964a3ae17?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579618218290-24a26f63a738?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?q=80&w=1200&auto=format&fit=crop'
  ],
  alleppey: [
    'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?q=80&w=1200&auto=format&fit=crop'
  ],
  wayanad: [
    'https://images.unsplash.com/photo-1672597557538-fd88dec3aae2?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1511497584788-87676104235f?q=80&w=1200&auto=format&fit=crop'
  ],
  ooty: [
    'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop'
  ],
  kodaikanal: [
    'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1200&auto=format&fit=crop'
  ],
  coorg: [
    'https://images.unsplash.com/photo-1544787219-7f47ccb76574?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1200&auto=format&fit=crop'
  ],
  mysore: [
    'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1600100397608-f4f4b9d5f8e8?q=80&w=1200&auto=format&fit=crop'
  ],
  hampi: [
    'https://images.unsplash.com/photo-1600100397608-f4f4b9d5f8e8?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?q=80&w=1200&auto=format&fit=crop'
  ],
  pondicherry: [
    'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=1200&auto=format&fit=crop'
  ],
  rameswaram: [
    'https://images.unsplash.com/photo-1624026676760-53603406ac94?q=80&w=1200&auto=format&fit=crop'
  ],
  madurai: [
    'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?q=80&w=1200&auto=format&fit=crop'
  ],
  varanasi: [
    'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?q=80&w=1200&auto=format&fit=crop'
  ],
  jaipur: [
    'https://images.unsplash.com/photo-1599661046289-e31897846e41?q=80&w=1200&auto=format&fit=crop'
  ],
  manali: [
    'https://images.unsplash.com/photo-1586500036706-41963de24d8b?q=80&w=1200&auto=format&fit=crop'
  ],
  goa: [
    'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=1200&auto=format&fit=crop'
  ]
};

async function testHead(url) {
  return new Promise((res) => {
    https.request(url, { method: 'HEAD' }, (r) => {
      res({ url, status: r.statusCode, type: r.headers['content-type'], len: r.headers['content-length'] });
    }).on('error', (e) => res({ url, error: e.message })).end();
  });
}

(async () => {
  for (const [key, urls] of Object.entries(candidates)) {
    console.log(`Checking ${key}...`);
    for (const u of urls) {
      const result = await testHead(u);
      console.log(`  ${result.status} | len: ${result.len} | ${u.substring(0, 60)}...`);
    }
  }
})();
