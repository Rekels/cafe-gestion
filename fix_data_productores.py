import sqlite3

def run():
    db_path = "web-app/data/cafe_gestion.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Update the specific lote (ID 147) that the user pointed out
    cursor.execute("UPDATE Lotes SET productor = 'ISAIAS LAGOS' WHERE id = 147")

    # 2. Update catalog name for MAXIMO
    cursor.execute("UPDATE Productores SET nombre = 'MAXIMO CASTILLO BORDA' WHERE nombre = 'MAXIMO'")

    # 3. Fetch all distinct producers currently in Productores
    cursor.execute("SELECT nombre FROM Productores")
    existing_catalog = {row[0].strip().upper() for row in cursor.fetchall()}

    # Mapping of variations in Lotes to their canonical catalog name
    # We will build this mapping by going through all distinct producers in Lotes
    cursor.execute("SELECT DISTINCT productor FROM Lotes WHERE productor IS NOT NULL")
    all_lotes_producers = [row[0] for row in cursor.fetchall()]

    canonical_map = {
        'Abel VIlcas': 'ABEL VILCAS',
        'Abel Vilcas': 'ABEL VILCAS',
        'Alex Miroshnik': 'ALEX MIROSHNIK',
        'Alfonso Huayta Aguilar': 'ALFONSO HUAYTA AGUILAR',
        'Alfonso Yaranga': 'ALFONSO YARANGA',
        'Anselmo': 'ANSELMO',
        'Gregorio Huaraca': 'GREGORIO HUARACA',
        'Isaias Lagos': 'ISAIAS LAGOS',
        'Javier': 'JAVIER',
        'Maximo Castillo': 'MAXIMO CASTILLO BORDA',
        'NN': 'NN',
        'Noe Soto, Isaías Lagos': 'NOE SOTO, ISAÍAS LAGOS',
        'Teodosio': 'TEODOCIO CCOYCCA SALAZAR',
    }
    
    # Fill in any others not in the active list but present historically
    for p in all_lotes_producers:
        if p not in canonical_map:
            # Default to uppercase string
            canonical_map[p] = p.strip().upper()

    # Apply some specific manual corrections to the canonical map for historical variations just in case
    for k, v in canonical_map.items():
        if v == 'MAXIMO':
            canonical_map[k] = 'MAXIMO CASTILLO BORDA'
        elif v == 'TEODOSIO':
            canonical_map[k] = 'TEODOCIO CCOYCCA SALAZAR'

    # Insert missing canonical producers into Productores catalog
    # We need to compute an abbreviation for them (first 4 letters)
    for k, canonical_name in canonical_map.items():
        if canonical_name not in existing_catalog and canonical_name != '':
            print(f"Adding new producer to catalog: {canonical_name}")
            abreviatura = canonical_name[:4].upper()
            cursor.execute(
                "INSERT INTO Productores (nombre, notas, abreviatura) VALUES (?, ?, ?)",
                (canonical_name, 'Importado automáticamente', abreviatura)
            )
            existing_catalog.add(canonical_name)

    # 4. Update all lotes to use the canonical name
    for original_name, canonical_name in canonical_map.items():
        cursor.execute("UPDATE Lotes SET productor = ? WHERE productor = ?", (canonical_name, original_name))

    conn.commit()
    print("Database updated successfully.")

if __name__ == "__main__":
    run()
