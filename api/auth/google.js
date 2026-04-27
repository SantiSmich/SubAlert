export default async function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = "https://subalert-seven.vercel.app/api/auth/google/callback";

  const scope = encodeURIComponent(
    "https://www.googleapis.com/auth/gmail.readonly"
  );

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

  res.redirect(authUrl);
}
