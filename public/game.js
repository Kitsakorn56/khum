const socket = io();
let guessingModalInstance = null;
let categoryModalInstance = null;
let confirmEndRoundModalInstance = null;

// เสียงเอฟเฟกต์ (Web Audio API - ไม่ต้องโหลดไฟล์)
let audioCtx = null;
function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}
function playSound(type) {
    try {
        const ctx = getAudioCtx();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'click') {
            osc.frequency.setValueAtTime(680, now);
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
            osc.start(now);
            osc.stop(now + 0.04);
        } else if (type === 'start') {
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(554, now + 0.06);
            osc.frequency.setValueAtTime(659, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'correct') {
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'end') {
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.frequency.setValueAtTime(392, now);
            osc.frequency.setValueAtTime(330, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.2);
        }
    } catch (e) { /* เบราว์เซอร์ปิดเสียงหรือไม่รองรับ */ }
}

let gameState = {
    myId: null,
    myName: '',
    roomId: '',
    isHost: false,
    players: [],
    playerNames: {},
    scores: {},
    gameState: 'lobby',
    roundNum: 0,
    selectedCat: 'ปาร์ตี้',
    timerSecs: 300,
    words: {},
    guessResults: {},
    guessSubmitted: {},
    timeUp: false
};

let timerInterval = null;
let timerRemaining = 0;

// Loading overlay (วิดีโอพื้นดำ = โปร่งใส จาก mix-blend-mode: screen)
function showLoading() {
    const el = document.getElementById('loadingOverlay');
    if (el) { el.classList.remove('hidden'); el.style.display = 'flex'; }
    const vid = document.getElementById('loadingVideo');
    if (vid) {
        try { vid.currentTime = 0; } catch (e) {}
        vid.play().catch(() => {});
    }
}
function hideLoading() {
    const el = document.getElementById('loadingOverlay');
    if (!el) return;
    el.classList.add('hidden');
    const vid = document.getElementById('loadingVideo');
    if (vid) { vid.pause(); vid.onended = null; }
    setTimeout(() => { el.style.display = 'none'; }, 150);
}

// UI Navigation
function goToHome() { playSound('click'); showScreen('home'); }
function goToCreateRoom() { playSound('click'); showScreen('create'); }
function goToJoinRoom() { playSound('click'); showScreen('join'); }

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${screenId}`).classList.add('active');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}

function toggleTheme() {
    playSound('click');
    const html = document.documentElement;
    const isDark = html.getAttribute('data-bs-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    html.setAttribute('data-bs-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    showToast(isDark ? '☀️ ธีมสว่าง' : '🌙 ธีมมืด');
}
function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
}
function initTheme() {
    const saved = localStorage.getItem('theme');
    const html = document.documentElement;
    if (saved === 'light' || saved === 'dark') {
        html.setAttribute('data-bs-theme', saved);
    }
    updateThemeIcon(html.getAttribute('data-bs-theme') || 'dark');
}

function openCategoryModal() {
    playSound('click');
    if (!categoryModalInstance) {
        categoryModalInstance = new bootstrap.Modal(document.getElementById('categoryModal'));
    }
    syncCategorySelection();
    categoryModalInstance.show();
}
function selectCategoryFromModal(cat) {
    playSound('click');
    gameState.selectedCat = cat;
    socket.emit('change-category', { category: cat });
    syncCategorySelection();
    if (categoryModalInstance) categoryModalInstance.hide();
    showToast('✅ เลือก: ' + cat);
}
function selectCategory(cat) {
    gameState.selectedCat = cat;
    socket.emit('change-category', { category: cat });
    syncCategorySelection();
    showToast('✅ เลือก: ' + cat);
}

function createRoom() {
    playSound('click');
    const name = document.getElementById('hostName').value.trim();
    if (!name) { showToast('⚠️ ใส่ชื่อก่อนนะ!'); return; }

    showLoading();
    gameState.myName = name;
    gameState.roomId = generateRoomCode();
    gameState.isHost = true;
    gameState.players = [];
    gameState.playerNames = {};
    gameState.myId = null; // reset เพื่อรอ your-player-id ใหม่

    socket.emit('join-room', {
        roomId: gameState.roomId,
        playerName: name,
        selectedCat: gameState.selectedCat,
        timerSecs: gameState.timerSecs
    });

    showLobbyHost();
    showToast('✅ สร้างห้องสำเร็จ!');
    setTimeout(hideLoading, 1800);
}

let pendingJoinRoom = false;
function joinRoom() {
    playSound('click');
    const name = document.getElementById('guestName').value.trim();
    const code = document.getElementById('roomCode').value.trim().toUpperCase();
    if (!name) { showToast('⚠️ ใส่ชื่อก่อนนะ!'); return; }
    if (code.length !== 4) { showToast('⚠️ รหัส 4 ตัวอักษร!'); return; }

    gameState.myName = name;
    gameState.roomId = code;
    gameState.isHost = false;
    pendingJoinRoom = true;
    showLoading();

    socket.emit('join-room', {
        roomId: code,
        playerName: name
    });
}

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function showLobbyHost() {
    document.getElementById('displayRoomCode').textContent = gameState.roomId;
    buildQR();
    syncCategorySelection();
    syncTimerSelection();
    updatePlayersList();
    showScreen('lobby');
}
const CATEGORY_IMAGES = { 'ปาร์ตี้': '/cat-party.png', 'ออฟฟิศ': '/cat-office.png' };
function syncCategorySelection() {
    const cat = gameState.selectedCat || 'ปาร์ตี้';
    const label = document.getElementById('selectedCategoryLabel');
    const img = document.getElementById('selectedCategoryImg');
    if (label) label.textContent = cat;
    if (img && CATEGORY_IMAGES[cat]) {
        img.src = CATEGORY_IMAGES[cat];
        img.alt = cat;
    }
    document.querySelectorAll('.category-modal-item').forEach(el => {
        el.classList.toggle('selected', el.getAttribute('data-value') === cat);
    });
}
function syncTimerSelection() {
    const t180 = document.getElementById('timer180');
    if (!t180) return;
    const secs = gameState.timerSecs;
    t180.checked = (secs === 180);
    document.getElementById('timer300').checked = (secs === 300);
    document.getElementById('timer480').checked = (secs === 480);
    const tCustom = document.getElementById('timerCustom');
    const customLabel = document.getElementById('timerCustomLabel');
    const isCustom = (secs !== 180 && secs !== 300 && secs !== 480);
    if (tCustom) tCustom.checked = isCustom;
    if (customLabel) {
        const mins = Math.max(1, Math.round(secs / 60));
        customLabel.textContent = isCustom ? `กำหนดเอง (${mins} นาที)` : 'กำหนดเอง';
    }
}

function showLobbyGuest() {
    document.getElementById('guestRoomCode').textContent = gameState.roomId;
    updateGuestPlayersList();
    showScreen('guest-lobby');
}

function buildQR() {
    const container = document.getElementById('qrContainer');
    container.innerHTML = '';
    new QRCode(container, {
        text: window.location.href.split('?')[0] + '?room=' + gameState.roomId,
        width: 96,
        height: 96,
        colorDark: '#000000',
        colorLight: '#ffffff'
    });
}

function copyRoomCode() {
    playSound('click');
    navigator.clipboard.writeText(gameState.roomId);
    showToast('📋 คัดลอก: ' + gameState.roomId);
}

function changeTimer(secs) {
    playSound('click');
    gameState.timerSecs = secs;
    socket.emit('change-timer', { timerSecs: secs });
    syncTimerSelection();
}

function openCustomTimer() {
    playSound('click');
    const prev = gameState.timerSecs || 300;
    const defaultMins = Math.max(1, Math.round(prev / 60));
    const input = prompt('ตั้งเวลาเอง (นาที):', String(defaultMins));
    if (input == null) { // cancel
        syncTimerSelection();
        return;
    }
    const mins = parseInt(String(input).trim(), 10);
    if (!Number.isFinite(mins) || mins < 1 || mins > 60) {
        showToast('⚠️ ใส่นาที 1 - 60');
        syncTimerSelection();
        return;
    }
    changeTimer(mins * 60);
    showToast(`⏱️ ตั้งเวลา: ${mins} นาที`);
}

function updatePlayersList() {
    const list = document.getElementById('playersList');
    document.getElementById('playerCount').textContent = gameState.players.length;
    list.innerHTML = gameState.players.map(pid => `
        <div class="card card-body tw-p-2 tw-mb-2" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
            <div class="d-flex align-items-center gap-2">
                <div class="rounded-circle bg-primary tw-p-2" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-user text-white"></i>
                </div>
                <span class="flex-grow-1">${gameState.playerNames[pid]}${pid === gameState.myId ? ' <small class="text-muted">(คุณ)</small>' : ''}</span>
                <span class="badge bg-success"><i class="fas fa-check"></i></span>
            </div>
        </div>
    `).join('');
}

function updateGuestPlayersList() {
    const list = document.getElementById('guestPlayersList');
    document.getElementById('guestPlayerCount').textContent = gameState.players.length;
    list.innerHTML = gameState.players.map(pid => `
        <div class="card card-body tw-p-2 tw-mb-2" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
            <div class="d-flex align-items-center gap-2">
                <div class="rounded-circle bg-primary tw-p-2" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-user text-white"></i>
                </div>
                <span>${gameState.playerNames[pid]}${pid === gameState.myId ? ' <small class="text-muted">(คุณ)</small>' : ''}</span>
            </div>
        </div>
    `).join('');
}

function startGame() {
    playSound('click');
    if (gameState.players.length < 2) {
        showToast('⚠️ ต้องมี 2+ คน!');
        return;
    }
    playSound('start');
    socket.emit('start-game');
}

function renderGameScreen() {
    document.getElementById('hostControls').style.display = gameState.isHost ? 'block' : 'none';

    const grid = document.getElementById('wordsGrid');
    grid.innerHTML = gameState.players.map(pid => {
        const isMe = pid === gameState.myId;
        const word = isMe ? '' : (gameState.words[pid] || '');
        const displayWord = isMe ? 'คำของฉัน (ห้ามดู)' : (word || '?');
        return `
            <div class="col-md-6 col-lg-4">
                <div class="word-card-wrapper ${isMe ? 'mine' : ''}">
                    <div class="word-card">
                        <h4 class="tw-mb-0 word-text">${displayWord}</h4>
                    </div>
                    <div class="word-card-footer">
                        <i class="fas fa-user"></i>
                        <span class="word-label">${gameState.playerNames[pid] || '?'}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    updateScoresDisplay();
    showScreen('game');
}

function updateScoresDisplay() {
    // ไม่แสดงคะแนน
}

function showConfirmEndRound() {
    playSound('click');
    if (!confirmEndRoundModalInstance) {
        confirmEndRoundModalInstance = new bootstrap.Modal(document.getElementById('confirmEndRoundModal'));
    }
    confirmEndRoundModalInstance.show();
}
function doEndRound() {
    playSound('end');
    if (confirmEndRoundModalInstance) confirmEndRoundModalInstance.hide();
    socket.emit('end-round', { timeUp: gameState.timeUp === true });
}
function updateEndRoundButton() {
    const btn = document.getElementById('endRoundBtn');
    const text = document.getElementById('endRoundBtnText');
    if (!btn || !text) return;
    const n = gameState.players.length;
    const count = gameState.players.filter(pid => gameState.guessSubmitted[pid]).length;
    if (gameState.timeUp)
        text.textContent = `หมดเวลา (${count}/${n} ทายแล้ว) — สิ้นสุดรอบ`;
    else if (gameState.allHaveGuessed === true)
        text.textContent = `ทุกคนทายครบ — สิ้นสุดรอบ`;
    else
        text.textContent = `สิ้นสุดรอบ / เฉลยคำ (${count}/${n} ทายแล้ว)`;
}

function renderGuessingScreen() {
    const container = document.getElementById('guessingCards');
    const isRevealPhase = gameState.revealPhase === true;

    container.innerHTML = gameState.players.map(targetPid => {
        const isMe = targetPid === gameState.myId;
        const actualWord = gameState.words[targetPid];

        // --- ช่วงเฉลย (หลัง Host กด สิ้นสุดรอบ) ---
        if (isRevealPhase) {
            const label = isMe ? 'คำบนหัวของฉัน' : gameState.playerNames[targetPid];
            return `
                <div class="card tw-mb-3" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
                    <div class="card-body">
                        <p class="card-title fw-bold tw-mb-2">${label}</p>
                        <p class="tw-mb-0"><strong>${actualWord || '?'}</strong></p>
                    </div>
                </div>
            `;
        }

        // --- ช่วงทาย (ก่อนโฮสต์กดสิ้นสุดรอบ) ---
        if (isMe) {
            const myResult = gameState.guessResults[`${gameState.myId}_${gameState.myId}`];
            if (myResult) {
                // ทายแล้ว — แสดง pending
                return `
                    <div class="card tw-mb-3 border-warning" style="background: rgba(249, 115, 22, 0.1);">
                        <div class="card-body">
                            <p class="card-title fw-bold tw-mb-1">ทายคำบนหัวของตัวเอง</p>
                            <p class="text-muted tw-mb-0">✔ ส่งคำทายแล้ว รอโฮสต์สิ้นสุดรอบ...</p>
                        </div>
                    </div>
                `;
            }
            return `
                <div class="card tw-mb-3 border-warning" style="background: rgba(249, 115, 22, 0.1);">
                    <div class="card-body">
                        <p class="card-title fw-bold tw-mb-3">ทายคำบนหัวของตัวเอง</p>
                        <div class="guess-input-row">
                            <input type="text" id="guess-input" placeholder="ทายคำ..." class="form-control">
                            <button type="button" id="guess-btn" class="btn btn-orange tw-transition tw-hover-scale" onclick="submitGuess('${targetPid}')"><i class="fas fa-paper-plane"></i></button>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="card tw-mb-3" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); opacity: 0.6;">
                <div class="card-body">
                    <small class="text-muted">${gameState.guessSubmitted[targetPid] ? '✔ ทายแล้ว' : 'รอให้ ' + gameState.playerNames[targetPid] + ' ทาย...'}</small>
                </div>
            </div>
        `;
    }).join('');

    // ปุ่ม modal footer
    const hostNextBtn = document.getElementById('hostNextBtn');
    const closeGuessingBtn = document.getElementById('closeGuessingBtn');
    const hostEndBtn = document.getElementById('hostEndRoundModalBtn');
    if (isRevealPhase) {
        if (hostNextBtn) hostNextBtn.style.display = gameState.isHost ? 'block' : 'none';
        if (closeGuessingBtn) closeGuessingBtn.style.display = !gameState.isHost ? 'block' : 'none';
        if (hostEndBtn) hostEndBtn.style.display = 'none';
    } else {
        if (hostNextBtn) hostNextBtn.style.display = 'none';
        if (closeGuessingBtn) closeGuessingBtn.style.display = 'none';
        if (hostEndBtn) hostEndBtn.style.display = gameState.isHost ? 'block' : 'none';
    }

    if (!guessingModalInstance) {
        guessingModalInstance = new bootstrap.Modal(document.getElementById('guessingModal'), { backdrop: 'static', keyboard: false });
    }
    const modalEl = document.getElementById('guessingModal');
    if (modalEl && !modalEl.classList.contains('show')) {
        guessingModalInstance.show();
    }
}

function submitGuess(targetPid) {
    playSound('click');
    const input = document.getElementById('guess-input');
    if (!input || input.disabled) return; // ป้องกันกดซ้ำ
    const btn = document.getElementById('guess-btn');
    const guess = input.value.trim();
    if (!guess) { showToast('⚠️ ใส่คำทายด้วย!'); return; }

    socket.emit('submit-guess', { targetPlayerId: targetPid, guess });
    input.value = '';
    input.disabled = true;
    if (btn) btn.disabled = true;
}

function nextRound() {
    playSound('click');
    if (guessingModalInstance) guessingModalInstance.hide();
    socket.emit('next-round');
}

function closeGuessingModal() {
    playSound('click');
    if (guessingModalInstance) guessingModalInstance.hide();
}

function leaveLobby() {
    playSound('click');
    socket.emit('leave-room');
    stopTimer();
    gameState = { myId: socket.id, myName: '', roomId: '', isHost: false, players: [], playerNames: {}, scores: {}, gameState: 'lobby', roundNum: 0, selectedCat: gameState.selectedCat || 'ปาร์ตี้', timerSecs: gameState.timerSecs || 300 };
    showScreen('home');
    showToast('👋 ออกจากห้องแล้ว');
}

function leaveGame() {
    playSound('click');
    socket.emit('leave-room');
    stopTimer();
    closeGuessingModal();
    gameState = { myId: socket.id, myName: '', roomId: '', isHost: false, players: [], playerNames: {}, scores: {}, gameState: 'lobby', roundNum: 0, selectedCat: gameState.selectedCat || 'ปาร์ตี้', timerSecs: gameState.timerSecs || 300 };
    showScreen('home');
    showToast('👋 ออกจากเกมแล้ว');
}

function formatTimer(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
}
function startTimer(seconds, startTime) {
    stopTimer();
    const endAt = startTime ? startTime + seconds * 1000 : (Date.now() + seconds * 1000);
    function tick() {
        const now = Date.now();
        timerRemaining = Math.max(0, Math.ceil((endAt - now) / 1000));
        document.getElementById('timerText').textContent = formatTimer(timerRemaining);
        const elapsed = seconds - timerRemaining;
        const progress = (elapsed / seconds) * 100;
        const disp = document.querySelector('.timer-display');
        if (disp) disp.style.setProperty('--progress', progress + '%');
        if (timerRemaining <= 0) {
            playSound('end');
            stopTimer();
            gameState.timeUp = true;
            updateEndRoundButton();
        }
    }
    tick();
    timerInterval = setInterval(tick, 1000);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
}

// Socket Events
socket.on('your-player-id', (id) => {
    gameState.myId = id;
    if (gameState.isHost) updatePlayersList();
    else updateGuestPlayersList();
});

socket.on('join-error', (data) => {
    pendingJoinRoom = false;
    hideLoading();
    showToast(data && data.message ? data.message : '⚠️ ไม่พบห้องนี้');
});

socket.on('room-updated', (data) => {
    if (data.isHost !== undefined) gameState.isHost = data.isHost;

    if (data.players && Array.isArray(data.players)) {
        gameState.players = data.players.map(p => p.id);
        data.players.forEach(p => {
            gameState.playerNames[p.id] = p.name;
            gameState.scores[p.id] = gameState.scores[p.id] || { correct: 0, wrong: 0, total: 0 };
        });
        if (gameState.isHost) updatePlayersList();
        else {
            updateGuestPlayersList();
            if (pendingJoinRoom) {
                pendingJoinRoom = false;
                showLobbyGuest();
                showToast('✅ เข้าห้องสำเร็จ!');
                setTimeout(hideLoading, 1800);
            }
        }
    }

    if (data.selectedCat) gameState.selectedCat = data.selectedCat;
    if (data.timerSecs) gameState.timerSecs = data.timerSecs;
    if (data.roundNum !== undefined) gameState.roundNum = data.roundNum;
    if (gameState.isHost) {
        syncCategorySelection();
        syncTimerSelection();
    }
});

socket.on('game-started', (data) => {
    gameState.roundNum = data.roundNum;
    gameState.timerSecs = data.timerSecs;
    gameState.gameState = 'playing';
    gameState.revealPhase = false; // reset ทุกรอบ
    gameState.words = {};
    gameState.guessResults = {};
    gameState.guessSubmitted = {};
    gameState.allHaveGuessed = false;
    gameState.timeUp = false;

    if (data.playerWords && Array.isArray(data.playerWords)) {
        data.playerWords.forEach(pw => {
            if (pw.playerId !== gameState.myId) {
                gameState.words[pw.playerId] = pw.word;
            }
        });
    }

    document.getElementById('roundText').textContent = `รอบที่ ${data.roundNum}`;
    renderGameScreen();
    updateEndRoundButton();
    closeGuessingModal();
    startTimer(data.timerSecs, data.startTime);
});

socket.on('round-ended', (data) => {
    stopTimer();
    playSound('end');
    gameState.revealPhase = true;
    gameState.guessResults = data.guessResults || {};
    if (data.correctAnswers && Array.isArray(data.correctAnswers)) {
        data.correctAnswers.forEach(ca => {
            gameState.words[ca.playerId] = ca.word; // เก็บทุกคน รวมตัวเอง
        });
    }
    if (data.scores) gameState.scores = data.scores;
    renderGuessingScreen();
});

socket.on('guess-received', (data) => {
    if (data.guessResult.correct && data.guessResult.guesserId === gameState.myId) playSound('correct');
    if (data.guessResult.guesserId === data.guessResult.targetPlayerId)
        gameState.guessSubmitted[data.guessResult.guesserId] = true;
    if (data.guessResult.guesserId === gameState.myId || data.guessResult.targetPlayerId === gameState.myId) {
        gameState.guessResults[data.resultKey] = data.guessResult;
    }
    renderGuessingScreen();
    if (data.scores) gameState.scores = data.scores;
    if (data.allHaveGuessed !== undefined) gameState.allHaveGuessed = data.allHaveGuessed;
    updateScoresDisplay();
    updateEndRoundButton();
    // เปิด modal ให้ทายคำตัวเองทันทีที่ทุกคนทาย (ยังไม่ reveal)
    if (data.allHaveGuessed && !gameState.revealPhase) {
        gameState.revealPhase = false;
        renderGuessingScreen();
    }
});

socket.on('player-left', (data) => {
    if (data.players && Array.isArray(data.players)) {
        gameState.players = data.players.map(p => p.id);
        data.players.forEach(p => { gameState.playerNames[p.id] = p.name; });
    }
    if (data.scores) gameState.scores = data.scores;

    if (gameState.isHost) updatePlayersList();
    else updateGuestPlayersList();

    showToast(`👋 ${data.playerName} ออก`);
});

socket.on('host-changed', (data) => {
    if (data.newHostId === gameState.myId) {
        gameState.isHost = true;
        showToast('👑 คุณเป็นเจ้าของห้องแล้ว!');
    }
});

socket.on('host-left-room', (data) => {
    stopTimer();
    closeGuessingModal();
    socket.emit('leave-room');
    gameState.roomId = '';
    gameState.isHost = false;
    gameState.players = [];
    gameState.playerNames = {};
    gameState.gameState = 'lobby';
    gameState.myId = socket.id;
    showScreen('home');
    showToast(data.message || 'เจ้าของห้องออกจากห้องแล้ว');
});

// ผู้เล่นคนนี้ใช้ครบทุกคำในหมวด แล้วระบบรีเซ็ตคำใหม่ให้
socket.on('words-reset', (data) => {
    showResetPopup(data && data.message
        ? data.message
        : 'คุณเล่นครบทุกคำแล้ว! ระบบจะทำการรีเซ็ตคำใหม่ทั้งหมดให้คุณ');
});

function showResetPopup(message) {
    const overlay = document.createElement('div');
    overlay.classList.add('reset-overlay');
    overlay.style.cssText = [
        'position: fixed',
        'inset: 0',
        'background: rgba(0,0,0,0.6)',
        'display: flex',
        'align-items: center',
        'justify-content: center',
        'z-index: 9999'
    ].join('; ');

    const box = document.createElement('div');
    box.style.cssText = [
        'background: white',
        'border-radius: 16px',
        'padding: 32px 24px',
        'max-width: 320px',
        'width: 90%',
        'text-align: center',
        'box-shadow: 0 8px 32px rgba(0,0,0,0.3)'
    ].join('; ');

    box.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
        <h3 style="margin: 0 0 12px; font-size: 20px; color: #1a1a1a;">เล่นครบทุกคำแล้ว!</h3>
        <p style="margin: 0 0 24px; color: #555; line-height: 1.5;">${message}</p>
        <button type="button" style="
            background: #6c47ff;
            color: white;
            border: none;
            padding: 12px 32px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            width: 100%;
        ">รับทราบ</button>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // ปุ่มรับทราบ
    const btn = box.querySelector('button');
    if (btn) {
        btn.addEventListener('click', () => overlay.remove());
    }

    // กดด้านนอกกล่องเพื่อปิดได้
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

// โหลดธีม + auto-fill room จาก URL (รอ DOM พร้อม) + ซ่อนหน้า loading หลังโหลดเสร็จ
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    if (roomCode) {
        const el = document.getElementById('roomCode');
        if (el) { el.value = roomCode; goToJoinRoom(); }
    }
    // ซ่อนหน้า loading หลังจาก DOM พร้อมแล้วเล็กน้อย (เวลาสั้น ๆ เวลารีเฟรช)
    setTimeout(hideLoading, 1800);
});

