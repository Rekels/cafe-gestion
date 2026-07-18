#!/usr/bin/env python3
import sqlite3
import os

DB_PATH = '/home/rekels/Proyectos/cafe-gestion/web-app/data/cafe_gestion.db'

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # 1. Alter Clientes table
    print("Altering Clientes table...")
    columns = [row[1] for row in cur.execute("PRAGMA table_info(Clientes)").fetchall()]
    
    if 'empresa' not in columns:
        cur.execute("ALTER TABLE Clientes ADD COLUMN empresa TEXT")
        print("  Added column: empresa")
            
    conn.commit()
    conn.close()
    print("Migration finished successfully.")

if __name__ == '__main__':
    migrate()
