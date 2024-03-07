import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'
import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config();

const privateKey = JSON.parse(process.env.private_key);

const app =  initializeApp({
    apiKey: `${process.env.apiKey}`,
    authDomain: "be-cared.fireabaseapp.com",
    projectId: "be-cared",
    storageBucket: "be-cared.appspot.com",
    messagingSenderId: `${process.env.messagingSenderId}`,
    appId: `${process.env.appId}`,
    measurementId: `${process.env.measurementId}`
});

export const serviceAccount = {
    "type": "service_account",
    "project_id": "be-cared",
    "private_key_id": `${process.env.private_key_id}`,
    "privateKey": privateKey.private_key,
    "client_email": "firebase-adminsdk-m9r0i@be-cared.iam.gserviceaccount.com",
    "client_id": `${process.env.client_id}`,
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-m9r0i%40be-cared.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
};


// Initialize Firebase Admin SDK 
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://be-cared.firebaseio.com/`
});

export const firestore = admin.firestore();

// Initialize Firebase
export default app;

export const auth = getAuth(app);
// const analytics = getAnalytics(app);
export const GoogleProvider = new GoogleAuthProvider();

export const db = getFirestore(app); 
