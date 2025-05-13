const express = require('express');
const userController = require('../controllers/userController');
const { verify } = require('../auth'); // Ensure that `verify` middleware checks the user authentication
const getUploadMiddleware = require('../middlewares/cloudinaryStorage'); 

const router = express.Router();

// Register new user
router.post('/register', userController.userRegister);

// Login user
router.post('/login', userController.userLogin);

// Get user details
router.get('/details', verify, userController.userDetails);

// Update user profile (including image upload)
router.put('/updateUserImage', verify, getUploadMiddleware('profile_images').single('image'), userController.updateUserImage);

router.put('/updateUserInfo', verify, userController.updateUserInfo);


module.exports = router;
