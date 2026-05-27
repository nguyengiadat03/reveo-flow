import React, { useMemo, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, RadioTower, ShieldCheck, Trash2, Wifi, XCircle } from 'lucide-react';
import {
  removeProviderKey,
  saveProviderKey,
  setDefaultProvider,
  testProviderConnection,
} from '../../services/apiSettingsClient';
import type { TestConnectionResult, VideoProviderDefinition } from '../../services/providerTypes';
import { getProviderStatusLabel } from '../../services/providerRegistry';

interface ProviderCardProps {
  provider: VideoProviderDefinition;
  onChanged: () => Promise<void>;
}

function providerTone(provider: VideoProviderDefinition) {
  if (provider.id === 'local-ffmpeg') return 'emerald';
  if (provider.lastTestStatus === 'error') return 'rose';
  if (provider.configured) return 'cyan';
  return 'slate';
}

export const ProviderCard: React.FC<ProviderCardProps> = ({ provider, onChanged }) => {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(provider.config.baseUrl || '');
  const [modelName, setModelName] = useState(provider.config.modelName || provider.models[0]?.id || '');
  const [busy, setBusy] = useState<'test' | 'save' | 'remove' | 'default' | ''>('');
  const [message, setMessage] = useState(provider.lastTestMessage || '');

  const statusLabel = getProviderStatusLabel(provider);
  const tone = providerTone(provider);

  const selectedModelName = useMemo(() => {
    return provider.models.find((model) => model.id === modelName)?.name || modelName || 'Default';
  }, [provider.models, modelName]);

  const runAction = async (kind: typeof busy, action: () => Promise<unknown>) => {
    setBusy(kind);
    try {
      await action();
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Thao tác thất bại.');
    } finally {
      setBusy('');
    }
  };

  const onTest = () => runAction('test', async () => {
    const result = await testProviderConnection({ providerId: provider.id, apiKey, baseUrl, modelName }) as TestConnectionResult;
    setMessage(result.message);
  });

  const onSave = () => runAction('save', async () => {
    await saveProviderKey({ providerId: provider.id, apiKey, baseUrl, modelName });
    setApiKey('');
    setMessage('Đã lưu cấu hình.');
  });

  const onRemove = () => runAction('remove', async () => {
    await removeProviderKey(provider.id);
    setApiKey('');
    setMessage('Đã xóa khóa API.');
  });

  const onDefault = () => runAction('default', async () => {
    await setDefaultProvider(provider.id);
    setMessage('Đã chọn làm nhà cung cấp mặc định.');
  });

  return (
    <section className="provider-card" data-tone={tone}>
      <div className="provider-card-head">
        <div className="provider-icon">
          {provider.id === 'local-ffmpeg' ? <RadioTower size={20} /> : <KeyRound size={20} />}
        </div>
        <div className="provider-title">
          <strong>{provider.name}</strong>
          <span>{provider.statusLabel}</span>
        </div>
        <div className="provider-status">
          {provider.lastTestStatus === 'ok' ? <CheckCircle2 size={16} /> : provider.lastTestStatus === 'error' ? <XCircle size={16} /> : <ShieldCheck size={16} />}
          <span>{statusLabel}</span>
        </div>
      </div>

      <div className="provider-meta-row">
        <span>{provider.requiresApiKey ? 'Yêu cầu khóa API' : 'Không cần khóa API'}</span>
        <span>{provider.implemented ? 'Có thể render' : 'Adapter chờ API chính thức'}</span>
        <span>{provider.isDefault ? 'Mặc định' : selectedModelName}</span>
      </div>

      <div className="provider-form">
        {provider.requiresApiKey && (
          <label className="premium-field-label">
            Khóa API
            <input
              className="premium-input"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={provider.maskedKey || 'Nhập khóa API'}
              type="password"
              autoComplete="off"
            />
          </label>
        )}

        {provider.supportsBaseUrl && (
          <label className="premium-field-label">
            Base URL
            <input
              className="premium-input"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://api.example.com"
              type="url"
            />
          </label>
        )}

        <label className="premium-field-label">
          Model
          <select className="premium-input" value={modelName} onChange={(event) => setModelName(event.target.value)}>
            {provider.models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {message && <div className="provider-message">{message}</div>}

      <div className="provider-actions">
        <button className="secondary-action" onClick={onTest} disabled={Boolean(busy)} type="button">
          {busy === 'test' ? <Loader2 size={15} className="spin" /> : <Wifi size={15} />}
          Kiểm tra kết nối
        </button>
        <button className="primary-action" onClick={onSave} disabled={Boolean(busy) || provider.id === 'local-ffmpeg'} type="button">
          {busy === 'save' ? <Loader2 size={15} className="spin" /> : <ShieldCheck size={15} />}
          Lưu cấu hình
        </button>
        <button className="secondary-action" onClick={onDefault} disabled={Boolean(busy) || provider.isDefault} type="button">
          {busy === 'default' ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />}
          Mặc định
        </button>
        {provider.requiresApiKey && (
          <button className="icon-action danger" onClick={onRemove} disabled={Boolean(busy) || !provider.hasApiKey} title="Xóa khóa API" type="button">
            {busy === 'remove' ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
          </button>
        )}
      </div>
    </section>
  );
};
