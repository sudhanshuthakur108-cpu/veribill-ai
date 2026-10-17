import Brand from './Brand.jsx';

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="auth-page">
      <main className="auth-card">
        <Brand />
        <h1>{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
        {children}
        <p className="auth-footer">{footer}</p>
      </main>
    </div>
  );
}
