import { fileURLToPath } from 'node:url';
import { type CyberReportSnapshot, cyberReportSnapshotSchema } from '@bump/contracts';
import { reportLabels } from '@bump/core';
import PDFDocument from 'pdfkit';
export async function renderCyberPdf(input: CyberReportSnapshot): Promise<Buffer> {
  const s = cyberReportSnapshotSchema.parse(input),
    t = reportLabels[s.locale];
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 52, bottom: 54, left: 52, right: 52 },
      bufferPages: true,
      compress: true,
      info: {
        Title: `Bump Cyber — ${s.client.name}`,
        Author: 'Bump Consultation',
        Subject: s.mandate.reference,
        Creator: 'Bump Cyber',
      },
    });
    const chunks: Buffer[] = [];
    let size = 0;
    doc.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > 20000000) doc.destroy(new Error('PDF size limit'));
      else chunks.push(chunk);
    });
    doc.on('error', () => reject(new Error('PDF generation failed')));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.registerFont(
      'BumpBody',
      fileURLToPath(new URL('../assets/fonts/DejaVuSans.ttf', import.meta.url)),
    );
    doc.font('Helvetica-Bold').fillColor('#10203b').fontSize(66).text('bump.', 52, 108);
    doc
      .font('BumpBody')
      .fontSize(11)
      .fillColor('#1947d2')
      .text('BUMP CONSULTATION  /  BUMP CYBER', 54, 190);
    doc.fillColor('#10203b').fontSize(30).text(t.title, 52, 248, { width: 490 });
    doc.moveDown().fontSize(22).text(s.client.name);
    doc
      .moveDown(2)
      .fontSize(11)
      .fillColor('#4c5c76')
      .text(
        `${t.mandate}: ${s.mandate.reference}\n${t.responsible}: ${s.audit.responsible}\n${t.date}: ${s.createdAt.slice(0, 10)}\n${s.reportId}`,
      );
    doc.moveDown(2).fillColor('#1947d2').text(t.approved);
    doc.moveDown().fontSize(9).fillColor('#4c5c76').text(t.confidential);
    const page = () => {
      doc.addPage();
      doc.font('BumpBody').fontSize(10).fillColor('#10203b');
    };
    const heading = (title: string) => {
      if (doc.y > 680) page();
      doc.moveDown().fillColor('#1947d2').fontSize(18).text(title);
      doc.moveDown(0.6).fontSize(10).fillColor('#10203b');
    };
    const paragraph = (text: string) => {
      doc.font('BumpBody').fontSize(10).fillColor('#26364f').text(text, { lineGap: 3 });
      doc.moveDown(0.7);
    };
    const row = (values: unknown[]) => {
      paragraph(values.map((v) => String(v ?? '—')).join('  |  '));
    };
    page();
    heading(t.executive);
    paragraph(s.executiveSummary);
    paragraph(t.unknown);
    row([t.unreviewed, s.unreviewedCount, t.falsePositive, s.falsePositiveCount]);
    heading(t.scope);
    for (const asset of s.assets) row([asset.label, asset.kind, asset.target, asset.exposure]);
    paragraph(
      `${t.mandate}: ${s.mandate.reference}\n${s.mandate.signedBy} · ${s.mandate.authorizedAt}\n${s.mandate.validFrom} → ${s.mandate.validUntil}`,
    );
    heading(t.limits);
    paragraph(s.mandate.limitations);
    for (const asset of s.mandate.exclusions) row([asset.label, asset.target]);
    paragraph(s.reviewNotes);
    paragraph(t.coverageWarning);
    page();
    heading(t.method);
    paragraph(t.methodBody);
    paragraph(t.human);
    heading(t.tools);
    for (const scan of s.scans)
      row([scan.engine, scan.version, scan.state, scan.observationCount ?? 'unknown']);
    heading(t.coverage);
    for (const scan of s.scans) row([scan.id, scan.state, scan.errorCode ?? '—']);
    paragraph(t.coverageWarning);
    heading(t.confirmed);
    if (!s.findings.length) paragraph(t.none);
    for (const f of s.findings) row([f.observation.title, f.observation.severity, f.status]);
    heading(t.risks);
    for (const f of s.findings.filter(
      (f) => !['verified_fixed', 'accepted_risk'].includes(f.status),
    ))
      row([f.observation.title, `${t.priority}: ${f.priority.score}/100`, f.businessImpact]);
    page();
    heading(t.technical);
    if (!s.findings.length) paragraph(t.none);
    for (const [i, f] of s.findings.entries()) {
      if (doc.y > 450) page();
      heading(`${i + 1}. ${f.observation.title}`);
      row([f.id, f.status]);
      const asset = s.assets.find((a) => a.id === f.assetId);
      paragraph(asset ? `${asset.label} · ${asset.target}` : f.assetId);
      row([
        `${t.severity}: ${f.observation.severity}`,
        `${t.priority}: ${f.priority.score}`,
        `${t.confidence}: ${f.observation.confidence}`,
      ]);
      paragraph(`${t.source}: ${f.sources.map((v) => `${v.engine} ${v.version}`).join('; ')}`);
      paragraph(
        `${f.observation.location}\n${f.observation.component} ${f.observation.affectedVersion}\n${f.observation.cve ?? ''}${f.observation.cvss === null ? '' : ` · CVSS ${f.observation.cvss}`}`,
      );
      paragraph(`${t.evidence}\n${f.observation.evidence}`);
      paragraph(`${t.impact}\n${f.businessImpact}`);
      paragraph(`${t.priority}: ${f.priority.factors.join('; ')}`);
      paragraph(`${t.fix}\n${f.recommendation}`);
      if (f.observation.references.length)
        paragraph(`${t.refs}\n${f.observation.references.join('\n')}`);
    }
    heading(t.recommendations);
    for (const f of s.findings) paragraph(`${f.observation.title}\n${f.recommendation}`);
    if (!s.findings.length) paragraph(t.none);
    page();
    heading(t.remediation);
    if (!s.tasks.length) paragraph(t.none);
    for (const task of s.tasks)
      paragraph(
        `${task.findingId}\n${t.owner}: ${task.assignee} · ${t.deadline}: ${task.dueAt.slice(0, 10)}\n${task.description}\n${task.status}`,
      );
    heading(t.retests);
    if (!s.retests.length) paragraph(t.none);
    for (const r of s.retests)
      paragraph(`${r.findingId} · ${r.conclusion}\n${r.createdAt} · ${r.auditId}\n${r.note}`);
    heading(t.annex);
    paragraph(t.noSecrets);
    for (const scan of s.scans)
      paragraph(
        `${scan.engine} · ${scan.id}\n${scan.sourceSha256 ?? 'not applicable'}\n${scan.coverageHash ?? 'unknown'}`,
      );
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc
        .font('BumpBody')
        .fontSize(7)
        .fillColor('#627087')
        .text(`${t.confidential}     ${i + 1} / ${range.count}`, 52, 806, {
          lineBreak: false,
          width: 490,
        });
    }
    doc.end();
  });
}
