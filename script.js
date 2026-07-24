// ================= INTERAKTIF AUDIO ENGINE =================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioContext;

function initAudio() { 
    if (!audioContext) {
        audioContext = new AudioCtx();
    }
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

function playSfx(frequency, type, duration, volume = 0.1) {
    if (!audioContext) return;
    try {
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);
        osc.connect(gainNode); 
        gainNode.connect(audioContext.destination);
        osc.start(); 
        osc.stop(audioContext.currentTime + duration);
    } catch(e) {}
}

const runner = document.getElementById('runner');
const charBaseBody = document.getElementById('char-base-body');
const hairExtension = document.getElementById('hair-extension');
const container = document.getElementById('game-container');
const scoreBoard = document.getElementById('score');
const distanceBoard = document.getElementById('distance');
const gameOverScreen = document.getElementById('game-over-screen');
const mainMenu = document.getElementById('main-menu');
const gameUI = document.getElementById('game-ui');
const tutorialText = document.getElementById('tutorial-text');
const finalDetails = document.getElementById('final-score-details');
const menuHighScore = document.getElementById('menu-high-score');
const countdownEl = document.getElementById('countdown');
const liveRankEl = document.getElementById('live-rank');
const rankSidebar = document.getElementById('rank-sidebar');
const newRecordTag = document.getElementById('new-record-tag');
const infoModal = document.getElementById('info-modal');

const rankUpBoxGameOver = document.getElementById('rank-up-box-gameover');
const rankupShimmerBadge = document.getElementById('rankup-shimmer-badge');

const layerMountains = document.getElementById('layer-mountains');
const layerBirds = document.getElementById('layer-birds');
const layerCafes = document.getElementById('layer-cafes');
const layerTrees = document.getElementById('layer-trees');
const layerRoad = document.getElementById('layer-road');

let isGameOver = false, gameStarted = false, isCountingDown = false;
let score = 0, distance = 0, obstacleSpeed = 8, obstacleTimeout, gameLoopId;
let bgPositions = { mountains: 0, birds: 0, cafes: 0, trees: 0, road: 0 };

let position = 0, velocity = 0;
const gravity = 1.4, jumpForce = 22;
let isJumping = false, selectedGender = "cowo", rankSebelumLari = "🥴 Plenger";

let highScore = localStorage.getItem('skenaRecalibratedHS') || 0;
let lastSavedRank = localStorage.getItem('skenaRecalibratedRank') || "";

menuHighScore.innerText = formatDistance(highScore);
highlightMenuRankBoard();

function toggleSidebar(isOpen) {
    initAudio();
    playSfx(isOpen ? 450 : 350, 'sine', 0.08, 0.1);
    if (isOpen) rankSidebar.classList.add('open');
    else rankSidebar.classList.remove('open');
}

function toggleModal(isOpen) {
    initAudio();
    playSfx(isOpen ? 500 : 300, 'sine', 0.08, 0.1);
    infoModal.style.display = isOpen ? 'flex' : 'none';
}

function selectGender(gender) {
    initAudio();
    selectedGender = gender;
    playSfx(523.25, 'sine', 0.06, 0.12); 
    
    const btnCowo = document.getElementById('btn-char-cowo');
    const btnCewe = document.getElementById('btn-char-cewe');

    if (gender === 'cowo') {
        btnCowo.classList.add('active');
        btnCewe.classList.remove('active');
        charBaseBody.className = "char-body cowo-style";
        hairExtension.style.display = 'none';
    } else {
        btnCewe.classList.add('active');
        btnCowo.classList.remove('active');
        charBaseBody.className = "char-body cewe-style";
        hairExtension.style.display = 'block';
    }
}

function highlightMenuRankBoard() {
    for (let i = 0; i <= 6; i++) {
        document.getElementById(`rank-item-${i}`).classList.remove('active-rank');
        let tag = document.getElementById(`rank-item-${i}`).querySelector('.active-tag');
        if (tag) tag.remove();
    }

    let rankIndex = 0;
    if (lastSavedRank.includes("Pemula")) rankIndex = 1;
    else if (lastSavedRank.includes("Fomo")) rankIndex = 2;
    else if (lastSavedRank.includes("Otw Kalcer")) rankIndex = 3;
    else if (lastSavedRank.includes("Kalcer Abies")) rankIndex = 4;
    else if (lastSavedRank.includes("Starboy")) rankIndex = 5;
    else if (lastSavedRank.includes("Dewa Skena")) rankIndex = 6;

    if (lastSavedRank) {
        let targetRow = document.getElementById(`rank-item-${rankIndex}`);
        if (targetRow) {
            targetRow.classList.add('active-rank');
            let activeBadge = document.createElement('span');
            activeBadge.className = 'active-tag';
            activeBadge.innerText = ' ➔ [LU DI SINI]';
            activeBadge.style.color = '#ffb84d';
            targetRow.appendChild(activeBadge);
        }
    }
}

function calculateRank(meters) {
    let m = Math.floor(meters);
    if (m >= 5000) return "👑 Dewa Skena";
    if (m >= 4000) return "✨ Starboy";
    if (m >= 2000) return "⚡ Kalcer Abies";
    if (m >= 1650) return "☕ Otw Kalcer";
    if (m >= 1000) return "📱 Fomo";
    if (m >= 500) return "🔰 Pemula";
    return "🥴 Plenger";
}

function updateEnvironmentTheme(meters) {
    let m = Math.floor(meters);
    container.classList.remove('theme-sore', 'theme-senja', 'theme-malam');
    if (m >= 4000) container.classList.add('theme-malam');
    else if (m >= 1650) container.classList.add('theme-senja');
    else container.classList.add('theme-sore');
}

function startGame() {
    initAudio();
    toggleSidebar(false);

    // MINTA BROWSER MASUK MODE FULLSCREEN & LOCK LANDSCAPE
    let elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => console.log(err));
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }

    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(err => {
            console.log("Penguncian orientasi tidak didukung/diizinkan:", err);
        });
    }

    mainMenu.style.display = 'none';
    container.style.display = 'block';
    gameUI.style.display = 'block';
    gameStarted = true;
    rankSebelumLari = lastSavedRank || "🥴 Plenger";
    resetGame();
}

function triggerJump() {
    if (!isJumping && !isGameOver && !isCountingDown && gameStarted) {
        initAudio();
        playSfx(293.66, 'triangle', 0.14, 0.18); 
        velocity = jumpForce;
        isJumping = true;
        runner.className = 'anim-jumping';
    }
}

function startCountdown(callback) {
    isCountingDown = true;
    let count = 3;
    tutorialText.classList.remove('hidden');
    layerBirds.classList.remove('birds-flying'); 
    runner.className = ''; 

    function nextCount() {
        countdownEl.classList.remove('countdown-animate');
        void countdownEl.offsetWidth; 

        if (count > 0) {
            playSfx(440, 'sine', 0.1, 0.1); 
            countdownEl.innerText = count;
            countdownEl.classList.add('countdown-animate');
            count--;
            setTimeout(nextCount, 1000);
        } else if (count === 0) {
            playSfx(880, 'triangle', 0.2, 0.15); 
            countdownEl.innerText = "GO!";
            countdownEl.classList.add('countdown-animate');
            count--;
            setTimeout(nextCount, 1000);
        } else {
            countdownEl.innerText = "";
            isCountingDown = false;
            tutorialText.classList.add('hidden');
            layerBirds.classList.add('birds-flying'); 
            runner.className = 'anim-running';
            callback();
        }
    }
    nextCount();
}

function updatePhysics() {
    if (!isGameOver) {
        position += velocity;
        velocity -= gravity;

        if (position <= 0) {
            position = 0;
            velocity = 0;
            if (isJumping) {
                isJumping = false;
                runner.className = 'anim-running';
                playSfx(140, 'triangle', 0.05, 0.12); 
            }
        }
        runner.style.bottom = (40 + position) + 'px';

        if (!isCountingDown) {
            distance += (obstacleSpeed * 0.015);
            distanceBoard.innerText = formatDistance(distance);

            let currentRank = calculateRank(distance);
            liveRankEl.innerText = currentRank;
            updateEnvironmentTheme(distance);

            bgPositions.road -= obstacleSpeed;
            bgPositions.trees -= (obstacleSpeed * 0.6);
            bgPositions.cafes -= (obstacleSpeed * 0.25); 
            bgPositions.birds -= (obstacleSpeed * 0.4);   
            bgPositions.mountains -= (obstacleSpeed * 0.05);

            layerRoad.style.backgroundPositionX = bgPositions.road + 'px';
            layerTrees.style.backgroundPositionX = bgPositions.trees + 'px';
            layerCafes.style.backgroundPositionX = bgPositions.cafes + 'px';
            layerBirds.style.backgroundPositionX = bgPositions.birds + 'px';
            layerMountains.style.backgroundPositionX = bgPositions.mountains + 'px';
        }

        gameLoopId = requestAnimationFrame(updatePhysics);
    }
}

function formatDistance(meters) {
    if (meters >= 1000) return (meters / 1000).toFixed(2) + " km";
    return Math.floor(meters) + " m";
}

function generateObstacles() {
    if (isGameOver || isCountingDown) return;

    let obstacleLeft = window.innerWidth;
    const obstacle = document.createElement('div');
    obstacle.classList.add('obstacle');
    container.appendChild(obstacle);
    obstacle.style.left = obstacleLeft + 'px';

    let obstacleLoop = setInterval(() => {
        if (isGameOver) { clearInterval(obstacleLoop); return; }

        let rRect = runner.getBoundingClientRect();
        let oRect = obstacle.getBoundingClientRect();

        if (rRect.right > oRect.left + 14 && rRect.left < oRect.right - 14 && rRect.bottom > oRect.top + 6) {
            clearInterval(obstacleLoop);
            obstacle.remove();
            endGame();
        }

        obstacleLeft -= obstacleSpeed;
        obstacle.style.left = obstacleLeft + 'px';

        if (obstacleLeft < -50) {
            clearInterval(obstacleLoop);
            obstacle.remove();
            score++;
            scoreBoard.innerText = score;
            playSfx(783.99, 'sine', 0.08, 0.08); 
            setTimeout(() => { playSfx(1046.50, 'sine', 0.1, 0.06); }, 50); 
            if (score % 3 === 0) obstacleSpeed += 0.8;
        }
    }, 1000 / 60);

    let minTime = Math.max(750, 1500 - (score * 20));
    let maxTime = Math.max(1200, 2400 - (score * 30));
    let randomTime = Math.random() * (maxTime - minTime) + minTime;
    
    obstacleTimeout = setTimeout(generateObstacles, randomTime);
}

function endGame() {
    isGameOver = true;
    cancelAnimationFrame(gameLoopId);
    clearTimeout(obstacleTimeout);
    
    playSfx(196, 'sawtooth', 0.2, 0.25); 
    setTimeout(() => { playSfx(98, 'triangle', 0.3, 0.3); }, 80);

    gameOverScreen.style.display = 'flex';
    layerBirds.classList.remove('birds-flying');
    runner.className = ''; 
    
    let finalRank = calculateRank(distance);
    
    if (finalRank !== rankSebelumLari && Math.floor(distance) >= 500) {
        rankUpBoxGameOver.style.display = "block";
        rankupShimmerBadge.innerText = finalRank;
        setTimeout(() => { playSfx(1318.51, 'sine', 0.4, 0.15); }, 200); 
    } else {
        rankUpBoxGameOver.style.display = "none";
    }

    localStorage.setItem('skenaRecalibratedRank', finalRank);
    lastSavedRank = finalRank;

    if (distance > highScore) {
        highScore = distance;
        localStorage.setItem('skenaRecalibratedHS', highScore);
        menuHighScore.innerText = formatDistance(highScore);
        newRecordTag.style.display = 'inline-block';
    } else {
        newRecordTag.style.display = 'none';
    }

    finalDetails.innerHTML = `Kamu membawa pulang <b>${score} Gelas Kopi</b><br>dengan total penjelajahan aspal sejauh <b>${formatDistance(distance)}</b>.<br><br>Peringkat Skenamu saat ini: <span style="color:#ffb84d; font-weight:bold;">${finalRank}</span>`;
}

function resetGame() {
    initAudio();
    playSfx(523.25, 'triangle', 0.1, 0.15);
    gameOverScreen.style.display = 'none';
    
    document.querySelectorAll('.obstacle').forEach(el => el.remove());
    
    score = 0;
    distance = 0;
    obstacleSpeed = 8;
    isGameOver = false;
    position = 0;
    velocity = 0;
    isJumping = false;

    scoreBoard.innerText = score;
    distanceBoard.innerText = "0 m";
    runner.style.bottom = '40px';
    
    cancelAnimationFrame(gameLoopId);
    clearTimeout(obstacleTimeout);

    startCountdown(() => {
        updatePhysics();
        generateObstacles();
    });
}

function quitToMenu() {
    initAudio();
    playSfx(329.63, 'sine', 0.12, 0.1);
    gameOverScreen.style.display = 'none';
    container.style.display = 'none';
    gameUI.style.display = 'none';
    gameStarted = false;
    mainMenu.style.display = 'flex';
    highlightMenuRankBoard();
}

// INPUT EVENT CONTROLLERS
window.addEventListener('keydown', (e) => { 
    if (e.code === 'Space' || e.code === 'ArrowUp') { 
        e.preventDefault(); 
        triggerJump(); 
    } 
});
container.addEventListener('mousedown', (e) => { 
    if (e.target.tagName !== 'BUTTON') triggerJump(); 
});
container.addEventListener('touchstart', (e) => { 
    if (e.target.tagName !== 'BUTTON') { 
        e.preventDefault(); 
        triggerJump(); 
    } 
});
function toggleFullscreen() {
    let doc = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (doc.requestFullscreen) doc.requestFullscreen();
      else if (doc.webkitRequestFullscreen) doc.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
}