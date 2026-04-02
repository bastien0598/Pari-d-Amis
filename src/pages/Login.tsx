import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PartyPopper, ArrowRight } from 'lucide-react';

export default function Login() {
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (user) return <Navigate to="/" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setIsSubmitting(true);
    await login(username.trim());
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4 text-white">
      <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md shadow-2xl max-w-md w-full text-center border border-white/20">
        <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <PartyPopper size={40} className="text-yellow-300" />
        </div>
        <h1 className="text-4xl font-extrabold mb-2 tracking-tight">Pari d'Amis</h1>
        <p className="text-indigo-100 mb-8 text-lg">Pariez entre amis, juste pour le fun ! 🍻</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ton pseudo..."
              className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-4 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white focus:bg-white/30 transition-all text-center text-lg font-medium"
              required
              maxLength={20}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !username.trim()}
            className="w-full bg-white text-indigo-600 font-bold py-4 px-6 rounded-xl hover:bg-indigo-50 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? 'Connexion...' : 'Entrer'}
            {!isSubmitting && <ArrowRight size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
}
