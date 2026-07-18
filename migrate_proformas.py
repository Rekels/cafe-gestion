#!/usr/bin/env python3
import sqlite3
import os

DB_PATH = '/home/rekels/Proyectos/cafe-gestion/web-app/data/cafe_gestion.db'

def migrate():
    print("Starting Proformas database migration...")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # 1. Create Proformas table
    print("Creating Proformas table...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS Proformas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            n_proforma TEXT UNIQUE,
            cliente TEXT NOT NULL,
            fecha_emision DATE NOT NULL,
            fecha_vencimiento DATE,
            subtotal REAL NOT NULL,
            descuento REAL DEFAULT 0.0,
            total REAL NOT NULL,
            estado TEXT DEFAULT 'Borrador',
            notas TEXT
        )
    """)
    
    # 2. Create ProformaConceptos table
    print("Creating ProformaConceptos table...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS ProformaConceptos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            proforma_id INTEGER REFERENCES Proformas(id) ON DELETE CASCADE,
            descripcion TEXT NOT NULL,
            cantidad REAL NOT NULL,
            precio_unitario REAL NOT NULL,
            total REAL NOT NULL
        )
    """)
    
    # 3. Create ConceptosPredefinidos table
    print("Creating ConceptosPredefinidos table...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS ConceptosPredefinidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL UNIQUE,
            precio_defecto REAL NOT NULL
        )
    """)
    
    # Seed ConceptosPredefinidos
    print("Seeding ConceptosPredefinidos...")
    default_conceptos = [
        ("TRANSPORTE", 20.00),
        ("BOLSA DE 250G", 0.50),
        ("BOLSA DE 500G", 0.70),
        ("BOLSA DE 1KG", 1.00)
    ]
    for nombre, precio in default_conceptos:
        cur.execute("INSERT OR IGNORE INTO ConceptosPredefinidos (nombre, precio_defecto) VALUES (?, ?)", (nombre, precio))
        
    # Seed default Ajustes for corporate header
    print("Seeding corporate header settings...")
    default_ajustes = [
        ("empresa_nombre", "PANTIWAYTA TOSTADURÍA"),
        ("empresa_ruc", "12345678901"),
        ("empresa_direccion", "Calle Principal N° 123"),
        ("empresa_telefono", "+51 987 654 321"),
        ("empresa_correo", "hola@pantiwayta.com")
    ]
    for key, val in default_ajustes:
        cur.execute("INSERT OR IGNORE INTO Ajustes (key, value) VALUES (?, ?)", (key, val))

    # 4. Alter Servicios table to add proforma_id
    print("Altering Servicios table...")
    columns = [row[1] for row in cur.execute("PRAGMA table_info(Servicios)").fetchall()]
    if 'proforma_id' not in columns:
        cur.execute("ALTER TABLE Servicios ADD COLUMN proforma_id INTEGER REFERENCES Proformas(id) ON DELETE SET NULL")
        print("  Added column proforma_id to Servicios table")
    else:
        print("  Column proforma_id already exists in Servicios table")
        
    conn.commit()
    conn.close()
    print("Proformas migration finished successfully.")

if __name__ == '__main__':
    migrate()
