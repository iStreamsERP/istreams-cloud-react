import { createSoapEnvelope, parseDataModelResponse } from "../utils/soapUtils";
import { doConnection } from "./connectionService";

import soapClient from "./soapClient";

export const getUserMessage = async (
   UserName,
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
  const soapBody = createSoapEnvelope("IM_Get_User_Messages",  UserName);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );

  const parsedResponse = parseDataModelResponse(soapResponse, "IM_Get_User_Messages");
  return parsedResponse;
};

export const getListUserMessage = async (
  ForTheUserName,
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

  const SOAP_ACTION = "http://tempuri.org/IM_Get_ListOfUsers_Messages";
  const soapBody = createSoapEnvelope("IM_Get_ListOfUsers_Messages", ForTheUserName);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );

  const parsedResponse = parseDataModelResponse(soapResponse, "IM_Get_ListOfUsers_Messages");
  return parsedResponse;
};

export const getSpecificUserMessage = async (
  UsersName,
  // ForTheUserName,
  // SentToUserName,
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

  const SOAP_ACTION = "http://tempuri.org/IM_Get_Specific_User_Messages";
  const soapBody = createSoapEnvelope("IM_Get_Specific_User_Messages", UsersName);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );

  const parsedResponse = parseDataModelResponse(soapResponse, "IM_Get_Specific_User_Messages");
  return parsedResponse;
};

export const sentMessage = async (
  sentUserMessage,
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

  const SOAP_ACTION = "http://tempuri.org/IM_Send_Message_To";
  const soapBody = createSoapEnvelope("IM_Send_Message_To", sentUserMessage);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );

  const parsedResponse = parseDataModelResponse(soapResponse, "IM_Send_Message_To");
  return parsedResponse;
};