const https = require('https');

const queries = [
  'Hampi',
  'Group of Monuments at Hampi',
  'Munnar',
  'Promenade Beach',
  'Pondicherry',
  'Virupaksha Temple, Hampi'
];

function fetchWikiImage(query) {
  return new Promise((resolve) => {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(query)}&prop=pageimages&format=json&pithumbsize=1000`;
    https.get(url, { headers: { 'User-Agent': 'WayfarerTravel/1.0 (travel-site)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const pages = parsed.query?.pages;
          const firstKey = Object.keys(pages || {})[0];
          const page = pages?.[firstKey];
          resolve({ query, title: page?.title, thumb: page?.thumbnail?.source });
        } catch (e) {
          resolve({ query, error: e.message });
        }
      });
    }).on('error', e => resolve({ query, error: e.message }));
  });
}

(async () => {
  for (const q of queries) {
    const res = await fetchWikiImage(q);
    console.log(q, '-->', res.thumb || 'NOT FOUND');
  }
})();
