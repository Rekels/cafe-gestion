const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/cafe_gestion.db');

db.all("SELECT * FROM Servicios WHERE n_orden = '134' OR id = 134", [], (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log(rows);
  }
});
