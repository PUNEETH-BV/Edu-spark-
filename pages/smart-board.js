// smart-board.js Interactive slide presentations and anatomy labeling flashcards matching mockup Image 3
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';

const PRESENTATION_SLIDES = [
  {
    title: 'Process of Photosynthesis',
    subtitle: 'Phase 1: Light-Dependent Reactions',
    description: 'Capturing solar energy to synthesize ATP and NADPH within the thylakoid membranes.',
    img: 'https://images.unsplash.com/photo-1463171359079-3d9996683be8?w=800&auto=format&fit=crop&q=60'
  },
  {
    title: 'Process of Photosynthesis',
    subtitle: 'Phase 2: Water Photolysis & PSII',
    description: 'Light absorption excites electrons in reaction center P680. Water splitting replaces lost electrons, releasing oxygen.',
    img: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=60'
  },
  {
    title: 'Process of Photosynthesis',
    subtitle: 'Phase 3: Electron Transport Chain',
    description: 'Plastoquinone (PQ) shuttles electrons to Cytochrome b6f, translocating protons into the lumen to build a gradient.',
    img: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&auto=format&fit=crop&q=60'
  },
  {
    title: 'Process of Photosynthesis',
    subtitle: 'Phase 4: ATP Synthesis rotor',
    description: 'Protons rush down the electrochemical gradient through ATP Synthase, driving ATP production via rotational catalysis.',
    img: 'https://images.unsplash.com/photo-1628863040405-3c22b10901e1?w=800&auto=format&fit=crop&q=60'
  }
];

const FLASHCARDS = [
  {
    image: "https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=400&auto=format&fit=crop&q=60",
    title: "Heart Chamber Identifier",
    description: "Identify this upper heart chamber (receives oxygenated blood from lungs)",
    correctTerm: "Atrium",
    hint: "A_t_r_i_u_m",
    hintText: "It starts with A and ends with M. It acts as an entry chamber."
  },
  {
    image: "https://images.unsplash.com/photo-1463171359079-3d9996683be8?w=400&auto=format&fit=crop&q=60",
    title: "Organelle Identifier",
    description: "Identify this plant cell organelle where photosynthesis occurs",
    correctTerm: "Chloroplast",
    hint: "C_h_l_o_r_o_p_l_a_s_t",
    hintText: "Contains chlorophyll pigments and thylakoid discs."
  },
  {
    image: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=400&auto=format&fit=crop&q=60",
    title: "Nuclease Enzyme",
    description: "Identify the programmable molecular scissors enzyme used in CRISPR",
    correctTerm: "Cas9",
    hint: "C_a_s_9",
    hintText: "Guided by RNA to cut double-stranded DNA."
  }
];

function getLevenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
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
            matrix[i - 1][j] + 1  // deletion
          )
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

const SMART_BOARD_TOUR_STEPS = [
  {
    target: 'tab-control',
    title: '📝 Canvas & Study Labs',
    text: "Switch between visual slide presentations ('Smart Board') and real-time interactive simulations ('Study Lab')."
  },
  {
    target: 'convert-btn',
    title: '🎥 Convert to Video Lesson',
    text: 'Compile your interactive canvas slides directly into an AI video lesson segment to study later in the classroom.'
  },
  {
    target: 'flashcard-panel',
    title: '🃏 Vocabulary & Labeling Flashcards',
    text: 'Test your knowledge on key diagrams, check spelling distance metrics with real-time feedback, and listen to audio pronunciation prompts.'
  }
];

export default function SmartBoardPage() {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  
  const [activeTab, setActiveTab] = useState('board');
  const [slideIndex, setSlideIndex] = useState(0);
  const [converting, setConverting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  
  // Photosynthesis Lab State
  const [lightIntensity, setLightIntensity] = useState(50);
  const [co2Level, setCo2Level] = useState(400);
  const [temperature, setTemperature] = useState(25);
  
  // Flashcard State
  const [cardIndex, setCardIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const activeCard = FLASHCARDS[cardIndex];

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // Auto show tour for new visitors to the smart board page
  useEffect(() => {
    if (user && profile) {
      const visited = localStorage.getItem('is_new_smart_board_tour');
      if (!visited) {
        setShowTour(true);
        setTourStep(0);
      }
    }
  }, [user, profile]);

  const handleNextSlide = () => {
    setSlideIndex(prev => (prev + 1) % PRESENTATION_SLIDES.length);
  };
  const handlePrevSlide = () => {
    setSlideIndex(prev => (prev - 1 + PRESENTATION_SLIDES.length) % PRESENTATION_SLIDES.length);
  };

  const handleConvertVideo = () => {
    setConverting(true);
    setTimeout(() => {
      setConverting(false);
      setToastMessage("Slides compiled into a lecture segment successfully!");
      setTimeout(() => setToastMessage(''), 3000);
    }, 3000);
  };

  // spelling distance checker
  const handleVerify = (e) => {
    e.preventDefault();
    const cleanUser = userAnswer.trim().toLowerCase();
    const cleanCorrect = activeCard.correctTerm.toLowerCase();

    if (cleanUser === cleanCorrect) {
      setFeedback(`🎉 Correct! You've identified the ${activeCard.correctTerm}.`);
      setRevealed(true);
    } else {
      const distance = getLevenshteinDistance(cleanUser, cleanCorrect);
      if (distance <= 2) {
        setFeedback(`⚠️ You're very close! Check spelling of '${userAnswer.trim()}'. You're just slightly off from the correct spelling.`);
      } else {
        setFeedback(`❌ Incorrect. Hint: ${activeCard.hintText}`);
      }
    }
  };

  const handleSpeakText = () => {
    if (typeof window === 'undefined') return;
    const text = revealed ? activeCard.correctTerm : `${activeCard.title}. Identify this item.`;
    
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d1a]">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  const currentSlide = PRESENTATION_SLIDES[slideIndex];

  return (
    <>
      <Head>
        <title>EduSpark AI - Smart Board</title>
      </Head>

      <div className="min-h-screen flex text-text-primary bg-[#0d0d1a]">
        
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-[#0d0d1a]/80 backdrop-blur-xl border-b border-white/5 h-16 flex justify-between items-center px-6 md:px-10 shrink-0">
            <div className="flex items-center gap-4 flex-1">
              <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-85">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>
                  🎓
                </div>
                <span className="text-lg font-bold font-display grad-text">EduSpark AI</span>
              </Link>
              {toastMessage && (
                <div className="text-[10px] px-3 py-1.5 rounded-xl border border-purple/30 bg-purple/10 text-purple-light animate-pulse font-semibold">
                  {toastMessage}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setShowTour(true); setTourStep(0); }}
                className="p-2 rounded-full hover:bg-purple/10 text-text-muted hover:text-purple transition-colors relative mr-1"
                title="Help Onboarding Tour"
              >
                <span className="material-symbols-outlined text-sm">help_outline</span>
              </button>
              <Link href="/dashboard" className="btn-secondary py-1.5 px-4 rounded-xl text-xs font-bold">
                Dashboard
              </Link>
            </div>
          </header>

          {/* Canvas layout */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column: Concept Slides or Photosynthesis Lab */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col justify-between">
              
              {/* Toggles and converter */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 shrink-0">
                <div className={`flex p-1 bg-surface2/50 rounded-xl border border-white/5 gap-1 select-none transition-all duration-300 ${showTour && SMART_BOARD_TOUR_STEPS[tourStep].target === 'tab-control' ? 'ring-4 ring-purple glow-purple z-50 relative bg-[#0d0d1a]' : ''}`}>
                  <button
                    onClick={() => setActiveTab('board')}
                    className={`text-xs px-4 py-2 font-bold rounded-lg transition-all ${activeTab === 'board' ? 'bg-purple/20 text-[#c4b5fd]' : 'text-text-muted'}`}
                  >
                    Smart Board
                  </button>
                  <button
                    onClick={() => setActiveTab('lab')}
                    className={`text-xs px-4 py-2 font-bold rounded-lg transition-all ${activeTab === 'lab' ? 'bg-purple/20 text-[#c4b5fd]' : 'text-text-muted'}`}
                  >
                    Study Lab
                  </button>
                </div>

                <button
                  onClick={handleConvertVideo}
                  disabled={converting}
                  className={`btn-primary py-2 px-4 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg transition-all duration-300 ${showTour && SMART_BOARD_TOUR_STEPS[tourStep].target === 'convert-btn' ? 'ring-4 ring-purple glow-purple z-50 relative' : ''}`}
                >
                  <span className="material-symbols-outlined text-xs">video_file</span>
                  <span>{converting ? 'Processing...' : 'Convert to Video'}</span>
                </button>
              </div>

              {activeTab === 'board' ? (
                <>
                  {/* Carousel Board Display */}
                  <div className="flex-1 flex items-center justify-center p-4 animate-fade-in">
                    <div className="w-full max-w-lg glass rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
                      
                      {/* Visual Slide background representation */}
                      <div className="aspect-[4/3] relative">
                        <img src={currentSlide.img} alt="Concept diagram" className="w-full h-full object-cover opacity-35" />
                        
                        {/* Centered slide content overlays */}
                        <div className="absolute inset-0 p-8 flex flex-col justify-between bg-gradient-to-t from-[#0d0d1a] via-[#0d0d1a]/50 to-transparent">
                          <div className="badge badge-purple uppercase text-[8px] font-bold tracking-widest self-start">
                            {currentSlide.title}
                          </div>
                          
                          <div className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-black font-display text-text-primary leading-tight">
                              {currentSlide.subtitle}
                            </h2>
                            <p className="text-xs md:text-sm text-text-muted leading-relaxed">
                              {currentSlide.description}
                            </p>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* Carousel navigation indicators */}
                  <div className="flex justify-between items-center mt-6 shrink-0 max-w-lg mx-auto w-full">
                    <button onClick={handlePrevSlide} className="btn-secondary p-2.5 rounded-full hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    
                    {/* Dots indicator */}
                    <div className="flex gap-2">
                      {PRESENTATION_SLIDES.map((_, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSlideIndex(idx)}
                          className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${slideIndex === idx ? 'bg-purple w-6 shadow-[0_0_8px_rgba(124,58,237,0.5)]' : 'bg-white/20'}`}
                        />
                      ))}
                    </div>

                    <button onClick={handleNextSlide} className="btn-secondary p-2.5 rounded-full hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Premium Interactive Chloroplast Photosynthesis simulator */
                <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 animate-fade-in overflow-y-auto">
                  {/* Left: Sliders control panel */}
                  <div className="flex-1 glass rounded-3xl p-5 border border-white/5 space-y-5 justify-center flex flex-col">
                    <h3 className="text-sm font-bold text-text-primary font-display flex items-center gap-2">
                      <span>🌿</span> Chloroplast Bioenergetics Control
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Light Intensity */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-text-muted">
                          <span>☀️ Light Intensity</span>
                          <span className="text-purple-light">{lightIntensity}%</span>
                        </div>
                        <input
                          type="range" min="0" max="100" value={lightIntensity}
                          onChange={e => setLightIntensity(Number(e.target.value))}
                          className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple"
                        />
                      </div>

                      {/* CO2 Concentration */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-text-muted">
                          <span>💨 $CO_2$ Concentration</span>
                          <span className="text-blue-light">{co2Level} ppm</span>
                        </div>
                        <input
                          type="range" min="0" max="1000" step="50" value={co2Level}
                          onChange={e => setCo2Level(Number(e.target.value))}
                          className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue"
                        />
                      </div>

                      {/* Temperature */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-text-muted">
                          <span>🌡️ Temperature</span>
                          <span className="text-green">{temperature} °C</span>
                        </div>
                        <input
                          type="range" min="10" max="45" value={temperature}
                          onChange={e => setTemperature(Number(e.target.value))}
                          className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-green"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Estimated rates visualization */}
                  {(() => {
                    const tempOptimal = 28;
                    const tempFactor = Math.max(0, 1 - Math.abs(temperature - tempOptimal) / 18);
                    const sugarVal = Math.floor((lightIntensity * 0.4 + co2Level * 0.05) * tempFactor);
                    const oxygenVal = Math.floor(Math.min(100, (lightIntensity * 0.8 + co2Level * 0.02) * tempFactor));

                    return (
                      <div className="w-full lg:w-[280px] shrink-0 glass rounded-3xl p-5 border border-white/5 flex flex-col justify-center space-y-6">
                        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Simulated Output Rates</h4>
                        
                        {/* Oxygen rate progress */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span>💨 Oxygen Release</span>
                            <span className="text-green font-mono">{oxygenVal}%</span>
                          </div>
                          <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
                            <div className="bg-green h-full rounded-full transition-all duration-300" style={{ width: `${oxygenVal}%` }} />
                          </div>
                        </div>

                        {/* Glucose synthesis rate progress */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span>🍭 Glucose Production</span>
                            <span className="text-purple-light font-mono">{sugarVal} mg/hr</span>
                          </div>
                          <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
                            <div className="bg-purple h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, sugarVal)}%` }} />
                          </div>
                        </div>

                        <div className="text-[10px] text-text-muted leading-relaxed font-sans text-center bg-white/5 p-3 rounded-xl border border-white/5">
                          💡 Peak efficiency occurs around 28°C with high light and $CO_2$.
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>

            {/* Right Column: Sidebar Medical Flashcard labelings */}
            <div className={`hidden lg:flex flex-col w-[360px] border-l border-white/5 bg-surface1/60 backdrop-blur-2xl h-full shrink-0 p-4 justify-between space-y-4 transition-all duration-300 ${showTour && SMART_BOARD_TOUR_STEPS[tourStep].target === 'flashcard-panel' ? 'ring-4 ring-purple glow-purple z-50 relative bg-[#0d0d1a]' : ''}`}>
              
              {/* Flashcard Header */}
              <div className="flex justify-between items-center pb-3 border-b border-white/5 shrink-0">
                <span className="text-xs font-bold text-text-muted uppercase">Interactive Flashcards</span>
                <span className="badge badge-purple text-[10px] font-bold font-mono">{cardIndex + 1} / {FLASHCARDS.length}</span>
              </div>

              {/* Anatomy Card */}
              <div className="glass rounded-2xl p-4 flex flex-col items-center text-center space-y-4 bg-surface2/30 flex-1 justify-center relative overflow-hidden">
                <div className="w-44 h-36 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                  <img
                    src={activeCard.image}
                    alt={activeCard.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-text-primary">{activeCard.title}</h4>
                  <p className="text-[10px] text-text-muted mt-1 leading-normal">{activeCard.description}</p>
                </div>

                <form onSubmit={handleVerify} className="w-full flex gap-1.5 shrink-0">
                  <input
                    value={userAnswer}
                    onChange={e => { setUserAnswer(e.target.value); setFeedback(''); }}
                    className="input text-xs flex-1 bg-surface1/80 h-9"
                    placeholder="Type term here..."
                  />
                  <button type="submit" className="btn-primary py-1 px-3 text-[10px] rounded-lg shrink-0 font-bold">
                    <span>Check</span>
                  </button>
                </form>
                
                {hintVisible && (
                  <div className="w-full p-2 bg-yellow/10 border border-yellow/20 rounded-xl text-[10px] text-yellow font-mono shrink-0 animate-fade-in">
                    Hint: {activeCard.hint}
                  </div>
                )}
              </div>

              {/* Card actions */}
              <div className="flex flex-col gap-2 shrink-0">
                <div className="flex gap-2">
                  <button onClick={() => setHintVisible(h => !h)} className="flex-1 btn-secondary py-2 text-[10px] font-bold rounded-xl">
                    Show Hint
                  </button>
                  <button onClick={() => { setRevealed(true); setUserAnswer(activeCard.correctTerm); setFeedback(`Answer revealed: ${activeCard.correctTerm}`); }} className="flex-1 btn-secondary py-2 text-[10px] font-bold rounded-xl">
                    Reveal Label
                  </button>
                  <button onClick={handleSpeakText} className="flex-1 btn-primary py-2 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1">
                    🔊 <span>{speaking ? 'Stop' : 'Audio Spark'}</span>
                  </button>
                </div>
                
                <div className="flex justify-between items-center gap-2 pt-2 border-t border-white/5 text-xs font-bold text-text-muted select-none">
                  <button
                    disabled={cardIndex === 0}
                    onClick={() => { setCardIndex(prev => prev - 1); setUserAnswer(''); setFeedback(''); setRevealed(false); setHintVisible(false); }}
                    className="p-1 px-2.5 rounded-lg bg-white/5 border border-white/5 hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={cardIndex === FLASHCARDS.length - 1}
                    onClick={() => { setCardIndex(prev => prev + 1); setUserAnswer(''); setFeedback(''); setRevealed(false); setHintVisible(false); }}
                    className="p-1 px-2.5 rounded-lg bg-white/5 border border-white/5 hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>

              {/* Typo alerts feedback */}
              {feedback && (
                <div className="p-3.5 rounded-xl border text-[11px] leading-relaxed shrink-0 animate-slide-up"
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

            </div>
          </div>
        </main>
      </div>
      {/* New User Tour Overlay */}
      {showTour && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300" onClick={() => { setShowTour(false); localStorage.setItem('is_new_smart_board_tour', 'true'); }} />
      )}

      {/* New User Tour Dialog Card */}
      {showTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div className="glass rounded-[28px] p-6 max-w-sm w-full border border-purple/45 shadow-2xl relative glow-purple animate-slide-up space-y-4 pointer-events-auto">
            <button 
              onClick={() => { setShowTour(false); localStorage.setItem('is_new_smart_board_tour', 'true'); }} 
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary text-sm"
            >
              ✕
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/35 flex items-center justify-center text-xl text-purple">
                🚀
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-text-primary">{SMART_BOARD_TOUR_STEPS[tourStep].title}</h3>
                <span className="text-[10px] text-text-muted font-medium">Smart Board Tour · Step {tourStep + 1} of {SMART_BOARD_TOUR_STEPS.length}</span>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-text-muted">
              {SMART_BOARD_TOUR_STEPS[tourStep].text}
            </p>
            <div className="flex justify-between items-center gap-2 pt-2">
              <button 
                type="button"
                onClick={() => {
                  if (tourStep > 0) setTourStep(tourStep - 1);
                }} 
                disabled={tourStep === 0}
                className="btn-secondary py-2 px-3 rounded-xl text-xs font-bold disabled:opacity-40"
              >
                Back
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (tourStep < SMART_BOARD_TOUR_STEPS.length - 1) {
                    setTourStep(tourStep + 1);
                  } else {
                    setShowTour(false);
                    localStorage.setItem('is_new_smart_board_tour', 'true');
                  }
                }} 
                className="btn-primary py-2.5 px-4 rounded-xl text-xs font-bold"
              >
                {tourStep === SMART_BOARD_TOUR_STEPS.length - 1 ? 'Finish Tour 🚀' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
