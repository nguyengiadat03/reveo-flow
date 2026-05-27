import React, { useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Image, Upload } from 'lucide-react';
import { mediaToDataUrl, selectMedia } from '../services/mediaClient';
import { NodeDeleteButton } from './NodeDeleteButton';

export const BackgroundNode = ({ id, data }: any) => {
  const { setNodes } = useReactFlow();
  const [preview, setPreview] = useState(data.base64 || '');
  const [description, setDescription] = useState(data.description || '');

  const updateData = useCallback(
    (patch: Record<string, unknown>) => {
      setNodes((nodes) => nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...patch } } : node)));
    },
    [id, setNodes],
  );

  const selectImage = async () => {
    const media = await selectMedia('image');
    if (!media) return;
    const dataUrl = mediaToDataUrl(media);
    setPreview(dataUrl);
    updateData({ mediaId: media.mediaId, base64: dataUrl, description });
  };

  return (
    <div className="flow-node node-background medium">
      <div className="node-title">
        <div className="node-title-main">
          <Image size={18} />
          <span>Bối Cảnh</span>
        </div>
        <NodeDeleteButton id={id} />
      </div>

      <div className="node-body">
        <button className="media-preview wide upload-preview nodrag" onClick={selectImage} type="button">
          {preview ? <img src={preview} alt="Bối cảnh" /> : <Image size={38} className="muted-icon" />}
          <span className="upload-overlay">
            <Upload size={20} />
            Chọn Bối Cảnh
          </span>
        </button>

        <textarea
          className="field textarea nodrag"
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            updateData({ description: event.target.value });
          }}
          placeholder="Mô tả bối cảnh..."
        />
      </div>

      <Handle type="source" position={Position.Right} className="flow-handle output cyan" />
    </div>
  );
};
