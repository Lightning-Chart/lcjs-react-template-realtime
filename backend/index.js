const WebSocket = require("ws");

const PORT = 8090;

let prevVals = new Array(3).fill(0).map((_) => Math.random() * 1000);
const getBroadcastData = (deltaMs) => {
  return [
    {
      timestamp: Date.now(),
      ...Object.fromEntries(
        prevVals.map((prev, i) => {
          const next = prev + (Math.random() * 2 - 1);
          prevVals[i] = next;
          return [`val${i + 1}`, next];
        })
      ),
    },
  ];
};

const wss = new WebSocket.Server({ port: PORT }, () => {
  console.log(`WebSocket server started on ws://localhost:${PORT}`);
});

let clients = 0;

wss.on("connection", (ws) => {
  console.log("Client connected");
  clients++;
  ws.on("close", () => {
    console.log("Client disconnected");
    clients--;
  });
});

let tPrev = performance.now();
const update = () => {
  const tNow = performance.now();
  const data = getBroadcastData(Math.min(tNow - tPrev, 1000));
  if (data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }
  tPrev = tNow;
  setTimeout(update, 100);
};
update();
