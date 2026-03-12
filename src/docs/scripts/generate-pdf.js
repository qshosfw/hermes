import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generatePDF() {
  console.log("Launching headless browser for RFC Specification...");
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Point to the local dev server
  const url = 'http://localhost:5173/print';

  console.log(`Navigating to ${url}...`);

  try {
    // Wait for the aggregation of 28+ MDX modules
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });

    console.log("Waiting for RFC Aggregation and Mermaid rendering...");
    await page.waitForSelector('.print-section', { timeout: 60000 });

    // Ensure the serif fonts from Google Fonts have landed
    await new Promise(r => setTimeout(r, 6000));

    // Force Light Mode for consistent institutional look
    await page.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: 'light' },
    ]);

    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');

      const style = document.createElement('style');
      style.innerHTML = `
        * {
          overflow: visible !important;
          -webkit-print-color-adjust: exact !important;
        }
        pre, code {
          background-color: #fafafa !important;
          white-space: pre-wrap !important;
          word-break: break-all !important;
        }
      `;
      document.head.appendChild(style);
    });

    const outputPath = path.resolve(__dirname, '../public/hermes-protocol-spec.pdf');
    console.log(`Generating High-Fidelity RFC PDF to ${outputPath}...`);

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; font-size: 9pt; font-family: 'Crimson Pro', serif; text-align: right; color: #444; padding-right: 1.5cm; padding-bottom: 0.5cm;">
          [RFC-0001] — Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `,
      margin: {
        top: '1.5cm',
        bottom: '2cm',
        left: '0cm',
        right: '0cm'
      }
    });

    console.log("Success! Formal RFC Specification generated at: " + outputPath);
  } catch (err) {
    console.error("Error generating RFC PDF:", err);
  } finally {
    await browser.close();
  }
}

generatePDF();
