import { useReveal } from '../lib/motion.js';

// Wraps children in a fade-up reveal. `delay` (ms) staggers entrance —
// callers compute their own indices to create a sequence (60ms + i * 90ms is
// the site's convention).
export function Reveal({ children, delay = 0, as: Tag = 'div', className = '', ...rest }) {
  const [ref, shown] = useReveal();
  return (
    <Tag
      ref={ref}
      className={`reveal ${shown ? 'in' : ''} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
