import React, { useState, useRef, useEffect, useCallback } from 'react';
import ExamForm from './components/ExamForm';
import ExamPaper from './components/ExamPaper';
import ExportModal, { ExportFormat } from './components/ExportModal';
import JsonEditorModal from './components/JsonEditorModal';
import WatermarkSettingsModal from './components/WatermarkSettingsModal'; 
import DesignSettingsModal from './components/DesignSettingsModal'; 
import AppSettingsModal from './components/AppSettingsModal';
import ServiceContinuityModal, { ServiceContinuityState } from './components/ServiceContinuityModal';

// Import both Gemini and OpenAI services
import * as geminiService from './services/geminiService';
import * as openaiService from './services/openaiService';

import { ExamData, GenerationParams, Question, WatermarkSettings, DesignSettings, AppSettings } from './types';
import { useNotification } from './components/NotificationSystem';

// Access globally loaded libraries
declare var html2canvas: any;
declare var jspdf: any;

// ============================================================================
// AI Service Provider Management
// ============================================================================

type AIProvider = 'gemini' | 'openai';

interface AIService {
  generateExam: (params: GenerationParams, showNotification: (message: string) => void) => Promise<ExamData>;
  editQuestionWithAI: (
    currentQuestion: Question, 
    instructions: string, 
    showNotification: (message: string) => void,
    imageBase64?: string,
    difficulty?: number,
    withShape?: boolean
  ) => Promise<Omit<Question, 'id'>>;
  modifySvgWithAI: (currentSvg: string, instruction: string, showNotification: (message: string) => void) => Promise<string>;
  describeVisualWithAI: (content: string, isSvg: boolean, showNotification: (message: string) => void) => Promise<string>;
  extractQuestionFromImage: (imageBase64: string, showNotification: (message: string) => void) => Promise<Omit<Question, 'id'>>;
  regenerateAnswerKey: (questions: Question[], showNotification: (message: string) => void) => Promise<{ id: number, correctAnswerIndex: number, explanation: string }[]>;
  setApiKey: (key: string) => void;
}

// Service mapping
const services: Record<AIProvider, AIService> = {
  gemini: {
    generateExam: geminiService.generateExam,
    editQuestionWithAI: geminiService.editQuestionWithAI,
    modifySvgWithAI: geminiService.modifySvgWithAI,
    describeVisualWithAI: geminiService.describeVisualWithAI,
    extractQuestionFromImage: geminiService.extractQuestionFromImage,
    regenerateAnswerKey: geminiService.regenerateAnswerKey,
    setApiKey: geminiService.setApiKey,
  },
  openai: {
    generateExam: openaiService.generateExam,
    editQuestionWithAI: openaiService.editQuestionWithAI,
    modifySvgWithAI: openaiService.modifySvgWithAI,
    describeVisualWithAI: openaiService.describeVisualWithAI,
    extractQuestionFromImage: openaiService.extractQuestionFromImage,
    regenerateAnswerKey: openaiService.regenerateAnswerKey,
    setApiKey: openaiService.setOpenAIApiKey,
  },
};

// --- DEFAULT ASSETS ---
const DEFAULT_WATERMARK = "https://iili.io/fPlgQLv.md.png"; 
const DEFAULT_QR = "https://iili.io/fP0Kget.md.png";
const DEFAULT_LEFT_LOGO = "https://iili.io/fPlgQLv.md.png";

const validateLatex = (text: string): string | undefined => {
  if (!text) return undefined;
  const inlineOpen = (text.match(/\\\(/g) || []).length;
  const inlineClose = (text.match(/\\\)/g) || []).length;
  if (inlineOpen !== inlineClose) return `أقواس معادلات غير متزنة`;
  return undefined;
};

const validateQuestion = (q: Question): Question => {
  let error = validateLatex(q.text);
  
  if (!error && q.type !== 'text_only') {
    for (const opt of q.options) {
      error = validateLatex(opt);
      if (error) break;
    }
  }
  return { ...q, validationError: error };
};

const defaultWatermarkSettings: WatermarkSettings = {
  opacity: 0.1,
  rotation: -15,
  scale: 1,
  placement: 'question',
  gridSize: '3x4', 
  questionWmarkCount: 6,
  isOverlay: false
};

const defaultDesignSettings: DesignSettings = {
  pageBorder: 'modern_right',
  pageBorderColor: '#1e3a8a',
  pageBorderWidth: 3,
  pagePadding: 20,
  pageMargin: 20,
  pageBgColor: '#ffffff',
  headerBorder: 'modern_bottom',
  headerBgColor: 'transparent',
  headerBorderColor: '#1e3a8a',
  headerBorderWidth: 3,
  headerBorderRadius: 0,
  headerPadding: 16,
  headerMargin: 20,
  headerImageRight: DEFAULT_QR,
  headerImageLeft: DEFAULT_LEFT_LOGO,
  headerImageRightWidth: 120,
  headerImageLeftWidth: 200,
  questionBorder: 'simple',
  questionBgColor: 'rgba(255, 255, 255, 0.95)',
  questionBorderColor: '#e5e7eb',
  questionBorderWidth: 1,
  questionPadding: 16,
  questionMargin: 16,
  questionBorderRadius: 8
};

const defaultAppSettings: AppSettings = {
  apiKey: '', // Don't show default API key in UI - used internally by service
  geminiApiKey: '', // Don't show default API key in UI - used internally by service
  useGemini: true,
  openaiApiKey: '', // Don't show default API key in UI - used internally by service
  useOpenAI: false,
  titleFont: 'Lalezar',
  titleColor: '#1e3a8a',
  questionFont: 'Tajawal',
  questionColor: '#111827',
  optionFont: 'Tajawal',
  optionColor: '#374151'
};

const App: React.FC = () => {
  const [examData, setExamData] = useState<ExamData | null>(null);
  
  // History State
  const [history, setHistory] = useState<ExamData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [isWatermarkModalOpen, setIsWatermarkModalOpen] = useState(false); 
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false); 
  
  // App Settings State
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('physics_app_settings');
    return saved ? JSON.parse(saved) : defaultAppSettings;
  });
  const [isAppSettingsOpen, setIsAppSettingsOpen] = useState(false);
  const [settingsFocusField, setSettingsFocusField] = useState<'gemini' | 'openai' | null>(null);

  // Service Continuity State
  const [serviceContinuityState, setServiceContinuityState] = useState<ServiceContinuityState>({
    isOpen: false,
    provider: null,
    message: '',
    countdownSeconds: 0,
    onRetry: () => {},
    onUsePrivateKey: () => {},
  });

  // Pending operation for retry
  const pendingOperationRef = useRef<(() => Promise<void>) | null>(null);

  // Variant Modal State
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [variantInstructions, setVariantInstructions] = useState('');

  const [needsAnswerUpdate, setNeedsAnswerUpdate] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);
  const { showToast, confirm } = useNotification();

  // ============================================================================
  // AI Provider Management
  // ============================================================================

  const getActiveProvider = useCallback((): AIProvider => {
    // Check user preference
    if (appSettings.useOpenAI && appSettings.openaiApiKey) return 'openai';
    if (appSettings.useGemini !== false && appSettings.geminiApiKey) return 'gemini';
    
    // Default to gemini
    return 'gemini';
  }, [appSettings]);

  const getService = useCallback((): AIService => {
    return services[getActiveProvider()];
  }, [getActiveProvider]);

  // Initialize API keys on load
  useEffect(() => {
    if (appSettings.geminiApiKey || appSettings.apiKey) {
      geminiService.setApiKey(appSettings.geminiApiKey || appSettings.apiKey || '');
    }
    if (appSettings.openaiApiKey) {
      openaiService.setOpenAIApiKey(appSettings.openaiApiKey);
    }
  }, []);

  // ============================================================================
  // Service Continuity Handler
  // ============================================================================

  const handleServiceContinuity = useCallback((
    provider: AIProvider,
    message: string,
    retryOperation: () => Promise<void>,
    countdownSeconds: number = 30
  ) => {
    pendingOperationRef.current = retryOperation;
    
    setServiceContinuityState({
      isOpen: true,
      provider,
      message,
      countdownSeconds,
      onRetry: () => {
        if (pendingOperationRef.current) {
          pendingOperationRef.current();
        }
      },
      onUsePrivateKey: () => {
        setSettingsFocusField(provider);
        setIsAppSettingsOpen(true);
      },
    });
  }, []);

  const closeServiceContinuity = useCallback(() => {
    setServiceContinuityState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // ============================================================================
  // Error Handler
  // ============================================================================

  const handleAIError = useCallback(async (
    error: any, 
    provider: AIProvider,
    retryOperation: () => Promise<void>
  ): Promise<boolean> => {
    const errorCode = error?.code;
    const errorMessage = error?.message || '';

    // Check for specific error codes
    if (errorCode === 'GEMINI_ALL_MODELS_FAILED' || errorCode === 'OPENAI_ALL_MODELS_FAILED') {
      handleServiceContinuity(
        provider,
        provider === 'gemini' 
          ? 'نعتذر عن الانقطاع، تم الوصول للحد الأقصى للطلبات المجانية. يمكنك الانتظار قليلاً لإعادة المحاولة تلقائياً، أو متابعة العمل فوراً باستخدام مفتاح API الخاص بك.'
          : 'نظراً للقيود الصارمة على OpenAI (3 طلبات/دقيقة)، لا يمكن معالجة طلبك الآن. يمكنك الانتظار 20 ثانية لإعادة المحاولة، أو إضافة مفتاح API الخاص بك لإزالة جميع القيود.',
        retryOperation,
        provider === 'gemini' ? 30 : 20
      );
      return true;
    }

    // Check for API key missing
    if (errorMessage.includes('GEMINI_API_KEY_MISSING') || errorMessage.includes('OPENAI_API_KEY_MISSING')) {
      showToast('مفتاح API غير موجود. يرجى إضافته في الإعدادات.', 'error');
      setSettingsFocusField(provider);
      setIsAppSettingsOpen(true);
      return true;
    }

    return false;
  }, [handleServiceContinuity, showToast]);

  // ============================================================================
  // Settings Handler
  // ============================================================================

  const handleUpdateAppSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    localStorage.setItem('physics_app_settings', JSON.stringify(newSettings));
    
    // Update API keys in services
    if (newSettings.geminiApiKey || newSettings.apiKey) {
      geminiService.setApiKey(newSettings.geminiApiKey || newSettings.apiKey || '');
    }
    if (newSettings.openaiApiKey) {
      openaiService.setOpenAIApiKey(newSettings.openaiApiKey);
    }
    
    showToast("تم حفظ إعدادات التطبيق", "success");
    setSettingsFocusField(null);
  };

  // Helper to push state to history
  const pushToHistory = (newData: ExamData) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setExamData(newData);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setExamData(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setExamData(history[newIndex]);
    }
  };

  // ============================================================================
  // Exam Generation with Error Handling
  // ============================================================================

  const handleGenerate = async (params: GenerationParams) => {
    setLoading(true);
    const provider = getActiveProvider();
    const service = getService();

    const performGeneration = async () => {
      try {
        const data = await service.generateExam(params, showToast);
        const validatedQuestions = data.questions.map(q => validateQuestion({ ...q, type: 'multiple_choice' }));
        
        const newData = { 
          ...data, 
          questions: validatedQuestions,
          watermark: data.watermark || DEFAULT_WATERMARK,
          watermarkSettings: data.watermarkSettings || defaultWatermarkSettings,
          designSettings: data.designSettings || defaultDesignSettings
        };
        
        pushToHistory(newData);
        setNeedsAnswerUpdate(false);
        setIsModalOpen(false); 
        showToast("تم إنشاء الاختبار بنجاح!", "success");
      } catch (err: any) {
        const handled = await handleAIError(err, provider, () => handleGenerate(params));
        if (!handled) {
          showToast(err.message || "حدث خطأ أثناء التوليد", "error");
        }
      } finally {
        setLoading(false);
      }
    };

    await performGeneration();
  };

  const handleGenerateVariant = () => {
    if (!examData) return;
    setVariantInstructions('');
    setIsVariantModalOpen(true);
  };

  const confirmGenerateVariant = async () => {
    if (!examData) return;
    
    setIsVariantModalOpen(false);
    setLoading(true);
    
    const provider = getActiveProvider();
    const service = getService();
    
    const performGeneration = async () => {
      try {
        const questionCount = examData.questions.length;
        const topic = examData.lessonTitle.replace(' (نموذج جديد)', '').replace(' (نموذج 2)', '');

        const baseInstructions = `هام جداً: هذا هو "النموذج ب" لنفس الاختبار. المطلوب هو توليد نفس عدد الأسئلة حول نفس الأفكار الفيزيائية ولكن بـ "أرقام مختلفة" أو "صيغ مختلفة" أو "مطاليب عكسية". الهدف هو إنشاء نموذج مكافئ للاختبار السابق ولكن مختلف لمنع الغش.`;
        
        const finalInstructions = variantInstructions.trim() 
          ? `${baseInstructions}\n\nتعليمات إضافية من المستخدم للتعديل: "${variantInstructions}"`
          : baseInstructions;

        const params: GenerationParams = {
          lessonTitle: topic,
          questionCount: questionCount,
          difficulty: 5,
          instructions: finalInstructions
        };

        const data = await service.generateExam(params, showToast);
        const validatedQuestions = data.questions.map(q => validateQuestion({ ...q, type: 'multiple_choice' }));
        
        setExamData({ 
            ...data, 
            lessonTitle: `${topic} (نموذج جديد)`,
            questions: validatedQuestions,
            watermark: examData.watermark || DEFAULT_WATERMARK,
            watermarkSettings: examData.watermarkSettings || defaultWatermarkSettings,
            designSettings: examData.designSettings || defaultDesignSettings
        });
        setNeedsAnswerUpdate(false);
        
        showToast("تم إنشاء النموذج المغاير بنجاح", "success");
      } catch (err: any) {
        const handled = await handleAIError(err, provider, confirmGenerateVariant);
        if (!handled) {
          showToast(err.message || "فشل إنشاء النموذج", "error");
        }
      } finally {
        setLoading(false);
      }
    };

    await performGeneration();
  };

  const handleAddAIQuestions = async (count: number, topic: string) => {
    if (!examData) return;
    setLoading(true);
    
    const provider = getActiveProvider();
    const service = getService();
    
    const performGeneration = async () => {
      try {
        const data = await service.generateExam({
          lessonTitle: topic,
          questionCount: count,
          difficulty: 5,
          instructions: `هذه أسئلة إضافية لاختبار بعنوان: ${examData.lessonTitle}. الموضوع المحدد لهذه الأسئلة هو: ${topic}`
        }, showToast);
        
        const currentMaxId = Math.max(...examData.questions.map(q => q.id), 0);
        const newQuestions = data.questions.map((q, index) => validateQuestion({
          ...q,
          id: currentMaxId + index + 1,
          type: 'multiple_choice'
        }));

        setExamData({
          ...examData,
          questions: [...examData.questions, ...newQuestions]
        });
        setNeedsAnswerUpdate(true);
        showToast(`تم توليد ${count} أسئلة بنجاح`, "success");
      } catch (err: any) {
        const handled = await handleAIError(err, provider, () => handleAddAIQuestions(count, topic));
        if (!handled) {
          showToast("فشل توليد الأسئلة الإضافية", "error");
        }
      } finally {
        setLoading(false);
      }
    };

    await performGeneration();
  };

  // ============================================================================
  // Export Functions
  // ============================================================================

  const performExport = async (format: ExportFormat, includeAnswers: boolean) => {
    if (!examData) return;
    
    if (includeAnswers && needsAnswerUpdate) {
       const shouldProceed = await confirm({
           title: '⚠️ نموذج الإجابة غير محدث',
           message: 'لقد قمت بإجراء تعديلات على الأسئلة ولم تقم بتحديث "نموذج الإجابة".\n\nقد تكون التفسيرات أو الخيارات الصحيحة في الملف غير متطابقة مع الأسئلة المعدلة.\n\nهل تريد المتابعة في التصدير على أي حال؟',
           confirmText: 'نعم، تصدير كما هي',
           cancelText: 'إلغاء للتحديث',
           type: 'danger'
       });
       
       if (!shouldProceed) return;
    }

    const element = document.getElementById('exam-paper-printable');
    if (!element) return;

    setLoading(true);

    if (window.MathJax && window.MathJax.typesetPromise) {
      await window.MathJax.typesetPromise();
    }

    const akSection = element.querySelector('.answer-key-section') as HTMLElement;
    const akHeader = element.querySelector('.export-answer-header') as HTMLElement;
    const detailsEl = akSection?.querySelector('details');
    const noPrints = element.querySelectorAll('.no-print');
    const boundaryLines = element.querySelectorAll('.page-boundary-line');
    const boundaryLabels = element.querySelectorAll('.page-boundary-label');

    const originalAkDisplay = akSection ? akSection.style.display : '';
    const originalHeaderDisplay = akHeader ? akHeader.style.display : '';
    const originalMinHeight = element.style.minHeight; 
    const wasDetailsOpen = detailsEl ? detailsEl.hasAttribute('open') : false;
    
    const questions = Array.from(element.querySelectorAll('.question-block')) as HTMLElement[];
    const originalMargins = new Map<HTMLElement, string>();
    questions.forEach(q => originalMargins.set(q, q.style.marginTop));

    const closingPhrase = element.querySelector('.closing-phrase') as HTMLElement;
    let explicitHeight = '';

    try {
      if (includeAnswers) {
        if (akSection) akSection.style.display = 'block';
        if (akHeader) akHeader.style.display = 'block';
        if (detailsEl) detailsEl.setAttribute('open', 'true');
      } else {
        if (akSection) akSection.style.display = 'none';
      }

      boundaryLines.forEach(el => (el as HTMLElement).style.display = 'none');
      boundaryLabels.forEach(el => (el as HTMLElement).style.display = 'none');
      noPrints.forEach(el => (el as HTMLElement).style.display = 'none');
      
      if (format === 'pdf') {
          const PAGE_HEIGHT = 1120;
          const PAGE_PADDING = 30;

          for (const q of questions) {
            const paperRect = element.getBoundingClientRect();
            const rect = q.getBoundingClientRect();
            const relativeTop = rect.top - paperRect.top;
            const relativeBottom = rect.bottom - paperRect.top;
            const startPage = Math.floor(relativeTop / PAGE_HEIGHT);
            const endPage = Math.floor(relativeBottom / PAGE_HEIGHT);

            if (startPage !== endPage) {
               const nextPageStart = (startPage + 1) * PAGE_HEIGHT;
               const shiftAmount = nextPageStart - relativeTop + PAGE_PADDING;
               q.style.marginTop = `${shiftAmount}px`;
            }
          }

          if (closingPhrase && !includeAnswers) {
              const paperRect = element.getBoundingClientRect();
              const phraseRect = closingPhrase.getBoundingClientRect();
              const relativeBottom = phraseRect.bottom - paperRect.top + 20; 
              const pagesNeeded = Math.ceil(relativeBottom / PAGE_HEIGHT);
              explicitHeight = `${pagesNeeded * PAGE_HEIGHT}px`;
              element.style.height = explicitHeight;
          }
      } else {
          element.style.height = 'auto';
          element.style.minHeight = 'auto';
      }

      await new Promise(r => setTimeout(r, 100));

      if (format === 'pdf') {
        showToast("جاري توليد ملف PDF...", "info");
        const canvas = await html2canvas(element, {
          scale: 3, 
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          imageTimeout: 0,
          windowWidth: 1000,
          height: explicitHeight ? parseInt(explicitHeight) : undefined,
          windowHeight: explicitHeight ? parseInt(explicitHeight) : undefined
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jspdf.jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfImgHeight = (imgProps.height * pageWidth) / imgProps.width;

        let heightLeft = pdfImgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, pdfImgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 10) { 
          position = heightLeft - pdfImgHeight; 
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, pdfImgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`اختبار_${examData.lessonTitle}.pdf`);
        showToast("تم توليد ملف PDF بنجاح", "success");

      } else if (format === 'png') {
        showToast("جاري توليد ملف PNG...", "info");
        const canvas = await html2canvas(element, { 
            scale: 3, 
            useCORS: true, 
            backgroundColor: '#ffffff', 
            logging: false,
            height: undefined, 
            windowHeight: undefined
        });
        const link = document.createElement('a');
        link.download = `اختبار_${examData.lessonTitle}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        showToast("تم تحميل الصورة", "success");

      } else if (format === 'html') {
        showToast("جاري تحضير ملف HTML...", "info");
        const clonedElement = element.cloneNode(true) as HTMLElement;
        const clonedNoPrints = clonedElement.querySelectorAll('.no-print');
        clonedNoPrints.forEach(item => item.remove());
        const clonedBoundaries = clonedElement.querySelectorAll('.page-boundary-line');
        const clonedLabels = clonedElement.querySelectorAll('.page-boundary-label');
        clonedBoundaries.forEach(el => el.remove());
        clonedLabels.forEach(el => el.remove());
        clonedElement.style.height = 'auto';
        
        const clonedQuestions = clonedElement.querySelectorAll('.question-block');
        clonedQuestions.forEach(q => (q as HTMLElement).style.marginTop = '');

        const htmlContent = `
          <!DOCTYPE html>
          <html lang="ar" dir="rtl">
          <head>
            <meta charset="UTF-8">
            <title>${examData.lessonTitle}</title>
            <script src="https://cdn.tailwindcss.com"><\/script>
            <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"><\/script>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap');
              body { padding: 40px; font-family: 'Tajawal', sans-serif; background: #f0f2f5; direction: rtl; }
              .paper { background: white; padding: 40px; border-radius: 12px; max-width: 900px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
              
              mjx-container { 
                direction: ltr !important; 
                display: inline-flex !important;
                vertical-align: middle !important;
                margin: 0 2px;
              }
              mjx-container[display="true"] {
                display: flex !important;
                margin: 1em 0 !important;
                width: 100%;
                justify-content: center;
              }
              svg {
                max-width: 100%;
                overflow: visible;
              }
            </style>
          </head>
          <body><div class="paper">${clonedElement.innerHTML}</div></body>
          </html>`;
        
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `اختبار_${examData.lessonTitle}.html`;
        a.click();
        showToast("تم تحميل ملف HTML", "success");
      }

      setIsExportModalOpen(false);

    } catch (err) {
      console.error("Export Error:", err);
      showToast("حدث خطأ أثناء التصدير", "error");
    } finally {
      if (akSection) akSection.style.display = originalAkDisplay;
      if (akHeader) akHeader.style.display = originalHeaderDisplay;
      if (detailsEl) {
         if (wasDetailsOpen) detailsEl.setAttribute('open', 'true');
         else detailsEl.removeAttribute('open');
      }
      boundaryLines.forEach(el => (el as HTMLElement).style.display = '');
      boundaryLabels.forEach(el => (el as HTMLElement).style.display = '');
      noPrints.forEach(el => (el as HTMLElement).style.display = '');
      element.style.minHeight = originalMinHeight;
      element.style.height = ''; 
      questions.forEach(q => {
          const original = originalMargins.get(q);
          q.style.marginTop = original || '';
      });
      setLoading(false);
    }
  };

  const handleSaveData = async () => {
    if (!examData) return;
    const ok = await confirm({ title: 'حفظ البيانات', message: 'سيتم تحميل ملف (.phQ) يحتوي على الأسئلة لتعديلها لاحقاً.' });
    if (!ok) return;
    const blob = new Blob([JSON.stringify(examData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `exam_${examData.lessonTitle}.phQ`;
    link.click();
  };

  const handleLoadData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        setExamData({ ...data, questions: data.questions.map(validateQuestion) });
        setNeedsAnswerUpdate(false); 
        setIsModalOpen(false);
        showToast("تم استيراد الاختبار", "success");
      } catch (err) { showToast("فشل الاستيراد", "error"); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && examData) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const currentSettings = examData.watermarkSettings || defaultWatermarkSettings;
          setExamData({
             ...examData,
             watermark: ev.target.result as string,
             watermarkSettings: currentSettings
          });
          showToast("تم إضافة العلامة المائية", "success");
          setIsWatermarkModalOpen(true);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
    e.target.value = '';
  };

  const handleFinishEdit = async (questionId: number) => {
     setNeedsAnswerUpdate(true);
  };

  // ============================================================================
  // AI Operations with Error Handling
  // ============================================================================

  const handleAIEditQuestion = async (
    id: number, 
    instructions: string, 
    img: string | undefined, 
    difficulty: number | undefined, 
    withShape: boolean | undefined
  ) => {
    if (!examData) return;
    const q = examData.questions.find(x => x.id === id);
    if (!q) return;

    setLoading(true);
    const provider = getActiveProvider();
    const service = getService();

    const performEdit = async () => {
      try {
        const res = await service.editQuestionWithAI(q, instructions, showToast, img, difficulty, withShape);
        setExamData({ 
          ...examData, 
          questions: examData.questions.map(x => x.id === id ? { ...x, ...res, imageUrl: img || x.imageUrl } : x) 
        });
        setNeedsAnswerUpdate(true);
        showToast("تم تعديل السؤال بنجاح", "success");
      } catch (e: any) {
        const handled = await handleAIError(e, provider, () => handleAIEditQuestion(id, instructions, img, difficulty, withShape));
        if (!handled) {
          showToast(e.message || "فشل تعديل السؤال", "error");
        }
      } finally {
        setLoading(false);
      }
    };

    await performEdit();
  };

  const handleOCRQuestion = async (id: number, img: string) => {
    if (!examData) return;
    setLoading(true);
    
    const provider = getActiveProvider();
    const service = getService();

    const performOCR = async () => {
      try {
        const res = await service.extractQuestionFromImage(img, showToast);
        setExamData({ 
          ...examData, 
          questions: examData.questions.map(q => q.id === id ? { ...q, ...res, imageUrl: img } : q) 
        });
        setNeedsAnswerUpdate(true);
        showToast("تم استخراج البيانات", "success");
      } catch (e: any) {
        const handled = await handleAIError(e, provider, () => handleOCRQuestion(id, img));
        if (!handled) {
          showToast("فشل الاستخراج", "error");
        }
      } finally {
        setLoading(false);
      }
    };

    await performOCR();
  };

  const handleModifySvg = async (id: number, instruction: string) => {
    if (!examData) return;
    setLoading(true);
    
    const provider = getActiveProvider();
    const service = getService();

    const performModify = async () => {
      try {
        const q = examData.questions.find(x => x.id === id);
        if (!q || !q.svgCode) return;
        
        const newSvg = await service.modifySvgWithAI(q.svgCode, instruction, showToast);
        setExamData({ 
          ...examData, 
          questions: examData.questions.map(x => x.id === id ? { ...x, svgCode: newSvg } : x) 
        });
        setNeedsAnswerUpdate(true);
        showToast("تم تعديل الشكل بنجاح", "success");
      } catch (e: any) {
        const handled = await handleAIError(e, provider, () => handleModifySvg(id, instruction));
        if (!handled) {
          showToast("فشل تعديل الشكل", "error");
        }
      } finally {
        setLoading(false);
      }
    };

    await performModify();
  };

  const handleDescribeVisual = async (id: number, content: string, type: 'svg' | 'image') => {
    if (!examData) return;
    setLoading(true);
    
    const provider = getActiveProvider();
    const service = getService();

    const performDescribe = async () => {
      try {
        const desc = await service.describeVisualWithAI(content, type === 'svg', showToast);
        setExamData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                questions: prev.questions.map(q => 
                    q.id === id ? { ...q, visualDescription: desc } : q
                )
            };
        });
        setNeedsAnswerUpdate(true);
        showToast("تم توليد وحفظ وصف الشكل", "success");
      } catch (e: any) {
        const handled = await handleAIError(e, provider, () => handleDescribeVisual(id, content, type));
        if (!handled) {
          showToast("فشل تحليل الشكل", "error");
        }
      } finally {
        setLoading(false);
      }
    };

    await performDescribe();
  };

  const handleRegenerateAnswerKey = async () => {
    if (!examData) return;
    setLoading(true);
    
    const provider = getActiveProvider();
    const service = getService();

    const performRegenerate = async () => {
      try {
        const questionsOnly = examData.questions.filter(q => q.type !== 'text_only');
        const res = await service.regenerateAnswerKey(questionsOnly, showToast);
        setExamData({ 
          ...examData, 
          questions: examData.questions.map(q => {
            const ans = res.find(a => a.id === q.id);
            return ans ? { ...q, correctAnswerIndex: ans.correctAnswerIndex, explanation: ans.explanation } : q;
          })
        });
        setNeedsAnswerUpdate(false); 
        showToast("تم تحديث الإجابات", "success");
      } catch (e: any) {
        const handled = await handleAIError(e, provider, handleRegenerateAnswerKey);
        if (!handled) {
          showToast("فشل التحديث", "error");
        }
      } finally {
        setLoading(false);
      }
    };

    await performRegenerate();
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 flex flex-col items-center">
      <header className="mb-8 text-center print:hidden flex flex-col items-center no-print">
        <h1 className="text-4xl font-extrabold text-primary mb-2 tracking-tight">مولد اختبارات الفيزياء ⚛️</h1>
        <div className="flex flex-wrap justify-center gap-4">
          {!isModalOpen && (
            <>
                <button onClick={() => setIsModalOpen(true)} className="bg-primary text-white font-bold py-2 px-6 rounded-full shadow hover:bg-blue-900 transition flex items-center gap-2"><span>✨</span> إنشاء جديد</button>
                {examData && (
                    <button 
                        onClick={handleGenerateVariant} 
                        className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-full shadow hover:bg-indigo-700 transition flex items-center gap-2"
                        title="إنشاء نموذج مختلف بنفس الموضوع (نموذج ب)"
                    >
                        <span>🔄</span> نموذج آخر
                    </button>
                )}
            </>
          )}
          <button onClick={() => fileInputRef.current?.click()} className="bg-white text-gray-700 border border-gray-300 font-bold py-2 px-6 rounded-full shadow hover:bg-gray-50 transition">📂 فتح ملف</button>
          <input type="file" ref={fileInputRef} onChange={handleLoadData} accept=".phQ,.json" className="hidden" />
          {/* Watermark input hidden */}
          {/* <input type="file" ref={watermarkInputRef} onChange={handleWatermarkUpload} accept="image/*" className="hidden" /> */}
        </div>
      </header>

      <main className="w-full max-w-5xl printable-content-area">
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
            <div className="w-full max-w-2xl">
              <ExamForm onSubmit={handleGenerate} isLoading={loading} onClose={() => setIsModalOpen(false)} />
            </div>
          </div>
        )}

        {examData && (
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="w-full max-w-[210mm] flex justify-between items-center bg-white p-4 rounded-lg shadow no-print border-b-2 border-primary/20 flex-wrap gap-2">
              <h3 className="font-bold text-gray-700 grow flex items-center gap-2">
                <span>معاينة الاختبار: <span className="text-primary">{examData.lessonTitle}</span></span>
                {getActiveProvider() === 'openai' && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">OpenAI</span>
                )}
                {getActiveProvider() === 'gemini' && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Gemini</span>
                )}
              </h3>
              
              <div className="flex gap-2 items-center flex-row-reverse">
                
                {/* Undo/Redo Buttons */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                  <button 
                    onClick={handleUndo} 
                    disabled={historyIndex <= 0}
                    className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="تراجع (Undo)"
                  >
                    <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                  </button>
                  <button 
                    onClick={handleRedo} 
                    disabled={historyIndex >= history.length - 1}
                    className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="إعادة (Redo)"
                  >
                    <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                  </button>
                </div>

                <div className="w-px h-8 bg-gray-200 mx-1"></div>

                {/* JSON Editor Button */}
                <button 
                  onClick={() => setIsJsonModalOpen(true)}
                  className="px-3 py-2 bg-gray-700 text-white font-bold rounded hover:bg-gray-800 font-mono text-sm shadow-sm"
                  title="تعديل الكود المصدري JSON"
                >
                  {`{ }`}
                </button>

                {/* App Settings Button */}
                <button 
                  onClick={() => {
                    setSettingsFocusField(null);
                    setIsAppSettingsOpen(true);
                  }}
                  className="px-3 py-2 bg-gray-600 text-white font-bold rounded hover:bg-gray-700 text-sm shadow-sm flex items-center gap-1"
                  title="إعدادات التطبيق (الخطوط، الألوان، API Key)"
                >
                  <span>⚙️</span> إعدادات
                </button>

                {/* Design Button */}
                <button 
                  onClick={() => setIsDesignModalOpen(true)}
                  className="px-3 py-2 bg-purple-50 text-purple-600 border border-purple-200 font-bold rounded hover:bg-purple-100 text-sm shadow-sm flex items-center gap-1"
                  title="إعدادات التصميم والإطارات"
                >
                  <span>🎨</span> تصميم
                </button>

                {/* Watermark Button - Hidden */}
                {/* <button 
                  onClick={() => examData.watermark ? setIsWatermarkModalOpen(true) : watermarkInputRef.current?.click()}
                  className="px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 font-bold rounded hover:bg-blue-100 text-sm shadow-sm flex items-center gap-1"
                  title="إعدادات العلامة المائية"
                >
                  <span>💧</span> {examData.watermark ? 'إعدادات العلامة' : 'إضافة علامة'}
                </button> */}

                <div className="w-px h-8 bg-gray-200 mx-1"></div>

                <button onClick={handleSaveData} className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow-sm text-sm">💾 حفظ</button>
                <button onClick={() => setIsExportModalOpen(true)} className="px-6 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 shadow-sm text-sm">📤 تصدير</button>
              </div>
            </div>

            <ExamPaper 
              data={examData} 
              appSettings={appSettings}
              needsAnswerUpdate={needsAnswerUpdate}
              onReorderQuestions={(from, to) => {
                const updated = [...examData.questions];
                const [moved] = updated.splice(from, 1);
                updated.splice(to, 0, moved);
                setExamData({ ...examData, questions: updated });
                setNeedsAnswerUpdate(true);
              }}
              onAddQuestion={(count = 1) => {
                const currentMaxId = Math.max(...examData.questions.map(q => q.id), 0);
                const newQuestions: Question[] = [];
                for (let i = 0; i < count; i++) {
                  newQuestions.push(validateQuestion({ 
                    id: currentMaxId + i + 1, 
                    type: 'multiple_choice',
                    text: "اكتب نص السؤال هنا...", 
                    options: ["", "", "", ""], 
                    correctAnswerIndex: 0, 
                    explanation: "" 
                  }));
                }
                setExamData({ ...examData, questions: [...examData.questions, ...newQuestions] });
                setNeedsAnswerUpdate(true);
                showToast(`تم إضافة ${count > 1 ? count + ' أسئلة' : 'سؤال جديد'}`, "success");
              }}
              onAddQuestionAI={handleAddAIQuestions}
              onAddText={() => {
                const currentMaxId = Math.max(...examData.questions.map(q => q.id), 0);
                const newTextItem: Question = {
                  id: currentMaxId + 1,
                  type: 'text_only',
                  text: "اكتب العنوان أو التعليمات هنا...",
                  options: [],
                  correctAnswerIndex: -1,
                  explanation: ""
                };
                setExamData({ ...examData, questions: [...examData.questions, newTextItem] });
                setNeedsAnswerUpdate(true);
                showToast("تم إضافة مربع نص جديد", "success");
              }}
              onUpdateQuestion={(id, updated) => {
                  setExamData({ ...examData, questions: examData.questions.map(q => q.id === id ? validateQuestion(updated) : q) });
                  setNeedsAnswerUpdate(true);
              }}
              onDeleteQuestion={(id) => {
                  setExamData({ ...examData, questions: examData.questions.filter(q => q.id !== id) });
                  setNeedsAnswerUpdate(true);
              }}
              onDuplicateQuestion={(id) => {
                const q = examData.questions.find(x => x.id === id);
                if (!q) return;
                const newId = Math.max(...examData.questions.map(x => x.id), 0) + 1;
                const duplicated = validateQuestion({ ...q, id: newId });
                const index = examData.questions.findIndex(x => x.id === id);
                const updatedQuestions = [...examData.questions];
                updatedQuestions.splice(index + 1, 0, duplicated);
                setExamData({ ...examData, questions: updatedQuestions });
                setNeedsAnswerUpdate(true);
                showToast("تم تكرار العنصر بنجاح", "success");
              }}
              onAIEditQuestion={handleAIEditQuestion}
              onFinishEdit={handleFinishEdit}
              onRegenerateAnswerKey={handleRegenerateAnswerKey}
              onOCRQuestion={handleOCRQuestion}
              onModifySvg={handleModifySvg}
              onDescribeVisual={handleDescribeVisual}
              onUpdateSettings={(settings) => {
                  setExamData({ ...examData, ...settings });
              }}
              isProcessing={loading}
            />
          </div>
        )}
        
        <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} onExport={performExport} isProcessing={loading} />
        
        {examData && (
          <JsonEditorModal 
            isOpen={isJsonModalOpen} 
            onClose={() => setIsJsonModalOpen(false)} 
            data={examData} 
            onSave={(newData) => {
              const validatedQuestions = newData.questions.map(validateQuestion);
              setExamData({ ...newData, questions: validatedQuestions });
              setNeedsAnswerUpdate(true); 
              showToast("تم تحديث البيانات من JSON", "success");
            }} 
          />
        )}

        {/* WatermarkSettingsModal - Hidden */}
        {/* {examData && (
          <WatermarkSettingsModal 
            isOpen={isWatermarkModalOpen}
            onClose={() => setIsWatermarkModalOpen(false)}
            settings={examData.watermarkSettings || defaultWatermarkSettings}
            onUpdate={(newSettings) => setExamData({...examData, watermarkSettings: newSettings})}
            onDelete={() => { setExamData({...examData, watermark: undefined}); setIsWatermarkModalOpen(false); }}
          />
        )} */}

        {examData && (
          <DesignSettingsModal 
             isOpen={isDesignModalOpen}
             onClose={() => setIsDesignModalOpen(false)}
             settings={examData.designSettings || defaultDesignSettings}
             onUpdate={(newDesign) => setExamData({ ...examData, designSettings: newDesign })}
          />
        )}

        {/* App Settings Modal */}
        <AppSettingsModal 
          isOpen={isAppSettingsOpen} 
          onClose={() => {
            setIsAppSettingsOpen(false);
            setSettingsFocusField(null);
          }}
          settings={appSettings}
          onSave={handleUpdateAppSettings}
          initialFocusField={settingsFocusField}
        />

        {/* Service Continuity Modal */}
        <ServiceContinuityModal
          state={serviceContinuityState}
          onClose={closeServiceContinuity}
        />

        {/* Variant Generator Modal */}
        {isVariantModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in no-print">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border-t-8 border-indigo-600 animate-scale-up">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-800">
                <span>🔄</span> إنشاء نموذج آخر (نموذج ب)
              </h3>
              <p className="text-sm text-gray-600 mb-4 bg-indigo-50 p-3 rounded border border-indigo-100">
                سيتم إنشاء اختبار جديد بنفس الموضوع وعدد الأسئلة، ولكن بأرقام وصيغ مختلفة لمنع الغش. يمكنك إضافة تعليمات محددة للذكاء الاصطناعي أدناه.
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">تعليمات التعديل (اختياري)</label>
                <textarea 
                  value={variantInstructions} 
                  onChange={(e) => setVariantInstructions(e.target.value)}
                  placeholder="مثال: اجعل الأرقام في المسائل أصعب، ركز على الجانب النظري أكثر..."
                  className="w-full p-3 border border-indigo-200 rounded-xl h-24 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsVariantModalOpen(false)} 
                  className="px-6 py-2 border rounded-xl hover:bg-gray-50 font-bold text-gray-600"
                >
                  إلغاء
                </button>
                <button 
                  onClick={confirmGenerateVariant} 
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 font-bold flex items-center gap-2"
                >
                  <span>🚀</span> توليد النموذج
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
