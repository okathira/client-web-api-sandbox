const foods = ["🍇", "🍈", "🍉", "🍊", "🍋", "🍌", "🍍", "🥭"];

const getRandomFood = () => {
  const index = Math.floor(Math.random() * foods.length);
  return foods[index];
};

export const getAnimateCanvasFunc = (cnv: HTMLCanvasElement) => {
  const ctx = cnv.getContext("2d");

  if (!ctx) throw new Error("Could not get context");

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

  // ここではシンプルにキャンバスに描画しているだけ
  const animateCanvas = (time: number) => {
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
  };
  return animateCanvas;
};
