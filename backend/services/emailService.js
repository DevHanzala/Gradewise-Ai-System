import nodemailer from "nodemailer"
import dotenv from "dotenv"

dotenv.config()

// Create a transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_PASS, // Your Gmail App Password
  },
})

/**
 * Sends a verification email to the user.
 * @param {string} email - The user's email address.
 * @param {string} name - The user's name.
 * @param {string} token - The verification token.
 */
export const sendVerificationEmail = async (email, name, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify Your Email - Gradewise AI",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Gradewise AI</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Learning Management System</p>
          </div>
          
          <h2 style="color: #1f2937; margin-bottom: 20px;">Welcome, ${name}!</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
            Thank you for signing up for Gradewise AI. To complete your registration and start using our platform, 
            please verify your email address by clicking the button below.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; 
                      border-radius: 6px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-top: 30px;">
            If the button doesn't work, you can also copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #2563eb; word-break: break-all;">${verificationUrl}</a>
          </p>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              This verification link will expire in 24 hours. If you didn't create an account with Gradewise AI, 
              please ignore this email.
            </p>
          </div>
        </div>
      </div>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`✅ Verification email sent to ${email}`)
  } catch (error) {
    console.error(`❌ Failed to send verification email to ${email}:`, error)
    throw error
  }
}

/**
 * Sends a password reset email to the user.
 * @param {string} email - The user's email address.
 * @param {string} name - The user's name.
 * @param {string} token - The reset token.
 */
export const sendPasswordResetEmail = async (email, name, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Reset Your Password - Gradewise AI",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Gradewise AI</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Learning Management System</p>
          </div>
          
          <h2 style="color: #1f2937; margin-bottom: 20px;">Password Reset Request</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
            Hi ${name},<br><br>
            We received a request to reset your password for your Gradewise AI account. 
            Click the button below to create a new password.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; 
                      border-radius: 6px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-top: 30px;">
            If the button doesn't work, you can also copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #dc2626; word-break: break-all;">${resetUrl}</a>
          </p>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              This password reset link will expire in 1 hour. If you didn't request a password reset, 
              please ignore this email and your password will remain unchanged.
            </p>
          </div>
        </div>
      </div>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`✅ Password reset email sent to ${email}`)
  } catch (error) {
    console.error(`❌ Failed to send password reset email to ${email}:`, error)
    throw error
  }
}

/**
 * Sends a role change notification email to the user.
 * @param {string} email - The user's email address.
 * @param {string} name - The user's name.
 * @param {string} oldRole - The user's previous role.
 * @param {string} newRole - The user's new role.
 * @param {string} changedBy - The name of the admin who made the change.
 */
export const sendRoleChangeEmail = async (email, name, oldRole, newRole, changedBy) => {
  const getRoleDisplayName = (role) => {
    switch (role) {
      case "super_admin":
        return "Super Administrator"
      case "admin":
        return "Administrator"
      case "instructor":
        return "Instructor"
      case "student":
        return "Student"
      default:
        return role
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case "super_admin":
        return "#7c3aed"
      case "admin":
        return "#dc2626"
      case "instructor":
        return "#2563eb"
      case "student":
        return "#059669"
      default:
        return "#6b7280"
    }
  }

  const oldRoleDisplay = getRoleDisplayName(oldRole)
  const newRoleDisplay = getRoleDisplayName(newRole)
  const newRoleColor = getRoleColor(newRole)

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Role Has Been Updated - Gradewise AI",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Gradewise AI</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Learning Management System</p>
          </div>
          
          <h2 style="color: #1f2937; margin-bottom: 20px;">Role Update Notification</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
            Hi ${name},<br><br>
            Your role in Gradewise AI has been updated by ${changedBy}.
          </p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
              <div style="text-align: center;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Previous Role</p>
                <p style="margin: 5px 0 0 0; color: #374151; font-weight: bold;">${oldRoleDisplay}</p>
              </div>
              <div style="color: #9ca3af; font-size: 24px;">→</div>
              <div style="text-align: center;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">New Role</p>
                <p style="margin: 5px 0 0 0; color: ${newRoleColor}; font-weight: bold; font-size: 18px;">${newRoleDisplay}</p>
              </div>
            </div>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
            This change is effective immediately. You may need to log out and log back in to see the updated permissions and features available to your new role.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/login" 
               style="background-color: ${newRoleColor}; color: white; padding: 12px 30px; text-decoration: none; 
                      border-radius: 6px; font-weight: bold; display: inline-block;">
              Access Your Account
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              If you have any questions about this role change or need assistance with your new permissions, 
              please contact your administrator.
            </p>
          </div>
        </div>
      </div>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`✅ Role change email sent to ${email}`)
  } catch (error) {
    console.error(`❌ Failed to send role change email to ${email}:`, error)
    throw error
  }
}

/**
 * Sends an enrollment notification email to the student.
 * @param {string} email - The student's email address.
 * @param {string} name - The student's name.
 * @param {string} assessmentTitle - The assessment title.
 * @param {string} instructorName - The instructor's name.
 */
export const sendEnrollmentEmail = async (email, name, assessmentTitle, instructorName) => {
  const loginUrl = `${process.env.FRONTEND_URL}/login`

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `You've been enrolled in an assessment - ${assessmentTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Gradewise AI</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Learning Management System</p>
          </div>
          
          <h2 style="color: #1f2937; margin-bottom: 20px;">New Assessment Enrollment</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
            Hi ${name},<br><br>
            You have been enrolled in a new assessment by ${instructorName}.
          </p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #2563eb; margin: 0 0 10px 0; font-size: 20px;">${assessmentTitle}</h3>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Instructor: ${instructorName}</p>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
            You can now access this assessment from your student dashboard. Please log in to view the assessment details, 
            including the duration, instructions, and start date.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; 
                      border-radius: 6px; font-weight: bold; display: inline-block;">
              Access Assessment
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Make sure to read the assessment instructions carefully before starting. 
              If you have any questions, please contact your instructor.
            </p>
          </div>
        </div>
      </div>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`✅ Enrollment email sent to ${email}`)
  } catch (error) {
    console.error(`❌ Failed to send enrollment email to ${email}:`, error)
    throw error
  }
}
