async function testConnection() {
  return {
    ok: false,
    message: 'Google Flow chưa có API chính thức để dùng credits qua app này. Hãy dùng Gemini/Veo API hoặc local renderer.'
  };
}

async function renderVideo() {
  throw new Error('Google Flow chưa có API chính thức để dùng credits qua app này. Hãy dùng Gemini/Veo API hoặc local renderer.');
}

module.exports = {
  id: 'google-flow',
  testConnection,
  renderVideo,
  getJobStatus: async () => ({ status: 'not-supported' }),
  downloadResult: async () => null
};
