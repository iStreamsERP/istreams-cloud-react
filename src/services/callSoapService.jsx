import axios from "axios";
import { XMLParser } from "fast-xml-parser";

const NAMESPACE = "http://tempuri.org/";

const buildSoapEnvelope = (methodName, paramXML) =>
  `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${methodName} xmlns="${NAMESPACE}">
      ${paramXML}
    </${methodName}>
  </soap:Body>
</soap:Envelope>`;

const callSoapServiceforMethods = async (url, methodName, parameterDetails) => {
  const paramXML = Object.entries(parameterDetails)
    .map(([key, value]) => `<${key}>${value}</${key}>`)
    .join("");

  const soapEnvelope = buildSoapEnvelope(methodName, paramXML);
  const soapAction = `"${NAMESPACE}${methodName}"`;

  try {
    const { data } = await axios.post(url, soapEnvelope, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: soapAction,
      },
    });

    const parser = new XMLParser({ ignoreAttributes: false });
    const response = parser.parse(data);

    const body = response["soap:Envelope"]["soap:Body"];
    const methodResponse = body[`${methodName}Response`];
    const result = methodResponse[`${methodName}Result`];

    return result;
  } catch (error) {
    console.error("❌ SOAP error:", error.message);
    if (error.response) {
      console.error("🔻 Response status:", error.response.status);
      console.error("🔻 Response body:", error.response.data);
    }
    throw error;
  }
};

export const callSoapService = async (url, methodName, parameterDetails) => {
  try {
    const storedPayload = JSON.parse(
      localStorage.getItem("doConnectionPayload")
    );
    if (storedPayload && typeof storedPayload === "object") {
      await callSoapServiceforMethods(url, "doConnection", storedPayload);
    } else {
      console.warn("⚠️ doConnectionParameter is missing or invalid.");
    }

    const response = await callSoapServiceforMethods(
      url,
      methodName,
      parameterDetails
    );

    let parsedResponse;

    try {
      // Try parsing the string
      const temp = JSON.parse(response);

      // Only set parsedResponse if it's an object or array
      if (typeof temp === "object") {
        parsedResponse = temp;
      } else {
        // It's a plain string like "SUCCESS", not JSON
        parsedResponse = response;
      }
    } catch (error) {
      // JSON.parse failed → definitely not JSON
      parsedResponse = response;
    }

    return parsedResponse;
  } catch (error) {
    console.error("SOAP error (main call):", error);
    throw error;
  }
};