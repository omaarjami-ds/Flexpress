from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import sqlite3
import os
import math
import traceback
import json
import io
from reportlab.lib.pagesizes import letter, A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

app = Flask(__name__)
# Définir le chemin vers le dossier static à la racine du projet
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(PROJECT_ROOT, 'static')

app.config['JWT_SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
CORS(app)
jwt = JWTManager(app)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'delivery.db')

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(STATIC_DIR, filename)

@app.route('/')
def home():
    return jsonify({
        "status": "success",
        "message": "FLEXPRESS API is running",
        "version": "1.0.0"
    })

# Database initialization
def init_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Migration: Add estimated_delivery_time to orders if missing
        try:
            c.execute("PRAGMA table_info(orders)")
            columns = [col[1] for col in c.fetchall()]
            if columns and 'estimated_delivery_time' not in columns:
                app.logger.info("Migrating database: adding estimated_delivery_time to orders")
                c.execute("ALTER TABLE orders ADD COLUMN estimated_delivery_time INTEGER DEFAULT 30")
                conn.commit()
        except Exception as e:
            app.logger.error(f"Migration Error: {e}")

        # Migration: Add columns to menu_items if missing
        try:
            c.execute("PRAGMA table_info(menu_items)")
            columns = [col[1] for col in c.fetchall()]
            if columns:
                if 'is_popular' not in columns:
                    app.logger.info("Migrating database: adding is_popular to menu_items")
                    c.execute("ALTER TABLE menu_items ADD COLUMN is_popular BOOLEAN DEFAULT 0")
                if 'is_featured' not in columns:
                    app.logger.info("Migrating database: adding is_featured to menu_items")
                    c.execute("ALTER TABLE menu_items ADD COLUMN is_featured BOOLEAN DEFAULT 0")
                conn.commit()
        except Exception as e:
            app.logger.error(f"Menu Items Migration Error: {e}")

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
                      is_available BOOLEAN DEFAULT 0,
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
                      estimated_delivery_time INTEGER DEFAULT 30,
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
        
        # Menu items table
        c.execute('''CREATE TABLE IF NOT EXISTS menu_items
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      restaurant_id INTEGER NOT NULL,
                      name TEXT NOT NULL,
                      description TEXT,
                      price REAL NOT NULL,
                      category TEXT,
                      image_url TEXT,
                      is_available BOOLEAN DEFAULT 1,
                      is_popular BOOLEAN DEFAULT 0,
                      is_featured BOOLEAN DEFAULT 0,
                      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id))''')
        
        conn.commit()
        conn.close()
    except Exception as e:
        app.logger.error(f"DB Init Error: {e}")

def create_default_data():
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        c.execute('SELECT COUNT(*) FROM users WHERE role = ?', ('admin',))
        if c.fetchone()[0] == 0:
            admin_password = generate_password_hash('admin123')
            c.execute('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                      ('admin', 'admin@flexpress.com', admin_password, 'admin'))
            conn.commit()
        
        c.execute('SELECT COUNT(*) FROM users WHERE role = ?', ('livreur',))
        if c.fetchone()[0] == 0:
            livreur_password = generate_password_hash('livreur123')
            c.execute('INSERT INTO users (username, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
                      ('livreur', 'livreur@flexpress.com', livreur_password, 'livreur', '06 12 34 56 78'))
            conn.commit()
        
        c.execute('SELECT COUNT(*) FROM users WHERE role = ?', ('client',))
        if c.fetchone()[0] == 0:
            client_password = generate_password_hash('client123')
            c.execute('INSERT INTO users (username, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
                      ('client', 'client@flexpress.com', client_password, 'client', '06 98 76 54 32'))
            conn.commit()
        
        c.execute('SELECT COUNT(*) FROM restaurants')
        if c.fetchone()[0] == 0:
            restaurants = [
                ('Pizza Express', 'Pizzas italiennes authentiques', 48.8566, 2.3522, '123 Rue de la Pizza, Paris', '01 23 45 67 89', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400'),
                ('Burger House', 'Les meilleurs burgers de la ville', 48.8606, 2.3376, '456 Avenue des Burgers, Paris', '01 23 45 67 90', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400'),
                ('Esmiralda', 'Plats tunisiens et fast-food délicieux', 48.8526, 2.3444, '789 Boulevard Esmiralda, Paris', '01 23 45 67 91', '/static/Esmiralda.png'),
            ]
            for restaurant in restaurants:
                c.execute('''INSERT INTO restaurants (name, description, latitude, longitude, address, phone, image_url)
                              VALUES (?, ?, ?, ?, ?, ?, ?)''', restaurant)
            conn.commit()
        
        conn.close()
    except Exception as e:
        app.logger.error(f"Error creating default data: {e}")

# Initialize DB on startup
with app.app_context():
    init_db()
    create_default_data()

# Helper function pour obtenir l'identity de manière sécurisée
def get_current_user():
    """Récupère l'utilisateur actuel depuis le token JWT avec son rôle"""
    try:
        identity = get_jwt_identity()
        # Récupérer les claims additionnels pour obtenir le rôle
        claims = get_jwt()
        role = claims.get('role', None)
        
        # Convertir l'identity en entier si c'est une chaîne
        user_id = int(identity) if isinstance(identity, str) and identity.isdigit() else identity
        
        return {'id': user_id, 'role': role}
    except Exception as e:
        app.logger.error(f'Error getting current user: {str(e)}')
        return None

# Configurer Flask-JWT-Extended pour accepter des dictionnaires comme identity
# On sérialise le dictionnaire en JSON string pour le token, puis on le désérialise ici
@jwt.user_identity_loader
def user_identity_lookup(identity):
    # Flask-JWT-Extended attend une chaîne, donc on retourne la chaîne telle quelle
    # La désérialisation sera faite dans get_current_user()
    return identity

# Error handler pour les erreurs JWT
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({'error': 'Token expired'}), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    error_msg = str(error)
    app.logger.error(f'Invalid token error: {error_msg}')
    # Si l'erreur indique que le subject doit être une chaîne, suggérer de se reconnecter
    if 'Subject must be a string' in error_msg:
        return jsonify({
            'error': 'Token invalide. Veuillez vous reconnecter pour obtenir un nouveau token.',
            'details': error_msg
        }), 401
    return jsonify({'error': f'Invalid token: {error_msg}'}), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({'error': 'Authorization token missing'}), 401

# Error handler global pour Flask
@app.errorhandler(422)
def handle_422(e):
    app.logger.error(f'422 Error: {str(e)}')
    return jsonify({'error': f'Validation error: {str(e)}'}), 422

@app.errorhandler(Exception)
def handle_exception(e):
    app.logger.error(f'Unhandled exception: {str(e)}\n{traceback.format_exc()}')
    return jsonify({'error': f'Server error: {str(e)}'}), 500



def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in km"""
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def is_restaurant_open(open_time, close_time):
    """Check if restaurant is currently open"""
    from datetime import datetime
    now = datetime.now()
    current_time = now.strftime('%H:%M')
    
    # Handle restaurants open past midnight
    if open_time > close_time:
        return current_time >= open_time or current_time <= close_time
    else:
        return open_time <= current_time <= close_time

@app.route('/api/upload', methods=['POST'])
@jwt_required()
def upload_file():
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        filename = datetime.now().strftime("%Y%m%d%H%M%S") + "_" + file.filename
        file_path = os.path.join(STATIC_DIR, filename)
        file.save(file_path)
        return jsonify({'url': f'/static/{filename}'}), 201

# Auth routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    conn = get_db()
    c = conn.cursor()
    
    try:
        # Seuls les clients peuvent s'inscrire automatiquement
        # Les livreurs doivent être créés par l'admin
        requested_role = data.get('role', 'client')
        if requested_role != 'client':
            conn.close()
            return jsonify({'error': 'Seuls les clients peuvent s\'inscrire. Les livreurs doivent être créés par un administrateur.'}), 403
        
        password_hash = generate_password_hash(data['password'])
        c.execute('INSERT INTO users (username, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
                  (data['username'], data['email'], password_hash, 'client', data.get('phone', '')))
        conn.commit()
        user_id = c.lastrowid
        conn.close()
        
        # Créer le token avec l'ID utilisateur comme identity (chaîne)
        # Le rôle sera stocké dans les claims additionnels si nécessaire
        access_token = create_access_token(
            identity=str(user_id),
            additional_claims={'role': 'client'}
        )
        return jsonify({'token': access_token, 'user': {'id': user_id, 'username': data['username'], 'role': 'client'}}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Username or email already exists'}), 400

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db()
    c = conn.cursor()
    
    username_or_email = data.get('username', '')
    c.execute('SELECT * FROM users WHERE username = ? OR email = ?', (username_or_email, username_or_email))
    user = c.fetchone()
    conn.close()
    
    if user and check_password_hash(user['password'], data['password']):
        # Créer le token avec l'ID utilisateur comme identity (chaîne)
        # Le rôle sera stocké dans les claims additionnels
        access_token = create_access_token(
            identity=str(user['id']),
            additional_claims={'role': user['role']}
        )
        return jsonify({
            'token': access_token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'role': user['role']
            }
        }), 200
    
    return jsonify({'error': 'Invalid credentials'}), 401

# User routes
@app.route('/api/user/profile', methods=['GET'])
@jwt_required()
def get_profile():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    user_id = current_user['id']
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT id, username, email, role, phone, latitude, longitude, is_available FROM users WHERE id = ?', (user_id,))
    user = c.fetchone()
    conn.close()
    
    if user:
        return jsonify(dict(user)), 200
    return jsonify({'error': 'User not found'}), 404

@app.route('/api/user/status', methods=['POST'])
@jwt_required()
def update_status():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    
    # Seuls les livreurs peuvent changer leur statut de disponibilité
    if current_user['role'] != 'livreur':
        return jsonify({'error': 'Unauthorized'}), 403
        
    user_id = current_user['id']
    data = request.json
    is_available = data.get('is_available', False)
    
    conn = get_db()
    c = conn.cursor()
    c.execute('UPDATE users SET is_available = ? WHERE id = ?',
              (is_available, user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Status updated', 'is_available': is_available}), 200

@app.route('/api/user/location', methods=['POST'])
@jwt_required()
def update_location():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    user_id = current_user['id']
    data = request.json
    conn = get_db()
    c = conn.cursor()
    c.execute('UPDATE users SET latitude = ?, longitude = ? WHERE id = ?',
              (data['latitude'], data['longitude'], user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Location updated'}), 200

# Restaurant routes
@app.route('/api/restaurants', methods=['GET'])
def get_restaurants():
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    only_open = request.args.get('only_open', 'false').lower() == 'true'
    
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM restaurants WHERE is_active = 1')
    restaurants = [dict(row) for row in c.fetchall()]
    conn.close()
    
    # Filter open restaurants if requested
    if only_open:
        restaurants = [r for r in restaurants if is_restaurant_open(
            r.get('open_time', '09:00'),
            r.get('close_time', '22:00')
        )]
    
    if lat and lon:
        for restaurant in restaurants:
            restaurant['distance'] = calculate_distance(lat, lon, restaurant['latitude'], restaurant['longitude'])
            # Add is_open status
            restaurant['is_open'] = is_restaurant_open(
                restaurant.get('open_time', '09:00'),
                restaurant.get('close_time', '22:00')
            )
        restaurants.sort(key=lambda x: x['distance'])
    else:
        # Add is_open status even without location
        for restaurant in restaurants:
            restaurant['is_open'] = is_restaurant_open(
                restaurant.get('open_time', '09:00'),
                restaurant.get('close_time', '22:00')
            )
    
    return jsonify(restaurants), 200

@app.route('/api/restaurants', methods=['POST'])
@jwt_required()
def create_restaurant():
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    conn = get_db()
    c = conn.cursor()
    
    # Utiliser des valeurs par défaut pour la Tunisie (Tunis) si non fournies
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    
    # Si latitude/longitude ne sont pas fournies, utiliser des coordonnées par défaut pour la Tunisie
    if not latitude or latitude == '':
        latitude = 36.8065  # Latitude par défaut (Tunis)
    if not longitude or longitude == '':
        longitude = 10.1815  # Longitude par défaut (Tunis)
    
    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except (ValueError, TypeError):
        latitude = 36.8065
        longitude = 10.1815
    
    c.execute('''INSERT INTO restaurants (name, description, latitude, longitude, address, phone, image_url, open_time, close_time)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
              (data['name'], data.get('description', ''), latitude, longitude,
               data.get('address', ''), data.get('phone', ''), data.get('image_url', ''),
               data.get('open_time', '09:00'), data.get('close_time', '22:00')))
    conn.commit()
    restaurant_id = c.lastrowid
    conn.close()
    
    return jsonify({'id': restaurant_id, 'message': 'Restaurant created'}), 201

@app.route('/api/restaurants/<int:restaurant_id>/menu', methods=['GET'])
def get_restaurant_menu(restaurant_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM menu_items WHERE restaurant_id = ? AND is_available = 1 ORDER BY category, name', (restaurant_id,))
    menu_items = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify(menu_items), 200

@app.route('/api/restaurants/<int:restaurant_id>/menu', methods=['POST'])
@jwt_required()
def add_menu_item(restaurant_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    conn = get_db()
    c = conn.cursor()
    c.execute('''INSERT INTO menu_items (restaurant_id, name, description, price, category, image_url, is_popular, is_featured)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
              (restaurant_id, data['name'], data.get('description', ''), data['price'],
               data.get('category', 'Plat'), data.get('image_url', ''), 
               data.get('is_popular', 0), data.get('is_featured', 0)))
    conn.commit()
    item_id = c.lastrowid
    conn.close()
    return jsonify({'id': item_id, 'message': 'Menu item added'}), 201

@app.route('/api/menu-items/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_menu_item(item_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    conn = get_db()
    c = conn.cursor()
    
    fields = []
    values = []
    for key in ['name', 'description', 'price', 'category', 'image_url', 'is_available', 'is_popular', 'is_featured']:
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])
    
    if not fields:
        return jsonify({'error': 'No fields to update'}), 400
        
    values.append(item_id)
    c.execute(f"UPDATE menu_items SET {', '.join(fields)} WHERE id = ?", values)
    conn.commit()
    conn.close()
    return jsonify({'message': 'Menu item updated'}), 200

@app.route('/api/menu-items/popular', methods=['GET'])
def get_popular_items():
    conn = get_db()
    c = conn.cursor()
    c.execute('''SELECT m.*, r.name as restaurant_name 
                 FROM menu_items m 
                 JOIN restaurants r ON m.restaurant_id = r.id 
                 WHERE m.is_popular = 1 AND m.is_available = 1 
                 LIMIT 10''')
    items = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify(items), 200

@app.route('/api/menu-items/makloub', methods=['GET'])
def get_makloub_items():
    conn = get_db()
    c = conn.cursor()
    c.execute('''SELECT m.*, r.name as restaurant_name 
                 FROM menu_items m 
                 JOIN restaurants r ON m.restaurant_id = r.id 
                 WHERE (m.category LIKE '%Makloub%' OR m.name LIKE '%Makloub%') AND m.is_available = 1 
                 LIMIT 10''')
    items = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify(items), 200

# Order routes
@app.route('/api/orders', methods=['POST'])
@jwt_required()
def create_order():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    if current_user['role'] != 'client':
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        data = request.json
        
        # Validation complète des données
        if not data:
            app.logger.error('No data provided in request')
            return jsonify({'error': 'No data provided'}), 400
        
        # Vérifier restaurant_id
        if 'restaurant_id' not in data or data.get('restaurant_id') is None:
            app.logger.error(f'Missing restaurant_id. Data: {data}')
            return jsonify({'error': 'restaurant_id is required'}), 400
        
        # Vérifier total_price
        if 'total_price' not in data or data.get('total_price') is None:
            app.logger.error(f'Missing total_price. Data: {data}')
            return jsonify({'error': 'total_price is required'}), 400
        
        # Vérifier delivery_address
        if 'delivery_address' not in data or not data.get('delivery_address'):
            app.logger.error(f'Missing delivery_address. Data: {data}')
            return jsonify({'error': 'delivery_address is required'}), 400
        
        # Vérifier que la localisation est fournie (ne doit pas être 0)
        delivery_lat = float(data.get('delivery_latitude', 0))
        delivery_lon = float(data.get('delivery_longitude', 0))
        if delivery_lat == 0 or delivery_lon == 0:
            app.logger.error(f'Missing or invalid location: ({delivery_lat}, {delivery_lon})')
            return jsonify({'error': 'La localisation GPS est requise pour passer une commande. Veuillez activer votre position.'}), 400
        
        # Vérifier items
        if 'items' not in data or not data.get('items') or len(data.get('items', [])) == 0:
            app.logger.error(f'Missing or empty items. Data: {data}')
            return jsonify({'error': 'items are required'}), 400
        
        conn = get_db()
        c = conn.cursor()
        
        # Désactiver temporairement les contraintes de clés étrangères
        c.execute('PRAGMA foreign_keys = OFF')
        
        # Gérer le restaurant_id
        try:
            restaurant_id = int(data['restaurant_id'])
        except (ValueError, TypeError) as e:
            app.logger.error(f'Invalid restaurant_id format: {data.get("restaurant_id")}. Error: {str(e)}')
            conn.close()
            return jsonify({'error': f'Invalid restaurant_id format'}), 400
        
        # Vérifier si le restaurant existe
        c.execute('SELECT id, latitude, longitude FROM restaurants WHERE id = ?', (restaurant_id,))
        restaurant = c.fetchone()
        
        # Si le restaurant n'existe pas, créer un restaurant par défaut
        if not restaurant:
            try:
                delivery_lat = float(data.get('delivery_latitude', 0))
                delivery_lon = float(data.get('delivery_longitude', 0))
                delivery_addr = str(data.get('delivery_address', ''))
                
                # Extraire le nom du restaurant de l'adresse si présent [Nom] Adresse
                restaurant_name = 'Restaurant Personnalisé'
                if delivery_addr.startswith('[') and ']' in delivery_addr:
                    end_bracket = delivery_addr.index(']')
                    restaurant_name = delivery_addr[1:end_bracket]
                    delivery_addr = delivery_addr[end_bracket + 1:].strip()
                
                app.logger.info(f'Creating default restaurant: {restaurant_name}')
                c.execute('''INSERT INTO restaurants (name, description, latitude, longitude, address, is_active)
                              VALUES (?, ?, ?, ?, ?, ?)''',
                          (restaurant_name, 'Restaurant ajouté manuellement', 
                           delivery_lat, delivery_lon, delivery_addr, 1))
                restaurant_id = c.lastrowid
                conn.commit()
                app.logger.info(f'Created restaurant with ID: {restaurant_id}')
            except Exception as e:
                conn.close()
                app.logger.error(f'Error creating default restaurant: {str(e)}\n{traceback.format_exc()}')
                return jsonify({'error': f'Error creating restaurant: {str(e)}'}), 500
        
        # Réactiver les contraintes de clés étrangères
        c.execute('PRAGMA foreign_keys = ON')
        
        # Créer la commande
        try:
            total_price = float(data['total_price'])
            delivery_address = str(data['delivery_address'])
            delivery_latitude = float(data.get('delivery_latitude', 0))
            delivery_longitude = float(data.get('delivery_longitude', 0))
            
            # Calculer une estimation simple du temps de livraison (en minutes)
            try:
                estimated_delivery_time = None
                if restaurant and restaurant['latitude'] is not None and restaurant['longitude'] is not None:
                    distance_km = calculate_distance(
                        float(restaurant['latitude']),
                        float(restaurant['longitude']),
                        delivery_latitude,
                        delivery_longitude
                    )
                    # 8 minutes par km + 10 minutes de préparation, borné entre 15 et 75 minutes
                    estimated_delivery_time = int(max(15, min(75, round(distance_km * 8 + 10))))
                else:
                    estimated_delivery_time = 30
            except Exception as e:
                app.logger.error(f'Erreur calcul temps de livraison: {str(e)}')
                estimated_delivery_time = 30
            
            app.logger.info(f'Creating order: client_id={current_user["id"]}, restaurant_id={restaurant_id}, total_price={total_price}')
            
            c.execute('''INSERT INTO orders (client_id, restaurant_id, total_price, delivery_address, 
                      delivery_latitude, delivery_longitude, estimated_delivery_time, status)
                      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')''',
                      (current_user['id'], restaurant_id, total_price, delivery_address,
                       delivery_latitude, delivery_longitude, estimated_delivery_time))
            order_id = c.lastrowid
            
            # Ajouter les articles de la commande
            for idx, item in enumerate(data['items']):
                # Validation de chaque item
                if not item.get('name'):
                    conn.rollback()
                    conn.close()
                    app.logger.error(f'Item {idx} missing name: {item}')
                    return jsonify({'error': f'Item {idx + 1}: name is required'}), 400
                
                if item.get('quantity') is None:
                    conn.rollback()
                    conn.close()
                    app.logger.error(f'Item {idx} missing quantity: {item}')
                    return jsonify({'error': f'Item {idx + 1}: quantity is required'}), 400
                
                if item.get('price') is None:
                    conn.rollback()
                    conn.close()
                    app.logger.error(f'Item {idx} missing price: {item}')
                    return jsonify({'error': f'Item {idx + 1}: price is required'}), 400
                
                try:
                    item_name = str(item['name']).strip()
                    # Convertir en float puis int pour gérer "010" -> 10
                    item_quantity = int(float(str(item['quantity'])))
                    item_price = float(str(item['price']))
                    
                    if item_quantity <= 0:
                        conn.rollback()
                        conn.close()
                        return jsonify({'error': f'Item {idx + 1}: quantity must be greater than 0'}), 400
                    
                    if item_price < 0:
                        conn.rollback()
                        conn.close()
                        return jsonify({'error': f'Item {idx + 1}: price must be >= 0'}), 400
                    
                    app.logger.info(f'Inserting item: name={item_name}, quantity={item_quantity}, price={item_price}')
                    c.execute('INSERT INTO order_items (order_id, item_name, quantity, price) VALUES (?, ?, ?, ?)',
                              (order_id, item_name, item_quantity, item_price))
                except ValueError as e:
                    conn.rollback()
                    conn.close()
                    app.logger.error(f'Invalid item {idx} data: {item}. Error: {str(e)}')
                    return jsonify({'error': f'Item {idx + 1}: Invalid format - {str(e)}'}), 400
            
            conn.commit()
            conn.close()
            app.logger.info(f'Order created successfully: ID={order_id}')
            return jsonify({'id': order_id, 'message': 'Order created successfully'}), 201
            
        except sqlite3.IntegrityError as e:
            conn.rollback()
            conn.close()
            app.logger.error(f'Database integrity error: {str(e)}\n{traceback.format_exc()}')
            return jsonify({'error': f'Database error: {str(e)}'}), 400
        except ValueError as e:
            conn.rollback()
            conn.close()
            app.logger.error(f'Value error: {str(e)}\n{traceback.format_exc()}')
            return jsonify({'error': f'Invalid data format: {str(e)}'}), 400
        except Exception as e:
            conn.rollback()
            conn.close()
            app.logger.error(f'Error creating order: {str(e)}\n{traceback.format_exc()}')
            return jsonify({'error': f'Error creating order: {str(e)}'}), 500
            
    except Exception as e:
        app.logger.error(f'Unexpected error in create_order: {str(e)}\n{traceback.format_exc()}')
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/orders', methods=['GET'])
@jwt_required()
def get_orders():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    
    conn = get_db()
    c = conn.cursor()
    
    if current_user['role'] == 'client':
        c.execute('''SELECT o.*, r.name as restaurant_name, r.latitude as restaurant_latitude, r.longitude as restaurant_longitude,
                     d.latitude as driver_lat, d.longitude as driver_lon, d.username as driver_name
                     FROM orders o
                     JOIN restaurants r ON o.restaurant_id = r.id
                     LEFT JOIN users d ON o.delivery_id = d.id
                     WHERE o.client_id = ? ORDER BY o.created_at DESC''', (current_user['id'],))
    elif current_user['role'] == 'livreur':
        # Retourner toutes les commandes du livreur (y compris livrées) pour l'historique et le résumé
        c.execute('''SELECT o.*, r.name as restaurant_name, u.username as client_name,
                     u.latitude as client_lat, u.longitude as client_lon, u.phone as client_phone
                     FROM orders o
                     JOIN restaurants r ON o.restaurant_id = r.id
                     JOIN users u ON o.client_id = u.id
                     WHERE o.delivery_id = ?
                     ORDER BY o.created_at DESC''', (current_user['id'],))
    else:  # admin
        c.execute('''SELECT o.*, r.name as restaurant_name, 
                     u.username as client_name,
                     u.latitude as client_lat, u.longitude as client_lon,
                     d.username as delivery_name,
                     d.latitude as delivery_lat, d.longitude as delivery_lon
                     FROM orders o
                     JOIN restaurants r ON o.restaurant_id = r.id
                     JOIN users u ON o.client_id = u.id
                     LEFT JOIN users d ON o.delivery_id = d.id
                     ORDER BY o.created_at DESC''')
    
    orders = [dict(row) for row in c.fetchall()]
    
    # Ajouter les items de chaque commande
    for order in orders:
        c.execute('SELECT * FROM order_items WHERE order_id = ?', (order['id'],))
        order['items'] = [dict(row) for row in c.fetchall()]
    
    conn.close()
    return jsonify(orders), 200

@app.route('/api/orders/<int:order_id>/accept', methods=['POST'])
@jwt_required()
def accept_order(order_id):
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    if current_user['role'] != 'livreur':
        return jsonify({'error': 'Unauthorized'}), 403
    
    conn = get_db()
    c = conn.cursor()
    
    # Vérifier que la commande est toujours disponible (premier arrivé, premier servi)
    c.execute('SELECT status, delivery_id FROM orders WHERE id = ?', (order_id,))
    order = c.fetchone()
    
    if not order:
        conn.close()
        return jsonify({'error': 'Order not found'}), 404
    
    if order['status'] != 'pending':
        conn.close()
        return jsonify({'error': 'Order already taken'}), 400
    
    if order['delivery_id'] is not None:
        conn.close()
        return jsonify({'error': 'Order already accepted by another delivery person'}), 400
    
    # Accepter la commande (premier arrivé, premier servi)
    c.execute('UPDATE orders SET delivery_id = ?, status = ? WHERE id = ? AND status = ? AND delivery_id IS NULL',
              (current_user['id'], 'accepted', order_id, 'pending'))
    
    if c.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Order already taken by another delivery person'}), 400
    
    conn.commit()
    conn.close()
    return jsonify({'message': 'Order accepted successfully'}), 200

@app.route('/api/orders/<int:order_id>/status', methods=['PUT'])
@jwt_required()
def update_order_status(order_id):
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    
    data = request.json
    new_status = data.get('status')
    conn = get_db()
    c = conn.cursor()
    
    if current_user['role'] == 'livreur':
        # Vérifier que la commande appartient au livreur
        c.execute('SELECT status, delivery_id, total_price FROM orders WHERE id = ?', (order_id,))
        order = c.fetchone()
        
        if not order:
            conn.close()
            return jsonify({'error': 'Order not found'}), 404
        
        if order['delivery_id'] != current_user['id']:
            conn.close()
            return jsonify({'error': 'Unauthorized: This order does not belong to you'}), 403
        
        # Si la commande est marquée comme livrée, elle sera automatiquement retirée de la liste active
        c.execute('UPDATE orders SET status = ? WHERE id = ? AND delivery_id = ?',
                  (new_status, order_id, current_user['id']))
    elif current_user['role'] == 'admin':
        c.execute('UPDATE orders SET status = ? WHERE id = ?', (new_status, order_id))
    else:
        conn.close()
        return jsonify({'error': 'Unauthorized'}), 403
    
    conn.commit()
    conn.close()
    return jsonify({'message': 'Status updated'}), 200

@app.route('/api/orders/<int:order_id>', methods=['DELETE'])
@jwt_required()
def cancel_order(order_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    conn = get_db()
    c = conn.cursor()
    # On peut soit supprimer soit changer le statut à 'cancelled'
    # Le changement de statut est préférable pour l'historique
    c.execute('UPDATE orders SET status = "cancelled" WHERE id = ?', (order_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Order cancelled'}), 200

@app.route('/api/orders/<int:order_id>/assign', methods=['POST'])
@jwt_required()
def assign_order(order_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    delivery_id = data.get('delivery_id')
    
    if not delivery_id:
        return jsonify({'error': 'Delivery ID is required'}), 400
    
    conn = get_db()
    c = conn.cursor()
    # On force l'assignation et on passe le statut à 'accepted'
    c.execute('UPDATE orders SET delivery_id = ?, status = "accepted" WHERE id = ?', (delivery_id, order_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Order assigned successfully'}), 200

# Delivery routes
@app.route('/api/deliveries/available', methods=['GET'])
@jwt_required()
def get_available_deliveries():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    if current_user['role'] != 'livreur':
        return jsonify({'error': 'Unauthorized'}), 403
    
    conn = get_db()
    c = conn.cursor()
    # Ne retourner que les commandes en attente (pas les livrées)
    c.execute('''SELECT o.*, r.name as restaurant_name, r.latitude as restaurant_lat,
                  r.longitude as restaurant_lon, u.username as client_name,
                  u.latitude as client_lat, u.longitude as client_lon, u.phone as client_phone
                  FROM orders o
                  JOIN restaurants r ON o.restaurant_id = r.id
                  JOIN users u ON o.client_id = u.id
                  WHERE o.status = 'pending' ORDER BY o.created_at DESC''')
    orders = [dict(row) for row in c.fetchall()]
    
    # Ajouter les items de chaque commande
    for order in orders:
        c.execute('SELECT * FROM order_items WHERE order_id = ?', (order['id'],))
        order['items'] = [dict(row) for row in c.fetchall()]
    
    conn.close()
    return jsonify(orders), 200

@app.route('/api/orders/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order_details(order_id):
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    conn = get_db()
    c = conn.cursor()
    
    c.execute('''SELECT o.*, r.name as restaurant_name, u.username as client_name, u.phone as client_phone
                  FROM orders o
                  JOIN restaurants r ON o.restaurant_id = r.id
                  JOIN users u ON o.client_id = u.id
                  WHERE o.id = ?''', (order_id,))
    order = c.fetchone()
    
    if not order:
        conn.close()
        return jsonify({'error': 'Order not found'}), 404
    
    order_dict = dict(order)
    
    # Ajouter les items de la commande
    c.execute('SELECT * FROM order_items WHERE order_id = ?', (order_id,))
    order_dict['items'] = [dict(row) for row in c.fetchall()]
    
    conn.close()
    return jsonify(order_dict), 200

@app.route('/api/livreur/stats', methods=['GET'])
@jwt_required()
def get_livreur_stats():
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'livreur':
        return jsonify({'error': 'Unauthorized'}), 403
    
    conn = get_db()
    c = conn.cursor()
    
    # Statistiques globales
    c.execute('''SELECT COUNT(*) as total_orders, 
                        SUM(total_price) as total_earnings,
                        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
                        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
                 FROM orders 
                 WHERE delivery_id = ?''', (current_user['id'],))
    stats = dict(c.fetchone())
    
    # Statistiques du jour
    c.execute('''SELECT COUNT(*) as today_orders, 
                        SUM(total_price) as today_earnings
                 FROM orders 
                 WHERE delivery_id = ? AND date(created_at) = date('now')''', (current_user['id'],))
    today_stats = dict(c.fetchone())
    
    stats.update(today_stats)
    
    # Historique récent (10 dernières)
    c.execute('''SELECT o.*, r.name as restaurant_name 
                 FROM orders o 
                 JOIN restaurants r ON o.restaurant_id = r.id 
                 WHERE o.delivery_id = ? 
                 ORDER BY o.created_at DESC LIMIT 10''', (current_user['id'],))
    recent_orders = [dict(row) for row in c.fetchall()]
    
    conn.close()
    return jsonify({
        'stats': stats,
        'recent_orders': recent_orders
    }), 200

# User management routes (Admin only)
@app.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT id, username, email, role, phone, latitude, longitude, is_available, created_at FROM users ORDER BY created_at DESC')
    users = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify(users), 200

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    if current_user['id'] == user_id:
        return jsonify({'error': 'Cannot delete your own account'}), 400
    
    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM users WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'User deleted'}), 200

@app.route('/api/users/<int:user_id>/role', methods=['PUT'])
@jwt_required()
def update_user_role(user_id):
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    conn = get_db()
    c = conn.cursor()
    c.execute('UPDATE users SET role = ? WHERE id = ?', (data['role'], user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'User role updated'}), 200

# PDF Reports and Professional Features
@app.route('/api/orders/<int:order_id>/pdf', methods=['GET'])
@jwt_required()
def generate_order_pdf(order_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] not in ['admin', 'client', 'livreur']:
        return jsonify({'error': 'Unauthorized'}), 403

    conn = get_db()
    c = conn.cursor()
    c.execute('''SELECT o.*, r.name as restaurant_name, r.address as restaurant_address, r.phone as restaurant_phone,
                 u.username as client_name, u.email as client_email, u.phone as client_phone,
                 d.username as delivery_name
                 FROM orders o
                 JOIN restaurants r ON o.restaurant_id = r.id
                 JOIN users u ON o.client_id = u.id
                 LEFT JOIN users d ON o.delivery_id = d.id
                 WHERE o.id = ?''', (order_id,))
    order = c.fetchone()
    if order:
        order = dict(order)

    if not order:
        conn.close()
        return jsonify({'error': 'Order not found'}), 404

    c.execute('SELECT * FROM order_items WHERE order_id = ?', (order_id,))
    items = [dict(row) for row in c.fetchall()]
    conn.close()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=colors.HexColor("#2C3E50"),
        spaceAfter=20,
        alignment=0 # Left
    )
    
    header_style = ParagraphStyle(
        'HeaderInfo',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.grey,
        leading=12
    )
    
    label_style = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontSize=11,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#2C3E50"),
        spaceAfter=5
    )

    elements = []

    # Header with Logo and Company Info
    logo_path = os.path.join(STATIC_DIR, 'logo.png')
    header_data = []
    
    company_info = [
        Paragraph("<b>FLEXPRESS DELIVERY</b>", styles['Heading2']),
        Paragraph("Service de Livraison Rapide", header_style),
        Paragraph("Tunis, Tunisie", header_style),
        Paragraph("Contact: +216 71 000 000", header_style),
        Paragraph("Email: contact@flexpress.tn", header_style)
    ]
    
    if os.path.exists(logo_path):
        img = Image(logo_path, 1.2*inch, 1.2*inch)
        header_data = [[company_info, img]]
    else:
        header_data = [[company_info, ""]]
        
    header_table = Table(header_data, colWidths=[4*inch, 2*inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 0.4*inch))

    # Invoice Title & Date
    elements.append(Paragraph(f"FACTURE", title_style))
    
    info_data = [
        [Paragraph(f"<b>N° Commande:</b> #{order['id']}", styles['Normal']), 
         Paragraph(f"<b>Date:</b> {order['created_at']}", styles['Normal'])],
        [Paragraph(f"<b>Statut:</b> {order['status'].upper()}", styles['Normal']), ""]
    ]
    info_table = Table(info_data, colWidths=[3*inch, 3*inch])
    elements.append(info_table)
    elements.append(Spacer(1, 0.3*inch))

    # Client & Restaurant Info
    elements.append(Paragraph("<hr/>", styles['Normal']))
    elements.append(Spacer(1, 0.1*inch))
    
    address_data = [
        [Paragraph("<b>RESTAURANT (EXPÉDITEUR)</b>", label_style), Paragraph("<b>CLIENT (DESTINATAIRE)</b>", label_style)],
        [Paragraph(str(order.get('restaurant_name', 'N/A')), styles['Normal']), Paragraph(str(order.get('client_name', 'N/A')), styles['Normal'])],
        [Paragraph(str(order.get('restaurant_address', 'N/A')), styles['Normal']), Paragraph(str(order.get('delivery_address', 'N/A')), styles['Normal'])],
        [Paragraph(f"Tel: {order.get('restaurant_phone', 'N/A')}", styles['Normal']), Paragraph(f"Tel: {order.get('client_phone', 'N/A')}", styles['Normal'])]
    ]
    
    address_table = Table(address_data, colWidths=[3.2*inch, 3.2*inch])
    address_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(address_table)
    elements.append(Spacer(1, 0.4*inch))

    # Items Table
    item_data = [["Désignation", "Quantité", "Prix Unitaire", "Total"]]
    for item in items:
        item_data.append([
            item['item_name'],
            str(item['quantity']),
            f"{item['price']:.3f} DT",
            f"{(item['price'] * item['quantity']):.3f} DT"
        ])
    
    # Empty rows for better look if few items
    while len(item_data) < 6:
        item_data.append(["", "", "", ""])

    item_table = Table(item_data, colWidths=[3.4*inch, 0.8*inch, 1.1*inch, 1.1*inch])
    item_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#2C3E50")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('ALIGN', (0,0), (0,-1), 'LEFT'), # Left align designation
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 12),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('TOPPADDING', (0,0), (-1,0), 12),
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(item_table)
    
    # Totals
    elements.append(Spacer(1, 0.2*inch))
    total_data = [
        ["", "SOUS-TOTAL", f"{order['total_price']:.3f} DT"],
        ["", "FRAIS DE LIVRAISON", "0.000 DT"],
        ["", "TOTAL GÉNÉRAL", f"{order['total_price']:.3f} DT"]
    ]
    total_table = Table(total_data, colWidths=[3.4*inch, 1.9*inch, 1.1*inch])
    total_table.setStyle(TableStyle([
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
        ('ALIGN', (2,0), (2,-1), 'RIGHT'),
        ('FONTNAME', (1,2), (2,2), 'Helvetica-Bold'),
        ('FONTSIZE', (1,2), (2,2), 14),
        ('BACKGROUND', (1,2), (2,2), colors.HexColor("#ECF0F1")),
        ('TEXTCOLOR', (1,2), (2,2), colors.HexColor("#2C3E50")),
        ('GRID', (1,2), (2,2), 1, colors.HexColor("#2C3E50")),
        ('TOPPADDING', (1,0), (-1,-1), 5),
        ('BOTTOMPADDING', (1,0), (-1,-1), 5),
    ]))
    elements.append(total_table)
    
    if order['delivery_name']:
        elements.append(Spacer(1, 0.5*inch))
        elements.append(Paragraph(f"<b>Livreur assigné:</b> {order['delivery_name']}", styles['Normal']))

    # Footer
    elements.append(Spacer(1, 1*inch))
    elements.append(Paragraph("<hr/>", styles['Normal']))
    footer_text = "Merci d'avoir choisi FLEXPRESS. Pour toute réclamation, contactez le support."
    elements.append(Paragraph(footer_text, header_style))

    doc.build(elements)
    buffer.seek(0)
    return send_file(buffer, as_attachment=True, download_name=f"commande_{order_id}.pdf", mimetype='application/pdf')

@app.route('/api/reports/daily', methods=['GET'])
@jwt_required()
def generate_daily_report():
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    date_str = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
    
    conn = get_db()
    c = conn.cursor()
    c.execute('''SELECT o.*, r.name as restaurant_name, u.username as client_name, d.username as delivery_name
                 FROM orders o
                 JOIN restaurants r ON o.restaurant_id = r.id
                 JOIN users u ON o.client_id = u.id
                 LEFT JOIN users d ON o.delivery_id = d.id
                 WHERE date(o.created_at) = date(?)''', (date_str,))
    orders = [dict(row) for row in c.fetchall()]
    conn.close()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Title'],
        fontSize=22,
        textColor=colors.HexColor("#2C3E50"),
        spaceAfter=20
    )
    
    elements = []

    # Header
    logo_path = os.path.join(STATIC_DIR, 'logo.png')
    company_info = [
        Paragraph("<b>FLEXPRESS DELIVERY</b>", styles['Heading2']),
        Paragraph("Rapport d'Activité Journalier", styles['Normal'])
    ]
    
    if os.path.exists(logo_path):
        img = Image(logo_path, 0.8*inch, 0.8*inch)
        header_table = Table([[company_info, img]], colWidths=[4.5*inch, 1.5*inch])
    else:
        header_table = Table([[company_info, ""]], colWidths=[4.5*inch, 1.5*inch])
        
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 0.3*inch))

    elements.append(Paragraph(f"BILAN JOURNALIER - {date_str}", title_style))
    elements.append(Paragraph("<hr/>", styles['Normal']))
    elements.append(Spacer(1, 0.2*inch))

    # Stats Summary
    total_revenue = sum(o['total_price'] for o in orders if o['status'] == 'delivered')
    total_orders = len(orders)
    delivered_orders = len([o for o in orders if o['status'] == 'delivered'])
    pending_orders = total_orders - delivered_orders

    stats_data = [
        [Paragraph("<b>COMMANDES TOTALES</b>", styles['Normal']), Paragraph("<b>LIVRÉES</b>", styles['Normal']), Paragraph("<b>EN COURS</b>", styles['Normal']), Paragraph("<b>CHIFFRE D'AFFAIRES</b>", styles['Normal'])],
        [str(total_orders), str(delivered_orders), str(pending_orders), f"{total_revenue:.3f} DT"]
    ]
    
    stats_table = Table(stats_data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch, 1.5*inch])
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#34495E")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,1), (-1,1), 14),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('GRID', (0,0), (-1,-1), 1, colors.whitesmoke),
    ]))
    elements.append(stats_table)
    elements.append(Spacer(1, 0.4*inch))

    # Detailed Table
    if orders:
        elements.append(Paragraph("<b>Détail des Commandes</b>", styles['Heading3']))
        elements.append(Spacer(1, 0.1*inch))
        
        report_data = [["ID", "Restaurant", "Client", "Livreur", "Total", "Statut"]]
        for o in orders:
            report_data.append([
                f"#{o['id']}",
                o['restaurant_name'],
                o['client_name'],
                o.get('delivery_name') or "N/A",
                f"{o['total_price']:.3f} DT",
                o['status'].upper()
            ])
        
        t = Table(report_data, colWidths=[0.5*inch, 1.5*inch, 1.2*inch, 1.2*inch, 0.9*inch, 0.7*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#2C3E50")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elements.append(t)
    else:
        elements.append(Paragraph("<i>Aucune commande enregistrée pour cette journée.</i>", styles['Normal']))

    # Footer
    elements.append(Spacer(1, 0.5*inch))
    elements.append(Paragraph(f"Généré le {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))

    doc.build(elements)
    buffer.seek(0)
    return send_file(buffer, as_attachment=True, download_name=f"bilan_journalier_{date_str}.pdf", mimetype='application/pdf')

@app.route('/api/reports/monthly', methods=['GET'])
@jwt_required()
def generate_monthly_report():
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    year = request.args.get('year', datetime.now().strftime('%Y'))
    month = request.args.get('month', datetime.now().strftime('%m'))
    month_year = f"{year}-{month}"
    
    conn = get_db()
    c = conn.cursor()
    c.execute('''SELECT o.*, r.name as restaurant_name, d.username as delivery_name
                 FROM orders o
                 JOIN restaurants r ON o.restaurant_id = r.id
                 LEFT JOIN users d ON o.delivery_id = d.id
                 WHERE strftime('%Y-%m', o.created_at) = ?''', (month_year,))
    orders = [dict(row) for row in c.fetchall()]
    conn.close()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Title'],
        fontSize=22,
        textColor=colors.HexColor("#2C3E50"),
        spaceAfter=20
    )
    
    elements = []

    # Header
    logo_path = os.path.join(STATIC_DIR, 'logo.png')
    company_info = [
        Paragraph("<b>FLEXPRESS DELIVERY</b>", styles['Heading2']),
        Paragraph("Rapport d'Activité Mensuel", styles['Normal'])
    ]
    
    if os.path.exists(logo_path):
        img = Image(logo_path, 0.8*inch, 0.8*inch)
        header_table = Table([[company_info, img]], colWidths=[4.5*inch, 1.5*inch])
    else:
        header_table = Table([[company_info, ""]], colWidths=[4.5*inch, 1.5*inch])
        
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 0.3*inch))

    elements.append(Paragraph(f"BILAN MENSUEL - {month}/{year}", title_style))
    elements.append(Paragraph("<hr/>", styles['Normal']))
    elements.append(Spacer(1, 0.2*inch))

    delivered = [o for o in orders if o['status'] == 'delivered']
    total_revenue = sum(o['total_price'] for o in delivered)
    
    # Summary Table
    summary_data = [
        [Paragraph("<b>TOTAL COMMANDES</b>", styles['Normal']), Paragraph("<b>LIVRÉES (SUCCÈS)</b>", styles['Normal']), Paragraph("<b>CHIFFRE D'AFFAIRES</b>", styles['Normal'])],
        [str(len(orders)), str(len(delivered)), f"{total_revenue:.3f} DT"]
    ]
    
    summary_table = Table(summary_data, colWidths=[2*inch, 2*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#2C3E50")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTSIZE', (0,1), (-1,1), 16),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('GRID', (0,0), (-1,-1), 1, colors.whitesmoke),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.5*inch))

    # Stats par restaurant
    restaurant_stats = {}
    for o in delivered:
        name = o['restaurant_name']
        restaurant_stats[name] = restaurant_stats.get(name, 0) + o['total_price']
    
    if restaurant_stats:
        elements.append(Paragraph("<b>Performance par Restaurant</b>", styles['Heading3']))
        elements.append(Spacer(1, 0.1*inch))
        
        res_data = [["Restaurant", "Chiffre d'Affaires (DT)", "Part du Marché"]]
        for name, rev in sorted(restaurant_stats.items(), key=lambda x: x[1], reverse=True):
            share = (rev / total_revenue * 100) if total_revenue > 0 else 0
            res_data.append([name, f"{rev:.3f} DT", f"{share:.1f}%"])
        
        rt = Table(res_data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
        elements.append(rt)
        elements.append(Spacer(1, 0.4*inch))

        # Monthly Detailed Orders
        elements.append(Paragraph("<b>Détail des Commandes du Mois</b>", styles['Heading3']))
        elements.append(Spacer(1, 0.1*inch))
        
        m_report_data = [["ID", "Restaurant", "Livreur", "Total", "Statut"]]
        for o in orders:
            m_report_data.append([
                f"#{o['id']}",
                o['restaurant_name'],
                o.get('delivery_name') or "N/A",
                f"{o['total_price']:.3f} DT",
                o['status'].upper()
            ])
        
        mt = Table(m_report_data, colWidths=[0.6*inch, 2*inch, 1.4*inch, 1*inch, 1*inch])
        mt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#2C3E50")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('FONTSIZE', (0,0), (-1,-1), 9),
        ]))
        elements.append(mt)
    else:
        elements.append(Paragraph("<i>Aucune donnée disponible pour ce mois.</i>", styles['Normal']))

    # Footer
    elements.append(Spacer(1, 0.5*inch))
    elements.append(Paragraph(f"Généré le {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))

    doc.build(elements)
    buffer.seek(0)
    return send_file(buffer, as_attachment=True, download_name=f"bilan_mensuel_{month}_{year}.pdf", mimetype='application/pdf')

@app.route('/api/users', methods=['POST'])
@jwt_required()
def create_user():
    """Créer un nouvel utilisateur (admin uniquement)"""
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    if current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    conn = get_db()
    c = conn.cursor()
    
    try:
        password_hash = generate_password_hash(data['password'])
        c.execute('INSERT INTO users (username, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
                  (data['username'], data['email'], password_hash, data.get('role', 'client'), data.get('phone', '')))
        conn.commit()
        user_id = c.lastrowid
        conn.close()
        return jsonify({'id': user_id, 'message': 'User created successfully'}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Username or email already exists'}), 400

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', debug=True, port=port)

