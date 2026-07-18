import sqlite3

def run_migrations():
    conn = sqlite3.connect('data/cafe_gestion.db')
    c = conn.cursor()
    
    try:
        # 1. Rename existing client
        c.execute("UPDATE Clientes SET nombre = 'PANTIWAYTA TOSTADURÍA ENACE' WHERE nombre = 'PANTIWAYTA'")
        
        # 2. Insert new client if not exists
        c.execute("SELECT id FROM Clientes WHERE nombre = 'PANTIWAYTA CAFETERÍA BELLIDO'")
        if not c.fetchone():
            c.execute("INSERT INTO Clientes (nombre) VALUES ('PANTIWAYTA CAFETERÍA BELLIDO')")
        
        # 3. Update text references
        tables_with_cliente = ['Servicios', 'Tuestes', 'SesionesTueste', 'OrdenesTueste', 'Proformas']
        for t in tables_with_cliente:
            c.execute(f"UPDATE {t} SET cliente = 'PANTIWAYTA TOSTADURÍA ENACE' WHERE cliente = 'PANTIWAYTA'")
            
        # 4. Set services to completado
        c.execute("""
            UPDATE Servicios 
            SET estado = 'Completado',
                estado_trillado = 'Completado',
                estado_seleccion = 'Completado',
                estado_tueste = 'Completado',
                estado_molienda = 'Completado'
            WHERE cliente = 'PANTIWAYTA TOSTADURÍA ENACE'
        """)
        
        conn.commit()
        print("Migration successful.")
    except Exception as e:
        conn.rollback()
        print("Error:", e)
    finally:
        conn.close()

run_migrations()
