import React from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  title = "Confirm Action", 
  message, 
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonClass = "blue-button"
}) => {
  if (!isOpen) return null;

  const content = (
    <div className="modal-overlay" onMouseDown={onCancel}>
      <div className="modal-content" style={{ maxWidth: '360px' }} onMouseDown={e => e.stopPropagation()}>
        {title && <div className="modal-header">{title}</div>}
        <div className="modal-body">{message}</div>
        <div className="modal-footer">
          <button className="white-button" onClick={onCancel}>{cancelText}</button>
          <button className={confirmButtonClass} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default ConfirmModal; 