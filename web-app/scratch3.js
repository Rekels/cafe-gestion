const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function run() {
  const db = await open({
    filename: './data/cafe_gestion.db',
    driver: sqlite3.Database
  });

  const c = await db.all("SELECT * FROM Clientes WHERE nombre LIKE '%luis%' OR nombre LIKE '%inspira%' COLLATE NOCASE;");
  console.log("Clientes rows:", c);
  
  // Unify everything
  await db.run("UPDATE Servicios SET cliente = 'INSPIRA CAFÉ' WHERE cliente = 'LUIS HELADOS'");
  await db.run("UPDATE Tuestes SET cliente = 'INSPIRA CAFÉ' WHERE cliente = 'LUIS HELADOS'");
  await db.run("UPDATE SesionesTueste SET cliente = 'INSPIRA CAFÉ' WHERE cliente = 'LUIS HELADOS'");
  await db.run("UPDATE OrdenesTueste SET cliente = 'INSPIRA CAFÉ' WHERE cliente = 'LUIS HELADOS'");
  await db.run("UPDATE Proformas SET cliente = 'INSPIRA CAFÉ' WHERE cliente = 'LUIS HELADOS'");
  
  // Delete the old client if it exists
  await db.run("DELETE FROM Clientes WHERE nombre = 'LUIS HELADOS'");
  
  console.log("Unified successfully");
}
run();
