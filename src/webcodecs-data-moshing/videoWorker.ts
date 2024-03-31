// H264 スムーズに動き続ける
// const CODEC_STRING = "avc1.42001E";
// const CODEC_STRING = "avc1.58A01E";

import { getProcessChunkOutput, setNextFrameDecoding } from "./chunkOutput";

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
type NextFrameEncoding = "delta" | "key";
let nextFrameEncoding: NextFrameEncoding = "key";

export const setNextFrameEncoding = (action: NextFrameEncoding) => {
  nextFrameEncoding = action;
};

// const KEY_INTERVAL = 120;

const reportError = (e: Error) => {
  // Report error to the main thread
  console.error(e.message);

  const error: ErrorProcessResponse = {
    response: "error",
    error: e.message,
  };
  postMessage(error);
};

const captureAndEncode = (
  frameSource: ReadableStream<VideoFrame>,
  cnv: OffscreenCanvas,
  fps: number,
  processChunk: EncodedVideoChunkOutputCallback,
) => {
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
      // console.log(`encodeQueueSize: ${encoder.encodeQueueSize}`);

      switch (nextFrameEncoding) {
        case "key":
          encoder.encode(frame, { keyFrame: true });
          nextFrameEncoding = "delta";
          break;
        case "delta":
          encoder.encode(frame, { keyFrame: false });
          break;
      }

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

interface StartVideoProcessCommand {
  command: "start";
  frameSource: ReadableStream<VideoFrame>;
  canvas: OffscreenCanvas;
  fps: number;
}
interface StopVideoProcessCommand {
  command: "stop";
}
interface PlayVideoProcessCommand {
  command: "play";
}
interface PauseVideoProcessCommand {
  command: "pause";
}
interface DoubledVideoProcessCommand {
  command: "double";
}
interface DropVideoProcessCommand {
  command: "drop";
}

type VideoWorkerCommand =
  | StartVideoProcessCommand
  | StopVideoProcessCommand
  | PlayVideoProcessCommand
  | PauseVideoProcessCommand
  | DoubledVideoProcessCommand
  | DropVideoProcessCommand;

interface ErrorProcessResponse {
  response: "error";
  error: string;
}

interface StopProcessResponse {
  response: "stop";
}

type VideoWorkerResponse = ErrorProcessResponse | StopProcessResponse;

onmessage = (e: MessageEvent<VideoWorkerCommand>) => {
  if (e.data.command === "start") {
    const { frameSource, canvas, fps } = e.data;
    main(frameSource, canvas, fps);
  } else if (e.data.command === "stop") {
    // 止める前に必要な後処理があればここに書く
    const returnCanvas: StopProcessResponse = {
      response: "stop",
    };
    postMessage(returnCanvas);
  } else if (e.data.command === "play") {
    setNextFrameEncoding("key");
    setNextFrameDecoding("encode");
  } else if (e.data.command === "pause") {
    setNextFrameEncoding("delta");
    setNextFrameDecoding("pause");
  } else if (e.data.command === "double") {
    setNextFrameEncoding("delta");
    setNextFrameDecoding("double");
  } else if (e.data.command === "drop") {
    setNextFrameEncoding("delta");
    setNextFrameDecoding("drop");
  }
};

export type { VideoWorkerCommand, VideoWorkerResponse };
