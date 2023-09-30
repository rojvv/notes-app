import { CustomEmojiId } from "./custom_emoji_id";
import { areTypedArraysEqual } from "./encode";
import { UserId } from "./user_id";
import { UNREACHABLE } from "./utilities";

export function getTypePriority(type: MessageEntityType): number {
  const priorities = [
    50, /* Mention */
    50, /* Hashtag */
    50, /* BotCommand */
    50, /* Url */
    50, /* EmailAddress */
    90, /* Bold */
    91, /* Italic */
    20, /* Code */
    11, /* Pre */
    10, /* PreCode */
    49, /* TextUrl */
    49, /* MentionName */
    50, /* Cashtag */
    50, /* PhoneNumber */
    92, /* Underline */
    93, /* Strikethrough */
    0, /* Blockquote */
    50, /* BankCardNumber */
    50, /* MediaTimestamp */
    94, /* Spoiler */
    99, /* CustomEmoji */
  ];
  return priorities[type];
}

export enum MessageEntityType {
  Mention,
  Hashtag,
  BotCommand,
  Url,
  EmailAddress,
  Bold,
  Italic,
  Code,
  Pre,
  PreCode,
  TextUrl,
  MentionName,
  Cashtag,
  PhoneNumber,
  Underline,
  Strikethrough,
  BlockQuote,
  BankCardNumber,
  MediaTimestamp,
  Spoiler,
  CustomEmoji,
  Size,
}

export type AdditionalEntityProperties =
  | null
  | Record<never, never>
  | { language: Uint8Array }
  | { url: Uint8Array }
  | { user_id: bigint }
  | { custom_emoji_id: bigint }
  | { timestamp: number };

export class MessageEntityError extends Error {
  override name = "MessageEntityError";
  constructor(message: string) {
    super(message);
  }
}

export class MessageEntity {
  type: MessageEntityType = MessageEntityType.Size;
  offset = -1;
  length = -1;
  mediaTimestamp = -1;
  argument = new Uint8Array();
  userId = new UserId();
  customEmojiId = new CustomEmojiId();

  constructor(
    type: MessageEntityType,
    offset: number,
    length: number,
    argument?: Uint8Array | UserId | number | CustomEmojiId,
  ) {
    this.type = type;
    this.offset = offset;
    this.length = length;
    if (type === MessageEntityType.Code && argument != null && argument instanceof Uint8Array) {
      this.argument = argument;
    } else if (type === MessageEntityType.TextUrl || type === MessageEntityType.PreCode) {
      if (!(argument instanceof Uint8Array) || argument.length === 0) {
        throw new MessageEntityError(
          `Entity type is ${messageEntityTypeString(type)} but argument is either empty or not Uint8Array`,
        );
      }
      this.argument = argument;
    } else if (type === MessageEntityType.MentionName) {
      if (!(argument instanceof UserId) || !argument.isValid()) {
        throw new MessageEntityError("Entity type is MentionName but argument is either not valid or not UserId");
      }
      this.userId = argument;
    } else if (type === MessageEntityType.MediaTimestamp) {
      if (typeof argument !== "number") {
        throw new MessageEntityError("Entity type is MediaTimestamp but argument isn't a number");
      }
      this.mediaTimestamp = argument;
    } else if (type === MessageEntityType.CustomEmoji) {
      if (!(argument instanceof CustomEmojiId) || !argument.isValid()) {
        throw new MessageEntityError(
          "Entity type is CustomEmoji but argument is either not valid or not CustomEmojiId",
        );
      }
      this.customEmojiId = argument;
    }
  }

  equal(other: MessageEntity) {
    return this.offset === other.offset && this.length === other.length && this.type === other.type &&
      this.mediaTimestamp === other.mediaTimestamp && areTypedArraysEqual(this.argument, other.argument) &&
      this.userId.id === other.userId.id && this.customEmojiId.id === other.customEmojiId.id;
  }

  isBefore(other: MessageEntity) {
    if (this.offset !== other.offset) {
      return this.offset < other.offset;
    }
    if (this.length !== other.length) {
      return this.length < other.length;
    }
    const priority = getTypePriority(this.type);
    const otherPriority = getTypePriority(other.type);
    return priority < otherPriority;
  }

  getTextEntityObject(): TextEntityObject | undefined {
    const additional = this.getTextEntityTypeObject();
    if (additional == null || this.type === MessageEntityType.Size) return;
    return {
      type: this.type,
      offset: this.offset,
      length: this.length,
      ...additional,
    } as TextEntityObject;
  }

  getTextEntityTypeObject(): AdditionalEntityProperties {
    switch (this.type) {
      case MessageEntityType.Mention:
      case MessageEntityType.Hashtag:
      case MessageEntityType.BotCommand:
      case MessageEntityType.Url:
      case MessageEntityType.EmailAddress:
      case MessageEntityType.Bold:
      case MessageEntityType.Italic:
      case MessageEntityType.Underline:
      case MessageEntityType.Strikethrough:
        return {};
      case MessageEntityType.BlockQuote:
        return null;
      case MessageEntityType.Code:
      case MessageEntityType.Pre:
        return {};
      case MessageEntityType.PreCode:
        return { language: this.argument };
      case MessageEntityType.TextUrl:
        return { url: this.argument };
      case MessageEntityType.MentionName:
        return { user_id: this.userId.get() };
      case MessageEntityType.Cashtag:
      case MessageEntityType.PhoneNumber:
      case MessageEntityType.BankCardNumber:
        return {};
      case MessageEntityType.MediaTimestamp:
        return { timestamp: this.mediaTimestamp };
      case MessageEntityType.Spoiler:
        return {};
      case MessageEntityType.CustomEmoji:
        return { custom_emoji_id: this.customEmojiId.get() };
      default:
        UNREACHABLE();
    }
  }
}

export declare namespace TextEntityObject {
  export interface AbstractTextEntityObject {
    type: MessageEntityType;
    offset: number;
    length: number;
  }
  export interface CommonTextEntityObject extends AbstractTextEntityObject {
    type:
      | MessageEntityType.Mention
      | MessageEntityType.Hashtag
      | MessageEntityType.BotCommand
      | MessageEntityType.EmailAddress
      | MessageEntityType.Bold
      | MessageEntityType.Italic
      | MessageEntityType.Underline
      | MessageEntityType.Strikethrough
      | MessageEntityType.Code
      | MessageEntityType.Pre
      | MessageEntityType.Cashtag
      | MessageEntityType.PhoneNumber
      | MessageEntityType.BankCardNumber
      | MessageEntityType.Spoiler;
  }
  export interface PreCodeTextEntityObject extends AbstractTextEntityObject {
    type: MessageEntityType.PreCode;
    language: Uint8Array;
  }
  export interface TextUrlTextEntityObject extends AbstractTextEntityObject {
    type: MessageEntityType.TextUrl;
    url: Uint8Array;
  }
  export interface MentionNameTextEntityObject extends AbstractTextEntityObject {
    type: MessageEntityType.MentionName;
    user_id: bigint;
  }
  export interface MediaTimestampTextEntityObject extends AbstractTextEntityObject {
    type: MessageEntityType.MediaTimestamp;
    timestamp: number;
  }
  export interface CustomEmojiTextEntityObject extends AbstractTextEntityObject {
    type: MessageEntityType.CustomEmoji;
    custom_emoji_id: bigint;
  }
}

export type TextEntityObject =
  | TextEntityObject.CommonTextEntityObject
  | TextEntityObject.PreCodeTextEntityObject
  | TextEntityObject.TextUrlTextEntityObject
  | TextEntityObject.MentionNameTextEntityObject
  | TextEntityObject.MediaTimestampTextEntityObject
  | TextEntityObject.CustomEmojiTextEntityObject;

export function getTextEntitiesObject(
  entities: MessageEntity[],
  skipBotCommands: boolean,
  maxMediaTimestamp: number,
): TextEntityObject[] {
  const result: TextEntityObject[] = [];
  for (const entity of entities) {
    if (skipBotCommands && entity.type === MessageEntityType.BotCommand) continue;
    if (entity.type === MessageEntityType.MediaTimestamp && maxMediaTimestamp < entity.mediaTimestamp) continue;
    const entityObject = entity.getTextEntityObject();
    if (entityObject?.type != null) {
      result.push(entityObject);
    }
  }
  return result;
}

export function messageEntityTypeString(messageEntityType: MessageEntityType) {
  switch (messageEntityType) {
    case MessageEntityType.Mention:
      return "Mention";
    case MessageEntityType.Hashtag:
      return "Hashtag";
    case MessageEntityType.BotCommand:
      return "BotCommand";
    case MessageEntityType.Url:
      return "Url";
    case MessageEntityType.EmailAddress:
      return "EmailAddress";
    case MessageEntityType.Bold:
      return "Bold";
    case MessageEntityType.Italic:
      return "Italic";
    case MessageEntityType.Underline:
      return "Underline";
    case MessageEntityType.Strikethrough:
      return "Strikethrough";
    case MessageEntityType.BlockQuote:
      return "BlockQuote";
    case MessageEntityType.Code:
      return "Code";
    case MessageEntityType.Pre:
      return "Pre";
    case MessageEntityType.PreCode:
      return "PreCode";
    case MessageEntityType.TextUrl:
      return "TextUrl";
    case MessageEntityType.MentionName:
      return "MentionName";
    case MessageEntityType.Cashtag:
      return "Cashtag";
    case MessageEntityType.PhoneNumber:
      return "PhoneNumber";
    case MessageEntityType.BankCardNumber:
      return "BankCardNumber";
    case MessageEntityType.MediaTimestamp:
      return "MediaTimestamp";
    case MessageEntityType.Spoiler:
      return "Spoiler";
    case MessageEntityType.CustomEmoji:
      return "CustomEmoji";
    default:
      UNREACHABLE();
  }
}
