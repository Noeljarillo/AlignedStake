// A simple script to ping search engines about your sitemap
const https = require('https');

const sitemapUrl = 'https://www.starknet-stake.com/sitemap.xml';
const searchEngines = [
  `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
  `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
];

// Function to ping a search engine
function pingSearchEngine(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`✅ Pinged ${url} - Status: ${res.statusCode}`);
        resolve();
      });
    }).on('error', (err) => {
      console.error(`❌ Error pinging ${url}: ${err.message}`);
      reject(err);
    });
  });
}

// Execute pings
async function pingAll() {
  console.log('🔍 Pinging search engines with sitemap URL...');
  
  try {
    await Promise.all(searchEngines.map(pingSearchEngine));
    console.log('✅ All search engines pinged successfully!');
  } catch (error) {
    console.error('❌ There was an error pinging some search engines:', error);
  }
}

pingAll(); 