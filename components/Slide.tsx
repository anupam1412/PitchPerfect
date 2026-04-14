import React from 'react';
import { SlideData } from '../types';
import { CheckCircle2, TrendingUp, Target, Smartphone } from 'lucide-react';

interface SlideProps {
  data: SlideData;
  index: number;
  total: number;
  isFullscreen: boolean;
  printMode?: boolean;
}

export const Slide: React.FC<SlideProps> = ({ data, index, total, isFullscreen, printMode = false }) => {
  // Generate a deterministic placeholder image based on slide index
  const imageUrl = `https://picsum.photos/800/600?random=${index}`;
  
  // Base classes for the slide container
  // In print mode, we remove shadows and rounded corners, and ensure full height
  const slideBaseClass = `w-full h-full bg-white overflow-hidden relative flex flex-col 
    ${isFullscreen || printMode ? '' : 'rounded-2xl shadow-2xl'}
    ${printMode ? 'border-none' : ''}`;

  // Helper to render content based on slide type
  const renderContent = () => {
    switch (data.slideType) {
      case 'title':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-gradient-to-br from-indigo-600 to-violet-700 text-white relative overflow-hidden print:bg-indigo-600 print:text-white">
            {/* Abstract Shapes - hidden in print sometimes if background graphics off, but we keep DOM */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>
            
            <div className="z-10 max-w-4xl">
              <div className="inline-block p-4 rounded-2xl bg-white/10 backdrop-blur-md mb-8 shadow-inner border border-white/20">
                <Smartphone className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
                {data.title}
              </h1>
              {data.subtitle && (
                <p className="text-xl md:text-3xl text-indigo-100 font-light max-w-2xl mx-auto leading-relaxed">
                  {data.subtitle}
                </p>
              )}
            </div>
            <div className="absolute bottom-8 text-white/50 text-sm font-medium tracking-widest uppercase">
              Pitch Deck
            </div>
          </div>
        );

      case 'feature':
        return (
          <div className="flex h-full">
            <div className="w-1/2 p-12 flex flex-col justify-center bg-slate-50">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-indigo-100 rounded-lg">
                    <Target className="w-6 h-6 text-indigo-600" />
                 </div>
                 <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-wider">Key Features</h2>
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-8 leading-tight">{data.title}</h1>
              <div className="space-y-6">
                {data.contentPoints.map((point, i) => (
                  <div key={i} className="flex items-start gap-4 group">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mt-1 flex-shrink-0" />
                    <p className="text-lg text-slate-700 leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-1/2 h-full relative">
                <img 
                    src={imageUrl} 
                    alt="Feature Visualization" 
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-indigo-900/20 mix-blend-multiply"></div>
            </div>
          </div>
        );

      case 'summary':
        return (
          <div className="h-full flex flex-col items-center justify-center p-16 bg-slate-900 text-white relative overflow-hidden print:bg-slate-900">
             <div className="absolute inset-0 opacity-20">
                 <img src={imageUrl} className="w-full h-full object-cover blur-sm scale-110" alt="background"/>
             </div>
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/90 to-slate-900/80"></div>
             
             <div className="z-10 max-w-4xl text-center">
                <h1 className="text-4xl md:text-5xl font-bold mb-12 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 print:text-white">
                    {data.title}
                </h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                    {data.contentPoints.map((point, i) => (
                        <div key={i} className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/10 hover:bg-white/15 transition-colors print:bg-transparent print:border-white">
                            <p className="text-xl font-medium leading-relaxed">{point}</p>
                        </div>
                    ))}
                </div>
             </div>
          </div>
        );

      // Default/Content layout
      default:
        return (
          <div className="flex h-full flex-col p-12 md:p-16 relative">
            <div className="flex justify-between items-start mb-12 border-b border-slate-100 pb-6">
                <h2 className="text-4xl font-bold text-slate-800">{data.title}</h2>
                <div className="p-2 bg-indigo-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-indigo-600" />
                </div>
            </div>
            
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                    {data.contentPoints.map((point, i) => (
                        <div key={i} className="flex gap-4">
                            <span className="flex-shrink-0 w-2 h-2 mt-2.5 rounded-full bg-indigo-500"></span>
                            <p className="text-xl text-slate-600 leading-relaxed">{point}</p>
                        </div>
                    ))}
                </div>
                <div className="h-full max-h-[400px] rounded-2xl overflow-hidden shadow-lg transform rotate-1 transition-transform duration-500 print:shadow-none print:transform-none">
                     <img 
                        src={imageUrl} 
                        alt="Slide Visual" 
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={slideBaseClass}>
      {renderContent()}
      
      {/* Footer Branding for non-title slides */}
      {data.slideType !== 'title' && data.slideType !== 'summary' && (
        <div className="absolute bottom-6 left-12 right-12 flex justify-between items-end border-t border-slate-100 pt-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">PitchPerfect AI</span>
            <span className="text-sm font-mono text-slate-300">{index + 1} / {total}</span>
        </div>
      )}
    </div>
  );
};