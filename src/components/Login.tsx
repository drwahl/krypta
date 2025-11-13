import React, { useState } from 'react';
import { useMatrix } from '../MatrixContext';
import { LogIn, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const { login, isLoading } = useMatrix();
  // Restore homeserver from localStorage or use default
  const [homeserver, setHomeserver] = useState(
    localStorage.getItem('mx_homeserver') || 'https://matrix.org'
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(homeserver, username, password);
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Provide more helpful error messages
      let errorMessage = 'Login failed. Please check your credentials and try again.';
      
      if (err.httpStatus === 403) {
        errorMessage = 'Invalid username or password. Please check your credentials.';
      } else if (err.httpStatus === 429) {
        errorMessage = 'Too many login attempts. Please wait and try again.';
      } else if (err.errcode === 'M_FORBIDDEN') {
        errorMessage = 'Invalid username or password.';
      } else if (err.message && err.message.includes('CORS')) {
        errorMessage = 'Cannot connect to homeserver. CORS error.';
      } else if (err.message && err.message.includes('fetch')) {
        errorMessage = 'Cannot connect to homeserver. Check the URL and your internet connection.';
      } else if (err.data?.error) {
        errorMessage = `Login failed: ${err.data.error}`;
      }
      
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Krypta</h1>
          <p className="text-slate-300 text-lg">The Matrix client that doesn't suck</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-slate-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="homeserver" className="block text-sm font-medium text-slate-300 mb-2">
                Homeserver
              </label>
              <input
                id="homeserver"
                type="text"
                value={homeserver}
                onChange={(e) => setHomeserver(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="https://matrix.org"
                required
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="username (or @user:matrix.org)"
                required
              />
              <p className="mt-1 text-xs text-slate-400">
                Enter just your username or full Matrix ID
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-slate-700 text-white font-medium py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            <p>Don't have an account? Register at your homeserver.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

