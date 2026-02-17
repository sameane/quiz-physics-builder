
import React, { useState, useEffect } from 'react';

interface ImageKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImage: string;
  onSave: (newUrl: string) => void;
}

const ImageKitModal: React.FC<ImageKitModalProps> = ({ isOpen, onClose, initialImage, onSave }) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'settings'>('edit');
  
  // Config State with User Provided Defaults
  const [urlEndpoint, setUrlEndpoint] = useState(() => localStorage.getItem('ik_url_endpoint') || 'https://ik.imagekit.io/hygwuixkc');
  const [publicKey, setPublicKey] = useState(() => localStorage.getItem('ik_public_key') || 'public_vPZmtnyaQYM5rpL7kLm+aJmABzM=');
  const [authEndpoint, setAuthEndpoint] = useState(() => localStorage.getItem('ik_auth_endpoint') || 'http://www.yourserver.com/auth');
  
  // Editor State
  const [isUploading, setIsUploading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [filePath, setFilePath] = useState<string>('');
  
  // Transformations
  const [contrast, setContrast] = useState(0); 
  const [brightness, setBrightness] = useState(0);
  const [sharpen, setSharpen] = useState(0);
  const [blur, setBlur] = useState(0);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (initialImage.startsWith('data:')) {
        // It's base64, needs upload
        setCurrentUrl('');
        setFilePath('');
      } else {
        // Assume it's already a URL (possibly ImageKit or other)
        setCurrentUrl(initialImage);
        // Try to extract path if it's an ImageKit URL to allow re-transform
        if (initialImage.includes(urlEndpoint) && urlEndpoint) {
           try {
             const urlObj = new URL(initialImage);
             setFilePath(urlObj.pathname);
           } catch (e) { console.error(e); }
        }
      }
      // Reset transforms
      setContrast(0);
      setBrightness(0);
      setSharpen(0);
      setBlur(0);
      setRotation(0);
    }
  }, [isOpen, initialImage, urlEndpoint]);

  const saveConfig = () => {
    localStorage.setItem('ik_url_endpoint', urlEndpoint);
    localStorage.setItem('ik_public_key', publicKey);
    localStorage.setItem('ik_auth_endpoint', authEndpoint);
    setActiveTab('edit');
  };

  const getInstance = () => {
    if (!window.ImageKit) return null;
    return new window.ImageKit({
      publicKey: publicKey,
      urlEndpoint: urlEndpoint,
      authenticationEndpoint: authEndpoint
    });
  };

  const handleUpload = () => {
    if (!urlEndpoint || !authEndpoint) {
      alert("الرجاء إعداد رابط المصادقة ورابط ImageKit في الإعدادات أولاً.");
      setActiveTab('settings');
      return;
    }

    const imagekit = getInstance();
    if (!imagekit) {
      alert("فشل تحميل مكتبة ImageKit.");
      return;
    }

    setIsUploading(true);
    imagekit.upload({
      file: initialImage, // Base64
      fileName: `physics_q_${Date.now()}.jpg`,
      tags: ["physics_exam"]
    }, (err: any, result: any) => {
      setIsUploading(false);
      if (err) {
        console.error("Upload Error:", err);
        // Safely extract error message to prevent [object Object]
        let errMsg = "Unknown error";
        if (typeof err === 'string') errMsg = err;
        else if (err.message) errMsg = err.message;
        else if (typeof err === 'object') {
           try { errMsg = JSON.stringify(err); } catch(e) { errMsg = "Unserializable error"; }
        }
        alert(`فشل الرفع: ${errMsg}`);
      } else {
        setFilePath(result.filePath);
        setCurrentUrl(result.url);
      }
    });
  };

  // Trigger update when sliders change
  useEffect(() => {
    if (filePath && urlEndpoint) {
      const imagekit = getInstance();
      if (imagekit) {
        const tr: any[] = [];
        if (rotation !== 0) tr.push({ rotation: rotation });
        if (blur > 0) tr.push({ blur: blur });
        if (sharpen > 0) tr.push({ effectSharpen: sharpen });
        // Simplified approach for other effects
        if (contrast !== 0) tr.push({ effectContrast: true });
        if (brightness !== 0) tr.push({ effectBrightness: brightness });

        try {
          const generatedUrl = imagekit.url({
            path: filePath,
            transformation: tr
          });
          setCurrentUrl(generatedUrl);
        } catch (e) {
          console.warn("Failed to generate URL:", e);
        }
      }
    }
  }, [contrast, brightness, sharpen, blur, rotation, filePath, urlEndpoint]);

  const handleSave = () => {
    onSave(currentUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 print:hidden animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gray-900 text-white p-4 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span>🎨</span> تعديل الصورة (ImageKit)
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('edit')} 
              className={`px-3 py-1 rounded text-sm ${activeTab === 'edit' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            >
              المحرر
            </button>
            <button 
              onClick={() => setActiveTab('settings')} 
              className={`px-3 py-1 rounded text-sm ${activeTab === 'settings' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            >
              الإعدادات
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white ml-2">✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
          
          {activeTab === 'settings' ? (
            <div className="p-8 w-full max-w-2xl mx-auto overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">إعدادات ImageKit</h2>
              <p className="text-sm text-gray-600 mb-6 bg-yellow-50 p-3 rounded border border-yellow-200">
                ملاحظة: لرفع الصور وتحريرها، تحتاج إلى حساب على ImageKit.io.
                <br />
                يجب إعداد <b>Authentication Endpoint</b> على السيرفر الخاص بك لتوليد التوقيع الأمني للرفع.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Public Key</label>
                  <input 
                    type="text" 
                    value={publicKey} 
                    onChange={(e) => setPublicKey(e.target.value)}
                    className="w-full p-2 border rounded ltr font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">URL Endpoint</label>
                  <input 
                    type="text" 
                    value={urlEndpoint} 
                    onChange={(e) => setUrlEndpoint(e.target.value)}
                    className="w-full p-2 border rounded ltr font-mono text-sm"
                    placeholder="https://ik.imagekit.io/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Authentication Endpoint</label>
                  <input 
                    type="text" 
                    value={authEndpoint} 
                    onChange={(e) => setAuthEndpoint(e.target.value)}
                    className="w-full p-2 border rounded ltr font-mono text-sm"
                    placeholder="http://..."
                  />
                </div>
                <button 
                  onClick={saveConfig}
                  className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 mt-4"
                >
                  حفظ الإعدادات
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Preview Area */}
              <div className="flex-grow bg-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
                {!currentUrl && !filePath && !isUploading ? (
                  <div className="text-center">
                     <p className="mb-4 text-gray-600">الصورة محلية (Base64). يجب رفعها إلى ImageKit لتفعيل التعديل.</p>
                     <button 
                       onClick={handleUpload}
                       className="bg-blue-600 text-white px-6 py-3 rounded shadow hover:bg-blue-700 font-bold"
                     >
                       رفع الصورة الآن ☁️
                     </button>
                  </div>
                ) : isUploading ? (
                  <div className="text-blue-600 flex flex-col items-center">
                    <svg className="animate-spin h-8 w-8 mb-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>جاري الرفع...</span>
                  </div>
                ) : (
                  <img 
                    src={currentUrl || initialImage} 
                    alt="Preview" 
                    className="max-w-full max-h-full object-contain shadow-lg border border-white" 
                  />
                )}
              </div>

              {/* Controls Sidebar */}
              <div className="w-full md:w-80 bg-white border-r md:border-r-0 md:border-l p-4 flex flex-col gap-6 overflow-y-auto shrink-0 z-10">
                
                {(!filePath && !currentUrl.includes('imagekit.io')) ? (
                   <div className="text-gray-400 text-center text-sm italic mt-10">
                     يجب رفع الصورة لتفعيل أدوات التعديل.
                   </div>
                ) : (
                  <>
                    <div>
                      <label className="flex justify-between text-sm font-bold mb-1">
                        <span>تدوير (Rotate)</span>
                        <span className="text-blue-600">{rotation}°</span>
                      </label>
                      <input 
                        type="range" min="0" max="360" step="90" 
                        value={rotation} onChange={(e) => setRotation(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div>
                      <label className="flex justify-between text-sm font-bold mb-1">
                        <span>حدة (Sharpen)</span>
                        <span className="text-blue-600">{sharpen}</span>
                      </label>
                      <input 
                        type="range" min="0" max="20" 
                        value={sharpen} onChange={(e) => setSharpen(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div>
                      <label className="flex justify-between text-sm font-bold mb-1">
                        <span>ضبابية (Blur)</span>
                        <span className="text-blue-600">{blur}</span>
                      </label>
                      <input 
                        type="range" min="0" max="20" 
                        value={blur} onChange={(e) => setBlur(Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>
                  </>
                )}

                <div className="mt-auto pt-4 border-t">
                  <button 
                    onClick={handleSave}
                    disabled={!currentUrl || isUploading}
                    className={`w-full py-3 rounded text-white font-bold shadow transition
                      ${(!currentUrl || isUploading) ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}
                    `}
                  >
                    حفظ التعديلات ✓
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageKitModal;
