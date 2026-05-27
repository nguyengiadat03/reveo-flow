import React from 'react';
import { AlertTriangle, CheckCircle2, DownloadCloud, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import type { UpdateStatus } from '../../types/update';

interface UpdateStatusButtonProps {
  status: UpdateStatus;
  onClick: () => void;
}

function labelForStatus(status: UpdateStatus): string {
  switch (status.status) {
    case 'checking':
      return 'Đang kiểm tra';
    case 'available':
      return 'Có bản mới';
    case 'downloading':
      return `Đang tải ${Math.round(status.percent || 0)}%`;
    case 'downloaded':
      return 'Cần khởi động lại';
    case 'error':
      return 'Lỗi cập nhật';
    case 'blocked':
      return 'Đang render';
    case 'unsupported-portable':
      return 'Portable';
    case 'dev-disabled':
      return 'Dev mode';
    case 'not-available':
      return 'Đã cập nhật';
    default:
      return 'Kiểm tra cập nhật';
  }
}

function IconForStatus({ status }: { status: UpdateStatus }) {
  if (status.status === 'checking' || status.status === 'downloading') return <Loader2 size={16} className="spin" />;
  if (status.status === 'available') return <DownloadCloud size={16} />;
  if (status.status === 'downloaded') return <RotateCcw size={16} />;
  if (status.status === 'error' || status.status === 'blocked' || status.status === 'unsupported-portable') return <AlertTriangle size={16} />;
  if (status.status === 'not-available') return <CheckCircle2 size={16} />;
  return <RefreshCw size={16} />;
}

export const UpdateStatusButton: React.FC<UpdateStatusButtonProps> = ({ status, onClick }) => {
  return (
    <button className="toolbar-button update-status-button" data-status={status.status} onClick={onClick} type="button">
      <IconForStatus status={status} />
      <span>{labelForStatus(status)}</span>
    </button>
  );
};
