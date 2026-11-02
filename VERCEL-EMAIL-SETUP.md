# Vercel contact form email setup

The contact form sends submissions through the Resend API from a Vercel
Function. Messages are delivered to `digital@wasabiindia.com`; the submitter's
address is set as the reply-to address.

## Configure email delivery

1. Create a Resend account and add/verify a domain you control in Resend.
2. Create a Resend API key with permission to send email.
3. In the Vercel project, open **Settings → Environment Variables** and add:
   - `RESEND_API_KEY`: the API key from Resend.
   - `RESEND_FROM_EMAIL`: a sender on the verified domain, such as
     `Wasabi Website <website@your-verified-domain.com>`.
4. Add the variables to the Production environment (and Preview/Development if
   those environments should also send email), then redeploy.

Keep the API key only in Vercel's encrypted environment variables or a local
`.env.local` file. Never commit the real key. `.env.example` contains placeholders.

## Deploy

Deploy this project to Vercel with the project root set to this directory.
Vercel automatically serves `api/contact.js` as `/api/contact`; no extra routing
configuration or email package is needed.
