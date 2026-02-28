import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Swal from '../lib/swal'
import { MdPeople, MdPersonAdd, MdDeleteOutline, MdCalendarToday } from 'react-icons/md'

function Students() {
    const [students, setStudents] = useState([])
    const [newStudentName, setNewStudentName] = useState('')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchStudents()
    }, [])

    const fetchStudents = async () => {
        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setStudents(data || [])
        } catch (error) {
            console.error('Error fetching students:', error)
            Swal.fire({ ...swalTheme, icon: 'error', title: 'خطأ', text: 'حدث خطأ أثناء تحميل قائمة الطلاب', confirmButtonText: 'حسناً' })
        } finally {
            setLoading(false)
        }
    }

    const handleAddStudent = async (e) => {
        e.preventDefault()

        if (!newStudentName.trim()) {
            Swal.fire({ ...swalTheme, icon: 'warning', title: 'تنبيه', text: 'الرجاء إدخال اسم الطالب', confirmButtonText: 'حسناً' })
            return
        }

        setSubmitting(true)

        try {
            const { data, error } = await supabase
                .from('students')
                .insert([{ name: newStudentName.trim() }])
                .select()

            if (error) throw error

            Swal.fire({ ...swalTheme, icon: 'success', title: 'تم بنجاح', text: 'تمت إضافة الطالب بنجاح', timer: 1500, showConfirmButton: false })

            setNewStudentName('')
            fetchStudents()
        } catch (error) {
            console.error('Error adding student:', error)
            Swal.fire({ ...swalTheme, icon: 'error', title: 'خطأ', text: 'حدث خطأ أثناء إضافة الطالب', confirmButtonText: 'حسناً' })
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteStudent = async (studentId, studentName) => {
        const result = await Swal.fire({
            title: 'هل أنت متأكد؟',
            text: `سيتم حذف الطالب "${studentName}" وجميع البيانات المرتبطة به (الجداول والحضور)`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء'
        })

        if (result.isConfirmed) {
            try {
                const { error } = await supabase
                    .from('students')
                    .delete()
                    .eq('id', studentId)

                if (error) throw error

                Swal.fire({ icon: 'success', title: 'تم الحذف', text: 'تم حذف الطالب بنجاح', timer: 1500, showConfirmButton: false })

                fetchStudents()
            } catch (error) {
                console.error('Error deleting student:', error)
                Swal.fire({ icon: 'error', title: 'خطأ', text: 'حدث خطأ أثناء حذف الطالب', confirmButtonText: 'حسناً' })
            }
        }
    }

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
                <span className="loading-text">جاري تحميل قائمة الطلاب...</span>
            </div>
        )
    }

    return (
        <div className="page-content fade-in">
            {/* Header */}
            <div className="page-header">
                <h1 className="page-title">
                    <span className="page-title-icon"><MdPeople size={22} /></span>
                    إدارة الطلاب
                </h1>
                <p className="page-subtitle">إضافة وعرض وحذف الطلاب</p>
            </div>

            {/* Add Student Form */}
            <div className="glass-card" style={{ maxWidth: 560, marginBottom: '1.5rem' }}>
                <div className="card-header-custom">
                    <MdPersonAdd size={18} color="#FFB800" />
                    إضافة طالب جديد
                </div>
                <div className="card-body-custom">
                    <form onSubmit={handleAddStudent}>
                        <div className="input-group-custom">
                            <input
                                type="text"
                                className="form-control-custom form-control-lg-custom"
                                placeholder="اسم الطالب"
                                value={newStudentName}
                                onChange={(e) => setNewStudentName(e.target.value)}
                                disabled={submitting}
                            />
                            <button type="submit" className="btn-primary-custom lg" disabled={submitting}>
                                {submitting
                                    ? <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: '#0B1221' }} />
                                    : <><MdPersonAdd size={16} /> إضافة</>
                                }
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Students Table */}
            <div className="glass-card">
                <div className="card-header-custom">
                    <MdPeople size={18} color="#FFB800" />
                    قائمة الطلاب
                    <span className="badge-custom badge-gold" style={{ marginRight: 'auto' }}>{students.length}</span>
                </div>
                <div className="card-body-custom" style={{ padding: 0 }}>
                    {students.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon"><MdPeople size={30} /></div>
                            <p className="empty-state-title">لا يوجد طلاب حالياً</p>
                            <p className="empty-state-sub">قم بإضافة طالب جديد للبدء</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table-custom">
                                <thead>
                                    <tr>
                                        <th style={{ width: 55 }}>#</th>
                                        <th>اسم الطالب</th>
                                        <th><MdCalendarToday size={13} style={{ verticalAlign: 'middle', marginLeft: 4 }} />تاريخ التسجيل</th>
                                        <th style={{ width: 100, textAlign: 'center' }}>الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student, index) => (
                                        <tr key={student.id}>
                                            <td className="text-slate">{index + 1}</td>
                                            <td className="fw-600">{student.name}</td>
                                            <td className="text-slate fs-sm">
                                                {new Date(student.created_at).toLocaleDateString('ar-EG')}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    className="btn-danger-custom"
                                                    onClick={() => handleDeleteStudent(student.id, student.name)}
                                                >
                                                    <MdDeleteOutline size={15} />
                                                    حذف
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Students
