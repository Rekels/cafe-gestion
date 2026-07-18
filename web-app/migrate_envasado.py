import sqlite3

def run_migration():
    conn = sqlite3.connect('data/cafe_gestion.db')
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS CatalogoBolsas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            capacidad_g INTEGER NOT NULL,
            tipo_material TEXT,
            stock_disponible INTEGER DEFAULT 0,
            precio_costo REAL
        );

        CREATE TABLE IF NOT EXISTS LotesBolsas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lote_id INTEGER NOT NULL,
            bolsa_id INTEGER NOT NULL,
            cantidad_en_almacen INTEGER DEFAULT 0,
            estado_grano TEXT NOT NULL,
            FOREIGN KEY(lote_id) REFERENCES Lotes(id),
            FOREIGN KEY(bolsa_id) REFERENCES CatalogoBolsas(id)
        );

        CREATE TABLE IF NOT EXISTS OrdenesEnvasado (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            servicio_id INTEGER,
            lote_id INTEGER,
            estado TEXT DEFAULT 'Planeado',
            notas TEXT,
            FOREIGN KEY(servicio_id) REFERENCES Servicios(id),
            FOREIGN KEY(lote_id) REFERENCES Lotes(id)
        );

        CREATE TABLE IF NOT EXISTS PaquetesEnvio (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orden_envasado_id INTEGER NOT NULL,
            nombre_paquete TEXT NOT NULL,
            notas TEXT,
            FOREIGN KEY(orden_envasado_id) REFERENCES OrdenesEnvasado(id)
        );

        CREATE TABLE IF NOT EXISTS OrdenesEnvasado_Detalle (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orden_envasado_id INTEGER NOT NULL,
            paquete_envio_id INTEGER,
            bolsa_id INTEGER NOT NULL,
            estado_grano TEXT NOT NULL,
            cantidad_bolsas INTEGER NOT NULL,
            destino_al_completar TEXT DEFAULT 'almacen', -- 'almacen' o 'despacho'
            FOREIGN KEY(orden_envasado_id) REFERENCES OrdenesEnvasado(id),
            FOREIGN KEY(paquete_envio_id) REFERENCES PaquetesEnvio(id),
            FOREIGN KEY(bolsa_id) REFERENCES CatalogoBolsas(id)
        );
    """)

    conn.commit()
    conn.close()
    print("Migration completed.")

if __name__ == '__main__':
    run_migration()
