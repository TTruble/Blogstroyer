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
        flexDirection: "column",    
        justifyContent: "center", 
        alignItems: "center",   
        zIndex: 3000,
        color: "white",
        fontSize: "2rem",
        paddingBottom: "2rem",    
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
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0, transition: { delay: 0.5, duration: 0.5 } }} 
        exit={{ opacity: 0, y: 20, transition: { duration: 0.3 } }}
        style={{
          fontSize: "1.5rem",            
          marginTop: "1rem",           
          textAlign: "center",   
        }}
      >
        Loading Destruction Mode...
      </motion.div>
    </motion.div>
  );
};

export default LoadingScreen;
