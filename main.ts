import { PDFDocument } from 'https://cdn.skypack.dev/pdf-lib@^1.11.1?dts';


// Deno.serve - это встроенный, высокопроизводительный HTTP-сервер в Deno.
// Идеально подходит для Deno Deploy.
Deno.serve(async (request: Request) => {
  // 1. Проверяем, что это POST-запрос
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 2. Получаем массив URL из тела запроса
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length < 2) {
      return new Response(JSON.stringify({ message: 'Please provide an array of at least two PDF URLs.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Создаем новый пустой PDF-документ
    const mergedPdf = await PDFDocument.create();

    // 4. Скачиваем и обрабатываем каждый PDF параллельно
    const downloadPromises = urls.map((url: string) => 
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
          }
          return response.arrayBuffer(); // Получаем содержимое как ArrayBuffer
        })
    );
    
    const pdfBuffers = await Promise.all(downloadPromises);

    for (const pdfBuffer of pdfBuffers) {
      const pdf = await PDFDocument.load(pdfBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
    }
    
    // 5. Сохраняем объединенный PDF в виде массива байтов (Uint8Array)
    const mergedPdfBytes = await mergedPdf.save();

    // 6. Возвращаем PDF-файл напрямую в ответе.
    return new Response(mergedPdfBytes, {
      status: 200,
      headers: { 
        'Content-Type': 'application/pdf',
        // Этот заголовок подсказывает браузеру, что файл нужно скачать
        'Content-Disposition': 'attachment; filename="merged-document.pdf"',
      },
    });

  } catch (error) {
    console.error("Error merging PDFs:", error);
    return new Response(JSON.stringify({ message: 'An error occurred during the process.', error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
