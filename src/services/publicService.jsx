// src/services/publicService.js
import { createSoapEnvelope, parseDataModelResponse } from "../utils/soapUtils";
import soapClient from "./soapClient";

// Use the proxy path for the public service.
const PUBLIC_SERVICE_URL = import.meta.env.VITE_SOAP_ENDPOINT;

export const doConnectionPublic = async (loginUserName) => {
  const SOAP_ACTION = "http://tempuri.org/doConnection";
  const payload = { LoginUserName: loginUserName };
  const soapBody = createSoapEnvelope("doConnection", payload);
  const responseText = await soapClient(
    PUBLIC_SERVICE_URL,
    SOAP_ACTION,
    soapBody
  );

  const result = parseDataModelResponse(responseText, "doConnection");
  return result;
};

export const getServiceURL = async (loginUserName) => {
  const SOAP_ACTION = "http://tempuri.org/GetServiceURL";
  const payload = { LoginUserName: loginUserName };
  const soapBody = createSoapEnvelope("GetServiceURL", payload);
  const responseText = await soapClient(
    PUBLIC_SERVICE_URL,
    SOAP_ACTION,
    soapBody
  );
  const result = parseDataModelResponse(responseText, "GetServiceURL");
  return result;
};