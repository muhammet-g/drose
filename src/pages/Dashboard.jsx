import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Swal from 'sweetalert2'
import { MdPeople, MdToday, MdCheckCircle, MdPersonAdd, MdCalendarMonth, MdMenuBook, MdAssignment, MdBarChart } from 'react-icons/md'
import { Link } from 'react-router-dom'

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
            <div className="loading-screen">
                <div className="loading-spinner" />
                <span className="loading-text">جاري تحميل الإحصائيات...</span>
            </div>
        )
    }

    return (
        <div className="page-content fade-in">
            {/* Header */}
            <div className="page-header">
                <h1 className="page-title">
                    <span className="page-title-icon"><MdBarChart size={22} /></span>
                    لوحة التحكم
                </h1>
                <p className="page-subtitle">مرحباً بك في نظام إدارة الدروس الخصوصية</p>
            </div>

            {/* Stats Grid */}
            <div className="grid-3" style={{ marginBottom: '2rem' }}>
                <div className="stat-card">
                    <div className="stat-icon-wrap gold"><MdPeople size={28} color="#FFB800" /></div>
                    <div className="stat-value">{stats.totalStudents}</div>
                    <div className="stat-label">إجمالي الطلاب</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-wrap green"><MdToday size={28} color="#10B981" /></div>
                    <div className="stat-value">{stats.todayClasses}</div>
                    <div className="stat-label">حصص اليوم</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-wrap blue"><MdCheckCircle size={28} color="#38BDF8" /></div>
                    <div className="stat-value">{stats.weeklyAttendance}</div>
                    <div className="stat-label">حضور هذا الأسبوع</div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="glass-card">
                <div className="card-header-custom">
                    <MdMenuBook size={18} color="#FFB800" />
                    الإجراءات السريعة
                </div>
                <div className="card-body-custom">
                    <div className="grid-4">
                        <Link to="/students" className="action-card">
                            <div className="action-card-icon"><MdPersonAdd size={24} /></div>
                            إدارة الطلاب
                        </Link>
                        <Link to="/schedule" className="action-card">
                            <div className="action-card-icon" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)', color: '#10B981' }}>
                                <MdCalendarMonth size={24} />
                            </div>
                            جدولة الدروس
                        </Link>
                        <Link to="/daily-classes" className="action-card">
                            <div className="action-card-icon" style={{ background: 'rgba(56,189,248,0.1)', borderColor: 'rgba(56,189,248,0.2)', color: '#38BDF8' }}>
                                <MdMenuBook size={24} />
                            </div>
                            الحصص اليومية
                        </Link>
                        <Link to="/attendance" className="action-card">
                            <div className="action-card-icon" style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)', color: '#F59E0B' }}>
                                <MdAssignment size={24} />
                            </div>
                            الحضور والسجلات
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
