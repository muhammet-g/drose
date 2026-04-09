import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Swal from '../lib/swal'
import { MdCalendarMonth, MdAdd, MdEdit, MdClose, MdDeleteOutline, MdSchedule, MdPeople, MdAccessTime, MdWarning } from 'react-icons/md'

function Schedule() {
    const [students, setStudents] = useState([])
    const [schedules, setSchedules] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editId, setEditId] = useState(null)

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

            // Fetch schedules with student names (only active ones)
            const { data: schedulesData, error: schedulesError } = await supabase
                .from('schedules')
                .select(`
          *,
          students (name)
        `)
                .is('valid_until', null)
                .order('day_of_week')
                .order('start_time')

            if (schedulesError) throw schedulesError

            setStudents(studentsData || [])
            setSchedules(schedulesData || [])
        } catch (error) {
            console.error('Error fetching data:', error)
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'حدث خطأ أثناء تحميل البيانات', confirmButtonText: 'حسناً' })
        } finally {
            setLoading(false)
        }
    }

    const checkTimeConflict = async (dayOfWeek, startTime, endTime, excludeScheduleId = null) => {
        try {
            // Fetch all active schedules for the selected day
            let query = supabase
                .from('schedules')
                .select('*, students(name)')
                .eq('day_of_week', dayOfWeek)
                .is('valid_until', null)

            if (excludeScheduleId) {
                query = query.neq('id', excludeScheduleId)
            }

            const { data, error } = await query

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
            Swal.fire({ icon: 'warning', title: 'تنبيه', text: 'الرجاء ملء جميع الحقول', confirmButtonText: 'حسناً' })
            return
        }

        // Validate time range
        if (formData.startTime >= formData.endTime) {
            Swal.fire({ icon: 'error', title: 'خطأ في الوقت', text: 'وقت البداية يجب أن يكون قبل وقت النهاية', confirmButtonText: 'حسناً' })
            return
        }

        setSubmitting(true)

        try {
            // Check for time conflicts (CRITICAL LOGIC)
            const conflictCheck = await checkTimeConflict(
                parseInt(formData.dayOfWeek),
                formData.startTime,
                formData.endTime,
                isEditing ? editId : null
            )

            if (conflictCheck.hasConflict) {
                const conflict = conflictCheck.conflictWith
                const dayName = daysOfWeek.find(d => d.value === parseInt(formData.dayOfWeek))?.label

                Swal.fire({
                    icon: 'error',
                    title: '⚠️ تعارض في المواعيد',
                    html: `
            <div class="text-end" style="color:#E2E8F0;">
              <p><strong>يوجد تعارض مع حصة أخرى:</strong></p>
              <ul style="list-style:none;margin-top:0.75rem;padding:0;">
                <li>📚 الطالب: <strong>${conflict.students.name}</strong></li>
                <li>📅 اليوم: <strong>${dayName}</strong></li>
                <li>🕐 من: <strong>${conflict.start_time}</strong></li>
                <li>🕑 إلى: <strong>${conflict.end_time}</strong></li>
              </ul>
              <p style="margin-top:0.75rem;color:#EF4444;">الرجاء اختيار وقت آخر</p>
            </div>
          `,
                    confirmButtonText: 'حسناً'
                })
                setSubmitting(false)
                return
            }

            const today = new Date().toISOString().split('T')[0]

            if (isEditing) {
                // End the current schedule today
                const { error: updateError } = await supabase
                    .from('schedules')
                    .update({ valid_until: today })
                    .eq('id', editId)

                if (updateError) throw updateError

                // Insert the new one from today
                const { error: insertError } = await supabase
                    .from('schedules')
                    .insert([{
                        student_id: formData.studentId,
                        day_of_week: parseInt(formData.dayOfWeek),
                        start_time: formData.startTime,
                        end_time: formData.endTime,
                        valid_from: today
                    }])

                if (insertError) throw insertError
                
                Swal.fire({ icon: 'success', title: 'تم التعديل', text: 'تم تحديث الحصة بنجاح', timer: 1500, showConfirmButton: false })
            } else {
                // No conflict - proceed with insertion
                const { error } = await supabase
                    .from('schedules')
                    .insert([{
                        student_id: formData.studentId,
                        day_of_week: parseInt(formData.dayOfWeek),
                        start_time: formData.startTime,
                        end_time: formData.endTime,
                        valid_from: today
                    }])

                if (error) throw error

                Swal.fire({ icon: 'success', title: 'تم بنجاح', text: 'تمت إضافة الحصة إلى الجدول', timer: 1500, showConfirmButton: false })
            }

            // Reset form
            setFormData({
                studentId: '',
                dayOfWeek: '',
                startTime: '',
                endTime: ''
            })
            setIsEditing(false)
            setEditId(null)

            fetchData()
        } catch (error) {
            console.error('Error adding/updating schedule:', error)
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'حدث خطأ أثناء حفظ الحصة', confirmButtonText: 'حسناً' })
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (scheduleId) => {
        const result = await Swal.fire({
            title: 'هل أنت متأكد؟',
            text: 'سيتم أرشفة هذه الحصة ولن تظهر في الجداول القادمة',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، إيقاف',
            cancelButtonText: 'إلغاء'
        })

        if (result.isConfirmed) {
            try {
                // Get today's date formatted as YYYY-MM-DD
                const today = new Date().toISOString().split('T')[0]
                
                const { error } = await supabase
                    .from('schedules')
                    .update({ valid_until: today })
                    .eq('id', scheduleId)

                if (error) throw error

                Swal.fire({ icon: 'success', title: 'تم الإيقاف', text: 'تم إيقاف الحصة بنجاح', timer: 1500, showConfirmButton: false })

                fetchData()
            } catch (error) {
                console.error('Error ending schedule:', error)
                Swal.fire({ icon: 'error', title: 'خطأ', text: 'حدث خطأ أثناء إيقاف الحصة', confirmButtonText: 'حسناً' })
            }
        }
    }

    const startEdit = (schedule) => {
        setIsEditing(true)
        setEditId(schedule.id)
        setFormData({
            studentId: schedule.student_id,
            dayOfWeek: schedule.day_of_week.toString(),
            startTime: schedule.start_time.substring(0, 5), // trim seconds
            endTime: schedule.end_time.substring(0, 5) // trim seconds
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const cancelEdit = () => {
        setIsEditing(false)
        setEditId(null)
        setFormData({
            studentId: '',
            dayOfWeek: '',
            startTime: '',
            endTime: ''
        })
    }

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
                <span className="loading-text">جاري تحميل الجدول...</span>
            </div>
        )
    }

    return (
        <div className="page-content fade-in">
            {/* Header */}
            <div className="page-header">
                <h1 className="page-title">
                    <span className="page-title-icon"><MdCalendarMonth size={22} /></span>
                    جدولة الدروس
                </h1>
                <p className="page-subtitle">إضافة وعرض جدول الحصص الأسبوعية</p>
            </div>

            {/* Add Schedule Form */}
            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header-custom" style={isEditing ? { backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8' } : {}}>
                    {isEditing ? <MdEdit size={18} /> : <MdAdd size={18} color="#FFB800" />}
                    {isEditing ? 'تعديل الحصة' : 'إضافة حصة جديدة'}
                    {isEditing && (
                        <button className="btn-ghost" style={{ marginRight: 'auto', padding: '0.2rem 0.5rem' }} onClick={cancelEdit}>
                            <MdClose size={16} /> إلغاء
                        </button>
                    )}
                </div>
                <div className="card-body-custom">
                    {students.length === 0 ? (
                        <div className="alert-custom alert-warn-custom">
                            <MdWarning size={18} />
                            <span>
                                يجب إضافة طالب واحد على الأقل قبل جدولة الحصص.{' '}
                                <a href="/students" style={{ color: '#FFB800', fontWeight: 600 }}>انتقل إلى صفحة الطلاب</a>
                            </span>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                {/* Student */}
                                <div>
                                    <label className="form-label-custom">
                                        <MdPeople size={13} style={{ verticalAlign: 'middle', marginLeft: 4 }} />الطالب
                                    </label>
                                    <select
                                        className="form-control-custom form-select-custom"
                                        value={formData.studentId}
                                        onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                                        disabled={submitting}
                                    >
                                        <option value="">اختر الطالب...</option>
                                        {students.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* Day */}
                                <div>
                                    <label className="form-label-custom">
                                        <MdCalendarMonth size={13} style={{ verticalAlign: 'middle', marginLeft: 4 }} />اليوم
                                    </label>
                                    <select
                                        className="form-control-custom form-select-custom"
                                        value={formData.dayOfWeek}
                                        onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                                        disabled={submitting}
                                    >
                                        <option value="">اختر اليوم...</option>
                                        {daysOfWeek.map(d => (
                                            <option key={d.value} value={d.value}>{d.label}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* Start Time */}
                                <div>
                                    <label className="form-label-custom">
                                        <MdAccessTime size={13} style={{ verticalAlign: 'middle', marginLeft: 4 }} />وقت البداية
                                    </label>
                                    <input
                                        type="time"
                                        className="form-control-custom"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        disabled={submitting}
                                    />
                                </div>
                                {/* End Time */}
                                <div>
                                    <label className="form-label-custom">
                                        <MdAccessTime size={13} style={{ verticalAlign: 'middle', marginLeft: 4 }} />وقت النهاية
                                    </label>
                                    <input
                                        type="time"
                                        className="form-control-custom"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        disabled={submitting}
                                    />
                                </div>
                                {/* Submit */}
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <button type="submit" className="btn-primary-custom full lg" disabled={submitting} style={isEditing ? { background: 'linear-gradient(135deg, #38BDF8, #0EA5E9)' } : {}}>
                                        {submitting ? (
                                            <><div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: '#0B1221' }} /> جاري التحقق من التعارضات...</>
                                        ) : (
                                            <>{isEditing ? <MdEdit size={18} /> : <MdAdd size={18} />} {isEditing ? 'حفظ التعديلات' : 'إضافة إلى الجدول'}</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Schedules Table */}
            <div className="glass-card">
                <div className="card-header-custom">
                    <MdSchedule size={18} color="#FFB800" />
                    الجدول الأسبوعي
                    <span className="badge-custom badge-gold" style={{ marginRight: 'auto' }}>{schedules.length} حصة</span>
                </div>
                <div className="card-body-custom" style={{ padding: 0 }}>
                    {schedules.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon"><MdCalendarMonth size={30} /></div>
                            <p className="empty-state-title">لا يوجد حصص مجدولة حالياً</p>
                            <p className="empty-state-sub">أضف حصة جديدة من النموذج أعلاه</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table-custom">
                                <thead>
                                    <tr>
                                        <th>اليوم</th>
                                        <th>اسم الطالب</th>
                                        <th>وقت البداية</th>
                                        <th>وقت النهاية</th>
                                        <th>المدة</th>
                                        <th style={{ textAlign: 'center' }}>الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {schedules.map(schedule => {
                                        const dayName = daysOfWeek.find(d => d.value === schedule.day_of_week)?.label
                                        const start = new Date(`1970-01-01T${schedule.start_time}`)
                                        const end = new Date(`1970-01-01T${schedule.end_time}`)
                                        const durationMinutes = (end - start) / 60000
                                        const hours = Math.floor(durationMinutes / 60)
                                        const minutes = durationMinutes % 60
                                        const durationText = hours > 0
                                            ? `${hours} ساعة${minutes > 0 ? ` و ${minutes} دقيقة` : ''}`
                                            : `${minutes} دقيقة`

                                        return (
                                            <tr key={schedule.id}>
                                                <td><span className="badge-custom badge-gold">{dayName}</span></td>
                                                <td className="fw-600">{schedule.students.name}</td>
                                                <td><span className="time-badge"><MdAccessTime size={13} />{schedule.start_time}</span></td>
                                                <td><span className="time-badge"><MdAccessTime size={13} />{schedule.end_time}</span></td>
                                                <td className="text-slate fs-sm">{durationText}</td>
                                                <td style={{ textAlign: 'center', display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                                    <button className="btn-ghost" onClick={() => startEdit(schedule)} style={{ padding: '0.3rem 0.5rem', color: '#38BDF8', borderColor: 'rgba(56,189,248,0.3)' }}>
                                                        <MdEdit size={15} />
                                                        تعديل
                                                    </button>
                                                    <button className="btn-danger-custom" onClick={() => handleDelete(schedule.id)}>
                                                        <MdDeleteOutline size={15} />
                                                        إيقاف
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
    )
}

export default Schedule
