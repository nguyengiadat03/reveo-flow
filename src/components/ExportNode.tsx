import React, { useMemo, useState } from 'react';
import { Handle, Position, useHandleConnections, useReactFlow } from '@xyflow/react';
import { BadgeCheck, Download } from 'lucide-react';
import { saveBase64File } from '../services/mediaClient';
import { NodeDeleteButton } from './NodeDeleteButton';

export const ExportNode = ({ id }: any) => {
  const { getNodes } = useReactFlow();
  const [exporting, setExporting] = useState(false);
  const connections = useHandleConnections({ type: 'target' });

  const sceneResults = useMemo(() => {
    const nodes = getNodes();
    return connections
      .map((connection) => nodes.find((node) => node.id === connection.source))
      .filter((node) => node?.type === 'scene')
      .map((node) => node?.data as any)
      .filter(Boolean);
  }, [connections, getNodes]);

  const readyScenes = sceneResults.filter((scene) => scene.base64);

  const handleDownloadAll = async () => {
    if (readyScenes.length === 0) return;
    setExporting(true);
    try {
      for (let index = 0; index < readyScenes.length; index += 1) {
        await saveBase64File(readyScenes[index].base64, 'video/mp4', `scene_${index + 1}.mp4`);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flow-node node-export medium">
      <div className="node-title solid">
        <div className="node-title-main">
          <BadgeCheck size={18} />
          <span>Hoàn Tất</span>
        </div>
        <NodeDeleteButton id={id} />
      </div>

      <div className="node-body">
        <div className="pill">{sceneResults.length} CẢNH QUAY</div>
        {readyScenes.length > 0 ? (
          <div className="export-grid">
            {readyScenes.map((scene, index) => (
              <div className="export-thumb" key={`${scene.mediaId || index}`}>
                <video src={scene.base64} muted />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-panel">
            <BadgeCheck size={32} />
            <span>Chờ Render...</span>
          </div>
        )}

        <button className="primary-button nodrag" disabled={readyScenes.length === 0 || exporting} onClick={handleDownloadAll} type="button">
          {exporting ? <span className="spinner small" /> : <Download size={16} />}
          Xuất MP4
        </button>
      </div>

      <Handle type="target" position={Position.Left} className="flow-handle input white" />
    </div>
  );
};
