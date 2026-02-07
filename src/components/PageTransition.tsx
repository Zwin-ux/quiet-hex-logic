import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState<'enter' | 'idle'>('enter');

  useEffect(() => {
    setTransitionStage('enter');
    setDisplayChildren(children);
    const timer = setTimeout(() => setTransitionStage('idle'), 200);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div
      className={transitionStage === 'enter' ? 'animate-page-enter' : ''}
      style={{ minHeight: '100vh' }}
    >
      {displayChildren}
    </div>
  );
}
