import { firestore } from '../../config/config.js';
import { estimateFirestoreDocumentSize } from './util/estimateFirestoreDocumentSize.js';
import { getNewDocument } from './util/httpUtils.js';
import { getCachedDoc } from './util/firestoreUtils.js';

/* CONDITION: cachedPath === newPath  */
export const equalPath = async (cachedPath, newPath) => {
    console.log(`${cachedPath} == ${newPath}`);

    // The cached path has replaced spaces with '%20'
    const newDoc = await getNewDocument(encodeURIComponent(newPath));

    // Fetch the current document's data
    const cachedDoc = await getCachedDoc(cachedPath);

    return [ newDoc, cachedDoc ];
};  

/* CONDITION: cachedDocument != newDocument */
export const unequalDocuments = async (cachedPath, newPath, newDoc) => {
    console.log(`cachedDoc != newDoc`);

    try {
        const data = {
            doc: newDoc
        }

        const docSize = estimateFirestoreDocumentSize(newDoc);

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

/* CONDITION: cachedPath does not have a cachedDocument */
export const uncachedPath = async (newDoc, newPath) => {
    console.log(`newPath does not exist in the files collection`);

    try {
        const docSize = estimateFirestoreDocumentSize(newDoc);

        if (docSize) {
            console.log('The document is too large to store in Firestore.');

            await firestore.collection("files").doc(newPath).delete();
        } else {
            const data = {
                doc: newDoc
            }

            await firestore.collection("files").doc(newPath).delete();
            await firestore.collection("files").doc(newPath).set(data);

            console.log("Cached to server!");
        }

    } catch (error) {
        console.error("An error occurred:", error);
    } 
};

/* CONDITION: cachedPath !== newPath */
export const unequalPaths = async (cachedPath, newPath, medicineID, path) => {
    console.log(`${cachedPath} != ${newPath}`);
    console.log(`Removing ${cachedPath}`);

    // Remove cachedPath in the files collection
    await firestore.collection("files").doc(cachedPath).delete();

    // Update the path in the medicines collection
    await firestore.collection("medicines").doc(medicineID).update({
        [path]: newPath
    });

    const newDoc = await getNewDocument(encodeURIComponent(newPath));

    try {
        const docSize = estimateFirestoreDocumentSize(newDoc);

        if (docSize) {
            console.log('The document is too large to store in Firestore.');
            await firestore.collection("files").doc(newPath).delete();
        } else {
            const data = {
                doc: newDoc
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
export const outdatedCache = async (medicineID, cachedPath, path) => {
    console.log(`Cached document is outdated`);

    await firestore.collection("medicines").doc(medicineID).update({
        [path]: ''
    });

    console.log("Path uncached!");

    try { 
        if (cachedPath !== '') {
            await firestore.collection("files").doc(cachedPath).delete();
            console.log("Document successfully deleted!");
        }
        
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

};