import React from 'react';
import { ClipboardCopy, RefreshCw, RotateCcw, ShieldAlert } from 'lucide-react';
import { getDiagnosticLog, restartApp } from '../../services/systemClient';
import { getRendererDiagnosticLog, log, redact } from '../../services/logger';

interface AppErrorBoundaryState {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    log('error', 'renderer', error);
    this.setState({ error, errorInfo });
  }

  retry = () => {
    this.setState({ error: null, errorInfo: null });
  };

  copyReport = async () => {
    const localReport = [
      'Renderer Error Report',
      redact(this.state.error || 'Unknown error'),
      redact(this.state.errorInfo?.componentStack || ''),
      getRendererDiagnosticLog(),
    ].join('\n');
    const mainLog = window.desktopAPI?.system ? await getDiagnosticLog({ rendererError: this.state.error?.message }) : '';
    await navigator.clipboard?.writeText([localReport, mainLog].filter(Boolean).join('\n\n'));
  };

  restart = async () => {
    if (window.desktopAPI?.system) await restartApp();
    else window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="app-error-screen">
        <div className="app-error-panel">
          <div className="update-modal-icon"><ShieldAlert size={28} /></div>
          <h1>Ứng dụng gặp lỗi giao diện</h1>
          <p>Video Flow đã chặn lỗi để tránh màn hình trắng. Bạn có thể thử lại hoặc copy error report để kiểm tra.</p>
          <pre>{redact(this.state.error.message)}</pre>
          <div className="update-modal-actions">
            <button className="primary-action" onClick={this.retry} type="button"><RefreshCw size={16} />Thử lại</button>
            <button className="secondary-action" onClick={this.restart} type="button"><RotateCcw size={16} />Khởi động lại app</button>
            <button className="secondary-action" onClick={this.copyReport} type="button"><ClipboardCopy size={16} />Copy error report</button>
          </div>
        </div>
      </div>
    );
  }
}
