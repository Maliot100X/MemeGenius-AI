import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { Sticker } from '../types';

interface MemeCanvasProps {
  imageSrc: string;
  topText: string;
  bottomText: string;
  stickers: Sticker[];
  onStickersChange: (stickers: Sticker[]) => void;
  className?: string;
}

export interface MemeCanvasHandle {
  download: () => void;
  record: () => Promise<void>;
  getDataUrl: () => string;
}

const MemeCanvas = forwardRef<MemeCanvasHandle, MemeCanvasProps>(({ imageSrc, topText, bottomText, stickers, onStickersChange, className }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Cache for sticker images to prevent reloading on every render
  const stickerImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useImperativeHandle(ref, () => ({
    download: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `meme-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    },
    record: async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Create a stream from the canvas
      const stream = canvas.captureStream(30); // 30 FPS
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meme-video-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      // Record for 3 seconds (simulating a "live" meme or just converting to video format)
      mediaRecorder.start();
      // Force a few redraws if needed to keep stream active, though captureStream usually handles static
      setTimeout(() => {
        mediaRecorder.stop();
      }, 3000);
    },
    getDataUrl: () => {
      return canvasRef.current?.toDataURL('image/png') || '';
    }
  }));

  // Load sticker images when the sticker list changes
  useEffect(() => {
    stickers.forEach(sticker => {
      if (!stickerImagesRef.current.has(sticker.id)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = sticker.url;
        img.onload = () => {
           drawCanvas(); 
        };
        stickerImagesRef.current.set(sticker.id, img);
      }
    });
    
    // Cleanup unused images
    const currentIds = new Set(stickers.map(s => s.id));
    for (const id of stickerImagesRef.current.keys()) {
      if (!currentIds.has(id)) {
        stickerImagesRef.current.delete(id);
      }
    }
  }, [stickers]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;

    if (!img.complete) {
        img.onload = drawCanvas;
    }

    const MAX_WIDTH = 800; 
    const scale = Math.min(1, MAX_WIDTH / img.width);
    
    if (canvas.width !== img.width * scale || canvas.height !== img.height * scale) {
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Draw Background Image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw Stickers
    stickers.forEach(sticker => {
      const sImg = stickerImagesRef.current.get(sticker.id);
      if (sImg && sImg.complete) {
        ctx.save();
        ctx.translate(sticker.x, sticker.y);
        ctx.rotate((sticker.rotation * Math.PI) / 180);
        // Draw image centered at x,y
        ctx.drawImage(sImg, -sticker.width / 2, -sticker.height / 2, sticker.width, sticker.height);
        
        // Draw selection outline if dragging
        if (draggingId === sticker.id) {
            ctx.strokeStyle = '#a855f7'; // purple-500
            ctx.lineWidth = 2;
            ctx.strokeRect(-sticker.width / 2, -sticker.height / 2, sticker.width, sticker.height);
        }
        ctx.restore();
      }
    });

    // Configure Text Styles
    const fontSize = Math.floor(canvas.width * 0.1); 
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = Math.floor(fontSize / 8);
    ctx.textAlign = 'center';
    ctx.font = `900 ${fontSize}px Impact, sans-serif`;
    ctx.lineJoin = 'round';

    const drawText = (text: string, y: number, baseline: CanvasTextBaseline) => {
      if (!text) return;
      const x = canvas.width / 2;
      ctx.textBaseline = baseline;
      
      const words = text.toUpperCase().split(' ');
      let line = '';
      const maxWidth = canvas.width * 0.95;
      const lineHeight = fontSize * 1.2;
      const lines: string[] = [];

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      let currentY = y;
      if (baseline === 'bottom') {
         currentY = y - ((lines.length - 1) * lineHeight);
      }

      lines.forEach((l, i) => {
        ctx.strokeText(l, x, currentY + (i * lineHeight));
        ctx.fillText(l, x, currentY + (i * lineHeight));
      });
    };

    drawText(topText, canvas.height * 0.05, 'top');
    drawText(bottomText, canvas.height * 0.95, 'bottom');
  };

  // Redraw whenever props change
  useEffect(() => {
    drawCanvas();
  }); 

  const getMousePos = (evt: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    for (let i = stickers.length - 1; i >= 0; i--) {
      const s = stickers[i];
      if (
        pos.x >= s.x - s.width / 2 &&
        pos.x <= s.x + s.width / 2 &&
        pos.y >= s.y - s.height / 2 &&
        pos.y <= s.y + s.height / 2
      ) {
        setDraggingId(s.id);
        setDragOffset({ x: pos.x - s.x, y: pos.y - s.y });
        return;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId) return;
    const pos = getMousePos(e);
    
    const newStickers = stickers.map(s => {
      if (s.id === draggingId) {
        return {
          ...s,
          x: pos.x - dragOffset.x,
          y: pos.y - dragOffset.y
        };
      }
      return s;
    });
    
    onStickersChange(newStickers);
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  const handleMouseLeave = () => {
    setDraggingId(null);
  };

  return (
    <canvas 
      ref={canvasRef} 
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className={`max-w-full h-auto shadow-2xl rounded-lg bg-gray-800 cursor-crosshair ${className}`}
    />
  );
});

MemeCanvas.displayName = 'MemeCanvas';
export default MemeCanvas;