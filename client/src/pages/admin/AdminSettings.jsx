import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";

const PROVIDERS = [
    {
        id: "openrouter",
        name: "OpenRouter",
        icon: "🌐",
        description: "Auto-routes to best available free model",
        model: "openrouter/free",
        color: "#7c3aed",
        bgColor: "#f5f3ff",
        borderColor: "#ddd6fe",
    },
    {
        id: "groq",
        name: "Groq",
        icon: "⚡",
        description: "Ultra-fast inference on Llama 3.1 8B",
        model: "llama-3.1-8b-instant",
        color: "#0891b2",
        bgColor: "#ecfeff",
        borderColor: "#a5f3fc",
    },
    {
        id: "huggingface",
        name: "HuggingFace",
        icon: "🤗",
        description: "Hosted Llama 3.1 8B via nscale",
        model: "meta-llama/Llama-3.1-8B",
        color: "#d97706",
        bgColor: "#fffbeb",
        borderColor: "#fde68a",
    },
    {
        id: "mistral",
        name: "Mistral",
        icon: "🌀",
        description: "Mistral NeMo — strong European model",
        model: "open-mistral-nemo",
        color: "#0284c7",
        bgColor: "#f0f9ff",
        borderColor: "#bae6fd",
    },
    {
        id: "openai",
        name: "OpenAI",
        icon: "✨",
        description: "GPT-4o mini — always-on ultimate fallback",
        model: "gpt-4o-mini",
        color: "#059669",
        bgColor: "#ecfdf5",
        borderColor: "#a7f3d0",
        locked: true,
    },
];

const ToggleSwitch = ({ checked, onChange, disabled }) => (
    <button
        onClick={() => !disabled && onChange(!checked)}
        style={{
            width: 44, height: 24, borderRadius: 12, border: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            background: checked ? "#c8861a" : "#d1d5db",
            position: "relative", transition: "background 0.2s", padding: 0,
            opacity: disabled ? 0.5 : 1,
            flexShrink: 0,
        }}
        title={disabled ? "OpenAI cannot be disabled — it's the ultimate fallback" : ""}
    >
        <span style={{
            position: "absolute", top: 3, left: checked ? 23 : 3,
            width: 18, height: 18, borderRadius: "50%",
            background: "#fff", transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
    </button>
);

export default function AdminSettings() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data } = await adminAPI.getLLMSettings();
            setSettings(data.settings);
        } catch {
            setError("Failed to load settings.");
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async (patch) => {
        setSaving(true);
        setSaved(false);
        try {
            const { data } = await adminAPI.updateLLMSettings(patch);
            setSettings(data.settings);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch {
            setError("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    const setRoutingMode = (mode) => {
        const updated = { ...settings, routingMode: mode };
        setSettings(updated);
        saveSettings({ routingMode: mode });
    };

    const toggleProvider = (id, enabled) => {
        const updated = {
            ...settings,
            providerEnabled: { ...settings.providerEnabled, [id]: enabled },
        };
        setSettings(updated);
        saveSettings({ providerEnabled: { ...updated.providerEnabled } });
    };

    const setThreshold = (val) => {
        setSettings(s => ({ ...s, confidenceThreshold: val }));
    };

    const commitThreshold = () => {
        saveSettings({ confidenceThreshold: settings.confidenceThreshold });
    };

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
            <div style={{ textAlign: "center" }}>
                <div style={{
                    width: 40, height: 40, border: "3px solid #e9dcc8", borderTopColor: "#c8861a",
                    borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px"
                }} />
                <p style={{ color: "#8b6535", fontSize: "0.9rem" }}>Loading settings…</p>
            </div>
        </div>
    );

    if (error) return (
        <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 12, padding: 24, color: "#b91c1c" }}>
            {error}
        </div>
    );

    const activeCount = settings
        ? PROVIDERS.filter(p => !p.locked && settings.providerEnabled[p.id]).length
        : 0;

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 820 }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem",
                        border: "1px solid #fcd34d",
                    }}>⚙️</div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "#1f1209" }}>
                            LLM Router Settings
                        </h1>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "#8b6535" }}>
                            Control how Verto AI routes requests across providers
                        </p>
                    </div>
                    {saved && (
                        <div style={{
                            marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
                            background: "#ecfdf5", border: "1px solid #a7f3d0",
                            borderRadius: 20, padding: "6px 14px",
                            fontSize: "0.8rem", fontWeight: 600, color: "#059669",
                        }}>
                            ✓ Saved
                        </div>
                    )}
                    {saving && (
                        <div style={{
                            marginLeft: "auto",
                            fontSize: "0.8rem", fontWeight: 600, color: "#c8861a",
                        }}>
                            Saving…
                        </div>
                    )}
                </div>
            </div>

            {/* Routing Mode Card */}
            <div style={{
                background: "#fff", border: "1px solid #f0e6d2",
                borderRadius: 16, padding: 24, marginBottom: 20,
                boxShadow: "0 2px 8px rgba(200,134,26,0.06)",
            }}>
                <h2 style={{ margin: "0 0 6px", fontSize: "1rem", fontWeight: 700, color: "#1f1209" }}>
                    Routing Strategy
                </h2>
                <p style={{ margin: "0 0 20px", fontSize: "0.83rem", color: "#8b6535" }}>
                    Choose how incoming chat requests are distributed across free LLM providers.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {/* Waterfall Option */}
                    <button onClick={() => setRoutingMode("waterfall")} style={{
                        padding: "18px 20px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                        border: `2px solid ${settings.routingMode === "waterfall" ? "#c8861a" : "#f0e6d2"}`,
                        background: settings.routingMode === "waterfall" ? "#fffbf0" : "#fafaf8",
                        transition: "all 0.15s",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            <span style={{ fontSize: "1.4rem" }}>🪜</span>
                            <div>
                                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1f1209" }}>Waterfall</div>
                                <div style={{ fontSize: "0.72rem", color: "#c8861a", fontWeight: 600 }}>Current Mode</div>
                            </div>
                            {settings.routingMode === "waterfall" && (
                                <div style={{
                                    marginLeft: "auto", width: 18, height: 18, borderRadius: "50%",
                                    background: "#c8861a", display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0,
                                }}>
                                    <span style={{ color: "#fff", fontSize: "0.65rem", fontWeight: 900 }}>✓</span>
                                </div>
                            )}
                        </div>
                        <p style={{ margin: 0, fontSize: "0.78rem", color: "#6b4d1f", lineHeight: 1.5 }}>
                            Tries providers in fixed priority order. Always gives the <strong>best quality</strong> provider first. Ideal for low-traffic environments.
                        </p>
                        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {["OpenRouter", "Groq", "HuggingFace", "Mistral", "OpenAI"].map((p, i) => (
                                <span key={p} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.7rem", color: "#8b6535", fontWeight: 600 }}>
                                    {i > 0 && <span style={{ color: "#d4b896" }}>→</span>}
                                    {p}
                                </span>
                            ))}
                        </div>
                    </button>

                    {/* Load Balance Option */}
                    <button onClick={() => setRoutingMode("load-balance")} style={{
                        padding: "18px 20px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                        border: `2px solid ${settings.routingMode === "load-balance" ? "#7c3aed" : "#f0e6d2"}`,
                        background: settings.routingMode === "load-balance" ? "#f5f3ff" : "#fafaf8",
                        transition: "all 0.15s",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            <span style={{ fontSize: "1.4rem" }}>⚖️</span>
                            <div>
                                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1f1209" }}>Load Balance</div>
                                <div style={{ fontSize: "0.72rem", color: "#7c3aed", fontWeight: 600 }}>Recommended for high traffic</div>
                            </div>
                            {settings.routingMode === "load-balance" && (
                                <div style={{
                                    marginLeft: "auto", width: 18, height: 18, borderRadius: "50%",
                                    background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0,
                                }}>
                                    <span style={{ color: "#fff", fontSize: "0.65rem", fontWeight: 900 }}>✓</span>
                                </div>
                            )}
                        </div>
                        <p style={{ margin: 0, fontSize: "0.78rem", color: "#6b4d1f", lineHeight: 1.5 }}>
                            Randomly shuffles free providers on each request. <strong>Spreads rate-limit quota</strong> evenly. Best for concurrent or high-volume usage.
                        </p>
                        <div style={{ marginTop: 10 }}>
                            <span style={{ fontSize: "0.7rem", color: "#8b6535", fontWeight: 600 }}>
                                🎲 Random order per request
                            </span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Provider Toggles */}
            <div style={{
                background: "#fff", border: "1px solid #f0e6d2",
                borderRadius: 16, padding: 24, marginBottom: 20,
                boxShadow: "0 2px 8px rgba(200,134,26,0.06)",
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1f1209" }}>
                        Provider Toggles
                    </h2>
                    <span style={{
                        fontSize: "0.75rem", fontWeight: 600, color: "#8b6535",
                        background: "#fdf8f1", border: "1px solid #e9dcc8",
                        borderRadius: 20, padding: "3px 10px",
                    }}>
                        {activeCount} of {PROVIDERS.length - 1} free providers active
                    </span>
                </div>
                <p style={{ margin: "0 0 20px", fontSize: "0.83rem", color: "#8b6535" }}>
                    Instantly enable or disable individual providers. Disabled providers are skipped in the waterfall/load-balance order.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {PROVIDERS.map(provider => {
                        const isEnabled = provider.locked || settings.providerEnabled[provider.id];
                        return (
                            <div key={provider.id} style={{
                                display: "flex", alignItems: "center", gap: 16,
                                padding: "14px 16px", borderRadius: 12,
                                border: `1px solid ${isEnabled ? provider.borderColor : "#f0e6d2"}`,
                                background: isEnabled ? provider.bgColor : "#fafaf8",
                                transition: "all 0.2s", opacity: provider.locked ? 0.9 : 1,
                            }}>
                                <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{provider.icon}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1f1209" }}>
                                            {provider.name}
                                        </span>
                                        {provider.locked && (
                                            <span style={{
                                                fontSize: "0.65rem", fontWeight: 700,
                                                background: "#ecfdf5", color: "#059669",
                                                border: "1px solid #a7f3d0", borderRadius: 8,
                                                padding: "1px 7px",
                                            }}>ALWAYS ON</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: "0.75rem", color: "#8b6535", marginTop: 2 }}>
                                        {provider.description}
                                    </div>
                                    <div style={{
                                        fontSize: "0.7rem", fontFamily: "monospace",
                                        color: provider.color, marginTop: 2, fontWeight: 600,
                                    }}>
                                        {provider.model}
                                    </div>
                                </div>
                                <ToggleSwitch
                                    checked={isEnabled}
                                    onChange={(val) => toggleProvider(provider.id, val)}
                                    disabled={provider.locked}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Confidence Threshold */}
            <div style={{
                background: "#fff", border: "1px solid #f0e6d2",
                borderRadius: 16, padding: 24,
                boxShadow: "0 2px 8px rgba(200,134,26,0.06)",
            }}>
                <h2 style={{ margin: "0 0 6px", fontSize: "1rem", fontWeight: 700, color: "#1f1209" }}>
                    Confidence Threshold
                </h2>
                <p style={{ margin: "0 0 20px", fontSize: "0.83rem", color: "#8b6535" }}>
                    Queries with retrieval confidence <strong>below</strong> this score skip free providers and go straight to OpenAI for the most accurate answers.
                </p>

                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ flex: 1, position: "relative" }}>
                        <input
                            type="range" min="0" max="1" step="0.05"
                            value={settings.confidenceThreshold}
                            onChange={e => setThreshold(parseFloat(e.target.value))}
                            onMouseUp={commitThreshold}
                            onTouchEnd={commitThreshold}
                            style={{ width: "100%", accentColor: "#c8861a", cursor: "pointer" }}
                        />
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#b0916a", marginTop: 4 }}>
                            <span>0.0 — Always free providers</span>
                            <span>1.0 — Always OpenAI</span>
                        </div>
                    </div>
                    <div style={{
                        minWidth: 64, textAlign: "center",
                        background: "#fffbf0", border: "2px solid #c8861a",
                        borderRadius: 10, padding: "8px 12px",
                        fontSize: "1.3rem", fontWeight: 800, color: "#c8861a",
                    }}>
                        {settings.confidenceThreshold.toFixed(2)}
                    </div>
                </div>

                <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                        { label: "Aggressive (free-first)", value: 0.2, color: "#059669" },
                        { label: "Balanced (default)", value: 0.45, color: "#c8861a" },
                        { label: "Conservative (quality-first)", value: 0.7, color: "#7c3aed" },
                    ].map(preset => (
                        <button
                            key={preset.value}
                            onClick={() => { setThreshold(preset.value); saveSettings({ confidenceThreshold: preset.value }); }}
                            style={{
                                fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                                padding: "5px 12px", borderRadius: 20,
                                border: `1.5px solid ${settings.confidenceThreshold === preset.value ? preset.color : "#e9dcc8"}`,
                                background: settings.confidenceThreshold === preset.value ? `${preset.color}18` : "#fafaf8",
                                color: settings.confidenceThreshold === preset.value ? preset.color : "#8b6535",
                                transition: "all 0.15s",
                            }}
                        >
                            {preset.label} ({preset.value})
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
