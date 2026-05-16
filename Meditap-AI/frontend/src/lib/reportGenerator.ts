/**
 * Report Generation Utilities
 * Generates PDF and text-based medical reports
 */

export interface ReportData {
  patientName: string;
  patientId: string;
  doctorName?: string;
  hospitalName?: string;
  reportType: "medical-history" | "discharge-summary" | "prescription";
  generatedDate: Date;
  period?: {
    start: Date;
    end: Date;
  };
  medicalRecords?: Array<{
    type: string;
    date: Date;
    diagnosis: string;
    notes: string;
  }>;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    startDate: Date;
    endDate?: Date;
  }>;
  vitalSigns?: Array<{
    date: Date;
    bloodPressure: string;
    heartRate: number;
    weight: number;
    temperature: number;
  }>;
  summary?: string;
  recommendations?: string[];
}

/**
 * Generate a text-based medical report
 */
export function generateTextReport(data: ReportData): string {
  const lines: string[] = [];

  // Header
  lines.push("═".repeat(80));
  lines.push("MEDICAL REPORT".padStart(50));
  lines.push("═".repeat(80));
  lines.push("");

  // Patient Information
  lines.push("PATIENT INFORMATION");
  lines.push("─".repeat(40));
  lines.push(`Name: ${data.patientName}`);
  lines.push(`Patient ID: ${data.patientId}`);
  if (data.doctorName) lines.push(`Doctor: ${data.doctorName}`);
  if (data.hospitalName) lines.push(`Hospital: ${data.hospitalName}`);
  lines.push(`Report Generated: ${new Date(data.generatedDate).toLocaleString()}`);
  lines.push(`Report Type: ${data.reportType.replace("-", " ").toUpperCase()}`);
  lines.push("");

  // Period
  if (data.period) {
    lines.push("REPORT PERIOD");
    lines.push("─".repeat(40));
    lines.push(
      `From: ${new Date(data.period.start).toLocaleDateString()}`
    );
    lines.push(
      `To: ${new Date(data.period.end).toLocaleDateString()}`
    );
    lines.push("");
  }

  // Summary
  if (data.summary) {
    lines.push("SUMMARY");
    lines.push("─".repeat(40));
    lines.push(data.summary);
    lines.push("");
  }

  // Medical Records
  if (data.medicalRecords && data.medicalRecords.length > 0) {
    lines.push("MEDICAL HISTORY");
    lines.push("─".repeat(40));
    data.medicalRecords.forEach((record, idx) => {
      lines.push(
        `${idx + 1}. ${record.type} - ${new Date(record.date).toLocaleDateString()}`
      );
      lines.push(`   Diagnosis: ${record.diagnosis}`);
      if (record.notes) lines.push(`   Notes: ${record.notes}`);
    });
    lines.push("");
  }

  // Medications
  if (data.medications && data.medications.length > 0) {
    lines.push("CURRENT MEDICATIONS");
    lines.push("─".repeat(40));
    data.medications.forEach((med, idx) => {
      lines.push(`${idx + 1}. ${med.name}`);
      lines.push(`   Dosage: ${med.dosage}`);
      lines.push(`   Frequency: ${med.frequency}`);
      lines.push(`   Started: ${new Date(med.startDate).toLocaleDateString()}`);
      if (med.endDate)
        lines.push(`   Ended: ${new Date(med.endDate).toLocaleDateString()}`);
    });
    lines.push("");
  }

  // Vital Signs
  if (data.vitalSigns && data.vitalSigns.length > 0) {
    lines.push("VITAL SIGNS (LATEST)");
    lines.push("─".repeat(40));
    const latestVital = data.vitalSigns[data.vitalSigns.length - 1];
    lines.push(`Date: ${new Date(latestVital.date).toLocaleString()}`);
    lines.push(`Blood Pressure: ${latestVital.bloodPressure}`);
    lines.push(`Heart Rate: ${latestVital.heartRate} bpm`);
    lines.push(`Weight: ${latestVital.weight} kg`);
    lines.push(`Temperature: ${latestVital.temperature}°C`);
    lines.push("");
  }

  // Recommendations
  if (data.recommendations && data.recommendations.length > 0) {
    lines.push("RECOMMENDATIONS");
    lines.push("─".repeat(40));
    data.recommendations.forEach((rec, idx) => {
      lines.push(`${idx + 1}. ${rec}`);
    });
    lines.push("");
  }

  // Footer
  lines.push("═".repeat(80));
  lines.push(
    "This is an electronically generated document. For official purposes, consult your healthcare provider."
  );
  lines.push("═".repeat(80));

  return lines.join("\n");
}

/**
 * Generate HTML report (for browser display or printing)
 */
export function generateHTMLReport(data: ReportData): string {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Medical Report - ${data.patientName}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }
    .header p {
      margin: 5px 0;
      color: #666;
    }
    .section {
      margin: 25px 0;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      background-color: #f0f0f0;
      padding: 10px;
      margin-bottom: 15px;
      border-left: 4px solid #007bff;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    .info-item {
      margin-bottom: 10px;
    }
    .info-label {
      font-weight: bold;
      color: #555;
      font-size: 12px;
      text-transform: uppercase;
    }
    .info-value {
      color: #000;
      font-size: 14px;
      margin-top: 3px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th {
      background-color: #007bff;
      color: white;
      padding: 10px;
      text-align: left;
    }
    td {
      border: 1px solid #ddd;
      padding: 10px;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .list-item {
      margin-left: 20px;
      margin-bottom: 10px;
    }
    .summary-text {
      background-color: #f9f9f9;
      padding: 15px;
      border-left: 4px solid #28a745;
      margin: 15px 0;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #999;
      font-size: 12px;
      border-top: 1px solid #ddd;
      padding-top: 20px;
    }
    .recommendation {
      background-color: #e7f3ff;
      padding: 10px 15px;
      margin: 10px 0;
      border-left: 4px solid #007bff;
      border-radius: 3px;
    }
    @media print {
      body { margin: 0; padding: 10px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Medical Report</h1>
    <p><strong>${data.reportType.replace("-", " ").toUpperCase()}</strong></p>
    <p>Generated on ${new Date(data.generatedDate).toLocaleString()}</p>
  </div>

  <div class="section">
    <div class="section-title">Patient Information</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Patient Name</div>
        <div class="info-value">${data.patientName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Patient ID</div>
        <div class="info-value">${data.patientId}</div>
      </div>
      ${
        data.doctorName
          ? `
      <div class="info-item">
        <div class="info-label">Healthcare Provider</div>
        <div class="info-value">${data.doctorName}</div>
      </div>
      `
          : ""
      }
      ${
        data.hospitalName
          ? `
      <div class="info-item">
        <div class="info-label">Hospital/Facility</div>
        <div class="info-value">${data.hospitalName}</div>
      </div>
      `
          : ""
      }
    </div>
  </div>

  ${
    data.period
      ? `
  <div class="section">
    <div class="section-title">Report Period</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">From</div>
        <div class="info-value">${new Date(data.period.start).toLocaleDateString()}</div>
      </div>
      <div class="info-item">
        <div class="info-label">To</div>
        <div class="info-value">${new Date(data.period.end).toLocaleDateString()}</div>
      </div>
    </div>
  </div>
  `
      : ""
  }

  ${
    data.summary
      ? `
  <div class="section">
    <div class="section-title">Summary</div>
    <div class="summary-text">${data.summary}</div>
  </div>
  `
      : ""
  }

  ${
    data.medicalRecords && data.medicalRecords.length > 0
      ? `
  <div class="section">
    <div class="section-title">Medical History</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Diagnosis</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${data.medicalRecords
          .map(
            (record) => `
        <tr>
          <td>${new Date(record.date).toLocaleDateString()}</td>
          <td>${record.type}</td>
          <td>${record.diagnosis}</td>
          <td>${record.notes || "-"}</td>
        </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  </div>
  `
      : ""
  }

  ${
    data.medications && data.medications.length > 0
      ? `
  <div class="section">
    <div class="section-title">Current Medications</div>
    <table>
      <thead>
        <tr>
          <th>Medication</th>
          <th>Dosage</th>
          <th>Frequency</th>
          <th>Start Date</th>
          <th>End Date</th>
        </tr>
      </thead>
      <tbody>
        ${data.medications
          .map(
            (med) => `
        <tr>
          <td>${med.name}</td>
          <td>${med.dosage}</td>
          <td>${med.frequency}</td>
          <td>${new Date(med.startDate).toLocaleDateString()}</td>
          <td>${med.endDate ? new Date(med.endDate).toLocaleDateString() : "-"}</td>
        </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  </div>
  `
      : ""
  }

  ${
    data.vitalSigns && data.vitalSigns.length > 0
      ? `
  <div class="section">
    <div class="section-title">Vital Signs (Latest Reading)</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Date & Time</div>
        <div class="info-value">${new Date(
          data.vitalSigns[data.vitalSigns.length - 1].date
        ).toLocaleString()}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Blood Pressure</div>
        <div class="info-value">${data.vitalSigns[data.vitalSigns.length - 1].bloodPressure}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Heart Rate</div>
        <div class="info-value">${data.vitalSigns[data.vitalSigns.length - 1].heartRate} bpm</div>
      </div>
      <div class="info-item">
        <div class="info-label">Weight</div>
        <div class="info-value">${data.vitalSigns[data.vitalSigns.length - 1].weight} kg</div>
      </div>
      <div class="info-item">
        <div class="info-label">Temperature</div>
        <div class="info-value">${data.vitalSigns[data.vitalSigns.length - 1].temperature}°C</div>
      </div>
    </div>
  </div>
  `
      : ""
  }

  ${
    data.recommendations && data.recommendations.length > 0
      ? `
  <div class="section">
    <div class="section-title">Recommendations</div>
    ${data.recommendations.map((rec) => `<div class="recommendation">${rec}</div>`).join("")}
  </div>
  `
      : ""
  }

  <div class="footer">
    <p>This is an electronically generated medical document. For official purposes, please consult your healthcare provider.</p>
    <p>&copy; ${new Date().getFullYear()} Meditap AI - Medical Management System. All rights reserved.</p>
  </div>
</body>
</html>
  `;

  return htmlContent;
}

/**
 * Export report as text file
 */
export function exportAsText(data: ReportData): void {
  const content = generateTextReport(data);
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(content)
  );
  element.setAttribute(
    "download",
    `Medical_Report_${data.patientName}_${Date.now()}.txt`
  );
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

/**
 * Export report as HTML (for printing as PDF)
 */
export function exportAsHTML(data: ReportData): void {
  const content = generateHTMLReport(data);
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/html;charset=utf-8," + encodeURIComponent(content)
  );
  element.setAttribute(
    "download",
    `Medical_Report_${data.patientName}_${Date.now()}.html`
  );
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

/**
 * Open report in new window for printing
 */
export function printReport(data: ReportData): void {
  const content = generateHTMLReport(data);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(content);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}

/**
 * Export data as JSON (for data portability)
 */
export function exportAsJSON(data: ReportData): void {
  const jsonString = JSON.stringify(data, null, 2);
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:application/json;charset=utf-8," + encodeURIComponent(jsonString)
  );
  element.setAttribute(
    "download",
    `Medical_Data_${data.patientName}_${Date.now()}.json`
  );
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
