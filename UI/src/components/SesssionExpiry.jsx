import { Clock } from 'lucide-react'
import React from 'react'

const SesssionExpiry = ({ onLogout }) => {
    return (
        <div className="modal-backdrop" style={{ zIndex: 9999 }}>
            <div className="profile-modal-card" style={{ maxWidth: '420px', padding: '28px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', margin: 'auto' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: '#dc2626' }}>
                    <Clock size={28} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0' }}>Session Expired</h3>
                <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0' }}>
                    Your JWT admin login session has expired. Please sign in again to continue accessing the ananda Admin Portal.
                </p>
                <button
                    onClick={onLogout}
                    className="btn-proceed-red"
                    style={{ width: '100%', marginTop: '8px' }}
                >
                    SIGN IN AGAIN
                </button>
            </div>
        </div>
    )
}

export default SesssionExpiry