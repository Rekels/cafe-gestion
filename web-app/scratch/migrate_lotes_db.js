const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');

async function migrate() {
  const db = await open({ filename: 'data/cafe_gestion.db', driver: sqlite3.Database });
  
  console.log("Iniciando migración...");

  // 1. Alter Lotes table
  try {
    await db.exec(`ALTER TABLE Lotes ADD COLUMN estado TEXT DEFAULT 'Desconocido'`);
    await db.exec(`ALTER TABLE Lotes ADD COLUMN detalles_analisis TEXT`);
  } catch (e) {
    console.log("Columnas ya existen o hubo error:", e.message);
  }

  // 2. Create Transacciones_Lote
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Transacciones_Lote (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lote_id INTEGER REFERENCES Lotes(id),
      servicio_id INTEGER REFERENCES Servicios(id),
      tipo_movimiento TEXT,
      cantidad_kg REAL,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Modificar Servicios: Añadir columnas de estado de fase (ya que vamos a cierre progresivo)
  try {
    await db.exec(`ALTER TABLE Servicios ADD COLUMN estado_trillado TEXT DEFAULT 'pendiente'`);
    await db.exec(`ALTER TABLE Servicios ADD COLUMN estado_seleccion TEXT DEFAULT 'pendiente'`);
    await db.exec(`ALTER TABLE Servicios ADD COLUMN estado_tueste TEXT DEFAULT 'pendiente'`);
    await db.exec(`ALTER TABLE Servicios ADD COLUMN estado_molienda TEXT DEFAULT 'pendiente'`);
  } catch(e) {
    console.log("Columnas de estado en Servicios ya existen:", e.message);
  }

  // 4. Migrar Datos
  const servicios = await db.all('SELECT * FROM Servicios');
  const lotes = await db.all('SELECT * FROM Lotes');
  let loteIdCounter = Math.max(...lotes.map(l => l.id)) + 1;

  for (const lote of lotes) {
    // Si tiene stock_pergamino > 0 o pc > 0 en algun servicio asociado, asumimos que ingresó como Pergamino.
    // Si no, si tiene gc > 0, ingresó como Verde.
    const servs = servicios.filter(s => s.lote_id === lote.id);
    const hasPergamino = servs.some(s => s.pc > 0) || lote.stock_pergamino > 0;
    
    let initialState = hasPergamino ? 'Pergamino' : 'Oro verde sin seleccionar';
    await db.run(`UPDATE Lotes SET estado = ? WHERE id = ?`, [initialState, lote.id]);
  }

  // Procesar Transacciones por Servicio
  for (const s of servicios) {
    if (!s.lote_id) continue;
    
    let currentLoteId = s.lote_id;
    let initialState = (await db.get(`SELECT estado FROM Lotes WHERE id = ?`, s.lote_id)).estado;
    let currentVerdeId = null;

    // Si hubo Trillado
    if (s.pc > 0) {
      // Salida de Pergamino
      await db.run(`INSERT INTO Transacciones_Lote (lote_id, servicio_id, tipo_movimiento, cantidad_kg, fecha) VALUES (?, ?, ?, ?, ?)`, 
        [currentLoteId, s.id, 'trillado_in', -s.pc, s.fecha_trillado || new Date().toISOString()]);
      
      // Crear Lote Verde Resultante
      if (s.hc > 0) {
        const originalLote = await db.get(`SELECT * FROM Lotes WHERE id = ?`, currentLoteId);
        await db.run(`
          INSERT INTO Lotes (n_lote, variedad, proceso, productor, codigo_productor, propietario, cliente_id, codigo_lote, estado)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [originalLote.n_lote, originalLote.variedad, originalLote.proceso, originalLote.productor, originalLote.codigo_productor, originalLote.propietario, originalLote.cliente_id, originalLote.codigo_lote + '-V', 'Oro verde sin seleccionar']);
        
        const res = await db.get(`SELECT last_insert_rowid() as id`);
        currentVerdeId = res.id;

        // Entrada Verde
        await db.run(`INSERT INTO Transacciones_Lote (lote_id, servicio_id, tipo_movimiento, cantidad_kg, fecha) VALUES (?, ?, ?, ?, ?)`, 
          [currentVerdeId, s.id, 'trillado_out', s.hc, s.fecha_trillado || new Date().toISOString()]);
      }
      await db.run(`UPDATE Servicios SET estado_trillado = 'completado' WHERE id = ?`, s.id);
    }

    // Identificar de donde viene el Verde para el Tueste
    let loteParaTueste = currentVerdeId; 
    if (!loteParaTueste && initialState === 'Oro verde sin seleccionar') {
      loteParaTueste = currentLoteId;
    }

    // Si hubo Tueste
    if (s.gc > 0 && loteParaTueste) {
      await db.run(`INSERT INTO Transacciones_Lote (lote_id, servicio_id, tipo_movimiento, cantidad_kg, fecha) VALUES (?, ?, ?, ?, ?)`, 
        [loteParaTueste, s.id, 'tueste_in', -s.gc, s.fecha_tueste || new Date().toISOString()]);
      
      if (s.rc > 0) {
        const originalLote = await db.get(`SELECT * FROM Lotes WHERE id = ?`, loteParaTueste);
        await db.run(`
          INSERT INTO Lotes (n_lote, variedad, proceso, productor, codigo_productor, propietario, cliente_id, codigo_lote, estado)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [originalLote.n_lote, originalLote.variedad, originalLote.proceso, originalLote.productor, originalLote.codigo_productor, originalLote.propietario, originalLote.cliente_id, originalLote.codigo_lote + '-T', 'Café tostado']);
        
        const res = await db.get(`SELECT last_insert_rowid() as id`);
        let tostadoId = res.id;

        await db.run(`INSERT INTO Transacciones_Lote (lote_id, servicio_id, tipo_movimiento, cantidad_kg, fecha) VALUES (?, ?, ?, ?, ?)`, 
          [tostadoId, s.id, 'tueste_out', s.rc, s.fecha_tueste || new Date().toISOString()]);
      }
      await db.run(`UPDATE Servicios SET estado_tueste = 'completado' WHERE id = ?`, s.id);
    }
  }

  console.log("Migración completada exitosamente.");
}

migrate().catch(console.error);
