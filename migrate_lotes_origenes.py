import sqlite3

def run():
    db_path = "web-app/data/cafe_gestion.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create Lotes_Origenes table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Lotes_Origenes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lote_destino_id INTEGER NOT NULL,
        lote_origen_id INTEGER NOT NULL,
        cantidad_kg REAL NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lote_destino_id) REFERENCES Lotes(id) ON DELETE CASCADE,
        FOREIGN KEY (lote_origen_id) REFERENCES Lotes(id) ON DELETE CASCADE
    )
    """)

    conn.commit()
    print("Table Lotes_Origenes created successfully.")

if __name__ == "__main__":
    run()
