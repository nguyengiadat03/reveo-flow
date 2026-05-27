import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addEdge,
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import { FolderOpen, KeyRound, PlayCircle, RotateCcw, Save } from 'lucide-react';
import { INITIAL_EDGES, INITIAL_NODES } from './constants';
import { openWorkflowFile, saveWorkflowFile } from './services/fileClient';
import type { NodeType, WorkflowFile } from './types';
import { listProviders } from './services/apiSettingsClient';
import { getDefaultProvider } from './services/providerRegistry';
import type { VideoProviderDefinition } from './services/providerTypes';
import { renderSceneWithProvider } from './services/videoProviderClient';
import { AssetNode } from './components/AssetNode';
import { BackgroundNode } from './components/BackgroundNode';
import { CharacterNode } from './components/CharacterNode';
import { ExportNode } from './components/ExportNode';
import { OutfitNode } from './components/OutfitNode';
import { SceneNode } from './components/SceneNode';
import { ScriptNode } from './components/ScriptNode';
import { VoiceNode } from './components/VoiceNode';
import { WorkflowSidebar } from './components/WorkflowSidebar';
import { ApiSettingsModal } from './components/settings/ApiSettingsModal';

const workflowVersion = '1.0.0';

function createNode(type: NodeType, index: number): Node {
  const id = `${type}-${Date.now()}`;
  const position = { x: 320 + (index % 4) * 120, y: 120 + (index % 5) * 90 };

  const dataByType: Record<NodeType, Record<string, unknown>> = {
    character: { name: 'Nhân vật mới', description: '' },
    script: { topic: '', style: 'review', duration: 8, shotCount: 3, aspectRatio: '9:16', shots: [] },
    scene: { sceneIndex: 0, status: 'idle' },
    export: { label: 'Final' },
    asset: { name: 'Sản phẩm', type: 'product' },
    voice: { name: 'Voice Reference' },
    outfit: {},
    background: { label: 'Bối cảnh', description: '' },
  };

  return { id, type, position, data: dataByType[type] };
}

function normalizeWorkflow(workflow: WorkflowFile): WorkflowFile {
  return {
    ...workflow,
    nodes: workflow.nodes || [],
    edges: (workflow.edges || []).map((edge) => ({
      ...edge,
      markerEnd:
        (edge.markerEnd as any)?.type === 'arrowclosed'
          ? { ...(edge.markerEnd as any), type: MarkerType.ArrowClosed }
          : edge.markerEnd,
    })),
  };
}

function FlowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [status, setStatus] = useState('Đã nạp workflow mẫu từ workflow_1779854289551.json');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [providers, setProviders] = useState<VideoProviderDefinition[]>([]);

  const refreshProviders = useCallback(async () => {
    if (!window.desktopAPI) return;
    try {
      const nextProviders = await listProviders();
      setProviders(nextProviders);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Không tải được provider.');
    }
  }, []);

  useEffect(() => {
    void refreshProviders();
  }, [refreshProviders]);

  const openSettings = useCallback(() => setSettingsOpen(true), []);

  const providerStatus = useMemo(() => {
    const defaultProvider = getDefaultProvider(providers);
    if (!defaultProvider) return { label: 'Đang kiểm tra provider', tone: 'muted' };
    if (defaultProvider.id === 'local-ffmpeg') return { label: 'Backend: Local FFmpeg Ready', tone: 'ok' };
    if (defaultProvider.configured) return { label: `Provider: ${defaultProvider.shortName} đã cấu hình`, tone: 'ok' };
    return { label: `Thiếu API Key: ${defaultProvider.shortName}`, tone: 'warning' };
  }, [providers]);

  const nodeTypes = useMemo(
    () => ({
      asset: AssetNode,
      background: BackgroundNode,
      character: CharacterNode,
      export: ExportNode,
      outfit: OutfitNode,
      scene: (props: any) => <SceneNode {...props} onOpenSettings={openSettings} providers={providers} />,
      script: ScriptNode,
      voice: VoiceNode,
    }),
    [openSettings, providers],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge: Edge = {
        ...connection,
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        animated: true,
        style: { stroke: '#60a5fa' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' },
      };
      setEdges((currentEdges) => addEdge(edge, currentEdges));
    },
    [setEdges],
  );

  const addNode = useCallback(
    (type: NodeType) => {
      setNodes((currentNodes) => [...currentNodes, createNode(type, currentNodes.length)]);
    },
    [setNodes],
  );

  const saveWorkflow = async () => {
    const workflow: WorkflowFile = {
      nodes,
      edges,
      version: workflowVersion,
      timestamp: Date.now(),
    };
    const savedPath = await saveWorkflowFile(workflow);
    setStatus(savedPath ? `Đã lưu: ${savedPath}` : 'Đã hủy lưu workflow');
  };

  const openWorkflow = async () => {
    try {
      const workflow = await openWorkflowFile();
      if (!workflow) {
        setStatus('Đã hủy mở workflow');
        return;
      }
      const normalized = normalizeWorkflow(workflow);
      setNodes(normalized.nodes);
      setEdges(normalized.edges);
      setStatus(`Đã mở workflow ${new Date(normalized.timestamp || Date.now()).toLocaleString('vi-VN')}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Không mở được workflow');
    }
  };

  const resetWorkflow = () => {
    setNodes(INITIAL_NODES);
    setEdges(INITIAL_EDGES);
    setStatus('Đã reset workflow');
  };

  const renderAllScenes = async () => {
    const sceneNodes = nodes.filter((node) => node.type === 'scene');
    const scriptNode = nodes.find((node) => node.type === 'script');
    const script = (scriptNode?.data || {}) as any;
    const shots = script.shots || [];
    const defaultProvider = getDefaultProvider(providers);

    if (!defaultProvider) {
      setSettingsOpen(true);
      return;
    }

    setStatus('Đang render tất cả scene...');
    for (const sceneNode of sceneNodes) {
      const sceneIndex = Number((sceneNode.data as any).sceneIndex || 0);
      const shot = shots.length > 0 ? shots[sceneIndex % shots.length] : null;
      const character = nodes.find((node) => node.type === 'character')?.data as any;
      const voice = nodes.find((node) => node.type === 'voice')?.data as any;
      const outfit = nodes.find((node) => node.type === 'outfit')?.data as any;
      const background = nodes.find((node) => node.type === 'background')?.data as any;
      const assets = nodes.filter((node) => node.type === 'asset').map((node) => node.data as Record<string, unknown>);
      const providerId = String((sceneNode.data as any).providerId || defaultProvider.id);
      const modelName = String((sceneNode.data as any).modelName || defaultProvider.config.modelName || defaultProvider.models[0]?.id || '');

      setNodes((current) => current.map((node) => node.id === sceneNode.id ? { ...node, data: { ...node.data, status: 'processing', providerId, modelName } } : node));
      try {
        const result = await renderSceneWithProvider({
          sceneId: sceneNode.id,
          sceneIndex,
          providerId,
          modelName,
          topic: String(script.topic || 'Video workflow'),
          prompt: [
            script.topic,
            shot?.title,
            shot?.description,
            shot?.action,
            character?.name ? `Nhân vật: ${character.name}` : '',
            outfit?.base64 ? 'Có tham chiếu outfit.' : '',
            background?.description ? `Bối cảnh: ${background.description}` : '',
          ].filter(Boolean).join('\n'),
          durationSeconds: Number(script.duration || 8),
          aspectRatio: script.aspectRatio || '9:16',
          shot,
          character,
          voice,
          outfit,
          background,
          assets,
        });
        setNodes((current) => current.map((node) => node.id === sceneNode.id ? { ...node, data: { ...node.data, status: 'done', mediaId: result.mediaId, base64: result.base64, filePath: result.filePath } } : node));
      } catch (error) {
        setNodes((current) => current.map((node) => node.id === sceneNode.id ? { ...node, data: { ...node.data, status: 'error', error: error instanceof Error ? error.message : 'Render thất bại' } } : node));
      }
    }
    setStatus('Đã hoàn tất lệnh render tất cả scene');
  };

  return (
    <div className="app-shell">
      <WorkflowSidebar onAddNode={addNode} onOpenSettings={openSettings} />
      <main className="workspace">
        <div className="topbar">
          <div className="topbar-title">
            <strong>AI Video Workflow Studio</strong>
            <span>Project: Reveo Flow Studio · {status}</span>
          </div>
          <div className="provider-health" data-tone={providerStatus.tone}>
            <span className="health-dot" />
            <span>{providerStatus.label}</span>
          </div>
          <div className="topbar-actions">
            <button className="toolbar-button accent" onClick={openSettings} title="Cấu hình API" type="button">
              <KeyRound size={17} />
              <span>Cấu hình API</span>
            </button>
            <button className="toolbar-button ghost" onClick={renderAllScenes} title="Render tất cả scene theo workflow" type="button">
              <PlayCircle size={17} />
              <span>Render tất cả</span>
            </button>
            <button className="toolbar-button" onClick={openWorkflow} title="Mở workflow" type="button">
              <FolderOpen size={17} />
              <span>Mở</span>
            </button>
            <button className="toolbar-button" onClick={saveWorkflow} title="Lưu workflow" type="button">
              <Save size={17} />
              <span>Lưu</span>
            </button>
            <button className="toolbar-button ghost" onClick={resetWorkflow} title="Reset workflow" type="button">
              <RotateCcw size={17} />
            </button>
          </div>
        </div>

        <div className="flow-stage">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            minZoom={0.2}
            maxZoom={1.4}
          >
            <Background color="#2a2a35" gap={22} />
            <Controls />
            <MiniMap pannable zoomable nodeStrokeWidth={3} />
          </ReactFlow>
        </div>
      </main>
      <ApiSettingsModal
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          void refreshProviders();
        }}
        onProvidersChanged={setProviders}
      />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  );
}
