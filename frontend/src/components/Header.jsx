import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./Header.scss";

const Header = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          BLOGSTROYER
        </Link>
        <nav>
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate("/")}>
            Home
          </motion.button>
          {user && (
            <>
              <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate("/shop")}>
                Shop
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate("/inventory")}
              >
                Inventory
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate("/my-profile")}
              >
                My Profile
              </motion.button>
            </>
          )}
          {user ? (
            <motion.button whileHover={{ scale: 1.05 }} onClick={handleLogout}>
              Logout
            </motion.button>
          ) : (
            <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate("/login")}>
              Login
            </motion.button>
          )}
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate("/leaderboard")}>
            Leaderboard
          </motion.button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
