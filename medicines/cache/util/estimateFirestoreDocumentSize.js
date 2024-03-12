// Method to return size of document
export const estimateFirestoreDocumentSize = (object) => {
    const jsonString = JSON.stringify(object);

    // Assuming the environment uses UTF-16 encoding (JavaScript's default string encoding)
    const size = new Blob([jsonString]).size;

    console.log(`Estimated document size: ${size} bytes`);

    if (size > 1048487) {
        return true;
    } else {
        return false;
    }
};
