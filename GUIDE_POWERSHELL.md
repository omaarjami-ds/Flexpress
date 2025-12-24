# Guide PowerShell - FLEXPRESS

Guide complet pour utiliser FLEXPRESS avec PowerShell sur Windows.

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir :
- ✅ Python installé (version 3.8 ou supérieure)
- ✅ Node.js et npm installés
- ✅ PowerShell (déjà installé sur Windows)

Vérifier les installations :
```powershell
python --version
node --version
npm --version
```

## 🚀 Étape 1 : Installation

### 1.1 Ouvrir PowerShell

1. Appuyez sur `Windows + X`
2. Sélectionnez "Windows PowerShell" ou "Terminal"
3. Naviguez vers le dossier du projet :
```powershell
cd "C:\projet\projet delevery"
```

### 1.2 Installer les dépendances

Exécutez le script d'installation :
```powershell
.\install.bat
```

**Note importante** : Dans PowerShell, vous devez toujours utiliser `.\` avant le nom du script `.bat`

Si vous obtenez une erreur de sécurité, exécutez d'abord :
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 1.3 Vérifier l'installation

L'installation devrait :
- ✅ Installer les dépendances Python (Flask, etc.)
- ✅ Installer les dépendances Node.js (React, etc.)
- ✅ Créer la base de données avec des restaurants de test
- ✅ Créer les comptes de test (admin, livreur, client)

## 🎯 Étape 2 : Démarrer l'application

Vous devez ouvrir **DEUX terminaux PowerShell** séparés.

### Terminal 1 - Backend (Serveur API)

1. Ouvrez un nouveau terminal PowerShell
2. Naviguez vers le projet :
```powershell
cd "C:\projet\projet delevery"
```

3. Démarrez le backend :
```powershell
.\start_backend.bat
```

Vous devriez voir :
```
 * Running on http://127.0.0.1:5000
```

**Laissez ce terminal ouvert !** Le backend doit rester en cours d'exécution.

### Terminal 2 - Frontend (Interface Web)

1. Ouvrez un **autre** terminal PowerShell
2. Naviguez vers le projet :
```powershell
cd "C:\projet\projet delevery"
```

3. Démarrez le frontend :
```powershell
.\start_frontend.bat
```

Attendez quelques secondes. Le navigateur devrait s'ouvrir automatiquement sur :
```
http://localhost:3000
```

## 🌐 Étape 3 : Utiliser l'application

### 3.1 Accéder à l'application

Une fois le frontend démarré, votre navigateur devrait s'ouvrir automatiquement. Sinon, ouvrez manuellement :
```
http://localhost:3000
```

### 3.2 Se connecter

Vous verrez la page de connexion avec le logo FLEXPRESS.

**Comptes disponibles :**

| Rôle | Nom d'utilisateur | Mot de passe |
|------|-------------------|--------------|
| Admin | `admin` | `admin123` |
| Livreur | `livreur` | `livreur123` |
| Client | `client` | `client123` |

### 3.3 Créer un nouveau compte

1. Cliquez sur l'onglet "Inscription"
2. Remplissez le formulaire
3. Choisissez votre rôle (Client ou Livreur)
4. Cliquez sur "S'inscrire"

## 📱 Utilisation par rôle

### 👤 En tant que Client

1. **Se connecter** avec le compte client
2. **Autoriser la géolocalisation** quand le navigateur le demande
3. **Voir les restaurants** sur la carte interactive
4. **Sélectionner un restaurant** et voir son menu
5. **Ajouter des plats** au panier
6. **Passer une commande**
7. **Suivre vos commandes** dans le panneau de droite

### 🚚 En tant que Livreur

1. **Se connecter** avec le compte livreur
2. **Autoriser la géolocalisation** (suivi en temps réel)
3. **Voir les commandes disponibles** sur la carte
4. **Accepter une commande** en cliquant sur "Accepter la commande"
5. **Mettre à jour le statut** :
   - "En route" quand vous partez livrer
   - "Livré" quand la livraison est terminée

### 👨‍💼 En tant qu'Admin

1. **Se connecter** avec le compte admin
2. **Voir les statistiques** (commandes, revenus, etc.)
3. **Ajouter des restaurants** :
   - Cliquez sur "Ajouter un restaurant"
   - Remplissez le formulaire
   - Indiquez les coordonnées GPS (latitude, longitude)
4. **Gérer toutes les commandes** dans le panneau de droite

## 🛠️ Commandes PowerShell utiles

### Navigation
```powershell
# Aller dans le dossier du projet
cd "C:\projet\projet delevery"

# Voir le contenu du dossier
ls
# ou
Get-ChildItem

# Remonter d'un niveau
cd ..
```

### Vérifier les processus en cours
```powershell
# Voir les processus Python
Get-Process python

# Voir les processus Node
Get-Process node
```

### Arrêter l'application

Pour arrêter le backend ou le frontend :
1. Allez dans le terminal correspondant
2. Appuyez sur `Ctrl + C`
3. Confirmez avec `Y` si demandé

### Nettoyer et réinstaller

Si vous avez des problèmes :
```powershell
# Arrêter tous les processus Python
Get-Process python | Stop-Process

# Arrêter tous les processus Node
Get-Process node | Stop-Process

# Supprimer la base de données (optionnel)
Remove-Item backend\delivery.db

# Réinstaller
.\install.bat
```

## ⚠️ Problèmes courants et solutions

### Erreur : "Le terme 'install.bat' n'est pas reconnu"

**Solution :** Utilisez `.\install.bat` au lieu de `install.bat`
```powershell
.\install.bat
```

### Erreur : "Cannot find module"

**Solution :** Réinstallez les dépendances
```powershell
cd backend
python -m pip install -r requirements.txt
cd ..\frontend
npm install
```

### Le navigateur ne s'ouvre pas automatiquement

**Solution :** Ouvrez manuellement et allez sur :
```
http://localhost:3000
```

### Erreur de port déjà utilisé

**Solution :** Arrêtez les processus qui utilisent les ports
```powershell
# Trouver le processus sur le port 5000 (backend)
netstat -ano | findstr :5000

# Trouver le processus sur le port 3000 (frontend)
netstat -ano | findstr :3000

# Arrêter un processus par son PID (remplacez XXXX par le PID)
Stop-Process -Id XXXX
```

### Erreur de géolocalisation

**Solution :** 
- Autorisez la géolocalisation dans les paramètres du navigateur
- Utilisez `localhost` et non une adresse IP
- En production, utilisez HTTPS

### La base de données est vide

**Solution :** Réinitialisez les données de test
```powershell
python backend\init_data.py
```

## 📊 Structure des dossiers

```
projet delevery/
├── backend/              # Code Python/Flask
│   ├── app.py           # Application principale
│   ├── init_data.py     # Script d'initialisation
│   ├── requirements.txt # Dépendances Python
│   └── delivery.db      # Base de données SQLite
├── frontend/            # Code React
│   ├── src/             # Code source React
│   ├── public/          # Fichiers publics (logo, etc.)
│   └── package.json     # Dépendances Node.js
├── static/              # Fichiers statiques
├── install.bat          # Script d'installation
├── start_backend.bat    # Script de démarrage backend
└── start_frontend.bat   # Script de démarrage frontend
```

## 🎓 Astuces PowerShell

### Raccourcis clavier utiles

- `Ctrl + C` : Arrêter une commande en cours
- `Tab` : Auto-complétion des noms de fichiers/dossiers
- `↑` / `↓` : Parcourir l'historique des commandes
- `Ctrl + L` : Effacer l'écran

### Commandes utiles

```powershell
# Voir l'aide d'une commande
Get-Help nom-commande

# Voir l'historique des commandes
Get-History

# Exécuter la dernière commande
!!

# Voir les variables d'environnement
$env:PATH
```

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez que Python et Node.js sont installés
2. Vérifiez que les ports 3000 et 5000 sont libres
3. Consultez les messages d'erreur dans les terminaux
4. Réinstallez les dépendances si nécessaire

## ✅ Checklist de démarrage

- [ ] Python installé et accessible
- [ ] Node.js et npm installés
- [ ] PowerShell ouvert
- [ ] Navigation vers le dossier du projet
- [ ] Installation des dépendances (`.\install.bat`)
- [ ] Backend démarré dans Terminal 1 (`.\start_backend.bat`)
- [ ] Frontend démarré dans Terminal 2 (`.\start_frontend.bat`)
- [ ] Navigateur ouvert sur `http://localhost:3000`
- [ ] Connexion réussie avec un compte de test

---

**Bon développement avec FLEXPRESS ! 🚀**

