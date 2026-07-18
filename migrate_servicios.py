#!/usr/bin/env python3
import sqlite3
import os

DB_PATH = '/home/rekels/Proyectos/cafe-gestion/web-app/data/cafe_gestion.db'

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # 1. Alter Servicios table
    print("Altering Servicios table...")
    columns = [row[1] for row in cur.execute("PRAGMA table_info(Servicios)").fetchall()]
    
    new_servicios_cols = {
        'seleccion_precio_kg': 'REAL',
        'total_seleccion': 'REAL',
        'envasado_precio_unidad': 'REAL',
        'envasado_cantidad': 'INTEGER',
        'envasado_tipo': 'TEXT',
        'total_envasado': 'REAL'
    }
    
    for col, col_type in new_servicios_cols.items():
        if col not in columns:
            cur.execute(f"ALTER TABLE Servicios ADD COLUMN {col} {col_type}")
            print(f"  Added column: {col}")
            
    # 2. Alter OrdenesTueste table
    print("Altering OrdenesTueste table...")
    ot_columns = [row[1] for row in cur.execute("PRAGMA table_info(OrdenesTueste)").fetchall()]
    if 'servicio_id' not in ot_columns:
        cur.execute("ALTER TABLE OrdenesTueste ADD COLUMN servicio_id INTEGER REFERENCES Servicios(id)")
        print("  Added column: servicio_id")

    # 3. Alter Clientes table
    print("Altering Clientes table...")
    cli_columns = [row[1] for row in cur.execute("PRAGMA table_info(Clientes)").fetchall()]
    
    new_clientes_cols = {
        'default_trillado_precio_kg': 'REAL',
        'default_seleccion_precio_kg': 'REAL',
        'default_tueste_precio_kg': 'REAL',
        'default_molienda_precio_kg': 'REAL',
        'default_envasado_precio_unidad': 'REAL'
    }
    
    for col, col_type in new_clientes_cols.items():
        if col not in cli_columns:
            cur.execute(f"ALTER TABLE Clientes ADD COLUMN {col} {col_type}")
            print(f"  Added column: {col}")

    # 4. Create Ajustes table
    print("Creating Ajustes table...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS Ajustes (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    
    # Seed Ajustes
    default_ajustes = [
        ('global_trillado_precio_kg', '1.00'),
        ('global_seleccion_precio_kg', '1.50'),
        ('global_tueste_precio_kg', '6.00'),
        ('global_molienda_precio_kg', '1.00'),
        ('global_envasado_precio_unidad', '0.50')
    ]
    
    for key, val in default_ajustes:
        cur.execute("INSERT OR IGNORE INTO Ajustes (key, value) VALUES (?, ?)", (key, val))
        
    conn.commit()
    conn.close()
    print("Migration finished successfully.")

if __name__ == '__main__':
    migrate()
