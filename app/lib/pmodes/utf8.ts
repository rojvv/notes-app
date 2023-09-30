import { mergeTypedArrays } from "./encode";
import { unicodeToLower } from "./unicode";
import { UNREACHABLE } from "./utilities";

export function isUtf8CharacterFirstCodeUnit(c: number): boolean {
  return (c & 0xC0) !== 0x80;
}

export function utf8Length(str: Uint8Array): number {
  let result = 0;
  for (const c of str) {
    result += isUtf8CharacterFirstCodeUnit(c) ? 1 : 0;
  }
  return result;
}

export function utf8utf16Length(str: Uint8Array): number {
  let result = 0;
  for (const c of str) {
    result += (isUtf8CharacterFirstCodeUnit(c) ? 1 : 0) + (((c & 0xf8) === 0xf0) ? 1 : 0);
  }
  return result;
}

export function prevUtf8Unsafe(data: Uint8Array, pos: number): number {
  while (!isUtf8CharacterFirstCodeUnit(data[--pos])) {
    // pass
  }
  return pos;
}

export function nextUtf8Unsafe(data: Uint8Array, pos: number): { code: number; pos: number } {
  let code = 0;
  const a = data[pos];
  if ((a & 0x80) === 0) {
    code = a;
    return { pos: pos + 1, code };
  } else if ((a & 0x20) === 0) {
    code = ((a & 0x1f) << 6) | (data[pos + 1] & 0x3f);
    return { pos: pos + 2, code };
  } else if ((a & 0x10) === 0) {
    code = ((a & 0x0f) << 12) | ((data[pos + 1] & 0x3f) << 6) | (data[pos + 2] & 0x3f);
    return { pos: pos + 3, code };
  } else if ((a & 0x08) === 0) {
    code = ((a & 0x07) << 18) | ((data[pos + 1] & 0x3f) << 12) | ((data[pos + 2] & 0x3f) << 6) | (data[pos + 3] & 0x3f);
    return { pos: pos + 4, code };
  }
  UNREACHABLE();
}

export function appendUtf8CharacterUnsafe(text: number[] | Uint8Array, pos: number, code: number): number {
  if (code <= 0x7f) {
    text[pos++] = code;
  } else if (code <= 0x7ff) {
    text[pos++] = 0xc0 | (code >> 6);
    text[pos++] = 0x80 | (code & 0x3f);
  } else if (code <= 0xffff) {
    text[pos++] = 0xe0 | (code >> 12);
    text[pos++] = 0x80 | ((code >> 6) & 0x3f);
    text[pos++] = 0x80 | (code & 0x3f);
  } else {
    text[pos++] = 0xf0 | (code >> 18);
    text[pos++] = 0x80 | ((code >> 12) & 0x3f);
    text[pos++] = 0x80 | ((code >> 6) & 0x3f);
    text[pos++] = 0x80 | (code & 0x3f);
  }
  return pos;
}

export function appendUtf8Character(str: Uint8Array, code: number) {
  const toPush: number[] = [];
  if (code <= 0x7f) {
    toPush.push(code);
  } else if (code <= 0x7ff) {
    toPush.push(0xc0 | (code >> 6)); // implementation-defined
    toPush.push(0x80 | (code & 0x3f));
  } else if (code <= 0xffff) {
    toPush.push(0xe0 | (code >> 12)); // implementation-defined
    toPush.push(0x80 | ((code >> 6) & 0x3f));
    toPush.push(0x80 | (code & 0x3f));
  } else {
    toPush.push(0xf0 | (code >> 18)); // implementation-defined
    toPush.push(0x80 | ((code >> 12) & 0x3f));
    toPush.push(0x80 | ((code >> 6) & 0x3f));
    toPush.push(0x80 | (code & 0x3f));
  }
  return mergeTypedArrays(str, Uint8Array.from(toPush));
}

export function utf8ToLower(str: Uint8Array): Uint8Array {
  let result = new Uint8Array();
  let position = 0;
  const end = str.length;
  while (position !== end) {
    const { pos, code } = nextUtf8Unsafe(str, position);
    position = pos;
    result = appendUtf8Character(result, unicodeToLower(code));
  }
  return result;
}

export function utf8Truncate(str: Uint8Array, length: number): Uint8Array {
  if (str.length > length) {
    for (let i = 0; i < str.length; i++) {
      if (isUtf8CharacterFirstCodeUnit(str[i])) {
        if (length === 0) return str.slice(0, i);
        else length--;
      }
    }
  }
  return str;
}

export function utf8utf16Truncate(str: Uint8Array, length: number): Uint8Array {
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (isUtf8CharacterFirstCodeUnit(c)) {
      if (length <= 0) {
        return str.slice(0, i);
      } else {
        length--;
        if (c >= 0xf0) {
          length--;
        }
      }
    }
  }
  return str;
}

export function utf8Substr(str: Uint8Array, offset: number): Uint8Array {
  if (offset === 0) return str;
  const offsetPos = utf8Truncate(str, offset).length;
  return str.slice(offsetPos);
}

export function utf8utf16Substr(str: Uint8Array, offset: number, length?: number): Uint8Array {
  if (length != null) {
    return utf8utf16Truncate(utf8utf16Substr(str, offset), length);
  }
  if (offset === 0) return str;
  const offsetPos = utf8utf16Truncate(str, offset).length;
  return str.slice(offsetPos);
}

export function checkUtf8(str: Uint8Array) {
  let data = 0;
  const dataEnd = str.length;

  function ENSURE(condition: boolean) {
    if (!condition) {
      return false;
    }
  }

  do {
    const a = str[data++];
    if ((a & 0x80) === 0) {
      if (data === dataEnd + 1) {
        return true;
      }
      continue;
    }

    if (ENSURE((a & 0x40) !== 0) === false) return false;

    const b = str[data++];
    if (ENSURE((b & 0xc0) === 0x80) === false) return false;
    if ((a & 0x20) === 0) {
      if (ENSURE((a & 0x1e) > 0) === false) return false;
      continue;
    }

    const c = str[data++];
    if (ENSURE((c & 0xc0) === 0x80) === false) return false;
    if ((a & 0x10) === 0) {
      const x = ((a & 0x0f) << 6) | (b & 0x20);
      if (ENSURE(x !== 0 && x !== 0x360) === false) return false; // surrogates
      continue;
    }

    const d = str[data++];
    if (ENSURE((d & 0xc0) === 0x80) === false) return false;
    if ((a & 0x08) === 0) {
      const t = ((a & 0x07) << 6) | (b & 0x30);
      if (ENSURE(0 < t && t < 0x110) === false) return false; // end of unicode
      continue;
    }

    return false;
  } while (true);
}
