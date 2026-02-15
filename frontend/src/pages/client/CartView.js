import React from 'react';

const CartView = ({
  cart,
  deliveryAddress,
  setDeliveryAddress,
  phoneNumber,
  setPhoneNumber,
  selectedRestaurant,
  customRestaurantInfo,
  removeFromCart,
  placeOrder,
  navigate,
  getCurrentLocation
}) => {
  return (
    <div className="container" style={{ paddingTop: '20px', paddingBottom: '100px' }}>
      <div className="cart-page" style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: '20px' }}>🛒 Mon Panier</h2>

        {cart.length === 0 ? (
          <div className="empty-cart" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🛒</div>
            <h3>Votre panier est vide</h3>
            <p style={{ color: '#666', marginBottom: '25px' }}>Découvrez nos restaurants et commencez votre commande !</p>
            <button onClick={() => navigate('/client')} className="btn btn-primary">
              Voir les restaurants
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Détails de livraison</h3>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '0.9em', color: '#666', marginBottom: '5px' }}>Adresse de livraison *</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Adresse précise (étage, appartement...)"
                    className="input"
                    style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }}
                  />
                  <button
                    onClick={getCurrentLocation}
                    className="btn btn-success"
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.9em'
                    }}
                    title="Utiliser ma position actuelle"
                  >
                    📍 Ma position
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9em', color: '#666', marginBottom: '5px' }}>Numéro de téléphone *</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Votre numéro..."
                  className="input"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Ma Commande</h3>
              {selectedRestaurant && (
                <div style={{ marginBottom: '15px', padding: '10px', background: '#e8f5e9', borderRadius: '6px', color: '#2e7d32', fontSize: '0.9em' }}>
                  📍 Restaurant: <strong>{selectedRestaurant.name}</strong>
                </div>
              )}
              {customRestaurantInfo.name && (
                <div style={{ marginBottom: '15px', padding: '10px', background: '#e3f2fd', borderRadius: '6px', color: '#1565c0', fontSize: '0.9em' }}>
                  📍 Restaurant: <strong>{customRestaurantInfo.name}</strong>
                </div>
              )}

              <div className="cart-items-list" style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                {cart.map(item => (
                  <div key={item.id} className="cart-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid #eee', background: 'white' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500' }}>{item.name}</div>
                      {item.category && (
                        <span style={{ fontSize: '0.75em', background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', color: '#666' }}>{item.category}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9em', fontWeight: 'bold' }}>{(item.price * item.quantity).toFixed(2)} DT</div>
                        <div style={{ fontSize: '0.8em', color: '#888' }}>{item.quantity} x {item.price.toFixed(2)} DT</div>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} style={{ background: '#fff', color: '#ff4444', border: '1px solid #ff4444', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px' }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '8px', padding: '15px', marginBottom: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#666' }}>Sous-total</span>
                <span>{cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)} DT</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#666' }}>Frais de livraison</span>
                <span style={{ color: '#28a745', fontWeight: 'bold' }}>GRATUIT</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee', fontSize: '1.2em', fontWeight: 'bold' }}>
                <span>Total</span>
                <span style={{ color: '#28a745' }}>{cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)} DT</span>
              </div>
            </div>

            <button onClick={placeOrder} className="btn btn-primary" style={{ width: '100%', padding: '18px', fontSize: '1.1em', fontWeight: 'bold', borderRadius: '12px', boxShadow: '0 4px 12px rgba(255, 193, 7, 0.3)' }}>
              Confirmer la commande
            </button>
            <button onClick={() => navigate('/client')} className="btn btn-secondary" style={{ width: '100%', marginTop: '12px', padding: '15px', borderRadius: '12px' }}>
              Ajouter d'autres articles
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CartView;
