import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Swal from '../lib/swal'
import { MdToday, MdCalendarToday, MdAccessTime, MdPerson, MdCheckCircle } from 'react-icons/md'

function DailyClasses() {
    const [selectedDate, setSelectedDate] = useState('')
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(false)

    const daysOfWeek = [
        'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
    ]

    useEffect(() => {
        // Set today's date as default
        const today = new Date()
        const formattedDate = today.toISOString().split('T')[0]
        setSelectedDate(formattedDate)
    }, [])

    useEffect(() => {
        if (selectedDate) {
            fetchDailyClasses()
        }
    }, [selectedDate])

    const fetchDailyClasses = async () => {
        setLoading(true)
        try {
            // Calculate day of week from selected date (0 = Sunday, 6 = Saturday)
            const date = new Date(selectedDate + 'T00:00:00')
            const dayOfWeek = date.getDay()

            // Fetch schedules for this day of week that are valid on the selected date
            const { data, error } = await supabase
                .from('schedules')
                .select(`
          *,
          students (
            id,
            name
          )
        `)
                .eq('day_of_week', dayOfWeek)
                .lte('valid_from', selectedDate)
                .or(`valid_until.is.null,valid_until.gt.${selectedDate}`)
                .order('start_time')

            if (error) throw error

            setClasses(data || [])
        } catch (error) {
            console.error('Error fetching daily classes:', error)
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'حدث خطأ أثناء تحميل الحصص',
                confirmButtonText: 'حسناً'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleMarkAttendance = async (studentId, studentName, status) => {
        try {
            // Check if attendance already exists for this date
            const { data: existingData, error: checkError } = await supabase
                .from('attendance')
                .select('id')
                .eq('student_id', studentId)
                .eq('date', selectedDate)
                .single()

            if (checkError && checkError.code !== 'PGRST116') {
                throw checkError
            }

            if (existingData) {
                Swal.fire({ icon: 'info', title: 'تم التسجيل مسبقاً', text: `تم تسجيل الحضور لـ ${studentName} في هذا التاريخ. استخدم صفحة "الحضور والسجلات" للتعديل.`, confirmButtonText: 'حسناً' })
                return
            }

            // Insert new attendance record
            const { error: insertError } = await supabase
                .from('attendance')
                .insert([{
                    student_id: studentId,
                    date: selectedDate,
                    status: status
                }])

            if (insertError) throw insertError

            const statusText = {
                'present': 'حاضر',
                'absent': 'غائب',
                'excused': 'غياب بعذر',
                'postponed': 'مؤجل'
            }[status]

            Swal.fire({ icon: 'success', title: 'تم التسجيل', text: `تم تسجيل ${studentName} كـ ${statusText}`, timer: 1500, showConfirmButton: false })
        } catch (error) {
            console.error('Error marking attendance:', error)
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'حدث خطأ أثناء تسجيل الحضور', confirmButtonText: 'حسناً' })
        }
    }

    const showAttendanceOptions = (studentId, studentName) => {
        Swal.fire({
            title: `تسجيل حضور: ${studentName}`,
            text: 'اختر الحالة:',
            showCancelButton: true,
            showDenyButton: true,
            showCloseButton: true,
            confirmButtonText: '✅ حاضر',
            denyButtonText: '❌ غائب',
            cancelButtonText: '📝 بعذر',
            footer: '<button id="postponed-btn" style="background:rgba(100,116,139,0.15);border:1px solid rgba(100,116,139,0.35);border-radius:6px;color:#94A3B8;padding:0.35rem 0.9rem;cursor:pointer;font-size:0.85rem;">⏰ مؤجل</button>'
        }).then((result) => {
            if (result.isConfirmed) {
                handleMarkAttendance(studentId, studentName, 'present')
            } else if (result.isDenied) {
                handleMarkAttendance(studentId, studentName, 'absent')
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                handleMarkAttendance(studentId, studentName, 'excused')
            }
        })

        // Add event listener for postponed button
        setTimeout(() => {
            const postponedBtn = document.getElementById('postponed-btn')
            if (postponedBtn) {
                postponedBtn.onclick = () => {
                    Swal.close()
                    handleMarkAttendance(studentId, studentName, 'postponed')
                }
            }
        }, 100)
    }

    const getDayName = () => {
        if (!selectedDate) return ''
        const date = new Date(selectedDate + 'T00:00:00')
        return daysOfWeek[date.getDay()]
    }

    return (
        <div className="page-content fade-in">
            {/* Header */}
            <div className="page-header">
                <h1 className="page-title">
                    <span className="page-title-icon"><MdToday size={22} /></span>
                    الحصص اليومية
                </h1>
                <p className="page-subtitle">عرض الحصص المجدولة لتاريخ معين</p>
            </div>

            {/* Date Picker */}
            <div className="glass-card" style={{ maxWidth: 440, marginBottom: '1.5rem' }}>
                <div className="card-header-custom">
                    <MdCalendarToday size={16} color="#FFB800" />
                    اختر التاريخ
                </div>
                <div className="card-body-custom">
                    <input
                        type="date"
                        className="form-control-custom form-control-lg-custom"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                    {selectedDate && (
                        <div style={{ marginTop: '0.6rem', fontSize: '0.82rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <MdCalendarToday size={13} color="#FFB800" />
                            اليوم: <strong style={{ color: '#FFB800' }}>{getDayName()}</strong>
                        </div>
                    )}
                </div>
            </div>

            {/* Classes */}
            <div className="glass-card">
                <div className="card-header-custom">
                    <MdToday size={18} color="#FFB800" />
                    حصص {getDayName()}
                    <span className="badge-custom badge-gold" style={{ marginRight: 'auto' }}>{classes.length} حصة</span>
                </div>
                <div className="card-body-custom">
                    {loading ? (
                        <div className="empty-state">
                            <div className="loading-spinner" />
                        </div>
                    ) : classes.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon"><MdToday size={30} /></div>
                            <p className="empty-state-title">لا توجد حصص مجدولة في هذا اليوم</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                            {classes.map((classItem) => (
                                <div key={classItem.id} className="class-card">
                                    <div className="class-card-name">
                                        <MdPerson size={18} color="#FFB800" />
                                        {classItem.students.name}
                                    </div>
                                    <div className="divider" style={{ margin: '0.6rem 0' }} />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <span className="time-badge">
                                            <MdAccessTime size={13} />
                                            {classItem.start_time}
                                        </span>
                                        <span style={{ color: '#475569', alignSelf: 'center', fontSize: '0.8rem' }}>←</span>
                                        <span className="time-badge">
                                            <MdAccessTime size={13} />
                                            {classItem.end_time}
                                        </span>
                                    </div>
                                    <button
                                        className="btn-primary-custom full"
                                        style={{ marginTop: '0.5rem' }}
                                        onClick={() => showAttendanceOptions(classItem.students.id, classItem.students.name)}
                                    >
                                        <MdCheckCircle size={16} />
                                        تسجيل الحضور
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default DailyClasses
