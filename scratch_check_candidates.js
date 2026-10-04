const https = require('https');

// Curated Unsplash photo IDs for Indian destinations
const candidates = [
  // Varanasi
  { name: 'Varanasi', id: 'photo-1561361513-2d000a50f0dc' },
  { name: 'Varanasi-ghat1', id: 'photo-1571536802807-30451e3955d8' },
  { name: 'Varanasi-ghat2', id: 'photo-1568454537842-d933259bb258' },
  { name: 'Varanasi-ghat3', id: 'photo-1609946850889-10659775fb95' },
  { name: 'Varanasi-ghat4', id: 'photo-1518002171953-a080ee817e1f' },
  { name: 'Varanasi-aarti', id: 'photo-1627894483216-2138af692e32' },

  // Manali / Himalayas snow
  { name: 'Manali-snow1', id: 'photo-1605649487212-47bdab064df7' },
  { name: 'Manali-snow2', id: 'photo-1506744038136-46273834b3fb' },
  { name: 'Manali-snow3', id: 'photo-1519681393784-d120267933ba' },
  { name: 'Manali-snow4', id: 'photo-1464822759023-fed622ff2c3b' },
  { name: 'Manali-snow5', id: 'photo-1486870591958-9b9d0d1dda99' },
  { name: 'Manali-himalayas', id: 'photo-1589182373726-e4f658ab50f0' },

  // Munnar tea
  { name: 'Munnar-tea1', id: 'photo-1516483638261-f4dbaf036963' },
  { name: 'Munnar-tea2', id: 'photo-1544735716-392fe2489ffa' },
  { name: 'Munnar-tea3', id: 'photo-1579618218290-24a26f63a738' },
  { name: 'Munnar-tea4', id: 'photo-1563729784474-d77dbb933a9e' },
  { name: 'Munnar-tea5', id: 'photo-1506905925346-21bda4d32df4' },

  // Coorg coffee / waterfalls
  { name: 'Coorg-hills1', id: 'photo-1501339847302-ac426a4a7cbb' },
  { name: 'Coorg-hills2', id: 'photo-1473448912268-2022ce9509d8' },
  { name: 'Coorg-falls', id: 'photo-1432405972618-c60b0225b8f9' },
  { name: 'Coorg-estate', id: 'photo-1511497584788-87676104235f' },
  { name: 'Coorg-green', id: 'photo-1448375240586-882707db888b' },

  // Hampi ruins
  { name: 'Hampi-ruins1', id: 'photo-1600100397608-f4f4b9d5f8e8' },
  { name: 'Hampi-ruins2', id: 'photo-1589308078059-be1415eab4c3' },
  { name: 'Hampi-ruins3', id: 'photo-1524492412937-b28074a5d7da' },
  { name: 'Hampi-chariot', id: 'photo-1609137144813-7d9921338f24' },

  // Pondicherry French
  { name: 'Pondy-french1', id: 'photo-1584551246679-0daf3d275d0f' },
  { name: 'Pondy-french2', id: 'photo-1513694203232-719a280e022f' },
  { name: 'Pondy-yellow', id: 'photo-1507525428034-b723cf961d3e' },
  { name: 'Pondy-promenade', id: 'photo-1509233725247-49e657c54213' },

  // Mysore Palace
  { name: 'Mysore-palace1', id: 'photo-1600100397608-f4f4b9d5f8e8' },
  { name: 'Mysore-palace2', id: 'photo-1580181466048-261ef4200b3d' },
  { name: 'Mysore-palace3', id: 'photo-1596402184320-417e7178b2cd' },

  // Ooty & Kodaikanal
  { name: 'Ooty-lake', id: 'photo-1506744038136-46273834b3fb' },
  { name: 'Kodai-lake', id: 'photo-1470071459604-3b5ec3a7fe05' },
  { name: 'Ooty-hills', id: 'photo-1501785888041-af3ef285b470' },

  // Rameswaram
  { name: 'Rameswaram-bridge1', id: 'photo-1544551763-46a013bb70d5' },
  { name: 'Rameswaram-sea', id: 'photo-1476514525535-07fb3b4ae5f1' }
];

async function checkUrl(item) {
  return new Promise((resolve) => {
    const url = `https://images.unsplash.com/${item.id}?q=80&w=800&auto=format&fit=crop`;
    https.request(url, { method: 'HEAD' }, (r) => {
      resolve({ name: item.name, id: item.id, status: r.statusCode, len: r.headers['content-length'] });
    }).on('error', (e) => resolve({ name: item.name, id: item.id, error: e.message })).end();
  });
}

(async () => {
  for (const c of candidates) {
    const res = await checkUrl(c);
    if (res.status === 200) {
      console.log(`OK: [${res.name}] ${res.id} (${res.len} bytes)`);
    } else {
      console.log(`FAIL ${res.status}: [${res.name}] ${res.id}`);
    }
  }
})();
