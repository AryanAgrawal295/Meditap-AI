# Document & Prescription Scanning Feature Guide

## Overview

Meditap now includes an advanced **camera-based document and prescription scanning feature** that allows users to:

- ✅ Scan medical documents and prescriptions using their device camera
- ✅ Automatically extract and save documents to Cloudinary
- ✅ Process prescriptions with intelligent OCR for medicine extraction
- ✅ Support both printed and handwritten documents
- ✅ Auto-fill medical record fields from scanned content

## Features

### 1. **Real-Time Camera Scanning**
- High-resolution document capture with scanning frame overlay
- Flash/torch support for low-light conditions
- Preview before confirmation
- Retake option for quality assurance

### 2. **Intelligent Document Processing**
- **Printed Documents**: AWS Textract for accurate text extraction
- **Handwritten Documents**: Vision LLM for natural handwriting recognition
- **Automatic Detection**: System automatically switches extraction method based on detected content

### 3. **Medical Record Integration**
- Scanned documents saved as medical record attachments
- Documents stored in Cloudinary with secure access
- Support for PDF, JPEG, PNG formats

### 4. **Prescription Processing**
- Extracts medicine names, dosages, and frequency
- Identifies medical conditions and procedures
- Auto-suggests doctor, hospital, date information
- Creates medication schedule with adherence timeline

### 5. **Quality Assurance**
- File size validation (50KB - 10MB for documents)
- Image format verification
- OCR confidence scoring
- Quality warnings for suboptimal scans

## How to Use

### Adding Medical Records with Scanned Documents

1. Navigate to **Add Medical Record** page
2. Scroll to **Attachments** section
3. Click **Scan Document** button
4. Grant camera permission when prompted
5. Position document in frame (align with corner markers)
6. Ensure good lighting and camera focus
7. Click **Capture** to take photo
8. Review the scanned image
9. Click **Confirm** to attach document
10. Complete and save the medical record

### Scanning Prescriptions

#### Method 1: In Medical Records
1. Go to **Add Medical Record**
2. In **Medical Details** section, click **Upload Prescription**
3. Choose **Scan Prescription** or use camera directly
4. Document will be processed with medicine extraction
5. Fields auto-populate (diagnosis, medicines, date)
6. Save record to create medication schedule

#### Method 2: In Prescriptions Page
1. Navigate to **Medications** → **Prescriptions**
2. Click **Scan Prescription** button (or **Add Prescription** for existing schedule)
3. Document is scanned and processed immediately
4. Medicines are extracted and added to medication timeline
5. Adherence tracking begins automatically

## Technical Details

### Frontend Components

#### DocumentScanner (`DocumentScanner.tsx`)
- Real-time camera feed with document overlay
- Flash toggle for low-light scanning
- Capture, review, and retry workflow
- Responsive design for mobile and desktop

**Features:**
- Automatic camera initialization
- Stream management and cleanup
- Base64 to File conversion
- Timestamped file naming
- Error handling with user feedback

#### Document Scanning Utils (`documentScanningUtils.ts`)
- Image optimization for OCR
- File validation
- Scanning metadata tracking

### Backend Services

#### Document Scanning Service (`documentScanningService.js`)
**Functions:**
- `validateScannedDocument()` - Validates file format and size
- `analyzeImageQuality()` - Assesses image quality for OCR
- `prepareForOCR()` - Prepares document with optimization hints
- `generateOCRHints()` - Creates extraction recommendations

**Validation Rules:**
- ✅ Supported formats: JPEG, PNG, WebP, PDF
- ✅ File size: 50KB - 50MB
- ✅ Quality hints for suboptimal scans

#### Enhanced OCR Controller (`ocrController.js`)
- Integrated document validation
- Quality warnings and recommendations
- Extraction method selection (Vision LLM vs Text LLM)
- Confidence scoring

### Extraction Pipeline

```
Scanned Image
    ↓
[Document Validation] → Check format, size, quality
    ↓
[AWS Textract] → Extract text (printed documents)
                → Detect handwriting
    ↓
[Decision Tree]
├─ Handwritten or Low Confidence? → Vision LLM extraction
└─ Printed? → Text LLM extraction
    ↓
[Medical Text Analysis] → AWS Comprehend Medical
    ├─ Extract conditions
    ├─ Extract medications
    └─ Extract procedures
    ↓
[Structured Medicine Extraction] → Parse dosages, frequency
    ↓
[Medicine Scheduling] → Build adherence timeline
    ↓
[Record Suggestions] → Generate doctor, hospital, date
    ↓
Response with all extracted data
```

## Best Practices for Optimal Results

### 📸 Scanning Tips
1. **Lighting**: Ensure even, bright lighting without harsh shadows or glare
2. **Focus**: Hold camera steady for 2 seconds before capturing
3. **Angle**: Position document flat in frame at 90° angle
4. **Resolution**: Use high-resolution camera (8MP+)
5. **Proximity**: Capture entire document with minimal background

### 📄 Document Guidelines
- **Printed prescriptions**: Works best with clear, dark text on white background
- **Handwritten**: System detects and switches to Vision LLM automatically
- **Multiple pages**: Scan each page separately
- **Tables**: Align document to clearly show all columns and rows

### ⚡ Performance
- File size affects processing time (larger = slower)
- High-quality scans process 2-3x faster
- System retries failed OCR with alternative methods
- Results cached for faster subsequent access

## Error Handling

### Camera Access Denied
- Check browser permissions for camera access
- Allow camera access in system settings
- Try fallback: Use manual file upload option

### Low Quality Warnings
- Ensure adequate lighting
- Clean camera lens
- Try scanning again with better positioning
- Consider using higher resolution device

### OCR Extraction Failures
- Document may be partially visible
- Text may be too small or faint
- Handwriting may be unclear
- **Solution**: Retake scan with better lighting/focus

## Data Storage & Privacy

### Cloudinary Storage
- Documents stored in private Cloudinary bucket: `meditap/medical-reports`
- Signed URLs expire after 1 hour (configurable)
- Encrypted transmission with HTTPS
- Accessible only to authenticated users

### Medical Records
- Scanned documents linked to patient records
- Only authorized healthcare providers can view
- Audit logs track all access (Access Log model)
- HIPAA-compliant storage practices

## API Endpoints

### Scan Prescription (OCR Processing)
```
POST /ocr/process
Content-Type: multipart/form-data

Body:
- file: File (image/jpeg, image/png, application/pdf)

Response:
{
  fileUrl: string,
  rawText: string,
  cleanedText: string,
  conditions: string[],
  medications: string[],
  procedures: string[],
  recordSuggestions: { ... },
  structuredMedicines: { ... },
  extractionMethod: "vision-llm" | "text-llm",
  ocrConfidence: number,
  wasHandwritten: boolean,
  documentQuality: "high" | "medium",
  qualityWarnings: string[]
}
```

### Upload Medical Report
```
POST /medical/upload-report/:patientId
Content-Type: multipart/form-data

Body:
- report: File

Response:
{
  file: {
    publicId: string,
    fileName: string,
    mimeType: string,
    resourceType: string,
    format: string,
    accessUrl: string
  }
}
```

### Upload Prescription (Medication)
```
POST /medication/prescription
Content-Type: multipart/form-data

Body:
- file: File
- patientId: string

Response:
{
  plan: MedicationPlan
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Camera not working | Check browser permissions, restart browser |
| Blurry images | Steady hand, ensure 2-3s focus time, clean lens |
| Poor OCR results | Better lighting, increase contrast, retake scan |
| File too large | Reduce image resolution or compression |
| Medicines not extracted | Try manual entry or retake with clearer image |
| Date/doctor not detected | Ensure these fields are clearly visible in scan |

## Future Enhancements

- 🚀 Multi-page document scanning
- 🚀 Barcode/QR code detection
- 🚀 Lab report template recognition
- 🚀 Medicine verification with national formulary
- 🚀 Real-time quality feedback during scanning
- 🚀 ML-based document classification
- 🚀 Batch prescription processing

## Configuration

### Environment Variables
```env
# Cloudinary
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
CLOUDINARY_FOLDER=meditap

# OCR
OCR_CONFIDENCE_THRESHOLD=75  # Minimum confidence for text LLM

# File Upload
MAX_FILE_SIZE=50000000  # 50MB in bytes
```

## Support

For issues or feature requests:
1. Check logs in `/dev-logs` or `/debug-logs`
2. Review error messages in browser console
3. Contact support with:
   - Device model and OS
   - Browser type and version
   - Screenshot of error
   - Document type being scanned

---

**Version**: 1.0.0  
**Last Updated**: May 2026
