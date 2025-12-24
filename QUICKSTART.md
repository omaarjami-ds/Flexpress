# Guide de Démarrage Rapide - FLEXPRESS

> 💡 **Pour un guide détaillé PowerShell avec toutes les commandes et astuces, consultez [GUIDE_POWERSHELL.md](GUIDE_POWERSHELL.md)**

## 🚀 Installation Rapide

### Étape 1 : Installer les dépendances

**Option A - Script automatique (Windows) :**

Dans PowerShell :
```powershell
.\install.bat
```

Dans CMD :
```cmd
install.bat
```

**Option B - Manuel :**

1. Backend :
```bash
cd backend
pip install -r requirements.txt
python init_data.py
```

2. Frontend :
```bash
cd frontend
npm install
```

### Étape 2 : Démarrer l'application

**Terminal 1 - Backend :**

Dans PowerShell :
```powershell
.\start_backend.bat
```

Ou manuellement :
```bash
cd backend
python app.py
```
Le backend sera accessible sur `http://localhost:5000`

**Terminal 2 - Frontend :**

Dans PowerShell :
```powershell
.\start_frontend.bat
```

Ou manuellement :
```bash
cd frontend
npm start
```
Le frontend sera accessible sur `http://localhost:3000`

## 👤 Comptes de Test

Après avoir exécuté `init_data.py`, vous pouvez utiliser :

- **Admin** : `admin` / `admin123`
- **Livreur** : `livreur` / `livreur123`
- **Client** : `client` / `client123`

## 📱 Utilisation

### En tant que Client :
1. Connectez-vous avec le compte client
2. Autorisez la géolocalisation dans votre navigateur
3. Consultez les restaurants sur la carte
4. Sélectionnez un restaurant et ajoutez des plats au panier
5. Passez votre commande

### En tant que Livreur :
1. Connectez-vous avec le compte livreur
2. Autorisez la géolocalisation (suivi en temps réel)
3. Consultez les commandes disponibles
4. Acceptez une commande
5. Mettez à jour le statut : En route → Livré

### En tant qu'Admin :
1. Connectez-vous avec le compte admin
2. Consultez les statistiques
3. Ajoutez de nouveaux restaurants
4. Gérez toutes les commandes

## 🗺️ Coordonnées GPS de Test

Pour tester avec des restaurants, utilisez ces coordonnées (Paris) :
- Latitude : 48.8566
- Longitude : 2.3522

Ou utilisez votre propre position GPS réelle !

## ⚠️ Notes Importantes

- La géolocalisation nécessite HTTPS en production (ou localhost fonctionne)
- Les restaurants de test sont créés automatiquement avec `init_data.py`
- La base de données SQLite est créée automatiquement au premier lancement

## 🐛 Dépannage

**Erreur "Module not found" :**
- Vérifiez que toutes les dépendances sont installées
- Réinstallez : `pip install -r requirements.txt` ou `npm install`

**La carte ne s'affiche pas :**
- Vérifiez votre connexion internet (les tuiles OpenStreetMap nécessitent internet)
- Vérifiez la console du navigateur pour les erreurs

**Erreur de géolocalisation :**
- Autorisez la géolocalisation dans les paramètres du navigateur
- Utilisez HTTPS ou localhost (pas d'IP directe)

