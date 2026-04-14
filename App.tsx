import React, { useState, useEffect } from 'react';
import { PresentationInput } from './components/PresentationInput';
import { SlideDeck } from './components/SlideDeck';
import { generatePresentation } from './services/geminiService';
import { SlideData } from './types';
import { Layout, Presentation } from 'lucide-react';

const App: React.FC = () => {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Check for shared presentation in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');
    if (data) {
      try {
        // decodeURIComponent -> atob -> JSON.parse
        const decoded = JSON.parse(decodeURIComponent(atob(data)));
        if (Array.isArray(decoded) && decoded.length > 0) {
          setSlides(decoded);
          setHasGenerated(true);
        }
      } catch (e) {
        console.error("Failed to load presentation from URL", e);
        setError("Failed to load shared presentation. The link might be invalid.");
      }
    }
  }, []);

  const handleGenerate = async (topic: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const generatedSlides = await generatePresentation(topic);
      setSlides(generatedSlides);
      setHasGenerated(true);
      
      // Clear URL params when generating new to avoid confusion
      window.history.replaceState({}, '', window.location.pathname);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setHasGenerated(false);
    setSlides([]);
    setError(null);
    window.history.replaceState({}, '', window.location.pathname);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Presentation className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              PitchPerfect AI
            </span>
          </div>
          {hasGenerated && (
             <button 
               onClick={handleReset}
               className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
             >
               New Presentation
             </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100 blur-3xl opacity-50"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-100 blur-3xl opacity-50"></div>
        </div>

        <div className="flex-grow flex items-center justify-center p-4">
          {!hasGenerated ? (
            <PresentationInput 
              onGenerate={handleGenerate} 
              isLoading={isLoading} 
              error={error} 
            />
          ) : (
            <SlideDeck slides={slides} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-slate-400 text-sm">
        <p>Powered by Gemini 2.5 Flash</p>
      </footer>
    </div>
  );
};

export default App;