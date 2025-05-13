const express = require('express');
const blogPostController = require('../controllers/blogPostController');
const { verify } = require('../auth');
const getUploadMiddleware = require('../middlewares/cloudinaryStorage'); 

const router = express.Router();


router.post('/', verify, getUploadMiddleware('blogs').single('image'), blogPostController.createBlogPost); 
router.get('/user', verify, blogPostController.getUserPosts);
// Other routes
router.put('/:id', verify, blogPostController.updateBlogPost);
router.delete('/:id', verify, blogPostController.deleteBlogPost);

router.get('/', blogPostController.getAllBlogPosts);

router.get('/:id', blogPostController.getBlogPostById);

// Comments
router.post('/:id/comments', verify, blogPostController.addComment);
router.delete('/:postId/comments/:commentId', verify, blogPostController.deleteComment);
router.put('/:postId/comments/:commentId', verify, blogPostController.updateComment);

module.exports = router;
