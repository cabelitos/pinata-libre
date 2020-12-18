# Taco Libre

This project is a clone of [HeyTaco](https://cabelitosinc.slack.com/apps/A0J4UNFLN-heytaco) slack app, but open and free.

## Features

* No taco limits per day.
* Leader boards.
* Bot can join multiple channels.
* Unified leader board for every channel that the bot is listening.

## Distributing tacos

In order to award a taco to someone, just tag the person and put
a taco emoji in the message that the bot will add it to the leaderboard.
(Remember that the bot __must__ be present in the channel).

## Bot commands

* @[botname] leaderboard: Show the current leaderboard on the channel

## Enabling the Bot

* Visit https://api.slack.com/apps?new_classic_app=1 to create a new app and choose the app name and workspace
* After it's created Choose "App Home" under "Features" menu
* Click in "Add legacy bot user"
* Fill the form and submit
* Mark the "Always show my bot as online" option
* Go back to "Basic Information" under "Settings" menu
* Install the app on the workspace
* Go to "OAuth & Permissions" under "Features" menu and copy the "Bot User OAuth Access Token"
* Set this token in the "SLACK_BOT_TOKEN" env variable.
* You're good to go.

## Running

To run locally start the postgres database by running (don't forget to set the .docker-secret-db-password for the database password)
```sh
docker-compose up tacos-db
```

After the database is running install all deps by running
```sh
yarn install && cp .env.example .env
```

Now change the `TYPEORM_PASSWORD` which sets the database password and the `SLACK_BOT_TOKEN` (acquired via `Enabling the Bot` section) variables. After this just run

```sh
yarn start
```

You're ready

## Bot in action

![bot-demo](./demo/demo.gif)

## TODO

* Add logging infra via winston or pico
* k8s deploy?
* Publish slack app?
* Add more commands and features
* Add complex bot messages, like showing leader board for the week, month, year
