import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Swal from 'sweetalert2'

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
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'حدث خطأ أثناء تحميل قائمة الطلاب',
                confirmButtonText: 'حسناً'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleAddStudent = async (e) => {
        e.preventDefault()

        if (!newStudentName.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'تنبيه',
                text: 'الرجاء إدخال اسم الطالب',
                confirmButtonText: 'حسناً'
            })
            return
        }

        setSubmitting(true)

        try {
            const { data, error } = await supabase
                .from('students')
                .insert([{ name: newStudentName.trim() }])
                .select()

            if (error) throw error

            Swal.fire({
                icon: 'success',
                title: 'تم بنجاح',
                text: 'تمت إضافة الطالب بنجاح',
                timer: 1500,
                showConfirmButton: false
            })

            setNewStudentName('')
            fetchStudents()
        } catch (error) {
            console.error('Error adding student:', error)
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'حدث خطأ أثناء إضافة الطالب',
                confirmButtonText: 'حسناً'
            })
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
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
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

                Swal.fire({
                    icon: 'success',
                    title: 'تم الحذف',
                    text: 'تم حذف الطالب بنجاح',
                    timer: 1500,
                    showConfirmButton: false
                })

                fetchStudents()
            } catch (error) {
                console.error('Error deleting student:', error)
                Swal.fire({
                    icon: 'error',
                    title: 'خطأ',
                    text: 'حدث خطأ أثناء حذف الطالب',
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
                    <h1 className="display-5 fw-bold text-primary">إدارة الطلاب</h1>
                    <p className="lead text-muted">إضافة وعرض وحذف الطلاب</p>
                </div>
            </div>

            {/* Add Student Form */}
            <div className="row mb-4">
                <div className="col-lg-6">
                    <div className="card shadow-sm border-0">
                        <div className="card-body">
                            <h5 className="card-title mb-3">إضافة طالب جديد</h5>
                            <form onSubmit={handleAddStudent}>
                                <div className="input-group">
                                    <input
                                        type="text"
                                        className="form-control form-control-lg"
                                        placeholder="اسم الطالب"
                                        value={newStudentName}
                                        onChange={(e) => setNewStudentName(e.target.value)}
                                        disabled={submitting}
                                    />
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <span className="spinner-border spinner-border-sm ms-2" role="status"></span>
                                        ) : null}
                                        إضافة
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Students List */}
            <div className="row">
                <div className="col">
                    <div className="card shadow-sm border-0">
                        <div className="card-body">
                            <h5 className="card-title mb-3">
                                قائمة الطلاب ({students.length})
                            </h5>

                            {students.length === 0 ? (
                                <div className="alert alert-info text-center" role="alert">
                                    لا يوجد طلاب حالياً. قم بإضافة طالب جديد للبدء!
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th style={{ width: '60px' }}>#</th>
                                                <th>اسم الطالب</th>
                                                <th style={{ width: '200px' }}>تاريخ التسجيل</th>
                                                <th style={{ width: '120px' }} className="text-center">الإجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.map((student, index) => (
                                                <tr key={student.id}>
                                                    <td className="text-muted">{index + 1}</td>
                                                    <td className="fw-semibold">{student.name}</td>
                                                    <td className="text-muted">
                                                        {new Date(student.created_at).toLocaleDateString('ar-EG')}
                                                    </td>
                                                    <td className="text-center">
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => handleDeleteStudent(student.id, student.name)}
                                                        >
                                                            🗑️ حذف
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
            </div>
        </div>
    )
}

export default Students
