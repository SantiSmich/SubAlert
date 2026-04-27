export default async function handler(req, res) {
  try {
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
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams,
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return res.status(400).json(tokenData);
    }

    const accessToken = tokenData.access_token;

    const query = encodeURIComponent(
      '("subscription" OR "suscripción" OR "receipt" OR "invoice" OR "payment" OR "factura" OR "billing" OR "charge" OR "cargo")'
    );

    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=30`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const listData = await listResponse.json();
    const messages = listData.messages || [];
    const results = [];

    const mustInclude = [
      "subscription",
      "suscripción",
      "receipt",
      "invoice",
      "payment",
      "factura",
      "billing",
      "charge",
      "cargo"
    ];

    const mustExclude = [
      "wise",
      "glovo",
      "remitly",
      "pedido",
      "order",
      "transfer",
      "envío",
      "shipment",
      "reembolso",
      "refund",
      "oferta",
      "descuento",
      "promo",
      "sale",
      "delivery"
    ];

    const likelySubscriptionBrands = [
      "spotify",
      "netflix",
      "google",
      "apple",
      "adobe",
      "canva",
      "moises",
      "amazon prime",
      "youtube",
      "chatgpt",
      "openai"
    ];

    for (const msg of messages) {
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const msgData = await msgResponse.json();
      const headers = msgData.payload?.headers || [];

      const subject =
        headers.find((h) => h.name.toLowerCase() === "subject")?.value ||
        "Sin asunto";

      const from =
        headers.find((h) => h.name.toLowerCase() === "from")?.value ||
        "Sin remitente";

      const date =
        headers.find((h) => h.name.toLowerCase() === "date")?.value ||
        "Sin fecha";

      const text = `${subject} ${from}`.toLowerCase();

      const isPaid =
        mustInclude.some((word) => text.includes(word)) &&
        !mustExclude.some((word) => text.includes(word));

      const looksLikeSubscription =
        likelySubscriptionBrands.some((b) => text.includes(b)) ||
        text.includes("monthly") ||
        text.includes("mensual") ||
        text.includes("renew") ||
        text.includes("renovación");

      if (isPaid && looksLikeSubscription) {
        results.push({ subject, from, date });
      }
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
            h1 { font-size: 42px; }
            h2 { font-size: 28px; margin-bottom: 20px; }
            .card {
              background: #211936;
              padding: 16px;
              border-radius: 16px;
              margin-bottom: 12px;
              border: 1px solid rgba(255,255,255,.12);
            }
            a { color: #b388ff; }
          </style>
        </head>
        <body>
          <h1>SubAlert</h1>
          <h2>Posibles suscripciones pagas encontradas</h2>

          ${
            results.length
              ? results.map(r => `
                <div class="card">
                  <h3>${r.subject}</h3>
                  <p><strong>De:</strong> ${r.from}</p>
                  <p><strong>Fecha:</strong> ${r.date}</p>
                </div>
              `).join("")
              : `<p>No encontré suscripciones claras.</p>`
          }

          <br />
          <a href="/">Volver a SubAlert</a>
        </body>
      </html>
    `;

    return res.send(html);

  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({ error: "Internal crash", details: err.message });
  }
}
