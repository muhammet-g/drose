import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Swal from 'sweetalert2'

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
        <div className="container">
            <div className="row mb-4">
                <div className="col">
                    <h1 className="display-5 fw-bold text-primary">الحضور والسجلات</h1>
                    <p className="lead text-muted">عرض وتعديل سجلات الحضور</p>
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
                        </div>
                    </div>
                </div>
            </div>

            {/* Statistics */}
            {attendanceRecords.length > 0 && (
                <div className="row mb-4">
                    <div className="col">
                        <div className="card shadow-sm border-0 bg-light">
                            <div className="card-body">
                                <h6 className="card-title mb-3">إحصائيات اليوم</h6>
                                <div className="row text-center">
                                    <div className="col">
                                        <div className="h3 mb-0">{stats.total}</div>
                                        <small className="text-muted">الإجمالي</small>
                                    </div>
                                    <div className="col">
                                        <div className="h3 mb-0 text-success">{stats.present}</div>
                                        <small className="text-muted">حاضر</small>
                                    </div>
                                    <div className="col">
                                        <div className="h3 mb-0 text-danger">{stats.absent}</div>
                                        <small className="text-muted">غائب</small>
                                    </div>
                                    <div className="col">
                                        <div className="h3 mb-0 text-warning">{stats.excused}</div>
                                        <small className="text-muted">بعذر</small>
                                    </div>
                                    <div className="col">
                                        <div className="h3 mb-0 text-secondary">{stats.postponed}</div>
                                        <small className="text-muted">مؤجل</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Attendance Records Table */}
            <div className="row">
                <div className="col">
                    <div className="card shadow-sm border-0">
                        <div className="card-body">
                            <h5 className="card-title mb-3">
                                سجلات الحضور ({attendanceRecords.length})
                            </h5>

                            {loading ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">جاري التحميل...</span>
                                    </div>
                                </div>
                            ) : attendanceRecords.length === 0 ? (
                                <div className="alert alert-info text-center" role="alert">
                                    لا توجد سجلات حضور لهذا التاريخ
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th style={{ width: '60px' }}>#</th>
                                                <th>اسم الطالب</th>
                                                <th>التاريخ</th>
                                                <th>الحالة</th>
                                                <th>آخر تحديث</th>
                                                <th className="text-center" style={{ width: '200px' }}>الإجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attendanceRecords.map((record, index) => {
                                                const statusInfo = statusLabels[record.status]
                                                return (
                                                    <tr key={record.id}>
                                                        <td className="text-muted">{index + 1}</td>
                                                        <td className="fw-semibold">{record.students.name}</td>
                                                        <td>{new Date(record.date).toLocaleDateString('ar-EG')}</td>
                                                        <td>
                                                            <span className={`badge bg-${statusInfo.color}`}>
                                                                {statusInfo.icon} {statusInfo.text}
                                                            </span>
                                                        </td>
                                                        <td className="text-muted small">
                                                            {new Date(record.updated_at).toLocaleString('ar-EG')}
                                                        </td>
                                                        <td className="text-center">
                                                            <button
                                                                className="btn btn-warning btn-sm me-2"
                                                                onClick={() => handleUpdateStatus(
                                                                    record.id,
                                                                    record.status,
                                                                    record.students.name
                                                                )}
                                                            >
                                                                ✏️ تعديل
                                                            </button>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => handleDelete(record.id, record.students.name)}
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

export default Attendance
