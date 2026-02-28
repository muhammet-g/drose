import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import Swal from '../lib/swal'
import { MdEmail, MdLock, MdLogin, MdPersonAdd, MdMenuBook, MdInfoOutline } from 'react-icons/md'

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
            Swal.fire({ icon: 'warning', title: 'تنبيه', text: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور', confirmButtonText: 'حسناً' })
            return
        }

        if (password.length < 6) {
            Swal.fire({ icon: 'warning', title: 'تنبيه', text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', confirmButtonText: 'حسناً' })
            return
        }

        setLoading(true)

        try {
            if (isSignUp) {
                const { data, error } = await signUp(email, password)
                if (error) {
                    const msg = error.message.includes('already registered')
                        ? 'هذا البريد الإلكتروني مسجل مسبقاً'
                        : error.message
                    Swal.fire({ icon: 'error', title: 'خطأ', text: msg, confirmButtonText: 'حسناً' })
                    return
                }
                Swal.fire({ icon: 'success', title: 'تم التسجيل بنجاح', text: 'تم إنشاء الحساب. يرجى تسجيل الدخول الآن.', confirmButtonText: 'حسناً' })
                    .then(() => { setIsSignUp(false) })
            } else {
                const { data, error } = await signIn(email, password)
                if (error) {
                    const msg = error.message.includes('Invalid login credentials')
                        ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
                        : error.message
                    Swal.fire({ icon: 'error', title: 'خطأ', text: msg, confirmButtonText: 'حسناً' })
                    return
                }
                navigate('/')
            }
        } catch (error) {
            console.error('Authentication error:', error)
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'حدث خطأ غير متوقع', confirmButtonText: 'حسناً' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-wrapper">
            <div className="login-card fade-in">
                {/* Logo */}
                <div className="login-logo">
                    <MdMenuBook size={30} />
                </div>

                <h1 className="login-title">نظام إدارة الدروس الخصوصية</h1>
                <p className="login-subtitle">
                    {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول إلى حسابك'}
                </p>

                <form className="login-form" onSubmit={handleSubmit}>
                    {/* Email */}
                    <div>
                        <label className="form-label-custom">
                            <MdEmail size={14} style={{ verticalAlign: 'middle', marginLeft: '4px' }} />
                            البريد الإلكتروني
                        </label>
                        <input
                            type="email"
                            className="form-control-custom form-control-lg-custom"
                            placeholder="example@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            required
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="form-label-custom">
                            <MdLock size={14} style={{ verticalAlign: 'middle', marginLeft: '4px' }} />
                            كلمة المرور
                        </label>
                        <input
                            type="password"
                            className="form-control-custom form-control-lg-custom"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            required
                            minLength={6}
                        />
                        <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '0.35rem' }}>
                            يجب أن تكون 6 أحرف على الأقل
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        className="btn-primary-custom full lg"
                        disabled={loading}
                        style={{ marginTop: '0.5rem' }}
                    >
                        {loading ? (
                            <>
                                <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#0B1221' }} />
                                {isSignUp ? 'جاري إنشاء الحساب...' : 'جاري تسجيل الدخول...'}
                            </>
                        ) : isSignUp ? (
                            <><MdPersonAdd size={18} /> إنشاء حساب</>
                        ) : (
                            <><MdLogin size={18} /> تسجيل الدخول</>
                        )}
                    </button>
                </form>

                {/* Toggle */}
                <div className="login-divider">
                    {isSignUp ? (
                        <>لديك حساب بالفعل؟
                            <button onClick={() => { setIsSignUp(false); setEmail(''); setPassword('') }} disabled={loading}>
                                تسجيل الدخول
                            </button>
                        </>
                    ) : (
                        <>ليس لديك حساب؟
                            <button onClick={() => { setIsSignUp(true); setEmail(''); setPassword('') }} disabled={loading}>
                                إنشاء حساب جديد
                            </button>
                        </>
                    )}
                </div>

                {/* Note */}
                <div className="login-note">
                    <MdInfoOutline size={14} style={{ verticalAlign: 'middle', marginLeft: '5px' }} />
                    <strong>ملاحظة:</strong> جميع البيانات خاصة بك فقط. لن يتمكن أي مستخدم آخر من رؤية طلابك أو جداولك.
                </div>
            </div>
        </div>
    )
}

export default Login
