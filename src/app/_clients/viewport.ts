const VIRTUAL_KEYBOARD_MIN_HEIGHT_CHANGE = 80;
const VIRTUAL_KEYBOARD_RESTORED_TOLERANCE = 8;

export function isVirtualKeyboardOpen({
  baselineHeight,
  viewportHeight,
  editableFocused,
  keyboardWasOpen,
}: {
  baselineHeight: number;
  viewportHeight: number;
  editableFocused: boolean;
  keyboardWasOpen: boolean;
}): boolean {
  const heightChange = baselineHeight - viewportHeight;
  if (keyboardWasOpen) {
    return heightChange > VIRTUAL_KEYBOARD_RESTORED_TOLERANCE;
  }
  return editableFocused && heightChange >= VIRTUAL_KEYBOARD_MIN_HEIGHT_CHANGE;
}
