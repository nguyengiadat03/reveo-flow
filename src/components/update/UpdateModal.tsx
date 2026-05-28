import React from 'react';
import { AlertTriangle, ClipboardCopy, DownloadCloud, Loader2, RotateCcw, ShieldCheck, X } from 'lucide-react';
import type { UpdateStatus } from '../../types/update';

interface UpdateModalProps {
  open: boolean;
  status: UpdateStatus;
  onClose: () => void;
  onCheck: () => void;
  onDownload: () => void;
  onInstall: () => void;
  onCopyDiagnostics: () => void;
}

function title(status: UpdateStatus): string {
  switch (status.status) {
    case 'available':
      return 'Có bản cập nhật mới';
    case 'downloading':
      return 'Đang tải bản cập nhật';
    case 'downloaded':
      return 'Cập nhật đã sẵn sàng';
    case 'not-available':
      return 'Bạn đang dùng bản mới nhất';
    case 'blocked':
      return 'Tạm hoãn cập nhật';
    case 'unsupported-portable':
      return 'Bản portable không hỗ trợ auto-update';
    case 'dev-disabled':
      return 'Auto-update tắt trong dev mode';
    case 'error':
      return 'Không thể kiểm tra cập nhật';
    default:
      return 'Cập nhật ứng dụng';
  }
}

function icon(status: UpdateStatus) {
  if (status.status === 'downloading') return <Loader2 size={22} className="spin" />;
  if (status.status === 'downloaded') return <RotateCcw size={22} />;
  if (status.status === 'available') return <DownloadCloud size={22} />;
  if (status.status === 'error' || status.status === 'blocked' || status.status === 'unsupported-portable') return <AlertTriangle size={22} />;
  return <ShieldCheck size={22} />;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ open, status, onClose, onCheck, onDownload, onInstall, onCopyDiagnostics }) => {
  if (!open) return null;

  const busy = status.status === 'checking' || status.status === 'downloading';
  const message =
    status.status === 'unsupported-portable'
      ? 'Bản portable không hỗ trợ cập nhật tự động. Vui lòng tải bản installer mới.'
      : status.status === 'blocked'
        ? 'Đang có tác vụ render, cập nhật sẽ được thực hiện sau khi hoàn tất.'
        : status.errorMessage || status.message || 'Kiểm tra trạng thái cập nhật.';

  return (
    <div className="update-modal-backdrop" role="dialog" aria-modal="true">
      <div className="update-modal">
        <header className="update-modal-head">
          <div className="update-modal-title">
            <div className="update-modal-icon">{icon(status)}</div>
            <div>
              <strong>{title(status)}</strong>
              <span>Video Flow · phiên bản hiện tại {status.currentVersion || '1.0.0'}</span>
            </div>
          </div>
          <button className="icon-action" onClick={onClose} disabled={status.status === 'downloading'} title="Đóng" type="button">
            <X size={18} />
          </button>
        </header>

        <div className="update-modal-body">
          <p>{message}</p>
          {status.latestVersion && (
            <div className="update-version-grid">
              <span>Hiện tại</span>
              <strong>{status.currentVersion}</strong>
              <span>Mới nhất</span>
              <strong>{status.latestVersion}</strong>
            </div>
          )}
          <div className="update-diagnostics-grid">
            <span>Kênh cập nhật</span>
            <strong>{status.channel || 'GitHub Releases'}</strong>
            <span>Trạng thái</span>
            <strong>{status.status}</strong>
            <span>Portable</span>
            <strong>{status.isPortable ? 'Có' : 'Không'}</strong>
          </div>

          {status.status === 'downloading' && (
            <div className="update-progress">
              <div style={{ width: `${Math.max(0, Math.min(100, status.percent || 0))}%` }} />
            </div>
          )}
        </div>

        <footer className="update-modal-actions">
          {status.status === 'available' && (
            <button className="primary-action" onClick={onDownload} type="button">
              <DownloadCloud size={16} />
              Tải bản cập nhật
            </button>
          )}
          {status.status === 'downloaded' && (
            <button className="primary-action" onClick={onInstall} type="button">
              <RotateCcw size={16} />
              Khởi động lại để cập nhật
            </button>
          )}
          {!['available', 'downloaded', 'downloading'].includes(status.status) && (
            <button className="primary-action" onClick={onCheck} disabled={busy} type="button">
              {busy ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
              Kiểm tra cập nhật
            </button>
          )}
          <button className="secondary-action" onClick={onClose} disabled={status.status === 'downloading'} type="button">
            Để sau
          </button>
          <button className="secondary-action" onClick={onCopyDiagnostics} type="button">
            <ClipboardCopy size={16} />
            Copy diagnostic log
          </button>
        </footer>
      </div>
    </div>
  );
};
