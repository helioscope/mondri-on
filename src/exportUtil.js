export function downloadCanvasAsImage(canvas, filename="screenshot") {
  var link = document.createElement('a');
  link.download = filename + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}