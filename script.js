// DOM Elements
const runner = document.getElementById('runner');
const container = document.getElementById('game-container');
const scoreBoard = document.getElementById('score');
const distanceBoard = document.getElementById('distance');
const gameOverScreen = document.getElementById('game-over-screen');
const mainMenu = document.getElementById('main-menu');
const gameUI = document.getElementById('game-ui');
const tutorialText = document.getElementById('tutorial-text');
const finalDetails = document.getElementById('final-score-details');
const menuHighScore = document.getElementById('menu-high-score');
const countdownEl = document.getElementById('countdown'); // Ambil elemen countdown

// Game State
let isGameOver = false;
let gameStarted = false;
let isCountingDown = false; // Status baru untuk mengecek apakah sedang hitung mundur
let score = 0;
let distance = 0;
let obstacleSpeed = 8;
let obstacleTimeout;
let gameLoopId;

// Physics
let position = 0;
let velocity = 0;
const gravity = 1.5;
const jumpForce = 24;
let isJumping = false;

// Local Storage for High Score
let highScore = localStorage.getItem('skenaHighScore') || 0;
menuHighScore.innerText = formatDistance(highScore);

function startGame() {
    mainMenu.style.display = 'none';
    container.style.display = 'block';
    gameUI.style.display = 'block';
    gameStarted = true;
    resetGame();
}

function control(e) {
    if ((e.code === 'Space' || e.code === 'ArrowUp') && gameStarted) {
        // Pemain TIDAK bisa melompat kalau game sedang dalam hitung mundur
        if (!isJumping && !isGameOver && !isCountingDown) {
            velocity = jumpForce;
            isJumping = true;
        }
    }
}
document.addEventListener('keydown', control);

// Fungsi Hitung Mundur 3-2-1-Go!
function startCountdown(callback) {
    isCountingDown = true;
    let count = 3;
    
    // Tampilkan teks tutorial atas tengah
    tutorialText.classList.remove('hidden');

    function nextCount() {
        // Reset animasi dengan memicu reflow DOM
        countdownEl.classList.remove('countdown-animate');
        void countdownEl.offsetWidth; 

        if (count > 0) {
            countdownEl.innerText = count;
            countdownEl.classList.add('countdown-animate');
            count--;
            setTimeout(nextCount, 1000);
        } else if (count === 0) {
            countdownEl.innerText = "GO!";
            countdownEl.classList.add('countdown-animate');
            count--;
            setTimeout(nextCount, 1000);
        } else {
            countdownEl.innerText = "";
            isCountingDown = false;
            // Sembunyikan tutorial tepat saat game dimulai setelah "GO!"
            tutorialText.classList.add('hidden');
            callback(); // Jalankan game (memicu rintangan & meteran)
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
            isJumping = false;
        }
        runner.style.bottom = position + 'px';

        // Jarak baru berjalan jika TIDAK sedang hitung mundur
        if (!isCountingDown) {
            distance += (obstacleSpeed * 0.012);
            distanceBoard.innerText = formatDistance(distance);
        }

        gameLoopId = requestAnimationFrame(updatePhysics);
    }
}

function formatDistance(meters) {
    if (meters >= 1000) return (meters / 1000).toFixed(2) + " km";
    return Math.floor(meters) + " m";
}

function generateObstacles() {
    if (isGameOver || isCountingDown) return; // Jangan bikin rintangan saat hitung mundur

    let obstacleLeft = window.innerWidth;
    const obstacle = document.createElement('div');
    obstacle.classList.add('obstacle');
    container.appendChild(obstacle);
    obstacle.style.left = obstacleLeft + 'px';

    let obstacleLoop = setInterval(() => {
        if (isGameOver) { clearInterval(obstacleLoop); return; }

        let rRect = runner.getBoundingClientRect();
        let oRect = obstacle.getBoundingClientRect();

        // Hitbox Presisi
        if (rRect.right > oRect.left + 10 && rRect.left < oRect.right - 10 && rRect.bottom > oRect.top + 5) {
            clearInterval(obstacleLoop);
            endGame();
        }

        obstacleLeft -= obstacleSpeed;
        obstacle.style.left = obstacleLeft + 'px';

        if (obstacleLeft < -50) {
            clearInterval(obstacleLoop);
            obstacle.remove();
            score++;
            scoreBoard.innerText = score;
            
            if (score % 3 === 0) obstacleSpeed += 1.2;
        }
    }, 1000 / 60);

    let minTime = Math.max(700, 1500 - (score * 20));
    let maxTime = Math.max(1200, 2500 - (score * 30));
    let randomTime = Math.random() * (maxTime - minTime) + minTime;
    
    obstacleTimeout = setTimeout(generateObstacles, randomTime);
}

function endGame() {
    isGameOver = true;
    gameOverScreen.style.display = 'flex';
    
    let isNewRecord = false;
    if (distance > highScore) {
        highScore = distance;
        localStorage.setItem('skenaHighScore', highScore);
        isNewRecord = true;
        menuHighScore.innerText = formatDistance(highScore);
    }

    finalDetails.innerHTML = `
        ☕ KOPI DILEWATI: ${score}<br>
        🏃‍♂️ JARAK TEMPUH: ${formatDistance(distance)}<br>
        🏆 REKOR TERBAIK: ${formatDistance(highScore)}
    `;

    document.getElementById('new-record-tag').style.display = isNewRecord ? 'inline' : 'none';
    cancelAnimationFrame(gameLoopId);
    clearTimeout(obstacleTimeout);
}

function resetGame() {
    isGameOver = false;
    score = 0;
    distance = 0;
    obstacleSpeed = 8;
    position = 0;
    velocity = 0;
    isJumping = false;
    
    scoreBoard.innerText = "0";
    distanceBoard.innerText = "0 m";
    gameOverScreen.style.display = 'none';
    
    const obs = document.querySelectorAll('.obstacle');
    obs.forEach(o => o.remove());

    cancelAnimationFrame(gameLoopId);
    clearTimeout(obstacleTimeout);
    
    // Mulai animasi gravitasi karakter terlebih dahulu
    updatePhysics();
    
    // Jalankan hitung mundur, setelah selesai baru panggil penciptor rintangan kopi
    startCountdown(() => {
        generateObstacles();
    });
}

function quitToMenu() {
    isGameOver = true;
    gameStarted = false;
    isCountingDown = false;
    countdownEl.innerText = "";
    countdownEl.classList.remove('countdown-animate');
    
    cancelAnimationFrame(gameLoopId);
    clearTimeout(obstacleTimeout);
    
    gameOverScreen.style.display = 'none';
    container.style.display = 'none';
    gameUI.style.display = 'none';
    mainMenu.style.display = 'flex';
}