import React, { useState, useEffect } from 'react';
import { Slide } from './Slide';
import { SlideData } from '../types';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Grid, Download, Share2, FileText, MonitorPlay, X, Loader2, Check, Presentation as PresentationIcon, Copy, Play, Film, Image as ImageIcon } from 'lucide-react';
import pptxgen from 'pptxgenjs';
import { generateScript, generateVideo } from '../services/geminiService';

interface SlideDeckProps {
  slides: SlideData[];
}

interface VisualContent {
    url: string;
    type: 'video' | 'image';
}

export const SlideDeck: React.FC<SlideDeckProps> = ({ slides }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Extras State (Script)
  const [isExtrasOpen, setIsExtrasOpen] = useState(false);
  const [script, setScript] = useState<string>('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // Video/Visual State
  const [visualContent, setVisualContent] = useState<VisualContent | null>(null);
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
  // We effectively remove "visualError" state visibility because the service now guarantees a fallback
  
  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1 < slides.length ? prev + 1 : prev));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, isFullscreen]);

  // PDF Export via Window Print
  useEffect(() => {
    if (isPrinting) {
      const timer = setTimeout(() => {
        window.print();
        setIsPrinting(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isPrinting]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleExportPPTX = () => {
    try {
      const pres = new pptxgen();
      
      slides.forEach((slide) => {
          const slidePage = pres.addSlide();
          slidePage.background = { color: "FFFFFF" };

          if (slide.slideType === 'title') {
              slidePage.background = { color: "4F46E5" };
              slidePage.addText(slide.title, { x: 0.5, y: "40%", w: "90%", h: 1, fontSize: 44, color: "FFFFFF", align: "center", bold: true });
              if (slide.subtitle) {
                   slidePage.addText(slide.subtitle, { x: 1, y: "55%", w: "80%", h: 1, fontSize: 24, color: "E0E7FF", align: "center" });
              }
          } else if (slide.slideType === 'summary') {
              slidePage.background = { color: "0F172A" };
              slidePage.addText(slide.title, { x: 0.5, y: 0.5, w: "90%", fontSize: 36, color: "818CF8", align: "center", bold: true });
              
              const startY = 2.0;
              slide.contentPoints.forEach((point, idx) => {
                slidePage.addText(point, { x: 1, y: startY + (idx * 1.0), w: "80%", fontSize: 18, color: "E2E8F0", align: "center" });
              });

          } else {
              slidePage.addText(slide.title, { x: 0.5, y: 0.5, w: "90%", h: 0.8, fontSize: 32, color: "1E293B", bold: true });
              const contentText = slide.contentPoints.map(p => `• ${p}`).join('\n');
              slidePage.addText(contentText, { x: 0.5, y: 1.5, w: "50%", h: 4, fontSize: 18, color: "334155", lineSpacing: 32, valign: 'top' });
              slidePage.addShape(pres.ShapeType.rect, { x: 6, y: 1.5, w: 3.5, h: 3.5, fill: { color: "F1F5F9" }, line: { color: "CBD5E1" } });
              slidePage.addText("Visual Placeholder", { x: 6, y: 3.25, w: 3.5, fontSize: 14, align: "center", color: "94A3B8" });
          }
          
          if (slide.speakerNotes) {
              slidePage.addNotes(slide.speakerNotes);
          }
      });

      pres.writeFile({ fileName: "PitchPerfect-Presentation.pptx" });
      setIsExportMenuOpen(false);
    } catch (err) {
      console.error("PPTX Generation Error", err);
      alert("Failed to generate PPTX. Please try again.");
    }
  };

  const handleShareLink = () => {
    try {
      const data = btoa(encodeURIComponent(JSON.stringify(slides)));
      const url = `${window.location.origin}${window.location.pathname}?data=${data}`;
      navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      setIsExportMenuOpen(false);
    } catch (e) {
      alert("Failed to create share link.");
    }
  };

  const handleGenerateScript = async () => {
      setIsGeneratingScript(true);
      try {
          const result = await generateScript(slides);
          setScript(result);
      } catch (e) {
          setScript("Failed to generate script. Please try again.");
      } finally {
          setIsGeneratingScript(false);
      }
  };

  const handleGenerateVisual = async () => {
      setIsGeneratingVisual(true);
      try {
          const appName = slides[0].title;
          // Simple sanitization to ensure high success rate
          const topic = appName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
          
          const result = await generateVideo(topic);
          setVisualContent(result);
      } catch (e) {
          console.error("Critical Visual Failure", e);
          // This path should essentially be unreachable now due to service fallbacks
      } finally {
          setIsGeneratingVisual(false);
      }
  };

  if (slides.length === 0) return null;

  if (isPrinting) {
    return (
      <div className="print-container bg-white">
        {slides.map((slide, idx) => (
          <div key={idx} className="print-slide">
            <Slide 
              data={slide} 
              index={idx} 
              total={slides.length} 
              isFullscreen={false}
              printMode={true}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-start w-full transition-all duration-300 ${isFullscreen ? 'h-screen bg-black' : 'min-h-[calc(100vh-140px)]'}`}>
      
      {/* Slide Container */}
      <div className={`relative w-full flex items-center justify-center ${isFullscreen ? 'h-full p-0' : 'h-full max-w-6xl aspect-video p-4'}`}>
        
        <button 
          onClick={prevSlide}
          disabled={currentIndex === 0}
          className={`absolute left-4 z-20 p-3 rounded-full bg-black/10 hover:bg-black/20 text-slate-800 backdrop-blur-sm transition-all
            ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}
            ${isFullscreen ? 'text-white bg-white/10 hover:bg-white/20' : ''}`}
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        <button 
          onClick={nextSlide}
          disabled={currentIndex === slides.length - 1}
          className={`absolute right-4 z-20 p-3 rounded-full bg-black/10 hover:bg-black/20 text-slate-800 backdrop-blur-sm transition-all
            ${currentIndex === slides.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}
             ${isFullscreen ? 'text-white bg-white/10 hover:bg-white/20' : ''}`}
        >
          <ChevronRight className="w-8 h-8" />
        </button>

        <div className={`w-full h-full transition-transform duration-500 ease-out`}>
            <Slide data={slides[currentIndex]} index={currentIndex} total={slides.length} isFullscreen={isFullscreen} />
        </div>

      </div>

      {/* Controls Bar */}
      {!isFullscreen && (
        <div className="w-full max-w-4xl mx-auto mt-4 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between no-print mb-6">
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
            <span>Slide {currentIndex + 1} of {slides.length}</span>
            <div className="h-4 w-px bg-slate-200"></div>
            <button 
              onClick={() => setShowNotes(!showNotes)}
              className={`hover:text-indigo-600 transition-colors ${showNotes ? 'text-indigo-600' : ''}`}
            >
              {showNotes ? 'Hide Notes' : 'Show Notes'}
            </button>
          </div>
          
          <div className="flex items-center gap-2 relative">
            
            <button
                onClick={() => setIsExtrasOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 transition-colors text-sm font-medium"
            >
                <FileText className="w-4 h-4" />
                Presenter Script
            </button>

            {/* Export Menu */}
            <div className="relative">
                <button 
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                >
                   <Download className="w-4 h-4" />
                   Export
                </button>

                {isExportMenuOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50">
                        <div className="p-1">
                            <button 
                                onClick={handleExportPPTX}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors text-left"
                            >
                                <PresentationIcon className="w-4 h-4" />
                                <span>PowerPoint (.pptx)</span>
                            </button>
                            <button 
                                onClick={() => { setIsPrinting(true); setIsExportMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors text-left"
                            >
                                <FileText className="w-4 h-4" />
                                <span>PDF Document</span>
                            </button>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button 
                                onClick={handleShareLink}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors text-left"
                            >
                                {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                                <span>{isCopied ? 'Link Copied!' : 'Share Link'}</span>
                            </button>
                        </div>
                    </div>
                )}
                {isExportMenuOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)}></div>
                )}
            </div>

            <div className="h-6 w-px bg-slate-200 mx-2"></div>

            <button 
              onClick={() => setCurrentIndex(0)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600"
              title="First Slide"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button 
              onClick={toggleFullscreen}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

      {/* Speaker Notes Drawer */}
      {!isFullscreen && showNotes && (
        <div className="w-full max-w-4xl mx-auto mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-slate-700 text-sm shadow-sm transition-all no-print">
          <h4 className="font-semibold text-yellow-800 mb-1">Speaker Notes:</h4>
          <p>{slides[currentIndex].speakerNotes}</p>
        </div>
      )}

      {/* AI Visual Companion Section */}
      {!isFullscreen && (
        <div className="w-full max-w-4xl mx-auto mb-12 px-4 no-print">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                         <div className="p-2 bg-pink-100 rounded-lg">
                            {visualContent?.type === 'image' ? (
                                <ImageIcon className="w-6 h-6 text-pink-600" />
                            ) : (
                                <Film className="w-6 h-6 text-pink-600" />
                            )}
                         </div>
                         <div>
                            <h3 className="text-lg font-bold text-slate-900">AI Visual Companion</h3>
                            <p className="text-sm text-slate-500">Generate a stunning visual for your presentation.</p>
                         </div>
                    </div>
                    {!visualContent && !isGeneratingVisual && (
                         <button 
                            onClick={handleGenerateVisual}
                            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center gap-2 shadow-lg shadow-slate-200 transition-all"
                         >
                            <Play className="w-4 h-4" />
                            Generate Visual
                         </button>
                    )}
                </div>

                {isGeneratingVisual && (
                    <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Loader2 className="w-8 h-8 text-pink-600 animate-spin mb-3" />
                        <p className="text-slate-900 font-medium">Creating your masterpiece...</p>
                        <p className="text-sm text-slate-500 mt-1">Generating high-quality content...</p>
                    </div>
                )}

                {visualContent && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="rounded-xl overflow-hidden bg-black shadow-lg relative aspect-video flex items-center justify-center">
                            {visualContent.type === 'video' ? (
                                <video controls className="w-full h-full" src={visualContent.url}></video>
                            ) : (
                                <img src={visualContent.url} alt="Generated Companion" className="w-full h-full object-cover" />
                            )}
                        </div>
                        <div className="flex justify-end">
                            <a 
                                href={visualContent.url} 
                                download={`pitch-perfect-visual.${visualContent.type === 'video' ? 'mp4' : 'png'}`}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Download {visualContent.type === 'video' ? 'Video' : 'Image'}
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Extras Modal (Script Only) */}
      {isExtrasOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <MonitorPlay className="w-5 h-5 text-violet-600" />
                          Presentation Script
                      </h3>
                      <button onClick={() => setIsExtrasOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                          <X className="w-5 h-5 text-slate-500" />
                      </button>
                  </div>

                  <div className="flex-grow overflow-y-auto p-6">
                      <div className="space-y-4">
                          <div className="flex items-center justify-between">
                              <p className="text-slate-500 text-sm">Generate a full speech script for your presentation.</p>
                              <button 
                                onClick={handleGenerateScript}
                                disabled={isGeneratingScript}
                                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
                              >
                                  {isGeneratingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                  {script ? 'Regenerate' : 'Generate Script'}
                              </button>
                          </div>
                          
                          {script && (
                              <div className="relative bg-slate-50 p-4 rounded-xl border border-slate-200">
                                  <button 
                                    onClick={() => navigator.clipboard.writeText(script)}
                                    className="absolute top-2 right-2 p-2 hover:bg-slate-200 rounded-lg text-slate-500"
                                    title="Copy to Clipboard"
                                  >
                                      <Copy className="w-4 h-4" />
                                  </button>
                                  <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">{script}</pre>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};