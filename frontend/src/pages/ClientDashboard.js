import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FiShoppingCart, FiMapPin, FiHome, FiList, FiPlusCircle, FiUser } from 'react-icons/fi';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import ProfileMenu from '../components/ProfileMenu';
import WindowControls from '../components/WindowControls';
import PullToRefresh from '../components/PullToRefresh';
import './Dashboard.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const API_URL = 'https://flexpress.onrender.com/api';

// Helper to get full image URL
const getFullImageUrl = (url) => {
  if (!url) return 'static/logo.png';
  if (url.startsWith('data:image')) return url;
  if (url.startsWith('http')) return url;
  
  // Pour les images locales fournies avec l'app (APK/Desktop)
  // On retire le slash initial si présent pour que le chemin soit relatif au dossier public
  const cleanPath = url.startsWith('/') ? url.substring(1) : url;
  return cleanPath;
};

// Custom icons
const clientIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const restaurantIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function RecenterMap({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

function ClientDashboard({ user, onLogout }) {
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showMyOrders, setShowMyOrders] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
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
      trackingIntervalRef.current = setInterval(() => {
        loadOrders();
      }, 5000);
    } else {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    }
    
    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, [showTrackingMap, trackingOrder]);

  // Mettre à jour trackingOrder quand orders change
  useEffect(() => {
    if (showTrackingMap && trackingOrder) {
      const updatedOrder = orders.find(o => o.id === trackingOrder.id);
      if (updatedOrder) {
        // On ne met à jour que si les données ont changé pour éviter les re-renders inutiles
        if (JSON.stringify(updatedOrder) !== JSON.stringify(trackingOrder)) {
          setTrackingOrder(updatedOrder);
        }
      }
    }
  }, [orders, showTrackingMap, trackingOrder]);

  const openTrackingMap = (order) => {
    setTrackingOrder(order);
    setShowTrackingMap(true);
    // Centrer la carte sur le client ou le restaurant
    if (position) {
      setMapCenter(position);
    } else if (order.restaurant_latitude && order.restaurant_longitude) {
      setMapCenter([order.restaurant_latitude, order.restaurant_longitude]);
    }
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

  const loadPopularAndMakloub = async () => {
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
  };

  useEffect(() => {
    loadOrders();
    loadRestaurants(null, null);
    loadPopularAndMakloub();
    
    // Rafraîchissement automatique toutes les 10 secondes pour voir les nouveaux articles sans se déconnecter
    const interval = setInterval(() => {
      loadOrders();
      loadRestaurants(null, null);
      loadPopularAndMakloub();
    }, 10000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Filtrer les restaurants selon les filtres
    let filtered = [...allRestaurants];
    
    // Filtre par statut ouvert/fermé
    if (filterOpenOnly) {
      filtered = filtered.filter(r => r.is_open);
    }
    
    // Filtre par catégorie (basé sur le nom ou la description)
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => {
        const nameLower = r.name?.toLowerCase() || '';
        const descLower = r.description?.toLowerCase() || '';
        const combined = `${nameLower} ${descLower}`;
        
        switch(selectedCategory) {
          case 'tunisian':
            return combined.includes('tunisien') || combined.includes('makloub') || combined.includes('chawarma') || combined.includes('fricassé') || combined.includes('brik');
          case 'sandwich':
            return combined.includes('sandwich') || combined.includes('panini') || combined.includes('baguette');
          case 'burger':
            return combined.includes('burger') || combined.includes('hamburger');
          case 'pizza':
            return combined.includes('pizza') || combined.includes('pizzeria');
          case 'snacks':
            return combined.includes('snack') || combined.includes('frites') || combined.includes('nuggets');
          case 'salad':
            return combined.includes('salade') || combined.includes('salad');
          case 'chicken':
            return combined.includes('poulet') || combined.includes('chicken');
          case 'pasta':
            return combined.includes('pâte') || combined.includes('pasta') || combined.includes('carbonara') || combined.includes('bolognaise');
          case 'asian':
            return combined.includes('sushi') || combined.includes('chinois') || combined.includes('japonais') || combined.includes('thaï');
          case 'sushi':
            return combined.includes('sushi') || combined.includes('sashimi');
          case 'grill':
            return combined.includes('grill') || combined.includes('broche');
          case 'breakfast':
            return combined.includes('petit-déjeuner') || combined.includes('breakfast') || combined.includes('croissant');
          case 'oriental':
            return combined.includes('oriental') || combined.includes('shawarma') || combined.includes('kebab');
          case 'sweets':
            return combined.includes('dessert') || combined.includes('gâteau') || combined.includes('glace');
          case 'italian':
            return combined.includes('italien') || combined.includes('italian') || combined.includes('lasagne');
          default:
            return true;
        }
      });
    }
    
    setRestaurants(filtered);
  }, [filterOpenOnly, selectedCategory, allRestaurants]);

  const updateLocation = async (lat, lon) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API_URL}/user/location`, { latitude: lat, longitude: lon }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Erreur mise à jour position:', err);
    }
  };

  const loadRestaurants = async (lat, lon) => {
    try {
      // Construire l'URL avec ou sans coordonnées
      let url = `${API_URL}/restaurants`;
      if (lat !== null && lon !== null) {
        url += `?lat=${lat}&lon=${lon}`;
      }
      const response = await axios.get(url);
      setAllRestaurants(response.data);
      setRestaurants(response.data);
    } catch (err) {
      console.error('Erreur chargement restaurants:', err);
      // En cas d'erreur, charger sans position pour avoir la liste
      try {
        const response = await axios.get(`${API_URL}/restaurants`);
        setAllRestaurants(response.data);
        setRestaurants(response.data);
      } catch (err2) {
        console.error('Erreur chargement restaurants sans position:', err2);
      }
    }
  };

  const loadOrders = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (err) {
      console.error('Erreur chargement commandes:', err);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadOrders(), loadRestaurants(null, null)]);
  };

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
    setSelectedRestaurant(restaurant);
    loadMenuItems(restaurant.id);
  };

  const addToCart = (item) => {
    setCart([...cart, { ...item, id: Date.now() }]);
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
      finalAddress = `[Commande Directe] ${finalAddress}`;
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
          price: item.price
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
      items: [...manualOrderForm.items, { name: '', quantity: 1, price: 0 }]
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
      // Convertir en nombre, en gérant les chaînes comme "010"
      const numValue = value === '' ? 1 : parseFloat(value);
      newItems[index] = { ...newItems[index], quantity: isNaN(numValue) || numValue < 1 ? 1 : numValue };
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
        items: [{ name: '', quantity: 1, price: 0 }]
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
      return sum + (autoPrice * item.quantity);
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
        items: [{ name: '', quantity: 1, price: 0 }]
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
            style={{marginRight: '10px'}}
          >
            📦 Mes commandes {orders.length > 0 && `(${orders.length})`}
          </button>
          <button onClick={() => {
            setShowManualOrder(true);
            setManualOrderForm(prev => ({ ...prev, phone: user?.phone || '' }));
          }} className="btn btn-primary" style={{marginRight: '10px'}}>
            📝 Commande manuelle
          </button>
          <button onClick={() => setShowCart(!showCart)} className="btn btn-primary" style={{marginRight: '10px'}}>
            <FiShoppingCart /> Panier ({cart.length})
          </button>
          <WindowControls />
          <ProfileMenu user={user} onLogout={onLogout} />
        </div>
      </header>

      <PullToRefresh onRefresh={handleRefresh}>
        {/* Hero Section Style Glovo */}
      {!showMyOrders && !showProfile && (
        <div className="hero-section">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">Livraison de nourriture et plus</h1>
              <p className="hero-subtitle">Restaurants, épiceries, pharmacies, tout ce dont vous avez besoin !</p>
              <div className="hero-search">
                <input 
                  type="text" 
                  placeholder="Quelle est votre adresse ?" 
                  className="hero-input"
                  onClick={() => getCurrentLocation()}
                />
                <button id="location-btn" onClick={getCurrentLocation} className="btn btn-success hero-location-btn">
                  📍 Utiliser ma position
                </button>
              </div>
              <span className="hero-position-text">
                {getPositionLabel()}
              </span>
            </div>
            <div className="hero-image">
              <div className="hero-food-illustration">🍔🍕🥙</div>
            </div>
          </div>
        </div>
      )}

      <div className="container">
        {showProfile ? (
          <div className="profile-page">
            <div className="profile-header-card">
              <div className="profile-avatar-large-page">
                {user?.username?.substring(0, 2).toUpperCase() || '??'}
              </div>
              <h2 className="profile-name">{user?.username}</h2>
              <span className="profile-email-badge">{user?.email || 'email@exemple.com'}</span>
            </div>

            <div className="profile-menu-section">
              <button className="profile-menu-link">
                <div className="profile-menu-icon-wrapper icon-gold">
                  <FiUser />
                </div>
                <span className="profile-menu-label">Informations personnelles</span>
                <span className="profile-menu-arrow">›</span>
              </button>
              <button className="profile-menu-link">
                <div className="profile-menu-icon-wrapper icon-blue">
                  <FiMapPin />
                </div>
                <span className="profile-menu-label">Adresses enregistrées</span>
                <span className="profile-menu-arrow">›</span>
              </button>
              <button className="profile-menu-link">
                <div className="profile-menu-icon-wrapper icon-purple">
                  <FiList />
                </div>
                <span className="profile-menu-label">Historique des commandes</span>
                <span className="profile-menu-arrow">›</span>
              </button>
            </div>

            <div className="profile-menu-section">
              <button className="profile-menu-link">
                <div className="profile-menu-icon-wrapper icon-green">
                  <span style={{fontSize: '16px'}}>🔔</span>
                </div>
                <span className="profile-menu-label">Notifications</span>
                <span className="profile-menu-arrow">›</span>
              </button>
              <button className="profile-menu-link">
                <div className="profile-menu-icon-wrapper icon-gold">
                  <span style={{fontSize: '16px'}}>💳</span>
                </div>
                <span className="profile-menu-label">Moyens de paiement</span>
                <span className="profile-menu-arrow">›</span>
              </button>
              <button className="profile-menu-link">
                <div className="profile-menu-icon-wrapper icon-blue">
                  <span style={{fontSize: '16px'}}>❓</span>
                </div>
                <span className="profile-menu-label">Aide et support</span>
                <span className="profile-menu-arrow">›</span>
              </button>
            </div>

            <div className="logout-button-container">
              <button onClick={onLogout} className="logout-full-btn">
                <FiUser /> Déconnexion
              </button>
            </div>
            <div style={{textAlign: 'center', marginTop: '20px', color: '#999', fontSize: '12px'}}>
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
                {orders.map(order => (
                  <div key={order.id} className="order-card-glovo">
                    <div className="order-card-header">
                      <div className="order-restaurant-info">
                        <h3>{order.restaurant_name}</h3>
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
                            <span className="item-price">{item.price.toFixed(2)} DT</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="order-card-footer">
                      <div className="order-total">
                        <span className="total-label">Total:</span>
                        <span className="total-amount">{order.total_price.toFixed(2)} DT</span>
                      </div>
                      {order.delivery_address && (
                        <div className="order-address">
                          📍 {order.delivery_address}
                        </div>
                      )}
                      {(order.status === 'accepted' || order.status === 'delivering') && (
                        <button 
                          className="btn btn-primary btn-sm" 
                          style={{marginTop: '10px', width: '100%'}}
                          onClick={() => openTrackingMap(order)}
                        >
                          📍 Suivre ma commande
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section Makloub & Populaires dynamique */}
        {!showMyOrders && (
          <>
          {makloubItems.length > 0 && (
            <div className="suggestions-section">
              <h2 className="section-title">🌯 Spécialités Makloub</h2>
              <div className="suggestions-grid">
                {makloubItems.map((item, index) => (
                  <div key={index} className="suggestion-card" onClick={() => {
                    addToCart({...item, quantity: 1});
                    alert(`"${item.name}" ajouté au panier !`);
                  }}>
                    <div className="suggestion-image-container">
                      <img 
                        src={getFullImageUrl(item.image_url)} 
                        alt={item.name}
                        className="suggestion-image"
                        onError={(e) => { e.target.src = '/static/logo.png'; }}
                      />
                      <div className="restaurant-tag-overlay">{item.restaurant_name}</div>
                    </div>
                    <div className="suggestion-content">
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      <div className="suggestion-footer">
                        <span className="suggestion-price">{item.price.toFixed(3)} DT</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {popularItems.length > 0 && (
            <div className="suggestions-section">
              <h2 className="section-title">⭐ Les plus populaires</h2>
              <div className="suggestions-grid">
                {popularItems.map((item, index) => (
                  <div key={index} className="suggestion-card" onClick={() => {
                    addToCart({...item, quantity: 1});
                    alert(`"${item.name}" ajouté au panier !`);
                  }}>
                    <div className="suggestion-image-container">
                      <img 
                        src={getFullImageUrl(item.image_url)} 
                        alt={item.name}
                        className="suggestion-image"
                        onError={(e) => { e.target.src = '/static/logo.png'; }}
                      />
                      <div className="popular-badge-overlay">
                        <span className="popular-badge-icon">⭐</span>
                        <span className="popular-badge-text">Populaire</span>
                      </div>
                      <div className="restaurant-tag-overlay">{item.restaurant_name}</div>
                    </div>
                    <div className="suggestion-content">
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      <div className="suggestion-footer">
                        <span className="suggestion-price">{item.price.toFixed(3)} DT</span>
                      </div>
                    </div>
                  </div>
                ))}
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
            {/* Catégories de filtres style Glovo */}
            <div className="categories-section">
              <div className="categories-scroll">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                  >
                    <span className="category-icon">{category.icon}</span>
                    <span className="category-name">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filtres et tri */}
            <div className="filters-bar">
              <div className="filters-left">
                <label className="filter-toggle">
                  <input 
                    type="checkbox" 
                    checked={filterOpenOnly}
                    onChange={(e) => setFilterOpenOnly(e.target.checked)}
                  />
                  <span>Uniquement les restaurants ouverts</span>
                </label>
                {selectedCategory !== 'all' && (
                  <span className="selected-filter-tag">
                    {categories.find(c => c.id === selectedCategory)?.name}
                    <button onClick={() => setSelectedCategory('all')}>×</button>
                  </span>
                )}
              </div>
              <div className="results-count">
                {restaurants.length} {restaurants.length === 1 ? 'résultat' : 'résultats'}
              </div>
            </div>

            {/* Liste de restaurants style Glovo */}
            <div className="restaurants-grid glovo-style">
              {restaurants.length === 0 ? (
                <div className="no-restaurants">
                  <p>
                    {filterOpenOnly 
                      ? 'Aucun restaurant ouvert à proximité pour le moment.' 
                      : 'Aucun restaurant à proximité.'}
                  </p>
                </div>
              ) : (
                restaurants.map(restaurant => {
                  // Générer une image aléatoire basée sur le type de restaurant
                  const getRestaurantImage = () => {
                    const nameLower = restaurant.name?.toLowerCase() || '';
                    if (nameLower.includes('pizza')) return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400';
                    if (nameLower.includes('burger')) return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400';
                    if (nameLower.includes('sushi')) return 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400';
                    if (nameLower.includes('chicken') || nameLower.includes('poulet')) return 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400';
                    if (nameLower.includes('tacos')) return 'https://images.unsplash.com/photo-1565299585323-38174c6a6c08?w=400';
                    return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400';
                  };
                  
                  // Générer un logo/emoji basé sur le type
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
                  
                  // Calculer le temps de livraison basé sur la distance
                  const deliveryTime = restaurant.distance 
                    ? Math.max(30, Math.min(60, Math.round(restaurant.distance * 10 + 30)))
                    : Math.floor(Math.random() * 20) + 30;
                  
                  // Générer une note aléatoire entre 85 et 100
                  const rating = Math.floor(Math.random() * 16) + 85;
                  const ratingCount = Math.floor(Math.random() * 300) + 20;
                  
                  return (
                    <div key={restaurant.id} className={`glovo-restaurant-card ${!restaurant.is_open ? 'closed' : ''}`}>
                      {/* Image du restaurant */}
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
                      
                      {/* Contenu de la carte */}
                      <div className="restaurant-card-content">
                        {/* Logo et nom */}
                        <div className="restaurant-logo-name">
                          <div className="restaurant-logo">{getRestaurantLogo()}</div>
                          <div className="restaurant-name-section">
                            <h3 className="restaurant-name">{restaurant.name}</h3>
                            {restaurant.description && (
                              <p className="restaurant-tagline">{restaurant.description}</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Informations de livraison et note */}
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
                        
                        {/* Bouton commander */}
                        {restaurant.is_open && (
                          <button 
                            onClick={() => {
                              setShowManualOrder(true);
                              setManualOrderForm({
                                restaurant_id: restaurant.id,
                                restaurant_name: restaurant.name,
                                use_custom_restaurant: false,
                                delivery_address: '',
                                phone: user?.phone || '',
                                items: [{ name: '', quantity: 1, price: 0 }]
                              });
                            }} 
                            className="btn btn-primary btn-full glovo-order-btn"
                          >
                            Commander
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
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
                          <span className="price">{item.price.toFixed(3)}DT</span>
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
              <p style={{color: '#666', fontSize: '14px', marginBottom: '15px'}}>
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
                      <span className="quick-order-price">{item.price.toFixed(3)} DT</span>
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
                <div style={{marginBottom: '15px'}}>
                   <label style={{display: 'block', fontSize: '0.9em', color: '#666', marginBottom: '5px'}}>Adresse de livraison:</label>
                   <input 
                     type="text" 
                     value={deliveryAddress} 
                     onChange={(e) => setDeliveryAddress(e.target.value)}
                     placeholder="Votre adresse..."
                     className="input"
                     style={{width: '100%', padding: '8px'}}
                   />
                </div>
                
                <div style={{marginBottom: '15px'}}>
                   <label style={{display: 'block', fontSize: '0.9em', color: '#666', marginBottom: '5px'}}>Numéro de téléphone:</label>
                   <input 
                     type="tel" 
                     value={phoneNumber} 
                     onChange={(e) => setPhoneNumber(e.target.value)}
                     placeholder="Votre numéro de téléphone..."
                     className="input"
                     style={{width: '100%', padding: '8px'}}
                   />
                </div>
                
                {/* Affichage du restaurant sélectionné si existe */}
                {selectedRestaurant && (
                  <div style={{marginBottom: '10px', fontSize: '0.9em', color: '#28a745'}}>
                    Restaurant: <strong>{selectedRestaurant.name}</strong>
                  </div>
                )}
                {customRestaurantInfo.name && (
                   <div style={{marginBottom: '10px', fontSize: '0.9em', color: '#17a2b8'}}>
                    Restaurant personnalisé: <strong>{customRestaurantInfo.name}</strong>
                  </div>
                )}

                {cart.map(item => (
                  <div key={item.id} className="cart-item">
                    <div style={{flex: 1}}>
                      <span>{item.name}</span>
                      {item.category && (
                        <span className="menu-category" style={{marginLeft: '8px'}}>{item.category}</span>
                      )}
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                      <span style={{fontSize: '0.9em', color: '#666'}}>
                        {item.quantity} x {item.price.toFixed(2)}DT = {(item.price * item.quantity).toFixed(2)}DT
                      </span>
                      <button onClick={() => removeFromCart(item.id)} style={{background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer'}}>×</button>
                    </div>
                  </div>
                ))}
                <div className="cart-total">
                  Total: {cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}DT
                </div>
                <button onClick={placeOrder} className="btn btn-success btn-full">
                  Commander
                </button>
              </>
            )}
            <button onClick={() => setShowCart(false)} className="btn btn-secondary btn-full" style={{marginTop: '10px'}}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {showManualOrder && (
        <div className="cart-modal">
          <div className="cart-content" style={{maxWidth: '700px'}}>
            <h3>📝 Commande Manuelle</h3>
            
            <div style={{marginBottom: '15px', padding: '12px', background: '#f0f0f0', borderRadius: '8px'}}>
              <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                <input
                  type="checkbox"
                  checked={manualOrderForm.use_custom_restaurant}
                  onChange={(e) => setManualOrderForm({...manualOrderForm, use_custom_restaurant: e.target.checked, restaurant_id: '', restaurant_name: ''})}
                  style={{marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer'}}
                />
                <span style={{fontWeight: 'bold', color: '#333'}}>Restaurant non listé (saisir manuellement)</span>
              </label>
            </div>

            {!manualOrderForm.use_custom_restaurant ? (
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333'}}>Restaurant *</label>
                <select 
                  value={manualOrderForm.restaurant_id} 
                  onChange={(e) => setManualOrderForm({...manualOrderForm, restaurant_id: e.target.value})}
                  className="input"
                  style={{width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px'}}
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
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333'}}>Nom du restaurant *</label>
                <input
                  type="text"
                  value={manualOrderForm.restaurant_name}
                  onChange={(e) => setManualOrderForm({...manualOrderForm, restaurant_name: e.target.value})}
                  placeholder="Ex: Restaurant Chez Ali"
                  className="input"
                  style={{width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px'}}
                />
              </div>
            )}

            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333'}}>Adresse de livraison *</label>
              <input
                type="text"
                value={manualOrderForm.delivery_address}
                onChange={(e) => setManualOrderForm({...manualOrderForm, delivery_address: e.target.value})}
                placeholder="Ex: 123 Rue de la Paix, Djerba"
                className="input"
                style={{width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px'}}
              />
            </div>

            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333'}}>Numéro de téléphone *</label>
              <input
                type="tel"
                value={manualOrderForm.phone}
                onChange={(e) => setManualOrderForm({...manualOrderForm, phone: e.target.value})}
                placeholder="Ex: 50 123 456"
                className="input"
                style={{width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px'}}
              />
            </div>

            <div style={{marginBottom: '20px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                <label style={{fontWeight: 'bold', color: '#333', fontSize: '16px'}}>Articles *</label>
                <button onClick={addManualItem} className="btn btn-primary" style={{padding: '8px 16px', fontSize: '14px'}}>
                  + Ajouter un article
                </button>
              </div>
              
              <div style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px', background: '#fafafa'}}>
                {manualOrderForm.items.map((item, index) => {
                  const autoPrice = getAutoPrice(item.name);
                  return (
                    <div key={index} style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', marginBottom: '10px', alignItems: 'center', padding: '12px', background: 'white', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateManualItem(index, 'name', e.target.value)}
                        placeholder="Nom de l'article"
                        className="input"
                        style={{padding: '10px', border: '2px solid #e0e0e0', borderRadius: '6px', fontSize: '14px'}}
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateManualItem(index, 'quantity', e.target.value)}
                        placeholder="Qté"
                        min="1"
                        className="input"
                        style={{padding: '10px', border: '2px solid #e0e0e0', borderRadius: '6px', fontSize: '14px'}}
                      />
                      <div style={{padding: '10px', border: '2px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', background: '#f5f5f5', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>
                        {autoPrice > 0 ? `${autoPrice.toFixed(2)} DT` : '-'}
                      </div>
                      {manualOrderForm.items.length > 1 && (
                        <button 
                          onClick={() => removeManualItem(index)} 
                          className="btn btn-danger"
                          style={{padding: '10px', minWidth: '40px', fontSize: '18px'}}
                          title="Supprimer cet article"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{borderTop: '2px solid #FFD700', paddingTop: '15px', marginBottom: '20px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span style={{fontSize: '18px', fontWeight: 'bold', color: '#333'}}>Total:</span>
                <span style={{fontSize: '24px', fontWeight: 'bold', color: '#FFD700'}}>
                  {manualOrderForm.items
                    .filter(item => item.name && item.name.trim() !== '')
                    .reduce((sum, item) => {
                      const autoPrice = getAutoPrice(item.name);
                      return sum + (autoPrice * item.quantity);
                    }, 0)
                    .toFixed(2)} DT
                </span>
              </div>
            </div>

            <div style={{display: 'flex', gap: '10px'}}>
              <button onClick={addToCartFromManual} className="btn btn-primary" style={{flex: 1, padding: '12px', fontSize: '16px'}}>
                🛒 Ajouter au panier
              </button>
              <button onClick={placeManualOrder} className="btn btn-success" style={{flex: 1, padding: '12px', fontSize: '16px'}}>
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
              }} className="btn btn-secondary" style={{padding: '12px', fontSize: '16px'}}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      {showTrackingMap && trackingOrder && (
        <div className="cart-modal">
          <div className="cart-content" style={{maxWidth: '800px', width: '90%'}}>
            <div className="modal-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
              <h3>📍 Suivi de commande</h3>
              <button onClick={() => setShowTrackingMap(false)} className="btn btn-secondary btn-sm">Fermer</button>
            </div>
            
            <div style={{height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden', marginBottom: '15px'}}>
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
                
                {/* Client Position */}
                {position && (
                  <Marker position={position} icon={clientIcon}>
                    <Popup>Vous êtes ici</Popup>
                  </Marker>
                )}
                
                {/* Restaurant Position */}
                {trackingOrder.restaurant_latitude && trackingOrder.restaurant_longitude && (
                  <Marker 
                    position={[trackingOrder.restaurant_latitude, trackingOrder.restaurant_longitude]} 
                    icon={restaurantIcon}
                  >
                    <Popup>Restaurant: {trackingOrder.restaurant_name}</Popup>
                  </Marker>
                )}
                
                {/* Driver Position */}
                {trackingOrder.driver_lat && trackingOrder.driver_lon && (
                  <Marker 
                    position={[trackingOrder.driver_lat, trackingOrder.driver_lon]} 
                    icon={driverIcon}
                  >
                    <Popup>
                      Livreur: {trackingOrder.driver_name}<br/>
                      En route vers vous !
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
            
            <div className="tracking-info" style={{padding: '15px', background: '#f8f9fa', borderRadius: '8px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                <strong>Statut:</strong>
                <span className={`status-badge status-${trackingOrder.status}`}>
                  {trackingOrder.status === 'accepted' ? 'Préparation / En attente de prise en charge' : 
                   trackingOrder.status === 'delivering' ? 'En cours de livraison' : trackingOrder.status}
                </span>
              </div>
              
              {trackingOrder.driver_name ? (
                <div style={{marginBottom: '10px'}}>
                  <strong>Livreur:</strong> {trackingOrder.driver_name}
                  {trackingOrder.driver_lat && (
                    <span style={{marginLeft: '10px', color: '#28a745', fontSize: '0.9em'}}>
                      (Position en temps réel)
                    </span>
                  )}
                </div>
              ) : (
                <div style={{marginBottom: '10px', color: '#6c757d'}}>
                  <em>Recherche d'un livreur...</em>
                </div>
              )}
              
              <div style={{fontSize: '0.9em', color: '#666', marginBottom: '10px'}}>
                La position du livreur se met à jour automatiquement toutes les 5 secondes.
              </div>

              {trackingOrder.items && trackingOrder.items.length > 0 && (
                <div style={{borderTop: '1px solid #ddd', paddingTop: '10px'}}>
                  <strong style={{display: 'block', marginBottom: '5px'}}>Ma commande:</strong>
                  <ul style={{paddingLeft: '20px', margin: 0, fontSize: '0.9em'}}>
                    {trackingOrder.items.map((item, idx) => (
                      <li key={idx}>
                        {item.item_name} <span style={{color: '#666'}}>x{item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                  <div style={{marginTop: '5px', fontWeight: 'bold', textAlign: 'right'}}>
                    Total: {trackingOrder.total_price.toFixed(2)} DT
                  </div>
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
             setManualOrderForm(prev => ({ ...prev, phone: user?.phone || '' }));
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
          <div style={{position: 'relative'}}>
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
    </div>
  );
}

export default ClientDashboard;

