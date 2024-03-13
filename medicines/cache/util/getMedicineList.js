import { requestToken, requestList } from "../../methods.js";
import { tokenOptions } from "../../tokenOptions.js";

export async function getMedicineList(name) {

    const token = await requestToken(tokenOptions);
    const response = await requestList(token, name);

    const status = response.status
    const list = response.list;

    if (status === 200) {
        return list;
    } else {
        return [];
    }
};  