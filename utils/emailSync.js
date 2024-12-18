const Imap = require("imap");
const { simpleParser } = require("mailparser");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const User = require("../models/UserSchema"); // Adjust path as needed
const uploadDocument = require("./uploadDocument"); // Adjust path as needed
const Cryptr = require("cryptr");
const cryptr = new Cryptr("process.env.EMAIL_PASSWORD_ENCRYPT");

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);
const rmdirAsync = promisify(fs.rmdir);

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/tiff",
  "image/bmp",
];

const processUserEmails = async (user) => {
  console.log(user);
  const userUploadDir = path.join(__dirname, "../uploads", user._id.toString());

  try {
    // Create user-specific upload directory
    if (!fs.existsSync(userUploadDir)) {
      await mkdirAsync(userUploadDir, { recursive: true });
    }

    const imapConfig = {
      user: user.emailConfigurations.email,
      password: cryptr.decrypt(user.emailConfigurations.password),
      host: user.emailConfigurations.host,
      port: user.emailConfigurations.port,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    };

    const imap = new Imap(imapConfig);
    const lastSyncDate = user.emailConfigurations.lastSyncedAt
      ? new Date(user.emailConfigurations.lastSyncedAt)
      : new Date();

    let processedAttachments = 0;

    // await new Promise((resolve, reject) => {
    //   imap.once("ready", () => {
    //     imap.openBox("INBOX", false, (err, box) => {
    //       if (err) {
    //         reject(err);
    //         return;
    //       }

    //       const searchCriteria = ["ALL", ["SINCE", formattedLastSyncDate]];

    //       imap.search(searchCriteria, async (err, results) => {
    //         if (err) {
    //           reject(err);
    //           return;
    //         }

    //         if (!results.length) {
    //           resolve();
    //           return;
    //         }

    //         const fetch = imap.fetch(results, { bodies: "", struct: true });
    //         const messagePromises = [];

    //         fetch.on("message", (msg) => {
    //           const messagePromise = new Promise((resolveMessage) => {
    //             msg.on("body", async (stream) => {
    //               try {
    //                 const parsed = await simpleParser(stream);

    //                 if (parsed.attachments?.length) {
    //                   for (const attachment of parsed.attachments) {
    //                     if (
    //                       ALLOWED_MIME_TYPES.includes(
    //                         attachment.contentType.toLowerCase()
    //                       )
    //                     ) {
    //                       const fileName = `${Date.now()}-${
    //                         attachment.filename
    //                       }`;
    //                       const filePath = path.join(userUploadDir, fileName);

    //                       await writeFileAsync(filePath, attachment.content);

    //                       // Process the file using uploadDocument
    //                       await uploadDocument(
    //                         {
    //                           buffer: attachment.content,
    //                           originalname: attachment.filename,
    //                           size: attachment.size,
    //                           mimetype: attachment.contentType,
    //                         },
    //                         "email_attachment",
    //                         user._id
    //                       );

    //                       await unlinkAsync(filePath);
    //                       processedAttachments++;
    //                     }
    //                   }
    //                 }
    //                 resolveMessage();
    //               } catch (error) {
    //                 console.error(
    //                   `Error processing message for user ${user._id}:`,
    //                   error
    //                 );
    //                 resolveMessage();
    //               }
    //             });
    //           });
    //           messagePromises.push(messagePromise);
    //         });

    //         fetch.once("error", reject);

    //         fetch.once("end", async () => {
    //           try {
    //             await Promise.all(messagePromises);
    //             resolve();
    //           } catch (error) {
    //             reject(error);
    //           }
    //         });
    //       });
    //     });
    //   });

    //   imap.once("error", (err) => {
    //     console.error(`IMAP error for user ${user._id}:`, err);
    //     reject(err);
    //   });

    //   imap.once("end", () => {
    //     console.log(`IMAP connection ended for user ${user._id}`);
    //   });

    //   imap.connect();
    // });

    await new Promise((resolve, reject) => {
      imap.once("ready", () => {
        imap.openBox("INBOX", false, (err, box) => {
          if (err) {
            reject(err);
            return;
          }

          // IMAP search expects a Date object
          const searchCriteria = ["ALL", ["SINCE", lastSyncDate]];

          imap.search(searchCriteria, async (err, results) => {
            if (err) {
              reject(err);
              return;
            }

            if (!results.length) {
              resolve();
              return;
            }

            const fetch = imap.fetch(results, {
              bodies: "",
              struct: true,
              envelope: true,
              internaldate: true,
            });

            const messagePromises = [];
            const lastSyncTimestamp = lastSyncDate.getTime();

            fetch.on("message", (msg) => {
              const messagePromise = new Promise((resolveMessage) => {
                let attributes;

                msg.once("attributes", (attrs) => {
                  attributes = attrs;
                });

                msg.on("body", async (stream) => {
                  try {
                    // Parse the message first
                    const parsed = await simpleParser(stream);

                    // Check if the message's internal date is after the last sync time
                    const messageTimestamp =
                      attributes?.internaldate?.getTime() ||
                      parsed.date?.getTime();

                    // Only process if message is newer than last sync
                    if (
                      messageTimestamp &&
                      messageTimestamp > lastSyncTimestamp
                    ) {
                      // Handle attachments
                      if (parsed.attachments?.length) {
                        for (const attachment of parsed.attachments) {
                          if (
                            ALLOWED_MIME_TYPES.includes(
                              attachment.contentType.toLowerCase()
                            )
                          ) {
                            const fileName = `${Date.now()}-${
                              attachment.filename
                            }`;
                            const filePath = path.join(userUploadDir, fileName);

                            // Save the file and process the attachment
                            await writeFileAsync(filePath, attachment.content);
                            await uploadDocument(
                              {
                                buffer: attachment.content,
                                originalname: attachment.filename,
                                size: attachment.size,
                                mimetype: attachment.contentType,
                              },
                              "Email",
                              user._id
                            );

                            // Delete the file after processing
                            await unlinkAsync(filePath);
                            processedAttachments++;
                          }
                        }
                      }
                    }
                    resolveMessage();
                  } catch (error) {
                    console.error(
                      `Error processing message for user ${user._id}:`,
                      error
                    );
                    resolveMessage();
                  }
                });
              });

              messagePromises.push(messagePromise);
            });

            fetch.once("error", reject);

            fetch.once("end", async () => {
              try {
                await Promise.all(messagePromises);
                resolve();
              } catch (error) {
                reject(error);
              }
            });
          });
        });
      });

      imap.once("error", (err) => {
        console.error(`IMAP error for user ${user._id}:`, err);
        reject(err);
      });

      imap.once("end", () => {
        console.log(`IMAP connection ended for user ${user._id}`);
      });

      imap.connect();
    });

    // Clean up user directory
    if (fs.existsSync(userUploadDir)) {
      await rmdirAsync(userUploadDir, { recursive: true });
    }

    // Update user's last sync time and status
    await User.findByIdAndUpdate(user._id, {
      "emailConfigurations.lastSyncedAt": new Date(),
      "emailConfigurations.isActive": true,
    });

    return {
      userId: user._id,
      status: "success",
      processedAttachments,
    };
  } catch (error) {
    console.error(`Error processing emails for user ${user._id}:`, error);

    // Update user's status to inactive on error
    await User.findByIdAndUpdate(user._id, {
      "emailConfigurations.isActive": false,
    });

    // Ensure cleanup happens even on error
    if (fs.existsSync(userUploadDir)) {
      await rmdirAsync(userUploadDir, { recursive: true });
    }

    return {
      userId: user._id,
      status: "error",
      error: error.message,
    };
  }
};

const syncAllUsersEmails = async (req, res) => {
  try {
    req.setTimeout(500000, () => {
      console.error("Request timed out");
      return res.status(408).json({
        success: false,
        message: "Request timed out. Please try again later.",
      });
    });
    const users = await User.find({
      "emailConfigurations.email": { $exists: true },
      "emailConfigurations.password": { $exists: true },
    });
    console.log(users);
    console.log(`Starting email sync for ${users.length} users`);

    const results = await Promise.all(
      users.map((user) => processUserEmails(user))
    );

    const summary = {
      total: users.length,
      successful: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "error").length,
      details: results,
    };

    return res.status(200).json({
      status: "success",
      data: summary,
    });
  } catch (error) {
    console.error("Error in syncAllUsersEmails:", error);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

module.exports = {
  syncAllUsersEmails,
};
