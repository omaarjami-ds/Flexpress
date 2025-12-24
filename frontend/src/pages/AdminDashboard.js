import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiUsers, FiPackage, FiMapPin } from 'react-icons/fi';
import ProfileMenu from '../components/ProfileMenu';
import './Dashboard.css';

const API_URL = 'http://192.168.1.13:5000/api';

function AdminDashboard({ user, onLogout }) {
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeSection, setActiveSection] = useState('restaurants'); // 'restaurants', 'orders', 'users'
  const [showRestaurantForm, setShowRestaurantForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({
    name: '',
    description: '',
    address: '',
    phone: ''
  });
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'livreur',
    phone: ''
  });
  const [orderDateFilter, setOrderDateFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all'); // 'all', 'en_service', 'hors_service'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    try {
      const [restaurantsRes, ordersRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/restaurants`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setRestaurants(restaurantsRes.data);
      setOrders(ordersRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error('Erreur chargement données:', err);
    }
  };

  const createRestaurant = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API_URL}/restaurants`, newRestaurant, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowRestaurantForm(false);
      setNewRestaurant({
        name: '',
        description: '',
        address: '',
        phone: ''
      });
      loadData();
      alert('Restaurant créé avec succès!');
    } catch (err) {
      alert('Erreur création restaurant');
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
      await axios.post(`${API_URL}/users`, newUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowUserForm(false);
      setNewUser({
        username: '',
        email: '',
        password: '',
        role: 'livreur',
        phone: ''
      });
      loadData();
      alert('Utilisateur créé avec succès!');
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur création utilisateur');
    }
  };

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    activeRestaurants: restaurants.filter(r => r.is_active).length,
    totalRevenue: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total_price, 0)
  };

  // Statistiques par livreur (basées sur les vraies commandes)
  const getDeliveryStatsForUser = (userId) => {
    const userOrders = orders.filter(o => o.delivery_id === userId);
    const deliveredOrders = userOrders.filter(o => o.status === 'delivered');
    const totalDelivered = deliveredOrders.length;
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.total_price, 0);
    return { totalDelivered, totalRevenue };
  };

  const filteredOrders = orders.filter(o => {
    if (!orderDateFilter) return true;
    try {
      const orderDate = new Date(o.created_at).toISOString().split('T')[0];
      return orderDate === orderDateFilter;
    } catch (e) { return true; }
  });

  const filteredUsers = users.filter(u => {
    if (userStatusFilter === 'all') return true;
    if (userStatusFilter === 'en_service') return u.role === 'livreur' && u.is_available;
    if (userStatusFilter === 'hors_service') return u.role === 'livreur' && !u.is_available;
    return true;
  });

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

  return (
    <div className="dashboard admin-dashboard-page">
      <header className="header">
        <div className="header-logo">
          <img src="/logo.png" alt="FLEXPRESS" className="main-logo" />
          <h1>FLEXPRESS - Administration</h1>
        </div>
        <div className="header-actions">
          <ProfileMenu user={user} onLogout={onLogout} />
        </div>
      </header>

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
              <h3>{stats.totalRevenue.toFixed(2)}DT</h3>
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
            <nav className="admin-nav">
              <button 
                className={`admin-nav-item ${activeSection === 'restaurants' ? 'active' : ''}`}
                onClick={() => setActiveSection('restaurants')}
              >
                <FiMapPin /> Restaurants
                <span className="nav-badge">{restaurants.length}</span>
              </button>
              <button 
                className={`admin-nav-item ${activeSection === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveSection('orders')}
              >
                <FiPackage /> Commandes
                <span className="nav-badge">{orders.length}</span>
              </button>
              <button 
                className={`admin-nav-item ${activeSection === 'users' ? 'active' : ''}`}
                onClick={() => setActiveSection('users')}
              >
                <FiUsers /> Utilisateurs
                <span className="nav-badge">{users.length}</span>
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
                    onClick={() => setShowRestaurantForm(!showRestaurantForm)} 
                    className="btn btn-primary"
                  >
                    <FiPlus /> Ajouter un restaurant
                  </button>
                </div>

            {showRestaurantForm && (
              <div className="card">
                <h3>Nouveau restaurant</h3>
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
                  <button type="submit" className="btn btn-success">Créer</button>
                  <button 
                    type="button" 
                    onClick={() => setShowRestaurantForm(false)}
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
                      </tr>
                    </thead>
                    <tbody>
                      {restaurants.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="table-empty">Aucun restaurant</td>
                        </tr>
                      ) : (
                        restaurants.map(restaurant => (
                          <tr key={restaurant.id}>
                            <td>#{restaurant.id}</td>
                            <td><strong>{restaurant.name}</strong></td>
                            <td>{restaurant.description || 'Aucune description'}</td>
                            <td>{restaurant.address || 'Non définie'}</td>
                            <td>{restaurant.phone || 'Non renseigné'}</td>
                            <td>{restaurant.open_time || '09:00'} - {restaurant.close_time || '22:00'}</td>
                            <td>
                              <span className={`status-badge ${restaurant.is_active ? 'status-delivered' : 'status-pending'}`}>
                                {restaurant.is_active ? 'Actif' : 'Inactif'}
                              </span>
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
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <label style={{fontWeight: 'bold'}}>Filtrer par date :</label>
                    <input 
                      type="date" 
                      value={orderDateFilter} 
                      onChange={(e) => setOrderDateFilter(e.target.value)}
                      className="input"
                      style={{padding: '5px', width: 'auto'}}
                    />
                    {orderDateFilter && (
                      <button 
                        onClick={() => setOrderDateFilter('')}
                        className="btn btn-secondary btn-sm"
                      >
                        Effacer
                      </button>
                    )}
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
                                >
                                  {order.delivery_address}
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
                                  {order.items.slice(0, 2).map((item, idx) => (
                                    <span key={idx} className="item-tag">
                                      {item.item_name} x{item.quantity}
                                    </span>
                                  ))}
                                  {order.items.length > 2 && (
                                    <span className="item-tag-more">+{order.items.length - 2}</span>
                                  )}
                                </div>
                              ) : '-'}
                            </td>
                            <td><strong>{order.total_price.toFixed(2)} DT</strong></td>
                            <td>{new Date(order.created_at).toLocaleDateString('fr-FR')}</td>
                            <td>
                              <span 
                                className="status-badge" 
                                style={{ backgroundColor: getStatusColor(order.status) }}
                              >
                                {order.status === 'pending' ? '⏳ En attente' : 
                                 order.status === 'accepted' ? '✅ Acceptée' :
                                 order.status === 'delivering' ? '🚚 En cours' :
                                 order.status === 'delivered' ? '✓ Livrée' : order.status}
                              </span>
                            </td>
                            <td>
                              {order.status !== 'delivered' && (
                                <select 
                                  value={order.status} 
                                  onChange={(e) => {
                                    const token = localStorage.getItem('token');
                                    axios.put(`${API_URL}/orders/${order.id}/status`, { status: e.target.value }, {
                                      headers: { Authorization: `Bearer ${token}` }
                                    }).then(() => loadData()).catch(err => alert('Erreur mise à jour statut'));
                                  }}
                                  className="table-select"
                                >
                                  <option value="pending">En attente</option>
                                  <option value="accepted">Acceptée</option>
                                  <option value="delivering">En cours</option>
                                  <option value="delivered">Livrée</option>
                                </select>
                              )}
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
                      onClick={() => setShowUserForm(!showUserForm)} 
                      className="btn btn-primary"
                    >
                      <FiUsers /> Ajouter un utilisateur
                    </button>
                  </div>
                </div>

                {showUserForm && (
                  <div className="admin-form-card">
                    <h3>Nouvel utilisateur</h3>
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
                          placeholder="Mot de passe"
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          required
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
                        <button type="submit" className="btn btn-success">Créer</button>
                        <button 
                          type="button" 
                          onClick={() => setShowUserForm(false)}
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
                                      {totalRevenue.toFixed(2)} DT
                                    </span>
                                  );
                                })()
                              ) : (
                                <span className="delivery-amount-cell">-</span>
                              )}
                            </td>
                            <td>
                              <div className="table-actions">
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;

