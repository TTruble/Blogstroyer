// src/pages/InventoryPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import '../components/InventoryPage.scss';

const API_URL = "http://localhost/Blogstroyer/backend/api.php";

const InventoryPage = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState({ show: false, message: '', isError: false });
  const navigate = useNavigate();
  
  const user = JSON.parse(localStorage.getItem('user'));
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchInventory();
  }, []);
  
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await axios.post(API_URL, {
        action: 'getUserInventory',
        userId: user.id
      });
      
      if (response.data.success) {
        setInventory(response.data.inventory);
      } else {
        setError('Failed to fetch inventory');
      }
    } catch (error) {
      setError('An error occurred while fetching inventory');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEquip = async (inventoryId) => {
    try {
      const response = await axios.post(API_URL, {
        action: 'equipItem',
        userId: user.id,
        inventoryId: inventoryId
      });
      
      if (response.data.success) {
        // Update local inventory state to reflect changes
        setInventory(prevInventory => 
          prevInventory.map(item => ({
            ...item,
            equipped: item.id === inventoryId ? true : 
                     (item.type === inventory.find(i => i.id === inventoryId)?.type ? false : item.equipped)
          }))
        );
        
        // Apply theme if it's a theme item
        const equippedItem = inventory.find(item => item.id === inventoryId);
        if (equippedItem && equippedItem.type === 'theme') {
          applyTheme(equippedItem.data);
        }
        
        setStatusMessage({
          show: true,
          message: 'Item equipped successfully!',
          isError: false
        });
        setTimeout(() => setStatusMessage({ show: false, message: '', isError: false }), 3000);
      } else {
        setStatusMessage({
          show: true,
          message: response.data.error || 'Failed to equip item',
          isError: true
        });
        setTimeout(() => setStatusMessage({ show: false, message: '', isError: false }), 3000);
      }
    } catch (error) {
      setStatusMessage({
        show: true,
        message: 'An error occurred while equipping item',
        isError: true
      });
      setTimeout(() => setStatusMessage({ show: false, message: '', isError: false }), 3000);
    }
  };
  
  const handleUnequip = async (inventoryId) => {
    try {
      const response = await axios.post(API_URL, {
        action: 'unequipItem',
        userId: user.id,
        inventoryId: inventoryId
      });
      
      if (response.data.success) {
        // Update local inventory state to reflect changes
        setInventory(prevInventory => 
          prevInventory.map(item => ({
            ...item,
            equipped: item.id === inventoryId ? false : item.equipped
          }))
        );
        
        // Remove theme if it's a theme item
        const unequippedItem = inventory.find(item => item.id === inventoryId);
        if (unequippedItem && unequippedItem.type === 'theme') {
          removeTheme();
        }
        
        setStatusMessage({
          show: true,
          message: 'Item unequipped successfully!',
          isError: false
        });
        setTimeout(() => setStatusMessage({ show: false, message: '', isError: false }), 3000);
      } else {
        setStatusMessage({
          show: true,
          message: response.data.error || 'Failed to unequip item',
          isError: true
        });
        setTimeout(() => setStatusMessage({ show: false, message: '', isError: false }), 3000);
      }
    } catch (error) {
      setStatusMessage({
        show: true,
        message: 'An error occurred while unequipping item',
        isError: true
      });
      setTimeout(() => setStatusMessage({ show: false, message: '', isError: false }), 3000);
    }
  };
  
  const applyTheme = (themeData) => {
    try {
      const data = typeof themeData === 'string' ? JSON.parse(themeData) : themeData;
      
      // Store the theme in localStorage
      localStorage.setItem('blogstroyer-theme', JSON.stringify(data));
      
      // Helper function to lighten a color
      const lightenColor = (color, percent) => {
        // Convert hex to RGB
        let r, g, b;
        if (color.startsWith('#')) {
          const hex = color.substring(1);
          r = parseInt(hex.substr(0, 2), 16);
          g = parseInt(hex.substr(2, 2), 16);
          b = parseInt(hex.substr(4, 2), 16);
        } else if (color.startsWith('rgb')) {
          // Extract RGB values from rgb/rgba string
          const rgbValues = color.match(/\d+/g);
          if (rgbValues && rgbValues.length >= 3) {
            r = parseInt(rgbValues[0]);
            g = parseInt(rgbValues[1]);
            b = parseInt(rgbValues[2]);
          } else {
            return color; // Return original if can't parse
          }
        } else {
          return color; // Return original if not hex or rgb
        }
        
        // Lighten
        r = Math.min(255, Math.floor(r * (1 + percent / 100)));
        g = Math.min(255, Math.floor(g * (1 + percent / 100)));
        b = Math.min(255, Math.floor(b * (1 + percent / 100)));
        
        // Convert back to hex
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      };
      
      // Calculate card background (slightly lighter than background)
      const cardBackground = data.cardBackground || lightenColor(data.backgroundColor, 15);
      const cardHoverBackground = lightenColor(cardBackground, 10);
      
      // Apply theme to document
      document.documentElement.style.setProperty('--background-color', data.backgroundColor);
      document.documentElement.style.setProperty('--text-color', data.textColor);
      document.documentElement.style.setProperty('--accent-color', data.accentColor);
      
      // Add these new variables
      document.documentElement.style.setProperty('--card-background', cardBackground);
      document.documentElement.style.setProperty('--card-hover-background', cardHoverBackground);
      document.documentElement.style.setProperty('--card-border', data.cardBorder || 'rgba(255, 255, 255, 0.1)');
      document.documentElement.style.setProperty('--header-background', data.headerBackground || 'rgba(0, 0, 0, 0.3)');
      document.documentElement.style.setProperty('--leaderboard-background', data.leaderboardBackground || cardBackground);
      document.documentElement.style.setProperty('--leaderboard-header', data.leaderboardHeader || data.backgroundColor);
      
      // Apply to body directly as well for better coverage
      document.body.style.backgroundColor = data.backgroundColor;
      document.body.style.color = data.textColor;
    } catch (e) {
      console.error('Error applying theme:', e);
    }
  };
  
  
        const removeTheme = () => {
            // Remove theme from localStorage
            localStorage.removeItem('blogstroyer-theme');
            
            // Reset to default theme
            document.documentElement.style.setProperty('--background-color', '#1a1a1a');
            document.documentElement.style.setProperty('--text-color', '#ffffff');
            document.documentElement.style.setProperty('--accent-color', '#4CAF50');
            
            // Reset additional variables
            document.documentElement.style.setProperty('--card-background', '#333333');
            document.documentElement.style.setProperty('--card-hover-background', '#3a3a3a');
            document.documentElement.style.setProperty('--card-border', 'rgba(255, 255, 255, 0.1)');
            document.documentElement.style.setProperty('--header-background', 'rgba(0, 0, 0, 0.3)');
            document.documentElement.style.setProperty('--leaderboard-background', 'rgb(41, 41, 42)');
            document.documentElement.style.setProperty('--leaderboard-header', 'rgb(22, 24, 27)');
            
            // Reset body directly as well
            document.body.style.backgroundColor = '#1a1a1a';
            document.body.style.color = '#ffffff';
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
      <div className="inventory-container loading">
        <p>Loading your inventory...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="inventory-container error">
        <p>{error}</p>
        <button onClick={fetchInventory}>Try Again</button>
      </div>
    );
  }
  
  return (
    <div className="inventory-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="inventory-header"
      >
        <h1>Your Inventory</h1>
      </motion.div>
      
      {statusMessage.show && (
        <div className={`status-message ${statusMessage.isError ? 'error' : 'success'}`}>
          {statusMessage.message}
        </div>
      )}
      
      {inventory.length === 0 ? (
        <div className="empty-inventory">
          <p>Your inventory is empty. Visit the shop to purchase items!</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/shop')}
            className="shop-button"
          >
            Go to Shop
          </motion.button>
        </div>
      ) : (
        <>
          <div className="inventory-tabs">
            <button className="tab active">All Items</button>
            {/* Add more tabs in the future if needed */}
          </div>
          
          <div className="inventory-items-grid">
            {inventory.map((item) => (
              <motion.div
                key={item.id}
                className={`inventory-item ${item.equipped ? 'equipped' : ''}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {item.equipped && (
                  <div className="equipped-badge">Equipped</div>
                )}
                
                <h3>{item.name}</h3>
                <p className="item-description">{item.description}</p>
                
                {item.type === 'theme' && renderThemePreview(item.data)}
                
                <div className="item-footer">
                  {item.equipped ? (
                    <motion.button
                      className="unequip-button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleUnequip(item.id)}
                    >
                      Unequip
                    </motion.button>
                  ) : (
                    <motion.button
                      className="equip-button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleEquip(item.id)}
                    >
                      Equip
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="inventory-navigation">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/shop')}
              className="shop-button"
            >
              Back to Shop
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
};

export default InventoryPage;
