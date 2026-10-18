'use client';

import { ToastContainer } from 'react-toastify';

export function ToastProvider() {
  return (
    <ToastContainer
      position="bottom-right"
      autoClose={4000}
      newestOnTop
      closeOnClick
      pauseOnHover
      pauseOnFocusLoss
      limit={3}
      theme="light"
    />
  );
}
