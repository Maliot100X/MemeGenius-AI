import React, { useState, useRef, useEffect } from 'react';
import Gallery from './components/Gallery';
import MemeCanvas, { MemeCanvasHandle } from './components/MemeCanvas';
import { ViewState, EditorTab, AnalysisResult, Sticker } from './types';
import { generateMemeCaptions, editImageWithAI, analyzeImageDeeply, generateSticker } from './services/geminiService';
import { Sparkles, Wand2, Search, Download, ArrowLeft, Image as ImageIcon, Check, Sticker as StickerIcon, Trash2, Plus, Clapperboard } from 'lucide-react';
import { Spinner } from './components/Spinner';

// Define AI Studio window interface
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  
  interface Window {
    aistudio?: AIStudio;
  }
}

// Extend ViewState
enum AppView {
  GALLERY = 'GALLERY',
  EDITOR = 'EDITOR',
}

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.GALLERY);
  const [currentImage, setCurrentImage] = useState<string>(''); // Base64 or URL
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [activeTab, setActiveTab] = useState<EditorTab>(EditorTab.CAPTIONS);
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // AI States
  const [isProcessing, setIsProcessing] = useState(false);
  const [captions, setCaptions] = useState<string[]>([]);
  const [editPrompt, setEditPrompt] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Stickers State
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [processingSticker, setProcessingSticker] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const canvasRef = useRef<MemeCanvasHandle>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsCheckingAuth(true);
    try {
      // 1. Check if we are in AI Studio and have a key selected
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) {
          setIsAuthenticated(true);
          setIsCheckingAuth(false);
          return;
        }
      }

      // 2. Fallback: Check if API Key is baked into env (Vercel/Local)
      // Note: In Vite, process.env.API_KEY is replaced by string literal if defined
      if (process.env.API_KEY) {
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.error("Auth check failed", e);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogin = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // Re-check after modal closes
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) setIsAuthenticated(true);
      } catch (e) {
        console.error("Login failed", e);
        setError("Failed to sign in. Please try again.");
      }
    } else {
      // Fallback for environments without the AI Studio wrapper
      // We can't really "Sign in with Google" for an API Key here easily without a backend,
      // so we rely on the ENV var check. 
      alert("To use this app outside of Google AI Studio, please ensure the API_KEY environment variable is set in your deployment settings.");
    }
  };

  // Convert URL/File to Base64 for AI
  const toBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
    });
  };

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setCurrentImage(e.target.result as string);
        setView(AppView.EDITOR);
        resetEditor();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectTemplate = async (url: string) => {
    try {
      const base64 = await toBase64(url);
      setCurrentImage(base64);
      setView(AppView.EDITOR);
      resetEditor();
    } catch (e) {
      console.error("Failed to load template", e);
      setError("Could not load template. Try uploading an image instead.");
    }
  };

  const resetEditor = () => {
    setTopText('');
    setBottomText('');
    setCaptions([]);
    setEditPrompt('');
    setAnalysisResult(null);
    setStickers([]);
    setError(null);
    setActiveTab(EditorTab.CAPTIONS);
  };

  // --- AI Features ---

  const handleMagicCaption = async () => {
    if (!currentImage) return;
    setIsProcessing(true);
    setError(null);
    try {
      const generated = await generateMemeCaptions(currentImage);
      setCaptions(generated);
    } catch (e) {
      setError("Failed to generate magic captions. Please check your API key.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAIEdit = async () => {
    if (!currentImage || !editPrompt.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      const newImageBase64 = await editImageWithAI(currentImage, editPrompt);
      setCurrentImage(newImageBase64); 
      setEditPrompt('');
    } catch (e) {
      setError("Failed to edit image. Try a different prompt.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!currentImage) return;
    setIsProcessing(true);
    setError(null);
    try {
      const result = await analyzeImageDeeply(currentImage);
      setAnalysisResult(result);
    } catch (e) {
      setError("Failed to analyze image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateSticker = async (objectName: string) => {
    setProcessingSticker(objectName);
    setError(null);
    try {
      const stickerBase64 = await generateSticker(objectName);
      const newSticker: Sticker = {
        id: Date.now().toString(),
        url: stickerBase64,
        x: 150, 
        y: 150,
        width: 100,
        height: 100,
        rotation: 0
      };
      setStickers(prev => [...prev, newSticker]);
    } catch (e) {
      setError(`Failed to generate sticker for ${objectName}`);
    } finally {
      setProcessingSticker(null);
    }
  };

  const handleDownloadVideo = async () => {
    if (canvasRef.current) {
      setIsRecording(true);
      await canvasRef.current.record();
      setIsRecording(false);
    }
  };

  const removeSticker = (id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
  };

  const applyCaption = (caption: string) => {
    const parts = caption.split(/,|\n|\?|\!/);
    if (parts.length > 1 && caption.length > 30) {
        const mid = Math.floor(parts.length / 2);
        setTopText(parts.slice(0, mid+1).join(' ').trim());
        setBottomText(parts.slice(mid+1).join(' ').trim());
    } else {
        setTopText('');
        setBottomText(caption);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Spinner className="w-8 h-8 text-purple-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
         {/* Background decoration */}
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
         </div>

         <div className="z-10 max-w-md w-full bg-slate-800/50 backdrop-blur-lg p-8 rounded-2xl border border-slate-700 shadow-2xl text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-purple-500/20 transform rotate-3">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-4xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-slate-400">
              MemeGenius AI
            </h1>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Create viral masterpieces in seconds with Gemini 2.5, Nano Banana, and advanced image analysis.
            </p>

            <button
              onClick={handleLogin}
              className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] shadow-xl group"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="group-hover:text-purple-600 transition-colors">Sign in with Google</span>
            </button>
            
            <p className="text-[10px] text-slate-600 mt-6 tracking-wide uppercase font-semibold">
              Powered by Google Gemini
            </p>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Navigation Bar */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView(AppView.GALLERY)}>
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">MemeGenius AI</span>
            </div>
            
            <div className="hidden md:flex items-center gap-1 bg-slate-800 rounded-lg p-1">
              <button 
                onClick={() => setView(AppView.GALLERY)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === AppView.GALLERY ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Gallery
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {view === AppView.EDITOR && (
              <button 
                onClick={() => setView(AppView.GALLERY)}
                className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Gallery
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {view === AppView.GALLERY && (
          <Gallery onSelectTemplate={handleSelectTemplate} onUpload={handleUpload} />
        )}

        {view === AppView.EDITOR && (
          <div className="max-w-7xl mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Canvas & Standard Controls */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 shadow-xl flex items-center justify-center min-h-[400px] relative">
                 {currentImage && (
                   <MemeCanvas 
                     ref={canvasRef}
                     imageSrc={currentImage}
                     topText={topText}
                     bottomText={bottomText}
                     stickers={stickers}
                     onStickersChange={setStickers}
                   />
                 )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Top Text</label>
                  <input 
                    type="text" 
                    value={topText}
                    onChange={(e) => setTopText(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all font-bold"
                    placeholder="TOP TEXT"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bottom Text</label>
                  <input 
                    type="text" 
                    value={bottomText}
                    onChange={(e) => setBottomText(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all font-bold"
                    placeholder="BOTTOM TEXT"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => canvasRef.current?.download()}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99]"
                >
                  <Download className="w-5 h-5" /> Download Image
                </button>
                 <button 
                  onClick={handleDownloadVideo}
                  disabled={isRecording}
                  className="flex-1 bg-pink-600 hover:bg-pink-500 disabled:bg-pink-600/50 text-white font-bold py-4 rounded-xl shadow-lg shadow-pink-900/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99]"
                >
                  {isRecording ? <Spinner /> : <Clapperboard className="w-5 h-5" />}
                  {isRecording ? 'Recording...' : 'Download Video (Free)'}
                </button>
              </div>
            </div>

            {/* Right Column: AI Tools */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden flex flex-col h-[600px]">
              {/* Tabs */}
              <div className="flex border-b border-slate-700">
                <button 
                  onClick={() => setActiveTab(EditorTab.CAPTIONS)}
                  className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === EditorTab.CAPTIONS ? 'text-purple-400 bg-slate-700/50 border-b-2 border-purple-500' : 'text-slate-400 hover:bg-slate-750'}`}
                >
                  <Sparkles className="w-4 h-4" /> 
                </button>
                <button 
                  onClick={() => setActiveTab(EditorTab.EDIT)}
                  className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === EditorTab.EDIT ? 'text-blue-400 bg-slate-700/50 border-b-2 border-blue-500' : 'text-slate-400 hover:bg-slate-750'}`}
                >
                  <Wand2 className="w-4 h-4" /> 
                </button>
                <button 
                  onClick={() => setActiveTab(EditorTab.ANALYZE)}
                  className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === EditorTab.ANALYZE ? 'text-orange-400 bg-slate-700/50 border-b-2 border-orange-500' : 'text-slate-400 hover:bg-slate-750'}`}
                >
                  <Search className="w-4 h-4" /> 
                </button>
                 <button 
                  onClick={() => setActiveTab(EditorTab.STICKERS)}
                  className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === EditorTab.STICKERS ? 'text-pink-400 bg-slate-700/50 border-b-2 border-pink-500' : 'text-slate-400 hover:bg-slate-750'}`}
                >
                  <StickerIcon className="w-4 h-4" /> 
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                
                {error && (
                   <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-3 rounded-lg mb-4 text-sm">
                     {error}
                   </div>
                )}

                {/* Magic Captions Tab */}
                {activeTab === EditorTab.CAPTIONS && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg text-white">Magic Captions</h3>
                    <p className="text-sm text-slate-400">
                      Let AI analyze the image context and suggest viral captions.
                    </p>
                    
                    <button 
                      onClick={handleMagicCaption}
                      disabled={isProcessing}
                      className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white py-3 rounded-lg font-semibold shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <Spinner /> : <Sparkles className="w-4 h-4" />}
                      {isProcessing ? 'Thinking...' : 'Generate Suggestions'}
                    </button>

                    <div className="space-y-2 mt-4">
                      {captions.map((caption, idx) => (
                        <button
                          key={idx}
                          onClick={() => applyCaption(caption)}
                          className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-200 border border-slate-600 transition-colors flex items-start gap-3 group"
                        >
                          <span className="bg-slate-800 text-slate-400 w-5 h-5 flex-shrink-0 rounded flex items-center justify-center text-xs mt-0.5 group-hover:text-white">{idx + 1}</span>
                          {caption}
                        </button>
                      ))}
                      {captions.length === 0 && !isProcessing && (
                        <div className="text-center py-10 text-slate-600 italic">
                          No captions yet. Hit generate!
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Edit Tab */}
                {activeTab === EditorTab.EDIT && (
                  <div className="space-y-4">
                     <h3 className="font-bold text-lg text-white">AI Remix</h3>
                     <div className="flex items-center gap-2 mb-2">
                       <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs font-bold border border-yellow-500/30">NANO BANANA</span>
                       <p className="text-sm text-slate-400">Gemini 2.5 Flash Image</p>
                     </div>
                     <p className="text-sm text-slate-300">
                      Modify the image using natural language. E.g., "Add a retro VHS filter" or "Make the cat wear sunglasses".
                    </p>
                    
                    <textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="Describe your edit..."
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                    />

                    <button 
                      onClick={handleAIEdit}
                      disabled={isProcessing || !editPrompt.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white py-3 rounded-lg font-semibold shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <Spinner /> : <Wand2 className="w-4 h-4" />}
                      {isProcessing ? 'Processing...' : 'Apply AI Edit'}
                    </button>
                  </div>
                )}

                {/* Analyze Tab */}
                {activeTab === EditorTab.ANALYZE && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg text-white">Deep Analysis</h3>
                    <div className="flex items-center gap-2 mb-2">
                       <span className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 text-xs font-bold border border-indigo-500/30">GEMINI 2.5</span>
                    </div>
                    <p className="text-sm text-slate-400">
                      Get a deep understanding of the visual elements.
                    </p>

                    <button 
                      onClick={handleAnalyze}
                      disabled={isProcessing}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white py-3 rounded-lg font-semibold shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <Spinner /> : <Search className="w-4 h-4" />}
                      {isProcessing ? 'Analyzing...' : 'Analyze Image'}
                    </button>

                    {analysisResult && (
                      <div className="space-y-4 mt-4">
                         <div className="bg-slate-700/50 rounded-lg p-3 text-sm text-slate-300 leading-relaxed border border-slate-600 whitespace-pre-wrap">
                          {analysisResult.description}
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Detected Objects</h4>
                          <div className="flex flex-wrap gap-2">
                             {analysisResult.detectedObjects.length > 0 ? (
                               analysisResult.detectedObjects.map((obj, idx) => (
                                 <button
                                  key={idx}
                                  onClick={() => handleGenerateSticker(obj)}
                                  disabled={!!processingSticker}
                                  className="px-3 py-1.5 bg-slate-700 hover:bg-purple-600/20 hover:text-purple-300 hover:border-purple-500/50 rounded-full text-xs border border-slate-600 transition-all flex items-center gap-2"
                                 >
                                   {obj}
                                   {processingSticker === obj ? <Spinner className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                 </button>
                               ))
                             ) : (
                               <span className="text-slate-500 text-xs">No objects detected.</span>
                             )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-2">Click an object to create a sticker.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Stickers Tab */}
                 {activeTab === EditorTab.STICKERS && (
                  <div className="space-y-4">
                     <h3 className="font-bold text-lg text-white">Stickers</h3>
                     <p className="text-sm text-slate-400">
                      Manage active stickers on your meme. You can drag them on the canvas.
                    </p>

                    {stickers.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-slate-700 rounded-lg">
                        <StickerIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No stickers yet.</p>
                        <button 
                           onClick={() => setActiveTab(EditorTab.ANALYZE)} 
                           className="text-purple-400 text-xs hover:underline mt-2"
                        >
                          Go to Analyze to create some
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                         {stickers.map((sticker, i) => (
                           <div key={sticker.id} className="flex items-center justify-between bg-slate-700/50 p-2 rounded-lg border border-slate-700">
                              <div className="flex items-center gap-2">
                                <img src={sticker.url} alt="Sticker" className="w-8 h-8 object-contain bg-slate-800 rounded" />
                                <span className="text-xs text-slate-300">Sticker {i + 1}</span>
                              </div>
                              <button 
                                onClick={() => removeSticker(sticker.id)}
                                className="text-slate-500 hover:text-red-400 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                         ))}
                         <button 
                           onClick={() => setStickers([])}
                           className="text-xs text-red-400 hover:text-red-300 w-full text-center mt-4"
                         >
                           Clear All Stickers
                         </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default App;