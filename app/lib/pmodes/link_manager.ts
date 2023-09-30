import { CustomEmojiId } from "./custom_emoji_id";
import { areTypedArraysEqual, CODEPOINTS, encode, mergeTypedArrays } from "./encode";
import { HttpUrlProtocol, parseURL } from "./http_url";
import { UserId } from "./user_id";
import {
  beginsWith,
  CHECK,
  fullSplit,
  isAlphaOrDigit,
  split,
  toInteger,
  toLower,
  tolowerBeginsWith,
} from "./utilities";

export class LinkManager {
  static getLinkUserId(url: Uint8Array): UserId {
    const lowerCasedUrl = toLower(url);
    url = lowerCasedUrl;

    const linkScheme = "tg:";
    if (!beginsWith(url, linkScheme)) {
      return new UserId();
    }

    url = url.slice(linkScheme.length);
    if (beginsWith(url, "//")) {
      url = url.slice(2);
    }

    const host = "user";
    if (!beginsWith(url, host) || (url.length > host.length && !encode("/?#").includes(url[host.length]))) {
      return new UserId();
    }

    url = url.slice(host.length);
    if (beginsWith(url, "/")) {
      url = url.slice(1);
    }
    if (!beginsWith(url, "?")) {
      return new UserId();
    }
    url = url.slice(1);
    const hashPos = url.indexOf(CODEPOINTS["#"]);
    url = url.slice(0, hashPos === -1 ? undefined : hashPos);

    for (const parameter of fullSplit(url, CODEPOINTS["&"])) {
      const [key, value] = split(parameter, CODEPOINTS["="]);
      if (areTypedArraysEqual(key, "id")) {
        try {
          const rUserId = BigInt(toInteger(value));
          return new UserId(rUserId);
        } catch (_) {
          return new UserId();
        }
      }
    }

    return new UserId();
  }

  static getLinkCustomEmojiId(url: Uint8Array): CustomEmojiId {
    const lowerCasedUrl = toLower(url);
    url = lowerCasedUrl;

    const linkScheme = "tg:";
    if (!beginsWith(url, linkScheme)) {
      throw new Error("Custom emoji URL must have scheme tg");
    }
    url = url.slice(linkScheme.length);
    if (beginsWith(url, "//")) {
      url = url.slice(2);
    }

    const host = "emoji";
    if (!beginsWith(url, host) || (url.length > host.length && !encode("/?#").includes(url[host.length]))) {
      throw new Error(`Custom emoji URL must have host "${host}"`);
    }
    url = url.slice(host.length);
    if (beginsWith(url, "/")) {
      url = url.slice(1);
    }
    if (!beginsWith(url, "?")) {
      throw new Error("Custom emoji URL must have an emoji identifier");
    }
    url = url.slice(1);
    const hashPos = url.indexOf(CODEPOINTS["#"]);
    url = url.slice(0, hashPos === -1 ? undefined : hashPos);

    const splitx = fullSplit(url, CODEPOINTS["&"]);
    for (const parameter of splitx) {
      const [key, value] = split(parameter, CODEPOINTS["="]);
      if (areTypedArraysEqual(key, "id")) {
        const rDocumentId = BigInt(toInteger(value));
        return new CustomEmojiId(rDocumentId);
      }
    }

    throw new Error("Custom emoji URL must have an emoji identifier");
  }

  static getCheckedLink(link: Uint8Array, httpOnly = false, httpsOnly = false): Uint8Array {
    try {
      return this.checkLinkImpl(link, httpOnly, httpsOnly);
    } catch (_error) {
      return new Uint8Array();
    }
  }

  static checkLinkImpl(link: Uint8Array, httpOnly = false, httpsOnly = false): Uint8Array {
    let isTg = false;
    let isTon = false;
    if (tolowerBeginsWith(link, "tg:")) {
      link = link.slice(3);
      isTg = true;
    } else if (tolowerBeginsWith(link, "ton:")) {
      link = link.slice(4);
      isTon = true;
    }
    if ((isTg || isTon) && beginsWith(link, "//")) {
      link = link.slice(2);
    }

    const httpUrl = parseURL(link);

    if (httpsOnly && (httpUrl.protocol !== HttpUrlProtocol.Https || isTg || isTon)) {
      throw new Error("Only HTTP links are allowed");
    }
    if (isTg || isTon) {
      if (httpOnly) {
        throw new Error("Only HTTP links are allowed");
      }
      if (
        tolowerBeginsWith(link, "http://") || httpUrl.protocol === HttpUrlProtocol.Https ||
        httpUrl.userinfo.length !== 0 || httpUrl.specifiedPort !== 0 || httpUrl.isIpv6
      ) {
        throw new Error(`Wrong ${isTg ? "tg" : "ton"} URL`);
      }

      let query = httpUrl.query;
      CHECK(query[0] === CODEPOINTS["/"]);
      if (query.length > 1 && query[1] === CODEPOINTS["?"]) {
        query = query.slice(1);
      }
      for (const c of httpUrl.host) {
        if (!isAlphaOrDigit(c) && c !== CODEPOINTS["-"] && c !== CODEPOINTS["_"]) {
          throw new Error("Unallowed characters in URL host");
        }
      }

      return mergeTypedArrays(encode(isTg ? "tg" : "ton"), encode("://"), httpUrl.host, query);
    }

    if (httpUrl.host.indexOf(CODEPOINTS["."]) === -1 && !httpUrl.isIpv6) {
      throw new Error("Wrong HTTP URL");
    }
    return httpUrl.getUrl();
  }
}
