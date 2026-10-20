import { useEffect, useRef } from "react";

export default function ResponsiveModal({ children, title, onClose, className = "" }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      className={`m-auto mb-0 w-[calc(100%_-_1rem)] max-h-[calc(100dvh_-_1rem)] overflow-y-auto overscroll-contain border-0 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop:bg-slate-950/65 sm:m-auto sm:w-[calc(100%_-_2rem)] sm:max-h-[calc(100dvh_-_2rem)] ${className}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {children}
    </dialog>
  );
}
