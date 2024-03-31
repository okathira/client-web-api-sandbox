type NextFrameDecoding = "encode" | "drop" | "double" | "pause";
let nextFrameDecoding: NextFrameDecoding = "encode";

export const setNextFrameDecoding = (action: NextFrameDecoding) => {
  nextFrameDecoding = action;
};

const startDecodingAndRendering = (cnv: OffscreenCanvas) => {
  const ctx = cnv.getContext("2d");
  const readyFrames: VideoFrame[] = [];
  let underflow = true;

  const renderFrame = async () => {
    if (readyFrames.length === 0) {
      underflow = true;
      return;
    }
    const frame = readyFrames.shift();
    underflow = false;

    if (frame != null && ctx != null) {
      ctx.drawImage(frame, 0, 0);
      frame.close();
    }

    // Schedule rendering of the next frame
    self.requestAnimationFrame(() => {
      void renderFrame();
    });
  };

  const handleFrame: VideoFrameOutputCallback = (frame) => {
    readyFrames.push(frame);
    if (underflow) {
      underflow = false;
      self.requestAnimationFrame(() => {
        void renderFrame();
      });
    }
  };

  const init: VideoDecoderInit = {
    output: handleFrame,
    error: reportError,
  };

  const decoder = new VideoDecoder(init);
  return decoder;
};

export const getProcessChunkOutput = (canvas: OffscreenCanvas) => {
  const decoder = startDecodingAndRendering(canvas);

  const processChunk: EncodedVideoChunkOutputCallback = (chunk, md) => {
    const config = md?.decoderConfig;
    if (config != null) {
      console.log("decoder re-config");
      decoder.configure(config);
    }

    switch (nextFrameDecoding) {
      case "encode":
        // normal operation
        decoder.decode(chunk);
        break;
      case "double":
        // double the frame
        decoder.decode(chunk);
        decoder.decode(chunk);
        nextFrameDecoding = "encode";
        break;
      case "drop":
        // drop the frame
        // don't decode
        nextFrameDecoding = "encode";
        break;
      case "pause":
        // pause the decoding
        // don't decode
        break;
    }

    console.log(chunk);
  };

  return processChunk;
};
