/**
 * Board Logic Module
 * Handles board generation, spinning, movement, and positioning
 */

export const board = {
    config: {
        totalSpaces: 35,
        specialSpaces: {
            7: { type: 'bonus', label: 'Make a Snowball', action: 'forward', spaces: 1 },
            14: { type: 'bonus', label: 'Buy Candy', action: 'forward', spaces: 1 },
            21: { type: 'bonus', label: 'Go Sledding', action: 'forward', spaces: 2 },
            28: { type: 'bonus', label: 'Go Ice Skating', action: 'forward', spaces: 1 },
            35: { type: 'bonus', label: 'Make a Snowman', action: 'forward', spaces: 0 }
        }
    },

    positions: [
        { x: 70, y: 520 }, { x: 140, y: 520 }, { x: 210, y: 500 }, { x: 280, y: 480 },
        { x: 350, y: 460 }, { x: 420, y: 440 }, { x: 490, y: 420 }, { x: 560, y: 400 },
        { x: 630, y: 380 }, { x: 700, y: 400 }, { x: 760, y: 440 }, { x: 810, y: 400 },
        { x: 840, y: 350 }, { x: 850, y: 290 }, { x: 840, y: 230 }, { x: 810, y: 180 },
        { x: 770, y: 140 }, { x: 720, y: 110 }, { x: 660, y: 90 }, { x: 600, y: 75 },
        { x: 540, y: 70 }, { x: 480, y: 75 }, { x: 420, y: 85 }, { x: 360, y: 100 },
        { x: 300, y: 120 }, { x: 250, y: 150 }, { x: 210, y: 190 }, { x: 200, y: 240 },
        { x: 220, y: 290 }, { x: 270, y: 320 }, { x: 330, y: 300 }, { x: 390, y: 270 },
        { x: 450, y: 240 }, { x: 510, y: 210 }, { x: 570, y: 190 }
    ],

    generate() {
        const dom = SpeechGame.dom;
        const token = dom.playerToken;
        dom.boardPath.innerHTML = '';

        for (let i = 1; i <= this.config.totalSpaces; i++) {
            const space = document.createElement('div');
            const position = this.positions[i - 1];

            let colorClass = 'green';
            if (i === this.config.totalSpaces) {
                colorClass = 'finish';
            } else if (this.config.specialSpaces[i]) {
                colorClass = 'orange';
            } else if (i % 7 === 0) {
                colorClass = 'red';
            }

            space.className = 'board-space ' + colorClass;
            space.setAttribute('data-space', i);
            space.textContent = i;
            space.style.left = position.x + 'px';
            space.style.top = position.y + 'px';

            if (this.config.specialSpaces[i]) {
                const special = this.config.specialSpaces[i];
                const label = document.createElement('div');
                label.className = 'space-label';
                label.textContent = special.label + ' - Go Forward ' + special.spaces + ' Space' + (special.spaces > 1 ? 's' : '');
                space.appendChild(label);
            }

            dom.boardPath.appendChild(space);
        }

        if (token) {
            dom.boardPath.appendChild(token);
        }
    },

    spin() {
        const state = SpeechGame.state;
        const dom = SpeechGame.dom;

        if (window.isSpeechPlaying || window.focusCardLocked) {
            console.log('[SPIN] BLOCKED - AI is still speaking');
            return;
        }

        if (SpeechGame.focusCard && SpeechGame.focusCard.state.isOpen) {
            console.log('[SPIN] BLOCKED - Focus card is still open');
            return;
        }

        if (state.isSpinning || !state.isPlaying) return;
        if (state.currentPosition >= this.config.totalSpaces) {
            SpeechGame.ui.showWinScreen();
            return;
        }

        state.isSpinning = true;
        SpeechGame.audio.play('spin');

        state.spinResult = Math.floor(Math.random() * 6) + 1;

        const baseRotation = 360 * 5;
        const sectionAngle = 360 / 6;
        const targetAngle = (6 - state.spinResult) * sectionAngle + sectionAngle / 2;
        const totalRotation = baseRotation + targetAngle;

        if (dom.spinnerWheel) {
            dom.spinnerWheel.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
            dom.spinnerWheel.style.transform = 'rotate(' + totalRotation + 'deg)';
        }

        const self = this;
        setTimeout(function() {
            state.isSpinning = false;
            if (dom.spinnerWheel) {
                dom.spinnerWheel.style.transition = 'none';
                dom.spinnerWheel.style.transform = 'rotate(' + (totalRotation % 360) + 'deg)';
            }
            SpeechGame.ui.showNotification('You rolled a ' + state.spinResult + '!', '🎲', 'bonus', 1500);
            setTimeout(function() {
                self.movePlayer(state.spinResult);
            }, 1500);
        }, 3000);
    },

    movePlayer(spaces) {
        const state = SpeechGame.state;
        const self = this;
        let movesRemaining = spaces;

        function moveOneSpace() {
            if (movesRemaining <= 0) {
                self.handleLanding();
                return;
            }

            state.currentPosition++;
            if (state.currentPosition > self.config.totalSpaces) {
                state.currentPosition = self.config.totalSpaces;
                movesRemaining = 0;
            } else {
                movesRemaining--;
            }

            SpeechGame.audio.play('move');
            self.positionToken();
            SpeechGame.ui.updateScoreDisplay();
            setTimeout(moveOneSpace, 300);
        }

        moveOneSpace();
    },

    positionToken() {
        const dom = SpeechGame.dom;
        const state = SpeechGame.state;

        if (!dom.playerToken) return;

        if (state.currentPosition === 0) {
            dom.playerToken.style.left = '10px';
            dom.playerToken.style.top = '520px';
            return;
        }

        const pos = this.positions[state.currentPosition - 1];
        if (pos) {
            dom.playerToken.style.left = (pos.x + 5) + 'px';
            dom.playerToken.style.top = (pos.y - 15) + 'px';
        }
    },

    handleLanding() {
        const state = SpeechGame.state;
        const special = this.config.specialSpaces[state.currentPosition];

        if (state.currentPosition >= this.config.totalSpaces) {
            SpeechGame.ui.showWinScreen();
            return;
        }

        if (special) {
            SpeechGame.audio.play('bonus');
            SpeechGame.ui.showNotification(special.label + '!', '⭐', 'bonus', 2000);

            if (special.spaces > 0) {
                const self = this;
                setTimeout(function() {
                    self.movePlayer(special.spaces);
                }, 2000);
                return;
            }
        }

        if (typeof showQuestionCard === 'function') {
            showQuestionCard();
        }
    }
};

// Attach to namespace for backward compatibility
window.SpeechGame = window.SpeechGame || {};
window.SpeechGame.board = board;
