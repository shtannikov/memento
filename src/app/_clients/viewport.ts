const VIRTUAL_KEYBOARD_MIN_HEIGHT_CHANGE = 80;

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
  return (
    (editableFocused || keyboardWasOpen) &&
    baselineHeight - viewportHeight >= VIRTUAL_KEYBOARD_MIN_HEIGHT_CHANGE
  );
}
