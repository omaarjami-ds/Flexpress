from pymongo import MongoClient, ReturnDocument
from werkzeug.security import generate_password_hash
from datetime import datetime
import os

MONGO_URI = "mongodb+srv://Omar:Jo191919@flexpress.fzmn57r.mongodb.net/?appName=Flexpress"
client = MongoClient(MONGO_URI)
db = client['flexpress']

def get_next_sequence_value(sequence_name):
    result = db.counters.find_one_and_update(
        {'_id': sequence_name},
        {'$inc': {'sequence_value': 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    return result['sequence_value']

def init_db():
    """Créer les collections et index si nécessaire"""
    try:
        if 'users' not in db.list_collection_names():
            db.create_collection('users')
        db.users.create_index('username', unique=True)
        db.users.create_index('email', unique=True)
        
        if 'restaurants' not in db.list_collection_names():
            db.create_collection('restaurants')
            
        if 'orders' not in db.list_collection_names():
            db.create_collection('orders')
            
        if 'order_items' not in db.list_collection_names():
            db.create_collection('order_items')
            
        if 'menu_items' not in db.list_collection_names():
            db.create_collection('menu_items')
            
        if 'counters' not in db.list_collection_names():
            db.create_collection('counters')
            for seq in ['user_id', 'restaurant_id', 'order_id', 'order_item_id', 'menu_item_id']:
                if not db.counters.find_one({'_id': seq}):
                    db.counters.insert_one({'_id': seq, 'sequence_value': 0})
        print("Collections MongoDB initialisées.")
    except Exception as e:
        print(f"Erreur d'initialisation DB: {e}")

def init_test_data():
    init_db()
    
    if db.restaurants.count_documents({}) > 0:
        print("Des restaurants existent déjà. Passons...")
    else:
        # Créer des restaurants de test
        restaurants = [
            {'name': 'Pizza Express', 'description': 'Pizzas italiennes authentiques', 'latitude': 48.8566, 'longitude': 2.3522, 'address': '123 Rue de la Pizza, Paris', 'phone': '01 23 45 67 89', 'open_time': '11:00', 'close_time': '23:00', 'image_url': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400'},
            {'name': 'Burger House', 'description': 'Les meilleurs burgers de la ville', 'latitude': 48.8606, 'longitude': 2.3376, 'address': '456 Avenue des Burgers, Paris', 'phone': '01 23 45 67 90', 'open_time': '10:00', 'close_time': '22:00', 'image_url': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400'},
            {'name': 'Esmiralda', 'description': 'Plats tunisiens et fast-food délicieux', 'latitude': 48.8526, 'longitude': 2.3444, 'address': '789 Boulevard Esmiralda, Paris', 'phone': '01 23 45 67 91', 'open_time': '12:00', 'close_time': '23:30', 'image_url': '/static/Esmiralda.png'},
            {'name': 'Tacos Corner', 'description': 'Tacos mexicains épicés', 'latitude': 48.8584, 'longitude': 2.2945, 'address': '321 Rue des Tacos, Paris', 'phone': '01 23 45 67 92', 'open_time': '11:30', 'close_time': '22:30', 'image_url': 'https://images.unsplash.com/photo-1565299585323-38174c6a6c08?w=400'},
            {'name': 'Pasta Italia', 'description': 'Pâtes faites maison', 'latitude': 48.8647, 'longitude': 2.3490, 'address': '654 Rue des Pâtes, Paris', 'phone': '01 23 45 67 93', 'open_time': '12:00', 'close_time': '22:00', 'image_url': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'},
        ]
        
        restaurant_ids = []
        for r in restaurants:
            r['id'] = get_next_sequence_value('restaurant_id')
            r['is_active'] = True
            r['rating'] = 0
            r['created_at'] = datetime.now()
            db.restaurants.insert_one(r)
            restaurant_ids.append(r['id'])
        
        # Créer des plats
        menu_items = [
            {'restaurant_id': restaurant_ids[0], 'name': 'Pizza Margherita', 'description': 'Tomate, mozzarella, basilic', 'price': 15.00, 'category': 'Pizza', 'image_url': None, 'is_available': True, 'is_popular': True, 'is_featured': True},
            {'restaurant_id': restaurant_ids[0], 'name': 'Pizza 4 Fromages', 'description': 'Mozzarella, gorgonzola, parmesan, chèvre', 'price': 18.00, 'category': 'Pizza', 'is_available': True},
            {'restaurant_id': restaurant_ids[1], 'name': 'Burger Classic', 'description': 'Steak, salade, tomate, oignon', 'price': 12.00, 'category': 'Burger', 'is_available': True, 'is_popular': True, 'is_featured': True},
            {'restaurant_id': restaurant_ids[2], 'name': 'Makloub Escalope', 'description': 'Pain maison, escalope, frites, salade, sauces', 'price': 9.00, 'category': 'Makloub', 'image_url': '/static/makloub.jpg', 'is_available': True, 'is_popular': True, 'is_featured': True},
        ]
        
        for item in menu_items:
            item['id'] = get_next_sequence_value('menu_item_id')
            item['created_at'] = datetime.now()
            if 'is_popular' not in item: item['is_popular'] = False
            if 'is_featured' not in item: item['is_featured'] = False
            db.menu_items.insert_one(item)

    # Créer les utilisateurs par défaut
    if db.users.count_documents({'role': 'livreur'}) == 0:
        db.users.insert_one({
            'id': get_next_sequence_value('user_id'),
            'username': 'livreur',
            'email': 'livreur@flexpress.com',
            'password': generate_password_hash('livreur123'),
            'role': 'livreur',
            'phone': '06 12 34 56 78',
            'is_available': False,
            'created_at': datetime.now()
        })
    
    if db.users.count_documents({'role': 'client'}) == 0:
        db.users.insert_one({
            'id': get_next_sequence_value('user_id'),
            'username': 'client',
            'email': 'client@flexpress.com',
            'password': generate_password_hash('client123'),
            'role': 'client',
            'phone': '06 98 76 54 32',
            'created_at': datetime.now()
        })
    
    if db.users.count_documents({'role': 'admin'}) == 0:
        db.users.insert_one({
            'id': get_next_sequence_value('user_id'),
            'username': 'yahya',
            'email': 'yahya@flexpress.com',
            'password': generate_password_hash('flexpress@1919.7et7et'),
            'role': 'admin',
            'created_at': datetime.now()
        })
    
    print("Données de test créées avec succès!")

if __name__ == '__main__':
    init_test_data()
