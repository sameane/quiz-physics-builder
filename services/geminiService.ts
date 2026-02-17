import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ExamData, GenerationParams, Question, GeminiModel, TaskComplexity } from "../types";

// ============================================================================
// Gemini Models Management Protocol - Implementation
// ============================================================================

// API Key Management - Environment key is used as fallback, not shown in UI
let userApiKey = '';
let isUsingPrivateKey = false;

export const setApiKey = (key: string) => {
  userApiKey = key;
  isUsingPrivateKey = !!key;
};

export const getApiKey = () => userApiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
export const getIsUsingPrivateKey = () => isUsingPrivateKey;

const getAI = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

// ============================================================================
// 1. Intelligent Routing Matrix
// ============================================================================

const GEMINI_MODELS: Record<TaskComplexity, GeminiModel> = {
  // [High Precision and Complexity Category]
  // Deep programming, advanced physics and sciences, scientific research, context up to 2M tokens
  high: 'gemini-2.5-pro',
  
  // [Ultra Performance and Speed Category]
  // Interactive conversations, multimedia, latest technologies
  ultra: 'gemini-3-flash-preview',
  
  // [Balance and General Tasks Category]
  // Text summarization, educational assistance, technical support
  balanced: 'gemini-2.5-flash',
  
  // [Intensity and Background Processing Category]
  // Data classification, rapid development tests, high request volume
  lite: 'gemini-2.5-flash-lite',
};

// ============================================================================
// 2. Automatic Fallback Plan
// ============================================================================

const FALLBACK_CHAIN: Record<GeminiModel, GeminiModel | null> = {
  'gemini-2.5-pro': 'gemini-3-flash-preview',
  'gemini-3-flash-preview': 'gemini-2.5-flash',
  'gemini-2.5-flash': 'gemini-2.5-flash-lite',
  'gemini-2.5-flash-lite': null,
};

const FALLBACK_MESSAGES: Record<GeminiModel, string> = {
  'gemini-3-flash-preview': 'نستخدم الآن محرك Gemini 3 السريع لضمان استجابة فورية.',
  'gemini-2.5-flash': 'نستخدم الآن محرك الاستجابة المتوازن لضمان استمرارية الخدمة.',
  'gemini-2.5-flash-lite': 'نحن نواجه ضغطاً عالياً؛ تم تفعيل النسخة Lite للحفاظ على الاستقرار.',
  'gemini-2.5-pro': '',
};

const QUOTA_EXHAUSTED_MESSAGE = 'لقد تم الوصول للحد الأقصى للطلبات المجانية حالياً.';

// ============================================================================
// Task Category Mapping
// ============================================================================

export enum TaskCategory {
  GENERATE_EXAM = 'high',
  EDIT_QUESTION = 'high',
  MODIFY_SVG = 'balanced',
  DESCRIBE_VISUAL = 'ultra',
  EXTRACT_FROM_IMAGE = 'high',
  REGENERATE_ANSWERS = 'balanced',
}

const getModelForTask = (category: TaskCategory): GeminiModel => {
  // When using private key, default to highest quality model
  if (isUsingPrivateKey) {
    return GEMINI_MODELS.high;
  }
  
  const modelName = GEMINI_MODELS[category as TaskComplexity];
  if (!modelName) {
    console.warn(`No model found for category: ${category}. Defaulting to balanced.`);
    return GEMINI_MODELS.balanced;
  }
  return modelName;
};

// ============================================================================
// 3. Service Continuity System Types
// ============================================================================

export type ServiceContinuityCallback = (state: {
  isOpen: boolean;
  provider: 'gemini';
  message: string;
  countdownSeconds: number;
  onRetry: () => void;
  onUsePrivateKey: () => void;
}) => void;

let serviceContinuityCallback: ServiceContinuityCallback | null = null;

export const setServiceContinuityCallback = (callback: ServiceContinuityCallback) => {
  serviceContinuityCallback = callback;
};

// ============================================================================
// Core Fallback Logic with Retry
// ============================================================================

interface FallbackResult<T> {
  result: T;
  modelUsed: GeminiModel;
  fallbackApplied: boolean;
}

const withFallbackAndRetry = async <T>(
  initialModel: GeminiModel,
  fn: (model: GeminiModel) => Promise<T>,
  showNotification: (message: string) => void,
  retries = 2,
  delay = 2000
): Promise<FallbackResult<T>> => {
  let currentModel: GeminiModel | null = initialModel;
  let lastError: any = null;
  let fallbackApplied = false;

  while (currentModel) {
    try {
      console.log(`[Gemini] Attempting with model: ${currentModel}`);
      const result = await fn(currentModel);
      return { result, modelUsed: currentModel, fallbackApplied };
    } catch (error: any) {
      lastError = error;
      
      const isRateLimit = 
        error?.status === 429 || 
        error?.code === 429 || 
        error?.message?.includes('429') ||
        error?.message?.includes('Resource has been exhausted') ||
        error?.message?.includes('quota');

      if (isRateLimit) {
        console.warn(`[Gemini] Rate limit hit on ${currentModel}`);
        
        const nextModel = FALLBACK_CHAIN[currentModel];
        
        if (nextModel) {
          const message = FALLBACK_MESSAGES[nextModel];
          console.warn(`[Gemini] Falling back to ${nextModel}`);
          
          if (message) {
            showNotification(message);
          }
          
          currentModel = nextModel;
          fallbackApplied = true;
          continue;
        } else {
          // All models exhausted - trigger Service Continuity
          console.error('[Gemini] All free models exhausted');
          break;
        }
      } else if (retries > 0) {
        // Non-rate-limit error, retry with backoff
        console.warn(`[Gemini] Error on ${currentModel}, retrying in ${delay}ms... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries--;
        delay *= 2;
        continue;
      } else {
        throw error;
      }
    }
  }

  // All models failed - throw with special code for Service Continuity
  const error = new Error(QUOTA_EXHAUSTED_MESSAGE);
  (error as any).code = 'GEMINI_ALL_MODELS_FAILED';
  (error as any).originalError = lastError;
  throw error;
};

// ============================================================================
// Error Handler
// ============================================================================

export const handleGeminiError = (error: any, defaultMessage: string): never => {
  console.error('[Gemini] Full Error:', error);
  
  // Check for API key missing error
  if (error?.message === 'GEMINI_API_KEY_MISSING') {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  
  // Check for all models failed
  if (error?.code === 'GEMINI_ALL_MODELS_FAILED') {
    throw error;
  }

  let detailedMsg = '';

  const safeString = (val: any): string => {
    try {
      if (typeof val === 'string') return val;
      if (val instanceof Error) return val.message;
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  };

  if (error instanceof Error) {
    if (error.message.includes('429') || error.message.includes('quota')) {
      detailedMsg = 'تم تجاوز حد الطلبات (Rate Limit). يرجى الانتظار قليلاً ثم المحاولة.';
    } else if (error.message.includes('403') || error.message.includes('API key')) {
      detailedMsg = 'خطأ في مفتاح API. تأكد من صحته في الإعدادات.';
    } else if (error.message.includes('503')) {
      detailedMsg = 'الخدمة مشغولة. يرجى المحاولة لاحقاً.';
    } else {
      detailedMsg = error.message;
    }
  } else if (typeof error === 'object' && error !== null) {
    detailedMsg = (error as any).message || (error as any).error?.message || safeString(error);
  } else {
    detailedMsg = String(error);
  }

  throw new Error(`${defaultMessage}: ${detailedMsg}`);
};

// ============================================================================
// Schema Definitions
// ============================================================================

const questionSchema = {
  type: Type.OBJECT,
  properties: {
    text: {
      type: Type.STRING,
      description: "The physics problem text using LaTeX for math between \\( and \\).",
    },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "An array of exactly 4 options. Math should be in LaTeX.",
    },
    correctAnswerIndex: {
      type: Type.INTEGER,
      description: "The index (0-3) of the correct answer.",
    },
    explanation: {
      type: Type.STRING,
      description: "A brief explanation of the solution.",
    },
    svgCode: {
      type: Type.STRING,
      description: "Optional: Minimalist SVG XML code for a diagram representing the physics problem if requested. Do not include markdown code blocks.",
    },
    visualDescription: {
      type: Type.STRING,
      description: "A concise description of the visual diagram if svgCode is provided.",
    }
  },
  required: ["text", "options", "correctAnswerIndex", "explanation"],
};

const svgSchema = {
  type: Type.OBJECT,
  properties: {
    svgCode: {
      type: Type.STRING,
      description: "The complete, valid SVG XML code representing the physics diagram.",
    }
  },
  required: ["svgCode"],
};

const examSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: questionSchema,
    },
  },
  required: ["questions"],
};

const answerKeySchema = {
  type: Type.OBJECT,
  properties: {
    answers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          correctAnswerIndex: { type: Type.INTEGER },
          explanation: { type: Type.STRING },
        },
        required: ["id", "correctAnswerIndex", "explanation"],
      },
    },
  },
  required: ["answers"],
};

// ============================================================================
// Helper Functions
// ============================================================================

const extractBase64Data = (base64String: string) => {
  let base64Data = base64String;
  let mimeType = "image/jpeg"; 

  if (base64String.includes("data:image/png;base64,")) {
    mimeType = "image/png";
    base64Data = base64String.replace("data:image/png;base64,", "");
  } else if (base64String.includes("data:image/jpeg;base64,")) {
    mimeType = "image/jpeg";
    base64Data = base64String.replace("data:image/jpeg;base64,", "");
  } else if (base64String.includes("data:image/webp;base64,")) {
    mimeType = "image/webp";
    base64Data = base64String.replace("data:image/webp;base64,", "");
  } else if (base64String.includes(",")) {
    const split = base64String.split(',');
    const mimeMatch = split[0].match(/:(.*?);/);
    if (mimeMatch) mimeType = mimeMatch[1];
    base64Data = split[1];
  }
  return { mimeType, data: base64Data };
};

// ============================================================================
// API Functions
// ============================================================================

export const generateExam = async (
  params: GenerationParams, 
  showNotification: (message: string) => void
): Promise<ExamData> => {
  const ai = getAI();
  const initialModel = getModelForTask(TaskCategory.GENERATE_EXAM);
  
  const promptText = `
    أنت خبير في الفيزياء ومطور مناهج للمرحلة الثانوية المصرية.
    المطلوب إنشاء أسئلة فيزياء للموضوع: "${params.lessonTitle}".
    
    المعايير:
    1. عدد الأسئلة: ${params.questionCount}.
    2. مستوى الصعوبة: ${params.difficulty} من 10.
    3. التعليمات الإضافية: ${params.instructions || "لا يوجد"}.
    4. الصيغة الرياضية: استخدم LaTeX للمعادلات والأرقام محصورة بين علامتي \\( و \\).
    5. اللغة: اللغة العربية الفصحى العلمية.
    6. الرسوم التوضيحية: ${params.includeDiagrams ? 'يجب عليك توليد مخططات هندسية أو أشكال توضيحية بصيغة SVG للمسائل التي تتطلب ذلك (مثل الدوائر الكهربائية، المقذوفات، القوى) ووضع الكود في حقل svgCode.' : 'لا تقم بتوليد رسومات SVG.'}.
  `;

  const parts: any[] = [{ text: promptText }];

  if (params.image) {
    parts.push({
      inlineData: extractBase64Data(params.image)
    });
  }

  try {
    const generationFunc = (model: GeminiModel) => ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: examSchema,
        temperature: 0.7,
      },
    });

    const { result: response } = await withFallbackAndRetry(initialModel, generationFunc, showNotification);

    const text = response.text || '{}';
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON response:', text);
      throw new Error('Invalid JSON response from API');
    }
    
    const processedQuestions = data.questions.map((q: any, index: number) => ({
      id: index + 1,
      text: q.text || 'سؤال بدون نص',
      options: Array.isArray(q.options) ? q.options.slice(0, 4) : ['', '', '', ''],
      correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
      explanation: q.explanation || '',
      svgCode: q.svgCode,
      visualDescription: q.visualDescription,
    }));

    return {
      lessonTitle: params.lessonTitle,
      questions: processedQuestions,
    };
  } catch (error) {
    handleGeminiError(error, "فشل في توليد الاختبار");
  }
};

export const editQuestionWithAI = async (
  currentQuestion: Question, 
  instructions: string, 
  showNotification: (message: string) => void,
  imageBase64?: string,
  difficulty?: number,
  withShape?: boolean
): Promise<Omit<Question, 'id'>> => {
  const ai = getAI();
  const initialModel = getModelForTask(TaskCategory.EDIT_QUESTION);
  
  let userInstructions = instructions;
  if (imageBase64 && !instructions.trim()) {
    userInstructions = "قم بتحليل الصورة المرفقة وقم بإنشاء سؤال فيزياء دقيق بناءً عليها.";
  }

  const promptText = `
    أنت خبير فيزياء. قم بتعديل أو استبدال السؤال التالي.
    السؤال الحالي: "${currentQuestion.text}"
    تعليمات التعديل: "${userInstructions}"
    ${difficulty ? `مستوى الصعوبة المطلوب: ${difficulty}/10.` : ''}
    ${withShape ? 'هام جداً: يجب توليد شكل هندسي أو مخطط فيزيائي يوضح السؤال بصيغة SVG ووضعه في حقل svgCode. كما يجب عليك ملء حقل visualDescription بوصف دقيق لهذا الشكل.' : ''}
    استخدم LaTeX للمعادلات.
  `;

  const parts: any[] = [{ text: promptText }];
  if (imageBase64) parts.push({ inlineData: extractBase64Data(imageBase64) });

  try {
    const generationFunc = (model: GeminiModel) => ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: questionSchema,
        temperature: 0.7,
      },
    });

    const { result: response } = await withFallbackAndRetry(initialModel, generationFunc, showNotification);

    const text = response.text || '{}';
    let q;
    try {
      q = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON response:', text);
      throw new Error('Invalid JSON response from API');
    }
    
    return {
      text: q.text,
      options: Array.isArray(q.options) ? q.options.slice(0, 4) : ['', '', '', ''],
      correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
      explanation: q.explanation || '',
      svgCode: q.svgCode,
      visualDescription: q.visualDescription,
    };
  } catch (error) {
    handleGeminiError(error, "فشل في تعديل السؤال");
  }
};

export const modifySvgWithAI = async (
  currentSvg: string, 
  instruction: string, 
  showNotification: (message: string) => void
): Promise<string> => {
  const ai = getAI();
  const initialModel = getModelForTask(TaskCategory.MODIFY_SVG);

  const promptText = `
    بصفتك خبير في الرسوميات المتجهة (SVG) والفيزياء.
    لديك كود SVG الحالي لمسألة فيزياء.
    المطلوب: تعديل الـ SVG بناءً على التعليمات التالية: "${instruction}".
    
    القواعد:
    1. حافظ على نظافة الكود وبساطته.
    2. تأكد أن الـ SVG صالح ويعمل في المتصفح.
    3. لا تقم بتغيير أبعاد الـ viewBox بشكل جذري إلا إذا طُلب ذلك.
    4. ارجع فقط كود SVG الجديد.

    الكود الحالي:
    ${currentSvg}
  `;

  try {
    const generationFunc = (model: GeminiModel) => ai.models.generateContent({
      model: model,
      contents: { parts: [{ text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: svgSchema,
        temperature: 0.5,
      },
    });

    const { result: response } = await withFallbackAndRetry(initialModel, generationFunc, showNotification);

    const text = response.text || "{}";
    const data = JSON.parse(text);
    return data.svgCode;
  } catch (error) {
    handleGeminiError(error, "فشل في تعديل الشكل");
  }
};

export const describeVisualWithAI = async (
  content: string, 
  isSvg: boolean, 
  showNotification: (message: string) => void
): Promise<string> => {
  const ai = getAI();
  const initialModel = getModelForTask(TaskCategory.DESCRIBE_VISUAL);

  const promptText = `
    أنت خبير فيزياء محترف. قم بتحليل هذا الشكل (صورة أو مخطط SVG) المرفق بسؤال فيزيائي.
    قدم وصفاً "علمياً" و "مختصراً جداً" (Professional and Concise) لمحتويات الشكل باللغة العربية.
    
    القواعد:
    1. اذكر المكونات الفيزيائية الأساسية فقط (مثل: مقاومة 5 أوم، بطارية 12 فولت).
    2. اذكر العلاقات الهندسية المهمة باختصار (مثل: متصلة على التوالي، زاوية 30 درجة).
    3. تجنب الكلمات الحشو مثل "نلاحظ في الصورة" أو "يوجد لدينا". ابدأ بالوصف مباشرة.
    4. الهدف هو حفظ هذا الوصف كبيانات مرجعية للشكل.
  `;

  const parts: any[] = [{ text: promptText }];
  
  if (isSvg) {
    parts.push({ text: `كود SVG:\n${content}` });
  } else {
    parts.push({ inlineData: extractBase64Data(content) });
  }

  try {
    const generationFunc = (model: GeminiModel) => ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        responseMimeType: "text/plain",
        temperature: 0.3,
      },
    });

    const { result: response } = await withFallbackAndRetry(initialModel, generationFunc, showNotification);

    return response.text?.trim() || "لم يتم استخراج أي وصف.";
  } catch (error) {
    handleGeminiError(error, "فشل في تحليل الشكل");
  }
};

export const extractQuestionFromImage = async (
  imageBase64: string, 
  showNotification: (message: string) => void
): Promise<Omit<Question, 'id'>> => {
  const ai = getAI();
  const initialModel = getModelForTask(TaskCategory.EXTRACT_FROM_IMAGE);

  const promptText = `
    قم بتحليل هذه الصورة واستخرج سؤال الفيزياء الموجود بها.
    المطلوب استخراج:
    1. نص رأس السؤال.
    2. الخيارات الأربعة (يجب أن تكون 4).
    3. مؤشر الإجابة الصحيحة (0-3).
    4. تفسير علمي دقيق للحل.
    
    مهم جداً: استخدم LaTeX لكافة المعادلات والأرقام العلمية.
  `;

  try {
    const generationFunc = (model: GeminiModel) => ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { text: promptText },
          { inlineData: extractBase64Data(imageBase64) }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema,
        temperature: 0.2, // Higher precision
      },
    });

    const { result: response } = await withFallbackAndRetry(initialModel, generationFunc, showNotification);

    const text = response.text || "{}";
    const q = JSON.parse(text);
    
    return {
      text: q.text,
      options: Array.isArray(q.options) ? q.options.slice(0, 4) : ["", "", "", ""],
      correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
      explanation: q.explanation || "",
      svgCode: q.svgCode,
      visualDescription: q.visualDescription
    };
  } catch (error) {
    handleGeminiError(error, "فشل في استخراج البيانات من الصورة");
  }
};

export const regenerateAnswerKey = async (
  questions: Question[],
  showNotification: (message: string) => void
): Promise<{ id: number, correctAnswerIndex: number, explanation: string }[]> => {
  const ai = getAI();
  const initialModel = getModelForTask(TaskCategory.REGENERATE_ANSWERS);
  
  const promptText = `
    بصفتك خبير فيزياء، قم بمراجعة قائمة الأسئلة التالية (وبعضها يحتوي على صور مرفقة).
    لكل سؤال، حدد مؤشر الإجابة الصحيحة (0-3) واكتب تفسيراً علمياً دقيقاً باللغة العربية باستخدام LaTeX.
    
    الأسئلة للمراجعة:
    ${questions.map(q => `سؤال ${q.id}: ${q.text}\nالخيارات: ${q.options.join(' | ')}`).join('\n\n')}
  `;

  const parts: any[] = [{ text: promptText }];

  questions.forEach(q => {
    if (q.imageUrl && q.imageUrl.startsWith('data:')) {
      parts.push({
        text: `صورة السؤال رقم ${q.id}:`
      });
      parts.push({
        inlineData: extractBase64Data(q.imageUrl)
      });
    }
  });

  try {
    const generationFunc = (model: GeminiModel) => ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: answerKeySchema,
        temperature: 0.3,
      },
    });

    const { result: response } = await withFallbackAndRetry(initialModel, generationFunc, showNotification);

    const text = response.text || "{}";
    const data = JSON.parse(text);
    return data.answers;
  } catch (error) {
    handleGeminiError(error, "فشل في إعادة توليد نموذج الإجابة");
  }
};

// ============================================================================
// Export Protocol Information
// ============================================================================

export const getGeminiProtocolInfo = () => ({
  models: GEMINI_MODELS,
  fallbackChain: FALLBACK_CHAIN,
  fallbackMessages: FALLBACK_MESSAGES,
  quotaExhaustedMessage: QUOTA_EXHAUSTED_MESSAGE,
  isUsingPrivateKey,
});
