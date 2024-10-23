import React, { forwardRef } from "react";
import { motion } from "framer-motion";

export const Spaceship = forwardRef(({ position }, ref) => (
  <motion.div
    ref={ref}
    className="spaceship"
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