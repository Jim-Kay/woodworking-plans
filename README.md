# Floating Frame Planner

A modular rebuild of the original single-page floating frame planner.

The app is intentionally split into small pieces:

- `src/frameMath.js` handles dimension math, cut-list generation, board-foot estimates, and Z-clip checks.
- `src/catalogs.js` keeps default values plus canvas and Z-clip catalogs.
- `src/viewer3d.js` owns the Three.js scene and build-stage rendering.
- `src/app.js` wires controls, share links, exports, printing, and UI state.
- `src/styles.css` contains the application styling.

Run `npm start` from this folder to use the no-build version at `http://127.0.0.1:5173`. `npm test` runs the calculation tests.
