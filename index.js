const express = require("express");
const app = express();
var WebSocket = require("ws");
var WebSocketServer = require("ws").Server,
  wss = new WebSocketServer({
    port: 4041
  });
var uuid = require("uuid");
var path = require("path");

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(process.env.PORT || 4040, () => {
  console.log("Server listening on port 4040");
});

var clients = [];

function wsSend(type, client_uuid, nickname, message) {
  for (var i = 0; i < clients.length; i++) {
    const clientSocket = clients[i].ws;
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(
        JSON.stringify({
          type: type,
          id: client_uuid,
          nickname: nickname,
          message: message
        })
      );
    }
  }
}
wss.on("connection", function (ws) {
  var client_uuid = uuid.v4();
  var nickname = "";
  var op = false;
  clients.push({
    id: client_uuid,
    ws: ws,
    nickname: nickname,
    muted: false
  });
  ws.on("message", function (message) {
    for (let i = 0; i < clients.length; i++) {
      if (clients[i].id === client_uuid) {
        var muted = clients[i].muted;
      }
    }
    if (message.indexOf("/") !== 0 && muted === false) {
      wsSend("message", client_uuid, nickname, message);
    } else if (message.indexOf("/authenticateUser") === 0) {
      for (let i = 0; i < clients.length; i++) {
        if (clients[i].id === client_uuid) {
          clients[i].nickname = message.slice(18);
          nickname = message.slice(18);
          if (nickname.indexOf("/admin") === 0) {
            op = true;
            nickname = nickname.slice(16);
          }
          wsSend(
            "notification",
            client_uuid,
            nickname,
            nickname + " joined the chat"
          );
        }
      }
    } else if (message.indexOf("/kick") === 0) {
      if (op === true) {
        const user_Kicked = message.slice(6);
        for (let i = 0; i < clients.length; i++) {
          if (clients[i].nickname === user_Kicked) {
            wsSend("personal", client_uuid, user_Kicked, "You've been kicked");
            clients[i].ws.close();
          }
        }
      }
    } else if (message.indexOf("/mute") === 0) {
      if (op === true) {
        const user_Muted = message.slice(6);
        for (let i = 0; i < clients.length; i++) {
          if (clients[i].nickname === user_Muted) {
            wsSend("personal", client_uuid, user_Muted, "You've been muted");
            clients[i].muted = true;
          }
        }
      }
    } else if (message.indexOf("/unmute") === 0) {
      if (op === true) {
        const user_unMuted = message.slice(8);
        for (let i = 0; i < clients.length; i++) {
          if (clients[i].nickname === user_unMuted) {
            wsSend(
              "personal",
              client_uuid,
              user_unMuted,
              "You've been unmuted"
            );
            clients[i].muted = false;
          }
        }
      }
    }
  });
  ws.on("close", function () {
    wsSend("notification", client_uuid, nickname, nickname + " left the chat");
    for (let i = 0; i < clients.length; i++) {
      if (clients[i].id === client_uuid) {
        clients.splice(i, 1);
      }
    }
  });
});
