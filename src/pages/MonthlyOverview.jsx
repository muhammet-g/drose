import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import Swal from '../lib/swal'
import { MdGridView, MdCalendarMonth, MdPerson } from 'react-icons/md'

const STATUS_INFO = {
    present: { text: 'حاضر', color: '#10B981', textColor: '#0B1221' },
    absent: { text: 'غائب', color: '#EF4444', textColor: '#fff' },
    excused: { text: 'غياب بعذر', color: '#F59E0B', textColor: '#0B1221' },
    postponed: { text: 'مؤجل', color: '#94A3B8', textColor: '#0B1221' },
    none: { text: 'لا يوجد', color: '#111827', textColor: '#94A3B8' }
}

const MONTH_NAMES = {
    '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
    '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
    '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر'
}

function MonthlyOverview() {
    const [selectedMonth, setSelectedMonth] = useState('')
    const [students, setStudents] = useState([])
    const [attendanceMap, setAttendanceMap] = useState({})
    const [scheduleMap, setScheduleMap] = useState({})
    const [attendanceRows, setAttendanceRows] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const now = new Date()
        setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    }, [])

    useEffect(() => {
        if (!selectedMonth) return
        fetchMonthlyOverview()
    }, [selectedMonth])

    const getMonthRange = () => {
        const [year, month] = selectedMonth.split('-')
        const lastDay = new Date(year, month, 0).getDate()
        const startDate = `${year}-${month}-01`
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
        return { year, month, lastDay, startDate, endDate }
    }

    const fetchMonthlyOverview = async () => {
        setLoading(true)
        try {
            const { startDate, endDate } = getMonthRange()

            const { data: studentsData, error: studentsError } = await supabase
                .from('students')
                .select('*')
                .order('name', { ascending: true })
            if (studentsError) throw studentsError

            const { data: attendanceData, error: attendanceError } = await supabase
                .from('attendance')
                .select('id, student_id, date, status')
                .gte('date', startDate)
                .lte('date', endDate)
            if (attendanceError) throw attendanceError

            const { data: scheduleData, error: scheduleError } = await supabase
                .from('schedules')
                .select('student_id, day_of_week, start_time, end_time, valid_from, valid_until')
                .lte('valid_from', endDate)
                .or(`valid_until.is.null,valid_until.gte.${startDate}`)
            if (scheduleError) throw scheduleError

            const map = {}
                ; (attendanceData || []).forEach(row => {
                    const key = `${row.student_id}|${row.date}`
                    map[key] = { id: row.id, status: row.status }
                })

            const schedulesByStudent = {}
                ; (scheduleData || []).forEach(row => {
                    if (!schedulesByStudent[row.student_id]) {
                        schedulesByStudent[row.student_id] = []
                    }
                    schedulesByStudent[row.student_id].push({
                        dayOfWeek: row.day_of_week,
                        startTime: row.start_time,
                        endTime: row.end_time,
                        validFrom: row.valid_from || '1900-01-01',
                        validUntil: row.valid_until || '9999-12-31'
                    })
                })

            setStudents(studentsData || [])
            setAttendanceMap(map)
            setScheduleMap(schedulesByStudent)
            setAttendanceRows(attendanceData || [])
        } catch (err) {
            console.error(err)
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'تعذر تحميل البيانات', confirmButtonText: 'حسناً' })
        } finally {
            setLoading(false)
        }
    }

    const days = useMemo(() => {
        if (!selectedMonth) return []
        const { lastDay } = getMonthRange()
        return Array.from({ length: lastDay }, (_, i) => i + 1)
    }, [selectedMonth])

    const getDayLabel = (day) => {
        const { year, month } = getMonthRange()
        return new Date(year, month - 1, day).toLocaleDateString('ar-EG', { weekday: 'short' })
    }

    const getCellInfo = (studentId, day) => {
        const { year, month } = getMonthRange()
        const dayOfWeek = new Date(year, month - 1, day).getDay()
        const date = `${year}-${month}-${String(day).padStart(2, '0')}`
        const key = `${studentId}|${date}`
        const record = attendanceMap[key]
        const status = record?.status || 'none'
        return { date, key, status, recordId: record?.id, dayOfWeek }
    }

    const isScheduledDay = (studentId, date, dayOfWeek) => {
        const schedules = scheduleMap[studentId] || []
        return schedules.some(schedule => (
            schedule.dayOfWeek === dayOfWeek &&
            date >= schedule.validFrom &&
            date <= schedule.validUntil
        ))
    }

    const getScheduledMinutes = (studentId, date, dayOfWeek) => {
        const schedules = scheduleMap[studentId] || []
        const timeToMinutes = (timeValue) => {
            if (!timeValue) return 0
            const [hours, minutes] = timeValue.split(':').map(Number)
            return (hours * 60) + minutes
        }
        return schedules.reduce((total, schedule) => {
            if (schedule.dayOfWeek !== dayOfWeek) return total
            if (date < schedule.validFrom || date > schedule.validUntil) return total
            const start = timeToMinutes(schedule.startTime)
            const end = timeToMinutes(schedule.endTime)
            if (!start || !end || end <= start) return total
            return total + (end - start)
        }, 0)
    }

    const scheduleMinutesMap = useMemo(() => {
        if (!selectedMonth) return {}
        const { year, month } = getMonthRange()
        const map = {}
        days.forEach(day => {
            const date = `${year}-${month}-${String(day).padStart(2, '0')}`
            const dayOfWeek = new Date(year, month - 1, day).getDay()
            students.forEach(student => {
                const minutes = getScheduledMinutes(student.id, date, dayOfWeek)
                if (minutes > 0) {
                    map[`${student.id}|${date}`] = minutes
                }
            })
        })
        return map
    }, [selectedMonth, days, students, scheduleMap])

    const stats = useMemo(() => {
        const attendanceCounts = {
            present: 0,
            absent: 0,
            excused: 0,
            postponed: 0
        }
        const excusedEntries = []
        let totalSessions = 0
        let totalMinutes = 0
        let absentMinutes = 0
        let excusedMinutes = 0

        Object.values(scheduleMinutesMap).forEach(minutes => {
            totalSessions += 1
            totalMinutes += minutes
        })

        attendanceRows.forEach(row => {
            if (!attendanceCounts[row.status]) attendanceCounts[row.status] = 0
            attendanceCounts[row.status] += 1

            const minutes = scheduleMinutesMap[`${row.student_id}|${row.date}`] || 0
            if (row.status === 'absent') absentMinutes += minutes
            if (row.status === 'excused') {
                excusedMinutes += minutes
                excusedEntries.push(row)
            }
        })

        const formatHours = (minutes) => {
            const hours = minutes / 60
            return hours % 1 === 0 ? `${hours}` : hours.toFixed(1)
        }

        return {
            attendanceCounts,
            totalSessions,
            totalMinutes,
            absentMinutes,
            excusedMinutes,
            excusedEntries,
            formatHours
        }
    }, [attendanceRows, scheduleMinutesMap])

    const handleCellClick = async (student, day) => {
        const { date, key, status, recordId } = getCellInfo(student.id, day)
        const result = await Swal.fire({
            title: `تعديل حالة: ${student.name}`,
            text: `اليوم ${day} (${date})`,
            input: 'select',
            inputOptions: {
                present: '✅ حاضر',
                absent: '❌ غائب',
                excused: '📝 غياب بعذر',
                postponed: '⏰ مؤجل',
                none: '— لا يوجد'
            },
            inputValue: status,
            showCancelButton: true,
            confirmButtonText: 'حفظ',
            cancelButtonText: 'إلغاء'
        })

        if (!result.isConfirmed) return

        try {
            if (result.value === 'none') {
                if (recordId) {
                    const { error } = await supabase
                        .from('attendance')
                        .delete()
                        .eq('id', recordId)
                    if (error) throw error
                }
                setAttendanceMap(prev => {
                    const next = { ...prev }
                    delete next[key]
                    return next
                })
                return
            }

            if (recordId) {
                const { error } = await supabase
                    .from('attendance')
                    .update({ status: result.value })
                    .eq('id', recordId)
                if (error) throw error

                setAttendanceMap(prev => ({
                    ...prev,
                    [key]: { id: recordId, status: result.value }
                }))
            } else {
                const { data, error } = await supabase
                    .from('attendance')
                    .insert([{ student_id: student.id, date, status: result.value }])
                    .select('id')
                    .single()
                if (error) throw error

                setAttendanceMap(prev => ({
                    ...prev,
                    [key]: { id: data.id, status: result.value }
                }))
            }
        } catch (err) {
            console.error(err)
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'تعذر حفظ الحالة', confirmButtonText: 'حسناً' })
        }
    }

    const monthLabel = useMemo(() => {
        if (!selectedMonth) return ''
        const [year, month] = selectedMonth.split('-')
        return `${MONTH_NAMES[month]} ${year}`
    }, [selectedMonth])

    const fillerCells = useMemo(() => {
        const count = 31 - days.length
        return Array.from({ length: Math.max(0, count) }, (_, i) => i)
    }, [days.length])

    const studentById = useMemo(() => {
        const map = {}
        students.forEach(student => { map[student.id] = student })
        return map
    }, [students])

    return (
        <div className="page-content monthly-overview-page fade-in" dir="rtl">
            <div className="page-header">
                <h1 className="page-title">
                    <span className="page-title-icon"><MdGridView size={22} /></span>
                    ملخص شهري للطلاب
                </h1>
                <p className="page-subtitle">عرض حضور وغياب جميع الطلاب خلال الشهر المختار</p>
            </div>

            <div className="glass-card" style={{ maxWidth: 420, marginBottom: '1.5rem' }}>
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

            <div className="glass-card">
                <div className="card-header-custom">
                    <MdGridView size={18} color="#FFB800" />
                    ملخص الشهر
                    <span className="text-slate" style={{ fontWeight: 400, marginRight: '0.25rem', fontSize: '0.88rem' }}>
                        — {monthLabel}
                    </span>
                </div>
                <div className="card-body-custom" style={{ padding: 0 }}>
                    <div className="monthly-legend">
                        {Object.entries(STATUS_INFO).map(([key, info]) => (
                            <div className="monthly-legend-item" key={key}>
                                <span className="monthly-legend-dot" style={{ background: info.color }} />
                                <span>{info.text}</span>
                            </div>
                        ))}
                    </div>

                    {loading ? (
                        <div className="empty-state">
                            <div className="loading-spinner" />
                        </div>
                    ) : students.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon"><MdPerson size={30} /></div>
                            <p className="empty-state-title">لا يوجد طلاب لعرضهم</p>
                        </div>
                    ) : (
                        <div className="monthly-grid-wrapper">
                            <div className="monthly-grid">
                                <div className="monthly-grid-row monthly-grid-header">
                                    <div className="monthly-grid-cell name-cell">الطالب</div>
                                    {days.map(day => (
                                        <div className="monthly-grid-cell" key={day}>
                                            <div className="monthly-grid-day">{day}</div>
                                            <div className="monthly-grid-dow">{getDayLabel(day)}</div>
                                        </div>
                                    ))}
                                    {fillerCells.map(idx => (
                                        <div className="monthly-grid-cell empty-cell" key={`head-empty-${idx}`} />
                                    ))}
                                </div>
                                {students.map(student => (
                                    <div className="monthly-grid-row" key={student.id}>
                                        <div className="monthly-grid-cell name-cell">
                                            <span className="monthly-grid-name">{student.name}</span>
                                        </div>
                                        {days.map(day => {
                                            const cell = getCellInfo(student.id, day)
                                            const info = STATUS_INFO[cell.status]
                                            const isScheduled = isScheduledDay(student.id, cell.date, cell.dayOfWeek)
                                            return (
                                                <button
                                                    type="button"
                                                    key={day}
                                                    className={`monthly-grid-cell status-cell${isScheduled ? ' scheduled-cell' : ''}`}
                                                    style={{ background: info.color, color: info.textColor }}
                                                    title={`${student.name} - ${day}: ${info.text}`}
                                                    onClick={() => handleCellClick(student, day)}
                                                >
                                                    {day}
                                                </button>
                                            )
                                        })}
                                        {fillerCells.map(idx => (
                                            <div className="monthly-grid-cell empty-cell" key={`row-empty-${student.id}-${idx}`} />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {!loading && students.length > 0 && (
                <div className="monthly-stats-section">
                    <div className="monthly-stats-grid">
                        <div className="monthly-stats-card">
                            <span className="monthly-stats-label">عدد الحصص في الشهر</span>
                            <span className="monthly-stats-value">{stats.totalSessions}</span>
                        </div>
                        <div className="monthly-stats-card">
                            <span className="monthly-stats-label">عدد الحضور</span>
                            <span className="monthly-stats-value">{stats.attendanceCounts.present}</span>
                        </div>
                        <div className="monthly-stats-card">
                            <span className="monthly-stats-label">عدد الغياب</span>
                            <span className="monthly-stats-value">{stats.attendanceCounts.absent}</span>
                        </div>
                        <div className="monthly-stats-card">
                            <span className="monthly-stats-label">عدد ساعات الحصص</span>
                            <span className="monthly-stats-value">{stats.formatHours(stats.totalMinutes)}</span>
                        </div>
                        <div className="monthly-stats-card">
                            <span className="monthly-stats-label">ساعات التأجيل بعذر</span>
                            <span className="monthly-stats-value">{stats.formatHours(stats.excusedMinutes)}</span>
                        </div>
                        <div className="monthly-stats-card">
                            <span className="monthly-stats-label">ساعات الغياب</span>
                            <span className="monthly-stats-value">{stats.formatHours(stats.absentMinutes)}</span>
                        </div>
                    </div>

                    <div className="monthly-excused-list">
                        <div className="monthly-excused-header">طلاب لديهم إذن غياب</div>
                        {stats.excusedEntries.length === 0 ? (
                            <div className="monthly-excused-empty">لا يوجد طلاب لديهم إذن خلال هذا الشهر</div>
                        ) : (
                            <div className="monthly-excused-items">
                                {stats.excusedEntries.map((row) => {
                                    const student = studentById[row.student_id]
                                    const day = Number(row.date.split('-')[2])
                                    return (
                                        <div className="monthly-excused-item" key={row.id}>
                                            <div>
                                                <div className="monthly-excused-name">{student?.name || '—'}</div>
                                                <div className="monthly-excused-date">{row.date}</div>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn-ghost"
                                                onClick={() => student && handleCellClick(student, day)}
                                            >
                                                تعديل الحالة
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default MonthlyOverview
