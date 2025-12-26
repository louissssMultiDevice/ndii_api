// src/services/minecraftProtocol.js
const dgram = require('dgram');
const net = require('net');
const crypto = require('crypto');

class MinecraftProtocol {
  constructor() {
    this.PING_TIMEOUT = 5000;
    this.QUERY_TIMEOUT = 3000;
  }

  // Parse Minecraft color codes
  parseMOTD(motdText) {
    const colorCodes = {
      '0': '#000000', '1': '#0000AA', '2': '#00AA00',
      '3': '#00AAAA', '4': '#AA0000', '5': '#AA00AA',
      '6': '#FFAA00', '7': '#AAAAAA', '8': '#555555',
      '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
      'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55',
      'f': '#FFFFFF', 'r': '#FFFFFF'
    };

    const cleanText = motdText.replace(/§[0-9a-fk-or]/g, '');
    
    let htmlText = '';
    let currentColor = '#FFFFFF';
    let bold = false;
    let italic = false;
    let underline = false;
    let strikethrough = false;

    for (let i = 0; i < motdText.length; i++) {
      if (motdText[i] === '§' && i + 1 < motdText.length) {
        const code = motdText[i + 1].toLowerCase();
        i++;

        switch (code) {
          case '0': case '1': case '2': case '3': case '4':
          case '5': case '6': case '7': case '8': case '9':
          case 'a': case 'b': case 'c': case 'd': case 'e': case 'f':
            currentColor = colorCodes[code];
            // Reset formatting
            bold = italic = underline = strikethrough = false;
            break;
          case 'l': bold = true; break;
          case 'o': italic = true; break;
          case 'n': underline = true; break;
          case 'm': strikethrough = true; break;
          case 'r':
            currentColor = '#FFFFFF';
            bold = italic = underline = strikethrough = false;
            break;
          case 'k': // Obfuscated - skip
            break;
        }
      } else {
        let style = `color:${currentColor};`;
        if (bold) style += 'font-weight:bold;';
        if (italic) style += 'font-style:italic;';
        if (underline) style += 'text-decoration:underline;';
        if (strikethrough) style += 'text-decoration:line-through;';
        
        htmlText += `<span style="${style}">${motdText[i]}</span>`;
      }
    }

    return {
      raw: motdText,
      clean: cleanText,
      html: htmlText
    };
  }

  // Minecraft Ping Protocol (SLP)
  async pingServer(host, port = 25565) {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(port, host, () => {
        // Handshake packet
        const handshake = Buffer.alloc(5 + Buffer.byteLength(host));
        handshake.writeUInt8(0x00, 0); // Packet ID
        handshake.writeVarInt(47, 1); // Protocol version
        handshake.writeVarInt(Buffer.byteLength(host), 2);
        handshake.write(host, 3);
        handshake.writeUInt16BE(port, 3 + Buffer.byteLength(host));
        handshake.writeVarInt(1, 5 + Buffer.byteLength(host)); // Next state: status
        
        // Status request packet
        const statusRequest = Buffer.from([0x01, 0x00]);

        socket.write(Buffer.concat([this.writeVarInt(handshake.length), handshake]));
        socket.write(Buffer.concat([this.writeVarInt(1), statusRequest]));
      });

      let dataBuffer = Buffer.alloc(0);
      
      socket.on('data', (chunk) => {
        dataBuffer = Buffer.concat([dataBuffer, chunk]);
        
        try {
          if (dataBuffer.length > 0) {
            const packetLength = this.readVarInt(dataBuffer);
            const packetId = this.readVarInt(dataBuffer.slice(packetLength.bytes));
            
            if (packetId.value === 0x00) {
              const jsonStart = packetLength.bytes + packetId.bytes;
              const jsonLength = this.readVarInt(dataBuffer.slice(jsonStart));
              const jsonData = JSON.parse(
                dataBuffer.slice(jsonStart + jsonLength.bytes, 
                jsonStart + jsonLength.bytes + jsonLength.value).toString()
              );

              socket.end();
              resolve(this.parsePingResponse(jsonData));
            }
          }
        } catch (err) {
          // Continue reading
        }
      });

      socket.setTimeout(this.PING_TIMEOUT);
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Ping timeout'));
      });

      socket.on('error', reject);
    });
  }

  // Query Protocol
  async queryServer(host, port = 25565) {
    return new Promise((resolve, reject) => {
      const socket = dgram.createSocket('udp4');
      const sessionId = crypto.randomBytes(4).readUInt32LE(0);
      
      // Handshake packet
      const handshake = Buffer.alloc(7);
      handshake.writeUInt16BE(0xFEFD, 0); // Magic number
      handshake.writeUInt8(0x09, 2); // Handshake type
      handshake.writeUInt32BE(sessionId, 3);
      
      socket.send(handshake, port, host, (err) => {
        if (err) reject(err);
      });

      let challengeToken = null;
      let timeout = null;

      socket.on('message', (msg, rinfo) => {
        clearTimeout(timeout);
        
        const type = msg.readUInt8(0);
        
        if (type === 0x09) { // Handshake response
          challengeToken = parseInt(msg.slice(5).toString().trim());
          
          // Full stat packet
          const fullStat = Buffer.alloc(11);
          fullStat.writeUInt16BE(0xFEFD, 0);
          fullStat.writeUInt8(0x00, 2); // Stat type
          fullStat.writeUInt32BE(sessionId, 3);
          fullStat.writeInt32BE(challengeToken, 7);
          
          socket.send(fullStat, port, host, (err) => {
            if (err) reject(err);
          });

          timeout = setTimeout(() => {
            socket.close();
            reject(new Error('Query timeout'));
          }, this.QUERY_TIMEOUT);
        } else if (type === 0x00) { // Stat response
          socket.close();
          resolve(this.parseQueryResponse(msg));
        }
      });

      socket.on('error', reject);
    });
  }

  // Bedrock Protocol
  async bedrockPing(host, port = 19132) {
    return new Promise((resolve, reject) => {
      const socket = dgram.createSocket('udp4');
      
      // Unconnected ping packet
      const pingPacket = Buffer.alloc(25);
      pingPacket.writeUInt8(0x01, 0); // Packet ID
      pingPacket.writeBigUInt64BE(BigInt(Date.now()), 1); // Timestamp
      pingPacket.writeUInt8(0x00, 9); // Magic
      pingPacket.writeBigUInt64BE(0x00FFFFFFFFFFFFFFn, 10); // Client GUID
      
      socket.send(pingPacket, port, host, (err) => {
        if (err) reject(err);
      });

      socket.on('message', (msg, rinfo) => {
        socket.close();
        
        if (msg.readUInt8(0) !== 0x1C) {
          reject(new Error('Invalid Bedrock response'));
          return;
        }

        const response = {
          edition: 'BEDROCK',
          server_id: msg.slice(33, 33 + 8).toString('hex'),
          server_name: msg.slice(41).toString().split(';')[0],
          protocol: parseInt(msg.slice(41).toString().split(';')[1]),
          version: msg.slice(41).toString().split(';')[2],
          players_online: parseInt(msg.slice(41).toString().split(';')[4]),
          players_max: parseInt(msg.slice(41).toString().split(';')[5]),
          motd: msg.slice(41).toString().split(';')[7],
          gamemode: msg.slice(41).toString().split(';')[8]
        };

        resolve(response);
      });

      socket.setTimeout(this.PING_TIMEOUT);
      socket.on('timeout', () => {
        socket.close();
        reject(new Error('Bedrock ping timeout'));
      });

      socket.on('error', reject);
    });
  }

  // Helper methods for VarInt
  writeVarInt(value) {
    const buffer = [];
    while (true) {
      if ((value & 0xFFFFFF80) === 0) {
        buffer.push(value);
        break;
      }
      buffer.push((value & 0x7F) | 0x80);
      value >>>= 7;
    }
    return Buffer.from(buffer);
  }

  readVarInt(buffer) {
    let result = 0;
    let bytes = 0;
    let shift = 0;
    
    while (true) {
      const byte = buffer[bytes];
      result |= (byte & 0x7F) << shift;
      shift += 7;
      bytes++;
      
      if ((byte & 0x80) === 0) break;
    }
    
    return { value: result, bytes };
  }

  parsePingResponse(data) {
    return {
      version: data.version?.name || 'Unknown',
      protocol: data.version?.protocol || 0,
      players: {
        online: data.players?.online || 0,
        max: data.players?.max || 0,
        sample: data.players?.sample || []
      },
      motd: this.parseMOTD(data.description?.text || ''),
      favicon: data.favicon || null,
      modinfo: data.modinfo || null,
      software: data.version?.name?.includes('Paper') ? 'Paper' :
                data.version?.name?.includes('Spigot') ? 'Spigot' :
                data.version?.name?.includes('Bukkit') ? 'Bukkit' : 'Vanilla'
    };
  }

  parseQueryResponse(buffer) {
    // Parse the split null-byte separated data
    const data = buffer.slice(16).toString().split('\x00');
    
    return {
      hostname: data[0] || '',
      gametype: data[1] || '',
      map: data[3] || '',
      players_online: parseInt(data[4]) || 0,
      players_max: parseInt(data[5]) || 0,
      version: data[2] || '',
      plugins: data[7] ? data[7].split(': ')[1]?.split('; ') || [] : [],
      players: data.slice(8, 8 + parseInt(data[4])).filter(p => p)
    };
  }
}

module.exports = new MinecraftProtocol();
