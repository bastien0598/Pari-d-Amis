import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';

export default function CreateGroup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [globalStake, setGlobalStake] = useState('');
  const [emoji, setEmoji] = useState('🎲');
  const [loading, setLoading] = useState(false);

  const EMOJI_OPTIONS = ['🎲', '🏆', '🍻', '🌴', '⚽', '🎮', '🎯', '🚀', '🍕', '🏖️', '⛷️', '🎉'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);
    try {
      // Create group
      const groupRef = await addDoc(collection(db, 'groups'), {
        name: name.trim(),
        emoji,
        adminId: user.uid,
        memberIds: [user.uid],
        globalStake: globalStake.trim() || null,
        status: 'active',
        createdAt: serverTimestamp()
      });

      // Add creator as member
      await setDoc(doc(db, `groups/${groupRef.id}/members`, user.uid), {
        userId: user.uid,
        points: 0,
        joinedAt: serverTimestamp()
      });

      navigate(`/group/${groupRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'groups');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white p-4 shadow-sm flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-800 p-1">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Créer un Groupe</h1>
      </header>

      <main className="flex-1 p-4">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Icône du Groupe</label>
            <div className="grid grid-cols-6 gap-2 mb-4">
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`text-2xl p-2 rounded-xl transition-all ${emoji === e ? 'bg-indigo-100 scale-110 shadow-sm' : 'bg-gray-50 hover:bg-gray-100 grayscale hover:grayscale-0'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nom du Groupe *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Ibiza 2026 🌴"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              required
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Enjeu Global (Optionnel)</label>
            <input
              type="text"
              value={globalStake}
              onChange={(e) => setGlobalStake(e.target.value)}
              placeholder="ex: Le perdant paie le resto 🍔"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">Quel est l'enjeu pour tout le groupe ?</p>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? 'Création...' : 'Créer le Groupe'}
          </button>
        </form>
      </main>
    </div>
  );
}
