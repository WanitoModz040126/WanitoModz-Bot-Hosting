const multer = require('multer');

/**
 * Multer's middleware calls next(err) on upload failures (bad file type from
 * a fileFilter, size limit exceeded, etc). Left alone, that error skips every
 * route handler and lands on the app's generic 500 handler, hiding the real
 * reason from the user. This wraps it so those errors get a proper friendly
 * 400 response instead.
 */
function wrapUpload(multerMiddleware) {
  return function (req, res, next) {
    multerMiddleware(req, res, function (err) {
      if (!err) return next();

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'That file is larger than the allowed limit.' });
        }
        return res.status(400).json({ error: 'Upload failed: ' + err.message });
      }
      // Errors thrown from a custom fileFilter (e.g. wrong extension) land here.
      return res.status(400).json({ error: err.message || 'Upload failed.' });
    });
  };
}

module.exports = { wrapUpload };
