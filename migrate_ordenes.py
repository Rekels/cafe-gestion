#!/usr/bin/env python3
"""
Migration: Sesión → Órdenes de Tueste → Batches
Creates Equipos and OrdenesTueste tables, alters existing tables,
and migrates historical data to the new 3-level hierarchy.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'web-app', 'data', 'cafe_gestion.db')

def migrate():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    print(f"Connected to: {DB_PATH}")

    # ── 1. Create Equipos table ──────────────────────────────────
    print("\n[1/7] Creating Equipos table...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS Equipos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            tipo TEXT DEFAULT 'tostadora',
            capacidad_kg REAL,
            notas TEXT,
            activo INTEGER DEFAULT 1
        )
    """)

    # Seed the 4 roasters
    existing = cur.execute("SELECT COUNT(*) FROM Equipos").fetchone()[0]
    if existing == 0:
        equipos = [
            ('Aillio Bullet R1 V2', 'tostadora', 1.0),
            ('Nucleos Link', 'tostadora', 0.3),
            ('IMSA 2KG', 'tostadora', 2.0),
            ('HGH 12KG', 'tostadora', 12.0),
        ]
        cur.executemany(
            "INSERT INTO Equipos (nombre, tipo, capacidad_kg) VALUES (?, ?, ?)",
            equipos
        )
        print(f"   Seeded {len(equipos)} equipos.")
    else:
        print(f"   Equipos table already has {existing} rows, skipping seed.")

    # ── 2. Create OrdenesTueste table ────────────────────────────
    print("\n[2/7] Creating OrdenesTueste table...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS OrdenesTueste (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sesion_id INTEGER NOT NULL REFERENCES SesionesTueste(id),
            codigo_lote TEXT,
            variedad TEXT,
            productor TEXT,
            proceso TEXT,
            cliente TEXT,
            target_weight REAL,
            partitions INTEGER,
            moisture REAL,
            density REAL,
            aw REAL,
            referencia_tueste_id INTEGER,
            estado TEXT DEFAULT 'activa',
            orden_visual INTEGER DEFAULT 1
        )
    """)

    # ── 3. Alter Tuestes: add orden_id, orden_ejecucion, notas ──
    print("\n[3/7] Altering Tuestes table...")
    columns = [row[1] for row in cur.execute("PRAGMA table_info(Tuestes)").fetchall()]

    if 'orden_id' not in columns:
        cur.execute("ALTER TABLE Tuestes ADD COLUMN orden_id INTEGER REFERENCES OrdenesTueste(id)")
        print("   Added column: orden_id")
    else:
        print("   Column orden_id already exists, skipping.")

    if 'orden_ejecucion' not in columns:
        cur.execute("ALTER TABLE Tuestes ADD COLUMN orden_ejecucion INTEGER")
        print("   Added column: orden_ejecucion")
    else:
        print("   Column orden_ejecucion already exists, skipping.")

    if 'notas' not in columns:
        cur.execute("ALTER TABLE Tuestes ADD COLUMN notas TEXT")
        print("   Added column: notas")
    else:
        print("   Column notas already exists, skipping.")

    # ── 4. Alter SesionesTueste: add equipo_id ───────────────────
    print("\n[4/7] Altering SesionesTueste table...")
    sesion_columns = [row[1] for row in cur.execute("PRAGMA table_info(SesionesTueste)").fetchall()]

    if 'equipo_id' not in sesion_columns:
        cur.execute("ALTER TABLE SesionesTueste ADD COLUMN equipo_id INTEGER REFERENCES Equipos(id)")
        print("   Added column: equipo_id")
    else:
        print("   Column equipo_id already exists, skipping.")

    if 'notas_sesion' not in sesion_columns:
        cur.execute("ALTER TABLE SesionesTueste ADD COLUMN notas_sesion TEXT")
        print("   Added column: notas_sesion")
    else:
        print("   Column notas_sesion already exists, skipping.")

    # ── 5. Migrate: Create OrdenesTueste from existing sessions ──
    print("\n[5/7] Migrating sessions → OrdenesTueste...")
    existing_ordenes = cur.execute("SELECT COUNT(*) FROM OrdenesTueste").fetchone()[0]
    if existing_ordenes > 0:
        print(f"   OrdenesTueste already has {existing_ordenes} rows, skipping migration.")
    else:
        sesiones = cur.execute("""
            SELECT id, codigo_lote, variedad, productor, proceso, cliente,
                   target_weight, partitions, moisture, density, aw,
                   referencia_tueste_id, estado
            FROM SesionesTueste
        """).fetchall()

        migrated = 0
        for s in sesiones:
            orden_estado = 'finalizada' if s['estado'] == 'finalizada' else 'activa'
            cur.execute("""
                INSERT INTO OrdenesTueste (
                    sesion_id, codigo_lote, variedad, productor, proceso, cliente,
                    target_weight, partitions, moisture, density, aw,
                    referencia_tueste_id, estado, orden_visual
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            """, (
                s['id'], s['codigo_lote'], s['variedad'], s['productor'],
                s['proceso'], s['cliente'], s['target_weight'], s['partitions'],
                s['moisture'], s['density'], s['aw'],
                s['referencia_tueste_id'], orden_estado
            ))
            migrated += 1

        print(f"   Created {migrated} OrdenesTueste records from existing sessions.")

    # ── 6. Link batches to their Ordenes ─────────────────────────
    print("\n[6/7] Linking batches to OrdenesTueste...")
    unlinked = cur.execute("SELECT COUNT(*) FROM Tuestes WHERE orden_id IS NULL AND sesion_id IS NOT NULL").fetchone()[0]
    if unlinked > 0:
        # For each session, find the corresponding orden and link the batches
        cur.execute("""
            UPDATE Tuestes
            SET orden_id = (
                SELECT OrdenesTueste.id
                FROM OrdenesTueste
                WHERE OrdenesTueste.sesion_id = Tuestes.sesion_id
                LIMIT 1
            )
            WHERE orden_id IS NULL AND sesion_id IS NOT NULL
        """)
        linked = cur.rowcount
        print(f"   Linked {linked} batches to their Órdenes.")
    else:
        print("   All batches already linked, skipping.")

    # Also link orphan batches (no sesion_id) by matching fecha + codigo_lote
    orphans = cur.execute("SELECT COUNT(*) FROM Tuestes WHERE sesion_id IS NULL").fetchone()[0]
    if orphans > 0:
        print(f"   Found {orphans} orphan batches (no sesion_id). Linking by fecha + codigo_lote...")
        cur.execute("""
            UPDATE Tuestes
            SET sesion_id = (
                SELECT s.id FROM SesionesTueste s
                WHERE s.fecha = Tuestes.fecha AND s.codigo_lote = Tuestes.codigo_lote
                LIMIT 1
            )
            WHERE sesion_id IS NULL
        """)
        # Then link to ordenes
        cur.execute("""
            UPDATE Tuestes
            SET orden_id = (
                SELECT o.id FROM OrdenesTueste o
                WHERE o.sesion_id = Tuestes.sesion_id
                LIMIT 1
            )
            WHERE orden_id IS NULL AND sesion_id IS NOT NULL
        """)
        still_orphan = cur.execute("SELECT COUNT(*) FROM Tuestes WHERE sesion_id IS NULL").fetchone()[0]
        print(f"   After linking: {still_orphan} orphans remain.")

    # ── 7. Map roaster text → equipo_id ──────────────────────────
    print("\n[7/7] Mapping roaster names to equipo_id...")
    unmapped = cur.execute("SELECT COUNT(*) FROM SesionesTueste WHERE equipo_id IS NULL").fetchone()[0]
    if unmapped > 0:
        roaster_map = {
            'HGH12': 'HGH 12KG',
            'hgh12': 'HGH 12KG',
            'HGH 12KG': 'HGH 12KG',
            'HGH': 'HGH 12KG',
            'IMSA': 'IMSA 2KG',
            'IMSA 2KG': 'IMSA 2KG',
            'imsa': 'IMSA 2KG',
            'AILLIO': 'Aillio Bullet R1 V2',
            'Aillio': 'Aillio Bullet R1 V2',
            'BULLET': 'Aillio Bullet R1 V2',
            'NUCLEOS': 'Nucleos Link',
            'Nucleos': 'Nucleos Link',
        }

        sesiones = cur.execute("SELECT id, roaster FROM SesionesTueste WHERE equipo_id IS NULL").fetchall()
        mapped_count = 0
        for s in sesiones:
            roaster_text = (s['roaster'] or '').strip()
            equipo_nombre = roaster_map.get(roaster_text)

            if equipo_nombre:
                equipo = cur.execute("SELECT id FROM Equipos WHERE nombre = ?", (equipo_nombre,)).fetchone()
                if equipo:
                    cur.execute("UPDATE SesionesTueste SET equipo_id = ? WHERE id = ?", (equipo['id'], s['id']))
                    mapped_count += 1
            else:
                # Try fuzzy match
                for key, val in roaster_map.items():
                    if key.lower() in roaster_text.lower():
                        equipo = cur.execute("SELECT id FROM Equipos WHERE nombre = ?", (val,)).fetchone()
                        if equipo:
                            cur.execute("UPDATE SesionesTueste SET equipo_id = ? WHERE id = ?", (equipo['id'], s['id']))
                            mapped_count += 1
                            break

        print(f"   Mapped {mapped_count} of {unmapped} sessions to equipos.")
        still_unmapped = cur.execute("SELECT COUNT(*) FROM SesionesTueste WHERE equipo_id IS NULL").fetchone()[0]
        if still_unmapped > 0:
            print(f"   ⚠️  {still_unmapped} sessions still unmapped. Distinct roaster values:")
            distinct = cur.execute("SELECT DISTINCT roaster FROM SesionesTueste WHERE equipo_id IS NULL").fetchall()
            for d in distinct:
                print(f"      - '{d['roaster']}'")
    else:
        print("   All sessions already mapped.")

    # ── Commit ───────────────────────────────────────────────────
    conn.commit()

    # ── Summary ──────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("MIGRATION COMPLETE")
    print("=" * 60)
    equipos_count = cur.execute("SELECT COUNT(*) FROM Equipos").fetchone()[0]
    ordenes_count = cur.execute("SELECT COUNT(*) FROM OrdenesTueste").fetchone()[0]
    tuestes_count = cur.execute("SELECT COUNT(*) FROM Tuestes").fetchone()[0]
    linked_count = cur.execute("SELECT COUNT(*) FROM Tuestes WHERE orden_id IS NOT NULL").fetchone()[0]
    sesiones_count = cur.execute("SELECT COUNT(*) FROM SesionesTueste").fetchone()[0]
    mapped_equipo = cur.execute("SELECT COUNT(*) FROM SesionesTueste WHERE equipo_id IS NOT NULL").fetchone()[0]

    print(f"  Equipos:          {equipos_count}")
    print(f"  Sesiones:         {sesiones_count} ({mapped_equipo} with equipo_id)")
    print(f"  OrdenesTueste:    {ordenes_count}")
    print(f"  Tuestes (total):  {tuestes_count} ({linked_count} linked to ordenes)")

    conn.close()

if __name__ == '__main__':
    migrate()
