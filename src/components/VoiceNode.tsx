import React, { useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Mic2, Upload } from 'lucide-react';
import { mediaToDataUrl, selectMedia } from '../services/mediaClient';
import { NodeDeleteButton } from './NodeDeleteButton';

export const VoiceNode = ({ id, data }: any) => {
  const { setNodes } = useReactFlow();
  const [preview, setPreview] = useState(data.base64 || '');
  const [name, setName] = useState(data.name || 'Voice Reference');

  const updateData = useCallback(
    (patch: Record<string, unknown>) => {
      setNodes((nodes) => nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...patch } } : node)));
    },
    [id, setNodes],
  );

  const selectAudio = async () => {
    const media = await selectMedia('audio');
    if (!media) return;
    const dataUrl = mediaToDataUrl(media);
    setPreview(dataUrl);
    setName(media.name);
    updateData({ mediaId: media.mediaId, base64: dataUrl, name: media.name });
  };

  return (
    <div className="flow-node node-voice medium">
      <div className="node-title">
        <div className="node-title-main">
          <Mic2 size={18} />
          <span>Giọng Nói</span>
        </div>
        <NodeDeleteButton id={id} />
      </div>
      <div className="node-body">
        <div className="audio-box">
          <span>{preview ? name : 'Audio File'}</span>
          {preview && <audio src={preview} controls className="nodrag" />}
        </div>
        <button className="secondary-button nodrag" onClick={selectAudio} type="button">
          <Upload size={16} />
          {preview ? 'Đổi giọng' : 'Thêm Audio'}
        </button>
      </div>
      <Handle type="source" position={Position.Right} className="flow-handle output pink" />
    </div>
  );
};
