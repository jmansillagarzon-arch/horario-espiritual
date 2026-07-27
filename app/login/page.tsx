"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Role } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [role, setRole] = useState<Role>("miembro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim() || !password || !name.trim() || !groupCode.trim()) {
      setError("Completa todos los campos.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim(),
          role,
          group_code: groupCode.trim().toUpperCase(),
        },
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      router.push("/");
      router.refresh();
    } else {
      setInfo("Revisa tu correo para confirmar la cuenta y luego inicia sesión.");
      setMode("login");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim() || !password) {
      setError("Completa tu correo y contraseña.");
      return;
    }
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-center px-4" style={{ minHeight: "100vh" }}>
      <div className="he-page w-full max-w-sm rounded-2xl p-6">
        <div className="flex justify-center mb-4">
          <img
            src="/images/mater.png"
            alt="Virgen de Schoenstatt"
            style={{ width: 88, height: 88, borderRadius: "50%" }}
          />
        </div>
        <p className="he-mono text-xs mb-1 text-center" style={{ color: "#6b7280" }}>
          SCHOENSTATT · CUADERNO DIGITAL
        </p>
        <h1 className="he-display text-2xl mb-1 text-center" style={{ color: "#4f46e5" }}>
          Horario Espiritual
        </h1>
        <p className="text-sm mb-6 text-center" style={{ color: "#6b7280" }}>
          Actos concretos, cada día, hacia el Ideal Personal.
        </p>

        <div className="flex gap-1 mb-4">
          <button
            className="he-tab"
            style={mode === "signup" ? { background: "#4f46e5", color: "#FFFFFF", border: "1px solid #4f46e5" } : {}}
            onClick={() => setMode("signup")}
            type="button"
          >
            Crear cuenta
          </button>
          <button
            className="he-tab"
            style={mode === "login" ? { background: "#4f46e5", color: "#FFFFFF", border: "1px solid #4f46e5" } : {}}
            onClick={() => setMode("login")}
            type="button"
          >
            Ya tengo cuenta
          </button>
        </div>

        <form onSubmit={mode === "signup" ? handleSignup : handleLogin} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="he-mono text-xs block mb-1" style={{ color: "#6b7280" }}>
                TU NOMBRE
              </label>
              <input className="he-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="María Ayuda" />
            </div>
          )}
          <div>
            <label className="he-mono text-xs block mb-1" style={{ color: "#6b7280" }}>
              CORREO
            </label>
            <input
              className="he-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
          </div>
          <div>
            <label className="he-mono text-xs block mb-1" style={{ color: "#6b7280" }}>
              CONTRASEÑA
            </label>
            <input
              className="he-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo 6 caracteres"
            />
          </div>
          {mode === "signup" && (
            <>
              <div>
                <label className="he-mono text-xs block mb-1" style={{ color: "#6b7280" }}>
                  CÓDIGO DE GRUPO
                </label>
                <input
                  className="he-input"
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value)}
                  placeholder="ej. FAMILIA24"
                />
                <p className="text-xs mt-1" style={{ color: "#6b7280" }}>
                  Cualquiera con este código, si es guía, verá el avance de quienes lo usen. Compártelo solo dentro
                  de tu grupo.
                </p>
              </div>
              <div>
                <label className="he-mono text-xs block mb-1" style={{ color: "#6b7280" }}>
                  ROL
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("miembro")}
                    className="he-tab"
                    style={role === "miembro" ? { background: "#4f46e5", color: "#FFFFFF", border: "1px solid #4f46e5" } : {}}
                  >
                    Miembro
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("guia")}
                    className="he-tab"
                    style={role === "guia" ? { background: "#4f46e5", color: "#FFFFFF", border: "1px solid #4f46e5" } : {}}
                  >
                    Guía / acompañante
                  </button>
                </div>
              </div>
            </>
          )}
          {error && (
            <p className="text-xs" style={{ color: "#6b7280" }}>
              {error}
            </p>
          )}
          {info && (
            <p className="text-xs" style={{ color: "#4f46e5" }}>
              {info}
            </p>
          )}
          <button type="submit" className="he-btn-primary w-full mt-2" disabled={loading}>
            {loading ? "Un momento..." : mode === "signup" ? "Crear cuenta" : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
