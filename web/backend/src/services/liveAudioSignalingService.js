import crypto from 'crypto';

const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const rooms = new Map();

const createClientId = () => crypto.randomBytes(8).toString('hex');

const getRoom = (tripId) => {
  if (!rooms.has(tripId)) {
    rooms.set(tripId, new Map());
  }

  return rooms.get(tripId);
};

const encodeFrame = (payload) => {
  const data = Buffer.from(JSON.stringify(payload));
  const header = [0x81];

  if (data.length < 126) {
    header.push(data.length);
  } else if (data.length < 65536) {
    header.push(126, (data.length >> 8) & 0xff, data.length & 0xff);
  } else {
    header.push(127, 0, 0, 0, 0);
    header.push((data.length >> 24) & 0xff, (data.length >> 16) & 0xff, (data.length >> 8) & 0xff, data.length & 0xff);
  }

  return Buffer.concat([Buffer.from(header), data]);
};

const sendJson = (client, payload) => {
  if (!client.socket.destroyed) {
    client.socket.write(encodeFrame(payload));
  }
};

const sendToRole = (room, role, payload, exceptClientId = null) => {
  room.forEach((client) => {
    if (client.role === role && client.id !== exceptClientId) {
      sendJson(client, payload);
    }
  });
};

const sendToClient = (room, clientId, payload) => {
  const target = room.get(clientId);
  if (target) {
    sendJson(target, payload);
  }
};

const cleanupRoom = (tripId) => {
  const room = rooms.get(tripId);
  if (room && room.size === 0) {
    rooms.delete(tripId);
  }
};

const parseFrames = (client, onMessage) => {
  let buffer = Buffer.alloc(0);

  return (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 2) {
      const firstByte = buffer[0];
      const secondByte = buffer[1];
      const opcode = firstByte & 0x0f;
      const isMasked = (secondByte & 0x80) === 0x80;
      let length = secondByte & 0x7f;
      let offset = 2;

      if (length === 126) {
        if (buffer.length < offset + 2) return;
        length = buffer.readUInt16BE(offset);
        offset += 2;
      } else if (length === 127) {
        if (buffer.length < offset + 8) return;
        const high = buffer.readUInt32BE(offset);
        const low = buffer.readUInt32BE(offset + 4);
        length = high * 2 ** 32 + low;
        offset += 8;
      }

      const maskLength = isMasked ? 4 : 0;
      if (buffer.length < offset + maskLength + length) return;

      let payload = buffer.subarray(offset + maskLength, offset + maskLength + length);

      if (isMasked) {
        const mask = buffer.subarray(offset, offset + 4);
        payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
      }

      buffer = buffer.subarray(offset + maskLength + length);

      if (opcode === 0x8) {
        client.socket.end();
        return;
      }

      if (opcode === 0x9) {
        client.socket.write(Buffer.from([0x8a, 0x00]));
        continue;
      }

      if (opcode !== 0x1) continue;

      try {
        onMessage(JSON.parse(payload.toString('utf8')));
      } catch {
        sendJson(client, { type: 'error', message: 'Message invalide' });
      }
    }
  };
};

const relaySignalingMessage = (client, message) => {
  const room = getRoom(client.tripId);
  const payload = {
    ...message,
    from: client.id,
  };

  if (message.type === 'call-state') {
    sendToRole(room, 'participant', payload, client.id);
    return;
  }

  if (message.targetId) {
    sendToClient(room, message.targetId, payload);
    return;
  }

  if (client.role === 'leader') {
    sendToRole(room, 'participant', payload, client.id);
  } else {
    sendToRole(room, 'leader', payload, client.id);
  }
};

const attachLiveAudioSignaling = (server, options = {}) => {
  const path = options.path ?? '/live-audio';

  server.on('upgrade', (request, socket) => {
    const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);

    if (url.pathname !== path) {
      socket.destroy();
      return;
    }

    const tripId = url.searchParams.get('tripId');
    const role = url.searchParams.get('role');
    const key = request.headers['sec-websocket-key'];

    if (!tripId || !['leader', 'participant'].includes(role) || !key) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    const accept = crypto
      .createHash('sha1')
      .update(`${key}${WEBSOCKET_GUID}`)
      .digest('base64');

    socket.write([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '\r\n',
    ].join('\r\n'));

    const client = {
      id: createClientId(),
      role,
      tripId,
      socket,
    };
    const room = getRoom(tripId);
    room.set(client.id, client);

    sendJson(client, {
      type: 'joined',
      clientId: client.id,
      leaders: [...room.values()].filter((item) => item.role === 'leader' && item.id !== client.id).map((item) => item.id),
      participants: [...room.values()].filter((item) => item.role === 'participant' && item.id !== client.id).map((item) => item.id),
    });

    if (role === 'participant') {
      sendToRole(room, 'leader', { type: 'participant-joined', participantId: client.id }, client.id);
    } else {
      sendToRole(room, 'participant', { type: 'leader-available', leaderId: client.id }, client.id);
    }

    socket.on('data', parseFrames(client, (message) => relaySignalingMessage(client, message)));
    socket.on('close', () => {
      room.delete(client.id);

      if (role === 'participant') {
        sendToRole(room, 'leader', { type: 'participant-left', participantId: client.id });
      } else {
        sendToRole(room, 'participant', { type: 'leader-left', leaderId: client.id });
      }

      cleanupRoom(tripId);
    });
    socket.on('error', () => socket.destroy());
  });
};

export default attachLiveAudioSignaling;
