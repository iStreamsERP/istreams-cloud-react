import { createSoapEnvelope, parseDataModelResponse } from "../utils/soapUtils";
import { doConnection } from "./connectionService";
import {
  getAllDmsActiveUserPayload,
  getDashboardChannelSummaryPayload,
  getDashboardOverallSummaryPayload,
} from "./payloadBuilders";
import soapClient from "./soapClient";

export const getAllDmsActiveUser = async (
  userName,
  loginUserName,
  dynamicClientUrl
) => {
  const payload = getAllDmsActiveUserPayload(userName);

  const doConnectionResponse = await doConnection(
    loginUserName,
    dynamicClientUrl
  );
  if (doConnectionResponse === "ERROR") {
    throw new Error("Connection failed: Unable to authenticate.");
  }

  const SOAP_ACTION = "http://tempuri.org/DMS_Get_All_ActiveUsers";
  const soapBody = createSoapEnvelope("DMS_Get_All_ActiveUsers", payload);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );
  const parsedResponse = parseDataModelResponse(
    soapResponse,
    "DMS_Get_All_ActiveUsers"
  );
  return parsedResponse;
};

export const getDashboardOverallSummary = async (
  noOfDays,
  loginUserName,
  dynamicClientUrl
) => {
  const payload = getDashboardOverallSummaryPayload(noOfDays);

  const doConnectionResponse = await doConnection(
    loginUserName,
    dynamicClientUrl
  );
  if (doConnectionResponse === "ERROR") {
    throw new Error("Connection failed: Unable to authenticate.");
  }

  const SOAP_ACTION = "http://tempuri.org/DMS_GetDashboard_OverallSummary";
  const soapBody = createSoapEnvelope(
    "DMS_GetDashboard_OverallSummary",
    payload
  );

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );
  const parsedResponse = parseDataModelResponse(
    soapResponse,
    "DMS_GetDashboard_OverallSummary"
  );
  return parsedResponse;
};

export const getDashboardChannelSummary = async (
  noOfDays,
  loginUserName,
  dynamicClientUrl
) => {
  const payload = getDashboardChannelSummaryPayload(noOfDays);

  const doConnectionResponse = await doConnection(
    loginUserName,
    dynamicClientUrl
  );
  if (doConnectionResponse === "ERROR") {
    throw new Error("Connection failed: Unable to authenticate.");
  }

  const SOAP_ACTION = "http://tempuri.org/DMS_GetDashboard_ChannelSummary";
  const soapBody = createSoapEnvelope(
    "DMS_GetDashboard_ChannelSummary",
    payload
  );

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );
  const parsedResponse = parseDataModelResponse(
    soapResponse,
    "DMS_GetDashboard_ChannelSummary"
  );
  return parsedResponse;
};
