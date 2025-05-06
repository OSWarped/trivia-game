import { Server } from "socket.io";
import { setIo } from './lib/socket.js';

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
console.log('***setting variables***');
const teamSessions = new Map<string, { gameId: string; teamId: string; teamName: string }>();
const activeTeamsByGame = new Map<string, Map<string, { id: string; name: string }>>();
console.log('***variables set***');


try {
  const io = new Server(PORT, {
    cors: {
      origin: "*",
    },
  });

  setIo(io);
  console.log(`WebSocket server running on port ${PORT}`);

  io.on('connection', (socket) => {
    console.log('🟢 Connected:', socket.id);

    socket.on("team:join_lobby", ({ gameId, teamId, teamName }) => {
      if (!gameId || !teamId || !teamName) return;

      socket.join(gameId);
      teamSessions.set(socket.id, { gameId, teamId, teamName });

      console.log(`📥 Team ${teamName} (${teamId}) joined lobby for game ${gameId}`);

      if (!activeTeamsByGame.has(gameId)) {
        activeTeamsByGame.set(gameId, new Map());
      }

      const gameTeams = activeTeamsByGame.get(gameId)!;
      gameTeams.set(teamId, { id: teamId, name: teamName });

      const teams = Array.from(gameTeams.values());
      io.to(gameId).emit("team:liveTeams", { gameId, teams });
      io.to(gameId).emit("host:liveTeams", { gameId, teams });
    });

    socket.on("team:leave_lobby", ({ gameId, teamId }) => {
      const gameTeams = activeTeamsByGame.get(gameId);
      if (gameTeams) {
        gameTeams.delete(teamId);
        const teams = Array.from(gameTeams.values());
        io.to(gameId).emit("team:liveTeams", { gameId, teams });
        io.to(gameId).emit("host:liveTeams", { gameId, teams });
      }
    });

    socket.on("team:getLiveTeams", ({ gameId }) => {
      const teams = Array.from(activeTeamsByGame.get(gameId)?.values() || []);
      socket.emit("team:liveTeams", { gameId, teams });
      io.to(gameId).emit("host:liveTeams", { gameId, teams });
    });

    socket.on("disconnect", () => {
      const session = teamSessions.get(socket.id);
      if (!session) return;

      const { gameId, teamId, teamName } = session;
      console.log(`❌ Disconnected: ${teamName} (${teamId}) from game ${gameId}`);
      teamSessions.delete(socket.id);

      const gameTeams = activeTeamsByGame.get(gameId);
      if (gameTeams) {
        gameTeams.delete(teamId);
        const teams = Array.from(gameTeams.values());
        io.to(gameId).emit("team:liveTeams", { gameId, teams });
        io.to(gameId).emit("host:liveTeams", { gameId, teams });
      }
    });

    socket.on("host:gameStarted", ({ gameId }) => {
      io.to(gameId).emit("game_started");
    });

    socket.on("host:requestLiveTeams", ({ gameId }) => {
      const teams = Array.from(activeTeamsByGame.get(gameId)?.values() || []);
      socket.emit("host:liveTeams", { gameId, teams });
    });

    socket.on("host:join", ({ gameId }) => {
      socket.join(gameId);
    });

    socket.on("team:submitAnswer", ({ teamId, questionId, answer, pointsUsed }) => {
      console.log('TEAM: ' + teamId + ' has submitted an answer');
      io.emit("host:answerSubmission", { teamId, questionId, answer, pointsUsed });
    });
    
    socket.on("host:resetSubmissions", ({ gameId }) => {
      io.to(gameId).emit("game:resetSubmissions", { gameId });
    });

    socket.on("host:transition", ({ gameId, transitionMessage, transitionMedia, adEmbedCode }) => {
      io.to(gameId).emit("game:transition", { gameId, transitionMessage, transitionMedia, adEmbedCode });
    });

    socket.on("host:toggleScores", ({ gameId, scoresVisibleToPlayers }) => {
      io.to(gameId).emit("game:scoresVisibilityChanged", { gameId, scoresVisibleToPlayers });
    });

    socket.on("host:gameCompleted", ({ gameId }) => {
      io.to(gameId).emit("game:gameCompleted", { gameId });
    });
  });
} catch (err) {
  console.error("❌ Failed to start WebSocket server:", err);
}