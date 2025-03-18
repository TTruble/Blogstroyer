import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../components/ProfilePage.scss";
import { API_URL } from "../apiurl";

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
    axios
      .post(API_URL, {
        action: "getProfile",
        userId,
      })
      .then((response) => {
        setLoading(false);
        console.log("Profile response:", response.data);

        if (response.data && response.data.success) {
          setProfile(response.data.user);
          setBio(response.data.user.bio || "");
          setError("");
        } else {
          const errorMessage =
            response.data?.message || "Failed to load profile data";
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

    // Create a FormData object for sending the file
    const formData = new FormData();
    formData.append("action", "updateProfile");
    formData.append("userId", userId);
    formData.append("bio", bio);

    if (profilePicFile) {
      formData.append("profile_picture", profilePicFile);
    }

    // Use axios with the correct configuration for FormData
    axios
      .post(API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((response) => {
        setLoading(false);
        console.log("Update response:", response.data);

        if (response.data.success) {
          axios.post(API_URL, { action: "getProfile", userId }).then((refreshResponse) => {
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

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBioChange = (e) => {
    const newBio = e.target.value;
    if (newBio.length <= 150) {
      setBio(newBio);
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
                onChange={handleBioChange}
                rows="4"
                maxLength="150"
                placeholder="Tell us about yourself..."
              />
              <p>
                {bio.length} / 150 characters
              </p>
            </div>

            <div className="form-group">
              <label>Update Profile Picture:</label>
              <input type="file" accept="image/*" onChange={handleFileChange} />
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