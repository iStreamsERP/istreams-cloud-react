// src/services/employeeService.js
import { createSoapEnvelope, parseDataModelResponse } from "../utils/soapUtils";
import { doConnection } from "./connectionService";
import {
  getAllActiveUsersPayload,
  getEmployeeImagePayload,
  getEmployeeNameAndIdPayload,
} from "./payloadBuilders";
import soapClient from "./soapClient";

export const getEmployeeNameAndId = async (
  employeeName,
  loginUserName,
  dynamicClientUrl
) => {
  const payload = getEmployeeNameAndIdPayload(employeeName);

  // Authenticate via doConnection using the chosen dynamicClientUrl.
  const doConnectionResponse = await doConnection(
    loginUserName,
    dynamicClientUrl
  );
  if (doConnectionResponse === "ERROR") {
    throw new Error("Connection failed: Unable to authenticate.");
  }

  const SOAP_ACTION = "http://tempuri.org/getemployeename_and_id";
  const soapBody = createSoapEnvelope("getemployeename_and_id", payload);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );
  const parsedResponse = parseDataModelResponse(
    soapResponse,
    "getemployeename_and_id"
  );
  return parsedResponse;
};

export const getAllUsers = async (
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

  const SOAP_ACTION = "http://tempuri.org/IM_Get_All_Users";
  const soapBody = createSoapEnvelope("IM_Get_All_Users");

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );
  const parsedResponse = parseDataModelResponse(
    soapResponse,
    "IM_Get_All_Users"
  );
  return parsedResponse;
};
export const getAllActiveUsers = async (
  userName,
  loginUserName,
  dynamicClientUrl
) => {
  const payload = getAllActiveUsersPayload(userName);

  const doConnectionResponse = await doConnection(
    loginUserName,
    dynamicClientUrl
  );
  if (doConnectionResponse === "ERROR") {
    throw new Error("Connection failed: Unable to authenticate.");
  }

  const SOAP_ACTION = "http://tempuri.org/IM_Get_All_ActiveUsers";
  const soapBody = createSoapEnvelope("IM_Get_All_ActiveUsers", payload);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );
  const parsedResponse = parseDataModelResponse(
    soapResponse,
    "IM_Get_All_ActiveUsers"
  );
  return parsedResponse;
};

export const getEmployeeImage = async (
  employeeNo,
  loginUserName,
  dynamicClientUrl
) => {
  const payload = getEmployeeImagePayload(employeeNo);
  const doConnectionResponse = await doConnection(
    loginUserName,
    dynamicClientUrl
  );
  if (doConnectionResponse === "ERROR") {
    throw new Error("Connection failed: Unable to authenticate.");
  }

  const SOAP_ACTION = "http://tempuri.org/getpic_bytearray";
  const soapBody = createSoapEnvelope("getpic_bytearray", payload);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );

  const parsedResponse = parseDataModelResponse(
    soapResponse,
    "getpic_bytearray"
  );

  return parsedResponse;
};
