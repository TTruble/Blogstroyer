import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Bomb } from "lucide-react";
import LoadingScreen from "../components/loadingscreen";
import "../components/HomePage.scss";
import { API_URL, local } from "../apiurl";

const POSTS_PER_PAGE = 9;

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState("");
  const [contents, setContents] = useState("");
  const [image, setImage] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortType, setSortType] = useState("default");
  const [isDestructMode, setIsDestructMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [totalPosts, setTotalPosts] = useState(0);

  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();
  const location = useLocation();
  const query = useQuery();

  // Debounce helper
  function debounce(func, delay) {
    let timeout;
    return function (...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), delay);
    };
  }

  const debouncedSetSearchQuery = useCallback(
    debounce((value) => {
      setSearchQuery(value);
      setCurrentPage(1);
    }, 500),
    []
  );

  // Fetch single post by ID
  const fetchSinglePost = async (postId) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}?ID=${postId}`);
      if (response.data.success) {
        setSelectedPost(response.data.post);
        setPosts([response.data.post]);
      } else {
        setError(response.data.error || "Failed to fetch post");
      }
    } catch (error) {
      console.error("Error fetching single post:", error);
      setError("Error fetching single post. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch paginated posts list
  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      let url = API_URL;
      const params = new URLSearchParams();

      if (searchQuery) {
        params.append("search", searchQuery);
      }
      if (sortType !== "default") {
        params.append("sort", sortType);
      }
      params.append("page", currentPage);
      params.append("limit", POSTS_PER_PAGE);

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const response = await axios.get(url);
      setPosts(response.data.posts);
      setTotalPosts(response.data.totalPosts || 0);
      setSelectedPost(null);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setError("Error fetching posts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to handle URL query param postId and fetch accordingly
  useEffect(() => {
    const postId = query.get("postId");
    if (postId) {
      fetchSinglePost(postId);
    } else {
      fetchPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searchQuery, sortType, currentPage]);

  const handleSearch = (e) => {
    debouncedSetSearchQuery(e.target.value);
  };

  const handleSortChange = (e) => {
    setSortType(e.target.value);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("contents", contents);
      formData.append("userId", user.id);
      if (image) {
        formData.append("image", image);
      }

      await axios.post(API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setTitle("");
      setContents("");
      setImage(null);
      setIsCreating(false);
      fetchPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      setError("Error creating post. Please try again.");
    }
  };

  const handlePostClick = (post) => {
    navigate(`/?postId=${post.ID}`);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setTitle(selectedPost.title);
    setContents(selectedPost.contents);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("ID", selectedPost.ID);
      formData.append("title", title);
      formData.append("contents", contents);
      formData.append("userId", user.id);
      if (image) {
        formData.append("image", image);
      }

      await axios.put(API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
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
      // If deleting last post on page, go back a page if possible
      if (posts.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      setError("Error deleting post. Please try again.");
    } finally {
      setTimeout(() => setDeletingId(null), 1000);
    }
  };

  const handleEnterDestructionMode = async () => {
    setIsLoading(true);
    setTimeout(() => {
      navigate("/destroy", { state: { posts } });
      setIsLoading(false);
    }, 1000);
  };

  const clearSelectedPost = () => {
    navigate("/");
  };

  return (
    <div className="App">
      <AnimatePresence>{isLoading && <LoadingScreen isLoading={isLoading} />}</AnimatePresence>

      {user && !selectedPost && !isCreating && (
        <div className="buttons">
          <motion.button
            onClick={() => setIsCreating(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Create post
          </motion.button>
        </div>
      )}

      {!selectedPost && !isCreating && (
        <div className="search-sort-container">
          <input type="text" placeholder="Search posts..." onChange={handleSearch} />
          <select value={sortType} onChange={handleSortChange}>
            <option value="default">Sort by Default</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="most_destruction">Most Destructions</option>
            <option value="least_destruction">Least Destructions</option>
          </select>
        </div>
      )}

      {user && !selectedPost && !isCreating && (
        <motion.button
          onClick={handleEnterDestructionMode}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="destruction-mode-button"
        >
          <Bomb className="bomb-icon" />
          Destruction Mode
        </motion.button>
      )}

      <AnimatePresence>
        {isCreating && !selectedPost && (
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
            <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} />
            <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              Post
            </motion.button>
            <motion.button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setTitle("");
                setContents("");
                setImage(null);
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
        <>
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
                  {post.image_path && (
                    <img
                      src={`${
                        local
                          ? "http://localhost/Blogstroyer/backend/"
                          : "https://blogstroyer.alwaysdata.net/backend/"
                      }${post.image_path}`}
                      alt={post.title}
                    />
                  )}
                  <p className="post-author">By: {post.username}</p>
                  <p className="destruction-count">Destructions: {post.destruction_count}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {totalPages > 1 && (
            <div className="pagination-controls">
              <motion.button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`pagination-button ${currentPage === 1 ? "disabled" : ""}`}
              >
                <ChevronLeft size={24} />
              </motion.button>
              <span className="page-indicator">
                Page {currentPage} of {totalPages}
              </span>
              <motion.button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`pagination-button ${currentPage === totalPages ? "disabled" : ""}`}
              >
                <ChevronRight size={24} />
              </motion.button>
            </div>
          )}
        </>
      )}

      {selectedPost && !isEditing && (
        <div className="selected-post">
          <h2>{selectedPost.title}</h2>
          <p>{selectedPost.contents}</p>
          {selectedPost.image_path && (
            <img
              src={`${
                local
                  ? "http://localhost/Blogstroyer/backend/"
                  : "https://blogstroyer.alwaysdata.net/backend/"
              }${selectedPost.image_path}`}
              alt={selectedPost.title}
            />
          )}
          <Link to={`/profile/${selectedPost.userId}`} className="post-author">
            By: {selectedPost.username}
          </Link>
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
            onClick={clearSelectedPost}
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
          <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} />
          <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
