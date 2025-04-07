import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { ExplosionParticle, PostFragment } from "../components/Particles";
import { Bullet, Spaceship, EnemyBullet } from "../components/Game";
import "../components/DestructionPage.scss";
import { useLocation, useNavigate } from "react-router-dom";
import { API_URL } from "../apiurl";

const pageVariants = {
  initial: {
    opacity: 0,
    y: "10vh",
  },
  in: {
    opacity: 1,
    y: "0",
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },
  out: {
    opacity: 0,
    y: "10vh",
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
};

export default function DestructionPage() {
  const location = useLocation();
  const audioContextRef = useRef(null);
  const explosionBufferRef = useRef(null);
  const laserBufferRef = useRef(null);

  const navigate = useNavigate();
  const [posts, setPosts] = useState(location.state?.posts || []);
  const [spaceshipPosition, setSpaceshipPosition] = useState(
    window.innerWidth / 2
  );
  const [bullets, setBullets] = useState([]);
  const [enemyBullets, setEnemyBullets] = useState([]);
  const [destroyedPosts, setDestroyedPosts] = useState([]);
  const [points, setPoints] = useState(0);
  const [gameScore, setGameScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [lives, setLives] = useState(3);
  const [isHit, setIsHit] = useState(false);
  const spaceshipRef = useRef(null);
  const user = JSON.parse(localStorage.getItem("user"));
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const bulletSpeed = 300;
  const enemyBulletSpeed = 200;
  const [equippedSpaceship, setEquippedSpaceship] = useState("default");
  const [bulletColor, setBulletColor] = useState("yellow");
  const [canShoot, setCanShoot] = useState(true);
  const [postGrid, setPostGrid] = useState([]);
  const [processingPosts, setProcessingPosts] = useState([]);
  const [keysPressed, setKeysPressed] = useState({});

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
      fetchEquippedSpaceship();
    }

    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current = new AudioContext();

    const loadSound = async (url, bufferRef) => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const decodedBuffer = await audioContextRef.current.decodeAudioData(
          arrayBuffer
        );
        bufferRef.current = decodedBuffer;
      } catch (error) {
        console.error("Error loading sound:", error);
      }
    };

    loadSound("/explosion.mp3", explosionBufferRef);
    loadSound("/Lazer.mp3", laserBufferRef);
  }, []);

  const playSound = (buffer) => {
    if (!audioContextRef.current || !buffer) return;
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.start(0);
  };

  const fetchEquippedSpaceship = async () => {
    try {
      const response = await axios.post(API_URL, {
        action: "getUserInventory",
        userId: user.id,
      });

      if (response.data.success) {
        const inventory = response.data.inventory;
        const equippedItem = inventory.find(
          (item) => item.type === "spaceship" && item.equipped
        );

        if (equippedItem) {
          try {
            const spaceshipData = JSON.parse(equippedItem.data);
            setEquippedSpaceship(spaceshipData);

            if (spaceshipData.cannonColor) {
              setBulletColor(spaceshipData.cannonColor);
            }
          } catch (e) {
            console.error("Error parsing spaceship data:", e);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching equipped spaceship:", error);
    }
  };

  const gameStateRef = useRef({
    bullets: [],
    enemyBullets: [],
    lastUpdateTime: Date.now(),
  });

  useEffect(() => {
    if (gameOver) return;

    gameStateRef.current = {
      bullets: bullets,
      enemyBullets: enemyBullets,
      lastUpdateTime: Date.now(),
    };

    let animationFrameId;

    const gameLoop = () => {
      const currentTime = Date.now();
      const deltaTime =
        (currentTime - gameStateRef.current.lastUpdateTime) / 1000;
      gameStateRef.current.lastUpdateTime = currentTime;

      gameStateRef.current.bullets = gameStateRef.current.bullets
        .map((bullet) => ({
          ...bullet,
          y: bullet.y - bulletSpeed * deltaTime,
        }))
        .filter((bullet) => bullet.y > 0);

      gameStateRef.current.enemyBullets = gameStateRef.current.enemyBullets
        .map((bullet) => ({
          ...bullet,
          y: bullet.y + enemyBulletSpeed * deltaTime,
        }))
        .filter((bullet) => bullet.y < window.innerHeight);

      handleCollisionsRef();

      setBullets([...gameStateRef.current.bullets]);
      setEnemyBullets([...gameStateRef.current.enemyBullets]);

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameOver, bulletSpeed, enemyBulletSpeed]);

  const handleKeyDown = useCallback(
    (e) => {
      if (gameOver) return;

      setKeysPressed((prev) => ({
        ...prev,
        [e.key]: true,
      }));

      if (e.key === " " && !keysPressed[" "] && canShoot) {
        e.preventDefault();

        if (
          audioContextRef.current &&
          audioContextRef.current.state === "suspended"
        ) {
          audioContextRef.current.resume().then(() => {
            playSound(laserBufferRef.current);
          });
        } else {
          playSound(laserBufferRef.current);
        }

        const spaceshipElement = spaceshipRef.current;
        if (spaceshipElement) {
          const rect = spaceshipElement.getBoundingClientRect();
          setBullets((prev) => [
            ...prev,
            {
              x: rect.left + rect.width / 2 - 2,
              y: rect.top - 10,
              id: Date.now(),
              color: bulletColor,
            },
          ]);
          setCanShoot(false);
          setTimeout(() => setCanShoot(true), 500);
        }
      }
    },
    [gameOver, canShoot, bulletColor, keysPressed]
  );

  const detectCollision = (bullet, spaceship) => {
    if (!spaceship) return false;
    const shipRect = spaceship.getBoundingClientRect();
    return (
      bullet.x >= shipRect.left &&
      bullet.x <= shipRect.right &&
      bullet.y >= shipRect.top &&
      bullet.y <= shipRect.bottom
    );
  };

  const handleCollisions = () => {
    const spaceshipElement = spaceshipRef.current;
    if (!spaceshipElement) return;

    gameStateRef.current.enemyBullets.forEach((bullet, index) => {
      if (detectCollision(bullet, spaceshipElement)) {
        gameStateRef.current.enemyBullets.splice(index, 1);
        setLives((prevLives) => {
          const newLives = prevLives - 1;
          if (newLives <= 0) {
            setGameOver(true);
          }
          return newLives;
        });
        createHitExplosion(bullet.x, bullet.y);
      }
    });
  };

  const handleKeyUp = useCallback(
    (e) => {
      if (gameOver) return;

      setKeysPressed((prev) => {
        const newState = { ...prev };
        delete newState[e.key];
        return newState;
      });

      if (e.key === "ArrowLeft") {
        setSpaceshipPosition((prev) => Math.max(0, prev - 20));
      } else if (e.key === "ArrowRight") {
        setSpaceshipPosition((prev) =>
          Math.min(window.innerWidth - 40, prev + 20)
        );
      }
    },
    [gameOver]
  );

  useEffect(() => {
    if (user) {
      setPoints(user.points);
    }

    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyUp, handleKeyDown]);

  useEffect(() => {
    if (gameOver) return;

    const enemyShootingInterval = setInterval(() => {
      const alivePosts = posts.filter(
        (post) => !destroyedPosts.includes(post.ID)
      );

      if (alivePosts.length > 0) {
        const randomIndex = Math.floor(Math.random() * alivePosts.length);
        const shootingPost = alivePosts[randomIndex];
        const postElement = document.getElementById(`post-${shootingPost.ID}`);

        if (postElement) {
          const rect = postElement.getBoundingClientRect();
          setEnemyBullets((prev) => [
            ...prev,
            {
              x: rect.left + rect.width / 2,
              y: rect.bottom,
              id: Date.now(),
            },
          ]);
        }
      }
    }, 1500);

    return () => clearInterval(enemyShootingInterval);
  }, [posts, destroyedPosts, gameOver]);

  useEffect(() => {
    if (gameOver) return;

    let animationFrameId;

    const gameLoop = () => {
      const currentTime = Date.now();
      const deltaTime = (currentTime - lastUpdateTime) / 1000;
      setLastUpdateTime(currentTime);

      setBullets((prevBullets) => {
        return prevBullets
          .map((bullet) => ({
            ...bullet,
            y: bullet.y - bulletSpeed * deltaTime,
          }))
          .filter((bullet) => bullet.y > 0);
      });

      setEnemyBullets((prevBullets) => {
        return prevBullets
          .map((bullet) => ({
            ...bullet,
            y: bullet.y + enemyBulletSpeed * deltaTime,
          }))
          .filter((bullet) => bullet.y < window.innerHeight);
      });

      const currentBullets = [...bullets];
      const bulletsToRemove = new Set();

      currentBullets.forEach((bullet) => {
        if (bulletsToRemove.has(bullet.id)) return;

        const hitPostIndex = posts.findIndex((post) => {
          if (
            destroyedPosts.includes(post.ID) ||
            processingPosts.includes(post.ID)
          )
            return false;

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
          console.log("Posthit AHAHAHAHAH", hitPost);

          setProcessingPosts((prev) => [...prev, hitPost.ID]);
          handleDelete(hitPost.ID);
          bulletsToRemove.add(bullet.id);
        }
      });

      if (bulletsToRemove.size > 0) {
        setBullets((prevBullets) =>
          prevBullets.filter((b) => !bulletsToRemove.has(b.id))
        );
      }

      const spaceshipElement = spaceshipRef.current;
      if (spaceshipElement) {
        setEnemyBullets((prevBullets) => {
          const remainingBullets = [];
          let playerHit = false;

          prevBullets.forEach((bullet) => {
            const shipRect = spaceshipElement.getBoundingClientRect();
            const bulletHit =
              bullet.x >= shipRect.left &&
              bullet.x <= shipRect.right &&
              bullet.y >= shipRect.top &&
              bullet.y <= shipRect.bottom;

            if (bulletHit) {
              playerHit = true;
              createHitExplosion(bullet.x, bullet.y);
            } else {
              remainingBullets.push(bullet);
            }
          });

          if (playerHit) {
            setIsHit(true);
            setTimeout(() => setIsHit(false), 300);

            setLives((prevLives) => {
              const newLives = prevLives - 1;
              if (newLives <= 0) {
                setGameOver(true);
              }
              return newLives;
            });
          }

          return remainingBullets;
        });
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    bullets,
    enemyBullets,
    posts,
    destroyedPosts,
    processingPosts,
    gameOver,
    lastUpdateTime,
    bulletSpeed,
    enemyBulletSpeed,
  ]);

  const createHitExplosion = (x, y) => {
    const explosionElement = document.createElement("div");
    explosionElement.className = "player-hit-explosion";
    explosionElement.style.position = "absolute";
    explosionElement.style.left = `${x - 20}px`;
    explosionElement.style.top = `${y - 20}px`;
    explosionElement.style.width = "40px";
    explosionElement.style.height = "40px";
    explosionElement.style.borderRadius = "50%";
    explosionElement.style.backgroundColor = "rgba(255, 100, 100, 0.8)";
    explosionElement.style.boxShadow = "0 0 15px #ff6666, 0 0 30px #ff0000";
    explosionElement.style.zIndex = "1000";
    explosionElement.style.pointerEvents = "none";

    document.body.appendChild(explosionElement);

    const animation = explosionElement.animate(
      [
        { opacity: 1, transform: "scale(0.3)" },
        { opacity: 0.8, transform: "scale(1.5)" },
        { opacity: 0, transform: "scale(2)" },
      ],
      {
        duration: 400,
        easing: "ease-out",
      }
    );

    animation.onfinish = () => {
      document.body.removeChild(explosionElement);
    };
  };

  const handleDelete = async (postId) => {
    console.log("pleasedelete");
    try {
      if (destroyedPosts.length >= Math.min(9, posts.length)) {
        console.log("Maximum destructions reached");
        setProcessingPosts((prev) => prev.filter((id) => id !== postId));
        return;
      }

      if (destroyedPosts.includes(postId)) {
        setProcessingPosts((prev) => prev.filter((id) => id !== postId));
        return;
      }

      const response = await axios.delete(
        `${API_URL}?ID=${postId}&userId=${user.id}&gameMode=true`
      );

      if (response.data.success) {
        console.log("Post deleted successfully");
        const explosionSound = document.getElementById("explosionSound");
        if (explosionSound) {
          explosionSound.currentTime = 0;
          explosionSound.play().catch((err) => {
            console.error("Unable to play explosion sound:", err);
          });
        }

        const updatedDestroyedPosts = [...destroyedPosts, postId];
        setDestroyedPosts(updatedDestroyedPosts);

        const newPoints = response.data.newPoints;
        setPoints(newPoints);
        const updatedUser = { ...user, points: newPoints };
        localStorage.setItem("user", JSON.stringify(updatedUser));

        const pointsPerPost = 100;
        setGameScore((prevScore) => prevScore + pointsPerPost);

        setTimeout(() => {
          const postElement = document.getElementById(`post-${postId}`);
          if (postElement) {
            postElement.style.visibility = "hidden";
          }
          setProcessingPosts((prev) => prev.filter((id) => id !== postId));
        }, 1000);

        if (updatedDestroyedPosts.length >= Math.min(9, posts.length)) {
          setTimeout(() => {
            setGameOver(true);
          }, 1000);
        }
      } else {
        setProcessingPosts((prev) => prev.filter((id) => id !== postId));
        console.log(response);
      }
    } catch (error) {
      console.error("Error updating destruction count:", error);
      setProcessingPosts((prev) => prev.filter((id) => id !== postId));
    }
  };

  const particleCount = destroyedPosts.length > 3 ? 10 : 15;
  const getRandomColor = () => {
    const colors = ["#FFFF00", "#FFA500", "#FF4500", "#FF0000"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const renderPostGrid = () => {
    if (postGrid.length === 0) return null;

    return postGrid.map((row, rowIndex) => (
      <div
        key={rowIndex}
        className="post-row"
        style={{ display: "flex", justifyContent: "center" }}
      >
        {row.map((post) => (
          <motion.div
            key={post.ID}
            id={`post-${post.ID}`}
            className={`post-card ${
              destroyedPosts.includes(post.ID) ? "exploding" : ""
            }`}
            style={{
              margin: "10px",
              width: "150px",
              height: "100px",
              position: "relative",
              overflow: "visible",
              backgroundColor: "#333",
              borderRadius: "8px",
              padding: "10px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <h2
              style={{
                fontSize: "14px",
                margin: "0",
                color: "white",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {post.title}
            </h2>
            <div
              style={{
                fontSize: "12px",
                color: "#aaa",
                marginTop: "5px",
              }}
            >
              By: {post.username}
            </div>  
            <AnimatePresence>
              {destroyedPosts.includes(post.ID) && (
                <motion.div
                  key={`explosion-${post.ID}`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                  }}
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                >
                  {[...Array(particleCount)].map((_, i) => (
                    <ExplosionParticle
                      key={i}
                      top={`${Math.random() * 100 - 15}%`}
                      left={`${Math.random() * 100 - 15}%`}
                      size={`${Math.random() * 10 + 5}px`}
                      color={getRandomColor()}
                    />
                  ))}
                  {[...Array(10)].map((_, i) => (
                    <PostFragment
                      key={i}
                      top={`${Math.random() * 100 - 15}%`}
                      left={`${Math.random() * 100 - 15}%`}
                      width={`${Math.random() * 30 + 10}%`}
                      height={`${Math.random() * 30 + 10}%`}
                      backgroundImage={`linear-gradient(${
                        Math.random() * 360
                      }deg, #333333, #555555)`}
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
    setGameOver(false);
    setLives(3);
    setDestroyedPosts([]);
    setBullets([]);
    setEnemyBullets([]);
    setIsHit(false);
    setGameScore(0);
    setProcessingPosts([]);
    setCanShoot(true);

    posts.forEach((post) => {
      const postElement = document.getElementById(`post-${post.ID}`);
      if (postElement) {
        postElement.style.visibility = "visible";
      }
    });
  };

  const exitGame = () => {
    navigate("/");
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
      className="destruction-mode"
      style={{
        height: "calc(100vh - 60px)",
        overflow: "hidden",
        paddingTop: "60px",
        background: "#1a1a1a",
      }}
    >
      <audio id="explosionSound" src="/explosion.mp3" preload="auto" />
      <audio id="lazerSound" src="/Lazer.mp3" preload="auto" />
      {!gameOver ? (
        <>
          <div
            className="scores-container"
            style={{
              position: "fixed",
              top: "70px",
              right: "20px",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              className="points-display"
              style={{
                backgroundColor: "#333",
                padding: "10px",
                borderRadius: "5px",
                color: "#4CAF50",
                fontWeight: "bold",
              }}
            >
              Total Points: {points}
            </div>
            <div
              className="game-score-display"
              style={{
                backgroundColor: "#333",
                padding: "10px",
                borderRadius: "5px",
                color: "#FFA500",
                fontWeight: "bold",
                boxShadow: "0 0 5px rgba(255, 165, 0, 0.3)",
              }}
            >
              Game Score: {gameScore}
            </div>
          </div>
          <div
            className="lives-display"
            style={{
              position: "fixed",
              top: "70px",
              left: "150px",
              backgroundColor: "#333",
              padding: "10px",
              borderRadius: "5px",
              zIndex: 1000,
              color: "#ff4444",
              fontWeight: "bold",
            }}
          >
            Lives: {lives}
          </div>
          <div
            className="game-instructions"
            style={{
              position: "fixed",
              top: "70px",
              left: "20px",
              backgroundColor: "#333",
              padding: "10px",
              borderRadius: "5px",
              zIndex: 1000,
              color: "white",
              fontSize: "14px",
            }}
          >
            <p>Use ← → to move</p>
            <p>Space to shoot</p>
          </div>
          <div className="posts-container">{renderPostGrid()}</div>

          <Spaceship
            position={spaceshipPosition}
            ref={spaceshipRef}
            isHit={isHit}
            design={equippedSpaceship}
          />

          {!canShoot && (
            <div
              style={{
                position: "fixed",
                bottom: "70px",
                left: spaceshipPosition,
                width: "40px",
                height: "3px",
                backgroundColor: "#333",
                borderRadius: "2px",
                transform: "translateX(0)",
                zIndex: 100,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: "100%",
                  backgroundColor: "#ff4444",
                  borderRadius: "2px",
                  animation: "cooldown 0.5s linear forwards",
                }}
              />
            </div>
          )}

          {bullets.map((bullet) => (
            <Bullet
              key={bullet.id}
              position={bullet}
              color={bullet.color || bulletColor}
            />
          ))}
          {enemyBullets.map((bullet) => (
            <EnemyBullet key={bullet.id} position={bullet} />
          ))}
        </>
      ) : (
        <div
          className="game-over-screen"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
            color: "white",
          }}
        >
          <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>
            {lives <= 0 ? "GAME OVER" : "VICTORY!"}
          </h1>
          <p style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
            {lives <= 0
              ? "Your spaceship was destroyed!"
              : "You destroyed all the posts!"}
          </p>
          <p
            style={{
              fontSize: "1.5rem",
              color: "#FFA500",
              marginBottom: "1rem",
            }}
          >
            Game Score: {gameScore}
          </p>
          <p
            style={{
              fontSize: "1.2rem",
              color: "#4CAF50",
              marginBottom: "2rem",
            }}
          >
            Total Account Points: {points}
          </p>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={restartGame}
              style={{
                backgroundColor: "#4CAF50",
                color: "white",
                padding: "1rem 2rem",
                border: "none",
                borderRadius: "5px",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              Play Again
            </button>
            <button
              onClick={exitGame}
              style={{
                backgroundColor: "#ff4444",
                color: "white",
                padding: "1rem 2rem",
                border: "none",
                borderRadius: "5px",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              Exit
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
