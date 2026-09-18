export function overlayThumbLayout(input: {
  scrollHeight: number;
  clientHeight: number;
  scrollTop: number;
  trackHeight: number;
}): { opacity: number; height: number; top: number } {
  const overflow = input.scrollHeight - input.clientHeight;
  if (overflow <= 1) return { opacity: 0, height: 0, top: 0 };
  const height = Math.max(
    40,
    (input.clientHeight / input.scrollHeight) * input.trackHeight,
  );
  const maxTop = Math.max(0, input.trackHeight - height);
  const top = (input.scrollTop / overflow) * maxTop;
  return { opacity: 1, height, top };
}
