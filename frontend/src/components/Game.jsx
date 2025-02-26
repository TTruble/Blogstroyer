import React, { forwardRef } from "react";
import { motion } from "framer-motion";

export const Spaceship = forwardRef(({ position, isHit }, ref) => (
  <motion.div
    ref={ref}
    className="spaceship"
    animate={isHit ? {
      opacity: [1, 0.5, 1, 0.5, 1],
      scale: [1, 0.95, 1, 0.95, 1],
    } : {}}
    transition={{ duration: 0.5 }}
    style={{
      position: "fixed",
      bottom: "20px",
      left: position,
      width: "40px",
      height: "40px",
      backgroundColor: "white",
      clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
    }}
  >
    <motion.div
      className="cannon"
      style={{
        position: "absolute",
        top: "-10px",
        left: "50%",
        width: "4px",
        height: "10px",
        backgroundColor: "red",
        transform: "translateX(-50%)",
      }}
    />
  </motion.div>
));

export const Bullet = ({ position }) => (
  <motion.div
    className="bullet"
    style={{
      position: "absolute",
      top: position.y,
      left: position.x,
      width: "4px",
      height: "10px",
      backgroundColor: "yellow",
    }}
  />
);

export const EnemyBullet = ({ position }) => (
  <motion.div
    className="enemy-bullet"
    style={{
      position: "absolute",
      top: position.y,
      left: position.x,
      width: "12px", // Increased from 4px to 8px
      height: "18px", // Increased from 10px to 15px
      backgroundColor: "red",
      boxShadow: "0 0 5px #ff0000, 0 0 10px #ff6666", // Added glow effect
      borderRadius: "2px", // Slightly rounded corners
    }}
  />
);