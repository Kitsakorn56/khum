const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});
const path = require('path');

// คลังคำศัพท์ภาษาไทย - หมวดหมู่ ปาร์ตี้ / ออฟฟิศ
const CATEGORIES = {
  'ปาร์ตี้': [
    // สรรพนาม/คำด่า/คำติดปาก (25)
    'มึง', 'กู', 'มัน', 'ไอ้', 'อี', 'เชี่ย', 'สัส', 'บ้า', 'จริง', 'ป่ะ', 'วะ', 'เว้ย', 'ดิ', 'เลย', 'โห', 'เห้ย', 'อุ๊ย', 'ชิบหาย', 'แรง', 'เกิน', 'งง', 'ไม่', 'พวกมึง', 'พวกกู', 'ใคร',
    // กริยา/Action (25)
    'ดื่ม', 'กิน', 'ชน', 'เต้น', 'ร้อง', 'เล่น', 'คุย', 'หัวเราะ', 'แซว', 'นั่ง', 'ยืน', 'เดิน', 'เมา', 'อ้วก', 'กลับ', 'ไปต่อ', 'จ่าย', 'เลี้ยง', 'หาร', 'ถ่ายรูป', 'ไลฟ์', 'ฟัง', 'ลืม', 'นอน', 'ตื่น',
    // ของกิน/เครื่องดื่ม (25)
    'เบียร์', 'เหล้า', 'ไวน์', 'ช็อต', 'น้ำ', 'น้ำแข็ง', 'โซดา', 'กับแกล้ม', 'เฟรนช์ฟรายส์', 'ยำ', 'เผ็ด', 'หวาน', 'เปรี้ยว', 'ขม', 'เย็น', 'ร้อน', 'แก้ว', 'ขวด', 'หลอด', 'ช้อน', 'จาน', 'ทิชชู่', 'บุหรี่', 'ไฟแช็ก', 'แอลกอฮอล์',
    // บรรยากาศ/สถานที่ (25)
    'สนุก', 'มันส์', 'ง่วง', 'เหนื่อย', 'มืด', 'เพลง', 'ดัง', 'เบา', 'ลำโพง', 'ไมค์', 'ร้าน', 'ผับ', 'บาร์', 'บ้าน', 'รถ', 'เพื่อน', 'แฟน', 'คนคุย', 'โสด', 'ผู้ชาย', 'ผู้หญิง', 'เที่ยงคืน', 'พรุ่งนี้', 'ห้องน้ำ', 'เตียง'
  ],
  'ออฟฟิศ': [
    // สรรพนาม/คำเชื่อม (25)
    'พี่', 'น้อง', 'หนู', 'ผม', 'เรา', 'ท่าน', 'บอส', 'ลูกค้า', 'คือ', 'แบบว่า', 'จริงๆ', 'นะคะ', 'ครับผม', 'ค่ะ', 'อะ', 'อือ', 'โอเค', 'เข้าใจ', 'ใช่ไหม', 'ฮัลโหล', 'เช็ก', 'ฝาก', 'แก', 'คุณ', 'ที่รัก',
    // กริยา/การทำงาน (25)
    'ประชุม', 'แก้', 'ตาม', 'ส่ง', 'รับ', 'โทร', 'คุย', 'พิมพ์', 'อ่าน', 'เขียน', 'คิด', 'ทำ', 'ช่วย', 'จอง', 'สั่ง', 'ปรึกษา', 'สรุป', 'เสนอ', 'อนุมัติ', 'ลา', 'สาย', 'เลิก', 'เริ่ม', 'หยุด', 'ตรวจ',
    // ศัพท์เทคนิค/ทับศัพท์ (25)
    'ด่วน', 'ASAP', 'บรีฟ', 'งาน', 'โปรเจกต์', 'ไฟล์', 'เมล', 'คอม', 'เน็ต', 'ซูม', 'สไลด์', 'กราฟ', 'ตัวเลข', 'ยอด', 'ขาย', 'ตลาด', 'แผน', 'คอนเทนต์', 'โพสต์', 'แอดมิน', 'บัญชี', 'การเงิน', 'เงินเดือน', 'โบนัส', 'ภาษี',
    // สิ่งของ/สถานที่ (25)
    'ห้องประชุม', 'โต๊ะ', 'เก้าอี้', 'ลิฟต์', 'บันได', 'โรงอาหาร', 'ที่จอดรถ', 'ห้องน้ำ', 'ปากกา', 'กระดาษ', 'แก้ว', 'กาแฟ', 'แอร์', 'ไฟ', 'บัตร', 'เครื่องปริ้น', 'ปลั๊ก', 'สายชาร์จ', 'มือถือ', 'นาฬิกา', 'วันจันทร์', 'วันศุกร์', 'พรุ่งนี้', 'วันนี้', 'เงิน'
  ]
};

// เก็บข้อมูลห้องเกม
const rooms = {};

app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  console.log('🔗 Player connected:', socket.id);

  // สร้างหรือเข้าร่วมห้อง
  socket.on('join-room', (data) => {
    const { roomId, playerName, selectedCat, timerSecs } = data;

    if (!rooms[roomId]) {
      if (selectedCat == null || timerSecs == null) {
        socket.emit('join-error', { message: 'ไม่พบห้องนี้' });
        return;
      }
      rooms[roomId] = {
        id: roomId,
        creator: socket.id,
        players: [],
        playerNames: {},
        currentWord: null,
        wordAssignments: {},
        scores: {},
        gameState: 'lobby',
        roundNum: 0,
        selectedCat: selectedCat || 'ปาร์ตี้',
        timerSecs: timerSecs || 300,
        guessResults: {}
      };
    }

    const room = rooms[roomId];
    
    // เพิ่มผู้เล่น
    if (!room.players.includes(socket.id)) {
      room.players.push(socket.id);
      room.playerNames[socket.id] = playerName;
      room.scores[socket.id] = { correct: 0, wrong: 0, total: 0 };
    }

    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerName = playerName;

    console.log(`✅ ${playerName} joined room ${roomId} (Total: ${room.players.length})`);

    room.players.forEach(pid => {
      io.to(pid).emit('room-updated', {
        roomId,
        players: room.players.map(p => ({
          id: p,
          name: room.playerNames[p],
          score: room.scores[p]?.correct || 0
        })),
        isHost: pid === room.creator,
        gameState: room.gameState,
        selectedCat: room.selectedCat,
        timerSecs: room.timerSecs,
        roundNum: room.roundNum
      });
    });
    // บอก client ว่า socket.id ของตัวเองคืออะไร (ใช้เปรียบเทียบว่าใครคือ "ฉัน")
    socket.emit('your-player-id', socket.id);
  });

  // เปลี่ยนหมวดคำ
  socket.on('change-category', (data) => {
    const room = rooms[socket.roomId];
    if (room && socket.id === room.creator) {
      room.selectedCat = data.category;
      room.players.forEach(pid => {
        io.to(pid).emit('room-updated', {
          selectedCat: room.selectedCat,
          isHost: pid === room.creator
        });
      });
    }
  });

  // เปลี่ยนเวลา
  socket.on('change-timer', (data) => {
    const room = rooms[socket.roomId];
    if (room && socket.id === room.creator) {
      room.timerSecs = data.timerSecs;
      room.players.forEach(pid => {
        io.to(pid).emit('room-updated', {
          timerSecs: room.timerSecs,
          isHost: pid === room.creator
        });
      });
    }
  });

  // สตาร์ตเกม
  socket.on('start-game', () => {
    const room = rooms[socket.roomId];
    if (!room || room.gameState === 'playing') return;
    if (socket.id !== room.creator) return;

    room.gameState = 'playing';
    room.roundNum = (room.roundNum || 0) + 1;
    room.guessResults = {};
    room.playersWhoGuessed = {}; // ใครกดทายคำของตัวเองแล้ว

    // สุ่มคำให้ผู้เล่นแต่ละคน
    assignWordsToPlayers(room);

    // ส่งให้แต่ละคนโดยไม่ส่งคำของตัวเอง (รู้แค่คำของคนอื่น)
    room.startTime = Date.now();
    room.players.forEach(playerId => {
      io.to(playerId).emit('game-started', {
        gameState: 'playing',
        roundNum: room.roundNum,
        timerSecs: room.timerSecs,
        startTime: room.startTime,
        playerWords: room.players.map(pid => ({
          playerId: pid,
          word: pid === playerId ? '' : (room.wordAssignments[pid] || ''),
          playerName: room.playerNames[pid]
        }))
      });
    });

    console.log(`🎮 Game started in room ${socket.roomId}`);
  });

  // บันทึกคำตอบ — ห้ามทายคำของคนอื่น ต้องทายแค่คำบนหัวตัวเอง (targetPlayerId ต้องเป็น socket.id)
  socket.on('submit-guess', (data) => {
    const room = rooms[socket.roomId];
    if (!room) return;

    const { targetPlayerId, guess } = data;
    if (targetPlayerId !== socket.id) return;

    const actualWord = room.wordAssignments[targetPlayerId];
    const isCorrect = guess.toLowerCase().trim() === actualWord.toLowerCase().trim();

    const resultKey = `${socket.id}_${targetPlayerId}`;
    room.guessResults[resultKey] = {
      guesserId: socket.id,
      guesserName: socket.playerName,
      targetPlayerId,
      guess,
      correct: isCorrect
    };

    if (targetPlayerId === socket.id) room.playersWhoGuessed[socket.id] = true;
    const allHaveGuessed = room.players.every(pid => room.playersWhoGuessed[pid]);

    io.to(socket.roomId).emit('guess-received', {
      resultKey,
      guessResult: room.guessResults[resultKey],
      allHaveGuessed
    });

    console.log(`💭 Guess: ${socket.playerName} -> ${actualWord} = ${isCorrect}`);
  });

  // สิ้นสุดรอบ (โฮสเรียก) — กดได้เมื่อทุกคนทายครบ หรือหมดเวลา (timeUp)
  socket.on('end-round', (data) => {
    const room = rooms[socket.roomId];
    if (!room || socket.id !== room.creator) return;
    if (room.gameState === 'guessing') return;

    const timeUp = data && data.timeUp === true;
    const allHaveGuessed = room.players.every(pid => room.playersWhoGuessed[pid]);
    if (!timeUp && !allHaveGuessed) return;

    room.gameState = 'guessing';

    io.to(socket.roomId).emit('round-ended', {
      gameState: 'guessing',
      guessResults: room.guessResults,
      correctAnswers: room.players.map(pid => ({
        playerId: pid,
        word: room.wordAssignments[pid],
        playerName: room.playerNames[pid]
      }))
    });

    console.log(`✋ Round ${room.roundNum} ended`);
  });

  // ต่อรอบถัดไป
  socket.on('next-round', () => {
    const room = rooms[socket.roomId];
    if (!room || socket.id !== room.creator) return;

    room.gameState = 'playing';
    room.roundNum++;
    room.guessResults = {};
    room.playersWhoGuessed = {};

    assignWordsToPlayers(room);

    room.startTime = Date.now();
    room.players.forEach(playerId => {
      io.to(playerId).emit('game-started', {
        gameState: 'playing',
        roundNum: room.roundNum,
        timerSecs: room.timerSecs,
        startTime: room.startTime,
        playerWords: room.players.map(pid => ({
          playerId: pid,
          word: pid === playerId ? '' : (room.wordAssignments[pid] || ''),
          playerName: room.playerNames[pid]
        }))
      });
    });

    console.log(`🔄 Starting round ${room.roundNum}`);
  });

  // ออกจากห้อง
  socket.on('leave-room', () => {
    const room = rooms[socket.roomId];
    if (room) {
      const wasCreator = socket.id === room.creator;
      if (wasCreator) {
        socket.to(socket.roomId).emit('host-left-room', { message: 'เจ้าของห้องออกจากห้องแล้ว' });
      }
      room.players = room.players.filter(pid => pid !== socket.id);
      delete room.playerNames[socket.id];
      delete room.scores[socket.id];
      delete room.wordAssignments[socket.id];
      delete room.playersWhoGuessed[socket.id];
      Object.keys(room.guessResults || {}).forEach(key => {
        if (key.startsWith(socket.id + '_') || key.endsWith('_' + socket.id)) delete room.guessResults[key];
      });

      if (room.players.length === 0) {
        delete rooms[socket.roomId];
        console.log(`❌ Room ${socket.roomId} deleted (empty)`);
      } else {
        io.to(socket.roomId).emit('player-left', {
          playerId: socket.id,
          playerName: socket.playerName,
          players: room.players.map(pid => ({
            id: pid,
            name: room.playerNames[pid]
          })),
          scores: room.scores
        });
        console.log(`👋 ${socket.playerName} left room ${socket.roomId}`);
      }
    }
    socket.leave(socket.roomId);
  });

  // ขาดการเชื่อมต่อ
  socket.on('disconnect', () => {
    const room = rooms[socket.roomId];
    if (room) {
      const wasCreator = socket.id === room.creator;
      if (wasCreator) {
        socket.to(socket.roomId).emit('host-left-room', { message: 'เจ้าของห้องออกจากห้องแล้ว' });
      }
      room.players = room.players.filter(pid => pid !== socket.id);
      delete room.playerNames[socket.id];
      delete room.scores[socket.id];
      delete room.wordAssignments[socket.id];
      if (room.playersWhoGuessed) delete room.playersWhoGuessed[socket.id];
      Object.keys(room.guessResults || {}).forEach(key => {
        if (key.startsWith(socket.id + '_') || key.endsWith('_' + socket.id)) delete room.guessResults[key];
      });

      if (room.players.length === 0) {
        delete rooms[socket.roomId];
        console.log(`❌ Room ${socket.roomId} deleted (disconnect)`);
      } else {
        io.to(socket.roomId).emit('player-disconnected', {
          playerId: socket.id,
          players: room.players.map(pid => ({
            id: pid,
            name: room.playerNames[pid]
          })),
          scores: room.scores
        });
      }
    }
    console.log(`🔌 Player disconnected: ${socket.id}`);
  });
});

// ถ้าผู้เล่นมากกว่าจำนวนคำในหมวด จะวนใช้คำซ้ำ (i % shuffled.length)
function assignWordsToPlayers(room) {
  const catWords = CATEGORIES[room.selectedCat] || CATEGORIES['ปาร์ตี้'] || [];
  const shuffled = [...catWords].sort(() => Math.random() - 0.5);

  room.wordAssignments = {};
  room.players.forEach((pid, i) => {
    room.wordAssignments[pid] = shuffled[i % shuffled.length];
  });
}

// ลบห้องที่โฮสต์ออกไปแล้ว (creator ไม่ได้อยู่ใน room.players) — แก้ memory leak
const ROOM_CLEANUP_INTERVAL_MS = 2 * 60 * 1000;
setInterval(() => {
  Object.keys(rooms).forEach(roomId => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.players.length === 0) {
      delete rooms[roomId];
      return;
    }
    if (!room.players.includes(room.creator)) {
      room.players.forEach(pid => io.to(pid).emit('host-left-room', { message: 'ห้องถูกปิด' }));
      delete rooms[roomId];
    }
  });
}, ROOM_CLEANUP_INTERVAL_MS);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
