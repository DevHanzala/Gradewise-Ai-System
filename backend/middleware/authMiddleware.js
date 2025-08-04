import jwt from "jsonwebtoken" // For verifying JSON Web Tokens
import dotenv from "dotenv"

dotenv.config() // Load environment variables

const JWT_SECRET = process.env.JWT_SECRET // Get JWT secret from environment variables

/**
 * Middleware to protect routes.
 * Verifies the JWT token from the request header and attaches user info to req.user.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @param {Function} next - The next middleware function.
 */
export const protect = (req, res, next) => {
  let token // Declare token variable

  // Check if authorization header exists and starts with 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    // Extract the token from the header (e.g., "Bearer TOKEN_STRING")
    token = req.headers.authorization.split(" ")[1]
  }

  // If no token is found, return an unauthorized error
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token provided." })
  }

  try {
    // Verify the token using the JWT_SECRET
    const decoded = jwt.verify(token, JWT_SECRET)

    // Attach the decoded user information (id, email, role) to the request object
    req.user = decoded
    next() // Call next to proceed to the next middleware or route handler
  } catch (error) {
    // If token verification fails (e.g., invalid token, expired token)
    console.error("Token verification failed:", error)
    res.status(401).json({ message: "Not authorized, token failed." })
  }
}

/**
 * Middleware for role-based authorization.
 * Checks if the authenticated user's role is included in the allowed roles.
 * @param {...string} roles - A list of roles that are allowed to access the route.
 * @returns {Function} An Express middleware function.
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Check if user information is available from the 'protect' middleware
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Access denied, user role not found." })
    }
    // Check if the user's role is among the allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Access denied, required roles: ${roles.join(", ")}.` })
    }
    next() // Call next to proceed if the user has an authorized role
  }
}
