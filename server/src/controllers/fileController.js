
const path = require("path");

const env = require("../config/env");
const { Visit } = require("../models");
const { AppError } = require("../utils/helpers");
const { canManage } = require("../services/visits");

exports.downloadFile = async (req, res) => {
  const { bucket, name } = req.params;
  const user = req.user;

  const staff = ["security", "admin"].includes(user.role);

  // Only allow approved buckets and safe filenames.
  if (
    !["photos", "ids"].includes(bucket) ||
    !/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(name)
  ) {
    throw new AppError("File not found", 404);
  }

  // Find the visit associated with this file.
  const visit = await Visit.findOne(
    bucket === "photos"
      ? { "photo.filename": name }
      : { "idDoc.filename": name }
  );

  if (!visit) {
    throw new AppError("File not found", 404);
  }

  // ID documents are accessible to staff only.
  // Photos can also be accessed by users who manage the visit.
  const allowed =
    bucket === "ids"
      ? staff
      : staff || (await canManage(user, visit));

  if (!allowed) {
    throw new AppError("File not found", 404);
  }

  res.set({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  });

  res.sendFile(
    name,
    {
      root: path.join(env.uploadDir, bucket),
      dotfiles: "deny",
    },
    (error) => {
      if (error && !res.headersSent) {
        res.status(404).send({ error: "File not found" });
      }
    }
  );
};
