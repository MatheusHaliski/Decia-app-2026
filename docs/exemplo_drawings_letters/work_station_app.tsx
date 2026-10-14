import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  Sliders,
  RotateCcw,
  Check,
  X,
  Palette,
  Eye,
  Layers,
  ChevronRight,
  Info,
  Send,
  Wand2,
  Brush,
  Maximize2,
  Grid,
  Type,
  Layout,
  HelpCircle,
  Sun,
  Moon,
  ArrowRight,
  BarChart2,
  Copy,
  MessageSquare,
  ShieldCheck,
  Share2
} from 'lucide-react';


// AI Autonomy Levels
const AI_LEVELS = [
  { level: 1, name: 'Advisory (Nível 1)', desc: 'Passivo: Fornece apenas notas, feedbacks e análises pontuais sem alterar nada.', icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { level: 2, name: 'Collaborative (Nível 2)', desc: 'Assistido: Sugestões inline acionáveis com aceitação ou rejeição por clique.', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { level: 3, name: 'Aggressive (Nível 3)', desc: 'Semi-Autônomo: Reescreve blocos ou reorganiza conjuntos gráficos automaticamente.', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { level: 4, name: 'Autonomous Agent (Nível 4)', desc: 'Agente de Execução: Redesenha ou reescreve todo o escopo a partir de diretrizes gerais.', icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-500/10' }
];

// Initial State for Letters
const INITIAL_PARAGRAPHS = [
  {
    id: 'p1',
    type: 'narrative',
    score: 6.2,
    originalText: "Capítulo 4: A Chegada na Cidade Alta. O inspetor Maurício caminhava pelas ruas gélidas do distrito financeiro. Ao lado dele, o Dr. Arnaldo observava as luzes neon refletidas nas poças de água e comentava sobre como a cidade havia mudado desde a última grande revolta.",
    currentText: "Capítulo 4: A Chegada na Cidade Alta. O inspetor Maurício caminhava pelas ruas gélidas do distrito financeiro. Ao lado dele, o Dr. Arnaldo observava as luzes neon refletidas nas poças de água e comentava sobre como a cidade havia mudado desde a última grande revolta.",
    suggestedText: "Capítulo 4: A Chegada na Cidade Alta. O inspetor Maurício caminhava solitário pelas ruas gélidas do distrito financeiro, observando as luzes neon refletidas nas poças de água e refletindo sobre as mudanças na cidade desde a revolta.",
    issues: [
      {
        id: 'issue-1',
        type: 'context',
        title: 'Incoerência de Continuidade Narrativa',
        description: 'O Dr. Arnaldo faleceu no Capítulo 2 durante o confronto na Usina. Ele não pode aparecer no Capítulo 4.',
        severity: 'high',
        highlightText: 'Ao lado dele, o Dr. Arnaldo observava'
      }
    ],
    status: 'pending'
  },
  {
    id: 'p2',
    type: 'news',
    score: 5.5,
    originalText: "Nós acreditamos que a nova medida do Governo Municipal trará sérios prejuízos aos comerciantes locais. Em nossa investigação realizada ontem, conversamos com dez lojistas e achamos absurdo o reajuste das taxas.",
    currentText: "Nós acreditamos que a nova medida do Governo Municipal trará sérios prejuízos aos comerciantes locais. Em nossa investigação realizada ontem, conversamos com dez lojistas e achamos absurdo o reajuste das taxas.",
    suggestedText: "A nova medida adotada pelo Governo Municipal deve causar impactos negativos no comércio local. Em levantamento realizado na última segunda-feira, dez lojistas entrevistados classificaram o reajuste fiscal como desproporcional.",
    issues: [
      {
        id: 'issue-2',
        type: 'genre',
        title: 'Inadequação de Gênero Textual (Jornalístico)',
        description: 'Textos de tom notícia/reportagem devem priorizar a 3ª pessoa do singular/plural e a impessoalidade. O uso de primeira pessoa ("Nós acreditamos", "achamos") fere o padrão jornalístico.',
        severity: 'high',
        highlightText: 'Nós acreditamos que'
      },
      {
        id: 'issue-3',
        type: 'genre',
        title: 'Verbo em 1ª Pessoa em Notícia',
        description: 'Substituir "achamos absurdo" por linguagem objetiva e neutra.',
        severity: 'medium',
        highlightText: 'achamos absurdo'
      }
    ],
    status: 'pending'
  },
  {
    id: 'p3',
    type: 'essay',
    score: 8.8,
    originalText: "Em suma, o avanço do desenvolvimento tecnológico deve andar junto com políticas de sustentabilidade ambiental, afim de garantir a integridade dos ecossistemas para as próximas gerações.",
    currentText: "Em suma, o avanço do desenvolvimento tecnológico deve andar junto com políticas de sustentabilidade ambiental, afim de garantir a integridade dos ecossistemas para as próximas gerações.",
    suggestedText: "Em suma, o avanço do desenvolvimento tecnológico deve caminhar paralelamente a políticas de sustentabilidade ambiental, a fim de garantir a integridade dos ecossistemas para as próximas gerações.",
    issues: [
      {
        id: 'issue-4',
        type: 'grammar',
        title: 'Erro Ortográfico / Sintaxe',
        description: 'A locução conjuntiva correta é "a fim de" (separado) para indicar finalidade. "Afim" (junto) refere-se a afinidade ou parentesco.',
        severity: 'low',
        highlightText: 'afim de'
      }
    ],
    status: 'pending'
  }
];

// Initial State for Drawings
const INITIAL_DRAWING_BLOCKS = [
  {
    id: 'b1',
    number: 1,
    title: 'Marca / Logo WorkStation',
    type: 'logo',
    x: 18,
    y: 12,
    width: 32,
    height: 18,
    suggestion: 'Harmonizar cores da marca com tom vibrante corporativo e aumentar contraste.',
    applied: false,
    color: '#3B82F6',
    border: 'dashed'
  },
  {
    id: 'b2',
    number: 2,
    title: 'Composição de Formas Geométrica',
    type: 'shapes',
    x: 52,
    y: 12,
    width: 36,
    height: 48,
    suggestion: 'Ajustar profundidade com sombra interna suave e alinhar eixos verticais.',
    applied: false,
    color: '#6366F1',
    border: 'solid'
  },
  {
    id: 'b3',
    number: 3,
    title: 'Slogan e Hierarquia Tipográfica',
    type: 'typography',
    x: 18,
    y: 64,
    width: 70,
    height: 24,
    suggestion: 'Aumentar peso da fonte principal para Inter Bold e expandir o entrelinhamento em 12%.',
    applied: false,
    color: '#10B981',
    border: 'dashed'
  }
];


export default function App() {
  // Global App State
  const [activeModule, setActiveModule] = useState('letters'); // 'letters' | 'drawings'
  const [autonomyLevel, setAutonomyLevel] = useState(2); // 1, 2, 3, 4
  const [themeMode, setThemeMode] = useState('dark');

  // Letters State
  const [paragraphs, setParagraphs] = useState(INITIAL_PARAGRAPHS);
  const [activeTabLetters, setActiveTabLetters] = useState('global'); // 'global' | 'blocks' | 'agent'
  const [globalPromptText, setGlobalPromptText] = useState('');
  const [selectedParagraphId, setSelectedParagraphId] = useState('p1');
  const [aiIsProcessing, setAiIsProcessing] = useState(false);

  // Drawings State
  const [drawingBlocks, setDrawingBlocks] = useState(INITIAL_DRAWING_BLOCKS);
  const [activeTabDrawings, setActiveTabDrawings] = useState('context'); // 'context' | 'blocks' | 'colors' | 'style' | 'scope'
  const [colorTheme, setColorTheme] = useState('corporate'); // 'corporate' | 'vibrant' | 'minimalist' | 'monochrome'
  const [drawingStyle, setDrawingStyle] = useState('vector'); // 'vector' | '3d' | 'lineart' | 'sketch'
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [beforeAfterSlider, setBeforeAfterSlider] = useState(50);
  const [globalDrawingScore, setGlobalDrawingScore] = useState(7.8);

  // Handle Autonomy Level change side effects
  const handleLevelChange = (lvl) => {
    setAutonomyLevel(lvl);
    if (lvl === 3 || lvl === 4) {
      // Show auto-execution indicator
    }
  };


  const handleAcceptSuggestion = (id) => {
    setParagraphs(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          currentText: p.suggestedText,
          status: 'accepted',
          score: Math.min(10, p.score + 2.5),
          issues: []
        };
      }
      return p;
    }));
  };

  const handleRejectSuggestion = (id) => {
    setParagraphs(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          status: 'rejected'
        };
      }
      return p;
    }));
  };

  const handleApplyGlobalPrompt = () => {
    if (!globalPromptText.trim()) return;
    setAiIsProcessing(true);
    setTimeout(() => {
      setParagraphs(prev => prev.map(p => ({
        ...p,
        currentText: `[Revisão Agente Nível 4 - ${globalPromptText}]: ` + p.suggestedText,
        status: 'accepted',
        score: 9.5,
        issues: []
      })));
      setAiIsProcessing(false);
      setGlobalPromptText('');
    }, 1200);
  };


  const handleApplyBlockChange = (blockId) => {
    setDrawingBlocks(prev => prev.map(b => {
      if (b.id === blockId) {
        return { ...b, applied: !b.applied };
      }
      return b;
    }));
  };

  const handleApplyAllDrawingSuggestions = () => {
    setDrawingBlocks(prev => prev.map(b => ({ ...b, applied: true })));
    setGlobalDrawingScore(9.4);
  };


  return (
    <div className={`min-h-screen font-sans ${themeMode === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} transition-colors duration-200 flex flex-col h-screen overflow-hidden`}>
      {/* Top Header */}
      <header className={`px-5 py-3 border-b ${themeMode === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'} backdrop-blur-md flex items-center justify-between shrink-0 z-30`}>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-lg">
              WS
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight leading-none bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                Work Station
              </h1>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">AI Creative Suite</span>
            </div>
          </div>

          {/* Module Switcher Tabs */}
          <div className={`flex p-1 rounded-lg ${themeMode === 'dark' ? 'bg-slate-800/80' : 'bg-slate-100'} border ${themeMode === 'dark' ? 'border-slate-700/60' : 'border-slate-200'}`}>
            <button
              onClick={() => setActiveModule('letters')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                activeModule === 'letters'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Letters</span>
            </button>
            <button
              onClick={() => setActiveModule('drawings')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                activeModule === 'drawings'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Drawings</span>
            </button>
          </div>
        </div>

        {/* AI Autonomy Selector & Theme Controls */}
        <div className="flex items-center space-x-4">
          {/* Autonomy Level Slider Control */}
          <div className={`hidden lg:flex items-center space-x-3 px-3 py-1.5 rounded-xl ${themeMode === 'dark' ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-100 border-slate-200'} border`}>
            <div className="flex items-center space-x-1.5">
              <Zap className={`w-4 h-4 ${AI_LEVELS[autonomyLevel - 1].color}`} />
              <span className="text-xs font-semibold text-slate-300">Nível de Autonomia:</span>
            </div>

            <div className="flex items-center space-x-1">
              {AI_LEVELS.map((lvl) => {
                const IconComponent = lvl.icon;
                const isActive = autonomyLevel === lvl.level;
                return (
                  <button
                    key={lvl.level}
                    onClick={() => handleLevelChange(lvl.level)}
                    title={`${lvl.name}: ${lvl.desc}`}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      isActive
                        ? `${lvl.bg} ${lvl.color} ring-1 ring-inset ring-current shadow-sm`
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>L{lvl.level}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setThemeMode(prev => prev === 'dark' ? 'light' : 'dark')}
            className={`p-2 rounded-lg ${themeMode === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} transition-colors`}
            title="Alternar Tema"
          >
            {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeModule === 'letters' ? (
          <LettersModule
            themeMode={themeMode}
            autonomyLevel={autonomyLevel}
            paragraphs={paragraphs}
            setParagraphs={setParagraphs}
            activeTabLetters={activeTabLetters}
            setActiveTabLetters={setActiveTabLetters}
            selectedParagraphId={selectedParagraphId}
            setSelectedParagraphId={setSelectedParagraphId}
            handleAcceptSuggestion={handleAcceptSuggestion}
            handleRejectSuggestion={handleRejectSuggestion}
            globalPromptText={globalPromptText}
            setGlobalPromptText={setGlobalPromptText}
            handleApplyGlobalPrompt={handleApplyGlobalPrompt}
            aiIsProcessing={aiIsProcessing}
          />
        ) : (
          <DrawingsModule
            themeMode={themeMode}
            autonomyLevel={autonomyLevel}
            drawingBlocks={drawingBlocks}
            activeTabDrawings={activeTabDrawings}
            setActiveTabDrawings={setActiveTabDrawings}
            colorTheme={colorTheme}
            setColorTheme={setColorTheme}
            drawingStyle={drawingStyle}
            setDrawingStyle={setDrawingStyle}
            selectedBlockId={selectedBlockId}
            setSelectedBlockId={setSelectedBlockId}
            handleApplyBlockChange={handleApplyBlockChange}
            handleApplyAllDrawingSuggestions={handleApplyAllDrawingSuggestions}
            beforeAfterSlider={beforeAfterSlider}
            setBeforeAfterSlider={setBeforeAfterSlider}
            globalDrawingScore={globalDrawingScore}
          />
        )}
      </div>
    </div>
  );
}


function LettersModule({
  themeMode,
  autonomyLevel,
  paragraphs,
  setParagraphs,
  activeTabLetters,
  setActiveTabLetters,
  selectedParagraphId,
  setSelectedParagraphId,
  handleAcceptSuggestion,
  handleRejectSuggestion,
  globalPromptText,
  setGlobalPromptText,
  handleApplyGlobalPrompt,
  aiIsProcessing
}) {
  const currentParagraph = paragraphs.find(p => p.id === selectedParagraphId) || paragraphs[0];
  const totalIssuesCount = paragraphs.reduce((acc, p) => acc + p.issues.length, 0);
  const avgScore = (paragraphs.reduce((acc, p) => acc + p.score, 0) / paragraphs.length).toFixed(1);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Center WYSIWYG Document Editor Canvas */}
      <div className={`flex-1 flex flex-col overflow-y-auto p-6 lg:p-10 ${themeMode === 'dark' ? 'bg-slate-950' : 'bg-slate-100/70'}`}>
        {/* Editor Toolbar */}
        <div className={`max-w-4xl mx-auto w-full mb-4 px-4 py-2 rounded-xl flex items-center justify-between shadow-sm border ${
          themeMode === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center space-x-3 text-xs font-medium text-slate-400">
            <span className="flex items-center space-x-1 hover:text-slate-200 cursor-pointer"><Type className="w-3.5 h-3.5" /> <span>Parágrafo</span></span>
            <span className="h-3 w-px bg-slate-700" />
            <button className="font-bold hover:text-slate-200">B</button>
            <button className="italic hover:text-slate-200">I</button>
            <button className="underline hover:text-slate-200">U</button>
            <span className="h-3 w-px bg-slate-700" />
            <span className="hover:text-slate-200 cursor-pointer">PT-BR (Norma Culta)</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
              {totalIssuesCount} {totalIssuesCount === 1 ? 'Análise Pendente' : 'Análises Pendentes'}
            </span>
          </div>
        </div>

        {/* Paper Sheet Document Canvas */}
        <div className={`max-w-4xl mx-auto w-full flex-1 rounded-2xl p-8 lg:p-12 shadow-2xl border transition-all ${
          themeMode === 'dark' ? 'bg-slate-900 border-slate-800/80 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          {/* Document Title Header */}
          <div className="mb-8 pb-6 border-b border-slate-800/60">
            <div className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">Work Station Letters — Documento Inteligente</div>
            <h1 className="text-3xl font-extrabold tracking-tight">Capítulo & Reportagem: Análise Narrativa e Jornalística</h1>
            <div className="flex items-center space-x-4 mt-2 text-xs text-slate-400">
              <span>Autor: Editor Chefe</span>
              <span>•</span>
              <span>3 Parágrafos Analisados</span>
              <span>•</span>
              <span className="flex items-center text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> IA Ativa ({AI_LEVELS[autonomyLevel - 1].name})
              </span>
            </div>
          </div>

          {/* Interactive Paragraph Blocks */}
          <div className="space-y-6">
            {paragraphs.map((para, index) => {
              const isSelected = selectedParagraphId === para.id;
              const hasIssues = para.issues.length > 0;

              return (
                <div
                  key={para.id}
                  onClick={() => setSelectedParagraphId(para.id)}
                  className={`group relative p-5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? themeMode === 'dark'
                        ? 'bg-slate-800/70 border-blue-500/80 ring-1 ring-blue-500/30'
                        : 'bg-blue-50/60 border-blue-400 ring-1 ring-blue-300'
                      : themeMode === 'dark'
                        ? 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700'
                        : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Paragraph Score Badge */}
                  <div className="absolute top-3 right-3 flex items-center space-x-2">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                      para.score >= 8
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : para.score >= 6
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      Score: {para.score}/10
                    </span>
                    {hasIssues && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                    )}
                  </div>

                  {/* Context Type Label */}
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-2">
                    <span>Bloco #{index + 1}</span>
                    <span>•</span>
                    <span className="text-indigo-400">{para.type.toUpperCase()}</span>
                  </div>

                  {/* Render Text with AI Issue Highlights */}
                  <div className="text-base leading-relaxed font-serif">
                    {renderTextWithHighlights(para, themeMode)}
                  </div>

                  {/* Status Indicator */}
                  {para.status === 'accepted' && (
                    <div className="mt-3 flex items-center text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Sugestão da IA aplicada com sucesso.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right AI Panel - Letters */}
      <div className={`w-96 border-l flex flex-col shrink-0 ${themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        {/* Panel Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            <h2 className="font-bold text-sm tracking-tight">Painel de Assistência IA</h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
            L{autonomyLevel} Ativo
          </span>
        </div>

        {/* Sidebar Navigation Tabs */}
        <div className={`flex border-b text-xs font-semibold ${themeMode === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
          <button
            onClick={() => setActiveTabLetters('global')}
            className={`flex-1 py-3 text-center transition-colors relative ${
              activeTabLetters === 'global' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Análise Global
            {activeTabLetters === 'global' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTabLetters('blocks')}
            className={`flex-1 py-3 text-center transition-colors relative ${
              activeTabLetters === 'blocks' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sugestões ({totalIssuesCount})
            {activeTabLetters === 'blocks' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTabLetters('agent')}
            className={`flex-1 py-3 text-center transition-colors relative ${
              activeTabLetters === 'agent' ? 'text-purple-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Agente N4
            {activeTabLetters === 'agent' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />}
          </button>
        </div>

        {/* Tab Content Rendering */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {activeTabLetters === 'global' && (
            <div className="space-y-4">
              {/* Overall Score Box */}
              <div className={`p-4 rounded-xl border ${themeMode === 'dark' ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Nota Global do Texto</span>
                  <span className="text-xl font-extrabold text-blue-400">{avgScore}/10</span>
                </div>
                <div className="w-full bg-slate-700/40 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full" style={{ width: `${(avgScore / 10) * 100}%` }} />
                </div>
              </div>

              {/* Specific Metrics Breakdown */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Métricas de Avaliação</h3>

                <MetricBar title="Coerência Narrativa & Continuidade" score={6.2} color="bg-amber-500" note="Falta de consistência com capítulos anteriores." />
                <MetricBar title="Adequação ao Gênero Jornalístico" score={5.5} color="bg-rose-500" note="Uso indevido de 1ª pessoa em notícias." />
                <MetricBar title="Sintaxe e Norma Culta (PT-BR)" score={9.0} color="bg-emerald-500" note="Pontuação e concordância excelentes." />
                <MetricBar title="Clareza e Fluidez de Leitura" score={8.0} color="bg-blue-500" note="Estrutura de frases bem encadeada." />
              </div>

              {/* Executive Feedback Summary */}
              <div className={`p-3.5 rounded-xl border text-xs leading-relaxed space-y-2 ${
                themeMode === 'dark' ? 'bg-indigo-950/30 border-indigo-800/40 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-900'
              }`}>
                <div className="flex items-center space-x-1.5 font-bold text-indigo-400">
                  <Info className="w-4 h-4" />
                  <span>Resumo do Diagnóstico de IA</span>
                </div>
                <p>
                  O documento apresenta inconsistências graves de contexto (personagem falecido ativo) e violação de impessoalidade no trecho de reportagem. A correção dos 3 blocos elevará a nota para 9.6/10.
                </p>
              </div>
            </div>
          )}

          {activeTabLetters === 'blocks' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Exibindo análises detalhadas para o bloco selecionado ou pendentes de aceitação.
              </div>

              {paragraphs.map((para) => (
                <div
                  key={para.id}
                  className={`p-4 rounded-xl border space-y-3 ${
                    selectedParagraphId === para.id
                      ? 'border-blue-500/60 bg-blue-500/5'
                      : 'border-slate-800 bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Bloco ({para.type.toUpperCase()})</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                      para.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {para.status === 'accepted' ? 'Corrigido' : 'Revisão Necessária'}
                    </span>
                  </div>

                  {/* Issues List */}
                  {para.issues.map((issue) => (
                    <div key={issue.id} className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs space-y-1">
                      <div className="flex items-center space-x-1.5 font-bold text-rose-400">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{issue.title}</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-snug">{issue.description}</p>
                    </div>
                  ))}

                  {/* Diff Box View */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-serif space-y-2">
                    <div className="text-[10px] font-sans font-bold text-slate-500 uppercase">Comparativo Diff</div>
                    <div className="line-through text-rose-400/80 bg-rose-950/20 p-1.5 rounded">
                      {para.originalText}
                    </div>
                    <div className="text-emerald-400 bg-emerald-950/20 p-1.5 rounded font-medium">
                      {para.suggestedText}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => handleAcceptSuggestion(para.id)}
                      disabled={para.status === 'accepted'}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-40 flex items-center justify-center space-x-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{para.status === 'accepted' ? 'Aplicado' : 'Aceitar Substituição'}</span>
                    </button>
                    <button
                      onClick={() => handleRejectSuggestion(para.id)}
                      className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTabLetters === 'agent' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border space-y-3 ${
                themeMode === 'dark' ? 'bg-purple-950/20 border-purple-800/40' : 'bg-purple-50 border-purple-200'
              }`}>
                <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>Modo Agente Autônomo (Nível 4)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Digite comandos em linguagem natural para reescrever, alterar tom de voz, padronizar gêneros textuais ou expandir o documento inteiro.
                </p>
              </div>

              {/* Prompt Input Area */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">Instruções para o Agente IA:</label>
                <textarea
                  value={globalPromptText}
                  onChange={(e) => setGlobalPromptText(e.target.value)}
                  placeholder="Ex: Reescreva todo o documento em tom estritamente corporativo formal e corrija a continuidade dos personagens..."
                  rows={4}
                  className={`w-full p-3 rounded-xl border text-xs resize-none outline-none focus:ring-2 focus:ring-purple-500/50 ${
                    themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <button
                onClick={handleApplyGlobalPrompt}
                disabled={aiIsProcessing || !globalPromptText.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {aiIsProcessing ? (
                  <>
                    <Zap className="w-4 h-4 animate-spin" />
                    <span>Processando Reformulação Global...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Executar Transformação Global</span>
                  </>
                )}
              </button>

              {/* Preset Prompts */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Prompts Sugeridos</span>
                <button
                  onClick={() => setGlobalPromptText('Corrigir tom para Jornalismo Investigativo em 3ª pessoa e resolver contradições de história.')}
                  className="w-full text-left p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800 transition-colors"
                >
                  "Corrigir tom para Jornalismo Investigativo em 3ª pessoa..."
                </button>
                <button
                  onClick={() => setGlobalPromptText('Resumir texto em 3 tópicos executivos preservando a norma culta.')}
                  className="w-full text-left p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800 transition-colors"
                >
                  "Resumir texto em 3 tópicos executivos..."
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function DrawingsModule({
  themeMode,
  autonomyLevel,
  drawingBlocks,
  activeTabDrawings,
  setActiveTabDrawings,
  colorTheme,
  setColorTheme,
  drawingStyle,
  setDrawingStyle,
  selectedBlockId,
  setSelectedBlockId,
  handleApplyBlockChange,
  handleApplyAllDrawingSuggestions,
  beforeAfterSlider,
  setBeforeAfterSlider,
  globalDrawingScore
}) {
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Center Graphics Canvas */}
      <div className={`flex-1 flex flex-col overflow-y-auto p-6 lg:p-8 ${themeMode === 'dark' ? 'bg-slate-950' : 'bg-slate-100/70'}`}>
        {/* Canvas Toolbar */}
        <div className={`max-w-4xl mx-auto w-full mb-4 px-4 py-2 rounded-xl flex items-center justify-between shadow-sm border ${
          themeMode === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center space-x-3 text-xs font-medium text-slate-400">
            <span className="flex items-center space-x-1 hover:text-slate-200 cursor-pointer"><Layout className="w-3.5 h-3.5" /> <span>Prancheta A4</span></span>
            <span className="h-3 w-px bg-slate-700" />
            <span className="hover:text-slate-200 cursor-pointer">Estilo: <strong className="text-indigo-400 uppercase">{drawingStyle}</strong></span>
            <span className="h-3 w-px bg-slate-700" />
            <span className="hover:text-slate-200 cursor-pointer">Paleta: <strong className="text-emerald-400 uppercase">{colorTheme}</strong></span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleApplyAllDrawingSuggestions}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all flex items-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Otimizar Todos os Blocos</span>
            </button>
          </div>
        </div>

        {/* Interactive Graphic Canvas Sheet */}
        <div className={`max-w-4xl mx-auto w-full aspect-[4/3] rounded-2xl p-8 shadow-2xl border relative overflow-hidden transition-all ${
          themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {/* Canvas Background Grid Graphic */}
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

          {/* Render Vector Graphic Elements & Callout Overlay Boxes */}
          <div className="relative w-full h-full border border-dashed border-slate-700/50 rounded-xl p-4">
            {drawingBlocks.map((block) => {
              const isSelected = selectedBlockId === block.id;

              // Compute Dynamic Styles Based on Theme & Style States
              let blockBg = 'bg-slate-800/80';
              let blockBorder = 'border-blue-500/50';

              if (colorTheme === 'vibrant') blockBg = 'bg-gradient-to-tr from-pink-600/30 to-purple-600/30';
              if (colorTheme === 'minimalist') blockBg = 'bg-slate-800/30';
              if (colorTheme === 'dark') blockBg = 'bg-black/80';

              if (drawingStyle === '3d') blockBorder = 'border-2 border-indigo-400 shadow-2xl';
              if (drawingStyle === 'sketch') blockBorder = 'border-2 border-dashed border-amber-400';
              if (drawingStyle === 'lineart') blockBorder = 'border-2 border-slate-200';

              return (
                <div
                  key={block.id}
                  onClick={() => setSelectedBlockId(block.id)}
                  style={{
                    left: `${block.x}%`,
                    top: `${block.y}%`,
                    width: `${block.width}%`,
                    height: `${block.height}%`
                  }}
                  className={`absolute rounded-xl p-4 transition-all duration-300 cursor-pointer flex flex-col justify-between backdrop-blur-md ${blockBg} ${blockBorder} ${
                    isSelected ? 'ring-2 ring-blue-400 shadow-xl z-20 scale-[1.02]' : 'hover:border-slate-400'
                  }`}
                >
                  {/* Numbered Callout Pin */}
                  <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shadow-lg ring-2 ring-slate-900 z-30">
                    {block.number}
                  </div>

                  {/* Element Content Simulation */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-tight text-slate-200">{block.title}</span>
                    {block.applied && (
                      <span className="flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <Check className="w-3 h-3 mr-0.5" /> Otimizado
                      </span>
                    )}
                  </div>

                  {/* Visual Art Representation */}
                  <div className="flex-1 my-2 flex items-center justify-center border border-white/10 rounded-lg bg-black/20 p-2">
                    {block.type === 'logo' && (
                      <div className="flex items-center space-x-2 text-blue-400 font-black text-lg">
                        <Zap className="w-6 h-6" />
                        <span>WORKSTATION</span>
                      </div>
                    )}
                    {block.type === 'shapes' && (
                      <div className="flex space-x-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/80 animate-pulse" />
                        <div className="w-8 h-8 rounded-lg bg-purple-500/80" />
                        <div className="w-8 h-8 rounded-tr-xl bg-pink-500/80" />
                      </div>
                    )}
                    {block.type === 'typography' && (
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Campanha de Marketing 2026</p>
                        <p className="text-[10px] text-slate-500">Subtítulo e alinhamento otimizados por IA</p>
                      </div>
                    )}
                  </div>

                  {/* Hover/Selected Suggestion Preview */}
                  <div className="text-[10px] text-slate-400 truncate">
                    IA: {block.suggestion}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right AI Panel - Drawings */}
      <div className={`w-96 border-l flex flex-col shrink-0 ${themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        {/* Panel Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Palette className="w-5 h-5 text-indigo-400 animate-pulse" />
            <h2 className="font-bold text-sm tracking-tight">AI Design Inspector</h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/20">
            L{autonomyLevel} Ativo
          </span>
        </div>

        {/* Tabs Menu */}
        <div className={`flex border-b text-[11px] font-semibold overflow-x-auto ${themeMode === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
          {[
            { id: 'context', label: 'Análise' },
            { id: 'blocks', label: 'Mudanças Blocos' },
            { id: 'colors', label: 'Cores' },
            { id: 'style', label: 'Traço' },
            { id: 'scope', label: 'Escopo N4' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabDrawings(tab.id)}
              className={`flex-1 py-3 px-2 text-center whitespace-nowrap transition-colors relative ${
                activeTabDrawings === tab.id ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
              {activeTabDrawings === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {activeTabDrawings === 'context' && (
            <div className="space-y-4">
              {/* Context Approval Badge */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center space-x-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-400">Contexto e Escopo Aprovados</h4>
                  <p className="text-[11px] text-slate-300 leading-tight">A IA validou a coerência gráfica com o tema institucional de campanha.</p>
                </div>
              </div>

              {/* Score Display */}
              <div className={`p-4 rounded-xl border ${themeMode === 'dark' ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Score Global de Design</span>
                  <span className="text-xl font-extrabold text-indigo-400">{globalDrawingScore}/10</span>
                </div>
                <div className="w-full bg-slate-700/40 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full" style={{ width: `${(globalDrawingScore / 10) * 100}%` }} />
                </div>
              </div>

              {/* Design Critique Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Critique Visual da IA</h4>

                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-300">Coesão da Paleta de Cores</span>
                    <span className="text-amber-400">6.5/10</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Excesso de azul sem ponto de contraste quente para retenção visual.</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-300">Hierarquia Tipográfica</span>
                    <span className="text-emerald-400">8.8/10</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Excelente legibilidade e relação proporcional entre título e subtítulo.</p>
                </div>
              </div>
            </div>
          )}

          {activeTabDrawings === 'blocks' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Sugestões otimizadas por componentes selecionáveis:
              </div>

              {drawingBlocks.map((block) => (
                <div
                  key={block.id}
                  className={`p-3.5 rounded-xl border space-y-2 transition-all ${
                    selectedBlockId === block.id ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-800 bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-extrabold text-[10px] flex items-center justify-center">
                        {block.number}
                      </span>
                      <span className="text-xs font-bold text-slate-200">{block.title}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-snug">{block.suggestion}</p>

                  <button
                    onClick={() => handleApplyBlockChange(block.id)}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
                      block.applied
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{block.applied ? 'Alteração Aplicada' : 'Aplicar no Desenho'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTabDrawings === 'colors' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Altere a harmonização cromática global do desenho em tempo real:
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'corporate', name: 'Corporativo', colors: ['#3B82F6', '#1E40AF', '#64748B'] },
                  { id: 'vibrant', name: 'Vibrante IA', colors: ['#EC4899', '#8B5CF6', '#3B82F6'] },
                  { id: 'minimalist', name: 'Minimalista', colors: ['#0F172A', '#334155', '#94A3B8'] },
                  { id: 'monochrome', name: 'Monocromático', colors: ['#18181B', '#3F3F46', '#71717A'] }
                ].map((palette) => (
                  <button
                    key={palette.id}
                    onClick={() => setColorTheme(palette.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      colorTheme === palette.id
                        ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                        : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-200 mb-2">{palette.name}</div>
                    <div className="flex h-4 rounded-md overflow-hidden">
                      {palette.colors.map((c, idx) => (
                        <div key={idx} className="flex-1" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTabDrawings === 'style' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Alterne a perspectiva e o estilo do traço artístico dos vetores:
              </div>

              <div className="space-y-2">
                {[
                  { id: 'vector', name: 'Vetor Minimalista Flutuante', desc: 'Traces limpos com bordas arredondadas e sombras suaves.' },
                  { id: '3d', name: 'Render 3D Futurista', desc: 'Profundidade volumétrica, oclusão e reflexos neon.' },
                  { id: 'lineart', name: 'Line Art Técnico', desc: 'Esboço técnico vetorial com linhas finas e precisas.' },
                  { id: 'sketch', name: 'Hand-Drawn Sketch', desc: 'Efeito artesanal feito à mão com textura orgânica.' }
                ].map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setDrawingStyle(style.id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      drawingStyle === style.id
                        ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30'
                        : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">{style.name}</span>
                      {drawingStyle === style.id && <Check className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{style.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTabDrawings === 'scope' && (
            <div className="space-y-4">
              <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                themeMode === 'dark' ? 'bg-purple-950/30 border-purple-800/40 text-purple-200' : 'bg-purple-50 border-purple-900'
              }`}>
                <div className="flex items-center space-x-1.5 font-bold text-purple-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Reforma de Escopo Completa (Nível 4)</span>
                </div>
                <p>Arraste o slider para comparar o estado original com a transformação total sugerida pelo agente de design.</p>
              </div>

              {/* Before / After Slider Control */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Atual (Original)</span>
                  <span>{beforeAfterSlider}% IA</span>
                  <span>Conceito Novo</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={beforeAfterSlider}
                  onChange={(e) => setBeforeAfterSlider(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              {/* Preview Comparison Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-300">Prévia do Conceito Nível 4:</div>
                <div className="h-32 rounded-lg bg-gradient-to-r from-blue-900/40 via-purple-900/40 to-pink-900/40 border border-slate-800 flex items-center justify-center text-center p-4">
                  <span className="text-xs text-slate-300 font-medium">
                    {beforeAfterSlider > 50
                      ? 'Conceito IA Ativo: Identidade Vibrante 3D + Grid Assimétrico Executado.'
                      : 'Conceito Original: Lay-out padrão vetorial plano.'}
                  </span>
                </div>
                <button
                  onClick={handleApplyAllDrawingSuggestions}
                  className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-500/20"
                >
                  Aprovar e Substituir Desenho
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function MetricBar({ title, score, color, note }) {
  return (
    <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 text-xs space-y-1">
      <div className="flex justify-between font-semibold">
        <span className="text-slate-300">{title}</span>
        <span className="font-bold">{score}/10</span>
      </div>
      <div className="w-full bg-slate-700/40 h-1.5 rounded-full overflow-hidden">
        <div className={`${color} h-full rounded-full`} style={{ width: `${(score / 10) * 100}%` }} />
      </div>
      <p className="text-[10px] text-slate-400">{note}</p>
    </div>
  );
}


function renderTextWithHighlights(para, themeMode) {
  const text = para.currentText;

  if (!para.issues || para.issues.length === 0) {
    return <span>{text}</span>;
  }

  // Highlight specific issues inline
  let parts = [];
  let lastIdx = 0;

  para.issues.forEach((issue) => {
    const idx = text.indexOf(issue.highlightText);
    if (idx !== -1) {
      if (idx > lastIdx) {
        parts.push(text.substring(lastIdx, idx));
      }

      const highlightBg =
        issue.type === 'context'
          ? 'bg-rose-500/20 text-rose-300 border-b-2 border-rose-500'
          : issue.type === 'genre'
          ? 'bg-amber-500/20 text-amber-300 border-b-2 border-amber-500'
          : 'bg-blue-500/20 text-blue-300 border-b-2 border-blue-500';

      parts.push(
        <mark key={issue.id} className={`${highlightBg} px-1 py-0.5 rounded cursor-pointer font-semibold`} title={issue.description}>
          {issue.highlightText}
        </mark>
      );

      lastIdx = idx + issue.highlightText.length;
    }
  });

  if (lastIdx < text.length) {
    parts.push(text.substring(lastIdx));
  }

  return parts;
}