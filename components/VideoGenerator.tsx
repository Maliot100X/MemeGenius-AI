import React, { useState } from 'react';
import { Video, Loader2, AlertCircle } from 'lucide-react';
import { generateMemeVideo } from '../services/geminiService';
import { Spinner } from './Spinner';

const VideoGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    setVideoUrl(null);

    try {
      const url = await generateMemeVideo(prompt);
      setVideoUrl(url);
    } catch (e) {
      console.error(e);
      setError("Failed to generate video. This may be due to high demand or API limits.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-pink-500/20 rounded-lg">
            <Video className="w-6 h-6 text-pink-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">AI Video Generator</h2>
            <p className="text-slate-400 text-sm">Create 720p videos from text prompts using Gemini Veo</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Describe your video</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A cyberpunk cat DJing at a neon party..."
              className="w-full bg-slate-900 border border-slate-600 rounded-xl p-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-pink-500 outline-none h-32 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-3"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Generating Video (this may take a minute)...
              </>
            ) : (
              <>
                <Video className="w-6 h-6" />
                Generate Video
              </>
            )}
          </button>

          {videoUrl && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-lg font-bold text-white mb-4">Result</h3>
              <div className="rounded-xl overflow-hidden border border-slate-700 bg-black aspect-video shadow-2xl">
                <video 
                  src={videoUrl} 
                  controls 
                  autoPlay 
                  loop 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="mt-4 flex justify-end">
                <a 
                  href={videoUrl} 
                  download="meme-video.mp4"
                  className="text-pink-400 hover:text-pink-300 text-sm font-medium underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download Video
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;