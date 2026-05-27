function createUnimplementedProvider(providerId, name) {
  return {
    id: providerId,
    async testConnection(apiKey, config = {}) {
      if (!apiKey) {
        return { ok: false, message: 'Chưa có khóa API.' };
      }

      if (providerId === 'custom') {
        if (!config.baseUrl) {
          return { ok: false, message: 'Custom Provider cần Base URL.' };
        }

        try {
          const response = await fetch(config.baseUrl, {
            method: 'HEAD',
            headers: { Authorization: `Bearer ${apiKey}` }
          });
          return {
            ok: response.ok,
            message: response.ok
              ? 'Custom endpoint phản hồi thành công.'
              : `Custom endpoint phản hồi HTTP ${response.status}.`
          };
        } catch (error) {
          return { ok: false, message: error instanceof Error ? error.message : 'Không kết nối được Custom endpoint.' };
        }
      }

      return {
        ok: false,
        message: `${name} đã lưu khóa API, nhưng app chưa có adapter API chính thức. Không bịa endpoint để tránh render sai.`
      };
    },
    async renderVideo() {
      throw new Error(`${name} chưa được nối adapter API chính thức. Hãy dùng Local FFmpeg hoặc bổ sung endpoint/SDK thật cho provider này.`);
    },
    async getJobStatus() {
      return { status: 'unsupported' };
    },
    async downloadResult() {
      return null;
    }
  };
}

module.exports = { createUnimplementedProvider };
