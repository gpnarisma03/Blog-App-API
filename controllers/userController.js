const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const auth = require('../auth');
const cloudinary = require('../utils/cloudinary');
const dotenv = require('dotenv');
dotenv.config();


// User Register Controller
module.exports.userRegister = async (req, res) => {
  const reqBody = req.body;

  // Check if body exists
  if (!reqBody) {
    return res.status(400).send({
      success: false,
      message: 'Request body is missing'
    });
  }

  const { username, email, password } = reqBody;

  // Basic validation
  if (!username || !email || !password) {
    return res.status(400).send({
      success: false,
      message: 'All fields are required'
    });
  }

  // Email format validation
  if (!email.includes('@')) {
    return res.status(400).send({
      success: false,
      message: 'Invalid email format'
    });
  }

  // Password strength check
  if (password.length < 8) {
    return res.status(400).send({
      success: false,
      message: 'Password must be at least 8 characters long'
    });
  }

  try {
    // Check if email already exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(409).send({
        success: false,
        message: 'Email already in use'
      });
    }

    // Check if username already exists
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(409).send({
        success: false,
        message: 'Username already in use'
      });
    }

    // Hash password and create user
    const hashedPassword = bcrypt.hashSync(password, 12);
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });

    const result = await newUser.save();

    return res.status(201).send({
      success: true,
      message: 'User registered successfully',
      user: {
        _id: result._id,
        username: result.username,
        email: result.email,
        isAdmin: result.isAdmin,
        createdAt: result.createdAt
      }
    });

  } catch (err) {
    return res.status(500).send({
      success: false,
      message: 'Internal server error during registration',
      error: err.message
    });
  }
};



module.exports.userLogin = async (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).send({
      success: false,
      message: 'Username and password are required'
    });
  }

  try {
    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: 'Username not found'
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Generate access token
    const token = auth.createAccessToken(user);

    // Send response
    return res.status(200).send({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }


    });
    
  } catch (err) {
    return res.status(500).send({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
};



module.exports.userDetails = (req, res) => {
    // req.user is added by the verify middleware, containing the decoded user info (including user ID)
    const userId = req.user.id;

    User.findById(userId)
        .then(user => {
            if (!user) {
                return res.status(404).send({
                    success: false,
                    message: 'User not found'
                });
            }

            return res.status(200).send({
                success: true,
                message: 'User details retrieved successfully',
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    isAdmin: user.isAdmin,
                    imageUrl: user.imageUrl,
                    createdAt: user.createdAt
                }
            });
        })
        .catch(err => {
            return res.status(500).send({
                success: false,
                message: 'Internal server error',
                error: err.message
            });
        });
};




module.exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id); // ← no .select() means get all fields

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports.updateUserInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, email } = req.body;

    // Validate if the username already exists (excluding the current user)
    const usernameExists = await User.findOne({ username, _id: { $ne: userId } });
    if (usernameExists) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists. Please choose another one.'
      });
    }

    // Validate if the email already exists (excluding the current user)
    const emailExists = await User.findOne({ email, _id: { $ne: userId } });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists. Please choose another one.'
      });
    }

    // Update the user's profile with the new username and email
    const updatedUser = await User.findByIdAndUpdate(userId, {
      username,
      email
    }, { new: true });

    return res.status(200).json({
      success: true,
      message: 'User information updated successfully',
      user: updatedUser
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Error updating user information',
      error: err.message || JSON.stringify(err)
    });
  }
};


module.exports.updateUserImage = async (req, res) => {
  try {
    const userId = req.user.id;
    let imageUrl = req.user.imageUrl; // Keep the current image URL by default

    // If a new image is uploaded, update the image URL
    if (req.file) {
      // If the file is different, upload to Cloudinary
      const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
        folder: 'profile_pictures', // Optional: You can use a folder for better organization
        transformation: [{ width: 500, height: 500, crop: 'limit' }] // Optional: Resize options
      });

      // Update the image URL with the Cloudinary URL
      imageUrl = uploadResponse.secure_url;
    }

    // Update the user's image URL (this will update only the image without affecting other fields)
    const updatedUser = await User.findByIdAndUpdate(userId, {
      imageUrl  // Only update the image URL
    }, { new: true });

    return res.status(200).json({
      success: true,
      message: 'Profile image updated successfully',
      user: updatedUser
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Error updating profile image',
      error: err.message || JSON.stringify(err)
    });
  }
};
