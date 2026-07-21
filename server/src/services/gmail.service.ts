import { google } from "googleapis";
import { prisma } from "../lib/prisma.js";
import { encrypt, decrypt } from "../lib/crypto.js";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
}

// ----- Classification rules -----

interface ClassificationRule {
  patterns: RegExp[];
  status: string;
  confidence: string;
}

const RULES: ClassificationRule[] = [
  {
    patterns: [
      /pleased to (extend|offer)/i,
      /offer letter/i,
      /compensation package/i,
      /we('d| would) like to offer/i,
    ],
    status: "OFFER",
    confidence: "HIGH",
  },
  {
    patterns: [
      /schedule.*(interview|call|meeting)/i,
      /interview invitation/i,
      /meet the team/i,
      /like to invite you/i,
      /next (round|step|stage)/i,
    ],
    status: "INTERVIEW",
    confidence: "HIGH",
  },
  {
    patterns: [
      /phone screen/i,
      /initial screen/i,
      /recruiter (call|chat)/i,
      /screening/i,
      /quick chat/i,
    ],
    status: "SCREENING",
    confidence: "MEDIUM",
  },
  {
    patterns: [
      /moved forward with other/i,
      /not moving forward/i,
      /unfortunately/i,
      /decided (to )?(not )?(proceed|continue|move)/i,
      /position has been filled/i,
      /other candidates/i,
      /we will not be/i,
      /regret to inform/i,
    ],
    status: "REJECTED",
    confidence: "HIGH",
  },
  {
    patterns: [
      /thank(s| you) for (applying|your (application|interest))/i,
      /application (received|confirmed)/i,
      /we (received|got) your/i,
    ],
    status: "APPLIED",
    confidence: "LOW",
  },
];

export function classifyEmail(subject: string, body: string): { status: string; confidence: string } | null {
  const text = `${subject} ${body}`;
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        return { status: rule.status, confidence: rule.confidence };
      }
    }
  }
  return null;
}

export function matchEmailToApplication(
  fromEmail: string,
  subject: string,
  body: string,
  applications: { id: string; companyName: string }[]
): string | null {
  const text = `${fromEmail} ${subject} ${body}`.toLowerCase();
  for (const app of applications) {
    const companyLower = app.companyName.toLowerCase();
    // Match by company name in email text
    if (text.includes(companyLower)) {
      return app.id;
    }
    // Match by email domain (e.g. @google.com for "Google")
    const domainMatch = fromEmail.match(/@([^>]+)/);
    if (domainMatch) {
      const domain = domainMatch[1].toLowerCase();
      const domainParts = domain.split(".");
      if (domainParts.some((part) => companyLower.includes(part) || part.includes(companyLower))) {
        return app.id;
      }
    }
  }
  return null;
}

// ----- OAuth helpers -----

export function getAuthUrl(userId: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: userId, // pass userId through OAuth state
  });
}

export async function handleCallback(code: string, userId: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Failed to obtain tokens from Google");
  }

  const expiresAt = new Date(tokens.expiry_date || Date.now() + 3600 * 1000);

  await prisma.gmailConnection.upsert({
    where: { userId },
    update: {
      encryptedAccessToken: encrypt(tokens.access_token),
      encryptedRefreshToken: encrypt(tokens.refresh_token),
      tokenExpiresAt: expiresAt,
    },
    create: {
      userId,
      encryptedAccessToken: encrypt(tokens.access_token),
      encryptedRefreshToken: encrypt(tokens.refresh_token),
      tokenExpiresAt: expiresAt,
    },
  });
}

async function getAuthenticatedClient(userId: string) {
  const conn = await prisma.gmailConnection.findUnique({ where: { userId } });
  if (!conn) throw new Error("Gmail not connected");

  const client = getOAuth2Client();
  const accessToken = decrypt(conn.encryptedAccessToken);
  const refreshToken = decrypt(conn.encryptedRefreshToken);

  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: conn.tokenExpiresAt.getTime(),
  });

  // Auto-refresh if expired
  if (conn.tokenExpiresAt.getTime() < Date.now()) {
    const { credentials } = await client.refreshAccessToken();
    if (credentials.access_token) {
      await prisma.gmailConnection.update({
        where: { userId },
        data: {
          encryptedAccessToken: encrypt(credentials.access_token),
          tokenExpiresAt: new Date(credentials.expiry_date || Date.now() + 3600 * 1000),
        },
      });
    }
  }

  return client;
}

// ----- Email fetching -----

export async function fetchAndProcessEmails(userId: string) {
  const client = await getAuthenticatedClient(userId);
  const gmail = google.gmail({ version: "v1", auth: client });

  // Get last sync time or 30 days ago
  const conn = await prisma.gmailConnection.findUnique({ where: { userId } });
  const since = conn?.lastSyncAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sinceStr = Math.floor(since.getTime() / 1000);

  // Fetch message list
  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: `after:${sinceStr} category:primary`,
    maxResults: 50,
  });

  const messages = listRes.data.messages || [];
  const applications = await prisma.application.findMany({
    where: { userId },
    select: { id: true, companyName: true },
  });

  const suggestions: any[] = [];

  for (const msg of messages) {
    // Skip if already processed
    const existing = await prisma.emailSuggestion.findUnique({
      where: { gmailMessageId: msg.id! },
    });
    if (existing) continue;

    // Fetch full message
    const fullMsg = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "full",
    });

    const headers = fullMsg.data.payload?.headers || [];
    const subject = headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "";
    const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";
    const dateStr = headers.find((h) => h.name?.toLowerCase() === "date")?.value || "";
    const snippet = fullMsg.data.snippet || "";

    // Get body text
    let body = snippet;
    const parts = fullMsg.data.payload?.parts || [];
    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        body = Buffer.from(part.body.data, "base64").toString("utf-8");
        break;
      }
    }

    // Classify
    const classification = classifyEmail(subject, body);
    if (!classification) continue;

    // Match to application
    const applicationId = matchEmailToApplication(from, subject, body, applications);

    const suggestion = await prisma.emailSuggestion.create({
      data: {
        userId,
        applicationId,
        emailSubject: subject.slice(0, 500),
        emailFrom: from.slice(0, 200),
        emailDate: dateStr ? new Date(dateStr) : new Date(),
        suggestedStatus: classification.status,
        confidence: classification.confidence,
        snippet: snippet.slice(0, 500),
        gmailMessageId: msg.id!,
      },
      include: { application: { select: { id: true, companyName: true, jobTitle: true } } },
    });

    suggestions.push(suggestion);
  }

  // Update last sync
  await prisma.gmailConnection.update({
    where: { userId },
    data: { lastSyncAt: new Date() },
  });

  return suggestions;
}
