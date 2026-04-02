import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Plus, X, Users } from 'lucide-react';

export default function CreateBet() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [question, setQuestion] = useState('');
  const [emoji, setEmoji] = useState('🎲');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [deadlineMode, setDeadlineMode] = useState<'datetime' | 'timer'>('timer');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [timerHours, setTimerHours] = useState('24');
  const [timerMinutes, setTimerMinutes] = useState('0');
  const [loading, setLoading] = useState(false);
  const [groupMembers, setGroupMembers] = useState<string[]>([]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!groupId) return;
      try {
        const membersSnap = await getDocs(collection(db, `groups/${groupId}/members`));
        const memberNames: string[] = [];
        for (const d of membersSnap.docs) {
          const uSnap = await getDoc(doc(db, 'users', d.data().userId));
          if (uSnap.exists() && uSnap.data().username) {
            memberNames.push(uSnap.data().username);
          }
        }
        setGroupMembers(memberNames);
      } catch (error) {
        console.error("Error fetching members:", error);
      }
    };
    fetchMembers();
  }, [groupId]);

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = [...options];
      newOptions.splice(index, 1);
      setOptions(newOptions);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !groupId || !question.trim()) return;
    
    // Validate options
    const validOptions = options.map(o => o.trim()).filter(o => o);
    if (validOptions.length < 2) {
      alert("Veuillez fournir au moins 2 options valides.");
      return;
    }

    let finalDeadline: Date;
    if (deadlineMode === 'datetime') {
      if (!deadlineDate) {
        alert("Veuillez sélectionner une date et une heure.");
        return;
      }
      finalDeadline = new Date(deadlineDate);
      if (finalDeadline <= new Date()) {
        alert("La date de fin doit être dans le futur.");
        return;
      }
    } else {
      const h = parseInt(timerHours) || 0;
      const m = parseInt(timerMinutes) || 0;
      if (h === 0 && m === 0) {
        alert("Veuillez définir un minuteur valide.");
        return;
      }
      finalDeadline = new Date();
      finalDeadline.setHours(finalDeadline.getHours() + h);
      finalDeadline.setMinutes(finalDeadline.getMinutes() + m);
    }

    setLoading(true);
    try {
      await addDoc(collection(db, `groups/${groupId}/bets`), {
        creatorId: user.uid,
        question: question.trim(),
        emoji,
        type: 'multiple',
        options: validOptions,
        deadline: finalDeadline,
        status: 'open',
        createdAt: serverTimestamp()
      });

      navigate(`/group/${groupId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `groups/${groupId}/bets`);
      setLoading(false);
    }
  };

  const EMOJIS = ['🎲', '🏆', '🍻', '🌴', '⚽', '🎮', '🍕', '🎯', '🏎️', '💡', '🔥', '💰'];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white p-4 shadow-sm flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-800 p-1">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Créer un pari</h1>
      </header>

      <main className="flex-1 p-4">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Icône du pari</label>
            <div className="grid grid-cols-6 gap-2 mb-4">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`text-2xl p-2 rounded-xl transition-all ${emoji === e ? 'bg-indigo-100 scale-110' : 'bg-gray-50 hover:bg-gray-100'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Question *</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="ex: Qui va s'endormir en premier ce soir ? 😴"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow resize-none h-24"
              required
              maxLength={200}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-gray-700">Options de réponse</label>
              {groupMembers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOptions([...groupMembers])}
                  className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg"
                >
                  <Users size={14} /> Utiliser les membres
                </button>
              )}
            </div>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                    maxLength={50}
                  />
                  {options.length > 2 && (
                    <button type="button" onClick={() => handleRemoveOption(index)} className="text-gray-400 hover:text-red-500 p-2">
                      <X size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-3 text-indigo-600 font-medium text-sm flex items-center gap-1 hover:text-indigo-800"
              >
                <Plus size={16} /> Ajouter une option
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Temps de vote</label>
            <div className="flex bg-gray-100 p-1 rounded-xl mb-3">
              <button
                type="button"
                onClick={() => setDeadlineMode('timer')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${deadlineMode === 'timer' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
              >
                Minuteur
              </button>
              <button
                type="button"
                onClick={() => setDeadlineMode('datetime')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${deadlineMode === 'datetime' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
              >
                Date précise
              </button>
            </div>

            {deadlineMode === 'timer' ? (
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Heures</label>
                  <input
                    type="number"
                    min="0"
                    max="720"
                    value={timerHours}
                    onChange={(e) => setTimerHours(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={timerMinutes}
                    onChange={(e) => setTimerMinutes(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  />
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="datetime-local"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-md"
          >
            {loading ? 'Création en cours...' : 'Créer le pari'}
          </button>
        </form>
      </main>
    </div>
  );
}
