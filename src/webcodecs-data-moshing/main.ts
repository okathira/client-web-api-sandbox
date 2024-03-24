import { getAnimateCanvasFunc } from "./animateCanvas";
import type { VideoWorkerMessage } from "./videoWorker";

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const FPS = 60;

const VIDEO_CONTAINER_ID = "video-container";
const START_BUTTON_ID = "start";

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
const startWorker = async (
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

  const message: VideoWorkerMessage = {
    canvas: offscreen,
    frameSource: reader,
    fps: FPS,
  };

  // workerからメッセージあったらエラーが起きているのでworkerを再起動する
  worker.onmessage = (e) => {
    // Recreate worker in case of an error
    console.error("Worker error: " + e.data);
    worker.terminate();

    afterErrorTermination();
  };

  // ボタンでworkerをスタートする
  const startButton = document.getElementById(START_BUTTON_ID);
  if (startButton == null) throw new Error("Could not find start button");
  startButton.onclick = () => {
    worker.postMessage(message, [offscreen, reader]);
  };
};

const main = async () => {
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

  const restartWorker = () => {
    // ワーカーをリスタートするタイミングでキャンバスを削除する
    dstCanvas.remove();
    // 再作成する
    const newDstCanvas = appendCanvas(
      videoContainer,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      "dst",
    );
    void startWorker(srcCanvas, newDstCanvas, restartWorker);
  };
  void startWorker(srcCanvas, dstCanvas, restartWorker); // workerを更にencodingとdecodingに分けたい
};

document.body.onload = main;
