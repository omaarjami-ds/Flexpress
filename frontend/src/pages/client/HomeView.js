import React from 'react';
import { useNotification } from '../../components/Notification';

const HomeView = ({ 
  getCurrentLocation, 
  getPositionLabel, 
  tunisianFastFoodSuggestions, 
  addToCart, 
  getSuggestionImage,
  setSelectedCategory,
  categories,
  selectedCategory,
  filterOpenOnly,
  setFilterOpenOnly,
  restaurants,
  setSelectedRestaurant,
  loadMenuItems,
  user
}) => {
  return (
    <>
      {/* Hero Section Style Glovo */}
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
                readOnly
              />
              <button onClick={getCurrentLocation} className="btn btn-success hero-location-btn">
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

      <div className="container">
        {/* Section Suggestions Fastfood Tunisien */}
        <div className="suggestions-section">
          <h2 className="section-title">
            🍽️ Suggestions Populaires - Fastfood Tunisien
          </h2>
          <div className="suggestions-grid">
            {tunisianFastFoodSuggestions.map((item, index) => (
              <div 
                key={index} 
                className="suggestion-card"
                onClick={() => {
                  addToCart({
                    name: item.name,
                    price: item.price,
                    quantity: 1,
                    isSuggestion: true
                  });
                  alert(`"${item.name}" ajouté au panier !`);
                }}
              >
                <div className="suggestion-image-container">
                  <img 
                    src={getSuggestionImage(item.name)} 
                    alt={item.name}
                    className="suggestion-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div className="suggestion-image-fallback" style={{display: 'none'}}>
                    <span className="suggestion-fallback-icon">🍽️</span>
                  </div>
                  {item.popular && (
                    <div className="popular-badge-overlay">
                      <span className="popular-badge-icon">⭐</span>
                      <span className="popular-badge-text">Populaire</span>
                    </div>
                  )}
                </div>
                <div className="suggestion-content">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="suggestion-footer">
                    <span className="suggestion-price">{item.price.toFixed(2)} DT</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Suggestions supplémentaires */}
        <div className="more-suggestions-section">
          <h2 className="section-title">✨ Recommandations pour vous</h2>
          <div className="recommendations-grid">
            <div className="recommendation-card" onClick={() => {
              setSelectedCategory('tunisian');
            }}>
              <div className="recommendation-icon">🥙</div>
              <h4>Spécialités Tunisiennes</h4>
              <p>Découvrez nos meilleurs plats traditionnels</p>
            </div>
            <div className="recommendation-card" onClick={() => {
              setSelectedCategory('sandwich');
            }}>
              <div className="recommendation-icon">🥪</div>
              <h4>Sandwichs & Paninis</h4>
              <p>Des sandwichs frais et savoureux</p>
            </div>
            <div className="recommendation-card" onClick={() => {
              setSelectedCategory('pizza');
            }}>
              <div className="recommendation-icon">🍕</div>
              <h4>Pizzas Artisanales</h4>
              <p>Pizzas faites maison avec des ingrédients frais</p>
            </div>
            <div className="recommendation-card" onClick={() => {
              setSelectedCategory('chicken');
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
                  const getRestaurantImage = () => {
                    const nameLower = restaurant.name?.toLowerCase() || '';
                    if (nameLower.includes('pizza')) return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400';
                    if (nameLower.includes('burger')) return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400';
                    if (nameLower.includes('sushi')) return 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400';
                    if (nameLower.includes('chicken') || nameLower.includes('poulet')) return 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400';
                    if (nameLower.includes('tacos')) return 'https://images.unsplash.com/photo-1565299585323-38174c6a6c08?w=400';
                    return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400';
                  };
                  
                  const deliveryTime = restaurant.distance 
                    ? Math.max(30, Math.min(60, Math.round(restaurant.distance * 10 + 30)))
                    : Math.floor(Math.random() * 20) + 30;
                  
                  const rating = Math.floor(Math.random() * 16) + 85;
                  
                  return (
                    <div key={restaurant.id} className={`glovo-restaurant-card ${!restaurant.is_open ? 'closed' : ''}`} onClick={() => {
                      if (restaurant.is_open) {
                        setSelectedRestaurant(restaurant);
                        loadMenuItems(restaurant.id);
                      }
                    }}>
                      <div className="restaurant-image-container">
                        <img 
                          src={restaurant.image_url || getRestaurantImage()} 
                          alt={restaurant.name}
                          className="restaurant-image"
                          onError={(e) => {
                            e.target.src = getRestaurantImage();
                          }}
                        />
                        {!restaurant.is_open && (
                          <div className="closed-overlay">
                            <span>Fermé</span>
                          </div>
                        )}
                      </div>
                      <div className="restaurant-info">
                        <div className="restaurant-main">
                          <h3 className="restaurant-name">{restaurant.name}</h3>
                          <div className="restaurant-rating">
                            <span className="rating-icon">👍</span>
                            <span className="rating-value">{rating}%</span>
                          </div>
                        </div>
                        <p className="restaurant-tags">{restaurant.description || 'Restaurant'}</p>
                        <div className="restaurant-footer">
                          <div className="delivery-info">
                            <span className="delivery-icon">🛵</span>
                            <span className="delivery-time">{deliveryTime} min</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomeView;
