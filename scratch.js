const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function run() {
  const db = await open({
    filename: './cafe_gestion.db',
    driver: sqlite3.Database
  });

  const clientes = await db.all("SELECT id, nombre, empresa FROM Clientes WHERE nombre LIKE '%luis%' OR nombre LIKE '%inspira%' COLLATE NOCASE;");
  console.log("Clientes:", clientes);

  // Unify 'Luis' into 'Inspira' (or vice-versa). Let's see what we have first.
}
run();
