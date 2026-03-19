'use client';

import { useEffect, useRef, useCallback } from 'react';

export interface ModalButton {
  label: string;
  cls: string;
  action: () => void;
}

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  buttons: ModalButton[];
  children: React.ReactNode;
}

export default function Modal({ open, title, onClose, buttons, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && buttons.length > 0) {
        e.preventDefault();
        buttons[buttons.length - 1].action();
      }
    },
    [onClose, buttons]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className={`modal-overlay ${open ? 'show' : ''}`}
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="modal">
        <div className="modal-header">
          <span>{title}</span>
          <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: 18 }}>
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          {buttons.map((b, i) => (
            <button key={i} className={`btn ${b.cls}`} onClick={b.action}>
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
