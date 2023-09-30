export class UserId {
  public static MAX_USER_ID = (1n << 40n) - 1n;

  constructor(public id = 0n) {}

  get() {
    return this.id;
  }

  isValid() {
    return 0 < this.id && this.id <= UserId.MAX_USER_ID;
  }
}
