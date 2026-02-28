import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Swal from '../lib/swal'
import { MdBarChart, MdPerson, MdCalendarMonth, MdDeleteSweep, MdRefresh, MdCheckCircle, MdCancel, MdSchedule, MdNotes } from 'react-icons/md'

const STATUS_INFO = {
    present: { text: 'حاضر', color: '#198754', textColor: '#fff', icon: '✅' },
    absent: { text: 'غائب', color: '#dc3545', textColor: '#fff', icon: '❌' },
    excused: { text: 'غياب بعذر', color: '#ffc107', textColor: '#000', icon: '📝' },
    postponed: { text: 'مؤجل', color: '#6c757d', textColor: '#fff', icon: '⏰' },
    none: { text: 'لا يوجد', color: '#f1f3f5', textColor: '#adb5bd', icon: '—' }
}

const MONTH_NAMES = {
    '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
    '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
    '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر'
}

function MonthlyReport() {
    const [students, setStudents] = useState([])
    const [selectedStudent, setSelectedStudent] = useState('')
    const [selectedMonth, setSelectedMonth] = useState('')
    const [attendanceMap, setAttendanceMap] = useState({})   // { 'YYYY-MM-DD': status }
    const [loading, setLoading] = useState(false)
    const [studentsLoading, setStudentsLoading] = useState(true)

    /* ── init ── */
    useEffect(() => {
        fetchStudents()
        const now = new Date()
        setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    }, [])

    useEffect(() => {
        if (selectedStudent && selectedMonth) fetchMonthlyAttendance()
        else setAttendanceMap({})
    }, [selectedStudent, selectedMonth])

    /* ── data fetching ── */
    const fetchStudents = async () => {
        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .order('name', { ascending: true })
            if (error) throw error
            setStudents(data || [])
        } catch (err) {
            console.error(err)
        } finally {
            setStudentsLoading(false)
        }
    }

    const fetchMonthlyAttendance = async () => {
        setLoading(true)
        try {
            const [year, month] = selectedMonth.split('-')
            const lastDay = new Date(year, month, 0).getDate()
            const startDate = `${year}-${month}-01`
            const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

            const { data, error } = await supabase
                .from('attendance')
                .select('date, status')
                .eq('student_id', selectedStudent)
                .gte('date', startDate)
                .lte('date', endDate)
            if (error) throw error

            const map = {}
                ; (data || []).forEach(r => { map[r.date] = r.status })
            setAttendanceMap(map)
        } catch (err) {
            console.error(err)
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'حدث خطأ أثناء تحميل السجلات', confirmButtonText: 'حسناً' })
        } finally {
            setLoading(false)
        }
    }

    /* ── reset handlers ── */
    const handleResetAll = async () => {
        const result = await Swal.fire({
            title: 'تصفير جميع السجلات',
            text: 'سيتم حذف جميع سجلات الحضور لجميع الطلاب نهائياً. هل أنت متأكد؟',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، تصفير الكل',
            cancelButtonText: 'إلغاء'
        })
        if (!result.isConfirmed) return

        try {
            // Delete every row by matching id with itself (no .neq hack needed in recent supabase)
            const { error } = await supabase
                .from('attendance')
                .delete()
                .gte('date', '1900-01-01')   // matches every row
            if (error) throw error

            Swal.fire({ icon: 'success', title: 'تم التصفير', text: 'تم حذف جميع سجلات الحضور بنجاح', timer: 2000, showConfirmButton: false })
            setAttendanceMap({})
        } catch (err) {
            console.error(err)
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'حدث خطأ أثناء تصفير السجلات', confirmButtonText: 'حسناً' })
        }
    }

    const handleResetStudent = async () => {
        if (!selectedStudent) {
            Swal.fire({ icon: 'warning', title: 'تنبيه', text: 'يرجى اختيار طالب أولاً', confirmButtonText: 'حسناً' })
            return
        }
        const studentName = students.find(s => s.id === selectedStudent)?.name

        const result = await Swal.fire({
            title: `تصفير سجلات: ${studentName}`,
            text: 'سيتم حذف جميع سجلات الحضور لهذا الطالب نهائياً. هل أنت متأكد؟',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، تصفير',
            cancelButtonText: 'إلغاء'
        })
        if (!result.isConfirmed) return

        try {
            const { error } = await supabase
                .from('attendance')
                .delete()
                .eq('student_id', selectedStudent)
            if (error) throw error

            Swal.fire({ icon: 'success', title: 'تم التصفير', text: `تم حذف جميع سجلات الطالب "${studentName}" بنجاح`, timer: 2000, showConfirmButton: false })
            setAttendanceMap({})
        } catch (err) {
            console.error(err)
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'حدث خطأ أثناء تصفير السجلات', confirmButtonText: 'حسناً' })
        }
    }

    /* ── helpers ── */
    const getDaysInMonth = () => {
        if (!selectedMonth) return []
        const [year, month] = selectedMonth.split('-')
        const count = new Date(year, month, 0).getDate()
        return Array.from({ length: count }, (_, i) => i + 1)
    }

    const getStatusForDay = (day) => {
        if (!selectedMonth) return 'none'
        const [year, month] = selectedMonth.split('-')
        const key = `${year}-${month}-${String(day).padStart(2, '0')}`
        return attendanceMap[key] || 'none'
    }

    const getDayLabel = (day) => {
        const [year, month] = selectedMonth.split('-')
        return new Date(year, month - 1, day).toLocaleDateString('ar-EG', { weekday: 'short' })
    }

    const getStats = () => {
        const vals = Object.values(attendanceMap)
        return {
            total: vals.length,
            present: vals.filter(v => v === 'present').length,
            absent: vals.filter(v => v === 'absent').length,
            excused: vals.filter(v => v === 'excused').length,
            postponed: vals.filter(v => v === 'postponed').length,
        }
    }

    const days = getDaysInMonth()
    const stats = Object.keys(attendanceMap).length > 0 ? getStats() : null
    const [yr, mo] = selectedMonth ? selectedMonth.split('-') : ['', '']
    const monthLabel = mo ? `${MONTH_NAMES[mo]} ${yr}` : ''
    const studentName = students.find(s => s.id === selectedStudent)?.name || ''

    /* ── render ── */
    return (
        <div className="page-content fade-in" dir="rtl">
            {/* Header */}
            <div className="page-header">
                <h1 className="page-title">
                    <span className="page-title-icon"><MdBarChart size={22} /></span>
                    السجل الشهري
                </h1>
                <p className="page-subtitle">عرض سجل الحضور والغياب الشهري لكل طالب</p>
            </div>

            {/* Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Student selector */}
                <div className="glass-card">
                    <div className="card-header-custom">
                        <MdPerson size={16} color="#FFB800" />
                        اختر الطالب
                    </div>
                    <div className="card-body-custom">
                        {studentsLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94A3B8', fontSize: '0.85rem' }}>
                                <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                جاري التحميل...
                            </div>
                        ) : (
                            <select
                                className="form-control-custom form-select-custom form-control-lg-custom"
                                value={selectedStudent}
                                onChange={e => setSelectedStudent(e.target.value)}
                            >
                                <option value="">-- اختر طالباً --</option>
                                {students.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Month picker */}
                <div className="glass-card">
                    <div className="card-header-custom">
                        <MdCalendarMonth size={16} color="#FFB800" />
                        اختر الشهر
                    </div>
                    <div className="card-body-custom">
                        <input
                            type="month"
                            className="form-control-custom form-control-lg-custom"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                        />
                    </div>
                </div>

                {/* Reset buttons */}
                <div className="glass-card">
                    <div className="card-header-custom">
                        <MdDeleteSweep size={16} color="#EF4444" />
                        <span style={{ color: '#EF4444' }}>إعادة تعيين</span>
                    </div>
                    <div className="card-body-custom" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <button className="btn-danger-custom" style={{ justifyContent: 'center' }} onClick={handleResetAll}>
                            <MdDeleteSweep size={15} />
                            تصفير سجلات جميع الطلاب
                        </button>
                        <button
                            className="btn-warning-custom"
                            style={{ justifyContent: 'center' }}
                            onClick={handleResetStudent}
                            disabled={!selectedStudent}
                        >
                            <MdRefresh size={15} />
                            تصفير سجلات الطالب المختار
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
                    <div className="stat-card">
                        <div className="stat-icon-wrap gold"><MdNotes size={22} color="#FFB800" /></div>
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">الإجمالي</div>
                    </div>
                    <div className="stat-card success">
                        <div className="stat-icon-wrap green"><MdCheckCircle size={22} color="#10B981" /></div>
                        <div className="stat-value text-success-c">{stats.present}</div>
                        <div className="stat-label">حاضر</div>
                    </div>
                    <div className="stat-card error">
                        <div className="stat-icon-wrap red"><MdCancel size={22} color="#EF4444" /></div>
                        <div className="stat-value text-error-c">{stats.absent}</div>
                        <div className="stat-label">غائب</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon-wrap orange"><MdSchedule size={22} color="#F59E0B" /></div>
                        <div className="stat-value text-warning-c">{stats.excused + stats.postponed}</div>
                        <div className="stat-label">بعذر / مؤجل</div>
                    </div>
                </div>
            )}

            {/* Calendar Grid */}
            {selectedStudent && selectedMonth ? (
                <div className="glass-card">
                    <div className="card-header-custom">
                        <MdBarChart size={18} color="#FFB800" />
                        السجل الشهري
                        <span className="text-slate" style={{ fontWeight: 400, marginRight: '0.25rem', fontSize: '0.88rem' }}>
                            — {studentName} | {monthLabel}
                        </span>
                    </div>
                    <div className="card-body-custom">
                        {/* Legend */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            {Object.entries(STATUS_INFO).map(([key, info]) => (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <div style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: info.color, flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }} />
                                    <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{info.text}</span>
                                </div>
                            ))}
                        </div>

                        {loading ? (
                            <div className="empty-state">
                                <div className="loading-spinner" />
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(7, minmax(72px, 1fr))',
                                    gap: '8px',
                                    minWidth: 520
                                }}>
                                    {days.map(day => {
                                        const status = getStatusForDay(day)
                                        const info = STATUS_INFO[status]
                                        return (
                                            <div
                                                key={day}
                                                className="calendar-day"
                                                style={{
                                                    backgroundColor: info.color,
                                                    color: info.textColor,
                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                    minHeight: 80,
                                                    padding: '8px 4px'
                                                }}
                                                title={`يوم ${day}: ${info.text}`}
                                            >
                                                <div style={{ fontSize: '0.68rem', opacity: 0.75 }}>{getDayLabel(day)}</div>
                                                <div style={{ fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.1 }}>{day}</div>
                                                <div style={{ fontSize: '0.95rem' }}>{info.icon}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="glass-card">
                    <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                        <div className="empty-state-icon"><MdBarChart size={30} /></div>
                        <p className="empty-state-title">يرجى اختيار طالب لعرض السجل الشهري</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MonthlyReport
