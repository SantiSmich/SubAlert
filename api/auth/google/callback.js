export default async function handler(req, res) {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("No code");
  }

  const tokenParams = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: "https://subalert-seven.vercel.app/api/auth/google/callback",
    grant_type: "authorization_code",
  });

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: tokenParams,
  });

  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    return res.status(400).json(tokenData);
  }

  const accessToken = tokenData.access_token;

  const query = encodeURIComponent(
  '("receipt" OR "invoice" OR "payment" OR "paid" OR "charged" OR "subscription" OR "renewal" OR "recibo" OR "factura" OR "pago" OR "cobro" OR "suscripción" OR "renovación") ("€" OR "EUR" OR "$" OR "USD" OR "total" OR "amount" OR "importe")'
);
  const listResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=10`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const listData = await listResponse.json();

  if (!listData.messages || listData.messages.length === 0) {
    return res.send(`
      <h1>SubAlert</h1>
      <p>No encontré posibles suscripciones en Gmail.</p>
      <a href="/">Volver</a>
    `);
  }

  const results = [];

  for (const msg of listData.messages) {
    const msgResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const msgData = await msgResponse.json();
    const headers = msgData.payload?.headers || [];

    const subject = headers.find(h => h.name === "Subject")?.value || "Sin asunto";
    const from = headers.find(h => h.name === "From")?.value || "Sin remitente";
    const date = headers.find(h => h.name === "Date")?.value || "Sin fecha";

    results.push({ subject, from, date });
  }

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #120b24;
            color: white;
            padding: 24px;
          }
          .card {
            background: #211936;
            padding: 16px;
            border-radius: 16px;
            margin-bottom: 12px;
            border: 1px solid rgba(255,255,255,.12);
          }
          a {
            color: #b388ff;
          }
        </style>
      </head>
      <body>
        <h1>SubAlert</h1>
       <h2>Posibles suscripciones pagas encontradas</h2>
        ${results.map(r => `
          <div class="card">
            <h3>${r.subject}</h3>
            <p><strong>De:</strong> ${r.from}</p>
            <p><strong>Fecha:</strong> ${r.date}</p>
          </div>
        `).join("")}
        <br />
        <a href="/">Volver a SubAlert</a>
      </body>
    </html>
  `;

  return res.send(html);
}
