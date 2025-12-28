import React from 'react';

const ManualView = ({ 
  manualOrderForm, 
  setManualOrderForm, 
  allRestaurants, 
  addToCartFromManual, 
  updateManualItem, 
  removeManualItem, 
  addManualItem, 
  placeManualOrder,
  user,
  getAutoPrice
}) => {
  return (
    <div className="container" style={{paddingTop: '20px', paddingBottom: '100px'}}>
      <div className="manual-order-page" style={{background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}>
        <h2 style={{marginBottom: '20px'}}>📝 Commande Manuelle</h2>
        
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
              placeholder="Ex: Pizzeria Napoli"
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
            placeholder="Votre adresse exacte..."
            className="input"
            style={{width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px'}}
          />
        </div>

        <div style={{marginBottom: '25px'}}>
          <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333'}}>Numéro de téléphone *</label>
          <input
            type="tel"
            value={manualOrderForm.phone}
            onChange={(e) => setManualOrderForm({...manualOrderForm, phone: e.target.value})}
            placeholder="Votre numéro..."
            className="input"
            style={{width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '16px'}}
          />
        </div>

        <div style={{marginBottom: '20px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
            <h3 style={{margin: 0, fontSize: '18px'}}>Articles</h3>
            <button onClick={addManualItem} className="btn btn-secondary btn-sm">+ Ajouter un article</button>
          </div>
          
          {manualOrderForm.items.map((item, index) => (
            <div key={index} className="manual-item-row" style={{display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'flex-start'}}>
              <div style={{flex: 2}}>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateManualItem(index, 'name', e.target.value)}
                  placeholder="Nom de l'article..."
                  className="input"
                  style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd'}}
                />
              </div>
              <div style={{width: '70px'}}>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateManualItem(index, 'quantity', e.target.value)}
                  placeholder="Qté"
                  className="input"
                  min="1"
                  style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd'}}
                />
              </div>
              <div style={{width: '100px'}}>
                <div style={{position: 'relative'}}>
                  <input
                    type="text"
                    value={item.price ? `${item.price.toFixed(2)} DT` : 'Calcul...'}
                    readOnly
                    className="input"
                    style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', color: '#666', fontSize: '0.9em'}}
                  />
                  {item.name && (
                    <span style={{position: 'absolute', top: '-18px', left: '0', fontSize: '10px', color: '#28a745', fontWeight: 'bold'}}>Prix auto</span>
                  )}
                </div>
              </div>
              {manualOrderForm.items.length > 1 && (
                <button onClick={() => removeManualItem(index)} className="btn-icon" style={{background: 'none', border: 'none', color: '#ff4444', fontSize: '20px', cursor: 'pointer'}}>×</button>
              )}
            </div>
          ))}
        </div>

        <div style={{marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '1.2em', fontWeight: 'bold'}}>
                <span>Total estimé :</span>
                <span style={{color: '#28a745'}}>
                    {manualOrderForm.items.reduce((sum, item) => sum + (getAutoPrice(item.name) * (Number(item.quantity) || 1)), 0).toFixed(2)} DT
                </span>
            </div>
            <div style={{display: 'flex', gap: '10px'}}>
                <button 
                  onClick={addToCartFromManual} 
                  className="btn btn-secondary" 
                  style={{flex: 1, padding: '15px', borderRadius: '10px'}}
                >
                  🛒 Ajouter au panier
                </button>
                <button 
                  onClick={placeManualOrder} 
                  className="btn btn-primary" 
                  style={{flex: 1, padding: '15px', borderRadius: '10px', fontWeight: 'bold'}}
                >
                  🚀 Commander maintenant
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ManualView;
