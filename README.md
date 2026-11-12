# Empyre relay

A small helper for the Empyre broadcast overlay. Run it on the PC that spectates the League of Legends game and runs OBS.

It reads the League client's own live game feed on that PC and makes it available to the overlay page. It listens only on `127.0.0.1`, so nothing is exposed to your network. It needs no Riot API key and no login.

## Windows

1. Download **EmpyreRelay.exe** from the [latest release](../../releases/latest).
2. Double-click it and leave the window open during the broadcast.
3. Windows may show "Windows protected your PC" the first time, because the app is not code-signed. Click **More info**, then **Run anyway**.

## Mac, or if you prefer to run the script

1. Install [Node.js](https://nodejs.org) 18 or newer.
2. Download `empyre-relay.mjs` from this repository.
3. In a terminal, run `node empyre-relay.mjs`.

## Then

In OBS, use the "live" overlay link from the Broadcast tab (it starts with `http://127.0.0.1:4747`). The scoreboard and call-outs appear when the game loads.

Options: `--port 4747` to change the port.
