import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDanger = true
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-4">
          <h3 className="text-[14px] font-semibold text-gray-900 mb-1.5">{title}</h3>
          <p className="text-[12px] text-gray-500 leading-relaxed">{message}</p>
        </div>
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-[11.5px] font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-3 py-1.5 text-[11.5px] font-medium text-white rounded-lg cursor-pointer ${
              isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
