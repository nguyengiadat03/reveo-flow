import React from 'react';
import {
  BadgeCheck,
  Boxes,
  Clapperboard,
  FileText,
  Image,
  KeyRound,
  type LucideIcon,
  Mic2,
  Shirt,
  UserRound,
  Video,
} from 'lucide-react';
import type { NodeType } from '../types';

interface SidebarProps {
  onAddNode: (type: NodeType) => void;
  onOpenSettings: () => void;
}

const NODE_TYPES: Array<{
  type: NodeType;
  label: string;
  icon: LucideIcon;
  tone: string;
}> = [
  { type: 'script', label: 'Kịch Bản', icon: FileText, tone: 'blue' },
  { type: 'character', label: 'Nhân Vật', icon: UserRound, tone: 'orange' },
  { type: 'voice', label: 'Giọng Nói', icon: Mic2, tone: 'pink' },
  { type: 'outfit', label: 'Outfit', icon: Shirt, tone: 'indigo' },
  { type: 'background', label: 'Bối Cảnh', icon: Image, tone: 'cyan' },
  { type: 'asset', label: 'Sản Phẩm', icon: Boxes, tone: 'yellow' },
  { type: 'scene', label: 'Cảnh Quay', icon: Video, tone: 'green' },
  { type: 'export', label: 'Xuất Bản', icon: BadgeCheck, tone: 'white' },
];

export const WorkflowSidebar: React.FC<SidebarProps> = ({ onAddNode, onOpenSettings }) => {
  return (
    <aside className="sidebar">
      <div className="brand">
        <Clapperboard size={22} />
        <div>
          <strong>FlowGraph</strong>
          <span>Video Workflow</span>
        </div>
      </div>

      <div className="sidebar-section">
        <span className="sidebar-label">Input</span>
        {NODE_TYPES.filter((node) => ['character', 'voice', 'outfit', 'background', 'asset'].includes(node.type)).map((node) => {
          const Icon = node.icon;
          return (
            <button
              key={node.type}
              className="sidebar-button"
              data-tone={node.tone}
              onClick={() => onAddNode(node.type)}
              title={node.label}
              type="button"
            >
              <Icon size={19} />
              <span>{node.label}</span>
            </button>
          );
        })}

        <span className="sidebar-label">AI Generate</span>
        {NODE_TYPES.filter((node) => ['script', 'scene'].includes(node.type)).map((node) => {
          const Icon = node.icon;
          return (
            <button
              key={node.type}
              className="sidebar-button"
              data-tone={node.tone}
              onClick={() => onAddNode(node.type)}
              title={node.label}
              type="button"
            >
              <Icon size={19} />
              <span>{node.label}</span>
            </button>
          );
        })}

        <span className="sidebar-label">Output</span>
        {NODE_TYPES.filter((node) => node.type === 'export').map((node) => {
          const Icon = node.icon;
          return (
            <button
              key={node.type}
              className="sidebar-button"
              data-tone={node.tone}
              onClick={() => onAddNode(node.type)}
              title={node.label}
              type="button"
            >
              <Icon size={19} />
              <span>{node.label}</span>
            </button>
          );
        })}

        <span className="sidebar-label">Settings</span>
        <button className="sidebar-button" data-tone="cyan" onClick={onOpenSettings} title="Cấu hình API" type="button">
          <KeyRound size={19} />
          <span>Cấu hình API</span>
        </button>
      </div>
    </aside>
  );
};
