import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, LogOut, User as UserIcon, Edit2, Check, X } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Sync state if user context updates late
  useEffect(() => {
    if (user && !isEditing) {
      setUsername(user.displayName || '');
    }
  }, [user, isEditing]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSave = async () => {
    if (!user || !username.trim()) return;
    setIsSaving(true);
    setError('');

    try {
      const updates: { displayName?: string } = {};
      const firestoreUpdates: { username?: string } = {};

      if (username.trim() && username.trim() !== user.displayName) {
        updates.displayName = username.trim();
        firestoreUpdates.username = username.trim();
      }

      if (Object.keys(updates).length > 0 || Object.keys(firestoreUpdates).length > 0) {
        if (Object.keys(updates).length > 0 && auth.currentUser) {
          await updateProfile(auth.currentUser, updates);
        }
        
        if (Object.keys(firestoreUpdates).length > 0) {
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, {
            ...firestoreUpdates,
            username: username.trim() || user.displayName || 'Utilisateur',
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
        
        // Force reload of the page to refresh auth context
        window.location.reload();
      } else {
        setIsEditing(false);
      }
    } catch (err: any) {
      console.error("EXACT ERROR:", err, err.code, err.message);
      setError('Erreur lors de la mise à jour du profil : ' + (err.message || ''));
      if (err.code && (err.code.startsWith('permission-denied') || err.code.includes('permission'))) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user?.uid}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-800 p-1">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Mon Profil</h1>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="text-indigo-600 bg-indigo-50 p-2 rounded-full hover:bg-indigo-100 transition-colors"
          >
            <Edit2 size={20} />
          </button>
        )}
      </header>
      
      <main className="flex-1 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center mb-6">
            <div className="relative w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-4xl mb-4 overflow-hidden border-4 border-white shadow-sm ring-2 ring-indigo-50">
                {(isEditing ? username : user?.displayName)?.charAt(0).toUpperCase() || <UserIcon size={40} />}
            </div>
            
            {!isEditing ? (
              <>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">{user?.displayName}</h2>
                <p className="text-gray-500">{user?.email}</p>
              </>
            ) : (
                <div className="w-full space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Pseudo</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    maxLength={20}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setUsername(user?.displayName || '');
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                    disabled={isSaving}
                  >
                    <X size={20} /> Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !username.trim()}
                    className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? '...' : <><Check size={20} /> Enregistrer</>}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {!isEditing && (
            <div className="pt-6 border-t border-gray-100">
              <button 
                onClick={handleLogout}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <LogOut size={20} /> Déconnexion
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
