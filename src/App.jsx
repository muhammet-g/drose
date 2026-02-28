import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Schedule from './pages/Schedule'
import DailyClasses from './pages/DailyClasses'
import Attendance from './pages/Attendance'
import MonthlyReport from './pages/MonthlyReport'
import Login from './pages/Login'
import Swal from './lib/swal'
import {
    MdDashboard, MdPeople, MdCalendarMonth, MdToday,
    MdAssignment, MdBarChart, MdLogout, MdMenu, MdClose,
    MdMenuBook
} from 'react-icons/md'

// Protected Route Component
function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
                <span className="loading-text">جاري التحقق من الجلسة...</span>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    return children
}

// NavLink wrapper
function NavItem({ to, icon, label }) {
    const location = useLocation()
    const isActive = location.pathname === to
    return (
        <li>
            <Link className={`nav-link-custom${isActive ? ' active' : ''}`} to={to}>
                {icon}
                <span>{label}</span>
            </Link>
        </li>
    )
}

// Main Layout Component with Navbar
function MainLayout({ children }) {
    const { user, signOut } = useAuth()
    const [menuOpen, setMenuOpen] = useState(false)

    const handleSignOut = async () => {
        const result = await Swal.fire({
            title: 'هل أنت متأكد؟',
            text: 'هل تريد تسجيل الخروج؟',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'نعم، تسجيل الخروج',
            cancelButtonText: 'إلغاء'
        })

        if (result.isConfirmed) {
            await signOut()
            Swal.fire({ icon: 'success', title: 'تم تسجيل الخروج', text: 'تم تسجيل الخروج بنجاح', timer: 1500, showConfirmButton: false })
        }
    }

    const initials = user?.email ? user.email[0].toUpperCase() : '؟'

    return (
        <div className="app-wrapper">
            {/* Navigation Bar */}
            <nav className="top-navbar">
                <Link className="navbar-brand-custom" to="/">
                    <div className="brand-icon">
                        <MdMenuBook size={18} />
                    </div>
                    <span>نظام الدروس الخصوصية</span>
                </Link>

                {/* Desktop links */}
                <ul className={`navbar-links${menuOpen ? ' open' : ''}`}>
                    <NavItem to="/" icon={<MdDashboard size={16} />} label="الرئيسية" />
                    <NavItem to="/students" icon={<MdPeople size={16} />} label="الطلاب" />
                    <NavItem to="/schedule" icon={<MdCalendarMonth size={16} />} label="جدولة الدروس" />
                    <NavItem to="/daily-classes" icon={<MdToday size={16} />} label="الحصص اليومية" />
                    <NavItem to="/attendance" icon={<MdAssignment size={16} />} label="الحضور" />
                    <NavItem to="/monthly-report" icon={<MdBarChart size={16} />} label="السجل الشهري" />
                </ul>

                <div className="navbar-user">
                    <div className="user-pill">
                        <div className="user-avatar">{initials}</div>
                        <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.email}
                        </span>
                    </div>
                    <button className="btn-signout" onClick={handleSignOut}>
                        <MdLogout size={15} />
                        <span>خروج</span>
                    </button>
                    <button className="nav-toggler" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
                        {menuOpen ? <MdClose size={22} color="#94A3B8" /> : <MdMenu size={22} color="#94A3B8" />}
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <main>
                {children}
            </main>
        </div>
    )
}

// App Component with Routes
function AppContent() {
    const { user } = useAuth()

    return (
        <Routes>
            {/* Public Route */}
            <Route
                path="/login"
                element={user ? <Navigate to="/" replace /> : <Login />}
            />

            {/* Protected Routes */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <Dashboard />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/students"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <Students />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/schedule"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <Schedule />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/daily-classes"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <DailyClasses />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/attendance"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <Attendance />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/monthly-report"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <MonthlyReport />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </Router>
    )
}

export default App
