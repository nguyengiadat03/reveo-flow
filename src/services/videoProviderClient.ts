import type { RenderSceneResult, WorkflowRenderRequest } from './providerTypes';

export async function renderSceneWithProvider(request: WorkflowRenderRequest): Promise<RenderSceneResult> {
  if (!window.desktopAPI) {
    throw new Error('Render video chỉ khả dụng trong ứng dụng desktop Electron.');
  }

  return window.desktopAPI.renderSceneVideo(request);
}
