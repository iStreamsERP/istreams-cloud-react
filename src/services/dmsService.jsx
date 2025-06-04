import { createSoapEnvelope, parseDataModelResponse } from "../utils/soapUtils";
import { doConnection } from "./connectionService";
import {
  createDmsMasterPayload,
  deleteDMSDetailsPayload,
  deleteDMSMasterPayload,
  getCategoriesSummaryPayload,
  getDefaultCompanyNamePayload,
  getDocMasterListPayloadPayload,
  updateDmsAssignedToPayload,
  updateDmsVerifiedAndAssignedToPayload,
  updateDmsVerifiedByPayload,
  updateRejectDmsDetailsPayload,
} from "./payloadBuilders";
import soapClient from "./soapClient";

export const getDefaultCompanyName = async (
  formData,
  loginUserName,
  dynamicClientUrl
) => {
  const payload = getDefaultCompanyNamePayload();

  const doConnectionResponse = await doConnection(
    loginUserName,
    dynamicClientUrl
  );
  if (doConnectionResponse === "ERROR") {
    throw new Error("Connection failed: Unable to authenticate.");
  }

  const SOAP_ACTION = "http://tempuri.org/General_Get_DefaultCompanyName";
  const soapBody = createSoapEnvelope(
    "General_Get_DefaultCompanyName",
    payload
  );

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );
  const parsedResponse = parseDataModelResponse(
    soapResponse,
    "General_Get_DefaultCompanyName"
  );
  return parsedResponse;
};

export const getCategoriesSummary = async (
  noOfDays,
  loginUserName,
  dynamicClientUrl
) => {
  const payload = getCategoriesSummaryPayload(noOfDays);

  const doConnectionResponse = await doConnection(
    loginUserName,
    dynamicClientUrl
  );
  if (doConnectionResponse === "ERROR") {
    throw new Error("Connection failed: Unable to authenticate.");
  }

  const SOAP_ACTION = "http://tempuri.org/DMS_GetDashboard_CategoriesSummary";
  const soapBody = createSoapEnvelope(
    "DMS_GetDashboard_CategoriesSummary",
    payload
  );

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );
  const parsedResponse = parseDataModelResponse(
    soapResponse,
    "DMS_GetDashboard_CategoriesSummary"
  );
  return parsedResponse;
};

export const createAndSaveDMSMaster = async (
  formData,
  loginUserName,
  dynamicClientUrl
) => {
  // Build the payload dynamically using the builder function
  const payload = createDmsMasterPayload(formData);

  const doConnectionResponse = await doConnection(
    loginUserName,
    dynamicClientUrl
  );
  if (doConnectionResponse === "ERROR") {
    throw new Error("Connection failed: Unable to authenticate.");
  }

  const SOAP_ACTION = "http://tempuri.org/DMS_CreateAndSave_DMS_Master";
  const soapBody = createSoapEnvelope("DMS_CreateAndSave_DMS_Master", payload);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );
  const parsedResponse = parseDataModelResponse(
    soapResponse,
    "DMS_CreateAndSave_DMS_Master"
  );
  return parsedResponse;
};

export const createAndSaveDMSDetails = async (
  payload,
  loginUserName,
  dynamicClientUrl
) => {
  const doConnectionResponse = await doConnection(
    loginUserName,
    dynamicClientUrl
  );
  if (doConnectionResponse === "ERROR") {
    throw new Error("Connection failed: Unable to authenticate.");
  }

  const SOAP_ACTION = "http://tempuri.org/DMS_CreateAndSave_DMS_Details";
  const soapBody = createSoapEnvelope("DMS_CreateAndSave_DMS_Details", payload);
  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );
  const parsedResponse = parseDataModelResponse(
    soapResponse,
    "DMS_CreateAndSave_DMS_Details"
  );

  return parsedResponse;
};

export const updateDmsVerifiedBy = async (
  data,
  loginUserName,
  dynamicClientUrl
) => {
  const payload = updateDmsVerifiedByPayload(data);

  // Authenticate via doConnection using the chosen dynamicClientUrl.
  const doConnectionResponse = await doConnection(
    loginUserName,
    dynamicClientUrl
  );
  if (doConnectionResponse === "ERROR") {
    throw new Error("Connection failed: Unable to authenticate.");
  }

  const SOAP_ACTION = "http://tempuri.org/DMS_Update_VerifiedBy";
  const soapBody = createSoapEnvelope("DMS_Update_VerifiedBy", payload);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );
  const parsedResponse = parseDataModelResponse(
    soapResponse,
    "DMS_Update_VerifiedBy"
  );
  return parsedResponse;
};

export const updateDmsAssignedTo = async (
  data,
  loginUserName,
  dynamicClientUrl
) => {
  const payload = updateDmsAssignedToPayload(data);

  // Authenticate via doConnection using the chosen dynamicClientUrl.
  const doConnectionResponse = await doConnection(
    loginUserName,
    dynamicClientUrl
  );
  if (doConnectionResponse === "ERROR") {
    throw new Error("Connection failed: Unable to authenticate.");
  }

  const SOAP_ACTION = "http://tempuri.org/DMS_Update_AssignedTo";
  const soapBody = createSoapEnvelope("DMS_Update_AssignedTo", payload);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );
  const parsedResponse = parseDataModelResponse(
    soapResponse,
    "DMS_Update_AssignedTo"
  );
  return parsedResponse;
};

export const updateDmsVerifiedAndAssignedTo = async (
  data,
  loginUserName,
  dynamicClientUrl
) => {
  const payload = updateDmsVerifiedAndAssignedToPayload(data);

  // Authenticate via doConnection using the chosen dynamicClientUrl.
  const doConnectionResponse = await doConnection(
    loginUserName,
    dynamicClientUrl
  );
  if (doConnectionResponse === "ERROR") {
    throw new Error("Connection failed: Unable to authenticate.");
  }

  const SOAP_ACTION = "http://tempuri.org/DMS_Update_VerifiedAndAssignedTo";
  const soapBody = createSoapEnvelope(
    "DMS_Update_VerifiedAndAssignedTo",
    payload
  );

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );
  const parsedResponse = parseDataModelResponse(
    soapResponse,
    "DMS_Update_VerifiedAndAssignedTo"
  );
  return parsedResponse;
};

export const updateRejectDmsDetails = async (
  rejectionParameters,
  loginUserName,
  dynamicClientUrl
) => {
  const payload = updateRejectDmsDetailsPayload(rejectionParameters);

  const doConnectionResponse = await doConnection(
    loginUserName,
    dynamicClientUrl
  );
  if (doConnectionResponse === "ERROR") {
    throw new Error("Connection failed: Unable to authenticate.");
  }

  const SOAP_ACTION = "http://tempuri.org/DMS_Update_Rejection";
  const soapBody = createSoapEnvelope("DMS_Update_Rejection", payload);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );
  const parsedResponse = parseDataModelResponse(
    soapResponse,
    "DMS_Update_Rejection"
  );
  return parsedResponse;
};

export const getDocMasterList = async (
  parameter,
  loginUserName,
  dynamicClientUrl
) => {
  const payload = getDocMasterListPayloadPayload(parameter);

  const doConnectionResponse = await doConnection(
    loginUserName,
    dynamicClientUrl
  );
  if (doConnectionResponse === "ERROR") {
    throw new Error("Connection failed: Unable to authenticate.");
  }

  const SOAP_ACTION = "http://tempuri.org/DMS_GetDocMaster_List";
  const soapBody = createSoapEnvelope("DMS_GetDocMaster_List", payload);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );

  const parsedResponse = parseDataModelResponse(
    soapResponse,
    "DMS_GetDocMaster_List"
  );
  return parsedResponse;
};

export const deleteDMSMaster = async (
  parameter,
  loginUserName,
  dynamicClientUrl
) => {
  const payload = deleteDMSMasterPayload(parameter);

  const doConnectionResponse = await doConnection(
    loginUserName,
    dynamicClientUrl
  );
  if (doConnectionResponse === "ERROR") {
    throw new Error("Connection failed: Unable to authenticate.");
  }

  const SOAP_ACTION = "http://tempuri.org/DMS_Delete_DMS_Master";
  const soapBody = createSoapEnvelope("DMS_Delete_DMS_Master", payload);
  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );
  const parsedResponse = parseDataModelResponse(
    soapResponse,
    "DMS_Delete_DMS_Master"
  );
  return parsedResponse;
};

export const deleteDMSDetails = async (
  deleteDMSDetails,
  loginUserName,
  dynamicClientUrl
) => {
  const payload = deleteDMSDetailsPayload(deleteDMSDetails);

  const doConnectionResponse = await doConnection(
    loginUserName,
    dynamicClientUrl
  );
  if (doConnectionResponse === "ERROR") {
    throw new Error("Connection failed: Unable to authenticate.");
  }

  const SOAP_ACTION = "http://tempuri.org/DMS_Delete_DMS_Detail";
  const soapBody = createSoapEnvelope("DMS_Delete_DMS_Detail", payload);
  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );
  const parsedResponse = parseDataModelResponse(
    soapResponse,
    "DMS_Delete_DMS_Detail"
  );
  return parsedResponse;
};
