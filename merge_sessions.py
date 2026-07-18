import sqlite3
import os

DB_PATH = '/home/rekels/Proyectos/cafe-gestion/web-app/data/cafe_gestion.db'

def merge_duplicate_sessions():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get all sessions grouped by fecha and equipo_id
    cursor.execute("""
        SELECT fecha, equipo_id, GROUP_CONCAT(id) 
        FROM SesionesTueste 
        GROUP BY fecha, equipo_id 
        HAVING COUNT(id) > 1
    """)
    
    duplicates = cursor.fetchall()
    
    total_merged = 0
    sessions_deleted = 0

    for fecha, equipo_id, id_list in duplicates:
        # id_list is a comma-separated string like "82,83,84"
        # we parse it into a list of ints, sorted
        ids = sorted([int(x) for x in id_list.split(',')])
        
        primary_id = ids[0]
        duplicate_ids = ids[1:]
        
        print(f"Merge group: fecha='{fecha}', equipo_id={equipo_id}")
        print(f"  Primary Session ID: {primary_id}")
        print(f"  Duplicate Session IDs to merge: {duplicate_ids}")
        
        for dup_id in duplicate_ids:
            # 1. Update OrdenesTueste
            cursor.execute("UPDATE OrdenesTueste SET sesion_id = ? WHERE sesion_id = ?", (primary_id, dup_id))
            ordenes_affected = cursor.rowcount
            
            # 2. Update Tuestes
            cursor.execute("UPDATE Tuestes SET sesion_id = ? WHERE sesion_id = ?", (primary_id, dup_id))
            tuestes_affected = cursor.rowcount
            
            # 3. Delete the duplicate session
            cursor.execute("DELETE FROM SesionesTueste WHERE id = ?", (dup_id,))
            
            print(f"    Merged Session {dup_id} -> {primary_id} ({ordenes_affected} orders, {tuestes_affected} batches moved)")
            total_merged += ordenes_affected
            sessions_deleted += 1

    conn.commit()
    conn.close()
    
    print("\n--- Summary ---")
    print(f"Total duplicate sessions deleted: {sessions_deleted}")
    print(f"Total orders moved to a primary session: {total_merged}")

if __name__ == '__main__':
    merge_duplicate_sessions()
