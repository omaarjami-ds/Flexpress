import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FiPlus, FiUser, FiUsers, FiPackage, FiMapPin, FiFileText, FiTrash2, FiRefreshCw, FiDownload, FiArrowLeft, FiX } from 'react-icons/fi';
import ProfileMenu from '../components/ProfileMenu';
import PullToRefresh from '../components/PullToRefresh';
import './Dashboard.css';

const API_URL = 'https://flexpress.onrender.com/api';

// Helper to get full image URL
const getFullImageUrl = (url) => {
  if (!url) return '/static/logo.png';
  if (url.startsWith('data:image')) return url;
  if (url.startsWith('http')) return url;
  
  // S'assurer que le chemin commence par /static/
  const cleanPath = url.startsWith('/') ? url.substring(1) : url;
  if (cleanPath.startsWith('static/')) return '/' + cleanPath;
  return `/static/${cleanPath}`;
};

function AdminDashboard({ user, onLogout, onUpdateUser }) {
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeSection, setActiveSection] = useState('restaurants'); // 'restaurants', 'orders', 'users', 'profile'
  const [personalInfoForm, setPersonalInfoForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  const [showRestaurantForm, setShowRestaurantForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    open_time: '09:00',
    close_time: '22:00'
  });
  const [editingOrder, setEditingOrder] = useState(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [newOrder, setNewOrder] = useState({
    status: 'pending',
    total_price: 0,
    delivery_address: '',
    estimated_delivery_time: 30
  });
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'livreur',
    phone: ''
  });
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [orderDateFilter, setOrderDateFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all'); // 'all', 'en_service', 'hors_service'

  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [showMenuItemForm, setShowMenuItemForm] = useState(false);
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Plat',
    image_url: '',
    is_popular: false,
    is_featured: false
  });
  const [uploading, setUploading] = useState(false);
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [showCustomReportModal, setShowCustomReportModal] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [customRange, setCustomRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const loadData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token manquant');
      if (onLogout) onLogout();
      return;
    }
    try {
      const [restaurantsRes, ordersRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/restaurants`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error('Erreur chargement restaurants:', err);
          return { data: [] };
        }),
        axios.get(`${API_URL}/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error('Erreur chargement commandes:', err);
          return { data: [] };
        }),
        axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error('Erreur chargement utilisateurs:', err);
          return { data: [] };
        })
      ]);
      setRestaurants(Array.isArray(restaurantsRes.data) ? restaurantsRes.data : []);
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (err) {
      console.error('Erreur chargement données:', err);
      if (err.response?.status === 401 && onLogout) {
        onLogout();
      }
    }
  }, [onLogout]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadData();
      // Rafraîchissement automatique toutes les 10 secondes
      const interval = setInterval(loadData, 10000);
      return () => clearInterval(interval);
    }
  }, [loadData, user]);

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier la taille (max 5Mo pour la sécurité du navigateur)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image est trop lourde (max 5Mo)');
      return;
    }

    setUploading(true);
    
    try {
      // Conversion en Base64 avec redimensionnement pour ne pas surcharger la DB
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          // Créer un canvas pour redimensionner
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max 800px de large/haut
          const MAX_SIZE = 800;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Récupérer le Base64 compressé (qualité 0.7)
          const base64String = canvas.toDataURL('image/jpeg', 0.7);
          
          if (type === 'restaurant') {
            setNewRestaurant({ ...newRestaurant, image_url: base64String });
          } else {
            setNewMenuItem({ ...newMenuItem, image_url: base64String });
          }
          setUploading(false);
        };
      };
    } catch (err) {
      console.error('Erreur conversion image:', err);
      alert('Erreur lors du traitement de l\'image');
      setUploading(false);
    }
  };

  const loadMenu = async (restaurantId) => {
    try {
      const res = await axios.get(`${API_URL}/restaurants/${restaurantId}/menu`);
      setMenuItems(res.data);
    } catch (err) {
      console.error('Erreur chargement menu:', err);
    }
  };

  const openMenuModal = (restaurant) => {
    setSelectedRestaurant(restaurant);
    loadMenu(restaurant.id);
    setShowMenuModal(true);
  };

  const addMenuItem = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    // Convertir le prix en nombre pour éviter les erreurs d'affichage
    const menuItemData = {
      ...newMenuItem,
      price: parseFloat(newMenuItem.price) || 0
    };

    try {
      if (editingMenuItem) {
        await axios.put(`${API_URL}/menu-items/${editingMenuItem.id}`, menuItemData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Article mis à jour!');
      } else {
        await axios.post(`${API_URL}/restaurants/${selectedRestaurant.id}/menu`, menuItemData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Article ajouté!');
      }
      setNewMenuItem({
        name: '',
        description: '',
        price: '',
        category: 'Plat',
        image_url: '',
        is_popular: false,
        is_featured: false
      });
      setEditingMenuItem(null);
      setShowMenuItemForm(false);
      loadMenu(selectedRestaurant.id);
    } catch (err) {
      alert('Erreur lors de l\'opération');
    }
  };

  const startEditingMenuItem = (item) => {
    setNewMenuItem({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category,
      image_url: item.image_url || '',
      is_popular: item.is_popular,
      is_featured: item.is_featured
    });
    setEditingMenuItem(item);
    setShowMenuItemForm(true);
  };

  const deleteMenuItem = async (itemId) => {
    if (!window.confirm('Supprimer cet article ?')) return;
    const token = localStorage.getItem('token');
    try {
      // Pour simplifier on utilise PUT pour rendre indisponible au lieu de DELETE physique
      await axios.put(`${API_URL}/menu-items/${itemId}`, { is_available: false }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadMenu(selectedRestaurant.id);
    } catch (err) {
      alert('Erreur suppression article');
    }
  };

  const toggleItemStatus = async (item, field) => {
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_URL}/menu-items/${item.id}`, { [field]: !item[field] }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadMenu(selectedRestaurant.id);
    } catch (err) {
      alert('Erreur mise à jour article');
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
      setActiveSection('restaurants');
    } catch (err) {
      console.error('Erreur mise à jour profil:', err);
      alert('Erreur lors de la mise à jour du profil.');
    }
  };

  const createRestaurant = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      if (editingRestaurant) {
        await axios.put(`${API_URL}/restaurants/${editingRestaurant.id}`, newRestaurant, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Restaurant mis à jour!');
      } else {
        await axios.post(`${API_URL}/restaurants`, newRestaurant, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Restaurant créé avec succès!');
      }
      setShowRestaurantForm(false);
      setEditingRestaurant(null);
      setNewRestaurant({
        name: '',
        description: '',
        address: '',
        phone: '',
        open_time: '09:00',
        close_time: '22:00'
      });
      loadData();
    } catch (err) {
      alert('Erreur lors de l\'opération');
    }
  };

  const startEditingRestaurant = (restaurant) => {
    setNewRestaurant({
      name: restaurant.name,
      description: restaurant.description || '',
      address: restaurant.address || '',
      phone: restaurant.phone || '',
      image_url: restaurant.image_url || '',
      open_time: restaurant.open_time || '09:00',
      close_time: restaurant.close_time || '22:00'
    });
    setEditingRestaurant(restaurant);
    setShowRestaurantForm(true);
  };

  const deleteRestaurant = async (restaurantId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce restaurant et tout son menu ?')) return;
    
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_URL}/restaurants/${restaurantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadData();
      alert('Restaurant supprimé avec succès');
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la suppression du restaurant');
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

  const deleteUser = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadData();
      alert('Utilisateur supprimé avec succès');
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const updateUserRole = async (userId, newRole) => {
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_URL}/users/${userId}/role`, { role: newRole }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadData();
      alert('Rôle utilisateur mis à jour');
    } catch (err) {
      alert('Erreur lors de la mise à jour du rôle');
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      if (editingUser) {
        // Pour la mise à jour, on ne renvoie pas le mot de passe s'il est vide
        const updateData = { ...newUser };
        if (!updateData.password) delete updateData.password;
        
        await axios.put(`${API_URL}/users/${editingUser.id}`, updateData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Utilisateur mis à jour!');
      } else {
        await axios.post(`${API_URL}/users`, newUser, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Utilisateur créé avec succès!');
      }
      setShowUserForm(false);
      setEditingUser(null);
      setNewUser({
        username: '',
        email: '',
        password: '',
        role: 'livreur',
        phone: ''
      });
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de l\'opération');
    }
  };

  const startEditingUser = (user) => {
    setNewUser({
      username: user.username,
      email: user.email,
      password: '', // On ne pré-remplit pas le mot de passe pour la sécurité
      role: user.role,
      phone: user.phone || ''
    });
    setEditingUser(user);
    setShowUserForm(true);
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Voulez-vous vraiment annuler cette commande ?')) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_URL}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadData();
      alert('Commande annulée');
    } catch (err) {
      alert('Erreur lors de l\'annulation');
    }
  };

  const assignOrder = async (orderId, deliveryId) => {
    if (!deliveryId) return;
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API_URL}/orders/${orderId}/assign`, { delivery_id: deliveryId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadData();
      alert('Commande assignée avec succès');
    } catch (err) {
      alert('Erreur lors de l\'assignation');
    }
  };

  const downloadOrderPDF = async (orderId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_URL}/orders/${orderId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `commande_${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      alert('Erreur lors du téléchargement du PDF');
    }
  };

  const downloadDailyReport = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_URL}/reports/daily?date=${reportDate}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bilan_journalier_${reportDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      setShowDailyReportModal(false);
    } catch (err) {
      alert('Erreur lors du téléchargement du bilan journalier');
    }
  };

  const downloadCustomReport = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_URL}/reports/custom?start_date=${customRange.start}&end_date=${customRange.end}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bilan_personnalise_${customRange.start}_${customRange.end}.pdf`);
      document.body.appendChild(link);
      link.click();
      setShowCustomReportModal(false);
    } catch (err) {
      alert('Erreur lors du téléchargement du bilan personnalisé');
    }
  };

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    activeRestaurants: restaurants.filter(r => r.is_active).length,
    totalRevenue: Number(orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total_price || 0), 0) || 0)
  };

  // Statistiques par livreur (basées sur les vraies commandes)
  const getDeliveryStatsForUser = (userId) => {
    const userOrders = orders.filter(o => o.delivery_id === userId);
    const deliveredOrders = userOrders.filter(o => o.status === 'delivered');
    const totalDelivered = deliveredOrders.length;
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
    return { totalDelivered, totalRevenue };
  };

  const filteredOrders = orders.filter(o => {
    if (!orderDateFilter) return true;
    try {
      if (!o.created_at) return false;
      const orderDate = new Date(o.created_at).toISOString().split('T')[0];
      return orderDate === orderDateFilter;
    } catch (e) { return false; }
  });

  const filteredUsers = users.filter(u => {
    if (userStatusFilter === 'all') return true;
    if (userStatusFilter === 'en_service') return u.role === 'livreur' && u.is_available;
    if (userStatusFilter === 'hors_service') return u.role === 'livreur' && !u.is_available;
    return true;
  });

  const startEditingOrder = (order) => {
    setEditingOrder(order);
    setNewOrder({
      status: order.status,
      total_price: order.total_price,
      delivery_address: order.delivery_address || '',
      estimated_delivery_time: order.estimated_delivery_time || 30
    });
    setShowOrderForm(true);
  };

  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_URL}/orders/${editingOrder.id}`, newOrder, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Commande mise à jour !');
      setShowOrderForm(false);
      setEditingOrder(null);
      loadData();
    } catch (err) {
      console.error('Erreur mise à jour commande:', err);
      alert('Erreur lors de la mise à jour');
    }
  };

  const openItineraryForOrder = (order) => {
    // Utiliser la position du livreur comme origine si disponible, sinon le restaurant
    const originLat = order.delivery_lat ?? order.restaurant_lat ?? null;
    const originLon = order.delivery_lon ?? order.restaurant_lon ?? null;
    const destLat = order.delivery_latitude ?? order.client_lat ?? null;
    const destLon = order.delivery_longitude ?? order.client_lon ?? null;

    if (originLat == null || originLon == null || destLat == null || destLon == null) {
      alert('Coordonnées insuffisantes pour ouvrir l’itinéraire.');
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLon}&destination=${destLat},${destLon}&travelmode=driving`;
    window.open(url, '_blank');
  };

  // Vérification de sécurité après les hooks
  if (!user || user.role !== 'admin') {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Accès non autorisé</h2>
        <p>Vous devez être administrateur pour accéder à cette page.</p>
      </div>
    );
  }

  return (
    <div className="dashboard admin-dashboard-page">
      <header className="header">
        <div className="header-left">
          <button className="icon-btn" onClick={() => window.history.back()} title="Retour">
            <FiArrowLeft />
          </button>
          <button className="icon-btn" onClick={() => loadData()} title="Actualiser">
            <FiRefreshCw />
          </button>
          <div className="header-logo">
            <img src="/logo.png" alt="FLEXPRESS" className="main-logo" />
            <h1>FLEXPRESS - Administration</h1>
          </div>
        </div>
        <div className="header-actions">
          <button className="icon-btn close-btn" onClick={() => window.close()} title="Fermer">
            <FiX />
          </button>
          <ProfileMenu 
            user={user} 
            onLogout={onLogout} 
            onProfileClick={() => setActiveSection('profile')}
          />
        </div>
      </header>

      <PullToRefresh onRefresh={loadData}>
        <div className="container">
        <div className="stats-grid">
          <div className="stat-card">
            <FiPackage />
            <div>
              <h3>{stats.totalOrders}</h3>
              <p>Total commandes</p>
            </div>
          </div>
          <div className="stat-card">
            <FiPackage />
            <div>
              <h3>{stats.pendingOrders}</h3>
              <p>En attente</p>
            </div>
          </div>
          <div className="stat-card">
            <FiMapPin />
            <div>
              <h3>{stats.activeRestaurants}</h3>
              <p>Restaurants actifs</p>
            </div>
          </div>
          <div className="stat-card">
            <FiUsers />
            <div>
              <h3>{Number(stats.totalRevenue || 0).toFixed(2)}DT</h3>
              <p>Chiffre d'affaires</p>
            </div>
          </div>
        </div>

        <div className="admin-dashboard-layout">
          {/* Sidebar avec sections */}
          <div className="admin-sidebar">
            <div className="admin-sidebar-header">
              <h3>📊 Navigation</h3>
            </div>
            <div className="mobile-back-link" style={{display: 'none', padding: '10px 15px', borderBottom: '1px solid #eee'}}>
               <button onClick={() => window.location.href='/'} className="btn btn-sm btn-secondary">‹ Retour Accueil</button>
            </div>
            <nav className="admin-nav">
              <button 
                className={`admin-nav-item ${activeSection === 'restaurants' ? 'active' : ''}`}
                onClick={() => setActiveSection('restaurants')}
              >
                <FiMapPin /> <span>Restaurants</span>
                <span className="nav-badge">{restaurants.length}</span>
              </button>
              <button 
                className={`admin-nav-item ${activeSection === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveSection('orders')}
              >
                <FiPackage /> <span>Commandes</span>
                <span className="nav-badge">{orders.length}</span>
              </button>
              <button 
                className={`admin-nav-item ${activeSection === 'users' ? 'active' : ''}`}
                onClick={() => setActiveSection('users')}
              >
                <FiUsers /> <span>Utilisateurs</span>
                <span className="nav-badge">{users.length}</span>
              </button>
              <button 
                className={`admin-nav-item ${activeSection === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveSection('profile')}
              >
                <FiUser /> <span>Mon Profil</span>
              </button>
            </nav>
          </div>

          {/* Contenu principal */}
          <div className="admin-main-content">
            {/* Section Restaurants */}
            {activeSection === 'restaurants' && (
              <div className="admin-section">
                <div className="admin-section-header">
                  <h2>🍽️ Gestion des Restaurants</h2>
                  <button 
                    onClick={() => {
                      setEditingRestaurant(null);
                      setNewRestaurant({ name: '', description: '', address: '', phone: '', image_url: '' });
                      setShowRestaurantForm(!showRestaurantForm);
                    }} 
                    className="btn btn-primary"
                  >
                    <FiPlus /> {showRestaurantForm ? 'Fermer' : 'Ajouter un restaurant'}
                  </button>
                </div>

            {showRestaurantForm && (
              <div className="card">
                <h3>{editingRestaurant ? 'Modifier le restaurant' : 'Nouveau restaurant'}</h3>
                <form onSubmit={createRestaurant}>
                  <input
                    type="text"
                    placeholder="Nom"
                    value={newRestaurant.name}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, name: e.target.value })}
                    required
                    className="input"
                  />
                  <textarea
                    placeholder="Description"
                    value={newRestaurant.description}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, description: e.target.value })}
                    className="input"
                  />
                  <input
                    type="text"
                    placeholder="Adresse"
                    value={newRestaurant.address}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, address: e.target.value })}
                    className="input"
                  />
                  <input
                    type="tel"
                    placeholder="Téléphone"
                    value={newRestaurant.phone}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, phone: e.target.value })}
                    className="input"
                  />
                  <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
                    <div style={{flex: 1}}>
                      <label style={{display: 'block', fontSize: '0.8em', color: '#666', marginBottom: '5px'}}>Heure d'ouverture</label>
                      <input
                        type="time"
                        value={newRestaurant.open_time}
                        onChange={(e) => setNewRestaurant({ ...newRestaurant, open_time: e.target.value })}
                        required
                        className="input"
                        style={{width: '100%'}}
                      />
                    </div>
                    <div style={{flex: 1}}>
                      <label style={{display: 'block', fontSize: '0.8em', color: '#666', marginBottom: '5px'}}>Heure de fermeture</label>
                      <input
                        type="time"
                        value={newRestaurant.close_time}
                        onChange={(e) => setNewRestaurant({ ...newRestaurant, close_time: e.target.value })}
                        required
                        className="input"
                        style={{width: '100%'}}
                      />
                    </div>
                  </div>
                  <div className="file-input-group">
                    <label>Photo du restaurant :</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'restaurant')}
                      className="input"
                    />
                    {uploading && <span>Chargement...</span>}
                    {newRestaurant.image_url && <img src={getFullImageUrl(newRestaurant.image_url)} alt="Aperçu" className="image-preview-sm" />}
                  </div>
                  <button type="submit" className="btn btn-success" disabled={uploading}>
                    {editingRestaurant ? 'Mettre à jour' : 'Créer'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowRestaurantForm(false);
                      setEditingRestaurant(null);
                    }}
                    className="btn btn-secondary"
                  >
                    Annuler
                  </button>
                </form>
              </div>
            )}

                {/* Tableau des restaurants */}
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nom</th>
                        <th>Description</th>
                        <th>Adresse</th>
                        <th>Téléphone</th>
                        <th>Horaires</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {restaurants.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="table-empty">Aucun restaurant</td>
                        </tr>
                      ) : (
                        restaurants.map(restaurant => (
                          <tr key={restaurant.id}>
                            <td>#{restaurant.id}</td>
                            <td>
                              <div className="table-cell-with-img">
                                {restaurant.image_url && <img src={getFullImageUrl(restaurant.image_url)} alt="" className="table-img-sm" />}
                                <strong>{restaurant.name}</strong>
                              </div>
                            </td>
                            <td>{restaurant.description || 'Aucune description'}</td>
                            <td>{restaurant.address || 'Non définie'}</td>
                            <td>{restaurant.phone || 'Non renseigné'}</td>
                            <td>{restaurant.open_time || '09:00'} - {restaurant.close_time || '22:00'}</td>
                            <td>
                              <span className={`status-badge ${restaurant.is_active ? 'status-delivered' : 'status-pending'}`}>
                                {restaurant.is_active ? 'Actif' : 'Inactif'}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions">
                                <button 
                                  onClick={() => openMenuModal(restaurant)}
                                  className="btn btn-primary btn-sm"
                                >
                                  <FiPlus /> Menu
                                </button>
                                <button 
                                  onClick={() => startEditingRestaurant(restaurant)}
                                  className="btn btn-info btn-sm"
                                >
                                  Éditer
                                </button>
                                <button 
                                  onClick={() => deleteRestaurant(restaurant.id)}
                                  className="btn btn-danger btn-sm"
                                  title="Supprimer"
                                >
                                  <FiTrash2 />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section Commandes */}
            {activeSection === 'orders' && (
              <div className="admin-section">
                <div className="admin-section-header">
                  <h2>📦 Gestion des Commandes</h2>
                  <div className="admin-actions-group">
                    <div className="report-buttons">
                      <button onClick={() => setShowDailyReportModal(true)} className="btn btn-info btn-sm">
                        <FiFileText /> Bilan Jour
                      </button>
                      <button onClick={() => setShowCustomReportModal(true)} className="btn btn-info btn-sm">
                        <FiDownload /> Bilan Période
                      </button>
                    </div>
                    <div className="filter-group">
                      <label>Date :</label>
                      <input 
                        type="date" 
                        value={orderDateFilter} 
                        onChange={(e) => setOrderDateFilter(e.target.value)}
                        className="input-sm"
                      />
                      {orderDateFilter && (
                        <button onClick={() => setOrderDateFilter('')} className="btn btn-secondary btn-sm">
                          <FiRefreshCw />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Restaurant</th>
                        <th>Client</th>
                        <th>Localisation client</th>
                        <th>Livreur</th>
                        <th>Localisation livreur</th>
                        <th>Adresse client</th>
                        <th>Temps livraison</th>
                        <th>Articles</th>
                        <th>Total</th>
                        <th>Date</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan="13" className="table-empty">Aucune commande trouvée</td>
                        </tr>
                      ) : (
                        filteredOrders.map(order => (
                          <tr key={order.id}>
                            <td>#{order.id}</td>
                            <td><strong>{order.restaurant_name}</strong></td>
                            <td>{order.client_name}</td>
                            <td>
                              {order.client_lat != null && order.client_lon != null
                                ? `${Number(order.client_lat).toFixed(4)}, ${Number(order.client_lon).toFixed(4)}`
                                : 'N/A'}
                            </td>
                            <td>{order.delivery_name || 'Non assigné'}</td>
                            <td>
                              {order.delivery_lat != null && order.delivery_lon != null
                                ? `${Number(order.delivery_lat).toFixed(4)}, ${Number(order.delivery_lon).toFixed(4)}`
                                : 'N/A'}
                            </td>
                            <td>
                              {order.delivery_address ? (
                                <span
                                  style={{ textDecoration: 'underline', color: '#007bff', cursor: 'pointer' }}
                                  onClick={() => openItineraryForOrder(order)}
                                  title={order.delivery_address}
                                >
                                  ici
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td>
                              {order.estimated_delivery_time 
                                ? `${order.estimated_delivery_time} min`
                                : 'N/A'}
                            </td>
                            <td>
                              {order.items && order.items.length > 0 ? (
                                <div className="table-items">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="item-tag" style={{display: 'flex', flexDirection: 'column', marginBottom: '2px'}}>
                                      <span>{item.item_name} x{item.quantity}</span>
                                      {item.comment && (
                                        <span style={{fontSize: '0.75rem', color: '#d32f2f', fontStyle: 'italic'}}>({item.comment})</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : '-'}
                            </td>
                            <td><strong>{Number(order.total_price || 0).toFixed(2)} DT</strong></td>
                            <td>{order.created_at ? new Date(order.created_at).toLocaleDateString('fr-FR') : 'N/A'}</td>
                            <td>
                              <span 
                                className="status-badge" 
                                style={{ backgroundColor: getStatusColor(order.status) }}
                              >
                                {order.status === 'pending' ? '⏳ En attente' : 
                                 order.status === 'accepted' ? '✅ Acceptée' :
                                 order.status === 'delivering' ? '🚚 En cours' :
                                 order.status === 'delivered' ? '✓ Livrée' : 
                                 order.status === 'cancelled' ? '❌ Annulée' : order.status}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions">
                                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                  <>
                                    <select 
                                      className="table-select-sm"
                                      onChange={(e) => assignOrder(order.id, e.target.value)}
                                      value={order.delivery_id || ''}
                                    >
                                      <option value="">Affecter Livreur</option>
                                      {users.filter(u => u.role === 'livreur').map(u => (
                                        <option key={u.id} value={u.id}>
                                          {u.username} {u.is_available ? '🟢' : '🔴'}
                                        </option>
                                      ))}
                                    </select>
                                    
                                    <button 
                                      onClick={() => cancelOrder(order.id)}
                                      className="btn btn-danger btn-xs"
                                      title="Annuler la commande"
                                    >
                                      <FiTrash2 />
                                    </button>
                                    
                                    <button 
                                      onClick={() => startEditingOrder(order)}
                                      className="btn btn-warning btn-xs"
                                      title="Modifier la commande"
                                      style={{ color: 'white' }}
                                    >
                                      Modifier
                                    </button>
                                  </>
                                )}
                                
                                <button 
                                  onClick={() => downloadOrderPDF(order.id)}
                                  className="btn btn-primary btn-xs"
                                  title="Télécharger PDF"
                                >
                                  <FiFileText />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section Utilisateurs */}
            {activeSection === 'users' && (
              <div className="admin-section">
                <div className="admin-section-header">
                  <h2>👥 Gestion des Utilisateurs</h2>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <select 
                      value={userStatusFilter} 
                      onChange={(e) => setUserStatusFilter(e.target.value)}
                      className="input"
                      style={{padding: '5px', width: 'auto'}}
                    >
                      <option value="all">Tous les utilisateurs</option>
                      <option value="en_service">🟢 Livreurs En Service</option>
                      <option value="hors_service">🔴 Livreurs Hors Service</option>
                    </select>
                    <button 
                      onClick={() => {
                        setEditingUser(null);
                        setNewUser({ username: '', email: '', password: '', role: 'livreur', phone: '' });
                        setShowUserForm(!showUserForm);
                      }} 
                      className="btn btn-primary"
                    >
                      <FiUsers /> {showUserForm ? 'Fermer' : 'Ajouter un utilisateur'}
                    </button>
                  </div>
                </div>

                {showUserForm && (
                  <div className="admin-form-card">
                    <h3>{editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h3>
                    <form onSubmit={createUser}>
                      <div className="form-grid">
                        <input
                          type="text"
                          placeholder="Nom d'utilisateur"
                          value={newUser.username}
                          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                          required
                          className="input"
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          required
                          className="input"
                        />
                        <input
                          type="password"
                          placeholder={editingUser ? "Nouveau mot de passe (laisser vide si inchangé)" : "Mot de passe"}
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          required={!editingUser}
                          className="input"
                        />
                        <input
                          type="tel"
                          placeholder="Téléphone"
                          value={newUser.phone}
                          onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                          className="input"
                        />
                        <select
                          value={newUser.role}
                          onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                          className="input"
                        >
                          <option value="client">Client</option>
                          <option value="livreur">Livreur</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="form-actions">
                        <button type="submit" className="btn btn-success">
                          {editingUser ? 'Mettre à jour' : 'Créer'}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setShowUserForm(false);
                            setEditingUser(null);
                          }}
                          className="btn btn-secondary"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nom d'utilisateur</th>
                        <th>Email</th>
                        <th>Téléphone</th>
                        <th>Rôle</th>
                        <th>Statut</th>
                        <th>Adresse / Localisation</th>
                        <th>Livraisons</th>
                        <th>Total livré</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="table-empty">Aucun utilisateur trouvé</td>
                        </tr>
                      ) : (
                        filteredUsers.map(userItem => (
                          <tr key={userItem.id}>
                            <td>#{userItem.id}</td>
                            <td><strong>{userItem.username}</strong></td>
                            <td>{userItem.email}</td>
                            <td>{userItem.phone || 'Non renseigné'}</td>
                            <td>
                              <span className={`status-badge ${userItem.role === 'admin' ? 'status-delivered' : userItem.role === 'livreur' ? 'status-accepted' : 'status-pending'}`}>
                                {userItem.role}
                              </span>
                            </td>
                            <td>
                              {userItem.role === 'livreur' ? (
                                <span className={`status-badge ${userItem.is_available ? 'status-delivering' : 'status-delivered'}`} style={{backgroundColor: userItem.is_available ? '#28a745' : '#dc3545'}}>
                                  {userItem.is_available ? '🟢 En ligne' : '🔴 Hors ligne'}
                                </span>
                              ) : '-'}
                            </td>
                            <td>
                              {userItem.latitude != null && userItem.longitude != null ? (
                                <span
                                  style={{ textDecoration: 'underline', color: '#007bff', cursor: 'pointer' }}
                                  onClick={() => {
                                    const url = `https://www.google.com/maps/search/?api=1&query=${userItem.latitude},${userItem.longitude}`;
                                    window.open(url, '_blank');
                                  }}
                                >
                                  {Number(userItem.latitude).toFixed(4)}, {Number(userItem.longitude).toFixed(4)}
                                </span>
                              ) : (
                                'N/A'
                              )}
                            </td>
                            <td>
                              {userItem.role === 'livreur' ? (
                                (() => {
                                  const { totalDelivered } = getDeliveryStatsForUser(userItem.id);
                                  return (
                                    <span className="delivery-count-cell">
                                      {totalDelivered} {totalDelivered <= 1 ? 'livraison' : 'livraisons'}
                                    </span>
                                  );
                                })()
                              ) : (
                                <span className="delivery-count-cell">-</span>
                              )}
                            </td>
                            <td>
                              {userItem.role === 'livreur' ? (
                                (() => {
                                  const { totalRevenue } = getDeliveryStatsForUser(userItem.id);
                                  return (
                                    <span className="delivery-amount-cell">
                                      {Number(totalRevenue || 0).toFixed(2)} DT
                                    </span>
                                  );
                                })()
                              ) : (
                                <span className="delivery-amount-cell">-</span>
                              )}
                            </td>
                            <td>
                              <div className="table-actions">
                                <button 
                                  onClick={() => startEditingUser(userItem)}
                                  className="btn btn-info btn-sm"
                                >
                                  Modifier
                                </button>
                                <select 
                                  value={userItem.role} 
                                  onChange={(e) => updateUserRole(userItem.id, e.target.value)}
                                  className="table-select"
                                >
                                  <option value="client">Client</option>
                                  <option value="livreur">Livreur</option>
                                  <option value="admin">Admin</option>
                                </select>
                                {userItem.role !== 'admin' && (
                                  <button 
                                    onClick={() => deleteUser(userItem.id)} 
                                    className="btn btn-danger btn-sm"
                                  >
                                    Supprimer
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section Mon Profil */}
            {activeSection === 'profile' && (
              <div className="admin-section">
                <div className="admin-section-header">
                  <h2>👤 Mon Profil Administrateur</h2>
                </div>
                <div className="card" style={{maxWidth: '600px', margin: '0 auto'}}>
                  <div style={{textAlign: 'center', marginBottom: '30px'}}>
                    <div className="profile-avatar-large-page" style={{margin: '0 auto 15px', width: '100px', height: '100px', fontSize: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffd700', color: 'white', borderRadius: '50%'}}>
                      {user?.username?.substring(0, 2).toUpperCase() || '??'}
                    </div>
                    <h3>{user?.username}</h3>
                    <p style={{color: '#666'}}>Administrateur Système</p>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="profile-form">
                    <div className="form-group" style={{marginBottom: '15px'}}>
                      <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Nom d'utilisateur</label>
                      <input 
                        type="text" 
                        value={personalInfoForm.username}
                        onChange={(e) => setPersonalInfoForm({...personalInfoForm, username: e.target.value})}
                        className="input"
                        style={{width: '100%'}}
                      />
                    </div>
                    <div className="form-group" style={{marginBottom: '15px'}}>
                      <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Email</label>
                      <input 
                        type="email" 
                        value={personalInfoForm.email}
                        onChange={(e) => setPersonalInfoForm({...personalInfoForm, email: e.target.value})}
                        className="input"
                        style={{width: '100%'}}
                      />
                    </div>
                    <div className="form-group" style={{marginBottom: '20px'}}>
                      <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Téléphone</label>
                      <input 
                        type="tel" 
                        value={personalInfoForm.phone}
                        onChange={(e) => setPersonalInfoForm({...personalInfoForm, phone: e.target.value})}
                        className="input"
                        style={{width: '100%'}}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-full" style={{width: '100%', padding: '12px'}}>
                      Sauvegarder les modifications
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </PullToRefresh>

      {/* Modal de gestion du menu */}
      {showMenuModal && selectedRestaurant && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h2>Menu de {selectedRestaurant.name}</h2>
              <button className="btn-close" onClick={() => setShowMenuModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setEditingMenuItem(null);
                  setNewMenuItem({ name: '', description: '', price: '', category: 'Plat', image_url: '', is_popular: false, is_featured: false });
                  setShowMenuItemForm(!showMenuItemForm);
                }}
                style={{marginBottom: '15px'}}
              >
                {showMenuItemForm ? 'Fermer' : 'Ajouter un article'}
              </button>

              {showMenuItemForm && (
                <div className="card" style={{padding: '15px', marginBottom: '20px'}}>
                  <form onSubmit={addMenuItem} className="form-grid">
                    <h3>{editingMenuItem ? 'Modifier l\'article' : 'Nouvel article'}</h3>
                    <input
                      type="text"
                      placeholder="Nom de l'article"
                      value={newMenuItem.name}
                      onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                      required
                      className="input"
                    />
                    <input
                      type="number"
                      step="0.001"
                      placeholder="Prix (DT)"
                      value={newMenuItem.price}
                      onChange={(e) => setNewMenuItem({ ...newMenuItem, price: e.target.value })}
                      required
                      className="input"
                    />
                    <select
                      value={newMenuItem.category}
                      onChange={(e) => setNewMenuItem({ ...newMenuItem, category: e.target.value })}
                      className="input"
                    >
                      <option value="Plat">Plat</option>
                      <option value="Pizza">Pizza</option>
                      <option value="Makloub">Makloub</option>
                      <option value="Burger">Burger</option>
                      <option value="Sandwich">Sandwich</option>
                      <option value="Boisson">Boisson</option>
                      <option value="Dessert">Dessert</option>
                    </select>
                    <textarea
                      placeholder="Description"
                      value={newMenuItem.description}
                      onChange={(e) => setNewMenuItem({ ...newMenuItem, description: e.target.value })}
                      className="input"
                    />
                    <div className="file-input-group">
                      <label>Photo de l'article :</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'menu')}
                        className="input"
                      />
                    </div>
                    <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
                      <label style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <input
                          type="checkbox"
                          checked={newMenuItem.is_popular}
                          onChange={(e) => setNewMenuItem({ ...newMenuItem, is_popular: e.target.checked })}
                        />
                        Populaire
                      </label>
                      <label style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <input
                          type="checkbox"
                          checked={newMenuItem.is_featured}
                          onChange={(e) => setNewMenuItem({ ...newMenuItem, is_featured: e.target.checked })}
                        />
                        Mis en avant
                      </label>
                    </div>
                    <button type="submit" className="btn btn-success" disabled={uploading}>
                      {editingMenuItem ? 'Mettre à jour' : 'Ajouter'}
                    </button>
                    {editingMenuItem && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingMenuItem(null);
                          setShowMenuItemForm(false);
                        }} 
                        className="btn btn-secondary"
                      >
                        Annuler
                      </button>
                    )}
                  </form>
                </div>
              )}

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Nom</th>
                      <th>Catégorie</th>
                      <th>Prix</th>
                      <th>Populaire</th>
                      <th>Mis en avant</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.length === 0 ? (
                      <tr><td colSpan="7" className="table-empty">Aucun article dans le menu</td></tr>
                    ) : (
                      menuItems.map(item => (
                        <tr key={item.id}>
                          <td>
                            {item.image_url && <img src={getFullImageUrl(item.image_url)} alt="" className="table-img-sm" />}
                          </td>
                          <td><strong>{item.name}</strong></td>
                          <td>{item.category}</td>
                          <td>{Number(item.price || 0).toFixed(3)} DT</td>
                          <td>
                            <input 
                              type="checkbox" 
                              checked={item.is_popular} 
                              onChange={() => toggleItemStatus(item, 'is_popular')}
                            />
                          </td>
                          <td>
                            <input 
                              type="checkbox" 
                              checked={item.is_featured} 
                              onChange={() => toggleItemStatus(item, 'is_featured')}
                            />
                          </td>
                          <td>
                            <div className="table-actions">
                              <button 
                                className="btn btn-info btn-xs" 
                                onClick={() => startEditingMenuItem(item)}
                              >
                                Éditer
                              </button>
                              <button 
                                className="btn btn-danger btn-xs" 
                                onClick={() => deleteMenuItem(item.id)}
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal Bilan Journalier */}
      {showDailyReportModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '400px'}}>
            <div className="modal-header">
              <h3>📅 Bilan Journalier</h3>
              <button className="close-btn" onClick={() => setShowDailyReportModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Choisir une date :</label>
                <input 
                  type="date" 
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="form-control"
                />
              </div>
              <div className="modal-actions">
                <button className="btn btn-primary w-100" onClick={downloadDailyReport}>
                  <FiDownload /> Télécharger PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bilan Personnalisé */}
      {showCustomReportModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '400px'}}>
            <div className="modal-header">
              <h3>🗓️ Bilan par Période</h3>
              <button className="close-btn" onClick={() => setShowCustomReportModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Date de début :</label>
                <input 
                  type="date" 
                  value={customRange.start}
                  onChange={(e) => setCustomRange({...customRange, start: e.target.value})}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Date de fin :</label>
                <input 
                  type="date" 
                  value={customRange.end}
                  onChange={(e) => setCustomRange({...customRange, end: e.target.value})}
                  className="form-control"
                />
              </div>
              <div className="modal-actions">
                <button className="btn btn-primary w-100" onClick={downloadCustomReport}>
                  <FiDownload /> Télécharger PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal Modification Commande */}
      {showOrderForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '500px'}}>
            <div className="modal-header">
              <h3>✏️ Modifier Commande #{editingOrder.id}</h3>
              <button className="close-btn" onClick={() => {
                setShowOrderForm(false);
                setEditingOrder(null);
              }}>&times;</button>
            </div>
            <form onSubmit={handleUpdateOrder} className="modal-body">
              <div style={{marginBottom: '15px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Statut</label>
                <select 
                  className="input" 
                  value={newOrder.status}
                  onChange={(e) => setNewOrder({...newOrder, status: e.target.value})}
                  style={{width: '100%'}}
                >
                  <option value="pending">En attente</option>
                  <option value="accepted">Acceptée</option>
                  <option value="delivering">En cours de livraison</option>
                  <option value="delivered">Livrée</option>
                  <option value="cancelled">Annulée</option>
                </select>
              </div>
              <div style={{marginBottom: '15px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Total (DT)</label>
                <input 
                  type="number" 
                  step="0.001" 
                  className="input" 
                  value={newOrder.total_price}
                  onChange={(e) => setNewOrder({...newOrder, total_price: parseFloat(e.target.value)})}
                  style={{width: '100%'}}
                />
              </div>
              <div style={{marginBottom: '15px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Adresse de livraison</label>
                <input 
                  type="text" 
                  className="input" 
                  value={newOrder.delivery_address}
                  onChange={(e) => setNewOrder({...newOrder, delivery_address: e.target.value})}
                  style={{width: '100%'}}
                />
              </div>
              <div style={{marginBottom: '15px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Temps estimé (min)</label>
                <input 
                  type="number" 
                  className="input" 
                  value={newOrder.estimated_delivery_time}
                  onChange={(e) => setNewOrder({...newOrder, estimated_delivery_time: parseInt(e.target.value)})}
                  style={{width: '100%'}}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-success" style={{width: '100%'}}>
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;

