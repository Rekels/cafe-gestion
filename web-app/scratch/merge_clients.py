import sqlite3
import sys

def main():
    db_path = 'data/cafe_gestion.db'
    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # 1. Update string names across tables
    tables_with_cliente_string = ['Servicios', 'Proformas', 'OrdenesTueste', 'Tuestes']
    for table in tables_with_cliente_string:
        try:
            cur.execute(f"UPDATE {table} SET cliente = 'INSPIRA CAFÉ' WHERE cliente IN ('INSPIRA', 'LUIS')")
            print(f"Updated {cur.rowcount} rows in {table} (cliente string)")
        except sqlite3.OperationalError as e:
            print(f"Skipping {table}: {e}")
            
    # Lotes uses propietario
    try:
        cur.execute("UPDATE Lotes SET propietario = 'INSPIRA CAFÉ' WHERE propietario IN ('INSPIRA', 'LUIS')")
        print(f"Updated {cur.rowcount} rows in Lotes (propietario string)")
    except sqlite3.OperationalError as e:
        print(f"Skipping Lotes (propietario): {e}")

    # 2. Get existing IDs for 'LUIS', 'INSPIRA', and 'INSPIRA CAFÉ'
    cur.execute("SELECT id, nombre FROM Clientes WHERE nombre IN ('LUIS', 'INSPIRA', 'INSPIRA CAFÉ')")
    clients = cur.fetchall()
    
    if not clients:
        print("No matching clients found to merge.")
        return

    # 3. Resolve target ID (INSPIRA CAFÉ or INSPIRA)
    target_id = None
    target_name = 'INSPIRA CAFÉ'
    
    # Check if target exists
    cur.execute("SELECT id FROM Clientes WHERE nombre = 'INSPIRA CAFÉ'")
    row = cur.fetchone()
    if row:
        target_id = row[0]
    else:
        # Check if INSPIRA exists and rename it
        cur.execute("SELECT id FROM Clientes WHERE nombre = 'INSPIRA'")
        row = cur.fetchone()
        if row:
            target_id = row[0]
            cur.execute("UPDATE Clientes SET nombre = 'INSPIRA CAFÉ' WHERE id = ?", (target_id,))
            print("Renamed INSPIRA to INSPIRA CAFÉ")
        else:
            # Create INSPIRA CAFÉ
            cur.execute("INSERT INTO Clientes (nombre) VALUES ('INSPIRA CAFÉ')")
            target_id = cur.lastrowid
            print("Created new INSPIRA CAFÉ client")
            
    # 4. Migrate IDs
    ids_to_merge = [c[0] for c in clients if c[0] != target_id]
    
    if ids_to_merge:
        placeholders = ','.join('?' * len(ids_to_merge))
        
        tables_with_cliente_id = ['Servicios'] # 'Lotes' might have cliente_id if it exists
        
        for table in tables_with_cliente_id:
            try:
                # Assuming the column is cliente_id
                cur.execute(f"PRAGMA table_info({table})")
                cols = [col[1] for col in cur.fetchall()]
                if 'cliente_id' in cols:
                    cur.execute(f"UPDATE {table} SET cliente_id = ? WHERE cliente_id IN ({placeholders})", [target_id] + ids_to_merge)
                    print(f"Migrated {cur.rowcount} rows in {table} to ID {target_id}")
            except Exception as e:
                pass
                
        # 5. Delete old clients
        cur.execute(f"DELETE FROM Clientes WHERE id IN ({placeholders})", ids_to_merge)
        print(f"Deleted old clients: {ids_to_merge}")
        
    conn.commit()
    print("Merge completed.")

if __name__ == '__main__':
    main()
