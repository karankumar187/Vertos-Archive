import React from 'react';

/**
 * Animated Loading Bubble for Verto AI.
 * Shows high-level, friendly loading status without exposing proprietary agent architecture.
 */
export default function AgentStepIndicator({ currentStep }) {
    if (!currentStep) return null;

    // Sanitize technical labels to user-friendly text
    const cleanLabel = (text) => {
        if (!text) return 'Analyzing academic material...';
        if (/dispatching to.*agent/i.test(text)) return 'Consulting course archives...';
        if (/blueprint|curriculum/i.test(text)) return 'Structuring course syllabus...';
        if (/pyq|past year/i.test(text)) return 'Searching past exam papers...';
        if (/notes|extraction/i.test(text)) return 'Reviewing lecture notes & materials...';
        if (/synthesis|generator/i.test(text)) return 'Synthesizing verified response...';
        if (/auditor|reflection|quality/i.test(text)) return 'Verifying academic accuracy...';
        if (/revision|formula/i.test(text)) return 'Compiling formulas & exam tips...';
        return text;
    };

    const displayText = cleanLabel(currentStep.label || currentStep.step);

    return (
        <div style={{
            margin: '4px 0 10px 0',
            fontFamily: "'Inter', sans-serif",
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.5) 0%, rgba(253, 230, 138, 0.25) 100%)',
            border: '1px solid #fde68a',
            position: 'relative',
            overflow: 'hidden',
        }}>
            <style>{`
                @keyframes pulseDot {
                    0% { transform: scale(0.9); opacity: 0.7; box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.5); }
                    70% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 0 6px rgba(217, 119, 6, 0); }
                    100% { transform: scale(0.9); opacity: 0.7; box-shadow: 0 0 0 0 rgba(217, 119, 6, 0); }
                }
                @keyframes shimmerEffect {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(250%); }
                }
            `}</style>

            {/* Shimmer sweep */}
            <div style={{
                position: 'absolute',
                top: 0, bottom: 0, left: 0,
                width: '40%',
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)',
                animation: 'shimmerEffect 2.2s infinite ease-in-out',
                pointerEvents: 'none',
            }} />

            {/* Glowing animated amber indicator */}
            <div style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#d97706',
                animation: 'pulseDot 1.6s infinite ease-in-out',
                flexShrink: 0,
            }} />

            {/* Clean Status Text */}
            <span style={{
                fontSize: '0.74rem',
                fontWeight: 600,
                color: '#92400e',
                letterSpacing: '0.01em',
            }}>
                {displayText}
            </span>
        </div>
    );
}
