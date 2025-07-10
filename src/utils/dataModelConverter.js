export const convertDataModelToStringData = (modelName, modelData) => {
  const delimiter = "|n|";
  let resultString = `[${modelName}]${delimiter}\n`;

  for (const [key, value] of Object.entries(modelData)) {
    let val = value;

    if (typeof val === 'boolean') {
      val = val ? 'T' : 'F';
    }

    if (val === undefined || val === null) {
      val = "NULL";
    }

    resultString += `{${key}}:[${val}]${delimiter}\n`;
  }

  return resultString;
};
