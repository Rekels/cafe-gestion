import sqlite3
import re

def parse_and_fix_code(code, is_miroshnik=False):
    if not code: return code
    # Fix Miroshnik's ALYA to ISLA specifically
    if is_miroshnik and 'ALYA' in code:
        code = code.replace('ALYA', 'ISLA')

    # Extract the trailing number, handling cases with or without dash before it
    match = re.search(r'(\d+)$', code)
    if not match: return code
    num = match.group(1)
    
    # Remove the number and any trailing dash to get the base parts
    base = code[:match.start()].rstrip('-')
    parts = base.split('-')
    
    if len(parts) == 3:
        # e.g., GE-LA-MACA -> Variedad, Proceso, Productor -> missing Client
        # So it belongs to PANTIWAYTA -> insert 'P'
        return f"{base}-P-{num}"
    elif len(parts) >= 4:
        # e.g., CA-LA-ALYA-MIROSHNIK
        client_part = parts[-1]
        if client_part.upper() == 'PANTIWAYTA':
            parts[-1] = 'P'
            base = '-'.join(parts)
        return f"{base}-{num}"
    else:
        # Weird format, just ensure it has -num
        return f"{base}-{num}"

def main():
    conn = sqlite3.connect('/home/rekels/Proyectos/cafe-gestion/web-app/data/cafe_gestion.db')
    cursor = conn.cursor()

    # 1. Clean empty orders
    cursor.execute("DELETE FROM Servicios WHERE cliente = '#N/A' OR cliente = '' OR cliente IS NULL")
    print(f"Deleted {cursor.rowcount} empty orders.")

    # 2. Fix codes in Lotes
    cursor.execute("SELECT n_lote, codigo_lote FROM Lotes")
    lotes = cursor.fetchall()
    for lote in lotes:
        n_lote, old_code = lote
        if old_code:
            new_code = parse_and_fix_code(old_code)
            if new_code != old_code:
                cursor.execute("UPDATE Lotes SET codigo_lote = ? WHERE n_lote = ?", (new_code, n_lote))

    # 3. Fix codes and ALYA in Servicios
    cursor.execute("SELECT id, codigo_cafe, cliente FROM Servicios")
    servicios = cursor.fetchall()
    for serv in servicios:
        s_id, old_code, cliente = serv
        if old_code:
            is_mir = (cliente and cliente.upper() == 'MIROSHNIK')
            new_code = parse_and_fix_code(old_code, is_mir)
            if new_code != old_code:
                cursor.execute("UPDATE Servicios SET codigo_cafe = ? WHERE id = ?", (new_code, s_id))

    # Also fix Variedad column if it contains the old code
    cursor.execute("SELECT id, variedad, cliente FROM Servicios")
    serv_var = cursor.fetchall()
    for serv in serv_var:
        s_id, old_var, cliente = serv
        if old_var and ('-' in old_var or '1' in old_var): # Looks like a code
            is_mir = (cliente and cliente.upper() == 'MIROSHNIK')
            new_var = parse_and_fix_code(old_var, is_mir)
            if new_var != old_var:
                cursor.execute("UPDATE Servicios SET variedad = ? WHERE id = ?", (new_var, s_id))

    # 4. Create Clientes table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS Clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT UNIQUE,
            telefono TEXT,
            correo TEXT
        )
    """)
    # Populate Clientes
    cursor.execute("SELECT DISTINCT cliente FROM Servicios WHERE cliente IS NOT NULL AND cliente != ''")
    clientes = cursor.fetchall()
    for c in clientes:
        nombre = c[0].strip().upper()
        try:
            cursor.execute("INSERT OR IGNORE INTO Clientes (nombre) VALUES (?)", (nombre,))
        except Exception:
            pass

    conn.commit()
    conn.close()
    print("Database updated successfully.")

if __name__ == '__main__':
    main()
