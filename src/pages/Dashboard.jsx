import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import Swal from '../lib/swal'
import {
    MdPeople,
    MdToday,
    MdCheckCircle,
    MdPersonAdd,
    MdCalendarMonth,
    MdMenuBook,
    MdAssignment,
    MdBarChart,
    MdAccessTime,
    MdEventAvailable,
    MdArrowForward,
    MdGridView
} from 'react-icons/md'
import { Link } from 'react-router-dom'

const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const MONTH_NAMES = {
    '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
    '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
    '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر'
}

const STATUS_META = {
    present: { label: 'حاضر', className: 'badge-success' },
    absent: { label: 'غائب', className: 'badge-danger' },
    excused: { label: 'بعذر', className: 'badge-warning' },
    postponed: { label: 'مؤجل', className: 'badge-muted' },
    none: { label: 'غير مسجل', className: 'badge-muted' }
}

const createEmptyCounts = () => ({
    present: 0,
    absent: 0,
    excused: 0,
    postponed: 0,
    total: 0
})

const buildCounts = (rows = []) => rows.reduce((acc, row) => {
    const status = row.status || 'present'
    acc[status] = (acc[status] || 0) + 1
    acc.total += 1
    return acc
}, createEmptyCounts())

function Dashboard() {
    const [totalStudents, setTotalStudents] = useState(0)
    const [todaySchedules, setTodaySchedules] = useState([])
    const [todayAttendanceRows, setTodayAttendanceRows] = useState([])
    const [weeklyCounts, setWeeklyCounts] = useState(createEmptyCounts())
    const [monthlyCounts, setMonthlyCounts] = useState(createEmptyCounts())
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        try {
            const today = new Date()
            const todayDate = today.toISOString().split('T')[0]
            const dayOfWeek = today.getDay()
            const weekStart = new Date(today)
            weekStart.setDate(today.getDate() - today.getDay())
            weekStart.setHours(0, 0, 0, 0)
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekStart.getDate() + 6)
            const weekStartDate = weekStart.toISOString().split('T')[0]
            const weekEndDate = weekEnd.toISOString().split('T')[0]
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
            const monthStartDate = monthStart.toISOString().split('T')[0]
            const monthEndDate = monthEnd.toISOString().split('T')[0]

            const [studentsRes, schedulesRes, attendanceTodayRes, attendanceWeekRes, attendanceMonthRes] = await Promise.all([
                supabase.from('students').select('*', { count: 'exact', head: true }),
                supabase
                    .from('schedules')
                    .select(`
                      id,
                      student_id,
                      start_time,
                      end_time,
                      valid_from,
                      valid_until,
                      students (name)
                    `)
                    .eq('day_of_week', dayOfWeek)
                    .lte('valid_from', todayDate)
                    .or(`valid_until.is.null,valid_until.gt.${todayDate}`)
                    .order('start_time'),
                supabase
                    .from('attendance')
                    .select('student_id, status')
                    .eq('date', todayDate),
                supabase
                    .from('attendance')
                    .select('status')
                    .gte('date', weekStartDate)
                    .lte('date', weekEndDate),
                supabase
                    .from('attendance')
                    .select('status')
                    .gte('date', monthStartDate)
                    .lte('date', monthEndDate)
            ])

            if (studentsRes.error) throw studentsRes.error
            if (schedulesRes.error) throw schedulesRes.error
            if (attendanceTodayRes.error) throw attendanceTodayRes.error
            if (attendanceWeekRes.error) throw attendanceWeekRes.error
            if (attendanceMonthRes.error) throw attendanceMonthRes.error

            setTotalStudents(studentsRes.count || 0)
            setTodaySchedules(schedulesRes.data || [])
            setTodayAttendanceRows(attendanceTodayRes.data || [])
            setWeeklyCounts(buildCounts(attendanceWeekRes.data || []))
            setMonthlyCounts(buildCounts(attendanceMonthRes.data || []))
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

    const todayAttendanceCounts = useMemo(() => buildCounts(todayAttendanceRows), [todayAttendanceRows])
    const todaySchedulesSorted = useMemo(() => (
        [...todaySchedules].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
    ), [todaySchedules])

    const todayAttendanceMap = useMemo(() => {
        const map = {}
        todayAttendanceRows.forEach(row => {
            map[row.student_id] = row.status
        })
        return map
    }, [todayAttendanceRows])

    const todayDate = new Date()
    const todayLabel = todayDate.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })
    const monthKey = String(todayDate.getMonth() + 1).padStart(2, '0')
    const monthLabel = `${MONTH_NAMES[monthKey]} ${todayDate.getFullYear()}`
    const nowMinutes = todayDate.getHours() * 60 + todayDate.getMinutes()
    const todayClasses = todaySchedulesSorted.length
    const todayAttendanceTotal = todayAttendanceCounts.total
    const todayAttendanceRate = todayClasses ? Math.round((todayAttendanceCounts.present / todayClasses) * 100) : 0
    const weeklyRate = weeklyCounts.total ? Math.round((weeklyCounts.present / weeklyCounts.total) * 100) : 0
    const monthlyRate = monthlyCounts.total ? Math.round((monthlyCounts.present / monthlyCounts.total) * 100) : 0

    const formatTime = (value) => (value ? value.slice(0, 5) : '--:--')
    const toMinutes = (value) => {
        if (!value) return 0
        const [h, m] = value.split(':').map(Number)
        return (h * 60) + m
    }

    const nextClass = todaySchedulesSorted.find(item => toMinutes(item.start_time) > nowMinutes)

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
            <div className="dashboard-hero">
                <div className="hero-panel">
                    <span className="hero-badge">اليوم: {todayLabel}</span>
                    <h1 className="hero-title">لوحة التحكم</h1>
                    <div className="hero-metrics">
                        <div className="hero-metric">
                            <span>حصص اليوم</span>
                            <strong>{todayClasses}</strong>
                        </div>
                        <div className="hero-metric">
                            <span>الحضور اليوم</span>
                            <strong>{todayAttendanceCounts.present}</strong>
                        </div>
                    </div>
                    <div className="hero-actions">
                        <Link to="/daily-classes" className="btn-primary-custom sm">عرض أجندة اليوم</Link>
                        <Link to="/attendance" className="btn-ghost sm">تسجيل الحضور</Link>
                    </div>
                </div>
                <div className="hero-card hero-next">
                    <div className="hero-card-title">
                        <MdEventAvailable size={18} />
                        الحصة القادمة
                    </div>
                    {nextClass ? (
                        <>
                            <div className="hero-next-student">{nextClass.students?.name || '—'}</div>
                            <div className="hero-next-time">
                                <MdAccessTime size={14} />
                                {formatTime(nextClass.start_time)} - {formatTime(nextClass.end_time)}
                            </div>
                        </>
                    ) : (
                        <div className="hero-next-empty">لا توجد حصص متبقية اليوم</div>
                    )}
                    <Link to="/daily-classes" className="hero-link">
                        عرض كل حصص اليوم
                        <MdArrowForward size={14} />
                    </Link>
                </div>
            </div>

            <div className="dashboard-kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon gold"><MdPeople size={20} /></div>
                    <div>
                        <div className="kpi-value">{totalStudents}</div>
                        <div className="kpi-label">إجمالي الطلاب</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon green"><MdToday size={20} /></div>
                    <div>
                        <div className="kpi-value">{todayClasses}</div>
                        <div className="kpi-label">حصص اليوم</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon blue"><MdCheckCircle size={20} /></div>
                    <div>
                        <div className="kpi-value">{todayAttendanceCounts.present}</div>
                        <div className="kpi-label">حضور اليوم</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon orange"><MdCheckCircle size={20} /></div>
                    <div>
                        <div className="kpi-value">{weeklyCounts.present}</div>
                        <div className="kpi-label">حضور الأسبوع</div>
                        <div className="kpi-sub">نسبة {weeklyRate}%</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon gold"><MdBarChart size={20} /></div>
                    <div>
                        <div className="kpi-value">{monthlyCounts.present}</div>
                        <div className="kpi-label">حضور الشهر</div>
                        <div className="kpi-sub">نسبة {monthlyRate}%</div>
                    </div>
                </div>
            </div>

            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header-custom">
                    <MdToday size={18} color="#FFB800" />
                    أجندة اليوم
                    <span className="badge-custom badge-gold" style={{ marginRight: 'auto' }}>{todayClasses} حصة</span>
                </div>
                <div className="card-body-custom">
                    {todaySchedulesSorted.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon"><MdToday size={30} /></div>
                            <p className="empty-state-title">لا توجد حصص مجدولة لهذا اليوم</p>
                        </div>
                    ) : (
                        <div className="agenda-list">
                            {todaySchedulesSorted.map(item => {
                                const status = todayAttendanceMap[item.student_id] || 'none'
                                const statusMeta = STATUS_META[status] || STATUS_META.none
                                return (
                                    <div className="agenda-item" key={item.id}>
                                        <div className="agenda-info">
                                            <div className="agenda-student">{item.students?.name || '—'}</div>
                                            <div className="agenda-time">
                                                <MdAccessTime size={14} />
                                                {formatTime(item.start_time)} - {formatTime(item.end_time)}
                                            </div>
                                        </div>
                                        <span className={`badge-custom ${statusMeta.className}`}>
                                            {statusMeta.label}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header-custom">
                    <MdCheckCircle size={18} color="#10B981" />
                    الحضور اليوم
                    <span className="text-slate" style={{ fontWeight: 400, marginRight: '0.25rem', fontSize: '0.88rem' }}>
                        — {DAY_NAMES[todayDate.getDay()]}
                    </span>
                </div>
                <div className="card-body-custom">
                    <div className="attendance-progress">
                        <div
                            className="attendance-progress-bar"
                            style={{ width: `${todayAttendanceRate}%` }}
                        />
                    </div>
                    <div className="attendance-summary">
                        <div className="attendance-metric">
                            <span>حاضر</span>
                            <strong>{todayAttendanceCounts.present}</strong>
                        </div>
                        <div className="attendance-metric">
                            <span>غائب</span>
                            <strong>{todayAttendanceCounts.absent}</strong>
                        </div>
                        <div className="attendance-metric">
                            <span>بعذر</span>
                            <strong>{todayAttendanceCounts.excused}</strong>
                        </div>
                        <div className="attendance-metric">
                            <span>مؤجل</span>
                            <strong>{todayAttendanceCounts.postponed}</strong>
                        </div>
                    </div>
                    <div className="attendance-footer">
                        <span className="text-slate">تم تسجيل {todayAttendanceTotal} من {todayClasses} حصص</span>
                        <Link to="/attendance" className="btn-primary-custom sm">تسجيل الحضور</Link>
                    </div>
                </div>
            </div>

            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header-custom">
                    <MdCalendarMonth size={18} color="#FFB800" />
                    نظرة شهرية
                    <span className="text-slate" style={{ fontWeight: 400, marginRight: '0.25rem', fontSize: '0.88rem' }}>
                        — {monthLabel}
                    </span>
                    <Link to="/monthly-overview" className="btn-ghost sm" style={{ marginRight: 'auto' }}>
                        عرض التفاصيل
                    </Link>
                </div>
                <div className="card-body-custom">
                    <div className="snapshot-grid">
                        <div className="snapshot-pill success">
                            <span>حاضر</span>
                            <strong>{monthlyCounts.present}</strong>
                        </div>
                        <div className="snapshot-pill error">
                            <span>غائب</span>
                            <strong>{monthlyCounts.absent}</strong>
                        </div>
                        <div className="snapshot-pill warning">
                            <span>بعذر</span>
                            <strong>{monthlyCounts.excused}</strong>
                        </div>
                        <div className="snapshot-pill muted">
                            <span>مؤجل</span>
                            <strong>{monthlyCounts.postponed}</strong>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-card">
                <div className="card-header-custom">
                    <MdMenuBook size={18} color="#FFB800" />
                    إجراءات سريعة
                </div>
                <div className="card-body-custom">
                    <div className="grid-4">
                        <Link to="/daily-classes" className="action-card">
                            <div className="action-card-icon" style={{ background: 'rgba(56,189,248,0.1)', borderColor: 'rgba(56,189,248,0.2)', color: '#38BDF8' }}>
                                <MdToday size={24} />
                            </div>
                            الحصص اليومية
                        </Link>
                        <Link to="/attendance" className="action-card">
                            <div className="action-card-icon" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)', color: '#10B981' }}>
                                <MdAssignment size={24} />
                            </div>
                            الحضور والسجلات
                        </Link>
                        <Link to="/schedule" className="action-card">
                            <div className="action-card-icon" style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)', color: '#F59E0B' }}>
                                <MdCalendarMonth size={24} />
                            </div>
                            جدولة الدروس
                        </Link>
                        <Link to="/monthly-overview" className="action-card">
                            <div className="action-card-icon" style={{ background: 'rgba(255,184,0,0.1)', borderColor: 'rgba(255,184,0,0.2)', color: '#FFB800' }}>
                                <MdGridView size={24} />
                            </div>
                            الملخص الشهري
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
