const BlogPost = require('../models/BlogPost');
const cloudinary = require('../utils/cloudinary');
const dotenv = require('dotenv');
dotenv.config();


module.exports.createBlogPost = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    console.log("File uploaded:", req.file);

    const { title, content } = req.body;
    const author = req.user.id;

    let imageUrl = '';

    if (req.file) {
      console.log("Uploading image to Cloudinary...");

      try {
        const result = await cloudinary.uploader.upload(req.file.path); // Upload the file to Cloudinary
        console.log("Cloudinary result:", result);

        imageUrl = result.secure_url; // Store the image URL
        console.log("Image URL:", imageUrl);
      } catch (uploadError) {
        console.error("Cloudinary upload failed:", uploadError);
        return res.status(500).json({
          success: false,
          message: 'Error uploading image to Cloudinary',
          error: uploadError.message || JSON.stringify(uploadError)
        });
      }
    }

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const newBlogPost = new BlogPost({
      title,
      content,
      author,
      imageUrl
    });

    await newBlogPost.save();

    return res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      blogPost: newBlogPost
    });

  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({
      success: false,
      message: 'Error creating blog post',
      error: err.message || JSON.stringify(err)
    });
  }
};

module.exports.getUserPosts = async (req, res) => {
    try {
        const userId = req.user.id; // This is set in the `verify` middleware

        // Fetch posts by the authenticated user
        const posts = await BlogPost.find({ author: userId }); // For Mongoose
        // const posts = await Post.findAll({ where: { userId } }); // For Sequelize

        res.status(200).json({
            success: true,
            data: posts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user posts',
            error: error.message
        });
    }
};


// Update a blog post
module.exports.updateBlogPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    
    // Validate that the title or content is provided
    if (!title && !content) {
      return res.status(400).send({
        success: false,
        message: 'Title or content is required to update'
      });
    }

    // Find the blog post by ID
    const blogPost = await BlogPost.findById(id);

    if (!blogPost) {
      return res.status(404).send({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Ensure the author is the same as the user making the request
    if (blogPost.author.toString() !== req.user.id) {
      return res.status(403).send({
        success: false,
        message: 'You can only edit your own blog posts'
      });
    }

    // Update the blog post fields
    if (title) blogPost.title = title;
    if (content) blogPost.content = content;
    blogPost.updatedAt = Date.now();

    // Save the updated blog post
    await blogPost.save();

    // Send a success response
    return res.status(200).send({
      success: true,
      message: 'Blog post updated successfully',
      blogPost
    });

  } catch (err) {
    console.error(err);
    return res.status(500).send({
      success: false,
      message: 'Error updating blog post',
      error: err.message
    });
  }
};

module.exports.deleteBlogPost = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the blog post by ID
    const blogPost = await BlogPost.findById(id);

    if (!blogPost) {
      return res.status(404).send({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Check if the user is an admin or the author of the blog post
    if (req.user.isAdmin || blogPost.author.toString() === req.user.id) {
      // Admin can delete any post, or the author can delete their own post
      await BlogPost.findByIdAndDelete(id);  // Use deleteOne or findByIdAndDelete to remove the post
      
      return res.status(200).send({
        success: true,
        message: 'Blog post deleted successfully'
      });
    } else {
      // If not an admin and not the author, deny deletion
      return res.status(403).send({
        success: false,
        message: 'You are not authorized to delete this post'
      });
    }

  } catch (err) {
    console.error(err);
    return res.status(500).send({
      success: false,
      message: 'Error deleting blog post',
      error: err.message
    });
  }
};

// Get all blog posts
module.exports.getAllBlogPosts = async (req, res) => {
  try {
    const blogPosts = await BlogPost.find()
      .populate('author', 'username email imageUrl')  // Populate the author field with username and email (optional)
      .sort({ createdAt: -1 });  // Sort by created date in descending order (most recent first)

    if (!blogPosts || blogPosts.length === 0) {
      return res.status(404).send({
        success: false,
        message: 'No blog posts found'
      });
    }

    return res.status(200).send({
      success: true,
      message: 'Blog posts retrieved successfully',
      blogPosts
    });

  } catch (err) {
    console.error(err);
    return res.status(500).send({
      success: false,
      message: 'Error fetching blog posts',
      error: err.message
    });
  }
};


// Get a single blog post by ID
module.exports.getBlogPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const blogPost = await BlogPost.findById(id)
      .populate('author', 'username email imageUrl')  
      .populate('comments.userId', 'username createdAt imageUrl')  
    
    if (!blogPost) {
      return res.status(404).send({
        success: false,
        message: 'Blog post not found'
      });
    }

    return res.status(200).send({
      success: true,
      message: 'Blog post retrieved successfully',
      blogPost
    });

  } catch (err) {
    console.error(err);
    return res.status(500).send({
      success: false,
      message: 'Error fetching blog post',
      error: err.message
    });
  }
};




//Comments

// Add a comment to a blog post
module.exports.addComment = async (req, res) => {
  try {
    const { id } = req.params; // blog post ID
    const { content } = req.body;

    if (!content) {
      return res.status(400).send({
        success: false,
        message: 'Comment content is required'
      });
    }

    const blogPost = await BlogPost.findById(id);

    if (!blogPost) {
      return res.status(404).send({
        success: false,
        message: 'Blog post not found'
      });
    }

    const comment = {
      userId: req.user.id,
      content,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    blogPost.comments.push(comment);
    await blogPost.save();

    return res.status(201).send({
      success: true,
      message: 'Comment added successfully',
      blogPost
    });

  } catch (err) {
    console.error(err);
    return res.status(500).send({
      success: false,
      message: 'Error adding comment',
      error: err.message
    });
  }
};


//delete comment by authorize user and admin
module.exports.deleteComment = async (req, res) => {
  try {
    const blogPostId = req.params.postId;
    const commentId = req.params.commentId;
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    const blogPost = await BlogPost.findById(blogPostId);

    if (!blogPost) {
      return res.status(404).send({
        success: false,
        message: 'Blog post not found'
      });
    }

    const comment = blogPost.comments.id(commentId);

    if (!comment) {
      return res.status(404).send({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user is the comment author or admin
    if (comment.userId.toString() !== userId && !isAdmin) {
      return res.status(403).send({
        success: false,
        message: 'You are not authorized to delete this comment'
      });
    }

    // Manually remove comment by filtering it out
    blogPost.comments = blogPost.comments.filter(
      (c) => c._id.toString() !== commentId
    );

    await blogPost.save();

    return res.status(200).send({
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (err) {
    console.error(err);
    return res.status(500).send({
      success: false,
      message: 'Error deleting comment',
      error: err.message
    });
  }
};



module.exports.updateComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === '') {
      return res.status(400).send({
        success: false,
        message: 'Updated comment content is required'
      });
    }

    const blogPost = await BlogPost.findById(postId);

    if (!blogPost) {
      return res.status(404).send({
        success: false,
        message: 'Blog post not found'
      });
    }

    const comment = blogPost.comments.id(commentId);

    if (!comment) {
      return res.status(404).send({
        success: false,
        message: 'Comment not found'
      });
    }

    if (comment.userId.toString() !== userId) {
      return res.status(403).send({
        success: false,
        message: 'You are not authorized to update this comment'
      });
    }

    comment.content = content;
    comment.updatedAt = new Date();

    await blogPost.save();

    return res.status(200).send({
      success: true,
      message: 'Comment updated successfully',
      comment
    });

  } catch (err) {
    console.error(err);
    return res.status(500).send({
      success: false,
      message: 'Error updating comment',
      error: err.message
    });
  }
};


