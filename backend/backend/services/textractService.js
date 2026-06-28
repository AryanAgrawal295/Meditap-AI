const { TextractClient, DetectDocumentTextCommand } = require("@aws-sdk/client-textract");
const fs = require("fs");

const client = new TextractClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function extractText(input) {
  const imageBytes = Buffer.isBuffer(input) ? input : fs.readFileSync(input);

  const command = new DetectDocumentTextCommand({
    Document: {
      Bytes: imageBytes
    }
  });

  let response;

  try {
    response = await client.send(command);
  } catch (error) {
    console.warn("AWS Textract unavailable, continuing with OCR fallback:", error.message);
    return "";
  }

  let text = "";

  if (response.Blocks) {
    response.Blocks.forEach(block => {
      if (block.BlockType === "LINE") {
        text += block.Text + "\n";
      }
    });
  }

  return text;
}

module.exports = extractText;
