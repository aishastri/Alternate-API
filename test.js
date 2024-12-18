const Imap = require("imap");
const fs = require("fs");
const path = require("path");
const { simpleParser } = require("mailparser");
const { promisify } = require("util");
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);

const imapConfig = {
  user: "vemulasrinu104@gmail.com",
  password: "fyrgticdgpvjrfyy",
  host: "imap.gmail.com",
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
};

const SYNC_STATE_FILE = "last_sync.json";
const ALLOWED_MIME_TYPES = [
  "application/pdf", // PDFs
  "image/jpeg",
  "image/png",
  "image/gif", // Common image formats
  "image/webp",
  "image/tiff",
  "image/bmp", // Additional image formats
];

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log(`Created uploads directory at: ${uploadDir}`);
}

async function getLastSyncDate() {
  try {
    if (fs.existsSync(SYNC_STATE_FILE)) {
      const data = await readFileAsync(SYNC_STATE_FILE, "utf8");
      const { lastSync } = JSON.parse(data);
      return new Date(lastSync);
    }
  } catch (error) {
    console.warn("Error reading last sync date:", error);
  }
  // Default to 30 days ago if no sync state exists
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date;
}

async function updateLastSyncDate() {
  await writeFileAsync(
    SYNC_STATE_FILE,
    JSON.stringify({
      lastSync: new Date().toISOString(),
    })
  );
}

function getSafeFilename(filename, seqno) {
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${seqno}-${sanitized}`;
}

function isAllowedFileType(contentType) {
  return ALLOWED_MIME_TYPES.includes(contentType.toLowerCase());
}

async function processAttachment(attachment, seqno) {
  try {
    if (!isAllowedFileType(attachment.contentType)) {
      console.log(`Skipping non-PDF/image attachment: ${attachment.filename}`);
      return null;
    }

    const filename = getSafeFilename(attachment.filename, seqno);
    const filepath = path.join(uploadDir, filename);

    console.log(
      `Processing ${attachment.contentType} attachment: ${attachment.filename}`
    );
    console.log(`Size: ${attachment.size} bytes`);

    if (attachment.content) {
      await writeFileAsync(filepath, attachment.content);
      console.log(`✓ Saved attachment to: ${filepath}`);

      return {
        originalFilename: attachment.filename,
        savedFilename: filename,
        path: filepath,
        size: attachment.size,
        contentType: attachment.contentType,
      };
    }
    return null;
  } catch (error) {
    console.error(`Error saving attachment ${attachment.filename}:`, error);
    return null;
  }
}

async function fetchEmails() {
  try {
    console.log("Initializing IMAP connection...");
    const imap = new Imap(imapConfig);

    const emails = [];
    let totalAttachments = 0;
    let savedAttachments = 0;
    let processedEmails = 0;

    const lastSyncDate = new Date("2024-12-09T08:21:39.874+00:00");
    console.log(`Fetching emails since: ${lastSyncDate.toISOString()}`);

    await new Promise((resolve, reject) => {
      imap.once("ready", () => {
        console.log("✓ IMAP Connection established successfully!");

        imap.openBox("INBOX", false, async (err, box) => {
          if (err) {
            console.error("Error opening INBOX:", err);
            return reject(err);
          }

          const totalEmails = box.messages.total;
          console.log(
            `✓ INBOX opened successfully (${totalEmails} total messages)`
          );

          const searchCriteria = ["ALL", ["SINCE", lastSyncDate]];

          imap.search(searchCriteria, (err, results) => {
            if (err) return reject(err);
            console.log(`Found ${results.length} emails to process`);

            const messagePromises = [];
            const f = imap.fetch(results, { bodies: "", struct: true });

            f.on("message", (msg, seqno) => {
              const messagePromise = new Promise((resolveMessage) => {
                console.log(`\nProcessing email ${seqno}...`);

                msg.on("body", async (stream) => {
                  try {
                    const parsed = await simpleParser(stream);

                    const email = {
                      id: seqno,
                      from: parsed.from?.text,
                      to: parsed.to?.text,
                      subject: parsed.subject,
                      date: parsed.date,
                      attachments: [],
                    };

                    if (parsed.attachments?.length > 0) {
                      const relevantAttachments = parsed.attachments.filter(
                        (att) => isAllowedFileType(att.contentType)
                      );

                      if (relevantAttachments.length > 0) {
                        console.log(
                          `Found ${relevantAttachments.length} PDF/image attachments in email ${seqno}`
                        );
                        totalAttachments += relevantAttachments.length;

                        for (const attachment of relevantAttachments) {
                          const savedAttachment = await processAttachment(
                            attachment,
                            seqno
                          );
                          if (savedAttachment) {
                            email.attachments.push(savedAttachment);
                            savedAttachments++;
                          }
                        }
                      }
                    }

                    if (email.attachments.length > 0) {
                      emails.push(email);
                    }
                    processedEmails++;
                    console.log(
                      `✓ Processed email ${seqno} (${processedEmails}/${results.length})`
                    );
                    resolveMessage();
                  } catch (error) {
                    console.error(`Error processing email ${seqno}:`, error);
                    resolveMessage();
                  }
                });
              });

              messagePromises.push(messagePromise);
            });

            f.once("error", (err) => {
              console.error("Fetch error:", err);
              reject(err);
            });

            f.once("end", async () => {
              try {
                await Promise.all(messagePromises);
                console.log("\nAll emails processed, closing connection...");
                imap.end();
                resolve();
              } catch (error) {
                reject(error);
              }
            });
          });
        });
      });

      imap.once("error", (err) => {
        console.error("IMAP connection error:", err);
        reject(err);
      });

      imap.once("end", () => {
        console.log("IMAP connection ended");
      });

      console.log("Connecting to IMAP server...");
      imap.connect();
    });

    // Sort emails by date
    emails.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Save to JSON file
    const jsonOutput = JSON.stringify(emails, null, 2);
    await writeFileAsync("emails.json", jsonOutput);

    // Update last sync date
    await updateLastSyncDate();

    console.log("\n=== Final Summary ===");
    console.log(`Emails processed: ${processedEmails}`);
    console.log(`Emails with PDF/image attachments: ${emails.length}`);
    console.log(`Total PDF/image attachments found: ${totalAttachments}`);
    console.log(`Successfully saved attachments: ${savedAttachments}`);
    console.log(`Attachments saved to: ${uploadDir}`);
    console.log(`Email data saved to: ${path.join(__dirname, "emails.json")}`);
    console.log(`Last sync date updated to: ${new Date().toISOString()}`);

    return emails;
  } catch (error) {
    console.error("Error in email fetching process:", error);
    throw error;
  }
}

// Execute the function
console.log("Starting email fetch process...");
fetchEmails().catch(console.error);
