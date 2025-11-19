import React from 'react';
import { Upload } from 'lucide-react';
import { MemeTemplate } from '../types';

interface GalleryProps {
  onSelectTemplate: (url: string) => void;
  onUpload: (file: File) => void;
}

// Expanded meme templates list
const TEMPLATES: MemeTemplate[] = [
  { id: '1', name: 'Disaster Girl', url: 'https://i.imgflip.com/23ls.jpg' },
  { id: '2', name: 'Drake Hotline Bling', url: 'https://i.imgflip.com/30b1gx.jpg' },
  { id: '3', name: 'Two Buttons', url: 'https://i.imgflip.com/1g8my4.jpg' },
  { id: '4', name: 'Distracted Boyfriend', url: 'https://i.imgflip.com/1ur9b0.jpg' },
  { id: '5', name: 'Change My Mind', url: 'https://i.imgflip.com/24y43o.jpg' },
  { id: '6', name: 'Left Exit 12 Off Ramp', url: 'https://i.imgflip.com/22bdq6.jpg' },
  { id: '7', name: 'Expanding Brain', url: 'https://i.imgflip.com/1jwhww.jpg' },
  { id: '8', name: 'Mocking Spongebob', url: 'https://i.imgflip.com/1otk96.jpg' },
  { id: '9', name: 'Woman Yelling at Cat', url: 'https://i.imgflip.com/26am.jpg' },
  { id: '10', name: 'Bernie Support', url: 'https://i.imgflip.com/3oevdk.jpg' },
  { id: '11', name: 'Success Kid', url: 'https://i.imgflip.com/1bip.jpg' },
  { id: '12', name: 'Evil Kermit', url: 'https://i.imgflip.com/1e7ql7.jpg' },
  { id: '13', name: 'Futurama Fry', url: 'https://i.imgflip.com/1bgw.jpg' },
  { id: '14', name: 'Roll Safe Think About It', url: 'https://i.imgflip.com/1h7in3.jpg' },
  { id: '15', name: 'Hide the Pain Harold', url: 'https://i.imgflip.com/gk5el.jpg' },
  { id: '16', name: 'Waiting Skeleton', url: 'https://i.imgflip.com/2fm6x.jpg' },
  { id: '17', name: 'Is This a Pigeon?', url: 'https://i.imgflip.com/1w7ygt.jpg' },
  { id: '18', name: 'Batman Slapping Robin', url: 'https://i.imgflip.com/9ehk.jpg' },
  { id: '19', name: 'X, X Everywhere', url: 'https://i.imgflip.com/1ihzfe.jpg' },
  { id: '20', name: 'Tuxedo Winnie the Pooh', url: 'https://i.imgflip.com/2ybua0.jpg' },
  { id: '21', name: 'Buff Doge vs. Cheems', url: 'https://i.imgflip.com/43a45p.jpg' },
  { id: '22', name: 'Finding Neverland', url: 'https://i.imgflip.com/3pnmg.jpg' },
  { id: '23', name: 'Hard to Swallow Pills', url: 'https://i.imgflip.com/21uy0f.jpg' },
  { id: '24', name: 'Ight Imma Head Out', url: 'https://i.imgflip.com/32p3z2.jpg' },
  { id: '25', name: 'One Does Not Simply', url: 'https://i.imgflip.com/1bij.jpg' },
  { id: '26', name: 'Ancient Aliens', url: 'https://i.imgflip.com/26am.jpg' }
];

const Gallery: React.FC<GalleryProps> = ({ onSelectTemplate, onUpload }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
          MemeGenius AI
        </h1>
        <p className="text-gray-400 text-xl max-w-2xl mx-auto">
          Create viral memes with Magic Captions, Deep Analysis, Stickers, and Video.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {/* Upload Card */}
        <label className="group cursor-pointer relative flex flex-col items-center justify-center h-48 bg-slate-800 rounded-xl border-2 border-dashed border-slate-600 hover:border-purple-500 transition-all hover:bg-slate-750 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Upload className="w-10 h-10 text-slate-400 group-hover:text-purple-400 mb-3 z-10" />
          <span className="text-slate-300 font-semibold z-10">Upload Image</span>
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
        </label>

        {/* Template Cards */}
        {TEMPLATES.map((template) => (
          <div 
            key={template.id}
            onClick={() => onSelectTemplate(template.url)}
            className="group relative cursor-pointer rounded-xl overflow-hidden bg-slate-800 h-48 shadow-lg transition-transform hover:scale-[1.02] hover:shadow-purple-500/20"
          >
            <img 
              src={template.url} 
              alt={template.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white font-bold text-center px-2 text-sm">{template.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Gallery;