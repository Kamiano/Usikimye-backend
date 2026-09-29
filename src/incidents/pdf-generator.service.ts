import { Injectable, InternalServerErrorException } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface CasePdfData {
  caseNumber: string;
  status: string;
  severity: string;
  reportId: string;
  reportTitle: string;
  reportDescription: string;
  category: string;
  county: string;
  subCounty: string;
  location: string | null;
  createdAt: Date;
  incidentDate: Date;
  reportMethod?: string | null;
  survivorStatus?: string | null;
  survivorIdentity?: string | null;
  survivorName?: string | null;
  survivorPhone?: string | null;
  survivorAge?: string | null;
  reporterName?: string | null;
  reporterPhone?: string | null;
  perpetrator?: string | null;
  perpetratorCategory?: string | null;
  assignedHandlerName?: string;
  assignedHandlerEmail?: string;
  notes?: {
    note: string;
    createdAt: Date;
    user?: { firstName: string; lastName: string };
  }[];
}

export interface WatermarkOptions {
  userFullName: string;
  userEmail: string;
  timestamp: Date;
  ipAddress: string;
  redactPII: boolean;
}

@Injectable()
export class PdfGeneratorService {
  async generateCasePdf(
    caseData: CasePdfData,
    watermarkOptions: WatermarkOptions,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 36, // 0.5 inch margins (36pt)
          bufferPages: true,
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const { redactPII } = watermarkOptions;
        const mask = (text?: string | null) => {
          if (!text) return 'N/A';
          return redactPII ? '[REDACTED]' : text;
        };

        // Header Section
        doc
          .fillColor('#0F172A')
          .fontSize(20)
          .font('Helvetica-Bold')
          .text('FACE PLATFORM', { align: 'left' });
        doc
          .fillColor('#64748B')
          .fontSize(9)
          .font('Helvetica')
          .text('Incident Response & Case Management System', {
            align: 'left',
          });
        doc.moveDown(0.8);

        // Confidentiality Warning Banner
        const bannerX = 36;
        const bannerY = doc.y;
        const bannerWidth = doc.page.width - 72;
        const bannerHeight = 32;

        doc
          .roundedRect(bannerX, bannerY, bannerWidth, bannerHeight, 4)
          .fillAndStroke('#FEF2F2', '#FCA5A5');

        doc
          .fillColor('#991B1B')
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .text(
            'CONFIDENTIAL — OFFICIAL USE ONLY. This document contains privileged incident response data. Unauthorized copying or redistribution is strictly prohibited.',
            bannerX + 10,
            bannerY + 8,
            { width: bannerWidth - 20, align: 'center' },
          );

        doc.y = bannerY + bannerHeight + 16;

        // 4-Column Key-Value Metadata Grid Card
        const gridX = 36;
        const gridY = doc.y;
        const gridWidth = doc.page.width - 72;
        const gridHeight = 84;

        doc
          .roundedRect(gridX, gridY, gridWidth, gridHeight, 6)
          .fillAndStroke('#F8FAFC', '#E2E8F0');

        const colWidth = gridWidth / 4;
        const fields = [
          [
            { label: 'CASE ID', val: `#${caseData.caseNumber}` },
            {
              label: 'STATUS',
              val: caseData.status,
              isBadge: true,
              type: 'status',
            },
          ],
          [
            { label: 'CATEGORY', val: caseData.category },
            {
              label: 'SEVERITY',
              val: caseData.severity,
              isBadge: true,
              type: 'severity',
            },
          ],
          [
            {
              label: 'REPORTED DATE',
              val: new Date(caseData.createdAt).toLocaleDateString('en-US'),
            },
            {
              label: 'ASSIGNED HANDLER',
              val: caseData.assignedHandlerName || 'Unassigned',
            },
          ],
          [
            {
              label: 'REDACTION MODE',
              val: redactPII ? 'ENABLED (PII Masked)' : 'DISABLED (Full)',
            },
            {
              label: 'LOCATION',
              val: `${caseData.county || 'N/A'}, ${caseData.subCounty || 'N/A'}`,
            },
          ],
        ];

        fields.forEach((col, colIdx) => {
          col.forEach((cell, rowIdx) => {
            const cellX = gridX + colIdx * colWidth + 10;
            const cellY = gridY + 10 + rowIdx * 36;

            doc
              .fillColor('#64748B')
              .fontSize(7.5)
              .font('Helvetica-Bold')
              .text(cell.label, cellX, cellY);

            if (cell.isBadge) {
              const badgeY = cellY + 12;
              let bg = '#F1F5F9';
              let border = '#CBD5E1';
              let textClr = '#334155';

              if (cell.val === 'CRITICAL' || cell.val === 'HIGH') {
                bg = '#FEF2F2';
                border = '#FECACA';
                textClr = '#991B1B';
              } else if (cell.val === 'VERIFIED' || cell.val === 'CLOSED') {
                bg = '#F0FDF4';
                border = '#BBF7D0';
                textClr = '#166534';
              }

              doc
                .roundedRect(cellX, badgeY, 70, 15, 3)
                .fillAndStroke(bg, border);
              doc
                .fillColor(textClr)
                .fontSize(8)
                .font('Helvetica-Bold')
                .text(cell.val, cellX + 4, badgeY + 3, {
                  width: 62,
                  align: 'center',
                });
            } else {
              doc
                .fillColor('#0F172A')
                .fontSize(9)
                .font('Helvetica-Bold')
                .text(cell.val, cellX, cellY + 12, {
                  width: colWidth - 16,
                  ellipsis: true,
                });
            }
          });
        });

        doc.y = gridY + gridHeight + 20;

        // Section 1: Incident Overview
        this.renderSectionHeader(doc, '1. Incident Overview');

        doc
          .fillColor('#64748B')
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .text('TITLE: ', { continued: true })
          .fillColor('#0F172A')
          .font('Helvetica')
          .text(caseData.reportTitle);
        doc.moveDown(0.5);

        // Narrative Callout Box
        const calloutX = 36;
        const calloutY = doc.y;
        const calloutWidth = doc.page.width - 72;
        const descText =
          caseData.reportDescription || 'No description provided.';
        const textHeight = doc.heightOfString(descText, {
          width: calloutWidth - 24,
        });
        const calloutHeight = Math.max(36, textHeight + 16);

        doc
          .roundedRect(calloutX, calloutY, calloutWidth, calloutHeight, 4)
          .fillAndStroke('#FAFAFA', '#E2E8F0');
        doc.rect(calloutX, calloutY, 4, calloutHeight).fill('#3B82F6');

        doc
          .fillColor('#334155')
          .fontSize(9)
          .font('Helvetica')
          .text(descText, calloutX + 12, calloutY + 8, {
            width: calloutWidth - 24,
          });

        doc.y = calloutY + calloutHeight + 16;

        // Section 2: Intake & Demographics Table
        this.renderSectionHeader(doc, '2. Intake & Demographics');

        const demoRows = [
          [
            { label: 'Survivor Name', val: mask(caseData.survivorName) },
            { label: 'Survivor Phone', val: mask(caseData.survivorPhone) },
          ],
          [
            { label: 'Survivor Status', val: caseData.survivorStatus || 'N/A' },
            {
              label: 'Survivor Identity',
              val: caseData.survivorIdentity || 'N/A',
            },
          ],
          [
            { label: 'Reporter Name', val: mask(caseData.reporterName) },
            { label: 'Reporter Contact', val: mask(caseData.reporterPhone) },
          ],
          [
            { label: 'Alleged Perpetrator', val: mask(caseData.perpetrator) },
            {
              label: 'Perpetrator Category',
              val: caseData.perpetratorCategory || 'N/A',
            },
          ],
        ];

        demoRows.forEach((row) => {
          const rowY = doc.y;
          row.forEach((item, idx) => {
            const itemX = 36 + idx * 260;
            doc
              .fillColor('#64748B')
              .fontSize(8)
              .font('Helvetica-Bold')
              .text(`${item.label.toUpperCase()}:`, itemX, rowY, {
                width: 110,
              });
            doc
              .fillColor('#0F172A')
              .fontSize(9)
              .font('Helvetica')
              .text(item.val, itemX + 115, rowY, {
                width: 140,
                ellipsis: true,
              });
          });
          doc.moveDown(0.8);
        });

        // Section 3: Triage Notes (If available)
        if (caseData.notes && caseData.notes.length > 0) {
          doc.moveDown(0.5);
          this.renderSectionHeader(doc, '3. Case Triage Notes');
          caseData.notes.forEach((n) => {
            const author = n.user
              ? `${n.user.firstName} ${n.user.lastName}`
              : 'System Handler';
            const dateStr = new Date(n.createdAt).toLocaleDateString('en-US');
            const noteContent = redactPII ? '[REDACTED NOTE CONTENT]' : n.note;

            doc
              .fillColor('#64748B')
              .fontSize(8)
              .font('Helvetica-Bold')
              .text(`${author} (${dateStr}): `);
            doc
              .fillColor('#334155')
              .fontSize(8.5)
              .font('Helvetica')
              .text(noteContent);
            doc.moveDown(0.4);
          });
        }

        // Apply Dynamic Watermark and Footer to ALL pages
        const pageRange = doc.bufferedPageRange();
        const totalPages = pageRange.count;

        const formattedDate = new Date(watermarkOptions.timestamp)
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19);
        const watermarkText = `CONFIDENTIAL - Downloaded by ${watermarkOptions.userFullName} (${watermarkOptions.userEmail}) on ${formattedDate} UTC - IP: ${watermarkOptions.ipAddress}`;

        for (let i = 0; i < totalPages; i++) {
          doc.switchToPage(i);

          // Diagonal Watermark
          doc.save();
          doc.fillColor('#000000').opacity(0.08);
          doc.translate(doc.page.width / 2, doc.page.height / 2);
          doc.rotate(-45, { origin: [0, 0] });
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(watermarkText, -250, 0, { align: 'center', width: 500 });
          doc.restore();

          // Footer
          doc.save();
          const footerY = doc.page.height - 36;
          doc
            .moveTo(36, footerY - 8)
            .lineTo(doc.page.width - 36, footerY - 8)
            .strokeColor('#E2E8F0')
            .lineWidth(0.5)
            .stroke();

          doc.fillColor('#94A3B8').fontSize(8).font('Helvetica');
          doc.text(
            `Case #${caseData.caseNumber}  |  FACE Platform`,
            36,
            footerY,
            { align: 'left', width: 250 },
          );
          doc.text(
            `Page ${i + 1} of ${totalPages}  |  Exported by ${watermarkOptions.userEmail}`,
            doc.page.width - 286,
            footerY,
            { align: 'right', width: 250 },
          );
          doc.restore();
        }

        doc.end();
      } catch {
        reject(
          new InternalServerErrorException('Failed to generate PDF document'),
        );
      }
    });
  }

  private renderSectionHeader(
    doc: InstanceType<typeof PDFDocument>,
    title: string,
  ) {
    const y = doc.y;
    doc
      .fillColor('#0F172A')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(title, 36, y);
    doc
      .moveTo(36, doc.y + 3)
      .lineTo(doc.page.width - 36, doc.y + 3)
      .strokeColor('#CBD5E1')
      .lineWidth(0.75)
      .stroke();
    doc.y = doc.y + 10;
  }
}
