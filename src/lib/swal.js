import Swal from 'sweetalert2'

// Pre-configured dark-themed SweetAlert2 instance
const swal = Swal.mixin({
    background: '#111827',
    color: '#E2E8F0',
    confirmButtonColor: '#FFB800',
    cancelButtonColor: '#1E293B',
    denyButtonColor: '#EF4444',
    customClass: {
        popup:          'swal-dark-popup',
        title:          'swal-dark-title',
        htmlContainer:  'swal-dark-html',
        confirmButton:  'swal-dark-confirm',
        cancelButton:   'swal-dark-cancel',
        denyButton:     'swal-dark-deny',
        input:          'swal-dark-input',
        footer:         'swal-dark-footer',
        icon:           'swal-dark-icon',
    }
})

export default swal
