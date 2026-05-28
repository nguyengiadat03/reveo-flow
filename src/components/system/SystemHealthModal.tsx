import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCopy, Loader2, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import type { HealthCheckItem, HealthCheckReport, HealthCheckStatus } from '../../types/health';

interface SystemHealthModalProps {
  open: boolean;
  loading: boolean;
  report: HealthCheckReport | null;
  onClose: () => void;
  onRun: () => void;
  onCopyDiagnostics: () => void;
}

const statusMeta: Record<HealthCheckStatus, { label: string; icon: React.ReactNode }> = {
  pass: { label: 'Tốt', icon: <CheckCircle2 size={15} /> },
  warning: { label: 'Cảnh báo', icon: <AlertTriangle size={15} /> },
  fail: { label: 'Lỗi', icon: <XCircle size={15} /> },
  skipped: { label: 'Bỏ qua', icon: <ShieldAlert size={15} /> },
};

function groupChecks(checks: HealthCheckItem[]) {
  return checks.reduce<Record<string, HealthCheckItem[]>>((groups, item) => {
    groups[item.group] = groups[item.group] || [];
    groups[item.group].push(item);
    return groups;
  }, {});
}

export const SystemHealthModal: React.FC<SystemHealthModalProps> = ({ open, loading, report, onClose, onRun, onCopyDiagnostics }) => {
  const groups = useMemo(() => groupChecks(report?.checks || []), [report]);
  const summary = useMemo(() => {
    const checks = report?.checks || [];
    return {
      pass: checks.filter((item) => item.status === 'pass').length,
      warning: checks.filter((item) => item.status === 'warning').length,
      fail: checks.filter((item) => item.status === 'fail').length,
      skipped: checks.filter((item) => item.status === 'skipped').length,
    };
  }, [report]);

  if (!open) return null;

  return (
    <div className="update-modal-backdrop" role="dialog" aria-modal="true">
      <div className="system-health-modal">
        <header className="update-modal-head">
          <div className="update-modal-title">
            <div className="update-modal-icon"><ShieldAlert size={22} /></div>
            <div>
              <strong>Kiểm tra hệ thống</strong>
              <span>Rà lỗi runtime, cập nhật, workflow, provider và FFmpeg</span>
            </div>
          </div>
          <button className="icon-action" onClick={onClose} title="Đóng" type="button">
            <XCircle size={18} />
          </button>
        </header>

        <div className="health-summary">
          <div data-status="pass"><strong>{summary.pass}</strong><span>Tốt</span></div>
          <div data-status="warning"><strong>{summary.warning}</strong><span>Cảnh báo</span></div>
          <div data-status="fail"><strong>{summary.fail}</strong><span>Lỗi</span></div>
          <div data-status="skipped"><strong>{summary.skipped}</strong><span>Bỏ qua</span></div>
        </div>

        <div className="system-health-body">
          {loading && (
            <div className="health-loading">
              <Loader2 size={22} className="spin" />
              <span>Đang kiểm tra hệ thống...</span>
            </div>
          )}

          {!loading && !report && (
            <div className="health-empty">
              <ShieldAlert size={28} />
              <span>Chưa có báo cáo. Bấm “Chạy kiểm tra” để bắt đầu.</span>
            </div>
          )}

          {!loading && Object.entries(groups).map(([group, checks]) => (
            <section className="health-group" key={group}>
              <h3>{group}</h3>
              <div className="health-check-list">
                {checks.map((item) => (
                  <article className="health-check-item" data-status={item.status} key={item.id}>
                    <div className="health-check-status">{statusMeta[item.status].icon}</div>
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.message}</p>
                      {item.suggestedFix && item.status !== 'pass' && <small>{item.suggestedFix}</small>}
                    </div>
                    <span>{statusMeta[item.status].label}</span>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="update-modal-actions">
          <button className="primary-action" onClick={onRun} disabled={loading} type="button">
            {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            Chạy kiểm tra
          </button>
          <button className="secondary-action" onClick={onCopyDiagnostics} type="button">
            <ClipboardCopy size={16} />
            Copy diagnostic log
          </button>
          <button className="secondary-action" onClick={onClose} type="button">
            Đóng
          </button>
        </footer>
      </div>
    </div>
  );
};
