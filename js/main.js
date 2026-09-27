import { SceneManager } from './sceneManager.js';
import { UIManager } from './ui.js';

window.addEventListener('DOMContentLoaded', async () => {
  const canvasContainer = document.getElementById('webgl-canvas-container');
  if (!canvasContainer) {
    console.error('WebGL canvas container not found!');
    return;
  }

  // Hide loading overlay once scene is initialized
  const loaderEl = document.getElementById('preloader-overlay');

  try {
    const sceneManager = new SceneManager(canvasContainer);
    await sceneManager.init();

    const uiManager = new UIManager(sceneManager);
    uiManager.init();

    // Remove preloader smoothly
    if (loaderEl) {
      loaderEl.style.display = 'none';
      if (loaderEl.parentNode) loaderEl.parentNode.removeChild(loaderEl);
    }
  } catch (err) {
    console.error('Error during 3D portfolio boot:', err);
    if (loaderEl) {
      loaderEl.style.display = 'none';
    }
  }
});
