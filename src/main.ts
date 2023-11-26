import type { VideoWorkerMessage } from "./videoWorker";

// 表示する絵文字一覧
const foods = ["🍇", "🍈", "🍉", "🍊", "🍋", "🍌", "🍍", "🥭"];

const getRandomFood = () => {
  const index = Math.floor(Math.random() * foods.length);
  return foods[index];
};

// Draw pretty animation on the source canvas
const startDrawing = async () => {
  // エンコード元となるキャンバス
  const cnv = <HTMLCanvasElement>document.getElementById("src");
  const ctx = cnv.getContext("2d");

  if (!ctx) return;

  // キャンバスへの描画に関する設定
  ctx.fillStyle = "#fff5e6";
  const width = cnv.width;
  const height = cnv.height;
  const cx = width / 2;
  const cy = height / 2;
  // const r = Math.min(width, height) / 5;
  ctx.font = "30px Helvetica";
  const text = getRandomFood() + "📹📷Hello WebCodecs 🎥🎞️" + getRandomFood();
  const size = ctx.measureText(text).width;

  // １フレーム描画する
  const drawOneFrame: FrameRequestCallback = (time) => {
    const angle = Math.PI * 2 * (time / 5000);
    const scale = 1 + 0.3 * Math.sin(Math.PI * 2 * (time / 7000));
    ctx.save();
    ctx.fillRect(0, 0, width, height);

    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    ctx.fillStyle = `hsl(${angle * 40},80%,50%)`;
    ctx.fillRect(-size / 2, 10, size, 25);

    ctx.fillStyle = "black";
    ctx.fillText(text, -size / 2, 0);

    ctx.restore();

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
