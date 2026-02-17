import OpenAI from 'openai';
import { ExamData, GenerationParams, Question, OpenAIModel, TaskComplexity } from "../types";

// ============================================================================
// OpenAI Models Management Protocol - Implementation
// ============================================================================

// API Key Management - Environment key is used as fallback, not shown in UI
let userOpenAIApiKey = '';
let isUsingPrivateKey = false;

export const setOpenAIApiKey = (key: string) => {
  userOpenAIApiKey = key;
  isUsingPrivateKey = !!key;
};

export const getOpenAIApiKey = () => userOpenAIApiKey || process.env.OPENAI_API_KEY || '';
export const getIsUsingPrivateKey = () => isUsingPrivateKey;

const getOpenAI = () => {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }
  return new OpenAI({ 
    apiKey: apiKey,
    dangerouslyAllowBrowser: true 
  });
};

// ============================================================================
// 1. Intelligent Routing Matrix
// ============================================================================

const OPENAI_MODELS: Record<TaskComplexity, OpenAIModel> = {
  // [Elite Category - High Precision]
  // Tasks that do not allow for error, complex logic, document analysis
  high: 'gpt-4o',
  
  // [Daily Performance Category - Standard]
  // Conversations, summarization, translation, most application tasks
  // Note: 4o-mini is offered as the default option to save the 4o quota for critical tasks
  ultra: 'gpt-4o-mini',
  balanced: 'gpt-4o-mini',
  
  // [Simple Tasks Category - Legacy]
  // Text classification, one-word responses
  lite: 'gpt-3.5-turbo',
};

// Default model for daily performance (per protocol)
const DEFAULT_OPENAI_MODEL: OpenAIModel = 'gpt-4o-mini';

// ============================================================================
// 2. Emergency Protocol (Handling the 3 RPM Limit)
// ============================================================================

const FALLBACK_CHAIN: Record<OpenAIModel, OpenAIModel | null> = {
  'gpt-4o': 'gpt-4o-mini',
  'gpt-4o-mini': 'gpt-3.5-turbo',
  'gpt-3.5-turbo': null,
};

const FALLBACK_MESSAGES: Record<OpenAIModel, string> = {
  'gpt-4o-mini': 'نستخدم حالياً النسخة Mini لتجاوز ضغط الطلبات وضمان سرعة الاستجابة.',
  'gpt-3.5-turbo': 'تم تفعيل المحرك الاقتصادي مؤقتاً للحفاظ على اتصالك.',
  'gpt-4o': '',
};

const QUOTA_EXHAUSTED_MESSAGE = 'نعتذر، لقد استنفد التطبيق حصته المجانية لهذا اليوم.';
const RPM_LIMIT_MESSAGE = 'نظراً للقيود الصارمة على OpenAI (3 طلبات/دقيقة)، لا يمكن معالجة طلبك الآن.';

// TPM Management (20,000 tokens limit)
const MAX_TOKENS_PER_MINUTE = 20000;
let tokensUsedThisMinute = 0;
let lastTokenReset = Date.now();

const checkAndResetTokenCounter = () => {
  const now = Date.now();
  if (now - lastTokenReset >= 60000) {
    tokensUsedThisMinute = 0;
    lastTokenReset = now;
  }
};

const estimateTokens = (text: string): number => {
  // Rough estimate: ~4 characters per token for English/Arabic mixed text
  return Math.ceil(text.length / 4);
};

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

const getModelForTask = (category: TaskCategory): OpenAIModel => {
  // When using private key, default to highest quality model
  if (isUsingPrivateKey) {
    return OPENAI_MODELS.high;
  }
  
  // For free accounts, use gpt-4o-mini as default to save 4o quota
  if (category === 'high') {
    return OPENAI_MODELS.high;
  }
  
  return DEFAULT_OPENAI_MODEL;
};

// ============================================================================
// Service Continuity System Types
// ============================================================================

export type ServiceContinuityCallback = (state: {
  isOpen: boolean;
  provider: 'openai';
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
  modelUsed: OpenAIModel;
  fallbackApplied: boolean;
}

const withFallbackAndRetry = async <T>(
  initialModel: OpenAIModel,
  fn: (model: OpenAIModel) => Promise<T>,
  showNotification: (message: string) => void,
  requestText: string = '',
  retries = 2,
  delay = 5000 // Longer delay for OpenAI due to 3 RPM limit
): Promise<FallbackResult<T>> => {
  // Check TPM limit
  checkAndResetTokenCounter();
  const estimatedTokens = estimateTokens(requestText);
  
  if (!isUsingPrivateKey && tokensUsedThisMinute + estimatedTokens > MAX_TOKENS_PER_MINUTE) {
    throw new Error('TPM_LIMIT_EXCEEDED');
  }

  let currentModel: OpenAIModel | null = initialModel;
  let lastError: any = null;
  let fallbackApplied = false;

  while (currentModel) {
    try {
      console.log(`[OpenAI] Attempting with model: ${currentModel}`);
      const result = await fn(currentModel);
      tokensUsedThisMinute += estimatedTokens;
      return { result, modelUsed: currentModel, fallbackApplied };
    } catch (error: any) {
      lastError = error;
      
      const isRateLimit = 
        error?.status === 429 || 
        error?.code === 429 || 
        error?.message?.includes('429') ||
        error?.message?.includes('Rate limit') ||
        error?.message?.includes('quota') ||
        error?.message?.includes('TPM_LIMIT_EXCEEDED');

      if (isRateLimit) {
        console.warn(`[OpenAI] Rate limit hit on ${currentModel}`);
        
        const nextModel = FALLBACK_CHAIN[currentModel];
        
        if (nextModel) {
          const message = FALLBACK_MESSAGES[nextModel];
          console.warn(`[OpenAI] Falling back to ${nextModel}`);
          
          if (message) {
            showNotification(message);
          }
          
          currentModel = nextModel;
          fallbackApplied = true;
          continue;
        } else {
          // All models exhausted - trigger Service Continuity
          console.error('[OpenAI] All free models exhausted');
          break;
        }
      } else if (retries > 0) {
        // Non-rate-limit error, retry with backoff
        console.warn(`[OpenAI] Error on ${currentModel}, retrying in ${delay}ms... (${retries} attempts left)`);
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
  (error as any).code = 'OPENAI_ALL_MODELS_FAILED';
  (error as any).originalError = lastError;
  (error as any).isRPMLimit = true;
  throw error;
};

// ============================================================================
// Error Handler
// ============================================================================

export const handleOpenAIError = (error: any, defaultMessage: string): never => {
  console.error('[OpenAI] Full Error:', error);
  
  // Check for API key missing error
  if (error?.message === 'OPENAI_API_KEY_MISSING') {
    throw new Error('OPENAI_API_KEY_MISSING');
  }
  
  // Check for all models failed
  if (error?.code === 'OPENAI_ALL_MODELS_FAILED') {
    throw error;
  }
  
  // Check for TPM limit
  if (error?.message === 'TPM_LIMIT_EXCEEDED') {
    const tpmError = new Error('تم تجاوز حد الرموز (Tokens) المسموح به في الدقيقة. يرجى المحاولة لاحقاً.');
    (tpmError as any).code = 'TPM_LIMIT_EXCEEDED';
    throw tpmError;
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
    if (error.message.includes('429') || error.message.includes('Rate limit') || error.message.includes('quota')) {
      detailedMsg = 'تم تجاوز حد الطلبات (3 طلبات/دقيقة). يرجى الانتظار قليلاً ثم المحاولة.';
    } else if (error.message.includes('401') || error.message.includes('API key')) {
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
// Schema Definitions (JSON Schema for OpenAI)
// ============================================================================

const questionSchema = {
  type: "object",
  properties: {
    text: {
      type: "string",
      description: "The physics problem text using LaTeX for math between \\( and \\).",
    },
    options: {
      type: "array",
      items: { type: "string" },
      description: "An array of exactly 4 options. Math should be in LaTeX.",
    },
    correctAnswerIndex: {
      type: "integer",
      description: "The index (0-3) of the correct answer.",
    },
    explanation: {
      type: "string",
      description: "A brief explanation of the solution.",
    },
    svgCode: {
      type: "string",
      description: "Optional: Minimalist SVG XML code for a diagram representing the physics problem if requested. Do not include markdown code blocks.",
    },
    visualDescription: {
      type: "string",
      description: "A concise description of the visual diagram if svgCode is provided.",
    }
  },
  required: ["text", "options", "correctAnswerIndex", "explanation"],
};

const examSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: questionSchema,
    },
  },
  required: ["questions"],
};

const answerKeySchema = {
  type: "object",
  properties: {
    answers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          correctAnswerIndex: { type: "integer" },
          explanation: { type: "string" },
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

const extractBase64Data = (base64String: string): { mimeType: string; data: string } => {
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
  const openai = getOpenAI();
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
    
    ارجع النتيجة بتنسيق JSON مطابق للـ schema المقدم.
  `;

  const messages: any[] = [
    { role: "system", content: "You are a physics expert and exam generator. Always return valid JSON." },
    { role: "user", content: promptText }
  ];

  if (params.image) {
    const { mimeType, data } = extractBase64Data(params.image);
    messages.push({
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${data}` } }
      ]
    });
  }

  try {
    const generationFunc = (model: OpenAIModel) => openai.chat.completions.create({
      model: model,
      messages: messages,
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const { result: response } = await withFallbackAndRetry(
      initialModel, 
      generationFunc, 
      showNotification,
      promptText
    );

    const text = response.choices[0]?.message?.content || '{}';
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
    handleOpenAIError(error, "فشل في توليد الاختبار");
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
  const openai = getOpenAI();
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
    
    ارجع النتيجة بتنسيق JSON مطابق للـ schema المقدم.
  `;

  const messages: any[] = [
    { role: "system", content: "You are a physics expert. Always return valid JSON." },
    { role: "user", content: promptText }
  ];

  if (imageBase64) {
    const { mimeType, data } = extractBase64Data(imageBase64);
    messages.push({
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${data}` } }
      ]
    });
  }

  try {
    const generationFunc = (model: OpenAIModel) => openai.chat.completions.create({
      model: model,
      messages: messages,
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const { result: response } = await withFallbackAndRetry(
      initialModel, 
      generationFunc, 
      showNotification,
      promptText
    );

    const text = response.choices[0]?.message?.content || '{}';
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
    handleOpenAIError(error, "فشل في تعديل السؤال");
  }
};

export const modifySvgWithAI = async (
  currentSvg: string, 
  instruction: string, 
  showNotification: (message: string) => void
): Promise<string> => {
  const openai = getOpenAI();
  const initialModel = getModelForTask(TaskCategory.MODIFY_SVG);

  const promptText = `
    بصفتك خبير في الرسوميات المتجهة (SVG) والفيزياء.
    لديك كود SVG الحالي لمسألة فيزياء.
    المطلوب: تعديل الـ SVG بناءً على التعليمات التالية: "${instruction}".
    
    القواعد:
    1. حافظ على نظافة الكود وبساطته.
    2. تأكد أن الـ SVG صالح ويعمل في المتصفح.
    3. لا تقم بتغيير أبعاد الـ viewBox بشكل جذري إلا إذا طُلب ذلك.
    4. ارجع فقط كود SVG الجديد في حقل svgCode.

    الكود الحالي:
    ${currentSvg}
    
    ارجع النتيجة بتنسيق JSON: {"svgCode": "..."}
  `;

  try {
    const generationFunc = (model: OpenAIModel) => openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: "You are an SVG and physics expert. Always return valid JSON." },
        { role: "user", content: promptText }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 2000,
    });

    const { result: response } = await withFallbackAndRetry(
      initialModel, 
      generationFunc, 
      showNotification,
      promptText
    );

    const text = response.choices[0]?.message?.content || "{}";
    const data = JSON.parse(text);
    return data.svgCode;
  } catch (error) {
    handleOpenAIError(error, "فشل في تعديل الشكل");
  }
};

export const describeVisualWithAI = async (
  content: string, 
  isSvg: boolean, 
  showNotification: (message: string) => void
): Promise<string> => {
  const openai = getOpenAI();
  const initialModel = getModelForTask(TaskCategory.DESCRIBE_VISUAL);

  const promptText = `
    أنت خبير فيزياء محترف. قم بتحليل هذا الشكل (صورة أو مخطط SVG) المرفق بسؤال فيزيائي.
    قدم وصفاً "علمياً" و "مختصراً جداً" (Professional and Concise) لمحتويات الشكل باللغة العربية.
    
    القواعد:
    1. اذكر المكونات الفيزيائية الأساسية فقط (مثل: مقاومة 5 أوم، بطارية 12 فولت).
    2. اذكر العلاقات الهندسية المهمة باختصار (مثل: متصلة على التوالي، زاوية 30 درجة).
    3. تجنب الكلمات الحشو مثل "نلاحظ في الصورة" أو "يوجد لدينا". ابدأ بالوصف مباشرة.
    4. الهدف هو حفظ هذا الوصف كبيانات مرجعية للشكل.
    
    ${isSvg ? `كود SVG:\n${content}` : ''}
  `;

  const messages: any[] = [
    { role: "system", content: "You are a physics expert. Provide concise professional descriptions in Arabic." },
    { role: "user", content: promptText }
  ];

  if (!isSvg) {
    const { mimeType, data } = extractBase64Data(content);
    messages.push({
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${data}` } }
      ]
    });
  }

  try {
    const generationFunc = (model: OpenAIModel) => openai.chat.completions.create({
      model: model,
      messages: messages,
      temperature: 0.3,
      max_tokens: 500,
    });

    const { result: response } = await withFallbackAndRetry(
      initialModel, 
      generationFunc, 
      showNotification,
      promptText
    );

    return response.choices[0]?.message?.content?.trim() || "لم يتم استخراج أي وصف.";
  } catch (error) {
    handleOpenAIError(error, "فشل في تحليل الشكل");
  }
};

export const extractQuestionFromImage = async (
  imageBase64: string, 
  showNotification: (message: string) => void
): Promise<Omit<Question, 'id'>> => {
  const openai = getOpenAI();
  const initialModel = getModelForTask(TaskCategory.EXTRACT_FROM_IMAGE);

  const promptText = `
    قم بتحليل هذه الصورة واستخرج سؤال الفيزياء الموجود بها.
    المطلوب استخراج:
    1. نص رأس السؤال.
    2. الخيارات الأربعة (يجب أن تكون 4).
    3. مؤشر الإجابة الصحيحة (0-3).
    4. تفسير علمي دقيق للحل.
    
    مهم جداً: استخدم LaTeX لكافة المعادلات والأرقام العلمية.
    
    ارجع النتيجة بتنسيق JSON مطابق للـ schema المقدم.
  `;

  const { mimeType, data } = extractBase64Data(imageBase64);

  try {
    const generationFunc = (model: OpenAIModel) => openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: "You are a physics expert. Extract question data from images. Always return valid JSON." },
        { role: "user", content: [
          { type: "text", text: promptText },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${data}` } }
        ]}
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Higher precision
      max_tokens: 2000,
    });

    const { result: response } = await withFallbackAndRetry(
      initialModel, 
      generationFunc, 
      showNotification,
      promptText
    );

    const text = response.choices[0]?.message?.content || "{}";
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
    handleOpenAIError(error, "فشل في استخراج البيانات من الصورة");
  }
};

export const regenerateAnswerKey = async (
  questions: Question[],
  showNotification: (message: string) => void
): Promise<{ id: number, correctAnswerIndex: number, explanation: string }[]> => {
  const openai = getOpenAI();
  const initialModel = getModelForTask(TaskCategory.REGENERATE_ANSWERS);
  
  const promptText = `
    بصفتك خبير فيزياء، قم بمراجعة قائمة الأسئلة التالية (وبعضها يحتوي على صور مرفقة).
    لكل سؤال، حدد مؤشر الإجابة الصحيحة (0-3) واكتب تفسيراً علمياً دقيقاً باللغة العربية باستخدام LaTeX.
    
    الأسئلة للمراجعة:
    ${questions.map(q => `سؤال ${q.id}: ${q.text}\nالخيارات: ${q.options.join(' | ')}`).join('\n\n')}
    
    ارجع النتيجة بتنسيق JSON مطابق للـ schema المقدم.
  `;

  try {
    const generationFunc = (model: OpenAIModel) => openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: "You are a physics expert. Review questions and generate answer keys. Always return valid JSON." },
        { role: "user", content: promptText }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 4000,
    });

    const { result: response } = await withFallbackAndRetry(
      initialModel, 
      generationFunc, 
      showNotification,
      promptText
    );

    const text = response.choices[0]?.message?.content || "{}";
    const data = JSON.parse(text);
    return data.answers;
  } catch (error) {
    handleOpenAIError(error, "فشل في إعادة توليد نموذج الإجابة");
  }
};

// ============================================================================
// Export Protocol Information
// ============================================================================

export const getOpenAIProtocolInfo = () => ({
  models: OPENAI_MODELS,
  fallbackChain: FALLBACK_CHAIN,
  fallbackMessages: FALLBACK_MESSAGES,
  quotaExhaustedMessage: QUOTA_EXHAUSTED_MESSAGE,
  rpmLimitMessage: RPM_LIMIT_MESSAGE,
  maxTokensPerMinute: MAX_TOKENS_PER_MINUTE,
  isUsingPrivateKey,
});

// Chunking utility for large texts
export const chunkText = (text: string, maxChunkSize: number = 15000): string[] => {
  const chunks: string[] = [];
  let currentChunk = '';
  
  const sentences = text.split(/[.!?،؛]\s+/);
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
};
