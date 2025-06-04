export const hexToBase64 = (hexString) => {
  let binary = "";
  for (let i = 0; i < hexString.length; i += 2) {
    binary += String.fromCharCode(parseInt(hexString.substr(i, 2), 16));
  }
  return window.btoa(binary);
};
