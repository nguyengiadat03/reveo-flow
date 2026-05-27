import type { WorkflowFile } from '../types';

export async function saveWorkflowFile(workflow: WorkflowFile): Promise<string | null> {
  const data = JSON.stringify(workflow, null, 2);
  const defaultName = `workflow_${Date.now()}.json`;

  if (window.desktopAPI) {
    const result = await window.desktopAPI.saveWorkflow(data, defaultName);
    return result.canceled ? null : result.filePath || null;
  }

  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return defaultName;
}

export async function openWorkflowFile(): Promise<WorkflowFile | null> {
  if (window.desktopAPI) {
    const result = await window.desktopAPI.openWorkflow();
    if (result.canceled || !result.content) return null;
    return JSON.parse(result.content) as WorkflowFile;
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(JSON.parse(String(reader.result || '')) as WorkflowFile);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    };
    input.click();
  });
}
