export const ENCODER = new TextEncoder(), DECODER = new TextDecoder();

// deno-fmt-ignore
export const CODEPOINTS = {
  "\t": 9, "\r": 13, "\0": 0, "\v": 11, "\n": 10, "<": 60, ">": 62, '"': 34,
  " ": 32, "@": 64, "/": 47, "#": 35, ".": 46, ",": 44, "+": 43, "-": 45, "_": 95,
  "$": 36, ":": 58, "0": 48, "9": 57, "A": 65, "Z": 90, "a": 97, "g": 103, "o": 111,
  "n": 110, "t": 116, "z": 122, "?": 63, "[": 91, "]": 93, "{": 123, "}": 125,
  "(": 40, ")": 41, "`": 96, "'": 39, "~": 126, "T": 84, "2": 50, "3": 51, "5": 53,
  "6": 54, "\\": 92, "*": 42, "&": 38, "=": 61, "f": 102, "!": 33, ";": 59, "%": 37,
  "|": 124, "x": 120, 
};

export function encode(data: string): Uint8Array {
  return ENCODER.encode(data);
}

export function decode(data: number | Uint8Array): string {
  return DECODER.decode(typeof data === "number" ? Uint8Array.of(data) : data);
}

export function areTypedArraysEqual(a: Uint8Array, b: string | Uint8Array): boolean {
  b = typeof b === "string" ? encode(b) : b;
  return a.byteLength === b.byteLength && !a.some((val, i) => val !== b[i]);
}

export function mergeTypedArrays(...parts: Uint8Array[]): Uint8Array {
  const resultSize = parts.reduce((p, c) => p + c.length, 0);
  const result = new Uint8Array(resultSize);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
