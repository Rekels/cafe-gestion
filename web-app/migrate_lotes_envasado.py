import sqlite3
import os

def migrate():
    db_path = os.path.join(os.getcwd(), 'data', 'cafe_gestion.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if lote_id exists in OrdenesEnvasado_Detalle
    cursor.execute("PRAGMA table_info(OrdenesEnvasado_Detalle)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'lote_id' not in columns:
        print("Adding lote_id to OrdenesEnvasado_Detalle")
        cursor.execute("ALTER TABLE OrdenesEnvasado_Detalle ADD COLUMN lote_id INTEGER REFERENCES Lotes(id)")
    else:
        print("lote_id already exists in OrdenesEnvasado_Detalle")

    # Migrate existing data: for each detail, set its lote_id to the parent OrdenesEnvasado's lote_id
    cursor.execute("""
        UPDATE OrdenesEnvasado_Detalle 
        SET lote_id = (SELECT lote_id FROM OrdenesEnvasado WHERE OrdenesEnvasado.id = OrdenesEnvasado_Detalle.orden_envasado_id)
        WHERE lote_id IS NULL
    """)
    
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == '__main__':
    migrate()
