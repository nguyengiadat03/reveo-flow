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
import { Activity, Cloud, FolderOpen, KeyRound, LogOut, PlayCircle, RotateCcw, Save } from 'lucide-react';
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
import { CloudWorkflowModal } from './components/cloud/CloudWorkflowModal';
import { OnboardingShell } from './components/onboarding/OnboardingShell';
import { ApiSettingsModal } from './components/settings/ApiSettingsModal';
import { SystemHealthModal } from './components/system/SystemHealthModal';
import { UpdateModal } from './components/update/UpdateModal';
import { UpdateStatusButton } from './components/update/UpdateStatusButton';
import {
  checkForUpdates,
  downloadUpdate,
  getUpdateStatus,
  installUpdate,
  onUpdateStatus,
} from './services/updateClient';
import { getDiagnosticLog, runHealthCheck } from './services/systemClient';
import { getRendererDiagnosticLog, log } from './services/logger';
import { getAuthStatus, logout, onAuthStatusChanged } from './services/authClient';
import { getSupabasePublicConfig } from './services/supabaseClient';
import { listCloudWorkflows, openWorkflowFromCloud, saveWorkflowToCloud } from './services/workflowCloudClient';
import type { AuthStatus } from './types/auth';
import type { HealthCheckReport } from './types/health';
import type { UpdateStatus } from './types/update';

const workflowVersion = '1.0.0';
const initialUpdateStatus: UpdateStatus = {
  status: 'idle',
  currentVersion: '1.0.0',
  message: 'Sẵn sàng kiểm tra cập nhật.',
  canDownload: false,
  canInstall: false,
};

const initialAuthStatus: AuthStatus = {
  status: 'unauthenticated',
  message: 'Chưa đăng nhập.',
  profile: null,
  capabilities: [],
};

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
  const [status, setStatus] = useState('Workflow mẫu đã sẵn sàng');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(() => window.localStorage.getItem('video-flow:onboarding-complete') !== null);
  const [providers, setProviders] = useState<VideoProviderDefinition[]>([]);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(initialUpdateStatus);
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthReport, setHealthReport] = useState<HealthCheckReport | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(initialAuthStatus);
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudWorkflows, setCloudWorkflows] = useState<any[]>([]);

  const workflowSummary = useMemo(() => ({
    nodes: nodes.map((node) => ({ id: node.id, type: String(node.type || '') })),
    edges: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
  }), [nodes, edges]);

  const refreshProviders = useCallback(async () => {
    if (!window.desktopAPI) return;
    try {
      const nextProviders = await listProviders();
      setProviders(nextProviders);
    } catch (error) {
      log('error', 'provider', error);
      setStatus(error instanceof Error ? error.message : 'Không tải được provider.');
    }
  }, []);

  useEffect(() => {
    void refreshProviders();
  }, [refreshProviders]);

  useEffect(() => {
    if (!window.desktopAPI?.auth) return;
    void getAuthStatus().then(setAuthStatus).catch((error) => log('warn', 'auth', error));
    return onAuthStatusChanged(setAuthStatus);
  }, []);

  useEffect(() => {
    if (!window.desktopAPI?.update) return;
    void getUpdateStatus().then(setUpdateStatus).catch((error) => {
      log('error', 'update', error);
      setUpdateStatus({
        ...initialUpdateStatus,
        status: 'error',
        message: 'Không tải được trạng thái cập nhật.',
      });
    });

    return onUpdateStatus((nextStatus) => {
      setUpdateStatus(nextStatus);
      if (['available', 'downloaded', 'error', 'blocked', 'unsupported-portable'].includes(nextStatus.status)) {
        setUpdateModalOpen(true);
      }
    });
  }, []);

  const openSettings = useCallback(() => setSettingsOpen(true), []);

  const providerStatus = useMemo(() => {
    const defaultProvider = getDefaultProvider(providers);
    if (!defaultProvider) return { label: 'Đang kiểm tra provider', tone: 'muted' };
    if (defaultProvider.id === 'local-ffmpeg') return { label: 'Local mock sẵn sàng', tone: 'ok' };
    if (defaultProvider.configured) return { label: `${defaultProvider.shortName} sẵn sàng`, tone: 'ok' };
    return { label: `Thiếu API key: ${defaultProvider.shortName}`, tone: 'warning' };
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
      log('error', 'workflow', error);
      setStatus(error instanceof Error ? error.message : 'Không mở được workflow');
    }
  };

  const resetWorkflow = () => {
    setNodes(INITIAL_NODES);
    setEdges(INITIAL_EDGES);
    setStatus('Đã reset workflow');
  };

  const refreshCloudWorkflows = async () => {
    if (authStatus.status !== 'authenticated') {
      setStatus('Bạn cần đăng nhập Google để dùng Workflow Cloud');
      return;
    }
    setCloudLoading(true);
    try {
      setCloudWorkflows(await listCloudWorkflows());
    } catch (error) {
      log('error', 'workflow', error);
      setStatus(error instanceof Error ? error.message : 'Không tải được workflow cloud');
    } finally {
      setCloudLoading(false);
    }
  };

  const saveCloudWorkflow = async (name: string) => {
    setCloudLoading(true);
    try {
      const workflow: WorkflowFile = { nodes, edges, version: workflowVersion, timestamp: Date.now() };
      await saveWorkflowToCloud(name, workflow);
      setStatus('Đã lưu workflow lên Supabase');
      await refreshCloudWorkflows();
    } catch (error) {
      log('error', 'workflow', error);
      setStatus(error instanceof Error ? error.message : 'Không lưu được workflow cloud');
    } finally {
      setCloudLoading(false);
    }
  };

  const openCloudWorkflow = async (workflowId: string) => {
    setCloudLoading(true);
    try {
      const workflow = normalizeWorkflow(await openWorkflowFromCloud(workflowId));
      setNodes(workflow.nodes);
      setEdges(workflow.edges);
      setStatus('Đã mở workflow từ Supabase');
      setCloudModalOpen(false);
    } catch (error) {
      log('error', 'workflow', error);
      setStatus(error instanceof Error ? error.message : 'Không mở được workflow cloud');
    } finally {
      setCloudLoading(false);
    }
  };

  const runLogout = async () => {
    try {
      setAuthStatus(await logout());
      window.localStorage.removeItem('video-flow:onboarding-complete');
      setStatus('Đã đăng xuất. Workflow local vẫn được giữ.');
    } catch (error) {
      log('error', 'auth', error);
      setStatus(error instanceof Error ? error.message : 'Đăng xuất thất bại');
    }
  };

  const runUpdateCheck = async () => {
    setUpdateModalOpen(true);
    try {
      setUpdateStatus(await checkForUpdates());
    } catch (error) {
      log('error', 'update', error);
      setUpdateStatus({
        ...updateStatus,
        status: 'error',
        message: 'Không thể kiểm tra cập nhật.',
        errorMessage: error instanceof Error ? error.message : 'Lỗi không xác định.',
      });
    }
  };

  const runUpdateDownload = async () => {
    try {
      setUpdateStatus(await downloadUpdate());
    } catch (error) {
      log('error', 'update', error);
      setUpdateStatus({
        ...updateStatus,
        status: 'error',
        message: 'Không thể tải bản cập nhật.',
        errorMessage: error instanceof Error ? error.message : 'Lỗi không xác định.',
      });
    }
  };

  const runUpdateInstall = async () => {
    try {
      setUpdateStatus(await installUpdate());
    } catch (error) {
      log('error', 'update', error);
      setUpdateStatus({
        ...updateStatus,
        status: 'error',
        message: 'Không thể cài bản cập nhật.',
        errorMessage: error instanceof Error ? error.message : 'Lỗi không xác định.',
      });
    }
  };

  const runSystemHealthCheck = async () => {
    setHealthModalOpen(true);
    setHealthLoading(true);
    try {
      setHealthReport(await runHealthCheck({
        workflow: workflowSummary,
        supabaseConfig: {
          ...getSupabasePublicConfig(),
          protocol: import.meta.env.VITE_APP_DEEP_LINK_PROTOCOL || 'flowgraph',
        },
      }));
    } catch (error) {
      log('error', 'health', error);
      setHealthReport({
        generatedAt: new Date().toISOString(),
        durationMs: 0,
        checks: [{
          id: 'health-runner',
          group: 'System Health Check',
          label: 'Chạy kiểm tra hệ thống',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Không thể chạy kiểm tra hệ thống.',
          suggestedFix: 'Khởi động lại app hoặc kiểm tra Electron IPC.',
        }],
      });
    } finally {
      setHealthLoading(false);
    }
  };

  const copyDiagnosticLog = async () => {
    const mainLog = window.desktopAPI?.system ? await getDiagnosticLog({ updateStatus, healthReport }) : '';
    const content = [
      `Video Flow ${updateStatus.currentVersion || 'unknown'}`,
      `Update: ${updateStatus.status} (${updateStatus.channel || 'unknown'})`,
      mainLog,
      'Renderer logs:',
      getRendererDiagnosticLog(),
    ].filter(Boolean).join('\n\n');
    await navigator.clipboard?.writeText(content);
    setStatus('Đã copy diagnostic log');
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

    setStatus('Đang render tất cả cảnh...');
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
        log('error', 'render', error);
        setNodes((current) => current.map((node) => node.id === sceneNode.id ? { ...node, data: { ...node.data, status: 'error', error: error instanceof Error ? error.message : 'Render thất bại' } } : node));
      }
    }
    setStatus('Đã hoàn tất render tất cả cảnh');
  };

  if (!onboardingComplete) {
    return (
      <OnboardingShell
        onComplete={() => setOnboardingComplete(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
    );
  }

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
            {authStatus.status === 'authenticated' && (
              <div className="user-chip" title={authStatus.profile?.email || ''}>
                {authStatus.profile?.picture ? <img src={authStatus.profile.picture} alt="" /> : <span>{authStatus.profile?.name?.slice(0, 1) || 'U'}</span>}
                <strong>{authStatus.profile?.name || authStatus.profile?.email}</strong>
              </div>
            )}
            <button className="toolbar-button accent" onClick={openSettings} title="Cấu hình nhà cung cấp" type="button">
              <KeyRound size={17} />
              <span>Provider</span>
            </button>
            <UpdateStatusButton status={updateStatus} onClick={runUpdateCheck} />
            <button className="toolbar-button" onClick={runSystemHealthCheck} title="Kiểm tra hệ thống" type="button">
              <Activity size={17} />
              <span>Health Check</span>
            </button>
            <button className="toolbar-button" onClick={() => setCloudModalOpen(true)} title="Workflow Cloud" type="button">
              <Cloud size={17} />
              <span>Cloud</span>
            </button>
            <button className="toolbar-button primary-command" onClick={renderAllScenes} title="Render tất cả cảnh" type="button">
              <PlayCircle size={17} />
              <span>Render tất cả cảnh</span>
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
            {authStatus.status === 'authenticated' && (
              <button className="toolbar-button ghost" onClick={runLogout} title="Đăng xuất" type="button">
                <LogOut size={17} />
              </button>
            )}
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
      <UpdateModal
        open={updateModalOpen}
        status={updateStatus}
        onClose={() => setUpdateModalOpen(false)}
        onCheck={runUpdateCheck}
        onDownload={runUpdateDownload}
        onInstall={runUpdateInstall}
        onCopyDiagnostics={copyDiagnosticLog}
      />
      <SystemHealthModal
        open={healthModalOpen}
        loading={healthLoading}
        report={healthReport}
        onClose={() => setHealthModalOpen(false)}
        onRun={runSystemHealthCheck}
        onCopyDiagnostics={copyDiagnosticLog}
      />
      <CloudWorkflowModal
        open={cloudModalOpen}
        loading={cloudLoading}
        workflows={cloudWorkflows}
        onClose={() => setCloudModalOpen(false)}
        onRefresh={refreshCloudWorkflows}
        onSave={saveCloudWorkflow}
        onOpenWorkflow={openCloudWorkflow}
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
