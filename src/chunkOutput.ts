const KEY_DROP_RATIO = 6;
const DELTA_DROP_RATE = 1 / 60;

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

export const getProcessChunkOutput = (canvas: OffscreenCanvas) => {
  const decoder = startDecodingAndRendering(canvas);

  let keyCount = 0;

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

  return processChunk;
};
