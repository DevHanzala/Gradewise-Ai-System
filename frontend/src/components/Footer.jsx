import { Link } from "react-router-dom"
import useAuthStore from "../store/authStore.js"

function Footer() {
  const { user } = useAuthStore()

  const currentYear = new Date().getFullYear()

  const getQuickLinks = () => {
    if (!user) {
      return [
        { name: "Home", href: "/" },
        { name: "Login", href: "/login" },
        { name: "Sign Up", href: "/signup" },
        { name: "Forgot Password", href: "/forgot-password" },
      ]
    }

    const baseLinks = [
      {
        name: "Dashboard",
        href:
          user.role === "admin"
            ? "/admin/dashboard"
            : user.role === "instructor"
              ? "/instructor/dashboard"
              : "/student/dashboard",
      },
      { name: "Profile", href: "/profile" },
    ]

    if (user.role === "instructor") {
      baseLinks.push({ name: "Add Student", href: "/instructor/add-student" })
    }

    return baseLinks
  }

  const supportLinks = [
    { name: "Help Center", href: "#" },
    { name: "Contact Support", href: "#" },
    { name: "Documentation", href: "#" },
    { name: "System Status", href: "#" },
  ]

  const companyLinks = [
    { name: "About Us", href: "#" },
    { name: "Privacy Policy", href: "#" },
    { name: "Terms of Service", href: "#" },
    { name: "Cookie Policy", href: "#" },
  ]

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 lg:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="text-2xl">📚</div>
              <span className="text-xl font-bold text-blue-400">Gradewise AI</span>
            </div>
            <p className="text-gray-400 mb-4 text-sm leading-relaxed">
              Empowering educators with intelligent grading solutions. Transform your teaching experience with
              AI-powered assessment tools.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-blue-400 transition duration-200">
                <span className="sr-only">Facebook</span>
                <div className="text-xl">📘</div>
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition duration-200">
                <span className="sr-only">Twitter</span>
                <div className="text-xl">🐦</div>
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition duration-200">
                <span className="sr-only">LinkedIn</span>
                <div className="text-xl">💼</div>
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition duration-200">
                <span className="sr-only">Email</span>
                <div className="text-xl">📧</div>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {getQuickLinks().map((link) => (
                <li key={link.name}>
                  <Link to={link.href} className="text-gray-400 hover:text-white transition duration-200 text-sm">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-gray-400 hover:text-white transition duration-200 text-sm">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-gray-400 hover:text-white transition duration-200 text-sm">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* User Status Section (if logged in) */}
        {user && (
          <div className="border-t border-gray-800 mt-8 pt-8">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-3 mb-3 sm:mb-0">
                  <div className="text-2xl">
                    {user.role === "admin" ? "👑" : user.role === "instructor" ? "👨‍🏫" : "👨‍🎓"}
                  </div>
                  <div>
                    <div className="font-medium text-white">{user.name}</div>
                    <div className="text-sm text-gray-400">
                      Logged in as <span className="capitalize text-blue-400">{user.role}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-400">Online</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-400 mb-4 md:mb-0">© {currentYear} Gradewise AI. All rights reserved.</div>
            <div className="flex flex-wrap items-center space-x-6">
              <span className="text-sm text-gray-400">Made with ❤️ for educators</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-400">System Status: All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
