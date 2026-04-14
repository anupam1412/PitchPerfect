import React, { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, Github, PenTool, Link } from 'lucide-react';

interface PresentationInputProps {
  onGenerate: (topic: string) => void;
  isLoading: boolean;
  error: string | null;
}

export const PresentationInput: React.FC<PresentationInputProps> = ({ onGenerate, isLoading, error }) => {
  const [topic, setTopic] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [isFetchingRepo, setIsFetchingRepo] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const fetchGithubContent = async (url: string): Promise<string> => {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) throw new Error("Invalid GitHub URL. Please use format: https://github.com/username/repo");
    
    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, '');
    const branches = ['main', 'master'];
    
    let content = `GitHub Repository Analysis (${owner}/${cleanRepo}):\n`;
    let foundContent = false;

    for (const branch of branches) {
      try {
        // Try fetching README
        const readmeRes = await fetch(`https://raw.githubusercontent.com/${owner}/${cleanRepo}/${branch}/README.md`);
        if (readmeRes.ok) {
          const text = await readmeRes.text();
          content += `\n--- README.md ---\n${text}\n`;
          foundContent = true;

          // If we found the branch, try to get package.json too
          try {
            const pkgRes = await fetch(`https://raw.githubusercontent.com/${owner}/${cleanRepo}/${branch}/package.json`);
            if (pkgRes.ok) {
              const pkg = await pkgRes.json();
              content += `\n--- package.json ---\nName: ${pkg.name}\nDescription: ${pkg.description || 'No description'}\n`;
              
              if (pkg.scripts) {
                 content += `Scripts: ${Object.keys(pkg.scripts).join(', ')}\n`;
              }
            }
          } catch (e) {
            // Ignore package.json errors
          }
          break; // Stop after finding the correct branch
        }
      } catch (e) {
        continue;
      }
    }

    if (!foundContent) {
      throw new Error("Could not access public repository content. Ensure the repo is public and has a README.");
    }

    return content;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (isLoading || isFetchingRepo) return;

    const hasTopic = topic.trim().length > 0;
    const hasRepo = repoUrl.trim().length > 0;

    if (!hasTopic && !hasRepo) {
      setLocalError("Please provide an idea description or a GitHub repository URL.");
      return;
    }

    let finalContent = "";

    try {
      if (hasRepo) {
        setIsFetchingRepo(true);
        const repoContent = await fetchGithubContent(repoUrl);
        finalContent += `${repoContent}\n\n`;
      }

      if (hasTopic) {
        finalContent += `User Idea Description:\n${topic.trim()}`;
      }
      
      // Wait for fetch to finish before generating
      setIsFetchingRepo(false);
      onGenerate(finalContent);

    } catch (err) {
      setIsFetchingRepo(false);
      setLocalError(err instanceof Error ? err.message : "Failed to process request");
    }
  };

  const displayError = localError || error;
  const isActionable = topic.trim().length > 0 || repoUrl.trim().length > 0;

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 mb-4">
            <Sparkles className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            What are we building today?
          </h1>
          <p className="text-slate-500 text-lg">
            Describe your vision, connect a repo, or do both to create the perfect pitch.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Idea Input */}
          <div className="space-y-2">
             <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-indigo-500" />
                Describe your App Idea
             </label>
             <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., A mobile app connecting dog owners with local dog-friendly cafes..."
                className="w-full h-32 px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 resize-none transition-all placeholder:text-slate-400 text-base outline-none"
                disabled={isLoading || isFetchingRepo}
              />
          </div>

          {/* GitHub Input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Github className="w-4 h-4 text-slate-900" />
                GitHub Repository URL
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Link className="h-5 w-5 text-slate-500" />
                </div>
                <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/repository"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-400 text-base outline-none"
                    disabled={isLoading || isFetchingRepo}
                />
            </div>
             <p className="text-xs text-slate-400">Must be a public repository with a README.md</p>
          </div>

          {displayError && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!isActionable || isLoading || isFetchingRepo}
            className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200
              ${!isActionable || isLoading || isFetchingRepo
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-300 hover:-translate-y-0.5'
              }`}
          >
            {isLoading || isFetchingRepo ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{isFetchingRepo ? 'Reading Repository...' : 'Crafting Deck...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate Presentation</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">Fast</p>
                <p className="text-xs text-slate-500">Powered by Gemini 2.5 Flash</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">Structured</p>
                <p className="text-xs text-slate-500">Professional slide formats</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">Instant</p>
                <p className="text-xs text-slate-500">Ready to present in seconds</p>
            </div>
        </div>
      </div>
    </div>
  );
};