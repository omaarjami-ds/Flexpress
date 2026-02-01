from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from pymongo import MongoClient, ReturnDocument
from bson import ObjectId
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

app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
CORS(app)
jwt = JWTManager(app)

MONGO_URI = os.environ.get('MONGO_URI', "mongodb+srv://Omar:Jo191919@flexpress.fzmn57r.mongodb.net/?appName=Flexpress")
client = MongoClient(MONGO_URI)
db = client['flexpress']

# Database initialization
def get_next_sequence_value(sequence_name):
    result = db.counters.find_one_and_update(
        {'_id': sequence_name},
        {'$inc': {'sequence_value': 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    return result['sequence_value']

def init_db():
    try:
        # Create collections if they don't exist and ensure indexes
        if 'users' not in db.list_collection_names():
            db.create_collection('users')
        db.users.create_index('username', unique=True)
        db.users.create_index('email', unique=True)
        db.users.create_index('id', unique=True)
        db.users.create_index('role')
        
        if 'restaurants' not in db.list_collection_names():
            db.create_collection('restaurants')
        db.restaurants.create_index('id', unique=True)
            
        if 'orders' not in db.list_collection_names():
            db.create_collection('orders')
        db.orders.create_index('id', unique=True)
        db.orders.create_index('delivery_id')
        db.orders.create_index('client_id')
        db.orders.create_index('restaurant_id')
        db.orders.create_index('status')
        db.orders.create_index('created_at')
            
        if 'order_items' not in db.list_collection_names():
            db.create_collection('order_items')
        db.order_items.create_index('id', unique=True)
        db.order_items.create_index('order_id')
            
        if 'menu_items' not in db.list_collection_names():
            db.create_collection('menu_items')
        db.menu_items.create_index('id', unique=True)
        db.menu_items.create_index('restaurant_id')
            
        if 'counters' not in db.list_collection_names():
            db.create_collection('counters')
        
        # Initialize counters if they don't exist
        for seq in ['user_id', 'restaurant_id', 'order_id', 'order_item_id', 'menu_item_id']:
            if not db.counters.find_one({'_id': seq}):
                db.counters.insert_one({'_id': seq, 'sequence_value': 0})

        app.logger.info("MongoDB initialized successfully")
    except Exception as e:
        app.logger.error(f"DB Init Error: {e}")

def create_default_data():
    try:
        if db.users.count_documents({'username': 'admin'}) == 0:
            admin_password = generate_password_hash('admin123')
            db.users.insert_one({
                'id': get_next_sequence_value('user_id'),
                'username': 'admin',
                'email': 'admin@flexpress.com',
                'password': admin_password,
                'role': 'admin',
                'created_at': datetime.now()
            })
        
        if db.users.count_documents({'username': 'yahya'}) == 0:
            admin_password = generate_password_hash('flexpress@1919.7et7et')
            db.users.insert_one({
                'id': get_next_sequence_value('user_id'),
                'username': 'yahya',
                'email': 'yahya@flexpress.com',
                'password': admin_password,
                'role': 'admin',
                'created_at': datetime.now()
            })
        
        if db.users.count_documents({'role': 'livreur'}) == 0:
            livreur_password = generate_password_hash('livreur123')
            db.users.insert_one({
                'id': get_next_sequence_value('user_id'),
                'username': 'livreur',
                'email': 'livreur@flexpress.com',
                'password': livreur_password,
                'role': 'livreur',
                'phone': '06 12 34 56 78',
                'is_available': False,
                'created_at': datetime.now()
            })
        
        if db.users.count_documents({'role': 'client'}) == 0:
            client_password = generate_password_hash('client123')
            db.users.insert_one({
                'id': get_next_sequence_value('user_id'),
                'username': 'client',
                'email': 'client@flexpress.com',
                'password': client_password,
                'role': 'client',
                'phone': '06 98 76 54 32',
                'created_at': datetime.now()
            })
        
        if db.restaurants.count_documents({}) == 0:
            restaurants = [
                {'name': 'Pizza Express', 'description': 'Pizzas italiennes authentiques', 'latitude': 48.8566, 'longitude': 2.3522, 'address': '123 Rue de la Pizza, Paris', 'phone': '01 23 45 67 89', 'image_url': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400', 'rating': 0, 'is_active': True, 'open_time': '09:00', 'close_time': '22:00', 'created_at': datetime.now()},
                {'name': 'Burger House', 'description': 'Les meilleurs burgers de la ville', 'latitude': 48.8606, 'longitude': 2.3376, 'address': '456 Avenue des Burgers, Paris', 'phone': '01 23 45 67 90', 'image_url': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', 'rating': 0, 'is_active': True, 'open_time': '09:00', 'close_time': '22:00', 'created_at': datetime.now()},
                {'name': 'Esmiralda', 'description': 'Plats tunisiens et fast-food délicieux', 'latitude': 48.8526, 'longitude': 2.3444, 'address': '789 Boulevard Esmiralda, Paris', 'phone': '01 23 45 67 91', 'image_url': '/static/Esmiralda.png', 'rating': 0, 'is_active': True, 'open_time': '09:00', 'close_time': '22:00', 'created_at': datetime.now()},
            ]
            for restaurant in restaurants:
                restaurant['id'] = get_next_sequence_value('restaurant_id')
                db.restaurants.insert_one(restaurant)
        
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
    
    try:
        # Seuls les clients peuvent s'inscrire automatiquement
        requested_role = data.get('role', 'client')
        if requested_role != 'client':
            return jsonify({'error': 'Seuls les clients peuvent s\'inscrire.'}), 403
        
        if db.users.find_one({'$or': [{'username': data['username']}, {'email': data['email']}]}):
            return jsonify({'error': 'Username or email already exists'}), 400

        password_hash = generate_password_hash(data['password'])
        user_id = get_next_sequence_value('user_id')
        db.users.insert_one({
            'id': user_id,
            'username': data['username'],
            'email': data['email'],
            'password': password_hash,
            'role': 'client',
            'phone': data.get('phone', ''),
            'created_at': datetime.now()
        })
        
        access_token = create_access_token(
            identity=str(user_id),
            additional_claims={'role': 'client'}
        )
        return jsonify({'token': access_token, 'user': {'id': user_id, 'username': data['username'], 'role': 'client'}}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    
    username_or_email = data.get('username', '')
    user = db.users.find_one({'$or': [{'username': username_or_email}, {'email': username_or_email}]})
    
    if user and check_password_hash(user['password'], data['password']):
        # Créer le token avec l'ID utilisateur comme identity (chaîne)
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
    
    user = db.users.find_one({'id': user_id}, {'password': 0, '_id': 0})
    
    if user:
        return jsonify(user), 200
    return jsonify({'error': 'User not found'}), 404

@app.route('/api/user/status', methods=['GET', 'POST', 'PUT'])
@jwt_required()
def update_status():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    
    if request.method == 'GET':
        user = db.users.find_one({'id': current_user['id']}, {'_id': 0, 'is_available': 1})
        return jsonify({'is_available': user.get('is_available', False)}), 200
        
    # Seuls les livreurs peuvent changer leur statut de disponibilité
    if current_user['role'] != 'livreur':
        return jsonify({'error': 'Unauthorized'}), 403
        
    user_id = current_user['id']
    data = request.json
    is_available = data.get('is_available', False)
    
    db.users.update_one({'id': user_id}, {'$set': {'is_available': is_available}})
    return jsonify({'message': 'Status updated', 'is_available': is_available}), 200

@app.route('/api/user/location', methods=['POST', 'PUT'])
@jwt_required()
def update_location():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    user_id = current_user['id']
    data = request.json
    
    db.users.update_one({'id': user_id}, {'$set': {'latitude': data['latitude'], 'longitude': data['longitude']}})
    return jsonify({'message': 'Location updated'}), 200

@app.route('/api/user/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    user_id = current_user['id']
    data = request.json
    
    update_data = {}
    if 'email' in data:
        update_data['email'] = data['email']
    if 'phone' in data:
        update_data['phone'] = data['phone']
    if 'username' in data:
        update_data['username'] = data['username']
    
    if update_data:
        db.users.update_one({'id': user_id}, {'$set': update_data})
        
    updated_user = db.users.find_one({'id': user_id}, {'password': 0, '_id': 0})
    return jsonify({'message': 'Profile updated', 'user': updated_user}), 200

@app.route('/api/user/addresses', methods=['GET'])
@jwt_required()
def get_addresses():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    user_id = current_user['id']
    
    user = db.users.find_one({'id': user_id}, {'addresses': 1, '_id': 0})
    addresses = user.get('addresses', [])
    return jsonify(addresses), 200

@app.route('/api/user/addresses', methods=['POST'])
@jwt_required()
def add_address():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    user_id = current_user['id']
    data = request.json
    
    if 'address' not in data:
        return jsonify({'error': 'Address is required'}), 400
        
    db.users.update_one(
        {'id': user_id},
        {'$push': {'addresses': {
            'id': datetime.now().strftime('%Y%m%d%H%M%S'),
            'label': data.get('label', 'Autre'),
            'address': data['address'],
            'created_at': datetime.now()
        }}}
    )
    
    user = db.users.find_one({'id': user_id}, {'addresses': 1, '_id': 0})
    return jsonify({'message': 'Address added', 'addresses': user.get('addresses', [])}), 200

@app.route('/api/user/addresses/<string:addr_id>', methods=['DELETE'])
@jwt_required()
def delete_address(addr_id):
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    user_id = current_user['id']
    
    db.users.update_one(
        {'id': user_id},
        {'$pull': {'addresses': {'id': addr_id}}}
    )
    
    user = db.users.find_one({'id': user_id}, {'addresses': 1, '_id': 0})
    return jsonify({'message': 'Address deleted', 'addresses': user.get('addresses', [])}), 200

# Restaurant routes
@app.route('/api/restaurants', methods=['GET'])
def get_restaurants():
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    only_open = request.args.get('only_open', 'false').lower() == 'true'
    
    restaurants = list(db.restaurants.find({'is_active': True}, {'_id': 0}))
    
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
    
    restaurant_id = get_next_sequence_value('restaurant_id')
    db.restaurants.insert_one({
        'id': restaurant_id,
        'name': data['name'],
        'description': data.get('description', ''),
        'latitude': latitude,
        'longitude': longitude,
        'address': data.get('address', ''),
        'phone': data.get('phone', ''),
        'image_url': data.get('image_url', ''),
        'open_time': data.get('open_time', '09:00'),
        'close_time': data.get('close_time', '22:00'),
        'is_active': True,
        'rating': 0,
        'created_at': datetime.now()
    })
    
    return jsonify({'id': restaurant_id, 'message': 'Restaurant created'}), 201

@app.route('/api/restaurants/<int:restaurant_id>', methods=['PUT'])
@jwt_required()
def update_restaurant(restaurant_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    update_data = {}
    for key in ['name', 'description', 'latitude', 'longitude', 'address', 'phone', 'image_url', 'is_active', 'open_time', 'close_time', 'rating']:
        if key in data:
            update_data[key] = data[key]
    
    if not update_data:
        return jsonify({'error': 'No fields to update'}), 400
        
    db.restaurants.update_one({'id': restaurant_id}, {'$set': update_data})
    return jsonify({'message': 'Restaurant updated'}), 200

@app.route('/api/restaurants/<int:restaurant_id>', methods=['DELETE'])
@jwt_required()
def delete_restaurant(restaurant_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Check if there are orders for this restaurant
    orders_count = db.orders.count_documents({'restaurant_id': restaurant_id})
    if orders_count > 0:
        # If there are orders, maybe we should just deactivate it instead of hard delete
        # but for now, let's just delete the restaurant and its menu items
        pass

    db.restaurants.delete_one({'id': restaurant_id})
    db.menu_items.delete_many({'restaurant_id': restaurant_id})
    
    return jsonify({'message': 'Restaurant and its menu items deleted'}), 200

@app.route('/api/restaurants/<int:restaurant_id>/menu', methods=['GET'])
def get_restaurant_menu(restaurant_id):
    menu_items = list(db.menu_items.find({'restaurant_id': restaurant_id, 'is_available': True}, {'_id': 0}).sort([('category', 1), ('name', 1)]))
    return jsonify(menu_items), 200

@app.route('/api/restaurants/<int:restaurant_id>/menu', methods=['POST'])
@jwt_required()
def add_menu_item(restaurant_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    item_id = get_next_sequence_value('menu_item_id')
    db.menu_items.insert_one({
        'id': item_id,
        'restaurant_id': restaurant_id,
        'name': data['name'],
        'description': data.get('description', ''),
        'price': float(data.get('price', 0)),
        'category': data.get('category', 'Plat'),
        'image_url': data.get('image_url', ''),
        'is_popular': data.get('is_popular', False),
        'is_featured': data.get('is_featured', False),
        'is_available': True,
        'created_at': datetime.now()
    })
    return jsonify({'id': item_id, 'message': 'Menu item added'}), 201

@app.route('/api/menu-items/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_menu_item(item_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    update_data = {}
    for key in ['name', 'description', 'price', 'category', 'image_url', 'is_available', 'is_popular', 'is_featured']:
        if key in data:
            if key == 'price':
                try:
                    update_data[key] = float(data[key])
                except (ValueError, TypeError):
                    update_data[key] = 0.0
            else:
                update_data[key] = data[key]
    
    if not update_data:
        return jsonify({'error': 'No fields to update'}), 400
        
    db.menu_items.update_one({'id': item_id}, {'$set': update_data})
    return jsonify({'message': 'Menu item updated'}), 200

@app.route('/api/menu-items/popular', methods=['GET'])
def get_popular_items():
    items = list(db.menu_items.aggregate([
        {'$match': {'is_popular': True, 'is_available': True}},
        {'$lookup': {
            'from': 'restaurants',
            'localField': 'restaurant_id',
            'foreignField': 'id',
            'as': 'restaurant'
        }},
        {'$unwind': '$restaurant'},
        {'$project': {
            'id': 1,
            'restaurant_id': 1,
            'name': 1,
            'description': 1,
            'price': 1,
            'category': 1,
            'image_url': 1,
            'is_popular': 1,
            'is_featured': 1,
            'restaurant_name': '$restaurant.name',
            '_id': 0
        }},
        {'$limit': 10}
    ]))
    return jsonify(items), 200

@app.route('/api/menu-items/makloub', methods=['GET'])
def get_makloub_items():
    items = list(db.menu_items.aggregate([
        {'$match': {
            '$or': [
                {'category': {'$regex': 'Makloub', '$options': 'i'}},
                {'name': {'$regex': 'Makloub', '$options': 'i'}}
            ],
            'is_available': True
        }},
        {'$lookup': {
            'from': 'restaurants',
            'localField': 'restaurant_id',
            'foreignField': 'id',
            'as': 'restaurant'
        }},
        {'$unwind': '$restaurant'},
        {'$project': {
            'id': 1,
            'restaurant_id': 1,
            'name': 1,
            'description': 1,
            'price': 1,
            'category': 1,
            'image_url': 1,
            'is_popular': 1,
            'is_featured': 1,
            'restaurant_name': '$restaurant.name',
            '_id': 0
        }},
        {'$limit': 10}
    ]))
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
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        restaurant_id = data.get('restaurant_id')
        if restaurant_id is None:
            return jsonify({'error': 'restaurant_id is required'}), 400
        
        try:
            restaurant_id = int(restaurant_id)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid restaurant_id format'}), 400

        restaurant = db.restaurants.find_one({'id': restaurant_id})
        
        if not restaurant:
            delivery_lat = float(data.get('delivery_latitude', 36.8065))
            delivery_lon = float(data.get('delivery_longitude', 10.1815))
            delivery_addr = str(data.get('delivery_address', ''))
            
            restaurant_name = 'Restaurant Personnalisé'
            if delivery_addr.startswith('[') and ']' in delivery_addr:
                end_bracket = delivery_addr.index(']')
                restaurant_name = delivery_addr[1:end_bracket]
                delivery_addr = delivery_addr[end_bracket + 1:].strip()
            
            restaurant_id = get_next_sequence_value('restaurant_id')
            db.restaurants.insert_one({
                'id': restaurant_id,
                'name': restaurant_name,
                'description': 'Restaurant ajouté manuellement',
                'latitude': delivery_lat,
                'longitude': delivery_lon,
                'address': delivery_addr,
                'is_active': True,
                'created_at': datetime.now()
            })
            restaurant = db.restaurants.find_one({'id': restaurant_id})

        delivery_lat = float(data.get('delivery_latitude', 0))
        delivery_lon = float(data.get('delivery_longitude', 0))
        
        estimated_delivery_time = 30
        if restaurant and restaurant.get('latitude') and restaurant.get('longitude'):
            distance_km = calculate_distance(restaurant['latitude'], restaurant['longitude'], delivery_lat, delivery_lon)
            estimated_delivery_time = int(max(15, min(75, round(distance_km * 8 + 10))))

        order_id = get_next_sequence_value('order_id')
        db.orders.insert_one({
            'id': order_id,
            'client_id': current_user['id'],
            'restaurant_id': restaurant_id,
            'status': 'pending',
            'total_price': float(data['total_price']),
            'delivery_address': data['delivery_address'],
            'delivery_latitude': delivery_lat,
            'delivery_longitude': delivery_lon,
            'delivery_id': None,
            'estimated_delivery_time': estimated_delivery_time,
            'created_at': datetime.now()
        })
        
        for item in data['items']:
            db.order_items.insert_one({
                'id': get_next_sequence_value('order_item_id'),
                'order_id': order_id,
                'item_name': item['name'],
                'quantity': int(item['quantity']),
                'price': float(item['price']),
                'comment': item.get('comment', '')
            })
        
        return jsonify({'id': order_id, 'message': 'Order created successfully'}), 201
            
    except Exception as e:
        app.logger.error(f'Error in create_order: {str(e)}\n{traceback.format_exc()}')
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/orders', methods=['GET'])
@jwt_required()
def get_orders():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    
    status_filter = request.args.get('status')
    
    orders = []
    if current_user['role'] == 'client':
        match_query = {'client_id': current_user['id']}
        if status_filter:
            match_query['status'] = status_filter
            
        orders = list(db.orders.aggregate([
            {'$match': match_query},
            {'$lookup': {'from': 'restaurants', 'localField': 'restaurant_id', 'foreignField': 'id', 'as': 'restaurant'}},
            {'$unwind': '$restaurant'},
            {'$lookup': {'from': 'users', 'localField': 'delivery_id', 'foreignField': 'id', 'as': 'driver'}},
            {'$unwind': {'path': '$driver', 'preserveNullAndEmptyArrays': True}},
            {'$lookup': {'from': 'order_items', 'localField': 'id', 'foreignField': 'order_id', 'as': 'items'}},
            {'$project': {
                'id': 1, 'client_id': 1, 'restaurant_id': 1, 'status': 1, 'total_price': 1,
                'delivery_address': 1, 'delivery_latitude': 1, 'delivery_longitude': 1, 'delivery_id': 1,
                'estimated_delivery_time': 1, 'created_at': 1, 
                'items': {
                    '$map': {
                        'input': '$items',
                        'as': 'item',
                        'in': {
                            'id': '$$item.id',
                            'order_id': '$$item.order_id',
                            'item_id': '$$item.item_id',
                            'item_name': '$$item.item_name',
                            'quantity': '$$item.quantity',
                            'price': '$$item.price',
                            'comment': '$$item.comment'
                        }
                    }
                },
                'restaurant_name': '$restaurant.name', 'restaurant_latitude': '$restaurant.latitude', 'restaurant_longitude': '$restaurant.longitude',
                'driver_lat': '$driver.latitude', 'driver_lon': '$driver.longitude', 'driver_name': '$driver.username', '_id': 0
            }},
            {'$sort': {'created_at': -1}}
        ]))
    elif current_user['role'] == 'livreur':
        match_query = {'delivery_id': current_user['id']}
        if status_filter:
            if ',' in status_filter:
                match_query['status'] = {'$in': status_filter.split(',')}
            else:
                match_query['status'] = status_filter
        
        orders = list(db.orders.aggregate([
            {'$match': match_query},
            {'$lookup': {'from': 'restaurants', 'localField': 'restaurant_id', 'foreignField': 'id', 'as': 'restaurant'}},
            {'$unwind': '$restaurant'},
            {'$lookup': {'from': 'users', 'localField': 'client_id', 'foreignField': 'id', 'as': 'client'}},
            {'$unwind': '$client'},
            {'$lookup': {'from': 'order_items', 'localField': 'id', 'foreignField': 'order_id', 'as': 'items'}},
            {'$project': {
                '_id': 0, 'id': 1, 'client_id': 1, 'restaurant_id': 1, 'status': 1, 'total_price': 1,
                'delivery_address': 1, 'delivery_latitude': 1, 'delivery_longitude': 1, 'delivery_id': 1,
                'estimated_delivery_time': 1, 'created_at': 1,
                'items': {
                    '$map': {
                        'input': '$items',
                        'as': 'item',
                        'in': {
                            'id': '$$item.id',
                            'order_id': '$$item.order_id',
                            'item_id': '$$item.item_id',
                            'item_name': '$$item.item_name',
                            'quantity': '$$item.quantity',
                            'price': '$$item.price',
                            'comment': '$$item.comment'
                        }
                    }
                },
                'restaurant_name': '$restaurant.name',
                'client_name': '$client.username', 'client_lat': '$client.latitude', 'client_lon': '$client.longitude', 'client_phone': '$client.phone'
            }},
            {'$sort': {'created_at': -1}}
        ]))
    else:  # admin
        match_query = {}
        if status_filter:
            if ',' in status_filter:
                match_query['status'] = {'$in': status_filter.split(',')}
            else:
                match_query['status'] = status_filter
                
        pipeline = []
        if match_query:
            pipeline.append({'$match': match_query})
            
        pipeline.extend([
            {'$lookup': {'from': 'restaurants', 'localField': 'restaurant_id', 'foreignField': 'id', 'as': 'restaurant'}},
            {'$unwind': '$restaurant'},
            {'$lookup': {'from': 'users', 'localField': 'client_id', 'foreignField': 'id', 'as': 'client'}},
            {'$unwind': '$client'},
            {'$lookup': {'from': 'users', 'localField': 'delivery_id', 'foreignField': 'id', 'as': 'driver'}},
            {'$unwind': {'path': '$driver', 'preserveNullAndEmptyArrays': True}},
            {'$lookup': {'from': 'order_items', 'localField': 'id', 'foreignField': 'order_id', 'as': 'items'}},
            {'$project': {
                'id': 1, 'client_id': 1, 'restaurant_id': 1, 'status': 1, 'total_price': 1,
                'delivery_address': 1, 'delivery_latitude': 1, 'delivery_longitude': 1, 'delivery_id': 1,
                'estimated_delivery_time': 1, 'created_at': 1,
                'items': {
                    '$map': {
                        'input': '$items',
                        'as': 'item',
                        'in': {
                            'id': '$$item.id',
                            'order_id': '$$item.order_id',
                            'item_id': '$$item.item_id',
                            'item_name': '$$item.item_name',
                            'quantity': '$$item.quantity',
                            'price': '$$item.price',
                            'comment': '$$item.comment'
                        }
                    }
                },
                'restaurant_name': '$restaurant.name',
                'client_name': '$client.username', 'client_lat': '$client.latitude', 'client_lon': '$client.longitude',
                'delivery_name': '$driver.username', 'delivery_lat': '$driver.latitude', 'delivery_lon': '$driver.longitude', '_id': 0
            }},
            {'$sort': {'created_at': -1}}
        ])
        orders = list(db.orders.aggregate(pipeline))
    
    return jsonify(orders), 200

@app.route('/api/orders/<int:order_id>/accept', methods=['POST'])
@jwt_required()
def accept_order(order_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'livreur':
        return jsonify({'error': 'Unauthorized'}), 403
    
    result = db.orders.update_one(
        {'id': order_id, 'status': 'pending', 'delivery_id': None},
        {'$set': {'delivery_id': current_user['id'], 'status': 'accepted'}}
    )
    
    if result.matched_count == 0:
        return jsonify({'error': 'Order not found or already taken'}), 400
    
    return jsonify({'message': 'Order accepted successfully'}), 200

@app.route('/api/orders/<int:order_id>/status', methods=['PUT'])
@jwt_required()
def update_order_status(order_id):
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    
    data = request.json
    new_status = data.get('status')
    
    if current_user['role'] == 'livreur':
        result = db.orders.update_one(
            {'id': order_id, 'delivery_id': current_user['id']},
            {'$set': {'status': new_status}}
        )
    elif current_user['role'] == 'admin':
        result = db.orders.update_one(
            {'id': order_id},
            {'$set': {'status': new_status}}
        )
    else:
        return jsonify({'error': 'Unauthorized'}), 403
    
    if result.matched_count == 0:
        return jsonify({'error': 'Order not found or unauthorized'}), 404
        
    return jsonify({'message': 'Status updated'}), 200

@app.route('/api/orders/<int:order_id>', methods=['PUT'])
@jwt_required()
def update_order(order_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    update_data = {}
    
    # Fields that can be updated by admin
    for key in ['status', 'total_price', 'delivery_address', 'delivery_latitude', 'delivery_longitude', 'delivery_id', 'estimated_delivery_time']:
        if key in data:
            update_data[key] = data[key]
            
    if not update_data:
        return jsonify({'error': 'No fields to update'}), 400
        
    db.orders.update_one({'id': order_id}, {'$set': update_data})
    
    # If items are provided, update them too
    if 'items' in data:
        db.order_items.delete_many({'order_id': order_id})
        for item in data['items']:
            db.order_items.insert_one({
                'id': get_next_sequence_value('order_item_id'),
                'order_id': order_id,
                'item_id': item.get('item_id'),
                'item_name': item.get('item_name'),
                'quantity': item.get('quantity', 1),
                'price': item.get('price', 0)
            })
            
    return jsonify({'message': 'Order updated successfully'}), 200

@app.route('/api/orders/<int:order_id>', methods=['DELETE'])
@jwt_required()
def cancel_order(order_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.orders.update_one({'id': order_id}, {'$set': {'status': 'cancelled'}})
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
    
    db.orders.update_one({'id': order_id}, {'$set': {'delivery_id': int(delivery_id), 'status': 'accepted'}})
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
    
    orders = list(db.orders.aggregate([
        {'$match': {'status': 'pending'}},
        {'$lookup': {'from': 'restaurants', 'localField': 'restaurant_id', 'foreignField': 'id', 'as': 'restaurant'}},
        {'$unwind': '$restaurant'},
        {'$lookup': {'from': 'users', 'localField': 'client_id', 'foreignField': 'id', 'as': 'client'}},
        {'$unwind': '$client'},
        {'$lookup': {'from': 'order_items', 'localField': 'id', 'foreignField': 'order_id', 'as': 'items'}},
        {'$project': {
            'id': 1, 'client_id': 1, 'restaurant_id': 1, 'status': 1, 'total_price': 1,
            'delivery_address': 1, 'delivery_latitude': 1, 'delivery_longitude': 1, 'delivery_id': 1,
            'estimated_delivery_time': 1, 'created_at': 1,
            'items': {
                '$map': {
                    'input': '$items',
                    'as': 'item',
                    'in': {
                        'id': '$$item.id',
                        'order_id': '$$item.order_id',
                        'item_id': '$$item.item_id',
                        'item_name': '$$item.item_name',
                        'quantity': '$$item.quantity',
                        'price': '$$item.price',
                        'comment': '$$item.comment'
                    }
                }
            },
            'restaurant_name': '$restaurant.name', 'restaurant_lat': '$restaurant.latitude', 'restaurant_lon': '$restaurant.longitude',
            'client_name': '$client.username', 'client_lat': '$client.latitude', 'client_lon': '$client.longitude', 'client_phone': '$client.phone', '_id': 0
        }},
        {'$sort': {'created_at': -1}}
    ]))
    
    return jsonify(orders), 200

@app.route('/api/orders/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order_details(order_id):
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Invalid token'}), 401
    
    order = db.orders.aggregate([
        {'$match': {'id': order_id}},
        {'$lookup': {'from': 'restaurants', 'localField': 'restaurant_id', 'foreignField': 'id', 'as': 'restaurant'}},
        {'$unwind': '$restaurant'},
        {'$lookup': {'from': 'users', 'localField': 'client_id', 'foreignField': 'id', 'as': 'client'}},
        {'$unwind': '$client'},
        {'$lookup': {'from': 'order_items', 'localField': 'id', 'foreignField': 'order_id', 'as': 'items'}},
        {'$project': {
            'id': 1, 'client_id': 1, 'restaurant_id': 1, 'status': 1, 'total_price': 1,
            'delivery_address': 1, 'delivery_latitude': 1, 'delivery_longitude': 1, 'delivery_id': 1,
            'estimated_delivery_time': 1, 'created_at': 1,
            'items': {
                '$map': {
                    'input': '$items',
                    'as': 'item',
                    'in': {
                        'id': '$$item.id',
                        'order_id': '$$item.order_id',
                        'item_id': '$$item.item_id',
                        'item_name': '$$item.item_name',
                        'quantity': '$$item.quantity',
                        'price': '$$item.price',
                        'comment': '$$item.comment'
                    }
                }
            },
            'restaurant_name': '$restaurant.name', 'client_name': '$client.username', 'client_phone': '$client.phone', '_id': 0
        }}
    ])
    
    order = next(order, None)
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    
    return jsonify(order), 200

@app.route('/api/livreur/stats', methods=['GET'])
@jwt_required()
def get_livreur_stats():
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'livreur':
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Statistiques globales
    stats_pipeline = [
        {'$match': {'delivery_id': current_user['id']}},
        {'$group': {
            '_id': None,
            'total_orders': {'$sum': 1},
            'total_earnings': {'$sum': '$total_price'},
            'delivered_orders': {'$sum': {'$cond': [{'$eq': ['$status', 'delivered']}, 1, 0]}},
            'cancelled_orders': {'$sum': {'$cond': [{'$eq': ['$status', 'cancelled']}, 1, 0]}}
        }}
    ]
    stats = next(db.orders.aggregate(stats_pipeline), {'total_orders': 0, 'total_earnings': 0, 'delivered_orders': 0, 'cancelled_orders': 0})
    if '_id' in stats: del stats['_id']
    
    # Statistiques du jour
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_stats_pipeline = [
        {'$match': {'delivery_id': current_user['id'], 'created_at': {'$gte': today}}},
        {'$group': {
            '_id': None,
            'today_orders': {'$sum': 1},
            'today_earnings': {'$sum': '$total_price'}
        }}
    ]
    today_stats = next(db.orders.aggregate(today_stats_pipeline), {'today_orders': 0, 'today_earnings': 0})
    if '_id' in today_stats: del today_stats['_id']
    
    stats.update(today_stats)
    
    # Historique récent
    recent_orders = list(db.orders.aggregate([
        {'$match': {'delivery_id': current_user['id']}},
        {'$lookup': {'from': 'restaurants', 'localField': 'restaurant_id', 'foreignField': 'id', 'as': 'restaurant'}},
        {'$unwind': '$restaurant'},
        {'$lookup': {'from': 'users', 'localField': 'client_id', 'foreignField': 'id', 'as': 'client'}},
        {'$unwind': '$client'},
        {'$lookup': {'from': 'order_items', 'localField': 'id', 'foreignField': 'order_id', 'as': 'items'}},
        {'$project': {
            'id': 1, 'total_price': 1, 'status': 1, 'created_at': 1, 
            'delivery_latitude': 1, 'delivery_longitude': 1,
            'restaurant_name': '$restaurant.name', 
            'client_phone': '$client.phone',
            'client_lat': '$client.latitude',
            'client_lon': '$client.longitude',
            'items': {
                '$map': {
                    'input': '$items',
                    'as': 'item',
                    'in': {
                        'id': '$$item.id',
                        'order_id': '$$item.order_id',
                        'item_id': '$$item.item_id',
                        'item_name': '$$item.item_name',
                        'quantity': '$$item.quantity',
                        'price': '$$item.price',
                        'comment': '$$item.comment'
                    }
                }
            }, '_id': 0
        }},
        {'$sort': {'created_at': -1}}
    ]))

    return jsonify({'stats': stats, 'recent_orders': recent_orders}), 200

# User management routes (Admin only)
@app.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    users = list(db.users.find({}, {'password': 0, '_id': 0}).sort('created_at', -1))
    return jsonify(users), 200

@app.route('/api/users', methods=['POST'])
@jwt_required()
def create_user():
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    try:
        if db.users.find_one({'$or': [{'username': data['username']}, {'email': data['email']}]}):
            return jsonify({'error': 'Username or email already exists'}), 400

        password_hash = generate_password_hash(data['password'])
        user_id = get_next_sequence_value('user_id')
        db.users.insert_one({
            'id': user_id,
            'username': data['username'],
            'email': data['email'],
            'password': password_hash,
            'role': data.get('role', 'client'),
            'phone': data.get('phone', ''),
            'is_available': False,
            'created_at': datetime.now()
        })
        return jsonify({'id': user_id, 'message': 'User created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    if current_user['id'] == user_id:
        return jsonify({'error': 'Cannot delete your own account'}), 400
    
    db.users.delete_one({'id': user_id})
    return jsonify({'message': 'User deleted'}), 200

@app.route('/api/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    update_data = {}
    for key in ['username', 'email', 'role', 'phone', 'is_available']:
        if key in data:
            update_data[key] = data[key]
    
    if 'password' in data and data['password']:
        update_data['password'] = generate_password_hash(data['password'])
        
    if not update_data:
        return jsonify({'error': 'No fields to update'}), 400
        
    db.users.update_one({'id': user_id}, {'$set': update_data})
    return jsonify({'message': 'User updated'}), 200

@app.route('/api/users/<int:user_id>/role', methods=['PUT'])
@jwt_required()
def update_user_role(user_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    db.users.update_one({'id': user_id}, {'$set': {'role': data['role']}})
    return jsonify({'message': 'User role updated'}), 200

# PDF Reports and Professional Features
@app.route('/api/orders/<int:order_id>/pdf', methods=['GET'])
@jwt_required()
def generate_order_pdf(order_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] not in ['admin', 'client', 'livreur']:
        return jsonify({'error': 'Unauthorized'}), 403

    order = list(db.orders.aggregate([
        {'$match': {'id': order_id}},
        {'$lookup': {'from': 'restaurants', 'localField': 'restaurant_id', 'foreignField': 'id', 'as': 'restaurant'}},
        {'$unwind': '$restaurant'},
        {'$lookup': {'from': 'users', 'localField': 'client_id', 'foreignField': 'id', 'as': 'client'}},
        {'$unwind': '$client'},
        {'$lookup': {'from': 'users', 'localField': 'delivery_id', 'foreignField': 'id', 'as': 'driver'}},
        {'$unwind': {'path': '$driver', 'preserveNullAndEmptyArrays': True}},
        {'$project': {
            'id': 1, 'created_at': 1, 'status': 1, 'total_price': 1, 'delivery_address': 1,
            'restaurant_name': '$restaurant.name', 'restaurant_address': '$restaurant.address', 'restaurant_phone': '$restaurant.phone',
            'client_name': '$client.username', 'client_email': '$client.email', 'client_phone': '$client.phone',
            'delivery_name': '$driver.username', '_id': 0
        }}
    ]))
    
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    order = order[0]

    items = list(db.order_items.find({'order_id': order_id}, {'_id': 0}))

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=28,
        textColor=colors.HexColor("#1A237E"),
        spaceAfter=25,
        alignment=1 # Center
    )
    
    header_style = ParagraphStyle(
        'HeaderInfo',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.darkslategray,
        leading=14
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
        Paragraph("Contact: <b>22 749 748</b>", header_style),
        Paragraph("Email: <b>flexpress.contact@gmail.com</b>", header_style)
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
    footer_text = "<b>FLEXPRESS</b> - 22 749 748 - flexpress.contact@gmail.com<br/>Merci d'avoir choisi FLEXPRESS. Pour toute réclamation, contactez le support."
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
    start_date = datetime.strptime(date_str, '%Y-%m-%d')
    end_date = start_date + timedelta(days=1)
    
    orders = list(db.orders.aggregate([
        {'$match': {'created_at': {'$gte': start_date, '$lt': end_date}}},
        {'$lookup': {'from': 'restaurants', 'localField': 'restaurant_id', 'foreignField': 'id', 'as': 'restaurant'}},
        {'$unwind': '$restaurant'},
        {'$lookup': {'from': 'users', 'localField': 'client_id', 'foreignField': 'id', 'as': 'client'}},
        {'$unwind': '$client'},
        {'$lookup': {'from': 'users', 'localField': 'delivery_id', 'foreignField': 'id', 'as': 'driver'}},
        {'$unwind': {'path': '$driver', 'preserveNullAndEmptyArrays': True}},
        {'$project': {
            'id': 1, 'total_price': 1, 'status': 1,
            'restaurant_name': '$restaurant.name', 'client_name': '$client.username', 'delivery_name': '$driver.username', '_id': 0
        }}
    ]))

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    
    header_style = ParagraphStyle(
        'HeaderInfo',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.darkslategray,
        leading=14
    )
    
    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=colors.HexColor("#1A237E"),
        spaceAfter=25,
        alignment=1 # Center
    )
    
    elements = []

    # Header
    logo_path = os.path.join(STATIC_DIR, 'logo.png')
    company_info = [
        Paragraph("<b>FLEXPRESS DELIVERY</b>", styles['Heading2']),
        Paragraph("Rapport d'Activité Journalier", styles['Normal']),
        Paragraph("Contact: 22 749 748 | Email: flexpress.contact@gmail.com", header_style)
    ]
    
    if os.path.exists(logo_path):
        img = Image(logo_path, 1.2*inch, 1.2*inch)
        header_table = Table([[company_info, img]], colWidths=[4*inch, 2*inch])
    else:
        header_table = Table([[company_info, ""]], colWidths=[4*inch, 2*inch])
        
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
    elements.append(Paragraph("<hr/>", styles['Normal']))
    footer_text = "<b>FLEXPRESS</b> - 22 749 748 - flexpress.contact@gmail.com<br/>Document généré automatiquement le " + datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    elements.append(Paragraph(footer_text, header_style))

    doc.build(elements)
    buffer.seek(0)
    return send_file(buffer, as_attachment=True, download_name=f"bilan_journalier_{date_str}.pdf", mimetype='application/pdf')

@app.route('/api/reports/monthly', methods=['GET'])
@jwt_required()
def generate_monthly_report():
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    year = int(request.args.get('year', datetime.now().year))
    month = int(request.args.get('month', datetime.now().month))
    
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
    
    orders = list(db.orders.aggregate([
        {'$match': {'created_at': {'$gte': start_date, '$lt': end_date}}},
        {'$lookup': {'from': 'restaurants', 'localField': 'restaurant_id', 'foreignField': 'id', 'as': 'restaurant'}},
        {'$unwind': '$restaurant'},
        {'$lookup': {'from': 'users', 'localField': 'delivery_id', 'foreignField': 'id', 'as': 'driver'}},
        {'$unwind': {'path': '$driver', 'preserveNullAndEmptyArrays': True}},
        {'$project': {
            'id': 1, 'total_price': 1, 'status': 1,
            'restaurant_name': '$restaurant.name', 'delivery_name': '$driver.username', '_id': 0
        }}
    ]))

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    
    header_style = ParagraphStyle(
        'HeaderInfo',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.darkslategray,
        leading=14
    )
    
    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=colors.HexColor("#1A237E"),
        spaceAfter=25,
        alignment=1 # Center
    )
    
    elements = []

    # Header
    logo_path = os.path.join(STATIC_DIR, 'logo.png')
    company_info = [
        Paragraph("<b>FLEXPRESS DELIVERY</b>", styles['Heading2']),
        Paragraph("Rapport d'Activité Mensuel", styles['Normal']),
        Paragraph("Contact: 22 749 748 | Email: flexpress.contact@gmail.com", header_style)
    ]
    
    if os.path.exists(logo_path):
        img = Image(logo_path, 1.2*inch, 1.2*inch)
        header_table = Table([[company_info, img]], colWidths=[4*inch, 2*inch])
    else:
        header_table = Table([[company_info, ""]], colWidths=[4*inch, 2*inch])
        
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 0.3*inch))

    elements.append(Paragraph(f"BILAN MENSUEL - {month:02d}/{year}", title_style))
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
    elements.append(Paragraph("<hr/>", styles['Normal']))
    footer_text = "<b>FLEXPRESS</b> - 22 749 748 - flexpress.contact@gmail.com<br/>Document généré automatiquement le " + datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    elements.append(Paragraph(footer_text, header_style))

    doc.build(elements)
    buffer.seek(0)
    return send_file(buffer, as_attachment=True, download_name=f"bilan_mensuel_{month}_{year}.pdf", mimetype='application/pdf')

@app.route('/api/reports/custom', methods=['GET'])
@jwt_required()
def generate_custom_report():
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    if not start_date_str or not end_date_str:
        return jsonify({'error': 'Dates manquantes'}), 400

    start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
    # On ajoute un jour à la date de fin pour inclure toute la journée
    end_date = datetime.strptime(end_date_str, '%Y-%m-%d') + timedelta(days=1)
    
    orders = list(db.orders.aggregate([
        {'$match': {'created_at': {'$gte': start_date, '$lt': end_date}}},
        {'$lookup': {'from': 'restaurants', 'localField': 'restaurant_id', 'foreignField': 'id', 'as': 'restaurant'}},
        {'$unwind': '$restaurant'},
        {'$lookup': {'from': 'users', 'localField': 'delivery_id', 'foreignField': 'id', 'as': 'driver'}},
        {'$unwind': {'path': '$driver', 'preserveNullAndEmptyArrays': True}},
        {'$project': {
            'id': 1, 'total_price': 1, 'status': 1,
            'restaurant_name': '$restaurant.name', 'delivery_name': '$driver.username', '_id': 0
        }}
    ]))

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    
    header_style = ParagraphStyle(
        'HeaderInfo',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.darkslategray,
        leading=14
    )

    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=colors.HexColor("#1A237E"),
        spaceAfter=25,
        alignment=1 # Center
    )
    
    elements = []

    # Header
    logo_path = os.path.join(STATIC_DIR, 'logo.png')
    company_info = [
        Paragraph("<b>FLEXPRESS DELIVERY</b>", styles['Heading2']),
        Paragraph("Rapport d'Activité Personnalisé", styles['Normal']),
        Paragraph("Contact: 22 749 748 | Email: flexpress.contact@gmail.com", header_style)
    ]
    
    if os.path.exists(logo_path):
        img = Image(logo_path, 1.2*inch, 1.2*inch)
        header_table = Table([[company_info, img]], colWidths=[4*inch, 2*inch])
    else:
        header_table = Table([[company_info, ""]], colWidths=[4*inch, 2*inch])
        
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 0.3*inch))

    elements.append(Paragraph(f"BILAN DU {start_date_str} AU {end_date_str}", title_style))
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

    if orders:
        elements.append(Paragraph("<b>Détail des Commandes de la Période</b>", styles['Heading3']))
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
        elements.append(Paragraph("<i>Aucune donnée disponible pour cette période.</i>", styles['Normal']))

    # Footer
    elements.append(Spacer(1, 0.5*inch))
    elements.append(Paragraph("<hr/>", styles['Normal']))
    footer_text = "<b>FLEXPRESS</b> - 22 749 748 - flexpress.contact@gmail.com<br/>Document généré automatiquement le " + datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    elements.append(Paragraph(footer_text, header_style))

    doc.build(elements)
    buffer.seek(0)
    return send_file(buffer, as_attachment=True, download_name=f"bilan_personnalise_{start_date_str}_{end_date_str}.pdf", mimetype='application/pdf')

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(STATIC_DIR, filename)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(PROJECT_ROOT, 'frontend', 'build', path)):
        return send_from_directory(os.path.join(PROJECT_ROOT, 'frontend', 'build'), path)
    else:
        return send_from_directory(os.path.join(PROJECT_ROOT, 'frontend', 'build'), 'index.html')

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', debug=True, port=port)

