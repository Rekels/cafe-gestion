import sqlite3

def main():
    conn = sqlite3.connect('web-app/data/cafe_gestion.db')
    cursor = conn.cursor()

    # Get all servicios where it looks like data is shifted
    cursor.execute("SELECT id, variedad, proceso, productor, codigo_cafe FROM Servicios")
    servicios = cursor.fetchall()

    for s in servicios:
        s_id, s_var, s_proc, s_prod, s_cod = s
        
        # If the 'variedad' looks like a code (e.g. CA-LA-... or BL-LA-...)
        # and 'proceso' looks like a variety (BLEND, CATIMOR, etc)
        is_shifted = False
        if s_var and ('-' in s_var or s_var == 'NN'):
            if s_proc and s_proc.upper() in ['BLEND', 'CATIMOR', 'GEISHA', 'BOURBON', 'OBATA', 'PACAMARA', 'CATURRA', 'TIPICA', 'GRAN COLOMBIA', 'NATURAL', 'LAVADO']:
                is_shifted = True
                
        # Some are just NN and shifted
        if s_prod and s_prod.upper() in ['LAVADO', 'NATURAL', 'HONEY']:
            is_shifted = True

        if is_shifted:
            # Let's try to find the correct data from Lotes
            # The actual code might be in s_var or s_cod
            search_code = s_var if '-' in s_var else s_cod
            
            cursor.execute("SELECT variedad, proceso, productor FROM Lotes WHERE codigo_lote = ?", (search_code,))
            lote = cursor.fetchone()
            
            if lote:
                correct_var, correct_proc, correct_prod = lote
                print(f"Fixing Order ID {s_id}: {s_var} -> {correct_var}, {s_proc} -> {correct_proc}")
                cursor.execute("""
                    UPDATE Servicios 
                    SET variedad = ?, proceso = ?, productor = ?, codigo_cafe = ?
                    WHERE id = ?
                """, (correct_var, correct_proc, correct_prod, search_code, s_id))
            else:
                # If not found in Lotes, manually shift what we have
                print(f"Manual shift for Order ID {s_id}: var={s_var}, proc={s_proc}, prod={s_prod}")
                correct_cod = s_var
                correct_var = s_proc
                correct_proc = s_prod
                correct_prod = 'NN' # We lost it
                cursor.execute("""
                    UPDATE Servicios 
                    SET variedad = ?, proceso = ?, productor = ?, codigo_cafe = ?
                    WHERE id = ?
                """, (correct_var, correct_proc, correct_prod, correct_cod, s_id))

    conn.commit()
    conn.close()
    print("Datos corregidos.")

if __name__ == '__main__':
    main()
