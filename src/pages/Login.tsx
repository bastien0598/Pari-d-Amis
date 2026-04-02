import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loginWithGoogle } from '../firebase';
import { PartyPopper } from 'lucide-react';

export default function Login() {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (user) return <Navigate to="/" />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4 text-white">
      <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md shadow-2xl max-w-md w-full text-center border border-white/20">
        <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <PartyPopper size={40} className="text-yellow-300" />
        </div>
        <h1 className="text-4xl font-extrabold mb-2 tracking-tight">Pari d'Amis</h1>
        <p className="text-indigo-100 mb-8 text-lg">Pariez entre amis, juste pour le fun ! 🍻</p>
        
        <button
          onClick={loginWithGoogle}
          className="w-full bg-white text-indigo-600 font-bold py-4 px-6 rounded-xl hover:bg-indigo-50 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-3"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          Se connecter avec Google
        </button>
      </div>
    </div>
  );
}
