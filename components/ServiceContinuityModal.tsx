import React, { useState, useEffect, useCallback } from 'react';

export interface ServiceContinuityState {
  isOpen: boolean;
  provider: 'gemini' | 'openai' | null;
  message: string;
  countdownSeconds: number;
  onRetry: () => void;
  onUsePrivateKey: () => void;
}

interface ServiceContinuityModalProps {
  state: ServiceContinuityState;
  onClose: () => void;
}

const ServiceContinuityModal: React.FC<ServiceContinuityModalProps> = ({ state, onClose }) => {
  const [countdown, setCountdown] = useState(state.countdownSeconds);
  const [isRetryEnabled, setIsRetryEnabled] = useState(false);

  useEffect(() => {
    setCountdown(state.countdownSeconds);
    setIsRetryEnabled(false);
  }, [state.countdownSeconds, state.isOpen]);

  useEffect(() => {
    if (!state.isOpen || countdown <= 0) {
      setIsRetryEnabled(true);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsRetryEnabled(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state.isOpen, countdown]);

  const handleRetry = useCallback(() => {
    state.onRetry();
    onClose();
  }, [state, onClose]);

  const handleUsePrivateKey = useCallback(() => {
    state.onUsePrivateKey();
    onClose();
  }, [state, onClose]);

  if (!state.isOpen) return null;

  const getProviderName = () => {
    switch (state.provider) {
      case 'gemini':
        return 'Google Gemini';
      case 'openai':
        return 'OpenAI';
      default:
        return 'خدمة الذكاء الاصطناعي';
    }
  };

  const getProviderColor = () => {
    switch (state.provider) {
      case 'gemini':
        return 'border-blue-600';
      case 'openai':
        return 'border-green-600';
      default:
        return 'border-gray-600';
    }
  };

  const getProviderIcon = () => {
    switch (state.provider) {
      case 'gemini':
        return '🤖';
      case 'openai':
        return '🧠';
      default:
        return '⚠️';
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in no-print">
      <div className={`bg-white rounded-2xl w-full max-w-lg overflow-hidden animate-scale-up border-t-8 ${getProviderColor()} shadow-2xl`}>
        
        {/* Header */}
        <div className="bg-gray-50 p-6 border-b">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getProviderIcon()}</span>
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                {state.provider === 'gemini' ? 'نفاد الحصة المجانية' : 'الحد الأقصى للطلبات'}
              </h3>
              <p className="text-sm text-gray-500">{getProviderName()}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Alert Message */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-amber-600 text-xl">⚠️</span>
              <p className="text-gray-700 leading-relaxed">{state.message}</p>
            </div>
          </div>

          {/* Countdown */}
          {countdown > 0 && (
            <div className="flex items-center justify-center gap-2 bg-blue-50 rounded-xl p-4">
              <span className="text-blue-600">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
              <span className="text-blue-700 font-medium">
                يمكنك المحاولة بعد {countdown} ثانية...
              </span>
            </div>
          )}

          {/* Information */}
          <div className="text-sm text-gray-600 space-y-2">
            {state.provider === 'openai' && (
              <p className="flex items-center gap-2">
                <span>ℹ️</span>
                <span>حساب OpenAI المجاني محدود بـ 3 طلبات فقط في الدقيقة.</span>
              </p>
            )}
            <p className="flex items-center gap-2">
              <span>💡</span>
              <span>يمكنك إدخال مفتاح API الخاص بك لإزالة جميع القيود.</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t bg-gray-50 space-y-3">
          {/* Retry Button */}
          <button
            onClick={handleRetry}
            disabled={!isRetryEnabled}
            className={`w-full py-3 px-4 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2
              ${isRetryEnabled 
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
          >
            <span>🔄</span>
            {isRetryEnabled ? 'المحاولة مرة أخرى' : `الانتظار (${countdown})`}
          </button>

          {/* Use Private Key Button */}
          <button
            onClick={handleUsePrivateKey}
            className="w-full py-3 px-4 rounded-xl font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span>🔑</span>
            إدخال مفتاح API الخاص بي
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-2 px-4 text-gray-500 hover:text-gray-700 transition-colors text-sm"
          >
            إغلاق
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

export default ServiceContinuityModal;
