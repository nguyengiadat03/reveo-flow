import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Handle, Position, useHandleConnections, useReactFlow } from '@xyflow/react';
import { AlertTriangle, Clapperboard, KeyRound, Play } from 'lucide-react';
import { renderSceneVideo } from '../services/aiClient';
import type { ScriptShot } from '../types';
import { VIDEO_MODEL } from '../constants';
import { NodeDeleteButton } from './NodeDeleteButton';
import type { VideoProviderDefinition } from '../services/providerTypes';
import { getDefaultProvider } from '../services/providerRegistry';

export const SceneNode = ({ id, data, onOpenSettings, providers = [] }: any) => {
  const { getNodes, setNodes } = useReactFlow();
  const connections = useHandleConnections({ type: 'target' });
  const [providerId, setProviderId] = useState(String(data.providerId || ''));
  const [modelName, setModelName] = useState(String(data.modelName || ''));

  const connectedNodes = useMemo(() => {
    const nodes = getNodes();
    return connections.map((connection) => nodes.find((node) => node.id === connection.source)).filter(Boolean);
  }, [connections, getNodes]);

  const scriptNode = connectedNodes.find((node) => node?.type === 'script');
  const shots = ((scriptNode?.data as any)?.shots || []) as ScriptShot[];
  const sceneIndex = Number(data.sceneIndex || 0);
  const activeShot = shots.length > 0 ? shots[sceneIndex % shots.length] : null;
  const status = data.status || 'idle';
  const defaultProvider = getDefaultProvider(providers as VideoProviderDefinition[]);
  const selectedProvider =
    (providers as VideoProviderDefinition[]).find((provider) => provider.id === (providerId || data.providerId)) ||
    defaultProvider;
  const selectedModel = selectedProvider?.models.find((model) => model.id === (modelName || data.modelName)) || selectedProvider?.models[0];
  const missingKey = Boolean(selectedProvider?.requiresApiKey && !selectedProvider.configured);
  const canRender = Boolean(activeShot && selectedProvider && !missingKey && status !== 'processing');

  useEffect(() => {
    if (!selectedProvider) return;
    const nextProviderId = data.providerId || providerId || selectedProvider.id;
    const nextModelName = data.modelName || modelName || selectedProvider.config.modelName || selectedProvider.models[0]?.id || '';
    setProviderId(nextProviderId);
    setModelName(nextModelName);
    updateData({ providerId: nextProviderId, modelName: nextModelName });
  }, [selectedProvider?.id]);

  const updateData = useCallback(
    (patch: Record<string, unknown>) => {
      setNodes((nodes) => nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...patch } } : node)));
    },
    [id, setNodes],
  );

  const renderScene = async () => {
    if (missingKey) {
      onOpenSettings?.();
      return;
    }

    if (!activeShot || !selectedProvider) return;

    updateData({ status: 'processing', error: undefined });
    try {
      const allNodes = getNodes();
      const latestScriptNode = allNodes.find((node) => node.type === 'script');
      const latestScript = (latestScriptNode?.data || {}) as any;
      const latestShots = (latestScript.shots || []) as ScriptShot[];
      const latestShot = latestShots.length > 0 ? latestShots[sceneIndex % latestShots.length] : activeShot;
      const character = allNodes.find((node) => node.type === 'character')?.data as any;
      const voice = allNodes.find((node) => node.type === 'voice')?.data as any;
      const outfit = allNodes.find((node) => node.type === 'outfit')?.data as any;
      const background = allNodes.find((node) => node.type === 'background')?.data as any;
      const assets = allNodes.filter((node) => node.type === 'asset').map((node) => node.data as Record<string, unknown>);
      const prompt = [
        latestScript.topic,
        latestShot?.title,
        latestShot?.description,
        latestShot?.action,
        character?.name ? `Nhân vật: ${character.name}` : '',
        character?.description ? `Mô tả nhân vật: ${character.description}` : '',
        outfit?.base64 ? 'Sử dụng outfit reference từ workflow.' : '',
        background?.description ? `Bối cảnh: ${background.description}` : '',
        assets.length > 0 ? `Có ${assets.length} asset/product reference.` : '',
      ].filter(Boolean).join('\n');

      const result = await renderSceneVideo({
        sceneId: id,
        sceneIndex,
        providerId: selectedProvider.id,
        modelName: selectedModel?.id || '',
        topic: latestScript.topic || 'Video workflow',
        prompt,
        durationSeconds: Number(latestScript.duration || 8),
        aspectRatio: latestScript.aspectRatio || '9:16',
        shot: latestShot || null,
        character,
        voice,
        outfit,
        background,
        assets,
      });
      updateData({ status: 'done', mediaId: result.mediaId, base64: result.base64, filePath: result.filePath });
    } catch (error) {
      updateData({ status: 'error', error: error instanceof Error ? error.message : 'Không render được video.' });
    }
  };

  return (
    <div className="flow-node node-scene large">
      <Handle type="target" position={Position.Left} className="flow-handle input green" />
      <div className="node-title">
        <div className="node-title-main">
          <Clapperboard size={18} />
          <span>Cảnh Quay #{sceneIndex + 1}</span>
        </div>
        <NodeDeleteButton id={id} />
      </div>

      <div className="node-body">
        <div className="scene-preview">
          {data.base64 ? <video src={data.base64} muted controls /> : <Clapperboard size={52} className="muted-icon" />}
          {status === 'processing' && <div className="loading-cover"><span className="spinner" /></div>}
        </div>

        <div className="scene-meta">
          <span>{connectedNodes.length} input</span>
          <span>{selectedProvider?.shortName || VIDEO_MODEL}</span>
        </div>

        <div className="provider-select-grid">
          <label className="field-label">
            Nhà cung cấp
            <select
              className="field nodrag"
              value={selectedProvider?.id || ''}
              onChange={(event) => {
                const nextProvider = (providers as VideoProviderDefinition[]).find((provider) => provider.id === event.target.value);
                const nextModel = nextProvider?.config.modelName || nextProvider?.models[0]?.id || '';
                setProviderId(event.target.value);
                setModelName(nextModel);
                updateData({ providerId: event.target.value, modelName: nextModel });
              }}
            >
              {(providers as VideoProviderDefinition[]).map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.shortName}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Model
            <select
              className="field nodrag"
              value={selectedModel?.id || ''}
              onChange={(event) => {
                setModelName(event.target.value);
                updateData({ modelName: event.target.value });
              }}
            >
              {(selectedProvider?.models || []).map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="shot-focus">
          <strong>{activeShot?.title || 'Chưa có shot'}</strong>
          <span>{activeShot?.action || 'Kết nối Script node và tạo phân cảnh trước khi render.'}</span>
        </div>

        {status === 'error' && (
          <div className="node-warning">
            <AlertTriangle size={16} />
            <span>{data.error}</span>
          </div>
        )}

        {missingKey && (
          <div className="node-warning">
            <KeyRound size={16} />
            <span>Thiếu khóa API cho {selectedProvider?.shortName}. Mở Cấu hình API để nhập key.</span>
          </div>
        )}

        <button className="primary-button nodrag" disabled={!canRender && !missingKey} onClick={renderScene} type="button">
          {status === 'processing' ? <span className="spinner small" /> : missingKey ? <KeyRound size={16} /> : <Play size={16} />}
          {missingKey ? 'Cấu hình API' : !activeShot ? 'Tạo phân cảnh trước' : status === 'processing' ? 'Đang render' : 'Bắt đầu render'}
        </button>
      </div>

      <Handle type="source" position={Position.Right} className="flow-handle output green" />
    </div>
  );
};
