import { motion } from "framer-motion";

export const ExplosionParticle = ({ top, left, size, color }) => (
  <motion.div
    className="particle"
    style={{ top, left, width: size, height: size, backgroundColor: color }}
    initial={{ scale: 0, opacity: 1 }}
    animate={{
      scale: [0, 1, 1.5, 0],
      opacity: [1, 1, 0.5, 0],
      x: Math.random() * 400 - 200,
      y: Math.random() * 400 - 200,
      rotate: Math.random() * 720 - 360,
    }}
    transition={{ duration: 1, ease: "easeOut" }}
  />
);

export const PostFragment = ({ top, left, width, height, backgroundImage }) => (
  <motion.div
    className="post-fragment"
    style={{ top, left, width, height, backgroundImage }}
    initial={{ opacity: 1, scale: 1 }}
    animate={{
      opacity: 0,
      scale: 0,
      x: Math.random() * 200 - 100,
      y: Math.random() * 200 - 100,
      rotate: Math.random() * 360,
    }}
    transition={{ duration: 1, ease: "easeOut" }}
  />
);
