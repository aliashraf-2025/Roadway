import { useState, FormEvent } from 'react';
import GlassCard from './GlassCard';
import GlowButton from './GlowButton';

interface LoginProps {
  onLogin?: (email: string) => void;
  onSignupClick?: () => void;
}

export const Login = ({ onLogin, onSignupClick }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (onLogin) {
        await onLogin(email);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    }
  };

  return (
    <GlassCard className="w-full max-w-md p-8 space-y-6">
      <h2 className="text-3xl font-bold text-center text-white mb-8">
        Welcome Back
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-black/20 border border-white/10 
                     text-white placeholder-white/50 focus:outline-none focus:ring-2 
                     focus:ring-white/25 focus:border-transparent"
            placeholder="Enter your email"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-black/20 border border-white/10 
                     text-white placeholder-white/50 focus:outline-none focus:ring-2 
                     focus:ring-white/25 focus:border-transparent"
            placeholder="Enter your password"
            required
          />
        </div>

        {error && (
          <div className="text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <GlowButton
          type="submit"
          className="w-full py-3"
        >
          Sign In
        </GlowButton>
      </form>

      <div className="text-center text-white/70">
        <span>Don't have an account? </span>
        <button
          onClick={onSignupClick}
          className="text-white hover:text-white/90 underline focus:outline-none"
        >
          Sign up
        </button>
      </div>
    </GlassCard>
  );
};