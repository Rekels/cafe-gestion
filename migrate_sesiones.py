import sqlite3

def main():
    conn = sqlite3.connect('web-app/data/cafe_gestion.db')
    cursor = conn.cursor()

    # 1. Crear tabla SesionesTueste
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS SesionesTueste (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha DATE,
        codigo_lote TEXT,
        variedad TEXT,
        productor TEXT,
        proceso TEXT,
        cliente TEXT,
        roaster TEXT,
        target_weight REAL,
        partitions INTEGER,
        moisture REAL,
        density REAL,
        aw REAL,
        referencia_tueste_id INTEGER,
        estado TEXT DEFAULT 'finalizada'
    )
    ''')
    print("Tabla SesionesTueste creada/verificada.")

    # 2. Alterar la tabla Tuestes para añadir sesion_id, estado, es_referencia, nombre_referencia
    # sqlite no soporta múltiples ALTER TABLE en una línea, y si ya existen dará error, así que los envolvemos en try-except individuales.
    new_columns = [
        ("sesion_id", "INTEGER"),
        ("estado", "TEXT DEFAULT 'completado'"),
        ("es_referencia", "INTEGER DEFAULT 0"),
        ("nombre_referencia", "TEXT")
    ]

    for col_name, col_type in new_columns:
        try:
            cursor.execute(f"ALTER TABLE Tuestes ADD COLUMN {col_name} {col_type}")
            print(f"Columna '{col_name}' añadida a Tuestes.")
        except sqlite3.OperationalError:
            print(f"La columna '{col_name}' ya existe en Tuestes.")

    # 3. Limpiar cualquier sesión anterior si se re-migra
    cursor.execute("DELETE FROM SesionesTueste")
    cursor.execute("UPDATE Tuestes SET sesion_id = NULL")

    # 4. Agrupar tuestes existentes por fecha, codigo_lote y cliente para crear sesiones retroactivas
    cursor.execute("SELECT id, fecha, codigo_lote, variedad, productor, proceso, cliente, roaster, b_moist, b_density, aw, gc FROM Tuestes")
    all_tuestes = cursor.fetchall()
    
    # Agrupamos por (fecha, codigo_lote, cliente)
    groups = {}
    for t in all_tuestes:
        t_id, fecha, codigo_lote, variedad, productor, proceso, cliente, roaster, b_moist, b_density, aw, gc = t
        
        # Clave del grupo
        key = (fecha, codigo_lote or '', cliente or '')
        if key not in groups:
            groups[key] = []
        groups[key].append({
            'id': t_id,
            'variedad': variedad,
            'productor': productor,
            'proceso': proceso,
            'roaster': roaster,
            'moisture': b_moist,
            'density': b_density,
            'aw': aw,
            'gc': gc or 0.0
        })

    print(f"Agrupados {len(all_tuestes)} tuestes en {len(groups)} sesiones.")

    # 5. Insertar las sesiones y asociar los tuestes
    for key, items in groups.items():
        fecha, codigo_lote, cliente = key
        
        # Tomar los primeros valores no nulos
        variedad = next((item['variedad'] for item in items if item['variedad']), '')
        productor = next((item['productor'] for item in items if item['productor']), '')
        proceso = next((item['proceso'] for item in items if item['proceso']), '')
        roaster = next((item['roaster'] for item in items if item['roaster']), '')
        
        moisture = next((item['moisture'] for item in items if item['moisture'] is not None), None)
        density = next((item['density'] for item in items if item['density'] is not None), None)
        aw = next((item['aw'] for item in items if item['aw'] is not None), None)
        
        target_weight = sum(item['gc'] for item in items)
        partitions = len(items)

        # Insertar sesión
        cursor.execute('''
        INSERT INTO SesionesTueste (
            fecha, codigo_lote, variedad, productor, proceso, cliente, roaster,
            target_weight, partitions, moisture, density, aw, estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'finalizada')
        ''', (fecha, codigo_lote, variedad, productor, proceso, cliente, roaster,
              target_weight, partitions, moisture, density, aw))
        
        sesion_id = cursor.lastrowid
        
        # Actualizar los tuestes correspondientes
        for idx, item in enumerate(items):
            cursor.execute('''
            UPDATE Tuestes 
            SET sesion_id = ?, batch_n = ?, estado = 'completado'
            WHERE id = ?
            ''', (sesion_id, idx + 1, item['id']))

    conn.commit()
    conn.close()
    print("Migración de Sesiones de Tueste completada exitosamente.")

if __name__ == '__main__':
    main()
