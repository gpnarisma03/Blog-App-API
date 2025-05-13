const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');

const createStorage = (folderName) =>
  new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      return {
        folder: `uploads/${folderName}`,
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }],
      };
    },
  });

const getUploadMiddleware = (folderName) => multer({ storage: createStorage(folderName) });

module.exports = getUploadMiddleware;
