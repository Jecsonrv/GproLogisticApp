import { useState, useEffect } from 'react';

const STORAGE_KEY = 'gpro_pagination_page_size';
const DEFAULT_PAGE_SIZE = 10;

export const usePersistentPageSize = (initialPageSize = DEFAULT_PAGE_SIZE) => {
  const [pageSize, setPageSize] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error al leer el tamaño de página desde localStorage:', error);
    }
    return initialPageSize;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, pageSize.toString());
    } catch (error) {
      console.error('Error al guardar el tamaño de página en localStorage:', error);
    }
  }, [pageSize]);

  return [pageSize, setPageSize];
};

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
