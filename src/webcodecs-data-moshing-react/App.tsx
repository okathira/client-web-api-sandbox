export function App() {
  return (
    <>
      <h1>keyframe dropping</h1>
      original sample codes:
      <a href="https://developer.chrome.com/articles/webcodecs/">
        https://developer.chrome.com/articles/webcodecs/
      </a>
      <br />
      <div id="app">
        <div id="video-container">
          <canvas id="src" width="640" height="480"></canvas>
          <canvas id="dst" width="640" height="480"></canvas>
        </div>
        <div id="controls">
          <button id="start">Start</button>
          <button id="stop">Stop</button>
          <button id="play">Play</button>
          <button id="pause">Pause</button>
          <button id="double">Double</button>
          <button id="drop">Drop</button>
        </div>
      </div>
    </>
  );
}
