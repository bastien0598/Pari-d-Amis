import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PartyPopper, ArrowRight } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';

export default function Register() {
  const { user, loading, refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (user) return <Navigate to="/" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password || !username.trim()) return;
    setIsSubmitting(true);
    
    try {
      // 1. Create account in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      // 2. Update Firebase auth profile
      await updateProfile(userCredential.user, {
        displayName: username.trim(),
      });
      
      // 3. Create document in users collection
      try {
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          username: username.trim(),
          createdAt: serverTimestamp(),
        });
      } catch (firestoreErr: any) {
        handleFirestoreError(firestoreErr, OperationType.WRITE, `users/${userCredential.user.uid}`);
      }
      
      // 4. Refresh user state in context to pick up the new profile name
      await refreshUser();
      
    } catch (err: any) {
      console.error("Register error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Cet email est déjà utilisé.');
      } else if (err.code === 'auth/weak-password') {
        setError('Le mot de passe doit faire au moins 6 caractères.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("L'authentification par email/mot de passe n'est pas activée dans votre console Firebase.");
      } else {
        setError(err.message || 'Une erreur est survenue lors de l\'inscription.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4 text-white">
      <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md shadow-2xl max-w-md w-full text-center border border-white/20">
        <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <PartyPopper size={40} className="text-yellow-300" />
        </div>
        <h1 className="text-4xl font-extrabold mb-2 tracking-tight">Inscription</h1>
        <p className="text-indigo-100 mb-8 text-lg">Rejoins Pari d'Amis ! 🎉</p>
        
        {error && (
          <div className="bg-red-500/20 text-red-200 border border-red-500/50 p-3 rounded-lg flex items-center justify-center mb-4 text-sm font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ton pseudo..."
              className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white focus:bg-white/30 transition-all text-center font-medium"
              required
              maxLength={20}
            />
          </div>
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ton email..."
              className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white focus:bg-white/30 transition-all text-center font-medium"
              required
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ton mot de passe..."
              className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white focus:bg-white/30 transition-all text-center font-medium"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !email.trim() || !password || !username.trim()}
            className="w-full bg-white text-indigo-600 font-bold py-4 px-6 rounded-xl hover:bg-indigo-50 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? 'Inscription...' : 'S\'inscrire'}
            {!isSubmitting && <ArrowRight size={20} />}
          </button>
        </form>
        
        <div className="mt-6 text-sm text-indigo-100">
          Tu as déjà un compte ?{' '}
          <Link to="/login" className="font-bold underline hover:text-white transition-colors">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
