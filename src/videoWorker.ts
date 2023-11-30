// H264 スムーズに動き続ける
// const CODEC_STRING = "avc1.42001E";
// const CODEC_STRING = "avc1.58A01E";
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
const KEY_DROP_RATIO = 6;
const DELTA_DROP_RATE = 1 / 60;

const reportError = (e: Error) => {
  // Report error to the main thread
  console.log(e.message);
  postMessage(e.message);
};

const captureAndEncode = (
  frameSource: ReadableStream<VideoFrame>,
  cnv: OffscreenCanvas,
  fps: number,
  processChunk: EncodedVideoChunkOutputCallback
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
      console.log("StreamReadResult value is undefined.");
      setTimeout(readFrame, 1);
      return;
    }

    if (encoder.encodeQueueSize < 5) {
      frameCounter++;
      const isKeyframe = frameCounter % KEY_INTERVAL == 0;
      encoder.encode(frame, { keyFrame: isKeyframe });
      frame.close();
    } else {
      // エンコードが追いつかない場合はフレームを捨てる
      // Too many frames in flight, encoder is overwhelmed
      // let's drop this frame.
      console.log("dropping a frame");
      frame.close();
    }

    setTimeout(readFrame, 1);
  };

  readFrame();
};

const startDecodingAndRendering = (cnv: OffscreenCanvas) => {
  const ctx = cnv.getContext("2d");
  const readyFrames: VideoFrame[] = [];
  let underflow = true;

  const renderFrame = async () => {
    if (readyFrames.length == 0) {
      underflow = true;
      return;
    }
    const frame = readyFrames.shift();
    underflow = false;

    if (frame && ctx) {
      ctx.drawImage(frame, 0, 0);
      frame.close();
    }

    // Immediately schedule rendering of the next frame
    setTimeout(renderFrame, 0);
  };

  const handleFrame: VideoFrameOutputCallback = (frame) => {
    readyFrames.push(frame);
    if (underflow) {
      underflow = false;
      setTimeout(renderFrame, 0);
    }
  };

  const init: VideoDecoderInit = {
    output: handleFrame,
    error: reportError,
  };

  const decoder = new VideoDecoder(init);
  return decoder;
};

let keyCount = 0;

const main = (
  frameSource: ReadableStream<VideoFrame>,
  canvas: OffscreenCanvas,
  fps: number
) => {
  const decoder = startDecodingAndRendering(canvas);

  const processChunk: EncodedVideoChunkOutputCallback = (chunk, md) => {
    const config = md?.decoderConfig;
    if (config) {
      console.log("decoder re-config");
      decoder.configure(config);
    }

    // data moshing
    if (chunk.type === "delta") {
      // randomly drop frames
      if (Math.random() > DELTA_DROP_RATE) decoder.decode(chunk);
    } else {
      if (keyCount % KEY_DROP_RATIO === 0) decoder.decode(chunk);
      // drop the key frame
      else console.log(chunk);

      keyCount++;
    }
  };
  captureAndEncode(frameSource, canvas, fps, processChunk);
};

type VideoWorkerMessage = {
  frameSource: ReadableStream<VideoFrame>;
  canvas: OffscreenCanvas;
  fps: number;
};

self.onmessage = async (e: MessageEvent<VideoWorkerMessage>) => {
  const { frameSource, canvas, fps } = e.data;

  main(frameSource, canvas, fps);
};

export type { VideoWorkerMessage };
