import { createSoapEnvelope, parseDataModelResponse } from "../utils/soapUtils";
import { doConnection } from "./connectionService";
import { createNewUserPayload, deleteUserPayload, updateUserPayload } from "./payloadBuilders";
import soapClient from "./soapClient";

export const createNewUser = async (formData, loginUserName, dynamicClientUrl) => {

    const payload = createNewUserPayload(formData);

    const doConnectionResponse = await doConnection(
        loginUserName,
        dynamicClientUrl
    );
    if (doConnectionResponse === "ERROR") {
        throw new Error("Connection failed: Unable to authenticate.");
    }

    const SOAP_ACTION = "http://tempuri.org/UM_Create_New_User";
    const soapBody = createSoapEnvelope("UM_Create_New_User", payload);

    const soapResponse = await soapClient(
        dynamicClientUrl,
        SOAP_ACTION,
        soapBody
    );
    const parsedResponse = parseDataModelResponse(
        soapResponse,
        "UM_Create_New_User"
    );

    return parsedResponse;
};

export const updateUser = async (formData, loginUserName, dynamicClientUrl) => {
    const payload = updateUserPayload(formData);

    const doConnectionResponse = await doConnection(
        loginUserName,
        dynamicClientUrl
    );

    if (doConnectionResponse === "ERROR") {
        throw new Error("Connection failed: Unable to authenticate.");
    }

    const SOAP_ACTION = "http://tempuri.org/UM_Update_User";
    const soapBody = createSoapEnvelope("UM_Update_User", payload);

    const soapResponse = await soapClient(
        dynamicClientUrl,
        SOAP_ACTION,
        soapBody
    );
    const parsedResponse = parseDataModelResponse(
        soapResponse,
        "UM_Update_User"
    );

    return parsedResponse;
};

export const deleteUser = async (formData, loginUserName, dynamicClientUrl) => {

    const payload = deleteUserPayload(formData);

    const doConnectionResponse = await doConnection(
        loginUserName,
        dynamicClientUrl
    );
    if (doConnectionResponse === "ERROR") {
        throw new Error("Connection failed: Unable to authenticate.");
    }

    const SOAP_ACTION = "http://tempuri.org/UM_Delete_User";
    const soapBody = createSoapEnvelope("UM_Delete_User", payload);

    const soapResponse = await soapClient(
        dynamicClientUrl,
        SOAP_ACTION,
        soapBody
    );
    const parsedResponse = parseDataModelResponse(
        soapResponse,
        "UM_Delete_User"
    );

    return parsedResponse;
};

export const getAllUsersList = async (loginUserName, dynamicClientUrl) => {

    const doConnectionResponse = await doConnection(
        loginUserName,
        dynamicClientUrl
    );
    if (doConnectionResponse === "ERROR") {
        throw new Error("Connection failed: Unable to authenticate.");
    }

    const SOAP_ACTION = "http://tempuri.org/UM_Get_All_Users_List";
    const soapBody = createSoapEnvelope("UM_Get_All_Users_List");

    const soapResponse = await soapClient(
        dynamicClientUrl,
        SOAP_ACTION,
        soapBody
    );

    const parsedResponse = parseDataModelResponse(
        soapResponse,
        "UM_Get_All_Users_List"
    );

    return parsedResponse;
};
