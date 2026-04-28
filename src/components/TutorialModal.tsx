import React, { useEffect, useState } from 'react';
import { PartyPopper, Check, Clock } from 'lucide-react';

interface TutorialModalProps {
  userId: string;
  onClose: () => void;
}

export default function TutorialModal({ userId, onClose }: TutorialModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Petit délai pour une apparition fluide
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Laisse le temps à l'animation de sortie
  };

  const handleUnderstand = () => {
    localStorage.setItem(`tutorialSeen_${userId}`, 'true');
    handleClose();
  };

  const handleLater = () => {
    // Ne stocke rien pour le réafficher la prochaine fois
    handleClose();
  };

  return (
    <div className={`fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div 
        className={`bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl transition-all duration-300 transform flex flex-col max-h-[90vh] ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
      >
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-center shrink-0">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
            <PartyPopper className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">Bienvenue sur Pari d'Amis 🎉</h2>
        </div>
        
        <div className="p-6 overflow-y-auto overscroll-contain">
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Pari d'Amis est une application fun entre amis qui permet de lancer des paris pour vos soirées, vacances, événements ou défis du quotidien.
          </p>

          <div className="space-y-6 mb-8">
            <div>
              <h3 className="font-bold text-gray-800 text-base mb-2">Les groupes privés 👥</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-2">
                Crée un groupe avec tes amis pour une soirée, un week-end, des vacances, un anniversaire ou n'importe quel événement.
              </p>
              <p className="text-gray-600 text-sm leading-relaxed mb-2">
                Invite tes amis avec un lien ou un QR code.
              </p>
              <p className="text-gray-600 text-sm leading-relaxed font-medium">
                Chaque groupe possède son propre classement et ses propres paris.
              </p>
            </div>

            <div className="bg-indigo-50 rounded-xl p-4">
              <h3 className="font-bold text-indigo-800 text-base mb-2">L'enjeu du groupe 🏆</h3>
              <p className="text-indigo-700/90 text-sm mb-3">
                Le créateur du groupe peut définir un enjeu global dès le départ.
              </p>
              <p className="font-medium text-indigo-800 text-xs mb-2 uppercase tracking-wide">Exemples :</p>
              <ul className="text-indigo-700/80 text-sm space-y-1.5 list-disc pl-4 mb-3">
                <li>Le perdant paie la tournée</li>
                <li>Le dernier fait le ménage</li>
                <li>Le gagnant choisit le restaurant</li>
                <li>Gage personnalisé entre amis</li>
              </ul>
              <p className="text-indigo-700/90 text-sm font-medium">
                Cela donne encore plus d'intérêt aux paris pendant toute la durée du groupe.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-800 text-base mb-3">Fonctionnement :</h3>
              <ol className="text-gray-600 text-sm space-y-2 list-decimal pl-4 font-medium">
                <li>Crée ou rejoins un groupe</li>
                <li>Le groupe choisit un enjeu global</li>
                <li>Lancez des paris entre vous</li>
                <li>Votez avant la fin du chrono</li>
                <li>Gagne des points et grimpe au classement final</li>
              </ol>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0 pt-2 border-t border-gray-100">
            <button
              onClick={handleUnderstand}
              className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
            >
              <Check size={18} /> J'ai compris
            </button>
            <button
              onClick={handleLater}
              className="w-full bg-transparent text-gray-500 font-medium py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors text-sm"
            >
              <Clock size={16} /> Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
