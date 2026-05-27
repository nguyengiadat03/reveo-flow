import React, { useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { FileText, Sparkles } from 'lucide-react';
import { generateScriptShots } from '../services/aiClient';
import type { ScriptData, ScriptShot } from '../types';
import { NodeDeleteButton } from './NodeDeleteButton';

const styles: ScriptData['style'][] = ['review', 'cinematic', 'drama', 'comedy'];

export const ScriptNode = ({ id, data }: any) => {
  const { setNodes } = useReactFlow();
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState(data.topic || '');
  const [style, setStyle] = useState<ScriptData['style']>(data.style || 'review');
  const [duration, setDuration] = useState(Number(data.duration || 8));
  const [shotCount, setShotCount] = useState(Number(data.shotCount || 3));
  const [aspectRatio, setAspectRatio] = useState<ScriptData['aspectRatio']>(data.aspectRatio || '9:16');
  const [shots, setShots] = useState<ScriptShot[]>(data.shots || []);

  const updateData = useCallback(
    (patch: Record<string, unknown>) => {
      setNodes((nodes) => nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...patch } } : node)));
    },
    [id, setNodes],
  );

  const generateShots = async () => {
    setLoading(true);
    try {
      const nextShots = await generateScriptShots({ topic, style, duration, shotCount });
      setShots(nextShots);
      updateData({ topic, style, duration, shotCount, aspectRatio, shots: nextShots });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flow-node node-script large">
      <Handle type="target" position={Position.Left} id="context" className="flow-handle input blue" />
      <div className="node-title">
        <div className="node-title-main">
          <FileText size={18} />
          <span>Kịch Bản & Phân Cảnh</span>
        </div>
        <NodeDeleteButton id={id} />
      </div>

      <div className="node-body">
        <label className="field-label">
          Chủ đề video
        </label>
        <textarea
          className="field textarea tall nodrag"
          value={topic}
          onChange={(event) => {
            setTopic(event.target.value);
            updateData({ topic: event.target.value });
          }}
          placeholder="Chủ đề video..."
        />

        <div className="form-grid">
          <label className="field-label">
            Phong cách
            <select
              className="field nodrag"
              value={style}
              onChange={(event) => {
                const value = event.target.value as ScriptData['style'];
                setStyle(value);
                updateData({ style: value });
              }}
            >
              {styles.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Số phân cảnh
            <input
              className="field nodrag"
              type="number"
              min={1}
              max={12}
              value={shotCount}
              onChange={(event) => {
                const value = Math.max(1, Number(event.target.value));
                setShotCount(value);
                updateData({ shotCount: value });
              }}
            />
          </label>

          <label className="field-label">
            Tỉ lệ video
            <select
              className="field nodrag"
              value={aspectRatio}
              onChange={(event) => {
                const value = event.target.value as ScriptData['aspectRatio'];
                setAspectRatio(value);
                updateData({ aspectRatio: value });
              }}
            >
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
            </select>
          </label>

          <label className="field-label">
            Thời lượng
            <input
              className="field nodrag"
              type="number"
              min={2}
              max={120}
              value={duration}
              onChange={(event) => {
                const value = Math.max(2, Number(event.target.value));
                setDuration(value);
                updateData({ duration: value });
              }}
            />
          </label>
        </div>

        <button className="primary-button nodrag" disabled={loading} onClick={generateShots} type="button">
          {loading ? <span className="spinner small" /> : <Sparkles size={16} />}
          Tạo phân cảnh AI
        </button>

        <div className="shot-list">
          {shots.length > 0 ? (
            shots.map((shot) => (
              <div className="shot-item" key={shot.id}>
                <strong>{shot.title}</strong>
                <span>{shot.description}</span>
              </div>
            ))
          ) : (
            <div className="empty-state">Chưa có phân cảnh</div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="flow-handle output blue" />
    </div>
  );
};
