# Notes

A simple Telegram mini app that lets you take notes.

## Features

- Text formatting capabilities.
- Supports Telegram entities: usernames, hashtags, and others.
- Ability to share the notes as Telegram messages.

## Architecture

The [front end](./app) is powered by React and [Lexical](https://lexical.dev).
The [back end](./api) persists data in a PostgreSQL database, and hosts a Bot
API webhook at the same time.

## Development

To work on this project, you need to have:

- [Deno](https://deno.com), Node.js, and [pnpm](https://pnpm.io) installed.
- A running PostgreSQL server (doesn’t matter if it is a container or not).
- A Telegram bot in the test servers with its Web App URL being
  http://localhost:3000.

After cloning the repository, and setting the required environment variables
BOT_TOKEN and POSTGRESQL_URI, you can start the development server like this:

```bash
cd app/
pnpm install
pnpm dev &

cd ../api/
deno task dev
```

## License

This project is licensed under the [BSD-3-Clause license](./LICENSE).
