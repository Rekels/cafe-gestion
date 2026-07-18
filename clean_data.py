import csv
import sqlite3
import re
from datetime import datetime

def clean_number(val):
    if not val: return None
    # Remove currency, spaces, %
    val = val.replace('S/.', '').replace('%', '').strip()
    if not val or val == '#DIV/0!' or val == '#N/A': return None
    # Convert comma to dot for floats
    val = val.replace(',', '.')
    try:
        return float(val)
    except:
        return val

def parse_date(date_str):
    if not date_str: return None
    try:
        # e.g., 5/01/2026
        dt = datetime.strptime(date_str.strip(), '%d/%m/%Y')
        return dt.strftime('%Y-%m-%d')
    except:
        return date_str

def main():
    conn = sqlite3.connect('cafe_gestion.db')
    cursor = conn.cursor()

    # Create tables
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Servicios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        n_orden TEXT,
        cliente TEXT,
        variedad TEXT,
        proceso TEXT,
        productor TEXT,
        codigo_cafe TEXT,
        m_percent REAL,
        aw REAL,
        d REAL,
        fecha_trillado DATE,
        pc REAL,
        t_percent REAL,
        hc REAL,
        trillado_precio_kg REAL,
        total_trillado REAL,
        s_percent REAL,
        fecha_tueste DATE,
        gc REAL,
        r_percent REAL,
        rc REAL,
        tueste_precio_kg REAL,
        total_tueste REAL,
        grc REAL,
        molienda_precio_kg REAL,
        total REAL,
        estado TEXT,
        detalle TEXT
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Lotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        n_lote TEXT,
        variedad TEXT,
        proceso TEXT,
        productor TEXT,
        codigo_productor TEXT,
        propietario TEXT,
        orden TEXT,
        horas TEXT,
        puntaje_taza TEXT,
        detalle TEXT,
        precio REAL,
        codigo_lote TEXT,
        pc REAL,
        hc REAL,
        gc REAL,
        rc REAL,
        oro_verde_real REAL,
        stock_real REAL,
        ajuste_stock REAL
    )
    ''')

    # Read Servicios
    with open('CONTROL CAFES V3 - SERVICIOS.csv', encoding='utf-8') as f:
        reader = csv.reader(f)
        # Skip header rows (first 2 rows)
        next(reader)
        next(reader)
        
        for row in reader:
            if len(row) < 27: continue
            
            n_orden = row[0].strip()
            if not n_orden or n_orden == '#N/A': continue
            
            cliente = row[1].strip()
            variedad = row[2].strip()
            proceso = row[3].strip()
            productor = row[4].strip()
            codigo_cafe = row[5].strip()
            
            m_percent = clean_number(row[6])
            aw = clean_number(row[7])
            d = clean_number(row[8])
            
            fecha_trillado = parse_date(row[9])
            pc = clean_number(row[10])
            t_percent = clean_number(row[11])
            hc = clean_number(row[12])
            trillado_precio = clean_number(row[13])
            total_trillado = clean_number(row[14])
            
            s_percent = clean_number(row[15])
            
            fecha_tueste = parse_date(row[16])
            gc = clean_number(row[17])
            r_percent = clean_number(row[18])
            rc = clean_number(row[19])
            tueste_precio = clean_number(row[20])
            total_tueste = clean_number(row[21])
            
            grc = clean_number(row[22])
            molienda_precio = clean_number(row[23])
            
            total = clean_number(row[24])
            estado = row[25].strip()
            detalle = row[26].strip()

            cursor.execute('''
            INSERT INTO Servicios (
                n_orden, cliente, variedad, proceso, productor, codigo_cafe,
                m_percent, aw, d, fecha_trillado, pc, t_percent, hc,
                trillado_precio_kg, total_trillado, s_percent, fecha_tueste,
                gc, r_percent, rc, tueste_precio_kg, total_tueste, grc,
                molienda_precio_kg, total, estado, detalle
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (n_orden, cliente, variedad, proceso, productor, codigo_cafe,
                  m_percent, aw, d, fecha_trillado, pc, t_percent, hc,
                  trillado_precio, total_trillado, s_percent, fecha_tueste,
                  gc, r_percent, rc, tueste_precio, total_tueste, grc,
                  molienda_precio, total, estado, detalle))

    # Read Codigos (Lotes)
    with open('CONTROL CAFES V3 - CODIGOS.csv', encoding='utf-8') as f:
        reader = csv.reader(f)
        # Skip header
        next(reader)
        for row in reader:
            if not row or not row[0].strip() or row[0].strip() == '---': continue
            
            n_lote = row[0].strip()
            variedad = row[1].strip()
            proceso = row[2].strip()
            productor = row[3].strip()
            codigo_productor = row[4].strip()
            propietario = row[5].strip()
            orden = row[6].strip()
            horas = row[7].strip()
            puntaje_taza = row[8].strip()
            detalle = row[9].strip()
            precio = clean_number(row[10])
            codigo_lote = row[11].strip()
            
            # The columns in CODIGOS are: PC, HC, GC, RC, empty, ORO VERDE REAL
            pc = clean_number(row[12]) if len(row) > 12 else None
            hc = clean_number(row[13]) if len(row) > 13 else None
            gc = clean_number(row[14]) if len(row) > 14 else None
            rc = clean_number(row[15]) if len(row) > 15 else None
            oro_verde = clean_number(row[17]) if len(row) > 17 else None
            
            # Additional columns for stock logic adjustment
            stock_real = oro_verde if oro_verde else 0
            ajuste_stock = 0

            cursor.execute('''
            INSERT INTO Lotes (
                n_lote, variedad, proceso, productor, codigo_productor, propietario,
                orden, horas, puntaje_taza, detalle, precio, codigo_lote,
                pc, hc, gc, rc, oro_verde_real, stock_real, ajuste_stock
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (n_lote, variedad, proceso, productor, codigo_productor, propietario,
                  orden, horas, puntaje_taza, detalle, precio, codigo_lote,
                  pc, hc, gc, rc, oro_verde, stock_real, ajuste_stock))

    conn.commit()
    conn.close()
    print("Base de datos creada exitosamente.")

if __name__ == '__main__':
    main()
