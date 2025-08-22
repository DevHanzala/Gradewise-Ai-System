import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET

/**
 * Middleware to protect routes.
 * Verifies the JWT token from the request header and attaches user info to req.user.
 */
export const protect = (req, res, next) => {
  // Skip token verification for specific routes during development
  if (process.env.NODE_ENV === "development" && req.originalUrl.includes("/api/assessments/") && req.method === "GET") {
    // For development only - bypass authentication for assessment GET routes
    // This is a temporary fix - remove in production
    req.user = {
      id: req.query.user_id || "24", // Default to user 24 if not specified
      role: req.query.role || "instructor", // Default to instructor if not specified
      email: "dev@example.com",
      name: "Development User",
    }
    console.log(`🔑 DEV MODE: Bypassing authentication for ${req.originalUrl}`)
    return next()
  }

  let token

  // Check if authorization header exists and starts with 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1]
  } else if (req.cookies && req.cookies.token) {
    // Also check for token in cookies as fallback
    token = req.cookies.token
  } else if (req.query && req.query.token) {
    // Also check for token in query parameters as another fallback
    token = req.query.token
  }

  // If no token is found, return an unauthorized error
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token provided." })
  }

  try {
    // Verify the token using the JWT_SECRET
    const decoded = jwt.verify(token, JWT_SECRET)

    // Attach the decoded user information to the request object
    req.user = decoded
    next()
  } catch (error) {
    console.error("Token verification failed:", error)
    res.status(401).json({ message: "Not authorized, token failed." })
  }
}

/**
 * Middleware for role-based authorization.
 * Checks if the authenticated user's role is included in the allowed roles.
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Skip role check in development mode if we're bypassing auth
    if (process.env.NODE_ENV === "development" && req.user && req.user.email === "dev@example.com") {
      console.log(`🔑 DEV MODE: Bypassing role check for ${req.originalUrl}`)
      return next()
    }

    // Check if user information is available from the 'protect' middleware
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Access denied, user role not found." })
    }

    // Check if the user's role is among the allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Access denied, required roles: ${roles.join(", ")}.` })
    }

    next()
  }
}
