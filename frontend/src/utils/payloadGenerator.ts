/**
 * Generates malicious/invalid payloads for negative frontend testing.
 */

export const PayloadGenerator = {
  getMissingFieldPayload: (schemaKeys: string[], validData: Record<string, any>) => {
    const payload = { ...validData };
    const requiredField = schemaKeys[Math.floor(Math.random() * schemaKeys.length)];
    delete payload[requiredField];
    return payload;
  },

  getInvalidTypePayload: (schemaKeys: string[], validData: Record<string, any>) => {
    const payload = { ...validData };
    const targetField = schemaKeys[Math.floor(Math.random() * schemaKeys.length)];
    payload[targetField] = { invalid: "object" }; // Injects invalid type
    return payload;
  },
};
