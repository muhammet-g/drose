import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Swal from 'sweetalert2'

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

            // Fetch schedules for this day of week
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
                Swal.fire({
                    icon: 'info',
                    title: 'تم التسجيل مسبقاً',
                    text: `تم تسجيل الحضور لـ ${studentName} في هذا التاريخ. استخدم صفحة "الحضور والسجلات" للتعديل.`,
                    confirmButtonText: 'حسناً'
                })
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

            Swal.fire({
                icon: 'success',
                title: 'تم التسجيل',
                text: `تم تسجيل ${studentName} كـ ${statusText}`,
                timer: 1500,
                showConfirmButton: false
            })
        } catch (error) {
            console.error('Error marking attendance:', error)
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'حدث خطأ أثناء تسجيل الحضور',
                confirmButtonText: 'حسناً'
            })
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
            cancelButtonText: '📝 غياب بعذر',
            confirmButtonColor: '#198754',
            denyButtonColor: '#dc3545',
            cancelButtonColor: '#ffc107',
            footer: '<button id="postponed-btn" class="btn btn-secondary btn-sm">⏰ مؤجل</button>'
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
        <div className="container">
            <div className="row mb-4">
                <div className="col">
                    <h1 className="display-5 fw-bold text-primary">الحصص اليومية</h1>
                    <p className="lead text-muted">عرض الحصص المجدولة لتاريخ معين</p>
                </div>
            </div>

            {/* Date Picker */}
            <div className="row mb-4">
                <div className="col-lg-6">
                    <div className="card shadow-sm border-0">
                        <div className="card-body">
                            <label className="form-label fw-semibold">اختر التاريخ</label>
                            <input
                                type="date"
                                className="form-control form-control-lg"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                            {selectedDate && (
                                <div className="mt-2 text-muted">
                                    <small>📅 اليوم: <strong>{getDayName()}</strong></small>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Classes Display */}
            <div className="row">
                <div className="col">
                    <div className="card shadow-sm border-0">
                        <div className="card-body">
                            <h5 className="card-title mb-3">
                                حصص {getDayName()} ({classes.length} حصة)
                            </h5>

                            {loading ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">جاري التحميل...</span>
                                    </div>
                                </div>
                            ) : classes.length === 0 ? (
                                <div className="alert alert-info text-center" role="alert">
                                    لا توجد حصص مجدولة في هذا اليوم
                                </div>
                            ) : (
                                <div className="row g-3">
                                    {classes.map((classItem) => (
                                        <div key={classItem.id} className="col-md-6 col-lg-4">
                                            <div className="card border-primary h-100">
                                                <div className="card-body">
                                                    <h5 className="card-title text-primary">
                                                        👨‍🎓 {classItem.students.name}
                                                    </h5>
                                                    <hr />
                                                    <div className="mb-2">
                                                        <small className="text-muted">🕐 وقت البداية:</small>
                                                        <div className="fw-semibold">{classItem.start_time}</div>
                                                    </div>
                                                    <div className="mb-3">
                                                        <small className="text-muted">🕑 وقت النهاية:</small>
                                                        <div className="fw-semibold">{classItem.end_time}</div>
                                                    </div>
                                                    <button
                                                        className="btn btn-success w-100"
                                                        onClick={() => showAttendanceOptions(
                                                            classItem.students.id,
                                                            classItem.students.name
                                                        )}
                                                    >
                                                        تسجيل الحضور
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DailyClasses
