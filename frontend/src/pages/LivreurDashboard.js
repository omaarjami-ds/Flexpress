import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { FiCheckCircle } from 'react-icons/fi';
import ProfileMenu from '../components/ProfileMenu';
import './Dashboard.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const API_URL = 'https://flexpress.onrender.com/api';

// Calcul de distance (en km) entre deux points GPS, style Google Maps simplifié
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Composant pour recentrer la carte
function RecenterMap({ center, zoom }) {
  const map = useMap();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Ce useEffect doit s'exécuter une seule fois au montage pour initialiser
  // la géolocalisation et le rafraîchissement automatique des commandes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Composant bouton de géolocalisation style Google Maps
function LocationButton({ onLocationClick }) {
  return (
    <div className="leaflet-bottom leaflet-right">
      <div className="leaflet-control leaflet-bar">
        <button 
          className="location-button"
          onClick={onLocationClick}
          title="Me localiser"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="2" fill="#4285F4"/>
            <circle cx="10" cy="10" r="5" stroke="#4285F4" strokeWidth="1.5" fill="none"/>
            <circle cx="10" cy="10" r="7.5" stroke="#4285F4" strokeWidth="1" fill="none"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function LivreurDashboard({ user, onLogout }) {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [position, setPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(13);
  const [accuracy, setAccuracy] = useState(null);
  const [positionLabel, setPositionLabel] = useState('📍 Position livreur non détectée. Cliquez sur le bouton de localisation.');
  const [showEarningsDetails, setShowEarningsDetails] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [earningsDateFilter, setEarningsDateFilter] = useState('');
  const watchIdRef = useRef(null);
  const mapRef = useRef(null);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }

    console.log('Demande de géolocalisation livreur...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        console.log('Position livreur obtenue:', { latitude, longitude, accuracy: acc });
        
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
        updateHumanReadablePosition(latitude, longitude);
        
        console.log('Position livreur mise à jour:', newPosition);
        
        // Démarrer le suivi en temps réel après avoir obtenu la première position
        startWatchPosition();
      },
      (error) => {
        // Comportement plus doux, façon Google Maps : pas d'alerte bloquante sur timeout,
        // on log seulement l'erreur et l'utilisateur peut recliquer sur le bouton.
        if (error.code === error.PERMISSION_DENIED) {
          alert('📍 (Livreur) L\'accès à la position a été refusé. Veuillez l\'autoriser dans les paramètres de votre téléphone.');
        } else {
          console.warn('Erreur géolocalisation livreur (non bloquante):', error);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 60000,     // attendre plus longtemps comme Google Maps
        maximumAge: 10000   // permettre une position récente en cache
      }
    );
  };

  const startWatchPosition = () => {
    if (!navigator.geolocation) return;
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        const newPosition = [latitude, longitude];
        setPosition(newPosition);
        setAccuracy(acc);
        updateLocation(latitude, longitude);
        updateHumanReadablePosition(latitude, longitude);
      },
      (error) => {
        console.warn('Erreur watchPosition livreur:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  };

  useEffect(() => {
    // Charger le statut de disponibilité initial
    const fetchStatus = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get(`${API_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsAvailable(!!response.data.is_available);
      } catch (err) {
        console.error('Erreur chargement profil:', err);
      }
    };
    fetchStatus();

    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    
    return () => {
      clearInterval(interval);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            'User-Agent': 'flexpress-livreur/1.0'
          }
        }
      );
      const data = response.data || {};
      const address = data.display_name || '';
      if (address) {
        setPositionLabel(`📍 Ma position (livreur) : ${address}`);
      } else {
        setPositionLabel('📍 Ma position détectée, mais adresse introuvable.');
      }
    } catch (err) {
      console.error('Erreur géocodage inverse livreur:', err);
      if (position) {
        const [latVal, lonVal] = position;
        setPositionLabel(`📍 Ma position approximative (${latVal.toFixed(3)}, ${lonVal.toFixed(3)})`);
      }
    }
  };

  const toggleStatus = async () => {
    const token = localStorage.getItem('token');
    try {
      const newStatus = !isAvailable;
      await axios.post(`${API_URL}/user/status`, { is_available: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsAvailable(newStatus);
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const loadOrders = async () => {
    const token = localStorage.getItem('token');
    try {
      const [availableRes, myRes] = await Promise.all([
        axios.get(`${API_URL}/deliveries/available`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setAvailableOrders(availableRes.data);
      setMyOrders(myRes.data.filter(o => o.delivery_id === user.id));
    } catch (err) {
      console.error('Erreur chargement commandes:', err);
    }
  };

  const acceptOrder = async (orderId) => {
    if (!isAvailable) {
      alert("Vous devez être 'En Service' pour accepter une commande. Veuillez changer votre statut.");
      return;
    }
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API_URL}/orders/${orderId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadOrders();
      alert('Commande acceptée!');
    } catch (err) {
      alert('Erreur lors de l\'acceptation');
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_URL}/orders/${orderId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadOrders();
    } catch (err) {
      alert('Erreur mise à jour statut');
    }
  };

  // Calculer les statistiques
  const stats = {
    totalAccepted: myOrders.filter(o => o.status === 'accepted' || o.status === 'delivering' || o.status === 'delivered').length,
    totalDelivered: myOrders.filter(o => o.status === 'delivered').length,
    totalEarnings: myOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total_price, 0),
    inProgress: myOrders.filter(o => o.status === 'delivering').length,
    available: availableOrders.length
  };

  const deliveredOrders = myOrders
    .filter(o => o.status === 'delivered')
    .filter(o => {
      if (!earningsDateFilter) return true;
      try {
        const orderDate = new Date(o.created_at).toISOString().split('T')[0];
        return orderDate === earningsDateFilter;
      } catch (e) { return true; }
    });

  // Informations de route entre le livreur et l'adresse du client
  const getRouteInfoForOrder = (order) => {
    if (!position) return null;
    const [livLat, livLon] = position;

    // Priorité à la latitude/longitude de livraison, sinon fallback sur lat/lon client
    const targetLat =
      order.delivery_latitude !== undefined && order.delivery_latitude !== null
        ? order.delivery_latitude
        : order.client_lat;
    const targetLon =
      order.delivery_longitude !== undefined && order.delivery_longitude !== null
        ? order.delivery_longitude
        : order.client_lon;

    if (targetLat == null || targetLon == null) return null;

    const distanceKm = calculateDistanceKm(
      livLat,
      livLon,
      Number(targetLat),
      Number(targetLon)
    );

    // Estimation temps de trajet uniquement (le backend gère déjà le temps total)
    const travelMinutes = Math.max(3, Math.round(distanceKm * 4 + 2)); // livreur déjà en route

    return { distanceKm, travelMinutes };
  };

  const openItineraryForOrder = (order) => {
    if (!position) {
      alert('Position du livreur inconnue. Veuillez activer la géolocalisation.');
      return;
    }
    const [livLat, livLon] = position;
    
    let destination = '';
    
    const targetLat =
      order.delivery_latitude !== undefined && order.delivery_latitude !== null
        ? Number(order.delivery_latitude)
        : Number(order.client_lat);
    const targetLon =
      order.delivery_longitude !== undefined && order.delivery_longitude !== null
        ? Number(order.delivery_longitude)
        : Number(order.client_lon);

    // Check if coordinates are valid (not 0,0 and not NaN)
    if (targetLat && targetLon && (Math.abs(targetLat) > 0.0001 || Math.abs(targetLon) > 0.0001)) {
        destination = `${targetLat},${targetLon}`;
    } else if (order.delivery_address) {
        // Fallback to address string
        destination = encodeURIComponent(order.delivery_address);
    } else {
      alert('Coordonnées et adresse du client indisponibles pour cette commande.');
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&origin=${livLat},${livLon}&destination=${destination}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const allOrders = [...availableOrders, ...myOrders];
  
  const activeOrders = myOrders.filter(o => ['accepted', 'delivering'].includes(o.status));
  const historyOrders = myOrders
    .filter(o => ['delivered', 'cancelled'].includes(o.status))
    .filter(o => {
      if (!historyDateFilter) return true;
      try {
        const orderDate = new Date(o.created_at).toISOString().split('T')[0];
        return orderDate === historyDateFilter;
      } catch (e) { return true; }
    });

  const markers = allOrders.map(order => ({
    id: order.id,
    position: [order.restaurant_lat || order.delivery_latitude, order.restaurant_lon || order.delivery_longitude],
    type: order.delivery_id === user.id ? 'my' : 'available',
    order
  }));

  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-logo">
          <img src="/logo.png" alt="FLEXPRESS" className="main-logo" />
          <h1>FLEXPRESS - Livreur</h1>
        </div>
        <div className="header-actions">
          <button 
            onClick={toggleStatus} 
            className={`btn ${isAvailable ? 'btn-success' : 'btn-danger'}`}
            style={{marginRight: '15px', fontWeight: 'bold'}}
          >
            {isAvailable ? '🟢 En Service' : '🔴 Hors Service'}
          </button>
          <ProfileMenu user={user} onLogout={onLogout} />
        </div>
      </header>

      <div className="container">
        {/* Dashboard Statistiques Livreur */}
        <div className="livreur-stats-dashboard">
          <h2 className="section-title">📊 Mon Tableau de Bord</h2>
          <div className="stats-grid">
            <div className="stat-card-livreur">
              <div className="stat-icon accepted">✅</div>
              <div className="stat-content">
                <h3>{stats.totalAccepted}</h3>
                <p>Commandes acceptées</p>
              </div>
            </div>
            <div className="stat-card-livreur">
              <div className="stat-icon delivered">✓</div>
              <div className="stat-content">
                <h3>{stats.totalDelivered}</h3>
                <p>Commandes livrées</p>
              </div>
            </div>
            <div 
              className="stat-card-livreur stat-card-clickable" 
              onClick={() => setShowEarningsDetails(!showEarningsDetails)}
            >
              <div className="stat-icon earnings">💰</div>
              <div className="stat-content">
                <h3>{stats.totalEarnings.toFixed(2)} DT</h3>
                <p>Total gagné</p>
              </div>
            </div>
            <div className="stat-card-livreur">
              <div className="stat-icon progress">🚚</div>
              <div className="stat-content">
                <h3>{stats.inProgress}</h3>
                <p>En cours de livraison</p>
              </div>
            </div>
            <div className="stat-card-livreur">
              <div className="stat-icon available">📦</div>
              <div className="stat-content">
                <h3>{stats.available}</h3>
                <p>Commandes disponibles</p>
              </div>
            </div>
          </div>

          {showEarningsDetails && (
            <div className="livreur-earnings-details">
              <div className="earnings-header">
                <h3>💰 Détail de mes gains</h3>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setShowEarningsDetails(false)}
                >
                  Fermer
                </button>
              </div>
              
              <div style={{marginBottom: '15px', padding: '0 10px'}}>
                <label style={{display: 'inline-block', marginRight: '10px', fontWeight: 'bold'}}>Filtrer par date :</label>
                <input 
                  type="date" 
                  value={earningsDateFilter} 
                  onChange={(e) => setEarningsDateFilter(e.target.value)}
                  className="input"
                  style={{display: 'inline-block', width: 'auto', padding: '5px'}}
                />
                {earningsDateFilter && (
                  <button 
                    onClick={() => setEarningsDateFilter('')}
                    className="btn btn-sm btn-secondary"
                    style={{marginLeft: '10px'}}
                  >
                    Effacer
                  </button>
                )}
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Restaurant</th>
                      <th>Client</th>
                      <th>Total</th>
                      <th>Adresse</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveredOrders.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="table-empty">Aucune commande livrée pour le moment</td>
                      </tr>
                    ) : (
                      deliveredOrders.map(order => (
                        <tr key={order.id}>
                          <td>#{order.id}</td>
                          <td><strong>{order.restaurant_name}</strong></td>
                          <td>{order.client_name}</td>
                          <td><strong>{order.total_price.toFixed(2)} DT</strong></td>
                          <td>{order.delivery_address || '-'}</td>
                          <td>{new Date(order.created_at).toLocaleString('fr-FR')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="dashboard-grid">
          <div className="main-content">
            <h2>Commandes disponibles</h2>
            
            <div className="map-container">
              <div className="map-legend">
                <div className="map-legend-item">
                  <span>📍</span> Votre position
                </div>
                <div className="map-legend-item">
                  <span style={{color: '#28a745'}}>🟢</span> Mes livraisons
                </div>
                <div className="map-legend-item">
                  <span style={{color: '#17a2b8'}}>🔵</span> Commandes disponibles
                </div>
              </div>
              {position ? (
                <>
                  <MapContainer 
                    center={mapCenter || position} 
                    zoom={mapZoom || 13} 
                    style={{ height: '500px', width: '100%' }}
                    scrollWheelZoom={true}
                    ref={mapRef}
                  >
                  <TileLayer 
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                  />
                  {/* Recentrer la carte si nécessaire */}
                  {mapCenter && <RecenterMap center={mapCenter} zoom={mapZoom} />}
                  
                  {/* Cercle de précision autour de la position */}
                  {accuracy && (
                    <Circle
                      center={position}
                      radius={accuracy}
                      pathOptions={{
                        color: '#4285F4',
                        fillColor: '#4285F4',
                        fillOpacity: 0.2,
                        weight: 2
                      }}
                    />
                  )}
                  
                  {/* Marqueur de position livreur */}
                  <Marker position={position}>
                    <Popup>
                      <strong>📍 Votre position (Livreur)</strong>
                      {accuracy && (
                        <><br />Précision: ±{Math.round(accuracy)}m</>
                      )}
                    </Popup>
                  </Marker>
                  
                  {/* Bouton de géolocalisation */}
                  <LocationButton onLocationClick={() => {
                    console.log('Bouton de localisation livreur cliqué');
                    getCurrentLocation();
                  }} />
                  
                  {/* Marqueurs des commandes */}
                  {markers.map(marker => {
                    const icon = L.icon({
                      iconUrl: marker.type === 'my' 
                        ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png'
                        : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
                      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                      iconSize: [25, 41],
                      iconAnchor: [12, 41],
                      popupAnchor: [1, -34],
                    });
                    return (
                      <Marker key={marker.id} position={marker.position} icon={icon}>
                        <Popup>
                          <strong>{marker.order.restaurant_name}</strong><br />
                          Client: {marker.order.client_name}<br />
                          Total: {marker.order.total_price}DT<br />
                          <span style={{ 
                            color: marker.type === 'my' ? '#28a745' : '#17a2b8', 
                            fontWeight: 'bold' 
                          }}>
                            {marker.type === 'my' ? '🟢 Ma livraison' : '🔵 Disponible'}
                          </span>
                        </Popup>
                      </Marker>
                    );
                  })}

                  {/* Itinéraires simplifiés (ligne) entre le livreur et les livraisons en cours */}
                  {position && myOrders.map(order => {
                    const [livLat, livLon] = position;
                    const targetLat =
                      order.delivery_latitude !== undefined && order.delivery_latitude !== null
                        ? order.delivery_latitude
                        : order.client_lat;
                    const targetLon =
                      order.delivery_longitude !== undefined && order.delivery_longitude !== null
                        ? order.delivery_longitude
                        : order.client_lon;

                    if (targetLat == null || targetLon == null) return null;

                    return (
                      <Polyline
                        key={`route-${order.id}`}
                        positions={[
                          [livLat, livLon],
                          [Number(targetLat), Number(targetLon)]
                        ]}
                        pathOptions={{
                          color: '#4B6CFF',
                          weight: 4,
                          opacity: 0.7,
                          dashArray: '6,4'
                        }}
                      />
                    );
                  })}
                </MapContainer>
                <div className="livreur-position-text">
                  {positionLabel}
                </div>
              </>
              ) : (
                <div className="map-loading">
                  <div className="loading-message">
                    <p>📍 En attente de votre position...</p>
                    <p className="loading-hint">Cliquez sur le bouton de localisation pour activer le GPS</p>
                    <button onClick={getCurrentLocation} className="btn btn-primary">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px', display: 'inline-block', verticalAlign: 'middle'}}>
                        <circle cx="10" cy="10" r="2" fill="currentColor"/>
                        <circle cx="10" cy="10" r="5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1" fill="none"/>
                      </svg>
                      Me localiser maintenant
                    </button>
                  </div>
                  <MapContainer 
                    center={[33.8083, 10.8533]} 
                    zoom={13} 
                    style={{ height: '500px', width: '100%' }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer 
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                    />
                    <LocationButton onLocationClick={getCurrentLocation} />
                  </MapContainer>
                </div>
              )}
            </div>

            <div className="orders-section">
              <h3>Nouvelles commandes</h3>
              <div className="orders-grid">
                {availableOrders.map(order => (
                  <div 
                    key={order.id} 
                    className="card order-card"
                    onClick={() => setSelectedOrder(order)}
                    style={{cursor: 'pointer'}}
                  >
                    <div className="order-header">
                      <h4>{order.restaurant_name}</h4>
                      <span className="status-badge status-pending">En attente</span>
                    </div>
                    <div className="order-info">
                      <p><strong>Client:</strong> {order.client_name}</p>
                      <p>
                        <strong>Adresse:</strong>{' '}
                        <span
                          style={{ textDecoration: 'underline', color: '#007bff' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openItineraryForOrder(order);
                          }}
                        >
                          {order.delivery_address}
                        </span>
                      </p>
                      <p><strong>Total:</strong> {order.total_price}DT</p>
                      {getRouteInfoForOrder(order) && (() => {
                        const info = getRouteInfoForOrder(order);
                        return (
                          <p>
                            <strong>Distance au client:</strong>{' '}
                            {info.distanceKm.toFixed(1)} km (~{info.travelMinutes} min)
                          </p>
                        );
                      })()}
                      <p 
                        style={{ cursor: 'pointer', color: '#007bff', textDecoration: 'underline' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedOrderId(expandedOrderId === order.id ? null : order.id);
                        }}
                      >
                        <strong>Temps estimé:</strong>{' '}
                        {order.estimated_delivery_time ? `${order.estimated_delivery_time} min` : 'N/A'}
                        {expandedOrderId === order.id ? ' ▼' : ' ▶'}
                      </p>
                      {expandedOrderId === order.id && (
                        <div style={{marginTop: '8px', fontSize: '0.85em', color: '#555'}}>
                          <p>
                            <strong>Coordonnées client:</strong>{' '}
                            {order.delivery_latitude && order.delivery_longitude
                              ? `${Number(order.delivery_latitude).toFixed(5)}, ${Number(order.delivery_longitude).toFixed(5)}`
                              : 'Non disponibles'}
                          </p>
                          {position && (
                            <p>
                              <strong>Coordonnées livreur:</strong>{' '}
                              {position[0].toFixed(5)}, {position[1].toFixed(5)}
                            </p>
                          )}
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openItineraryForOrder(order);
                            }}
                          >
                            Ouvrir l'itinéraire Google Maps
                          </button>
                        </div>
                      )}
                      {order.items && order.items.length > 0 && (
                        <div style={{marginTop: '8px', fontSize: '0.9em'}}>
                          <strong>Articles:</strong>
                          <ul style={{margin: '4px 0', paddingLeft: '20px'}}>
                            {order.items.map((item, idx) => (
                              <li key={idx}>{item.item_name} x{item.quantity} - {item.price}DT</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        acceptOrder(order.id);
                      }} 
                      className="btn btn-success btn-full"
                    >
                      <FiCheckCircle /> Accepter la commande
                    </button>
                  </div>
                ))}
                {availableOrders.length === 0 && (
                  <p>Aucune commande disponible</p>
                )}
              </div>
            </div>
          </div>

          <div className="sidebar">
            {/* Résumé des statistiques */}
            <div className="card livreur-summary-card">
              <h3>📊 Résumé</h3>
              <div className="summary-stats">
                <div className="summary-item">
                  <span className="summary-label">Acceptées:</span>
                  <span className="summary-value accepted">{stats.totalAccepted}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Livrées:</span>
                  <span className="summary-value delivered">{stats.totalDelivered}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">En cours:</span>
                  <span className="summary-value progress">{stats.inProgress}</span>
                </div>
                <div className="summary-item total-earnings">
                  <span className="summary-label">Total gagné:</span>
                  <span className="summary-value earnings">{stats.totalEarnings.toFixed(2)} DT</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                <h3 style={{margin: 0}}>En cours</h3>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowHistory(true)}
                  style={{fontSize: '0.9em'}}
                >
                  📜 Historique
                </button>
              </div>
              {activeOrders.length === 0 ? (
                <p>Aucune livraison en cours</p>
              ) : (
                activeOrders.map(order => (
                  <div key={order.id} className="order-item" onClick={() => setSelectedOrder(order)} style={{cursor: 'pointer'}}>
                    <div>
                      <strong>{order.restaurant_name}</strong>
                      <p>Client: {order.client_name}</p>
                      <p>Total: {order.total_price}DT</p>
                      <p>
                        Adresse:{' '}
                        <span
                          style={{ textDecoration: 'underline', color: '#007bff', cursor: 'pointer' }}
                          onClick={() => openItineraryForOrder(order)}
                        >
                          {order.delivery_address || 'Adresse non disponible'}
                        </span>
                      </p>
                      {getRouteInfoForOrder(order) && (() => {
                        const info = getRouteInfoForOrder(order);
                        return (
                          <p>
                            Distance au client: {info.distanceKm.toFixed(1)} km (~{info.travelMinutes} min)
                          </p>
                        );
                      })()}
                      <p>
                        Temps estimé:{' '}
                        {order.estimated_delivery_time ? `${order.estimated_delivery_time} min` : 'N/A'}
                      </p>
                      {order.items && order.items.length > 0 && (
                        <div style={{marginTop: '8px', fontSize: '0.9em'}}>
                          <strong>Articles:</strong>
                          <ul style={{margin: '4px 0', paddingLeft: '20px'}}>
                            {order.items.map((item, idx) => (
                              <li key={idx}>{item.item_name} x{item.quantity} - {item.price}DT</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p style={{fontSize: '0.85em', color: '#999', marginTop: '5px'}}>
                        {new Date(order.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <div className="order-actions">
                      <span className={`status-badge status-${order.status}`}>
                        {order.status === 'pending' ? 'En attente' : 
                         order.status === 'accepted' ? 'Acceptée' :
                         order.status === 'delivering' ? 'En cours' :
                         order.status === 'delivered' ? 'Livrée' : order.status}
                      </span>
                      {order.status === 'accepted' && (
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'delivering')}
                          className="btn btn-primary"
                        >
                          En route
                        </button>
                      )}
                      {order.status === 'delivering' && (
                        <button 
                          onClick={async () => {
                            if (window.confirm(`Confirmer la livraison de la commande ${order.id} ?\nMontant: ${order.total_price}DT\n\nCette commande sera retirée de votre liste.`)) {
                              await updateOrderStatus(order.id, 'delivered');
                              alert('✅ Commande marquée comme livrée avec succès!');
                            }
                          }}
                          className="btn btn-success"
                        >
                          ✓ Marquer comme livrée
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showHistory && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 2000,
          display: 'flex',
          justifyContent: 'flex-end'
        }} onClick={() => setShowHistory(false)}>
          <div style={{
            width: '350px',
            height: '100%',
            backgroundColor: 'white',
            boxShadow: '-2px 0 5px rgba(0,0,0,0.2)',
            padding: '20px',
            overflowY: 'auto',
            animation: 'slideIn 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px'}}>
              <h3 style={{margin: 0}}>📜 Historique</h3>
              <button 
                onClick={() => setShowHistory(false)}
                style={{background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666'}}
              >
                ×
              </button>
            </div>
            
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9em', color: '#666'}}>Filtrer par date:</label>
              <div style={{display: 'flex', gap: '10px'}}>
                <input 
                  type="date" 
                  value={historyDateFilter} 
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                  className="input"
                  style={{flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px'}}
                />
                {historyDateFilter && (
                  <button 
                    onClick={() => setHistoryDateFilter('')}
                    style={{padding: '0 10px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer'}}
                  >
                    Effacer
                  </button>
                )}
              </div>
            </div>
            
            {historyOrders.length === 0 ? (
              <p style={{textAlign: 'center', color: '#888', marginTop: '20px'}}>Aucune livraison terminée.</p>
            ) : (
              historyOrders.map(order => (
                <div key={order.id} className="card" onClick={() => setSelectedOrder(order)} style={{marginBottom: '15px', padding: '15px', borderLeft: order.status === 'delivered' ? '4px solid #28a745' : '4px solid #dc3545', cursor: 'pointer'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                    <span style={{fontWeight: 'bold', color: '#555'}}>#{order.id}</span>
                    <span className={`status-badge status-${order.status}`} style={{fontSize: '0.8em', padding: '2px 8px'}}>
                      {order.status === 'delivered' ? 'Livrée' : order.status}
                    </span>
                  </div>
                  <h4 style={{margin: '5px 0', fontSize: '1.1em'}}>{order.restaurant_name}</h4>
                  <p style={{margin: '2px 0', fontSize: '0.9em', color: '#666'}}>Client: {order.client_name}</p>
                  <p style={{margin: '2px 0', fontSize: '0.9em'}}>Total: <strong>{order.total_price} DT</strong></p>
                  <p style={{margin: '8px 0 0 0', fontSize: '0.8em', color: '#999', borderTop: '1px solid #f0f0f0', paddingTop: '5px'}}>
                    📅 {new Date(order.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 3000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }} onClick={() => setSelectedOrder(null)}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '25px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 5px 20px rgba(0,0,0,0.3)',
            position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedOrder(null)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ×
            </button>
            
            <h2 style={{marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '20px'}}>
              📦 Détails Commande #{selectedOrder.id}
            </h2>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
              <div>
                <h4 style={{color: '#666', marginBottom: '5px'}}>Restaurant</h4>
                <p style={{fontWeight: 'bold', fontSize: '1.1em'}}>{selectedOrder.restaurant_name}</p>
              </div>
              <div>
                <h4 style={{color: '#666', marginBottom: '5px'}}>Client</h4>
                <p style={{fontWeight: 'bold', fontSize: '1.1em'}}>{selectedOrder.client_name}</p>
                {selectedOrder.client_phone && (
                  <p style={{color: '#007bff', marginTop: '5px'}}>
                    📞 <a href={`tel:${selectedOrder.client_phone}`} style={{color: 'inherit', textDecoration: 'none'}}>{selectedOrder.client_phone}</a>
                  </p>
                )}
              </div>
            </div>

            <div style={{marginBottom: '20px'}}>
              <h4 style={{color: '#666', marginBottom: '5px'}}>Adresse de livraison</h4>
              <p style={{fontSize: '1.1em'}}>
                <span
                  style={{ textDecoration: 'underline', color: '#007bff', cursor: 'pointer' }}
                  onClick={() => openItineraryForOrder(selectedOrder)}
                  title="Ouvrir l'itinéraire dans Google Maps"
                >
                  {selectedOrder.delivery_address}
                </span>
                <span 
                  style={{marginLeft: '10px', cursor: 'pointer', fontSize: '1.2em'}} 
                  onClick={() => openItineraryForOrder(selectedOrder)}
                  title="Ouvrir l'itinéraire dans Google Maps"
                >
                  🗺️
                </span>
              </p>
            </div>

            <div style={{marginBottom: '20px', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px'}}>
              <h4 style={{marginTop: 0, marginBottom: '10px'}}>Articles</h4>
              <ul style={{paddingLeft: '20px', margin: 0}}>
                {selectedOrder.items && selectedOrder.items.map((item, idx) => (
                  <li key={idx} style={{marginBottom: '5px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span>{item.item_name} <span style={{color: '#666'}}>x{item.quantity}</span></span>
                      <span>{(item.price * item.quantity).toFixed(2)} DT</span>
                    </div>
                  </li>
                ))}
              </ul>
              <div style={{borderTop: '1px solid #ddd', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1em'}}>
                <span>Total</span>
                <span>{selectedOrder.total_price.toFixed(2)} DT</span>
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px'}}>
              {selectedOrder.status === 'pending' && (
                <button 
                  onClick={() => {
                    acceptOrder(selectedOrder.id);
                    setSelectedOrder(null);
                  }}
                  className="btn btn-success"
                >
                  Accepter la commande
                </button>
              )}
              {selectedOrder.status === 'accepted' && (
                <button 
                  onClick={() => {
                    updateOrderStatus(selectedOrder.id, 'delivering');
                    setSelectedOrder(null);
                  }}
                  className="btn btn-primary"
                >
                  Commencer la livraison
                </button>
              )}
              {selectedOrder.status === 'delivering' && (
                <button 
                  onClick={async () => {
                    if (window.confirm(`Confirmer la livraison de la commande ${selectedOrder.id} ?`)) {
                      await updateOrderStatus(selectedOrder.id, 'delivered');
                      setSelectedOrder(null);
                      alert('✅ Commande livrée !');
                    }
                  }}
                  className="btn btn-success"
                >
                  Marquer comme livrée
                </button>
              )}
              <button onClick={() => setSelectedOrder(null)} className="btn btn-secondary">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LivreurDashboard;

