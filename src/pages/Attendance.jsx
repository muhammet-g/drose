import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Swal from 'sweetalert2'
import { MdAssignment, MdCalendarToday, MdEditNote, MdDeleteOutline, MdCheckCircle, MdCancel, MdSchedule, MdNotes } from 'react-icons/md'

const swalTheme = { background: '#111827', color: '#E2E8F0' }

function Attendance() {
    const [attendanceRecords, setAttendanceRecords] = useState([])
    const [selectedDate, setSelectedDate] = useState('')
    const [loading, setLoading] = useState(false)

    const statusLabels = {
        present: { text: 'حاضر', color: 'success', icon: '✅' },
        absent: { text: 'غائب', color: 'danger', icon: '❌' },
        excused: { text: 'غياب بعذر', color: 'warning', icon: '📝' },
        postponed: { text: 'مؤجل', color: 'secondary', icon: '⏰' }
    }

    useEffect(() => {
        // Set today's date as default
        const today = new Date()
        const formattedDate = today.toISOString().split('T')[0]
        setSelectedDate(formattedDate)
    }, [])

    useEffect(() => {
        if (selectedDate) {
            fetchAttendance()
        }
    }, [selectedDate])

    const fetchAttendance = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('attendance')
                .select(`
          *,
          students (
            name
          )
        `)
                .eq('date', selectedDate)
                .order('created_at', { ascending: false })

            if (error) throw error

            setAttendanceRecords(data || [])
        } catch (error) {
            console.error('Error fetching attendance:', error)
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'حدث خطأ أثناء تحميل سجلات الحضور',
                confirmButtonText: 'حسناً'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateStatus = async (recordId, currentStatus, studentName) => {
        const result = await Swal.fire({
            title: `تعديل حالة: ${studentName}`,
            text: 'اختر الحالة الجديدة:',
            input: 'select',
            inputOptions: {
                present: '✅ حاضر',
                absent: '❌ غائب',
                excused: '📝 غياب بعذر',
                postponed: '⏰ مؤجل'
            },
            inputValue: currentStatus,
            showCancelButton: true,
            confirmButtonText: 'تحديث',
            cancelButtonText: 'إلغاء',
            inputValidator: (value) => {
                if (!value) {
                    return 'يجب اختيار حالة'
                }
            }
        })

        if (result.isConfirmed) {
            try {
                const { error } = await supabase
                    .from('attendance')
                    .update({ status: result.value })
                    .eq('id', recordId)

                if (error) throw error

                Swal.fire({
                    icon: 'success',
                    title: 'تم التحديث',
                    text: 'تم تحديث حالة الحضور بنجاح',
                    timer: 1500,
                    showConfirmButton: false
                })

                fetchAttendance()
            } catch (error) {
                console.error('Error updating status:', error)
                Swal.fire({
                    icon: 'error',
                    title: 'خطأ',
                    text: 'حدث خطأ أثناء تحديث الحالة',
                    confirmButtonText: 'حسناً'
                })
            }
        }
    }

    const handleDelete = async (recordId, studentName) => {
        const result = await Swal.fire({
            title: 'هل أنت متأكد؟',
            text: `سيتم حذف سجل الحضور لـ "${studentName}"`,
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
                    .from('attendance')
                    .delete()
                    .eq('id', recordId)

                if (error) throw error

                Swal.fire({
                    icon: 'success',
                    title: 'تم الحذف',
                    text: 'تم حذف السجل بنجاح',
                    timer: 1500,
                    showConfirmButton: false
                })

                fetchAttendance()
            } catch (error) {
                console.error('Error deleting record:', error)
                Swal.fire({
                    icon: 'error',
                    title: 'خطأ',
                    text: 'حدث خطأ أثناء حذف السجل',
                    confirmButtonText: 'حسناً'
                })
            }
        }
    }

    const getStatistics = () => {
        const total = attendanceRecords.length
        const present = attendanceRecords.filter(r => r.status === 'present').length
        const absent = attendanceRecords.filter(r => r.status === 'absent').length
        const excused = attendanceRecords.filter(r => r.status === 'excused').length
        const postponed = attendanceRecords.filter(r => r.status === 'postponed').length

        return { total, present, absent, excused, postponed }
    }

    const stats = getStatistics()

    return (
        <div className="page-content fade-in">
            {/* Header */}
            <div className="page-header">
                <h1 className="page-title">
                    <span className="page-title-icon"><MdAssignment size={22} /></span>
                    الحضور والسجلات
                </h1>
                <p className="page-subtitle">عرض وتعديل سجلات الحضور</p>
            </div>

            {/* Date Picker */}
            <div className="glass-card" style={{ maxWidth: 400, marginBottom: '1.5rem' }}>
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
                </div>
            </div>

            {/* Statistics */}
            {attendanceRecords.length > 0 && (
                <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
                    <div className="stat-card">
                        <div className="stat-icon-wrap gold"><MdAssignment size={22} color="#FFB800" /></div>
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">الإجمالي</div>
                    </div>
                    <div className="stat-card success">
                        <div className="stat-icon-wrap green"><MdCheckCircle size={22} color="#10B981" /></div>
                        <div className="stat-value" style={{ color: '#10B981' }}>{stats.present}</div>
                        <div className="stat-label">حاضر</div>
                    </div>
                    <div className="stat-card error">
                        <div className="stat-icon-wrap red"><MdCancel size={22} color="#EF4444" /></div>
                        <div className="stat-value" style={{ color: '#EF4444' }}>{stats.absent}</div>
                        <div className="stat-label">غائب</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon-wrap orange"><MdSchedule size={22} color="#F59E0B" /></div>
                        <div className="stat-value" style={{ color: '#F59E0B' }}>{stats.excused + stats.postponed}</div>
                        <div className="stat-label">بعذر / مؤجل</div>
                    </div>
                </div>
            )}

            {/* Attendance Table */}
            <div className="glass-card">
                <div className="card-header-custom">
                    <MdNotes size={18} color="#FFB800" />
                    سجلات الحضور
                    <span className="badge-custom badge-gold" style={{ marginRight: 'auto' }}>{attendanceRecords.length}</span>
                </div>
                <div className="card-body-custom" style={{ padding: 0 }}>
                    {loading ? (
                        <div className="empty-state">
                            <div className="loading-spinner" />
                        </div>
                    ) : attendanceRecords.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon"><MdAssignment size={30} /></div>
                            <p className="empty-state-title">لا توجد سجلات حضور لهذا التاريخ</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table-custom">
                                <thead>
                                    <tr>
                                        <th style={{ width: 50 }}>#</th>
                                        <th>اسم الطالب</th>
                                        <th>التاريخ</th>
                                        <th>الحالة</th>
                                        <th>آخر تحديث</th>
                                        <th style={{ textAlign: 'center', width: 160 }}>الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendanceRecords.map((record, index) => {
                                        const si = statusLabels[record.status]
                                        const badgeClass = {
                                            present: 'badge-success',
                                            absent: 'badge-danger',
                                            excused: 'badge-warning',
                                            postponed: 'badge-muted'
                                        }[record.status] || 'badge-muted'
                                        return (
                                            <tr key={record.id}>
                                                <td className="text-slate">{index + 1}</td>
                                                <td className="fw-600">{record.students.name}</td>
                                                <td className="text-slate fs-sm">{new Date(record.date).toLocaleDateString('ar-EG')}</td>
                                                <td>
                                                    <span className={`badge-custom ${badgeClass}`}>
                                                        {si.icon} {si.text}
                                                    </span>
                                                </td>
                                                <td className="text-slate fs-sm">{new Date(record.updated_at).toLocaleString('ar-EG')}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                                        <button className="btn-warning-custom" onClick={() => handleUpdateStatus(record.id, record.status, record.students.name)}>
                                                            <MdEditNote size={15} />
                                                            تعديل
                                                        </button>
                                                        <button className="btn-danger-custom" onClick={() => handleDelete(record.id, record.students.name)}>
                                                            <MdDeleteOutline size={15} />
                                                            حذف
                                                        </button>
                                                    </div>
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

export default Attendance
