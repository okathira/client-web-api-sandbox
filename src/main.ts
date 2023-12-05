import { getAnimateCanvasFunc } from "./animateCanvas";
import type { VideoWorkerMessage } from "./videoWorker";

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const FPS = 60;

// Draw pretty animation on the source canvas
const startDrawing = async (app: HTMLElement) => {
  // エンコード元となるキャンバス
  const cnv = document.createElement("canvas");
  cnv.width = CANVAS_WIDTH;
  cnv.height = CANVAS_HEIGHT;
  cnv.id = "src";
  app.appendChild(cnv);

  // キャンバスの描画を行う関数
  const animateCanvas = getAnimateCanvasFunc(cnv);

  // １フレーム描画する
  const drawOneFrame: FrameRequestCallback = (time) => {
    animateCanvas(time);

    // 描画タイミングに合わせて毎フレーム描画する
    window.requestAnimationFrame(drawOneFrame);
  };
  window.requestAnimationFrame(drawOneFrame);

  return cnv;
};

// WebCodecsの処理
const startWorker = async (app: HTMLElement, srcCanvas: HTMLCanvasElement) => {
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

  // Create a new destination canvas
  const dstCanvas = document.createElement("canvas");
  dstCanvas.width = srcCanvas.width;
  dstCanvas.height = srcCanvas.height;
  dstCanvas.id = "dst";
  app.appendChild(dstCanvas);

  // workerにキャンバスの制御を譲渡する
  const offscreen = dstCanvas.transferControlToOffscreen();

  const message: VideoWorkerMessage = {
    canvas: offscreen,
    frameSource: reader,
    fps: FPS,
  };
  worker.postMessage(message, [offscreen, reader]);

  // workerからメッセージあったらエラーが起きているのでworkerを再起動する
  worker.onmessage = (e) => {
    // Recreate worker in case of an error
    console.log("Worker error: " + e.data);
    worker.terminate();

    // エラーが起きたタイミングでキャンバスを削除しておけば重複気にしなくて良い気がする
    document.getElementById("dst")?.remove();

    startWorker(app, srcCanvas);
  };
};

const main = async () => {
  if (!("VideoFrame" in window)) {
    document.body.innerHTML = "<h1>WebCodecs API is not supported.</h1>";
    return;
  }

  const app = document.getElementById("app");
  if (!app) throw new Error("Could not find app element");

  const srcCanvas = await startDrawing(app);
  startWorker(app, srcCanvas);
};

document.body.onload = main;
