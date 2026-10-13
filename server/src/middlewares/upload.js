import multer from 'multer';
import { AppError } from '../errors/AppError.js';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Store in memory buffer so storageService can validate bytes before writing to disk
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type: Only PDF, JPG, and PNG files are allowed', 400), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
});

// Middleware to handle single document upload with clean error handling
export const uploadSingleDocument = (fieldName = 'file') => {
  const multerMiddleware = upload.single(fieldName);

  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError('File size exceeds the 5MB maximum limit', 400));
          }
          return next(new AppError(`Upload error: ${err.message}`, 400));
        }
        return next(err);
      }
      next();
    });
  };
};
