const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function run() {
  const db = await open({
    filename: './data/cafe_gestion.db',
    driver: sqlite3.Database
  });

  const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table';");
  console.log(tables.map(t => t.name).join(', '));
  
  // also check if "Titulares" table exists and has these
  const hasTitulares = tables.some(t => t.name === 'Titulares');
  if (hasTitulares) {
    const tit = await db.all("SELECT * FROM Titulares WHERE nombre LIKE '%luis%' OR nombre LIKE '%inspira%' COLLATE NOCASE;");
    console.log("Titulares:", tit);
  }
}
run();
