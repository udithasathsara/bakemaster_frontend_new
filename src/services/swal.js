import Swal from 'sweetalert2';

export const showSuccess = (message) => {
    Swal.fire({
        icon: 'success',
        title: 'Success',
        text: message,
        timer: 2000,
        showConfirmButton: false,
        background: '#f0fdf4',
        iconColor: '#16a34a'
    });
};

export const showError = (message) => {
    Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: message || 'Something went wrong',
        background: '#fef2f2',
        iconColor: '#dc2626'
    });
};

export const showConfirm = (message) => {
    return Swal.fire({
        icon: 'warning',
        title: 'Are you sure?',
        text: message,
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    });
};