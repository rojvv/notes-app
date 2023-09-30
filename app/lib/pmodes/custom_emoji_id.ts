export class CustomEmojiId {
  constructor(public id = 0n) {}

  isValid() {
    return this.id !== 0n;
  }

  get() {
    return this.id;
  }

  toString() {
    return this.id.toString();
  }
}
