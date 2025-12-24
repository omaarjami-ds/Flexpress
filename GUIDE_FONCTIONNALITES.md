# 📍 Guide des Fonctionnalités - FLEXPRESS

## 🎯 Où trouver chaque fonctionnalité

### 👤 **ESPACE CLIENT**

#### 1. **Menu de Commande** 📋
- **Emplacement** : Barre latérale droite (sidebar)
- **Comment accéder** :
  1. Connectez-vous en tant que **client**
  2. La carte affiche tous les restaurants à proximité
  3. Cliquez sur **"Voir le menu"** d'un restaurant ouvert
  4. Le menu s'affiche dans la sidebar avec :
     - Nom du plat
     - Description
     - Catégorie (Pizza, Burger, Sushi, etc.)
     - Prix
     - Bouton "Ajouter"

#### 2. **Panier** 🛒
- **Emplacement** : Bouton en haut à droite du header
- **Fonctionnalités** :
  - Affiche tous les articles ajoutés
  - Quantité et prix par article
  - Total calculé automatiquement
  - Bouton "Commander" pour valider

#### 3. **Mes Commandes** 📦
- **Emplacement** : Barre latérale droite, sous le menu
- **Affiche** :
  - Nom du restaurant
  - Total de la commande
  - Liste des articles commandés
  - Date de création
  - Statut (En attente, Acceptée, En cours, Livrée)

---

### 🚴 **ESPACE LIVREUR**

#### 1. **Nouvelles Commandes** 🆕
- **Emplacement** : Section principale du dashboard
- **Affiche** :
  - Toutes les commandes en attente
  - Nom du restaurant
  - Nom du client
  - Adresse de livraison
  - Total
  - **Liste complète des articles**
  - Bouton "Accepter la commande"

#### 2. **Mes Livraisons en Cours** 🚚
- **Emplacement** : Barre latérale droite
- **Affiche** :
  - Commandes acceptées par vous
  - Articles de chaque commande
  - Date de création
  - Boutons pour changer le statut :
    - "En route" (quand vous partez)
    - "Livré" (quand vous arrivez)

#### 3. **Carte GPS** 🗺️
- **Emplacement** : En haut du dashboard
- **Affiche** :
  - Votre position (marqueur bleu)
  - Commandes disponibles (marqueurs bleus)
  - Vos livraisons (marqueurs verts)
  - Cercle de précision GPS

---

### 👨‍💼 **ESPACE ADMIN**

#### 1. **Toutes les Commandes** 📊
- **Emplacement** : Barre latérale droite
- **Affiche** :
  - Toutes les commandes de tous les clients
  - Nom du restaurant
  - Nom du client
  - Nom du livreur (si assigné)
  - Total
  - **Liste complète des articles**
  - Date de création
  - Menu déroulant pour modifier le statut

#### 2. **Gestion des Utilisateurs** 👥
- **Emplacement** : Barre latérale droite, sous les commandes
- **Fonctionnalités** :
  - Liste de tous les utilisateurs
  - Nom d'utilisateur, email, téléphone
  - Rôle actuel (Client/Livreur/Admin)
  - Menu déroulant pour changer le rôle
  - Bouton "Supprimer" (sauf pour les admins)

#### 3. **Gestion des Restaurants** 🏪
- **Emplacement** : Section principale
- **Fonctionnalités** :
  - Liste de tous les restaurants
  - Bouton "Ajouter un restaurant"
  - Formulaire pour créer un nouveau restaurant

---

## 🔄 **Flux de Commande Complet**

1. **Client** :
   - Sélectionne un restaurant → Voir le menu
   - Ajoute des plats au panier
   - Clique sur "Commander"
   - La commande apparaît dans "Mes commandes"

2. **Livreur** :
   - Voit la nouvelle commande dans "Nouvelles commandes"
   - Clique sur "Accepter la commande"
   - La commande passe dans "Mes livraisons en cours"
   - Met à jour le statut : "En route" → "Livré"

3. **Admin** :
   - Voit toutes les commandes dans "Toutes les commandes"
   - Peut modifier le statut si nécessaire
   - Gère les utilisateurs et restaurants

---

## ✅ **Vérification que tout fonctionne**

Pour vérifier que tout est en place :

1. **Backend** : Assurez-vous que le serveur Flask tourne (`python backend/app.py`)
2. **Frontend** : Assurez-vous que React tourne (`npm start` dans `frontend/`)
3. **Base de données** : Les plats sont créés automatiquement avec `init_data.py`

---

## 🎨 **Fonctionnalités Visuelles**

- ✅ Carte interactive avec géolocalisation
- ✅ Filtre pour restaurants ouverts/fermés
- ✅ Marqueurs colorés sur la carte
- ✅ Cercle de précision GPS
- ✅ Bouton de localisation style Google Maps
- ✅ Affichage des articles dans toutes les commandes
- ✅ Statuts traduits en français
- ✅ Dates formatées en français

---

## 📝 **Notes Importantes**

- Le menu s'affiche **automatiquement** quand vous cliquez sur "Voir le menu"
- Les commandes sont visibles pour **tous les livreurs** en même temps
- Le **premier livreur** qui accepte prend la commande
- L'admin peut **tout gérer** : utilisateurs, restaurants, commandes

