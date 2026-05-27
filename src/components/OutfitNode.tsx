import React, { useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Shirt, Upload } from 'lucide-react';
import { mediaToDataUrl, selectMedia } from '../services/mediaClient';
import { NodeDeleteButton } from './NodeDeleteButton';

export const OutfitNode = ({ id, data }: any) => {
  const { setNodes } = useReactFlow();
  const [preview, setPreview] = useState(data.base64 || '');

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
    updateData({ mediaId: media.mediaId, base64: dataUrl });
  };

  return (
    <div className="flow-node node-outfit compact">
      <div className="node-title">
        <div className="node-title-main">
          <Shirt size={18} />
          <span>Outfit</span>
        </div>
        <NodeDeleteButton id={id} />
      </div>
      <div className="node-body">
        <button className="media-preview portrait upload-preview nodrag" onClick={selectImage} type="button">
          {preview ? <img src={preview} alt="Outfit" /> : <Shirt size={38} className="muted-icon" />}
          <span className="upload-overlay">
            <Upload size={20} />
            Chọn Outfit
          </span>
        </button>
      </div>
      <Handle type="source" position={Position.Right} className="flow-handle output indigo" />
    </div>
  );
};
