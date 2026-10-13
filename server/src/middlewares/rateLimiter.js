import rateLimit from 'express-rate-limit';

// Rate limiter for authentication endpoints to protect against brute force attacks
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 50, // Limit each IP to 50 login/register requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  }
});
