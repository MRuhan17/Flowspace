import rateLimit from 'express-rate-limit';

/**
 * Rate Limiting Middleware
 * 
 * Protects AI endpoints from abuse by limiting requests per IP/User.
 */

// Standard limiter for general AI routes
export const aiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again after 15 minutes.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: (req) => {
        // Use User ID if authenticated, otherwise IP
        return req.user ? req.user.id : req.ip;
    }
});

// Stricter limiter for heavy operations (e.g. expensive layout generation)
export const heavyAiRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 heavy requests per hour
    message: {
        success: false,
        error: 'You have exceeded the limit for heavy AI operations. Please try again in an hour.'
    }
});

// Critical limiter for auth/speech inputs
export const strictRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute (~1 every 3 sec)
    message: {
        success: false,
        error: 'Rate limit exceeded. Please slow down.'
    }
});

export default { aiRateLimiter, heavyAiRateLimiter, strictRateLimiter };
