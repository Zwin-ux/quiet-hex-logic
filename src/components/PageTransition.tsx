import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        key={location.pathname}
        initial={
          prefersReducedMotion
            ? { opacity: 0 }
            : {
                opacity: 0,
                y: 24,
                scale: 0.992,
                clipPath: 'inset(8% 0 0 0 round 20px)',
                filter: 'blur(10px)',
              }
        }
        animate={
          prefersReducedMotion
            ? { opacity: 1 }
            : {
                opacity: 1,
                y: 0,
                scale: 1,
                clipPath: 'inset(0% 0 0 0 round 0px)',
                filter: 'blur(0px)',
              }
        }
        exit={
          prefersReducedMotion
            ? { opacity: 0 }
            : {
                opacity: 0,
                y: -12,
                scale: 1.01,
                clipPath: 'inset(0 0 12% 0 round 20px)',
                filter: 'blur(12px)',
              }
        }
        transition={{ duration: prefersReducedMotion ? 0.18 : 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{ minHeight: '100vh' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
