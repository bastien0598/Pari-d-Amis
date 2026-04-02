import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, collection, query, onSnapshot, orderBy, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Share2, Plus, Trophy, Clock, CheckCircle2, AlertCircle, Settings } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Countdown } from '../components/Countdown';
import { cn } from '../lib/utils';

export default function GroupDetails() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [group, setGroup] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [usersInfo, setUsersInfo] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'bets' | 'resolved' | 'leaderboard'>('bets');
  const [showShare, setShowShare] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [resettingPoints, setResettingPoints] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'reset' | 'close' | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!groupId || !user) return;

    // Listen to group
    const unsubGroup = onSnapshot(doc(db, 'groups', groupId), (docSnap) => {
      if (docSnap.exists()) {
        setGroup({ id: docSnap.id, ...docSnap.data() });
      } else {
        navigate('/');
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `groups/${groupId}`));

    // Listen to bets
    const qBets = query(collection(db, `groups/${groupId}/bets`), orderBy('createdAt', 'desc'));
    const unsubBets = onSnapshot(qBets, (snapshot) => {
      setBets(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `groups/${groupId}/bets`));

    // Listen to members
    const qMembers = query(collection(db, `groups/${groupId}/members`), orderBy('points', 'desc'));
    const unsubMembers = onSnapshot(qMembers, async (snapshot) => {
      const membersData: any[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMembers(membersData);
      
      // Fetch user info for members if not already fetched
      const newUsersInfo = { ...usersInfo };
      let updated = false;
      for (const m of membersData) {
        if (!newUsersInfo[m.userId]) {
          const uSnap = await getDoc(doc(db, 'users', m.userId));
          if (uSnap.exists()) {
            newUsersInfo[m.userId] = uSnap.data();
            updated = true;
          }
        }
      }
      if (updated) setUsersInfo(newUsersInfo);
      
    }, (error) => handleFirestoreError(error, OperationType.LIST, `groups/${groupId}/members`));

    return () => {
      unsubGroup();
      unsubBets();
      unsubMembers();
    };
  }, [groupId, user, navigate]);

  const handleCloseGroup = async () => {
    if (!group || user?.uid !== group.adminId) return;
    try {
      await updateDoc(doc(db, 'groups', group.id), { status: 'closed' });
      setConfirmAction(null);
      setShowSettings(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${group.id}`);
    }
  };

  const handleResetPoints = async () => {
    if (!group || user?.uid !== group.adminId) return;
    setResettingPoints(true);
    try {
      const batch = writeBatch(db);
      members.forEach(member => {
        const memberRef = doc(db, `groups/${groupId}/members`, member.id);
        batch.update(memberRef, { points: 0 });
      });
      await batch.commit();
      setConfirmAction(null);
      setShowSettings(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `groups/${groupId}/members`);
    } finally {
      setResettingPoints(false);
    }
  };

  if (!group) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;

  const inviteLink = `${window.location.origin}/join/${groupId}`;
  const isAdmin = user?.uid === group.adminId;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-800 p-1">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold text-gray-800 truncate max-w-[200px]">{group.emoji || '🎲'} {group.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowShare(true)}
              className="text-indigo-600 bg-indigo-50 p-2 rounded-full hover:bg-indigo-100 transition-colors"
            >
              <Share2 size={20} />
            </button>
            {isAdmin && (
              <button 
                onClick={() => setShowSettings(true)}
                className="text-gray-600 bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"
              >
                <Settings size={20} />
              </button>
            )}
          </div>
        </div>
        
        {group.globalStake && (
          <div className="bg-yellow-50 text-yellow-800 text-sm px-3 py-2 rounded-lg font-medium flex items-center gap-2 mb-3">
            <span>🏆</span> Enjeu : {group.globalStake}
          </div>
        )}

        <div className="flex border-b border-gray-200">
          <button 
            className={cn("flex-1 py-2 text-sm font-bold text-center border-b-2 transition-colors", activeTab === 'bets' ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500")}
            onClick={() => setActiveTab('bets')}
          >
            En cours
          </button>
          <button 
            className={cn("flex-1 py-2 text-sm font-bold text-center border-b-2 transition-colors", activeTab === 'resolved' ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500")}
            onClick={() => setActiveTab('resolved')}
          >
            Terminés
          </button>
          <button 
            className={cn("flex-1 py-2 text-sm font-bold text-center border-b-2 transition-colors", activeTab === 'leaderboard' ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500")}
            onClick={() => setActiveTab('leaderboard')}
          >
            Classement
          </button>
        </div>
      </header>

      <main className="flex-1 p-4">
        {activeTab === 'bets' && (
          <div className="space-y-4">
            {group.status === 'active' && (
              <Link 
                to={`/group/${groupId}/create-bet`}
                className="w-full bg-indigo-100 text-indigo-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-200 transition-colors border border-indigo-200 border-dashed"
              >
                <Plus size={20} /> Créer un Nouveau Pari
              </Link>
            )}

            {group.status === 'closed' && (
              <div className="bg-red-50 text-red-700 p-3 rounded-xl text-center text-sm font-medium border border-red-100">
                Ce groupe est fermé. Aucun nouveau pari ne peut être créé.
              </div>
            )}

            {bets.filter(b => b.status !== 'resolved').length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                <AlertCircle size={40} className="mx-auto mb-3 text-gray-300" />
                <p>Aucun pari en cours. Soyez le premier à en créer un !</p>
              </div>
            ) : (
              bets.filter(b => b.status !== 'resolved').map(bet => (
                <Link 
                  key={bet.id} 
                  to={`/group/${groupId}/bet/${bet.id}`}
                  className="block bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800 text-lg leading-tight">{bet.emoji || '🎲'} {bet.question}</h3>
                    {bet.status === 'open' && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold whitespace-nowrap ml-2 flex items-center gap-1"><Clock size={12}/> Ouvert</span>}
                    {bet.status === 'closed' && <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-bold whitespace-nowrap ml-2">Votes Fermés</span>}
                  </div>
                  <div className="text-xs text-gray-500 flex justify-between items-end mt-3">
                    <span>Par {usersInfo[bet.creatorId]?.username || 'Inconnu'}</span>
                    {bet.status === 'open' && bet.deadline && (
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider mb-1 text-gray-400 font-bold">Temps restant</div>
                        <Countdown deadline={bet.deadline} />
                      </div>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === 'resolved' && (
          <div className="space-y-4">
            {bets.filter(b => b.status === 'resolved').length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                <AlertCircle size={40} className="mx-auto mb-3 text-gray-300" />
                <p>Aucun pari terminé pour le moment.</p>
              </div>
            ) : (
              bets.filter(b => b.status === 'resolved').map(bet => (
                <Link 
                  key={bet.id} 
                  to={`/group/${groupId}/bet/${bet.id}`}
                  className="block bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow opacity-80 hover:opacity-100"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800 text-lg leading-tight">{bet.emoji || '🎲'} {bet.question}</h3>
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-bold whitespace-nowrap ml-2 flex items-center gap-1"><CheckCircle2 size={12}/> Résolu</span>
                  </div>
                  <div className="text-xs text-gray-500 flex justify-between items-end mt-3">
                    <span>Par {usersInfo[bet.creatorId]?.username || 'Inconnu'}</span>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        Résultat : {bet.result}
                      </div>
                      {bet.resolvedAt && (
                        <div className="text-[10px] text-gray-400 mt-1">
                          Le {format(bet.resolvedAt.toDate(), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {members.map((member, index) => {
              const isLast = index === members.length - 1 && members.length > 3;
              return (
                <div key={member.id} className={cn("flex items-center justify-between p-4 border-b border-gray-50 last:border-0", index === 0 ? "bg-yellow-50/50" : "", isLast ? "bg-red-50/50" : "")}>
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", 
                      index === 0 ? "bg-yellow-400 text-yellow-900" : 
                      index === 1 ? "bg-gray-300 text-gray-800" : 
                      index === 2 ? "bg-amber-600 text-white" : 
                      isLast ? "bg-red-200 text-red-800" : "bg-gray-100 text-gray-500"
                    )}>
                      {isLast ? "💩" : index + 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <img src={usersInfo[member.userId]?.photoURL || ''} alt="" className="w-8 h-8 rounded-full bg-gray-200" />
                      <span className="font-bold text-gray-800">
                        {usersInfo[member.userId]?.username || 'Chargement...'}
                        {member.userId === user?.uid && " (Vous)"}
                      </span>
                    </div>
                  </div>
                  <div className="font-black text-lg text-indigo-600">
                    {member.points} <span className="text-xs text-gray-400 font-normal">pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Share Modal */}
      {showShare && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowShare(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Inviter des Amis</h3>
            <p className="text-gray-500 text-sm mb-6">Scannez ce QR code ou partagez le lien ci-dessous pour inviter des amis dans "{group.name}".</p>
            
            <div className="bg-white p-4 rounded-2xl inline-block mb-6 shadow-sm border border-gray-100">
              <QRCodeSVG value={inviteLink} size={200} />
            </div>
            
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                readOnly 
                value={inviteLink} 
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 outline-none"
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
            
            <button 
              onClick={() => setShowShare(false)}
              className="w-full text-gray-500 font-medium py-2 hover:text-gray-800 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => { setShowSettings(false); setConfirmAction(null); }}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Paramètres du Groupe</h3>
            
            {confirmAction === 'reset' ? (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-amber-800 font-bold mb-2">Êtes-vous sûr ?</p>
                <p className="text-sm text-amber-700 mb-4">Tous les points seront remis à zéro. Cette action est irréversible.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmAction(null)} className="flex-1 bg-white text-gray-600 font-bold py-2 rounded-lg border border-gray-200">Annuler</button>
                  <button onClick={handleResetPoints} disabled={resettingPoints} className="flex-1 bg-amber-500 text-white font-bold py-2 rounded-lg">{resettingPoints ? '...' : 'Confirmer'}</button>
                </div>
              </div>
            ) : confirmAction === 'close' ? (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-800 font-bold mb-2">Êtes-vous sûr ?</p>
                <p className="text-sm text-red-700 mb-4">Plus aucun pari ne pourra être créé dans ce groupe.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmAction(null)} className="flex-1 bg-white text-gray-600 font-bold py-2 rounded-lg border border-gray-200">Annuler</button>
                  <button onClick={handleCloseGroup} className="flex-1 bg-red-500 text-white font-bold py-2 rounded-lg">Confirmer</button>
                </div>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => setConfirmAction('reset')}
                  className="w-full bg-amber-100 text-amber-700 font-bold py-3 rounded-xl hover:bg-amber-200 transition-colors mb-3"
                >
                  Remettre les points à zéro
                </button>

                {group.status === 'active' && (
                  <button 
                    onClick={() => setConfirmAction('close')}
                    className="w-full bg-red-100 text-red-700 font-bold py-3 rounded-xl hover:bg-red-200 transition-colors mb-4"
                  >
                    Fermer le Groupe
                  </button>
                )}
              </>
            )}
            
            <button 
              onClick={() => { setShowSettings(false); setConfirmAction(null); }}
              className="w-full text-gray-500 font-medium py-2 hover:text-gray-800 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
