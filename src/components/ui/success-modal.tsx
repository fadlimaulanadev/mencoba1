import React, { useState, useEffect } from 'react';
import { Button } from './button';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  buttonText?: string;
  type?: 'success' | 'error' | 'info';
}

export function SuccessModal({ 
  isOpen, 
  onClose, 
  title = "Successfully", 
  message = "Operation completed successfully",
  buttonText = "OK",
  type = "success"
}: SuccessModalProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300); // Match animation duration
  };

  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;

  const getButtonClass = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 hover:bg-green-600';
      case 'error':
        return 'bg-red-500 hover:bg-red-600';
      case 'info':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-green-500 hover:bg-green-600';
    }
  };

  const buttonClass = getButtonClass();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Background Overlay */}
      <div 
        className="absolute inset-0 bg-primary/20 backdrop-blur-md"
      />
      
      {/* Modal Content */}
      <div className={`relative bg-card rounded-xl shadow-2xl p-8 mx-4 w-80 border border-border success-modal-content ${
        isClosing ? 'animate-modal-out' : 'animate-modal-in'
      }`}>

        

        
        {/* Title */}
        <h2 className="text-xl font-semibold text-foreground text-center mb-4 mt-4">
          {title}
        </h2>
        
        {/* Message */}
        {message && (
          <p className="text-muted-foreground text-center mb-6 leading-relaxed">
            {message}
          </p>
        )}
        
        {/* Action Button */}
        <Button
          onClick={handleClose}
          className={`w-full ${buttonClass} text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105`}
        >
          {buttonText}
        </Button>
      </div>
    </div>
  );
}