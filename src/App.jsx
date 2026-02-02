import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Schedule from './pages/Schedule'
import DailyClasses from './pages/DailyClasses'
import Attendance from './pages/Attendance'
import Login from './pages/Login'
import Swal from 'sweetalert2'

// Protected Route Component
function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center">
                <div className="text-center">
                    <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
                        <span className="visually-hidden">جاري التحميل...</span>
                    </div>
                    <p className="mt-3 text-muted">جاري التحقق من الجلسة...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    return children
}

// Main Layout Component with Navbar
function MainLayout({ children }) {
    const { user, signOut } = useAuth()

    const handleSignOut = async () => {
        const result = await Swal.fire({
            title: 'هل أنت متأكد؟',
            text: 'هل تريد تسجيل الخروج؟',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'نعم، تسجيل الخروج',
            cancelButtonText: 'إلغاء'
        })

        if (result.isConfirmed) {
            await signOut()
            Swal.fire({
                icon: 'success',
                title: 'تم تسجيل الخروج',
                text: 'تم تسجيل الخروج بنجاح',
                timer: 1500,
                showConfirmButton: false
            })
        }
    }

    return (
        <div className="min-vh-100 bg-light">
            {/* Navigation Bar */}
            <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
                <div className="container-fluid">
                    <Link className="navbar-brand fw-bold" to="/">
                        📚 نظام إدارة الدروس الخصوصية
                    </Link>
                    <button
                        className="navbar-toggler"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#navbarNav"
                        aria-controls="navbarNav"
                        aria-expanded="false"
                        aria-label="Toggle navigation"
                    >
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav me-auto">
                            <li className="nav-item">
                                <Link className="nav-link" to="/">
                                    الرئيسية
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to="/students">
                                    الطلاب
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to="/schedule">
                                    جدولة الدروس
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to="/daily-classes">
                                    الحصص اليومية
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to="/attendance">
                                    الحضور والسجلات
                                </Link>
                            </li>
                        </ul>
                        {/* User Info & Sign Out */}
                        <div className="d-flex align-items-center">
                            <span className="text-white me-3">
                                <small>👤 {user?.email}</small>
                            </span>
                            <button
                                className="btn btn-outline-light btn-sm"
                                onClick={handleSignOut}
                            >
                                🚪 تسجيل الخروج
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="container-fluid py-4">
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
