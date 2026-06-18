const http = require('http');

http.get('http://localhost:5173/src/services/api.js', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('=== api.js snippet ===');
    const lines = data.split('\n');
    lines.forEach((l, i) => {
      if (l.includes('supabase') || l.includes('VITE_') || l.includes('supabaseUrl')) {
        console.log(i, l.substring(0, 200));
      }
    });
  });
}).on('error', e => {
  // Try to fetch env directly by looking at dev server
  const req2 = http.get('http://localhost:5173/__vite_dev_env', (r2) => {
    let d2 = '';
    r2.on('data', c => d2 += c);
    r2.on('end', () => console.log('env:', d2.substring(0, 500)));
  });
  req2.on('error', e2 => console.log('err2', e2.message));
});
