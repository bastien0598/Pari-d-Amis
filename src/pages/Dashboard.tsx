import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Users, LogOut, Trash2 } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupToDelete, setGroupToDelete] = useState<{id: string, name: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'groups'),
      where('memberIds', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(groupsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'groups');
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteGroup = (e: React.MouseEvent, groupId: string, groupName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setGroupToDelete({ id: groupId, name: groupName });
  };

  const confirmDelete = async () => {
    if (!groupToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'groups', groupToDelete.id));
      setGroupToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `groups/${groupToDelete.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
          <span className="text-2xl">🎲</span> Pari d'Amis
        </h1>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
            {user?.displayName?.charAt(0).toUpperCase()}
          </div>
          <button onClick={logout} className="text-gray-500 hover:text-red-500">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Mes Groupes</h2>
          <Link 
            to="/create-group"
            className="bg-indigo-600 text-white px-4 py-2 rounded-full font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1 text-sm shadow-md"
          >
            <Plus size={16} /> Nouveau
          </Link>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-10">Chargement des groupes...</div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-indigo-400" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Aucun groupe pour le moment</h3>
            <p className="text-gray-500 mb-6 text-sm">Créez un groupe ou demandez un lien d'invitation à un ami pour commencer à parier !</p>
            <Link 
              to="/create-group"
              className="block w-full bg-indigo-100 text-indigo-700 font-semibold py-3 rounded-xl hover:bg-indigo-200 transition-colors"
            >
              Créer votre premier groupe
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(group => (
              <Link 
                key={group.id} 
                to={`/group/${group.id}`}
                className="block bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-800">{group.emoji || '🎲'} {group.name}</h3>
                  <div className="flex items-center gap-2">
                    {group.status === 'closed' && (
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">Fermé</span>
                    )}
                    {group.adminId === user?.uid && (
                      <button
                        onClick={(e) => handleDeleteGroup(e, group.id, group.name)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Supprimer le groupe"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center text-sm text-gray-500 gap-4">
                  <span className="flex items-center gap-1">
                    <Users size={14} /> {group.memberIds?.length || 0} membres
                  </span>
                  {group.globalStake && (
                    <span className="truncate max-w-[150px]">🏆 {group.globalStake}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Modal de suppression */}
      {groupToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setGroupToDelete(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Supprimer le groupe ?</h3>
            <p className="text-gray-500 text-sm mb-6">Êtes-vous sûr de vouloir supprimer le groupe "{groupToDelete.name}" ? Cette action est irréversible et supprimera l'accès pour tous les membres.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setGroupToDelete(null)}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                disabled={isDeleting}
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
