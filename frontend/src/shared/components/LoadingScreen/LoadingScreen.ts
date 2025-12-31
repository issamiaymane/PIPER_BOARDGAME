/**
 * Reusable Loading Screen Component
 * Usage: import { createLoadingScreen, hideLoadingScreen } from './components/LoadingScreen'
 */

export interface LoadingScreenOptions {
    title?: string;
    container?: HTMLElement;
}

export function createLoadingScreen(options: LoadingScreenOptions = {}): HTMLElement {
    const { title = 'Loading...', container = document.body } = options;

    const loadingScreen = document.createElement('div');
    loadingScreen.id = 'loadingScreen';
    loadingScreen.className = 'loading-screen';

    loadingScreen.innerHTML = `
        <div class="loading-content">
            <div class="loading-snowflake">❄</div>
            <h1 class="loading-title">${title}</h1>
        </div>
    `;

    container.appendChild(loadingScreen);
    return loadingScreen;
}

export function hideLoadingScreen(delay: number = 0): void {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            // Remove from DOM after transition
            setTimeout(() => {
                loadingScreen.remove();
            }, 500);
        }, delay);
    }
}

export function showLoadingScreen(): void {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
}
