const multer = require('multer');
const path = require('path');

// Use memory storage instead of diskStorage
const storage = multer.memoryStorage();

// Multer middleware to only allow image files (jpeg, jpg, png, gif)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// Export the middleware to be used in routes
exports.upload = upload.single('image'); // 'image' is the key used in form-data
