# Piñata Libre

This project is a clone of [HeyTaco](https://www.heytaco.chat/) slack app, but open and free.

## Features

* No awards limits per day
* Leaderboards.
* Bot can join multiple channels.
* Unified leaderboard for every channel.
* Supports any emoji (as long that it was added before. See _Bot commands_).
* Emoji reactions counts as awards.
* Awards to a slack group will be distributed to all users of that group.

## Distributing awards

In order to award an award to someone, just tag the person and put
an emoji in the message that the bot will add it to the leaderboard.
(Remember that the bot __must__ be present in the channel).

## Bot commands

* @[botname] leaderboard: Show the current leaderboard on the channel
* @[botname] add-emoji :emojiCode: : adds an emoji(s) to the allowed list. It can be provided one or multiple emojis in the same command.
Example:
```
@PinataLibre add-emoji :taco: :new_moon_with_face:
```

## Enabling the Bot

* Visit https://api.slack.com/apps and click on the "Create new App button" and choose the name/workspace
* Open Interactivity & Shortcuts set it "on" the the endpoint URL and click on "Save Changes".
* Open Event Subscriptions set it to "on", set the URL endpoint and add subscribe to the following bot events: `app_home_opened`,  `app_mention`, `member_joined_channel`, `message.channels`, `reaction_added`, `reaction_removed`. After this click on save changes.
* Open OAuth & Permissions configure the Redirect URLs, click on save URLS and add the following scopes: `users.profile:read`, `groups:read`, `chat:write`, `channels:read`.
* Open App Home and enable `Home Tab`
* You're good to go.
> More info at: https://slack.dev/node-slack-sdk/tutorials/local-development

## Running

This project uses sqlite to store all data and no database configuration is needed.
```sh
yarn install && cp .env.example .env
```

Open the `.env` file and change the contents of the variables: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGN_SECRET` and `SLACK_STORE_SECRET`
> Tip: The variable `SLACK_STORE_SECRET` can have any value that you want and all other variables are obtained on the Slack app page under the `Basic Information` menu.

After the env is configure one should start `ngrok` that will expose your computer to the Internet, this is needed since Slack sends events
via Webhooks and your computer must be accessible to the outside world (Keep in mind that by default ngrok will point to `http://localhost:3000`).
```sh
yarn start-ngrok
```

Once ngrok is running, you should to the slack app page and visit the `Interactive & Shortcuts` menu, enabled it and put the URL on the `Request URL` input:
```
https://whatever-url-that-ngrok-provided/slack/interactions
```

Then you should visit the `Event subscription` menu, enabled it and put the URL and put the URL on the `Request URL` input:
```
https://whatever-url-that-ngrok-provided/slack/events
```

And the last one is OAuth & Permissions, under `Redirect URLs` put the variable
```
https://whatever-url-that-ngrok-provided/slack/oauth_redirect
```
> Tip: Everytime you restart ngrok you __MUST__ redo all these steps, since ngrok always provide new URLs.

Now that everything is set-up, run:
```sh
yarn start
```

To install the app on your workspace visit http://localhost:3000/install (keep in mind that `port` in the URL shoudl reflect the `SERVER_PORT` env variable).

You're ready

## Bot in action

![bot-demo](./demo/demo.gif)

## TODO, bugs and new features

Please visit [the issues page](https://github.com/cabelitos/pinata-libre/issues)

