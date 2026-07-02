import crypto from 'crypto';

// Serveur de signalisation WebRTC "signaling only" pour l'audio en direct
// (talkie-walkie du convoi) : ce service ne transporte pas l'audio lui-même,
// il relaie seulement les messages nécessaires à l'établissement des connexions
// pair-à-pair entre le "leader" (organisateur) et les "participants" d'un même trajet.
//
// Implémentation volontairement "à la main" du protocole WebSocket (RFC 6455),
// sans dépendance externe (comme la librairie `ws`), branchée directement sur
// l'évènement HTTP "upgrade" du serveur Node natif.

// Identifiant fixe défini par la RFC 6455, utilisé pour calculer la réponse
// d'acceptation de la poignée de main WebSocket (voir attachLiveAudioSignaling)
const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
// Une "room" par trajet (tripId), regroupant tous les clients connectés (leader + participants)
const rooms = new Map();

const createClientId = () => crypto.randomBytes(8).toString('hex');

// Récupère (ou crée) la room associée à un trajet
const getRoom = (tripId) => {
  if (!rooms.has(tripId)) {
    rooms.set(tripId, new Map());
  }

  return rooms.get(tripId);
};

// Encode un message JSON en trame WebSocket texte (opcode 0x1), sans masquage
// car les trames envoyées par un serveur au client ne sont jamais masquées (RFC 6455).
// La taille de l'en-tête varie selon la longueur du payload (7/16/64 bits).
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

// Diffuse un message à tous les clients d'un rôle donné dans une room
// (ex: prévenir tous les participants), en excluant éventuellement l'émetteur
const sendToRole = (room, role, payload, exceptClientId = null) => {
  room.forEach((client) => {
    if (client.role === role && client.id !== exceptClientId) {
      sendJson(client, payload);
    }
  });
};

// Envoie un message à un client précis de la room, identifié par son id
const sendToClient = (room, clientId, payload) => {
  const target = room.get(clientId);
  if (target) {
    sendJson(target, payload);
  }
};

// Supprime une room devenue vide (plus aucun client connecté) pour éviter
// une fuite mémoire si des trajets sont créés/quittés en continu
const cleanupRoom = (tripId) => {
  const room = rooms.get(tripId);
  if (room && room.size === 0) {
    rooms.delete(tripId);
  }
};

// Construit un parseur de trames WebSocket pour un client donné : accumule les
// données reçues en buffer (une trame peut arriver en plusieurs paquets TCP, ou
// plusieurs trames dans un seul paquet), puis décode chaque trame complète selon
// le format du protocole (RFC 6455) : bit FIN + opcode, longueur du payload sur
// 7/16/64 bits, masque de 4 octets (les trames client→serveur sont toujours masquées).
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

      // Longueur étendue sur 16 bits (126) ou 64 bits (127) selon l'indicateur des 7 bits
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
      // Trame incomplète : on attend les prochains paquets avant de continuer le décodage
      if (buffer.length < offset + maskLength + length) return;

      let payload = buffer.subarray(offset + maskLength, offset + maskLength + length);

      // Démasquage du payload par XOR avec la clé de masquage à 4 octets (répétée)
      if (isMasked) {
        const mask = buffer.subarray(offset, offset + 4);
        payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
      }

      buffer = buffer.subarray(offset + maskLength + length);

      // Opcode 0x8 = fermeture de connexion demandée par le client
      if (opcode === 0x8) {
        client.socket.end();
        return;
      }

      // Opcode 0x9 = ping : on répond immédiatement par un pong (0x8a) pour garder la connexion active
      if (opcode === 0x9) {
        client.socket.write(Buffer.from([0x8a, 0x00]));
        continue;
      }

      // On ne traite que les trames texte (0x1) ; les autres opcodes (binaire, pong...) sont ignorés
      if (opcode !== 0x1) continue;

      try {
        onMessage(JSON.parse(payload.toString('utf8')));
      } catch {
        sendJson(client, { type: 'error', message: 'Message invalide' });
      }
    }
  };
};

// Relaie un message de signalisation WebRTC (offer/answer/ICE candidate...) vers
// son ou ses destinataires : soit un client précis (targetId), soit tous les
// participants (si envoyé par le leader) ou le leader (si envoyé par un participant).
// Les messages "call-state" sont toujours diffusés à tous les participants
// (utilisé pour annoncer l'état global de l'appel en cours).
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

// Branche le serveur de signalisation sur un serveur HTTP existant, en écoutant
// les requêtes de mise à niveau ("upgrade") vers WebSocket sur le chemin /live-audio.
// Chaque connexion doit préciser un tripId (room à rejoindre) et un role
// ("leader" ou "participant") en paramètres de l'URL.
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

    // Poignée de main WebSocket (RFC 6455) : la clé du client, combinée au GUID
    // fixe de la RFC puis hachée en SHA-1/base64, prouve au client que le
    // serveur "comprend" bien le protocole WebSocket (et non un simple echo).
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

    // Informe le nouveau client des pairs déjà présents dans la room, pour
    // qu'il puisse initier les connexions WebRTC nécessaires de son côté
    sendJson(client, {
      type: 'joined',
      clientId: client.id,
      leaders: [...room.values()].filter((item) => item.role === 'leader' && item.id !== client.id).map((item) => item.id),
      participants: [...room.values()].filter((item) => item.role === 'participant' && item.id !== client.id).map((item) => item.id),
    });

    // Prévient les pairs existants de l'arrivée du nouveau client
    if (role === 'participant') {
      sendToRole(room, 'leader', { type: 'participant-joined', participantId: client.id }, client.id);
    } else {
      sendToRole(room, 'participant', { type: 'leader-available', leaderId: client.id }, client.id);
    }

    socket.on('data', parseFrames(client, (message) => relaySignalingMessage(client, message)));
    socket.on('close', () => {
      room.delete(client.id);

      // Prévient les pairs restants du départ de ce client
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
