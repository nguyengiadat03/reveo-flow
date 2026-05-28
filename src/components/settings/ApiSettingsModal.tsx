import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, LockKeyhole, RefreshCw, ShieldAlert, X } from 'lucide-react';
import { listProviders } from '../../services/apiSettingsClient';
import type { VideoProviderDefinition } from '../../services/providerTypes';
import { ProviderCard } from './ProviderCard';

interface ApiSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onProvidersChanged?: (providers: VideoProviderDefinition[]) => void;
}

type ProviderTab = 'all' | 'configured' | 'local' | 'ai-video';

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ open, onClose, onProvidersChanged }) => {
  const [providers, setProviders] = useState<VideoProviderDefinition[]>([]);
  const [tab, setTab] = useState<ProviderTab>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshProviders = async () => {
    setLoading(true);
    setError('');
    try {
      const nextProviders = await listProviders();
      setProviders(nextProviders);
      onProvidersChanged?.(nextProviders);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không tải được danh sách provider.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void refreshProviders();
  }, [open]);

  const filteredProviders = useMemo(() => {
    if (tab === 'configured') return providers.filter((provider) => provider.configured);
    if (tab === 'local') return providers.filter((provider) => provider.category === 'local');
    if (tab === 'ai-video') return providers.filter((provider) => provider.category === 'ai-video' || provider.category === 'custom');
    return providers;
  }, [providers, tab]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="api-settings-modal">
        <header className="settings-header">
          <div className="settings-title">
            <div className="settings-title-icon">
              <KeyRound size={22} />
            </div>
            <div>
              <strong>Cấu hình API</strong>
              <span>Quản lý nhà cung cấp render video AI và khóa API cục bộ.</span>
            </div>
          </div>
          <button className="icon-action" onClick={onClose} title="Đóng" type="button">
            <X size={18} />
          </button>
        </header>

        <div className="security-notice">
          <LockKeyhole size={18} />
          <span>Key lưu cục bộ trong Electron. Workflow không lưu secret.</span>
        </div>

        <div className="provider-guidance">
          <strong>Credits & provider</strong>
          <span>Local FFmpeg không cần credits. Gemini/Veo cần API key hợp lệ. Google Flow credits chưa có API bên thứ ba được xác nhận.</span>
        </div>

        <div className="settings-tabs">
          {[
            ['all', 'Tất cả'],
            ['configured', 'Ready'],
            ['local', 'Local'],
            ['ai-video', 'AI Video'],
          ].map(([id, label]) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id as ProviderTab)} type="button">
              {label}
            </button>
          ))}
          <button className="settings-refresh" onClick={refreshProviders} disabled={loading} type="button">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>

        {error && (
          <div className="settings-error">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="provider-list">
          {filteredProviders.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} onChanged={refreshProviders} />
          ))}
        </div>
      </div>
    </div>
  );
};
