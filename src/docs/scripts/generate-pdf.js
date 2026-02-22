import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generatePDF() {
  console.log("Launching headless browser...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Point to the local dev server
  const url = 'http://localhost:5173/print'; // Vite default port (using 5173)


  console.log(`Navigating to ${url}...`);

  try {
    // Wait until network is idle to ensure all React suspense and MDX is loaded
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    // Additional wait for the custom React logic to finish removing the loading screen
    console.log("Waiting for rendering completion...");
    await page.waitForSelector('.print-section', { timeout: 30000 });

    // Wait for our artificial loading screen timeout 
    await new Promise(r => setTimeout(r, 4000));

    // Force Light Mode via Media Query so Tailwind `dark:` classes don't bleed into PDF
    await page.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: 'light' },
    ]);

    // Force remove dark class and inline styles that clip PDFs
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');

      const style = document.createElement('style');
      style.innerHTML = `
        * {
          overflow: visible !important;
        }
        pre, code {
          white-space: pre-wrap !important;
          word-break: break-word !important;
        }
      `;
      document.head.appendChild(style);
    });

    const outputPath = path.resolve(__dirname, '../public/hermes-protocol-spec.pdf');
    console.log(`Generating A4 PDF to ${outputPath}...`);

    // Override page margin to give LaTeX feel via puppeteer settings
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; font-size: 10px; font-family: serif; text-align: center; color: black; padding-bottom: 20px;">
          <span class="pageNumber"></span>
        </div>
      `,
      margin: {
        top: '2cm',
        bottom: '2cm',
        left: '2cm',
        right: '2cm'
      }
    });

    console.log("Success! PDF generated at: " + outputPath);
  } catch (err) {
    console.error("Error generating PDF:", err);
  } finally {
    await browser.close();
  }
}

generatePDF();
