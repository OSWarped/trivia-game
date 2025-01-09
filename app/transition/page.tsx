"use client"
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';


export default function TransitionPage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<{
    gameId: string;
    transitionMessage: string;
    transitionMedia: string;
    adEmbedCode: string;
  } | null>(null);

  // Extract searchParams from the URL
  useEffect(() => {
    const url = new URL(window.location.href); // Use the window object to parse the current URL
    const searchParams = url.searchParams;

    const gameId = searchParams.get('gameId');
    const transitionMessage = searchParams.get('transitionMessage');
    const transitionMedia = searchParams.get('transitionMedia');
    const adEmbedCode = searchParams.get('adEmbedCode');

    if (!gameId) {
      console.error('Game ID is missing. Redirecting to home.');
      router.push('/'); // Redirect to home if gameId is missing
      return;
    }

    // Set game state from searchParams
    setGameState({
      gameId,
      transitionMessage: transitionMessage || 'Take a short break!',
      transitionMedia: transitionMedia || '',
      adEmbedCode: adEmbedCode || '',
    });
  }, [router]);

  if (!gameState) {
    return <div>Loading...</div>;
  }

  return (
    <div className="transition-page">
      <div className="transition-message">
        <h1>{gameState.transitionMessage}</h1>
      </div>

      <div className="transition-media">
        {gameState.transitionMedia && (
          <Image
          src={gameState.transitionMedia}
          alt="Transition Media"
          width={800}
          height={450}
          className="media-placeholder"
        />
        )}
      </div>

      <div className="ad-section">
        {gameState.adEmbedCode && (
          <div
            className="ad-placeholder"
            dangerouslySetInnerHTML={{ __html: gameState.adEmbedCode }}
          />
        )}
      </div>
    </div>
  );
}
