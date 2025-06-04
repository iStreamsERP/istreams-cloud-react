// utils/emailHelpers.js

/**
 * Extracts and capitalizes the name part of an email.
 * Example: "gopi@istreams.com" -> "Gopi"
 */
export const getNameFromEmail = (email) => {
  if (!email) return "";
  const [name] = email.split("@");
  return name.charAt(0).toUpperCase() + name.slice(1);
};

export const extractOrganization = (email) => {
  const match = email.match(/@([a-zA-Z]+)(?:-([a-zA-Z]+))?/);
  if (match) {
    const domain = match[1];
    const region = match[2]
      ? match[2].charAt(0).toUpperCase() + match[2].slice(1)
      : "";
    return region ? `${domain.toUpperCase()} ${region}` : domain.toUpperCase();
  }
  return "Unknown";
};

/**
 * Extracts the domain part of an email.
 * Example: "gopi@istreams.com" -> "istreams.com"
 */
export const getDomainFromEmail = (email) => {
  if (!email) return "";
  const parts = email.split("@");
  return parts[1] || "";
};
