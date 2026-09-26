const fs = require('fs');
['mobile/src/components/ExportHistoryModal.tsx', 'mobile/src/screens/history/RideDetailHistoryScreen.tsx', 'mobile/src/screens/profile/DriverPublicProfileScreen.tsx', 'mobile/src/screens/profile/PassengerPublicProfileScreen.tsx'].forEach(f => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/\\\$/g, '$');
    c = c.replace(/\\`/g, '`');
    c = c.replace(/dY _/g, '`');
    fs.writeFileSync(f, c);
  }
});
