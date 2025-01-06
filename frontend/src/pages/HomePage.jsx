import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import '../components/HomePage.css';

const API_URL = "http://localhost/Blogstroyer/backend/api.php";

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState("");
  const [contents, setContents] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const response = await axios.get(API_URL);
    setPosts(response.data.posts);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(API_URL, { title, contents, userId: user.id });
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
        userId: user.id
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
      await axios.delete(`${API_URL}?ID=${postId}&userId=${user.id}`);
      setSelectedPost(null);
      setPosts(posts.filter((post) => post.ID !== postId));
    } catch (error) {
      console.error("Error deleting post:", error);
      setError("Error deleting post. Please try again.");
    } finally {
      setTimeout(() => setDeletingId(null), 1000);
    }
  };

  return (
    <div className="App">
      {user ? (
        <div className="buttons">
          <motion.button
            onClick={() => setIsCreating(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Create post
          </motion.button>
        </div>
      ) : (
        <p>Please log in to create a post.</p>
      )}
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
                className={`post-card ${deletingId === post.ID ? "exploding" : ""}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0, transition: { duration: 0.5 } }}
                onClick={() => handlePostClick(post)}
              >
                <h2>{post.title}</h2>
                <p className="post-author">By: {post.username}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      {selectedPost && !isEditing && (
        <div className="selected-post">
          <h2>{selectedPost.title}</h2>
          <p className="post-author">By: {selectedPost.username}</p>
          <p>{selectedPost.contents}</p>
          {user && user.id === selectedPost.userId && (
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
            </div>
          )}
          <motion.button
            onClick={() => setSelectedPost(null)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="back-button"
          >
            Back to posts
          </motion.button>
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