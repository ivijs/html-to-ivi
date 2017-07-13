export function escapeText(text: string): string {
  let result = text;
  let start = 0;
  let i = 0;
  for (; i < text.length; i++) {
    let escape;
    switch (text.charCodeAt(i)) {
      case 10: // \n
        escape = "\\n";
        break;
      case 13: // \r
        escape = "\\r";
        break;
      case 34: // "
        escape = "\\\"";
        break;
      default:
        continue;
    }
    if (start > 0) {
      if (i > start) {
        result += text.slice(start, i) + escape;
      } else {
        result += escape;
      }
    } else {
      if (i > start) {
        result = text.slice(0, i) + escape;
      } else {
        result = escape;
      }
    }
    start = i + 1;
  }
  if (start !== 0 && i !== start) {
    return result + text.slice(start, i);
  }
  return result;
}
