import { CheckCircle2, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "完了する",
  cancelText = "キャンセル"
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-card border border-border shadow-2xl rounded-3xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {message}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onCancel}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-secondary text-secondary-foreground font-bold hover:bg-secondary/80 transition-all active:scale-95"
            >
              <X className="w-4 h-4" />
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
