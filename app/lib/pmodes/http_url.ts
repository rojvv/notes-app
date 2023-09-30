import { IPAddress } from "./ipaddress";
import { areTypedArraysEqual, CODEPOINTS, encode, mergeTypedArrays } from "./encode";
import { CHECK, isAlphaOrDigit, isHexDigit, isSpace, toInteger, toLower } from "./utilities";

export enum HttpUrlProtocol {
  Http,
  Https,
}

export class HttpUrl {
  protocol: HttpUrlProtocol = HttpUrlProtocol.Http;
  userinfo: Uint8Array;
  host: Uint8Array;
  isIpv6 = false;
  specifiedPort = 0;
  port = 0;
  query: Uint8Array;

  constructor(
    protocol: HttpUrlProtocol,
    userinfo: Uint8Array,
    host: Uint8Array,
    isIpv6: boolean,
    specifiedPort: number,
    port: number,
    query: Uint8Array,
  ) {
    this.protocol = protocol;
    this.userinfo = userinfo;
    this.host = host;
    this.isIpv6 = isIpv6;
    this.specifiedPort = specifiedPort;
    this.port = port;
    this.query = query;
  }

  getUrl(): Uint8Array {
    const result: Uint8Array[] = [];
    switch (this.protocol) {
      case HttpUrlProtocol.Http:
        result.push(encode("http://"));
        break;
      case HttpUrlProtocol.Https:
        result.push(encode("https://"));
        break;
      default:
        throw new Error("UNREACHABLE");
    }
    if (this.userinfo != null && this.userinfo.length !== 0) {
      result.push(this.userinfo);
      result.push(Uint8Array.of(CODEPOINTS["@"]));
    }
    result.push(this.host);
    if (this.specifiedPort > 0) {
      result.push(Uint8Array.of(CODEPOINTS[":"]));
      result.push(encode(this.specifiedPort.toString()));
    }
    result.push(this.query);
    return mergeTypedArrays(...result);
  }
}

function firstIndexOf(str: Uint8Array, toFind: Uint8Array): number | undefined {
  for (const char of toFind) {
    const index = str.indexOf(char);
    if (index !== -1) return index;
  }
}

export function parseURL(
  url: Uint8Array,
  defaultProtocol: HttpUrlProtocol = HttpUrlProtocol.Http,
): HttpUrl {
  let pos = firstIndexOf(url, encode(":/?#@[]"));
  const protocolStr = toLower(url.slice(0, pos));
  pos ??= 0;

  let protocol: HttpUrlProtocol;
  if (areTypedArraysEqual(url.slice(pos, pos + 3), "://")) {
    pos += 3;
    if (areTypedArraysEqual(protocolStr, "http")) {
      protocol = HttpUrlProtocol.Http;
    } else if (areTypedArraysEqual(protocolStr, "https")) {
      protocol = HttpUrlProtocol.Https;
    } else {
      throw new Error("Unsupported URL protocol");
    }
  } else {
    pos = 0;
    protocol = defaultProtocol;
  }

  const fi1 = firstIndexOf(url.slice(pos), encode("/?#"));
  const userinfoHostPort = url.slice(pos, fi1 != null ? pos + fi1 : fi1);
  const toAdd = fi1 || (url.length - pos);
  pos += toAdd;

  let port = 0;
  let colon = pos - 1;
  while (
    colon > (pos - toAdd) && url[colon] !== CODEPOINTS[":"] && url[colon] !== CODEPOINTS["]"] &&
    url[colon] !== CODEPOINTS["@"]
  ) {
    colon--;
  }
  let userinfoHost: Uint8Array;

  if (colon > 0 && url[colon] === CODEPOINTS[":"]) {
    let portSlice = url.slice(colon + 1, pos);
    while (portSlice.length > 1 && portSlice[0] === CODEPOINTS["0"]) {
      portSlice = portSlice.slice(1);
    }
    const rPort = toInteger(portSlice);
    if (!rPort || isNaN(rPort) || rPort === 0) port = -1;
    else port = rPort;

    userinfoHost = url.slice(pos - toAdd, colon);
  } else {
    userinfoHost = userinfoHostPort;
  }
  if (port < 0 || port > 65535) {
    throw new Error("Wrong port number specified in the URL");
  }

  const atPos = userinfoHost.indexOf(CODEPOINTS["@"]);
  const userinfo = atPos === -1 ? new Uint8Array() : userinfoHost.slice(0, atPos);
  const host = userinfoHost.slice(atPos + 1);

  let isIpv6 = false;
  if (host.length !== 0 && host[0] === CODEPOINTS["["] && host.at(-1) === CODEPOINTS["]"]) {
    const ipAddress = new IPAddress();
    try {
      ipAddress.initIpv6Port(host, 1);
    } catch (_error) {
      throw new Error("Wrong IPv6 address specified in the URL");
    }
    CHECK(ipAddress.isIpv6());
    isIpv6 = true;
  }
  if (host.length === 0) {
    throw new Error("URL host is empty");
  }
  if (areTypedArraysEqual(host, ".")) {
    throw new Error("Host is invalid");
  }

  const specifiedPort = port;
  if (port === 0) {
    if (protocol === HttpUrlProtocol.Http) {
      port = 80;
    } else {
      CHECK(protocol === HttpUrlProtocol.Https);
      port = 443;
    }
  }

  let query = url.slice(pos);
  while (query.length !== 0 && isSpace(query.at(-1)!)) {
    query = query.slice(0, query.length - 1);
  }
  if (query.length === 0) {
    query = encode("/");
  }
  const queryStr_: number[] = [];
  if (query[0] !== CODEPOINTS["/"]) {
    queryStr_.push(CODEPOINTS["/"]);
  }
  for (const c of query) {
    if (c <= 0x20) {
      queryStr_.push(CODEPOINTS["%"]);
      queryStr_.push(encode("0123456789ABCDEF"[Math.floor(c / 16)])[0]);
      queryStr_.push(encode("0123456789ABCDEF"[c % 16])[0]);
    } else {
      queryStr_.push(c);
    }
  }
  const queryStr = Uint8Array.from(queryStr_);

  function checkURLPart(part: Uint8Array, name: string, allowColon: boolean) {
    for (let i = 0; i < part.length; i++) {
      let c = part[i];
      if (
        isAlphaOrDigit(c) || c === CODEPOINTS["."] || c === CODEPOINTS["-"] || c === CODEPOINTS["_"] ||
        c === CODEPOINTS["!"] || c === CODEPOINTS["$"] ||
        c === CODEPOINTS[","] || c === CODEPOINTS["~"] || c === CODEPOINTS["*"] || c === CODEPOINTS["'"] ||
        c === CODEPOINTS["("] || c === CODEPOINTS[")"] || c === CODEPOINTS[";"] ||
        c === CODEPOINTS["&"] || c === CODEPOINTS["+"] || c === CODEPOINTS["="] || (allowColon && c === CODEPOINTS[":"])
      ) {
        // symbols allowed by RFC 7230 and RFC 3986
        continue;
      }
      if (c === CODEPOINTS["%"]) {
        c = part[++i];
        if (isHexDigit(c)) {
          c = part[++i];
          if (isHexDigit(c)) {
            continue;
          }
        }
        throw new Error("Wrong percent-encoded symbol in URL " + name);
      }
      const uc = c;
      if (uc >= 128) continue;
      throw new Error("Disallowed character in URL " + name);
    }
    return true;
  }

  const hostStr = toLower(host);
  if (isIpv6) {
    for (let i = 1; i + 1 < hostStr.length; i++) {
      const c = hostStr[i];
      if (
        c === CODEPOINTS[":"] || (CODEPOINTS["0"] <= c && c <= CODEPOINTS["9"]) ||
        (CODEPOINTS["a"] <= c && c <= CODEPOINTS["f"]) || c === CODEPOINTS["."]
      ) {
        continue;
      }
      throw new Error("Wrong IPv6 URL host");
    }
  } else {
    checkURLPart(hostStr, "host", false);
    checkURLPart(userinfo, "userinfo", true);
  }

  return new HttpUrl(protocol, userinfo, hostStr, isIpv6, specifiedPort, port, queryStr);
}
