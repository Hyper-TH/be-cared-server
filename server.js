import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { db } from './config/config.js';
import { getDocs, collection } from 'firebase/firestore';
import medicinesRouter from './medicines/medicinesRouter.js';
import drugbankRouter from './drugbank/drugbankRouter.js';
import productsRouter from './merck/productsRouter.js';
import cacheRouter from './weeklyCache/cacheRouter.js';

// Create Express application
const app = express();
app.use(cors());
app.use(express.json());

// Endpoint for Vercel
app.get("/", (req, res) => res.send("Express on Vercel"));

// Endpoint for testing
app.get('/message', (req, res) => {
    res.json({ message: 'Hello from server!' });
});

// Start server
app.listen(8000, () => {
    console.log(`Server is running on port 8000`);
});

// Endpoint to get user authentications
app.get('/login', async (req, res) => {
    try {
        const usersCollectionRef = collection(db, "users");
        const { token } = req.headers; 
        const { user, uid } = req.query;

        const data = await getDocs(usersCollectionRef);
        const filteredData = data.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
        }))
        .filter((users) => users.id === user);
            
        try {
            const authUser = await admin.auth().verifyIdToken(token);

            if (authUser.uid != uid) {
                return res.sendStatus(403);
            }

        } catch (error) {
            console.log("Unverified Token");
            return res.sendStatus(401);
        }

        // Send type of user back to AuthContext.js
        res.json({ message: filteredData[0].type});

    } catch (error) {
        console.error(`Error: ${error}`);
    }
});

app.use(drugbankRouter);
app.use(medicinesRouter);
app.use(productsRouter);
app.use(cacheRouter);