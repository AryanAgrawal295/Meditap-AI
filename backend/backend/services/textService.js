const { ComprehendMedicalClient, DetectEntitiesV2Command } = require("@aws-sdk/client-comprehendmedical");

const client = new ComprehendMedicalClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function analyzeMedicalText(text) {
  const command = new DetectEntitiesV2Command({
    Text: text
  });

  const response = await client.send(command);

  return response.Entities;
}

module.exports = analyzeMedicalText;