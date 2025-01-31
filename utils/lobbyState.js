// server/lobbyState.js ✅ Shared between WebSocket & API

const captainsInLobby = new Set();

function addCaptainToLobby(captainId) {
  captainsInLobby.add(captainId);
  console.log("✅ Added Captain:", captainId);
  console.log("🛠 Current Captains:", Array.from(captainsInLobby));
}

function removeCaptainFromLobby(captainId) {
  captainsInLobby.delete(captainId);
  console.log("❌ Removed Captain:", captainId);
}

function getCaptainsInLobby() {
  console.log("🔍 Fetching Captains:", Array.from(captainsInLobby));
  return captainsInLobby;
}

module.exports = {
  addCaptainToLobby,
  removeCaptainFromLobby,
  getCaptainsInLobby,
};
