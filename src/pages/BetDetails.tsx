import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, collection, query, onSnapshot, getDoc, setDoc, updateDoc, serverTimestamp, writeBatch, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Countdown } from '../components/Countdown';
import { cn } from '../lib/utils';

export default function BetDetails() {
  const { groupId, betId } = useParams<{ groupId: string, betId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [bet, setBet] = useState<any>(null);
  const [votes, setVotes] = useState<any[]>([]);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [groupAdminId, setGroupAdminId] = useState<string | null>(null);
  const [usersInfo, setUsersInfo] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [selectedResult, setSelectedResult] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!bet?.deadline) return;
    const target = bet.deadline.toDate ? bet.deadline.toDate() : new Date(bet.deadline);
    
    const checkExpired = () => {
      setIsExpired(new Date().getTime() >= target.getTime());
    };
    
    checkExpired();
    const interval = setInterval(checkExpired, 1000);
    return () => clearInterval(interval);
  }, [bet?.deadline]);

  useEffect(() => {
    if (!groupId || !betId || !user) return;

    // Get group admin
    getDoc(doc(db, 'groups', groupId)).then(snap => {
      if (snap.exists()) setGroupAdminId(snap.data().adminId);
    });

    // Listen to bet
    const unsubBet = onSnapshot(doc(db, `groups/${groupId}/bets`, betId), (docSnap) => {
      if (docSnap.exists()) {
        setBet({ id: docSnap.id, ...docSnap.data() });
      } else {
        navigate(`/group/${groupId}`);
      }
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, `groups/${groupId}/bets/${betId}`));

    // Listen to votes
    const unsubVotes = onSnapshot(collection(db, `groups/${groupId}/bets/${betId}/votes`), async (snapshot) => {
      const votesData: any[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setVotes(votesData);
      
      const myVote = votesData.find(v => v.userId === user.uid);
      if (myVote) setUserVote(myVote.option);

      // Fetch user info for votes
      const newUsersInfo = { ...usersInfo };
      let updated = false;
      for (const v of votesData) {
        if (!newUsersInfo[v.userId]) {
          const uSnap = await getDoc(doc(db, 'users', v.userId));
          if (uSnap.exists()) {
            newUsersInfo[v.userId] = uSnap.data();
            updated = true;
          }
        }
      }
      if (updated) setUsersInfo(newUsersInfo);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `groups/${groupId}/bets/${betId}/votes`));

    return () => {
      unsubBet();
      unsubVotes();
    };
  }, [groupId, betId, user, navigate]);

  const handleVote = async (option: string) => {
    if (!user || !groupId || !betId || userVote || bet?.status !== 'open' || isExpired) return;
    
    try {
      await setDoc(doc(db, `groups/${groupId}/bets/${betId}/votes`, user.uid), {
        userId: user.uid,
        option,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `groups/${groupId}/bets/${betId}/votes`);
    }
  };

  const handleCloseBet = async () => {
    if (!user || !groupId || !betId || bet?.status !== 'open') return;
    if (user.uid !== bet.creatorId && user.uid !== groupAdminId) return;

    try {
      await updateDoc(doc(db, `groups/${groupId}/bets`, betId), {
        status: 'closed'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}/bets/${betId}`);
    }
  };

  const handleResolveBet = async () => {
    if (!user || !groupId || !betId || !selectedResult) return;
    if (user.uid !== bet.creatorId && user.uid !== groupAdminId) return;

    setResolving(true);
    try {
      const batch = writeBatch(db);
      
      // Update bet status
      batch.update(doc(db, `groups/${groupId}/bets`, betId), {
        status: 'resolved',
        result: selectedResult,
        resolvedAt: serverTimestamp()
      });

      // Calculate points
      // Points = (Total number of participants / Number of winners) * 10
      const totalParticipants = votes.length;
      const winners = votes.filter(v => v.option === selectedResult);
      const numWinners = winners.length;

      if (numWinners > 0) {
        const pointsPerWinner = Math.round((totalParticipants / numWinners) * 10);
        
        // Distribute points
        for (const winner of winners) {
          batch.update(doc(db, `groups/${groupId}/members`, winner.userId), {
            points: increment(pointsPerWinner)
          });
        }
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `groups/${groupId}/bets/${betId}`);
      setResolving(false);
    }
  };

  if (loading || !bet) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;

  const isCreatorOrAdmin = user?.uid === bet.creatorId || user?.uid === groupAdminId;
  const totalVotes = votes.length;

  const getOptionStats = (option: string) => {
    const count = votes.filter(v => v.option === option).length;
    const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    return { count, percentage };
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white p-4 shadow-sm flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(`/group/${groupId}`)} className="text-gray-500 hover:text-gray-800 p-1">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Détails du Pari</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-black text-gray-800 leading-tight">{bet.emoji || '🎲'} {bet.question}</h2>
            {bet.status === 'open' && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold whitespace-nowrap ml-2 flex items-center gap-1"><Clock size={12}/> Ouvert</span>}
            {bet.status === 'closed' && <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-bold whitespace-nowrap ml-2">Fermé</span>}
            {bet.status === 'resolved' && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-bold whitespace-nowrap ml-2 flex items-center gap-1"><CheckCircle2 size={12}/> Résolu</span>}
          </div>
          
          {bet.status === 'open' && bet.deadline && (
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl mb-6 border border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                <Clock size={16} className="text-indigo-500" /> Temps restant
              </div>
              <Countdown deadline={bet.deadline} />
            </div>
          )}

          {bet.status === 'resolved' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-center">
              <p className="text-green-800 font-bold mb-1">Résultat</p>
              <p className="text-2xl font-black text-green-600">{bet.result}</p>
            </div>
          )}

          {!userVote && bet.status === 'open' && !isExpired && (
            <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-xl mb-4 text-center border border-amber-100 font-medium">
              ⚠️ Vous n'avez droit qu'à un seul vote. Choisissez bien !
            </p>
          )}

          {userVote && (
            <p className="text-sm text-green-700 bg-green-50 p-3 rounded-xl mb-4 text-center border border-green-100 font-bold">
              ✅ Votre vote a bien été pris en compte !
            </p>
          )}

          <div className="space-y-3">
            {bet.options.map((option: string) => {
              const stats = getOptionStats(option);
              const isSelected = userVote === option;
              const isWinner = bet.status === 'resolved' && bet.result === option;
              
              return (
                <button
                  key={option}
                  onClick={() => handleVote(option)}
                  disabled={bet.status !== 'open' || userVote !== null || isExpired}
                  className={cn(
                    "w-full relative overflow-hidden rounded-xl border-2 transition-all text-left p-4",
                    bet.status === 'open' && !userVote && !isExpired ? "hover:border-indigo-400 border-gray-200 bg-white" : "",
                    isSelected ? "border-indigo-600 bg-indigo-50" : "border-gray-200 bg-white",
                    isWinner ? "border-green-500 bg-green-50" : "",
                    (bet.status !== 'open' || userVote || isExpired) && !isSelected && !isWinner ? "opacity-70" : ""
                  )}
                >
                  {/* Progress bar background */}
                  {(userVote || bet.status !== 'open' || isExpired) && (
                    <div 
                      className={cn("absolute inset-0 opacity-20", isWinner ? "bg-green-500" : isSelected ? "bg-indigo-500" : "bg-gray-300")} 
                      style={{ width: `${stats.percentage}%` }}
                    />
                  )}
                  
                  <div className="relative z-10 flex justify-between items-center">
                    <span className={cn("font-bold", isWinner ? "text-green-700" : isSelected ? "text-indigo-700" : "text-gray-700")}>
                      {option} {isSelected && "✓"}
                    </span>
                    {(userVote || bet.status !== 'open' || isExpired) && (
                      <span className="text-sm font-medium text-gray-600">
                        {stats.percentage}% ({stats.count})
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          
          {totalVotes > 0 && (
            <p className="text-center text-sm text-gray-500 mt-4">
              Total des votes : {totalVotes}
            </p>
          )}

          {bet.status === 'resolved' && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Détails des votes</h3>
              <div className="space-y-4">
                {bet.options.map((option: string) => {
                  const optionVotes = votes.filter(v => v.option === option);
                  if (optionVotes.length === 0) return null;
                  const isWinner = bet.result === option;

                  return (
                    <div key={option} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex justify-between items-center mb-3">
                        <span className={cn("font-bold", isWinner ? "text-green-600" : "text-gray-700")}>{option}</span>
                        <span className="text-sm font-medium text-gray-500">{optionVotes.length} vote{optionVotes.length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {optionVotes.map(v => (
                          <div key={v.userId} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                            <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px]">
                              {usersInfo[v.userId]?.username?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <span className="text-xs font-bold text-gray-700">{usersInfo[v.userId]?.username || 'Chargement...'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Admin/Creator Controls */}
        {isCreatorOrAdmin && bet.status === 'open' && isExpired && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100">
            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <AlertCircle size={16} className="text-orange-500" /> Clôturer le Pari
            </h3>
            <button
              onClick={handleCloseBet}
              className="w-full bg-orange-100 text-orange-700 font-bold py-3 rounded-xl hover:bg-orange-200 transition-colors"
            >
              Résultat du Pari
            </button>
          </div>
        )}

        {isCreatorOrAdmin && bet.status === 'closed' && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100">
            <h3 className="font-bold text-gray-800 mb-4">Résoudre le pari</h3>
            <p className="text-sm text-gray-600 mb-4">Sélectionnez l'option gagnante pour distribuer les points.</p>
            
            <select
              value={selectedResult}
              onChange={(e) => setSelectedResult(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="" disabled>Sélectionner le gagnant...</option>
              {bet.options.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            
            <button
              onClick={handleResolveBet}
              disabled={!selectedResult || resolving}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {resolving ? 'Résolution en cours...' : 'Confirmer le gagnant & Distribuer les points'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
