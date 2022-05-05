# Remix Rockabilly Stack

![The Remix Rockabilly Stack](https://github.com/jbstewart/public-images-2782/blob/main/RockabillyStack-App.png?raw=true)

Learn more about [Remix Stacks](https://remix.run/stacks).

```
npx create-remix --template jbstewart/rockabilly-stack
```

## What's in the stack

- [Fly app deployment](https://fly.io) with [Docker](https://www.docker.com/)
- Production-ready [PostgreSQL Database](https://www.postgresql.org/)
- Both production and staging databases are run on the same app on Fly, so this whole stack still fits in the free tier
- Healthcheck endpoint for [Fly backups region fallbacks](https://fly.io/docs/reference/configuration/#services-http_checks)
- [GitHub Actions](https://github.com/features/actions) for deploy on merge to production and staging environments
- Email/Password Authentication with [cookie-based sessions](https://remix.run/docs/en/v1/api/remix#createcookiesessionstorage)
- Database ORM with [Prisma](https://prisma.io)
- Styling with [Tailwind](https://tailwindcss.com/)
- End-to-end testing with [Cypress](https://cypress.io)
- Local third party request mocking with [MSW](https://mswjs.io)
- Unit testing with [Vitest](https://vitest.dev) and [Testing Library](https://testing-library.com)
- Code formatting with [Prettier](https://prettier.io)
- Linting with [ESLint](https://eslint.org)
- Static Types with [TypeScript](https://typescriptlang.org)
- Database-backed webhook handling as described in [Stripe's video on webhooks](https://www.youtube.com/watch?v=oYSLhriIZaA&ab_channel=StripeDevelopers)

Not a fan of bits of the stack? Fork it, change it, and use `npx create-remix --template your/repo`! Make it your own.

## Quickstart

Click this button to create a [Gitpod](https://gitpod.io) workspace with the project set up and Fly pre-installed

[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/from-referrer/)

## Development

-   Start the Postgres Database in [Docker](https://www.docker.com/get-started):

    ```sh
    npm run docker
    ```

    > **Note:** The npm script will complete while Docker sets up the container in the background. Ensure that Docker has finished and your container is running before proceeding.

-   Initial setup: _If you just generated this project, this step has been done for you._

    ```sh
    npm run setup
    ```

-   Start dev server:

    ```sh
    npm run dev
    ```

This starts your app in development mode, rebuilding assets on file changes.

The database seed script creates a new user with some data you can use to get started:

-   Email: `rachel@remix.run`
-   Password: `racheliscool`

### Relevant code:

This is a pretty simple note-taking app, but it's a good example of how you can build a full stack app with Prisma and Remix. The main functionality is creating users, logging in and out, and creating and deleting notes.

- creating users, and logging in and out [./app/models/user.server.ts](./app/models/user.server.ts)
- user sessions, and verifying them [./app/session.server.ts](./app/session.server.ts)
- creating, and deleting notes [./app/models/note.server.ts](./app/models/note.server.ts)
- see the webhooks section for details of how to add new types of webhooks to your app

### Webhooks
This stack features a database-backed webhook handler as described in [Stripe's video on webhooks](https://www.youtube.com/watch?v=oYSLhriIZaA&ab_channel=StripeDevelopers).
Webhook calls are received on the route `/webhooks/$service`, where $service is a short string you assign
to each new handler you add (e.g. 'stripe' or 'convertkit'). The stack contains one example handler
called 'notes' that will listen for webhook calls that either edit an existing note if a NoteID is supplied,
or will add a new note id a userEmail is supplied. See the curl calls below for examples.
```shell
# add a new note
curl --location --request POST 'http://localhost:3000/webhooks/notes' \
--header 'Content-Type: application/json' \
--header 'Authorization: Basic MWYwMzAzYzEtYThmMy00MzEzLTkwYWMtYmRlMjY4YTQwMzJmOg==' \
--data-raw '{
    "userEmail": "rachel@remix.run",
    "title": "A webhook-added note!",
    "noteContent": "A really cool note!"
}'
```
```shell
# edit an existing note - you can find the id of a note by looking at it on the Notes page of  
# the app and noting the id in the URL: e.g. http://localhost:3000/notes/cl2s6ncdi0010ai3d41v9g56s
curl --location --request POST 'http://localhost:3000/webhooks/notes' \
--header 'Content-Type: application/json' \
--header 'Authorization: Basic MWYwMzAzYzEtYThmMy00MzEzLTkwYWMtYmRlMjY4YTQwMzJmOg==' \
--data-raw '{
    "id": "<<NOTE ID GOES HERE>>",
    "title": "An awesome new title for this note!"
}'
```
The example code for the Notes Webhook is found in `/app/webhooks/note-webhook.server.ts`.

When a call is made to the `/webhooks/$service` endpoint, the service is extracted from the URL
and used to look up the handler registered for that service code. If not found the request
is discarded, otherwise the validate function of the handler (`validateEvent()`) is called. This function is designed to
do things like check the signature (the Notes example handler just checks that a hardcoded key is found
in the Basic Authentication header - real handlers usually get a secret to check against from an
environment variable), extract an externalID (used to make calls to the endpoint idempotent, and set to
a unique timestamp if not supplied), and check the body of the request for correctness.

If everything checks out (signature correct, not a duplicated, body is correct, etc) then the event is
serialized to the WebhookEvent table with a status of PENDING. This stack also includes a background
processor, that runs in a forked process, and checks the WebhookEvent table for unprocessed
or failed events once every minute (by default, it's a constant you can change). For each such event found,
the background processor calls a `processEvent()` function in the handler. If the call is successful
the handler marks the event as PROCESSED. If not, it is marked as FAILED and the fail count for that event
is incremented. After an event fails to be processed 3 times (again, a constant you can change), it will no
longer be processed. If you go into the database and reset the count to 0, the background processor
will again attempt to process it the next time it runs.

#### Adding New Webhooks
- Add your new handler: e.g. `/app/webhooks/stripe-webhook.server.ts`
- Implement a `register()` function in that file where you register your `ServiceDefinition`
- Add a call to your `register()` function in the `registerWebhooks()` function in `/app/webhooks/register-webhooks.server.ts`

#### Debugging Webhooks
Debugging webhooks can be tricky, as normally there's no way for the service calling your webhook to
punch through your NAT firewall to reach your development machine. Some services like Stripe provide a CLI that
can not only punch through the firewall, but can replay calls to your webhook for debugging.
Most of the time though, you will need to either make calls simulating the service locally (as in the curl
examples above) or make a tunnel through the firewall with something like [ngrok](https://ngrok.com/).
For local testing [Postman](https://www.postman.com/) is another good tool, especially for simpler webhook calls that can be recreated
as Postman requests.

## Deployment

This Remix Stack comes with two GitHub Actions that handle automatically deploying your app to production and staging environments.

Prior to your first deployment, you'll need to do a few things:

-   [Install Fly](https://fly.io/docs/getting-started/installing-flyctl/)

-   Sign up and log in to Fly

    ```sh
    fly auth signup
    ```

    > **Note:** If you have more than one Fly account, ensure that you are signed into the same account in the Fly CLI as you are in the browser. In your terminal, run `fly auth whoami` and ensure the email matches the Fly account signed into the browser.

-   Create two apps on Fly, one for staging and one for production:

    ```sh
    fly create rockabilly-stack-template
    fly create rockabilly-stack-template-staging
    ```

    -   Initialize Git.

    ```sh
    git init
    ```

-   Create a new [GitHub Repository](https://repo.new), and then add it as the remote for your project. **Do not push your app yet!**

    ```sh
    git remote add origin <ORIGIN_URL>
    ```

-   Add a `FLY_API_TOKEN` to your GitHub repo. To do this, go to your user settings on Fly and create a new [token](https://web.fly.io/user/personal_access_tokens/new), then add it to [your repo secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets) with the name `FLY_API_TOKEN`.

-   Add a `SESSION_SECRET` to your fly app secrets, to do this you can run the following commands:

    ```sh
    fly secrets set SESSION_SECRET=$(openssl rand -hex 32) --app rockabilly-stack-template
    fly secrets set SESSION_SECRET=$(openssl rand -hex 32) --app rockabilly-stack-template-staging
    ```

    If you don't have openssl installed, you can also use [1password](https://1password.com/generate-password) to generate a random secret, just replace `$(openssl rand -hex 32)` with the generated secret.


-   Create a single Postgres server and attach it to both production and staging apps:

    ```sh
    fly postgres create --name rockabilly-stack-template-db
    fly postgres attach --postgres-app rockabilly-stack-template-db --app rockabilly-stack-template
    fly postgres attach --postgres-app rockabilly-stack-template-db --app rockabilly-stack-template-staging
    ```

    This approach allows you to fit a full deployment with production and staging versions of the app and a postgres
    database into the free tier of fly.io. A more conventional setup would be to create separate postgres databases for
    both production and staging, in which case you would substitute the following commands for the ones above:

    ```sh
    fly postgres create --name rockabilly-stack-template-db
    fly postgres create --name rockabilly-stack-template-staging-db
    fly postgres attach --postgres-app rockabilly-stack-template-db --app rockabilly-stack-template
    fly postgres attach --postgres-app rockabilly-stack-template-staging-db --app rockabilly-stack-template-staging
    ```
    Fly will take care of setting the DATABASE_URL secret for you.


Now that everything is set up you can commit and push your changes to your repo. Every commit to your `main` branch will trigger a deployment to your production environment, and every commit to your `dev` branch will trigger a deployment to your staging environment.

### Getting Help with Deployment

If you run into any issues deploying to Fly, make sure you've followed all of the steps above and if you have, then post as many details about your deployment (including your app name) to [the Fly support community](https://community.fly.io). They're normally pretty responsive over there and hopefully can help resolve any of your deployment issues and questions.

## GitHub Actions

We use GitHub Actions for continuous integration and deployment. Anything that gets into the `main` branch will be deployed to production after running tests/build/etc. Anything in the `dev` branch will be deployed to staging.

## Testing

### Cypress

We use Cypress for our End-to-End tests in this project. You'll find those in the `cypress` directory. As you make changes, add to an existing file or create a new file in the `cypress/e2e` directory to test your changes.

We use [`@testing-library/cypress`](https://testing-library.com/cypress) for selecting elements on the page semantically.

To run these tests in development, run `npm run test:e2e:dev` which will start the dev server for the app as well as the Cypress client. Make sure the database is running in docker as described above.

We have a utility for testing authenticated features without having to go through the login flow:

```ts
cy.login()
// you are now logged in as a new user
```

We also have a utility to auto-delete the user at the end of your test. Just make sure to add this in each test file:

```ts
afterEach(() => {
	cy.cleanupUser()
})
```

That way, we can keep your local db clean and keep your tests isolated from one another.

### Vitest

For lower level tests of utilities and individual components, we use `vitest`. We have DOM-specific assertion helpers via [`@testing-library/jest-dom`](https://testing-library.com/jest-dom).

### Type Checking

This project uses TypeScript. It's recommended to get TypeScript set up for your editor to get a really great in-editor experience with type checking and auto-complete. To run type checking across the whole project, run `npm run typecheck`.

### Linting

This project uses ESLint for linting. That is configured in `.eslintrc.js`.

### Formatting

We use [Prettier](https://prettier.io/) for auto-formatting in this project. It's recommended to install an editor plugin (like the [VSCode Prettier plugin](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)) to get auto-formatting on save. There's also a `npm run format` script you can run to format all files in the project.
