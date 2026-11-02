const RECIPIENT = "digital@wasabiindia.com";
const MAX_BODY_BYTES = 12_000;

function respond(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function readSubmission(body) {
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  const fields = {
    name: body.name,
    email: body.email,
    company: body.company || "",
    brief: body.brief,
    website: body.website || "",
  };

  if (Object.values(fields).some((value) => typeof value !== "string")) {
    return null;
  }

  return {
    name: fields.name.trim(),
    email: fields.email.trim(),
    company: fields.company.trim(),
    brief: fields.brief.trim(),
    website: fields.website.trim(),
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return respond(res, 405, { error: "Method not allowed." });
  }

  if (!req.headers["content-type"]?.includes("application/json")) {
    return respond(res, 415, { error: "Send the form as JSON." });
  }

  const contentLength = Number(req.headers["content-length"] || 0);
  const parsedBodySize = Buffer.byteLength(
    typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? ""),
  );
  if (Math.max(contentLength, parsedBodySize) > MAX_BODY_BYTES) {
    return respond(res, 413, { error: "The form submission is too large." });
  }

  const submission = readSubmission(req.body);
  if (!submission) {
    return respond(res, 400, { error: "Please check the form and try again." });
  }

  if (submission.website) {
    return respond(res, 200, { ok: true });
  }

  if (
    !submission.name ||
    submission.name.length > 120 ||
    !submission.email ||
    submission.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.email) ||
    submission.company.length > 160 ||
    !submission.brief ||
    submission.brief.length > 4000
  ) {
    return respond(res, 400, {
      error: "Please enter a valid name, email, and brief.",
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.error("Contact email is not configured: set RESEND_API_KEY and RESEND_FROM_EMAIL.");
    return respond(res, 503, {
      error: "Email service is not configured yet. Please try again later.",
    });
  }

  const text = [
    "New Wasabi website inquiry",
    "",
    `Name: ${submission.name}`,
    `Work email: ${submission.email}`,
    `Company: ${submission.company || "Not provided"}`,
    "",
    "Brief:",
    submission.brief,
  ].join("\n");

  const html = [
    "<h1>New Wasabi website inquiry</h1>",
    `<p><strong>Name:</strong> ${escapeHtml(submission.name)}</p>`,
    `<p><strong>Work email:</strong> ${escapeHtml(submission.email)}</p>`,
    `<p><strong>Company:</strong> ${escapeHtml(submission.company || "Not provided")}</p>`,
    `<p><strong>Brief:</strong></p><p>${escapeHtml(submission.brief).replace(/\n/g, "<br>")}</p>`,
  ].join("");

  let emailResponse;
  try {
    emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [RECIPIENT],
        reply_to: submission.email,
        subject: "New Wasabi website inquiry",
        text,
        html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("Contact email provider request failed.", error);
    return respond(res, 502, {
      error: "Email delivery failed. Please try again or email us directly.",
    });
  }

  if (!emailResponse.ok) {
    console.error("Contact email provider rejected the request.", emailResponse.status);
    return respond(res, 502, {
      error: "Email delivery failed. Please try again or email us directly.",
    });
  }

  return respond(res, 200, { ok: true });
};
