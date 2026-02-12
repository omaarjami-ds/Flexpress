import React from 'react';

const OrdersView = ({ orders, navigate, getStatusColor, openTrackingMap }) => {
  return (
    <div className="container">
      <div className="my-orders-section">
        <div className="section-header-orders">
          <h2 className="section-title">📦 Mes Commandes</h2>
        </div>
        {orders.length === 0 ? (
          <div className="empty-orders">
            <div className="empty-orders-icon">📦</div>
            <h3>Aucune commande</h3>
            <p>Vous n'avez pas encore passé de commande</p>
            <button onClick={() => navigate('/client')} className="btn btn-primary">
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
                        {item.price > 0 && <span className="item-price">{item.price.toFixed(2)} DT</span>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="order-card-footer">
                  <div className="order-total">
                    <span className="total-label">Total:</span>
                    {order.total_price > 0 && <span className="total-amount">{order.total_price.toFixed(2)} DT</span>}
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
    </div>
  );
};

export default OrdersView;
