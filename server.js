import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { firestore, db } from './config/config.js';
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
    console.log("Entered endpoint /login");
    try {
        const usersCollectionRef = collection(db, "users");
        const { token } = req.headers; 
        const { user, uid, type } = req.query;

        // Fetch all documents from the 'users' collection
        const data = await getDocs(usersCollectionRef);

        // Map over each document, converting it to a JavaScript object
        // and adding the document ID as a field
        let filteredData = data.docs.map((doc) => ({
            ...doc.data(),  // Spread operator to include all document fields
            id: doc.id,     // Add the document ID as an 'id' field
        }))
        .filter((users) => users.id === user);  // Filter the data to only include the user matching the provided 'user' query parameter
        
        console.log(filteredData);

        // TODO: VERIFICATION HERE THAT USER HAS A DEDICATED FIRESTORE
        // Check if user does not exist in the users collection
        if (filteredData.length === 0) {
            console.log(`User is not in the database`);
            const data = {
                medicines: [],
                type: type
            }

            // Add the new user to the 'users' collection with 'user' as the document ID
            await firestore.collection("users").doc(user).set(data);

            // Fetch the user again 
            filteredData = data.docs.map((doc) => ({
                ...doc.data(),  // Spread operator to include all document fields
                id: doc.id,     // Add the document ID as an 'id' field
            }))
            .filter((users) => users.id === user);  // Filter the data to only include the user matching the provided 'user' query parameter
            
            console.log("User added to the users collection");
        } else {

            // Attempt to verify the token using Firebase Admin SDK
            try {
                // Check if the UID from the verified token matches the provided 'uid' query parameter
                const authUser = await admin.auth().verifyIdToken(token);

                if (authUser.uid != uid) {
                    console.log(`403: UIDs don't match`);
                    return res.sendStatus(403); 
                }

            } catch (error) {
                console.log("Unverified Token");
                return res.sendStatus(401);
            }
        }

        // If verification is successful, respond with the user type of the first matched document
        res.json({ message: filteredData[0].type});

    } catch (error) {
        console.error(`Error: ${error}`);
    }
});

app.use(drugbankRouter);
app.use(medicinesRouter);
app.use(productsRouter);
app.use(cacheRouter);