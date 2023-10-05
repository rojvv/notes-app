# Notes

> A simple Telegram mini app that lets you take notes.

- [Features](#features)
- [Architecture](#architecture)
- [Development](#development)
  - [Prerequisites](#prerequisites)
  - [Setting up PostgreSQL](#setting-up-postgresql)
  - [Cloning and configuring](#cloning-and-configuring)
  - [Telegram-side configuration](#telegram-side-configuration)
  - [Method 1: Test server](#method-1-test-server)
  - [Method 2: Production server](#method-2-production-server)
  - [Starting the development server](#starting-the-development-server)
- [Deployment with Docker](#deployment-with-docker)
- [License](#license)

## Features

- Text formatting capabilities.
- Supports Telegram entities: usernames, hashtags, and others.
- Ability to share the notes as Telegram messages.

## Architecture

The [front end](./app) is powered by React and [Lexical](https://lexical.dev).
The [back end](./api) persists data in a PostgreSQL database, and can host a Bot
API webhook at the same time.

## Development

### Prerequisites

To work on this project, you first need to:

- Install [Git](https://git-scm.com), [Deno](https://deno.com),
  [Node.js](https://nodejs.org), and optionally [pnpm](https://pnpm.io) if you
  don’t already have them. [Docker](https://docker.com) will also be needed if
  you don’t already have a PostgreSQL server running and you want to follow the
  guide here to setup one.

- Have a bot with a Web App configured properly. We’ll guide you through this,
  so you don’t need to worry it for now. All you need is a Telegram account.

### Setting up PostgreSQL

If you don’t already have access to a running PostgreSQL server, you can start
one using Docker this way:

```shell
docker run -d --name notes-app_postgres -p 127.0.0.1:5432:5432 -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=main -d postgres
```

This will pull a recent version of the
[postgres](https://hub.docker.com/_/postgres) image and start an instance of it
under the name notes-app_postgres and start listening for connections on
localhost, port 5432. The URI for connecting to it would be
postgresql://postgres@127.0.0.1/main.

### Cloning and configuring

1. Clone the repository.

```git
git clone --depth 1 https://github.com/roj1512/notes-app.git
```

2. cd into the clone and create a .env file.

```shell
cd notes-app/
touch .env
```

3. Add the required variables to the .env file you just created in the following
   format.

```bash
BOT_TOKEN=1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ
POSTGRESQL_URI=postgres://postgres@127.0.0.1/main
POLLING=1 # Whether to use polling
```

The BOT_TOKEN is the bot token [@BotFather](https://t.me/BotFather) gave you.
The POSTGRESQL_URI is your PostgreSQL connection URI, and it is
postgres://postgres@127.0.0.1/main if you have set up your PostgreSQL server by
following the above [guide](#setting-up-postgresql).

### Telegram-side configuration

#### Method 1: Test server

1. Open the Telegram app, and switch to test servers.

   - **Telegram Desktop**: Open the menu using the button in the top left
     corner, right click Add Account while holding Alt+Shift, and choose Test
     Server.
   - **Telegram macOS**: Sequentially click Settings in the tab bar until the
     debug menu opens, and click Add Account while holding Cmd.
   - **Telegram iOS**: Sequentially tap Settings in the tab bar until the debug
     menu opens, open Accounts > Login to another account > Test.

2. Enter your phone number to sign up or log in.

3. Send /newbot to [@BotFather](https://t.me/BotFather), and answer the
   questions to create a bot.

4. Use the /newapp command to create a Web App. Choose the bot you’ve just
   created, follow the instructions, and when prompted for the URL, send the
   following URL.

```text
http://localhost:3000
```

5. Edit your .env to include the following variable.

```text
TEST=1
```

6. Since the app has features that leverage inline mode, you will also have to
   enable inline mode using the /setinline command.

#### Method 2: Production server

1. Use a traffic tunneling service like [Pagekite](https://pagekite.net/),
   [Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/) or
   [ngrok](https://ngrok.io) to route a public https endpoint to your
   localhost:3000.

2. Send /newbot to [@BotFather](https://t.me/BotFather), and answer the
   questions to create a bot.

3. Use the /newapp command to create a Web App. Choose the bot you’ve just
   created, follow the instructions, and when prompted for the URL, send it the
   URL provided by your tunnel service.

4. Since the app has features that leverage inline mode, you will also have to
   enable inline mode. To do that, use /setinline.

### Starting the development server

1. To watch the front end source and rebuild it on each change, open a terminal,
   cd into the app/ directory, install the dependencies if you haven’t already,
   and run the dev script.

```shell
cd app/ # Run this from the notes-app/
pnpm install # You can use any other package manager, but pnpm is recommended
pnpm dev
```

2. To start the back end, open another terminal, cd into the app/, and run the
   dev task.

```shell
cd api/ # Run this from notes-app/
deno task dev
```

## Deployment with Docker

A publicly available image of this project can be found on
[Docker Hub](https://hub.docker.com/r/rojserbest/notes-app).

1. Copy [docker-compose.yml](./docker-compose.yml) to the machine where you plan
   to deploy the project on.
2. Create .env file next to the docker-compose.yml, and specify the following
   variables.

```bash
# Only BOT_TOKEN is required.
BOT_TOKEN=1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ

# The public https URL where the app will be available at. Recommended but not necessary.
WEB_APP_URL=https://your-domain.com
```

3. Create a volume named `notes-app`.

```bash
docker volume create notes-app
```

4. Start the containers.

```bash
docker compose up -d
```

5. Setup a reverse proxy for localhost:3000 using a web server like
   [NGINX](https://nginx.org) or [Caddy](https://caddyserver.com), connect it to
   your domain, and setup TLS.

6. Change the Web App URL in [@BotFather](https://t.me/BotFather) to where your
   deployment is accessible from.

## License

This project is licensed under the [BSD-3-Clause license](./LICENSE).
