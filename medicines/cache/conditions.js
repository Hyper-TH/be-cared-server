import { firestore } from '../../config/config.js';
import { tokenOptions } from '../tokenOptions.js';
import { requestToken, requestList, requestDocument } from '../methods.js';

// Method to return size of document
function estimateFirestoreDocumentSize(object) {
    const jsonString = JSON.stringify(object);

    // Assuming the environment uses UTF-16 encoding (JavaScript's default string encoding)
    return new Blob([jsonString]).size;
};

// Method to get the new version of medicine
export const newMedsData = async (medicineID, medicineName) => {

    // Get the first result of searchList
    const token = await requestToken(tokenOptions);
    const medsList = await requestList(token, medicineName);

    // Initialize x to 0 to start from the first index of medsData.entities
    let x = 0;
    let found = false; // Flag to indicate whether a match is found

    // Loop through medsData.entities until a match is found or the end of the array is reached
    while (x < medsList.entities.length && !found) {
        if ((medsList.entities[x].id).toString() === medicineID) {
            // If a match is found, log the matching entity and set found to true
            console.log(`Match found:`);
            // console.log(`${medsData.entities[x].name} == ${medicineName}`);

            found = true;
        } else {
            // If no match, increment x to check the next entity
            console.log("Incremented X");

            x = x + 1;
        }
    }   // end while

    const medsData = medsList.entities[x];

    return [found, medsData];
};

/* CONDITION 1: cachedPath === newPath  */
export const condition1 = async (cachedPath, newPath) => {
    console.log(`${cachedPath} = ${newPath}`);

    // Call requestDocument() with new path 
    // The cached path has replaced spaces with '%20'
    const token = await requestToken(tokenOptions);
    const newPILDoc = await requestDocument(token, encodeURIComponent(newPath));                      

    console.log(newPILDoc);

    // Fetch the current document's data
    const documentSnapshot = await firestore.collection("files").doc(cachedPath).get();
    const cachedDocument = documentSnapshot.data();

    return [ newPILDoc, cachedDocument ];
};  

/* CONDITION 1.1: cachedPath has a cachedDocument */
export const condition1_1 = async (cachedDocument, newPILDoc) => {
    console.log(`cachedDocument: `, cachedDocument.doc, `\n`);

    // TODO: Buffer comparer shorten this!
    // Convert to Buffer if they're not already (this step may be unnecessary if they are already Buffers)
    const newDocumentBuffer = Buffer.from(newPILDoc);
    const cachedDocumentBuffer = Buffer.from(cachedDocument.doc);

    // Compare the two documents using Buffer.compare
    const isEqual = Buffer.compare(newDocumentBuffer, cachedDocumentBuffer) === 0;

    return isEqual;
};

/* CONDITION 1.1.b cachedDocument != newDocument */
export const condition1_b = async (cachedPath, newPath, newPILDoc) => {
    console.log(`cachedDoc != newDoc`);

    try {
        const data = {
            doc: newPILDoc
        }

        const docSize = estimateFirestoreDocumentSize(newPILDoc);
        console.log(`Estimated document size: ${docSize} bytes`);

        /* CONDITION 1.1.c: newDocument is above limit */
        if (docSize > 1048487) {
            // Still delete the outdated document
            await firestore.collection("files").doc(cachedPath).delete();
            console.log('The document is too large to store in Firestore.');
        } 

        /* CONDITION 1.1.d: newDocument is below limit */
        else {
            // Update file collection
            await firestore.collection("files").doc(cachedPath).delete();
            await firestore.collection("files").doc(newPath).set(data);
            
            console.log("Cached to server!");
        }

    } catch (error) {
        console.error("An error occurred:", error);
    } 
};

/* CONDITION 1.2: cachedPath does not have a cachedDocument */
// If the path isn't cached yet (i.e., newPath does not exist in files collection)
export const condition1_c = async (newPILDoc, newPath) => {
    console.log(`newPath does not exist in the files collection`);

    try {
        const data = {
            doc: newPILDoc
        }

        const docSize = estimateFirestoreDocumentSize(newPILDoc);
        console.log(`Estimated document size: ${docSize} bytes`);

        /* CONDITION 1.1.c: newDocument is above limit */
        if (docSize > 1048487) {
            console.log('The document is too large to store in Firestore.');
            await firestore.collection("files").doc(newPath).delete();
        } 
        
        /* CONDITION 1.1.d: newDocument is below limit */
        else {

            // Update file collection
            await firestore.collection("files").doc(newPath).delete();
            await firestore.collection("files").doc(newPath).set(data);

            console.log("Cached to server!");
        }

    } catch (error) {
        console.log(`Could not cache due to exceeding limits!`);

        console.error("An error occurred:", error);
    } 
};