const express = require('express');
require('dotenv').config();
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const CATEGORIES = require('./categories');

// Database setup
const MONGO_URL = process.env.MONGO_URL || process.env.MONGODB_URI;
if (!MONGO_URL) {
  console.warn('⚠️  MONGO_URL / MONGODB_URI is not set.');
} else {
  mongoose
    .connect(MONGO_URL)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch((err) => console.error('Failed to connect MongoDB:', err));
}

// ── Schema ──────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    email:        { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    displayName:  { type: String, required: true },
    avatarUrl:    { type: String, default: null },
    isAdmin:      { type: Boolean, default: false },
    rank: {
      name:  { type: String, default: null },
      color: { type: String, default: '#f97316' }
    }
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

function publicUserRow(user) {
  if (!user) return null;
  return {
    id:          user._id.toString(),
    email:       user.email,
    displayName: user.displayName,
    avatarUrl:   user.avatarUrl || null,
    isAdmin:     !!user.isAdmin,
    rank:        (user.rank && user.rank.name) ? { name: user.rank.name, color: user.rank.color || '#f97316' } : null
  };
}

// ── Room store ───────────────────────────────────────────────────────────────
const rooms = {};

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Auth APIs ────────────────────────────────────────────────────────────────
app.post('/api/signup', async (req, res) => {
  if (!MONGO_URL || mongoose.connection.readyState !== 1)
    return res.status(503).json({ error: 'MongoDB ยังไม่ได้เชื่อมต่อ' });

  const { email, password, displayName, avatarUrl } = req.body || {};
  if (!email || !password || !displayName)
    return res.status(400).json({ error: 'ต้องกรอก email, password และ displayName' });

  try {
    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
    const isAdmin    = adminEmail && email.toLowerCase() === adminEmail;
    const existing   = await User.findOne({ email }).lean();
    if (existing) return res.status(409).json({ error: 'อีเมลนี้ถูกใช้ไปแล้ว' });

    const created = await User.create({
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      displayName,
      avatarUrl: avatarUrl || null,
      isAdmin: !!isAdmin
    });
    res.json({ user: publicUserRow(created) });
  } catch (err) {
    console.error('signup error:', err);
    res.status(500).json({ error: 'สมัครไม่สำเร็จ' });
  }
});

app.post('/api/login', async (req, res) => {
  if (!MONGO_URL || mongoose.connection.readyState !== 1)
    return res.status(503).json({ error: 'MongoDB ยังไม่ได้เชื่อมต่อ' });

  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'ต้องกรอก email และ password' });

  try {
    const user = await User.findOne({ email }).exec();
    if (!user) return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });

    if (!bcrypt.compareSync(password, user.passwordHash))
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });

    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
    if (adminEmail && email.toLowerCase() === adminEmail && !user.isAdmin) {
      user.isAdmin = true;
      await user.save();
    }
    res.json({ user: publicUserRow(user) });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'ล็อกอินไม่สำเร็จ' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).exec();
    if (!user) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    res.json({ user: publicUserRow(user) });
  } catch (err) {
    res.status(500).json({ error: 'ดึงข้อมูลไม่สำเร็จ' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { displayName, avatarUrl } = req.body || {};
  try {
    const user = await User.findById(req.params.id).exec();
    if (!user) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    if (displayName) user.displayName = displayName;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    await user.save();
    res.json({ user: publicUserRow(user) });
  } catch (err) {
    res.status(500).json({ error: 'อัปเดตไม่สำเร็จ' });
  }
});

// ── Rank API (admin only) ────────────────────────────────────────────────────
app.put('/api/users/:id/rank', async (req, res) => {
  const { rankName, rankColor } = req.body || {};
  const adminId = req.headers['x-admin-id'];

  if (!adminId) return res.status(403).json({ error: 'ต้องเป็น admin' });

  try {
    const admin = await User.findById(adminId).lean();
    if (!admin || !admin.isAdmin) return res.status(403).json({ error: 'ต้องเป็น admin' });

    const target = await User.findById(req.params.id).exec();
    if (!target) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });

    if (!rankName || rankName.trim() === '') {
      target.rank = { name: null, color: '#f97316' };
    } else {
      target.rank = { name: rankName.trim(), color: rankColor || '#f97316' };
    }
    await target.save();

    const updatedUser = publicUserRow(target);
    io.emit('rank-updated', { userId: target._id.toString(), rank: updatedUser.rank });

    res.json({ user: updatedUser });
  } catch (err) {
    console.error('rank error:', err);
    res.status(500).json({ error: 'อัปเดตยศไม่สำเร็จ' });
  }
});

// ค้นหา user ด้วย email (admin เท่านั้น)
app.get('/api/users/search/:email', async (req, res) => {
  const adminId = req.headers['x-admin-id'];
  if (!adminId) return res.status(403).json({ error: 'ต้องเป็น admin' });

  try {
    const admin = await User.findById(adminId).lean();
    if (!admin || !admin.isAdmin) return res.status(403).json({ error: 'ต้องเป็น admin' });

    const user = await User.findOne({ email: req.params.email }).lean();
    if (!user) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    res.json({ user: publicUserRow(user) });
  } catch (err) {
    res.status(500).json({ error: 'ค้นหาไม่สำเร็จ' });
  }
});

// ── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413))
    return res.status(413).json({ error: 'ไฟล์ใหญ่เกินไป' });
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
});

// ── Socket helpers ────────────────────────────────────────────────────────────
function canControlRoom(room, socket) {
  if (!room) return false;
  if (socket.id === room.creator) return true;
  if (socket.isAdmin) return true;
  return false;
}

// ── Socket.io ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('🔗 Player connected:', socket.id);

  socket.on('join-room', async (data) => {
    const { roomId, playerName, selectedCat, timerSecs, userId, avatarUrl } = data;

    if (!rooms[roomId]) {
      if (selectedCat == null || timerSecs == null) {
        socket.emit('join-error', { message: 'ไม่พบห้องนี้' });
        return;
      }
      rooms[roomId] = {
        id: roomId, creator: socket.id, players: [],
        playerNames: {}, playerAvatars: {}, playerRanks: {},
        userIds: {}, wordAssignments: {}, scores: {},
        gameState: 'lobby', roundNum: 0,
        selectedCat: selectedCat || 'ปาร์ตี้',
        timerSecs: timerSecs || 300, guessResults: {}
      };
    }

    const room = rooms[roomId];

    let userRank = null;
    if (userId && mongoose.connection.readyState === 1) {
      try {
        const u = await User.findById(userId).lean();
        if (u) {
          userRank = (u.rank && u.rank.name) ? { name: u.rank.name, color: u.rank.color || '#f97316' } : null;
          socket.isAdmin = !!u.isAdmin;
          if (socket.isAdmin) console.log(`👑 Admin joined room ${roomId}:`, playerName);
        }
      } catch (_) {}
    }

    if (!room.players.includes(socket.id)) {
      room.players.push(socket.id);
      room.playerNames[socket.id]   = playerName;
      room.scores[socket.id]        = { correct: 0, wrong: 0, total: 0 };
      room.playerAvatars[socket.id] = avatarUrl || null;
      room.playerRanks[socket.id]   = userRank;
      room.userIds[socket.id]       = userId || null;
    }

    socket.join(roomId);
    socket.roomId     = roomId;
    socket.playerName = playerName;
    socket.avatarUrl  = avatarUrl || null;
    socket.userId     = userId || null;

    console.log(`✅ ${playerName} joined room ${roomId} (Total: ${room.players.length})`);

    broadcastRoomUpdate(room);
    socket.emit('your-player-id', socket.id);
  });

  socket.on('change-category', (data) => {
    const room = rooms[socket.roomId];
    if (canControlRoom(room, socket)) {
      room.selectedCat = data.category;
      room.players.forEach(pid => io.to(pid).emit('room-updated', { selectedCat: room.selectedCat, isHost: pid === room.creator }));
    }
  });

  socket.on('change-timer', (data) => {
    const room = rooms[socket.roomId];
    if (canControlRoom(room, socket)) {
      room.timerSecs = data.timerSecs;
      room.players.forEach(pid => io.to(pid).emit('room-updated', { timerSecs: room.timerSecs, isHost: pid === room.creator }));
    }
  });

  socket.on('start-game', () => {
    const room = rooms[socket.roomId];
    if (!room || room.gameState === 'playing' || !canControlRoom(room, socket)) return;

    room.gameState = 'playing';
    room.roundNum  = (room.roundNum || 0) + 1;
    room.guessResults = {};
    room.playersWhoGuessed = {};
    assignWordsToPlayers(room);

    room.startTime = Date.now();
    room.players.forEach(playerId => {
      io.to(playerId).emit('game-started', {
        gameState: 'playing',
        roundNum:  room.roundNum,
        timerSecs: room.timerSecs,
        startTime: room.startTime,
        playerWords: room.players.map(pid => ({
          playerId: pid,
          word:       pid === playerId ? '' : (room.wordAssignments[pid] || ''),
          playerName: room.playerNames[pid]
        }))
      });
    });
    console.log(`🎮 Game started in room ${socket.roomId}`);
  });

  socket.on('submit-guess', (data) => {
    const room = rooms[socket.roomId];
    if (!room || room.gameState !== 'playing') return;
    const { targetPlayerId, guess } = data;
    if (targetPlayerId !== socket.id) return;

    if (room.playersWhoGuessed && room.playersWhoGuessed[socket.id]) return;

    const actualWord = room.wordAssignments[targetPlayerId];
    if (!actualWord) return;

    const isCorrect = guess.toLowerCase().trim() === actualWord.toLowerCase().trim();
    const resultKey = `${socket.id}_${targetPlayerId}`;

    if (!room.scores[socket.id]) room.scores[socket.id] = { correct: 0, wrong: 0, total: 0 };
    if (isCorrect) room.scores[socket.id].correct++;
    else room.scores[socket.id].wrong++;
    room.scores[socket.id].total++;

    room.guessResults[resultKey] = { guesserId: socket.id, guesserName: socket.playerName, targetPlayerId, guess, correct: isCorrect };
    room.playersWhoGuessed[socket.id] = true;
    const allHaveGuessed = room.players.every(pid => room.playersWhoGuessed[pid]);

    io.to(socket.roomId).emit('guess-received', { resultKey, guessResult: room.guessResults[resultKey], allHaveGuessed, scores: room.scores });
    console.log(`💭 ${socket.playerName} -> ${actualWord} = ${isCorrect}`);
  });

  socket.on('end-round', () => {
    const room = rooms[socket.roomId];
    if (!canControlRoom(room, socket) || room.gameState !== 'playing') return;
    room.gameState = 'guessing';
    io.to(socket.roomId).emit('round-ended', {
      gameState:      'guessing',
      guessResults:   room.guessResults,
      scores:         room.scores,
      correctAnswers: room.players.map(pid => ({ playerId: pid, word: room.wordAssignments[pid], playerName: room.playerNames[pid] }))
    });
    console.log(`✋ Round ${room.roundNum} ended`);
  });

  socket.on('next-round', () => {
    const room = rooms[socket.roomId];
    if (!canControlRoom(room, socket) || room.gameState !== 'guessing') return;
    room.gameState = 'playing';
    room.roundNum++;
    room.guessResults = {};
    room.playersWhoGuessed = {};
    assignWordsToPlayers(room);
    room.startTime = Date.now();
    room.players.forEach(playerId => {
      io.to(playerId).emit('game-started', {
        gameState: 'playing', roundNum: room.roundNum,
        timerSecs: room.timerSecs, startTime: room.startTime,
        playerWords: room.players.map(pid => ({
          playerId: pid, word: pid === playerId ? '' : (room.wordAssignments[pid] || ''), playerName: room.playerNames[pid]
        }))
      });
    });
    console.log(`🔄 Starting round ${room.roundNum}`);
  });

  socket.on('admin-set-rank', async (data) => {
    if (!socket.isAdmin) return;
    const { targetUserId, rankName, rankColor } = data;
    if (!targetUserId) return;

    try {
      const target = await User.findById(targetUserId).exec();
      if (!target) return;

      target.rank = (!rankName || rankName.trim() === '')
        ? { name: null, color: '#f97316' }
        : { name: rankName.trim(), color: rankColor || '#f97316' };
      await target.save();

      const rank = target.rank.name ? { name: target.rank.name, color: target.rank.color } : null;

      const room = rooms[socket.roomId];
      if (room) {
        const targetSocketId = room.players.find(pid => room.userIds[pid] === targetUserId);
        if (targetSocketId) room.playerRanks[targetSocketId] = rank;
      }

      io.to(socket.roomId).emit('rank-updated', { userId: targetUserId, rank });
      socket.emit('admin-rank-success', { userId: targetUserId, rank, displayName: target.displayName });
      console.log(`🏅 Admin set rank for ${target.displayName}: ${rankName || 'removed'}`);
    } catch (err) {
      console.error('admin-set-rank error:', err);
      socket.emit('admin-rank-error', { message: 'อัปเดตยศไม่สำเร็จ' });
    }
  });

  socket.on('admin-search-user', async (data) => {
    if (!socket.isAdmin) return;
    const { email } = data;
    try {
      const user = await User.findOne({ email: email.trim() }).lean();
      if (!user) { socket.emit('admin-search-result', { error: 'ไม่พบผู้ใช้' }); return; }
      socket.emit('admin-search-result', { user: publicUserRow(user) });
    } catch (err) {
      socket.emit('admin-search-result', { error: 'ค้นหาไม่สำเร็จ' });
    }
  });

  socket.on('leave-room', () => handleLeave(socket));
  socket.on('disconnect', () => handleLeave(socket, true));
});

function handleLeave(socket, isDisconnect = false) {
  const room = rooms[socket.roomId];
  if (!room) return;

  const wasCreator = socket.id === room.creator;
  if (wasCreator) socket.to(socket.roomId).emit('host-left-room', { message: 'เจ้าของห้องออกจากห้องแล้ว' });

  room.players = room.players.filter(pid => pid !== socket.id);
  ['playerNames','scores','playerAvatars','playerRanks','userIds','wordAssignments','playersWhoGuessed'].forEach(k => {
    if (room[k]) delete room[k][socket.id];
  });
  Object.keys(room.guessResults || {}).forEach(k => {
    if (k.startsWith(socket.id+'_') || k.endsWith('_'+socket.id)) delete room.guessResults[k];
  });

  if (room.players.length === 0) {
    delete rooms[socket.roomId];
    console.log(`❌ Room ${socket.roomId} deleted`);
  } else {
    if (isDisconnect) {
      io.to(socket.roomId).emit('player-left', {
        playerId: socket.id, playerName: socket.playerName || 'ผู้เล่น',
        players: room.players.map(pid => ({ id: pid, name: room.playerNames[pid] })),
        scores: room.scores
      });
    } else {
      io.to(socket.roomId).emit('player-left', {
        playerId: socket.id, playerName: socket.playerName,
        players: room.players.map(pid => ({ id: pid, name: room.playerNames[pid] })),
        scores: room.scores
      });
      console.log(`👋 ${socket.playerName} left room ${socket.roomId}`);
    }
  }

  if (!isDisconnect) {
    socket.leave(socket.roomId);
    socket.roomId = null;
    socket.playerName = null;
  }
  console.log(`🔌 Player ${isDisconnect ? 'disconnected' : 'left'}: ${socket.id}`);
}

function broadcastRoomUpdate(room) {
  room.players.forEach(pid => {
    io.to(pid).emit('room-updated', {
      roomId: room.id,
      players: room.players.map(p => ({
        id:        p,
        name:      room.playerNames[p],
        avatarUrl: room.playerAvatars?.[p] || null,
        rank:      room.playerRanks?.[p] || null,
        userId:    room.userIds?.[p] || null,
        score:     room.scores[p]?.correct || 0
      })),
      isHost:      pid === room.creator,
      gameState:   room.gameState,
      selectedCat: room.selectedCat,
      timerSecs:   room.timerSecs,
      roundNum:    room.roundNum
    });
  });
}

function assignWordsToPlayers(room) {
  const catWords = CATEGORIES[room.selectedCat] || CATEGORIES['ปาร์ตี้'] || [];
  if (!room.usedWords) room.usedWords = new Set();

  let available = catWords.filter(w => !room.usedWords.has(w));

  if (available.length < room.players.length) {
    room.usedWords.clear();
    available = [...catWords];
    io.to(room.id).emit('words-reset', { message: 'ใช้คำครบแล้ว! ระบบรีเซ็ตคำใหม่ให้!' });
  }

  const shuffled = [...available].sort(() => Math.random() - 0.5);
  room.wordAssignments = {};

  room.players.forEach((pid, i) => {
    room.wordAssignments[pid] = shuffled[i % shuffled.length];
    room.usedWords.add(shuffled[i % shuffled.length]);
  });
}

// Cleanup empty rooms
setInterval(() => {
  Object.keys(rooms).forEach(roomId => {
    const room = rooms[roomId];
    if (!room || room.players.length === 0) { delete rooms[roomId]; return; }
    if (!room.players.includes(room.creator)) {
      room.players.forEach(pid => io.to(pid).emit('host-left-room', { message: 'ห้องถูกปิด' }));
      delete rooms[roomId];
    }
  });
}, 2 * 60 * 1000);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

