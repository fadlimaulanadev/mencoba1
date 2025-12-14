import { useState } from 'react';

interface ModalConfig {
  title?: string;
  message?: string;
  buttonText?: string;
  type?: 'success' | 'error' | 'info';
}

export function useSuccessModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ModalConfig>({});

  const showModal = (options?: ModalConfig) => {
    setConfig({ type: 'success', ...options });
    setIsOpen(true);
  };

  const showSuccess = (options?: Omit<ModalConfig, 'type'>) => {
    setConfig({ type: 'success', ...options });
    setIsOpen(true);
  };

  const showError = (options?: Omit<ModalConfig, 'type'>) => {
    setConfig({ type: 'error', ...options });
    setIsOpen(true);
  };

  const showInfo = (options?: Omit<ModalConfig, 'type'>) => {
    setConfig({ type: 'info', ...options });
    setIsOpen(true);
  };

  const hideModal = () => {
    setIsOpen(false);
    setConfig({});
  };

  return {
    isOpen,
    config,
    showModal,
    showSuccess,
    showError,
    showInfo,
    hideModal,
    // Backward compatibility
    hideSuccess: hideModal,
  };
}