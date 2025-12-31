/**
 * Simple Board Game - Entry Point
 * Play button → Board with spinner
 */

const TOTAL_SPACES = 35;
let currentPosition = 0;
let isSpinning = false;

// DOM Elements
const playOverlay = document.getElementById('playOverlay') as HTMLDivElement;
const playButton = document.getElementById('playButton') as HTMLButtonElement;
const gameBoard = document.getElementById('gameBoard') as HTMLDivElement;
const boardPath = document.getElementById('boardPath') as HTMLDivElement;
const spinnerWheel = document.getElementById('spinnerWheel') as HTMLDivElement;
const spinButton = document.getElementById('spinButton') as HTMLDivElement;
const playerToken = document.getElementById('playerToken') as HTMLDivElement;
const scoreDisplay = document.getElementById('scoreDisplay') as HTMLDivElement;
const positionValue = document.getElementById('positionValue') as HTMLSpanElement;
const winScreen = document.getElementById('winScreen') as HTMLDivElement;
const playAgainBtn = document.getElementById('playAgainBtn') as HTMLButtonElement;

// Generate board spaces
function generateBoard(): void {
    boardPath.innerHTML = '';

    for (let i = 1; i <= TOTAL_SPACES; i++) {
        const space = document.createElement('div');
        space.className = 'board-space';
        space.dataset.position = String(i);

        // Color pattern
        if (i === TOTAL_SPACES) {
            space.classList.add('finish');
            space.textContent = '🏁';
        } else if (i % 3 === 0) {
            space.classList.add('red');
            space.textContent = String(i);
        } else if (i % 3 === 1) {
            space.classList.add('green');
            space.textContent = String(i);
        } else {
            space.classList.add('orange');
            space.textContent = String(i);
        }

        boardPath.appendChild(space);
    }
}

// Position player token on board
function positionToken(): void {
    if (currentPosition === 0) {
        // Start position - before the board
        playerToken.style.left = '10px';
        playerToken.style.top = '10px';
        return;
    }

    const targetSpace = boardPath.querySelector(`[data-position="${currentPosition}"]`) as HTMLElement;
    if (targetSpace) {
        const rect = targetSpace.getBoundingClientRect();
        const boardRect = boardPath.getBoundingClientRect();

        playerToken.style.left = `${rect.left - boardRect.left + rect.width / 2 - 20}px`;
        playerToken.style.top = `${rect.top - boardRect.top + rect.height / 2 - 20}px`;

        // Highlight current space
        document.querySelectorAll('.board-space').forEach(s => s.classList.remove('current'));
        targetSpace.classList.add('current');
    }
}

// Spin the wheel
function spin(): void {
    if (isSpinning) return;

    isSpinning = true;
    spinButton.style.pointerEvents = 'none';

    // Random result 1-6
    const result = Math.floor(Math.random() * 6) + 1;

    // Calculate rotation (5 full spins + target angle)
    const baseRotation = 360 * 5;
    const sectionAngle = 60;
    const targetAngle = (result - 1) * sectionAngle + sectionAngle / 2;
    const totalRotation = baseRotation + (360 - targetAngle);

    spinnerWheel.style.transform = `rotate(${totalRotation}deg)`;

    // After spin completes
    setTimeout(() => {
        isSpinning = false;
        spinButton.style.pointerEvents = 'auto';

        // Move player
        movePlayer(result);
    }, 3000);
}

// Move player by spaces
function movePlayer(spaces: number): void {
    const newPosition = Math.min(currentPosition + spaces, TOTAL_SPACES);

    // Animate movement space by space
    const moveStep = (): void => {
        if (currentPosition < newPosition) {
            currentPosition++;
            positionValue.textContent = String(currentPosition);
            positionToken();

            if (currentPosition < newPosition) {
                setTimeout(moveStep, 300);
            } else {
                checkWin();
            }
        }
    };

    moveStep();
}

// Check win condition
function checkWin(): void {
    if (currentPosition >= TOTAL_SPACES) {
        winScreen.classList.remove('hidden');
    }
}

// Reset game
function resetGame(): void {
    currentPosition = 0;
    positionValue.textContent = '0';
    spinnerWheel.style.transform = 'rotate(0deg)';
    winScreen.classList.add('hidden');
    positionToken();
}

// Start game
function startGame(): void {
    playOverlay.classList.add('hidden');
    gameBoard.classList.remove('hidden');
    scoreDisplay.classList.remove('hidden');
    generateBoard();
    positionToken();
}

// Event listeners
playButton.addEventListener('click', startGame);
spinButton.addEventListener('click', spin);
playAgainBtn.addEventListener('click', resetGame);

console.log('[BoardGame] Ready');
