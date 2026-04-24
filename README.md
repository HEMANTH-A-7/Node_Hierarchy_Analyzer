# BFHL — SRM Full Stack Engineering Challenge

A REST API + frontend that parses hierarchical node relationships.

## API

**POST /bfhl**

```json
{ "data": ["A->B", "A->C", "B->D", "hello", "X->Y", "Y->Z", "Z->X"] }
```

## Running locally

```bash
npm install
npm start
# Runs on http://localhost:3000
```

## Deployment (Vercel)

```bash
npm i -g vercel
vercel --prod
```

The `vercel.json` is already configured. All routes are handled by `server.js`.

## Deployment (Render)

1. Create a new **Web Service** on render.com
2. Connect your GitHub repo
3. Build command: `npm install`
4. Start command: `node server.js`

## Before submitting

Edit `server.js` lines 8-10 to fill in your real details:

```js
const USER_ID          = 'yourname_ddmmyyyy';
const EMAIL_ID         = 'you@srmist.edu.in';
const COLLEGE_ROLL     = 'YOUR_ROLL_NUMBER';
```

After deploying, update `API_URL` in `public/index.html` line 2 of the script block:

```js
const API_URL = 'https://your-deployed-url.vercel.app/bfhl';
```

## Stack

- Node.js + Express
- Vanilla HTML/CSS/JS frontend (served as static from `public/`)
- CORS enabled
- Responds in < 100ms for 50-node inputs
