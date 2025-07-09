import { createSoapEnvelope, parseDataModelResponse } from "../utils/soapUtils";
import { doConnection } from "./connectionService";

import soapClient from "./soapClient";

export const getDashBoardBadgeDetails = async (
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

  const SOAP_ACTION = "http://tempuri.org/BI_GetDashboard_BadgeDetails_Data";
  const soapBody = createSoapEnvelope("BI_GetDashboard_BadgeDetails_Data", payload);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );

  const parsedResponse = parseDataModelResponse(soapResponse, "BI_GetDashboard_BadgeDetails_Data");
  return parsedResponse;
};

export const getDashBoard_Master_Configuratio = async (
  DashBoardID,
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

  const SOAP_ACTION = "http://tempuri.org/BI_GetDashBoardMaster_Configuration";
  const soapBody = createSoapEnvelope("BI_GetDashBoardMaster_Configuration", DashBoardID);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );

  const parsedResponse = parseDataModelResponse(soapResponse, "BI_GetDashBoardMaster_Configuration");
  return parsedResponse;
};

export const getDashBoardChart_Data = async (
  chartID,
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

  const SOAP_ACTION = "http://tempuri.org/BI_GetDashboard_Chart_Data";
  const soapBody = createSoapEnvelope("BI_GetDashboard_Chart_Data", chartID);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );

  const parsedResponse = parseDataModelResponse(soapResponse, "BI_GetDashboard_Chart_Data");
  return parsedResponse;
};

export const getDashBoardDataModules = async (
 
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

  const SOAP_ACTION = "http://tempuri.org/BI_GetDashBoards_ForAllModules";
  const soapBody = createSoapEnvelope("BI_GetDashBoards_ForAllModules");

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );

  const parsedResponse = parseDataModelResponse(soapResponse, "BI_GetDashBoards_ForAllModules");
  return parsedResponse;
};

export const getDashBoardProgressTableDetails = async (
  tableDashBoardID,
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

  const SOAP_ACTION = "http://tempuri.org/BI_GetDashboard_ProgressTable_Data";
  const soapBody = createSoapEnvelope("BI_GetDashboard_ProgressTable_Data", tableDashBoardID);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );

  const parsedResponse = parseDataModelResponse(soapResponse, "BI_GetDashboard_ProgressTable_Data");
  return parsedResponse;
};

export const getDashBoardUpcomingEvent = async (
  DashBoardID,
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

  const SOAP_ACTION = "http://tempuri.org/BI_GetDashboard_UpcomingEvents_Data";
  const soapBody = createSoapEnvelope("BI_GetDashboard_UpcomingEvents_Data", DashBoardID);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );

  const parsedResponse = parseDataModelResponse(soapResponse, "BI_GetDashboard_UpcomingEvents_Data");
  return parsedResponse;
};

export const getDashBoardForModule = async (
  moduleName,
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

  const SOAP_ACTION = "http://tempuri.org/BI_GetDashBoards_ForModules";
  const soapBody = createSoapEnvelope("BI_GetDashBoards_ForModules", moduleName);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );

  const parsedResponse = parseDataModelResponse(soapResponse, "BI_GetDashBoards_ForModules");
  return parsedResponse;
};

export const getDashBoardUserMessage = async (
  moduleName,
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

  const SOAP_ACTION = "http://tempuri.org/IM_Get_User_Messages";
  const soapBody = createSoapEnvelope("IM_Get_User_Messages", moduleName);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );

  const parsedResponse = parseDataModelResponse(soapResponse, "IM_Get_User_Messages");
  return parsedResponse;
};