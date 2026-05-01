import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import Swal from '../lib/swal'
import { MdGridView, MdCalendarMonth, MdPerson, MdDeleteSweep, MdRefresh } from 'react-icons/md'

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
    const [displayStats, setDisplayStats] = useState({
        totalSessions: 0,
        present: 0,
        absent: 0,
        totalHours: 0,
        excusedHours: 0,
        absentHours: 0
    })
    const statsSectionRef = useRef(null)
    const hasAnimatedRef = useRef(false)

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
            const { error } = await supabase
                .from('attendance')
                .delete()
                .gte('date', '1900-01-01')
            if (error) throw error

            Swal.fire({ icon: 'success', title: 'تم التصفير', text: 'تم حذف جميع سجلات الحضور بنجاح', timer: 2000, showConfirmButton: false })
            fetchMonthlyOverview()
        } catch (err) {
            console.error(err)
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'حدث خطأ أثناء تصفير السجلات', confirmButtonText: 'حسناً' })
        }
    }

    const handleResetMonth = async () => {
        if (!selectedMonth) {
            Swal.fire({ icon: 'warning', title: 'تنبيه', text: 'يرجى اختيار شهر أولاً', confirmButtonText: 'حسناً' })
            return
        }
        const [year, month] = selectedMonth.split('-')
        const monthName = MONTH_NAMES[month]

        const result = await Swal.fire({
            title: `تصفير سجلات شهر ${monthName}`,
            text: `سيتم حذف جميع سجلات الحضور لجميع الطلاب لشهر ${monthName} ${year}. هل أنت متأكد؟`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، تصفير سجلات الشهر',
            cancelButtonText: 'إلغاء'
        })
        if (!result.isConfirmed) return

        try {
            const lastDay = new Date(year, month, 0).getDate()
            const startDate = `${year}-${month}-01`
            const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

            const { error } = await supabase
                .from('attendance')
                .delete()
                .gte('date', startDate)
                .lte('date', endDate)
            if (error) throw error

            Swal.fire({ icon: 'success', title: 'تم التصفير', text: `تم حذف سجلات شهر ${monthName} بنجاح`, timer: 2000, showConfirmButton: false })
            fetchMonthlyOverview()
        } catch (err) {
            console.error(err)
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'حدث خطأ أثناء تصفير سجلات الشهر', confirmButtonText: 'حسناً' })
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

        const minutesByDate = {}
        const sessionsByDate = {}

        Object.values(scheduleMinutesMap).forEach(minutes => {
            totalSessions += 1
            totalMinutes += minutes
        })

        Object.entries(scheduleMinutesMap).forEach(([key, minutes]) => {
            const date = key.split('|')[1]
            if (!minutesByDate[date]) minutesByDate[date] = 0
            if (!sessionsByDate[date]) sessionsByDate[date] = 0
            minutesByDate[date] += minutes
            sessionsByDate[date] += 1
        })

        attendanceRows.forEach(row => {
            if (!attendanceCounts[row.status]) attendanceCounts[row.status] = 0
            attendanceCounts[row.status] += 1

            const minutes = scheduleMinutesMap[`${row.student_id}|${row.date}`] || 0
            if (row.status === 'absent') absentMinutes += minutes
            if (row.status === 'excused' || row.status === 'postponed') {
                if (row.status === 'excused') excusedMinutes += minutes
                excusedEntries.push(row)
            }
        })

        return {
            attendanceCounts,
            totalSessions,
            totalMinutes,
            absentMinutes,
            excusedMinutes,
            excusedEntries,
            totalHours: totalMinutes / 60,
            absentHours: absentMinutes / 60,
            excusedHours: excusedMinutes / 60,
            minutesByDate,
            sessionsByDate
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

    useEffect(() => {
        hasAnimatedRef.current = false
        setDisplayStats({
            totalSessions: 0,
            present: 0,
            absent: 0,
            totalHours: 0,
            excusedHours: 0,
            absentHours: 0
        })
    }, [selectedMonth])

    useEffect(() => {
        if (!statsSectionRef.current) return undefined
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting || hasAnimatedRef.current) return
            hasAnimatedRef.current = true

            const start = performance.now()
            const duration = 900
            const target = {
                totalSessions: stats.totalSessions,
                present: stats.attendanceCounts.present,
                absent: stats.attendanceCounts.absent,
                totalHours: stats.totalHours,
                excusedHours: stats.excusedHours,
                absentHours: stats.absentHours
            }

            const animate = (now) => {
                const progress = Math.min((now - start) / duration, 1)
                const eased = 1 - Math.pow(1 - progress, 3)
                setDisplayStats({
                    totalSessions: Math.round(target.totalSessions * eased),
                    present: Math.round(target.present * eased),
                    absent: Math.round(target.absent * eased),
                    totalHours: target.totalHours * eased,
                    excusedHours: target.excusedHours * eased,
                    absentHours: target.absentHours * eased
                })
                if (progress < 1) {
                    requestAnimationFrame(animate)
                }
            }

            requestAnimationFrame(animate)
        }, { threshold: 0.25 })

        observer.observe(statsSectionRef.current)
        return () => observer.disconnect()
    }, [stats])

    const formatDisplayHours = (value) => {
        if (Number.isNaN(value)) return '0'
        return value % 1 === 0 ? `${Math.round(value)}` : value.toFixed(1)
    }

    const daySummaries = useMemo(() => {
        if (!selectedMonth) return []
        const { year, month } = getMonthRange()
        return days.map(day => {
            const date = `${year}-${month}-${String(day).padStart(2, '0')}`
            return {
                day,
                date,
                sessions: stats.sessionsByDate[date] || 0,
                hours: (stats.minutesByDate[date] || 0) / 60
            }
        })
    }, [selectedMonth, days, stats])

    const weeklyStats = useMemo(() => {
        if (!selectedMonth) return []
        const weekly = Array.from({ length: 4 }, (_, i) => ({
            week: i + 1,
            sessions: 0,
            present: 0,
            absent: 0,
            totalMinutes: 0,
            excusedMinutes: 0,
            absentMinutes: 0
        }))

        Object.entries(stats.sessionsByDate).forEach(([date, sessions]) => {
            const day = Number(date.split('-')[2])
            const weekIndex = Math.min(3, Math.floor((day - 1) / 7))
            if (!weekly[weekIndex]) return
            weekly[weekIndex].sessions += sessions
            weekly[weekIndex].totalMinutes += stats.minutesByDate[date] || 0
        })

        attendanceRows.forEach(row => {
            const day = Number(row.date.split('-')[2])
            const weekIndex = Math.min(3, Math.floor((day - 1) / 7))
            if (!weekly[weekIndex]) return
            if (row.status === 'present') weekly[weekIndex].present += 1
            if (row.status === 'absent') weekly[weekIndex].absent += 1
            if (row.status === 'excused') weekly[weekIndex].excusedMinutes += stats.minutesByDate[row.date] || 0
            if (row.status === 'absent') weekly[weekIndex].absentMinutes += stats.minutesByDate[row.date] || 0
        })

        return weekly
    }, [attendanceRows, selectedMonth, stats, getMonthRange])

    const attendanceDonut = useMemo(() => {
        const present = stats.attendanceCounts.present
        const absent = stats.attendanceCounts.absent
        const total = present + absent
        const percent = total ? (present / total) * 100 : 0
        return { present, absent, percent }
    }, [stats])

    const hoursDonut = useMemo(() => {
        const total = stats.totalHours
        const missed = stats.absentHours + stats.excusedHours
        const percent = total ? ((total - missed) / total) * 100 : 0
        return { total, missed, percent }
    }, [stats])

    const getDonutProps = (percent) => {
        const size = 160
        const stroke = 12
        const radius = (size - stroke) / 2
        const circumference = 2 * Math.PI * radius
        const safePercent = Math.min(100, Math.max(0, percent || 0))
        const offset = circumference - (safePercent / 100) * circumference
        return { size, stroke, radius, circumference, offset }
    }

    const attendanceDonutProps = useMemo(
        () => getDonutProps(attendanceDonut.percent),
        [attendanceDonut.percent]
    )
    const hoursDonutProps = useMemo(
        () => getDonutProps(hoursDonut.percent),
        [hoursDonut.percent]
    )

    return (
        <div className="page-content monthly-overview-page fade-in" dir="rtl">
            <div className="page-header">
                <h1 className="page-title">
                    <span className="page-title-icon"><MdGridView size={22} /></span>
                    ملخص شهري للطلاب
                </h1>
                <p className="page-subtitle">عرض حضور وغياب جميع الطلاب خلال الشهر المختار</p>
            </div>

            <div className="monthly-overview-controls">
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
                <div className="glass-card">
                    <div className="card-header-custom">
                        <MdDeleteSweep size={16} color="#EF4444" />
                        <span style={{ color: '#EF4444' }}>تصفير السجلات</span>
                    </div>
                    <div className="card-body-custom" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <button className="btn-danger-custom" style={{ justifyContent: 'center' }} onClick={handleResetAll}>
                            <MdDeleteSweep size={15} />
                            تصفير سجلات جميع الطلاب
                        </button>
                        <button className="btn-warning-custom" style={{ justifyContent: 'center' }} onClick={handleResetMonth}>
                            <MdRefresh size={15} />
                            تصفير سجلات الشهر الحالي
                        </button>
                    </div>
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
                                <div className="monthly-grid-row summary-row">
                                    <div className="monthly-grid-cell name-cell summary-label">عدد الحصص</div>
                                    {daySummaries.map(item => (
                                        <div className="monthly-grid-cell summary-cell" key={`sessions-${item.day}`}>
                                            {item.sessions}
                                        </div>
                                    ))}
                                    {fillerCells.map(idx => (
                                        <div className="monthly-grid-cell empty-cell" key={`sessions-empty-${idx}`} />
                                    ))}
                                </div>
                                <div className="monthly-grid-row summary-row">
                                    <div className="monthly-grid-cell name-cell summary-label">عدد الساعات</div>
                                    {daySummaries.map(item => (
                                        <div className="monthly-grid-cell summary-cell" key={`hours-${item.day}`}>
                                            {formatDisplayHours(item.hours)}
                                        </div>
                                    ))}
                                    {fillerCells.map(idx => (
                                        <div className="monthly-grid-cell empty-cell" key={`hours-empty-${idx}`} />
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
                <div className="monthly-stats-section" ref={statsSectionRef}>
                    <div className="monthly-stats-grid">
                        <div className="monthly-stats-card primary">
                            <span className="monthly-stats-label">عدد الحصص في الشهر</span>
                            <span className="monthly-stats-value">{displayStats.totalSessions}</span>
                        </div>
                        <div className="monthly-stats-card success">
                            <span className="monthly-stats-label">عدد الحضور</span>
                            <span className="monthly-stats-value">{displayStats.present}</span>
                        </div>
                        <div className="monthly-stats-card danger">
                            <span className="monthly-stats-label">عدد الغياب</span>
                            <span className="monthly-stats-value">{displayStats.absent}</span>
                        </div>
                        <div className="monthly-stats-card info">
                            <span className="monthly-stats-label">عدد ساعات الحصص</span>
                            <span className="monthly-stats-value">{formatDisplayHours(displayStats.totalHours)}</span>
                        </div>
                        <div className="monthly-stats-card warning">
                            <span className="monthly-stats-label">ساعات التأجيل بعذر</span>
                            <span className="monthly-stats-value">{formatDisplayHours(displayStats.excusedHours)}</span>
                        </div>
                        <div className="monthly-stats-card danger-soft">
                            <span className="monthly-stats-label">ساعات الغياب</span>
                            <span className="monthly-stats-value">{formatDisplayHours(displayStats.absentHours)}</span>
                        </div>
                    </div>

                    <div className="monthly-circles">
                        <div className="monthly-circle-card">
                            <div
                                className="donut-chart"
                                style={{ color: '#10B981' }}
                            >
                                <svg
                                    className="donut-svg"
                                    width={attendanceDonutProps.size}
                                    height={attendanceDonutProps.size}
                                    viewBox={`0 0 ${attendanceDonutProps.size} ${attendanceDonutProps.size}`}
                                >
                                    <circle
                                        className="donut-track"
                                        stroke="rgba(239,68,68,0.35)"
                                        strokeWidth={attendanceDonutProps.stroke}
                                        fill="transparent"
                                        r={attendanceDonutProps.radius}
                                        cx={attendanceDonutProps.size / 2}
                                        cy={attendanceDonutProps.size / 2}
                                    />
                                    <circle
                                        className="donut-progress"
                                        stroke="#10B981"
                                        strokeWidth={attendanceDonutProps.stroke}
                                        fill="transparent"
                                        r={attendanceDonutProps.radius}
                                        cx={attendanceDonutProps.size / 2}
                                        cy={attendanceDonutProps.size / 2}
                                        strokeDasharray={`${attendanceDonutProps.circumference} ${attendanceDonutProps.circumference}`}
                                        strokeDashoffset={attendanceDonutProps.offset}
                                    />
                                </svg>
                                <div className="donut-center">
                                    <div className="donut-value">{Math.round(attendanceDonut.percent)}%</div>
                                    <div className="donut-label">حضور</div>
                                </div>
                            </div>
                            <div className="donut-legend">
                                <span>حاضر: {attendanceDonut.present}</span>
                                <span>غائب: {attendanceDonut.absent}</span>
                            </div>
                        </div>
                        <div className="monthly-circle-card">
                            <div
                                className="donut-chart"
                                style={{ color: '#38BDF8' }}
                            >
                                <svg
                                    className="donut-svg"
                                    width={hoursDonutProps.size}
                                    height={hoursDonutProps.size}
                                    viewBox={`0 0 ${hoursDonutProps.size} ${hoursDonutProps.size}`}
                                >
                                    <circle
                                        className="donut-track"
                                        stroke="rgba(239,68,68,0.25)"
                                        strokeWidth={hoursDonutProps.stroke}
                                        fill="transparent"
                                        r={hoursDonutProps.radius}
                                        cx={hoursDonutProps.size / 2}
                                        cy={hoursDonutProps.size / 2}
                                    />
                                    <circle
                                        className="donut-progress"
                                        stroke="#38BDF8"
                                        strokeWidth={hoursDonutProps.stroke}
                                        fill="transparent"
                                        r={hoursDonutProps.radius}
                                        cx={hoursDonutProps.size / 2}
                                        cy={hoursDonutProps.size / 2}
                                        strokeDasharray={`${hoursDonutProps.circumference} ${hoursDonutProps.circumference}`}
                                        strokeDashoffset={hoursDonutProps.offset}
                                    />
                                </svg>
                                <div className="donut-center">
                                    <div className="donut-value">{Math.round(hoursDonut.percent)}%</div>
                                    <div className="donut-label">ساعات</div>
                                </div>
                            </div>
                            <div className="donut-legend">
                                <span>الإجمالي: {formatDisplayHours(hoursDonut.total)}</span>
                                <span>الفاقد: {formatDisplayHours(hoursDonut.missed)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="monthly-weekly">
                        <div className="monthly-weekly-header">إحصائيات أسبوعية</div>
                        <div className="monthly-weekly-grid">
                            {weeklyStats.map(week => (
                                <div className="monthly-weekly-card" key={week.week}>
                                    <div className="monthly-weekly-title">الأسبوع {week.week}</div>
                                    <div className="monthly-weekly-row">
                                        <span>الحصص</span>
                                        <span>{week.sessions}</span>
                                    </div>
                                    <div className="monthly-weekly-row">
                                        <span>الحضور</span>
                                        <span>{week.present}</span>
                                    </div>
                                    <div className="monthly-weekly-row">
                                        <span>الغياب</span>
                                        <span>{week.absent}</span>
                                    </div>
                                    <div className="monthly-weekly-row">
                                        <span>ساعات الحصص</span>
                                        <span>{formatDisplayHours(week.totalMinutes / 60)}</span>
                                    </div>
                                    <div className="monthly-weekly-row">
                                        <span>ساعات بعذر</span>
                                        <span>{formatDisplayHours(week.excusedMinutes / 60)}</span>
                                    </div>
                                    <div className="monthly-weekly-row">
                                        <span>ساعات الغياب</span>
                                        <span>{formatDisplayHours(week.absentMinutes / 60)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="monthly-excused-list">
                        <div className="monthly-excused-header">طلاب لديهم إذن غياب أو تأجيل</div>
                        {stats.excusedEntries.length === 0 ? (
                            <div className="monthly-excused-empty">لا يوجد طلاب لديهم إذن خلال هذا الشهر</div>
                        ) : (
                            <div className="monthly-excused-items">
                                {stats.excusedEntries.map((row) => {
                                    const student = studentById[row.student_id]
                                    const day = Number(row.date.split('-')[2])
                                    const statusLabel = row.status === 'excused' ? 'بعذر' : 'مؤجل'
                                    return (
                                        <div className="monthly-excused-item" key={row.id}>
                                            <div>
                                                <div className="monthly-excused-name">
                                                    {student?.name || '—'}
                                                    <span className={`monthly-excused-badge ${row.status === 'excused' ? 'excused' : 'postponed'}`}>
                                                        {statusLabel}
                                                    </span>
                                                </div>
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
