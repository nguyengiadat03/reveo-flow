import React, { useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ImagePlus, Sparkles, UserRound } from 'lucide-react';
import { generateCharacterImage } from '../services/aiClient';
import { mediaToDataUrl, selectMedia } from '../services/mediaClient';
import { NodeDeleteButton } from './NodeDeleteButton';

export const CharacterNode = ({ id, data }: any) => {
  const { setNodes } = useReactFlow();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(data.name || '');
  const [description, setDescription] = useState(data.description || '');
  const [preview, setPreview] = useState(data.base64 || '');

  const updateData = useCallback(
    (patch: Record<string, unknown>) => {
      setNodes((nodes) => nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...patch } } : node)));
    },
    [id, setNodes],
  );

  const generateCharacter = async () => {
    setLoading(true);
    try {
      const result = await generateCharacterImage(name, description);
      setPreview(result.base64);
      updateData({ mediaId: result.mediaId, base64: result.base64, name, description });
    } finally {
      setLoading(false);
    }
  };

  const selectImage = async () => {
    setLoading(true);
    try {
      const media = await selectMedia('image');
      if (!media) return;
      const dataUrl = mediaToDataUrl(media);
      setPreview(dataUrl);
      updateData({ mediaId: media.mediaId, base64: dataUrl, name, description });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flow-node node-character">
      <Handle type="target" position={Position.Left} id="outfit" className="flow-handle input" style={{ top: '62%' }} />
      <div className="node-title">
        <div className="node-title-main">
          <UserRound size={18} />
          <span>Nhân Vật</span>
        </div>
        <NodeDeleteButton id={id} />
      </div>

      <div className="node-body">
        <div className="media-preview square">
          {preview ? <img src={preview} alt={name || 'Nhân vật'} /> : <UserRound size={52} className="muted-icon" />}
          {loading && <div className="loading-cover"><span className="spinner" /></div>}
          <button className="floating-button nodrag" onClick={selectImage} title="Chọn ảnh" type="button">
            <ImagePlus size={17} />
          </button>
        </div>

        <input
          className="field nodrag"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            updateData({ name: event.target.value });
          }}
          placeholder="Tên nhân vật..."
        />
        <textarea
          className="field textarea nodrag"
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            updateData({ description: event.target.value });
          }}
          placeholder="Mô tả..."
        />

        <button className="primary-button nodrag" disabled={loading} onClick={generateCharacter} type="button">
          <Sparkles size={16} />
          Tạo phác thảo
        </button>
      </div>
      <Handle type="source" position={Position.Right} className="flow-handle output orange" />
    </div>
  );
};
