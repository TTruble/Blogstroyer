//ProfilePage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import "../components/ProfilePage.scss";
import { API_URL } from "../apiurl";

export default function ProfilePage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

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

                const response = await axios.post(API_URL, {
                    action: 'getProfile',
                    userId
                });

                console.log("Profile response:", response.data);

                if (response.data && response.data.success) {
                    setProfile(response.data.user);
                    setError("");
                } else {
                    const errorMessage = response.data?.message || "User profile not found";
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
    }, [userId]);

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
                                src={`${API_URL}/${profile.image_path}`}
                                alt="Profile"
                                className="profile-picture"
                            />
                        ) : (
                            <div className="default-profile-picture"/>
                        )}

                        <h2 className="profile-username">{profile.username}</h2>
                    </div>

                    <div className="profile-bio">
                        <p>{profile.bio || "This user has not set a bio yet."}</p>
                    </div>


                    <button
                        onClick={() => navigate(-1)}
                        className="back-button"
                    >
                        Back
                    </button>
                </div>
            )}
        </div>
    );
}
