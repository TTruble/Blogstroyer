// LoadingScreen.jsx
import React from "react";
import { motion } from "framer-motion";
import "./loadingscreen.scss";

const loadingContainerVariants = {
  start: {
    transition: {
      staggerChildren: 0.2,
    },
  },
  animate: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const loadingCircleVariants = {
  start: {
    y: "0%",
    opacity: 0,
  },
  animate: {
    y: "100%",
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "reverse",
    },
  },
};

const LoadingScreen = ({ isLoading }) => {
  return (
    <motion.div
      className="loading-screen"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        flexDirection: "column",    // Ensure content is arranged in a column
        justifyContent: "center",   // Center vertically
        alignItems: "center",       // Center horizontally
        zIndex: 3000,
        color: "white",
        fontSize: "2rem",
        paddingBottom: "2rem",      // Add some space at the bottom
      }}
    >
      <motion.div
        className="loading-container"
        variants={loadingContainerVariants}
        initial="start"
        animate="animate"
      >
        {[...Array(3)].map((_, index) => (
          <motion.span
            key={index}
            className="loading-circle"
            variants={loadingCircleVariants}
            style={{
              display: "inline-block",
              width: "1rem",
              height: "1rem",
              backgroundColor: "white",
              borderRadius: "50%",
            }}
          />
        ))}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}       // Start a bit lower and faded out
        animate={{ opacity: 1, y: 0, transition: { delay: 0.5, duration: 0.5 } }}  // Slide up and fade in
        exit={{ opacity: 0, y: 20, transition: { duration: 0.3 } }}  // Slide down and fade out
        style={{
          fontSize: "1.5rem",                // Smaller font size
          marginTop: "1rem",                 // Add spacing between circles and text
          textAlign: "center",              // Center the text
        }}
      >
        Loading Destruction Mode...
      </motion.div>
    </motion.div>
  );
};

export default LoadingScreen;
