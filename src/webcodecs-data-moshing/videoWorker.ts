// H264 スムーズに動き続ける
// const CODEC_STRING = "avc1.42001E";
// const CODEC_STRING = "avc1.58A01E";

import { getProcessChunkOutput } from "./chunkOutput";

// const CODEC_STRING = "avc1.64001E";
const CODEC_STRING = "avc1.64002A";

// AV1 deltaフレームを落とすと動かなくなる
// const CODEC_STRING = "av01.0.01M.08";

// VP8 deltaフレームを落とすとカオスになる
// const CODEC_STRING = "vp8";

// VP9 もぞもぞ ブロックノイズが良く見える
// const CODEC_STRING = "vp09.00.10.08";
// const CODEC_STRING = "vp09.02.10.10.01.09.16.09.01";

// data moshing
const KEY_INTERVAL = 120;

const reportError = (e: Error) => {
  // Report error to the main thread
  console.error(e.message);
  postMessage(e.message);
};

const captureAndEncode = (
  frameSource: ReadableStream<VideoFrame>,
  cnv: OffscreenCanvas,
  fps: number,
  processChunk: EncodedVideoChunkOutputCallback,
) => {
  let frameCounter = 0;

  const init: VideoEncoderInit = {
    output: processChunk,
    error: reportError,
  };

  const config: VideoEncoderConfig = {
    codec: CODEC_STRING,
    width: cnv.width,
    height: cnv.height,
    bitrate: 1000000,
    avc: { format: "annexb" },
    framerate: fps,
    // hardwareAcceleration: "prefer-software",
  };

  const encoder = new VideoEncoder(init);
  encoder.configure(config);

  const reader = frameSource.getReader();
  const readFrame = async () => {
    const result = await reader.read();
    const frame = result.value;

    if (frame === undefined) {
      console.error("StreamReadResult value is undefined.");
      self.requestAnimationFrame(() => {
        void readFrame();
      });
      return;
    }

    if (encoder.encodeQueueSize < 5) {
      frameCounter++;
      const isKeyframe = frameCounter % KEY_INTERVAL === 0;
      console.log(`encodeQueueSize: ${encoder.encodeQueueSize}`);
      encoder.encode(frame, { keyFrame: isKeyframe });
      frame.close();
    } else {
      // エンコードが追いつかない場合はフレームを捨てる
      // Too many frames in flight, encoder is overwhelmed
      // let's drop this frame.
      console.warn("dropping a frame");
      frame.close();
    }

    self.requestAnimationFrame(() => {
      void readFrame();
    });
  };

  void readFrame();
};

const main = (
  frameSource: ReadableStream<VideoFrame>,
  canvas: OffscreenCanvas,
  fps: number,
) => {
  const processChunkOutput = getProcessChunkOutput(canvas);

  captureAndEncode(frameSource, canvas, fps, processChunkOutput);
};

interface VideoWorkerMessage {
  frameSource: ReadableStream<VideoFrame>;
  canvas: OffscreenCanvas;
  fps: number;
}

self.onmessage = async (e: MessageEvent<VideoWorkerMessage>) => {
  const { frameSource, canvas, fps } = e.data;

  main(frameSource, canvas, fps);
};

export type { VideoWorkerMessage };
