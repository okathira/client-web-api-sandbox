let mouseX = 0;
let mouseY = 0;
let cnv: HTMLCanvasElement;

export const setCanvasMousePosition = (canvas: HTMLCanvasElement) => {
  cnv = canvas;
};

export const mouseMove = (e: MouseEvent) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
};

export const getCanvasMousePosition = () => {
  const rect = cnv.getBoundingClientRect();
  return {
    mouseX: mouseX - rect.left,
    mouseY: mouseY - rect.top,
  };
};
