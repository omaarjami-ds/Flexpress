import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { FiShoppingCart, FiMapPin, FiHome, FiList, FiPlusCircle, FiUser } from 'react-icons/fi';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import ProfileMenu from '../components/ProfileMenu';
import PullToRefresh from '../components/PullToRefresh';
import './Dashboard.css';

const API_URL = 'https://flexpress.onrender.com/api';

// Helper to get full image URL
const getFullImageUrl = (url) => {
  if (!url) return '/static/logo.png';
  if (url.startsWith('data:image')) return url;
  if (url.startsWith('http')) return url;

  const cleanPath = url.startsWith('/') ? url.substring(1) : url;
  if (cleanPath.startsWith('static/')) return '/' + cleanPath;
  return `/static/${cleanPath}`;
};

// Initialize Leaflet icons lazily
let leafletInitialized = false;
let clientIcon, restaurantIcon, driverIcon;

const initializeLeafletIcons = () => {
  if (leafletInitialized) return;

  try {
    if (L && L.Icon && L.Icon.Default && L.Icon.Default.prototype) {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
    }

    clientIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    restaurantIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    driverIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    leafletInitialized = true;
  } catch (e) {
    console.error('Error initializing Leaflet icons:', e);
  }
};

function RecenterMap({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

function ClientDashboard({ user, onLogout, onUpdateUser }) {
  const [restaurants, setRestaurants] = useState([]);
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [position, setPosition] = useState(null);
  // Etats liés à la carte (conservés pour compatibilité avec la phase "Google Maps")
  // eslint-disable-next-line no-unused-vars
  const [mapCenter, setMapCenter] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [mapZoom, setMapZoom] = useState(13);
  // eslint-disable-next-line no-unused-vars
  const [accuracy, setAccuracy] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showManualOrder, setShowManualOrder] = useState(false);
  const [manualOrderForm, setManualOrderForm] = useState({
    restaurant_id: '',
    restaurant_name: '',
    use_custom_restaurant: false,
    delivery_address: '',
    items: [{ name: '', quantity: 1, price: 0 }]
  });
  const [filterOpenOnly, setFilterOpenOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showMyOrders, setShowMyOrders] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileSubView, setProfileSubView] = useState('main'); // 'main', 'personal', 'addresses'
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [userAddresses, setUserAddresses] = useState([]);
  const [personalInfoForm, setPersonalInfoForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  const [newAddress, setNewAddress] = useState({ label: 'Maison', address: '' });

  useEffect(() => {
    initializeLeafletIcons();
  }, []);

  const loadUserAddresses = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_URL}/user/addresses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserAddresses(response.data);
    } catch (err) {
      console.error('Erreur chargement adresses:', err);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const response = await axios.put(`${API_URL}/user/profile`, personalInfoForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Profil mis à jour avec succès !');
      if (onUpdateUser) onUpdateUser(response.data.user);
      setProfileSubView('main');
    } catch (err) {
      alert('Erreur lors de la mise à jour du profil.');
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API_URL}/user/addresses`, newAddress, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewAddress({ label: 'Maison', address: '' });
      loadUserAddresses();
    } catch (err) {
      alert('Erreur lors de l\'ajout de l\'adresse.');
    }
  };

  const handleDeleteAddress = async (addrId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_URL}/user/addresses/${addrId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadUserAddresses();
    } catch (err) {
      alert('Erreur lors de la suppression.');
    }
  };

  useEffect(() => {
    if (showProfile && profileSubView === 'addresses') {
      loadUserAddresses();
    }
  }, [showProfile, profileSubView]);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [positionLabel, setPositionLabel] = useState('📍 Position non détectée. Cliquez sur "Utiliser ma position".');
  const [showLocationPopup, setShowLocationPopup] = useState(false);
  const [showTrackingMap, setShowTrackingMap] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customRestaurantInfo, setCustomRestaurantInfo] = useState({ name: '', isCustom: false });
  const trackingIntervalRef = useRef(null);
  const mapRef = useRef(null);

  // Catégories de restaurants (style Glovo)
  const categories = [
    { id: 'all', name: 'Tous', icon: '🍽️' },
    { id: 'tunisian', name: 'Tunisien', icon: '🥙' },
    { id: 'sandwich', name: 'Sandwich', icon: '🥪' },
    { id: 'burger', name: 'Burgers', icon: '🍔' },
    { id: 'pizza', name: 'Pizza', icon: '🍕' },
    { id: 'snacks', name: 'Snacks', icon: '🍟' },
    { id: 'salad', name: 'Salades', icon: '🥗' },
    { id: 'chicken', name: 'Poulet', icon: '🍗' },
    { id: 'pasta', name: 'Pâtes', icon: '🍝' },
    { id: 'asian', name: 'Asiatique', icon: '🍜' },
    { id: 'sushi', name: 'Sushi', icon: '🍣' },
    { id: 'grill', name: 'Grill', icon: '🔥' },
    { id: 'breakfast', name: 'Petit-déjeuner', icon: '🥐' },
    { id: 'oriental', name: 'Oriental', icon: '🌯' },
    { id: 'sweets', name: 'Desserts', icon: '🍰' },
    { id: 'italian', name: 'Italien', icon: '🍝' },
  ];

  // Fonction pour obtenir l'image correspondant au nom
  const getSuggestionImage = (name) => {
    const nameLower = name.toLowerCase().trim();
    const imageMap = {
      'makloub': 'static/makloub.jpg',
      'panini': 'static/panini.jpg',
      'panuzzo': 'static/panuzzo.jpg',
      'baguette farcie': 'static/baguette farcie.jpg',
      'chawarma': 'static/chawarma.jpg',
      'kaskrout': 'static/kaskrout.jpg',
      'fricassé': 'static/fricassé.jpg',
      'fricasse': 'static/fricassé.jpg',
      'brik': 'static/brik.jpg',
    };

    // Chercher une correspondance exacte
    if (imageMap[nameLower]) {
      return imageMap[nameLower];
    }

    // Chercher une correspondance partielle
    for (const [key, imagePath] of Object.entries(imageMap)) {
      if (nameLower.includes(key) || key.includes(nameLower)) {
        return imagePath;
      }
    }

    // Par défaut, essayer avec le nom directement (sans espaces)
    const fileName = nameLower.replace(/\s+/g, '').replace('é', 'e');
    return `static/${fileName}.jpg`;
  };

  // Suggestions de fastfood tunisien populaires
  const tunisianFastFoodSuggestions = [
    { name: 'Makloub', description: 'Sandwich traditionnel tunisien avec viande, légumes et sauce', price: 8.50, popular: true },
    { name: 'Panini', description: 'Panini grillé au choix (poulet, thon, viande)', price: 7.00, popular: true },
    { name: 'Panuzzo', description: 'Panuzzo italien avec jambon, fromage et légumes', price: 9.00, popular: false },
    { name: 'Baguette Farcie', description: 'Baguette française farcie au choix', price: 6.50, popular: true },
    { name: 'Chawarma', description: 'Chawarma de poulet ou viande avec légumes', price: 10.00, popular: true },
    { name: 'Kaskrout', description: 'Sandwich tunisien au thon et légumes', price: 5.50, popular: false },
    { name: 'Fricassé', description: 'Fricassé tunisien traditionnel', price: 4.50, popular: true },
    { name: 'Brik', description: 'Brik à l\'œuf et thon', price: 3.50, popular: true },
  ];

  // Polling pour le suivi de commande
  useEffect(() => {
    if (showTrackingMap && trackingOrder) {
      // Charger immédiatement
      loadOrders();

      // Puis toutes les 5 secondes
      const interval = setInterval(() => {
        loadOrders();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [showTrackingMap, trackingOrder?.id]); // Ne dépend que de l'ID pour ne pas reset l'intervalle à chaque update

  // Mettre à jour trackingOrder quand orders change
  useEffect(() => {
    if (showTrackingMap && trackingOrder) {
      const updatedOrder = orders.find(o => o.id === trackingOrder.id);
      if (updatedOrder) {
        // On ne met à jour que si les données ont changé
        if (JSON.stringify(updatedOrder) !== JSON.stringify(trackingOrder)) {
          setTrackingOrder(updatedOrder);

          // Centrer dynamiquement sur le livreur s'il bouge
          if (updatedOrder.driver_lat && updatedOrder.driver_lon) {
            setMapCenter([updatedOrder.driver_lat, updatedOrder.driver_lon]);
          }
        }
      }
    }
  }, [orders, showTrackingMap]); // Retiré trackingOrder des dépendances pour éviter les boucles

  const openTrackingMap = (order) => {
    setTrackingOrder(order);
    setShowTrackingMap(true);

    // Priorité 1 : Centrer sur le livreur s'il est assigné et a une position
    if (order.driver_lat && order.driver_lon) {
      setMapCenter([order.driver_lat, order.driver_lon]);
    }
    // Priorité 2 : Centrer sur votre position actuelle
    else if (position) {
      setMapCenter(position);
    }
    // Priorité 3 : Centrer sur le restaurant
    else if (order.restaurant_latitude && order.restaurant_longitude) {
      setMapCenter([order.restaurant_latitude, order.restaurant_longitude]);
    }
  };

  // Fonction pour ouvrir la position du livreur dans Google Maps
  const openDriverLocationInGPS = (driverLat, driverLon, driverName) => {
    if (!driverLat || !driverLon) {
      alert('Position du livreur non disponible');
      return;
    }
    // Ouvrir Google Maps avec la position du livreur
    const url = `https://www.google.com/maps?q=${driverLat},${driverLon}&label=${encodeURIComponent(driverName || 'Livreur')}`;
    window.open(url, '_blank');
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }

    // Afficher un message de chargement
    console.log('Demande de géolocalisation en cours...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        console.log('Position obtenue:', { latitude, longitude, accuracy: acc });

        // Vérifier que les coordonnées sont valides
        if (isNaN(latitude) || isNaN(longitude)) {
          alert('Coordonnées GPS invalides. Veuillez réessayer.');
          return;
        }

        const newPosition = [latitude, longitude];
        setPosition(newPosition);
        setMapCenter(newPosition);
        setMapZoom(15);
        setAccuracy(acc);
        updateLocation(latitude, longitude);
        loadRestaurants(latitude, longitude);
        updateHumanReadablePosition(latitude, longitude);

        console.log('Position mise à jour sur la carte:', newPosition);
      },
      (error) => {
        // Comportement plus proche de Google Maps : on évite les popups pour les timeouts,
        // on ne bloque que si l'utilisateur refuse la permission.
        if (error.code === error.PERMISSION_DENIED) {
          alert('📍 (Client) L\'accès à la position a été refusé. Veuillez l\'autoriser dans les paramètres de votre téléphone.');
        } else {
          console.warn('Erreur géolocalisation (non bloquante):', error);
        }
      },
      {
        enableHighAccuracy: true,  // Utiliser le GPS si disponible
        timeout: 60000,            // Attendre plus longtemps, comme Google Maps
        maximumAge: 10000          // Accepter une position récente en cache
      }
    );
  };

  const getPositionLabel = () => {
    return positionLabel;
  };

  // Restaurants filtrés (filtre "ouvert uniquement")
  const filteredRestaurants = restaurants.filter((restaurant) => {
    const matchesOpen = !filterOpenOnly || restaurant.is_open;
    return matchesOpen;
  });

  const updateHumanReadablePosition = async (lat, lon) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse`,
        {
          params: {
            format: 'jsonv2',
            lat,
            lon,
            'accept-language': 'fr'
          },
          headers: {
            'User-Agent': 'flexpress-client/1.0'
          }
        }
      );
      const data = response.data || {};
      const address = data.display_name || '';
      if (address) {
        setPositionLabel(`📍 Ma position : ${address}`);
        // Mettre à jour automatiquement l'adresse de livraison
        setDeliveryAddress(address);
        setManualOrderForm(prev => ({ ...prev, delivery_address: address }));
      } else {
        setPositionLabel('📍 Ma position détectée, mais adresse introuvable.');
      }
    } catch (err) {
      console.error('Erreur géocodage inverse:', err);
      // En cas d’erreur, garder une version texte courte avec la ville si possible
      if (position) {
        const [latVal, lonVal] = position;
        setPositionLabel(`📍 Ma position approximative (${latVal.toFixed(3)}, ${lonVal.toFixed(3)})`);
      }
    }
  };

  const [popularItems, setPopularItems] = useState([]);
  const [makloubItems, setMakloubItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadOrders = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Erreur chargement commandes:', err);
      if (err.response?.status === 401) {
        onLogout();
      }
    }
  }, [onLogout]);

  const loadRestaurants = useCallback(async (lat, lon, search) => {
    try {
      // Construire l'URL avec ou sans coordonnées / recherche
      const params = [];
      if (lat !== null && lon !== null) {
        params.push(`lat=${lat}`, `lon=${lon}`);
      }
      if (search && search.trim()) {
        params.push(`q=${encodeURIComponent(search.trim())}`);
      }
      let url = `${API_URL}/restaurants`;
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      const response = await axios.get(url);
      const data = Array.isArray(response.data) ? response.data : [];
      setAllRestaurants(data);
      setRestaurants(data);
    } catch (err) {
      console.error('Erreur chargement restaurants:', err);
      // En cas d'erreur, charger sans position pour avoir la liste
      try {
        const response = await axios.get(`${API_URL}/restaurants`);
        const data = Array.isArray(response.data) ? response.data : [];
        setAllRestaurants(data);
        setRestaurants(data);
      } catch (err2) {
        console.error('Erreur chargement restaurants sans position:', err2);
      }
    }
  }, []);

  const loadPopularAndMakloub = useCallback(async () => {
    try {
      const [popRes, makRes] = await Promise.all([
        axios.get(`${API_URL}/menu-items/popular`),
        axios.get(`${API_URL}/menu-items/makloub`)
      ]);
      setPopularItems(popRes.data);
      setMakloubItems(makRes.data);
    } catch (err) {
      console.error('Erreur chargement items populaires/makloub:', err);
    }
  }, []);

  const updateLocation = async (lat, lon) => {
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_URL}/user/location`, { latitude: lat, longitude: lon }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Erreur mise à jour position backend:', err);
    }
  };

  useEffect(() => {
    loadOrders();
    loadRestaurants(null, null, '');
    loadPopularAndMakloub();

    // Rafraîchissement automatique toutes les 10 secondes pour voir les nouveaux articles sans se déconnecter
    const interval = setInterval(() => {
      loadOrders();
      loadRestaurants(null, null, searchQuery);
      loadPopularAndMakloub();
    }, 10000);

    return () => clearInterval(interval);
  }, [loadOrders, loadRestaurants, loadPopularAndMakloub]);

  const handleRefresh = async () => {
    await Promise.all([loadOrders(), loadRestaurants(null, null, searchQuery)]);
  };

  // Recharger les restaurants côté backend quand la recherche change
  useEffect(() => {
    const timeout = setTimeout(() => {
      const [lat, lon] = Array.isArray(position) && position.length === 2 ? position : [null, null];
      loadRestaurants(lat, lon, searchQuery);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery, position, loadRestaurants]);

  const loadMenuItems = async (restaurantId) => {
    try {
      const response = await axios.get(`${API_URL}/restaurants/${restaurantId}/menu`);
      setMenuItems(response.data);
    } catch (err) {
      console.error('Erreur chargement menu:', err);
      setMenuItems([]);
    }
  };

  // Fonction pour sélectionner un restaurant et charger son menu
  // Utilisée dans le JSX via onClick inline
  // eslint-disable-next-line no-unused-vars
  const handleRestaurantSelect = (restaurant) => {
    if (!restaurant.is_open) return;
    setSelectedRestaurant(restaurant);
    loadMenuItems(restaurant.id);
    setShowMenuModal(true);
  };

  const addToCart = (item) => {
    setCart([...cart, { ...item, quantity: 1, comment: '', id: Date.now() }]);
    // Si c'est le premier article et qu'on n'a pas d'adresse, on peut essayer de pré-remplir
    if (cart.length === 0 && positionLabel.includes('📍 Ma position : ')) {
      const addr = positionLabel.replace('📍 Ma position : ', '');
      setDeliveryAddress(addr);
    }
    // Pré-remplir le numéro de téléphone si disponible dans le profil utilisateur
    if (cart.length === 0 && user && user.phone) {
      setPhoneNumber(user.phone);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateCartItemComment = (id, comment) => {
    setCart(cart.map(item => item.id === id ? { ...item, comment } : item));
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;

    // Vérifier la position d'abord
    if (!position) {
      setShowLocationPopup(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Validation de l'adresse et du téléphone
    if (!deliveryAddress && !selectedRestaurant) {
      alert("Veuillez entrer une adresse de livraison");
      return;
    }
    if (!phoneNumber) {
      alert("Veuillez entrer un numéro de téléphone");
      return;
    }

    const token = localStorage.getItem('token');
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Détermination du restaurant ID et du nom
    let restaurantId;
    let finalAddress = deliveryAddress || 'Adresse actuelle';
    // Ajouter le numéro de téléphone à l'adresse (format temporaire pour compatibilité backend)
    // Idéalement, on ajouterait un champ phone à la table orders, mais pour l'instant on concatène
    // si le backend ne le gère pas encore explicitement
    // Cependant, le backend semble avoir un champ phone pour user, mais pas pour order.
    // On va l'envoyer dans l'adresse pour qu'il soit visible par le livreur
    finalAddress = `${finalAddress} (Tel: ${phoneNumber})`;

    if (selectedRestaurant) {
      restaurantId = selectedRestaurant.id;
    } else if (customRestaurantInfo.name) {
      // Logique similaire à placeManualOrder
      if (allRestaurants.length > 0) {
        restaurantId = allRestaurants[0].id;
      } else {
        restaurantId = 1;
      }
      finalAddress = `[${customRestaurantInfo.name}] ${finalAddress}`;
    } else {
      // Cas par défaut (ex: seulement des suggestions)
      if (allRestaurants.length > 0) {
        restaurantId = allRestaurants[0].id;
      } else {
        restaurantId = 1;
      }
      // On ajoute un indicateur générique si pas de restaurant spécifié
      // finalAddress = `[Commande Directe] ${finalAddress}`;
    }

    try {
      await axios.post(`${API_URL}/orders`, {
        restaurant_id: restaurantId,
        total_price: totalPrice,
        delivery_address: finalAddress,
        delivery_latitude: position ? position[0] : 0,
        delivery_longitude: position ? position[1] : 0,
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          comment: item.comment || ''
        }))
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCart([]);
      setSelectedRestaurant(null);
      setCustomRestaurantInfo({ name: '', isCustom: false });
      setShowCart(false);
      loadOrders();
      alert('Commande passée avec succès!');
    } catch (err) {
      console.error('Erreur commande:', err);
      alert('Erreur lors de la commande: ' + (err.response?.data?.error || err.message));
    }
  };

  const addManualItem = () => {
    setManualOrderForm({
      ...manualOrderForm,
      items: [...manualOrderForm.items, { name: '', quantity: 1, price: 0, comment: '' }]
    });
  };

  const removeManualItem = (index) => {
    const newItems = manualOrderForm.items.filter((_, i) => i !== index);
    setManualOrderForm({ ...manualOrderForm, items: newItems });
  };

  // Fonction pour obtenir le prix automatique basé sur le nom de l'article
  const getAutoPrice = (itemName) => {
    if (!itemName || itemName.trim() === '') return 0;

    // Chercher dans les suggestions de fastfood tunisien
    const suggestion = tunisianFastFoodSuggestions.find(
      s => s.name.toLowerCase() === itemName.toLowerCase().trim()
    );
    if (suggestion) {
      return suggestion.price;
    }

    // Prix par défaut basé sur le type d'article (approximation)
    const nameLower = itemName.toLowerCase();
    if (nameLower.includes('makloub') || nameLower.includes('chawarma')) return 8.50;
    if (nameLower.includes('panini') || nameLower.includes('panuzzo')) return 7.50;
    if (nameLower.includes('baguette') || nameLower.includes('fricassé')) return 6.00;
    if (nameLower.includes('brik') || nameLower.includes('kaskrout')) return 4.50;

    // Prix par défaut pour autres articles
    return 5.00;
  };

  const updateManualItem = (index, field, value) => {
    const newItems = [...manualOrderForm.items];
    if (field === 'quantity') {
      // Permettre de vider le champ pour la saisie, sinon convertir en nombre
      newItems[index] = { ...newItems[index], quantity: value === '' ? '' : value };
    } else if (field === 'name') {
      // Quand le nom change, mettre à jour automatiquement le prix
      const autoPrice = getAutoPrice(value);
      newItems[index] = { ...newItems[index], name: value, price: autoPrice };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setManualOrderForm({ ...manualOrderForm, items: newItems });
  };

  const addToCartFromManual = () => {
    const itemsWithAutoPrice = manualOrderForm.items.map(item => ({
      ...item,
      price: item.name ? getAutoPrice(item.name) : 0
    }));

    const validItems = itemsWithAutoPrice.filter(item => item.name && item.name.trim() !== '');
    if (validItems.length === 0) {
      alert('Veuillez ajouter au moins un article valide');
      return;
    }

    // Ajouter au panier
    const newCartItems = validItems.map(item => ({
      name: item.name,
      price: item.price,
      quantity: Number(item.quantity) || 1,
      comment: item.comment || '',
      id: Date.now() + Math.random() // ID unique
    }));

    setCart([...cart, ...newCartItems]);

    // Sauvegarder les infos contextuelles si le panier était vide ou pour mise à jour
    if (manualOrderForm.delivery_address) {
      setDeliveryAddress(manualOrderForm.delivery_address);
    }
    if (manualOrderForm.phone) {
      setPhoneNumber(manualOrderForm.phone);
    }

    if (manualOrderForm.use_custom_restaurant && manualOrderForm.restaurant_name) {
      setCustomRestaurantInfo({ name: manualOrderForm.restaurant_name, isCustom: true });
      setSelectedRestaurant(null);
    } else if (manualOrderForm.restaurant_id) {
      const rest = allRestaurants.find(r => r.id === manualOrderForm.restaurant_id);
      if (rest) {
        setSelectedRestaurant(rest);
        setCustomRestaurantInfo({ name: '', isCustom: false });
      }
    }

    // Reset et fermer
    setManualOrderForm({
      restaurant_id: '',
      restaurant_name: '',
      use_custom_restaurant: false,
      delivery_address: '',
      phone: '',
      items: [{ name: '', quantity: 1, price: 0, comment: '' }]
    });
    setShowManualOrder(false);
    alert(`${validItems.length} article(s) ajouté(s) au panier !`);
  };

  const placeManualOrder = async () => {
    // Vérifier la position d'abord
    if (!position) {
      setShowLocationPopup(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Vérifier que soit restaurant_id soit restaurant_name est rempli
    if (!manualOrderForm.use_custom_restaurant && !manualOrderForm.restaurant_id) {
      alert('Veuillez sélectionner un restaurant ou activer le mode restaurant personnalisé');
      return;
    }

    if (manualOrderForm.use_custom_restaurant && !manualOrderForm.restaurant_name) {
      alert('Veuillez entrer le nom du restaurant');
      return;
    }

    if (!manualOrderForm.delivery_address) {
      alert('Veuillez entrer l\'adresse de livraison');
      return;
    }

    if (!manualOrderForm.phone) {
      alert('Veuillez entrer un numéro de téléphone');
      return;
    }

    // Calculer automatiquement les prix pour tous les articles
    const itemsWithAutoPrice = manualOrderForm.items.map(item => ({
      ...item,
      price: item.name ? getAutoPrice(item.name) : 0
    }));

    const validItems = itemsWithAutoPrice.filter(item => item.name && item.name.trim() !== '');
    if (validItems.length === 0) {
      alert('Veuillez ajouter au moins un article valide');
      return;
    }

    const token = localStorage.getItem('token');
    // Utiliser les prix automatiques calculés
    const totalPrice = validItems.reduce((sum, item) => {
      const autoPrice = getAutoPrice(item.name);
      const qty = parseFloat(item.quantity) || 0;
      return sum + (autoPrice * qty);
    }, 0);

    // Préparer les données AVANT le try pour qu'elles soient accessibles dans le catch
    let restaurantId;
    let deliveryAddress = manualOrderForm.delivery_address;
    deliveryAddress = `${deliveryAddress} (Tel: ${manualOrderForm.phone})`;

    if (manualOrderForm.use_custom_restaurant) {
      // Pour un restaurant personnalisé, utiliser le premier restaurant disponible comme ID technique
      // ou créer un restaurant temporaire si aucun n'existe
      if (allRestaurants.length > 0) {
        restaurantId = allRestaurants[0].id;
      } else {
        // Si aucun restaurant n'existe, essayer de créer un restaurant temporaire ou utiliser ID 1
        // Pour l'instant, on va utiliser un ID par défaut (1) et le backend devra gérer ça
        restaurantId = 1;
      }
      // Ajouter le nom du restaurant personnalisé dans l'adresse
      deliveryAddress = `[${manualOrderForm.restaurant_name}] ${deliveryAddress}`;
    } else {
      restaurantId = parseInt(manualOrderForm.restaurant_id);
      deliveryAddress = `[Manuelle] ${deliveryAddress}`;
    }

    // Préparer les données avec conversion explicite des types
    const orderData = {
      restaurant_id: restaurantId,
      total_price: parseFloat(totalPrice.toFixed(2)),
      delivery_address: deliveryAddress.trim(),
      delivery_latitude: position ? parseFloat(position[0]) : 0,
      delivery_longitude: position ? parseFloat(position[1]) : 0,
      items: validItems.map(item => {
        const autoPrice = getAutoPrice(item.name);
        return {
          name: String(item.name).trim(),
          quantity: parseInt(parseFloat(item.quantity)) || 1,
          price: autoPrice
        };
      })
    };

    try {
      console.log('Sending order data:', orderData);
      console.log('Token present:', !!token);

      if (!token) {
        alert('❌ Erreur: Vous devez être connecté pour passer une commande');
        return;
      }

      try {
        const response = await axios.post(`${API_URL}/orders`, orderData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        // Vérifier si la réponse est un succès
        if (response.status >= 400) {
          throw new Error(response.data?.error || `HTTP ${response.status}`);
        }
      } catch (axiosError) {
        // Si l'erreur est 401 (token invalide), forcer la reconnexion
        if (axiosError.response?.status === 401) {
          const errorMsg = axiosError.response?.data?.error || '';
          if (errorMsg.includes('Invalid token') || errorMsg.includes('Subject must be a string') || errorMsg.includes('Token invalide')) {
            alert('⚠️ Votre session a expiré ou votre token est invalide. Veuillez vous reconnecter.');
            // Supprimer le token invalide
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Rediriger vers la page de connexion
            window.location.href = '/login';
            return;
          }
        }
        // Relancer l'erreur pour qu'elle soit gérée par le catch principal
        throw axiosError;
      }

      setManualOrderForm({
        restaurant_id: '',
        restaurant_name: '',
        use_custom_restaurant: false,
        delivery_address: '',
        phone: '',
        items: [{ name: '', quantity: 1, price: 0, comment: '' }]
      });
      setShowManualOrder(false);
      loadOrders();
      alert('✅ Commande passée avec succès!');
    } catch (err) {
      // Si l'erreur est due à un restaurant_id invalide, essayer avec un restaurant par défaut
      if (err.response?.status === 400 || err.response?.status === 404) {
        // Essayer de créer un restaurant temporaire ou utiliser le premier disponible
        try {
          // Récupérer tous les restaurants pour avoir au moins un ID valide
          const restaurantsResponse = await axios.get(`${API_URL}/restaurants`);
          const restaurants = restaurantsResponse.data;

          if (restaurants.length > 0) {
            const defaultRestaurantId = restaurants[0].id;
            const deliveryAddress = manualOrderForm.use_custom_restaurant
              ? `[${manualOrderForm.restaurant_name}] ${manualOrderForm.delivery_address} (Tel: ${manualOrderForm.phone})`
              : `${manualOrderForm.delivery_address} (Tel: ${manualOrderForm.phone})`;

            await axios.post(`${API_URL}/orders`, {
              restaurant_id: defaultRestaurantId,
              total_price: totalPrice,
              delivery_address: deliveryAddress,
              delivery_latitude: position ? position[0] : 0,
              delivery_longitude: position ? position[1] : 0,
              items: validItems.map(item => ({
                name: item.name,
                quantity: Number(item.quantity) || 1,
                price: Number(item.price) || 0
              }))
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });

            setManualOrderForm({
              restaurant_id: '',
              restaurant_name: '',
              use_custom_restaurant: false,
              delivery_address: '',
              phone: '',
              items: [{ name: '', quantity: 1, price: 0 }]
            });
            setShowManualOrder(false);
            loadOrders();
            alert('✅ Commande passée avec succès!');
            return;
          }
        } catch (retryErr) {
          console.error('Erreur lors de la nouvelle tentative:', retryErr);
        }
      }
      // Afficher l'erreur complète pour le débogage
      const errorMessage = err.response?.data?.error || err.message || 'Erreur inconnue';
      const statusCode = err.response?.status || 'N/A';
      console.error('Erreur complète:', {
        status: statusCode,
        error: errorMessage,
        data: err.response?.data,
        request: orderData
      });
      alert(`❌ Erreur lors de la commande (${statusCode}): ${errorMessage}`);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      accepted: '#17a2b8',
      delivering: '#28a745',
      delivered: '#6c757d'
    };
    return colors[status] || '#6c757d';
  };

  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-logo">
          <img src="/logo.png" alt="FLEXPRESS" className="main-logo" />
          <h1>FLEXPRESS</h1>
        </div>
        <div className="header-actions">
          <button
            onClick={() => setShowMyOrders(!showMyOrders)}
            className={`btn ${showMyOrders ? 'btn-primary' : 'btn-secondary'}`}
            style={{ marginRight: '10px' }}
          >
            📦 Mes commandes {orders.length > 0 && `(${orders.length})`}
          </button>
          <button onClick={() => {
            setShowManualOrder(true);
            const addr = positionLabel.includes('📍 Ma position : ')
              ? positionLabel.replace('📍 Ma position : ', '')
              : positionLabel;
            setManualOrderForm(prev => ({
              ...prev,
              phone: user?.phone || '',
              delivery_address: addr
            }));
          }} className="btn btn-primary" style={{ marginRight: '10px' }}>
            📝 Commande manuelle
          </button>
          <button onClick={() => setShowCart(!showCart)} className="btn btn-primary" style={{ marginRight: '10px' }}>
            <FiShoppingCart /> Panier ({cart.length})
          </button>
          <ProfileMenu
            user={user}
            onLogout={onLogout}
            onProfileClick={() => {
              setShowProfile(true);
              setProfileSubView('main');
              setShowMyOrders(false);
            }}
          />
        </div>
      </header>

      <PullToRefresh onRefresh={handleRefresh}>
        {/* Hero Section – mobile card layout (no change in behaviour, only design) */}
        {!showMyOrders && !showProfile && (
          <div className="hero-section hero-section-dark">
            <div className="hero-content hero-content-mobile">
              <div className="hero-main-column">
                <div className="hero-location-card">
                  <div className="hero-location-icon-circle">
                    📍
                  </div>
                  <div className="hero-location-texts">
                    <div className="hero-location-label">Localisation actuelle</div>
                    <div className="hero-location-value" title={getPositionLabel()}>
                      {getPositionLabel().replace('📍 Ma position : ', '').substring(0, 40)}
                      {getPositionLabel().length > 40 ? '...' : ''}
                    </div>
                  </div>
                  <button
                    id="location-main-btn"
                    onClick={getCurrentLocation}
                    className="hero-location-btn-circle"
                    aria-label="Utiliser ma position"
                  >
                    📍
                  </button>
                </div>

                <div className="hero-search-card">
                  <div className="hero-search">
                    <input
                      type="text"
                      placeholder="Rechercher un restaurant"
                      className="hero-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="hero-mini-categories">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      className={`hero-mini-category-chip ${selectedCategory === category.id ? 'active' : ''}`}
                      onClick={() => {
                        if (selectedCategory === category.id) {
                          setSelectedCategory(null);
                        } else {
                          setSelectedCategory(category.id);
                          setShowMyOrders(false);
                        }
                      }}
                    >
                      <span className="hero-mini-category-icon">{category.icon}</span>
                      <span className="hero-mini-category-label">{category.name}</span>
                    </button>
                  ))}
                </div>

                {/* Filtres et tri (Déplacé ici) */}
                <div className="filters-bar" style={{ marginTop: '15px', marginBottom: '0' }}>
                  <div className="filters-left">
                    <label className="filter-toggle">
                      <input
                        type="checkbox"
                        checked={filterOpenOnly}
                        onChange={(e) => setFilterOpenOnly(e.target.checked)}
                      />
                      <span>Uniquement les restaurants ouverts</span>
                    </label>
                    {selectedCategory && (
                      <span className="selected-filter-tag">
                        {categories.find(c => c.id === selectedCategory)?.name}
                        <button onClick={() => setSelectedCategory(null)}>×</button>
                      </span>
                    )}
                  </div>
                  <div className="results-count">
                    {filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'résultat' : 'résultats'}
                    {searchQuery && searchQuery.trim() && ` pour "${searchQuery}"`}
                  </div>
                </div>

                {/* Résultats de recherche déplacés ici, s'affichent seulement si recherche ou catégorie active */}
                {((searchQuery && searchQuery.trim()) || selectedCategory !== null) && (
                  <div className="restaurants-grid glovo-style" style={{ marginTop: '20px' }}>
                    {filteredRestaurants.length === 0 ? (
                      <div className="no-restaurants">
                        <p>
                          {searchQuery && searchQuery.trim()
                            ? `Aucun restaurant trouvé pour "${searchQuery}".`
                            : filterOpenOnly
                              ? 'Aucun restaurant ouvert à proximité pour le moment.'
                              : 'Aucun restaurant à proximité.'}
                        </p>
                        {searchQuery && searchQuery.trim() && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="btn btn-secondary"
                            style={{ marginTop: '10px' }}
                          >
                            Effacer la recherche
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredRestaurants.map(restaurant => {
                        const getRestaurantImage = () => {
                          const nameLower = restaurant.name?.toLowerCase() || '';
                          if (nameLower.includes('pizza')) return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400';
                          if (nameLower.includes('burger')) return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400';
                          if (nameLower.includes('sushi')) return 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400';
                          if (nameLower.includes('chicken') || nameLower.includes('poulet')) return 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400';
                          if (nameLower.includes('tacos')) return 'https://images.unsplash.com/photo-1565299585323-38174c6a6c08?w=400';
                          return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400';
                        };

                        const getRestaurantLogo = () => {
                          const nameLower = restaurant.name?.toLowerCase() || '';
                          if (nameLower.includes('pizza')) return '🍕';
                          if (nameLower.includes('burger')) return '🍔';
                          if (nameLower.includes('sushi')) return '🍣';
                          if (nameLower.includes('chicken') || nameLower.includes('poulet')) return '🍗';
                          if (nameLower.includes('tacos')) return '🌮';
                          if (nameLower.includes('tunisien') || nameLower.includes('makloub')) return '🥙';
                          return '🍽️';
                        };

                        const deliveryTime = restaurant.distance
                          ? Math.max(30, Math.min(60, Math.round(restaurant.distance * 10 + 30)))
                          : Math.floor(Math.random() * 20) + 30;

                        const rating = Math.floor(Math.random() * 16) + 85;
                        const ratingCount = Math.floor(Math.random() * 300) + 20;

                        return (
                          <div
                            key={restaurant.id}
                            className={`glovo-restaurant-card ${!restaurant.is_open ? 'closed' : ''}`}
                            onClick={() => handleRestaurantSelect(restaurant)}
                            style={{ cursor: restaurant.is_open ? 'pointer' : 'default' }}
                          >
                            <div className="restaurant-image-container">
                              <img
                                src={getFullImageUrl(restaurant.image_url)}
                                alt={restaurant.name}
                                className="restaurant-image"
                                onError={(e) => {
                                  e.target.src = getRestaurantImage();
                                }}
                              />
                              {!restaurant.is_open && (
                                <div className="restaurant-closed-overlay">
                                  <span className="closed-badge">Fermé</span>
                                  {restaurant.open_time && (
                                    <span className="closed-time">Réouvre à {restaurant.open_time}</span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="restaurant-card-content">
                              <div className="restaurant-logo-name">
                                <div className="restaurant-logo">{getRestaurantLogo()}</div>
                                <div className="restaurant-name-section">
                                  <h3 className="restaurant-name">{restaurant.name}</h3>
                                  {restaurant.description && (
                                    <p className="restaurant-tagline">{restaurant.description}</p>
                                  )}
                                </div>
                              </div>

                              <div className="restaurant-meta">
                                <div className="delivery-info">
                                  <span className="delivery-time">⏱️ {deliveryTime}-{deliveryTime + 10} min</span>
                                  <span className="delivery-fee">Gratuit</span>
                                </div>
                                <div className="rating-info">
                                  <span className="rating-value">{rating}%</span>
                                  <span className="rating-count">({ratingCount})</span>
                                </div>
                              </div>

                              {restaurant.is_open && (
                                <button
                                  className="btn btn-primary btn-full glovo-order-btn"
                                >
                                  Voir le Menu
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="hero-image hero-image-mobile">
                <div className="hero-food-illustration hero-food-illustration-dark">🍔🍕🥙</div>
              </div>
            </div>
          </div>
        )}

        <div className="container">
          {showProfile ? (
            <div className="profile-page">
              {profileSubView !== 'main' && (
                <button
                  onClick={() => setProfileSubView('main')}
                  className="btn btn-secondary btn-sm"
                  style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  ‹ Retour
                </button>
              )}

              {profileSubView === 'main' && (
                <>
                  <div className="profile-header-card">
                    <div className="profile-avatar-large-page">
                      {user?.username?.substring(0, 2).toUpperCase() || '??'}
                    </div>
                    <h2 className="profile-name">{user?.username}</h2>
                    <div className="profile-email" style={{ color: '#666', marginTop: '5px', marginBottom: '10px' }}>{user?.email}</div>
                  </div>

                  <div className="profile-menu-section">
                    <button className="profile-menu-link" onClick={() => setProfileSubView('personal')}>
                      <div className="profile-menu-icon-wrapper icon-gold">
                        <FiUser />
                      </div>
                      <span className="profile-menu-label">Informations personnelles</span>
                      <span className="profile-menu-arrow">›</span>
                    </button>
                    <button className="profile-menu-link" onClick={() => setProfileSubView('addresses')}>
                      <div className="profile-menu-icon-wrapper icon-blue">
                        <FiMapPin />
                      </div>
                      <span className="profile-menu-label">Adresses enregistrées</span>
                      <span className="profile-menu-arrow">›</span>
                    </button>
                    <button className="profile-menu-link" onClick={() => { setShowMyOrders(true); setShowProfile(false); }}>
                      <div className="profile-menu-icon-wrapper icon-purple">
                        <FiList />
                      </div>
                      <span className="profile-menu-label">Historique des commandes</span>
                      <span className="profile-menu-arrow">›</span>
                    </button>
                  </div>

                  <div className="profile-menu-section">
                    <button className="profile-menu-link" onClick={() => setShowComingSoon(true)}>
                      <div className="profile-menu-icon-wrapper icon-green">
                        <span style={{ fontSize: '16px' }}>🔔</span>
                      </div>
                      <span className="profile-menu-label">Notifications</span>
                      <span className="profile-menu-arrow">›</span>
                    </button>
                    <button className="profile-menu-link" onClick={() => setShowComingSoon(true)}>
                      <div className="profile-menu-icon-wrapper icon-gold">
                        <span style={{ fontSize: '16px' }}>💳</span>
                      </div>
                      <span className="profile-menu-label">Moyens de paiement</span>
                      <span className="profile-menu-arrow">›</span>
                    </button>
                    <button className="profile-menu-link" onClick={() => setProfileSubView('help')}>
                      <div className="profile-menu-icon-wrapper icon-blue">
                        <span style={{ fontSize: '16px' }}>❓</span>
                      </div>
                      <span className="profile-menu-label">Aide et support</span>
                      <span className="profile-menu-arrow">›</span>
                    </button>
                    <button className="profile-menu-link" onClick={onLogout} style={{ color: '#dc3545' }}>
                      <div className="profile-menu-icon-wrapper" style={{ background: 'rgba(220, 53, 69, 0.1)' }}>
                        <FiUser style={{ color: '#dc3545' }} />
                      </div>
                      <span className="profile-menu-label">Déconnexion</span>
                      <span className="profile-menu-arrow">›</span>
                    </button>
                  </div>
                </>
              )}

              {profileSubView === 'personal' && (
                <div className="profile-sub-section">
                  <h3>Informations personnelles</h3>
                  <form onSubmit={handleUpdateProfile} className="profile-form">
                    <div className="form-group">
                      <label>Nom d'utilisateur</label>
                      <input
                        type="text"
                        value={personalInfoForm.username}
                        onChange={(e) => setPersonalInfoForm({ ...personalInfoForm, username: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={personalInfoForm.email}
                        onChange={(e) => setPersonalInfoForm({ ...personalInfoForm, email: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Téléphone</label>
                      <input
                        type="tel"
                        value={personalInfoForm.phone}
                        onChange={(e) => setPersonalInfoForm({ ...personalInfoForm, phone: e.target.value })}
                        className="input"
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '20px' }}>
                      Sauvegarder les modifications
                    </button>
                  </form>
                </div>
              )}

              {profileSubView === 'help' && (
                <div className="profile-sub-section">
                  <h3>Aide et Support</h3>

                  <div style={{ marginBottom: '25px' }}>
                    <h4 style={{ color: '#FFD700', marginBottom: '10px' }}>Qu'est-ce que FLEXPRESS ?</h4>
                    <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>
                      FLEXPRESS est votre partenaire de livraison ultra-rapide en Tunisie.
                      Nous connectons les clients gourmands aux meilleurs restaurants de la ville,
                      avec une flotte de livreurs dévoués prêts à vous servir en un temps record.
                    </p>
                  </div>

                  <div style={{ marginBottom: '25px' }}>
                    <h4 style={{ color: '#FFD700', marginBottom: '10px' }}>Nos Fonctionnalités</h4>
                    <ul style={{ fontSize: '14px', color: '#555', paddingLeft: '20px', lineHeight: '1.8' }}>
                      <li>🚀 <strong>Commande Rapide :</strong> Choisissez vos plats préférés en quelques clics.</li>
                      <li>📍 <strong>Suivi en Temps Réel :</strong> Suivez votre livreur sur la carte jusqu'à votre porte.</li>
                      <li>📱 <strong>Multi-Plateforme :</strong> Disponible sur Web, Android (APK) et PC (Electron).</li>
                      <li>🛠️ <strong>Gestion de Profil :</strong> Personnalisez vos infos et gérez vos adresses facilement.</li>
                    </ul>
                  </div>

                  <div style={{
                    background: '#f9f9f9',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px dashed #FFD700'
                  }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>Besoin d'aide ?</h4>
                    <p style={{ fontSize: '14px', margin: '0 0 15px 0' }}>
                      Notre équipe de support est là pour vous 24/7.
                    </p>
                    <div style={{ fontSize: '14px', color: '#333' }}>
                      <strong>Votre Email :</strong> {user?.email}
                    </div>
                    <div style={{ fontSize: '14px', color: '#333', marginTop: '5px' }}>
                      <strong>Support Email :</strong> flexpress.contact@gmail.com
                    </div>
                    <div style={{ fontSize: '14px', color: '#333', marginTop: '5px' }}>
                      <strong>Téléphone :</strong> +216 22 749 748
                    </div>
                    <button
                      className="btn btn-primary btn-full"
                      style={{ marginTop: '15px' }}
                      onClick={() => window.location.href = `mailto:flexpress.contact@gmail.com?subject=Aide FLEXPRESS - User: ${user?.username}`}
                    >
                      Nous contacter par Email
                    </button>
                  </div>
                </div>
              )}

              <div style={{ textAlign: 'center', marginTop: '20px', color: '#999', fontSize: '12px' }}>
                Version 1.0.0
              </div>
            </div>
          ) : (
            <>
              {/* Section Mes Commandes */}
              {showMyOrders && (
                <div className="my-orders-section">
                  <div className="section-header-orders">
                    <h2 className="section-title">📦 Mes Commandes</h2>
                    <button onClick={() => setShowMyOrders(false)} className="btn btn-secondary">
                      ✕ Fermer
                    </button>
                  </div>
                  {orders.length === 0 ? (
                    <div className="empty-orders">
                      <div className="empty-orders-icon">📦</div>
                      <h3>Aucune commande</h3>
                      <p>Vous n'avez pas encore passé de commande</p>
                      <button onClick={() => { setShowMyOrders(false); }} className="btn btn-primary">
                        Découvrir les restaurants
                      </button>
                    </div>
                  ) : (
                    <div className="orders-list-glovo">
                      {orders.map(order => {
                        // Identifier si c'est une commande manuelle
                        // Une commande est manuelle si :
                        // 1. L'adresse de livraison commence par '[' (format des commandes manuelles avec restaurant personnalisé)
                        // 2. Le restaurant est exactement 'Restaurant Personnalisé' (créé automatiquement par le backend)
                        // On exclut les restaurants normaux comme Esmiralda
                        const isManualOrder = (order.delivery_address && order.delivery_address.startsWith('[')) ||
                          (order.restaurant_name === 'Restaurant Personnalisé');

                        return (
                          <div key={order.id} className="order-card-glovo">
                            <div className="order-card-header">
                              <div className="order-restaurant-info">
                                {!isManualOrder && <h3>{order.restaurant_name}</h3>}
                                {isManualOrder && <h3>Commande Manuelle</h3>}
                                <span className="order-date">{new Date(order.created_at).toLocaleString('fr-FR')}</span>
                              </div>
                              <span
                                className={`order-status-badge status-${order.status}`}
                                style={{ backgroundColor: getStatusColor(order.status) }}
                              >
                                {order.status === 'pending' ? '⏳ En attente' :
                                  order.status === 'accepted' ? '✅ Acceptée' :
                                    order.status === 'delivering' ? '🚚 En cours' :
                                      order.status === 'delivered' ? '✓ Livrée' : order.status}
                              </span>
                            </div>
                            {order.items && order.items.length > 0 && (
                              <div className="order-items-list">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="order-item-row">
                                    <span className="item-quantity">{item.quantity}x</span>
                                    <span className="item-name">{item.item_name}</span>
                                    {!isManualOrder && <span className="item-price">{Number(item.price || 0).toFixed(2)} DT</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="order-card-footer">
                              {!isManualOrder && (
                                <div className="order-total">
                                  <span className="total-label">Total:</span>
                                  <span className="total-amount">{Number(order.total_price || 0).toFixed(2)} DT</span>
                                </div>
                              )}
                              {order.delivery_address && (
                                <div className="order-address">
                                  📍 {order.delivery_address}
                                </div>
                              )}
                              {(order.status === 'accepted' || order.status === 'delivering') && (
                                <button
                                  className="btn btn-primary btn-sm"
                                  style={{ marginTop: '10px', width: '100%' }}
                                  onClick={() => openTrackingMap(order)}
                                >
                                  📍 Suivre ma commande
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Section Makloub & Populaires dynamique - cachée si recherche ou catégorie active */}
              {!showMyOrders && !searchQuery.trim() && selectedCategory === null && (
                <>
                  {/* Ongoing Offers – grande bannière comme la maquette */}
                  <div className="ongoing-offers-section">
                    <h2 className="section-title-left">Offres en cours</h2>
                    <div className="ongoing-offer-banner">
                      <div className="ongoing-offer-texts">
                        <span className="offer-tag">Spécial du jour</span>
                        <h3>Offres que vous ne pouvez pas rater</h3>
                        <p>Livraison rapide depuis vos restaurants préférés.</p>
                        <button
                          className="btn btn-primary offer-cta-btn"
                          onClick={() => {
                            if (filteredRestaurants[0]) {
                              handleRestaurantSelect(filteredRestaurants[0]);
                            }
                          }}
                        >
                          Voir les offres
                        </button>
                      </div>
                      <div className="ongoing-offer-image">
                        <span>🌯🍔🍕</span>
                      </div>
                    </div>
                  </div>

                  {/* Populaire / Tendance – deux colonnes de cartes */}
                  {(popularItems.length > 0 || makloubItems.length > 0) && (
                    <div className="popular-trending-wrapper">
                      <div className="popular-column">
                        <h3 className="popular-title">Populaire</h3>
                        <div className="food-card-list">
                          {(popularItems.length ? popularItems : tunisianFastFoodSuggestions)
                            .slice(0, 4)
                            .map((item, index) => (
                              <div
                                key={index}
                                className="food-card"
                                onClick={() => addToCart({ ...item, quantity: 1 })}
                              >
                                <div className="food-card-image-wrapper">
                                  <img
                                    src={getFullImageUrl(item.image_url) || getSuggestionImage(item.name)}
                                    alt={item.name}
                                    className="food-card-image"
                                    onError={(e) => {
                                      e.target.src = getSuggestionImage(item.name);
                                    }}
                                  />
                                  <button className="food-card-favorite">♡</button>
                                  <div className="food-card-time">
                                    ⏱️ 15 min
                                  </div>
                                </div>
                                <div className="food-card-content">
                                  <h4>{item.name}</h4>
                                  <div className="food-card-rating">
                                    <span>⭐ 4.{index + 3}</span>
                                    <span className="food-card-reviews">(250+ avis)</span>
                                  </div>
                                  <div className="food-card-footer">
                                    <span className="food-card-price">
                                      {Number(item.price || 0).toFixed(3)} DT
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="trending-column">
                        <h3 className="popular-title">Tendance</h3>
                        <div className="food-card-list">
                          {(makloubItems.length ? makloubItems : tunisianFastFoodSuggestions)
                            .slice(0, 4)
                            .map((item, index) => (
                              <div
                                key={index}
                                className="food-card"
                                onClick={() => addToCart({ ...item, quantity: 1 })}
                              >
                                <div className="food-card-image-wrapper">
                                  <img
                                    src={getFullImageUrl(item.image_url) || getSuggestionImage(item.name)}
                                    alt={item.name}
                                    className="food-card-image"
                                    onError={(e) => {
                                      e.target.src = getSuggestionImage(item.name);
                                    }}
                                  />
                                  <button className="food-card-favorite">♡</button>
                                  <div className="food-card-time">
                                    ⏱️ 12 min
                                  </div>
                                </div>
                                <div className="food-card-content">
                                  <h4>{item.name}</h4>
                                  <div className="food-card-rating">
                                    <span>⭐ 4.{index + 2}</span>
                                    <span className="food-card-reviews">(300+ avis)</span>
                                  </div>
                                  <div className="food-card-footer">
                                    <span className="food-card-price">
                                      {Number(item.price || 0).toFixed(3)} DT
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}


                  {/* Suggestions supplémentaires */}
                  <div className="more-suggestions-section">
                    <h2 className="section-title">✨ Recommandations pour vous</h2>
                    <div className="recommendations-grid">
                      <div className="recommendation-card" onClick={() => {
                        setSelectedCategory('tunisian');
                        setShowMyOrders(false);
                      }}>
                        <div className="recommendation-icon">🥙</div>
                        <h4>Spécialités Tunisiennes</h4>
                        <p>Découvrez nos meilleurs plats traditionnels</p>
                      </div>
                      <div className="recommendation-card" onClick={() => {
                        setSelectedCategory('sandwich');
                        setShowMyOrders(false);
                      }}>
                        <div className="recommendation-icon">🥪</div>
                        <h4>Sandwichs & Paninis</h4>
                        <p>Des sandwichs frais et savoureux</p>
                      </div>
                      <div className="recommendation-card" onClick={() => {
                        setSelectedCategory('pizza');
                        setShowMyOrders(false);
                      }}>
                        <div className="recommendation-icon">🍕</div>
                        <h4>Pizzas Artisanales</h4>
                        <p>Pizzas faites maison avec des ingrédients frais</p>
                      </div>
                      <div className="recommendation-card" onClick={() => {
                        setSelectedCategory('chicken');
                        setShowMyOrders(false);
                      }}>
                        <div className="recommendation-icon">🍗</div>
                        <h4>Poulet Grillé</h4>
                        <p>Poulet croustillant et savoureux</p>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-grid">
                    <div className="main-content">
                      {/* Liste de restaurants retirée d'ici (déplacée en haut) */}
                    </div>

                    <div className="sidebar">
                      {selectedRestaurant && (
                        <div className="card">
                          <h3>Menu - {selectedRestaurant.name}</h3>
                          {menuItems.length === 0 ? (
                            <p>Chargement du menu...</p>
                          ) : (
                            <div className="menu-items">
                              {menuItems.map((item) => (
                                <div key={item.id} className="menu-item">
                                  {item.image_url && (
                                    <img
                                      src={getFullImageUrl(item.image_url)}
                                      alt={item.name}
                                      className="menu-item-image"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <div className="menu-item-content">
                                    <strong>{item.name}</strong>
                                    <p>{item.description || 'Plat délicieux'}</p>
                                    {item.category && (
                                      <span className="menu-category">{item.category}</span>
                                    )}
                                  </div>
                                  <div className="menu-item-actions">
                                    <span className="price">{Number(item.price || 0).toFixed(3)}DT</span>
                                    <button
                                      onClick={() => addToCart({
                                        ...item,
                                        quantity: 1
                                      })}
                                      className="btn btn-primary"
                                      disabled={!item.is_available}
                                    >
                                      {item.is_available ? 'Ajouter' : 'Indisponible'}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sidebar avec suggestions rapides */}
                      <div className="card">
                        <h3>⚡ Commandes rapides</h3>
                        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                          Commandez rapidement vos plats favoris
                        </p>
                        <div className="quick-orders">
                          {(popularItems.length > 0 ? popularItems : tunisianFastFoodSuggestions).slice(0, 4).map((item, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                // Ajouter directement au panier
                                addToCart({
                                  ...item,
                                  quantity: 1
                                });
                                alert(`"${item.name}" ajouté au panier !`);
                              }}
                              className="quick-order-btn"
                            >
                              <img
                                src={item.image_url || getSuggestionImage(item.name)}
                                alt={item.name}
                                className="quick-order-image"
                                onError={(e) => {
                                  e.target.src = '/static/logo.png';
                                }}
                              />
                              <div className="quick-order-info">
                                <span className="quick-order-name">{item.name}</span>
                                <span className="quick-order-price">{Number(item.price || 0).toFixed(3)} DT</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {showCart && (
          <div className="cart-modal">
            <div className="cart-content">
              <h3>Panier</h3>
              {cart.length === 0 ? (
                <p>Panier vide</p>
              ) : (
                <>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '0.9em', color: '#666', marginBottom: '5px' }}>Adresse de livraison:</label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      readOnly
                      placeholder="Votre adresse..."
                      className="input"
                      style={{ width: '100%', padding: '8px', background: '#f5f5f5', cursor: 'not-allowed' }}
                    />
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '0.9em', color: '#666', marginBottom: '5px' }}>Numéro de téléphone:</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Votre numéro de téléphone..."
                      className="input"
                      style={{ width: '100%', padding: '8px' }}
                    />
                  </div>

                  {/* Affichage du restaurant sélectionné si existe */}
                  {selectedRestaurant && (
                    <div style={{ marginBottom: '10px', fontSize: '0.9em', color: '#28a745' }}>
                      Restaurant: <strong>{selectedRestaurant.name}</strong>
                    </div>
                  )}
                  {customRestaurantInfo.name && (
                    <div style={{ marginBottom: '10px', fontSize: '0.9em', color: '#17a2b8' }}>
                      Restaurant personnalisé: <strong>{customRestaurantInfo.name}</strong>
                    </div>
                  )}

                  {cart.map(item => (
                    <div key={item.id} className="cart-item" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div style={{ flex: 1 }}>
                          <span>{item.name}</span>
                          {item.category && (
                            <span className="menu-category" style={{ marginLeft: '8px' }}>{item.category}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.9em', color: '#666' }}>
                            {item.quantity} x {Number(item.price || 0).toFixed(2)}DT = {(Number(item.price || 0) * item.quantity).toFixed(2)}DT
                          </span>
                          <button onClick={() => removeFromCart(item.id)} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }}>×</button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={item.comment || ''}
                        onChange={(e) => updateCartItemComment(item.id, e.target.value)}
                        placeholder="Commentaire (ex: sans oignons...)"
                        className="input"
                        style={{ width: '100%', padding: '6px 10px', fontSize: '0.85em', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>
                  ))}
                  <div className="cart-total">
                    Total: {cart.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0).toFixed(2)}DT
                  </div>
                  <button onClick={placeOrder} className="btn btn-success btn-full">
                    Commander
                  </button>
                </>
              )}
              <button onClick={() => setShowCart(false)} className="btn btn-secondary btn-full" style={{ marginTop: '10px' }}>
                Fermer
              </button>
            </div>
          </div>
        )}

        {showManualOrder && (
          <div className="cart-modal">
            <div className="cart-content" style={{ maxWidth: '700px' }}>
              <h3>📝 Commande Manuelle</h3>

              <div style={{ marginBottom: '15px', padding: '12px', background: '#f0f0f0', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={manualOrderForm.use_custom_restaurant}
                    onChange={(e) => setManualOrderForm({ ...manualOrderForm, use_custom_restaurant: e.target.checked, restaurant_id: '', restaurant_name: '' })}
                    style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 'bold', color: '#333' }}>Restaurant non listé (saisir manuellement)</span>
                </label>
              </div>

              {!manualOrderForm.use_custom_restaurant ? (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>Restaurant *</label>
                  <select
                    value={manualOrderForm.restaurant_id}
                    onChange={(e) => setManualOrderForm({ ...manualOrderForm, restaurant_id: e.target.value })}
                    className="input"
                    style={{ width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px' }}
                  >
                    <option value="">Sélectionner un restaurant</option>
                    {allRestaurants.map(restaurant => (
                      <option key={restaurant.id} value={restaurant.id}>
                        {restaurant.name} {restaurant.is_open ? '🟢 Ouvert' : '🔴 Fermé'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>Nom du restaurant *</label>
                  <input
                    type="text"
                    value={manualOrderForm.restaurant_name}
                    onChange={(e) => setManualOrderForm({ ...manualOrderForm, restaurant_name: e.target.value })}
                    placeholder="Ex: Restaurant Chez Ali"
                    className="input"
                    style={{ width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>Adresse de livraison *</label>
                <input
                  type="text"
                  value={manualOrderForm.delivery_address}
                  readOnly
                  placeholder="Votre adresse de livraison"
                  className="input"
                  style={{ width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px', background: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>Numéro de téléphone *</label>
                <input
                  type="tel"
                  value={manualOrderForm.phone}
                  onChange={(e) => setManualOrderForm({ ...manualOrderForm, phone: e.target.value })}
                  placeholder="Ex: 50 123 456"
                  className="input"
                  style={{ width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <label style={{ fontWeight: 'bold', color: '#333', fontSize: '16px' }}>Articles *</label>
                  <button onClick={addManualItem} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>
                    + Ajouter un article
                  </button>
                </div>

                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px', background: '#fafafa' }}>
                  {manualOrderForm.items.map((item, index) => (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px', padding: '15px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #eee' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateManualItem(index, 'name', e.target.value)}
                          placeholder="Nom de l'article (ex: Makloub)"
                          className="input"
                          style={{ padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '15px', background: '#f9f9f9' }}
                        />
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateManualItem(index, 'quantity', e.target.value)}
                          placeholder="Qté"
                          min="1"
                          className="input"
                          style={{ padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '15px', textAlign: 'center' }}
                        />
                        {manualOrderForm.items.length > 1 && (
                          <button
                            onClick={() => removeManualItem(index)}
                            className="btn btn-danger"
                            style={{ padding: '10px', minWidth: '40px', fontSize: '18px' }}
                            title="Supprimer cet article"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <textarea
                        value={item.comment || ''}
                        onChange={(e) => updateManualItem(index, 'comment', e.target.value)}
                        placeholder="Instructions spéciales (ex: sans oignons, plus de harissa...)"
                        className="input"
                        style={{ width: '100%', padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', minHeight: '60px', resize: 'vertical' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '2px solid #FFD700', paddingTop: '15px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>Total:</span>
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFD700' }}>
                    {manualOrderForm.items
                      .filter(item => item.name && item.name.trim() !== '')
                      .reduce((sum, item) => {
                        const autoPrice = getAutoPrice(item.name);
                        const qty = parseFloat(item.quantity) || 0;
                        return sum + (autoPrice * qty);
                      }, 0)
                      .toFixed(2)} DT
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={addToCartFromManual} className="btn btn-primary" style={{ flex: 1, padding: '12px', fontSize: '16px' }}>
                  🛒 Ajouter au panier
                </button>
                <button onClick={placeManualOrder} className="btn btn-success" style={{ flex: 1, padding: '12px', fontSize: '16px' }}>
                  ✅ Commander (Direct)
                </button>
                <button onClick={() => {
                  setShowManualOrder(false);
                  setManualOrderForm({
                    restaurant_id: '',
                    restaurant_name: '',
                    use_custom_restaurant: false,
                    delivery_address: '',
                    phone: '',
                    items: [{ name: '', quantity: 1, price: 0 }]
                  });
                }} className="btn btn-secondary" style={{ padding: '12px', fontSize: '16px' }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
        {showTrackingMap && trackingOrder && (
          <div className="cart-modal">
            <div className="cart-content" style={{ maxWidth: '800px', width: '90%' }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3>📍 Suivi de commande</h3>
                <button onClick={() => setShowTrackingMap(false)} className="btn btn-secondary btn-sm">Fermer</button>
              </div>

              <div style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden', marginBottom: '15px' }}>
                <MapContainer
                  center={mapCenter || [36.8065, 10.1815]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  ref={mapRef}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <RecenterMap center={mapCenter} zoom={15} />

                  {/* Position du Livreur Uniquement */}
                  {trackingOrder.driver_name && (trackingOrder.driver_lat && trackingOrder.driver_lon) && (
                    <Marker
                      position={[trackingOrder.driver_lat, trackingOrder.driver_lon]}
                      icon={driverIcon}
                      eventHandlers={{
                        click: () => {
                          openDriverLocationInGPS(
                            trackingOrder.driver_lat,
                            trackingOrder.driver_lon,
                            trackingOrder.driver_name
                          );
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <Popup>
                        <div style={{ textAlign: 'center' }}>
                          <strong>Livreur: {trackingOrder.driver_name}</strong><br />
                          <span style={{ fontSize: '0.9em', color: '#666' }}>En route vers vous !</span><br /><br />
                          <button
                            onClick={() => openDriverLocationInGPS(
                              trackingOrder.driver_lat,
                              trackingOrder.driver_lon,
                              trackingOrder.driver_name
                            )}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              fontSize: '0.9em',
                              fontWeight: 'bold',
                              marginTop: '5px',
                              width: '100%'
                            }}
                          >
                            📍 Voir dans Google Maps (GPS)
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>

              <div className="tracking-info" style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <strong>Statut:</strong>
                  <span className={`status-badge status-${trackingOrder.status}`}>
                    {trackingOrder.status === 'accepted' ? 'Préparation / En attente de prise en charge' :
                      trackingOrder.status === 'delivering' ? 'En cours de livraison' : trackingOrder.status}
                  </span>
                </div>

                {trackingOrder.driver_name ? (
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Livreur:</strong> {trackingOrder.driver_name}
                    {trackingOrder.driver_lat && (
                      <span style={{ marginLeft: '10px', color: '#28a745', fontSize: '0.9em' }}>
                        (Position en temps réel)
                      </span>
                    )}
                  </div>
                ) : (
                  <div style={{ marginBottom: '10px', color: '#6c757d' }}>
                    <em>Recherche d'un livreur...</em>
                  </div>
                )}

                <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                  La position du livreur se met à jour automatiquement toutes les 5 secondes.
                </div>

                {trackingOrder.items && trackingOrder.items.length > 0 && (
                  <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px' }}>
                    <strong style={{ display: 'block', marginBottom: '5px' }}>Ma commande:</strong>
                    <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.9em' }}>
                      {trackingOrder.items.map((item, idx) => (
                        <li key={idx}>
                          {item.item_name} <span style={{ color: '#666' }}>x{item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    {(() => {
                      // Identifier si c'est une commande manuelle
                      // Une commande est manuelle si :
                      // 1. L'adresse de livraison commence par '[' (format des commandes manuelles avec restaurant personnalisé)
                      // 2. Le restaurant est exactement 'Restaurant Personnalisé' (créé automatiquement par le backend)
                      // On exclut les restaurants normaux comme Esmiralda
                      const isManualOrder = (trackingOrder.delivery_address && trackingOrder.delivery_address.startsWith('[')) ||
                        (trackingOrder.restaurant_name === 'Restaurant Personnalisé');

                      if (!isManualOrder) {
                        return (
                          <div style={{ marginTop: '5px', fontWeight: 'bold', textAlign: 'right' }}>
                            Total: {Number(trackingOrder.total_price || 0).toFixed(2)} DT
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </PullToRefresh>

      {showLocationPopup && (
        <div className="location-popup-overlay">
          <div className="location-popup">
            <div className="location-popup-icon">📍</div>
            <h3>Localisation requise</h3>
            <p>La localisation GPS est requise pour passer une commande. Veuillez activer votre position en haut de la page.</p>
            <div className="location-popup-actions">
              <button onClick={() => {
                setShowLocationPopup(false);
                setShowCart(false);
                setShowMyOrders(false);
                setShowProfile(false);
                setShowManualOrder(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                // Ajouter un petit effet visuel sur le bouton de localisation
                const locBtn = document.getElementById('location-btn');
                if (locBtn) {
                  locBtn.classList.add('pulse-highlight');
                  setTimeout(() => locBtn.classList.remove('pulse-highlight'), 3000);
                }
              }} className="btn btn-success btn-full">
                D'accord, j'y vais
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-nav-item ${!showMyOrders && !showCart && !showManualOrder && !showProfile ? 'active' : ''}`}
          onClick={() => {
            setShowMyOrders(false);
            setShowCart(false);
            setShowManualOrder(false);
            setShowProfile(false);
          }}
        >
          <FiHome className="mobile-nav-icon" />
          <span>Accueil</span>
        </button>

        <button
          className={`mobile-nav-item ${showMyOrders ? 'active' : ''}`}
          onClick={() => {
            setShowMyOrders(true);
            setShowCart(false);
            setShowManualOrder(false);
            setShowProfile(false);
          }}
        >
          <FiList className="mobile-nav-icon" />
          <span>Commandes</span>
        </button>

        <button
          className={`mobile-nav-item ${showManualOrder ? 'active' : ''}`}
          onClick={() => {
            setShowManualOrder(true);
            setShowCart(false);
            setShowMyOrders(false);
            setShowProfile(false);
            const addr = positionLabel.includes('📍 Ma position : ')
              ? positionLabel.replace('📍 Ma position : ', '')
              : positionLabel;
            setManualOrderForm(prev => ({
              ...prev,
              phone: user?.phone || '',
              delivery_address: addr
            }));
          }}
        >
          <FiPlusCircle className="mobile-nav-icon" />
          <span>Manuelle</span>
        </button>

        <button
          className={`mobile-nav-item ${showCart ? 'active' : ''}`}
          onClick={() => {
            setShowCart(true);
            setShowMyOrders(false);
            setShowManualOrder(false);
            setShowProfile(false);
          }}
        >
          <div style={{ position: 'relative' }}>
            <FiShoppingCart className="mobile-nav-icon" />
            {cart.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: '#FFD700',
                color: 'black',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                {cart.length}
              </span>
            )}
          </div>
          <span>Panier</span>
        </button>

        <button
          className={`mobile-nav-item ${showProfile ? 'active' : ''}`}
          onClick={() => {
            setShowProfile(true);
            setShowMyOrders(false);
            setShowCart(false);
            setShowManualOrder(false);
          }}
        >
          <FiUser className="mobile-nav-icon" />
          <span>Profil</span>
        </button>
      </nav>

      {/* Modal Menu Professionnel */}
      {showMenuModal && selectedRestaurant && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-content menu-modal-content" style={{
            maxWidth: '1000px',
            width: '95%',
            maxHeight: '90vh',
            padding: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header du Menu */}
            <div className="menu-modal-header" style={{
              position: 'relative',
              height: '200px',
              backgroundImage: `url(${getFullImageUrl(selectedRestaurant.image_url)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'flex-end'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))'
              }}></div>
              <button
                onClick={() => setShowMenuModal(false)}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '35px',
                  height: '35px',
                  fontSize: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                }}
              >
                &times;
              </button>
              <div style={{
                position: 'relative',
                padding: '20px',
                color: 'white',
                width: '100%'
              }}>
                <h2 style={{ margin: 0, fontSize: '28px' }}>{selectedRestaurant.name}</h2>
                <p style={{ margin: '5px 0 0', opacity: 0.9 }}>{selectedRestaurant.description}</p>
                <div style={{ display: 'flex', gap: '15px', marginTop: '10px', fontSize: '14px' }}>
                  <span>⭐ {Math.floor(Math.random() * 16) + 85}%</span>
                  <span>⏱️ 30-45 min</span>
                  <span>📍 {selectedRestaurant.address}</span>
                </div>
              </div>
            </div>

            {/* Corps du Menu */}
            <div className="menu-modal-body" style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              background: '#f8f9fa'
            }}>
              {menuItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="loader"></div>
                  <p>Chargement du menu délicieux...</p>
                </div>
              ) : (
                <>
                  {/* Regrouper par catégorie */}
                  {Object.entries(
                    menuItems.reduce((acc, item) => {
                      const cat = item.category || 'Autres';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(item);
                      return acc;
                    }, {})
                  ).map(([category, items]) => (
                    <div key={category} style={{ marginBottom: '30px' }}>
                      <h3 style={{
                        borderBottom: '2px solid #FFD700',
                        paddingBottom: '10px',
                        marginBottom: '20px',
                        color: '#333'
                      }}>{category}</h3>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '20px'
                      }}>
                        {items.map(item => (
                          <div key={item.id} className="menu-item-pro-card" style={{
                            background: 'white',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'transform 0.2s',
                            border: '1px solid #eee'
                          }}>
                            <div style={{ height: '150px', overflow: 'hidden' }}>
                              <img
                                src={getFullImageUrl(item.image_url)}
                                alt={item.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.target.src = getSuggestionImage(item.name);
                                }}
                              />
                            </div>
                            <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h4 style={{ margin: 0, fontSize: '18px', color: '#333' }}>{item.name}</h4>
                                <span style={{
                                  fontWeight: 'bold',
                                  color: '#28a745',
                                  fontSize: '16px'
                                }}>{Number(item.price || 0).toFixed(3)} DT</span>
                              </div>
                              <p style={{
                                fontSize: '14px',
                                color: '#666',
                                margin: '10px 0',
                                flex: 1,
                                lineHeight: '1.4'
                              }}>{item.description || 'Un plat savoureux préparé avec soin.'}</p>
                              <button
                                onClick={() => {
                                  addToCart({ ...item, quantity: 1 });
                                  // Petit feedback visuel
                                  const btn = document.getElementById(`add-btn-${item.id}`);
                                  if (btn) {
                                    btn.innerText = '✅ Ajouté';
                                    btn.style.background = '#28a745';
                                    setTimeout(() => {
                                      btn.innerText = 'Ajouter au panier';
                                      btn.style.background = '#FFD700';
                                    }, 1000);
                                  }
                                }}
                                id={`add-btn-${item.id}`}
                                className="btn"
                                style={{
                                  width: '100%',
                                  background: '#FFD700',
                                  color: 'black',
                                  border: 'none',
                                  padding: '10px',
                                  borderRadius: '8px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  marginTop: '10px'
                                }}
                              >
                                Ajouter au panier
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer du Menu avec résumé panier rapide */}
            {cart.length > 0 && (
              <div style={{
                padding: '15px 20px',
                background: 'white',
                borderTop: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 -4px 10px rgba(0,0,0,0.05)'
              }}>
                <div>
                  <span style={{ fontWeight: 'bold', fontSize: '18px' }}>{cart.length} articles</span>
                  <span style={{ margin: '0 10px', color: '#ccc' }}>|</span>
                  <span style={{ fontWeight: 'bold', color: '#28a745', fontSize: '18px' }}>
                    {cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(3)} DT
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowMenuModal(false);
                    setShowCart(true);
                  }}
                  className="btn btn-success"
                  style={{ padding: '10px 25px', borderRadius: '30px', fontWeight: 'bold' }}
                >
                  Voir mon panier
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showComingSoon && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>🚀</div>
            <h3 style={{ marginBottom: '10px' }}>Bientôt disponible !</h3>
            <p style={{ color: '#666', marginBottom: '30px' }}>
              Cette fonctionnalité est en cours de développement et sera disponible dans la prochaine mise à jour.
            </p>
            <button
              onClick={() => setShowComingSoon(false)}
              className="btn btn-primary btn-full"
            >
              D'accord
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientDashboard;

