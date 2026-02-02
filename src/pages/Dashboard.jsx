import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Swal from 'sweetalert2'

function Dashboard() {
    const [stats, setStats] = useState({
        totalStudents: 0,
        todayClasses: 0,
        weeklyAttendance: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        try {
            // Get total students count
            const { count: studentsCount, error: studentsError } = await supabase
                .from('students')
                .select('*', { count: 'exact', head: true })

            if (studentsError) throw studentsError

            // Get today's day of week (0 = Sunday, 6 = Saturday)
            const today = new Date()
            const dayOfWeek = today.getDay()

            // Get today's scheduled classes count
            const { count: classesCount, error: classesError } = await supabase
                .from('schedules')
                .select('*', { count: 'exact', head: true })
                .eq('day_of_week', dayOfWeek)

            if (classesError) throw classesError

            // Get this week's attendance count
            const startOfWeek = new Date(today)
            startOfWeek.setDate(today.getDate() - today.getDay())
            startOfWeek.setHours(0, 0, 0, 0)

            const { count: attendanceCount, error: attendanceError } = await supabase
                .from('attendance')
                .select('*', { count: 'exact', head: true })
                .gte('date', startOfWeek.toISOString().split('T')[0])
                .eq('status', 'present')

            if (attendanceError) throw attendanceError

            setStats({
                totalStudents: studentsCount || 0,
                todayClasses: classesCount || 0,
                weeklyAttendance: attendanceCount || 0
            })
        } catch (error) {
            console.error('Error fetching stats:', error)
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'حدث خطأ أثناء تحميل الإحصائيات',
                confirmButtonText: 'حسناً'
            })
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">جاري التحميل...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="container">
            <div className="row mb-4">
                <div className="col">
                    <h1 className="display-4 fw-bold text-primary">لوحة التحكم الرئيسية</h1>
                    <p className="lead text-muted">مرحباً بك في نظام إدارة الدروس الخصوصية</p>
                </div>
            </div>

            <div className="row g-4">
                {/* Total Students Card */}
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body text-center">
                            <div className="display-1 text-primary mb-3">👥</div>
                            <h3 className="card-title h2">{stats.totalStudents}</h3>
                            <p className="card-text text-muted">إجمالي الطلاب</p>
                        </div>
                    </div>
                </div>

                {/* Today's Classes Card */}
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body text-center">
                            <div className="display-1 text-success mb-3">📅</div>
                            <h3 className="card-title h2">{stats.todayClasses}</h3>
                            <p className="card-text text-muted">حصص اليوم</p>
                        </div>
                    </div>
                </div>

                {/* Weekly Attendance Card */}
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body text-center">
                            <div className="display-1 text-info mb-3">✅</div>
                            <h3 className="card-title h2">{stats.weeklyAttendance}</h3>
                            <p className="card-text text-muted">حضور هذا الأسبوع</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="row mt-5">
                <div className="col">
                    <h2 className="h3 mb-4">الإجراءات السريعة</h2>
                    <div className="row g-3">
                        <div className="col-md-3">
                            <a href="/students" className="btn btn-outline-primary w-100 py-3">
                                <div className="h4 mb-2">👨‍🎓</div>
                                إدارة الطلاب
                            </a>
                        </div>
                        <div className="col-md-3">
                            <a href="/schedule" className="btn btn-outline-success w-100 py-3">
                                <div className="h4 mb-2">🗓️</div>
                                جدولة الدروس
                            </a>
                        </div>
                        <div className="col-md-3">
                            <a href="/daily-classes" className="btn btn-outline-info w-100 py-3">
                                <div className="h4 mb-2">📚</div>
                                الحصص اليومية
                            </a>
                        </div>
                        <div className="col-md-3">
                            <a href="/attendance" className="btn btn-outline-warning w-100 py-3">
                                <div className="h4 mb-2">📝</div>
                                الحضور والسجلات
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
