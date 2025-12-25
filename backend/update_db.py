import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'delivery.db')

def update_database():
    """Ajouter les colonnes open_time et close_time si elles n'existent pas"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    try:
        # Vérifier si les colonnes existent déjà
        c.execute("PRAGMA table_info(restaurants)")
        columns = [column[1] for column in c.fetchall()]
        
        if 'open_time' not in columns:
            print("Ajout de la colonne open_time...")
            c.execute('ALTER TABLE restaurants ADD COLUMN open_time TEXT DEFAULT "09:00"')
            conn.commit()
        
        if 'close_time' not in columns:
            print("Ajout de la colonne close_time...")
            c.execute('ALTER TABLE restaurants ADD COLUMN close_time TEXT DEFAULT "22:00"')
            conn.commit()
        
        # Mettre à jour les restaurants existants avec des horaires par défaut
        c.execute('UPDATE restaurants SET open_time = "09:00" WHERE open_time IS NULL')
        c.execute('UPDATE restaurants SET close_time = "22:00" WHERE close_time IS NULL')
        conn.commit()
        
        print("Base de données mise à jour avec succès!")
        
    except Exception as e:
        print(f"Erreur lors de la mise à jour: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    update_database()

