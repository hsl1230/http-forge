# WebSocket and Socket.IO Examples

## Raw WebSocket echo

```json
{
  "requestType": "websocket",
  "method": "GET",
  "url": "wss://echo.websocket.events",
  "websocket": {
    "protocol": "websocket",
    "messages": [
      { "id": "hello", "type": "text", "data": "hello", "enabled": true }
    ],
    "settings": { "responseTimeout": 1000 }
  }
}
```

## Socket.IO chat

```json
{
  "requestType": "websocket",
  "method": "GET",
  "url": "http://localhost:3000",
  "websocket": {
    "protocol": "socketio",
    "messages": [
      { "id": "join", "type": "text", "data": "world", "event": "chat", "args": [], "ack": true }
    ],
    "socketio": {
      "handshakePath": "/socket.io",
      "namespace": "/",
      "auth": "{\"token\":\"secret\"}",
      "transports": ["websocket"]
    },
    "settings": { "responseTimeout": 1000 }
  }
}
```

## Headless run assertion

```js
pm.test('handshake ok', () => pm.expect(pm.response.code).to.equal(101));
pm.test('received a frame', () => {
  const transcript = pm.response.json();
  pm.expect(transcript.frames.length).to.be.greaterThan(0);
});
```
