import { getAnimateCanvasFunc } from "./animateCanvas";
import type { VideoWorkerMessage } from "./videoWorker";

// Draw pretty animation on the source canvas
const startDrawing = async () => {
  // エンコード元となるキャンバス
  const cnv = <HTMLCanvasElement>document.getElementById("src");

  const animateCanvas = getAnimateCanvasFunc(cnv);

  // １フレーム描画する
  const drawOneFrame: FrameRequestCallback = (time) => {
    animateCanvas(time);

    // 描画タイミングに合わせて毎フレーム描画する
    window.requestAnimationFrame(drawOneFrame);
  };
  window.requestAnimationFrame(drawOneFrame);
};

// WebCodecsの処理
const startWorker = () => {
  const worker = new Worker(new URL("./videoWorker.ts", import.meta.url), {
    name: "Video worker",
  });

  worker.onmessage = (e) => {
    // Recreate worker in case of an error
    console.log("Worker error: " + e.data);
    worker.terminate();
    startWorker();
  };

  // Capture animation track for the source canvas
  const src_cnv = <HTMLCanvasElement>document.getElementById("src");
  if (!src_cnv) return;

  const fps = 60;
  const stream = src_cnv?.captureStream(fps);
  const track = stream.getVideoTracks()[0];
  const media_processor = new MediaStreamTrackProcessor({ track });
  const reader = media_processor.readable;

  // Create a new destination canvas
  const dst_cnv = document.createElement("canvas");
  dst_cnv.width = src_cnv.width;
  dst_cnv.height = src_cnv.height;
  const dst = document.getElementById("dst");

  if (!dst) return;

  if (dst.firstChild) dst.removeChild(dst.firstChild);
  dst.appendChild(dst_cnv);
  // workerにキャンバスの制御を譲渡する
  const offscreen = dst_cnv.transferControlToOffscreen();

  const message: VideoWorkerMessage = {
    canvas: offscreen,
    frame_source: reader,
    fps: fps,
  };
  worker.postMessage(message, [offscreen, reader]);
};

const main = () => {
  if (!("VideoFrame" in window)) {
    document.body.innerHTML = "<h1>WebCodecs API is not supported.</h1>";
    return;
  }

  startDrawing();
  startWorker();
};

document.body.onload = main;
