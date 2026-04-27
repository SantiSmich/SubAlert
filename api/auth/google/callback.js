export default async function handler(req, res) {
  const code = req.query.code;

  if (!code) {
    return res.redirect("/?google=error");
  }

  const params = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: "https://subalert-seven.vercel.app/api/auth/google/callback",
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await response.json();

  if (!data.access_token) {
    return res.status(400).json(data);
  }

  return res.redirect("/?google=connected");
}
