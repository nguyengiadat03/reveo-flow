function cloudApi() {
  if (!window.desktopAPI?.cloud) {
    throw new Error('Render job cloud chỉ khả dụng trong ứng dụng desktop.');
  }
  return window.desktopAPI.cloud;
}

export async function createRenderJob(input: unknown) {
  return cloudApi().createRenderJob(input);
}
