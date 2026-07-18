import sqlite3
import os

DB_PATH = '/home/rekels/Proyectos/cafe-gestion/web-app/data/cafe_gestion.db'

def alter_equipos():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    columns = [row[1] for row in cur.execute("PRAGMA table_info(Equipos)").fetchall()]
    
    if 'default_temp_ts' not in columns:
        cur.execute("ALTER TABLE Equipos ADD COLUMN default_temp_ts REAL")
    if 'default_temp_fc' not in columns:
        cur.execute("ALTER TABLE Equipos ADD COLUMN default_temp_fc REAL")
    if 'default_temp_end' not in columns:
        cur.execute("ALTER TABLE Equipos ADD COLUMN default_temp_end REAL")
        
    conn.commit()
    print("Equipos table altered successfully.")
    
    # Let's set some default for HGH12 if it exists
    cur.execute("UPDATE Equipos SET default_temp_ts = 150.0 WHERE nombre LIKE '%HGH%' AND default_temp_ts IS NULL")
    conn.commit()
    conn.close()

if __name__ == '__main__':
    alter_equipos()
