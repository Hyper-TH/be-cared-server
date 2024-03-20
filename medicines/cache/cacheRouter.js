import express from 'express';
import admin from 'firebase-admin';
import { firestore } from '../../config/config.js';
import { estimateFirestoreDocumentSize } from './util/estimateFirestoreDocumentSize.js';
import { getNewDocument } from './util/getNewDocument.js';

const router = express.Router();

// Endpoint to cache medicine
router.get('/cacheMed', async (req, res) => {
    try {
        const { id, name, ingredients, company, status, pil, spc } = req.query;
        console.log("ID:", id);

        const pilPath = pil.replace(/ /g, "_");
        const spcPath = spc.replace(/ /g, "_");

        const documentID = id.toString();
        const collectionName = "medicines";

        const activeIngredients = ingredients
            .filter(ingredient => ingredient.active === "true")
            .map(ingredient => ingredient.name);


        let documentSnapshot = await firestore.collection(collectionName).doc(documentID).get();

        if (!documentSnapshot.exists) {
            console.log(`Caching to server with new documentID: ${documentID}`);

            const data = {
                name: name,
                activeIngredients: activeIngredients,
                company: company,
                status: status,
                pilPath: pilPath,
                spcPath: spcPath
            };

            try {
                await firestore.collection(collectionName).doc(documentID).set(data);
                
                console.log("Cached to server!");
            } catch (error) {

                console.error("An error occurred at /cacheMed:", error);
            } 

        } else {
            console.log(`Medicine is already cached`);
        }

    } catch (error) {
        console.error("An error occured at /cacheMed:", error);
    }

    res.json({ status : 200});
    console.log(`Exiting /cacheMed`);
});

// Endpoint to get cache document
router.get('/grabCache', async (req, res) => {
    const { uploadPath } = req.query;

    console.log(uploadPath);

    // Replace space with _ for firestore
    const documentID = uploadPath.replace(/ /g, "_");
    console.log(documentID);

    const collectionName = "files"; 
    
    try {
        let documentSnapshot = await firestore.collection(collectionName).doc(documentID).get();
        
        // If it's already in the server (cached)
        if (documentSnapshot.exists) {
            console.log(`Found cached document`);
            const documentData = documentSnapshot.data();
            
            res.type('application/pdf').send(documentData);
        } else {
            const document = await getNewDocument(encodeURIComponent(uploadPath));
            const docSize = estimateFirestoreDocumentSize(document);

            const data = {
                doc: document
            }

            if (!docSize) {
                await firestore.collection(collectionName).doc(documentID).set(data);
                
                console.log("Cached to server!");
              
                let documentSnapshot = await firestore.collection(collectionName).doc(documentID).get();
                const documentData = documentSnapshot.data();
              
                res.type('application/pdf').send(documentData);

            } else {
                console.log(`File size too large to cache`);
                
                res.type('application/pdf').send(data);
            }

        }

    } catch (error) {
      console.error(`Error fetching data: ${error}`);
    }
});

// Endpoint to cache document
router.get('/cacheDoc', async (req, res) => {
    console.log(`Caching docs`);

    const { pil, spc } = req.query;

    // Replace space with _ for firestore
    const pilPath = pil.replace(/ /g, "_");
    const spcPath = spc.replace(/ /g, "_");
    let pilSnapshot;
    let spcSnapshot;

    try {

        // If there is a cachedPath
        if (pil !== '') {
            pilSnapshot = await firestore.collection("files").doc(pilPath).get();

            if (pilSnapshot.exists) {
                console.log(`PIL doc already cached!`);
            } else {
                // If it does not, cache this to the server!
                console.log(`Caching to server with new documentID: ${pilPath}`);
                const document = await getNewDocument(encodeURIComponent(pilPath));
                
                const docSize = estimateFirestoreDocumentSize(document);

                if (!docSize) {
                    const data = {
                        doc: document
                    }

                    await firestore.collection("files").doc(pilPath).set(data);
                    
                    console.log("Cached to server!");
                } else {
                    console.log(`File size too large to cache`);
                }
            }
        }
        if (spc !== '') {
            spcSnapshot = await firestore.collection("files").doc(spcPath).get();

            if (spcSnapshot.exists) {
                console.log(`SPC doc already cached!`);
            } else {
                // If it does not, cache this to the server!
                console.log(`Caching to server with new documentID: ${spcPath}`);
                const document = await getNewDocument(encodeURIComponent(spcPath));
                
                const docSize = estimateFirestoreDocumentSize(document);

                if (!docSize) {
                    const data = {
                        doc: document
                    }

                    await firestore.collection("files").doc(spcPath).set(data);
                    
                    console.log("Cached to server!");
                } else {
                    console.log(`File size too large to cache`);
                }
            }
        }

    } catch (error) {
      console.error(`Error fetching data: ${error}`);
    }

    res.json({ status : 200});
});

// TODO: Check user's current documents and see if it's the same as files
// Note: if the document is not present, that means it's either not cached OR the new file is bigger than the limit

export default router;