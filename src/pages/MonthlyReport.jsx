import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Swal from 'sweetalert2'

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
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
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
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
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
        <div className="container" dir="rtl">
            {/* ── Header ── */}
            <div className="row mb-4">
                <div className="col">
                    <h1 className="display-5 fw-bold text-primary">📅 السجل الشهري</h1>
                    <p className="lead text-muted">عرض سجل الحضور والغياب الشهري لكل طالب</p>
                </div>
            </div>

            {/* ── Controls row ── */}
            <div className="row mb-4 g-3 align-items-stretch">
                {/* Student selector */}
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-body">
                            <label className="form-label fw-semibold">👤 اختر الطالب</label>
                            {studentsLoading ? (
                                <div className="d-flex align-items-center gap-2">
                                    <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                                    <span className="text-muted">جاري التحميل...</span>
                                </div>
                            ) : (
                                <select
                                    className="form-select form-select-lg"
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
                </div>

                {/* Month picker */}
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-body">
                            <label className="form-label fw-semibold">📆 اختر الشهر</label>
                            <input
                                type="month"
                                className="form-control form-control-lg"
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Reset buttons */}
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-body d-flex flex-column justify-content-center gap-2">
                            <button className="btn btn-danger" onClick={handleResetAll}>
                                🗑️ تصفير سجلات جميع الطلاب
                            </button>
                            <button
                                className="btn btn-warning"
                                onClick={handleResetStudent}
                                disabled={!selectedStudent}
                            >
                                🔄 تصفير سجلات الطالب المختار
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Stats ── */}
            {stats && (
                <div className="row mb-4">
                    <div className="col">
                        <div className="card shadow-sm border-0" style={{ background: 'linear-gradient(135deg,#f8f9fa,#e9ecef)' }}>
                            <div className="card-body py-3">
                                <h6 className="card-title mb-3 fw-semibold">
                                    📊 إحصائيات {studentName} — {monthLabel}
                                </h6>
                                <div className="row text-center g-2">
                                    {[
                                        { label: 'الإجمالي', val: stats.total, cls: 'text-dark' },
                                        { label: 'حاضر', val: stats.present, cls: 'text-success' },
                                        { label: 'غائب', val: stats.absent, cls: 'text-danger' },
                                        { label: 'بعذر', val: stats.excused, cls: 'text-warning' },
                                        { label: 'مؤجل', val: stats.postponed, cls: 'text-secondary' },
                                    ].map(({ label, val, cls }) => (
                                        <div key={label} className="col">
                                            <div className={`h3 mb-0 fw-bold ${cls}`}>{val}</div>
                                            <small className="text-muted">{label}</small>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Grid ── */}
            {selectedStudent && selectedMonth ? (
                <div className="row">
                    <div className="col">
                        <div className="card shadow-sm border-0">
                            <div className="card-body">
                                <h5 className="card-title mb-1 fw-semibold">
                                    السجل الشهري
                                    <span className="text-muted fw-normal"> — {studentName} | {monthLabel}</span>
                                </h5>

                                {/* Legend */}
                                <div className="d-flex flex-wrap gap-3 mb-4 mt-2">
                                    {Object.entries(STATUS_INFO).map(([key, info]) => (
                                        <div key={key} className="d-flex align-items-center gap-2">
                                            <div style={{
                                                width: 18, height: 18, borderRadius: 4,
                                                backgroundColor: info.color,
                                                border: '1px solid rgba(0,0,0,.12)',
                                                flexShrink: 0
                                            }} />
                                            <small className="text-muted">{info.text}</small>
                                        </div>
                                    ))}
                                </div>

                                {loading ? (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">جاري التحميل...</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(7, minmax(70px, 1fr))',
                                            gap: '8px',
                                            minWidth: '500px'
                                        }}>
                                            {days.map(day => {
                                                const status = getStatusForDay(day)
                                                const info = STATUS_INFO[status]
                                                return (
                                                    <div
                                                        key={day}
                                                        style={{
                                                            backgroundColor: info.color,
                                                            color: info.textColor,
                                                            borderRadius: '10px',
                                                            padding: '10px 6px',
                                                            textAlign: 'center',
                                                            border: '1px solid rgba(0,0,0,.08)',
                                                            minHeight: '80px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '3px',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,.08)',
                                                            transition: 'transform .15s',
                                                            cursor: 'default'
                                                        }}
                                                        title={`يوم ${day}: ${info.text}`}
                                                    >
                                                        <div style={{ fontSize: '11px', opacity: 0.75, fontWeight: 500 }}>
                                                            {getDayLabel(day)}
                                                        </div>
                                                        <div style={{ fontSize: '22px', fontWeight: 'bold', lineHeight: 1.1 }}>
                                                            {day}
                                                        </div>
                                                        <div style={{ fontSize: '16px', lineHeight: 1 }}>
                                                            {info.icon}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="alert alert-info text-center fs-5" role="alert">
                    👆 يرجى اختيار طالب لعرض السجل الشهري
                </div>
            )}
        </div>
    )
}

export default MonthlyReport
