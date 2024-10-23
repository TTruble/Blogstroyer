import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import '../LeaderboardPage.css';

const LeaderboardPage = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await axios.post('http://localhost/Blogstroyer/backend/api.php', {
          action: 'getLeaderboard'
        });
        if (response.data.success) {
          setLeaderboardData(response.data.users);
        } else {
          setError('Failed to fetch leaderboard data');
        }
      } catch (error) {
        setError('An error occurred while fetching the leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <p className="loading-text">Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="leaderboard-content"
      >
        <h1 className="leaderboard-title">Leaderboard</h1>
        <div className="table-container">
          <table className="leaderboard-table">
            <thead>
              <tr className="table-header">
                <th className="header-cell">Rank</th>
                <th className="header-cell">Username</th>
                <th className="header-cell header-cell-right">Points</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {leaderboardData.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="table-row"
                >
                  <td className="table-cell">{index + 1}</td>
                  <td className="table-cell">{user.username}</td>
                  <td className="table-cell text-right">{user.points}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default LeaderboardPage;