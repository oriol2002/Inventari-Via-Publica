const express = require('express');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 8080;

// Configuració de Supabase (S'ha de configurar al dashboard de Cloud Run)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(bodyParser.json({ limit: '50mb' }));

app.post('/generate-report', async (req, res) => {
  const { reportId, data, summary } = req.body;

  if (!data || !summary) {
    return res.status(400).json({ error: 'Falten dades per generar l\'informe' });
  }

  let browser;
  try {
    // Llançar navegador amb configuració per a contenidors
    browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    });
    
    const page = await browser.newPage();

    // Contingut HTML de l'informe (Disseny professional Tortosa)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #1e293b; background: white; margin: 0; }
          .header { border-bottom: 5px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
          .brand { font-size: 24px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -1px; }
          .brand span { color: #2563eb; }
          .report-info { text-align: right; font-size: 10px; color: #64748b; font-weight: bold; }
          .stats-grid { display: flex; gap: 15px; margin-bottom: 40px; }
          .stat-box { background: #f8fafc; padding: 20px; border-radius: 16px; flex: 1; text-align: center; border: 1px solid #e2e8f0; }
          .stat-label { font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 5px; display: block; }
          .stat-value { font-size: 24px; font-weight: 900; color: #1e293b; }
          .item-card { display: flex; gap: 20px; padding: 20px; border: 1px solid #f1f5f9; border-radius: 20px; margin-bottom: 20px; page-break-inside: avoid; background: #fff; }
          .item-img { width: 140px; height: 140px; object-fit: cover; border-radius: 12px; border: 1px solid #e2e8f0; }
          .item-details { flex: 1; }
          .item-title { font-size: 16px; font-weight: 900; margin-bottom: 5px; text-transform: uppercase; color: #0f172a; }
          .item-meta { font-size: 10px; color: #3b82f6; font-weight: 800; text-transform: uppercase; margin-bottom: 15px; }
          .badge { display: inline-block; padding: 5px 12px; border-radius: 8px; font-size: 10px; font-weight: 900; text-transform: uppercase; border: 1px solid #cbd5e1; }
          .footer { margin-top: 50px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">MOBILITAT<span>TORTOSA</span></div>
            <div style="font-size: 10px; font-weight: bold; color: #64748b; margin-top: 4px;">AUDITORIA I INVENTARI VIAL</div>
          </div>
          <div class="report-info">
             <div>EXPEDIENT: #${reportId}</div>
             <div>DATA GENERACIÓ: ${new Date().toLocaleDateString('ca-ES')}</div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-box">
            <span class="stat-label">Elements Analitzats</span>
            <span class="stat-value">${summary.total}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Intervencions Urgents</span>
            <span class="stat-value" style="color: #e11d48;">${summary.critical}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Índex de Conservació</span>
            <span class="stat-value" style="color: #059669;">${summary.safetyIndex}%</span>
          </div>
        </div>

        ${data.map(item => `
          <div class="item-card">
            <img src="${item.image}" class="item-img" />
            <div class="item-details">
              <div class="item-title">${item.location.street} ${item.location.number || ''}</div>
              <div class="item-meta">${item.location.neighborhood || 'Tortosa'} • ${item.assetType}</div>
              <div style="display: flex; gap: 10px; align-items: center; margin-top: 10px;">
                <span class="badge" style="background: #eff6ff; color: #2563eb; border-color: #bfdbfe;">${item.state}</span>
                <span style="font-size: 10px; font-weight: 700; color: #64748b;">
                  Última actuació: ${item.monthsSincePainted} mesos enrere (${item.lastPaintedDate})
                </span>
              </div>
              <div style="margin-top: 15px; font-size: 10px; color: #475569; font-style: italic;">
                ${item.notes ? `<strong>Notes:</strong> ${item.notes}` : ''}
              </div>
            </div>
          </div>
        `).join('')}

        <div class="footer">
          Document oficial de l'Àrea de Mobilitat i Seguretat Ciutadana • Ajuntament de Tortosa
        </div>
      </body>
      </html>
    `;

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '30px', bottom: '30px', left: '20px', right: '20px' }
    });

    await browser.close();

    // Pujada a Supabase Storage (Bucket 'reports')
    const fileName = `informe_mobilitat_${reportId}_${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('reports')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Obtenir la URL pública del PDF
    const { data: { publicUrl } } = supabase.storage
      .from('reports')
      .getPublicUrl(fileName);

    res.json({ url: publicUrl });

  } catch (err) {
    if (browser) await browser.close();
    console.error("PDF Error:", err);
    res.status(500).json({ error: "No s'ha pogut generar el PDF: " + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend pdf-service escoltant al port ${PORT}`);
});