import React, { useState, useEffect, useRef } from 'react';
import {
  Type,
  PenTool,
  Layers,
  Grid,
  Sparkles,
  Sliders,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronRight,
  Palette,
  Maximize2,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Download,
  BookOpen,
  Zap,
  SlidersHorizontal,
  Circle,
  Square,
  Triangle,
  Move,
  ZoomIn,
  ZoomOut,
  Settings,
  HelpCircle,
  Edit3,
  List,
  Compass,
  CornerUpLeft,
  Share2,
  Play
} from 'lucide-react';

export default function App() {
  // Main Mode State
  const [activeMode, setActiveMode] = useState('drawings'); // 'drawings' | 'letters'
  
  // AI Autonomy Level (1 to 4)
  const [autonomyLevel, setAutonomyLevel] = useState(2); // 1: Passivo, 2: Assistido, 3: Semi-Autônomo, 4: Agente Autônomo

  // ==========================================
  // DRAWINGS STATE & MATRIX
  // ==========================================
  const [drawingStyle, setDrawingStyle] = useState('blueprint'); // 'blueprint', 'technical_cad', 'watercolor', 'ink_nanquim', 'pencil_hb'
  const [showGrid, setShowGrid] = useState(true);
  const [showBadges, setShowBadges] = useState(true);
  const [selectedCell, setSelectedCell] = useState(null); // e.g. 'B2'
  const [selectedElementId, setSelectedElementId] = useState(null); // e.g. 1, 2, 3
  const [drawingTab, setDrawingTab] = useState('analysis'); // 'analysis', 'elements', 'colors', 'perspective'

  // Drawing Elements Store
  const [elements, setElements] = useState([
    { id: 1, name: 'Eixo Estrutural Principal', type: 'line', cell: 'A1', color: '#3b82f6', strokeWidth: 2, x: 50, y: 80, width: 280, height: 0, rotation: 0, opacity: 1 },
    { id: 2, name: 'Módulo Habitacional A', type: 'rect', cell: 'B2', color: '#60a5fa', strokeWidth: 2, fill: 'rgba(59, 130, 246, 0.1)', x: 140, y: 120, width: 120, height: 100, rotation: 0, opacity: 1 },
    { id: 3, name: 'Logotipo do Projeto Vector', type: 'text', cell: 'D1', text: 'PROJECT ALPHA // ABNT', color: '#93c5fd', fontSize: 12, x: 320, y: 50, opacity: 1 },
    { id: 4, name: 'Núcleo de Circulação Cilíndrico', type: 'circle', cell: 'C3', color: '#34d399', strokeWidth: 2, fill: 'rgba(52, 211, 153, 0.15)', x: 260, y: 240, radius: 45, opacity: 1 },
    { id: 5, name: 'Simbologia de Cota e Escala', type: 'triangle', cell: 'C2', color: '#f59e0b', strokeWidth: 1.5, fill: 'transparent', x: 220, y: 160, size: 30, opacity: 1 }
  ]);

  // Global Drawing Modifications Log
  const [globalModifications, setGlobalModifications] = useState([
    { id: 101, source: 'Local #2 (B2)', action: 'Ajustada saturação e espessura do traço', impact: '+4% Harmonia' },
    { id: 102, source: 'Local #4 (C3)', action: 'Alinhamento com grelha estrutural', impact: '+8% Rigor Técnico' }
  ]);

  // AI Prompt Input for Local/Global modification
  const [drawPrompt, setDrawPrompt] = useState('');
  const [isProcessingDraw, setIsProcessingDraw] = useState(false);

  // ==========================================
  // LETTERS STATE & LINGUISTICS
  // ==========================================
  const [lettersText, setLettersText] = useState(
    `A equipe de engenharia finalizaram o relatório técnico na semana passada. Embora o projeto apresentou inconsistências graves na estrutura principal, nós tínhamos a convicção de que os resultados iriam ser satisfatórios. Chegamos no local do evento às 14h para analisar o imprevisto, de modo que os diretores assistiram o teste com atenção.`
  );

  const [lettersTab, setLettersTab] = useState('grammar'); // 'grammar', 'syntax', 'verbs', 'coherence'
  const [selectedWord, setSelectedWord] = useState(null);
  const [selectedParagraph, setSelectedParagraph] = useState(0);

  // Grammar suggestions / errors list
  const [suggestions, setSuggestions] = useState([
    {
      id: 1,
      type: 'concordance',
      category: 'Concordância Verbal',
      target: 'A equipe de engenharia finalizaram',
      replacement: 'A equipe de engenharia finalizou',
      explanation: 'O sujeito coletivo no singular "A equipe" exige o verbo no singular "finalizou", mesmo acompanhado de adjunto no plural ("de engenharia").',
      rule: 'Regra de Concordância Verbal com Sujeito Coletivo Singular.',
      severity: 'error'
    },
    {
      id: 2,
      type: 'subjunctive',
      category: 'Modo Verbal e Correlação',
      target: 'Embora o projeto apresentou',
      replacement: 'Embora o projeto tenha apresentado',
      explanation: 'A conjunção subordinativa concessiva "Embora" exige o verbo no Modo Subjuntivo ("tenha apresentado" ou "apresentasse").',
      rule: 'Sintaxe de Regência de Conjunções Concessivas (Subjuntivo).',
      severity: 'warning'
    },
    {
      id: 3,
      type: 'regency',
      category: 'Regência Verbal e Crase',
      target: 'Chegamos no local',
      replacement: 'Chegamos ao local',
      explanation: 'O verbo "Chegar" rege a preposição "a" para indicação de destino ou lugar de chegada, e não a preposição "em".',
      rule: 'Regência Verbal Padrão da Língua Portuguesa (Verbos de Movimento).',
      severity: 'warning'
    },
    {
      id: 4,
      type: 'regency_transitive',
      category: 'Regência Verbal Directa/Indirecta',
      target: 'assistiram o teste',
      replacement: 'assistiram ao teste',
      explanation: 'No sentido de "presenciar" ou "ver", o verbo "Assistir" é transitivo indireto e exige a preposição "a".',
      rule: 'Regência do Verbo Assistir (Sentido de presenciar).',
      severity: 'error'
    }
  ]);

  // Add a new element to Drawing
  const handleAddElement = (type) => {
    const newId = elements.length ? Math.max(...elements.map(e => e.id)) + 1 : 1;
    const cells = ['A1', 'A2', 'B2', 'C1', 'C3', 'D2', 'D4'];
    const randomCell = cells[Math.floor(Math.random() * cells.length)];
    
    let newElem = {
      id: newId,
      name: `Novo Elemento #${newId} (${type})`,
      type: type,
      cell: randomCell,
      color: '#ec4899',
      strokeWidth: 2,
      x: 100 + (newId * 20) % 200,
      y: 100 + (newId * 15) % 150,
      opacity: 1
    };

    if (type === 'rect') { newElem.width = 90; newElem.height = 70; newElem.fill = 'rgba(236,72,153,0.1)'; }
    if (type === 'circle') { newElem.radius = 35; newElem.fill = 'rgba(236,72,153,0.15)'; }
    if (type === 'line') { newElem.width = 150; newElem.height = 0; }
    if (type === 'text') { newElem.text = `ELEMENT #${newId}`; newElem.fontSize = 14; }

    setElements([...elements, newElem]);
    setSelectedElementId(newId);
  };

  // Modify individual element locally
  const handleUpdateElement = (id, key, value) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, [key]: value } : el));
  };

  // Run AI Local / Global Drawing Transformation
  const handleApplyAITransformation = () => {
    if (!drawPrompt.trim()) return;
    setIsProcessingDraw(true);

    setTimeout(() => {
      if (selectedElementId) {
        // Local Transformation
        setElements(prev => prev.map(el => {
          if (el.id === selectedElementId) {
            return {
              ...el,
              color: '#10b981',
              strokeWidth: 3
            };
          }
          return el;
        }));
        setGlobalModifications(prev => [
          { id: Date.now(), source: `Local #${selectedElementId}`, action: `Transformação IA: "${drawPrompt}"`, impact: '+5% Coerência Viso-Espacial' },
          ...prev
        ]);
      } else {
        // Global Transformation
        setElements(prev => prev.map(el => ({
          ...el,
          strokeWidth: Math.max(1, el.strokeWidth + (Math.random() > 0.5 ? 0.5 : -0.5))
        })));
        setGlobalModifications(prev => [
          { id: Date.now(), source: 'Soma Global', action: `Harmonização Sistêmica: "${drawPrompt}"`, impact: '+12% Qualidade Global' },
          ...prev
        ]);
      }
      setIsProcessingDraw(false);
      setDrawPrompt('');
    }, 800);
  };

  // Apply grammar fix directly to text
  const handleApplyFix = (suggestion) => {
    setLettersText(prev => prev.replace(suggestion.target, suggestion.replacement));
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  };

  // Get highlighted words with POS tagging simulation
  const renderGrammarHighlightedText = () => {
    const words = lettersText.split(/(\s+)/);

    // Mock POS dictionary
    const posDict = {
      'engenharia': { pos: 'Substantivo', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
      'relatório': { pos: 'Substantivo', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
      'projeto': { pos: 'Substantivo', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
      'finalizaram': { pos: 'Verbo (Pretérito Perfeito)', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
      'apresentou': { pos: 'Verbo (Pretérito Perfeito)', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
      'tínhamos': { pos: 'Verbo (Pretérito Imperfeito)', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
      'graves': { pos: 'Adjetivo', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
      'satisfatórios': { pos: 'Adjetivo', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
      'Embora': { pos: 'Conjunção Concessiva', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
      'nós': { pos: 'Pronome Pessoal', color: 'bg-pink-500/20 text-pink-300 border-pink-500/40' }
    };

    return words.map((word, idx) => {
      const cleanWord = word.replace(/[.,;!?]/g, '');
      const item = posDict[cleanWord];

      // Check if word is inside an active error target
      const activeError = suggestions.find(s => s.target.includes(cleanWord));

      if (activeError && cleanWord.length > 2) {
        return (
          <span
            key={idx}
            className={`cursor-pointer underline decoration-wavy px-1 py-0.5 rounded transition-all ${
              activeError.severity === 'error' ? 'decoration-red-500 bg-red-500/10 hover:bg-red-500/20' : 'decoration-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
            }`}
            onClick={() => setSelectedWord({ text: cleanWord, pos: activeError.category, info: activeError.explanation })}
          >
            {word}
          </span>
        );
      }

      if (item) {
        return (
          <span
            key={idx}
            className={`cursor-pointer border-b px-1 py-0.5 mx-0.5 rounded text-xs font-mono inline-block transition-all ${item.color}`}
            onClick={() => setSelectedWord({ text: cleanWord, pos: item.pos, info: `Análise Gramatical: Classe Gramatical mapeada como ${item.pos}.` })}
          >
            {word}
          </span>
        );
      }

      return <span key={idx}>{word}</span>;
    });
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      
      {/* ========================================================= */}
      {/* WORK STATION HEADER & MAIN SWITCHER                       */}
      {/* ========================================================= */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 z-30 shadow-md">
        
        {/* Left: Platform Title & Mode Selector */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              WS
            </div>
            <div>
              <h1 className="text-base font-bold tracking-wide text-slate-100 flex items-center gap-1.5">
                WORK STATION <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-mono">v4.2 AI</span>
              </h1>
              <p className="text-xs text-slate-400">Integrated Creation Architecture</p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* Mode Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveMode('drawings')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMode === 'drawings'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span>DRAWINGS (Vector Matrix)</span>
            </button>

            <button
              onClick={() => setActiveMode('letters')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMode === 'letters'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>LETTERS (Linguística Profunda)</span>
            </button>
          </div>
        </div>

        {/* Center: AI Autonomy Slider */}
        <div className="flex items-center space-x-3 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800/80">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <div className="flex flex-col">
            <div className="flex items-center justify-between text-xs w-48 mb-1">
              <span className="text-slate-400 font-medium">Autonomia IA:</span>
              <span className="font-mono font-bold text-amber-400">
                Nível {autonomyLevel}: {
                  autonomyLevel === 1 ? 'Passivo' :
                  autonomyLevel === 2 ? 'Assistido' :
                  autonomyLevel === 3 ? 'Semi-Autônomo' : 'Agente Autônomo'
                }
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="4"
              value={autonomyLevel}
              onChange={(e) => setAutonomyLevel(Number(e.target.value))}
              className="w-48 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-3 text-xs">
          <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700">
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartilhar</span>
          </button>
          <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors shadow-sm">
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MAIN BODY LAYOUT                                          */}
      {/* ========================================================= */}
      <div className="flex flex-1 overflow-hidden">

        {/* ======================================================= */}
        {/* MODE 1: DRAWINGS MODULE                                 */}
        {/* ======================================================= */}
        {activeMode === 'drawings' && (
          <div className="flex w-full h-full">

            {/* DRAWING CANVAS AREA */}
            <div className="flex-1 bg-slate-950 flex flex-col relative overflow-hidden">
              
              {/* Canvas Bar Controls */}
              {}
              <div className="h-12 bg-slate-900/80 border-b border-slate-800/80 px-4 flex items-center justify-between text-xs backdrop-blur-sm z-10">
                <div className="flex items-center space-x-4">
                  <span className="text-slate-400 flex items-center gap-1 font-mono">
                    <Grid className="w-3.5 h-3.5 text-indigo-400" /> Matriz 4x4 (A1:D4)
                  </span>

                  <div className="h-4 w-px bg-slate-800" />

                  {/* Grid Toggle */}
                  <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={(e) => setShowGrid(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                    />
                    <span>Grade de Unidades</span>
                  </label>

                  {/* Badge Toggle */}
                  <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={showBadges}
                      onChange={(e) => setShowBadges(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                    />
                    <span>Numerador de Elementos (#ID)</span>
                  </label>
                </div>

                {/* Quick Add Elements */}
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 font-mono text-[11px]">Adicionar Elemento:</span>
                  <button onClick={() => handleAddElement('rect')} className="p-1.5 bg-slate-800 hover:bg-indigo-600/30 hover:border-indigo-500 text-slate-300 rounded border border-slate-700 transition-all" title="Retângulo">
                    <Square className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleAddElement('circle')} className="p-1.5 bg-slate-800 hover:bg-indigo-600/30 hover:border-indigo-500 text-slate-300 rounded border border-slate-700 transition-all" title="Círculo">
                    <Circle className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleAddElement('triangle')} className="p-1.5 bg-slate-800 hover:bg-indigo-600/30 hover:border-indigo-500 text-slate-300 rounded border border-slate-700 transition-all" title="Triângulo">
                    <Triangle className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleAddElement('text')} className="p-1.5 bg-slate-800 hover:bg-indigo-600/30 hover:border-indigo-500 text-slate-300 rounded border border-slate-700 transition-all" title="Texto Técnico">
                    <Type className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Interactive Vector Canvas Screen */}
              {}
              <div className={`flex-1 relative flex items-center justify-center p-6 overflow-auto ${
                drawingStyle === 'blueprint' ? 'bg-[#0a192f]' :
                drawingStyle === 'technical_cad' ? 'bg-slate-900' :
                drawingStyle === 'watercolor' ? 'bg-amber-50/10' :
                drawingStyle === 'ink_nanquim' ? 'bg-zinc-950' : 'bg-slate-950'
              }`}>

                {/* Main Drawing Area Container */}
                <div className="relative w-[640px] h-[480px] border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden bg-slate-950/60 backdrop-blur">
                  
                  {/* Grid Matrix Overlay (4x4) */}
                  {showGrid && (
                    <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none z-10 border border-indigo-500/20">
                      {['A', 'B', 'C', 'D'].map((row, rIdx) =>
                        [1, 2, 3, 4].map((col) => {
                          const cellId = `${row}${col}`;
                          const isSelected = selectedCell === cellId;
                          return (
                            <div
                              key={cellId}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCell(isSelected ? null : cellId);
                              }}
                              className={`border border-indigo-500/15 p-1 relative pointer-events-auto cursor-pointer transition-colors ${
                                isSelected ? 'bg-indigo-500/20 border-indigo-400/60' : 'hover:bg-indigo-500/5'
                              }`}
                            >
                              <span className={`font-mono text-[10px] font-bold px-1 rounded ${
                                isSelected ? 'bg-indigo-500 text-white' : 'text-indigo-400/60 bg-slate-900/60'
                              }`}>
                                {cellId}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Render Drawing Elements */}
                  <svg className="w-full h-full absolute inset-0 z-0">
                    <defs>
                      <pattern id="hatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="0" x2="0" y2="10" stroke="#3b82f6" strokeWidth="1" opacity="0.2" />
                      </pattern>
                    </defs>

                    {elements.map((el) => {
                      const isSelected = selectedElementId === el.id;

                      return (
                        <g
                          key={el.id}
                          onClick={() => setSelectedElementId(el.id)}
                          className="cursor-pointer group"
                        >
                          {/* Rectangle */}
                          {el.type === 'rect' && (
                            <rect
                              x={el.x}
                              y={el.y}
                              width={el.width}
                              height={el.height}
                              fill={el.fill || 'transparent'}
                              stroke={isSelected ? '#f59e0b' : el.color}
                              strokeWidth={isSelected ? el.strokeWidth + 1.5 : el.strokeWidth}
                              strokeDasharray={drawingStyle === 'blueprint' ? '4 2' : 'none'}
                              opacity={el.opacity}
                              className="transition-all duration-200 hover:stroke-amber-400"
                            />
                          )}

                          {/* Circle */}
                          {el.type === 'circle' && (
                            <circle
                              cx={el.x}
                              cy={el.y}
                              r={el.radius}
                              fill={el.fill || 'transparent'}
                              stroke={isSelected ? '#f59e0b' : el.color}
                              strokeWidth={isSelected ? el.strokeWidth + 1.5 : el.strokeWidth}
                              opacity={el.opacity}
                              className="transition-all duration-200 hover:stroke-amber-400"
                            />
                          )}

                          {/* Line */}
                          {el.type === 'line' && (
                            <line
                              x1={el.x}
                              y1={el.y}
                              x2={el.x + el.width}
                              y2={el.y + el.height}
                              stroke={isSelected ? '#f59e0b' : el.color}
                              strokeWidth={isSelected ? el.strokeWidth + 1.5 : el.strokeWidth}
                              opacity={el.opacity}
                            />
                          )}

                          {/* Triangle */}
                          {el.type === 'triangle' && (
                            <polygon
                              points={`${el.x},${el.y} ${el.x - el.size},${el.y + el.size * 1.5} ${el.x + el.size},${el.y + el.size * 1.5}`}
                              fill={el.fill || 'transparent'}
                              stroke={isSelected ? '#f59e0b' : el.color}
                              strokeWidth={isSelected ? el.strokeWidth + 1.5 : el.strokeWidth}
                              opacity={el.opacity}
                            />
                          )}

                          {/* Text */}
                          {el.type === 'text' && (
                            <text
                              x={el.x}
                              y={el.y}
                              fill={isSelected ? '#f59e0b' : el.color}
                              fontSize={el.fontSize}
                              fontFamily="monospace"
                              fontWeight="bold"
                              opacity={el.opacity}
                            >
                              {el.text}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {/* Element Badges (#ID) Floating Layer */}
                  {showBadges && elements.map((el) => {
                    const isSelected = selectedElementId === el.id;
                    return (
                      <div
                        key={el.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                        }}
                        style={{ left: `${el.x - 10}px`, top: `${el.y - 12}px` }}
                        className={`absolute z-20 cursor-pointer flex items-center space-x-1 px-1.5 py-0.5 rounded-full font-mono text-[10px] font-extrabold shadow-md transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 scale-110 ring-2 ring-amber-300'
                            : 'bg-slate-900/90 text-slate-200 border border-slate-700 hover:border-indigo-400'
                        }`}
                      >
                        <span>#{el.id}</span>
                        <span className="text-[8px] opacity-75">({el.cell})</span>
                      </div>
                    );
                  })}

                </div>

                {/* Bottom Canvas Context Toolbar */}
                <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl text-xs backdrop-blur-md">
                  <div className="flex items-center space-x-3 text-slate-400 font-mono">
                    <span>Estilo Ativo:</span>
                    <span className="text-indigo-400 font-bold capitalize">{drawingStyle.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>Elementos Totais: <strong className="text-white">{elements.length}</strong></span>
                    <span>•</span>
                    <span>Unidade Selecionada: <strong className="text-amber-400">{selectedCell || 'Nenhuma (Global)'}</strong></span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => { setSelectedCell(null); setSelectedElementId(null); }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]"
                    >
                      Limpar Seleção
                    </button>
                  </div>
                </div>

              </div>

              {/* Bottom Quick AI Command Bar */}
              {}
              <div className="bg-slate-900 border-t border-slate-800 p-3 flex items-center space-x-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={drawPrompt}
                    onChange={(e) => setDrawPrompt(e.target.value)}
                    placeholder={
                      selectedElementId
                        ? `Aplicar modificação local no Elemento #${selectedElementId} (ex: Mudar tom para esmeralda, aumentar espessura)...`
                        : `Aplicar modificação global em todo o desenho (ex: Harmonizar cores, converter para linhas técnicas ABNT)...`
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                  {selectedElementId && (
                    <span className="absolute right-3 top-2 text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-mono">
                      Escopo Local: #{selectedElementId}
                    </span>
                  )}
                </div>

                <button
                  onClick={handleApplyAITransformation}
                  disabled={isProcessingDraw}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                >
                  {isProcessingDraw ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{selectedElementId ? 'Modificar Local' : 'Executar Global'}</span>
                </button>
              </div>

            </div>

            {/* DRAWINGS RIGHT PANEL (INSPECTOR & AI ANALYSIS) */}
            {}
            <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0">
              
              {/* Panel Tabs */}
              <div className="flex border-b border-slate-800 text-xs font-medium">
                <button
                  onClick={() => setDrawingTab('analysis')}
                  className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                    drawingTab === 'analysis'
                      ? 'border-indigo-500 text-indigo-400 font-bold bg-slate-800/40'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Análise IA
                </button>
                <button
                  onClick={() => setDrawingTab('elements')}
                  className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                    drawingTab === 'elements'
                      ? 'border-indigo-500 text-indigo-400 font-bold bg-slate-800/40'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Elementos (#ID)
                </button>
                <button
                  onClick={() => setDrawingTab('style')}
                  className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                    drawingTab === 'style'
                      ? 'border-indigo-500 text-indigo-400 font-bold bg-slate-800/40'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Estilo & Traço
                </button>
              </div>

              {/* Panel Content Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
                
                {/* TAB 1: AI ANALYSIS & SCORES */}
                {drawingTab === 'analysis' && (
                  <div className="space-y-4">
                    {/* Scores Card */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <Compass className="w-4 h-4 text-indigo-400" /> Score Global de Composição
                        </span>
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded">
                          92 / 100
                        </span>
                      </div>

                      <div className="space-y-2 pt-1">
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>Equilíbrio Espacial (Grelha Matrix)</span>
                            <span className="font-mono text-slate-200">88%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full w-[88%]" />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>Hierarquia de Traços Locais</span>
                            <span className="font-mono text-slate-200">95%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-purple-500 h-full w-[95%]" />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                            <span>Rigor Técnico & ABNT</span>
                            <span className="font-mono text-slate-200">91%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full w-[91%]" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Global Modifications Sum Log */}
                    {}
                    <div className="space-y-2">
                      <h3 className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        Histórico de Soma Global (Local → Global)
                      </h3>
                      <div className="space-y-2">
                        {globalModifications.map((mod) => (
                          <div key={mod.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 flex flex-col space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-amber-400 font-bold">{mod.source}</span>
                              <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{mod.impact}</span>
                            </div>
                            <p className="text-slate-300 text-[11px]">{mod.action}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: ELEMENTS & CELL INSPECTOR */}
                {}
                {drawingTab === 'elements' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-300">Elementos Mapeados ({elements.length})</span>
                      <span className="text-[10px] text-slate-500">Selecione para edição local</span>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {elements.map((el) => {
                        const isSelected = selectedElementId === el.id;
                        return (
                          <div
                            key={el.id}
                            onClick={() => setSelectedElementId(el.id)}
                            className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-slate-800 rounded text-amber-400 border border-slate-700">
                                #{el.id}
                              </span>
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-200">{el.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono">Unidade Local: {el.cell}</span>
                              </div>
                            </div>
                            <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'translate-x-1 text-indigo-400' : 'text-slate-600'}`} />
                          </div>
                        );
                      })}
                    </div>

                    {/* Selected Element Fine Controls */}
                    {selectedElementId ? (
                      <div className="bg-slate-950 p-3.5 rounded-xl border border-indigo-500/30 space-y-3 pt-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="font-bold text-amber-400 font-mono">
                            Inspeção Local: #{selectedElementId}
                          </span>
                          <button
                            onClick={() => setSelectedElementId(null)}
                            className="text-[10px] text-slate-400 hover:text-white"
                          >
                            Fechar
                          </button>
                        </div>

                        {/* Property Adjustments */}
                        {(() => {
                          const activeEl = elements.find(e => e.id === selectedElementId);
                          if (!activeEl) return null;
                          return (
                            <div className="space-y-3 text-[11px]">
                              <div>
                                <label className="text-slate-400 block mb-1">Cor do Traço:</label>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="color"
                                    value={activeEl.color}
                                    onChange={(e) => handleUpdateElement(activeEl.id, 'color', e.target.value)}
                                    className="w-8 h-8 rounded bg-transparent cursor-pointer border border-slate-700"
                                  />
                                  <span className="font-mono text-slate-300">{activeEl.color}</span>
                                </div>
                              </div>

                              <div>
                                <label className="text-slate-400 block mb-1">Espessura do Traço ({activeEl.strokeWidth}px):</label>
                                <input
                                  type="range"
                                  min="1"
                                  max="10"
                                  step="0.5"
                                  value={activeEl.strokeWidth}
                                  onChange={(e) => handleUpdateElement(activeEl.id, 'strokeWidth', Number(e.target.value))}
                                  className="w-full bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                              </div>

                              <div>
                                <label className="text-slate-400 block mb-1">Opacidade ({Math.round(activeEl.opacity * 100)}%):</label>
                                <input
                                  type="range"
                                  min="0.1"
                                  max="1"
                                  step="0.05"
                                  value={activeEl.opacity}
                                  onChange={(e) => handleUpdateElement(activeEl.id, 'opacity', Number(e.target.value))}
                                  className="w-full bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="p-4 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs">
                        Clique em um elemento no canvas ou na lista acima para efetuar modificações locais especificas.
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: STYLES AND STROKES */}
                {drawingTab === 'style' && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-300">Estilos Globais de Renderização</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'blueprint', label: 'Blueprint Técnico (CAD Azull)', desc: 'Linhas pontilhadas com alto contraste e cotas técnicas' },
                        { id: 'technical_cad', label: 'Vetor CAD Industrial', desc: 'Preto e branco vetorial rigoroso ABNT' },
                        { id: 'watercolor', label: 'Aquarela Arquitetônica', desc: 'Texturas suaves com opacidade variável' },
                        { id: 'ink_nanquim', label: 'Nanquim & Ilustração Manual', desc: 'Linhas de alta expressividade artística' }
                      ].map((st) => (
                        <div
                          key={st.id}
                          onClick={() => setDrawingStyle(st.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            drawingStyle === st.id
                              ? 'bg-indigo-600/20 border-indigo-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <div className="font-semibold text-xs text-indigo-300">{st.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{st.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

        {/* ======================================================= */}
        {/* MODE 2: LETTERS MODULE (DEEP LINGUISTICS)               */}
        {/* ======================================================= */}
        {activeMode === 'letters' && (
          <div className="flex w-full h-full">

            {/* MAIN TEXT EDITOR WORKSPACE */}
            {}
            <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden">
              
              {/* Editor Sub-Header Toolbar */}
              <div className="h-12 bg-slate-900/80 border-b border-slate-800 px-6 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-4">
                  <span className="text-slate-400 flex items-center gap-1 font-mono">
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" /> Língua Portuguesa (Norma-Padrão)
                  </span>
                  <div className="h-4 w-px bg-slate-800" />
                  <span className="text-slate-500 text-[11px]">
                    Inconsistências Sintáticas: <strong className="text-red-400">{suggestions.length}</strong>
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-[11px]">
                  <span className="text-slate-400">Legenda de Destaques:</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">Substantivos</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">Verbos</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">Adjetivos</span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">Conjunções</span>
                </div>
              </div>

              {/* Editor Split Area: Interactive Preview & Raw Text */}
              <div className="flex-1 p-8 overflow-y-auto space-y-6">
                
                {/* Visual Deep Linguistic Inspector Text Box */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative">
                  <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>Mapeamento Sintático & Gramatical Vivo</span>
                    <span className="text-purple-400 font-semibold">Clique nos termos para inspeção</span>
                  </div>

                  <div className="text-slate-200 text-base leading-relaxed tracking-wide font-serif">
                    {renderGrammarHighlightedText()}
                  </div>
                </div>

                {/* Raw Editable Textarea */}
                {}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
                  <label className="text-xs font-mono text-slate-400 block mb-2">
                    Edição Direta do Parágrafo / Fonte
                  </label>
                  <textarea
                    value={lettersText}
                    onChange={(e) => setLettersText(e.target.value)}
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-purple-500 leading-relaxed font-sans"
                  />
                </div>

              </div>

            </div>

            {/* LETTERS RIGHT PANEL (LINGUISTICS & CORRECTION CARDS) */}
            {}
            <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0">
              
              {/* Panel Navigation Tabs */}
              <div className="flex border-b border-slate-800 text-xs font-medium">
                <button
                  onClick={() => setLettersTab('grammar')}
                  className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                    lettersTab === 'grammar'
                      ? 'border-purple-500 text-purple-400 font-bold bg-slate-800/40'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sintaxe & Correções ({suggestions.length})
                </button>
                <button
                  onClick={() => setLettersTab('classes')}
                  className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                    lettersTab === 'classes'
                      ? 'border-purple-500 text-purple-400 font-bold bg-slate-800/40'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Classes Gramaticais
                </button>
              </div>

              {/* Panel Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                
                {/* TAB 1: SUGGESTION CARDS & SYNTAX CORRECTIONS */}
                {lettersTab === 'grammar' && (
                  <div className="space-y-4">
                    
                    {/* Selected Word Detail View */}
                    {selectedWord && (
                      <div className="bg-purple-950/40 border border-purple-500/40 p-3.5 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-purple-300 text-sm font-mono">{selectedWord.text}</span>
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                            {selectedWord.pos}
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed">{selectedWord.info}</p>
                        <button
                          onClick={() => setSelectedWord(null)}
                          className="text-[10px] text-purple-400 hover:underline pt-1 block"
                        >
                          Fechar Inspeção
                        </button>
                      </div>
                    )}

                    {/* Correction Cards List */}
                    {}
                    <div className="space-y-3">
                      {suggestions.map((sug) => (
                        <div
                          key={sug.id}
                          className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md hover:border-slate-700 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              {sug.category}
                            </span>
                            <AlertCircle className={`w-4 h-4 ${sug.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`} />
                          </div>

                          {/* Original vs Replacement Diff */}
                          <div className="space-y-1 font-mono text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                            <div className="line-through text-red-400/80">{sug.target}</div>
                            <div className="text-emerald-400 font-bold">{sug.replacement}</div>
                          </div>

                          {/* Rule Explanation */}
                          <div className="space-y-1 text-slate-300 text-[11px]">
                            <p className="leading-normal">{sug.explanation}</p>
                            <span className="text-[10px] text-slate-500 block font-mono italic">Regra: {sug.rule}</span>
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={() => handleApplyFix(sug)}
                            className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg text-xs transition-colors shadow flex items-center justify-center space-x-1.5"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Aplicar Correção</span>
                          </button>
                        </div>
                      ))}

                      {suggestions.length === 0 && (
                        <div className="p-8 text-center text-slate-500 space-y-2">
                          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                          <p className="font-semibold text-slate-300">Nenhuma inconsistência sintática encontrada!</p>
                          <p className="text-[11px]">O texto está em conformidade rigorosa com a Norma-Padrão da Língua Portuguesa.</p>
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* TAB 2: GRAMMAR CLASSES MAP */}
                {lettersTab === 'classes' && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-300">Distribuição Gramatical do Texto</h3>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { class: 'Substantivos', count: 8, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
                        { class: 'Verbos', count: 6, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
                        { class: 'Adjetivos', count: 3, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
                        { class: 'Conjunções', count: 2, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
                        { class: 'Pronomes', count: 2, color: 'text-pink-400 border-pink-500/30 bg-pink-500/10' },
                        { class: 'Preposições', count: 7, color: 'text-slate-300 border-slate-700 bg-slate-800' }
                      ].map((item, idx) => (
                        <div key={idx} className={`p-3 rounded-xl border ${item.color} flex flex-col justify-between`}>
                          <span className="text-[11px] font-medium">{item.class}</span>
                          <span className="text-lg font-bold font-mono">{item.count}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                      <h4 className="font-bold text-slate-300 text-xs">Análise de Tempos Verbais</h4>
                      <p className="text-slate-400 text-[11px]">
                        Dominância de <strong className="text-emerald-400">Pretérito Perfeito do Indicativo</strong> (Narrativa no passado com fatos concluídos).
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}