import React from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
  /** Optional custom footer. If undefined, renders default OK button. If null, hides footer entirely. */
  footer?: React.ReactNode | null;
  /** Optional additional class for the modal content container */
  contentClassName?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, size = 'medium', children, footer, contentClassName }) => {
  if (!isOpen) return null;

  const maxWidth = size === 'large' ? '1080px' : size === 'medium' ? '540px' : '360px';
  const contentContainerClassName = `modal-content${contentClassName ? ` ${contentClassName}` : ''}`;
  
  const content = (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className={contentContainerClassName} style={{ maxWidth }} onMouseDown={e => e.stopPropagation()}>
        {title && <div className="modal-header">{title}</div>}
        <div className="modal-body">{children}</div>
        {footer !== null && (
          <div className="modal-footer">
            {footer === undefined ? (
              <button className="blue-button" onClick={onClose}>OK</button>
            ) : (
              footer
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default Modal; 