import confetti from 'canvas-confetti';

export function useConfetti() {
  const fireConfetti = () => {
    // First burst from left
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.1, y: 0.6 },
      colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'],
    });

    // Second burst from right
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.9, y: 0.6 },
      colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'],
    });

    // Center burst after a slight delay
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'],
      });
    }, 150);
  };

  const fireHearts = () => {
    const defaults = {
      spread: 360,
      ticks: 100,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
      shapes: ['heart' as const],
      colors: ['#ff6b6b', '#ff8a80', '#ff5252', '#ff1744'],
    };

    confetti({
      ...defaults,
      particleCount: 50,
      scalar: 2,
      origin: { x: 0.5, y: 0.5 },
    });

    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 25,
        scalar: 3,
        origin: { x: 0.3, y: 0.6 },
      });
      confetti({
        ...defaults,
        particleCount: 25,
        scalar: 3,
        origin: { x: 0.7, y: 0.6 },
      });
    }, 200);
  };

  const fireMatch = () => {
    // Combined celebration for a match
    fireConfetti();
    setTimeout(fireHearts, 300);
  };

  return { fireConfetti, fireHearts, fireMatch };
}
