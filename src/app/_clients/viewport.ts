const VIRTUAL_KEYBOARD_MIN_HEIGHT_CHANGE = 80;

export function isVirtualKeyboardOpen({
  baselineHeight,
  viewportHeight,
  editableFocused,
}: {
  baselineHeight: number;
  viewportHeight: number;
  editableFocused: boolean;
}): boolean {
  return (
    editableFocused &&
    baselineHeight - viewportHeight >= VIRTUAL_KEYBOARD_MIN_HEIGHT_CHANGE
  );
}
