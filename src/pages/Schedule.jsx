import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Swal from 'sweetalert2'

function Schedule() {
    const [students, setStudents] = useState([])
    const [schedules, setSchedules] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    const [formData, setFormData] = useState({
        studentId: '',
        dayOfWeek: '',
        startTime: '',
        endTime: ''
    })

    const daysOfWeek = [
        { value: 0, label: 'الأحد' },
        { value: 1, label: 'الإثنين' },
        { value: 2, label: 'الثلاثاء' },
        { value: 3, label: 'الأربعاء' },
        { value: 4, label: 'الخميس' },
        { value: 5, label: 'الجمعة' },
        { value: 6, label: 'السبت' }
    ]

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            // Fetch students
            const { data: studentsData, error: studentsError } = await supabase
                .from('students')
                .select('*')
                .order('name')

            if (studentsError) throw studentsError

            // Fetch schedules with student names
            const { data: schedulesData, error: schedulesError } = await supabase
                .from('schedules')
                .select(`
          *,
          students (name)
        `)
                .order('day_of_week')
                .order('start_time')

            if (schedulesError) throw schedulesError

            setStudents(studentsData || [])
            setSchedules(schedulesData || [])
        } catch (error) {
            console.error('Error fetching data:', error)
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'حدث خطأ أثناء تحميل البيانات',
                confirmButtonText: 'حسناً'
            })
        } finally {
            setLoading(false)
        }
    }

    const checkTimeConflict = async (dayOfWeek, startTime, endTime) => {
        try {
            // Fetch all schedules for the selected day
            const { data, error } = await supabase
                .from('schedules')
                .select('*, students(name)')
                .eq('day_of_week', dayOfWeek)

            if (error) throw error

            // Check for conflicts
            for (const schedule of data) {
                const existingStart = schedule.start_time
                const existingEnd = schedule.end_time

                // Conflict formula: (newStart < existingEnd) AND (newEnd > existingStart)
                if (startTime < existingEnd && endTime > existingStart) {
                    return {
                        hasConflict: true,
                        conflictWith: schedule
                    }
                }
            }

            return { hasConflict: false }
        } catch (error) {
            console.error('Error checking conflicts:', error)
            throw error
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validation
        if (!formData.studentId || !formData.dayOfWeek || !formData.startTime || !formData.endTime) {
            Swal.fire({
                icon: 'warning',
                title: 'تنبيه',
                text: 'الرجاء ملء جميع الحقول',
                confirmButtonText: 'حسناً'
            })
            return
        }

        // Validate time range
        if (formData.startTime >= formData.endTime) {
            Swal.fire({
                icon: 'error',
                title: 'خطأ في الوقت',
                text: 'وقت البداية يجب أن يكون قبل وقت النهاية',
                confirmButtonText: 'حسناً'
            })
            return
        }

        setSubmitting(true)

        try {
            // Check for time conflicts (CRITICAL LOGIC)
            const conflictCheck = await checkTimeConflict(
                parseInt(formData.dayOfWeek),
                formData.startTime,
                formData.endTime
            )

            if (conflictCheck.hasConflict) {
                const conflict = conflictCheck.conflictWith
                const dayName = daysOfWeek.find(d => d.value === parseInt(formData.dayOfWeek))?.label

                Swal.fire({
                    icon: 'error',
                    title: '⚠️ تعارض في المواعيد',
                    html: `
            <div class="text-end">
              <p><strong>يوجد تعارض مع حصة أخرى:</strong></p>
              <ul class="list-unstyled mt-3">
                <li>📚 الطالب: <strong>${conflict.students.name}</strong></li>
                <li>📅 اليوم: <strong>${dayName}</strong></li>
                <li>🕐 من: <strong>${conflict.start_time}</strong></li>
                <li>🕑 إلى: <strong>${conflict.end_time}</strong></li>
              </ul>
              <p class="mt-3 text-danger">الرجاء اختيار وقت آخر</p>
            </div>
          `,
                    confirmButtonText: 'حسناً',
                    confirmButtonColor: '#d33'
                })
                setSubmitting(false)
                return
            }

            // No conflict - proceed with insertion
            const { error } = await supabase
                .from('schedules')
                .insert([{
                    student_id: formData.studentId,
                    day_of_week: parseInt(formData.dayOfWeek),
                    start_time: formData.startTime,
                    end_time: formData.endTime
                }])

            if (error) throw error

            Swal.fire({
                icon: 'success',
                title: 'تم بنجاح',
                text: 'تمت إضافة الحصة إلى الجدول',
                timer: 1500,
                showConfirmButton: false
            })

            // Reset form
            setFormData({
                studentId: '',
                dayOfWeek: '',
                startTime: '',
                endTime: ''
            })

            fetchData()
        } catch (error) {
            console.error('Error adding schedule:', error)
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'حدث خطأ أثناء إضافة الحصة',
                confirmButtonText: 'حسناً'
            })
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (scheduleId) => {
        const result = await Swal.fire({
            title: 'هل أنت متأكد؟',
            text: 'سيتم حذف هذه الحصة من الجدول',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء'
        })

        if (result.isConfirmed) {
            try {
                const { error } = await supabase
                    .from('schedules')
                    .delete()
                    .eq('id', scheduleId)

                if (error) throw error

                Swal.fire({
                    icon: 'success',
                    title: 'تم الحذف',
                    text: 'تم حذف الحصة بنجاح',
                    timer: 1500,
                    showConfirmButton: false
                })

                fetchData()
            } catch (error) {
                console.error('Error deleting schedule:', error)
                Swal.fire({
                    icon: 'error',
                    title: 'خطأ',
                    text: 'حدث خطأ أثناء حذف الحصة',
                    confirmButtonText: 'حسناً'
                })
            }
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
                    <h1 className="display-5 fw-bold text-primary">جدولة الدروس</h1>
                    <p className="lead text-muted">إضافة وعرض جدول الحصص الأسبوعية</p>
                </div>
            </div>

            {/* Add Schedule Form */}
            <div className="row mb-4">
                <div className="col-lg-8">
                    <div className="card shadow-sm border-0">
                        <div className="card-body">
                            <h5 className="card-title mb-4">إضافة حصة جديدة</h5>

                            {students.length === 0 ? (
                                <div className="alert alert-warning" role="alert">
                                    يجب إضافة طالب واحد على الأقل قبل جدولة الحصص.
                                    <a href="/students" className="alert-link me-2">انتقل إلى صفحة الطلاب</a>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    <div className="row g-3">
                                        {/* Student Selection */}
                                        <div className="col-md-6">
                                            <label className="form-label">الطالب</label>
                                            <select
                                                className="form-select"
                                                value={formData.studentId}
                                                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                                                disabled={submitting}
                                            >
                                                <option value="">اختر الطالب...</option>
                                                {students.map(student => (
                                                    <option key={student.id} value={student.id}>
                                                        {student.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Day Selection */}
                                        <div className="col-md-6">
                                            <label className="form-label">اليوم</label>
                                            <select
                                                className="form-select"
                                                value={formData.dayOfWeek}
                                                onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                                                disabled={submitting}
                                            >
                                                <option value="">اختر اليوم...</option>
                                                {daysOfWeek.map(day => (
                                                    <option key={day.value} value={day.value}>
                                                        {day.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Start Time */}
                                        <div className="col-md-6">
                                            <label className="form-label">وقت البداية</label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                value={formData.startTime}
                                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                                disabled={submitting}
                                            />
                                        </div>

                                        {/* End Time */}
                                        <div className="col-md-6">
                                            <label className="form-label">وقت النهاية</label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                value={formData.endTime}
                                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                                disabled={submitting}
                                            />
                                        </div>

                                        {/* Submit Button */}
                                        <div className="col-12">
                                            <button
                                                type="submit"
                                                className="btn btn-primary btn-lg w-100"
                                                disabled={submitting}
                                            >
                                                {submitting ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm ms-2" role="status"></span>
                                                        جاري التحقق من التعارضات...
                                                    </>
                                                ) : (
                                                    <>📅 إضافة إلى الجدول</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Schedules Table */}
            <div className="row">
                <div className="col">
                    <div className="card shadow-sm border-0">
                        <div className="card-body">
                            <h5 className="card-title mb-3">
                                الجدول الأسبوعي ({schedules.length} حصة)
                            </h5>

                            {schedules.length === 0 ? (
                                <div className="alert alert-info text-center" role="alert">
                                    لا يوجد حصص مجدولة حالياً
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th>اليوم</th>
                                                <th>اسم الطالب</th>
                                                <th>وقت البداية</th>
                                                <th>وقت النهاية</th>
                                                <th>المدة</th>
                                                <th className="text-center">الإجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {schedules.map(schedule => {
                                                const dayName = daysOfWeek.find(d => d.value === schedule.day_of_week)?.label

                                                // Calculate duration
                                                const start = new Date(`1970-01-01T${schedule.start_time}`)
                                                const end = new Date(`1970-01-01T${schedule.end_time}`)
                                                const durationMinutes = (end - start) / 1000 / 60
                                                const hours = Math.floor(durationMinutes / 60)
                                                const minutes = durationMinutes % 60
                                                const durationText = hours > 0
                                                    ? `${hours} ساعة ${minutes > 0 ? `و ${minutes} دقيقة` : ''}`
                                                    : `${minutes} دقيقة`

                                                return (
                                                    <tr key={schedule.id}>
                                                        <td className="fw-semibold">{dayName}</td>
                                                        <td>{schedule.students.name}</td>
                                                        <td>{schedule.start_time}</td>
                                                        <td>{schedule.end_time}</td>
                                                        <td className="text-muted">{durationText}</td>
                                                        <td className="text-center">
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => handleDelete(schedule.id)}
                                                            >
                                                                🗑️ حذف
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Schedule
