import React, { useEffect, useState } from 'react';
import { Cloud, DownloadCloud, Loader2, Save, X } from 'lucide-react';

interface CloudWorkflowModalProps {
  open: boolean;
  loading: boolean;
  workflows: any[];
  onClose: () => void;
  onRefresh: () => void;
  onSave: (name: string) => void;
  onOpenWorkflow: (id: string) => void;
}

export const CloudWorkflowModal: React.FC<CloudWorkflowModalProps> = ({ open, loading, workflows, onClose, onRefresh, onSave, onOpenWorkflow }) => {
  const [name, setName] = useState('Video Flow Workflow');

  useEffect(() => {
    if (open) onRefresh();
  }, [open]);

  if (!open) return null;

  return (
    <div className="update-modal-backdrop" role="dialog" aria-modal="true">
      <div className="cloud-workflow-modal">
        <header className="update-modal-head">
          <div className="update-modal-title">
            <div className="update-modal-icon"><Cloud size={22} /></div>
            <div>
              <strong>Workflow Cloud</strong>
              <span>Lưu và mở workflow qua Supabase</span>
            </div>
          </div>
          <button className="icon-action" onClick={onClose} title="Đóng" type="button">
            <X size={18} />
          </button>
        </header>

        <div className="cloud-workflow-body">
          <div className="cloud-save-row">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Tên workflow" />
            <button className="primary-action" onClick={() => onSave(name)} disabled={loading} type="button">
              {loading ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              Lưu Cloud
            </button>
          </div>

          <div className="cloud-workflow-list">
            {loading && <div className="health-loading"><Loader2 className="spin" size={20} />Đang tải workflow...</div>}
            {!loading && workflows.length === 0 && <div className="health-empty"><Cloud size={26} />Chưa có workflow cloud.</div>}
            {!loading && workflows.map((workflow) => (
              <button className="cloud-workflow-item" key={workflow.id} onClick={() => onOpenWorkflow(workflow.id)} type="button">
                <div>
                  <strong>{workflow.name || 'Untitled workflow'}</strong>
                  <span>{workflow.updated_at ? new Date(workflow.updated_at).toLocaleString('vi-VN') : workflow.version}</span>
                </div>
                <DownloadCloud size={17} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
