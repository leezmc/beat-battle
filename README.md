# beat-battle

## Setup / Installation

Run while in proj dir:
```bash
npm install
```

Set env.json to:
```json
{
  "db_password": "POSTGRES_PASSWORD",
  "api_key": "API_KEY"
}
```

## Usage

To get started, run while in proj dir:
```
npm start
```

Then open up your browser and go to `http://localhost:3000` to see the app
running.

For specific pages, append like this for example (you will not need to append 'pages'):
```
http://localhost:3000/sequencer/sequencer.html
```

### Unit Tests

Run in proj dir:
```
node --test
```
