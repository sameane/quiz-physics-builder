
import React from 'react';
import { WatermarkSettings } from '../types';

interface WatermarkSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: WatermarkSettings;
  onUpdate: (settings: WatermarkSettings) => void;
  onDelete: () => void;
}

const WatermarkSettingsModal: React.FC<WatermarkSettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onUpdate,
  onDelete
}) => {
  if (!isOpen) return null;

  const handleChange = (key: keyof WatermarkSettings, value: any) => {
    onUpdate({ ...settings, [key]: value });
  };

  // Parse current grid size (Format: "Cols x Rows")
  // Default is [3, 4] -> 3 Columns, 4 Rows
  const [currentCols, currentRows] = settings.gridSize 
    ? settings.gridSize.split('x').map(Number) 
    : [3, 4];

  const handleGridChange = (type: 'rows' | 'cols', value: number) => {
    const val = Math.max(1, Math.min(20, value)); // Limit between 1 and 20
    const newCols = type === 'cols' ? val : currentCols;
    const newRows = type === 'rows' ? val : currentRows;
    // Format must remain "Cols x Rows" to match ExamPaper logic
    handleChange('gridSize', `${newCols}x${newRows}`);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-fade-in no-print">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up border-t-4 border-blue-600">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <span>💧</span> إعدادات العلامة المائية
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
        </div>
        
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Opacity */}
          <div>
            <label className="flex justify-between text-xs font-bold text-gray-700 mb-2">
              <span>الشفافية</span>
              <span className="text-blue-600">{Math.round(settings.opacity * 100)}%</span>
            </label>
            <input 
              type="range" min="0.05" max="1" step="0.05" 
              value={settings.opacity} 
              onChange={(e) => handleChange('opacity', parseFloat(e.target.value))} 
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
            />
          </div>

          {/* Size */}
          <div>
            <label className="flex justify-between text-xs font-bold text-gray-700 mb-2">
              <span>الحجم (Scale)</span>
              <span className="text-blue-600">{settings.scale}x</span>
            </label>
            <input 
              type="range" min="0.1" max="3" step="0.1" 
              value={settings.scale} 
              onChange={(e) => handleChange('scale', parseFloat(e.target.value))} 
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
            />
          </div>

          {/* Rotation */}
          <div>
            <label className="flex justify-between text-xs font-bold text-gray-700 mb-2">
              <span>الدوران (Rotation)</span>
              <span className="text-blue-600">{settings.rotation}°</span>
            </label>
            <input 
              type="range" min="-180" max="180" step="5" 
              value={settings.rotation} 
              onChange={(e) => handleChange('rotation', parseInt(e.target.value))} 
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
            />
          </div>

          <div className="h-px bg-gray-200 my-2"></div>

          {/* Placement Mode */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">نمط التكرار</label>
            <div className="flex gap-1 mb-3">
               <button 
                  onClick={() => handleChange('placement', 'center')}
                  className={`flex-1 py-2 rounded text-[10px] font-bold border transition ${settings.placement === 'center' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
               >
                 توسيط (واحدة)
               </button>
               <button 
                  onClick={() => handleChange('placement', 'grid')}
                  className={`flex-1 py-2 rounded text-[10px] font-bold border transition ${settings.placement === 'grid' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
               >
                 شبكة (Grid)
               </button>
               <button 
                  onClick={() => handleChange('placement', 'question')}
                  className={`flex-1 py-2 rounded text-[10px] font-bold border transition ${settings.placement === 'question' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
               >
                 داخل السؤال
               </button>
            </div>

            {/* Grid Settings */}
            {settings.placement === 'grid' && (
              <div className="bg-gray-50 p-3 rounded border border-gray-200 animate-fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">عدد الصفوف (رأسي)</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="20" 
                      value={currentRows}
                      onChange={(e) => handleGridChange('rows', parseInt(e.target.value) || 1)}
                      className="w-full p-2 border border-gray-300 bg-white rounded text-center font-bold text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">عدد الأعمدة (أفقي)</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="10" 
                      value={currentCols}
                      onChange={(e) => handleGridChange('cols', parseInt(e.target.value) || 1)}
                      className="w-full p-2 border border-gray-300 bg-white rounded text-center font-bold text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-gray-400 text-center">
                  الإجمالي: {currentRows * currentCols} علامة في الصفحة
                </div>
              </div>
            )}

            {/* Question Mode Settings */}
            {settings.placement === 'question' && (
              <div className="bg-gray-50 p-3 rounded border border-gray-200 animate-fade-in">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">عدد العلامات في مربع السؤال الواحد</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="10" 
                    value={settings.questionWmarkCount || 1}
                    onChange={(e) => handleChange('questionWmarkCount', parseInt(e.target.value) || 1)}
                    className="w-full p-2 border border-gray-300 bg-white rounded text-center font-bold text-sm focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Layering */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
             <span className="text-xs font-bold text-gray-700">الطبقة (Layer)</span>
             <div className="flex gap-1 bg-white p-1 rounded border border-gray-200">
               <button 
                 onClick={() => handleChange('isOverlay', false)}
                 className={`px-3 py-1 rounded text-[10px] font-bold transition ${!settings.isOverlay ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
               >
                 خلف النص
               </button>
               <button 
                 onClick={() => handleChange('isOverlay', true)}
                 className={`px-3 py-1 rounded text-[10px] font-bold transition ${settings.isOverlay ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
               >
                 أمام النص
               </button>
             </div>
          </div>

        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-between gap-3">
           <button 
             onClick={onDelete}
             className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold border border-transparent hover:border-red-100 transition"
           >
             حذف
           </button>
           <button 
             onClick={onClose}
             className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow transition"
           >
             إغلاق
           </button>
        </div>
      </div>
    </div>
  );
};

export default WatermarkSettingsModal;
