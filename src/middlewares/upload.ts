import multer from "multer";
import { AppError } from "../utils/AppError";

const ALLOWED = ["image/png", "image/jpeg", "application/pdf", "text/plain"];
const MAX_SIZE = 1 * 1024 * 1024;
const LESSON_TYPES = ["application/pdf", "text/plain"];
const LESSON_MAX_SIZE = 10 * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (!ALLOWED.includes(file.mimetype)) {
    return cb(new AppError("Type de fichier non autorisé", 400) as unknown as null, false);
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

export const uploadOne = upload.single("file");

const lessonUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (!LESSON_TYPES.includes(file.mimetype)) {
      return cb(new AppError("Seuls les fichiers PDF et TXT sont acceptés.", 400));
    }
    cb(null, true);
  },
  limits: { fileSize: LESSON_MAX_SIZE, files: 1 },
});

export const lessonUploadOne = lessonUpload.single("file");
