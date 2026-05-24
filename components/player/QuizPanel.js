// QuizPanel.js Interactive Multiple Choice Quiz Engine
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function QuizPanel({ video, segments, videoId, onXP }) {
  const { awardBadge } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);

  useEffect(() => {
    if (videoId) {
      loadQuiz();
    }
  }, [videoId]);

  async function loadQuiz() {
    setLoading(true);
    try {
      const res = await fetch('/api/generate-quiz', {
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
      setQuestions(data.questions || []);
      
      // Reset quiz state
      setCurrentIndex(0);
      setSelectedOption(null);
      setSubmitted(false);
      setScore(0);
      setCompleted(false);
      setXpAwarded(0);
    } catch (err) {
      console.error('Failed to load quiz:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleOptionSelect = (idx) => {
    if (submitted) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || submitted) return;
    setSubmitted(true);
    
    const isCorrect = selectedOption === questions[currentIndex].correct;
    if (isCorrect) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setSubmitted(false);
    
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(c => c + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setCompleted(true);
    const correctCount = score + (selectedOption === questions[currentIndex].correct ? 1 : 0);
    const points = correctCount * 20; // 20 XP per correct answer
    setXpAwarded(points);
    await onXP(points);
    
    // If scored 100% (or high), award "Quiz Master" badge
    if (correctCount === questions.length) {
      await awardBadge('quiz_master');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="spinner mx-auto mb-3" style={{ width: 32, height: 32 }} />
        <p className="text-sm text-text-muted">Generating quiz questions based on the video contents...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-text-muted mb-4">No quiz questions generated for this video yet.</p>
        <button onClick={loadQuiz} className="btn-primary py-2 px-4 text-xs font-bold rounded-xl">
          <span>Generate Quiz Questions</span>
        </button>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="p-6 text-center space-y-6 animate-slide-up">
        <div className="text-5xl">🏆</div>
        <div>
          <h3 className="font-display font-bold text-xl text-text-primary">Quiz Completed!</h3>
          <p className="text-sm text-text-muted mt-2">
            You scored <span className="text-purple font-bold">{score} / {questions.length}</span> correct answers!
          </p>
        </div>

        <div className="max-w-xs mx-auto p-4 rounded-2xl bg-purple/10 border border-purple/20">
          <div className="text-2xl font-bold text-[#c4b5fd]">+{xpAwarded} XP</div>
          <p className="text-[10px] text-text-muted uppercase tracking-wider mt-1 font-semibold">Awarded for study progress</p>
        </div>

        {score === questions.length && (
          <div className="max-w-xs mx-auto p-3 rounded-xl bg-green/10 border border-green/30 text-green text-xs font-semibold">
            🎯 Achievement Unlocked: Quiz Master Badge Earned!
          </div>
        )}

        <button onClick={loadQuiz} className="btn-secondary py-2.5 px-6 rounded-xl text-sm font-semibold">
          Try Again
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="p-4 space-y-5 animate-fade-in">
      {/* Quiz Progress header */}
      <div className="flex justify-between items-center pb-3 border-b border-white/5">
        <span className="text-xs font-bold text-text-muted uppercase">Question {currentIndex + 1} of {questions.length}</span>
        <span className="text-xs font-mono font-bold text-purple">Score: {score}</span>
      </div>

      {/* Question */}
      <div className="space-y-4">
        <h3 className="font-semibold text-base text-text-primary leading-relaxed">{currentQ.question}</h3>
        
        {/* Options */}
        <div className="flex flex-col gap-2">
          {currentQ.options.map((opt, idx) => {
            let bg = 'rgba(255, 255, 255, 0.03)';
            let border = 'rgba(255, 255, 255, 0.06)';
            
            if (submitted) {
              if (idx === currentQ.correct) {
                bg = 'rgba(16, 185, 129, 0.15)';
                border = 'rgba(16, 185, 129, 0.4)';
              } else if (selectedOption === idx) {
                bg = 'rgba(239, 68, 68, 0.15)';
                border = 'rgba(239, 68, 68, 0.4)';
              }
            } else if (selectedOption === idx) {
              bg = 'rgba(124, 58, 237, 0.15)';
              border = 'rgba(124, 58, 237, 0.4)';
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                disabled={submitted}
                className="w-full text-left p-4 rounded-xl border transition-all text-sm text-text-primary hover:bg-white/5 active:scale-[0.99]"
                style={{ background: bg, borderColor: border }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action panel */}
      <div className="space-y-3 pt-2">
        {!submitted ? (
          <button
            onClick={handleSubmitAnswer}
            disabled={selectedOption === null}
            className="w-full btn-primary py-3 rounded-xl font-bold"
          >
            <span>Submit Answer</span>
          </button>
        ) : (
          <div className="space-y-4 animate-slide-up">
            {/* Explanation box */}
            <div className="p-4 rounded-xl bg-surface2/50 border border-white/5 text-xs text-text-muted leading-relaxed">
              <span className="font-bold text-text-primary block mb-1">
                {selectedOption === currentQ.correct ? '🎉 Correct!' : '❌ Incorrect'}
              </span>
              {currentQ.explanation}
            </div>
            <button
              onClick={handleNext}
              className="w-full btn-primary py-3 rounded-xl font-bold"
            >
              <span>{currentIndex + 1 === questions.length ? 'Finish Quiz' : 'Next Question →'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
