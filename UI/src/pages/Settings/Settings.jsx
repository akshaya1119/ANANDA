const Settings = ({ API_BASE }) => {
    return (
        <div className="settings-container">
            <div className="dashboard-table-card full padding-large">
                <h2 className="settings-section-title">System Settings</h2>
                <div className="settings-grid">
                    <div className="setting-card">
                        <h4>API Services</h4>
                        <p>Backend endpoint base URL: <code>{API_BASE}</code></p>
                        <span className="status-indicator online">Active connection</span>
                    </div>

                    <div className="setting-card">
                        <h4>Security Mode</h4>
                        <p>Token verification protocol: <code>HMAC-SHA256</code> JWT</p>
                        <span className="status-indicator online">Secure Session (1 Day expiry)</span>
                    </div>

                    <div className="setting-card">
                        <h4>Connected SQL Database</h4>
                        <p>Catalog: <code>ananda</code></p>
                        <span className="status-indicator online">Online</span>
                    </div>
                </div>

                <hr className="divider" />

                <h3 className="settings-subtitle">Seeded Accounts</h3>
                <p className="sub-text">To add or modify administrative users, update records in the <code>Users</code> database table.</p>
            </div>
        </div>
    )
}

export default Settings