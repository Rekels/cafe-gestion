import csv
import sqlite3
import re
from datetime import datetime

def clean_number(val):
    if not val: return None
    val = val.replace('%', '').strip()
    if not val or val in ('#DIV/0!', '#N/A', '#REF!', '-'): return None
    # For German/Spanish Excel commas
    val = val.replace(',', '.')
    try:
        return float(val)
    except:
        return val

def parse_date(date_str):
    if not date_str: return None
    try:
        # e.g., 5/01/2026 or 05/01/2026
        dt = datetime.strptime(date_str.strip(), '%d/%m/%Y')
        return dt.strftime('%Y-%m-%d')
    except:
        try:
            # Maybe yyyy-mm-dd already
            dt = datetime.strptime(date_str.strip(), '%Y-%m-%d')
            return dt.strftime('%Y-%m-%d')
        except:
            return date_str

def main():
    conn = sqlite3.connect('web-app/data/cafe_gestion.db')
    cursor = conn.cursor()

    # 1. Alter Lotes table to add stock_tostado
    try:
        cursor.execute("ALTER TABLE Lotes ADD COLUMN stock_tostado REAL DEFAULT 0.0")
        print("Columna stock_tostado añadida a Lotes.")
    except sqlite3.OperationalError:
        print("La columna stock_tostado ya existe en Lotes.")

    # Initialize stock_tostado with historical rc values
    cursor.execute("UPDATE Lotes SET stock_tostado = COALESCE(rc, 0.0) WHERE stock_tostado = 0.0")
    print("Inicializado stock_tostado de Lotes con datos de rc histórico.")

    # 2. Create Tuestes table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Tuestes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        n_orden TEXT,
        batch_n INTEGER,
        codigo TEXT,
        fecha DATE,
        variedad TEXT,
        productor TEXT,
        proceso TEXT,
        codigo_lote TEXT,
        detalle TEXT,
        cliente TEXT,
        roaster TEXT,
        e_temp REAL,
        e_moist REAL,
        b_moist REAL,
        b_density REAL,
        aw REAL,
        gc REAL,
        rc REAL,
        lw_percent REAL,
        t_cooling TEXT,
        ph REAL,
        potencia_inicial INTEGER,
        t_tp TEXT,
        temp_tp REAL,
        t_ts TEXT,
        temp_ts REAL,
        t_fc TEXT,
        temp_fc REAL,
        t_t TEXT,
        temp_end REAL,
        auc REAL,
        agtron REAL,
        t_dev TEXT,
        temp_dev REAL,
        dry_percent REAL,
        mai_percent REAL,
        dev_percent REAL,
        m_dry REAL,
        m_mai REAL,
        m_dev REAL
    )
    ''')
    print("Tabla Tuestes creada/verificada.")

    # Clear existing tuestes to avoid duplicates on re-migration
    cursor.execute("DELETE FROM Tuestes")

    # 3. Read CONTROL TUESTES 2026 - PLAN DE TUESTE.csv
    count = 0
    with open('CONTROL TUESTES 2026 - PLAN DE TUESTE.csv', encoding='utf-8') as f:
        reader = csv.reader(f)
        # First row is header
        header = next(reader)
        
        for row in reader:
            if len(row) < 19: continue
            
            # Identify if it is a valid row (must have a date and green coffee weight or batch number)
            fecha = parse_date(row[3])
            gc = clean_number(row[16])
            rc = clean_number(row[17])
            variedad = row[4].strip()
            
            # Skip empty formatting rows
            if not fecha and not gc and not variedad:
                continue
            
            n_orden = row[0].strip() if row[0].strip() else None
            batch_n = clean_number(row[1])
            codigo = row[2].strip() if row[2].strip() else None
            productor = row[5].strip()
            proceso = row[6].strip()
            codigo_lote = row[7].strip()
            detalle = row[8].strip()
            cliente = row[9].strip()
            roaster = row[10].strip()
            
            e_temp = clean_number(row[11])
            e_moist = clean_number(row[12])
            b_moist = clean_number(row[13])
            b_density = clean_number(row[14])
            aw = clean_number(row[15])
            if aw is not None:
                # The CSV AW column is AWx1000, so we convert it back to actual water activity (0.0 - 1.0)
                aw = aw / 1000.0 if aw > 1.0 else aw
                
            lw_percent = clean_number(row[18])
            t_cooling = row[19].strip() if len(row) > 19 else None
            ph = clean_number(row[20]) if len(row) > 20 else None
            potencia_inicial = clean_number(row[21]) if len(row) > 21 else None
            
            t_tp = row[22].strip() if len(row) > 22 else None
            temp_tp = clean_number(row[23]) if len(row) > 23 else None
            t_ts = row[24].strip() if len(row) > 24 else None
            temp_ts = clean_number(row[25]) if len(row) > 25 else None
            t_fc = row[26].strip() if len(row) > 26 else None
            temp_fc = clean_number(row[27]) if len(row) > 27 else None
            t_t = row[28].strip() if len(row) > 28 else None
            temp_end = clean_number(row[29]) if len(row) > 29 else None
            auc = clean_number(row[30]) if len(row) > 30 else None
            agtron = clean_number(row[31]) if len(row) > 31 else None
            
            t_dev = row[33].strip() if len(row) > 33 else None
            temp_dev = clean_number(row[34]) if len(row) > 34 else None
            
            dry_percent = clean_number(row[36]) if len(row) > 36 else None
            mai_percent = clean_number(row[37]) if len(row) > 37 else None
            dev_percent = clean_number(row[38]) if len(row) > 38 else None
            
            m_dry = clean_number(row[40]) if len(row) > 40 else None
            m_mai = clean_number(row[41]) if len(row) > 41 else None
            m_dev = clean_number(row[42]) if len(row) > 42 else None

            # Clean/fix code formatting for consistency
            if codigo_lote:
                # We reuse our standard parsing logic from update_db.py
                import re
                match = re.search(r'(\d+)$', codigo_lote)
                if match:
                    num = match.group(1)
                    base = codigo_lote[:match.start()].rstrip('-')
                    parts = base.split('-')
                    if len(parts) == 3:
                        codigo_lote = f"{base}-P-{num}"
                    elif len(parts) >= 4:
                        client_part = parts[-1]
                        if client_part.upper() == 'PANTIWAYTA':
                            parts[-1] = 'P'
                            base = '-'.join(parts)
                        codigo_lote = f"{base}-{num}"

            cursor.execute('''
            INSERT INTO Tuestes (
                n_orden, batch_n, codigo, fecha, variedad, productor, proceso, codigo_lote,
                detalle, cliente, roaster, e_temp, e_moist, b_moist, b_density, aw, gc, rc,
                lw_percent, t_cooling, ph, potencia_inicial, t_tp, temp_tp, t_ts, temp_ts,
                t_fc, temp_fc, t_t, temp_end, auc, agtron, t_dev, temp_dev, dry_percent,
                mai_percent, dev_percent, m_dry, m_mai, m_dev
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (n_orden, batch_n, codigo, fecha, variedad, productor, proceso, codigo_lote,
                  detalle, cliente, roaster, e_temp, e_moist, b_moist, b_density, aw, gc, rc,
                  lw_percent, t_cooling, ph, potencia_inicial, t_tp, temp_tp, t_ts, temp_ts,
                  t_fc, temp_fc, t_t, temp_end, auc, agtron, t_dev, temp_dev, dry_percent,
                  mai_percent, dev_percent, m_dry, m_mai, m_dev))
            count += 1

    conn.commit()
    conn.close()
    print(f"Migración completada. Se insertaron {count} registros de tueste.")

if __name__ == '__main__':
    main()
