const fs = require('fs');
['mobile/src/hooks/useRideChat.ts'].forEach(f => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/\\\$/g, '$');
    c = c.replace(/\\`/g, '`');
    c = c.replace(/dY _/g, '`');
    fs.writeFileSync(f, c);
  }
});
