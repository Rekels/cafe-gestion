import sqlite3
from datetime import datetime

def run_migration():
    conn = sqlite3.connect('data/cafe_gestion.db')
    cursor = conn.cursor()

    # 1. Alter OrdenesEnvasado to add fecha
    try:
        cursor.execute("ALTER TABLE OrdenesEnvasado ADD COLUMN fecha TEXT")
        print("Added 'fecha' column to OrdenesEnvasado.")
        
        # Populate existing with current date
        current_date = datetime.now().isoformat()
        cursor.execute("UPDATE OrdenesEnvasado SET fecha = ?", (current_date,))
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column 'fecha' already exists in OrdenesEnvasado.")
        else:
            raise e

    # 2. Create Despachos Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS Despachos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente TEXT NOT NULL,
            fecha TEXT NOT NULL,
            n_ticket TEXT,
            notas TEXT
        )
    """)
    print("Created Despachos table.")

    # 3. Create Despachos_Detalle Table
    # It can dispatch either green/roasted coffee (lote_id + tipo_cafe) OR bags (bolsa_id from LotesBolsas)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS Despachos_Detalle (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            despacho_id INTEGER NOT NULL,
            lote_id INTEGER,
            tipo_item TEXT NOT NULL, -- 'cafe' o 'bolsa'
            tipo_cafe TEXT, -- e.g. 'stock_pergamino', 'stock_tostado'
            cantidad_kg REAL,
            bolsa_id INTEGER,
            cantidad_bolsas INTEGER,
            FOREIGN KEY(despacho_id) REFERENCES Despachos(id),
            FOREIGN KEY(lote_id) REFERENCES Lotes(id),
            FOREIGN KEY(bolsa_id) REFERENCES CatalogoBolsas(id)
        )
    """)
    print("Created Despachos_Detalle table.")

    conn.commit()
    conn.close()
    print("Migration completed successfully.")

if __name__ == '__main__':
    run_migration()
