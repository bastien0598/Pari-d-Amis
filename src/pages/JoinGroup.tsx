import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { PartyPopper } from 'lucide-react';

export default function JoinGroup() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    const joinGroup = async () => {
      if (!user || !groupId) return;

      try {
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);

        if (!groupSnap.exists()) {
          setError('Groupe introuvable');
          setLoading(false);
          return;
        }

        const groupData = groupSnap.data();
        setGroupName(groupData.name);

        if (groupData.status === 'closed') {
          setError('Ce groupe est fermé');
          setLoading(false);
          return;
        }

        if (groupData.memberIds?.includes(user.uid)) {
          // Already a member
          navigate(`/group/${groupId}`, { replace: true });
          return;
        }

        // Add to group
        await updateDoc(groupRef, {
          memberIds: arrayUnion(user.uid)
        });

        // Create member doc
        await setDoc(doc(db, `groups/${groupId}/members`, user.uid), {
          userId: user.uid,
          points: 0,
          joinedAt: serverTimestamp()
        });

        navigate(`/group/${groupId}`, { replace: true });
      } catch (err) {
        console.error(err);
        setError('Impossible de rejoindre le groupe');
        setLoading(false);
      }
    };

    joinGroup();
  }, [groupId, user, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full">
          <div className="text-red-500 text-4xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Oups !</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-indigo-600 text-white py-2 rounded-xl font-medium"
          >
            Aller au Tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-600 p-4 text-white">
      <div className="text-center animate-pulse">
        <PartyPopper size={48} className="mx-auto mb-4 text-yellow-300" />
        <h2 className="text-2xl font-bold mb-2">Rejoindre {groupName || 'le groupe'}...</h2>
        <p className="text-indigo-200">Préparation en cours !</p>
      </div>
    </div>
  );
}
