import React, { forwardRef } from "react";
import { motion } from "framer-motion";

export const Spaceship = forwardRef(({ position, isHit, design = null }, ref) => {
  // Default spaceship design
  const defaultDesign = {
    width: "40px",
    height: "40px",
    backgroundColor: "white",
    clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
    cannonColor: "red",
    cannonWidth: "4px",
    cannonHeight: "10px",
  };

  // Parse the design if it's a string
  let spaceshipDesign = defaultDesign;
  if (design) {
    try {
      // If design is a string (JSON), parse it
      if (typeof design === 'string') {
        const parsedDesign = JSON.parse(design);
        
        // Merge with default values for any missing properties
        spaceshipDesign = {
          ...defaultDesign,
          backgroundColor: parsedDesign.backgroundColor || defaultDesign.backgroundColor,
          clipPath: parsedDesign.clipPath || defaultDesign.clipPath,
          cannonColor: parsedDesign.cannonColor || defaultDesign.cannonColor,
          // You can add more properties here if needed
        };
      } else if (typeof design === 'object') {
        // If design is already an object, merge with defaults
        spaceshipDesign = { ...defaultDesign, ...design };
      }
    } catch (e) {
      console.error("Error parsing spaceship design:", e);
    }
  }

  return (
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
        width: spaceshipDesign.width,
        height: spaceshipDesign.height,
        backgroundColor: spaceshipDesign.backgroundColor,
        clipPath: spaceshipDesign.clipPath,
      }}
    >
      <motion.div
        className="cannon"
        style={{
          position: "absolute",
          top: "-10px",
          left: "50%",
          width: spaceshipDesign.cannonWidth,
          height: spaceshipDesign.cannonHeight,
          backgroundColor: spaceshipDesign.cannonColor,
          transform: "translateX(-50%)",
        }}
      />
    </motion.div>
  );
});

export const Bullet = ({ position, color = "yellow" }) => (
  <motion.div
    className="bullet"
    style={{
      position: "absolute",
      top: position.y,
      left: position.x,
      width: "4px",
      height: "10px",
      backgroundColor: color,
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
      width: "12px",
      height: "18px",
      backgroundColor: "red",
      boxShadow: "0 0 5px #ff0000, 0 0 10px #ff6666",
      borderRadius: "2px",
    }}
  />
);
