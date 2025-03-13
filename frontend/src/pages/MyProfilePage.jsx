import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../components/ProfilePage.scss";

const API_URL = "https://blogstroyer.alwaysdata.net/backend/api.php";

export default function MyProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [bio, setBio] = useState("");
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user ? user.id : null;

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }
    
    setLoading(true);
    
    // Create a FormData object instead of JSON
    const formData = new FormData();
    formData.append('action', 'getProfile');
    formData.append('userId', userId);
    
    axios
      .post(API_URL, formData)
      .then((response) => {
        setLoading(false);
        console.log("Profile response:", response.data);
        
        if (response.data && response.data.success) {
          setProfile(response.data.user);
          setBio(response.data.user.bio || "");
          setError("");
        } else {
          const errorMessage = response.data?.message || "Failed to load profile data";
          setError(errorMessage);
        }
      })
      .catch((err) => {
        setLoading(false);
        console.error("Profile fetch error:", err);
        setError("Error fetching profile. Please try again later.");
      });
  }, [userId, navigate]);

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData();
    formData.append("action", "updateProfile");
    formData.append("userId", userId);
    formData.append("bio", bio);
    
    if (profilePicFile) {
      formData.append("profile_picture", profilePicFile);
    }
    
    axios
      .post(API_URL, formData)
      .then((response) => {
        setLoading(false);
        console.log("Update response:", response.data);
        
        if (response.data.success) {
          // Refresh the profile data after update
          const refreshFormData = new FormData();
          refreshFormData.append('action', 'getProfile');
          refreshFormData.append('userId', userId);
          
          axios
            .post(API_URL, refreshFormData)
            .then((refreshResponse) => {
              if (refreshResponse.data.success) {
                setProfile(refreshResponse.data.user);
                setProfilePicFile(null);
                setPreviewImage(null);
                alert("Profile updated successfully!");
              }
            });
        } else {
          setError(response.data.message || "Failed to update profile");
        }
      })
      .catch((err) => {
        setLoading(false);
        console.error("Profile update error:", err);
        setError("Failed to update profile. Please try again.");
      });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicFile(file);
      
      // Create a preview of the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="profile-page">
      <h1>My Profile</h1>
      
      {error && <p className="error-message">{error}</p>}
      {loading && <p className="loading-message">Loading...</p>}
      
      {profile && !loading && (
        <div className="profile-container">
          <div className="profile-header">
            {/* Show preview image if available, otherwise show current profile picture or default */}
            {previewImage ? (
              <img
                src={previewImage}
                alt="Profile Preview"
                className="profile-picture"
              />
            ) : profile.profile_picture ? (
              <img
                src={profile.profile_picture}
                alt="Profile"
                className="profile-picture"
              />
            ) : (
              <div className="default-profile-picture" />
            )}
            <h2 className="profile-username">{profile.username}</h2>
          </div>
          
          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label>Bio:</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows="4"
                placeholder="Tell us about yourself..."
              />
            </div>
            
            <div className="form-group">
              <label>Update Profile Picture:</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            
            <button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
