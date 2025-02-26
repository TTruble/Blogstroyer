
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import '../components/ShopPage.scss';

const API_URL = "http://localhost/Blogstroyer/backend/api.php";

const ShopPage = () => {
  const [shopItems, setShopItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userPoints, setUserPoints] = useState(0);
  const [purchaseStatus, setPurchaseStatus] = useState({ show: false, message: '', isError: false });
  const navigate = useNavigate();
  
  const user = JSON.parse(localStorage.getItem('user'));
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    setUserPoints(user.points);
    fetchShopItems();
  }, []);
  
  const fetchShopItems = async () => {
    try {
      setLoading(true);
      const response = await axios.post(API_URL, {
        action: 'getShopItems'
      });
      
      if (response.data.success) {
        setShopItems(response.data.items);
      } else {
        setError('Failed to fetch shop items');
      }
    } catch (error) {
      setError('An error occurred while fetching shop items');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePurchase = async (itemId, price) => {
    if (userPoints < price) {
      setPurchaseStatus({
        show: true,
        message: 'Not enough points to purchase this item',
        isError: true
      });
      setTimeout(() => setPurchaseStatus({ show: false, message: '', isError: false }), 3000);
      return;
    }
    
    try {
      const response = await axios.post(API_URL, {
        action: 'purchaseItem',
        userId: user.id,
        itemId: itemId
      });
      
      if (response.data.success) {
        // Update local user points
        setUserPoints(response.data.newPoints);
        const updatedUser = { ...user, points: response.data.newPoints };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        setPurchaseStatus({
          show: true,
          message: 'Item purchased successfully! Check your inventory.',
          isError: false
        });
        setTimeout(() => setPurchaseStatus({ show: false, message: '', isError: false }), 3000);
      } else {
        setPurchaseStatus({
          show: true,
          message: response.data.error || 'Failed to purchase item',
          isError: true
        });
        setTimeout(() => setPurchaseStatus({ show: false, message: '', isError: false }), 3000);
      }
    } catch (error) {
      setPurchaseStatus({
        show: true,
        message: 'An error occurred during purchase',
        isError: true
      });
      setTimeout(() => setPurchaseStatus({ show: false, message: '', isError: false }), 3000);
    }
  };
  
  const renderThemePreview = (themeData) => {
    try {
      const data = typeof themeData === 'string' ? JSON.parse(themeData) : themeData;
      
      return (
        <div className="theme-preview" style={{ 
          backgroundColor: data.backgroundColor,
          color: data.textColor,
          border: `2px solid ${data.accentColor}`
        }}>
          <div className="preview-header" style={{ borderBottom: `1px solid ${data.accentColor}` }}>
            Preview
          </div>
          <div className="preview-content">
            <div className="preview-title">Sample Post</div>
            <div className="preview-text">This is how your theme will look</div>
            <div className="preview-button" style={{ backgroundColor: data.accentColor }}>
              Button
            </div>
          </div>
        </div>
      );
    } catch (e) {
      return <div className="theme-preview-error">Preview not available</div>;
    }
  };
  
  if (loading) {
    return (
      <div className="shop-container loading">
        <p>Loading shop items...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="shop-container error">
        <p>{error}</p>
        <button onClick={fetchShopItems}>Try Again</button>
      </div>
    );
  }
  
  return (
    <div className="shop-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="shop-header"
      >
        <h1>Shop</h1>
        <div className="user-points">
          <span>Your Points:</span>
          <span className="points-value">{userPoints}</span>
        </div>
      </motion.div>
      
      {purchaseStatus.show && (
        <div className={`purchase-status ${purchaseStatus.isError ? 'error' : 'success'}`}>
          {purchaseStatus.message}
        </div>
      )}
      
      <div className="shop-tabs">
        <button className="tab active">Themes</button>
        {/* Add more tabs in the future if needed */}
      </div>
      
      <div className="shop-items-grid">
      {shopItems.map((item) => (
          <motion.div
            key={item.id}
            className="shop-item"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h3>{item.name}</h3>
            <p className="item-description">{item.description}</p>
            
            {item.type === 'theme' && renderThemePreview(item.data)}
            
            <div className="item-footer">
              <div className="item-price">
                <span>{item.price}</span>
                <span className="points-label">points</span>
              </div>
              <motion.button
                className="purchase-button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePurchase(item.id, item.price)}
                disabled={userPoints < item.price}
              >
                {userPoints < item.price ? 'Not Enough Points' : 'Purchase'}
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="shop-navigation">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/inventory')}
          className="inventory-button"
        >
          Go to Inventory
        </motion.button>
      </div>
    </div>
  );
};

export default ShopPage;

          
