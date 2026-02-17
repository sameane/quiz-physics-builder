
import React, { useState, useRef } from 'react';
import { DesignSettings, CommonBorderStyle } from '../types';

interface DesignSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DesignSettings;
  onUpdate: (settings: DesignSettings) => void;
}

const DesignSettingsModal: React.FC<DesignSettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'page' | 'header' | 'question'>('page');
  const rightLogoRef = useRef<HTMLInputElement>(null);
  const leftLogoRef = useRef<HTMLInputElement>(null);
  const bgImageRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: keyof DesignSettings) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          onUpdate({ ...settings, [key]: ev.target.result as string });
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
    e.target.value = ''; // Reset
  };

  const removeImage = (key: keyof DesignSettings) => {
     onUpdate({ ...settings, [key]: undefined });
  };

  // Helper for rendering border options consistently
  const renderBorderOptions = (
    currentStyle: CommonBorderStyle,
    onChange: (s: CommonBorderStyle) => void
  ) => {
    const options: { id: CommonBorderStyle; label: string }[] = [
      { id: 'none', label: 'بدون' },
      { id: 'simple', label: 'خط بسيط' },
      { id: 'double', label: 'مزدوج' },
      { id: 'frame', label: 'مزخرف' },
      { id: 'dashed', label: 'متقطع' },
      { id: 'modern_right', label: 'مودرن جانبي' },
      { id: 'modern_bottom', label: 'مودرن سفلي' },
      { id: '3d_rect', label: 'ثلاثي الأبعاد' },
    ];

    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`relative w-full p-2 rounded-lg transition-all flex flex-col items-center gap-2 group
              ${currentStyle === opt.id ? 'ring-2 ring-purple-600 bg-purple-50' : 'border border-gray-200 hover:border-purple-300 hover:shadow-sm'}
            `}
          >
            <div className={`w-full h-12 bg-white rounded flex items-center justify-center overflow-hidden
               ${opt.id === 'simple' ? 'border-2 border-gray-800' : ''}
               ${opt.id === 'double' ? 'border-4 border-double border-gray-800' : ''}
               ${opt.id === 'dashed' ? 'border-2 border-dashed border-gray-600' : ''}
               ${opt.id === 'frame' ? 'border-[3px] border-double border-gray-800 outline outline-1 outline-offset-1 outline-gray-400' : ''}
               ${opt.id === 'modern_right' ? 'border-r-4 border-gray-800 bg-gray-100' : ''}
               ${opt.id === 'modern_bottom' ? 'border-b-4 border-gray-800' : ''}
               ${opt.id === '3d_rect' ? 'border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]' : ''}
            `}></div>
            <span className={`text-[10px] font-bold ${currentStyle === opt.id ? 'text-purple-700' : 'text-gray-600'}`}>{opt.label}</span>
          </button>
        ))}
      </div>
    );
  };

  // Helper for Width, Margin, Color controls
  const renderDimensionsControls = (
     widthVal: number, setWidth: (n: number) => void,
     paddingVal: number, setPadding: (n: number) => void,
     marginVal: number, setMargin: (n: number) => void,
     colorVal: string, setColor: (s: string) => void,
     bgVal?: string, setBg?: (s: string) => void,
     marginLabel = 'الهامش الخارجي (Margin)',
     paddingLabel = 'الهامش الداخلي (Padding)'
  ) => (
    <div className="space-y-4 mt-4 p-4 bg-gray-50/80 rounded-lg border border-gray-200">
       <div className="grid grid-cols-2 gap-4">
          {/* Color */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">لون الحدود</label>
            <div className="flex items-center gap-2">
                <input type="color" value={colorVal} onChange={(e) => setColor(e.target.value)} className="h-8 w-14 cursor-pointer border rounded" />
                <span className="text-[10px] text-gray-500 font-mono">{colorVal}</span>
            </div>
          </div>
          {/* BG Color (Optional) */}
          {setBg && (
             <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">لون الخلفية</label>
                <div className="flex items-center gap-2">
                    <input type="color" value={bgVal || '#ffffff'} onChange={(e) => setBg(e.target.value)} className="h-8 w-14 cursor-pointer border rounded" />
                    <button onClick={() => setBg('transparent')} className="text-[10px] underline text-gray-500">شفاف</button>
                </div>
             </div>
          )}
       </div>
       
       <div className="grid grid-cols-3 gap-3">
          {/* Width */}
          <div>
             <div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-gray-700">السمك</label><span className="text-[10px] text-purple-600 font-bold">{widthVal}px</span></div>
             <input type="range" min="1" max="10" value={widthVal} onChange={(e) => setWidth(Number(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
          </div>
          {/* Padding */}
          <div>
             <div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-gray-700">{paddingLabel}</label><span className="text-[10px] text-purple-600 font-bold">{paddingVal}px</span></div>
             <input type="range" min="0" max="60" value={paddingVal} onChange={(e) => setPadding(Number(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
          </div>
          {/* Margin */}
          <div>
             <div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-gray-700">{marginLabel}</label><span className="text-[10px] text-purple-600 font-bold">{marginVal}px</span></div>
             <input type="range" min="0" max="60" value={marginVal} onChange={(e) => setMargin(Number(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
          </div>
       </div>
    </div>
  );


  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in no-print">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden animate-scale-up border-t-8 border-purple-600 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
            <span>🎨</span> إعدادات التصميم والتنسيق
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-white shrink-0">
          <button onClick={() => setActiveTab('page')} className={`flex-1 py-3 font-bold text-sm transition-colors border-b-2 ${activeTab === 'page' ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>📄 إعدادات الصفحة</button>
          <button onClick={() => setActiveTab('header')} className={`flex-1 py-3 font-bold text-sm transition-colors border-b-2 ${activeTab === 'header' ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>🏷️ ترويسة الاختبار</button>
          <button onClick={() => setActiveTab('question')} className={`flex-1 py-3 font-bold text-sm transition-colors border-b-2 ${activeTab === 'question' ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>❓ مربعات الأسئلة</button>
        </div>
        
        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-grow bg-white">
          
          {/* --- PAGE TAB --- */}
          {activeTab === 'page' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Page Background */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                <h4 className="font-bold text-gray-700 mb-3 text-sm border-b pb-2">خلفية الصفحة</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-bold text-gray-600 mb-2">لون الخلفية</label>
                      <div className="flex items-center gap-2">
                          <input type="color" value={settings.pageBgColor || '#ffffff'} onChange={(e) => onUpdate({ ...settings, pageBgColor: e.target.value })} className="h-9 w-full cursor-pointer border rounded" />
                          <button onClick={() => onUpdate({ ...settings, pageBgColor: '#ffffff' })} className="text-xs bg-white border px-2 py-2 rounded shadow-sm hover:bg-gray-50">أبيض</button>
                      </div>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-gray-600 mb-2">صورة الخلفية (من الجهاز)</label>
                      {settings.pageBgImage ? (
                        <div className="flex items-center gap-2">
                           <div className="h-9 flex-grow bg-blue-50 border border-blue-200 rounded flex items-center px-3 text-xs text-blue-700 truncate">تم اختيار صورة</div>
                           <button onClick={() => removeImage('pageBgImage')} className="h-9 w-9 bg-red-100 text-red-600 rounded flex items-center justify-center hover:bg-red-200">×</button>
                        </div>
                      ) : (
                        <button onClick={() => bgImageRef.current?.click()} className="w-full h-9 bg-white border border-dashed border-gray-400 text-gray-600 text-xs rounded hover:bg-gray-50 hover:border-gray-500">رفع صورة...</button>
                      )}
                      <input type="file" ref={bgImageRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'pageBgImage')} />
                   </div>
                </div>
              </div>

              {/* Page Border */}
              <div>
                <h4 className="font-bold text-gray-700 mb-3 text-sm">إطار الصفحة</h4>
                {renderBorderOptions(
                   settings.pageBorder, 
                   (val) => onUpdate({ ...settings, pageBorder: val })
                )}
                {settings.pageBorder !== 'none' && renderDimensionsControls(
                    settings.pageBorderWidth || 2, (v) => onUpdate({...settings, pageBorderWidth: v}),
                    settings.pagePadding || 20, (v) => onUpdate({...settings, pagePadding: v}),
                    settings.pageMargin || 20, (v) => onUpdate({...settings, pageMargin: v}),
                    settings.pageBorderColor || '#000000', (v) => onUpdate({...settings, pageBorderColor: v}),
                    undefined, undefined,
                    'الهامش الخارجي (Page Margin)',
                    'الهامش الداخلي (Page Padding)'
                )}
              </div>
            </div>
          )}

          {/* --- HEADER TAB --- */}
          {activeTab === 'header' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                 <h4 className="font-bold text-gray-700 mb-3 text-sm">نمط الترويسة</h4>
                 {renderBorderOptions(
                   settings.headerBorder,
                   (val) => onUpdate({ ...settings, headerBorder: val })
                 )}
                 {renderDimensionsControls(
                    settings.headerBorderWidth || 2, (v) => onUpdate({...settings, headerBorderWidth: v}),
                    settings.headerPadding || 16, (v) => onUpdate({...settings, headerPadding: v}),
                    settings.headerMargin || 20, (v) => onUpdate({...settings, headerMargin: v}),
                    settings.headerBorderColor || '#1e3a8a', (v) => onUpdate({...settings, headerBorderColor: v}),
                    settings.headerBgColor, (v) => onUpdate({...settings, headerBgColor: v}),
                    'هامش أسفل الرأس (Margin Bottom)',
                    'حشو الرأس (Padding)'
                 )}
                 
                 {/* Header Border Radius Control */}
                 <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between mb-1"><label className="text-xs font-bold text-gray-700">تدوير حواف الرأس (Radius)</label><span className="text-xs text-purple-600 font-bold">{settings.headerBorderRadius || 0}px</span></div>
                    <input type="range" min="0" max="30" value={settings.headerBorderRadius || 0} onChange={(e) => onUpdate({...settings, headerBorderRadius: Number(e.target.value)})} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                 </div>
              </div>

              {/* Logos - Hidden */}
              {false && (
              <div className="border-t pt-4">
                <h4 className="font-bold text-gray-700 mb-3 text-sm">شعارات الرأس (Logos)</h4>
                <div className="grid grid-cols-2 gap-4">
                   {/* Right Logo */}
                   <div className="border border-dashed border-gray-300 rounded p-3 text-center bg-gray-50">
                      <p className="text-xs font-bold mb-2">شعار اليمين</p>
                      {settings.headerImageRight ? (
                        <>
                            <div className="relative inline-block group mb-2">
                               <img src={settings.headerImageRight} className="h-12 object-contain border rounded bg-white" />
                               <button onClick={() => removeImage('headerImageRight')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow">×</button>
                            </div>
                            {/* Width Slider */}
                            <div className="mt-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] block text-gray-500">عرض الصورة</label>
                                    <span className="text-[10px] text-purple-600 font-bold">{settings.headerImageRightWidth || 120}px</span>
                                </div>
                                <input type="range" min="40" max="300" value={settings.headerImageRightWidth || 120} onChange={(e) => onUpdate({...settings, headerImageRightWidth: Number(e.target.value)})} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                            </div>
                        </>
                      ) : (
                        <button onClick={() => rightLogoRef.current?.click()} className="text-[10px] bg-white border px-3 py-1 rounded hover:bg-gray-100">رفع</button>
                      )}
                      <input type="file" ref={rightLogoRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'headerImageRight')} />
                   </div>
                   {/* Left Logo */}
                   <div className="border border-dashed border-gray-300 rounded p-3 text-center bg-gray-50">
                      <p className="text-xs font-bold mb-2">شعار اليسار</p>
                      {settings.headerImageLeft ? (
                        <>
                            <div className="relative inline-block group mb-2">
                               <img src={settings.headerImageLeft} className="h-12 object-contain border rounded bg-white" />
                               <button onClick={() => removeImage('headerImageLeft')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow">×</button>
                            </div>
                            {/* Width Slider */}
                            <div className="mt-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] block text-gray-500">عرض الصورة</label>
                                    <span className="text-[10px] text-purple-600 font-bold">{settings.headerImageLeftWidth || 120}px</span>
                                </div>
                                <input type="range" min="40" max="300" value={settings.headerImageLeftWidth || 120} onChange={(e) => onUpdate({...settings, headerImageLeftWidth: Number(e.target.value)})} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                            </div>
                        </>
                      ) : (
                        <button onClick={() => leftLogoRef.current?.click()} className="text-[10px] bg-white border px-3 py-1 rounded hover:bg-gray-100">رفع</button>
                      )}
                      <input type="file" ref={leftLogoRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'headerImageLeft')} />
                   </div>
                </div>
              </div>
              )}
            </div>
          )}

          {/* --- QUESTION TAB --- */}
          {activeTab === 'question' && (
             <div className="space-y-6 animate-fade-in">
                <div>
                   <h4 className="font-bold text-gray-700 mb-3 text-sm">نمط مربع السؤال</h4>
                   {renderBorderOptions(
                     settings.questionBorder,
                     (val) => onUpdate({ ...settings, questionBorder: val })
                   )}
                   {renderDimensionsControls(
                      settings.questionBorderWidth || 1, (v) => onUpdate({...settings, questionBorderWidth: v}),
                      settings.questionPadding || 16, (v) => onUpdate({...settings, questionPadding: v}),
                      settings.questionMargin || 16, (v) => onUpdate({...settings, questionMargin: v}),
                      settings.questionBorderColor || '#e5e7eb', (v) => onUpdate({...settings, questionBorderColor: v}),
                      settings.questionBgColor, (v) => onUpdate({...settings, questionBgColor: v}),
                      'المسافة بين الأسئلة (Margin)',
                      'حشو السؤال (Padding)'
                   )}
                </div>
                
                {/* Border Radius Control */}
                <div>
                   <div className="flex justify-between mb-1"><label className="text-xs font-bold text-gray-700">تدوير الحواف (Radius)</label><span className="text-xs text-purple-600 font-bold">{settings.questionBorderRadius || 8}px</span></div>
                   <input type="range" min="0" max="30" value={settings.questionBorderRadius || 8} onChange={(e) => onUpdate({...settings, questionBorderRadius: Number(e.target.value)})} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                </div>
             </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
           <button 
             onClick={onClose}
             className="px-8 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 shadow transition"
           >
             إغلاق
           </button>
        </div>
      </div>
    </div>
  );
};

export default DesignSettingsModal;
