/* primitives.jsx — Admin console primitives (Tailwind-based, light-only). */
export const Icon = ({ name, className = '', style }) => (
  <i className={`fas fa-${name} ${className}`} style={style} aria-hidden="true" />
);

export const Logo = ({ size = 30 }) => (
  <img src="/assets/logo.png" alt="YoteMarket" style={{ height: size }} />
);

export const Card = ({ children, className = '', padding = 'p-6', style }) => (
  <div className={`bg-white rounded-2xl shadow ${padding} ${className}`} style={style}>{children}</div>
);

export function Button({ children, onClick, icon, kind = 'primary', className = '', type = 'button' }) {
  const kinds = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    soft: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  };
  return (
    <button type={type} onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-lg px-4 py-2 text-sm transition-colors ${kinds[kind]} ${className}`}>
      {icon && <Icon name={icon} />}{children}
    </button>
  );
}
