import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { ExplosionParticle, PostFragment } from "../components/Particles";
import { Bullet, Spaceship, EnemyBullet } from "../components/Game";
import '../components/DestructionPage.scss';
import { useLocation, useNavigate } from "react-router-dom";

const API_URL = "http://localhost/Blogstroyer/backend/api.php";

export default function DestructionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [posts, setPosts] = useState(location.state?.posts || []);
  const [spaceshipPosition, setSpaceshipPosition] = useState(window.innerWidth / 2);
  const [bullets, setBullets] = useState([]);
  const [enemyBullets, setEnemyBullets] = useState([]);
  const [destroyedPosts, setDestroyedPosts] = useState([]);
  const [points, setPoints] = useState(0);
  const [gameScore, setGameScore] = useState(0); // New state for game-specific score
  const [gameOver, setGameOver] = useState(false);
  const [lives, setLives] = useState(3);
  const [isHit, setIsHit] = useState(false);
  const spaceshipRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user'));
  
  // Create a grid structure on initial load
  const [postGrid, setPostGrid] = useState([]);
  
  // Initialize the grid structure once when posts are loaded
  useEffect(() => {
    if (posts.length > 0 && postGrid.length === 0) {
      const grid = [];
      const postsPerRow = 5;
      
      for (let i = 0; i < posts.length; i += postsPerRow) {
        const row = posts.slice(i, i + postsPerRow);
        grid.push(row);
      }
      
      setPostGrid(grid);
    }
  }, [posts]);
  
  useEffect(() => {
    if (user) {
      setPoints(user.points);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (gameOver) return;
    
    if (e.key === "ArrowLeft") {
      setSpaceshipPosition((prev) => Math.max(0, prev - 20));
    } else if (e.key === "ArrowRight") {
      setSpaceshipPosition((prev) => Math.min(window.innerWidth - 40, prev + 20));
    } else if (e.key === " ") {
      e.preventDefault();
      const spaceshipElement = spaceshipRef.current;
      if (spaceshipElement) {
        const rect = spaceshipElement.getBoundingClientRect();
        setBullets((prev) => [
          ...prev,
          {
            x: rect.left + rect.width / 2 - 2,
            y: rect.top - 10,
            id: Date.now()
          }
        ]);
      }
    }
  }, [gameOver]);

  // Handle enemy shooting
  useEffect(() => {
    if (gameOver) return;
    
    const enemyShootingInterval = setInterval(() => {
      // Only allow posts that aren't destroyed to shoot
      const alivePosts = posts.filter(post => !destroyedPosts.includes(post.ID));
      
      if (alivePosts.length > 0) {
        // Randomly select a post to shoot
        const randomIndex = Math.floor(Math.random() * alivePosts.length);
        const shootingPost = alivePosts[randomIndex];
        const postElement = document.getElementById(`post-${shootingPost.ID}`);
        
        if (postElement) {
          const rect = postElement.getBoundingClientRect();
          setEnemyBullets(prev => [
            ...prev,
            {
              x: rect.left + rect.width / 2,
              y: rect.bottom,
              id: Date.now()
            }
          ]);
        }
      }
    }, 1500); // Adjust timing for difficulty
    
    return () => clearInterval(enemyShootingInterval);
  }, [posts, destroyedPosts, gameOver]);

  useEffect(() => {
    if (gameOver) return;
    
    const gameLoop = setInterval(() => {
      // Update player bullets
      setBullets((prevBullets) => {
        return prevBullets
          .map((bullet) => ({ ...bullet, y: bullet.y - 5 }))
          .filter((bullet) => bullet.y > 0);
      });
      
      // Update enemy bullets
      setEnemyBullets((prevBullets) => {
        return prevBullets
          .map((bullet) => ({ ...bullet, y: bullet.y + 5 }))
          .filter((bullet) => bullet.y < window.innerHeight);
      });

      // Check for player bullets hitting posts
      bullets.forEach((bullet) => {
        const hitPostIndex = posts.findIndex((post) => {
          if (destroyedPosts.includes(post.ID)) return false;
          
          const postElement = document.getElementById(`post-${post.ID}`);
          if (postElement) {
            const rect = postElement.getBoundingClientRect();
            return (
              bullet.x >= rect.left &&
              bullet.x <= rect.right &&
              bullet.y <= rect.bottom &&
              bullet.y >= rect.top
            );
          }
          return false;
        });

        if (hitPostIndex !== -1) {
          const hitPost = posts[hitPostIndex];
          handleDelete(hitPost.ID);
          setBullets((prevBullets) => prevBullets.filter((b) => b.id !== bullet.id));
        }
      });
      
      // Check for enemy bullets hitting spaceship
      const spaceshipElement = spaceshipRef.current;
      if (spaceshipElement) {
        const spaceshipRect = spaceshipElement.getBoundingClientRect();
        
        enemyBullets.forEach((bullet) => {
          if (
            bullet.x >= spaceshipRect.left &&
            bullet.x <= spaceshipRect.right &&
            bullet.y >= spaceshipRect.top &&
            bullet.y <= spaceshipRect.bottom
          ) {
            // Hit detected - trigger hit effect
            setIsHit(true);
            setTimeout(() => setIsHit(false), 500); // Reset after animation completes
            
            // Create explosion effect at hit point
            createHitExplosion(bullet.x, bullet.y);
            
            setLives((prev) => {
              const newLives = prev - 1;
              if (newLives <= 0) {
                setGameOver(true);
              }
              return newLives;
            });
            
            // Remove the bullet
            setEnemyBullets((prevBullets) => 
              prevBullets.filter((b) => b.id !== bullet.id)
            );
          }
        });
      }
    }, 16);

    return () => clearInterval(gameLoop);
  }, [bullets, enemyBullets, posts, destroyedPosts, gameOver]);

  // Function to create explosion effect when player is hit
  const createHitExplosion = (x, y) => {
    const explosionElement = document.createElement('div');
    explosionElement.className = 'player-hit-explosion';
    explosionElement.style.position = 'absolute';
    explosionElement.style.left = `${x - 15}px`;
    explosionElement.style.top = `${y - 15}px`;
    explosionElement.style.width = '30px';
    explosionElement.style.height = '30px';
    explosionElement.style.borderRadius = '50%';
    explosionElement.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    explosionElement.style.boxShadow = '0 0 10px #ffffff, 0 0 20px #ff6666';
    explosionElement.style.zIndex = '1000';
    explosionElement.style.pointerEvents = 'none';
    
    document.body.appendChild(explosionElement);
    
    // Animate explosion
    const animation = explosionElement.animate([
      { opacity: 1, transform: 'scale(0.3)' },
      { opacity: 0.8, transform: 'scale(1.5)' },
      { opacity: 0, transform: 'scale(2)' }
    ], {
      duration: 400,
      easing: 'ease-out'
    });
    
    animation.onfinish = () => {
      document.body.removeChild(explosionElement);
    };
  };

  const handleDelete = async (postId) => {
    try {
      const response = await axios.delete(`${API_URL}?ID=${postId}&userId=${user.id}`);
      if (response.data.success) {
        // Add the destroyed post to our array
        const updatedDestroyedPosts = [...destroyedPosts, postId];
        setDestroyedPosts(updatedDestroyedPosts);
        
        // Update local user points
        const newPoints = response.data.newPoints;
        setPoints(newPoints);
        const updatedUser = { ...user, points: newPoints };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Update game-specific score - add points for destroying a post
        const pointsPerPost = 100; // Points awarded per post destroyed
        setGameScore(prevScore => prevScore + pointsPerPost);
        
        // Set a timeout to only visually remove the post from the grid
        setTimeout(() => {
          // Instead of modifying the posts array, we'll just update the visual state
          const postElement = document.getElementById(`post-${postId}`);
          if (postElement) {
            postElement.style.visibility = 'hidden';
          }
        }, 1000);
        
        // Check if all posts are destroyed - FIXED: Compare the updated array length with posts length
        if (updatedDestroyedPosts.length >= posts.length) {
          // Victory condition
          setTimeout(() => {
            setGameOver(true);
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Error updating destruction count:", error);
    }
  };

  const getRandomColor = () => {
    const colors = ["#FFFF00", "#FFA500", "#FF4500", "#FF0000"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const renderPostGrid = () => {
    if (postGrid.length === 0) return null;
    
    return postGrid.map((row, rowIndex) => (
      <div key={rowIndex} className="post-row" style={{ display: 'flex', justifyContent: 'center' }}>
        {row.map((post) => (
          <motion.div
            key={post.ID}
            id={`post-${post.ID}`}
            className={`post-card ${destroyedPosts.includes(post.ID) ? "exploding" : ""}`}
            style={{ 
              margin: '10px', 
              width: '150px', 
              height: '100px',
              position: 'relative',
              overflow: 'visible',
              backgroundColor: '#333',
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <h2 style={{ 
              fontSize: '14px',
              margin: '0',
              color: 'white',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {post.title}
            </h2>
            <div style={{
              fontSize: '12px',
              color: '#aaa',
              marginTop: '5px'
            }}>
              By: {post.username}
            </div>
            <AnimatePresence>
              {destroyedPosts.includes(post.ID) && (
                <motion.div
                  key={`explosion-${post.ID}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                  }}
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                >
                  {[...Array(50)].map((_, i) => (
                    <ExplosionParticle
                      key={i}
                      top={`${Math.random()* 200 - 50}%`}
                      left={`${Math.random() * 200 - 50}%`}
                      size={`${Math.random() * 10 + 5}px`}
                      color={getRandomColor()}
                    />
                  ))}
                  {[...Array(10)].map((_, i) => (
                    <PostFragment
                      key={i}
                      top={`${Math.random() * 200 - 50}%`}
                      left={`${Math.random() * 200 - 50}%`}
                      width={`${Math.random() * 30 + 20}%`}
                      height={`${Math.random() * 30 + 20}%`}
                      backgroundImage={`linear-gradient(${Math.random() * 360}deg, #333333, #555555)`}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    ));
  };
  
  const restartGame = () => {
    // Reset game state
    setGameOver(false);
    setLives(3);
    setDestroyedPosts([]);
    setBullets([]);
    setEnemyBullets([]);
    setIsHit(false);
    setGameScore(0); // Reset game-specific score
    
    // Reset visual state of posts
    posts.forEach(post => {
      const postElement = document.getElementById(`post-${post.ID}`);
      if (postElement) {
        postElement.style.visibility = 'visible';
      }
    });
  };
  
  const exitGame = () => {
    navigate('/'); // Navigate back to homepage or wherever appropriate
  };
  
  return (
    <div className="destruction-mode" style={{ height: 'calc(100vh - 60px)', overflow: 'hidden', paddingTop: '60px', background: '#1a1a1a' }}>
      {!gameOver ? (
        <>
          <div className="scores-container" style={{
            position: 'fixed',
            top: '70px',
            right: '20px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div className="points-display" style={{ 
              backgroundColor: '#333', 
              padding: '10px', 
              borderRadius: '5px',
              color: '#4CAF50',
              fontWeight: 'bold'
            }}>
              Total Points: {points}
            </div>
            <div className="game-score-display" style={{ 
              backgroundColor: '#333', 
              padding: '10px', 
              borderRadius: '5px',
              color: '#FFA500',
              fontWeight: 'bold',
              boxShadow: '0 0 5px rgba(255, 165, 0, 0.3)'
            }}>
              Game Score: {gameScore}
            </div>
          </div>
          <div className="lives-display" style={{ 
            position: 'fixed', 
            top: '70px', 
            left: '150px', 
            backgroundColor: '#333', 
            padding: '10px', 
            borderRadius: '5px',
            zIndex: 1000,
            color: '#ff4444',
            fontWeight: 'bold'
          }}>
             Lives: {lives}
          </div>
          <div className="game-instructions" style={{
            position: 'fixed',
            top: '70px',
            left: '20px',
            backgroundColor: '#333',
            padding: '10px',
            borderRadius: '5px',
            zIndex: 1000,
            color: 'white',
            fontSize: '14px'
          }}>
            <p>Use ← → to move</p>
            <p>Space to shoot</p>
          </div>
          <div className="posts-container">
            {renderPostGrid()}
          </div>
          <Spaceship position={spaceshipPosition} ref={spaceshipRef} isHit={isHit} />
          {bullets.map((bullet) => (
            <Bullet key={bullet.id} position={bullet} />
          ))}
          {enemyBullets.map((bullet) => (
            <EnemyBullet key={bullet.id} position={bullet} />
          ))}
        </>
      ) : (
        <div className="game-over-screen" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
          color: 'white'
        }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            {lives <= 0 ? 'GAME OVER' : 'VICTORY!'}
          </h1>
          <p style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            {lives <= 0 
              ? 'Your spaceship was destroyed!' 
              : 'You destroyed all the posts!'
            }
          </p>
          <p style={{ fontSize: '1.5rem', color: '#FFA500', marginBottom: '1rem' }}>
            Game Score: {gameScore}
          </p>
          <p style={{ fontSize: '1.2rem', color: '#4CAF50', marginBottom: '2rem' }}>
            Total Account Points: {points}
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={restartGame}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                padding: '1rem 2rem',
                border: 'none',
                borderRadius: '5px',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Play Again
            </button>
            <button 
              onClick={exitGame}
              style={{
                backgroundColor: '#ff4444',
                color: 'white',
                padding: '1rem 2rem',
                border: 'none',
                borderRadius: '5px',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Exit
              </button>
          </div>
        </div>
      )}
    </div>
  );
}