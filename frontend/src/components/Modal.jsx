export default function Modal({ isOpen, onClose, title, children, size }) {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={`modal ${size === 'lg' ? 'lg' : ''}`}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="btn btn-secondary btn-sm btn-icon" onClick={onClose}>✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}
