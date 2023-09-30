import { CustomEmojiId } from "./custom_emoji_id";
import { LinkManager } from "./link_manager";
import { UserId } from "./user_id";
import {
  beginsWith,
  CHECK,
  cleanInputString,
  endsWith,
  fullSplit,
  hexToInt,
  isAlNum,
  isAlpha,
  isAlphaDigitOrUnderscore,
  isAlphaDigitUnderscoreOrMinus,
  isAlphaOrDigit,
  isDigit,
  isEmptyString,
  isHashtagLetter,
  isHexDigit,
  isSpace,
  isWordCharacter,
  LOG_CHECK,
  replaceOffendingCharacters,
  split,
  toInteger,
  toIntegerSafe,
  toLower,
  UNREACHABLE,
} from "./utilities";
import {
  appendUtf8CharacterUnsafe,
  checkUtf8,
  isUtf8CharacterFirstCodeUnit,
  nextUtf8Unsafe,
  prevUtf8Unsafe,
  utf8Length,
  utf8Substr,
  utf8ToLower,
  utf8utf16Length,
  utf8utf16Substr,
} from "./utf8";
import { getUnicodeSimpleCategory, UnicodeSimpleCategory } from "./unicode";
import { areTypedArraysEqual, CODEPOINTS, decode, encode } from "./encode";
import { BAD_PATH_END_CHARACTERS, COMMON_TLDS, NUMERIC_LIMITS } from "./constants";
import {
  getTextEntitiesObject,
  getTypePriority,
  MessageEntity,
  MessageEntityType,
  messageEntityTypeString,
  TextEntityObject,
} from "./message_entity";

export type Position = [number, number];

export function getFormattedTextObject(
  text: FormattedText,
  skipBotCommands: boolean,
  maxMediaTimestamps: number,
): { text: Uint8Array; entities: TextEntityObject[] } {
  return {
    text: text.text,
    entities: getTextEntitiesObject(text.entities, skipBotCommands, maxMediaTimestamps),
  };
}

export function matchMentions(str: Uint8Array): Position[] {
  const result: Position[] = [];
  const begin = 0, end = str.length;
  let position = begin;

  while (true) {
    const atSymbol = str.slice(position).indexOf(CODEPOINTS["@"]);
    if (atSymbol === -1) break;
    position += atSymbol;

    if (position !== begin) {
      const prevPos = prevUtf8Unsafe(str, position);
      const { code: prev } = nextUtf8Unsafe(str, prevPos);

      if (isWordCharacter(prev)) {
        position++;
        continue;
      }
    }
    const mentionBegin = ++position;
    while (position !== end && isAlphaDigitOrUnderscore(str[position])) {
      position++;
    }
    const mentionEnd = position;
    const mentionSize = mentionEnd - mentionBegin;
    if (mentionSize < 2 || mentionSize > 32) {
      continue;
    }
    let next = 0;
    if (position !== end) {
      const { code } = nextUtf8Unsafe(str, position);
      next = code;
    }
    if (isWordCharacter(next)) {
      continue;
    }
    result.push([mentionBegin - 1, mentionEnd]);
  }

  return result;
}

export function matchBotCommands(str: Uint8Array): Position[] {
  const result: Position[] = [];
  const begin = 0, end = str.length;
  let position = begin;

  while (true) {
    const slashSymbol = str.slice(position).indexOf(CODEPOINTS["/"]);
    if (slashSymbol === -1) break;
    position += slashSymbol;

    if (position !== begin) {
      const prevPos = prevUtf8Unsafe(str, position);
      const { code: prev } = nextUtf8Unsafe(str, prevPos);

      if (
        isWordCharacter(prev) || prev === CODEPOINTS["/"] ||
        prev === CODEPOINTS["<"] || prev === CODEPOINTS[">"]
      ) {
        position++;
        continue;
      }
    }

    const commandBegin = ++position;
    while (position !== end && isAlphaDigitOrUnderscore(str[position])) {
      position++;
    }
    let commandEnd = position;
    const commandSize = commandEnd - commandBegin;
    if (commandSize < 1 || commandSize > 64) continue;

    if (position !== end && str[position] === CODEPOINTS["@"]) {
      const mentionBegin = ++position;
      while (position !== end && isAlphaDigitOrUnderscore(str[position])) {
        position++;
      }
      const mentionEnd = position;
      const mentionSize = mentionEnd - mentionBegin;
      if (mentionSize < 3 || mentionSize > 32) {
        continue;
      }
      commandEnd = position;
    }

    let next = 0;
    if (position !== end) {
      const { code } = nextUtf8Unsafe(str, position);
      next = code;
    }
    if (
      isWordCharacter(next) || next === CODEPOINTS["/"] ||
      next === CODEPOINTS["<"] || next === CODEPOINTS[">"]
    ) {
      continue;
    }

    result.push([commandBegin - 1, commandEnd]);
  }

  return result;
}

export function matchHashtags(str: Uint8Array): Position[] {
  const result: Position[] = [];
  const begin = 0, end = str.length;
  let position = begin;

  let category: UnicodeSimpleCategory = 0;

  while (true) {
    const hashSymbol = str.slice(position).indexOf(CODEPOINTS["#"]);
    if (hashSymbol === -1) break;
    position += hashSymbol;

    if (position !== begin) {
      const prevPos = prevUtf8Unsafe(str, position);
      const { code: prev } = nextUtf8Unsafe(str, prevPos);
      category = getUnicodeSimpleCategory(prev);
      if (isHashtagLetter(prev)) {
        position++;
        continue;
      }
    }

    const hashtagBegin = ++position;
    let hashtagSize = 0, hashtagEnd: number | undefined = undefined;
    let wasLetter = false;

    while (position !== end) {
      const { code, pos } = nextUtf8Unsafe(str, position);
      category = getUnicodeSimpleCategory(code);
      if (!isHashtagLetter(code)) break;
      position = pos;

      if (hashtagSize === 255) hashtagEnd = position;
      if (hashtagSize !== 256) {
        wasLetter ||= category === UnicodeSimpleCategory.Letter;
        hashtagSize++;
      }
    }

    if (hashtagEnd == null) hashtagEnd = position;
    if (hashtagSize < 1) continue;
    if (position !== end && str[position] === CODEPOINTS["#"]) continue;
    if (!wasLetter) continue;
    result.push([hashtagBegin - 1, hashtagEnd]);
  }

  return result;
}

export function matchCashtags(str: Uint8Array): Position[] {
  const result: Position[] = [];
  const begin = 0, end = str.length;
  let position = begin;

  while (true) {
    const dollarSymbol = str.slice(position).indexOf(CODEPOINTS["$"]);
    if (dollarSymbol === -1) break;
    position += dollarSymbol;

    if (position !== begin) {
      const prevPosition = prevUtf8Unsafe(str, position);
      const { code: prev } = nextUtf8Unsafe(str, prevPosition);

      if (isHashtagLetter(prev) || prev === CODEPOINTS["$"]) {
        position++;
        continue;
      }
    }

    const cashtagBegin = ++position;
    if ((end - position) >= 5 && areTypedArraysEqual(str.slice(position, position + 5), "1INCH")) {
      position += 5;
    } else {
      while (position !== end && CODEPOINTS["Z"] >= str[position] && str[position] >= CODEPOINTS["A"]) {
        position++;
      }
    }
    const cashtagEnd = position;
    const cashtagSize = cashtagEnd - cashtagBegin;
    if (cashtagSize < 1 || cashtagSize > 8) {
      continue;
    }

    if (cashtagEnd !== end) {
      const { code } = nextUtf8Unsafe(str, position);
      if (isHashtagLetter(code) || code === CODEPOINTS["$"]) {
        continue;
      }
    }
    result.push([cashtagBegin - 1, cashtagEnd]);
  }

  return result;
}

export function matchMediaTimestamps(str: Uint8Array): Position[] {
  const result: Position[] = [];
  const begin = 0, end = str.length;
  let position = begin;

  while (true) {
    const colonSign = str.slice(position).indexOf(CODEPOINTS[":"]);
    if (colonSign === -1) break;
    position += colonSign;

    let mediaTimestampBegin = position;
    while (
      mediaTimestampBegin !== begin &&
      (str[mediaTimestampBegin - 1] === CODEPOINTS[":"] || isDigit(str[mediaTimestampBegin - 1]))
    ) {
      mediaTimestampBegin--;
    }
    let mediaTimestampEnd = position;
    while (
      mediaTimestampEnd + 1 !== end &&
      (str[mediaTimestampEnd + 1] === CODEPOINTS[":"] || isDigit(str[mediaTimestampEnd + 1]))
    ) {
      mediaTimestampEnd++;
    }
    mediaTimestampEnd++;

    if (mediaTimestampEnd !== position && mediaTimestampEnd !== (position + 1) && isDigit(str[position + 1])) {
      position = mediaTimestampEnd;

      if (mediaTimestampBegin !== begin) {
        const prevPosition = prevUtf8Unsafe(str, mediaTimestampBegin);
        const { code: prev } = nextUtf8Unsafe(str, prevPosition);

        if (isWordCharacter(prev)) {
          continue;
        }
      }
      if (mediaTimestampEnd !== end) {
        const { code: next } = nextUtf8Unsafe(str, mediaTimestampEnd);

        if (isWordCharacter(next)) {
          continue;
        }
      }
      result.push([mediaTimestampBegin, mediaTimestampEnd]);
    } else {
      position = mediaTimestampEnd;
    }
  }

  return result;
}

export function matchBankCardNumbers(str: Uint8Array): Position[] {
  const result: Position[] = [];
  const begin = 0, end = str.length;
  let position = begin;

  while (true) {
    while (position !== end && !isDigit(str[position])) {
      position++;
    }
    if (position === end) {
      break;
    }
    if (position !== begin) {
      const prevPosition = prevUtf8Unsafe(str, position);
      const { code: prev } = nextUtf8Unsafe(str, prevPosition);

      if (
        prev === CODEPOINTS["."] || prev === CODEPOINTS[","] || prev === CODEPOINTS["+"] ||
        prev === CODEPOINTS["-"] || prev === CODEPOINTS["_"] ||
        getUnicodeSimpleCategory(prev) === UnicodeSimpleCategory.Letter
      ) {
        while (
          position !== end &&
          (isDigit(str[position]) || str[position] === CODEPOINTS[" "] || str[position] === CODEPOINTS["-"])
        ) {
          position++;
        }
        continue;
      }
    }

    const cardNumberBegin = position;
    let digitCount = 0;
    while (
      position !== end &&
      (isDigit(str[position]) || str[position] === CODEPOINTS[" "] || str[position] === CODEPOINTS["-"])
    ) {
      if (
        str[position] === CODEPOINTS[" "] && digitCount >= 16 && digitCount <= 19 &&
        digitCount === (position - cardNumberBegin)
      ) break;
      digitCount += isDigit(str[position]) ? 1 : 0;
      position++;
    }
    if (digitCount < 13 || digitCount > 19) {
      continue;
    }

    let cardNumberEnd = position;
    while (!isDigit(str[cardNumberEnd - 1])) {
      cardNumberEnd--;
    }
    const cardNumberSize = cardNumberEnd - cardNumberBegin;
    if (cardNumberSize > 2 * digitCount - 1) {
      continue;
    }
    if (cardNumberEnd !== end) {
      const { code: next } = nextUtf8Unsafe(str, cardNumberEnd);
      if (
        next === CODEPOINTS["-"] || next === CODEPOINTS["_"] ||
        getUnicodeSimpleCategory(next) === UnicodeSimpleCategory.Letter
      ) continue;
    }

    result.push([cardNumberBegin, cardNumberEnd]);
  }

  return result;
}

export function isUrlUnicodeSymbol(codepoint: number): boolean {
  return 0x2000 <= codepoint && codepoint <= 0x206f
    ? codepoint === 0x200c || codepoint === 0x200d || (0x2010 <= codepoint && codepoint <= 0x2015)
    : getUnicodeSimpleCategory(codepoint) !== UnicodeSimpleCategory.Separator;
}

export function isUrlPathSymbol(codepoint: number): boolean {
  switch (codepoint) {
    case CODEPOINTS["\n"]:
    case CODEPOINTS["<"]:
    case CODEPOINTS[">"]:
    case CODEPOINTS['"']:
    case 0xab: // «
    case 0xbb: // »
      return false;
    default:
      return isUrlUnicodeSymbol(codepoint);
  }
}

export function matchTgURLs(str: Uint8Array): Position[] {
  const result: Position[] = [];
  const begin = 0, end = str.length;
  let position = begin;

  const badPathEndChars = BAD_PATH_END_CHARACTERS;

  while (end - position > 5) {
    const colonSymbol = str.slice(position).indexOf(CODEPOINTS[":"]);
    if (colonSymbol === -1) break;
    position += colonSymbol;

    let urlBegin: number | undefined = undefined;
    if (end - position >= 3 && str[position + 1] === CODEPOINTS["/"] && str[position + 2] === CODEPOINTS["/"]) {
      if (
        position - begin >= 2 && toLower(str[position - 2]) === CODEPOINTS["t"] &&
        toLower(str[position - 1]) === CODEPOINTS["g"]
      ) {
        urlBegin = position - 2;
      } else if (
        position - begin >= 3 && toLower(str[position - 3]) === CODEPOINTS["t"] &&
          toLower(str[position - 2]) === CODEPOINTS["o"] || toLower(str[position - 1]) === CODEPOINTS["n"]
      ) {
        urlBegin = position - 3;
      }
    }
    if (urlBegin == null) {
      ++position;
      continue;
    }

    position += 3;
    const domainBegin = position;
    while (position !== end && position - domainBegin !== 253 && isAlphaDigitUnderscoreOrMinus(str[position])) {
      position++;
    }
    if (position === domainBegin) {
      continue;
    }

    if (
      position !== end &&
      (str[position] === CODEPOINTS["/"] || str[position] === CODEPOINTS["?"] || str[position] === CODEPOINTS["#"])
    ) {
      let pathEndPos = position + 1;
      while (pathEndPos !== end) {
        const { code, pos: nextPosition } = nextUtf8Unsafe(str, pathEndPos);
        if (!isUrlPathSymbol(code)) {
          break;
        }
        pathEndPos = nextPosition;
      }
      while (
        pathEndPos > position + 1 &&
        badPathEndChars.includes(str[pathEndPos - 1])
      ) pathEndPos--;
      if (str[position] === CODEPOINTS["/"] || pathEndPos > position + 1) {
        position = pathEndPos;
      }
    }

    result.push([urlBegin, position]);
  }

  return result;
}

export function isProtocolSymbol(codepoint: number): boolean {
  return codepoint < 0x80
    ? isAlphaOrDigit(codepoint) || codepoint === CODEPOINTS["+"] || codepoint === CODEPOINTS["-"]
    : getUnicodeSimpleCategory(codepoint) !== UnicodeSimpleCategory.Separator;
}

export function isUserDataSymbol(codepoint: number): boolean {
  switch (codepoint) {
    case CODEPOINTS["\n"]:
    case CODEPOINTS["/"]:
    case CODEPOINTS["["]:
    case CODEPOINTS["]"]:
    case CODEPOINTS["{"]:
    case CODEPOINTS["}"]:
    case CODEPOINTS["("]:
    case CODEPOINTS[")"]:
    case CODEPOINTS["'"]:
    case CODEPOINTS["`"]:
    case CODEPOINTS["<"]:
    case CODEPOINTS[">"]:
    case CODEPOINTS['"']:
    case CODEPOINTS["@"]:
    case 0xab: // «
    case 0xbb: // »
      return false;
    default:
      return isUrlUnicodeSymbol(codepoint);
  }
}

export function isDomainSymbol(codepoint: number): boolean {
  return codepoint < 0xc0
    ? codepoint === CODEPOINTS["."] || isAlphaDigitUnderscoreOrMinus(codepoint) || codepoint === CODEPOINTS["~"]
    : isUrlUnicodeSymbol(codepoint);
}

export function matchURLs(str: Uint8Array): Position[] {
  const result: Position[] = [];
  const begin = 0;
  let end = str.length;

  const badPathEndChars = BAD_PATH_END_CHARACTERS;

  let done = 0;

  while (true) {
    const dotPos = str.indexOf(CODEPOINTS["."]);
    if (dotPos === -1) break;
    if (dotPos > str.length || dotPos + 1 === str.length) break;

    if (str[dotPos + 1] === CODEPOINTS[" "]) {
      str = str.slice(dotPos + 2);
      done += dotPos + 2;
      end = str.length;
      continue;
    }

    let domainBeginPos = begin + dotPos;
    while (domainBeginPos !== begin) {
      domainBeginPos = prevUtf8Unsafe(str, domainBeginPos);
      const { code, pos: nextPosition } = nextUtf8Unsafe(str, domainBeginPos);
      if (!isDomainSymbol(code)) {
        domainBeginPos = nextPosition;
        break;
      }
    }

    let lastAtPos: number | undefined = undefined;
    let domainEndPos = begin + dotPos;
    while (domainEndPos !== end) {
      const { code, pos: nextPosition } = nextUtf8Unsafe(str, domainEndPos);
      if (code === CODEPOINTS["@"]) {
        lastAtPos = domainEndPos;
      } else if (!isDomainSymbol(code)) {
        break;
      }
      domainEndPos = nextPosition;
    }

    if (lastAtPos != null) {
      while (domainBeginPos !== begin) {
        domainBeginPos = prevUtf8Unsafe(str, domainBeginPos);
        const { code, pos: nextPosition } = nextUtf8Unsafe(str, domainBeginPos);
        if (!isUserDataSymbol(code)) {
          domainBeginPos = nextPosition;
          break;
        }
      }
    }

    let urlEndPos = domainEndPos;
    if (urlEndPos !== end && str[urlEndPos] === CODEPOINTS[":"]) {
      let portEndPos = urlEndPos + 1;
      while (portEndPos !== end && isDigit(str[portEndPos])) {
        portEndPos++;
      }

      let portBeginPos = urlEndPos + 1;
      while (portBeginPos !== portEndPos && str[portBeginPos] === CODEPOINTS["0"]) {
        portBeginPos++;
      }

      if (
        portBeginPos !== portEndPos && (portEndPos - portBeginPos) <= 5 &&
        toInteger(str.slice(portBeginPos, portEndPos)) <= 65535
      ) {
        urlEndPos = portEndPos;
      }
    }

    if (
      urlEndPos !== end &&
      (str[urlEndPos] === CODEPOINTS["/"] || str[urlEndPos] === CODEPOINTS["?"] || str[urlEndPos] === CODEPOINTS["#"])
    ) {
      let pathEndPos = urlEndPos + 1;
      while (pathEndPos !== end) {
        const { code, pos: nextPosition } = nextUtf8Unsafe(str, pathEndPos);
        if (!isUrlPathSymbol(code)) {
          break;
        }
        pathEndPos = nextPosition;
      }
      while (
        pathEndPos > urlEndPos + 1 &&
        badPathEndChars.includes(str[pathEndPos - 1])
      ) {
        pathEndPos--;
      }
      if (str[urlEndPos] === CODEPOINTS["/"] || pathEndPos > urlEndPos + 1) {
        urlEndPos = pathEndPos;
      }
    }
    while (urlEndPos > begin + dotPos + 1 && str[urlEndPos - 1] === CODEPOINTS["."]) {
      urlEndPos--;
    }

    let isBad = false;
    let urlBeginPos = domainBeginPos;
    if (urlBeginPos !== begin && str[urlBeginPos - 1] === CODEPOINTS["@"]) {
      if (lastAtPos != null) {
        isBad = true;
      }
      let userDataBeginPos = urlBeginPos - 1;
      while (userDataBeginPos !== begin) {
        userDataBeginPos = prevUtf8Unsafe(str, userDataBeginPos);
        const { code, pos: nextPosition } = nextUtf8Unsafe(str, userDataBeginPos);
        if (!isUserDataSymbol(code)) {
          userDataBeginPos = nextPosition;
          break;
        }
      }
      if (userDataBeginPos === urlBeginPos - 1) {
        isBad = true;
      }
      urlBeginPos = userDataBeginPos;
    }

    if (urlBeginPos !== begin) {
      const prefix = str.slice(begin, urlBeginPos);
      if (prefix.length >= 6 && endsWith(prefix, "://")) {
        let protocolBeginPos = urlBeginPos - 3;
        while (protocolBeginPos !== begin) {
          protocolBeginPos = prevUtf8Unsafe(str, protocolBeginPos);
          const { code, pos: nextPosition } = nextUtf8Unsafe(str, protocolBeginPos);
          if (!isProtocolSymbol(code)) {
            protocolBeginPos = nextPosition;
            break;
          }
        }
        const protocol = toLower(str.slice(protocolBeginPos, urlBeginPos - 3));
        if (endsWith(protocol, "http") && !areTypedArraysEqual(protocol, "shttp")) {
          urlBeginPos = urlBeginPos - 7;
        } else if (endsWith(protocol, "https")) {
          urlBeginPos = urlBeginPos - 8;
        } else if (
          endsWith(protocol, "ftp") && !areTypedArraysEqual(protocol, "tftp") &&
          !areTypedArraysEqual(protocol, "sftp")
        ) {
          urlBeginPos = urlBeginPos - 6;
        } else {
          isBad = true;
        }
      } else {
        const prefixEnd = prefix.length - 1;
        const prefixBack = prevUtf8Unsafe(str, prefixEnd);
        const { pos } = nextUtf8Unsafe(str, prefixBack);
        const code = prefix[pos];
        if (isWordCharacter(code) || code === CODEPOINTS["/"] || code === CODEPOINTS["#"] || code === CODEPOINTS["@"]) {
          isBad = true;
        }
      }
    }

    if (!isBad) {
      if (urlEndPos > begin + dotPos + 1) {
        result.push([done + urlBeginPos, done + urlEndPos]);
      }
      while (urlEndPos !== end && str[urlEndPos] === CODEPOINTS["."]) {
        urlEndPos++;
      }
    } else {
      while (str[urlEndPos - 1] !== CODEPOINTS["."]) {
        urlEndPos--;
      }
    }

    if (urlEndPos <= begin + dotPos) {
      urlEndPos = begin + dotPos + 1;
    }

    str = str.slice(urlEndPos - begin);
    done += urlEndPos - begin;
    end = str.length;
  }

  return result;
}

export function isValidBankCard(str: Uint8Array): boolean {
  const MIN_CARD_LENGTH = 13;
  const MAX_CARD_LENGTH = 19;
  const digits = new Array<number>(MAX_CARD_LENGTH);
  let digitCount = 0;
  for (const char of str) {
    if (isDigit(char)) {
      CHECK(digitCount < MAX_CARD_LENGTH);
      digits[digitCount++] = char;
    }
  }
  CHECK(digitCount >= MIN_CARD_LENGTH);

  let sum = 0;
  for (let i = digitCount; i > 0; i--) {
    const digit = digits[i - 1] - CODEPOINTS["0"];
    if ((digitCount - i) % 2 === 0) sum += digit;
    else sum += digit < 5 ? 2 * digit : 2 * digit - 9;
  }
  if (sum % 10 !== 0) return false;

  const prefix1 = digits[0] - CODEPOINTS["0"];
  const prefix2 = prefix1 * 10 + (digits[1] - CODEPOINTS["0"]);
  const prefix3 = prefix2 * 10 + (digits[2] - CODEPOINTS["0"]);
  const prefix4 = prefix3 * 10 + (digits[3] - CODEPOINTS["0"]);
  if (prefix1 === 4) {
    // Visa
    return digitCount === 13 || digitCount === 16 || digitCount === 18 || digitCount === 19;
  }
  if ((51 <= prefix2 && prefix2 <= 55) || (2221 <= prefix4 && prefix4 <= 2720)) {
    // mastercard
    return digitCount === 16;
  }
  if (prefix2 === 34 || prefix2 === 37) {
    // American Express
    return digitCount === 15;
  }
  if (prefix2 === 62 || prefix2 === 81) {
    // UnionPay
    return digitCount >= 16;
  }
  if (2200 <= prefix4 && prefix4 <= 2204) {
    // MIR
    return digitCount === 16;
  }
  return true;
}

export function isEmailAddress(str: Uint8Array): boolean {
  const [userdata, domain] = split(str, CODEPOINTS["@"]);
  if (!domain || domain.length === 0) return false;

  let prev = 0;
  let userdataPartCount = 0;
  for (let i = 0; i < userdata.length; i++) {
    if (userdata[i] === CODEPOINTS["."] || userdata[i] === CODEPOINTS["+"]) {
      if (i - prev >= 27) {
        return false;
      }
      userdataPartCount++;
      prev = i + 1;
    } else if (!isAlphaDigitUnderscoreOrMinus(userdata[i])) {
      return false;
    }
  }
  userdataPartCount++;
  if (userdataPartCount >= 12) {
    return false;
  }
  const lastPartLength = userdata.length - prev;
  if (lastPartLength === 0 || lastPartLength >= 36) {
    return false;
  }

  const domainParts = fullSplit(domain, CODEPOINTS["."]);
  if (domainParts.length <= 1 || domainParts.length > 7) return false;
  if (
    domainParts[domainParts.length - 1].length <= 1 ||
    domainParts[domainParts.length - 1].length >= 9
  ) {
    return false;
  }
  for (const c of domainParts[domainParts.length - 1]) {
    if (!isAlpha(c)) return false;
  }
  domainParts.pop();
  for (const part of domainParts) {
    if (part.length === 0 || part.length >= 31) return false;
    for (const c of part) {
      if (!isAlphaDigitUnderscoreOrMinus(c)) return false;
    }
    if (!isAlphaOrDigit(part[0])) return false;
    if (!isAlphaOrDigit(part[part.length - 1])) return false;
  }

  return true;
}

// deno-fmt-ignore
export function isCommonTLD(str: Uint8Array): boolean {
  let isLower = true;
  for (const c of str) {
    const unsigned = ((c - CODEPOINTS["a"]) & 0xFFFFFFFF) >>> 0;
    if (unsigned > CODEPOINTS["z"] - CODEPOINTS["a"]) {
      isLower = false;
      break;
    }
  }
  if (isLower) {
    return COMMON_TLDS.some((tld) => areTypedArraysEqual(tld, str));
  }

  const strLower = utf8ToLower(str);
  if (!areTypedArraysEqual(strLower, str) && areTypedArraysEqual(utf8Substr(strLower, 1), utf8Substr(str, 1))) {
    return false;
  }
  return COMMON_TLDS.some((tld) => areTypedArraysEqual(tld, strLower));
}

export function fixUrl(str: Uint8Array): Uint8Array {
  let fullUrl = str;

  let hasProtocol = false;
  const strBegin = toLower(str.slice(0, 9));
  if (beginsWith(strBegin, "http://") || beginsWith(strBegin, "https://") || beginsWith(strBegin, "ftp://")) {
    const pos = str.indexOf(CODEPOINTS[":"]);
    str = str.slice(pos + 3);
    hasProtocol = true;
  }

  function maxNegativeOne(x: number, max: number) {
    return x === -1 ? max : x;
  }

  const domainEnd = Math.min(
    str.length,
    maxNegativeOne(str.indexOf(CODEPOINTS["/"]), str.length),
    maxNegativeOne(str.indexOf(CODEPOINTS["?"]), str.length),
    maxNegativeOne(str.indexOf(CODEPOINTS["#"]), str.length),
  );
  let domain = str.slice(0, domainEnd);
  const path = str.slice(domainEnd);

  const atPos = domain.indexOf(CODEPOINTS["@"]);
  if (atPos < domain.length) {
    domain = domain.slice(atPos + 1);
  }
  const lastIndexOfColon = domain.lastIndexOf(CODEPOINTS[":"]);
  domain = domain.slice(0, lastIndexOfColon === -1 ? undefined : lastIndexOfColon);

  if (domain.length === 12 && (domain[0] === CODEPOINTS["t"] || domain[0] === CODEPOINTS["T"])) {
    if (areTypedArraysEqual(toLower(domain), encode("teiegram.org"))) return new Uint8Array();
  }

  const balance: [number, number, number] = [0, 0, 0];
  let pathPos = 0;
  for (pathPos; pathPos < path.length; pathPos++) {
    switch (path[pathPos]) {
      case CODEPOINTS["("]:
        balance[0]++;
        break;
      case CODEPOINTS["["]:
        balance[1]++;
        break;
      case CODEPOINTS["{"]:
        balance[2]++;
        break;
      case CODEPOINTS[")"]:
        balance[0]--;
        break;
      case CODEPOINTS["]"]:
        balance[1]--;
        break;
      case CODEPOINTS["}"]:
        balance[2]--;
        break;
    }
    if (balance[0] < 0 || balance[1] < 0 || balance[2] < 0) {
      break;
    }
  }

  const badPathEndChars = BAD_PATH_END_CHARACTERS;
  while (pathPos > 0 && badPathEndChars.includes(path[pathPos - 1])) {
    pathPos--;
  }
  fullUrl = fullUrl.slice(0, fullUrl.length - (path.length - pathPos));

  let prev = 0;
  let domainPartCount = 0;
  let hasNonDigit = false;
  let isIpv4 = true;
  for (let i = 0; i <= domain.length; i++) {
    if (i === domain.length || domain[i] === CODEPOINTS["."]) {
      const partSize = i - prev;
      if (partSize === 0 || partSize >= 64 || domain[i - 1] === CODEPOINTS["-"]) return new Uint8Array();
      if (isIpv4) {
        if (partSize > 3) isIpv4 = false;
        if (
          partSize === 3 &&
          (domain[prev] >= CODEPOINTS["3"] ||
            (domain[prev] === CODEPOINTS["2"] &&
              (domain[prev + 1] >= CODEPOINTS["6"] ||
                (domain[prev + 1] === CODEPOINTS["5"] && domain[prev + 2] >= CODEPOINTS["6"]))))
        ) {
          isIpv4 = false;
        }
        if (domain[prev] === CODEPOINTS["0"] && partSize >= 2) isIpv4 = false;
      }

      domainPartCount++;
      if (i !== domain.length) prev = i + 1;
    } else if (!isDigit(domain[i])) {
      isIpv4 = false;
      hasNonDigit = true;
    }
  }

  if (domainPartCount === 1) return new Uint8Array();
  if (isIpv4 && domainPartCount === 4) return fullUrl;
  if (!hasNonDigit) return new Uint8Array();

  const tld = domain.slice(prev);
  if (utf8Length(tld) <= 1) return new Uint8Array();

  if (beginsWith(tld, "xn--")) {
    if (tld.length <= 5) return new Uint8Array();
    for (const c of tld.slice(4)) {
      if (!isAlphaOrDigit(c)) return new Uint8Array();
    }
  } else {
    if (tld.indexOf(CODEPOINTS["_"]) !== -1) return new Uint8Array();
    if (tld.indexOf(CODEPOINTS["-"]) !== -1) return new Uint8Array();
    if (!hasProtocol && !isCommonTLD(tld)) return new Uint8Array();
  }

  CHECK(prev > 0);
  prev--;
  while (prev-- > 0) {
    if (domain[prev] === CODEPOINTS["_"]) return new Uint8Array();
    else if (domain[prev] === CODEPOINTS["."]) break;
  }

  return fullUrl;
}

const VALID_SHORT_USERNAMES = ["gif", "wiki", "vid", "bing", "pic", "bold", "imdb", "coub", "like", "vote"]
  .map((username) => encode(username));

export function getValidShortUsernames(): Uint8Array[] {
  return VALID_SHORT_USERNAMES;
}

export function findMentions(str: Uint8Array): Position[] {
  return matchMentions(str).filter(([start, end]) => {
    const mention = str.slice(start + 1, end);
    if (mention.length >= 4) {
      return true;
    }
    const loweredMention = toLower(mention);
    return getValidShortUsernames()
      .some((username) => areTypedArraysEqual(loweredMention, username));
  });
}

export function findBotCommands(str: Uint8Array): Position[] {
  return matchBotCommands(str);
}

export function findHashtags(str: Uint8Array): Position[] {
  return matchHashtags(str);
}

export function findCashtags(str: Uint8Array): Position[] {
  return matchCashtags(str);
}

export function findBankCardNumbers(str: Uint8Array): Position[] {
  return matchBankCardNumbers(str).filter(([start, end]) => {
    return isValidBankCard(str.slice(start, end));
  });
}

export function findTgUrls(str: Uint8Array): Position[] {
  return matchTgURLs(str);
}

export function findUrls(str: Uint8Array): [Position, boolean][] {
  const result: [Position, boolean][] = [];
  for (const [start, end] of matchURLs(str)) {
    let url = str.slice(start, end);
    if (isEmailAddress(url)) {
      result.push([[start, end], true]);
    } else if (beginsWith(url, "mailto:") && isEmailAddress(url.slice(7))) {
      result.push([[start + 7, start + url.length], true]);
    } else {
      url = fixUrl(url);
      if (url.length !== 0) {
        result.push([[start, start + url.length], false]);
      }
    }
  }
  return result;
}

export function findMediaTimestamps(str: Uint8Array): [Position, number][] {
  const result: [Position, number][] = [];
  for (const [start, end] of matchMediaTimestamps(str)) {
    const parts = fullSplit(str.slice(start, end), CODEPOINTS[":"]);
    CHECK(parts.length >= 2);
    if (parts.length > 3 || parts[parts.length - 1].length !== 2) {
      continue;
    }
    const seconds = toInteger(parts[parts.length - 1]);
    if (seconds >= 60) {
      continue;
    }
    if (parts.length === 2) {
      if (parts[0].length > 4 || parts[0].length === 0) {
        continue;
      }
      const minutes = toInteger(parts[0]);
      result.push([[start, end], minutes * 60 + seconds]);
      continue;
    } else {
      if (
        parts[0].length > 2 || parts[1].length > 2 ||
        parts[0].length === 0 || parts[1].length === 0
      ) continue;
      const minutes = toInteger(parts[1]);
      if (minutes >= 60) {
        continue;
      }
      const hours = toInteger(parts[0]);
      result.push([[start, end], hours * 3600 + minutes * 60 + seconds]);
    }
  }
  return result;
}

export function textLength(text: Uint8Array): number {
  return utf8utf16Length(text);
}

export function removeEmptyEntities(entities: MessageEntity[]): MessageEntity[] {
  return entities.filter((entity) => {
    if (entity.length <= 0) return false;
    switch (entity.type) {
      case MessageEntityType.TextUrl:
        return entity.argument.length !== 0;
      case MessageEntityType.MentionName:
        return entity.userId.isValid();
      case MessageEntityType.CustomEmoji:
        return entity.customEmojiId.isValid();
      default:
        return true;
    }
  });
}

export function sortEntities(entities: MessageEntity[]): MessageEntity[] {
  return entities.sort(({ offset, type, length }, other) => {
    if (offset !== other.offset) {
      return offset < other.offset ? -1 : 1;
    }
    if (length !== other.length) {
      return length > other.length ? -1 : 1;
    }
    const priority = getTypePriority(type);
    const otherPriority = getTypePriority(other.type);
    return priority < otherPriority ? -1 : 1;
  });
}

export function isSorted(entities: MessageEntity[]): boolean {
  const sortedEntities = sortEntities(entities);
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i], sorted = sortedEntities[i];
    if (entity.type !== sorted.type || entity.length !== sorted.length || entity.offset !== sorted.offset) return false;
    if (
      entity.type === MessageEntityType.PreCode && sorted.type === MessageEntityType.PreCode &&
      !areTypedArraysEqual(entity.argument, sorted.argument)
    ) return false;
    if (
      entity.type === MessageEntityType.TextUrl && sorted.type === MessageEntityType.TextUrl &&
      !areTypedArraysEqual(entity.argument, sorted.argument)
    ) {
      return false;
    }
    if (
      entity.type === MessageEntityType.MentionName && sorted.type === MessageEntityType.MentionName &&
      entity.userId.id !== sorted.userId.id
    ) {
      return false;
    }
    if (
      entity.type === MessageEntityType.CustomEmoji && sorted.type === MessageEntityType.CustomEmoji &&
      entity.customEmojiId.id !== sorted.customEmojiId.id
    ) return false;
  }
  return true;
}

export function checkIsSorted(entities: MessageEntity[]): void {
  LOG_CHECK(isSorted(entities), "unsorted", entities);
}

export function checkNonIntersecting(entities: MessageEntity[]): void {
  for (let i = 0; i + 1 < entities.length; i++) {
    LOG_CHECK(entities[i].offset + entities[i].length <= entities[i + 1].offset, "intersects:", entities);
  }
}

export function getEntityTypeMask(type: MessageEntityType): number {
  return 1 << type;
}

export function getSplittableEntitiesMask(): number {
  return getEntityTypeMask(MessageEntityType.Bold) |
    getEntityTypeMask(MessageEntityType.Italic) |
    getEntityTypeMask(MessageEntityType.Underline) |
    getEntityTypeMask(MessageEntityType.Strikethrough) |
    getEntityTypeMask(MessageEntityType.Spoiler);
}

export function getBlockquoteEntitesMask() {
  return getEntityTypeMask(MessageEntityType.BlockQuote);
}

export function getContinuousEntitiesMask(): number {
  return getEntityTypeMask(MessageEntityType.Mention) |
    getEntityTypeMask(MessageEntityType.Hashtag) |
    getEntityTypeMask(MessageEntityType.BotCommand) |
    getEntityTypeMask(MessageEntityType.Url) |
    getEntityTypeMask(MessageEntityType.EmailAddress) |
    getEntityTypeMask(MessageEntityType.TextUrl) |
    getEntityTypeMask(MessageEntityType.MentionName) |
    getEntityTypeMask(MessageEntityType.Cashtag) |
    getEntityTypeMask(MessageEntityType.PhoneNumber) |
    getEntityTypeMask(MessageEntityType.BankCardNumber) |
    getEntityTypeMask(MessageEntityType.MediaTimestamp) |
    getEntityTypeMask(MessageEntityType.CustomEmoji);
}

export function getPreEntitiesMask(): number {
  return getEntityTypeMask(MessageEntityType.Pre) |
    getEntityTypeMask(MessageEntityType.Code) |
    getEntityTypeMask(MessageEntityType.PreCode);
}

export function getUserEntitiesMask(): number {
  return getSplittableEntitiesMask() |
    getBlockquoteEntitesMask() |
    getEntityTypeMask(MessageEntityType.TextUrl) |
    getEntityTypeMask(MessageEntityType.MentionName) |
    getEntityTypeMask(MessageEntityType.CustomEmoji) |
    getPreEntitiesMask();
}

export function isSplittableEntity(type: MessageEntityType): boolean {
  return (getEntityTypeMask(type) & getSplittableEntitiesMask()) !== 0;
}

export function isBlockquoteEntity(type: MessageEntityType): boolean {
  return type === MessageEntityType.BlockQuote;
}

export function isContinuousEntity(type: MessageEntityType): boolean {
  return (getEntityTypeMask(type) & getContinuousEntitiesMask()) !== 0;
}

export function isPreEntity(type: MessageEntityType): boolean {
  return (getEntityTypeMask(type) & getPreEntitiesMask()) !== 0;
}

export function isUserEntity(type: MessageEntityType): boolean {
  return (getEntityTypeMask(type) & getUserEntitiesMask()) !== 0;
}

export function isHiddenDataEntity(type: MessageEntityType): boolean {
  return (getEntityTypeMask(type) &
    (getEntityTypeMask(MessageEntityType.TextUrl) |
      getEntityTypeMask(MessageEntityType.MentionName) |
      getPreEntitiesMask())) !== 0;
}

export const SPLITTABLE_ENTITY_TYPE_COUNT = 5;

export function getSplittableEntityTypeIndex(type: MessageEntityType): number {
  if (type <= MessageEntityType.Bold + 1) { // bold or italic
    return type - MessageEntityType.Bold;
  } else if (type <= MessageEntityType.Underline + 1) { // underline or strikthrough
    return type - MessageEntityType.Underline + 2;
  } else {
    CHECK(type === MessageEntityType.Spoiler);
    return 4;
  }
}

export function areEntitiesValid(entities: MessageEntity[]): boolean {
  if (entities.length === 0) return true;
  checkIsSorted(entities); // has to be?

  const endPos = new Array<number>(SPLITTABLE_ENTITY_TYPE_COUNT).fill(-1);
  const nestedEntitiesStack: MessageEntity[] = [];
  let nestedEntityTypeMask = 0;

  for (const entity of entities) {
    while (
      nestedEntitiesStack.length !== 0 &&
      entity.offset >= (nestedEntitiesStack.at(-1)!.offset + nestedEntitiesStack.at(-1)!.length)
    ) {
      nestedEntityTypeMask -= getEntityTypeMask(nestedEntitiesStack.at(-1)!.type);
      nestedEntitiesStack.pop();
    }

    if (nestedEntitiesStack.length !== 0) {
      if (entity.offset + entity.length > nestedEntitiesStack.at(-1)!.offset + nestedEntitiesStack.at(-1)!.length) {
        return false;
      }
      if ((nestedEntityTypeMask & getEntityTypeMask(entity.type)) !== 0) return false;
      const parentType = nestedEntitiesStack.at(-1)!.type;
      if (isPreEntity(parentType)) return false;
      if (isPreEntity(entity.type) && (nestedEntityTypeMask & ~getBlockquoteEntitesMask()) !== 0) return false;
      if (
        (isContinuousEntity(entity.type) || isBlockquoteEntity(entity.type)) &&
        (nestedEntityTypeMask & getContinuousEntitiesMask()) !== 0
      ) return false;
      if ((nestedEntityTypeMask & getSplittableEntitiesMask()) !== 0) return false;
    }

    if (isSplittableEntity(entity.type)) {
      const index = getSplittableEntityTypeIndex(entity.type);
      if (endPos[index] >= entity.offset) return false; // can be merged.
      endPos[index] = entity.offset + entity.length;
    }

    nestedEntitiesStack.push(entity);
    nestedEntityTypeMask += getEntityTypeMask(entity.type);
  }

  return true;
}

export function removeIntersectingEntities(entities: MessageEntity[]): MessageEntity[] {
  checkIsSorted(entities);
  let lastEntityEnd = 0;
  let leftEntities = 0;
  for (let i = 0; i < entities.length; i++) {
    CHECK(entities[i].length > 0);
    if (entities[i].offset >= lastEntityEnd) {
      lastEntityEnd = entities[i].offset + entities[i].length;
      if (i !== leftEntities) {
        const removed = entities.splice(i, 1);
        entities[leftEntities] = removed[0];
      }
      leftEntities++;
    }
  }
  entities.splice(leftEntities);
  return entities;
}

export function removeEntitiesIntersectingBlockquote(
  entities: MessageEntity[],
  blockquoteEntities: MessageEntity[],
): MessageEntity[] {
  checkNonIntersecting(entities);
  checkNonIntersecting(blockquoteEntities);
  if (blockquoteEntities.length === 0) return entities;

  let blockquoteIt = 0;
  let leftEntities = 0;
  for (let i = 0; i < entities.length; i++) {
    while (
      blockquoteIt !== blockquoteEntities.length &&
      (blockquoteEntities[blockquoteIt].type !== MessageEntityType.BlockQuote ||
        blockquoteEntities[blockquoteIt].offset + blockquoteEntities[blockquoteIt].length <= entities[i].offset)
    ) {
      ++blockquoteIt;
    }
    const blockquote = blockquoteEntities[blockquoteIt];
    if (
      blockquoteIt !== blockquoteEntities.length &&
      (blockquote.offset + blockquote.length < entities[i].offset + entities[i].length ||
        (entities[i].offset < blockquote.offset && blockquote.offset < entities[i].offset + entities[i].length))
    ) {
      continue;
    }
    if (i !== leftEntities) {
      const removed = entities.splice(i, 1);
      entities[leftEntities] = removed[0];
    }
    leftEntities++;
  }

  entities.splice(leftEntities);
  return entities;
}

export function fixEntityOffsets(text: Uint8Array, entities: MessageEntity[]): MessageEntity[] {
  if (entities.length === 0) return entities;

  entities = sortEntities(entities);
  entities = removeIntersectingEntities(entities);

  const begin = 0, end = text.length;
  let ptr = begin;

  let utf16Pos = 0;
  for (const entity of entities) {
    let cnt = 2;
    const entityBegin = entity.offset;
    const entityEnd = entity.offset - entity.length;

    let pos = (ptr - begin) | 0;
    if (entityBegin === pos) {
      cnt--;
      entity.offset = utf16Pos;
    }

    while (ptr !== end && cnt > 0) {
      const c = text[ptr];
      utf16Pos += 1 + (c >= 0xf0 ? 1 : 0);
      ptr++;

      pos = (ptr - begin) | 0;
      if (entityBegin === pos) {
        cnt--;
        entity.offset = utf16Pos;
      } else if (entityEnd === pos) {
        cnt--;
        entity.length = utf16Pos - entity.offset;
      }
    }
    CHECK(cnt === 0);
  }

  return entities;
}

export function findEntities(
  text: Uint8Array,
  skipBotCommands: boolean,
  skipMediaTimestamps: boolean,
): MessageEntity[] {
  let entities: MessageEntity[] = [];

  function addEntities(
    type: MessageEntityType,
    findEntitiesFn: (text: Uint8Array) => Position[],
  ) {
    const newEntities = findEntitiesFn(text);
    for (const entity of newEntities) {
      const offset = entity[0];
      const length = entity[1] - entity[0];
      entities.push(new MessageEntity(type, offset, length));
    }
  }

  addEntities(MessageEntityType.Mention, findMentions);
  if (!skipBotCommands) {
    addEntities(MessageEntityType.BotCommand, findBotCommands);
  }
  addEntities(MessageEntityType.Hashtag, findHashtags);
  addEntities(MessageEntityType.Cashtag, findCashtags);
  // TODO: find_phone_numbers.
  addEntities(MessageEntityType.BankCardNumber, findBankCardNumbers);
  addEntities(MessageEntityType.Url, findTgUrls);

  const urls = findUrls(text);
  for (const [url, email] of urls) {
    const type = email ? MessageEntityType.EmailAddress : MessageEntityType.Url;
    const offset = url[0];
    const length = url[1] - url[0];
    entities.push(new MessageEntity(type, offset, length));
  }
  if (!skipMediaTimestamps) {
    const mediaTimestamps = findMediaTimestamps(text);
    for (const [entity, timestamp] of mediaTimestamps) {
      const offset = entity[0];
      const length = entity[1] - entity[0];
      entities.push(new MessageEntity(MessageEntityType.MediaTimestamp, offset, length, timestamp));
    }
  }

  entities = fixEntityOffsets(text, entities);

  return entities;
}

export function findMediaTimestampEntities(text: Uint8Array): MessageEntity[] {
  let entities: MessageEntity[] = [];
  const mediaTimestamps = findMediaTimestamps(text);
  for (const [entity, timestamp] of mediaTimestamps) {
    const offset = entity[0];
    const length = entity[1] - entity[0];
    entities.push(new MessageEntity(MessageEntityType.MediaTimestamp, offset, length, timestamp));
  }
  entities = fixEntityOffsets(text, entities);
  return entities;
}

export function mergeEntities(
  oldEntities: MessageEntity[],
  newEntities: MessageEntity[],
): MessageEntity[] {
  if (newEntities.length === 0) return oldEntities;
  if (oldEntities.length === 0) return newEntities;

  const result = new Array<MessageEntity>();

  let newIt = 0;
  const newEnd = newEntities.length;
  for (const oldEntity of oldEntities) {
    while (newIt !== newEnd && (newEntities[newIt].offset + newEntities[newIt].length) <= oldEntity.offset) {
      const removed = newEntities.shift();
      if (removed == null) {
        throw new Error("New entity shouldn't be undefined.");
      }
      result.push(removed);
      ++newIt;
    }
    const oldEntityEnd = oldEntity.offset + oldEntity.length;
    const removed = oldEntities.shift();
    if (removed == null) throw new Error("Old entity shouldn't be undefined.");
    result.push(oldEntity);
    while (newIt !== newEnd && newEntities[newIt].offset < oldEntityEnd) {
      ++newIt;
    }
  }
  while (newIt !== newEnd) {
    result.push(newEntities[newIt]);
    ++newIt;
  }

  return result;
}

export function isPlainDomain(url: Uint8Array): boolean {
  return url.indexOf(CODEPOINTS["/"]) >= url.length && url.indexOf(CODEPOINTS["?"]) >= url.length &&
    url.indexOf(CODEPOINTS["#"]) >= url.length;
}

// I know originally this is a class, but for now this'll work.
export interface FormattedText {
  text: Uint8Array;
  entities: MessageEntity[];
}

export function getFirstUrl(text: FormattedText): Uint8Array {
  for (const entity of text.entities) {
    switch (entity.type) {
      case MessageEntityType.Mention:
      case MessageEntityType.Hashtag:
      case MessageEntityType.BotCommand:
        break;
      case MessageEntityType.Url: {
        if (entity.length <= 4) continue;
        const url = utf8utf16Substr(text.text, entity.offset, entity.length);
        const scheme = toLower(url.slice(0, 4));
        if (
          areTypedArraysEqual(scheme, "ton:") || beginsWith(scheme, "tg:") ||
          areTypedArraysEqual(scheme, "ftp:") || isPlainDomain(url)
        ) continue;
        return url;
      }
      case MessageEntityType.EmailAddress:
      case MessageEntityType.Bold:
      case MessageEntityType.Italic:
      case MessageEntityType.Underline:
      case MessageEntityType.Strikethrough:
      case MessageEntityType.BlockQuote:
      case MessageEntityType.Code:
      case MessageEntityType.Pre:
      case MessageEntityType.PreCode:
        break;
      case MessageEntityType.TextUrl: {
        const url = entity.argument;
        if (beginsWith(url, "ton:") || beginsWith(url, "tg:") || beginsWith(url, "ftp:")) continue;
        return url;
      }
      case MessageEntityType.MentionName:
      case MessageEntityType.Cashtag:
      case MessageEntityType.PhoneNumber:
      case MessageEntityType.BankCardNumber:
      case MessageEntityType.MediaTimestamp:
      case MessageEntityType.Spoiler:
      case MessageEntityType.CustomEmoji:
        break;
      default:
        UNREACHABLE();
    }
  }

  return new Uint8Array();
}

export function parseMarkdown(text: Uint8Array): FormattedText {
  let resultSize = 0;
  const entities: MessageEntity[] = [];
  const size = text.length;
  let utf16Offset = 0;

  for (let i = 0; i < size; i++) {
    const c = text[i], next = text[i + 1];
    if (
      c === CODEPOINTS["\\"] &&
      (next === CODEPOINTS["_"] || next === CODEPOINTS["*"] || next === CODEPOINTS["`"] || next === CODEPOINTS["["])
    ) {
      i++;
      text[resultSize++] = text[i];
      utf16Offset++;
      continue;
    }

    if (c != null && c !== CODEPOINTS["_"] && c !== CODEPOINTS["*"] && c !== CODEPOINTS["`"] && c !== CODEPOINTS["["]) {
      if (isUtf8CharacterFirstCodeUnit(c)) {
        utf16Offset += 1 + ((c >= 0xf0) ? 1 : 0);
      }
      text[resultSize++] = text[i];
      continue;
    }

    const beginPos = i;
    let endCharacter = text[i];
    let isPre = false;
    if (c === CODEPOINTS["["]) endCharacter = CODEPOINTS["]"];

    i++;

    let language: Uint8Array | undefined = undefined;
    if (c === CODEPOINTS["`"] && text[i] === CODEPOINTS["`"] && text[i + 1] === CODEPOINTS["`"]) {
      i += 2;
      isPre = true;
      let languageEnd = i;

      while (text[languageEnd] != null && !isSpace(text[languageEnd]) && text[languageEnd] !== CODEPOINTS["`"]) {
        languageEnd++;
      }

      if (i !== languageEnd && languageEnd < size && text[languageEnd] !== CODEPOINTS["`"]) {
        language = text.slice(i, languageEnd);
        i = languageEnd;
      }

      const current = text[i], next = text[i + 1];
      if (current === CODEPOINTS["\n"] || current === CODEPOINTS["\r"]) {
        if ((next === CODEPOINTS["\n"] || next === CODEPOINTS["\r"]) && current !== next) {
          i += 2;
        } else {
          i++;
        }
      }
    }

    const entityOffset = utf16Offset;
    while (
      i < size &&
      (text[i] !== endCharacter ||
        (isPre && !(text[i + 1] === CODEPOINTS["`"] && text[i + 2] === CODEPOINTS["`"])))
    ) {
      const curCh = text[i];
      if (isUtf8CharacterFirstCodeUnit(curCh)) {
        utf16Offset += 1 + (curCh >= 0xf0 ? 1 : 0);
      }
      text[resultSize++] = text[i++];
    }

    if (i === size) {
      throw new Error("Can't find end of the entity starting at byte offset " + beginPos);
    }

    if (entityOffset !== utf16Offset) {
      const entityLength = utf16Offset - entityOffset;
      switch (c) {
        case CODEPOINTS["_"]:
          entities.push(new MessageEntity(MessageEntityType.Italic, entityOffset, entityLength));
          break;
        case CODEPOINTS["*"]:
          entities.push(new MessageEntity(MessageEntityType.Bold, entityOffset, entityLength));
          break;
        case CODEPOINTS["["]: {
          let url: Uint8Array;
          if (text[i + 1] !== CODEPOINTS["("]) {
            url = text.slice(beginPos + 1, i);
          } else {
            i += 2;
            const url_: number[] = [];
            while (i < size && text[i] !== CODEPOINTS[")"]) {
              url_.push(text[i++]);
            }
            url = Uint8Array.from(url_);
          }
          const userId = LinkManager.getLinkUserId(url);
          if (userId.isValid()) {
            entities.push(new MessageEntity(MessageEntityType.MentionName, entityOffset, entityLength, userId));
          } else {
            url = LinkManager.getCheckedLink(url);
            if (url.length !== 0) {
              entities.push(new MessageEntity(MessageEntityType.TextUrl, entityOffset, entityLength, url));
            }
          }
          break;
        }
        case CODEPOINTS["`"]:
          if (isPre) {
            if (language == null || language.length === 0) {
              entities.push(new MessageEntity(MessageEntityType.Pre, entityOffset, entityLength));
            } else {
              entities.push(new MessageEntity(MessageEntityType.PreCode, entityOffset, entityLength, language));
            }
          } else {
            entities.push(new MessageEntity(MessageEntityType.Italic, entityOffset, entityLength));
          }
          break;
        default:
          throw new Error("UNREACHABLE");
      }
    }

    if (isPre) {
      i += 2;
    }
  }

  return { text: text.slice(0, resultSize), entities };
}

export function parseMarkdownV2(text: Uint8Array): FormattedText {
  let resultSize = 0;
  let entities: MessageEntity[] = [];
  let utf16Offset = 0;

  interface EntityInfo {
    type: MessageEntityType;
    argument: Uint8Array;
    entityOffset: number;
    entityByteOffset: number;
    entityBeginPos: number;
  }

  const nestedEntities: EntityInfo[] = [];

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === CODEPOINTS["\\"] && text[i + 1] != null && text[i + 1] > 0 && text[i + 1] <= 126) {
      i++;
      utf16Offset += 1;
      text[resultSize++] = text[i];
      continue;
    }

    let reservedCharacters = encode("_*[]()~`>#+-=|{}.!");
    if (nestedEntities.length !== 0) {
      switch (nestedEntities[nestedEntities.length - 1].type) {
        case MessageEntityType.Code:
        case MessageEntityType.Pre:
        case MessageEntityType.PreCode:
          reservedCharacters = Uint8Array.of(CODEPOINTS["`"]);
          break;
        default:
          break;
      }
    }

    if (!reservedCharacters.includes(text[i])) {
      if (isUtf8CharacterFirstCodeUnit(c)) {
        utf16Offset += 1 + (c >= 0xf0 ? 1 : 0);
      }
      text[resultSize++] = text[i];
      continue;
    }

    let isEndOfAnEntity = false;
    if (nestedEntities.length !== 0) {
      isEndOfAnEntity = (() => {
        switch (nestedEntities[nestedEntities.length - 1].type) {
          case MessageEntityType.Bold:
            return c === CODEPOINTS["*"];
          case MessageEntityType.Italic:
            return c === CODEPOINTS["_"] && text[i + 1] !== CODEPOINTS["_"];
          case MessageEntityType.Code:
            return c === CODEPOINTS["`"];
          case MessageEntityType.Pre:
          case MessageEntityType.PreCode:
            return c === CODEPOINTS["`"] && text[i + 1] === CODEPOINTS["`"] && text[i + 2] === CODEPOINTS["`"];
          case MessageEntityType.TextUrl:
            return c === CODEPOINTS["]"];
          case MessageEntityType.Underline:
            return c === CODEPOINTS["_"] && text[i + 1] === CODEPOINTS["_"];
          case MessageEntityType.Strikethrough:
            return c === CODEPOINTS["~"];
          case MessageEntityType.Spoiler:
            return c === CODEPOINTS["|"] && text[i + 1] === CODEPOINTS["|"];
          case MessageEntityType.CustomEmoji:
            return c === CODEPOINTS["]"];
          default:
            UNREACHABLE();
        }
      })();
    }

    if (!isEndOfAnEntity) {
      let type: MessageEntityType;
      let argument = new Uint8Array();
      const entityByteOffset = i;

      switch (c) {
        case CODEPOINTS["_"]:
          if (text[i + 1] === CODEPOINTS["_"]) {
            type = MessageEntityType.Underline;
            i++;
          } else {
            type = MessageEntityType.Italic;
          }
          break;
        case CODEPOINTS["*"]:
          type = MessageEntityType.Bold;
          break;
        case CODEPOINTS["~"]:
          type = MessageEntityType.Strikethrough;
          break;
        case CODEPOINTS["|"]:
          if (text[i + 1] === CODEPOINTS["|"]) {
            i++;
            type = MessageEntityType.Spoiler;
          } else {
            throw new Error(`Character '${decode(c)}' is reserved and must be escaped with the preceding '\\'`);
          }
          break;
        case CODEPOINTS["["]:
          type = MessageEntityType.TextUrl;
          break;
        case CODEPOINTS["`"]:
          if (text[i + 1] === CODEPOINTS["`"] && text[i + 2] === CODEPOINTS["`"]) {
            i += 3;
            type = MessageEntityType.Pre;
            let languageEnd = i;
            while (text[languageEnd] != null && !isSpace(text[languageEnd]) && text[languageEnd] !== CODEPOINTS["`"]) {
              languageEnd++;
            }
            if (i !== languageEnd && languageEnd < text.length && text[languageEnd] !== CODEPOINTS["`"]) {
              type = MessageEntityType.PreCode;
              argument = text.slice(i, languageEnd);
              i = languageEnd;
            }
            const current = text[i], next = text[i + 1];
            if (current === CODEPOINTS["\n"] || current === CODEPOINTS["\r"]) {
              if ((next === CODEPOINTS["\n"] || next === CODEPOINTS["\r"]) && current !== next) {
                i += 2;
              } else {
                i++;
              }
            }

            i--;
          } else {
            type = MessageEntityType.Code;
          }
          break;
        case CODEPOINTS["!"]:
          if (text[i + 1] === CODEPOINTS["["]) {
            i++;
            type = MessageEntityType.CustomEmoji;
          } else {
            throw new Error(`Character '${decode(text[i])}' is reserved and must be escaped with the preceding '\\'`);
          }
          break;
        default:
          throw new Error(`Character '${decode(text[i])}' is reserved and must be escaped with the preceding '\\'`);
      }

      nestedEntities.push({ type, argument, entityOffset: utf16Offset, entityByteOffset, entityBeginPos: resultSize });
    } else {
      let { type, argument } = nestedEntities[nestedEntities.length - 1];
      let userId = new UserId();
      let customEmojiId = new CustomEmojiId();
      let skipEntity = utf16Offset === nestedEntities.at(-1)!.entityOffset;
      switch (type) {
        case MessageEntityType.Bold:
        case MessageEntityType.Italic:
        case MessageEntityType.Code:
        case MessageEntityType.Strikethrough:
          break;
        case MessageEntityType.Underline:
        case MessageEntityType.Spoiler:
          i++;
          break;
        case MessageEntityType.Pre:
        case MessageEntityType.PreCode:
          i += 2;
          break;
        case MessageEntityType.TextUrl: {
          let url: Uint8Array;
          if (text[i + 1] !== CODEPOINTS["("]) {
            url = text.slice(nestedEntities.at(-1)!.entityBeginPos, resultSize);
          } else {
            i += 2;
            const urlBeginPos = i;
            const url_: number[] = [];
            while (i < text.length && text[i] !== CODEPOINTS[")"]) {
              if (text[i] === CODEPOINTS["\\"] && text[i + 1] > 0 && text[i + 1] <= 126) {
                url_.push(text[i + 1]);
                i += 2;
                continue;
              }
              url_.push(text[i++]);
            }
            url = Uint8Array.from(url_);

            if (text[i] !== CODEPOINTS[")"]) {
              throw new Error("Can't find end of a URL at byte offset " + urlBeginPos);
            }
          }
          userId = LinkManager.getLinkUserId(url);
          if (!userId.isValid()) {
            url = LinkManager.getCheckedLink(url);
            if (url.length === 0) {
              skipEntity = true;
            } else {
              argument = url;
            }
          }
          break;
        }
        case MessageEntityType.CustomEmoji: {
          if (text[i + 1] !== CODEPOINTS["("]) {
            throw new Error("Custom emoji entity must contain a tg://emoji URL");
          }
          i += 2;
          const url_: number[] = [];
          const urlBeginPos = i;
          while (i < text.length && text[i] !== CODEPOINTS[")"]) {
            if (text[i] === CODEPOINTS["\\"] && text[i + 1] > 0 && text[i + 1] <= 126) {
              url_.push(text[i + 1]);
              i += 2;
              continue;
            }
            url_.push(text[i++]);
          }
          const url = Uint8Array.from(url_);

          if (text[i] !== CODEPOINTS[")"]) {
            throw new Error("Can't find end of a custom emoji URL at byte offset " + urlBeginPos);
          }
          customEmojiId = LinkManager.getLinkCustomEmojiId(url);
          break;
        }
        default:
          UNREACHABLE();
      }

      if (!skipEntity) {
        const entityOffset = nestedEntities.at(-1)!.entityOffset;
        const entityLength = utf16Offset - entityOffset;
        if (userId.isValid()) {
          entities.push(new MessageEntity(MessageEntityType.MentionName, entityOffset, entityLength, userId));
        } else if (customEmojiId.isValid()) {
          entities.push(new MessageEntity(type, entityOffset, entityLength, customEmojiId));
        } else {
          const hasArgument = type === MessageEntityType.TextUrl || type === MessageEntityType.PreCode;
          entities.push(new MessageEntity(type, entityOffset, entityLength, hasArgument ? argument : undefined));
        }
      }

      nestedEntities.pop();
    }
  }

  if (nestedEntities.length !== 0) {
    const last = nestedEntities[nestedEntities.length - 1];
    throw new Error(
      `Can't find end of ${messageEntityTypeString(last.type)} entity at byte offset ${last.entityByteOffset}`,
    );
  }

  entities = sortEntities(entities);

  return { text: text.slice(0, resultSize), entities };
}

export function findTextUrlEntitiesV3(text: Uint8Array): Uint8Array[] {
  const result: Uint8Array[] = [];
  const size = text.length;
  for (let i = 0; i < size; i++) {
    if (text[i] !== CODEPOINTS["["]) {
      continue;
    }

    const textBegin = i;
    let textEnd = textBegin + 1;
    while (textEnd < size && text[textEnd] !== CODEPOINTS["]"]) {
      textEnd++;
    }

    i = textEnd;

    if (textEnd === size || textEnd === textBegin + 1) {
      continue;
    }

    const urlBegin = textEnd + 1;
    if (urlBegin === size || text[urlBegin] !== CODEPOINTS["("]) {
      continue;
    }

    let urlEnd = urlBegin + 1;
    while (urlEnd < size && text[urlEnd] !== CODEPOINTS[")"]) {
      urlEnd++;
    }

    i = urlEnd;

    if (urlEnd < size) {
      const url = text.subarray(urlBegin + 1, urlEnd);
      if (LinkManager.getCheckedLink(url).length !== 0) {
        result.push(text.subarray(textBegin, textEnd + 1));
        result.push(text.subarray(urlBegin, urlEnd + 1));
      }
    }
  }
  return result;
}

export function decodeHtmlEntity(
  text: Uint8Array,
  pos: number,
): { res: number; pos: number } | undefined {
  CHECK(text[pos] === CODEPOINTS["&"]);
  let endPos = pos + 1;
  let res = 0;
  if (text[pos + 1] === CODEPOINTS["#"]) {
    endPos++;
    if (text[pos + 2] === CODEPOINTS["x"]) {
      endPos++;
      while (isHexDigit(text[endPos])) {
        res = res * 16 + hexToInt(text[endPos++]);
      }
    } else {
      while (isDigit(text[endPos])) {
        res = res * 10 + text[endPos++] - CODEPOINTS["0"];
      }
    }
    if (res === 0 || res >= 0x10ffff || endPos - pos >= 10) {
      return;
    }
  } else {
    while (isAlpha(text[endPos])) {
      endPos++;
    }
    const entity = text.slice(pos + 1, endPos);
    if (areTypedArraysEqual(entity, "lt")) {
      res = CODEPOINTS["<"];
    } else if (areTypedArraysEqual(entity, "gt")) {
      res = CODEPOINTS[">"];
    } else if (areTypedArraysEqual(entity, "amp")) {
      res = CODEPOINTS["&"];
    } else if (areTypedArraysEqual(entity, "quot")) {
      res = CODEPOINTS['"'];
    } else {
      return;
    }
  }

  if (text[endPos] === CODEPOINTS[";"]) {
    pos = endPos + 1;
  } else {
    pos = endPos;
  }

  return { res, pos };
}

// deno-fmt-ignore
export const TAG_NAMES = [
  "a",          "b",
  "strong",     "i",
  "em",         "s",
  "strike",     "del",
  "u",          "ins",
  "tg-spoiler", "tg-emoji",
  "span",       "pre",
  "code"
];

export function parseHtml(str: Uint8Array): FormattedText {
  const strSize = str.length;
  const text = str;
  let resultEnd = 0;
  const resultBegin = resultEnd;

  let entities: MessageEntity[] = [];
  let utf16Offset = 0;
  let needRecheckUtf8 = false;

  interface EntityInfo {
    tagName: Uint8Array;
    argument: Uint8Array;
    entityOffset: number;
    entityBeginPos: number;
  }
  const nestedEntities: EntityInfo[] = [];

  for (let i = 0; i < strSize; i++) {
    const c = text[i];
    if (c != null && c === CODEPOINTS["&"]) {
      const code = decodeHtmlEntity(str, i);
      if (code != null) {
        i = code.pos;
        i--;
        utf16Offset += 1 + (code.res > 0xffff ? 1 : 0);
        if (code.res >= 0xd800 && code.res <= 0xdfff) {
          needRecheckUtf8 = true;
        }
        resultEnd = appendUtf8CharacterUnsafe(str, resultEnd, code.res);
        CHECK(resultEnd <= resultBegin + i);
        continue;
      }
    }
    if (c != null && c !== CODEPOINTS["<"]) {
      if (isUtf8CharacterFirstCodeUnit(c)) {
        utf16Offset += 1 + (c >= 0xf0 ? 1 : 0);
      }
      str[resultEnd++] = c;
      continue;
    }

    const beginPos = i++;
    if (text[i] != null && text[i] !== CODEPOINTS["/"]) {
      while (text[i] != null && !isSpace(text[i]) && text[i] !== CODEPOINTS[">"]) {
        i++;
      }
      if (text[i] == null || text[i] === 0) {
        throw new Error("Unclosed start tag at byte offset " + beginPos);
      }

      const tagName = toLower(text.slice(beginPos + 1, i));

      if (!TAG_NAMES.some((allowedTag) => areTypedArraysEqual(tagName, allowedTag))) {
        throw new Error('Unsupported start tag "' + decode(tagName) + '" at byte offset ' + beginPos);
      }

      let argument = new Uint8Array();

      while (text[i] != null && text[i] !== CODEPOINTS[">"]) {
        while (text[i] != null && text[i] !== 0 && isSpace(text[i])) {
          i++;
        }
        if (text[i] === CODEPOINTS[">"]) {
          break;
        }
        const attributeBeginPos = i;
        while (text[i] != null && !isSpace(text[i]) && text[i] !== CODEPOINTS["="]) {
          i++;
        }
        const attributeName = text.slice(attributeBeginPos, i);
        if (attributeName.length === 0) {
          throw new Error('Empty attribute name in the tag "' + decode(tagName) + '" at byte offset ' + beginPos);
        }
        while (text[i] !== 0 && isSpace(text[i])) {
          i++;
        }
        if (text[i] !== CODEPOINTS["="]) {
          throw new Error(
            'Expected equal sign in declaration of an attribute of the tag "' + decode(tagName) + '" at byte offset ' +
              beginPos,
          );
        }
        i++;
        while (text[i] !== 0 && isSpace(text[i])) {
          i++;
        }
        if (text[i] == null || text[i] === 0) {
          throw new Error('Unclosed start tag "' + decode(tagName) + '" at byte offset ' + beginPos);
        }

        let attributeValue: Uint8Array;
        if (text[i] != null && text[i] !== CODEPOINTS["'"] && text[i] !== CODEPOINTS['"']) {
          const tokenBeginPos = i;
          while (isAlNum(text[i]) || text[i] === CODEPOINTS["."] || text[i] === CODEPOINTS["-"]) {
            i++;
          }
          attributeValue = toLower(text.slice(tokenBeginPos, i));

          if (text[i] != null && !isSpace(text[i]) && text[i] !== CODEPOINTS[">"]) {
            throw new Error("Unexpected end of name token at byte offset " + tokenBeginPos);
          }
        } else {
          const endCharacter = text[i++];
          let attributeEnd = i;
          const attributeBegin = attributeEnd;
          while (text[i] !== endCharacter && text[i] !== 0 && text[i] != null) {
            if (text[i] === CODEPOINTS["&"]) {
              const code = decodeHtmlEntity(str, i);
              if (code != null) {
                i = code.pos;
                attributeEnd = appendUtf8CharacterUnsafe(str, attributeEnd, code.res);
                continue;
              }
            }
            str[attributeEnd++] = text[i++];
          }
          if (text[i] === endCharacter) {
            i++;
          }
          attributeValue = str.slice(attributeBegin, attributeEnd);
        }
        if (text[i] == null || text[i] === 0) {
          throw new Error("Unclosed start tag at byte offset " + beginPos);
        }

        if (areTypedArraysEqual(tagName, "a") && areTypedArraysEqual(attributeName, "href")) {
          argument = attributeValue;
        } else if (
          areTypedArraysEqual(tagName, "code") && areTypedArraysEqual(attributeName, "class") &&
          beginsWith(attributeValue, "language-")
        ) {
          argument = attributeValue.slice(9);
        } else if (
          areTypedArraysEqual(tagName, "span") && areTypedArraysEqual(attributeName, "class") &&
          beginsWith(attributeValue, "tg-")
        ) {
          argument = attributeValue.slice(3);
        } else if (areTypedArraysEqual(tagName, "tg-emoji") && areTypedArraysEqual(attributeName, "emoji-id")) {
          argument = attributeValue;
        }
      }

      if (areTypedArraysEqual(tagName, "span") && !areTypedArraysEqual(argument, "spoiler")) {
        throw new Error('Tag "span" must have class "tg-spoiler" at byte offset ' + beginPos);
      }

      nestedEntities.push({ tagName, argument, entityOffset: utf16Offset, entityBeginPos: resultEnd - resultBegin });
    } else {
      if (nestedEntities.length === 0) {
        throw new Error("Unexpected end tag at byte offset " + beginPos);
      }

      while (text[i] != null && !isSpace(text[i]) && text[i] !== CODEPOINTS[">"]) {
        i++;
      }
      const endTagName = toLower(text.slice(beginPos + 2, i));
      while (isSpace(text[i]) && text[i] !== 0) {
        i++;
      }
      if (text[i] !== CODEPOINTS[">"]) {
        throw new Error("Unclosed end tag at byte offset " + beginPos);
      }

      const tagName = nestedEntities.at(-1)!.tagName;
      if (endTagName.length !== 0 && !areTypedArraysEqual(endTagName, tagName)) {
        throw new Error(
          "Unmatched end tag at byte offset " + beginPos + ', expected "</' + decode(tagName) + '>", found "</' +
            decode(endTagName) + '>"',
        );
      }

      if (utf16Offset > nestedEntities.at(-1)!.entityOffset) {
        const entityOffset = nestedEntities.at(-1)!.entityOffset;
        const entityLength = utf16Offset - entityOffset;
        if (areTypedArraysEqual(tagName, "i") || areTypedArraysEqual(tagName, "em")) {
          entities.push(new MessageEntity(MessageEntityType.Italic, entityOffset, entityLength));
        } else if (areTypedArraysEqual(tagName, "b") || areTypedArraysEqual(tagName, "strong")) {
          entities.push(new MessageEntity(MessageEntityType.Bold, entityOffset, entityLength));
        } else if (
          areTypedArraysEqual(tagName, "s") || areTypedArraysEqual(tagName, "strike") ||
          areTypedArraysEqual(tagName, "del")
        ) {
          entities.push(new MessageEntity(MessageEntityType.Strikethrough, entityOffset, entityLength));
        } else if (areTypedArraysEqual(tagName, "u") || areTypedArraysEqual(tagName, "ins")) {
          entities.push(new MessageEntity(MessageEntityType.Underline, entityOffset, entityLength));
        } else if (
          areTypedArraysEqual(tagName, "tg-spoiler") ||
          (areTypedArraysEqual(tagName, "span") && areTypedArraysEqual(nestedEntities.at(-1)!.argument, "spoiler"))
        ) {
          entities.push(new MessageEntity(MessageEntityType.Spoiler, entityOffset, entityLength));
        } else if (areTypedArraysEqual(tagName, "tg-emoji")) {
          const documentId = toIntegerSafe(nestedEntities.at(-1)!.argument);
          if (documentId instanceof Error || documentId === 0) {
            throw new Error("Invalid custom emoji identifier specified");
          }
          const rDocumentId = BigInt(documentId);
          entities.push(
            new MessageEntity(
              MessageEntityType.CustomEmoji,
              entityOffset,
              entityLength,
              new CustomEmojiId(rDocumentId),
            ),
          );
        } else if (areTypedArraysEqual(tagName, "a")) {
          let url = nestedEntities.at(-1)!.argument;
          if (url.length === 0) {
            url = str.slice(nestedEntities.at(-1)!.entityBeginPos, resultEnd);
          }
          const userId = LinkManager.getLinkUserId(url);
          if (userId.isValid()) {
            entities.push(new MessageEntity(MessageEntityType.MentionName, entityOffset, entityLength, userId));
          } else {
            url = LinkManager.getCheckedLink(url);
            if (url.length !== 0) {
              entities.push(new MessageEntity(MessageEntityType.TextUrl, entityOffset, entityLength, url));
            }
          }
        } else if (areTypedArraysEqual(tagName, "pre")) {
          const last = entities[entities.length - 1];
          if (
            entities.length !== 0 && last.type === MessageEntityType.Code && last.offset === entityOffset &&
            last.length === entityLength && last.argument.length !== 0
          ) {
            entities[entities.length - 1].type = MessageEntityType.PreCode;
          } else {
            entities.push(new MessageEntity(MessageEntityType.Pre, entityOffset, entityLength));
          }
        } else if (areTypedArraysEqual(tagName, "code")) {
          const last = entities[entities.length - 1];
          const lastNested = nestedEntities[nestedEntities.length - 1];
          if (
            entities.length !== 0 && last.type === MessageEntityType.Pre && last.offset === entityOffset &&
            last.length === entityLength && lastNested.argument.length !== 0
          ) {
            entities[entities.length - 1].type = MessageEntityType.PreCode;
            entities[entities.length - 1].argument = lastNested.argument;
          } else {
            entities.push(new MessageEntity(MessageEntityType.Code, entityOffset, entityLength, lastNested.argument));
          }
        } else {
          UNREACHABLE();
        }
      }

      nestedEntities.pop();
    }
  }
  if (nestedEntities.length !== 0) {
    throw new Error("Can't find end tag corresponding to start tag " + decode(nestedEntities.at(-1)!.tagName));
  }

  for (const entity of entities) {
    if (entity.type === MessageEntityType.Code && entity.argument.length !== 0) {
      entity.argument = new Uint8Array();
    }
  }

  entities = sortEntities(entities);

  str = str.subarray(0, resultEnd);
  if (needRecheckUtf8 && !checkUtf8(str)) {
    throw new Error(
      "Text contains invalid Unicode characters after decoding HTML entities, check for unmatched " +
        "surrogate code units",
    );
  }
  return { text: str, entities };
}

export function cleanInputStringWithEntities(
  text: Uint8Array,
  entities: MessageEntity[],
): Uint8Array {
  checkIsSorted(entities);

  interface EntityInfo {
    entity: MessageEntity;
    utf16SkippedBefore: number;
  }

  const nestedEntitiesStack: EntityInfo[] = [];
  let currentEntity = 0;

  let utf16Offset = 0;
  let utf16Skipped = 0;

  const textSize = text.length;

  const result: number[] = [];

  for (let pos = 0; pos <= textSize; pos++) {
    const c = text[pos];
    const isUtf8CharacterBegin = isUtf8CharacterFirstCodeUnit(c);
    if (isUtf8CharacterBegin) {
      while (nestedEntitiesStack.length !== 0) {
        const entity = nestedEntitiesStack.at(-1)!.entity;
        const entityEnd = entity.offset + entity.length;
        if (utf16Offset < entityEnd) {
          break;
        }

        if (utf16Offset !== entityEnd) {
          CHECK(utf16Offset === entityEnd + 1);
          throw new Error(
            "Entity beginning at UTF-16 offset " + entity.offset +
              " ends in a middle of a UTF-16 symbol at byte offset " + pos,
          );
        }

        const skippedBeforeCurrentEntity = nestedEntitiesStack.at(-1)!.utf16SkippedBefore;
        entity.offset -= skippedBeforeCurrentEntity;
        entity.length -= utf16Skipped - skippedBeforeCurrentEntity;
        nestedEntitiesStack.pop();
      }
      while (currentEntity < entities.length && utf16Offset >= entities[currentEntity].offset) {
        if (utf16Offset !== entities[currentEntity].offset) {
          CHECK(utf16Offset === entities[currentEntity].offset + 1);
          throw new Error("Entity begins in a middle of a UTF-16 symbol at byte offset " + pos);
        }
        nestedEntitiesStack.push({
          entity: entities[currentEntity++],
          utf16SkippedBefore: utf16Skipped,
        });
      }
    }
    if (pos === textSize) {
      break;
    }

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
        result.push(CODEPOINTS[" "]);
        utf16Offset++;
        break;
      case CODEPOINTS["\r"]:
        // skip
        utf16Offset++;
        utf16Skipped++;
        break;
      default: {
        if (isUtf8CharacterBegin) {
          utf16Offset += 1 + (c >= 0xf0 ? 1 : 0);
        }
        if (c === 0xe2 && (pos + 2) < textSize) {
          let next = text[pos + 1];
          if (next === 0x80) {
            next = text[pos + 2];
            if (0xa8 <= next && next <= 0xae) {
              pos += 2;
              utf16Skipped++;
              break;
            }
          }
        }
        if (c === 0xcc && (pos + 1) < textSize) {
          const next = text[pos + 1];
          if (next === 0xb3 || next === 0xbf || next === 0x8a) {
            pos++;
            utf16Skipped++;
            break;
          }
        }
        result.push(text[pos]);
        break;
      }
    }
  }

  if (currentEntity !== entities.length) {
    throw new Error("Entity begins after the end of the text at UTF-16 offset " + entities[currentEntity].offset);
  }
  if (nestedEntitiesStack.length !== 0) {
    const entity = nestedEntitiesStack.at(-1)!.entity;
    throw new Error(
      "Entity beginning at UTF-16 offset " + entity.offset + " ends after the end of the text at UTF-16 offset " +
        (entity.offset + entity.length),
    );
  }

  return replaceOffendingCharacters(Uint8Array.from(result));
}

export function removeInvalidEntities(
  text: Uint8Array,
  entities: MessageEntity[],
): { entities: MessageEntity[]; result: [number, number] } {
  if (entities.length === 0) {
    for (let pos = 0; pos < text.length; pos++) {
      const backPos = text.length - pos - 1;
      const c = text[backPos];
      if (c !== CODEPOINTS["\n"] && c !== CODEPOINTS[" "]) {
        return { entities, result: [backPos, 0] };
      }
    }
    return { entities, result: [text.length, -1] };
  }

  const nestedEntitiesStack: MessageEntity[] = [];
  let currentEntity = 0;

  let lastNonWhitespacePos = text.length;

  let utf16Offset = 0;
  let lastNonWhitespaceUtf16Offset = -1;

  entities = removeEmptyEntities(entities);

  for (let pos = 0; pos <= text.length; pos++) {
    while (nestedEntitiesStack.length !== 0) {
      const entity = nestedEntitiesStack.at(-1)!;
      const entityEnd = entity.offset + entity.length;
      if (utf16Offset < entityEnd) {
        break;
      }

      if (lastNonWhitespaceUtf16Offset >= entity.offset || isHiddenDataEntity(entity.type)) {
        // keep entity
        // TODO check entity for validness, for example, that mentions, hashtags, cashtags and URLs are valid
      } else {
        entity.length = 0;
      }

      nestedEntitiesStack.pop();
    }
    while (currentEntity < entities.length && utf16Offset >= entities[currentEntity].offset) {
      nestedEntitiesStack.push(entities[currentEntity++]);
    }

    if (pos === text.length) {
      break;
    }

    if (
      nestedEntitiesStack.length !== 0 && nestedEntitiesStack.at(-1)!.offset === utf16Offset &&
      (text[pos] === CODEPOINTS["\n"] || text[pos] === CODEPOINTS[" "])
    ) {
      for (let i = nestedEntitiesStack.length; i > 0; i--) {
        const entity = nestedEntitiesStack[i - 1];
        if (entity.offset !== utf16Offset || isHiddenDataEntity(entity.type)) {
          break;
        }
        entity.offset++;
        entity.length--;
        if (entity.length === 0) {
          CHECK(i === nestedEntitiesStack.length);
          nestedEntitiesStack.pop();
        }
      }
    }

    const c = text[pos];
    switch (c) {
      case CODEPOINTS["\n"]:
      case 32:
        break;
      default: {
        while (!isUtf8CharacterFirstCodeUnit(text[pos + 1])) {
          pos++;
        }
        utf16Offset += (c >= 0xf0) ? 1 : 0;
        lastNonWhitespacePos = pos;
        lastNonWhitespaceUtf16Offset = utf16Offset;
        break;
      }
    }

    utf16Offset++;
  }

  CHECK(nestedEntitiesStack.length === 0);
  CHECK(currentEntity === entities.length);

  entities = removeEmptyEntities(entities);

  return { entities, result: [lastNonWhitespacePos, lastNonWhitespaceUtf16Offset] };
}

export function splitEntities(
  entities: MessageEntity[],
  otherEntities: MessageEntity[],
): MessageEntity[] {
  checkIsSorted(entities);
  checkIsSorted(otherEntities);

  const beginPos = new Array<number>(SPLITTABLE_ENTITY_TYPE_COUNT);
  const endPos = new Array<number>(SPLITTABLE_ENTITY_TYPE_COUNT);
  let it = 0;
  let result: MessageEntity[] = [];
  function addEntities(endOffset: number) {
    function flushEntities(offset: number) {
      for (
        const type of [
          MessageEntityType.Bold,
          MessageEntityType.Italic,
          MessageEntityType.Underline,
          MessageEntityType.Strikethrough,
          MessageEntityType.Spoiler,
        ]
      ) {
        const index = getSplittableEntityTypeIndex(type);
        if (endPos[index] !== 0 && beginPos[index] < offset) {
          if (endPos[index] <= offset) {
            result.push(new MessageEntity(type, beginPos[index], endPos[index] - beginPos[index]));
            beginPos[index] = 0;
            endPos[index] = 0;
          } else {
            result.push(new MessageEntity(type, beginPos[index], offset - beginPos[index]));
            beginPos[index] = offset;
          }
        }
      }
    }

    while (it !== entities.length) {
      if (entities[it].offset >= endOffset) {
        break;
      }
      CHECK(isSplittableEntity(entities[it].type));
      const index = getSplittableEntityTypeIndex(entities[it].type);
      if (entities[it].offset <= endPos[index] && endPos[index] !== 0) {
        if (entities[it].offset + entities[it].length > endPos[index]) {
          endPos[index] = entities[it].offset + entities[it].length;
        }
      } else {
        flushEntities(entities[it].offset);
        beginPos[index] = entities[it].offset;
        endPos[index] = entities[it].offset + entities[it].length;
      }
      ++it;
    }
    flushEntities(endOffset);
  }

  const nestedEntitiesStack: MessageEntity[] = [];
  function addOffset(offset: number) {
    while (
      nestedEntitiesStack.length !== 0 &&
      offset >= nestedEntitiesStack.at(-1)!.offset + nestedEntitiesStack.at(-1)!.length
    ) {
      const oldSize = result.length;
      addEntities(nestedEntitiesStack.at(-1)!.offset + nestedEntitiesStack.at(-1)!.length);
      if (isPreEntity(nestedEntitiesStack.at(-1)!.type)) {
        result = result.slice(0, oldSize);
      }
      nestedEntitiesStack.pop();
    }
    addEntities(offset);
  }
  for (const otherEntity of otherEntities) {
    addOffset(otherEntity.offset);
    nestedEntitiesStack.push(otherEntity);
  }
  addOffset(NUMERIC_LIMITS.int32);
  entities = result;
  return sortEntities(entities);
}

export function resplitEntities(
  splittableEntities: MessageEntity[],
  entities: MessageEntity[],
): MessageEntity[] {
  if (splittableEntities.length !== 0) {
    splittableEntities = splitEntities(splittableEntities, entities);

    if (entities.length === 0) {
      return splittableEntities;
    }

    entities = entities.concat(entities, splittableEntities);
    sortEntities(entities);
  }
  return entities;
}

export function mergeNewEntities(entities: MessageEntity[], newEntities: MessageEntity[]) {
  checkIsSorted(entities);
  if (newEntities.length === 0) {
    return entities;
  }

  checkNonIntersecting(newEntities);

  let continuousEntities: MessageEntity[] = [];
  const blockquoteEntities: MessageEntity[] = [];
  const splittableEntities: MessageEntity[] = [];
  for (const entity of entities) {
    if (isSplittableEntity(entity.type)) {
      splittableEntities.push(entity);
    } else if (isBlockquoteEntity(entity.type)) {
      blockquoteEntities.push(entity);
    } else {
      continuousEntities.push(entity);
    }
  }

  newEntities = removeEntitiesIntersectingBlockquote(newEntities, blockquoteEntities);
  continuousEntities = mergeEntities(continuousEntities, newEntities);
  if (blockquoteEntities.length !== 0) {
    continuousEntities = continuousEntities.concat(blockquoteEntities);
    continuousEntities = sortEntities(continuousEntities);
  }

  entities = resplitEntities(splittableEntities, continuousEntities);
  checkIsSorted(entities);
  return entities;
}

export function fixEntities(entities: MessageEntity[]): MessageEntity[] {
  entities = sortEntities(entities);

  if (areEntitiesValid(entities)) {
    return entities;
  }

  let continuousEntities: MessageEntity[] = [];
  let blockquoteEntities: MessageEntity[] = [];
  const splittableEntities: MessageEntity[] = [];
  for (const entity of entities) {
    if (isSplittableEntity(entity.type)) {
      splittableEntities.push(entity);
    } else if (isBlockquoteEntity(entity.type)) {
      blockquoteEntities.push(entity);
    } else {
      continuousEntities.push(entity);
    }
  }
  continuousEntities = removeIntersectingEntities(continuousEntities);

  if (blockquoteEntities.length !== 0) {
    blockquoteEntities = removeIntersectingEntities(blockquoteEntities);
    continuousEntities = removeEntitiesIntersectingBlockquote(continuousEntities, blockquoteEntities);
    continuousEntities = continuousEntities.concat(blockquoteEntities);
    continuousEntities = sortEntities(continuousEntities);
  }

  entities = resplitEntities(splittableEntities, continuousEntities);
  checkIsSorted(entities);
  return entities;
}

export function fixFormattedText(
  text: Uint8Array,
  entities: MessageEntity[],
  allowEmpty: boolean,
  skipNewEntities: boolean,
  skipBotCommands: boolean,
  skipMediaTimestamps: boolean,
  skipTrim: boolean,
): { ok: boolean; entities: MessageEntity[]; text: Uint8Array } {
  let result: Uint8Array;
  if (entities.length === 0) {
    // fast path
    if (!cleanInputString(text)) {
      throw new Error("Strings must be encoded in UTF-8");
    }
    result = text;
  } else {
    if (!checkUtf8(text)) {
      throw new Error("Strings must be encoded in UTF-8");
    }

    for (const entity of entities) {
      if (entity.offset < 0 || entity.offset > 1_000_000) {
        throw new Error("Receive an entity with incorrect offset " + entity.offset);
      }
      if (entity.length < 0 || entity.length > 1_000_000) {
        throw new Error("Receive an entity with incorrect length " + entity.length);
      }
    }

    entities = removeEmptyEntities(entities);
    entities = fixEntities(entities);
    result = cleanInputStringWithEntities(text, entities);
  }

  const {
    entities: entities1,
    result: [
      lastNonWhitespacePos,
      lastNonWhitespaceUtf16Offset,
    ],
  } = removeInvalidEntities(result, entities);
  entities = entities1;

  if (lastNonWhitespaceUtf16Offset === -1) {
    if (allowEmpty) {
      text = new Uint8Array();
      entities = [];
      return { ok: true, entities, text };
    }
    throw new Error("Message must be non-empty");
  }

  entities = fixEntities(entities);

  if (skipTrim) {
    text = result;
  } else {
    CHECK(lastNonWhitespacePos < result.length);
    result = result.slice(0, lastNonWhitespacePos + 1);
    while (entities.length !== 0 && entities.at(-1)!.offset > lastNonWhitespaceUtf16Offset) {
      CHECK(isHiddenDataEntity(entities.at(-1)!.type));
      entities.pop();
    }
    let needSort = false;
    for (const entity of entities) {
      if (entity.offset + entity.length > lastNonWhitespaceUtf16Offset + 1) {
        entity.length = lastNonWhitespaceUtf16Offset + 1 - entity.offset;
        needSort = true;
        CHECK(entity.length > 0);
      }
    }
    if (needSort) {
      entities = sortEntities(entities);
    }

    let firstNonWhitespacePos = 0;
    const firstEntityBeginPos = entities.length === 0 ? result.length : entities[0].offset;
    while (
      firstNonWhitespacePos < firstEntityBeginPos &&
      (result[firstNonWhitespacePos] === CODEPOINTS[" "] || result[firstNonWhitespacePos] === CODEPOINTS["\n"])
    ) {
      firstNonWhitespacePos++;
    }
    if (firstNonWhitespacePos > 0) {
      const offset = firstNonWhitespacePos;
      text = result.slice(firstNonWhitespacePos);
      for (const entity of entities) {
        entity.offset -= offset;
        CHECK(entity.offset >= 0);
      }
    } else {
      text = result;
    }
  }
  LOG_CHECK(checkUtf8(text), text);

  if (!allowEmpty && isEmptyString(text)) {
    throw new Error("Message must be non-empty");
  }

  const LENGTH_LIMIT = 35000;
  if (text.length > LENGTH_LIMIT) {
    let newSize = LENGTH_LIMIT;
    while (!isUtf8CharacterFirstCodeUnit(text[newSize])) {
      newSize--;
    }
    text = text.slice(0, newSize);

    const textUtf16Length = textLength(text);
    entities = entities.filter((entity) => {
      return !(entity.offset + entity.length > textUtf16Length);
    });
  }

  if (!skipNewEntities) {
    entities = mergeNewEntities(entities, findEntities(text, skipBotCommands, skipMediaTimestamps));
  } else if (!skipMediaTimestamps) {
    entities = mergeNewEntities(entities, findMediaTimestampEntities(text));
  }

  const { entities: entities2 } = removeInvalidEntities(text, entities);
  entities = entities2;

  return { ok: true, entities, text };
}
