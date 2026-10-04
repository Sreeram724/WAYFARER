const { db } = require('./db.js');
console.log("=== PACKAGES ===");
const pkgs = db.prepare("SELECT id, name, destination_name, image_url, highlights, itinerary FROM packages").all();
pkgs.forEach(p => {
  console.log(`PKG ${p.id}: ${p.name} | Dest: ${p.destination_name}`);
  console.log(`  Img: ${p.image_url}`);
  console.log(`  Highlights: ${p.highlights}`);
  console.log(`  Itinerary (snippet): ${p.itinerary ? p.itinerary.substring(0, 140).replace(/\n/g, ' ') : ''}`);
});

console.log("\n=== DESTINATIONS ===");
const dests = db.prepare("SELECT id, name, region, image_url, description FROM destinations").all();
dests.forEach(d => {
  console.log(`DEST ${d.id}: ${d.name} (${d.region}) => ${d.image_url}`);
});
