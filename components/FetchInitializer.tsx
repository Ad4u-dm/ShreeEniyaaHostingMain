'use client';

import { useEffect } from 'react';
import { initGlobalFetch } from '@/lib/fetchWrapper';

/**
 * Client-side component to initialize the global fetch wrapper
 * This makes all /api/* calls automatically route to the backend server
 */
export function FetchInitializer() {
  useEffect(() => {
    initGlobalFetch();
  }, []);

  return null;
}
