const localFfmpegProvider = require('./localFfmpegProvider');
const geminiProvider = require('./geminiProvider');
const googleFlowProvider = require('./googleFlowProvider');
const klingProvider = require('./klingProvider');
const runwayProvider = require('./runwayProvider');
const pikaProvider = require('./pikaProvider');
const customProvider = require('./customProvider');

const providers = {
  [localFfmpegProvider.id]: localFfmpegProvider,
  [geminiProvider.id]: geminiProvider,
  [googleFlowProvider.id]: googleFlowProvider,
  [klingProvider.id]: klingProvider,
  [runwayProvider.id]: runwayProvider,
  [pikaProvider.id]: pikaProvider,
  [customProvider.id]: customProvider
};

function getProvider(providerId) {
  return providers[providerId] || null;
}

module.exports = { getProvider };
