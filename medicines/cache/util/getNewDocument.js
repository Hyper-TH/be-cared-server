import { requestToken, requestDocument } from "../../methods.js";
import { tokenOptions } from "../../tokenOptions.js";

export async function getNewDocument(path) {
    const token = await requestToken(tokenOptions);
    const response = await requestDocument(token, path);

    const status = response.status;
    const document = response.pdfBuffer;

    if (status === 200) {
        return document;
    } else {
        return '';
    }
};  