import axios from "axios";

const soapClient = async (url, soapAction, soapBody) => {

  try {
    const response = await axios.post(url, soapBody, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: soapAction,
      },
    });
    return response.data;
  } catch (error) {
    console.error("SOAP request error:", error);
    throw error;
  }
};

export default soapClient;
