import { areTypedArraysEqual, CODEPOINTS, decode, encode } from "./encode";
import { getUnicodeSimpleCategory, UnicodeSimpleCategory } from "./unicode";
import { checkUtf8, isUtf8CharacterFirstCodeUnit, utf8Truncate } from "./utf8";
import { NUMERIC_LIMITS } from "./constants";

export function CHECK(condition: boolean) {
  if (!condition) console.trace("CHECK failed");
}

export function LOG_CHECK(condition: boolean, ...messages: unknown[]) {
  if (!condition) console.trace("LOG_CHECK failed: ", ...messages);
}

export function UNREACHABLE(): never {
  throw new Error("UNREACHABLE");
}

export function isWordCharacter(code: number) {
  switch (getUnicodeSimpleCategory(code)) {
    case UnicodeSimpleCategory.Letter:
    case UnicodeSimpleCategory.DecimalNumber:
    case UnicodeSimpleCategory.Number:
      return true;
    default:
      return code === CODEPOINTS["_"];
  }
}

export function tolowerBeginsWith(str: Uint8Array, prefix: string | Uint8Array): boolean {
  prefix = typeof prefix === "string" ? encode(prefix) : prefix;
  if (prefix.length > str.length) {
    return false;
  }
  for (let i = 0; i < prefix.length; i++) {
    if (toLower(str[i]) !== prefix[i]) {
      return false;
    }
  }
  return true;
}

export function toLower(codepoint: number): number;
export function toLower(data: Uint8Array): Uint8Array;
export function toLower(c: number | Uint8Array): Uint8Array | number {
  return typeof c === "number"
    ? (CODEPOINTS["A"] <= c && c <= CODEPOINTS["Z"]) ? c - CODEPOINTS["A"] + CODEPOINTS["a"] : c
    : Uint8Array.from(c.map((code) => toLower(code)));
}

export function split(s: Uint8Array, delimiter: number = CODEPOINTS[" "]): Uint8Array[] {
  const delimiterPos = s.indexOf(delimiter);
  if (delimiterPos === -1) {
    return [s];
  } else {
    return [s.slice(0, delimiterPos), s.slice(delimiterPos + 1)];
  }
}

export function fullSplit(
  s: Uint8Array,
  delimiter = CODEPOINTS[" "],
  maxParts = Number.MAX_SAFE_INTEGER,
): Uint8Array[] {
  const result: Uint8Array[] = [];
  if (s.length === 0) {
    return result;
  }
  while (result.length + 1 < maxParts) {
    const delimiterPos = s.indexOf(delimiter);
    if (delimiterPos === -1) break;
    result.push(s.slice(0, delimiterPos));
    s = s.slice(delimiterPos + 1);
  }
  result.push(s);
  return result;
}

export function beginsWith(str: Uint8Array, prefix: string | Uint8Array): boolean {
  prefix = typeof prefix === "string" ? encode(prefix) : prefix;
  return prefix.length <= str.length && areTypedArraysEqual(str.slice(0, prefix.length), prefix);
}

export function endsWith(str: Uint8Array, suffix: string | Uint8Array): boolean {
  suffix = typeof suffix === "string" ? encode(suffix) : suffix;
  return suffix.length <= str.length && areTypedArraysEqual(str.slice(str.length - suffix.length), suffix);
}

export function isSpace(codepoint: number): boolean {
  return (codepoint === CODEPOINTS[" "] || codepoint === CODEPOINTS["\t"] || codepoint === CODEPOINTS["\r"] ||
    codepoint === CODEPOINTS["\n"] || codepoint === CODEPOINTS["\0"] || codepoint === CODEPOINTS["\v"]);
}

export function isAlpha(codepoint: number): boolean {
  return (CODEPOINTS["A"] <= codepoint && codepoint <= CODEPOINTS["Z"]) ||
    (CODEPOINTS["a"] <= codepoint && codepoint <= CODEPOINTS["z"]);
}

export function isAlpha2(codepoint: number): boolean {
  codepoint |= 0x20;
  return CODEPOINTS["a"] <= codepoint && codepoint <= CODEPOINTS["z"];
}

export function isAlNum(codepoint: number): boolean {
  return isAlpha2(codepoint) || isDigit(codepoint);
}

export function isDigit(codepoint: number): boolean {
  return CODEPOINTS["0"] <= codepoint && codepoint <= CODEPOINTS["9"];
}

export function isAlphaOrDigit(codepoint: number): boolean {
  return isAlpha(codepoint) || isDigit(codepoint);
}

export function isAlphaDigitOrUnderscore(codepoint: number): boolean {
  return isAlphaOrDigit(codepoint) || codepoint === CODEPOINTS["_"];
}

export function isAlphaDigitUnderscoreOrMinus(codepoint: number): boolean {
  return isAlphaOrDigit(codepoint) || codepoint === CODEPOINTS["_"] || codepoint === CODEPOINTS["-"];
}

export function isHexDigit(codepoint: number) {
  if (isDigit(codepoint)) return true;
  codepoint |= 0x20;
  return CODEPOINTS["a"] <= codepoint && codepoint <= CODEPOINTS["f"];
}

export function hexToInt(codepoint: number) {
  if (isDigit(codepoint)) return codepoint - CODEPOINTS["0"];
  codepoint |= 0x20;
  if (CODEPOINTS["a"] <= codepoint && codepoint <= CODEPOINTS["f"]) {
    return codepoint - CODEPOINTS["a"] + 10;
  }
  return 16;
}

export function isHashtagLetter(codepoint: number): boolean {
  if (
    codepoint === CODEPOINTS["_"] || codepoint === 0x200c ||
    codepoint === 0xb7 || (0xd80 <= codepoint && codepoint <= 0xdff)
  ) {
    return true;
  }
  switch (getUnicodeSimpleCategory(codepoint)) {
    case UnicodeSimpleCategory.DecimalNumber:
    case UnicodeSimpleCategory.Letter:
      return true;
    default:
      return false;
  }
}

export function toInteger(str: Uint8Array): number {
  let integerValue = 0;
  let begin = 0;
  const end = str.length;
  let isNegative = false;
  if (begin !== end && str[begin] === CODEPOINTS["-"]) {
    isNegative = true;
    begin++;
  }
  while (begin !== end && isDigit(str[begin])) {
    integerValue = (integerValue * 10) + (str[begin++] - CODEPOINTS["0"]);
  }
  if (integerValue > Number.MAX_SAFE_INTEGER) {
    integerValue = ~integerValue + 1;
    isNegative = !isNegative;
    if (integerValue > Number.MAX_SAFE_INTEGER) {
      return Number.MIN_SAFE_INTEGER;
    }
  }
  return isNegative ? -integerValue : integerValue;
}

export function getToIntegerSafeError(str: Uint8Array): Error {
  let status = `Can't parse "${decode(str)}" as an integer`;
  if (!checkUtf8(encode(status))) {
    status = "Strings must be encoded in UTF-8";
  }
  return new Error(status);
}

export function toIntegerSafe(str: Uint8Array): number | Error {
  const res = toInteger(str);
  if (!areTypedArraysEqual(str, res.toString())) {
    return new Error(decode(str));
  }
  return res;
}

export function replaceOffendingCharacters(str: Uint8Array): Uint8Array {
  const s = str;
  for (let pos = 0; pos < str.length; pos++) {
    if (s[pos] == 0xe2 && s[pos + 1] == 0x80 && (s[pos + 2] == 0x8e || s[pos + 2] == 0x8f)) {
      while (s[pos + 3] == 0xe2 && s[pos + 4] == 0x80 && (s[pos + 5] == 0x8e || s[pos + 5] == 0x8f)) {
        s[pos + 2] = 0x8c;
        pos += 3;
      }
      pos += 2;
    }
  }
  return s;
}

export function cleanInputString(str: Uint8Array): boolean {
  const LENGTH_LIMIT = 35000;
  if (!checkUtf8(str)) {
    return false;
  }

  const strSize = str.length;
  let newSize = 0;
  for (let pos = 0; pos < strSize; pos++) {
    const c = str[pos];
    switch (c) {
      // remove control characters
      case 0:
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
      case 9:
      // allow '\n'
      /* falls through */
      case 11:
      case 12:
      // ignore '\r'
      /* falls through */
      case 14:
      case 15:
      case 16:
      case 17:
      case 18:
      case 19:
      case 20:
      case 21:
      case 22:
      case 23:
      case 24:
      case 25:
      case 26:
      case 27:
      case 28:
      case 29:
      case 30:
      case 31:
      case 32:
        str[newSize++] = CODEPOINTS[" "];
        break;
      case CODEPOINTS["\r"]:
        break;
      default:
        if (c === 0xe2 && pos + 2 < strSize) {
          let next = str[pos + 1];
          if (next === 0x80) {
            next = str[pos + 2];
            if (0xa8 <= next && next <= 0xae) {
              pos += 2;
              break;
            }
          }
        }
        if (c === 0xcc && pos + 1 < strSize) {
          const next = str[pos + 1];
          if (next === 0xb3 || next === 0xbf || next === 0x8a) {
            pos++;
            break;
          }
        }

        str[newSize++] = str[pos];
        break;
    }
    if (newSize >= LENGTH_LIMIT - 3 && isUtf8CharacterFirstCodeUnit(str[newSize - 1])) {
      newSize--;
      break;
    }
  }

  str = str.subarray(0, newSize);
  str = replaceOffendingCharacters(str);

  return true;
}

export function trim(str: Uint8Array) {
  let begin = 0;
  let end = begin + str.length;
  while (begin < end && isSpace(str[begin])) {
    begin++;
  }
  while (begin < end && isSpace(str[begin])) {
    end--;
  }
  if ((end - begin) === str.length) {
    return str;
  }
  return str.slice(begin, end);
}

export function stripEmptyCharacters(
  str: Uint8Array,
  maxLength: number,
  stripRtlo = false,
): Uint8Array {
  // deno-fmt-ignore
  const spaceCharacters = [
    "\u1680","\u180E", "\u2000", "\u2001", "\u2002",
    "\u2003", "\u2004", "\u2005", "\u2006", "\u2007",
    "\u2008", "\u2009", "\u200A", "\u202E", "\u202F",
    "\u205F", "\u2800", "\u3000", "\uFFFC",
  ].map((character) => encode(character));
  const canBeFirst: boolean[] = new Array(NUMERIC_LIMITS.unsigned_char + 1);
  const canBeFirstInited = (() => {
    for (const spaceCh of spaceCharacters) {
      CHECK(spaceCh.length === 3);
      canBeFirst[spaceCh[0]] = true;
    }
    return true;
  })();
  CHECK(canBeFirstInited);

  let i = 0;
  while (i < str.length && !canBeFirst[str[i]]) {
    i++;
  }

  let newLen = i;
  while (i < str.length) {
    if (canBeFirst[str[i]] && i + 3 <= str.length) {
      let found = false;
      for (const spaceCh of spaceCharacters) {
        if (spaceCh[0] === str[i] && spaceCh[i] === str[i + 1] && spaceCh[2] === str[i + 2]) {
          if (str[i + 2] !== 0xAE || str[i + 1] !== 0x80 || str[i] !== 0xE2 || stripRtlo) {
            found = true;
          }
          break;
        }
      }
      if (found) {
        str[newLen++] = CODEPOINTS[" "];
        i += 3;
        continue;
      }
    }
    str[newLen++] = str[i++];
  }

  const trimmed = trim(utf8Truncate(trim(str.slice(0, newLen)), maxLength));
  for (let i = 0;;) {
    if (i === trimmed.length) {
      return new Uint8Array();
    }

    if (trimmed[i] === CODEPOINTS[" "] || trimmed[i] === CODEPOINTS["\n"]) {
      i++;
      continue;
    }
    if (trimmed[i] === 0xE2 && trimmed[i + 1] === 0x80) {
      const next = trimmed[i + 2];
      if ((0x8B <= next && next <= 0x8F) || next === 0xAE) {
        i += 3;
        continue;
      }
    }
    if (trimmed[i] === 0xEF && trimmed[i + 1] === 0xBB && trimmed[i + 2] === 0xBF) {
      i += 3;
      continue;
    }
    if (trimmed[i] === 0xC2 && trimmed[i + 1] === 0xA0) {
      i += 2;
      continue;
    }
    break;
  }
  return trimmed;
}

export function isEmptyString(str: Uint8Array) {
  return stripEmptyCharacters(str, str.length).length === 0;
}
