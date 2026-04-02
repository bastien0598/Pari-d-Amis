import React, { useState, useEffect } from 'react';

export function Countdown({ deadline }: { deadline: any }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!deadline) return;
    const targetDate = deadline.toDate ? deadline.toDate() : new Date(deadline);

    const checkTime = () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance <= 0) {
        setTimeLeft('Terminé');
        setExpired(true);
        return true;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      let timeString = '';
      if (days > 0) timeString += `${days}j `;
      timeString += `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      setTimeLeft(timeString);
      return false;
    };

    const isDone = checkTime();
    if (isDone) return;

    const interval = setInterval(() => {
      const isDone = checkTime();
      if (isDone) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <span className={`font-mono font-bold ${expired ? 'text-red-500' : 'text-indigo-600 animate-pulse'}`}>
      {timeLeft || 'Calcul...'}
    </span>
  );
}
