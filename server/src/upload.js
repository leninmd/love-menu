"use strict";

const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { nanoid } = require("nanoid");

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "../data/uploads");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("invalid_file_type"));
    }
  }
});

async function processAndSaveImage(buffer) {
  ensureUploadDir();
  const filename = `${nanoid()}.webp`;
  const filepath = path.join(UPLOAD_DIR, filename);

  await sharp(buffer)
    .resize(800, 800, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(filepath);

  const stats = fs.statSync(filepath);
  if (stats.size > 300 * 1024) {
    await sharp(buffer)
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 60 })
      .toFile(filepath);
  }

  return `/uploads/${filename}`;
}

module.exports = { upload, processAndSaveImage, UPLOAD_DIR };
