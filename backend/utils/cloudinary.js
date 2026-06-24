// utils/cloudinary.js — Cloudinary configuration and upload utility
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import multerStorageCloudinary from "multer-storage-cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Support both CJS and ESM shapes for multer-storage-cloudinary
const CloudinaryStorage =
  multerStorageCloudinary?.CloudinaryStorage ||
  (multerStorageCloudinary?.default &&
    multerStorageCloudinary.default.CloudinaryStorage) ||
  multerStorageCloudinary?.default ||
  multerStorageCloudinary;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET,
);

export const requireCloudinaryConfigured = () => {
  if (!isCloudinaryConfigured) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getUploadFolder = (req, file) => {
  if (req.uploadFolder) return req.uploadFolder;
  if (file.fieldname === "avatar") return "avatars";
  if (file.fieldname === "portfolio") return "portfolios";
  if (file.fieldname === "moodboard") return "moodboards";
  if (file.fieldname === "video" || file.fieldname === "videos")
    return "videos";
  return "misc";
};

const getAllowedFormats = (file) => {
  if (file.mimetype?.startsWith("video/")) {
    return ["mp4", "mov", "webm", "m4v"];
  }
  if (
    [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/zip",
      "application/x-rar-compressed",
    ].includes(file.mimetype)
  ) {
    return ["pdf", "doc", "docx", "xls", "xlsx", "txt", "zip", "rar"];
  }
  return ["jpg", "jpeg", "png", "webp", "gif"];
};

const getResourceType = (file) =>
  file.mimetype?.startsWith("video/")
    ? "video"
    : file.mimetype?.startsWith("image/")
      ? "image"
      : "raw";

// Multer storage engine for Cloudinary
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const resourceType = getResourceType(file);
    return {
      folder: `loversai/${getUploadFolder(req, file)}`,
      resource_type: resourceType,
      allowed_formats: getAllowedFormats(file),
      ...(resourceType === "image"
        ? {
            transformation: [
              { width: 1200, height: 1200, crop: "limit", quality: "auto" },
            ],
          }
        : {}),
    };
  },
});

const localDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadFolder = getUploadFolder(req, file);
    const destination = path.join(__dirname, "..", "uploads", uploadFolder);
    fs.mkdirSync(destination, { recursive: true });
    cb(null, destination);
  },
  filename: (_req, file, cb) => {
    let ext = path.extname(file.originalname || "").toLowerCase();
    if (!ext) {
      const mime = (file.mimetype || "").toLowerCase();
      const mimeMap = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "video/mp4": ".mp4",
        "video/quicktime": ".mov",
        "video/webm": ".webm",
        "video/x-m4v": ".m4v",
      };
      ext =
        mimeMap[mime] ||
        (mime.includes("/") ? `.${mime.split("/")[1]}` : ".bin");
    }
    const safeBase = path
      .basename(file.originalname || "image", ext)
      .replace(/[^a-z0-9_-]/gi, "-")
      .slice(0, 60);
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  },
});

// File filter — only images
const fileFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, WebP, and GIF images are allowed"), false);
  }
};

// Multer instance
export const upload = multer({
  storage: isCloudinaryConfigured ? cloudinaryStorage : localDiskStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 10, // Max 10 files at once
  },
});

const mediaFileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-m4v",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only JPG, PNG, WebP, GIF, MP4, MOV, WebM, and M4V files are allowed",
      ),
      false,
    );
  }
};

export const uploadMedia = multer({
  storage: isCloudinaryConfigured ? cloudinaryStorage : localDiskStorage,
  fileFilter: mediaFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 10,
  },
});

const chatFileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "application/zip",
    "application/x-rar-compressed",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only images, PDF, Word, Excel, text, ZIP, and RAR files are allowed",
      ),
      false,
    );
  }
};

export const uploadChat = multer({
  storage: isCloudinaryConfigured ? cloudinaryStorage : localDiskStorage,
  fileFilter: chatFileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 10,
  },
});

// Direct upload from base64/buffer (for server-side uploads)
export const uploadToCloudinary = async (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || "loversai/misc",
      resource_type: options.resource_type || "image",
      transformation: [
        { width: 1200, height: 1200, crop: "limit", quality: "auto" },
      ],
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    uploadStream.end(fileBuffer);
  });
};

export const uploadRemoteToCloudinary = async (sourceUrl, options = {}) => {
  if (!isCloudinaryConfigured) {
    throw new Error(
      "Cloudinary is not configured. Remote assets cannot be persisted.",
    );
  }

  const uploadOptions = {
    folder: options.folder || "loversai/misc",
    resource_type: options.resource_type || "auto",
    ...options,
  };

  return cloudinary.uploader.upload(sourceUrl, uploadOptions);
};

// Delete from Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw error;
  }
};

export default cloudinary;
