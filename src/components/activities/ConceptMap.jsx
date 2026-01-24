import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Network, CheckCircle, Maximize2, X, ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';

const ConceptMap = ({ data, onNext }) => {
  const chartRef = useRef(null);
  const modalRef = useRef(null); // The div that holds the SVG
  const containerRef = useRef(null); // The scrollable viewing window
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // --- PAN & ZOOM STATE ---
  const [scale, setScale] = useState(1.0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 1. Initialize & Render
  useEffect(() => {
    mermaid.initialize({ startOnLoad: true, theme: 'neutral', securityLevel: 'loose' });
    renderChart(chartRef.current);
  }, [data]);

  // 2. Handle Fullscreen Render
  useEffect(() => {
    if (isFullscreen) {
      setScale(1.0);
      setPosition({ x: 0, y: 0 }); // Center it
      setTimeout(() => {
        if (modalRef.current) renderChart(modalRef.current);
      }, 100);
    }
  }, [isFullscreen]);

  const renderChart = (element) => {
    if (element && data.mermaid_code) {
      try {
        element.innerHTML = ''; 
        const id = `mermaid-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        mermaid.render(id, data.mermaid_code).then(({ svg }) => {
          if (element) {
            element.innerHTML = svg;
            const svgEl = element.querySelector('svg');
            if (svgEl) {
              svgEl.style.height = 'auto';
              svgEl.style.maxWidth = 'none'; // Allow it to be HUGE
              svgEl.style.width = '100%';
            }
          }
        });
      } catch (err) {
        if (element) element.innerHTML = "<p class='text-red-400 p-4'>Error rendering diagram.</p>";
      }
    }
  };

  // --- ZOOM HANDLER (10% to 1000%) ---
  const handleZoom = (delta) => {
    setScale(prev => Math.min(Math.max(prev + delta, 0.1), 10.0));
  };

  // --- DRAG HANDLERS ---
  const handleMouseDown = (e) => {
    if (!isFullscreen) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    e.preventDefault(); // Stop text selection
  };

  const handleMouseMove = (e) => {
    if (isDragging && isFullscreen) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <>
      {/* --- NORMAL CARD VIEW --- */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-500 relative flex flex-col">
        <div className="bg-teal-600 p-6 text-white text-center">
          <h3 className="text-xl font-bold flex items-center justify-center gap-2">
            <Network /> Concept Map
          </h3>
          <p className="text-white/80 text-sm">Visualize the connections</p>
        </div>

        <div className="p-6 bg-gray-50 flex flex-col items-center flex-1">
          <h2 className="text-lg font-bold text-gray-800 mb-2 text-center">
            {data.title || "Structure of Concepts"}
          </h2>

          <div className="relative w-full group border border-gray-200 rounded-xl bg-white">
            <div ref={chartRef} className="w-full overflow-hidden flex justify-center py-8 px-4 max-h-[300px]" />
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl" 
              onClick={() => setIsFullscreen(true)}
            >
              <button className="bg-white text-teal-700 px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-2 transform hover:scale-105 transition border border-teal-100">
                <Maximize2 size={20} /> Full Screen
              </button>
            </div>
          </div>

          <button 
            onClick={() => onNext(true)}
            className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition shadow-md"
          >
            <CheckCircle size={20} /> I Understand
          </button>
        </div>
      </div>

      {/* --- FULLSCREEN MODAL --- */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-gray-100 flex flex-col animate-in fade-in duration-200 select-none">
          
          {/* Top Bar */}
          <div className="bg-teal-600 p-4 text-white flex justify-between items-center shadow-md z-20">
            <h3 className="font-bold flex items-center gap-2"><Network /> {data.title}</h3>
            <button onClick={() => setIsFullscreen(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition">
              <X size={24} />
            </button>
          </div>
          
          {/* DRAGGABLE VIEWPORT */}
          <div 
            ref={containerRef}
            className={`flex-1 overflow-hidden relative bg-gray-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
             {/* Instructions Overlay */}
             <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur text-xs px-3 py-1 rounded-full text-gray-500 pointer-events-none border border-gray-200 flex items-center gap-2">
                <Move size={12}/> Click & Drag to Move
             </div>

             {/* The Chart Container */}
             <div 
                ref={modalRef} 
                className="absolute origin-center transition-transform duration-75 ease-linear w-full h-full flex items-center justify-center p-20"
                style={{ 
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                }} 
             />
          </div>

          {/* CONTROLS */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl z-30">
            <button onClick={() => handleZoom(-0.5)} className="hover:text-teal-400 transition" title="Zoom Out">
              <ZoomOut size={24} />
            </button>

            <span className="font-mono font-bold min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>

            <button onClick={() => handleZoom(0.5)} className="hover:text-teal-400 transition" title="Zoom In">
              <ZoomIn size={24} />
            </button>

            <div className="w-[1px] h-6 bg-white/30 mx-2"></div>

            <button onClick={() => { setScale(1.0); setPosition({x:0,y:0}); }} className="hover:text-teal-400 transition" title="Reset View">
              <RotateCcw size={20} />
            </button>
          </div>

        </div>
      )}
    </>
  );
};

export default ConceptMap;