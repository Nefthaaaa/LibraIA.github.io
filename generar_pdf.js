const fs = require('fs');

const pdfContent = `%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Contents 4 0 R
  /Resources <<
    /Font <<
      /F1 5 0 R
    >>
  >>
>>
endobj
4 0 obj
<<
  /Length 284
>>
stream
BT
/F1 18 Tf
50 720 Td
(LibraIA - Documento de Prueba) Tj
/F1 12 Tf
0 -35 Td
(Bienvenido a LibraIA. Esta aplicacion permite leer documentos PDF.) Tj
0 -25 Td
(Cuenta con integracion directa con OpenAI para resumir y responder.) Tj
0 -25 Td
(Tambien incluye persistencia en backend con Supabase.) Tj
0 -25 Td
(Estadisticas de prueba: 100% minimalista, rapido y seguro.) Tj
ET
endstream
endobj
5 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica
>>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000262 00000 n 
0000000598 00000 n 
trailer
<<
  /Size 6
  /Root 1 0 R
>>
startxref
669
%%EOF
`;

fs.writeFileSync('documento_prueba.pdf', pdfContent);
console.log('Documento PDF de prueba generado: documento_prueba.pdf');
