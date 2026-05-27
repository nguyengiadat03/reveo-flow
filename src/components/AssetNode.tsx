import React, { useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Boxes, Upload } from 'lucide-react';
import { mediaToDataUrl, selectMedia } from '../services/mediaClient';
import { NodeDeleteButton } from './NodeDeleteButton';

export const AssetNode = ({ id, data }: any) => {
  const { setNodes } = useReactFlow();
  const [preview, setPreview] = useState(data.base64 || '');

  const updateData = useCallback(
    (patch: Record<string, unknown>) => {
      setNodes((nodes) => nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...patch } } : node)));
    },
    [id, setNodes],
  );

  const selectAsset = async () => {
    const media = await selectMedia('image');
    if (!media) return;
    const dataUrl = mediaToDataUrl(media);
    setPreview(dataUrl);
    updateData({ mediaId: media.mediaId, base64: dataUrl, type: 'product', name: media.name });
  };

  return (
    <div className="flow-node node-asset compact">
      <div className="node-title">
        <div className="node-title-main">
          <Boxes size={18} />
          <span>Sản Phẩm</span>
        </div>
        <NodeDeleteButton id={id} />
      </div>
      <div className="node-body">
        <button className="media-preview square upload-preview nodrag" onClick={selectAsset} type="button">
          {preview ? <img src={preview} alt={data.name || 'Sản phẩm'} /> : <Boxes size={38} className="muted-icon" />}
          <span className="upload-overlay">
            <Upload size={20} />
            Chọn ảnh
          </span>
        </button>
      </div>
      <Handle type="source" position={Position.Right} className="flow-handle output yellow" />
    </div>
  );
};
