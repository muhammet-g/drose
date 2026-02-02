import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [loading, setLoading] = useState(false)
    const { signIn, signUp } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!email || !password) {
            Swal.fire({
                icon: 'warning',
                title: 'تنبيه',
                text: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور',
                confirmButtonText: 'حسناً'
            })
            return
        }

        if (password.length < 6) {
            Swal.fire({
                icon: 'warning',
                title: 'تنبيه',
                text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
                confirmButtonText: 'حسناً'
            })
            return
        }

        setLoading(true)

        try {
            if (isSignUp) {
                // Sign Up
                const { data, error } = await signUp(email, password)

                if (error) {
                    if (error.message.includes('already registered')) {
                        Swal.fire({
                            icon: 'error',
                            title: 'خطأ',
                            text: 'هذا البريد الإلكتروني مسجل مسبقاً',
                            confirmButtonText: 'حسناً'
                        })
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'خطأ',
                            text: error.message,
                            confirmButtonText: 'حسناً'
                        })
                    }
                    return
                }

                Swal.fire({
                    icon: 'success',
                    title: 'تم التسجيل بنجاح',
                    text: 'تم إنشاء الحساب. يرجى تسجيل الدخول الآن.',
                    confirmButtonText: 'حسناً'
                }).then(() => {
                    setIsSignUp(false)
                })

            } else {
                // Sign In
                const { data, error } = await signIn(email, password)

                if (error) {
                    if (error.message.includes('Invalid login credentials')) {
                        Swal.fire({
                            icon: 'error',
                            title: 'خطأ',
                            text: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
                            confirmButtonText: 'حسناً'
                        })
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'خطأ',
                            text: error.message,
                            confirmButtonText: 'حسناً'
                        })
                    }
                    return
                }

                // Navigate to home on success
                navigate('/')
            }
        } catch (error) {
            console.error('Authentication error:', error)
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'حدث خطأ غير متوقع',
                confirmButtonText: 'حسناً'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-md-6 col-lg-5">
                        <div className="card shadow-lg border-0">
                            <div className="card-body p-5">
                                {/* Logo/Title */}
                                <div className="text-center mb-4">
                                    <div className="display-1 mb-3">📚</div>
                                    <h2 className="fw-bold text-primary">
                                        نظام إدارة الدروس الخصوصية
                                    </h2>
                                    <p className="text-muted">
                                        {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
                                    </p>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit}>
                                    {/* Email Input */}
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">
                                            البريد الإلكتروني
                                        </label>
                                        <input
                                            type="email"
                                            className="form-control form-control-lg"
                                            placeholder="example@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={loading}
                                            required
                                        />
                                    </div>

                                    {/* Password Input */}
                                    <div className="mb-4">
                                        <label className="form-label fw-semibold">
                                            كلمة المرور
                                        </label>
                                        <input
                                            type="password"
                                            className="form-control form-control-lg"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={loading}
                                            required
                                            minLength={6}
                                        />
                                        <small className="text-muted">
                                            يجب أن تكون 6 أحرف على الأقل
                                        </small>
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        className="btn btn-primary btn-lg w-100 mb-3"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm ms-2" role="status"></span>
                                                جاري {isSignUp ? 'إنشاء الحساب' : 'تسجيل الدخول'}...
                                            </>
                                        ) : (
                                            <>{isSignUp ? '✨ إنشاء حساب' : '🔐 تسجيل الدخول'}</>
                                        )}
                                    </button>

                                    {/* Toggle Sign Up/Sign In */}
                                    <div className="text-center">
                                        <button
                                            type="button"
                                            className="btn btn-link text-decoration-none"
                                            onClick={() => {
                                                setIsSignUp(!isSignUp)
                                                setEmail('')
                                                setPassword('')
                                            }}
                                            disabled={loading}
                                        >
                                            {isSignUp ? (
                                                <>لديك حساب بالفعل؟ <strong>تسجيل الدخول</strong></>
                                            ) : (
                                                <>ليس لديك حساب؟ <strong>إنشاء حساب جديد</strong></>
                                            )}
                                        </button>
                                    </div>
                                </form>

                                {/* Info Box */}
                                <div className="alert alert-info mt-4 mb-0" role="alert">
                                    <small>
                                        <strong>ℹ️ ملاحظة:</strong> جميع البيانات خاصة بك فقط.
                                        لن يتمكن أي مستخدم آخر من رؤية طلابك أو جداولك.
                                    </small>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="text-center mt-3">
                            <small className="text-muted">
                                Built with ❤️ using React + Supabase
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login
