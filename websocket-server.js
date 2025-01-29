const PORT = 3009; // Choose a port for your WebSocket server

const https = require("https");
const fs = require("fs");
const { Server } = require("socket.io");

const options = {
  key: fs.readFileSync("./blakdusttriviahost_com/blakdusttriviahost_com.key"), // Path to your SSL key
  cert: fs.readFileSync("./blakdusttriviahost_com/blakdusttriviahost_com.crt"), // Path to your SSL certificate
};

const httpsServer = https.createServer(options);
// Create a new WebSocket server
const io = new Server(httpsServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

httpsServer.listen(3009, () => {
  console.log("WebSocket server running on HTTPS port 3009");
});

console.log(`WebSocket server running on port ${PORT}`);

io.on("connection", (socket) => {
  console.log("A client connected:", socket.id);

  // Listen for the host updating the current question
  socket.on("host:updateQuestion", (data) => {
    console.log("Host updated question:", data);
  
    // Broadcast the new question to all connected clients
    console.log("Host emitted a game:currentQuestion signal: " + data);
    io.emit("game:currentQuestion", data); // Notify all clients

    console.log("Host emitted a state:updated signal: " + data);
    io.emit("state:updated", data); // Notify clients about state change
    console.log("Broadcasted updated question and state:", data);
  });




  //Listen for host starting a game  
  socket.on("host:gameStarted", async (payload) => {
    
    const { gameId, gameName, date, hostSiteId, hostSiteName, hostingSiteLocation, joined, teams } = payload;

    console.log('Received Signal that host started Game: ' + JSON.stringify(payload));

    try {
      io.emit("team:gameStarted", {
        gameId,
        gameName,
        date,
        hostSiteId,
        hostSiteName,
        hostingSiteLocation,
        joined,
        teams,
      });
    }
    catch(error) {
      console.error("Error processing start game signal:", error);
    }
  });



  
  // Listen for teams submitting answers
  socket.on("team:submitAnswer", async (payload) => {
    const { teamId, questionId, answer, pointsUsed } = payload;

    try { 
      // Emit the submission to the host
      io.emit("host:answerSubmission", {
        teamId,
        questionId,
        answer,
        pointsUsed,
      });

      console.log("Answer submission sent to host:", {
        teamId,
        questionId,
        answer,
        pointsUsed,
      });
    } catch (error) {
      console.error("Error processing team:submitAnswer:", error);
    }
  });

  // Listen for the 'team:submitSubAnswers' event
  socket.on("team:submitSubAnswers", (data) => {
    console.log("Received team:submitSubAnswers event:", data);

    const { gameId, teamId, subAnswers } = data;

    if (!gameId || !teamId || !Array.isArray(subAnswers)) {
      console.error("Invalid data received for team:submitSubAnswers");
      return;
    }

    // Broadcast or notify host about the submission
    io.emit("host:subAnswersSubmitted", {
      gameId,
      teamId,
      subAnswers,
    });

    console.log(`Notified host about subanswers from team ${teamId} for game ${gameId}`);
  });


  // Listen for host:resume signal from the host
  socket.on("host:resume", (data) => {
    const { gameId } = data;
    console.log(`Host resumed the game: ${gameId}`);
    // Broadcast the game:resume event to all clients
    io.emit("game:resume", {
      gameId,
    });
    console.log(`Broadcasted game:resume for gameId: ${gameId}`);
  });

  

  // Listen for resetting team submission statuses
  socket.on("host:resetSubmissions", (data) => {
    console.log("Resetting submissions for game:", data.gameId);

    // Notify all clients to reset submission statuses
    io.emit("game:resetSubmissions", { gameId: data.gameId });
  });

  // Listen for the host updating the current round
  // socket.on("host:updateRound", async ({ gameId, roundId }) => {
  //   try {
  //     const round = await prisma.round.findUnique({
  //       where: { id: roundId },
  //     });

  //     if (!round) {
  //       console.error("Round not found");
  //       return;
  //     }

  //     console.log(`Round ${round.name} started with updated points pool.`);
  //     io.emit("game:roundUpdated", { round }); // Notify clients
  //   } catch (error) {
  //     console.error("Error updating round:", error);
  //   }
  // });

  // Listen for host moving to a transition
  socket.on("host:transition", (data) => {
    console.log("Host initiated transition:", data);
    // Broadcast the transition details to all clients
    io.emit("game:transition", {
      gameId: data.gameId,
      transitionMessage: data.transitionMessage,
      transitionMedia: data.transitionMedia,
      adEmbedCode: data.adEmbedCode,
    });
    console.log("Transition signal sent to clients:", data);
  });


  //Handle toggling visibility of Team Scores
  socket.on('host:toggleScores', ({ gameId, scoresVisibleToPlayers }) => {
    console.log("Setting Score Visibility for Game " + gameId + " to " + scoresVisibleToPlayers);
    io.emit('game:scoresVisibilityChanged', { gameId, scoresVisibleToPlayers });
  });


  //Handle End Game
  socket.on('host:gameCompleted', ({gameId}) => {
    console.log('Host has ended game: '+ gameId);
    io.emit('game:gameCompleted', {gameId});

  });


  // socket.emit('team:addToGame', {
  //   teamId,
  //   teamName: team?.name,
  //   gameId,
  //   game: data.game, // Updated game data
  //   siteId: data.siteId, // Site associated with the game
  // });




  // Listen for a team being added to a game
  socket.on("team:addToGame", (data) => {    
    const { teamId, teamName, gameId } = data;
    console.log('received a request from team: ' + teamName + ' adding to game: ' + gameId)
    // Notify all clients in the room about the updated team list
    io.emit("team:update", { gameId, type: "add", teamName, teamId });
  });





  // Listen for a team being removed from a game
  socket.on("team:removeFromGame", (data) => {
    const { gameId, teamId } = data;
    console.log(`Team removed from game ${gameId}:`, teamId);
    // Notify all clients in the room about the updated team list
    io.emit("team:update", { gameId, type: "remove", teamId });
  });


  // 🔹 Handle Join Request Sent
  socket.on('player:joinRequestSent', ({ toUserId, teamId, requestId, message }) => {
    console.log(`Join request for team ${teamId} sent to captain ${toUserId}`);

    // Emit the notification directly to the captain
    io.emit(`notification:${toUserId}`, {
      type: 'JOIN_REQUEST',
      teamId,
      requestId,
      message,
    });
  });


  // Store notifications (Optional)
  socket.on("notification:new", ({ toUserId, type, message }) => {
    console.log(`New notification for ${toUserId}: ${message}`);
    io.emit(`notification:${toUserId}`, { type, message });
  });




  
  // Handle client disconnection
  socket.on("disconnect", () => {
    console.log("A client disconnected:", socket.id);
  });

  // Handle client disconnection
  socket.on("disconnect", () => {
    console.log("A client disconnected:", socket.id);
  });
});
