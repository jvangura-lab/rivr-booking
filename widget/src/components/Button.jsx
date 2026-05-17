export function Button({
  variant = 'primary',
  type = 'button',
  children,
  className = '',
  showArrow = false,
  ...rest
}) {
  const cls = `btn btn-${variant} ${className}`.trim();
  return (
    <button type={type} className={cls} {...rest}>
      {children}
      {showArrow ? <span className="arr" aria-hidden="true">→</span> : null}
    </button>
  );
}
