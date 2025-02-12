import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { ExplosionParticle, PostFragment } from "../components/Particles";
import { Bullet, Spaceship } from "../components/Game";
import '../components/DestructionPage.scss';
import { useLocation } from "react-router-dom";

const API_URL = "http://localhost/Blogstroyer/backend/api.php";

export default function DestructionPage() {
  const location = useLocation();
  const [posts, setPosts] = useState(location.state?.posts || []);
  const [spaceshipPosition, setSpaceshipPosition] = useState(window.innerWidth / 2);
  const [bullets, setBullets] = useState([]);
  const [destroyedPosts, setDestroyedPosts] = useState([]);
  const [points, setPoints] = useState(0);
  const spaceshipRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user'));
  
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
  }, []);

  useEffect(() => {
    const gameLoop = setInterval(() => {
      setBullets((prevBullets) => {
        return prevBullets
          .map((bullet) => ({ ...bullet, y: bullet.y - 5 }))
          .filter((bullet) => bullet.y > 0);
      });

      bullets.forEach((bullet) => {
        const hitPostIndex = posts.findIndex((post) => {
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
    }, 16);

    return () => clearInterval(gameLoop);
  }, [bullets, posts]);

  const handleDelete = async (postId) => {
    try {
      const response = await axios.delete(`${API_URL}?ID=${postId}&userId=${user.id}`);
      if (response.data.success) {
        setDestroyedPosts((prev) => [...prev, postId]);
        
        // Update local user points
        const newPoints = response.data.newPoints;
        setPoints(newPoints);
        const updatedUser = { ...user, points: newPoints };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Remove the post and explosion effect after animation
        setTimeout(() => {
          setPosts(prevPosts => prevPosts.filter(post => post.ID !== postId));
          setDestroyedPosts((prev) => prev.filter((id) => id !== postId));
        }, 1000);
      }
    } catch (error) {
      console.error("Error updating destruction count:", error);
    }
  };

  const getRandomColor = () => {
    const colors = ["#FFFF00", "#FFA500", "#FF4500", "#FF0000"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const renderPosts = () => {
    const rows = [];
    for (let i = 0; i < posts.length; i += 5) {
      const row = posts.slice(i, i + 5);
      rows.push(
        <div key={i} className="post-row" style={{ display: 'flex', justifyContent: 'center' }}>
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
      );
    }
    return rows;
  };
  
  return (
    <div className="destruction-mode" style={{ height: 'calc(100vh - 60px)', overflow: 'hidden', paddingTop: '60px', background: '#1a1a1a' }}>
      <div className="points-display" style={{ 
        position: 'fixed', 
        top: '70px', 
        right: '20px', 
        backgroundColor: '#333', 
        padding: '10px', 
        borderRadius: '5px',
        zIndex: 1000,
        color: '#4CAF50',
        fontWeight: 'bold'
      }}>
        Points: {points}
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
        {renderPosts()}
      </div>
      <Spaceship position={spaceshipPosition} ref={spaceshipRef} />
      {bullets.map((bullet) => (
        <Bullet key={bullet.id} position={bullet} />
      ))}
    </div>
  );
}