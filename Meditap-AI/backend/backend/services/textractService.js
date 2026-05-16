// textractService.js
const { TextractClient, AnalyzeDocumentCommand } = require("@aws-sdk/client-textract");
const fs = require("fs");

const client = new TextractClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function extractText(input, options = {}) {
  const imageBytes = Buffer.isBuffer(input) ? input : fs.readFileSync(input);

  // AnalyzeDocument supports HANDWRITING via FORMS/TABLES features
  // and returns TextType per block so you know what was hand-vs-printed
  const command = new AnalyzeDocumentCommand({
    Document: { Bytes: imageBytes },
    FeatureTypes: ["FORMS", "TABLES"], // enables richer block analysis
  });

  const response = await client.send(command);

  let printedText = "";
  let handwrittenText = "";

  if (response.Blocks) {
    response.Blocks.forEach((block) => {
      if (block.BlockType === "LINE") {
        // Textract flags each block's text type
        if (block.TextType === "HANDWRITING") {
          handwrittenText += (block.Text || "") + "\n";
        } else {
          printedText += (block.Text || "") + "\n";
        }
      }
    });
  }

  const fullText = [printedText, handwrittenText].filter(Boolean).join("\n");

  return {
    fullText,
    printedText,
    handwrittenText,
    hasHandwriting: handwrittenText.trim().length > 0,
    confidence: computeAverageConfidence(response.Blocks),
  };
}

function computeAverageConfidence(blocks = []) {
  const wordBlocks = blocks.filter((b) => b.BlockType === "WORD" && b.Confidence != null);
  if (!wordBlocks.length) return null;
  const avg = wordBlocks.reduce((sum, b) => sum + b.Confidence, 0) / wordBlocks.length;
  return Math.round(avg);
}

module.exports = extractText;