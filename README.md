# beCared Server
This is the back-end of the beCared web application. This is responsible for the storing and caching process with Firestore. 

This web application is deployable to `Vercel`. Configure `vercel.json` as appriopriate.

## Prerequisites
- Node.js v18.18.0
- A Firebase account
- A front end: [be-cared](https://github.com/Hyper-TH/be-cared).
- A cup of tea

## Install dependendcies
```
npm install @google-cloud/firestore
npm install axios
npm install cheerio
npm install cors
npm install cron
npm install dotenv
npm install express
npm install firebase firebase-admin
npm install https
npm install nodemon
npm install pdfjs-dist
```

## Firestore Collections
- files
- medicines
- products
- users

### Firebase config

Within your Firebase console, go to:

`Project settings`

Below the `Your project` section is another section called `Your apps`

Copy the SDK setup and configuration.

Paste this into `mock_files/mock_config.json`

Note that it's preferrable to rename these according to the way it's imported within `server.js`

## Environment variables
Use the `.env.example` file as a template (and remove `.example`). All of the environment variable values can be found within your `config.js` from your Firebase account. The `REACT_APP_LOCALHOST` variable can be your `localhost` domain or your deployed link.