// Method to compare buffers (takes in Object.doc)
export const compareBuffer = (newPILDoc, cachedDoc) => {
    // Convert to Buffer if they're not already (this step may be unnecessary if they are already Buffers)
    const newDocumentBuffer = Buffer.from(newPILDoc);
    const cachedDocumentBuffer = Buffer.from(cachedDoc);

    // Compare the two documents using Buffer.compare
    const isEqual = Buffer.compare(newDocumentBuffer, cachedDocumentBuffer) === 0;

    return isEqual;
};