import React, { useState } from 'react';

/**
 * High-tech animated agent step indicator for Verto AI.
 * Replaces plain text/emojis with modern animated micro-badges and glow effects.
 */
export default function AgentStepIndicator({ currentStep, steps = [] }) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!currentStep && (!steps || steps.length === 0)) return null;

    const activeStep = currentStep || steps[steps.length - 1];

    // Theme color mapping based on step icon/type
    const getStepTheme = (iconType) => {
        switch (iconType) {
            case 'pyq':
                return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: '#fcd34d', label: 'Archive Mining' };
            case 'syllabus':
                return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: '#6ee7b7', label: 'Curriculum Blueprint' };
            case 'notes':
                return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)', border: '#93c5fd', label: 'Notes Deep Extraction' };
            case 'generator':
                return { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)', border: '#c4b5fd', label: 'Synthesis Engine' };
            case 'reflection':
                return { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.08)', border: '#f9a8d4', label: 'Quality & Quota Auditor' };
            case 'explainability':
                return { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.08)', border: '#67e8f9', label: 'Attribution Verified' };
            default:
                return { color: '#c8861a', bg: 'rgba(200, 134, 26, 0.08)', border: '#e8c96a', label: 'Agent Pipeline' };
        }
    };

    const theme = getStepTheme(activeStep.icon);

    return (
        <div style={{
            margin: '8px 0 14px 0',
            fontFamily: "'Inter', sans-serif",
            display: 'inline-flex',
            flexDirection: 'column',
            maxWidth: '100%',
        }}>
            <style>{`
                @keyframes pulseGlow {
                    0% { box-shadow: 0 0 0 0 rgba(200, 134, 26, 0.4); }
                    70% { box-shadow: 0 0 0 7px rgba(200, 134, 26, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(200, 134, 26, 0); }
                }
                @keyframes scanBar {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
            `}</style>

            {/* Current Active Step Badge */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    background: theme.bg,
                    border: `1px solid ${theme.border}`,
                    cursor: steps.length > 1 ? 'pointer' : 'default',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                }}
            >
                {/* Scanner line animation across the badge */}
                <div style={{
                    position: 'absolute',
                    top: 0, bottom: 0, left: 0,
                    width: '35%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                    animation: 'scanBar 2s infinite linear',
                    pointerEvents: 'none',
                }} />

                {/* Animated Pulsing Dot */}
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: theme.color,
                    animation: 'pulseGlow 1.8s infinite',
                    flexShrink: 0,
                }} />

                {/* Step Text */}
                <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: theme.color,
                    letterSpacing: '0.02em',
                }}>
                    {theme.label}:
                </span>

                <span style={{
                    fontSize: '0.8rem',
                    color: '#1f1209',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '380px',
                }}>
                    {activeStep.label || activeStep.step}
                </span>

                {steps.length > 1 && (
                    <span style={{
                        fontSize: '0.68rem',
                        color: '#9a7845',
                        marginLeft: '4px',
                        background: 'rgba(255,255,255,0.7)',
                        padding: '1px 6px',
                        borderRadius: '8px',
                    }}>
                        {steps.length} steps {isExpanded ? '▲' : '▼'}
                    </span>
                )}
            </div>

            {/* Expanded step trajectory log */}
            {isExpanded && steps.length > 1 && (
                <div style={{
                    marginTop: '8px',
                    padding: '10px 14px',
                    background: '#fdfaf5',
                    border: '1px solid #e9dcc8',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '0.75rem',
                }}>
                    {steps.map((st, idx) => {
                        const stTheme = getStepTheme(st.icon);
                        return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: idx === steps.length - 1 ? stTheme.color : '#9a7845',
                                }} />
                                <span style={{ fontWeight: 600, color: stTheme.color }}>{st.label}</span>
                                {st.description && <span style={{ color: '#785428' }}>— {st.description}</span>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
