// FlashcardDeck.js Spaced Repetition Learning
import React, { useState, useEffect } from 'react';
import { formatTime } from '@/lib/videoUtils';

// Simple Levenshtein distance to check how close spelling is
function getLevenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export default function FlashcardDeck({ video, segments }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (video) {
      loadCards();
    }
  }, [video]);

  async function loadCards() {
    setLoading(true);
    try {
      const res = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTitle: video.title,
          subject: video.subject,
          segments: segments,
          content: video.content
        })
      });
      const data = await res.json();
      setCards(data.flashcards || []);
      setCurrentIndex(0);
      resetCardState();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const resetCardState = () => {
    setUserInput('');
    setFeedback('');
    setRevealed(false);
    setShowHint(false);
  };

  const handleNext = () => {
    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(c => c + 1);
      resetCardState();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(c => c - 1);
      resetCardState();
    }
  };

  const handleCheckAnswer = (e) => {
    e?.preventDefault();
    if (!userInput.trim()) return;

    const currentCard = cards[currentIndex];
    const correct = currentCard.back.trim().toLowerCase();
    const user = userInput.trim().toLowerCase();

    // Check exact or near match
    if (user === correct || currentCard.back.toLowerCase().includes(user)) {
      setFeedback("🎉 Correct! Excellent job!");
      setRevealed(true);
    } else {
      const distance = getLevenshteinDistance(user, correct);
      if (distance <= 2) {
        setFeedback(`⚠️ You're very close! You wrote "${userInput}". Check the vowels/letters — you're just ${distance} letter${distance > 1 ? 's' : ''} off from the correct spelling.`);
      } else {
        setFeedback(`❌ Incorrect. Try using the hint or tap 'Reveal Label'.`);
      }
    }
  };

  const handleReveal = () => {
    setRevealed(true);
    setFeedback(`The correct answer is: "${cards[currentIndex].back}"`);
  };

  const handleSpeak = () => {
    if (typeof window === 'undefined' || cards.length === 0) return;
    const card = cards[currentIndex];
    const speechText = revealed ? card.back : card.front;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="spinner mx-auto mb-3" style={{ width: 32, height: 32 }} />
        <p className="text-sm text-text-muted">Generating diagnostic flashcard decks...</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-text-muted mb-4">No flashcards loaded.</p>
        <button onClick={loadCards} className="btn-primary py-2 px-4 text-xs font-bold rounded-xl">
          <span>Generate Decks</span>
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  // Mock heart image for biological/medical/labeling topics, otherwise general preview
  const isBiology = video.subject?.toLowerCase().includes('biol') || video.subject?.toLowerCase().includes('plant');
  const cardImage = isBiology 
    ? 'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=400&auto=format&fit=crop&q=60' // anatomical concept / shell / heart structure representation
    : 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400&auto=format&fit=crop&q=60'; // study setup

  return (
    <div className="p-4 space-y-4 animate-fade-in max-w-md mx-auto">
      {/* Index */}
      <div className="flex justify-between items-center text-xs text-text-muted font-mono font-bold">
        <span>Flashcards</span>
        <span>{currentIndex + 1} / {cards.length}</span>
      </div>

      {/* Card UI */}
      <div className="glass rounded-[24px] overflow-hidden border border-white/5 shadow-2xl relative flex flex-col items-center p-6 text-center bg-surface2/30 min-h-[340px] justify-between">
        
        {/* Anatomical Preview for Labeling */}
        <div className="w-40 h-40 rounded-2xl overflow-hidden mb-4 border border-white/10 shrink-0">
          <img src={cardImage} alt="Anatomy diagram" className="w-full h-full object-cover" />
        </div>

        {/* Front Question */}
        <div className="space-y-2 flex-1 flex flex-col justify-center">
          <p className="text-xs text-purple-light uppercase tracking-wider font-bold">Question</p>
          <h4 className="text-sm text-text-primary leading-relaxed font-semibold">{currentCard.front}</h4>
        </div>

        {/* Input box */}
        <form onSubmit={handleCheckAnswer} className="w-full mt-4 flex gap-2">
          <input
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            disabled={revealed}
            placeholder="Type your answer here..."
            className="input text-xs flex-1 bg-surface1/60"
          />
          <button
            type="submit"
            disabled={revealed || !userInput.trim()}
            className="btn-primary py-2 px-3 text-[10px] font-bold rounded-xl shrink-0"
          >
            <span>Verify</span>
          </button>
        </form>

        {/* Hint text */}
        {showHint && (
          <div className="mt-3 p-2 rounded-xl bg-yellow/10 border border-yellow/20 text-yellow text-[10px] font-mono font-bold w-full">
            Hint: {currentCard.hint || 'No hint available'}
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowHint(h => !h)}
          className="flex-1 btn-secondary py-2 text-xs font-bold rounded-xl"
        >
          💡 Hint
        </button>
        <button
          onClick={handleReveal}
          className="flex-1 btn-secondary py-2 text-xs font-bold rounded-xl"
        >
          👁️ Reveal Label
        </button>
        <button
          onClick={handleSpeak}
          className="flex-1 btn-primary py-2 text-xs font-bold rounded-xl"
        >
          🔊 {speaking ? 'Stop' : 'Audio Spark'}
        </button>
      </div>

      {/* AI Spelling/Tutor Feedback Box */}
      {feedback && (
        <div className="p-3.5 rounded-xl border text-xs leading-relaxed animate-slide-up"
          style={{
            background: feedback.includes('Correct') ? 'rgba(16,185,129,0.1)' : feedback.includes('very close') ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.08)',
            borderColor: feedback.includes('Correct') ? 'rgba(16,185,129,0.3)' : feedback.includes('very close') ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.2)',
            color: feedback.includes('Correct') ? '#6ee7b7' : feedback.includes('very close') ? '#fcd34d' : '#fca5a5'
          }}
        >
          <span className="font-bold block mb-1">AI Tutor Feedback:</span>
          {feedback}
        </div>
      )}

      {/* Nav sliders */}
      <div className="flex justify-between items-center pt-2">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="btn-ghost text-xs px-3 disabled:opacity-30"
        >
          ← Prev
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          className="btn-ghost text-xs px-3 disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
