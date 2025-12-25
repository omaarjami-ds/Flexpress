import sqlite3
import os
from werkzeug.security import generate_password_hash

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'delivery.db')

def init_db():
    """Créer les tables si elles n'existent pas"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Users table
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT UNIQUE NOT NULL,
                  email TEXT UNIQUE NOT NULL,
                  password TEXT NOT NULL,
                  role TEXT NOT NULL,
                  phone TEXT,
                  latitude REAL,
                  longitude REAL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    
    # Restaurants table
    c.execute('''CREATE TABLE IF NOT EXISTS restaurants
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  description TEXT,
                  latitude REAL NOT NULL,
                  longitude REAL NOT NULL,
                  address TEXT,
                  phone TEXT,
                  image_url TEXT,
                  rating REAL DEFAULT 0,
                  is_active BOOLEAN DEFAULT 1,
                  open_time TEXT DEFAULT '09:00',
                  close_time TEXT DEFAULT '22:00',
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    
    # Orders table
    c.execute('''CREATE TABLE IF NOT EXISTS orders
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  client_id INTEGER NOT NULL,
                  restaurant_id INTEGER NOT NULL,
                  status TEXT DEFAULT 'pending',
                  total_price REAL NOT NULL,
                  delivery_address TEXT NOT NULL,
                  delivery_latitude REAL NOT NULL,
                  delivery_longitude REAL NOT NULL,
                  delivery_id INTEGER,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (client_id) REFERENCES users(id),
                  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
                  FOREIGN KEY (delivery_id) REFERENCES users(id))''')
    
    # Order items table
    c.execute('''CREATE TABLE IF NOT EXISTS order_items
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  order_id INTEGER NOT NULL,
                  item_name TEXT NOT NULL,
                  quantity INTEGER NOT NULL,
                  price REAL NOT NULL,
                  FOREIGN KEY (order_id) REFERENCES orders(id))''')
    
    conn.commit()
    conn.close()

def init_test_data():
    # Créer les tables d'abord
    init_db()
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Vérifier si des restaurants existent déjà
    c.execute('SELECT COUNT(*) FROM restaurants')
    if c.fetchone()[0] > 0:
        print("Des restaurants existent déjà. Passons...")
        conn.close()
        return
    
    # Créer des restaurants de test (coordonnées Paris) avec horaires
    restaurants = [
        ('Pizza Express', 'Pizzas italiennes authentiques', 48.8566, 2.3522, '123 Rue de la Pizza, Paris', '01 23 45 67 89', '11:00', '23:00'),
        ('Burger House', 'Les meilleurs burgers de la ville', 48.8606, 2.3376, '456 Avenue des Burgers, Paris', '01 23 45 67 90', '10:00', '22:00'),
        ('Sushi Master', 'Sushi frais et délicieux', 48.8526, 2.3444, '789 Boulevard du Sushi, Paris', '01 23 45 67 91', '12:00', '23:30'),
        ('Tacos Corner', 'Tacos mexicains épicés', 48.8584, 2.2945, '321 Rue des Tacos, Paris', '01 23 45 67 92', '11:30', '22:30'),
        ('Pasta Italia', 'Pâtes faites maison', 48.8647, 2.3490, '654 Rue des Pâtes, Paris', '01 23 45 67 93', '12:00', '22:00'),
    ]
    
    restaurant_ids = []
    for restaurant in restaurants:
        c.execute('''INSERT INTO restaurants (name, description, latitude, longitude, address, phone, open_time, close_time)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)''', restaurant)
        restaurant_ids.append(c.lastrowid)
    
    # Créer des plats pour chaque restaurant
    menu_items_data = [
        # Pizza Express
        (restaurant_ids[0], 'Pizza Margherita', 'Tomate, mozzarella, basilic', 15.00, 'Pizza'),
        (restaurant_ids[0], 'Pizza 4 Fromages', 'Mozzarella, gorgonzola, parmesan, chèvre', 18.00, 'Pizza'),
        (restaurant_ids[0], 'Pizza Pepperoni', 'Sauce tomate, mozzarella, pepperoni', 17.00, 'Pizza'),
        (restaurant_ids[0], 'Pizza Hawaienne', 'Jambon, ananas, mozzarella', 16.00, 'Pizza'),
        (restaurant_ids[0], 'Tiramisu', 'Dessert italien traditionnel', 8.00, 'Dessert'),
        
        # Burger House
        (restaurant_ids[1], 'Burger Classic', 'Steak, salade, tomate, oignon', 12.00, 'Burger'),
        (restaurant_ids[1], 'Burger Cheese', 'Steak, cheddar, salade, tomate', 13.00, 'Burger'),
        (restaurant_ids[1], 'Burger Bacon', 'Steak, bacon, cheddar, oignons frits', 15.00, 'Burger'),
        (restaurant_ids[1], 'Frites', 'Frites maison', 5.00, 'Accompagnement'),
        (restaurant_ids[1], 'Coca-Cola', 'Boisson fraîche', 3.00, 'Boisson'),
        
        # Sushi Master
        (restaurant_ids[2], 'Sushi Mix', 'Assortiment de 12 sushis', 22.00, 'Sushi'),
        (restaurant_ids[2], 'Sashimi Saumon', '6 tranches de saumon frais', 18.00, 'Sushi'),
        (restaurant_ids[2], 'California Roll', '8 pièces de california roll', 14.00, 'Sushi'),
        (restaurant_ids[2], 'Maki Avocat', '6 maki à l\'avocat', 10.00, 'Sushi'),
        (restaurant_ids[2], 'Thé vert', 'Thé japonais traditionnel', 4.00, 'Boisson'),
        
        # Tacos Corner
        (restaurant_ids[3], 'Tacos Viande', 'Viande hachée, frites, sauce', 9.00, 'Tacos'),
        (restaurant_ids[3], 'Tacos Poulet', 'Poulet grillé, frites, sauce', 9.50, 'Tacos'),
        (restaurant_ids[3], 'Tacos Mixte', 'Viande et poulet, frites, sauce', 10.50, 'Tacos'),
        (restaurant_ids[3], 'Nuggets', '6 nuggets de poulet', 7.00, 'Accompagnement'),
        (restaurant_ids[3], 'Soda', 'Boisson au choix', 3.00, 'Boisson'),
        
        # Pasta Italia
        (restaurant_ids[4], 'Pâtes Carbonara', 'Pâtes, lardons, crème', 14.00, 'Pâtes'),
        (restaurant_ids[4], 'Pâtes Bolognaise', 'Pâtes, sauce bolognaise', 13.00, 'Pâtes'),
        (restaurant_ids[4], 'Pâtes aux Fruits de Mer', 'Pâtes, fruits de mer, crème', 18.00, 'Pâtes'),
        (restaurant_ids[4], 'Lasagnes', 'Lasagnes maison au fromage', 16.00, 'Pâtes'),
        (restaurant_ids[4], 'Tiramisu', 'Dessert italien', 7.00, 'Dessert'),
    ]
    
    for item in menu_items_data:
        c.execute('''INSERT INTO menu_items (restaurant_id, name, description, price, category)
                      VALUES (?, ?, ?, ?, ?)''', item)
    
    # Créer un livreur de test
    c.execute('SELECT COUNT(*) FROM users WHERE role = ?', ('livreur',))
    if c.fetchone()[0] == 0:
        livreur_password = generate_password_hash('livreur123')
        c.execute('INSERT INTO users (username, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
                  ('livreur', 'livreur@flexpress.com', livreur_password, 'livreur', '06 12 34 56 78'))
    
    # Créer un client de test
    c.execute('SELECT COUNT(*) FROM users WHERE role = ?', ('client',))
    if c.fetchone()[0] == 0:
        client_password = generate_password_hash('client123')
        c.execute('INSERT INTO users (username, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
                  ('client', 'client@flexpress.com', client_password, 'client', '06 98 76 54 32'))
    
    # Créer l'admin par défaut s'il n'existe pas
    c.execute('SELECT COUNT(*) FROM users WHERE role = ?', ('admin',))
    if c.fetchone()[0] == 0:
        admin_password = generate_password_hash('admin123')
        c.execute('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                  ('admin', 'admin@flexpress.com', admin_password, 'admin'))
    
    conn.commit()
    conn.close()
    print("Données de test créées avec succès!")
    print("\nComptes de test:")
    print("  - Admin: admin / admin123")
    print("  - Livreur: livreur / livreur123")
    print("  - Client: client / client123")

if __name__ == '__main__':
    init_test_data()

