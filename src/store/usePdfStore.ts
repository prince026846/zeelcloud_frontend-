import { create } from 'zustand';
import { registerStoreReset } from './storeRegistry';

interface PdfState {
  isVisible: boolean;
  htmlContent: string;
  fileName?: string;
  openPreview: (html: string, fileName?: string) => void;
  closePreview: () => void;
  reset: () => void;
}

export const usePdfStore = create<PdfState>((set) => {
  const reset = () => set({ isVisible: false, htmlContent: '', fileName: undefined });
  registerStoreReset(reset);

  return {
    isVisible: false,
    htmlContent: '',
    fileName: undefined,
    openPreview: (html, fileName) => set({ isVisible: true, htmlContent: html, fileName }),
    closePreview: () => set({ isVisible: false, htmlContent: '', fileName: undefined }),
    reset,
  };
});
