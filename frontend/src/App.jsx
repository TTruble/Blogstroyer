import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import "./index.css";
import { ExplosionParticle, PostFragment } from "./components/Particles";
import { Bullet, Spaceship } from "./components/Game";

const API_URL = "http://localhost/Blogstroyer/backend/api.php";

function App() {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState("");
  const [contents, setContents] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [isDestructionMode, setIsDestructionMode] = useState(false);
  const [spaceshipPosition, setSpaceshipPosition] = useState(
    window.innerWidth / 2
  );
  const [bullets, setBullets] = useState([]);


  useEffect(() => {
    fetchPosts();
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const fetchPosts = async () => {
    const response = await axios.get(API_URL);
    setPosts(response.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(API_URL, { title, contents });
      setTitle("");
      setContents("");
      setIsCreating(false);
      fetchPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      setError("Error creating post. Please try again.");
    }
  };

  const handlePostClick = (post) => {
    setSelectedPost(post);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setTitle(selectedPost.title);
    setContents(selectedPost.contents);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(API_URL, {
        ID: selectedPost.ID,
        title: title,
        contents: contents,
      });
      setIsEditing(false);
      fetchPosts();
      setSelectedPost({ ...selectedPost, title: title, contents: contents });
    } catch (error) {
      console.error("Error updating post:", error);
      setError("Error updating post. Please try again.");
    }
  };

  const handleDelete = async (postId) => {
    setDeletingId(postId);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await axios.delete(`${API_URL}?ID=${postId}`);
      setSelectedPost(null);
      setPosts(posts.filter((post) => post.ID !== postId));
    } catch (error) {
      console.error("Error deleting post:", error);
      setError("Error deleting post. Please try again.");
    } finally {
      setTimeout(() => setDeletingId(null), 1000);
    }
  };

  const getRandomColor = () => {
    const colors = ["#FFFF00", "#FFA500", "#FF4500", "#FF0000"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleStartDestruction = () => {
    setIsDestructionMode(true);
    setSelectedPost(null);
  };
  
  const handleKeyDown = useCallback(
    (e) => {
      if (isDestructionMode) {
        if (e.key === "ArrowLeft") {
          setSpaceshipPosition((prev) => Math.max(0, prev - 20));
        } else if (e.key === "ArrowRight") {
          setSpaceshipPosition((prev) =>
            Math.min(window.innerWidth - 40, prev + 20)
          );
        } else if (e.key === "b" || e.key === "B") {
          setBullets((prev) => [...prev, { x: spaceshipPosition + 18, y: window.innerHeight - 60, id: Date.now() }]);
        }
      }
    },
    [isDestructionMode, spaceshipPosition]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    if (isDestructionMode) {
      const gameLoop = setInterval(() => {
        setBullets((prevBullets) => {
          return prevBullets
            .map((bullet) => ({ ...bullet, y: bullet.y - 5 }))
            .filter((bullet) => bullet.y > 0);
        });

        setPosts((prevPosts) => {
          let updatedPosts = [...prevPosts];
          bullets.forEach((bullet) => {
            const hitPostIndex = updatedPosts.findIndex((post) => {
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
              handleDelete(updatedPosts[hitPostIndex].ID);
              updatedPosts.splice(hitPostIndex, 1);
            }
          });

          return updatedPosts;
        }); 
      }, 16); // 60 FPS

      return () => clearInterval(gameLoop);
    }
  }, [isDestructionMode, bullets]);
  
  return (
    <div className="App" style={{ height: '100vh', overflow: 'hidden' }}>
      {!isDestructionMode && <h1>BLOGSTROYER</h1>}
      {!isDestructionMode ? (
        <>
          <div className="buttons">
            <motion.button
              onClick={() => setIsCreating(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Create post
            </motion.button>
            <motion.button
              onClick={handleStartDestruction}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start DESTRUCTION
            </motion.button>
          </div>
          <AnimatePresence>
            {isCreating && (
              <motion.form
                onSubmit={handleSubmit}
                className="create-post-form"
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.3 }}
              >
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  required
                />
                <textarea
                  value={contents}
                  onChange={(e) => setContents(e.target.value)}
                  placeholder="Contents"
                  required
                ></textarea>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Post
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setTitle("");
                    setContents("");
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
          {error && <div className="error-message">{error}</div>}
          {!isCreating && !selectedPost && (
            <div className="posts-grid">
              <AnimatePresence>
                {posts.map((post) => (
                  <motion.div
                    key={post.ID}
                    id={`post-${post.ID}`}
                    className={`post-card ${
                      deletingId === post.ID ? "exploding" : ""
                    }`}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0, transition: { duration: 0.5 } }}
                    onClick={() => handlePostClick(post)}
                  >
                    <h2>{post.title}</h2>
                    {deletingId === post.ID && (
                      <div className="explosion-container">
                        {[...Array(50)].map((_, i) => (
                          <ExplosionParticle
                            key={i}
                            top={`${Math.random() * 100}%`}
                            left={`${Math.random() * 100}%`}
                            size={`${Math.random() * 10 + 5}px`}
                            color={getRandomColor()}
                          />
                        ))}
                        {[...Array(10)].map((_, i) => (
                          <PostFragment
                            key={i}
                            top={`${Math.random() * 100}%`}
                            left={`${Math.random() * 100}%`}
                            width={`${Math.random() * 30 + 20}%`}
                            height={`${Math.random() * 30 + 20}%`}
                            backgroundImage={`linear-gradient(${
                              Math.random() * 360
                            }deg, #333333, #555555)`}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
     ) : (
      <div className="destruction-mode" style={{ height: '100%', overflow: 'hidden' }}>
          <motion.button
            onClick={() => setIsDestructionMode(false)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}
          >
            Exit Destruction Mode
          </motion.button>
          <div className="posts-grid" style={{ height: 'calc(100% - 60px)', overflowY: 'hidden' }}>
            {posts.map((post) => (
              <motion.div
                key={post.ID}
                id={`post-${post.ID}`}
                className={`post-card ${deletingId === post.ID ? "exploding" : ""}`}
              >
                <h2>{post.title}</h2>
                {deletingId === post.ID && (
                  <div className="explosion-container">
                    {[...Array(50)].map((_, i) => (
                      <ExplosionParticle
                        key={i}
                        top={`${Math.random() * 100}%`}
                        left={`${Math.random() * 100}%`}
                        size={`${Math.random() * 10 + 5}px`}
                        color={getRandomColor()}
                      />
                    ))}
                    {[...Array(10)].map((_, i) => (
                      <PostFragment
                        key={i}
                        top={`${Math.random() * 100}%`}
                        left={`${Math.random() * 100}%`}
                        width={`${Math.random() * 30 + 20}%`}
                        height={`${Math.random() * 30 + 20}%`}
                        backgroundImage={`linear-gradient(${
                          Math.random() * 360
                        }deg, #333333, #555555)`}
                      />
                    ))}
                 </div>
                )}
              </motion.div>
            ))}
          </div>
          <Spaceship position={spaceshipPosition} />
          {bullets.map((bullet) => (
            <Bullet key={bullet.id} position={bullet} />
          ))}
        </div>
      )}
      {selectedPost && !isEditing && (
        <div className="selected-post">
          <h2>{selectedPost.title}</h2>
          <p>{selectedPost.contents}</p>
          <div className="post-actions">
            <motion.button
              onClick={handleEdit}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="edit-button"
            >
              Edit
            </motion.button>
            <motion.button
              onClick={() => handleDelete(selectedPost.ID)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="delete-button"
            >
              Delete
            </motion.button>
            <motion.button
              onClick={() => setSelectedPost(null)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="back-button"
            >
              Back to posts
            </motion.button>
          </div>
        </div>
      )}
      {isEditing && (
        <form onSubmit={handleUpdate} className="edit-post-form">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            required
          />
          <textarea
            value={contents}
            onChange={(e) => setContents(e.target.value)}
            placeholder="Contents"
            required
          ></textarea>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Update
          </motion.button>
          <motion.button
            type="button"
            onClick={() => setIsEditing(false)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Cancel
          </motion.button>
        </form>
      )}
    </div>
  );
}

export default App;