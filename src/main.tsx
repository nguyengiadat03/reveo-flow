import React from 'react';
import ReactDOM from 'react-dom/client';
import '@xyflow/react/dist/style.css';
import './styles.css';
import App from './App';
import { AppErrorBoundary } from './components/system/AppErrorBoundary';
import { log } from './services/logger';

window.onerror = (_message, _source, _lineno, _colno, error) => {
  log('error', 'renderer', error || _message);
};

window.onunhandledrejection = (event) => {
  log('error', 'renderer', event.reason || 'Unhandled promise rejection');
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
