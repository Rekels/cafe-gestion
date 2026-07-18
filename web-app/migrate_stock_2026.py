import csv
import sqlite3
import os
import sys

db_path = 'data/cafe_gestion.db'
csv_path = '../STOCK 2026 - Hoja 1.csv'

def migrate():
    if not os.path.exists(db_path):
        print(f"Error: {db_path} no existe.")
        sys.exit(1)
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Agregar nuevas columnas a la tabla Lotes
    new_columns = [
        ("estado_actual", "TEXT"),
        ("peso_kg", "REAL"),
        ("lote_origen_id", "INTEGER"),
        ("cosecha", "TEXT"),
        ("contenedor", "TEXT")
    ]
    
    for col_name, col_type in new_columns:
        try:
            cursor.execute(f"ALTER TABLE Lotes ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e).lower():
                print(f"Error agregando columna {col_name}: {e}")

    # 2. Desactivar lotes antiguos
    cursor.execute("UPDATE Lotes SET activo = 0 WHERE activo = 1")

    # 3. Leer y procesar CSV
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                propietario = row.get('Propietario', '').strip()
                variedad = row.get('Variedad', '').strip()
                nota = row.get('Nota', '').strip()
                puntaje = row.get('Puntaje', '').strip()
                productor = row.get('Productor', '').strip()
                proceso = row.get('Proceso', '').strip()
                lote_val = row.get('Lote', '').strip()
                cosecha = row.get('Cosecha', '').strip()
                contenedor = row.get('Contenedor', '').strip()
                estado = row.get('Estado', '').strip()
                peso_str = row.get('Peso', '0').strip().replace(',', '.')
                
                try:
                    peso_kg = float(peso_str)
                except ValueError:
                    peso_kg = 0.0

                # Intentar buscar lote de origen para enlazar historial
                cursor.execute("""
                    SELECT id FROM Lotes 
                    WHERE activo = 0 
                      AND propietario LIKE ? 
                      AND variedad LIKE ?
                    LIMIT 1
                """, (f"%{propietario}%", f"%{variedad}%"))
                origen_row = cursor.fetchone()
                lote_origen_id = origen_row[0] if origen_row else None

                # Insertar nuevo lote (contenedor)
                cursor.execute("""
                    INSERT INTO Lotes (
                        n_lote, propietario, variedad, detalle, puntaje_taza, 
                        productor, proceso, cosecha, contenedor, estado_actual, 
                        peso_kg, lote_origen_id, activo, estado
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'Stock Inicial 2026')
                """, (
                    lote_val, propietario, variedad, nota, puntaje,
                    productor, proceso, cosecha, contenedor, estado,
                    peso_kg, lote_origen_id
                ))
    except Exception as e:
        print(f"Error procesando CSV: {e}")
        conn.rollback()
        sys.exit(1)

    # 4. Crear Vista de Inventario Global
    try:
        cursor.execute("DROP VIEW IF EXISTS InventarioGlobal")
        cursor.execute("""
            CREATE VIEW InventarioGlobal AS
            SELECT
                propietario,
                variedad,
                productor,
                proceso,
                cosecha,
                estado_actual,
                SUM(peso_kg) as total_kg,
                COUNT(id) as cantidad_contenedores
            FROM Lotes
            WHERE activo = 1
            GROUP BY propietario, variedad, productor, proceso, cosecha, estado_actual;
        """)
    except Exception as e:
        print(f"Error creando la vista: {e}")
        conn.rollback()
        sys.exit(1)

    conn.commit()
    conn.close()
    print("Migración completada exitosamente.")

if __name__ == '__main__':
    migrate()
