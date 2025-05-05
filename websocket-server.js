const { addCaptainToLobby, removeCaptainFromLobby, getCaptainsInLobby } = require("./utils/lobbyState");
const { PrismaClient } = require("@prisma/client");
const { Server } = require("socket.io");

const prisma = new PrismaClient();
const PORT = 3009;

// const https = require("https");
// const fs = require("fs");
// const options = {
//   key: fs.readFileSync("./blakdusttriviahost_com/blakdusttriviahost_com.key"),
//   cert: fs.readFileSync("./blakdusttriviahost_com/blakdusttriviahost_com.crt"),
// };
// const httpsServer = https.createServer(options);
// const io = new Server(httpsServer, {
//   cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
// });
// httpsServer.listen(PORT, () => {
//   console.log("WebSocket server running on HTTPS port 3009");
// });

const io = new Server(PORT, {
  cors: {
    origin: "*", // Adjust for your deployment
  },
});

// In-memory tracking of team sessions
const teamSessions = new Map(); // socket.id => { gameId, teamId }
global.activeTeamsByGame = new Map(); // 🔥 NEW: Track live teams by gameId

console.log(`WebSocket server running on port ${PORT}`);

io.on('connection', (socket) => {
  console.log('🟢 Connected:', socket.id);

  // Team joins lobby
  socket.on("team:join_lobby", ({ gameId, teamId }) => {
    if (!gameId || !teamId) return;

    console.log(`📥 Team ${teamId} joined lobby for game ${gameId}`);
    socket.join(gameId);
    teamSessions.set(socket.id, { gameId, teamId });

    // 🔥 Add to global live team tracker
    if (!global.activeTeamsByGame.has(gameId)) {
      global.activeTeamsByGame.set(gameId, new Set());
    }
    global.activeTeamsByGame.get(gameId).add(teamId);

    // 🔄 Broadcast updated team list
    io.to(gameId).emit("team:liveTeams", {
      gameId,
      teams: Array.from(global.activeTeamsByGame.get(gameId))
    });
  });

  // Team manually leaves lobby
  socket.on('team:join_lobby', ({ gameId, teamId }) => {
    if (!gameId || !teamId) return;
    console.log(`📥 Team ${teamId} joined lobby for game ${gameId}`);
    socket.join(gameId);
  
    // Track team in Map
    global.activeTeamsByGame = global.activeTeamsByGame || new Map();
    if (!global.activeTeamsByGame.has(gameId)) {
      global.activeTeamsByGame.set(gameId, new Set());
    }
    global.activeTeamsByGame.get(gameId).add(teamId);
  
    // 🔁 Notify all other clients
    io.to(gameId).emit('team:update');
  
    // ✅ Send the updated team list ONLY to the joining client
    const teams = Array.from(global.activeTeamsByGame.get(gameId));
    socket.emit('team:liveTeams', { gameId, teams });
  });
  


  // ✅ New: Respond to client requesting team list
  socket.on("team:getLiveTeams", ({ gameId }) => {
    const teams = Array.from(global.activeTeamsByGame.get(gameId) || []);
    socket.emit("team:liveTeams", { gameId, teams });
  });

  // Handle disconnects
  socket.on("disconnect", () => {
    const session = teamSessions.get(socket.id);
    if (session) {
      const { gameId, teamId } = session;
      console.log(`❌ Disconnected: Team ${teamId} from game ${gameId}`);
      teamSessions.delete(socket.id);

      if (global.activeTeamsByGame.has(gameId)) {
        global.activeTeamsByGame.get(gameId).delete(teamId);
      }

      io.to(gameId).emit("team:liveTeams", {
        gameId,
        teams: Array.from(global.activeTeamsByGame.get(gameId) || [])
      });
    }
  });

  socket.on('host:gameStarted', ({ gameId }) => {
    console.log(`🚀 Host started game ${gameId}`);
    io.to(gameId).emit('game_started');
  });

  // ✅ Respond to host requesting the list of live teams
socket.on("host:requestLiveTeams", ({ gameId }) => {
  console.log('HOST has asked for LIVE teams');
  const teams = Array.from(global.activeTeamsByGame.get(gameId) || []);
  console.log('TEAMS: ' + JSON.stringify(teams));
  socket.emit("host:liveTeams", { gameId, teams });
});


  socket.on('team:submitAnswer', ({ teamId, questionId, answer, pointsUsed }) => {
    console.log(`✅ Answer from team ${teamId}`);
    io.emit('host:answerSubmission', { teamId, questionId, answer, pointsUsed });
  });

  socket.on('team:submitSubAnswers', ({ gameId, teamId, subAnswers }) => {
    console.log(`📚 Sub-answers from team ${teamId} for game ${gameId}`);
    io.emit('host:subAnswersSubmitted', { gameId, teamId, subAnswers });
  });

  socket.on('host:resetSubmissions', ({ gameId }) => {
    console.log(`🔁 Resetting submissions for game ${gameId}`);
    io.to(gameId).emit('game:resetSubmissions', { gameId });
  });

  socket.on('host:transition', ({ gameId, transitionMessage, transitionMedia, adEmbedCode }) => {
    console.log(`🎬 Transition for game ${gameId}`);
    io.to(gameId).emit('game:transition', { gameId, transitionMessage, transitionMedia, adEmbedCode });
  });

  socket.on('host:toggleScores', ({ gameId, scoresVisibleToPlayers }) => {
    console.log(`🔒 Toggling scores for game ${gameId}`);
    io.to(gameId).emit('game:scoresVisibilityChanged', { gameId, scoresVisibleToPlayers });
  });

  socket.on('host:gameCompleted', ({ gameId }) => {
    console.log(`🏁 Game ${gameId} completed`);
    io.to(gameId).emit('game:gameCompleted', { gameId });
  });
});
