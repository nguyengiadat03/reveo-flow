import type { WorkflowFile } from '../types';

function cloudApi() {
  if (!window.desktopAPI?.cloud) {
    throw new Error('Cloud workflow chỉ khả dụng trong ứng dụng desktop.');
  }
  return window.desktopAPI.cloud;
}

export async function listCloudWorkflows() {
  return cloudApi().listWorkflows();
}

export async function saveWorkflowToCloud(name: string, workflow: WorkflowFile) {
  return cloudApi().saveWorkflow({
    name,
    workflow,
    graphJson: workflow,
    version: workflow.version,
  });
}

export async function openWorkflowFromCloud(workflowId: string): Promise<WorkflowFile> {
  const record = await cloudApi().getWorkflow(workflowId);
  if (!record?.graph_json) throw new Error('Workflow cloud không hợp lệ.');
  return record.graph_json as WorkflowFile;
}
