export const compareBuffer = (newPILDoc, cachedDoc) => {
// TODO: Buffer comparer shorten this!
    // Convert to Buffer if they're not already (this step may be unnecessary if they are already Buffers)
    const newDocumentBuffer = Buffer.from(newPILDoc);
    const cachedDocumentBuffer = Buffer.from(cachedDoc);

    // Compare the two documents using Buffer.compare
    const isEqual = Buffer.compare(newDocumentBuffer, cachedDocumentBuffer) === 0;

    return isEqual;
};