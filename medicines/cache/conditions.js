import { firestore } from '../../config/config.js';
import { tokenOptions } from '../tokenOptions.js';
import { requestToken, requestDocument } from '../methods.js';
import { estimateFirestoreDocumentSize } from './util/estimateFirestoreDocumentSize.js';

/* CONDITION: cachedPath === newPath  */
export const equalPath = async (cachedPath, newPath) => {
    console.log(`${cachedPath} = ${newPath}`);

    // Call requestDocument() with new path 
    // The cached path has replaced spaces with '%20'
    const token = await requestToken(tokenOptions);
    const newPILDoc = await requestDocument(token, encodeURIComponent(newPath));                      

    console.log(newPILDoc);

    // Fetch the current document's data
    const documentSnapshot = await firestore.collection("files").doc(cachedPath).get();
    const cachedDoc = documentSnapshot.data();

    return [ newPILDoc, cachedDoc ];
};  

/* CONDITION 1.1.b cachedDocument != newDocument */
export const unequalDocuments = async (cachedPath, newPath, newPILDoc) => {
    console.log(`cachedDoc != newDoc`);

    try {
        const data = {
            doc: newPILDoc
        }

        const docSize = estimateFirestoreDocumentSize(newPILDoc);

        if (docSize) {
            await firestore.collection("files").doc(cachedPath).delete();

            console.log('The document is too large to store in Firestore.');
        } else {
            await firestore.collection("files").doc(cachedPath).delete();
            await firestore.collection("files").doc(newPath).set(data);
            
            console.log("Cached to server!");
        }

    } catch (error) {
        console.error("An error occurred:", error);
    } 
};

/* CONDITION 1.2: cachedPath does not have a cachedDocument */
export const uncachedPath = async (newPILDoc, newPath) => {
    console.log(`newPath does not exist in the files collection`);

    try {
        const docSize = estimateFirestoreDocumentSize(newPILDoc);

        if (docSize) {
            console.log('The document is too large to store in Firestore.');

            await firestore.collection("files").doc(newPath).delete();
        } else {
            const data = {
                doc: newPILDoc
            }

            await firestore.collection("files").doc(newPath).delete();
            await firestore.collection("files").doc(newPath).set(data);

            console.log("Cached to server!");
        }

    } catch (error) {
        console.error("An error occurred:", error);
    } 
};

/* CONDITION 2: cachedPath !== newPath */
export const unequalPaths = async (cachedPath, newPath, medicineID) => {
    console.log(`${cachedPath} != ${newPath}`);
    console.log(`Removing ${cachedPath}`);

    // Remove cachedPath in the files collection
    await firestore.collection("files").doc(cachedPath).delete();

    // Update the pilPath in the medicines collection
    await firestore.collection("medicines").doc(medicineID).update({
        'pilPath': newPath
    });

    const token = await requestToken(tokenOptions);
    const newPILDoc = await requestDocument(token, encodeURIComponent(newPath)); 

    try {
        const docSize = estimateFirestoreDocumentSize(newPILDoc);

        if (docSize) {
            console.log('The document is too large to store in Firestore.');
            await firestore.collection("files").doc(newPath).delete();
        } else {
            const data = {
                doc: newPILDoc
            }

            await firestore.collection("files").doc(newPath).delete();
            await firestore.collection("files").doc(newPath).set(data);

            console.log("Cached to server!");
        }

    } catch (error) {
        console.error("An error occurred:", error);
    } 
};

/* CONDITION: cachedDoc is outdated */
export const outdatedCache = async (medicineID, cachedPath) => {
    console.log(`Cached document is outdated`);

    await firestore.collection("medicines").doc(medicineID).update({
        'pilPath': ''
    });

    try { 
        await firestore.collection("files").doc(cachedPath).delete();

        console.log("Document successfully deleted!");
    } catch (error) {
        console.error("Error removing document: ", error);
    }

    console.log(`Cached path and doc removed`);
};

/* CONDITION: Medicine is not in the website */
export const unavailableMed = async (medicineID) => {
    console.log(`Could not find medicine`);

    try {
        await firestore.collection("medicines").doc(medicineID).delete();

        console.log("Document successfully deleted!");
    } catch (error) {
        console.error("Error removing document: ", error);
    }

    console.log(`Removed cached medicines`);

    // TODO: If medicine is not cached, give warning to users collection
};