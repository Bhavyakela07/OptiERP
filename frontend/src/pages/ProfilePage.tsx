import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import { getUsersApi, createUserApi } from '../api/endpoints';
import { CheckIcon, CrossIcon, PlusIcon } from '../components/Icons';
import type { User } from '../types';

interface ModulePermission {
  module: string;
  permissions: { name: string; allowed: boolean }[];
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { show } = useToast();
  if (!user) return null;

  const role = user.role;
  const isAdmin = role === 'Admin';
  const isSales = role === 'Sales' || isAdmin;
  const isWarehouse = role === 'Warehouse' || isAdmin;

  const [usersList, setUsersList] = useState<User[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Sales' | 'Warehouse' | 'Accounts' | 'Admin'>('Sales');
  const [generatingUser, setGeneratingUser] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      getUsersApi()
        .then(r => setUsersList(r.data))
        .catch(() => {});
    }
  }, [isAdmin]);

  const handleGenerateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword) return;

    setGeneratingUser(true);
    try {
      const res = await createUserApi({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole
      });
      show(`User account created for ${res.data.name} (${res.data.role})!`, 'success');
      setShowUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('Sales');

      const updated = await getUsersApi();
      setUsersList(updated.data);
    } catch (err: any) {
      show(err.response?.data?.error || 'Failed to create user', 'error');
    } finally {
      setGeneratingUser(false);
    }
  };

  const MODULE_PERMISSIONS: ModulePermission[] = [
    {
      module: 'Customer Accounts & Leads',
      permissions: [
        { name: 'View Customer List & Details', allowed: true },
        { name: 'Create & Edit Customer Records', allowed: isSales },
        { name: 'Add Interaction & Follow-up Notes', allowed: isSales },
      ]
    },
    {
      module: 'Products & Inventory',
      permissions: [
        { name: 'View Products & Stock Levels', allowed: true },
        { name: 'Create & Edit Product SKUs', allowed: isWarehouse },
        { name: 'Execute Stock IN / Stock OUT Adjustments', allowed: isWarehouse },
        { name: 'View Stock Movement Audit Logs', allowed: true },
      ]
    },
    {
      module: 'Sales Challans & Dispatch',
      permissions: [
        { name: 'View Dispatch Challans & Items', allowed: true },
        { name: 'Create Draft Sales Challans', allowed: isSales },
        { name: 'Confirm Dispatch & Lock Transactions', allowed: isSales },
        { name: 'Cancel Orders & Challans', allowed: isSales },
      ]
    },
    {
      module: 'Administration & Security',
      permissions: [
        { name: 'Manage System Users & Roles', allowed: isAdmin },
        { name: 'Generate User Credentials & ID/Pass', allowed: isAdmin },
      ]
    }
  ];

  return (
    <>
      <Header title="My Profile" subtitle="Account details & role authorization permissions" />
      <div className="page-content">
        
        <div style={{ maxWidth: '780px' }}>
          
          {/* User Profile Card */}
          <GlassCard style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '64px', height: '64px',
              borderRadius: '50%',
              background: 'var(--accent-btn-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px', fontWeight: 800, color: 'var(--accent-btn-text)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border-glass)',
              flexShrink: 0
            }}>
              {user.name[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{user.name}</h1>
                <StatusBadge status={user.role === 'Admin' ? 'success' : 'info'} label={user.role} />
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{user.email}</p>
              <div style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-disabled)', marginTop: '4px' }}>
                ID: {user.id}
              </div>
            </div>
          </GlassCard>

          {/* Admin User Management Section */}
          {isAdmin && (
            <GlassCard style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Staff Account Credentials Management</h2>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>Only Admins can generate ID/Pass for new staff</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowUserModal(true)}>
                  <PlusIcon size={16} />
                  <span>Generate New User ID/Pass</span>
                </button>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email (Login ID)</th>
                      <th>Role</th>
                      <th>Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>No staff accounts registered</td></tr>
                    ) : (
                      usersList.map(u => (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{u.email}</td>
                          <td><StatusBadge status={u.role === 'Admin' ? 'success' : u.role === 'Sales' ? 'info' : u.role === 'Warehouse' ? 'warning' : 'info'} label={u.role} /></td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {/* Grouped Role Permission Checklist */}
          <GlassCard>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '18px' }}>
              Role Authorization Checklist — ({user.role})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {MODULE_PERMISSIONS.map((group, gIdx) => (
                <div key={gIdx}>
                  <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
                    {group.module}
                  </h3>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', overflow: 'hidden' }}>
                    {group.permissions.map((p, pIdx) => (
                      <div
                        key={pIdx}
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: pIdx === group.permissions.length - 1 ? 'none' : '1px solid var(--border-glass)'
                        }}
                      >
                        <span style={{ fontSize: '13.5px', color: p.allowed ? 'var(--text-primary)' : 'var(--text-disabled)' }}>
                          {p.name}
                        </span>
                        {p.allowed ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-success)', fontSize: '12px', fontWeight: 600 }}>
                            <CheckIcon size={14} color="var(--status-success)" />
                            <span>Granted</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-disabled)', fontSize: '12px', fontWeight: 500 }}>
                            <CrossIcon size={14} color="var(--text-disabled)" />
                            <span>Restricted</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

        </div>

        {/* Admin User Modal */}
        {showUserModal && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowUserModal(false)}>
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">Generate Staff User Credentials</h2>
                <button className="modal-close" onClick={() => setShowUserModal(false)}>
                  <CrossIcon size={16} />
                </button>
              </div>
              <form onSubmit={handleGenerateUser}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Staff Full Name *</label>
                    <input className="input" required placeholder="Sanjay Patel" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address (Login ID) *</label>
                    <input className="input" type="email" required placeholder="sanjay@company.com" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input className="input" type="text" required placeholder="Set password (min 6 chars)" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assigned Role *</label>
                    <select className="select" value={newUserRole} onChange={e => setNewUserRole(e.target.value as any)}>
                      <option value="Sales">Sales (Customers & Challans)</option>
                      <option value="Warehouse">Warehouse (Stock & SKUs)</option>
                      <option value="Accounts">Accounts (Read-Only Financials)</option>
                      <option value="Admin">Admin (Full Control & User Creation)</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={generatingUser}>{generatingUser ? 'Generating...' : 'Generate User ID/Pass'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
