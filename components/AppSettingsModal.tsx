import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  initialFocusField?: 'gemini' | 'openai' | null;
}

const arabicFonts = [
  "Tajawal", "Cairo", "Amiri", "Almarai", "Aref Ruqaa", 
  "Changa", "El Messiri", "Harmattan", "IBM Plex Sans Arabic", 
  "Katibeh", "Lalezar", "Lateef", "Lemonada", "Mada", 
  "Markazi Text", "Mirza", "Noto Kufi Arabic", "Noto Naskh Arabic", 
  "Rakkas", "Reem Kufi", "Rubik", "Scheherazade New", "Sans-Serif"
];

const AppSettingsModal: React.FC<AppSettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onSave,
  initialFocusField = null 
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'ai'>('general');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      // Switch to AI tab if initialFocusField is provided
      if (initialFocusField) {
        setActiveTab('ai');
      }
    }
  }, [isOpen, settings, initialFocusField]);

  // Focus effect when initialFocusField changes
  useEffect(() => {
    if (isOpen && initialFocusField && activeTab === 'ai') {
      const fieldId = initialFocusField === 'gemini' ? 'gemini-api-key' : 'openai-api-key';
      const element = document.getElementById(fieldId);
      if (element) {
        setTimeout(() => element.focus(), 100);
      }
    }
  }, [isOpen, initialFocusField, activeTab]);

  const handleChange = (key: keyof AppSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const getActiveProvider = () => {
    if (localSettings.useOpenAI && localSettings.openaiApiKey) return 'openai';
    if (localSettings.useGemini !== false && localSettings.geminiApiKey) return 'gemini';
    return 'gemini'; // Default
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in no-print">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-up border-t-8 border-gray-700 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span>⚙️</span> إعدادات التطبيق
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition text-2xl">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-3 px-4 font-bold text-sm transition-colors ${
              activeTab === 'general' 
                ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <span>🎨</span> الخطوط والألوان
            </span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-3 px-4 font-bold text-sm transition-colors ${
              activeTab === 'ai' 
                ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <span>🤖</span> الذكاء الاصطناعي
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* General Tab - Fonts & Colors */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h4 className="font-bold text-gray-700 border-b pb-2">الخطوط والألوان</h4>
              
              {/* Title */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">خط العنوان (Title)</label>
                  <select 
                    value={localSettings.titleFont} 
                    onChange={(e) => handleChange('titleFont', e.target.value)}
                    className="w-full p-2 border rounded text-sm bg-white text-gray-900"
                    style={{ fontFamily: localSettings.titleFont }}
                  >
                    {arabicFonts.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">لون العنوان</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="color" 
                      value={localSettings.titleColor} 
                      onChange={(e) => handleChange('titleColor', e.target.value)} 
                      className="w-8 h-8 rounded cursor-pointer border bg-white" 
                    />
                    <span className="text-xs font-mono text-gray-600">{localSettings.titleColor}</span>
                  </div>
                </div>
              </div>

              {/* Questions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">خط الأسئلة (Questions)</label>
                  <select 
                    value={localSettings.questionFont} 
                    onChange={(e) => handleChange('questionFont', e.target.value)}
                    className="w-full p-2 border rounded text-sm bg-white text-gray-900"
                    style={{ fontFamily: localSettings.questionFont }}
                  >
                    {arabicFonts.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">لون الأسئلة</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="color" 
                      value={localSettings.questionColor} 
                      onChange={(e) => handleChange('questionColor', e.target.value)} 
                      className="w-8 h-8 rounded cursor-pointer border bg-white" 
                    />
                    <span className="text-xs font-mono text-gray-600">{localSettings.questionColor}</span>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">خط الاختيارات (Options)</label>
                  <select 
                    value={localSettings.optionFont} 
                    onChange={(e) => handleChange('optionFont', e.target.value)}
                    className="w-full p-2 border rounded text-sm bg-white text-gray-900"
                    style={{ fontFamily: localSettings.optionFont }}
                  >
                    {arabicFonts.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">لون الاختيارات</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="color" 
                      value={localSettings.optionColor} 
                      onChange={(e) => handleChange('optionColor', e.target.value)} 
                      className="w-8 h-8 rounded cursor-pointer border bg-white" 
                    />
                    <span className="text-xs font-mono text-gray-600">{localSettings.optionColor}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Tab - API Keys */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              
              {/* Provider Selection */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                  <span>🔧</span> مزود الخدمة المفضل
                </h4>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      handleChange('useGemini', true);
                      handleChange('useOpenAI', false);
                    }}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                      getActiveProvider() === 'gemini'
                        ? 'border-blue-500 bg-blue-100 text-blue-800'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <span className="text-2xl">🤖</span>
                    <div className="text-right">
                      <div className="font-bold">Google Gemini</div>
                      <div className="text-xs opacity-70">نماذج متعددة، دعم قوي للعربية</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      handleChange('useGemini', false);
                      handleChange('useOpenAI', true);
                    }}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                      getActiveProvider() === 'openai'
                        ? 'border-green-500 bg-green-100 text-green-800'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <span className="text-2xl">🧠</span>
                    <div className="text-right">
                      <div className="font-bold">OpenAI</div>
                      <div className="text-xs opacity-70">GPT-4o، دقة عالية</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Gemini API Key */}
              <div className="border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🤖</span>
                  <h4 className="font-bold text-gray-700">Google Gemini API Key</h4>
                </div>
                
                <div className="relative">
                  <input
                    id="gemini-api-key"
                    type={showGeminiKey ? "text" : "password"}
                    value={localSettings.geminiApiKey || localSettings.apiKey || ''}
                    onChange={(e) => {
                      handleChange('geminiApiKey', e.target.value);
                      handleChange('apiKey', e.target.value); // For backward compatibility
                    }}
                    placeholder="AIzaSy..."
                    className="w-full p-3 pr-10 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                  />
                  <button
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showGeminiKey ? '🙈' : '👁️'}
                  </button>
                </div>
                
                <div className="text-xs text-gray-500 space-y-1">
                  <p>• اترك هذا الحقل فارغاً لاستخدام المفتاح الافتراضي (إن وجد).</p>
                  <p>• استخدام مفتاحك الخاص يضمن سرعة واستقرار أعلى.</p>
                  <p>• <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">احصل على مفتاح Gemini</a></p>
                </div>
              </div>

              {/* OpenAI API Key */}
              <div className="border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🧠</span>
                  <h4 className="font-bold text-gray-700">OpenAI API Key</h4>
                </div>
                
                <div className="relative">
                  <input
                    id="openai-api-key"
                    type={showOpenAIKey ? "text" : "password"}
                    value={localSettings.openaiApiKey || ''}
                    onChange={(e) => handleChange('openaiApiKey', e.target.value)}
                    placeholder="sk-..."
                    className="w-full p-3 pr-10 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-green-500 outline-none bg-white text-gray-900"
                  />
                  <button
                    onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showOpenAIKey ? '🙈' : '👁️'}
                  </button>
                </div>
                
                <div className="text-xs text-gray-500 space-y-1">
                  <p>• يدعم OpenAI نماذج GPT-4o مع دقة عالية للمهام المعقدة.</p>
                  <p>• الحساب المجاني محدود بـ 3 طلبات/دقيقة.</p>
                  <p>• <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">احصل على مفتاح OpenAI</a></p>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h5 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                  <span>💡</span> معلومات هامة
                </h5>
                <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                  <li>عند إدخال مفتاحك الخاص، يتم إلغاء جميع القيود على الطلبات.</li>
                  <li>يتم استخدام النموذج الأعلى جودة (Pro/4o) تلقائياً مع المفتاح الخاص.</li>
                  <li>يتم حفظ المفاتيح محلياً في متصفحك فقط.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-white transition"
          >
            إلغاء
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-gray-800 text-white font-bold rounded-lg hover:bg-black transition shadow-lg"
          >
            حفظ التطبيق
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scale-up {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-up { animation: scale-up 0.2s ease-out; }
      `}</style>
    </div>
  );
};

export default AppSettingsModal;
