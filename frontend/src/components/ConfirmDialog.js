import React, { useState, useCallback, useContext, createContext } from 'react';

const ConfirmContext = createContext(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be inside ConfirmProvider');
  return ctx;
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback(({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger' }) => {
    return new Promise((resolve) => {
      setState({ title, message, confirmLabel, cancelLabel, variant, resolve });
    });
  }, []);

  const handleConfirm = () => {
    state?.resolve(true);
    setState(null);
  };

  const handleCancel = () => {
    state?.resolve(false);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div style={overlay} onClick={handleCancel}>
          <div style={dialog} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: variantStyles[state.variant]?.iconBg || '#fee2e2',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke={variantStyles[state.variant]?.iconColor || '#dc2626'}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {state.variant === 'danger' ? (
                    <><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></>
                  ) : (
                    <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></>
                  )}
                </svg>
              </div>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>{state.title}</h3>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {state.message}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="btn-outline" onClick={handleCancel}>{state.cancelLabel}</button>
              <button
                className={variantStyles[state.variant]?.btnClass || 'btn-danger'}
                onClick={handleConfirm}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

const variantStyles = {
  danger: { iconBg: '#fee2e2', iconColor: '#dc2626', btnClass: 'btn-danger' },
  warning: { iconBg: '#fef3c7', iconColor: '#d97706', btnClass: 'btn-warning' },
  info: { iconBg: '#dbeafe', iconColor: '#2563eb', btnClass: 'btn-primary' },
};

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
};

const dialog = {
  background: 'var(--card)', borderRadius: 'var(--radius-lg)', padding: '24px 28px',
  width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  border: '1px solid var(--border)',
};
