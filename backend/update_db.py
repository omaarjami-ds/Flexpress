from pymongo import MongoClient
import os

MONGO_URI = "mongodb+srv://Omar:Jo191919@flexpress.fzmn57r.mongodb.net/?appName=Flexpress"
client = MongoClient(MONGO_URI)
db = client['flexpress']

def update_database():
    """Mise à jour de la base de données MongoDB (si nécessaire)"""
    try:
        # En MongoDB, l'ajout de champs est dynamique. 
        # On peut s'assurer que les documents existants ont des valeurs par défaut.
        db.restaurants.update_many(
            {'open_time': {'$exists': False}},
            {'$set': {'open_time': '09:00'}}
        )
        db.restaurants.update_many(
            {'close_time': {'$exists': False}},
            {'$set': {'close_time': '22:00'}}
        )
        print("Base de données MongoDB mise à jour avec succès!")
    except Exception as e:
        print(f"Erreur lors de la mise à jour: {e}")

if __name__ == '__main__':
    update_database()
