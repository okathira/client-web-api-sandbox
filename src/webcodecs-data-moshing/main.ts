import { getAnimateCanvasFunc } from "./animateCanvas";
import type { VideoWorkerCommand, VideoWorkerResponse } from "./videoWorker";

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const FPS = 60;

const VIDEO_CONTAINER_ID = "video-container";
const START_BUTTON_ID = "start";
const STOP_BUTTON_ID = "stop";
const PLAY_BUTTON_ID = "play";
const PAUSE_BUTTON_ID = "pause";
const DOUBLE_BUTTON_ID = "double";
const DROP_BUTTON_ID = "drop";

const appendCanvas = (
  container: HTMLElement,
  width: number,
  height: number,
  id: string,
) => {
  // エンコード元となるキャンバス
  const cnv = document.createElement("canvas");
  cnv.width = width;
  cnv.height = height;
  cnv.id = id;
  container.appendChild(cnv);

  return cnv;
};

// Draw pretty animation on the source canvas
const startDrawing = (srcCanvas: HTMLCanvasElement) => {
  // キャンバスの描画を行う関数
  const animateCanvas = getAnimateCanvasFunc(srcCanvas);

  // １フレーム描画する
  const drawOneFrame: FrameRequestCallback = (time) => {
    animateCanvas(time);

    // 描画タイミングに合わせて毎フレーム描画する
    window.requestAnimationFrame(drawOneFrame);
  };
  window.requestAnimationFrame(drawOneFrame);
};

// WebCodecsの処理
const startWorker = (
  srcCanvas: HTMLCanvasElement,
  dstCanvas: HTMLCanvasElement,
  afterErrorTermination: () => void,
) => {
  // コンストラクタによるworkerのインポート
  // https://ja.vitejs.dev/guide/features.html#%E3%82%B3%E3%83%B3%E3%82%B9%E3%83%88%E3%83%A9%E3%82%AF%E3%82%BF%E3%81%AB%E3%82%88%E3%82%8B%E3%82%A4%E3%83%B3%E3%83%9B%E3%82%9A%E3%83%BC%E3%83%88
  const worker = new Worker(new URL("./videoWorker.ts", import.meta.url), {
    name: "Video worker",
    type: "module",
  });

  const stream = srcCanvas.captureStream(FPS);
  const track = stream.getVideoTracks()[0];
  const mediaProcessor = new MediaStreamTrackProcessor({ track });
  const reader = mediaProcessor.readable;

  // workerにキャンバスの制御を譲渡する
  const offscreen = dstCanvas.transferControlToOffscreen();

  worker.onmessage = (e: MessageEvent<VideoWorkerResponse>) => {
    if (e.data.response === "error") {
      // workerからエラーメッセージを受けたらworkerを再起動する
      // Recreate worker in case of an error
      console.error("Worker error: " + e.data.error);
      worker.terminate();
      afterErrorTermination();
    } else if (e.data.response === "stop") {
      console.log("Worker stopped successfully");
      worker.terminate();
      afterErrorTermination();
    }
  };

  // ボタンでworkerをスタートする
  const startButton = document.getElementById(START_BUTTON_ID);
  if (startButton == null) throw new Error("Could not find start button");
  const commandStart: VideoWorkerCommand = {
    command: "start",
    canvas: offscreen,
    frameSource: reader,
    fps: FPS,
  };
  startButton.onclick = () => {
    worker.postMessage(commandStart, [offscreen, reader]);
  };

  // ボタンでworkerをストップする
  const stopButton = document.getElementById(STOP_BUTTON_ID);
  if (stopButton == null) throw new Error("Could not find stop button");
  const commandStop: VideoWorkerCommand = { command: "stop" };
  stopButton.onclick = () => {
    worker.postMessage(commandStop);
  };

  // ボタンでフレームを通常再生する
  const playButton = document.getElementById(PLAY_BUTTON_ID);
  if (playButton == null) throw new Error("Could not find play button");
  const commandPlay: VideoWorkerCommand = { command: "play" };
  playButton.onclick = () => {
    worker.postMessage(commandPlay);
  };

  // ボタンでフレームを一時停止する
  const pauseButton = document.getElementById(PAUSE_BUTTON_ID);
  if (pauseButton == null) throw new Error("Could not find pause button");
  const commandPause: VideoWorkerCommand = { command: "pause" };
  pauseButton.onclick = () => {
    worker.postMessage(commandPause);
  };

  // ボタンでフレームを2回反映する
  const doubleButton = document.getElementById(DOUBLE_BUTTON_ID);
  if (doubleButton == null) throw new Error("Could not find double button");
  const commandDouble: VideoWorkerCommand = { command: "double" };
  doubleButton.onclick = () => {
    worker.postMessage(commandDouble);
  };

  // ボタンでフレームを捨てる
  const dropButton = document.getElementById(DROP_BUTTON_ID);
  if (dropButton == null) throw new Error("Could not find drop button");
  const commandDrop: VideoWorkerCommand = { command: "drop" };
  dropButton.onclick = () => {
    worker.postMessage(commandDrop);
  };
};

const main = () => {
  if (!("VideoFrame" in window)) {
    document.body.innerHTML = "<h1>WebCodecs API is not supported.</h1>";
    return;
  }

  const videoContainer = document.getElementById(VIDEO_CONTAINER_ID);
  if (videoContainer == null) throw new Error("Could not find app element");

  // キャンバスの作成
  const srcCanvas = appendCanvas(
    videoContainer,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    "src",
  );
  const dstCanvas = appendCanvas(
    videoContainer,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    "dst",
  );

  // キャンバスの描画を開始
  startDrawing(srcCanvas);

  const restartWorker = (dstCanvas: HTMLCanvasElement) => {
    // ワーカーをリスタートするタイミングでキャンバスを削除する
    dstCanvas.remove();
    // 再作成する
    const newDstCanvas = appendCanvas(
      videoContainer,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      "dst",
    );
    void startWorker(srcCanvas, newDstCanvas, () => {
      restartWorker(newDstCanvas);
    });
  };
  void startWorker(srcCanvas, dstCanvas, () => {
    restartWorker(dstCanvas);
  }); // workerを更にencodingとdecodingに分けたい
};

document.body.onload = main;
