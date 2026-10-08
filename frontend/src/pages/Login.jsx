import { useState } from 'react';
import axios from 'axios';
import './Login.css';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });

      onLogin(response.data.user, response.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (user) => {
    setUsername(user);
    setPassword(user + '123');
    
    setTimeout(async () => {
      try {
        const response = await axios.post('/api/auth/login', {
          username: user,
          password: user + '123'
        });
        onLogin(response.data.user, response.data.token);
      } catch (err) {
        setError(err.response?.data?.error || 'Login failed');
      }
    }, 100);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>IDOR Repair System</h1>
          <p className="subtitle">AI-Assisted Security Vulnerability Detection & Repair</p>
        </div>

        <div className="login-card card">
          <h2>Login</h2>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="divider">
            <span>Demo Accounts</span>
          </div>

          <div className="quick-login">
            <button 
              type="button"
              onClick={() => quickLogin('alice')} 
              className="btn btn-outline btn-full"
            >
              Login as Alice
            </button>
            <button 
              type="button"
              onClick={() => quickLogin('bob')} 
              className="btn btn-outline btn-full"
            >
              Login as Bob
            </button>
          </div>

          <div className="login-info">
            <p><strong>Default Credentials:</strong></p>
            <p>Alice: alice / alice123</p>
            <p>Bob: bob / bob123</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
