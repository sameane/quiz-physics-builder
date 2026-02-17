
import React, { useState } from 'react';

export type ExportFormat = 'pdf' | 'html' | 'png';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat, includeAnswers: boolean) => void;
  isProcessing: boolean;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, isProcessing }) => {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [includeAnswers, setIncludeAnswers] = useState(false);

  if (!isOpen) return null;

  const formats: { id: ExportFormat; name: string; icon: string; desc: string; tooltip: string }[] = [
    { 
      id: 'pdf', 
      name: 'PDF (جاهز للطباعة)', 
      icon: '📄', 
      desc: 'أفضل خيار للطباعة والاحتفاظ بالتنسيق',
      tooltip: 'يتم تحويل الاختبار لصورة عالية الدقة داخل ملف PDF. يضمن بقاء المعادلات العربية والرموز بشكلها الصحيح تماماً بنسبة 100% عند الطباعة.'
    },
    { 
      id: 'html', 
      name: 'HTML (نص قابل للتحديد)', 
      icon: '🌐', 
      desc: 'ملف ويب تفاعلي مستقل',
      tooltip: 'يتميز بنصوص قابلة للنسخ والبحث. مثالي للعرض الرقمي حيث يتم رندر المعادلات مباشرة في المتصفح، مما يحافظ على صغر حجم الملف.'
    },
    { 
      id: 'png', 
      name: 'PNG (صورة عالية الجودة)', 
      icon: '🖼️', 
      desc: 'صورة واحدة طويلة للاختبار',
      tooltip: 'يحول الاختبار بالكامل لصورة واحدة. مثالي للمشاركة السريعة عبر تطبيقات التواصل الاجتماعي.'
    },
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up border-t-8 border-primary">
        <div className="p-6 text-right">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span>📤</span> خيارات تصدير الاختبار
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">✕</button>
          </div>

          <div className="space-y-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3 underline decoration-primary/20">اختر صيغة الملف:</label>
              <div className="grid grid-cols-1 gap-3">
                {formats.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={`flex flex-col gap-1 p-4 rounded-xl border-2 transition-all text-right group relative
                      ${format === f.id ? 'border-primary bg-blue-50 ring-2 ring-primary/20' : 'border-gray-100 hover:border-gray-200'}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{f.icon}</span>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800">{f.name}</span>
                        <span className="text-xs text-gray-500">{f.desc}</span>
                      </div>
                      {format === f.id && <span className="mr-auto text-primary font-bold">✓ مُحدد</span>}
                    </div>
                    {/* Tooltip Content */}
                    <div className={`mt-2 text-[10px] leading-relaxed transition-all ${format === f.id ? 'text-blue-700' : 'text-gray-400 opacity-50'}`}>
                      {f.tooltip}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Answer Key Toggle - Made Clickable */}
            <div 
              onClick={() => setIncludeAnswers(!includeAnswers)}
              className="bg-gray-50 p-4 rounded-xl flex items-center justify-between border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors select-none"
            >
              <div className="flex flex-col text-right">
                <span className="font-bold text-sm text-gray-800">تضمين الإجابات</span>
                <span className="text-xs text-gray-500">إضافة نموذج الإجابة والتفسيرات في نهاية الملف</span>
              </div>
              <button
                type="button"
                className={`w-12 h-6 rounded-full transition-colors relative pointer-events-none ${includeAnswers ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${includeAnswers ? 'left-1' : 'left-7'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-white transition"
          >
            إلغاء
          </button>
          <button
            onClick={() => onExport(format, includeAnswers)}
            disabled={isProcessing}
            className="flex-[2] py-3 px-4 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-blue-900 transition flex items-center justify-center gap-2 disabled:bg-gray-400"
          >
            {isProcessing ? (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : 'بدء التصدير 🚀'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
