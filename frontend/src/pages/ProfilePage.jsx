//ProfilePage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate, Link } from "react-router-dom"; // Import Link
import "../components/ProfilePage.scss";
import { API_URL, local } from "../apiurl";

export default function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState("recent"); // Default sort order

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setError("User ID is missing from URL.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        console.log("Fetching profile for userId:", userId);

        // Send the sort order to the API
        const response = await axios.post(API_URL, {
          action: "getProfile",
          userId,
          sort: sortOrder, // Include the sort order
        });

        console.log("Profile response:", response.data);

        if (response.data && response.data.success) {
          setProfile(response.data.user);
          setError("");
        } else {
          const errorMessage =
            response.data?.message || "User profile not found";
          setError(errorMessage);
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
        setError("Failed to load profile. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, sortOrder]); //  useEffect now depends on sortOrder

  const handleSortChange = (e) => {
    setSortOrder(e.target.value); // Update the sortOrder state
  };

  return (
    <div className="profile-page">
      <h1>User Profile</h1>

      {loading && <p className="loading-message">Loading profile...</p>}
      {error && <p className="error-message">{error}</p>}

      {profile && !loading && (
        <div className="profile-container">
          <div className="profile-header">
            {profile.image_path ? (
              <img
                src={`${
                  local
                    ? "http://localhost/Blogstroyer/backend/"
                    : "https://blogstroyer.alwaysdata.net/backend/"
                }${profile.image_path}`}
                alt="Profile"
                className="profile-picture"
              />
            ) : (
              <div className="default-profile-picture" />
            )}

            <h2 className="profile-username">{profile.username}</h2>
          </div>

          <div className="profile-bio">
            <p>{profile.bio || "This user has not set a bio yet."}</p>
          </div>

          {/* Sorting Options */}
          <div className="sort-options">
            <label htmlFor="sortOrder">Sort posts by:</label>
            <select
              id="sortOrder"
              value={sortOrder}
              onChange={handleSortChange}
            >
              <option value="recent">Most Recent</option>
              <option value="destroyed">Most Destroyed</option>
            </select>
          </div>

          {/* Display User's Posts */}
          <h3>Posts by {profile.username}</h3>
          <div className="user-posts">
            {profile.posts && profile.posts.length > 0 ? (
              profile.posts.map((post) => (
                <div key={post.ID} className="post-card">
                  <a href={`/post/${post.ID}`} target="_blank" rel="noopener noreferrer">
                    <h4>{post.title}</h4>
                  </a>
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
                  <p>Destruction Count: {post.destruction_count}</p>
                </div>
              ))
            ) : (
              <p>This user has not created any posts yet.</p>
            )}
          </div>

          <button onClick={() => navigate(-1)} className="back-button">
            Back
          </button>
        </div>
      )}
    </div>
  );
}
