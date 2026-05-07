"use client";

import { toast } from "react-toastify";
import { Trash2, AlertTriangle } from "lucide-react";

interface ConfirmDeleteProps {
  onConfirm: () => void;
  onCancel: () => void;
  message: string;
  confirmText?: string;
  ConfirmIcon?: any;
}

const ConfirmDelete = ({
  onConfirm,
  onCancel,
  message,
  confirmText = "Delete",
  ConfirmIcon = Trash2,
}: ConfirmDeleteProps) => (
  <div className="flex flex-col gap-3 p-1">
    <div className="flex items-center gap-2 text-amber-500 font-bold">
      <AlertTriangle className="h-5 w-5" />
      <span>Confirm Action</span>
    </div>
    <p className="text-sm text-white/90 font-medium">{message}</p>
    <div className="flex justify-end gap-2 mt-1">
      <button
        onClick={() => {
          onCancel();
          toast.dismiss();
        }}
        className="px-3 py-1.5 text-xs font-bold rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={() => {
          onConfirm();
          toast.dismiss();
        }}
        className="px-3 py-1.5 text-xs font-bold text-white rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center gap-1"
      >
        <ConfirmIcon className="h-3.5 w-3.5" />
        {confirmText}
      </button>
    </div>
  </div>
);

export const showConfirmDelete = (
  onConfirm: () => void,
  message: string = "Are you sure you want to delete this item?",
) => {
  showConfirmAction(onConfirm, message, "Delete", Trash2);
};

export const showConfirmAction = (
  onConfirm: () => void,
  message: string,
  confirmText: string = "Confirm",
  ConfirmIcon: any = AlertTriangle
) => {
  // Add class to body to show overlay and block clicks
  document.body.classList.add("toast-overlay-active");

  const cleanup = () => {
    document.body.classList.remove("toast-overlay-active");
  };

  toast(
    ({ closeToast }) => (
      <ConfirmDelete
        onConfirm={onConfirm}
        onCancel={() => {
          closeToast();
          cleanup();
        }}
        message={message}
        confirmText={confirmText}
        ConfirmIcon={ConfirmIcon}
      />
    ),
    {
      position: "top-center",
      autoClose: false,
      closeOnClick: false,
      draggable: false,
      closeButton: false,
      className: "confirm-toast-container",
      onClose: cleanup,
      style: {
        background: "#2a2a2a", // Proper grey background
        color: "#ffffff",
        borderRadius: "1.25rem",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        padding: "1rem",
        marginTop: "3vh", // Center it more vertically
      },
    },
  );
};
