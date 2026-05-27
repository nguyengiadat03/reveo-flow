import { Edge, MarkerType, Node } from '@xyflow/react';

export const IMAGE_MODEL = 'Nano Banana Pro';
export const VIDEO_MODEL = 'Local FFmpeg';

export const INITIAL_NODES: Node[] = [
  {
    id: 'script-1',
    type: 'script',
    position: { x: 400, y: 150 },
    data: {
      topic: 'Review tai nghe chống ồn mới nhất',
      style: 'review',
      duration: 8,
      shotCount: 3,
      aspectRatio: '9:16',
      shots: [],
    },
  },
  {
    id: 'char-1',
    type: 'character',
    position: { x: 37.75684931506851, y: -120.17979452054794 },
    data: {
      name: 'Linh',
      description: 'Nữ, 22 tuổi, trẻ trung năng động',
    },
  },
  {
    id: 'voice-1',
    type: 'voice',
    position: { x: 50, y: 350 },
    data: { name: 'Giọng Nữ Trẻ' },
  },
  {
    id: 'outfit-1',
    type: 'outfit',
    position: { x: 50, y: 550 },
    data: {},
  },
  {
    id: 'scene-1',
    type: 'scene',
    position: { x: 800, y: 200 },
    data: {
      sceneIndex: 0,
      status: 'idle',
    },
  },
  {
    id: 'export-1',
    type: 'export',
    position: { x: 1200, y: 200 },
    data: { label: 'Final' },
  },
];

export const INITIAL_EDGES: Edge[] = [
  {
    id: 'e-c-s',
    source: 'char-1',
    target: 'script-1',
    targetHandle: 'context',
    animated: true,
    style: { stroke: '#f97316' },
  },
  {
    id: 'e-v-s',
    source: 'voice-1',
    target: 'script-1',
    targetHandle: 'context',
    animated: true,
    style: { stroke: '#ec4899' },
  },
  {
    id: 'e-o-s',
    source: 'outfit-1',
    target: 'script-1',
    targetHandle: 'context',
    animated: true,
    style: { stroke: '#6366f1' },
  },
  {
    id: 'e-s-sc',
    source: 'script-1',
    target: 'scene-1',
    animated: true,
    style: { stroke: '#3b82f6' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
  },
  {
    id: 'e-sc-ex',
    source: 'scene-1',
    target: 'export-1',
    animated: true,
    style: { stroke: '#10b981' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },
];
