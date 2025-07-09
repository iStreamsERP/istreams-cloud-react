import { createSoapEnvelope, parseDataModelResponse } from "../utils/soapUtils";
import { doConnection } from "./connectionService";
import {
  createDmsMasterPayload,
  verifyauthenticationPayload,
} from "./payloadBuilders";
import soapClient from "./soapClient";

// verifyauthentication.
export const verifyauthentication = async (
  userDetails,
  email,
  dynamicClientUrl
) => {
  const payload = verifyauthenticationPayload(userDetails);

  const doConnectionResponse = await doConnection(email, dynamicClientUrl);
  if (doConnectionResponse === "ERROR") {
    throw new Error("Connection failed: Unable to authenticate.");
  }

  const SOAP_ACTION = "http://tempuri.org/verifyauthentication";
  const soapBody = createSoapEnvelope("verifyauthentication", payload);

  const soapResponse = await soapClient(
    dynamicClientUrl,
    SOAP_ACTION,
    soapBody
  );
  const parsedResponse = parseDataModelResponse(
    soapResponse,
    "verifyauthentication"
  );
  return parsedResponse;
};
