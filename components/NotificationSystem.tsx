
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'primary';
}

interface NotificationContextType {
  showToast: (message: string, type?: NotificationType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<(ConfirmOptions & { resolve: (val: boolean) => void }) | null>(null);

  const showToast = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmDialog({ ...options, resolve });
    });
  }, []);

  const handleConfirmResponse = (value: boolean) => {
    if (confirmDialog) {
      confirmDialog.resolve(value);
      setConfirmDialog(null);
    }
  };

  return (
    <NotificationContext.Provider value={{ showToast, confirm }}>
      {children}

      {/* Toasts Container - Added no-export-pdf class */}
      <div className="fixed top-4 left-4 z-[200] flex flex-col gap-2 pointer-events-none no-export-pdf">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border-r-4 animate-fade-in-left min-w-[250px]
              ${n.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' : 
                n.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' : 
                'bg-blue-50 border-blue-500 text-blue-800'}`}
          >
            <span className="text-xl">
              {n.type === 'success' ? '✅' : n.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <p className="font-medium text-sm">{n.message}</p>
          </div>
        ))}
      </div>

      {/* Confirm Dialog - Added no-export-pdf class */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in no-export-pdf">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up">
            <div className={`p-4 text-white font-bold flex items-center gap-2 ${confirmDialog.type === 'danger' ? 'bg-red-600' : 'bg-primary'}`}>
              <span>{confirmDialog.type === 'danger' ? '⚠️' : '❓'}</span>
              {confirmDialog.title}
            </div>
            <div className="p-6">
              <p className="text-gray-700 leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="p-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => handleConfirmResponse(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition"
              >
                {confirmDialog.cancelText || 'إلغاء'}
              </button>
              <button
                onClick={() => handleConfirmResponse(true)}
                className={`px-6 py-2 text-white font-bold rounded-lg shadow transition
                  ${confirmDialog.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-blue-900'}`}
              >
                {confirmDialog.confirmText || 'تأكيد'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in-left {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scale-up {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-left { animation: fade-in-left 0.3s ease-out; }
        .animate-scale-up { animation: scale-up 0.2s ease-out; }
      `}</style>
    </NotificationContext.Provider>
  );
};
