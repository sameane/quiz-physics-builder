
import React, { useRef, useState, useEffect } from 'react';
import { ExamData, Question, WatermarkSettings, DesignSettings, CommonBorderStyle, AppSettings } from '../types';
import MathRenderer from './MathRenderer';
import RichTextEditor from './RichTextEditor';
import { useNotification } from './NotificationSystem';

interface ExamPaperProps {
  data: ExamData;
  appSettings: AppSettings;
  needsAnswerUpdate?: boolean; 
  onReorderQuestions: (fromIndex: number, toIndex: number) => void;
  onAddQuestion: (count?: number) => void;
  onAddQuestionAI?: (count: number, topic: string) => void;
  onAddText?: () => void;
  onUpdateQuestion: (id: number, updated: Question) => void;
  onDeleteQuestion: (id: number) => void;
  onDuplicateQuestion: (id: number) => void;
  onAIEditQuestion: (id: number, instructions: string, imageBase64?: string, difficulty?: number, withShape?: boolean) => Promise<void>;
  onFinishEdit?: (id: number) => void; 
  onRegenerateAnswerKey?: () => Promise<void>;
  onOCRQuestion?: (id: number, imageBase64: string) => Promise<void>;
  onModifySvg?: (id: number, instruction: string) => Promise<void>;
  onDescribeVisual?: (id: number, content: string, type: 'svg' | 'image') => Promise<void>;
  onUpdateSettings?: (settings: Partial<ExamData>) => void;
  isProcessing?: boolean;
}

const PaperIcons = {
  Edit: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
  Check: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  Duplicate: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Image: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Camera: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Sparkles: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
  X: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  ChevronDown: () => <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>,
  Drag: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
};

const defaultWatermarkSettings: WatermarkSettings = {
  opacity: 0.15,
  rotation: -30,
  scale: 1,
  placement: 'center',
  gridSize: '3x4',
  questionWmarkCount: 2,
  isOverlay: false
};

const defaultDesignSettings: DesignSettings = {
  pageBorder: 'none',
  pageBorderColor: '#000000',
  pageBorderWidth: 2,
  pagePadding: 20,
  pageMargin: 20,
  pageBgColor: '#ffffff',
  headerBorder: 'simple',
  headerBgColor: 'transparent',
  headerBorderColor: '#1e3a8a',
  headerBorderWidth: 2,
  headerPadding: 16,
  headerMargin: 20,
  questionBorder: 'simple',
  questionBgColor: 'rgba(255, 255, 255, 0.95)',
  questionBorderColor: '#e5e7eb',
  questionBorderWidth: 1,
  questionPadding: 16,
  questionMargin: 16,
  questionBorderRadius: 8
};

const getBorderStyles = (
  style: CommonBorderStyle, 
  width: number, 
  color: string, 
  radius?: number
): React.CSSProperties => {
  const base: React.CSSProperties = {
     borderColor: color,
     borderRadius: radius ? `${radius}px` : undefined,
  };

  switch (style) {
    case 'simple': return { ...base, borderStyle: 'solid', borderWidth: `${width}px` };
    case 'double': return { ...base, borderStyle: 'double', borderWidth: `${Math.max(width, 3)}px` };
    case 'dashed': return { ...base, borderStyle: 'dashed', borderWidth: `${width}px` };
    case 'modern_right': return { ...base, borderRightStyle: 'solid', borderRightWidth: `${width}px` };
    case 'modern_bottom': return { ...base, borderBottomStyle: 'solid', borderBottomWidth: `${width}px` };
    case 'frame': return { ...base, borderStyle: 'double', borderWidth: `${Math.max(width + 2, 4)}px`, outline: `1px solid ${color}80`, outlineOffset: '4px' };
    case '3d_rect': return { ...base, borderStyle: 'solid', borderWidth: `${width}px`, boxShadow: `5px 5px 0px 0px rgba(0, 0, 0, 0.2)` };
    case 'none':
    default: return { ...base, borderStyle: 'none' };
  }
};

const ExamPaper: React.FC<ExamPaperProps> = ({
  data,
  appSettings,
  needsAnswerUpdate,
  onReorderQuestions,
  onAddQuestion,
  onAddQuestionAI,
  onAddText,
  onUpdateQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onAIEditQuestion,
  onFinishEdit,
  onRegenerateAnswerKey,
  onOCRQuestion,
  onModifySvg,
  onDescribeVisual,
  onUpdateSettings,
  isProcessing
}) => {
  const letterMap = ['A', 'B', 'C', 'D'];
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  const wmSettings = data.watermarkSettings || defaultWatermarkSettings;
  const design = data.designSettings || defaultDesignSettings;

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);
  
  const activeUploadId = useRef<number | null>(null);
  const { showToast, confirm } = useNotification();
  const [dragActiveId, setDragActiveId] = useState<number | null>(null);
  
  const resizingRef = useRef<{ 
    type: 'question' | 'header_right' | 'header_left', 
    id?: number, 
    startX: number, 
    startY: number, 
    startWidth: number, 
    startHeight: number 
  } | null>(null);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [currentAiQuestionId, setCurrentAiQuestionId] = useState<number | null>(null);
  const [aiInstructions, setAiInstructions] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState(5);
  const [aiGenerateShape, setAiGenerateShape] = useState(false);
  const [aiImage, setAiImage] = useState<string | undefined>(undefined);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [svgEditModal, setSvgEditModal] = useState<{ id: number, instruction: string } | null>(null);
  const [addOptionsModal, setAddOptionsModal] = useState<{count: number} | null>(null);
  const [addAiTopicModal, setAddAiTopicModal] = useState<{count: number} | null>(null);
  const [newQuestionsTopic, setNewQuestionsTopic] = useState("");

  const questionsOnly = data.questions.filter(q => q.type !== 'text_only');
  const chunkSize = 10;
  const questionChunks = [];
  for (let i = 0; i < questionsOnly.length; i += chunkSize) {
    questionChunks.push(questionsOnly.slice(i, i + chunkSize));
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMenuId !== null && !(event.target as Element).closest('.dropdown-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { type, id, startX, startY, startWidth, startHeight } = resizingRef.current;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      const newWidth = Math.max(80, startWidth + deltaX);
      const newHeight = Math.max(60, startHeight + deltaY);

      if (type === 'question' && id !== undefined) {
        const q = data.questions.find(x => x.id === id);
        if (q) {
          onUpdateQuestion(id, { ...q, imageWidth: newWidth, imageHeight: newHeight });
        }
      } else if (type === 'header_right' && onUpdateSettings) {
        onUpdateSettings({ designSettings: { ...design, headerImageRightWidth: newWidth } });
      } else if (type === 'header_left' && onUpdateSettings) {
        onUpdateSettings({ designSettings: { ...design, headerImageLeftWidth: newWidth } });
      }
    };

    const handleMouseUp = () => resizingRef.current = null;
    if (resizingRef.current) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [data.questions, design, onUpdateQuestion, onUpdateSettings]);

  const startResize = (e: React.MouseEvent, type: 'question' | 'header_right' | 'header_left', id?: number) => {
    e.preventDefault();
    e.stopPropagation();
    const container = (e.currentTarget as HTMLElement).parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    resizingRef.current = { type, id, startX: e.clientX, startY: e.clientY, startWidth: rect.width, startHeight: rect.height };
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (editingId !== null) { e.preventDefault(); return; }
    dragItem.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragOverItem.current = index;
    e.preventDefault();
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      onReorderQuestions(dragItem.current, dragOverItem.current);
    }
    dragItem.current = null;
    dragOverItem.current = null;
    setDragActiveId(null);
  };

  const triggerFileUpload = (id: number, type: 'image' | 'ocr') => {
      activeUploadId.current = id;
      if (type === 'image') fileInputRef.current?.click();
      else ocrInputRef.current?.click();
      setActiveMenuId(null);
  };

  const onLocalImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const id = activeUploadId.current;
    if (id === null) return;
    const question = data.questions.find(q => q.id === id);
    if (!question) return;
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          onUpdateQuestion(id, { ...question, imageUrl: ev.target.result as string });
          showToast("تم إرفاق الصورة محلياً", "success");
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
    e.target.value = '';
  };

  const onOCRFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const id = activeUploadId.current;
    if (id === null) return;
    if (e.target.files && e.target.files[0] && onOCRQuestion) {
      const reader = new FileReader();
      reader.onload = (ev) => { if (ev.target?.result) onOCRQuestion(id, ev.target.result as string); };
      reader.readAsDataURL(e.target.files[0]);
    }
    e.target.value = '';
  };

  const handleManualDelete = async (id: number) => {
    const ok = await confirm({ title: 'حذف العنصر', message: 'هل أنت متأكد؟', type: 'danger' });
    if (ok) onDeleteQuestion(id);
  };

  const submitAiEdit = async () => {
    if (currentAiQuestionId === null) return;
    setIsAiLoading(true);
    try {
      await onAIEditQuestion(currentAiQuestionId, aiInstructions, aiImage, aiDifficulty, aiGenerateShape);
      setAiModalOpen(false); setAiDifficulty(5); setAiGenerateShape(false); setAiInstructions('');
    } catch (e) { showToast("فشل في تعديل السؤال", "error"); } 
    finally { setIsAiLoading(false); }
  };

  const handleFinishClick = (id: number) => {
    setEditingId(null);
    if (onFinishEdit) onFinishEdit(id);
  };

  const handleAddClick = (count: number) => setAddOptionsModal({ count });

  const handleAddChoice = (type: 'manual' | 'ai') => {
      if(!addOptionsModal) return;
      const count = addOptionsModal.count;
      setAddOptionsModal(null);
      if (type === 'manual') onAddQuestion(count);
      else { setNewQuestionsTopic(""); setAddAiTopicModal({ count }); }
  };

  const submitAddAi = () => {
      if (!addAiTopicModal || !onAddQuestionAI) return;
      onAddQuestionAI(addAiTopicModal.count, newQuestionsTopic || "أسئلة عامة حول الموضوع");
      setAddAiTopicModal(null);
  };

  const submitSvgEdit = () => {
     if(!svgEditModal || !onModifySvg) return;
     onModifySvg(svgEditModal.id, svgEditModal.instruction);
     setSvgEditModal(null);
  };

  let questionCounter = 0;
  const [gridCols, gridRows] = wmSettings.gridSize ? wmSettings.gridSize.split('x').map(Number) : [3, 4];
  const totalWatermarks = gridCols * gridRows;
  const showGlobalWatermark = data.watermark && (wmSettings.placement === 'center' || wmSettings.placement === 'grid');

  return (
    <>
      <div 
        id="exam-paper-printable" 
        className={`w-full max-w-[210mm] mx-auto bg-white min-h-[297mm] shadow-lg print:shadow-none print:w-full print:m-0 text-gray-800 text-sm relative overflow-hidden transition-all duration-300`}
        style={{
            padding: `${design.pageMargin || 20}px`,
            backgroundColor: design.pageBgColor || '#ffffff',
            backgroundImage: design.pageBgImage ? `url(${design.pageBgImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
        }}
      >
        <div 
            className="w-full h-full relative"
            style={{
                ...getBorderStyles(design.pageBorder, design.pageBorderWidth || 2, design.pageBorderColor),
                padding: `${design.pagePadding || 20}px`,
                minHeight: '280mm'
            }}
        >
            {showGlobalWatermark && (
            <div 
                className={`absolute inset-0 flex pointer-events-none overflow-hidden print:visible ${wmSettings.isOverlay ? 'z-50' : 'z-0'}`}
                style={{
                    display: wmSettings.placement === 'grid' ? 'grid' : 'flex',
                    gridTemplateColumns: wmSettings.placement === 'grid' ? `repeat(${gridCols}, 1fr)` : undefined,
                    gridTemplateRows: wmSettings.placement === 'grid' ? `repeat(${gridRows}, 1fr)` : undefined,
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: wmSettings.placement === 'grid' ? '2rem' : '0'
                }}
            >
                {wmSettings.placement === 'grid' ? (
                    Array.from({ length: totalWatermarks }).map((_, i) => (
                        <div key={i} className="flex items-center justify-center w-full h-full p-4 overflow-hidden">
                            <img 
                                src={data.watermark} 
                                className="object-contain max-w-full max-h-full"
                                style={{ opacity: wmSettings.opacity, transform: `rotate(${wmSettings.rotation}deg) scale(${wmSettings.scale})`, maxHeight: '150px' }}
                            />
                        </div>
                    ))
                ) : (
                    <img 
                        src={data.watermark} 
                        alt="Watermark" 
                        className="object-contain object-center"
                        style={{ opacity: wmSettings.opacity, transform: `rotate(${wmSettings.rotation}deg) scale(${wmSettings.scale})`, maxWidth: '80%', maxHeight: '80%' }} 
                    />
                )}
            </div>
            )}

            {Array.from({ length: 10 }).map((_, i) => {
                const topPos = (i + 1) * 1120;
                return (
                    <React.Fragment key={i}>
                        <div className="page-boundary-line no-print" style={{ top: `${topPos}px` }}></div>
                        <div className="page-boundary-label no-print" style={{ top: `${topPos - 28}px` }}>نهاية الصفحة {i + 1}</div>
                    </React.Fragment>
                );
            })}

            <header 
                className={`relative z-10 transition-all duration-300 rounded`}
                style={{
                    ...getBorderStyles(design.headerBorder, design.headerBorderWidth || 2, design.headerBorderColor),
                    backgroundColor: design.headerBgColor || 'transparent',
                    padding: `${design.headerPadding || 16}px`,
                    marginBottom: `${design.headerMargin || 20}px`
                }}
            >
                <div className="flex justify-between items-start mb-4 gap-4">
                    {design.headerImageRight && (
                        <div className="relative shrink-0 group/header-img" style={{ width: design.headerImageRightWidth || 80 }}>
                            <img src={design.headerImageRight} className="w-full object-contain" />
                            <div onMouseDown={(e) => startResize(e, 'header_right')} className="absolute bottom-[-4px] left-[-4px] w-4 h-4 bg-purple-500 rounded-full cursor-nesw-resize opacity-0 group-hover/header-img:opacity-100 transition-opacity z-20" />
                        </div>
                    )}
                    <h1 
                        className="text-center text-4xl font-normal flex-grow flex items-center justify-center gap-3 self-center"
                        style={{ fontFamily: appSettings.titleFont, color: appSettings.titleColor }}
                    >
                        اختبار فيزياء: {data.lessonTitle}
                    </h1>
                    {design.headerImageLeft && (
                        <div className="relative shrink-0 group/header-img" style={{ width: design.headerImageLeftWidth || 80 }}>
                            <img src={design.headerImageLeft} className="w-full object-contain" />
                            <div onMouseDown={(e) => startResize(e, 'header_left')} className="absolute bottom-[-4px] right-[-4px] w-4 h-4 bg-purple-500 rounded-full cursor-nwse-resize opacity-0 group-hover/header-img:opacity-100 transition-opacity z-20" />
                        </div>
                    )}
                </div>
                <div className="flex justify-between items-center flex-wrap gap-y-2 font-semibold text-sm bg-white/90 border border-gray-300 rounded p-2">
                    <div>اسم الطالب: ...........................</div>
                    <div>المجموعة: ...................</div>
                    <div>التاريخ: ...................</div>
                    <div>الدرجة: ..... / {questionsOnly.length}</div>
                </div>
            </header>

            <div className="mb-4 font-bold underline decoration-2 decoration-primary/30 relative z-10">اختر الإجابة الصحيحة:</div>

            <div className="flex flex-col relative z-10" style={{ gap: `${design.questionMargin || 16}px` }}>
                {data.questions.map((q, index) => {
                    const isEditing = editingId === q.id;
                    const isTextOnly = q.type === 'text_only';
                    const isMenuOpen = activeMenuId === q.id;
                    const isDraggable = dragActiveId === q.id && !isEditing;
                    let displayIndex = 0;
                    if (!isTextOnly) { questionCounter++; displayIndex = questionCounter; }

                    return (
                        <div
                            key={q.id}
                            className={`question-block relative rounded-lg break-inside-avoid group transition-all duration-300 overflow-hidden ${isEditing ? 'ring-2 ring-blue-400 z-10' : 'hover:shadow-sm'} ${isDraggable ? 'cursor-move ring-2 ring-gray-200' : ''} ${isTextOnly ? 'border-2 border-transparent hover:border-dashed hover:border-gray-300 bg-transparent' : ''}`}
                            style={!isTextOnly && !isEditing ? { ...getBorderStyles(design.questionBorder, design.questionBorderWidth || 1, design.questionBorderColor, design.questionBorderRadius), backgroundColor: design.questionBgColor || 'rgba(255, 255, 255, 0.95)', padding: `${design.questionPadding || 16}px` } : { padding: '16px' }}
                            draggable={isDraggable}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnter={(e) => handleDragEnter(e, index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            {data.watermark && wmSettings.placement === 'question' && (
                                <div className={`absolute inset-0 w-full h-full flex flex-wrap content-around justify-around items-center pointer-events-none ${wmSettings.isOverlay ? 'z-50' : 'z-0'}`}>
                                    {Array.from({ length: wmSettings.questionWmarkCount || 1 }).map((_, i) => (
                                        <img key={i} src={data.watermark} className="object-contain" style={{ opacity: wmSettings.opacity, transform: `rotate(${wmSettings.rotation}deg) scale(${wmSettings.scale})`, maxWidth: '150px', maxHeight: '120px', flexShrink: 0 }} />
                                    ))}
                                </div>
                            )}

                            <div className={`absolute -top-3 left-3 flex items-center gap-1 bg-white border border-gray-200 shadow-sm rounded-full p-1 transition-opacity duration-200 print:hidden no-print z-20 ${isEditing || isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <div className="drag-handle p-1.5 text-gray-400 cursor-move hover:text-gray-700 hover:bg-gray-100 rounded-full" onMouseEnter={() => setDragActiveId(q.id)} onMouseLeave={() => setDragActiveId(null)} onMouseDown={() => setDragActiveId(q.id)}><PaperIcons.Drag /></div>
                                <div className="w-px h-4 bg-gray-200 mx-0.5"></div>
                                <div className="relative dropdown-container">
                                    {isEditing ? (
                                        <button onClick={() => handleFinishClick(q.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors bg-green-100 text-green-700 hover:bg-green-200"><PaperIcons.Check /> <span className="text-[10px] font-bold">إنهاء</span></button>
                                    ) : (
                                        <button onClick={() => setActiveMenuId(isMenuOpen ? null : q.id)} className="flex items-center gap-1 px-2 py-1.5 rounded-full transition-colors text-gray-700 hover:bg-gray-100"><PaperIcons.Edit /> <span className="text-[10px] font-bold">تعديل</span> <PaperIcons.ChevronDown /></button>
                                    )}
                                    {isMenuOpen && !isEditing && (
                                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-30 animate-scale-up origin-top-left">
                                            <button onClick={() => { setEditingId(q.id); setActiveMenuId(null); }} className="w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"><span className="text-blue-500"><PaperIcons.Edit /></span> تعديل يدوي</button>
                                            <button onClick={() => triggerFileUpload(q.id, 'ocr')} className="w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"><span className="text-indigo-500"><PaperIcons.Camera /></span> استخراج من صورة</button>
                                            <button onClick={() => { setCurrentAiQuestionId(q.id); setAiModalOpen(true); setActiveMenuId(null); }} className="w-full text-right px-4 py-2 hover:bg-purple-50 flex items-center gap-2 text-purple-700 font-medium"><span className="text-purple-500"><PaperIcons.Sparkles /></span> تعديل ذكي (AI)</button>
                                        </div>
                                    )}
                                </div>
                                <div className="w-px h-4 bg-gray-200 mx-0.5"></div>
                                <button onClick={() => onDuplicateQuestion(q.id)} className="p-1.5 rounded-full text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"><PaperIcons.Duplicate /></button>
                                <button onClick={() => handleManualDelete(q.id)} className="p-1.5 rounded-full text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"><PaperIcons.Trash /></button>
                            </div>

                            <div className="flex gap-3 mb-1 relative z-10">
                                {!isTextOnly && <span className="text-primary font-extrabold select-none shrink-0 text-lg">{displayIndex}.</span>}
                                <div className="flex-grow flex flex-col md:flex-row gap-4 items-start">
                                    <div className="flex-grow flex flex-col gap-3 order-1 w-full">
                                        <div className="w-full" style={{ fontFamily: appSettings.questionFont, color: appSettings.questionColor }}>
                                            {isEditing ? (
                                                <div className="flex flex-col gap-3 animate-fade-in">
                                                    <RichTextEditor value={q.text} onChange={(val) => onUpdateQuestion(q.id, { ...q, text: val })} rows={3} placeholder={isTextOnly ? "اكتب العنوان أو النص هنا..." : "اكتب نص السؤال هنا..."} />
                                                    {!isTextOnly && (
                                                        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-blue-100 print:hidden no-print">
                                                            <button onClick={() => triggerFileUpload(q.id, 'image')} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition shadow-sm"><span className="text-blue-500"><PaperIcons.Image /></span> إرفاق صورة</button>
                                                            {(q.imageUrl || q.svgCode) && onDescribeVisual && (
                                                                <button onClick={() => onDescribeVisual(q.id, q.svgCode || q.imageUrl!, q.svgCode ? 'svg' : 'image')} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition shadow-sm" title="وصف الشكل باستخدام الذكاء الاصطناعي"><span>👁️</span> توليد وصف تلقائي</button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : <MathRenderer content={q.text} className={`leading-relaxed ${isTextOnly ? 'font-bold text-gray-900 text-base text-center my-2' : 'font-semibold'}`} />}
                                        </div>
                                        {!isTextOnly && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mt-2" style={{ fontFamily: appSettings.optionFont, color: appSettings.optionColor }}>
                                                {q.options.map((opt, optIndex) => (
                                                    <div key={optIndex} className={`flex items-center rounded-lg px-3 py-2 border transition-colors ${isEditing ? 'bg-white border-blue-200 shadow-sm' : 'bg-option-bg border-option-border hover:bg-green-50'}`}>
                                                        <span className="font-bold ml-2 shrink-0 inline-block text-primary w-6 text-sm" dir="ltr">[{letterMap[optIndex]}]</span>
                                                        {isEditing ? (
                                                            <input type="text" value={opt} onChange={(e) => { const newOptions = [...q.options]; newOptions[optIndex] = e.target.value; onUpdateQuestion(q.id, { ...q, options: newOptions }); }} className="w-full bg-white border-b border-gray-200 px-1 outline-none focus:border-primary text-sm transition-colors" placeholder={`الخيار ${optIndex + 1}`} />
                                                        ) : <MathRenderer content={opt} inline />}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {isEditing && (q.imageUrl || q.svgCode) && (
                                            <div className="mt-3 w-full bg-yellow-50/50 p-3 rounded border border-yellow-200 no-print animate-fade-in">
                                                <label className="block text-xs font-bold text-yellow-800 mb-1">وصف الشكل (يُحفظ مع البيانات):</label>
                                                <textarea value={q.visualDescription || ''} onChange={(e) => onUpdateQuestion(q.id, { ...q, visualDescription: e.target.value })} placeholder="اكتب وصفاً للشكل هنا..." className="w-full p-2 text-xs border border-yellow-300 rounded bg-white focus:ring-1 focus:ring-yellow-400 outline-none h-16 resize-y" />
                                            </div>
                                        )}
                                    </div>

                                    {(q.imageUrl || q.svgCode || (isEditing && !isTextOnly)) && (
                                        <div 
                                            className={`shrink-0 order-2 flex flex-col items-center justify-center p-2 bg-gray-50 border border-gray-200 rounded-xl relative group/visual ${(!q.imageUrl && !q.svgCode) ? 'hidden' : 'flex'}`} 
                                            style={{ width: q.imageWidth ? `${q.imageWidth}px` : '200px', height: q.imageHeight ? `${q.imageHeight}px` : 'auto', minHeight: '100px' }}
                                        >
                                            {q.svgCode && (
                                                <div className="w-full h-full flex items-center justify-center overflow-hidden [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto">
                                                    <div dangerouslySetInnerHTML={{ __html: q.svgCode }} className="flex items-center justify-center w-full h-full" />
                                                    {isEditing && (
                                                        <div className="absolute top-2 right-2 flex gap-1 z-20 no-print">
                                                            <button onClick={() => setSvgEditModal({id: q.id, instruction: ''})} className="bg-purple-500 text-white w-6 h-6 rounded shadow hover:bg-purple-600 transition flex items-center justify-center text-xs" title="تعديل الشكل">✏️</button>
                                                            <button onClick={() => onUpdateQuestion(q.id, { ...q, svgCode: undefined })} className="bg-red-500 text-white w-6 h-6 rounded shadow hover:bg-red-600 transition flex items-center justify-center text-xs" title="حذف الشكل"><PaperIcons.X /></button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {q.imageUrl && (
                                                <div className="relative w-full h-full flex items-center justify-center overflow-hidden select-none">
                                                    <img src={q.imageUrl} className="max-w-full max-h-full object-contain rounded-lg bg-white shadow-sm pointer-events-none" />
                                                    {isEditing && (
                                                        <button onClick={() => onUpdateQuestion(q.id, { ...q, imageUrl: undefined })} className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full shadow hover:bg-red-600 transition flex items-center justify-center z-10 no-print" title="حذف الصورة"><PaperIcons.X /></button>
                                                    )}
                                                </div>
                                            )}
                                            {isEditing && (q.imageUrl || q.svgCode) && (
                                                <div onMouseDown={(e) => startResize(e, 'question', q.id)} className="absolute bottom-[-8px] right-[-8px] w-6 h-6 bg-blue-500 rounded-full cursor-nwse-resize shadow-lg flex items-center justify-center z-30 hover:scale-110 transition-transform no-print" title="تغيير الحجم">
                                                    <svg className="w-4 h-4 text-white rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Closing Phrase - MOVED HERE, BEFORE THE ANSWER KEY */}
            <div className="closing-phrase mt-12 mb-12 flex items-center justify-center gap-4 text-primary no-break relative z-10">
                <div className="h-0.5 flex-grow bg-gradient-to-r from-transparent to-primary/30"></div>
                <div className="font-bold text-lg italic px-4 select-none whitespace-nowrap">مع تمنياتي لكم بالتوفيق والنجاح</div>
                <div className="h-0.5 flex-grow bg-gradient-to-l from-transparent to-primary/30"></div>
            </div>

            <div className="answer-key-section border-2 border-red-400 bg-red-50/50 p-6 rounded-xl break-inside-avoid relative z-10">
                {needsAnswerUpdate && (
                    <div className="no-print bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded shadow-sm animate-pulse flex items-start gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div><p className="font-bold">تم تعديل الأسئلة</p><p className="text-sm">يرجى تحديث التفسيرات قبل التصدير.</p></div>
                    </div>
                )}
                <div className="export-answer-header hidden print:block text-red-700 font-extrabold text-xl mb-4 border-b pb-2">نموذج الإجابة والتفسيرات</div>
                <details className="group open:mb-4" open={true}>
                    <summary className="cursor-pointer font-bold text-red-700 flex justify-between items-center select-none no-print">
                        <div className="flex items-center gap-2"><span>📝</span><span>نموذج الإجابة والتفسيرات (معاينة)</span></div>
                        {onRegenerateAnswerKey && (
                            <button onClick={(e) => { e.preventDefault(); onRegenerateAnswerKey(); }} disabled={isProcessing} className={`mr-auto ml-4 text-white text-xs px-4 py-2 rounded-lg disabled:bg-gray-400 flex items-center gap-2 shadow-sm transition ${needsAnswerUpdate ? 'bg-yellow-600 hover:bg-yellow-700 animate-bounce' : 'bg-red-600 hover:bg-red-700'}`}>{isProcessing ? '...' : needsAnswerUpdate ? '⚠️ تحديث مطلوب' : '🔄 تحديث التفسيرات'}</button>
                        )}
                    </summary>
                    <div className="mt-6">
                        {questionChunks.map((chunk, chunkIndex) => (
                            <table key={chunkIndex} className="w-full border-collapse text-center text-sm mb-6 shadow-sm rounded-lg overflow-hidden bg-white/90">
                                <thead>
                                    <tr className="bg-red-100 text-red-800">{chunk.map((_, i) => (<th key={i} className="border border-red-200 p-2">س{(chunkIndex * chunkSize) + i + 1}</th>))}</tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-white/80">{chunk.map((q) => (<td key={q.id} className="border border-red-200 p-2 font-bold text-red-900">{editingId === q.id ? (<select value={q.correctAnswerIndex} onChange={(e) => onUpdateQuestion(q.id, { ...q, correctAnswerIndex: Number(e.target.value) })} className="bg-white border rounded text-xs p-1 no-print">{letterMap.map((l, idx) => (<option key={idx} value={idx}>[{l}]</option>))}</select>) : (<span dir="ltr" className="inline-block">[{letterMap[q.correctAnswerIndex]}]</span>)}</td>))}</tr>
                                </tbody>
                            </table>
                        ))}
                        <div className="space-y-4">
                            {questionsOnly.map((q, i) => (
                                <div key={q.id} className="text-xs text-gray-700 border-b border-red-100 pb-3 bg-white/50 rounded p-2"><div className="flex items-start gap-2"><span className="font-bold text-red-600 shrink-0">تفسير س{i + 1}:</span><div className="flex-grow">{editingId === q.id ? (<RichTextEditor value={q.explanation} onChange={(val) => onUpdateQuestion(q.id, { ...q, explanation: val })} className="text-[12px]" rows={2} placeholder="اكتب التفسير..." />) : <MathRenderer content={q.explanation || "لا يوجد تفسير متاح."} inline />}</div></div></div>
                            ))}
                        </div>
                    </div>
                </details>
            </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onLocalImageFileChange} />
      <input type="file" ref={ocrInputRef} className="hidden" accept="image/*" onChange={onOCRFileChange} />

      <div className="mt-8 no-print w-full max-w-[210mm] mx-auto flex flex-col md:flex-row gap-3 items-center justify-center border-2 border-dashed border-primary/40 rounded-xl p-4 hover:bg-blue-50 transition-all group">
          <button onClick={() => handleAddClick(1)} className="flex-1 text-primary font-bold hover:text-blue-800 transition flex items-center justify-center gap-2 w-full md:w-auto h-10"><span className="text-xl">➕</span> إضافة سؤال جديد</button>
          {onAddText && <button onClick={onAddText} className="flex-1 text-gray-600 font-bold hover:text-gray-900 transition flex items-center justify-center gap-2 w-full md:w-auto h-10 border-r border-gray-300"><span className="text-xl">📝</span> إضافة نص</button>}
          <div className="hidden md:block w-px h-6 bg-gray-300 mx-2"></div>
          <div className="md:hidden w-full h-px bg-gray-300 my-1"></div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-500 font-medium">إضافة سريعة:</span>
            <button onClick={() => handleAddClick(3)} className="px-3 py-1.5 bg-white border border-primary/30 rounded-lg text-primary text-xs font-bold hover:bg-primary hover:text-white transition shadow-sm">+3</button>
            <button onClick={() => handleAddClick(5)} className="px-3 py-1.5 bg-white border border-primary/30 rounded-lg text-primary text-xs font-bold hover:bg-primary hover:text-white transition shadow-sm">+5</button>
            <button onClick={() => handleAddClick(10)} className="px-3 py-1.5 bg-white border border-primary/30 rounded-lg text-primary text-xs font-bold hover:bg-primary hover:text-white transition shadow-sm">+10</button>
          </div>
      </div>

      <div className="no-print">
        {isProcessing && !aiModalOpen && (
          <div className="fixed bottom-10 left-10 z-[300] bg-primary text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce">
            <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
            <span className="font-bold">جاري معالجة البيانات ذكياً...</span>
          </div>
        )}
        {aiModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border-t-8 border-purple-600 animate-scale-up">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-purple-800 border-b pb-4"><span className="text-purple-600"><PaperIcons.Sparkles /></span> تعديل ذكي للسؤال</h3>
              <div className="space-y-6">
                <div><label className="block text-sm font-bold text-gray-700 mb-2">تعليمات التعديل</label><textarea value={aiInstructions} onChange={(e) => setAiInstructions(e.target.value)} placeholder="مثال: اجعل الأرقام أكثر تعقيداً..." className="w-full p-3 border border-purple-200 rounded-xl h-24 bg-white outline-none focus:ring-2 focus:ring-purple-200" /></div>
                <div>
                  <div className="flex justify-between items-center mb-2"><label className="text-sm font-bold text-gray-700">مستوى الصعوبة الجديد</label><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold text-xs">{aiDifficulty}/10</span></div>
                  <input type="range" min="1" max="10" value={aiDifficulty} onChange={(e) => setAiDifficulty(Number(e.target.value))} className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                </div>
                <div onClick={() => setAiGenerateShape(!aiGenerateShape)} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${aiGenerateShape ? 'bg-purple-50 border-purple-300' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${aiGenerateShape ? 'bg-purple-600 border-purple-600' : 'border-gray-400 bg-white'}`}>{aiGenerateShape && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}</div>
                  <div className="flex flex-col"><span className="font-bold text-gray-800 text-sm">توليد شكل توضيحي (Diagram)</span></div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8"><button onClick={() => setAiModalOpen(false)} className="px-6 py-2 border rounded-xl hover:bg-gray-50 font-bold text-gray-600">إلغاء</button><button onClick={submitAiEdit} disabled={isAiLoading} className="px-6 py-2 bg-purple-600 text-white rounded-xl shadow-lg hover:bg-purple-700 flex items-center gap-2 disabled:bg-purple-400 font-bold">{isAiLoading ? 'جاري المعالجة...' : 'تطبيق التعديلات ✨'}</button></div>
            </div>
          </div>
        )}
        {svgEditModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border-t-8 border-indigo-600 animate-scale-up">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-800">✏️ تعديل الشكل الهندسي</h3>
                <textarea value={svgEditModal.instruction} onChange={(e) => setSvgEditModal({...svgEditModal, instruction: e.target.value})} placeholder="اكتب التعديل المطلوب..." className="w-full p-3 border border-indigo-200 rounded-xl h-24 mb-6 bg-white outline-none focus:ring-2 focus:ring-indigo-200" autoFocus />
                <div className="flex justify-end gap-3"><button onClick={() => setSvgEditModal(null)} className="px-6 py-2 border rounded-xl hover:bg-gray-50 font-bold text-gray-600">إلغاء</button><button onClick={submitSvgEdit} className="px-6 py-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 font-bold">تنفيذ التعديل</button></div>
             </div>
          </div>
        )}
        {addOptionsModal && (
          <div className="fixed inset-0 z-[310] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in no-print">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-up border-t-4 border-primary">
              <h3 className="text-lg font-bold mb-4 text-gray-800 text-center">كيف تريد إضافة الأسئلة؟</h3>
              <div className="grid grid-cols-1 gap-3">
                 <button onClick={() => handleAddChoice('manual')} className="p-4 rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition flex items-center gap-3 group"><span className="text-2xl">✍️</span><span className="font-bold text-gray-800">إضافة فارغة (يدوي)</span></button>
                 <button onClick={() => handleAddChoice('ai')} className="p-4 rounded-xl border-2 border-purple-100 hover:border-purple-300 hover:bg-purple-50 transition flex items-center gap-3 group"><span className="text-2xl">✨</span><span className="font-bold text-purple-800">توليد ذكي (AI)</span></button>
              </div>
              <button onClick={() => setAddOptionsModal(null)} className="mt-4 w-full py-2 text-gray-500 hover:text-gray-700 font-medium">إلغاء</button>
            </div>
          </div>
        )}
        {addAiTopicModal && (
          <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in no-print">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up border-t-8 border-purple-600">
               <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-800">توليد أسئلة جديدة</h3>
              <textarea value={newQuestionsTopic} onChange={(e) => setNewQuestionsTopic(e.target.value)} placeholder="موضوع الأسئلة..." className="w-full p-3 border border-purple-200 rounded-xl h-32 mb-6 bg-white outline-none focus:ring-2 focus:ring-purple-200" autoFocus />
              <div className="flex justify-end gap-3"><button onClick={() => setAddAiTopicModal(null)} className="px-6 py-2 border rounded-xl hover:bg-gray-50 font-bold text-gray-600">إلغاء</button><button onClick={submitAddAi} className="px-6 py-2 bg-purple-600 text-white rounded-xl shadow-lg hover:bg-purple-700 font-bold">✨ توليد الأسئلة</button></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ExamPaper;
