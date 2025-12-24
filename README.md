# FLEXPRESS - Application de Livraison

Application de livraison moderne avec 3 types d'utilisateurs : Admin, Livreur et Client.

## Fonctionnalités

- 🔐 Authentification sécurisée (JWT)
- 📍 Géolocalisation GPS pour livreurs et clients
- 🗺️ Carte interactive avec restaurants à proximité
- 📦 Système de commandes en temps réel
- 🚚 Suivi des livraisons pour livreurs
- 👨‍💼 Tableau de bord administrateur
- 🎨 Interface moderne style Glovo

## Installation

### Backend (Flask)

1. Installer les dépendances Python :
```bash
cd backend
pip install -r requirements.txt
```

2. Démarrer le serveur :
```bash
python app.py
```

Le serveur démarre sur `http://localhost:5000`

### Frontend (React)

1. Installer les dépendances Node.js :
```bash
cd frontend
npm install
```

2. Copier le logo dans le dossier public :
```bash
cp ../static/logo.png public/logo.png
```

3. Démarrer l'application React :
```bash
npm start
```

L'application démarre sur `http://localhost:3000`

## Comptes par défaut

- **Admin** : username: `admin`, password: `admin123`
- Créez vos propres comptes Client et Livreur via l'interface d'inscription

## Structure

```
projet delevery/
├── backend/
│   ├── app.py              # API Flask
│   ├── requirements.txt    # Dépendances Python
│   └── delivery.db         # Base de données SQLite (créée automatiquement)
├── frontend/
│   ├── src/
│   │   ├── pages/          # Pages React
│   │   ├── App.js          # Composant principal
│   │   └── ...
│   └── public/
│       └── logo.png        # Logo FLEXPRESS
└── static/
    └── logo.png            # Logo original
```

## Utilisation

1. **Client** :
   - Se connecter/inscrire en tant que client
   - Voir les restaurants à proximité sur la carte
   - Passer une commande
   - Suivre ses commandes

2. **Livreur** :
   - Se connecter/inscrire en tant que livreur
   - Voir les commandes disponibles
   - Accepter une commande
   - Mettre à jour le statut (En route, Livré)

3. **Admin** :
   - Se connecter avec le compte admin
   - Gérer les restaurants
   - Voir toutes les commandes
   - Consulter les statistiques

## Technologies utilisées

- **Backend** : Flask, Flask-JWT-Extended, SQLite
- **Frontend** : React, React Router, Leaflet (cartes), Axios
- **Géolocalisation** : API Geolocation du navigateur

## Notes

- La géolocalisation nécessite l'autorisation du navigateur
- Pour tester avec de vraies coordonnées, utilisez des valeurs GPS réelles lors de la création de restaurants
- La base de données SQLite est créée automatiquement au premier lancement

