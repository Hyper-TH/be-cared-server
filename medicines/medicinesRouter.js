import express from 'express';
import { firestore } from '../config/config.js';
import { notifications } from './cache/cacheMethods.js';
import { estimateFirestoreDocumentSize } from './cache/util/estimateFirestoreDocumentSize.js';
import { compareBuffer } from './cache/util/compareBuffer.js';
import { getNewDocument } from './cache/util/getNewDocument.js';
import { getMedicineList } from './cache/util/getMedicineList.js';

const router = express.Router();

// Endpoint to get list of medicines
router.get('/getMeds', async (req, res) => {
    try {
        const { medQuery } = req.query;

        if (!medQuery) {
            return res.status(400).json({ error: 'Medicine is required' });
        } else {
            const medsData = await getMedicineList(medQuery);

            res.json({ medicines: medsData });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to subscribe to the medicine
router.get('/subscribe', async (req, res) => {
    const { user, id, name, ingredients, pil, spc } = req.query;
    const collectionName = "users";

    const pilPath = pil.replace(/ /g, "%20");
    const spcPath = spc.replace(/ /g, "%20");

    const activeIngredients = ingredients
        .filter(ingredient => ingredient.active === "true")
        .map(ingredient => ingredient.name);

    try {
        // Handling documents, if there is a pilPath then get doc otherise none
        const pilDoc = pil.length > 0 ? await getNewDocument(pilPath) : '';
        const spcDoc = spc.length > 0 ? await getNewDocument(spcPath) : '';

        // If doc !== '', check the size
        // If it returns true, it's not cachable
        const pilSize = pilDoc.length != 0 ? estimateFirestoreDocumentSize(pilDoc) : true;
        const spcSize = spcDoc.length != 0 ? estimateFirestoreDocumentSize(spcDoc) : true;

        // If true, then it's not cachable
        const newPIL = { doc: pilSize ? '' : pilDoc, cachable: !pilSize };
        const newSPC = { doc: spcSize ? '' : spcDoc, cachable: !spcSize };

        const data = {
            [id]: { // Use the medicine ID as the key for direct access
                name: name,
                activeIngredients: activeIngredients,
                pil: newPIL,
                spc: newSPC
            }
        };

        // Check if the 'medicines' field exists and update or set the specific medicine data
        const userRef = firestore.collection(collectionName).doc(user);
        const docSnapshot = await userRef.get();

        if (docSnapshot.exists) {
            // If the document exists, update the specific medicine entry
            await userRef.update({
                [`medicines.${id}`]: data[id] // Update the specific medicine by its ID
            });
        } else {
            // If the document does not exist, initialize 'medicines' with the current medicine data
            await userRef.set({
                medicines: data
            });
        }

        // Optionally, fetch the updated document to confirm or send back the updated data
        const updatedDocSnapshot = await userRef.get();
        const updatedDocumentData = updatedDocSnapshot.data();

        // Responding with the updated medicine data
        res.json({ medicine: updatedDocumentData.medicines[id] });

    } catch (error) {
        console.error("An error occurred: ", error);
    }
});


// Endpoint to check if user has subscribed to the medicine
router.get('/checkSub', async (req, res) => {
    try {
        const { user, id } = req.query;
        const collectionName = "users";
        
        // Fetch the current user's document to check existing medicines
        const userDoc = await firestore.collection(collectionName).doc(user).get();

        if (!userDoc.exists) {
            return res.status(404).send("User not found.");
        }

        const userData = userDoc.data();
        const existingMedicines = userData.medicines || {};
        
        // Check if the medicine with the given name already exists
        const medicineExists = existingMedicines.hasOwnProperty(id);
        
        if (medicineExists) {
            return res.json({ exists: true, message: "Medicine already exists in the user's medicines array." });
        } else {
            return res.json({ exists: false, message: "Medicine does not exist in the user's medicines array." });
        }
        
    } catch (error) {
        console.error("An error occurred: ", error);
        return res.status(500).send("An error occurred while processing your request.");
        
    }
});

// Endpoint to get list of subscribed medicines
router.get('/getSubs', async (req, res) => {
    const { user } = req.query; 
    const collectionName = "users";

    try {
        // Fetch the current user's document to check existing medicines
        const userDoc = await firestore.collection(collectionName).doc(user).get();

        if (!userDoc.exists) {
            console.error("User document does not exist.");
            return res.status(404).send("User not found.");
        }

        const documentData = userDoc.data();
        const medicines = documentData.medicines;

        // Check if the medicines array exists in the document to avoid undefined errors
        if (medicines && Object.keys(medicines).length > 0) {
            const [ subList, count ] = await notifications(medicines);

            console.log(subList);
            
            // Responding with the subscribed medicines array
            res.json({ medicines: subList, count: count });

        } else {
            // If the medicines array does not exist, respond with an empty array
            res.json({ medicines: [], count: 0 });
        }        
        
    } catch (error) {
        console.error("An error occurred: ", error);
        return res.status(500).send("An error occurred while processing your request.");
    }
});

// Endpoint to update user when they've opened the PDF
router.get('/updateUser', async (req, res) => {
    const { user, id, type } = req.query;
    console.log(`User ${user} now checking for medicine ${id}`);

    const userDocRef = firestore.collection("users").doc(user);
    const userDoc = await firestore.collection("users").doc(user).get();
    const userData = userDoc.data();
    const userMedicines = userData.medicines || {};

    console.log("User medicines", userMedicines);
    const medicineExists = userMedicines.hasOwnProperty(id);
    
    if (medicineExists) {
        console.log(`Found user's medicine to check for updates`);
        
        // Get the path in the medicines collection using ID
        const medsDoc = await firestore.collection("medicines").doc(id).get();
        const medsData = medsDoc.data();
        const cachedPath = medsData[type + "Path"];

        console.log(`Cached path:`, cachedPath);

        // Get the cached doc using that path
        const filesDoc = await firestore.collection("files").doc(cachedPath).get();
        const filesData = filesDoc.data();

        // If there is a cached doc 
        if (filesData) {
            const cachedDoc = filesData.doc;

            console.log(`Got doc: `, cachedDoc);

            // Grab the document from the user's side
            const medData = userData.medicines;
            
            // If user has a cached doc:
            if (medData[id][type].doc) {
                
                const isEqual = compareBuffer(medData[id][type].doc, cachedDoc);
    
                // If they're not equal, update the user's
                if (!isEqual) {
    
                    const docPath = `medicines.${id}.${type}.doc`;

                    const updateObject = {};
                    updateObject[docPath] = cachedDoc; // Use computed property names to set the dynamic key
                    
                    await userDocRef.update(updateObject)
                        .then(() => console.log("Document successfully updated"))
                        .catch((error) => console.error("Error updating document: ", error));

                    console.log(`User's ${type} doc has been updated`);

                } else {
                    console.log(`No new updates for user's ${type} doc`);
                }
            } 
            
            // If user has no cached doc
            else {
                const updatedMedicines = [...userData.medicines];

                if (updatedMedicines[index][type]) {
                    updatedMedicines[index][type].doc = cachedDoc;
                } else {
                    // Handle case where pil object might not exist
                    updatedMedicines[index][type] = { doc: cachedDoc };
                }
                
                // Prepare the update object for Firestore
                const updateObject = {};
                updateObject[`medicines.${index}.pil.doc`] = cachedDoc;
                
                // Update the document in Firestore
                await firestore.collection("users").doc(user).update(updateObject);
    
                console.log(`User's ${type} doc has been updated`);
            }
        } else {
            console.log(`No found cached file`);
        }
        
    } else {
        console.log(`Medicine not found`);
    }

    console.log(`Exiting /updateUser`);
    res.json({ status : 200 });
});

// Endpoint to unsub the medicine
router.get('/unSub', async (req, res) => {
    const { user, id } = req.query; 
    const collectionName = "users";

    console.log(`Unsub called by ${user} with medicine: ${id}`);
    
    try {
        // Fetch the current user's document to check existing medicines
        const userDoc = await firestore.collection(collectionName).doc(user).get();
        const documentData = userDoc.data();

        // Check if the medicines object exists in the document to avoid undefined errors
        if (documentData.medicines && documentData.medicines[id]) {

            // Clone the existing medicines object
            let updatedMedicines = { ...documentData.medicines };

            // Delete the medicine with the specified ID
            delete updatedMedicines[id];

            // Update the document with the updated medicines object
            await firestore.collection(collectionName).doc(user).update({
                medicines: updatedMedicines
            });
            
            // Responding with the updated medicines object
            res.json({ medicines: updatedMedicines });

        } else {
            // If the medicines object does not exist or the specified medicine ID is not found, respond accordingly
            res.status(404).json({ error: "Medicine not found or medicines object does not exist." });
        }
                
    } catch (error) {
        console.error("An error occurred: ", error);
        return res.status(500).send("An error occurred while processing your request.");
    }
});

export default router;