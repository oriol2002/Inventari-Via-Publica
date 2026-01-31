import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let browser: puppeteer.Browser | null = null;
  try {
    const chromiumRoot = path.resolve('node_modules/@sparticuz/chromium');
    const nodeLibPath = path.join(chromiumRoot, 'lib');
    const nodeFontPath = path.join(chromiumRoot, 'fonts');

    const tmpLibPath = path.join('/tmp', 'chromium', 'lib');
    const tmpFontPath = path.join('/tmp', 'chromium', 'fonts');

    const libCandidates = [tmpLibPath, nodeLibPath].filter((p) => fs.existsSync(p));
    if (libCandidates.length > 0) {
      const libs = libCandidates.join(':');
      process.env.LD_LIBRARY_PATH = process.env.LD_LIBRARY_PATH
        ? `${process.env.LD_LIBRARY_PATH}:${libs}`
        : libs;
    }

    if (!process.env.FONTCONFIG_PATH) {
      if (fs.existsSync(tmpFontPath)) process.env.FONTCONFIG_PATH = tmpFontPath;
      else if (fs.existsSync(nodeFontPath)) process.env.FONTCONFIG_PATH = nodeFontPath;
    }

    const { html } = req.body || {};
    if (!html || typeof html !== 'string') {
      res.status(400).json({ error: 'Missing html' });
      return;
    }

    const executablePath = await chromium.executablePath();
    browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    await page.emulateMediaType('screen');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(pdfBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to render PDF';
    console.error('Render PDF error:', error);
    res.status(500).json({ error: message });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore
      }
    }
  }
}
