import { Link, useLocation } from 'react-router-dom';
import './Header.css';

function Header({ user, onLogout }) {
  const location = useLocation();

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <h1 className="header-logo">IDOR Repair System</h1>
        </div>
        
        <nav className="header-nav">
          <Link 
            to="/dashboard" 
            className={location.pathname === '/dashboard' ? 'nav-link active' : 'nav-link'}
          >
            Security Dashboard
          </Link>
          <Link 
            to="/portal" 
            className={location.pathname === '/portal' ? 'nav-link active' : 'nav-link'}
          >
            Document Portal
          </Link>
        </nav>

        <div className="header-right">
          <span className="user-name">{user.name}</span>
          <button onClick={onLogout} className="btn btn-outline btn-sm">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
